"""The compressed overworld: town layout and the overworld <-> real warp.

Frames (metres, x = east, z = south):
  real   equirectangular around towns.json "ref" (Mechelen, 51.0280 N 4.4780 E)
  town   equirectangular around the town's own centre (towns.json lat/lon)
  ow     the overworld; its origin is the ref point, like the real frame

Layout. c_i = real centre of town i, R_i = its radius (max distance of the wall ring,
forts included, from the centre + suburbMargin). Targets t_i = c_i / K; positions p_i
start at t_i and are relaxed so that |p_i - p_j| >= R_i + R_j + gap for every pair,
while staying as close as possible to t_i (alternating constraint projection and a
spring back to the target with decreasing strength; finish with pure projection).

Warp (overworld p -> real q):
  inside town i (|p - p_i| <= R_i):   q = c_i + (p - p_i)                      (1:1)
  elsewhere:                           q = K p + D(p)
     D(p)   = sum_i w_i(p) d_i(p) / sum_i w_i(p)
     d_i(p) = (c_i - K p_i) - u_i(p) R_i (K - 1),   u_i = (p - p_i) / |p - p_i|
     w_i(p) = 1 / max(|p - p_i| - R_i, 1 m)^2
  Near town i the weights are dominated by w_i, so q -> c_i + u_i (R_i + (s_i - R_i) K)
  with s_i = |p - p_i|: the countryside just outside the town edge maps to the real land
  just outside the real town edge, and moving away from the town the real distance grows
  K times faster. The radial term R_i (K - 1) is what makes the map continuous at the town
  edge; without it (the plain "IDW of offsets" form) the real annulus R_i..K R_i around
  every town would be skipped. (Town-local <-> real also corrects the small difference
  between the two equirectangular scales; it is < 0.5 % over the region.)

Inverse (real q -> overworld p): exact inside the real town circles, otherwise Newton
iteration on the forward warp with a numerical Jacobian, started from the nearest town's
radial inverse.
"""
import json, math, os
import numpy as np
from common import HERE, Frame, config

_cache = {}


def town_radius(walls, margin):
    pts = list(walls["ring"])
    for f in walls.get("forts", []):
        pts += f["ring"]
    return max(math.hypot(x, z) for x, z in pts) + margin


def layout(cfg=None, iters=4000):
    cfg = cfg or config()
    K = cfg["K"]
    ref = Frame(cfg["ref"]["lat"], cfg["ref"]["lon"])
    towns = []
    for t in cfg["towns"]:
        wpath = os.path.join(HERE, "walls", f"{t['id']}.json")
        if not os.path.exists(wpath):
            continue
        walls = json.load(open(wpath))
        towns.append(dict(t, real=np.array(ref.fwd(t["lat"], t["lon"])), R=town_radius(walls, cfg["suburbMargin"]),
                          walls=walls))
    n = len(towns)
    tgt = np.array([t["real"] / K for t in towns])
    R = np.array([t["R"] for t in towns])
    req = R[:, None] + R[None, :] + cfg["gap"]
    p = tgt.copy()
    for it in range(iters):
        pull = 0.05 * (1 - it / iters) if it < iters - 300 else 0.0
        p += pull * (tgt - p)
        for _ in range(4):
            moved = False
            for i in range(n):
                for j in range(i + 1, n):
                    d = p[j] - p[i]
                    L = math.hypot(*d)
                    if L < req[i, j]:
                        u = d / L if L > 1e-6 else np.array([1.0, 0.0])
                        corr = (req[i, j] - L) / 2 + 1e-3
                        p[i] -= u * corr
                        p[j] += u * corr
                        moved = True
            if not moved:
                break
    for i, t in enumerate(towns):
        t["ow"] = p[i]
    return dict(K=K, ref=ref, towns=towns, cfg=cfg)


def get_layout():
    if "L" not in _cache:
        _cache["L"] = layout()
    return _cache["L"]


def forward(P, L=None):
    """overworld points (N,2) -> real points (N,2)."""
    L = L or get_layout()
    K = L["K"]
    P = np.atleast_2d(np.asarray(P, np.float64))
    C = np.array([t["real"] for t in L["towns"]])
    O = np.array([t["ow"] for t in L["towns"]])
    R = np.array([t["R"] for t in L["towns"]])
    dv = P[:, None, :] - O[None, :, :]           # N,T,2
    s = np.hypot(dv[..., 0], dv[..., 1])          # N,T
    u = dv / np.maximum(s, 1e-6)[..., None]
    d = (C - K * O)[None, :, :] - u * (R * (K - 1))[None, :, None]
    w = 1.0 / np.maximum(s - R[None, :], 1.0) ** 2
    D = (w[..., None] * d).sum(1) / w.sum(1)[:, None]
    Q = K * P + D
    inside = s <= R[None, :]
    for i in range(len(R)):
        m = inside[:, i]
        Q[m] = C[i] + (P[m] - O[i])
    return Q


def inverse(Q, L=None, iters=40):
    """real points (N,2) -> overworld points (N,2); NaN where Newton did not converge."""
    L = L or get_layout()
    K = L["K"]
    Q = np.atleast_2d(np.asarray(Q, np.float64))
    C = np.array([t["real"] for t in L["towns"]])
    O = np.array([t["ow"] for t in L["towns"]])
    R = np.array([t["R"] for t in L["towns"]])
    dv = Q[:, None, :] - C[None, :, :]
    s = np.hypot(dv[..., 0], dv[..., 1])
    near = (s - R[None, :]).argmin(1)
    u = dv[np.arange(len(Q)), near] / np.maximum(s[np.arange(len(Q)), near], 1e-6)[:, None]
    sr = s[np.arange(len(Q)), near]
    Rn = R[near]
    rad = np.where(sr <= Rn, sr, Rn + (sr - Rn) / K)
    P = O[near] + u * rad[:, None]
    h = 0.5
    for _ in range(iters):
        F = forward(P, L) - Q
        if np.nanmax(np.abs(F)) < 0.05:
            break
        Fx = (forward(P + [h, 0], L) - Q - F) / h
        Fz = (forward(P + [0, h], L) - Q - F) / h
        a, b, c, d = Fx[:, 0], Fz[:, 0], Fx[:, 1], Fz[:, 1]
        det = a * d - b * c
        det = np.where(np.abs(det) < 1e-9, 1e-9, det)
        dx = (d * F[:, 0] - b * F[:, 1]) / det
        dz = (-c * F[:, 0] + a * F[:, 1]) / det
        step = np.stack([dx, dz], 1)
        nrm = np.hypot(step[:, 0], step[:, 1])
        step *= np.minimum(1.0, 400.0 / np.maximum(nrm, 1e-9))[:, None]
        P = P - step
    F = np.hypot(*(forward(P, L) - Q).T)
    P[F > 3.0] = np.nan
    return P


def town_local_to_real(t, x, z, L=None):
    """A point in town t's local frame -> real (ref) frame, via lat/lon."""
    L = L or get_layout()
    lat, lon = Frame(t["lat"], t["lon"]).inv(x, z)
    return L["ref"].fwd(lat, lon)

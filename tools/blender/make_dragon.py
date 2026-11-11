"""BELFORT -- procedural hero dragon builder (interim asset).

Run headless:   blender -b --python tools/blender/make_dragon.py
Output:         public/models/dragon.glb   (glTF: +Y up, faces +Z, metres)

Pipeline
  1. analytic anatomy: lofted super-ellipse tubes + muscle ellipsoids (+X half, mirrored)
  2. voxel remesh -> one watertight organic skin, radius-aware Laplacian smoothing
  3. bisect at x=0, decimate, analytic skin weights from the construction chains
  4. rigid detail parts (horns, dorsal spines, claws, teeth, eyes, finger bones)
  5. wing membranes as analytic patches (weights/UVs computed directly)
  6. UV unwrap (label seams) + pack, procedural Cycles materials, bake to textures
  7. mirror to the full creature, build armature, export GLB

Blender space while building: Z up, dragon faces -Y, LEFT wing on +X.
All bones are exported with identity rest rotation (joint axes == model axes).

Env overrides: DRAGON_OUT, DRAGON_SCRATCH, DRAGON_QUICK=1 (skip baking), DRAGON_TEX.
"""
import bpy
import bmesh
import math
import os
import sys
import time
import tempfile
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

T0 = time.time()


def log(*a):
    print('[dragon %6.1fs]' % (time.time() - T0), *a)
    sys.stdout.flush()


HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT_GLB = os.environ.get('DRAGON_OUT', os.path.join(REPO, 'public', 'models', 'dragon.glb'))
_DEF_SCRATCH = '/tmp/claude-0/-home-user-heritage/fbffb122-b5ad-5a04-9543-7e04a3e8c2ba/scratchpad/dragon'
if not os.path.isdir(os.path.dirname(_DEF_SCRATCH)):
    _DEF_SCRATCH = os.path.join(tempfile.gettempdir(), 'belfort_dragon_build')
SCRATCH = os.environ.get('DRAGON_SCRATCH', _DEF_SCRATCH)
os.makedirs(SCRATCH, exist_ok=True)
os.makedirs(os.path.dirname(OUT_GLB), exist_ok=True)
QUICK = os.environ.get('DRAGON_QUICK', '0') == '1'
TEX = int(os.environ.get('DRAGON_TEX', '2048'))
TEX_WING = int(os.environ.get('DRAGON_TEX_WING', '2048'))
JPEG_Q = int(os.environ.get('DRAGON_JPEG_Q', '86'))

np.random.seed(7)
RNG = np.random.RandomState(11)

X = np.array([1.0, 0.0, 0.0])
Y = np.array([0.0, 1.0, 0.0])
Z = np.array([0.0, 0.0, 1.0])

GROUND_Z = -2.75
VOXEL = 0.025
JAW_OPEN = math.radians(24.0)          # build pose only; rest pose is closed
BODY_HALF_TRIS = 23500


# --------------------------------------------------------------------------------------
# small maths helpers
# --------------------------------------------------------------------------------------
def nrm(v):
    v = np.asarray(v, float)
    return v / (np.linalg.norm(v) + 1e-12)


def smoothstep(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def rot_x(p, ang, pivot):
    """Rotate points about the world X axis through pivot."""
    c, s = math.cos(ang), math.sin(ang)
    q = np.asarray(p, float) - pivot
    out = q.copy()
    out[..., 1] = q[..., 1] * c - q[..., 2] * s
    out[..., 2] = q[..., 1] * s + q[..., 2] * c
    return out + pivot


def rot_x_vec(v, ang):
    c, s = math.cos(ang), math.sin(ang)
    out = np.array(v, float)
    out[..., 1] = v[..., 1] * c - v[..., 2] * s
    out[..., 2] = v[..., 1] * s + v[..., 2] * c
    return out


def hermite_resample(ctrl, n):
    ctrl = np.asarray(ctrl, float)
    d = np.linalg.norm(np.diff(ctrl[:, :3], axis=0), axis=1)
    t = np.concatenate([[0.0], np.cumsum(d)])
    m = np.zeros_like(ctrl)
    m[1:-1] = (ctrl[2:] - ctrl[:-2]) / (t[2:] - t[:-2])[:, None]
    m[0] = (ctrl[1] - ctrl[0]) / (t[1] - t[0])
    m[-1] = (ctrl[-1] - ctrl[-2]) / (t[-1] - t[-2])
    ts = np.linspace(0.0, t[-1], n)
    idx = np.clip(np.searchsorted(t, ts, side='right') - 1, 0, len(t) - 2)
    h = (t[idx + 1] - t[idx])[:, None]
    u = ((ts - t[idx]) / h[:, 0])[:, None]
    h00 = 2 * u ** 3 - 3 * u ** 2 + 1
    h10 = u ** 3 - 2 * u ** 2 + u
    h01 = -2 * u ** 3 + 3 * u ** 2
    h11 = u ** 3 - u ** 2
    out = h00 * ctrl[idx] + h10 * h * m[idx] + h01 * ctrl[idx + 1] + h11 * h * m[idx + 1]
    return out, t, ts


class Tube:
    """A swept super-ellipse. ctrl rows: x,y,z,r  or  x,y,z,w,ht,hb.
    w = half width along `side`, ht/hb = half heights along +up / -up."""

    def __init__(self, ctrl, n, hint=Z, exps=(2.0, 2.0), xform=None, side=None):
        ctrl = np.asarray(ctrl, float)
        if ctrl.shape[1] == 4:
            ctrl = np.concatenate([ctrl, ctrl[:, 3:4], ctrl[:, 3:4]], axis=1)
        P, tk, ts = hermite_resample(ctrl, n)
        self.p = P[:, :3].copy()
        if xform is not None:
            self.p = xform(self.p)
        self.w = np.maximum(P[:, 3], 1e-4)
        self.ht = np.maximum(P[:, 4], 1e-4)
        self.hb = np.maximum(P[:, 5], 1e-4)
        t = np.gradient(self.p, axis=0)
        t /= np.linalg.norm(t, axis=1)[:, None]
        if side is not None:
            sd = np.repeat(np.asarray(side, float)[None], n, axis=0)
        else:
            sd = np.cross(np.asarray(hint, float)[None], t)
        sd /= np.linalg.norm(sd, axis=1)[:, None]
        up = np.cross(t, sd)
        up /= np.linalg.norm(up, axis=1)[:, None]
        self.t, self.side, self.up = t, sd, up
        seg = np.linalg.norm(np.diff(self.p, axis=0), axis=1)
        self.s = np.concatenate([[0.0], np.cumsum(seg)])
        self.ctrl_s = np.interp(tk, ts, self.s)
        self.exps = exps
        self.n = n

    def at(self, s):
        return np.array([np.interp(s, self.s, self.p[:, k]) for k in range(3)]).T

    def frame_at(self, s):
        i = int(np.clip(np.searchsorted(self.s, s), 0, self.n - 1))
        return self.t[i], self.side[i], self.up[i]


def loft(tb, nseg, half=False, cap0=False, cap1=True):
    """Triangulated loft. Returns V, F, UV(per face corner), ring index per vertex."""
    M = tb.n
    if half:
        phi0 = math.pi / 2 if tb.side[0][0] < 0 else -math.pi / 2
        phis = phi0 + math.pi * np.arange(nseg + 1) / nseg
        ncol, wrap = nseg + 1, False
    else:
        phis = 2 * math.pi * np.arange(nseg) / nseg
        ncol, wrap = nseg, True
    cs, sn = np.cos(phis), np.sin(phis)
    if half:
        cs[0] = cs[-1] = 0.0
    top = sn >= 0
    e = np.where(top, tb.exps[0], tb.exps[1])
    cx = np.sign(cs) * np.abs(cs) ** (2.0 / e)
    cz = np.sign(sn) * np.abs(sn) ** (2.0 / e)
    rings = []
    for j in range(M):
        hz = np.where(top, tb.ht[j], tb.hb[j])
        rings.append(tb.p[j] + (tb.w[j] * cx)[:, None] * tb.side[j] + (hz * cz)[:, None] * tb.up[j])
    V = np.concatenate(rings)
    if half:
        V[np.abs(V[:, 0]) < 1e-7, 0] = 0.0
        V[:, 0] = np.maximum(V[:, 0], 0.0)
    circ = [(math.pi if half else 2 * math.pi) * 0.5 * (tb.w[j] + 0.5 * (tb.ht[j] + tb.hb[j])) for j in range(M)]

    def uv(j, i):
        return ((i / nseg - 0.5) * circ[j], tb.s[j])

    F, UV = [], []
    for j in range(M - 1):
        for i in range(nseg):
            i2 = (i + 1) % ncol if wrap else i + 1
            a, b, c, d = j * ncol + i, j * ncol + i2, (j + 1) * ncol + i2, (j + 1) * ncol + i
            F.append((a, b, c)); UV.append((uv(j, i), uv(j, i + 1), uv(j + 1, i + 1)))
            F.append((a, c, d)); UV.append((uv(j, i), uv(j + 1, i + 1), uv(j + 1, i)))
    ring = np.repeat(np.arange(M), ncol)
    if cap1:
        ci = len(V)
        V = np.concatenate([V, tb.p[-1:]])
        ring = np.concatenate([ring, [M - 1]])
        for i in range(nseg):
            i2 = (i + 1) % ncol if wrap else i + 1
            F.append((ci, (M - 1) * ncol + i, (M - 1) * ncol + i2))
            UV.append((uv(M - 1, i + 0.5), uv(M - 1, i), uv(M - 1, i + 1)))
    if cap0:
        ci = len(V)
        V = np.concatenate([V, tb.p[:1]])
        ring = np.concatenate([ring, [0]])
        for i in range(nseg):
            i2 = (i + 1) % ncol if wrap else i + 1
            F.append((ci, i2, i))
            UV.append((uv(0, i + 0.5), uv(0, i + 1), uv(0, i)))
    return V, F, UV, ring


def ellipsoid(c, r, frame=None, nu=20, nv=12):
    c = np.asarray(c, float); r = np.asarray(r, float)
    V = [np.array([0, 0, 1.0])]
    for j in range(1, nv):
        th = math.pi * j / nv
        for i in range(nu):
            ph = 2 * math.pi * i / nu
            V.append(np.array([math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)]))
    V.append(np.array([0, 0, -1.0]))
    V = np.array(V) * r
    if frame is not None:
        V = V @ np.asarray(frame).T
    V = V + c
    F = []
    for i in range(nu):
        F.append((0, 1 + i, 1 + (i + 1) % nu))
    for j in range(nv - 2):
        for i in range(nu):
            a = 1 + j * nu + i; b = 1 + j * nu + (i + 1) % nu
            c2 = 1 + (j + 1) * nu + (i + 1) % nu; d = 1 + (j + 1) * nu + i
            F.append((a, d, c2)); F.append((a, c2, b))
    last = len(V) - 1
    base = 1 + (nv - 2) * nu
    for i in range(nu):
        F.append((last, base + (i + 1) % nu, base + i))
    return V, F


class Acc:
    def __init__(self):
        self.V, self.F, self.n = [], [], 0

    def add(self, V, F):
        V = np.asarray(V, float)
        self.V.append(V)
        self.F.extend([(a + self.n, b + self.n, c + self.n) for a, b, c in F])
        self.n += len(V)

    def tube(self, tb, nseg=28):
        V, F, _, _ = loft(tb, nseg, cap0=True, cap1=True)
        self.add(V, F)

    def blob(self, c, r, frame=None):
        V, F = ellipsoid(c, r, frame)
        self.add(V, F)

    def arrays(self):
        return np.concatenate(self.V), np.array(self.F, np.int32)


def tri_mesh(name, V, F):
    me = bpy.data.meshes.new(name)
    V = np.asarray(V, np.float64); F = np.asarray(F, np.int32)
    me.vertices.add(len(V)); me.vertices.foreach_set('co', V.ravel())
    me.loops.add(len(F) * 3); me.loops.foreach_set('vertex_index', F.ravel())
    me.polygons.add(len(F))
    me.polygons.foreach_set('loop_start', np.arange(0, len(F) * 3, 3, dtype=np.int32))
    me.polygons.foreach_set('loop_total', np.full(len(F), 3, np.int32))
    me.update(calc_edges=True)
    return me


def mesh_arrays(me):
    V = np.empty(len(me.vertices) * 3); me.vertices.foreach_get('co', V)
    me.calc_loop_triangles()
    T = np.empty(len(me.loop_triangles) * 3, np.int32); me.loop_triangles.foreach_get('vertices', T)
    return V.reshape(-1, 3), T.reshape(-1, 3)


def edges_of(T):
    E = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]])
    E.sort(axis=1)
    return np.unique(E, axis=0)


def laplace(val, E, fac, iters):
    n = len(val)
    deg = np.bincount(E.ravel(), minlength=n).astype(float)
    deg[deg == 0] = 1
    val = np.array(val, float)
    two = val.ndim == 2
    f = fac[:, None] if (two and np.ndim(fac)) else fac
    for _ in range(iters):
        if two:
            acc = np.zeros_like(val)
            for k in range(val.shape[1]):
                acc[:, k] = np.bincount(E[:, 0], val[E[:, 1], k], n) + np.bincount(E[:, 1], val[E[:, 0], k], n)
            val = val + f * (acc / deg[:, None] - val)
        else:
            acc = np.bincount(E[:, 0], val[E[:, 1]], n) + np.bincount(E[:, 1], val[E[:, 0]], n)
            val = val + f * (acc / deg - val)
    return val


def vertex_normals(V, T):
    fn = np.cross(V[T[:, 1]] - V[T[:, 0]], V[T[:, 2]] - V[T[:, 0]])
    N = np.zeros_like(V)
    for k in range(3):
        for c in range(3):
            N[:, c] += np.bincount(T[:, k], fn[:, c], len(V))
    return N / (np.linalg.norm(N, axis=1)[:, None] + 1e-12)


# --------------------------------------------------------------------------------------
# anatomy definition (LEFT side = +X)
# --------------------------------------------------------------------------------------
# spine: head joint -> tail tip.  y, z, half-width, top half-height, bottom half-height
SPINE = [
    (-5.55, 1.82, 0.200, 0.225, 0.215),
    (-5.15, 1.78, 0.215, 0.250, 0.245),
    (-4.50, 1.52, 0.240, 0.285, 0.290),
    (-3.70, 0.98, 0.295, 0.345, 0.355),
    (-2.95, 0.50, 0.400, 0.450, 0.480),
    (-2.35, 0.26, 0.560, 0.610, 0.680),
    (-1.75, 0.07, 0.730, 0.800, 0.930),
    (-1.00, 0.00, 0.830, 0.930, 1.060),
    (-0.20, 0.00, 0.830, 0.905, 1.030),
    (0.60, 0.04, 0.730, 0.790, 0.820),
    (1.30, 0.10, 0.590, 0.650, 0.580),
    (1.90, 0.14, 0.570, 0.610, 0.530),
    (2.40, 0.16, 0.470, 0.510, 0.460),
    (3.00, 0.16, 0.380, 0.410, 0.380),
    (4.00, 0.15, 0.285, 0.305, 0.285),
    (5.00, 0.14, 0.215, 0.230, 0.215),
    (6.00, 0.13, 0.155, 0.165, 0.155),
    (7.00, 0.12, 0.105, 0.110, 0.105),
    (8.00, 0.11, 0.065, 0.068, 0.065),
    (8.70, 0.10, 0.036, 0.036, 0.036),
]
spine = Tube([(0.0,) + r for r in SPINE], 150, hint=Z, exps=(1.85, 2.3))
S_NECKBASE = float(np.interp(-2.2, spine.p[:, 1], spine.s))
S_TAILBASE = float(np.interp(2.2, spine.p[:, 1], spine.s))
S_END = float(spine.s[-1])
NECK_LEN = S_NECKBASE / 5.0
_tl = np.linspace(1.25, 0.75, 10)
TAIL_LENS = _tl / _tl.sum() * (S_END - S_TAILBASE)
TAIL_S = S_TAILBASE + np.concatenate([[0.0], np.cumsum(TAIL_LENS)])[:10]

# head frame
HJ = np.array([0.0, -5.55, 1.82])
_tilt = math.radians(8.0)
A_H = np.array([0.0, -math.cos(_tilt), -math.sin(_tilt)])      # towards the nose
U_H = np.array([0.0, -math.sin(_tilt), math.cos(_tilt)])       # skull up


def hl(h, x, up):
    return HJ + h * A_H + x * X + up * U_H


# upper skull: h, centre-up, half-width, top, bottom
SKULL = [
    (-0.20, 0.000, 0.195, 0.215, 0.205),
    (0.05, 0.020, 0.255, 0.225, 0.170),
    (0.30, 0.030, 0.285, 0.225, 0.140),
    (0.55, 0.010, 0.235, 0.175, 0.120),
    (0.85, -0.020, 0.180, 0.130, 0.090),
    (1.15, -0.040, 0.150, 0.108, 0.075),
    (1.38, -0.050, 0.128, 0.094, 0.065),
    (1.48, -0.058, 0.090, 0.062, 0.052),
    (1.53, -0.064, 0.035, 0.022, 0.022),
]
JAW = [
    (-0.06, -0.200, 0.180, 0.085, 0.095),
    (0.20, -0.200, 0.215, 0.100, 0.110),
    (0.50, -0.185, 0.188, 0.085, 0.090),
    (0.85, -0.170, 0.142, 0.070, 0.070),
    (1.15, -0.165, 0.118, 0.060, 0.060),
    (1.36, -0.160, 0.094, 0.050, 0.052),
    (1.45, -0.155, 0.040, 0.028, 0.030),
]
HINGE = hl(0.10, 0.0, -0.10)
SK_H = np.array([r[0] for r in SKULL]); SK_W = np.array([r[2] for r in SKULL])
SK_BOT = np.array([r[1] - r[4] for r in SKULL])
JW_H = np.array([r[0] for r in JAW]); JW_W = np.array([r[2] for r in JAW])
JW_TOP = np.array([r[1] + r[3] for r in JAW])


def jaw_open(p):
    return rot_x(p, JAW_OPEN, HINGE)


skull = Tube([tuple(hl(h, 0, cu)) + (w, ht, hb) for h, cu, w, ht, hb in SKULL], 30, hint=U_H, exps=(2.5, 2.9))
jaw = Tube([tuple(hl(h, 0, cu)) + (w, ht, hb) for h, cu, w, ht, hb in JAW], 24, hint=U_H, exps=(2.7, 2.2),
           xform=jaw_open)

# legs: x,y,z, lateral half-width, front half-depth, rear half-depth
LEG_F = [
    (0.60, -1.47, -0.22, 0.300, 0.340, 0.360),
    (0.70, -1.28, -0.82, 0.240, 0.265, 0.315),
    (0.80, -1.04, -1.38, 0.160, 0.165, 0.200),
    (0.80, -1.20, -1.82, 0.150, 0.165, 0.160),
    (0.80, -1.38, -2.22, 0.110, 0.112, 0.112),
    (0.80, -1.46, -2.50, 0.118, 0.125, 0.118),
    (0.80, -1.50, -2.64, 0.105, 0.110, 0.100),
]
LEG_B = [
    (0.50, 1.70, 0.00, 0.300, 0.430, 0.400),
    (0.68, 1.44, -0.62, 0.285, 0.400, 0.380),
    (0.84, 1.14, -1.22, 0.185, 0.200, 0.225),
    (0.84, 1.56, -1.60, 0.155, 0.160, 0.205),
    (0.82, 2.03, -1.98, 0.108, 0.110, 0.125),
    (0.82, 1.92, -2.30, 0.098, 0.100, 0.100),
    (0.82, 1.80, -2.54, 0.125, 0.130, 0.120),
    (0.82, 1.76, -2.65, 0.110, 0.115, 0.100),
]
FWD = -Y
legF = Tube(LEG_F, 34, hint=FWD)
legB = Tube(LEG_B, 38, hint=FWD)
S_ELBOW_F = float(legF.ctrl_s[2]); S_KNEE_B = float(legB.ctrl_s[2])
J_LEGF_U, J_LEGF_L = np.array(LEG_F[0][:3]), np.array(LEG_F[2][:3])
J_LEGB_U, J_LEGB_L = np.array(LEG_B[0][:3]), np.array(LEG_B[2][:3])

# wing arm: x,y,z, fore-aft half-width, up, down
ARM = [
    (0.35, -0.25, 0.40, 0.400, 0.300, 0.300),
    (0.80, -0.30, 0.52, 0.340, 0.260, 0.260),
    (1.60, -0.45, 0.62, 0.250, 0.195, 0.190),
    (2.60, -0.62, 0.72, 0.185, 0.150, 0.140),
    (3.50, -0.78, 0.78, 0.175, 0.150, 0.130),
    (4.40, -1.20, 0.80, 0.160, 0.130, 0.120),
    (5.40, -1.70, 0.80, 0.120, 0.100, 0.095),
    (6.30, -2.15, 0.78, 0.135, 0.115, 0.105),
    (6.50, -2.26, 0.78, 0.060, 0.055, 0.055),
]
arm = Tube(ARM, 44, hint=Z)
S_ARM_R, S_ARM_E, S_ARM_W = float(arm.ctrl_s[1]), float(arm.ctrl_s[4]), float(arm.ctrl_s[7])
J_SHOULDER = np.array([0.76, -0.30, 0.52])
J_ELBOW = np.array(ARM[4][:3])
WRIST = np.array(ARM[7][:3])
FINGER_TIPS = [np.array([10.0, 0.60, 0.55]), np.array([8.25, 3.40, 0.50]), np.array([5.30, 3.95, 0.50])]
FINGER_BOW = [0.24, 0.20, 0.22]
HIP_ATTACH = np.array([0.30, 2.30, 0.28])


def finger_curve(k, s):
    """Point(s) on finger k (0..2) at parameter s in [0,1]."""
    s = np.asarray(s, float)
    d = FINGER_TIPS[k] - WRIST
    perp = nrm(np.cross(d, Z))
    return WRIST + s[..., None] * d + (FINGER_BOW[k] * np.sin(math.pi * s))[..., None] * perp


# toes: (foot centre, [(angle deg from forward, +out), length], radius)
FOOT_F = np.array([0.80, -1.48, -2.57]); FOOT_B = np.array([0.82, 1.78, -2.585])
TOES = []   # (leg, base, mid, tip, r0, r1, is_rear)
for leg, P, angs, lens, r0 in (('F', FOOT_F, (-24, 2, 28), (0.36, 0.42, 0.36), 0.082),
                               ('B', FOOT_B, (-22, 3, 28), (0.42, 0.50, 0.42), 0.090)):
    for a, L in zip(angs, lens):
        d = np.array([math.sin(math.radians(a)), -math.cos(math.radians(a)), 0.0])
        tip = P + d * L; tip[2] = GROUND_Z + 0.062
        mid = P + d * L * 0.55; mid[2] = P[2] + 0.015
        TOES.append((leg, P + d * 0.02, mid, tip, r0, 0.058, False, d))
    d = np.array([-0.25, 1.0, 0.0]); d = nrm(d)
    L = 0.21 if leg == 'F' else 0.25
    tip = P + d * L; tip[2] = GROUND_Z + 0.075
    TOES.append((leg, P + d * 0.02, P + d * L * 0.5 + Z * 0.0, tip, 0.07, 0.05, True, d))


# --------------------------------------------------------------------------------------
# bones
# --------------------------------------------------------------------------------------
BONES = ['root', 'body'] + ['neck%d' % i for i in range(1, 6)] + ['head', 'jaw'] + \
        ['tail%d' % i for i in range(1, 11)]
for sd in 'LR':
    BONES += ['wing%s_shoulder' % sd, 'wing%s_elbow' % sd, 'wing%s_f1' % sd, 'wing%s_f2' % sd, 'wing%s_f3' % sd]
for lg in ('FL', 'FR', 'BL', 'BR'):
    BONES += ['leg%s_upper' % lg, 'leg%s_lower' % lg]
BI = {b: i for i, b in enumerate(BONES)}
NB = len(BONES)


def mirror_name(b):
    for a, c in (('wingL_', 'wingR_'), ('legFL_', 'legFR_'), ('legBL_', 'legBR_')):
        if b.startswith(a):
            return c + b[len(a):]
        if b.startswith(c):
            return a + b[len(c):]
    return b


MIRROR_COL = np.array([BI[mirror_name(b)] for b in BONES])

BONE_HEAD, BONE_PARENT = {}, {}
BONE_HEAD['root'] = np.zeros(3); BONE_PARENT['root'] = None
BONE_HEAD['body'] = np.zeros(3); BONE_PARENT['body'] = 'root'
for i in range(1, 6):
    BONE_HEAD['neck%d' % i] = spine.at(S_NECKBASE - (i - 1) * NECK_LEN)
    BONE_PARENT['neck%d' % i] = 'body' if i == 1 else 'neck%d' % (i - 1)
BONE_HEAD['head'] = HJ.copy(); BONE_PARENT['head'] = 'neck5'
BONE_HEAD['jaw'] = HINGE.copy(); BONE_PARENT['jaw'] = 'head'
for i in range(1, 11):
    BONE_HEAD['tail%d' % i] = spine.at(TAIL_S[i - 1])
    BONE_PARENT['tail%d' % i] = 'body' if i == 1 else 'tail%d' % (i - 1)
_M = np.array([-1.0, 1.0, 1.0])
for sd, m in (('L', np.ones(3)), ('R', _M)):
    BONE_HEAD['wing%s_shoulder' % sd] = J_SHOULDER * m; BONE_PARENT['wing%s_shoulder' % sd] = 'body'
    BONE_HEAD['wing%s_elbow' % sd] = J_ELBOW * m; BONE_PARENT['wing%s_elbow' % sd] = 'wing%s_shoulder' % sd
    for f in (1, 2, 3):
        BONE_HEAD['wing%s_f%d' % (sd, f)] = WRIST * m; BONE_PARENT['wing%s_f%d' % (sd, f)] = 'wing%s_elbow' % sd
    BONE_HEAD['legF%s_upper' % sd] = J_LEGF_U * m; BONE_PARENT['legF%s_upper' % sd] = 'body'
    BONE_HEAD['legF%s_lower' % sd] = J_LEGF_L * m; BONE_PARENT['legF%s_lower' % sd] = 'legF%s_upper' % sd
    BONE_HEAD['legB%s_upper' % sd] = J_LEGB_U * m; BONE_PARENT['legB%s_upper' % sd] = 'body'
    BONE_HEAD['legB%s_lower' % sd] = J_LEGB_L * m; BONE_PARENT['legB%s_lower' % sd] = 'legB%s_upper' % sd


def chain_weights(bones, joints, zones):
    def f(s):
        s = np.asarray(s, float)
        g = [smoothstep(j + lo, j + hi, s) for j, (lo, hi) in zip(joints, zones)]
        out = {bones[0]: 1.0 - g[0]}
        for i in range(1, len(bones) - 1):
            out[bones[i]] = np.clip(g[i - 1] - g[i], 0.0, 1.0)
        out[bones[-1]] = g[-1]
        return out
    return f


_sp_bones = ['head'] + ['neck%d' % i for i in range(5, 0, -1)] + ['body'] + ['tail%d' % i for i in range(1, 11)]
_sp_joints = [0.0] + [NECK_LEN * i for i in range(1, 5)] + [S_NECKBASE] + list(TAIL_S)
_sp_zones = [(-0.16, 0.16)] + [(-0.27, 0.27)] * 4 + [(-0.32, 0.32)] + [(-0.32, 0.32)] + \
            [(-0.42 * l, 0.42 * l) for l in TAIL_LENS[:-1]]
spine_w = chain_weights(_sp_bones, _sp_joints, _sp_zones)

# chains used for skinning + shading fields (all on the +X half or the centre line)
CHAINS = [
    dict(name='spine', tb=spine, wf=spine_w, p=6.0, ax0=1.0, ax1=1.0, flow=1.0, rov=None),
    dict(name='head', tb=skull, wf=lambda s: {'head': np.ones_like(np.asarray(s, float))}, p=8.0, ax0=1.0, ax1=1.0,
         flow=-1.0, rov=0.10),
    dict(name='jaw', tb=jaw, wf=lambda s: {'jaw': np.ones_like(np.asarray(s, float))}, p=8.0, ax0=1.0, ax1=1.0,
         flow=-1.0, rov=0.10),
    dict(name='legF', tb=legF, wf=chain_weights(['body', 'legFL_upper', 'legFL_lower'], [0.0, S_ELBOW_F],
                                                [(-0.25, 0.38), (-0.2, 0.2)]), p=6.0, ax0=0.45, ax1=1.0,
         flow=1.0, rov=None),
    dict(name='legB', tb=legB, wf=chain_weights(['body', 'legBL_upper', 'legBL_lower'], [0.0, S_KNEE_B],
                                                [(-0.28, 0.42), (-0.22, 0.22)]), p=6.0, ax0=0.45, ax1=1.0,
         flow=1.0, rov=None),
    dict(name='arm', tb=arm, wf=chain_weights(['body', 'wingL_shoulder', 'wingL_elbow'], [S_ARM_R, S_ARM_E],
                                              [(-0.25, 0.30), (-0.25, 0.25)]), p=6.0, ax0=1.0, ax1=1.0,
         flow=1.0, rov=None),
]
CI = {c['name']: i for i, c in enumerate(CHAINS)}


def chain_eval(tb, P, ax0=1.0, ax1=1.0, chunk=6000):
    A = tb.p[:-1]; AB = tb.p[1:] - A
    L = np.linalg.norm(AB, axis=1); T = AB / L[:, None]
    m = len(A)
    axr = np.ones(m); axr[0] = ax0; axr[-1] = ax1
    N = len(P)
    o_dn = np.empty(N); o_s = np.empty(N); o_r = np.empty(N); o_cu = np.empty(N)
    o_t = np.empty((N, 3)); o_ou = np.empty(N); o_os = np.empty(N)
    for i0 in range(0, N, chunk):
        Pc = P[i0:i0 + chunk]
        d = Pc[:, None, :] - A[None]
        t = np.clip(np.einsum('nmk,mk->nm', d, T) / L[None], 0.0, 1.0)
        o = d - (t * L[None])[:, :, None] * T[None]
        w = tb.w[:-1][None] * (1 - t) + tb.w[1:][None] * t
        ht = tb.ht[:-1][None] * (1 - t) + tb.ht[1:][None] * t
        hb = tb.hb[:-1][None] * (1 - t) + tb.hb[1:][None] * t
        os_ = np.einsum('nmk,mk->nm', o, tb.side[:-1])
        ou = np.einsum('nmk,mk->nm', o, tb.up[:-1])
        oa = np.einsum('nmk,mk->nm', o, T)
        h = np.where(ou >= 0, ht, hb)
        rm = 0.5 * (w + h)
        dn = np.sqrt((os_ / w) ** 2 + (ou / h) ** 2 + (oa / (rm * axr[None])) ** 2)
        j = np.argmin(dn, axis=1); ar = np.arange(len(Pc))
        sl = slice(i0, i0 + len(Pc))
        o_dn[sl] = dn[ar, j]
        o_s[sl] = tb.s[:-1][j] + t[ar, j] * L[j]
        o_r[sl] = np.sqrt(w[ar, j] * 0.5 * (ht[ar, j] + hb[ar, j]))
        o_ou[sl] = ou[ar, j]; o_os[sl] = os_[ar, j]
        o_cu[sl] = ou[ar, j] / np.sqrt(os_[ar, j] ** 2 + ou[ar, j] ** 2 + 1e-9)
        o_t[sl] = T[j]
    return dict(dn=o_dn, s=o_s, r=o_r, cu=o_cu, t=o_t, ou=o_ou, os=o_os)


def fields(P):
    """Per-vertex chain data for points P (N,3) on the +X half (mirror-symmetric via |x|)."""
    Pa = P.copy(); Pa[:, 0] = np.abs(Pa[:, 0])
    ev = [chain_eval(c['tb'], Pa, c['ax0'], c['ax1']) for c in CHAINS]
    aff = np.stack([np.maximum(e['dn'], 0.3) ** (-c['p']) for e, c in zip(ev, CHAINS)], axis=1)
    aff /= aff.sum(axis=1)[:, None]
    return ev, aff


# --------------------------------------------------------------------------------------
# 1. union volume
# --------------------------------------------------------------------------------------
log('building volume primitives')
src = Acc()
src.tube(spine, 36)
src.tube(skull, 28)
src.tube(jaw, 24)
src.tube(legF, 24)
src.tube(legB, 24)
src.tube(arm, 20)
for leg, b, m_, tip, r0, r1, rear, d in TOES:
    src.tube(Tube([tuple(b) + (r0,), tuple(m_) + (r0 * 0.93,), tuple(tip) + (r1,)], 8, hint=Z), 12)

HEAD_FRAME = np.stack([X, A_H, U_H], axis=1)        # columns: x, along, up
# torso muscle / bone landmarks
src.blob((0.46, -0.62, -0.42), (0.47, 1.00, 0.58))                 # pectoral / flight muscle
src.blob((0.60, -0.28, 0.40), (0.40, 0.52, 0.36))                  # wing shoulder (deltoid)
src.blob((0.30, -0.30, 0.74), (0.34, 0.50, 0.22))                  # wing-root trapezius
src.blob((0.64, -1.42, -0.12), (0.27, 0.40, 0.56))                 # fore scapula
src.blob((0.50, 1.72, 0.22), (0.32, 0.58, 0.42))                   # ilium / hip
src.blob((0.74, 1.36, -0.55), (0.24, 0.36, 0.50))                  # thigh (quadriceps)
src.blob((0.76, -1.22, -0.92), (0.20, 0.22, 0.36))                 # triceps
src.blob((0.0, -0.75, -1.00), (0.20, 1.05, 0.16))                  # keel
# head landmarks
src.tube(Tube([tuple(hl(0.10, 0.185, 0.215)) + (0.050,), tuple(hl(0.33, 0.250, 0.215)) + (0.062,),
               tuple(hl(0.56, 0.215, 0.160)) + (0.042,), tuple(hl(0.80, 0.150, 0.110)) + (0.028,)], 12, hint=U_H), 12)
src.tube(Tube([tuple(hl(0.06, 0.240, -0.030)) + (0.050,), tuple(hl(0.38, 0.262, -0.045)) + (0.050,),
               tuple(hl(0.72, 0.195, -0.055)) + (0.036,)], 10, hint=U_H), 12)       # cheek bone
src.blob(hl(0.10, 0.205, -0.12), (0.085, 0.20, 0.13), HEAD_FRAME)                    # masseter
src.blob(hl(1.385, 0.078, 0.036), (0.040, 0.075, 0.036), HEAD_FRAME)                 # nostril
src.blob(hl(0.02, 0.150, 0.190), (0.095, 0.130, 0.075), HEAD_FRAME)                  # horn boss
src.tube(Tube([tuple(hl(0.55, 0.0, 0.185)) + (0.050,), tuple(hl(0.95, 0.0, 0.115)) + (0.045,),
               tuple(hl(1.32, 0.0, 0.058)) + (0.040,)], 10, hint=U_H), 12)           # nasal ridge
# tongue (moves with the jaw)
_tg = Tube([tuple(hl(0.25, 0, -0.105)) + (0.11, 0.030, 0.03), tuple(hl(0.7, 0, -0.105)) + (0.085, 0.032, 0.03),
            tuple(hl(1.18, 0, -0.108)) + (0.05, 0.022, 0.02)], 10, hint=U_H, xform=jaw_open)
src.tube(_tg, 12)


def spine_size(s):
    """Dorsal spine length at arc position s (0 = none: saddle gap / head)."""
    y = float(np.interp(s, spine.s, spine.p[:, 1]))
    ht = float(np.interp(s, spine.s, spine.ht))
    if s < 0.22:
        return 0.0
    if -1.78 < y < -0.02:
        return 0.0                                     # natural saddle
    L = min(0.10 + 0.50 * ht, 0.42)
    if y >= -0.02:
        L = min(L, 0.36)
    if y < -1.78:
        L *= 1.0 + 0.25 * smoothstep(-3.0, -1.9, y)     # withers crest in front of the rider
    return L


DORSAL = []     # (s, L)
_s = 0.30
while _s < S_END - 0.12:
    L = spine_size(_s)
    if L <= 0:
        _s += 0.05
        continue
    DORSAL.append((_s, L))
    _s += 0.80 * L + 0.05
for s_, L in DORSAL:
    t_, sd_, up_ = spine.frame_at(s_)
    ht = float(np.interp(s_, spine.s, spine.ht))
    c = spine.at(s_) + up_ * (ht - 0.02)
    k = L / 0.3
    src.blob(c, (0.060 * k + 0.01, 0.15 * k, 0.062 * k), np.stack([X, t_, up_], axis=1))

SV, SF = src.arrays()
SVm = SV * _M
SV2 = np.concatenate([SV, SVm]); SF2 = np.concatenate([SF, SF[:, ::-1] + len(SV)])
log('source: %d verts, %d tris' % (len(SV2), len(SF2)))

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def temp_object(me):
    ob = bpy.data.objects.new(me.name, me)
    scene.collection.objects.link(ob)
    return ob


def apply_modifier_mesh(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    dg.update()
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    return me


ob = temp_object(tri_mesh('src', SV2, SF2))
md = ob.modifiers.new('rm', 'REMESH'); md.mode = 'VOXEL'; md.voxel_size = VOXEL; md.adaptivity = 0.0
me_hi = apply_modifier_mesh(ob)
bpy.data.objects.remove(ob)
HV, HT = mesh_arrays(me_hi)
log('voxel remesh: %d verts, %d tris' % (len(HV), len(HT)))

# 2. radius-aware smoothing (thin parts keep their shape, big masses fillet together)
ev, aff = fields(HV)
rloc = np.zeros(len(HV))
for i, c in enumerate(CHAINS):
    rloc += aff[:, i] * (ev[i]['r'] if c['rov'] is None else 0.115)
smf = np.clip((rloc - 0.10) / 0.42, 0.035, 1.0)
HE = edges_of(HT)
HV = laplace(HV, HE, 0.5 * smf, 26)
HV = laplace(HV, HE, 0.35, 2)
me_hi.vertices.foreach_set('co', HV.ravel()); me_hi.update()
log('smoothed')

# 3. bisect (keep +X) and decimate
bm = bmesh.new(); bm.from_mesh(me_hi)
bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=1e-5, plane_co=(0, 0, 0),
                       plane_no=(1, 0, 0), clear_inner=True)
bmesh.ops.triangulate(bm, faces=bm.faces[:])
bm.to_mesh(me_hi); bm.free()
n_hi = len(me_hi.polygons)
ob = temp_object(me_hi)
md = ob.modifiers.new('dec', 'DECIMATE'); md.ratio = BODY_HALF_TRIS / n_hi
me_lo = apply_modifier_mesh(ob)
bpy.data.objects.remove(ob)
BV, BT = mesh_arrays(me_lo)
log('half hi %d tris -> decimated %d verts %d tris' % (n_hi, len(BV), len(BT)))


def boundary_verts(T, n):
    E = np.concatenate([T[:, [0, 1]], T[:, [1, 2]], T[:, [2, 0]]]); E.sort(axis=1)
    u, cnt = np.unique(E, axis=0, return_counts=True)
    b = np.zeros(n, bool); b[u[cnt == 1].ravel()] = True
    return b


# keep only the largest connected component, snap the cut boundary onto the mirror plane
def components(T, n):
    lab = np.arange(n)
    E = edges_of(T)
    while True:
        m = np.minimum(lab[E[:, 0]], lab[E[:, 1]])
        new = lab.copy()
        np.minimum.at(new, E[:, 0], m); np.minimum.at(new, E[:, 1], m)
        new = new[new]
        if np.array_equal(new, lab):
            break
        lab = new
    return lab


lab = components(BT, len(BV))
big = np.bincount(lab).argmax()
keepv = lab == big
if not keepv.all():
    log('dropping %d verts in stray components' % (~keepv).sum())
    remap = -np.ones(len(BV), np.int64); remap[keepv] = np.arange(keepv.sum())
    BT = BT[keepv[BT].all(axis=1)]; BT = remap[BT].astype(np.int32); BV = BV[keepv]
bnd = boundary_verts(BT, len(BV))
log('boundary verts %d, max |x| on boundary %.4f' % (bnd.sum(), np.abs(BV[bnd, 0]).max()))
BV[bnd, 0] = 0.0
BV[:, 0] = np.maximum(BV[:, 0], 0.0)
BE = edges_of(BT)

# --------------------------------------------------------------------------------------
# 4. skin weights + shading fields on the body (build pose: jaw open)
# --------------------------------------------------------------------------------------
ev, aff = fields(BV)
NV_B = len(BV)
BW = np.zeros((NV_B, NB))
for i, c in enumerate(CHAINS):
    for b, w in c['wf'](ev[i]['s']).items():
        BW[:, BI[b]] += aff[:, i] * w
BW = laplace(BW, BE, 0.5, 3)


def prune4(W):
    idx = np.argsort(-W, axis=1)[:, :4]
    out = np.zeros_like(W)
    ar = np.arange(len(W))[:, None]
    out[ar, idx] = W[ar, idx]
    out[out < 0.01] = 0.0
    return out / out.sum(axis=1)[:, None]


BW = prune4(BW)

b_rloc = np.zeros(NV_B); b_flow = np.zeros((NV_B, 3))
for i, c in enumerate(CHAINS):
    b_rloc += aff[:, i] * (ev[i]['r'] if c['rov'] is None else c['rov'])
    b_flow += aff[:, i, None] * ev[i]['t'] * c['flow']
b_flow /= np.linalg.norm(b_flow, axis=1)[:, None] + 1e-9
a_sp = aff[:, CI['spine']]
b_cv = 1.0 - a_sp * (1.0 - ev[CI['spine']]['cu'])                      # -1 = ventral midline of the trunk
_plate_len = np.clip(0.30 * spine.hb, 0.05, 0.19)
_pc = np.concatenate([[0.0], np.cumsum(np.diff(spine.s) / (0.5 * (_plate_len[1:] + _plate_len[:-1])))])
b_pc = np.interp(ev[CI['spine']]['s'], spine.s, _pc)
b_chain = np.argmax(aff, axis=1)

BN = vertex_normals(BV, BT)
hloc = BV - HJ
is_jaw = BW[:, BI['jaw']] > 0.5
Pc = np.where(is_jaw[:, None], rot_x(BV, -JAW_OPEN, HINGE), BV) - HJ
Nc = np.where(is_jaw[:, None], rot_x_vec(BN, -JAW_OPEN), BN)
h_h, h_x, h_u = Pc @ A_H, Pc[:, 0], Pc @ U_H
n_u = Nc @ U_H
in_h = smoothstep(0.16, 0.26, h_h) * (1 - smoothstep(1.46, 1.52, h_h))
headish = (aff[:, CI['head']] + aff[:, CI['jaw']]) > 0.5
pal = (~is_jaw) * smoothstep(0.25, 0.6, -n_u) * smoothstep(-0.065, -0.090, h_u) * \
    (np.abs(h_x) < 0.93 * np.interp(h_h, SK_H, SK_W))
flo = is_jaw * smoothstep(0.25, 0.6, n_u) * smoothstep(-0.150, -0.125, h_u) * \
    (np.abs(h_x) < 0.93 * np.interp(h_h, JW_H, JW_W))
b_mouth = np.clip((pal + flo) * in_h * headish, 0, 1)
_nc = hl(1.40, 0.108, 0.050)
b_nostril = np.exp(-((BV - _nc) ** 2).sum(1) / (2 * 0.020 ** 2)) * (~is_jaw)

# close the jaw: build pose -> rest pose (linear blend skinning with the jaw weight)
wj = BW[:, BI['jaw']][:, None]
BV = BV + wj * (rot_x(BV, -JAW_OPEN, HINGE) - BV)
BV[:, 0] = np.maximum(BV[:, 0], 0.0)
BN = vertex_normals(BV, BT)
log('body weights + fields done')

bvh = BVHTree.FromPolygons([tuple(v) for v in BV], [tuple(int(i) for i in t) for t in BT])


def ray(o, d, dist=6.0):
    hit, n, idx, dd = bvh.ray_cast(Vector(tuple(o)), Vector(tuple(d)), dist)
    return None if hit is None else np.array(hit)


# --------------------------------------------------------------------------------------
# 5. rigid detail parts (rest pose).  material ids: 0 skin, 1 horn, 2 eye
# --------------------------------------------------------------------------------------
class Parts:
    def __init__(self):
        self.V, self.F, self.UV, self.MAT, self.DA, self.W = [], [], [], [], [], []
        self.n = 0

    def add(self, V, F, UV, mat, da, weights):
        V = np.asarray(V, float)
        self.V.append(V)
        self.F.extend([(a + self.n, b + self.n, c + self.n) for a, b, c in F])
        self.UV.extend(UV)
        self.MAT.extend([mat] * len(F))
        self.DA.append(np.asarray(da, float))
        w = np.zeros((len(V), NB))
        for b, x in weights.items():
            w[:, BI[b]] = x
        self.W.append(w / w.sum(axis=1)[:, None])
        self.n += len(V)

    def horn(self, tb, nseg, weights, kind=0.0, half=False, tip0=0.0):
        V, F, UV, ring = loft(tb, nseg, half=half, cap0=False, cap1=True)
        tipn = np.clip((tb.s[ring] / tb.s[-1] - tip0) / (1 - tip0), 0, 1)
        da = np.stack([tipn, np.full(len(V), kind), np.full(len(V), RNG.rand())], axis=1)
        self.add(V, F, UV, 1, da, weights)


parts = Parts()


def curved_cone(base, d, L, r, bend, n=6, flat=1.0, sink=0.18, hint=Z, side=None, rpow=0.85):
    d = nrm(d); bend = np.asarray(bend, float)
    ctrl = []
    for t in np.linspace(-sink, 1.0, 6):
        p = np.asarray(base) + L * (d * t + bend * t * abs(t))
        rr = r * max(1.0 - max(t, 0.0), 0.0) ** rpow + 0.0015
        ctrl.append(tuple(p) + (rr * flat, rr, rr))
    return Tube(ctrl, n, hint=hint, side=side)


def hdir(h, x, up):
    return h * A_H + x * X + up * U_H


# horns (head-local specs)
parts.horn(curved_cone(hl(0.03, 0.150, 0.215), hdir(-1.0, 0.28, 0.42), 0.92, 0.072, hdir(0.0, 0.06, 0.16), n=9),
           8, {'head': 1}, tip0=0.14)
parts.horn(curved_cone(hl(0.00, 0.245, 0.040), hdir(-1.0, 0.50, 0.05), 0.55, 0.052, hdir(0.0, -0.10, 0.10), n=7),
           7, {'head': 1}, tip0=0.14)
parts.horn(curved_cone(hl(-0.02, 0.215, 0.140), hdir(-1.0, 0.42, 0.22), 0.36, 0.040, hdir(0.0, 0.0, 0.08), n=6),
           6, {'head': 1}, tip0=0.14)
parts.horn(curved_cone(hl(0.24, 0.245, 0.235), hdir(-0.9, 0.30, 0.45), 0.20, 0.034, hdir(-0.1, 0, 0.05), n=5),
           6, {'head': 1}, tip0=0.14)
parts.horn(curved_cone(hl(0.02, 0.200, -0.255), hdir(-0.9, 0.30, -0.42), 0.26, 0.036, hdir(-0.1, 0.0, 0.10), n=5),
           6, {'jaw': 1}, tip0=0.14)
parts.horn(curved_cone(hl(0.42, 0.185, -0.270), hdir(-0.7, 0.25, -0.60), 0.14, 0.026, hdir(-0.1, 0.0, 0.05), n=5),
           5, {'jaw': 1}, tip0=0.14)
# nose horn (centre line -> half loft)
_hit = ray(hl(1.27, 0.012, 0.6), -U_H)
if _hit is not None:
    _b = _hit.copy(); _b[0] = 0.0
    parts.horn(curved_cone(_b - U_H * 0.01, hdir(-0.45, 0, 1.0), 0.15, 0.040, hdir(-0.25, 0, 0.0), n=5,
                           side=X, flat=0.8), 5, {'head': 1}, half=True, tip0=0.14)

# dorsal spines (centre line -> half lofts), each rigid with the local spine weights
N_DORSAL = 0
for s_, L in DORSAL:
    t_, sd_, up_ = spine.frame_at(s_)
    c0 = spine.at(s_)
    hit = ray(c0 + up_ * 2.0 + X * 0.012, -up_)
    if hit is None:
        continue
    base = hit.copy(); base[0] = 0.0
    k = L / 0.3
    lean = math.radians(52.0)
    d = up_ * math.cos(lean) + t_ * math.sin(lean)
    ctrl = []
    for t in (-0.22, 0.0, 0.3, 0.62, 0.88, 1.0):
        p = base + L * (d * t + (t_ * 0.30 - up_ * 0.10) * t * abs(t))
        f = max(1.0 - max(t, 0.0), 0.0)
        ctrl.append(tuple(p) + (0.040 * k * f ** 0.8 + 0.002, 0.105 * k * f ** 0.9 + 0.002, 0.085 * k * f ** 0.9 + 0.002))
    tb = Tube(ctrl, 7, side=X)
    tb.exps = (1.6, 1.6)
    wd = {b: float(w) for b, w in spine_w(np.array([s_])).items() if float(w) > 0.02}
    parts.horn(tb, 5, wd, half=True, tip0=0.16)
    N_DORSAL += 1
# tail tip spike
_te = spine.p[-1]
parts.horn(Tube([tuple(_te - Y * 0.25) + (0.040, 0.040, 0.040), tuple(_te - Y * 0.02) + (0.045, 0.042, 0.042),
                 tuple(_te + Y * 0.22) + (0.034, 0.026, 0.026), tuple(_te + Y * 0.50 + Z * 0.02) + (0.002, 0.002, 0.002)],
                8, side=-X), 5, {'tail10': 1}, half=True, tip0=0.3)

# claws
for leg, b, m_, tip, r0, r1, rear, d in TOES:
    L = (0.20 if leg == 'F' else 0.24) * (0.7 if rear else 1.0)
    base = tip - d * 0.03 + Z * 0.012
    tb = curved_cone(base, d + Z * 0.25, L, r1 * 0.86, -Z * 0.42, n=6, flat=0.72, sink=0.25,
                     hint=Z, rpow=0.8)
    parts.horn(tb, 6, {('legFL_lower' if leg == 'F' else 'legBL_lower'): 1}, tip0=0.2)
# wing thumb claw
parts.horn(curved_cone(WRIST + np.array([0.06, -0.05, 0.0]), np.array([0.25, -1.0, 0.12]), 0.50, 0.062,
                       np.array([0.30, 0.25, -0.12]), n=7, flat=0.8, sink=0.25), 7, {'wingL_elbow': 1}, tip0=0.2)

# finger bones (gilded)
for k in range(3):
    ss = np.linspace(0.0, 1.0, 9)
    pts = finger_curve(k, ss)
    rr = 0.088 * (1 - ss) ** 0.75 + 0.014
    rr = rr * (1 + 0.30 * np.exp(-((ss - 0.375) / 0.035) ** 2) + 0.30 * np.exp(-((ss - 0.70) / 0.03) ** 2))
    tb = Tube([tuple(p) + (r,) for p, r in zip(pts, rr)], 22, hint=Z)
    V, F, UV, ring = loft(tb, 7, cap0=False, cap1=True)
    da = np.stack([tb.s[ring] / tb.s[-1], np.full(len(V), 2.0), np.full(len(V), RNG.rand())], axis=1)
    parts.add(V, F, UV, 1, da, {'wingL_f%d' % (k + 1): 1})

# teeth
for h in np.arange(0.44, 1.46, 0.072):
    w = float(np.interp(h, SK_H, SK_W)); bot = float(np.interp(h, SK_H, SK_BOT))
    big = 1.0 + 0.9 * math.exp(-((h - 1.22) / 0.08) ** 2) + 0.4 * math.exp(-((h - 0.8) / 0.06) ** 2)
    L = 0.058 * big * (0.8 + 0.4 * RNG.rand())
    base = hl(h, 0.885 * w - 0.012, bot + 0.035)
    tb = curved_cone(base, hdir(-0.12, 0.10, -1.0), L + 0.035, 0.017 * (0.8 + 0.2 * big), hdir(-0.1, -0.1, 0), n=4,
                     sink=0.0, hint=A_H)
    parts.horn(tb, 5, {'head': 1}, kind=1.0, tip0=0.3)
for h in np.arange(0.48, 1.40, 0.072):
    w = float(np.interp(h, JW_H, JW_W)); top = float(np.interp(h, JW_H, JW_TOP))
    L = 0.05 * (0.8 + 0.4 * RNG.rand()) * (1.0 + 0.7 * math.exp(-((h - 1.3) / 0.07) ** 2))
    base = hl(h, 0.80 * w - 0.01, top - 0.03)
    tb = curved_cone(base, hdir(-0.1, 0.05, 1.0), L + 0.03, 0.015, hdir(-0.1, -0.05, 0), n=4, sink=0.0, hint=A_H)
    parts.horn(tb, 5, {'jaw': 1}, kind=1.0, tip0=0.3)

# eye
EYE_R = 0.052
_eo = hl(0.37, 0.8, 0.085)
_hit = ray(_eo, -X)
EYE_C = (_hit if _hit is not None else hl(0.37, 0.27, 0.085)) - X * (0.50 * EYE_R)
_eout = nrm(X * math.cos(math.radians(18)) + A_H * math.sin(math.radians(18)) + U_H * 0.05)
_ex = nrm(np.cross(U_H, _eout)); _ey = np.cross(_eout, _ex)
EV, EF = ellipsoid(EYE_C, (EYE_R, EYE_R, EYE_R), nu=14, nv=10)
_el = (EV - EYE_C) / EYE_R
parts.add(EV, EF, [((0.0, 0.0), (0.02, 0.0), (0.0, 0.02))] * len(EF), 2,
          np.stack([_el @ _ex, _el @ _ey, _el @ _eout], axis=1), {'head': 1})
# give the eye a real little UV patch (orthographic along the view axis)
_euv = np.stack([_el @ _ex, _el @ _ey], axis=1) * EYE_R * 2.0
parts.UV[-len(EF):] = [tuple(tuple(_euv[i]) for i in f) for f in EF]

PV = np.concatenate(parts.V); PF = np.array(parts.F, np.int32)
PW = np.concatenate(parts.W); PDA = np.concatenate(parts.DA)
PMAT = np.array(parts.MAT, np.int32)
log('parts: %d verts %d tris (%d dorsal spines)' % (len(PV), len(PF), N_DORSAL))


# --------------------------------------------------------------------------------------
# 6. wing membrane (left)
# --------------------------------------------------------------------------------------
def build_membrane():
    NU, NS, NT_, ND = 46, 20, 14, 4
    Vs, Ws, Es, Fs = [], [], [], []
    key = {}

    def vid(p, w, e):
        k = tuple(np.round(p, 4))
        if k in key:
            return key[k]
        key[k] = len(Vs); Vs.append(np.asarray(p, float)); Ws.append(w); Es.append(e)
        return key[k]

    def wvec(d):
        w = np.zeros(NB)
        for b, x in d.items():
            w[BI[b]] = x
        return w / w.sum()

    def grid(P, Wt, Em):
        nu, nv = P.shape[0], P.shape[1]
        ids = [[vid(P[i, j], Wt[i][j], Em[i][j]) for j in range(nv)] for i in range(nu)]
        for i in range(nu - 1):
            for j in range(nv - 1):
                a, b, c, d = ids[i][j], ids[i + 1][j], ids[i + 1][j + 1], ids[i][j + 1]
                for tri in ((a, b, c), (a, c, d)):
                    if len(set(tri)) == 3:
                        Fs.append(tri)

    ss = np.linspace(0, 1, NS + 1)
    # finger panels (f1-f2, f2-f3)
    for k in (0, 1):
        tt = np.linspace(0, 1, NT_ + 1)
        P = np.zeros((NS + 1, NT_ + 1, 3)); Wt = []; Em = []
        depth = 0.24 if k == 0 else 0.22
        for i, s in enumerate(ss):
            roww, rowe = [], []
            for j, t in enumerate(tt):
                m = 1.0 - depth * math.sin(math.pi * t) ** 0.85
                a = finger_curve(k, np.array(s * m)); b = finger_curve(k + 1, np.array(s * m))
                p = a * (1 - t) + b * t
                p[2] += 0.16 * math.sin(math.pi * t) * math.sin(math.pi * min(1.0, s * 1.15)) ** 0.8
                P[i, j] = p
                st = float(smoothstep(0.0, 1.0, t))
                roww.append(wvec({'wingL_f%d' % (k + 1): 1 - st + 1e-6, 'wingL_f%d' % (k + 2): st + 1e-6}))
                rowe.append(math.sin(math.pi * t) ** 0.6 * min(1.0, s * 3.0) * (1 - s ** 7))
            Wt.append(roww); Em.append(rowe)
        grid(P, Wt, Em)
    # arm panel (body .. f3) as a Coons patch
    uu = np.linspace(0, 1, NU + 1)
    arm_s = uu * S_ARM_W
    c0 = arm.at(arm_s)                                           # leading: arm centre line
    c0[-1] = WRIST
    aw = arm_wf(arm_s)
    hip = HIP_ATTACH; t3 = FINGER_TIPS[2]
    perp = nrm(np.cross(Z, t3 - hip))
    if perp[1] > 0:
        perp = -perp
    c1 = hip[None] * (1 - uu[:, None]) + t3[None] * uu[:, None] + \
        (0.62 * np.sin(math.pi * uu ** 0.9) ** 0.9)[:, None] * perp[None]
    d0 = c0[0][None] * (1 - ss[:, None]) + hip[None] * ss[:, None]
    d1 = finger_curve(2, ss)
    P = np.zeros((NU + 1, NS + 1, 3)); Wt = []; Em = []
    for i, u in enumerate(uu):
        roww, rowe = [], []
        for j, v in enumerate(ss):
            p = (1 - v) * c0[i] + v * c1[i] + (1 - u) * d0[j] + u * d1[j] - \
                ((1 - u) * (1 - v) * c0[0] + u * (1 - v) * c0[-1] + (1 - u) * v * c1[0] + u * v * c1[-1])
            p[2] += 0.20 * math.sin(math.pi * u) * math.sin(math.pi * v) ** 0.8 - 0.06 * v * math.sin(math.pi * u)
            P[i, j] = p
            wa = np.zeros(NB)
            for b, x in aw.items():
                wa[BI[b]] = x[i]
            su = float(smoothstep(0.02, 1.0, u))
            wtr = wvec({'body': 1 - su + 1e-6, 'wingL_f3': su + 1e-6})
            vv = v ** 0.85
            w = (1 - vv) * wa + vv * wtr
            kf = float(smoothstep(0.80, 1.0, u)) * min(1.0, v / 0.12)
            w = (1 - kf) * w + kf * wvec({'wingL_f3': 1})
            roww.append(w / w.sum())
            rowe.append(math.sin(math.pi * u) ** 0.5 * min(1.0, v * 4.0) * (1 - v ** 7))
        Wt.append(roww); Em.append(rowe)
    grid(P, Wt, Em)
    # propatagium (leading-edge skin in front of the elbow)
    a0 = np.array([0.45, -0.95, 0.42])
    lead = a0[None] * (1 - uu[:, None]) + WRIST[None] * uu[:, None]
    lead[:, 1] += 0.34 * np.sin(math.pi * uu) ** 1.2
    lead[:, 2] += 0.10 * np.sin(math.pi * uu)
    vv_ = np.linspace(0, 1, ND + 1)
    P = np.zeros((NU + 1, ND + 1, 3)); Wt = []; Em = []
    for i, u in enumerate(uu):
        wa = np.zeros(NB)
        for b, x in aw.items():
            wa[BI[b]] = x[i]
        wa /= wa.sum()
        roww, rowe = [], []
        for j, v in enumerate(vv_):
            P[i, j] = lead[i] * (1 - v) + c0[i] * v
            roww.append(wa)
            rowe.append(0.55 * math.sin(math.pi * v) * math.sin(math.pi * u) ** 0.5)
        Wt.append(roww); Em.append(rowe)
    grid(P, Wt, Em)
    V = np.array(Vs); F = np.array(Fs, np.int32); W = np.array(Ws); E = np.array(Es)
    # consistent winding: normals up
    fn = np.cross(V[F[:, 1]] - V[F[:, 0]], V[F[:, 2]] - V[F[:, 0]])
    flip = fn[:, 2] < 0
    F[flip] = F[flip][:, ::-1]
    return V, F, prune4(W), E


arm_wf = CHAINS[CI['arm']]['wf']
MV, MF, MW, ME_ = build_membrane()
_mn, _mx = MV[:, :2].min(axis=0), MV[:, :2].max(axis=0)
_span = (_mx - _mn).max() * 1.02
MUV = (MV[:, :2] - _mn) / _span + 0.01
MUV[:, 1] = MUV[:, 1]            # v grows towards the tail
log('membrane: %d verts %d tris' % (len(MV), len(MF)))

# --------------------------------------------------------------------------------------
# 7. half mesh in Blender: attributes, UV unwrap + pack
# --------------------------------------------------------------------------------------
NVH = NV_B + len(PV)
HVt = np.concatenate([BV, PV])
HF = np.concatenate([BT, PF + NV_B])
HW = np.concatenate([BW, PW])
HMAT = np.concatenate([np.zeros(len(BT), np.int32), PMAT])
h_da = np.concatenate([np.stack([b_cv, b_pc, b_rloc], axis=1), PDA])
h_db = np.concatenate([np.stack([b_mouth, b_nostril, np.zeros(NV_B)], axis=1), np.zeros((len(PV), 3))])
h_flow = np.concatenate([b_flow, np.zeros((len(PV), 3))])

me_h = tri_mesh('DragonHalf', HVt, HF)
me_h.polygons.foreach_set('material_index', HMAT)
me_h.polygons.foreach_set('use_smooth', np.ones(len(HF), bool))
for nm, arr in (('da', h_da), ('db', h_db), ('flow', h_flow)):
    at = me_h.attributes.new(nm, 'FLOAT_VECTOR', 'POINT')
    at.data.foreach_set('vector', arr.astype(np.float32).ravel())
uvl = me_h.uv_layers.new(name='UVMap')
uv0 = np.zeros((len(HF) * 3, 2), np.float32)
uv0[len(BT) * 3:] = np.array(parts.UV, np.float32).reshape(-1, 2)
uvl.data.foreach_set('uv', uv0.ravel())

# UV labels for the body (islands = connected faces with one label)
fa = aff[BT].mean(axis=1)
fch = np.argmax(fa, axis=1)
fs = np.stack([e['s'] for e in ev], axis=1)[BT].mean(axis=1)           # (F, nchains)
fou = np.stack([e['ou'] for e in ev], axis=1)[BT].mean(axis=1)
fos = np.stack([e['os'] for e in ev], axis=1)[BT].mean(axis=1)
flabel = np.zeros(len(BT), np.int32)
is_foot = np.zeros(len(BT), bool)
for f in range(len(BT)):
    c = fch[f]; s = fs[f, c]
    if c == CI['spine']:
        cuts = [1.9, S_NECKBASE, S_NECKBASE + 2.2, S_TAILBASE, S_TAILBASE + 1.8, S_TAILBASE + 3.8]
        flabel[f] = 10 + int(np.searchsorted(cuts, s))
    elif c == CI['head']:
        flabel[f] = 20
    elif c == CI['jaw']:
        flabel[f] = 22
    elif c == CI['legF']:
        flabel[f] = 30 + (1 if s > S_ELBOW_F else 0) * 2 + (1 if fos[f, c] > 0 else 0)
        is_foot[f] = s > legF.ctrl_s[4] + 0.12
    elif c == CI['legB']:
        flabel[f] = 40 + (1 if s > S_KNEE_B else 0) * 2 + (1 if fos[f, c] > 0 else 0)
        is_foot[f] = s > legB.ctrl_s[5] + 0.10
    else:
        flabel[f] = 50 + (1 if s > S_ARM_E else 0) * 2 + (1 if fou[f, c] > 0 else 0)
fmouth = b_mouth[BT].mean(axis=1) > 0.5
flabel[fmouth & (flabel == 20)] = 21
flabel[fmouth & (flabel == 22)] = 23
flabel[is_foot] = 60
is_headface = (flabel >= 20) & (flabel <= 23)

ob_h = temp_object(me_h)
ob_h.name = 'DragonHalf'
bpy.context.view_layer.objects.active = ob_h
ob_h.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bm = bmesh.from_edit_mesh(me_h)
bm.faces.ensure_lookup_table()
for e in bm.edges:
    fl = [flabel[f.index] if f.index < len(BT) else -1 for f in e.link_faces]
    e.seam = len(fl) == 2 and fl[0] != fl[1]
for f in bm.faces:
    f.select = f.index < len(BT) and not is_foot[f.index]
bmesh.update_edit_mesh(me_h)
bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=0.001)
bm = bmesh.from_edit_mesh(me_h); bm.faces.ensure_lookup_table()
for f in bm.faces:
    f.select = f.index < len(BT) and bool(is_foot[f.index])
bmesh.update_edit_mesh(me_h)
bpy.ops.uv.smart_project(angle_limit=math.radians(62), island_margin=0.0)
bpy.ops.mesh.select_all(action='SELECT')
bpy.ops.uv.select_all(action='SELECT')
bpy.ops.uv.average_islands_scale()
# more texels for the head, eyes and horns
bm = bmesh.from_edit_mesh(me_h); bm.faces.ensure_lookup_table()
uvlay = bm.loops.layers.uv.verify()
for f in bm.faces:
    k = 1.0
    if f.index < len(BT):
        if is_headface[f.index]:
            k = 1.7
    elif HMAT[f.index] == 2:
        k = 3.0
    if k != 1.0:
        for lp in f.loops:
            lp[uvlay].uv *= k
bmesh.update_edit_mesh(me_h)
bpy.ops.uv.pack_islands(rotate=True, margin=0.0025)
bpy.ops.object.mode_set(mode='OBJECT')
HUV = np.empty(len(HF) * 3 * 2, np.float32); me_h.uv_layers[0].data.foreach_get('uv', HUV)
HUV = HUV.reshape(-1, 2)
log('uv done: range %s %s' % (HUV.min(axis=0), HUV.max(axis=0)))

# normals for baking + export: mirror-plane verts get in-plane normals
HN = np.empty(NVH * 3, np.float32); me_h.vertices.foreach_get('normal', HN)
HN = HN.reshape(-1, 3).astype(float)
onplane = HVt[:, 0] <= 1e-7
HN[onplane, 0] = 0.0
HN /= np.linalg.norm(HN, axis=1)[:, None] + 1e-12
me_h.normals_split_custom_set_from_vertices([tuple(n) for n in HN])

# membrane object
me_m = tri_mesh('MembraneL', MV, MF)
me_m.polygons.foreach_set('use_smooth', np.ones(len(MF), bool))
at = me_m.attributes.new('da', 'FLOAT_VECTOR', 'POINT')
at.data.foreach_set('vector', np.stack([ME_, np.zeros(len(MV)), np.zeros(len(MV))], axis=1).astype(np.float32).ravel())
ul = me_m.uv_layers.new(name='UVMap')
ul.data.foreach_set('uv', MUV[MF.ravel()].astype(np.float32).ravel())
ob_m = temp_object(me_m)
MN = np.empty(len(MV) * 3, np.float32); me_m.vertices.foreach_get('normal', MN); MN = MN.reshape(-1, 3).astype(float)

# --------------------------------------------------------------------------------------
# 8. materials + baking
# --------------------------------------------------------------------------------------
IMAGES = {}
exec(compile(open(os.path.join(HERE, 'dragon_materials.py')).read(), 'dragon_materials.py', 'exec')) \
    if (not QUICK and os.path.exists(os.path.join(HERE, 'dragon_materials.py'))) else None

# --------------------------------------------------------------------------------------
# 9. final mirrored mesh, armature, export
# --------------------------------------------------------------------------------------
log('assembling final mesh')
nonpl = np.where(~onplane)[0]
mir_idx = np.arange(NVH)
mir_idx[nonpl] = NVH + np.arange(len(nonpl))
FV = np.concatenate([HVt, HVt[nonpl] * _M])
FN = np.concatenate([HN, HN[nonpl] * _M])
FW = np.concatenate([HW, HW[nonpl][:, MIRROR_COL]])
FF = np.concatenate([HF, mir_idx[HF][:, ::-1]])
FUV = np.concatenate([HUV.reshape(-1, 3, 2), HUV.reshape(-1, 3, 2)[:, ::-1]]).reshape(-1, 2)
FMAT = np.concatenate([HMAT, HMAT])
FMAT = np.where(FMAT == 2, 2, 0)                    # export slots: 0 body, 1 membrane, 2 eye
n_body = len(FV)
# membranes
mF = np.concatenate([MF, MF[:, ::-1] + len(MV)]) + n_body
mUV = np.concatenate([MUV[MF.ravel()].reshape(-1, 3, 2), MUV[MF.ravel()].reshape(-1, 3, 2)[:, ::-1]]).reshape(-1, 2)
AV = np.concatenate([FV, MV, MV * _M])
AN = np.concatenate([FN, MN, MN * _M])
AW = np.concatenate([FW, MW, MW[:, MIRROR_COL]])
AF = np.concatenate([FF, mF])
AUV = np.concatenate([FUV, mUV])
AMAT = np.concatenate([FMAT, np.ones(len(MF) * 2, np.int32)])

me = tri_mesh('Dragon', AV, AF)
me.polygons.foreach_set('material_index', AMAT.astype(np.int32))
me.polygons.foreach_set('use_smooth', np.ones(len(AF), bool))
ul = me.uv_layers.new(name='UVMap')
ul.data.foreach_set('uv', AUV.astype(np.float32).ravel())
me.normals_split_custom_set_from_vertices([tuple(n) for n in AN])
dragon = bpy.data.objects.new('Dragon', me)
scene.collection.objects.link(dragon)


def flat_mat(name, col, rough, metal, double=False, emit=None):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = col + (1,)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = emit + (1,)
        b.inputs['Emission Strength'].default_value = 1.0
    m.use_backface_culling = not double
    return m


def gltf_output_group():
    ng = bpy.data.node_groups.get('glTF Material Output')
    if ng is None:
        ng = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
        ng.interface.new_socket('Occlusion', in_out='INPUT', socket_type='NodeSocketFloat')
    return ng


def pbr_mat(name, base, normal, orm, double=False, emissive=False):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    tb_ = nt.nodes.new('ShaderNodeTexImage'); tb_.image = base
    nt.links.new(tb_.outputs['Color'], b.inputs['Base Color'])
    tn = nt.nodes.new('ShaderNodeTexImage'); tn.image = normal
    nm = nt.nodes.new('ShaderNodeNormalMap')
    nt.links.new(tn.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    to = nt.nodes.new('ShaderNodeTexImage'); to.image = orm
    sep = nt.nodes.new('ShaderNodeSeparateColor')
    nt.links.new(to.outputs['Color'], sep.inputs['Color'])
    nt.links.new(sep.outputs['Green'], b.inputs['Roughness'])
    nt.links.new(sep.outputs['Blue'], b.inputs['Metallic'])
    g = nt.nodes.new('ShaderNodeGroup'); g.node_tree = gltf_output_group()
    nt.links.new(sep.outputs['Red'], g.inputs['Occlusion'])
    if emissive:
        nt.links.new(tb_.outputs['Color'], b.inputs['Emission Color'])
        b.inputs['Emission Strength'].default_value = 1.0
    m.use_backface_culling = not double
    return m


if IMAGES:
    mats = [pbr_mat('DragonBody', IMAGES['body_base'], IMAGES['body_normal'], IMAGES['body_orm']),
            pbr_mat('DragonMembrane', IMAGES['wing_base'], IMAGES['wing_normal'], IMAGES['wing_orm'], double=True),
            pbr_mat('DragonEye', IMAGES['body_base'], IMAGES['body_normal'], IMAGES['body_orm'], emissive=True)]
else:
    mats = [flat_mat('DragonBody', (0.10, 0.22, 0.16), 0.5, 0.35),
            flat_mat('DragonMembrane', (0.62, 0.38, 0.10), 0.6, 0.0, double=True),
            flat_mat('DragonEye', (0.9, 0.5, 0.05), 0.1, 0.0, emit=(0.9, 0.45, 0.05))]
for m in mats:
    me.materials.append(m)

# vertex groups
for b in BONES:
    dragon.vertex_groups.new(name=b)
nzv, nzb = np.nonzero(AW)
for v, b in zip(nzv.tolist(), nzb.tolist()):
    dragon.vertex_groups[b].add([v], float(AW[v, b]), 'REPLACE')

# armature: every bone points +Z (Blender) with roll 0 -> identity rest rotation in glTF
arm_data = bpy.data.armatures.new('DragonRig')
arm_ob = bpy.data.objects.new('DragonArmature', arm_data)
scene.collection.objects.link(arm_ob)
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = arm_ob
arm_ob.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
for b in BONES:
    eb = arm_data.edit_bones.new(b)
    h = BONE_HEAD[b]
    eb.head = tuple(h); eb.tail = (h[0], h[1], h[2] + (0.5 if b in ('root', 'body') else 0.25)); eb.roll = 0.0
for b in BONES:
    if BONE_PARENT[b]:
        arm_data.edit_bones[b].parent = arm_data.edit_bones[BONE_PARENT[b]]
        arm_data.edit_bones[b].use_connect = False
bpy.ops.object.mode_set(mode='OBJECT')
dragon.parent = arm_ob
mod = dragon.modifiers.new('Armature', 'ARMATURE'); mod.object = arm_ob

ntri = len(AF)
log('final: %d verts, %d tris' % (len(AV), ntri))
bpy.ops.object.select_all(action='DESELECT')
dragon.select_set(True); arm_ob.select_set(True)
bpy.context.view_layer.objects.active = arm_ob
for o in (ob_h, ob_m):
    o.hide_render = True
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', use_selection=True, export_yup=True,
                          export_image_format='JPEG', export_jpeg_quality=JPEG_Q, export_image_quality=JPEG_Q,
                          export_skins=True, export_animations=False, export_tangents=False,
                          export_draco_mesh_compression_enable=False, export_materials='EXPORT',
                          export_all_influences=False, export_def_bones=False, export_morph=False,
                          export_cameras=False, export_lights=False, export_extras=False, export_apply=False)
log('wrote %s (%.2f MB), %d triangles' % (OUT_GLB, os.path.getsize(OUT_GLB) / 1e6, ntri))
try:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SCRATCH, 'dragon_build.blend'))
except Exception as e:           # debugging aid only
    log('blend save skipped:', e)
log('done')

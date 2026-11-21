#!/usr/bin/env python3
"""Builds the compressed 1650 overworld: public/world/regions/overworld.json + landcover.png.

Inputs: towns.json, walls/*.json (town radii, gates), the regional Ferraris tiles and the
regional OSM extract ($REGIONS_CACHE/region/, see fetch_region.py and extract_pbf.py).
Layout and warp: warp.py (formula in its docstring and in docs/history/regions-1650.md).

  1. Ferraris tiles (5 m/px, region frame) -> class fractions on a 20 m real grid
  2. landcover.png: every 20 m overworld pixel is warped to a real point and takes the
     dominant class of a ~120 m (K x 20 m) real window around it; inside town radii the
     mapping is 1:1 and the window is one 20 m cell
  3. rivers: OSM river centrelines merged per river, simplified, densified, warped
  4. roads: shortest path over OSM trunk/primary/secondary roads between the facing
     gates of linked towns (towns.json "links"), warped; straight line if no path
  5. villages: OSM place=village|hamlet (and minor towns) with Ferraris built-up land
     within 250 m, warped (outside the Ferraris coverage - the Republic, Wallonia - kept
     unchecked, "ferraris": false)
  6. sea: the OSM coastline, flood-filled from the North Sea (Westerschelde included);
     the drowned land of Saeftinghe as marsh (sites.json)
  7. dikes along the Scheldt estuary (OSM man_made=dyke near the Schelde), warped
  8. polities c. 1650 (politics.json + admin.json), warped polygons and a per-village lookup
  9. sites: points outside the towns (forts, abbeys, lost villages; sites.json)
Usage: build_overworld.py
"""
import heapq, json, math, os
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from common import CACHE, HERE, REPO, Frame, config
from ferraris_classes import BUILT, FIELD, HEATH, MEADOW, WATER, WOOD, classify
import warp

cfg = config()
L = warp.get_layout()
K = L["K"]
ref = L["ref"]
towns = L["towns"]
OUT = os.path.join(REPO, "public", "world", "regions")
PREV = os.path.join(CACHE, "previews")
os.makedirs(OUT, exist_ok=True)
os.makedirs(PREV, exist_ok=True)
RC = 20.0  # real class grid cell (m)

# ------------------------------------------------------------------ 1. real class fractions
idx = json.load(open(os.path.join(CACHE, "region", "ferraris", "index.json")))
RX0, RZ0, RX1, RZ1 = idx["x0"], idx["z0"], idx["x1"], idx["z1"]
GW, GH = int((RX1 - RX0) / RC), int((RZ1 - RZ0) / RC)
frac_path = os.path.join(CACHE, "region", "classfrac20.npy")
if os.path.exists(frac_path):
    frac = np.load(frac_path)
else:
    frac = np.zeros((GH, GW, 6), np.float16)
    sub = int(RC / idx["mpp"])
    tsz = int(idx["tile"] / sub)
    for tx, tz in idx["tiles"]:
        im = np.asarray(Image.open(os.path.join(CACHE, "region", "ferraris", f"t_{int(tx)}_{int(tz)}.jpg")).convert("RGB")).astype(np.float32)
        blank = im.mean(-1) > 250  # areas outside the service's coverage come back white
        cls = classify(im)
        cls[blank] = 255
        gx, gz = int((tx - RX0) / RC), int((tz - RZ0) / RC)
        for k in range(6):
            m = (cls == k).astype(np.float32)
            frac[gz:gz + tsz, gx:gx + tsz, k] = cv2.resize(m, (tsz, tsz), interpolation=cv2.INTER_AREA)
        print("  classified tile", tx, tz, flush=True)
    np.save(frac_path, frac)
frac = frac.astype(np.float32)
# outside the service's coverage the tiles are near-white (JPEG ~248, not 255): blank them, with a
# 300 m border, so the classifier's heath/meadow artefacts there do not show (cached)
blank_path = os.path.join(CACHE, "region", "blank20.npy")
if os.path.exists(blank_path):
    blank20 = np.load(blank_path)
else:
    blank20 = np.zeros((GH, GW), bool)
    sub = int(RC / idx["mpp"])
    tsz = int(idx["tile"] / sub)
    for tx, tz in idx["tiles"]:
        im = np.asarray(Image.open(os.path.join(CACHE, "region", "ferraris", f"t_{int(tx)}_{int(tz)}.jpg")).convert("RGB")).astype(np.int16)
        bl = ((im.min(-1) > 236) & (im.max(-1) - im.min(-1) < 12)).astype(np.uint8)
        bl = cv2.dilate(bl, np.ones((121, 121), np.uint8))
        gx, gz = int((tx - RX0) / RC), int((tz - RZ0) / RC)
        blank20[gz:gz + tsz, gx:gx + tsz] = cv2.resize(bl, (tsz, tsz), interpolation=cv2.INTER_AREA) > 0.5
    np.save(blank_path, blank20)
frac[blank20] = 0
covered = frac.sum(-1) > 0.5


def real_cell(x, z):
    return ((np.asarray(x) - RX0) / RC).astype(int), ((np.asarray(z) - RZ0) / RC).astype(int)


# ------------------------------------------------------------------ rivers (real)
RIVERS = {  # canonical name: (OSM names, real width in m c.1650)
    "Schelde": (["Schelde", "Zeeschelde", "Boven-Zeeschelde", "Beneden-Zeeschelde", "Bovenschelde", "Escaut", "Oude Schelde"], 350),
    "Rupel": (["Rupel"], 150),
    "Nete": (["Nete", "Beneden-Nete"], 40),
    "Grote Nete": (["Grote Nete"], 16),
    "Kleine Nete": (["Kleine Nete"], 16),
    "Dijle": (["Dijle", "Dyle", "Dyle - Dijle"], 22),
    "Demer": (["Demer"], 20),
    "Zenne": (["Zenne", "Senne - Zenne", "Zenne - Senne", "Senne", "La Senne"], 14),
    "Durme": (["Durme"], 30),
    "Leie": (["Leie", "Lys", "La Lys", "Leie - La Lys", "Oude Leie"], 30),
    "Dender": (["Dender", "Dendre"], 25),
    "Maas": (["Maas", "Meuse", "La Meuse"], 120),
    "IJzer": (["IJzer", "Yser"], 25),
    "Grote Gete": (["Grote Gete", "Grote Gete - Grande Gette", "Gete"], 10),
    "Kleine Gete": (["Kleine Gete"], 8),
    "Velp": (["Velpe", "Velp"], 5),
    "Herk": (["Herk"], 6),
    "Mangelbeek": (["Mangelbeek"], 4),
    "Jeker": (["Jeker", "Geer", "Le Geer"], 6),
    "Dommel": (["Dommel"], 6),
    "Abeek": (["Abeek"], 4),
    "Bosbeek": (["Bosbeek"], 4),
    "Zwalm": (["Zwalmbeek", "Zwalm"], 5),
    "Kale": (["Oude Kale", "Nieuwe Kale"], 8),
    "Moervaart": (["Moervaart", "Oude Moervaart"], 12),
    "Mark": (["Mark"], 6),
    "Lieve": (["Lieve", "Oude Lieve"], 10),
    "Ieperlee": (["Ieperlee", "Kanaal Ieper-IJzer"], 10),
    "Brugse vaart (Brugge-Oostende)": (["Kanaal Brugge-Oostende"], 20),
    "Willebroekse vaart": (["Zeekanaal Brussel-Schelde", "Zeekanaal Brussel-Schelde - Canal maritime de Bruxelles à l'Escaut"], 20),
}
# Later canals (Leuven-Dijle 1750, Netekanaal, Albertkanaal, Zuid-Willemsvaart, Kempense kanalen,
# Roeselare-Leie, Gent-Terneuzen, Schelde-Rijn) are not in the list. The Gent-Brugge canal (1613-23)
# has no matching OSM name in the extract and is missing (see README).
name2river = {n: r for r, (ns, _) in RIVERS.items() for n in ns}
relements = json.load(open(os.path.join(CACHE, "region", "osm", "rivers.json")))["elements"]
segs = {}
for e in relements:
    r = name2river.get(e["tags"].get("name", ""))
    if not r:
        continue
    g = [ref.fwd(p["lat"], p["lon"]) for p in e["geometry"]]
    segs.setdefault(r, []).append(g)


def chain(parts):
    """greedily join polylines sharing endpoints (within 2 m)."""
    parts = [list(p) for p in parts]
    out = []
    key = lambda p: (round(p[0] / 2), round(p[1] / 2))
    while parts:
        cur = parts.pop(0)
        grown = True
        while grown:
            grown = False
            for i, p in enumerate(parts):
                if key(p[0]) == key(cur[-1]):
                    cur += p[1:]
                elif key(p[-1]) == key(cur[-1]):
                    cur += p[::-1][1:]
                elif key(p[-1]) == key(cur[0]):
                    cur = p + cur[1:]
                elif key(p[0]) == key(cur[0]):
                    cur = p[::-1] + cur[1:]
                else:
                    continue
                parts.pop(i)
                grown = True
                break
        out.append(cur)
    return out


def simplify(pts, tol):
    if len(pts) < 3:
        return pts
    a = np.array(pts, np.float32).reshape(-1, 1, 2)
    return [tuple(map(float, p)) for p in cv2.approxPolyDP(a, tol, False).reshape(-1, 2)]


def densify(pts, step):
    o = [pts[0]]
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        n = max(1, int(math.hypot(x1 - x0, z1 - z0) / step))
        for s in range(1, n + 1):
            o.append((x0 + (x1 - x0) * s / n, z0 + (z1 - z0) * s / n))
    return o


def plen(p):
    return sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(p, p[1:]))


real_rivers = []
for r, parts in segs.items():
    for c in chain(parts):
        if plen(c) < 800:
            continue
        real_rivers.append((r, simplify(c, 8.0)))

# ------------------------------------------------------------------ overworld bounds
M = cfg["overworldMargin"]
ox0 = min(t["ow"][0] - t["R"] for t in towns) - M
oz0 = min(t["ow"][1] - t["R"] for t in towns) - M
ox1 = max(t["ow"][0] + t["R"] for t in towns) + M
oz1 = max(t["ow"][1] + t["R"] for t in towns) + M
SITES = json.load(open(os.path.join(HERE, "sites.json")))
_inc = [ref.fwd(q["lat"], q["lon"]) for q in SITES.get("includeInOverworld", [])]
if _inc:
    _P = warp.inverse(np.array(_inc, np.float64), L)
    _P = _P[~np.isnan(_P[:, 0])]
    if len(_P):
        ox0, oz0 = min(ox0, _P[:, 0].min() - M / 2), min(oz0, _P[:, 1].min() - M / 2)
        ox1, oz1 = max(ox1, _P[:, 0].max() + M / 2), max(oz1, _P[:, 1].max() + M / 2)
OC = 20.0
ox0, oz0 = math.floor(ox0 / OC) * OC, math.floor(oz0 / OC) * OC
OW_, OH_ = int(math.ceil((ox1 - ox0) / OC)), int(math.ceil((oz1 - oz0) / OC))
ox1, oz1 = ox0 + OW_ * OC, oz0 + OH_ * OC
print("overworld", OW_, "x", OH_, "px =", (ox1 - ox0) / 1000, "x", (oz1 - oz0) / 1000, "km")


def in_bounds(p, pad=0):
    return ox0 - pad <= p[0] <= ox1 + pad and oz0 - pad <= p[1] <= oz1 + pad


def to_ow(real_pts):
    Q = np.array(real_pts, np.float64).reshape(-1, 2)
    return np.concatenate([warp.inverse(Q[i:i + 20000], L) for i in range(0, len(Q), 20000)] or [np.zeros((0, 2))])


def fwd(P):
    return np.concatenate([warp.forward(P[i:i + 100000], L) for i in range(0, len(P), 100000)])


rivers_out = []
for r, c in real_rivers:
    P = to_ow(densify(c, 150.0))
    run = []
    pieces = []
    for p in P:
        if np.isnan(p[0]) or not in_bounds(p, 200):
            if len(run) >= 2:
                pieces.append(run)
            run = []
        else:
            run.append((float(p[0]), float(p[1])))
    if len(run) >= 2:
        pieces.append(run)
    for pc in pieces:
        pc = simplify(pc, 3.0)
        if plen(pc) < 150:
            continue
        rivers_out.append({"name": r, "w": RIVERS[r][1], "p": [round(v, 1) for xy in pc for v in xy]})
print("rivers", len(rivers_out), sorted({r["name"] for r in rivers_out}))

# ------------------------------------------------------------------ 2. landcover
CLS = ["field", "meadow", "wood", "heath", "water", "marsh", "built"]
PALETTE = [(214, 196, 140), (150, 190, 110), (60, 110, 55), (170, 140, 160), (70, 120, 170), (110, 150, 140), (180, 70, 60)]
# ferraris class -> landcover index
F2L = {FIELD: 0, MEADOW: 1, WOOD: 2, HEATH: 3, WATER: 4, BUILT: 6}
# marsh: meadow in the main river valleys (within 300 m real of a river centreline), where
# Ferraris draws the wet "broeken" of the Demer, Dijle, Nete and Scheldt
river_mask = np.zeros((GH, GW), np.uint8)
for r, c in real_rivers:
    if r in ("Willebroekse vaart",):
        continue
    q = np.array([[(x - RX0) / RC, (z - RZ0) / RC] for x, z in c], np.int32)
    cv2.polylines(river_mask, [q], False, 1, thickness=max(1, int(2 * 300 / RC)))
win = int(K)  # K cells of 20 m: the real footprint of one overworld pixel
fs = np.stack([cv2.blur(frac[..., k], (win, win)) for k in range(6)], -1)
P = np.stack(np.meshgrid(ox0 + (np.arange(OW_) + 0.5) * OC, oz0 + (np.arange(OH_) + 0.5) * OC), -1).reshape(-1, 2)
Q = fwd(P)
cx, cz = real_cell(Q[:, 0], Q[:, 1])
ok = (cx >= 0) & (cx < GW) & (cz >= 0) & (cz < GH)
cxs, czs = np.clip(cx, 0, GW - 1), np.clip(cz, 0, GH - 1)
s_in = np.zeros(len(P), bool)
for t in towns:
    s_in |= np.hypot(P[:, 0] - t["ow"][0], P[:, 1] - t["ow"][1]) <= t["R"]
F = np.where(s_in[:, None], frac[czs, cxs], fs[czs, cxs])
lc = np.zeros(len(P), np.uint8)
order = [FIELD, MEADOW, WOOD, HEATH, WATER]
best = np.argmax(F[:, order], 1)
lc = np.array([F2L[order[i]] for i in range(len(order))], np.uint8)[best]
lc[(F[:, BUILT] > (0.25 if True else 0)) & ~s_in] = 6
lc[(F[:, BUILT] > 0.35) & s_in] = 6
marsh = (lc == 1) & (river_mask[czs, cxs] == 1)
lc[marsh] = 5
lc[~ok | ~covered[czs, cxs]] = 0
# sea: OSM coastline drawn on a 100 m real grid (small gaps between extract pieces close at
# that size), flood-filled from a point in the North Sea, then scaled to the 20 m grid
coast = json.load(open(os.path.join(CACHE, "region", "osm", "coast.json")))["elements"]
SC = 5
cg = np.zeros((GH // SC + 1, GW // SC + 1), np.uint8)
for e in coast:
    q = np.array([[(ref.fwd(p["lat"], p["lon"])[0] - RX0) / (RC * SC), (ref.fwd(p["lat"], p["lon"])[1] - RZ0) / (RC * SC)] for p in e["geometry"]], np.int32)
    cv2.polylines(cg, [q], False, 1, thickness=1)
seed = ref.fwd(*SITES["seaSeed"])
ffmask = np.zeros((cg.shape[0] + 2, cg.shape[1] + 2), np.uint8)
ffmask[1:-1, 1:-1] = cg
fill = np.zeros_like(cg)
cv2.floodFill(fill, ffmask, (int((seed[0] - RX0) / (RC * SC)), int((seed[1] - RZ0) / (RC * SC))), 1, flags=4)
fill = fill | (cg & cv2.dilate(fill, np.ones((3, 3), np.uint8)))  # the coastline cells next to the sea
sea_real = cv2.resize(fill, (GW, GH), interpolation=cv2.INTER_NEAREST).astype(bool)
if sea_real.mean() > 0.6:
    print("  WARNING: sea flood-fill leaked (coastline gap); sea not painted")
    sea_real[:] = False
print("  sea share of the real grid", round(float(sea_real.mean()), 3))
lc[sea_real[czs, cxs] & ok] = 4
# the drowned land of Saeftinghe (and any other 'marshAreas' in sites.json): tidal flats and salt marsh
for ma in SITES.get("marshAreas", []):
    q = np.array([[(ref.fwd(a, b)[0] - RX0) / RC, (ref.fwd(a, b)[1] - RZ0) / RC] for a, b in ma["ring"]], np.int32)
    m_ = np.zeros((GH, GW), np.uint8)
    cv2.fillPoly(m_, [q], 1)
    lc[(m_[czs, cxs] == 1) & ok & ~sea_real[czs, cxs]] = 5
lc = lc.reshape(OH_, OW_)
# paint the rivers at their real width
lc_img = Image.fromarray(lc, "P")
dr = ImageDraw.Draw(lc_img)
for rv in rivers_out:
    q = [((rv["p"][i] - ox0) / OC, (rv["p"][i + 1] - oz0) / OC) for i in range(0, len(rv["p"]), 2)]
    dr.line(q, fill=4, width=max(1, int(round(rv["w"] / OC))), joint="curve")
pal = []
for c in PALETTE:
    pal += list(c)
lc_img.putpalette(pal + [0] * (768 - len(pal)))
lc_img.save(os.path.join(OUT, "landcover.png"), optimize=True)
lc = np.asarray(lc_img)
print("landcover", {CLS[k]: round(float((lc == k).mean()), 3) for k in range(7)})

# ------------------------------------------------------------------ 3. roads between towns
STEM = {"antwerpen": "Antwerp", "mechelen": "Mechel", "leuven": "Leuven", "lier": "Lier", "aarschot": "Aarschot",
        "diest": "Diest", "scherpenheuvel": "Scherpenheuvel", "hasselt": "Hasselt", "sinttruiden": "Truid", "tongeren": "Tonger",
        "maaseik": "Maaseik", "halen": "Halen", "herkdestad": "Herk", "zoutleeuw": "Zoutleeuw", "tienen": "Tiens", "bilzen": "Bilzen",
        "borgloon": "Borgloon", "beringen": "Bering", "brussel": "Brussel", "gent": "Gent", "dendermonde": "Dendermond", "aalst": "Aalst",
        "brugge": "Brug", "kortrijk": "Kortrijk", "oudenaarde": "Oudenaard", "ieper": "Ieper", "oostende": "Oostend",
        "herentals": "Herental", "turnhout": "Turnhout"}
tby = {t["id"]: t for t in towns}


def gate_real(t, g):
    x, z = t["walls"]["gates"][g]
    return np.array(warp.town_local_to_real(t, x, z, L))


def facing_gate(a, b):
    """the gate of town a towards town b: one named after b, else the best-aligned one."""
    named = [g for g in a["walls"]["gates"] if STEM.get(b["id"], "#") in g]
    if named:
        return named[0]
    d = b["real"] - a["real"]
    d /= np.linalg.norm(d)
    best, bs = None, -9
    for g, (x, z) in a["walls"]["gates"].items():
        v = np.array([x, z]) / (math.hypot(x, z) or 1)
        s = float(v @ d)
        if "Water" in g:
            s -= 0.5
        if s > bs:
            best, bs = g, s
    return best


# road graph (real frame)
rel = json.load(open(os.path.join(CACHE, "region", "osm", "roads.json")))["elements"]
nodes = {}
adj = {}
COST = {"trunk": 1.25, "primary": 1.0, "secondary": 1.05}


def nid(p):
    k = (round(p[0], 0), round(p[1], 0))
    if k not in nodes:
        nodes[k] = len(nodes)
        adj[nodes[k]] = []
    return nodes[k]


coords = []
for e in rel:
    hw = e["tags"].get("highway")
    if hw not in COST:
        continue
    g = [ref.fwd(p["lat"], p["lon"]) for p in e["geometry"]]
    ids = [nid(p) for p in g]
    for (a, pa), (b, pb) in zip(zip(ids, g), list(zip(ids, g))[1:]):
        d = math.hypot(pb[0] - pa[0], pb[1] - pa[1]) * COST[hw]
        adj[a].append((b, d))
        adj[b].append((a, d))
coords = np.zeros((len(nodes), 2))
for k, i in nodes.items():
    coords[i] = k


def nearest(p):
    d = np.hypot(coords[:, 0] - p[0], coords[:, 1] - p[1])
    i = int(d.argmin())
    return i, float(d[i])


def dijkstra(s, t, goal):
    dist = {s: 0.0}
    prev = {}
    pq = [(math.hypot(*(coords[s] - goal)), 0.0, s)]
    while pq:
        f, d, u = heapq.heappop(pq)
        if u == t:
            break
        if d > dist.get(u, 1e18):
            continue
        for v, w in adj[u]:
            nd = d + w
            if nd < dist.get(v, 1e18):
                dist[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd + math.hypot(*(coords[v] - goal)), nd, v))
    if t not in prev and s != t:
        return None
    path = [t]
    while path[-1] != s:
        path.append(prev[path[-1]])
    return [tuple(coords[i]) for i in path[::-1]]


def chaussee(pa, pb, other):
    """A straight-ish road between two overworld gate points, bent around other towns'
    circles and given a gentle deterministic wobble (amplitude ~1 % of its length)."""
    pts = [np.array(pa), np.array(pb)]
    for t in other:
        for _ in range(2):
            new = [pts[0]]
            for a_, b_ in zip(pts, pts[1:]):
                ab = b_ - a_
                Lab = np.linalg.norm(ab)
                tt = np.clip((t["ow"] - a_) @ ab / (Lab * Lab), 0, 1)
                c_ = a_ + ab * tt
                dd = np.linalg.norm(t["ow"] - c_)
                if dd < t["R"] + 150 and 0.02 < tt < 0.98:
                    nrm = (c_ - t["ow"]) / (dd or 1)
                    new.append(t["ow"] + nrm * (t["R"] + 250))
                new.append(b_)
            pts = new
    out = []
    for a_, b_ in zip(pts, pts[1:]):
        Lab = np.linalg.norm(b_ - a_)
        n = max(2, int(Lab / 60))
        perp = np.array([-(b_ - a_)[1], (b_ - a_)[0]]) / (Lab or 1)
        for i in range(n):
            f = i / n
            w_ = math.sin(f * math.pi) * (0.012 * Lab) * math.sin(f * 7.3 + Lab * 0.001)
            out.append(tuple(a_ + (b_ - a_) * f + perp * w_))
    out.append(tuple(pts[-1]))
    return out


def chaikin(pts, it):
    for _ in range(it):
        o = [pts[0]]
        for p, q in zip(pts, pts[1:]):
            o.append((0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]))
            o.append((0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]))
        o.append(pts[-1])
        pts = o
    return pts


def self_intersects(line):
    seg = list(zip(line, line[1:]))
    def ccw(A, B, C):
        return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])
    for i in range(len(seg)):
        for j in range(i + 2, len(seg)):
            A, B = seg[i]
            C, D = seg[j]
            if ccw(A, C, D) != ccw(B, C, D) and ccw(A, B, C) != ccw(A, B, D):
                return True
    return False


roads_out = []
for link in cfg["links"]:
    ia, ib = link[0], link[1]
    opts = link[2] if len(link) > 2 else {}
    if ia not in tby or ib not in tby:
        continue
    a, b = tby[ia], tby[ib]
    ga, gb = opts.get("fromGate") or facing_gate(a, b), opts.get("toGate") or facing_gate(b, a)
    pa, pb = gate_real(a, ga), gate_real(b, gb)
    # leave the town some way out along the road before joining the network
    sa, da = nearest(pa + (b["real"] - pa) / np.linalg.norm(b["real"] - pa) * 300)
    sb, db = nearest(pb + (a["real"] - pb) / np.linalg.norm(a["real"] - pb) * 300)
    path = dijkstra(sa, sb, coords[sb]) if da < 1500 and db < 1500 else None
    src = "osm"
    straight = float(np.linalg.norm(pb - pa))
    if path is None or plen(path) > 1.6 * straight:
        path, src = [tuple(pa), tuple(pb)], "straight"
    real = [tuple(pa)] + path + [tuple(pb)]
    # drop the parts inside either town's real radius (the town files carry those streets)
    keep = [p for p in real if np.hypot(*(np.array(p) - a["real"])) > a["R"] - 1 and np.hypot(*(np.array(p) - b["real"])) > b["R"] - 1]
    P = to_ow(densify(simplify(keep, 10.0), 120.0)) if len(keep) >= 2 else np.zeros((0, 2))
    P = [tuple(map(float, p)) for p in P if not np.isnan(p[0])]
    ga_ow = tuple(np.array(a["walls"]["gates"][ga]) * 1.0 + a["ow"])
    gb_ow = tuple(np.array(b["walls"]["gates"][gb]) * 1.0 + b["ow"])
    raw = [ga_ow] + P + [gb_ow]
    direct = math.dist(ga_ow, gb_ow)
    others = [t for t in towns if t["id"] not in (ia, ib)]
    # warped modern roads wiggle at this compression: keep the route's course, generalised
    line = chaikin(simplify(raw, max(40.0, 0.08 * direct)), 3)
    hits_town = any(min(math.dist(q, t["ow"]) for q in densify(line, 30)) < t["R"] + 150 for t in others)
    ax = (np.array(gb_ow) - np.array(ga_ow)) / max(direct, 1)
    proj = [float((np.array(q) - np.array(ga_ow)) @ ax) for q in densify(line, 30)]
    backtrack = max(max(proj[:i + 1]) - proj[i] for i in range(len(proj)))
    print(f"    {ia}-{ib}: ratio {plen(line) / direct:.2f} backtrack {backtrack:.0f} hits {hits_town}")
    if src != "osm" or plen(line) > 1.3 * direct or self_intersects(line) or hits_town or backtrack > 120:
        # the warp folds or squeezes the modern route here (near small towns pushed off
        # their compressed position): fall back to a chaussee between the gates
        line = simplify(chaussee(ga_ow, gb_ow, others), 2.0)
        src = "chaussee"
    else:
        src = "osm-generalised"
    roads_out.append({"from": ia, "to": ib, "fromGate": ga, "toGate": gb, "k": "road",
                      "w": 8, "src": src, "realLengthKm": round(plen(real) / 1000, 1),
                      "p": [round(v, 1) for xy in line for v in xy]})
    print(f"  road {ia}:{ga} -> {ib}:{gb} {src} real {plen(real)/1000:.1f} km, overworld {plen(line)/1000:.2f} km")

# ------------------------------------------------------------------ 4. villages
pel = json.load(open(os.path.join(CACHE, "region", "osm", "places.json")))["elements"]
RG = cfg["region"]


def inreg(lat, lon):
    return RG["south"] <= lat <= RG["north"] and RG["west"] <= lon <= RG["east"]
built_frac = frac[..., BUILT]
bw = int(2 * 250 / RC) + 1
built_sum = cv2.boxFilter(built_frac, -1, (bw, bw), normalize=False)  # cells of built within ~250 m
cand = []
for e in pel:
    tg = e["tags"]
    pl = tg.get("place")
    nm = tg.get("name")
    if pl not in ("village", "hamlet", "town", "city") or not nm:
        continue
    q = np.array(ref.fwd(e["lat"], e["lon"]))
    if any(np.hypot(*(q - t["real"])) < t["R"] + 300 for t in towns):
        continue
    gx, gz = real_cell(q[0], q[1])
    if not (0 <= gx < GW and 0 <= gz < GH) or not covered[gz, gx]:
        if pl in ("village", "town", "city") and inreg(e["lat"], e["lon"]):
            cand.append((nm, pl, q, {"town": 120, "city": 300}.get(pl, 25), False))  # outside Ferraris: unchecked
        continue
    area_m2 = float(built_sum[gz, gx]) * RC * RC
    if area_m2 < 600:
        continue  # Ferraris shows (next to) no houses here: a later settlement
    houses = int(np.clip(round(area_m2 / 150), 3, 400))
    cand.append((nm, pl, q, houses, True))
Pv = to_ow(np.array([c[2] for c in cand]))
vill = []
for (nm, pl, q, houses, fer), p in zip(cand, Pv):
    if np.isnan(p[0]) or not in_bounds(p):
        continue
    if any(np.hypot(p[0] - t["ow"][0], p[1] - t["ow"][1]) < t["R"] + 150 for t in towns):
        continue
    v_ = {"name": nm, "x": round(float(p[0]), 1), "z": round(float(p[1]), 1), "size": houses,
          "kind": "town" if pl in ("town", "city") else pl}
    if not fer:
        v_["ferraris"] = False
    vill.append(v_)
vill.sort(key=lambda v: (-{"town": 2, "village": 1, "hamlet": 0}[v["kind"]], -v["size"]))
villages = []
for v in vill:
    if all(math.hypot(v["x"] - u["x"], v["z"] - u["z"]) > 250 for u in villages):
        villages.append(v)
print("villages", len(villages), "of", len(cand), "candidates")

# ------------------------------------------------------------------ 7. dikes on the Scheldt estuary
dk = json.load(open(os.path.join(CACHE, "region", "osm", "dykes.json")))["elements"]
schelde_real = [c for r, c in real_rivers if r == "Schelde"]
sch_mask = np.zeros((GH, GW), np.uint8)
for c in schelde_real:
    q = np.array([[(x - RX0) / RC, (z - RZ0) / RC] for x, z in c], np.int32)
    cv2.polylines(sch_mask, [q], False, 1, thickness=int(2 * 4000 / RC))
sch_mask |= cv2.dilate(sea_real.astype(np.uint8), np.ones((int(4000 / RC), int(4000 / RC)), np.uint8))
dikes_out = []
for e in dk:
    g = [ref.fwd(p["lat"], p["lon"]) for p in e["geometry"]]
    gx_, gz_ = real_cell([a for a, _ in g], [b for _, b in g])
    okk = (gx_ >= 0) & (gx_ < GW) & (gz_ >= 0) & (gz_ < GH)
    if okk.mean() < 0.5 or sch_mask[np.clip(gz_, 0, GH - 1), np.clip(gx_, 0, GW - 1)].mean() < 0.5 or plen(g) < 300:
        continue
    Pd = to_ow(densify(simplify(g, 10.0), 200.0))
    Pd = [tuple(map(float, p)) for p in Pd if not np.isnan(p[0]) and in_bounds(p)]
    if len(Pd) >= 2:
        dikes_out.append({"name": e["tags"].get("name"), "p": [round(v, 1) for xy in simplify(Pd, 3.0) for v in xy]})
print("dikes", len(dikes_out))

# ------------------------------------------------------------------ 8. polities c. 1650
from shapely.geometry import Polygon, MultiPolygon, LineString, box as sbox
from shapely.ops import unary_union, split as ssplit
POL = json.load(open(os.path.join(HERE, "politics.json")))
ADM = {f"{a['name']}|{a['admin_level']}": a for a in json.load(open(os.path.join(CACHE, "region", "osm", "admin.json")))}


def adm_geom(key):
    a = ADM.get(key)
    if not a:
        print("  admin area missing:", key)
        return None
    polys = [Polygon([(lo, la) for la, lo in r]).buffer(0) for r in a["rings"] if len(r) >= 4]
    return unary_union(polys) if polys else None


REGBOX = sbox(RG["west"] - 0.3, RG["south"] - 0.3, RG["east"] + 0.3, RG["north"] + 0.3)


def side_of(line, north):
    """the part of REGBOX north (or south) of a polyline [[lat, lon], ...] extended to the box edges."""
    pts = [(lo, la) for la, lo in line]
    pts = [(RG["west"] - 1, pts[0][1])] + pts + [(RG["east"] + 1, pts[-1][1])]
    far = RG["north"] + 1 if north else RG["south"] - 1
    return Polygon(pts + [(pts[-1][0], far), (pts[0][0], far)]).buffer(0)


geoms = {}
for pdef in POL["polities"]:
    g = unary_union([x for x in (adm_geom(k) for k in pdef.get("areas", [])) if x is not None])
    for k in pdef.get("minusAreas", []):
        m_ = adm_geom(k)
        if m_ is not None:
            g = g.difference(m_)
    for ring in pdef.get("add", []):
        g = g.union(Polygon([(lo, la) for la, lo in ring]))
    if "clipSouthOf" in pdef:
        g = g.intersection(side_of(pdef["clipSouthOf"], north=False))
    if "clipNorthOf" in pdef:
        g = g.intersection(side_of(pdef["clipNorthOf"], north=True))
    geoms[pdef["id"]] = g.intersection(REGBOX)
# Liège: today's province of Liège is missing from the extracts (it straddles the German-speaking
# community), so Haspengouw south of Limburg is taken as whatever is left in a box there
if "liege" in geoms:
    hb = sbox(5.0, RG["south"] - 0.3, RG["east"] + 0.3, 50.86)
    others = unary_union([v for k, v in geoms.items() if k != "liege"])
    geoms["liege"] = geoms["liege"].union(hb.difference(others)).difference(geoms.get("brabant", Polygon()))
polities_out = []
for pdef in POL["polities"]:
    g = geoms[pdef["id"]].simplify(0.002)
    parts = [g] if g.geom_type == "Polygon" else list(getattr(g, "geoms", []))
    rings = []
    for pg in parts:
        if pg.geom_type != "Polygon" or pg.area < 1e-5:
            continue
        real = [ref.fwd(la, lo) for lo, la in pg.exterior.coords]
        Pp = to_ow(densify(real, 400.0))
        Pp = np.where(np.isnan(Pp), np.nan, Pp)
        okp = ~np.isnan(Pp[:, 0])
        if okp.mean() < 0.5:
            continue
        Pp = Pp[okp]
        Pp[:, 0] = np.clip(Pp[:, 0], ox0 - 2000, ox1 + 2000)
        Pp[:, 1] = np.clip(Pp[:, 1], oz0 - 2000, oz1 + 2000)
        q = simplify([tuple(p) for p in Pp], 15.0)
        if len(q) >= 4:
            rings.append([round(v, 1) for xy in q for v in xy])
    o = {k: pdef[k] for k in ("id", "name", "en", "sovereign", "source", "deviations", "uncertain") if k in pdef}
    if "subdivisions" in pdef:
        o["subdivisions"] = pdef["subdivisions"]
    o["rings"] = rings
    polities_out.append(o)
    print("  polity", pdef["id"], len(rings), "rings")


def polity_at(lat, lon):
    from shapely.geometry import Point
    pt = Point(lon, lat)
    for pdef in POL["polities"]:
        if geoms[pdef["id"]].contains(pt):
            return pdef["id"]
    return None


# villages get their polity (real position)
for v in villages:
    pass
_pv = {}
for (nm, pl, q, houses, fer) in cand:
    lat, lon = ref.inv(q[0], q[1])
    _pv.setdefault(nm, polity_at(lat, lon))
for v in villages:
    v["polity"] = _pv.get(v["name"])

# ------------------------------------------------------------------ 9. sites outside the towns
sites_out = []
for s_ in SITES["sites"] + [dict(p, kind="fort") for p in POL.get("points", [])]:
    p = to_ow([ref.fwd(s_["lat"], s_["lon"])])[0]
    if np.isnan(p[0]):
        continue
    o = {k: v for k, v in s_.items() if k not in ("lat", "lon")}
    o.update(x=round(float(p[0]), 1), z=round(float(p[1]), 1), realLat=s_["lat"], realLon=s_["lon"])
    if "polity" not in o:
        o["polity"] = polity_at(s_["lat"], s_["lon"])
    sites_out.append(o)
marsh_out = []
for ma in SITES.get("marshAreas", []):
    Pm = to_ow(densify([ref.fwd(a, b) for a, b in ma["ring"]], 300.0))
    Pm = Pm[~np.isnan(Pm[:, 0])]
    marsh_out.append({k: v for k, v in ma.items() if k != "ring"} | {"p": [round(float(v), 1) for xy in Pm for v in xy]})

# fold check: share of overworld pixels where the warp is not locally invertible
_P = np.stack(np.meshgrid(ox0 + (np.arange(0, OW_, 4) + 0.5) * OC, oz0 + (np.arange(0, OH_, 4) + 0.5) * OC), -1).reshape(-1, 2)
_A, _B, _C = fwd(_P), fwd(_P + [1.0, 0]), fwd(_P + [0, 1.0])
_det = (_B[:, 0] - _A[:, 0]) * (_C[:, 1] - _A[:, 1]) - (_B[:, 1] - _A[:, 1]) * (_C[:, 0] - _A[:, 0])
FOLD = float((_det <= 0).mean())
print("fold share", round(FOLD, 4))

# ------------------------------------------------------------------ overworld.json
def _town_landmarks(tid):
    f = os.path.join(OUT, f"{tid}.json")
    if not os.path.exists(f):
        return []
    w_ = json.load(open(f))
    return [{k: L_[k] for k in ("n", "k", "x", "z", "h", "special", "uncertain") if k in L_} for L_ in w_.get("landmarks", [])]


towns_out = []
for t in towns:
    towns_out.append({"id": t["id"], "name": t["name"], "centre": [round(float(t["ow"][0]), 1), round(float(t["ow"][1]), 1)],
                      "radius": round(t["R"], 1), "realLat": t["lat"], "realLon": t["lon"],
                      "realCentre": [round(float(t["real"][0]), 1), round(float(t["real"][1]), 1)],
                      "file": f"{t['id']}.json", "polity": POL["towns"].get(t["id"], {}).get("polity"),
                      "landmarks": _town_landmarks(t["id"]),
                      "gates": {g: [round(x + float(t["ow"][0]), 1), round(z + float(t["ow"][1]), 1)] for g, (x, z) in t["walls"]["gates"].items()}})
ow = {
    "name": "Flanders, Brabant and Loon, c. 1650 (compressed overworld)",
    "year": cfg["year"],
    "K": K,
    "ref": {"name": cfg["ref"]["name"], "lat": ref.lat0, "lon": ref.lon0},
    "frame": "metres, x = east, z = south; overworld origin = the ref point (Mechelen)",
    "bounds": [ox0, oz0, ox1, oz1],
    "towns": towns_out,
    "landcover": {"file": "landcover.png", "metresPerPixel": OC, "origin": [ox0, oz0], "width": OW_, "height": OH_,
                  "encoding": "8-bit palette PNG; pixel (i, j) covers x = origin.x + i*20 .. +20, z = origin.z + j*20 .. +20",
                  "classes": [{"index": i, "name": n, "rgb": list(PALETTE[i])} for i, n in enumerate(CLS)],
                  "note": "sampled from the Ferraris map (1777) through the inverse warp; inside town radii 1:1 (the town files are authoritative there)"},
    "rivers": rivers_out,
    "roads": roads_out,
    "villages": villages,
    "dikes": dikes_out,
    "drowned": marsh_out,
    "sites": sites_out,
    "polities": polities_out,
    "foldShare": round(FOLD, 5),
    "warp": {
        "description": "overworld p -> real q (both in metres around ref). Inside town i (|p - c_i_ow| <= R_i): q = c_i_real + (p - c_i_ow). "
                       "Elsewhere: q = K*p + D(p), D(p) = sum_i w_i d_i / sum_i w_i, d_i = (c_i_real - K*c_i_ow) - u_i*R_i*(K-1), "
                       "u_i = (p - c_i_ow)/|p - c_i_ow|, w_i = 1/max(|p - c_i_ow| - R_i, 1)^2. Real metres -> lat/lon: "
                       "lat = ref.lat - z/110574, lon = ref.lon + x/(cos(ref.lat)*111320).",
        "towns": [{"id": t["id"], "real": [round(float(t["real"][0]), 1), round(float(t["real"][1]), 1)],
                   "ow": [round(float(t["ow"][0]), 1), round(float(t["ow"][1]), 1)], "R": round(t["R"], 1)} for t in towns],
    },
    "attribution": "Map data © OpenStreetMap contributors (ODbL); historical land cover from the Ferraris map (1777), "
                   "where it covers (Flanders and Brussels; elsewhere field), "
                   "Digitaal Vlaanderen (geo.api.vlaanderen.be/HISTCART)",
}
json.dump(ow, open(os.path.join(OUT, "overworld.json"), "w"), separators=(",", ":"))
print("wrote overworld.json", os.path.getsize(os.path.join(OUT, "overworld.json")) // 1024, "KB; landcover.png",
      os.path.getsize(os.path.join(OUT, "landcover.png")) // 1024, "KB")

# ------------------------------------------------------------------ preview
S = 2
im = Image.fromarray(np.array(PALETTE, np.uint8)[lc]).resize((OW_ * S, OH_ * S), Image.NEAREST)
d = ImageDraw.Draw(im)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
    small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
except Exception:
    font = small = ImageFont.load_default()
pp = lambda x, z: ((x - ox0) / OC * S, (z - oz0) / OC * S)
PCOL = {"brabant": (200, 40, 40), "mechelen": (230, 120, 0), "flanders": (20, 20, 20), "liege": (130, 0, 160), "staats_vlaanderen": (255, 120, 0),
        "zeeland": (255, 120, 0), "staats_brabant": (255, 120, 0), "maas_lands": (0, 140, 140), "hainaut": (90, 90, 90), "namur": (90, 90, 90)}
for po in polities_out:
    for rg in po["rings"]:
        q = [pp(rg[i], rg[i + 1]) for i in range(0, len(rg), 2)]
        d.line(q + q[:1], fill=PCOL.get(po["id"], (0, 0, 0)), width=3)
for rv in rivers_out:
    q = [pp(rv["p"][i], rv["p"][i + 1]) for i in range(0, len(rv["p"]), 2)]
    d.line(q, fill=(30, 70, 150), width=max(2, int(rv["w"] / OC * S)), joint="curve")
for dk_ in dikes_out:
    q = [pp(dk_["p"][i], dk_["p"][i + 1]) for i in range(0, len(dk_["p"]), 2)]
    d.line(q, fill=(110, 80, 40), width=2)
for rd in roads_out:
    q = [pp(rd["p"][i], rd["p"][i + 1]) for i in range(0, len(rd["p"]), 2)]
    d.line(q, fill=(120, 60, 20) if rd["src"] == "osm-generalised" else (200, 110, 30), width=3)
for v in villages:
    x, z = pp(v["x"], v["z"])
    r = 2 + min(5, v["size"] / 30)
    d.ellipse([x - r, z - r, x + r, z + r], fill=(150, 30, 30))
    if v["kind"] != "hamlet":
        d.text((x + 4, z - 5), v["name"], fill=(40, 20, 20), font=small)
for t in towns_out:
    x, z = pp(*t["centre"])
    r = t["radius"] / OC * S
    d.ellipse([x - r, z - r, x + r, z + r], outline=(0, 0, 0), width=3)
    ring = [pp(gx + t["centre"][0], gz + t["centre"][1]) for gx, gz in tby[t["id"]]["walls"]["ring"]]
    d.polygon(ring, outline=(120, 0, 0))
    for g, (gx, gz) in t["gates"].items():
        a, b_ = pp(gx, gz)
        d.rectangle([a - 3, b_ - 3, a + 3, b_ + 3], fill=(255, 220, 0))
    d.text((x - 30, z - r - 18), t["name"], fill=(0, 0, 0), font=font)
for st in sites_out:
    x, z = pp(st["x"], st["z"])
    d.polygon([(x, z - 7), (x + 6, z + 5), (x - 6, z + 5)], fill=(255, 255, 255), outline=(0, 0, 0))
    d.text((x + 7, z - 4), st["name"], fill=(0, 0, 0), font=small)
for po in polities_out:
    if po["rings"]:
        rg = max(po["rings"], key=len)
        xs_, zs_ = rg[0::2], rg[1::2]
        cxp, czp = sum(xs_) / len(xs_), sum(zs_) / len(zs_)
        if in_bounds((cxp, czp)):
            x, z = pp(cxp, czp)
            d.text((x - 40, z), po["name"].upper(), fill=PCOL.get(po["id"], (0, 0, 0)), font=font)
km = 1000 / OC * S
d.line([(20, OH_ * S - 20), (20 + km, OH_ * S - 20)], fill=(0, 0, 0), width=4)
d.text((20, OH_ * S - 40), "1 km (overworld) = 6 km real outside towns", fill=(0, 0, 0), font=small)
im.save(os.path.join(PREV, "overworld_preview.png"))
im.convert("RGB").resize((1100, int(im.size[1] * 1100 / im.size[0])), Image.LANCZOS).save(
    os.path.join(REPO, "docs", "history", "regions-1650-overworld.jpg"), quality=80)
print("preview", os.path.join(PREV, "overworld_preview.png"))

#!/usr/bin/env python3
"""Turns one town's modern OSM world (build_town.mjs output, town-local metres) into the
town as it stood c. 1650, placed in overworld coordinates. Generalises
tools/history/historicize.py (Diest 1560):

  * Ferraris (1777) colours -> land cover at 4 m cells (field, built-up, meadow, wood,
    heath, water), same classifier as historicize.py
  * a modern building is kept only on land Ferraris shows built up (town: >= 30 % of its
    cells, <= 1600 m2; countryside: >= 42 %, <= 700 m2), modern types dropped, heights capped;
    landmarks that existed by 1650 (landmarks.json) are always kept and tagged lm/n;
    buildings known to be later than 1650 are dropped (landmarks.json "drop", OSM
    start_date > 1650 on churches, civic and large buildings)
  * gaps where Ferraris shows houses are filled with period row-house blocks (in town)
    and farmsteads (outside)
  * roads: railways, motorways, cycle/foot paths, roundabouts, the boulevards laid on the
    ramparts (by name and by running along the wall trace) and streets that cut through
    Ferraris house blocks are dropped; town streets are cobbled
  * water: canals dug after 1650 are dropped, moats added along the wall where Ferraris
    shows water outside it, hand-traced extra water (walls/<town>.json "water") added
  * land cover rebuilt from Ferraris; town floor, gardens, market square
  * everything is clipped to the town radius and shifted by the town's overworld centre

Usage: historicize_town.py <town-id> [out.json]
"""
import json, math, os, sys
import cv2
import numpy as np
from PIL import Image
from common import CACHE, HERE, REPO, config, town
import warp

tid = sys.argv[1]
cfg = config()
T = town(cfg, tid)
L = warp.get_layout()
LT = next(t for t in L["towns"] if t["id"] == tid)
OX, OZ = LT["ow"]
RAD = LT["R"]
out_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(REPO, "public", "world", "regions", f"{tid}.json")
w = json.load(open(os.path.join(CACHE, "build", f"{tid}_osm.json")))
walls = json.load(open(os.path.join(HERE, "walls", f"{tid}.json")))
meta = json.load(open(os.path.join(CACHE, tid, "maps", "ferraris.json")))
LM = json.load(open(os.path.join(HERE, "landmarks.json")))
lmc = LM["towns"].get(tid, {"keep": [], "drop": [], "pois": []})
YEAR = cfg["year"]
TOWN_CAP = {"antwerpen": 14.0, "leuven": 12.5, "mechelen": 12.5}.get(tid, 11.5)
TID_INDEX = [t["id"] for t in cfg["towns"]].index(tid)

# ------------------------------------------------------------------ land cover (ferraris_classes.py)
from ferraris_classes import BUILT, FIELD, HEATH, MEADOW, WATER, WOOD, classify
CELL = 4.0
img = np.asarray(Image.open(os.path.join(CACHE, tid, "maps", "ferraris.png")).convert("RGB")).astype(np.float32)
f = meta["mpp"] / CELL
small = cv2.resize(img, (int(img.shape[1] * f), int(img.shape[0] * f)), interpolation=cv2.INTER_AREA)
cls = classify(small, full=img, mpp=CELL)
del img
H, W = cls.shape
X0, Z0 = meta["x0"], meta["z0"]


def cell(x, z):
    return int((x - X0) / CELL), int((z - Z0) / CELL)


def cls_at(x, z):
    cx, cz = cell(x, z)
    if 0 <= cx < W and 0 <= cz < H:
        return cls[cz, cx]
    return FIELD


# ------------------------------------------------------------------ geometry helpers
ring = walls["ring"]
extra_water = walls.get("water", [])
forts = walls.get("forts", [])


def inside(poly, x, z):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, zi = poly[i]
        xj, zj = poly[j]
        if (zi > z) != (zj > z) and x < (xj - xi) * (z - zi) / (zj - zi) + xi:
            c = not c
        j = i
    return c


ring_np = np.array(ring, np.float32)


def in_town(x, z):
    return cv2.pointPolygonTest(ring_np, (float(x), float(z)), False) >= 0


def ring_dist(x, z):
    return abs(cv2.pointPolygonTest(ring_np, (float(x), float(z)), True))


water_np = [np.array(p, np.float32) for p in extra_water]


def in_extra_water(x, z):
    return any(cv2.pointPolygonTest(p, (float(x), float(z)), False) >= 0 for p in water_np)


def pts(p):
    return [(p[i], p[i + 1]) for i in range(0, len(p), 2)]


def centroid(p):
    q = pts(p)
    return sum(a for a, _ in q) / len(q), sum(b for _, b in q) / len(q)


def area(p):
    q = pts(p)
    s = 0.0
    for i in range(len(q)):
        x0, z0 = q[i]
        x1, z1 = q[(i + 1) % len(q)]
        s += x0 * z1 - x1 * z0
    return abs(s) / 2


def built_fraction(p, pad=1):
    q = pts(p)
    xs = [cell(x, z)[0] for x, z in q]
    zs = [cell(x, z)[1] for x, z in q]
    cx0, cx1 = max(0, min(xs) - pad), min(W - 1, max(xs) + pad)
    cz0, cz1 = max(0, min(zs) - pad), min(H - 1, max(zs) + pad)
    if cx0 > cx1 or cz0 > cz1:
        return 0.0
    win = cls[cz0:cz1 + 1, cx0:cx1 + 1]
    return float((win == BUILT).mean())


def matches(name, pat):
    return name.startswith(pat[:-1]) if pat.endswith("*") else name == pat


DROP = LM["common_drop"] + lmc["drop"]


def landmark_rule(name, oid=None):
    for k in lmc["keep"]:
        if k.get("id") is not None:
            if oid == k["id"]:
                return k
        elif name and matches(name, k["n"]):
            return k
    return None


# ------------------------------------------------------------------ buildings
MODERN_TYPES = {"industrial", "warehouse", "retail", "commercial", "office", "apartments", "garage", "garages",
                "carport", "roof", "service", "greenhouse", "bunker", "supermarket", "sports_hall", "kiosk",
                "toilets", "train_station", "hospital", "school", "civic", "public", "transportation", "mosque",
                "construction", "parking", "government", "university", "college", "hotel", "theatre",
                "government_office", "houseboat", "ship", "stadium", "grandstand", "fire_station", "museum",
                "outbuilding", "semi_detached", "detached", "synagogue", "temple", "brewery"}
LATE_DROP_TYPES = {"church", "chapel", "cathedral", "basilica", "civic", "public", "government", "university",
                   "school", "theatre", "hospital", "train_station", "castle", "monastery"}

kept = []
n_land = 0
for bd in w["buildings"]:
    name = bd.get("n", "")
    cx, cz = centroid(bd["p"])
    if math.hypot(cx, cz) > RAD or in_extra_water(cx, cz):
        continue
    if any(inside(fo["ring"], cx, cz) for fo in forts):
        continue  # the citadel was razed in the 19th c.; its 1650 barracks come from Ferraris below
    rule = landmark_rule(name, bd["id"])
    nb = {k: v for k, v in bd.items() if not k.startswith("_")}
    if rule:
        nb["hist"] = 1
        if rule.get("lm"):
            nb["lm"] = rule["lm"]
        if rule.get("as"):
            nb["n"] = rule["as"]
        kept.append(nb)
        n_land += 1
        continue
    if name and any(k in name for k in DROP):
        continue
    sd = bd.get("_sd")
    a = area(bd["p"])
    if sd and sd > YEAR and (bd.get("t") in LATE_DROP_TYPES or a > 400):
        continue
    if bd.get("t") in MODERN_TYPES:
        continue
    frac = built_fraction(bd["p"])
    town_ = in_town(cx, cz)
    if town_:
        if frac < 0.3 or a > 1600:
            continue
    else:
        if frac < 0.42 or a > 700:
            continue
    if sd and sd > YEAR:
        nb.pop("n", None)  # a later rebuild on an old plot: keep the volume, not the name
    church = bd.get("t") in ("church", "chapel", "cathedral", "basilica")
    cap = (TOWN_CAP if town_ else 7.0) if not church else bd["h"]
    nb["h"] = min(bd["h"], cap)
    kept.append(nb)
n_osm_kept = len(kept)

# ------------------------------------------------------------------ fill gaps from Ferraris
rng = np.random.default_rng(YEAR + TID_INDEX)
covered = np.zeros_like(cls)
for bd in kept:
    poly = np.array([cell(x, z) for x, z in pts(bd["p"])], np.int32)
    cv2.fillPoly(covered, [poly], 1)
covered = cv2.dilate(covered, np.ones((3, 3), np.uint8))
wall_band = np.zeros_like(cls)
cv2.polylines(wall_band, [np.array([cell(x, z) for x, z in ring], np.int32)], True, 1, thickness=11)
for fo in forts:
    cv2.polylines(wall_band, [np.array([cell(x, z) for x, z in fo["ring"]], np.int32)], True, 1, thickness=11)
gaps = ((cls == BUILT) & (covered == 0) & (wall_band == 0)).astype(np.uint8)
n, lab, stats, cents = cv2.connectedComponentsWithStats(gaps, 8)
next_id = -(TID_INDEX + 1) * 1000000 - 1
added_town = added_farm = 0
for i in range(1, n):
    a = stats[i, cv2.CC_STAT_AREA]
    cx = X0 + (cents[i][0] + 0.5) * CELL
    cz = Z0 + (cents[i][1] + 0.5) * CELL
    if math.hypot(cx, cz) > RAD or in_extra_water(cx, cz):
        continue
    x, y, ww, hh = stats[i, :4]
    mask = (lab[y:y + hh, x:x + ww] == i).astype(np.uint8)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        continue
    c = contours[0] + np.array([x, y], np.int32)
    if in_town(cx, cz):
        if a < 4:
            continue
        c = cv2.approxPolyDP(c, 0.8, True).reshape(-1, 2)
        if len(c) < 3:
            continue
        p = []
        for xx, zz in c:
            p += [round(X0 + (xx + 0.5) * CELL, 1), round(Z0 + (zz + 0.5) * CELL, 1)]
        if area(p) < 40:
            continue
        kept.append({"id": next_id, "p": p, "h": round(float(7 + rng.random() * 2.5), 1), "r": "g"})
        next_id -= 1
        added_town += 1
    else:
        if a < 4 or a > 90:
            continue
        (rx, rz), (rw, rh), ang = cv2.minAreaRect(c.astype(np.float32))
        longer, shorter = max(rw, rh, 1e-3), max(min(rw, rh), 1e-3)
        if longer / shorter > 2.6 or a / (longer * shorter) < 0.45:
            continue
        ang = math.radians(ang + (90 if rw < rh else 0))
        Ln, Wd = 13 + rng.random() * 8, 7 + rng.random() * 1.5
        ux, uz = math.cos(ang), math.sin(ang)
        mx, mz = X0 + (rx + 0.5) * CELL, Z0 + (rz + 0.5) * CELL

        def rect(cx_, cz_, l, wd):
            q = []
            for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                q += [round(cx_ + ux * su * l / 2 - uz * sv * wd / 2, 1), round(cz_ + uz * su * l / 2 + ux * sv * wd / 2, 1)]
            return q

        kept.append({"id": next_id, "p": rect(mx, mz, Ln, Wd), "h": round(float(3.6 + rng.random() * 0.8), 1), "r": "g", "t": "farm"})
        next_id -= 1
        if a > 12 and rng.random() < 0.7:
            bx, bz = mx - uz * (Wd + 6), mz + ux * (Wd + 6)
            kept.append({"id": next_id, "p": rect(bx, bz, Ln * 1.1, Wd + 2), "h": 4.2, "r": "g", "t": "barn"})
            next_id -= 1
        added_farm += 1

# ------------------------------------------------------------------ roads
grid = {}
for bd in kept:
    cx, cz = centroid(bd["p"])
    grid.setdefault((int(cx // 40), int(cz // 40)), []).append((cx, cz))


def near_building(x, z, r=35):
    gx, gz = int(x // 40), int(z // 40)
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            for bx, bz in grid.get((gx + i, gz + j), []):
                if (bx - x) ** 2 + (bz - z) ** 2 < r * r:
                    return True
    return False


def resample(q, step):
    o = [q[0]]
    for (x0, z0), (x1, z1) in zip(q, q[1:]):
        L_ = math.hypot(x1 - x0, z1 - z0)
        k = max(1, int(L_ / step))
        for s in range(1, k + 1):
            o.append((x0 + (x1 - x0) * s / k, z0 + (z1 - z0) * s / k))
    return o


def length(q):
    return sum(math.hypot(b_[0] - a_[0], b_[1] - a_[1]) for a_, b_ in zip(q, q[1:]))


OLD_COUNTRY = {"primary", "secondary", "tertiary", "unclassified", "track", "path", "bridleway"}
RAMPART_NAMES = ("vest", "lei", "ring", "boulevard", "singel", "kaai", "kade", "leien")
roads = []
dropped = {"rampart": 0}
RAMP = []
for r in w["roads"]:
    k = r["k"]
    name = (r.get("n") or "").lower()
    if k == "rail" or k.startswith("motorway") or k.startswith("trunk") or k in ("cycleway", "footway", "steps"):
        continue
    q = pts(r["p"])
    if len(q) > 4 and math.hypot(q[0][0] - q[-1][0], q[0][1] - q[-1][1]) < 1 and area(r["p"]) < 9000:
        continue
    samp = resample(q, 6)
    if any(name.endswith(s) or (s + " ") in name for s in RAMPART_NAMES) and \
            sum(ring_dist(x, z) < 90 for x, z in samp) > 0.4 * len(samp):
        dropped["rampart"] += 1
        RAMP.append(r.get("n"))
        continue
    streety = any(t_ in name for t_ in ("straat", "markt", "plein", "berg", "hoek", "voer", "poort", "brug"))
    if k in ("primary", "secondary", "tertiary", "unclassified") and not streety and length(q) > 40 and \
            sum(ring_dist(x, z) < 30 for x, z in samp) > 0.7 * len(samp):
        dropped["rampart"] += 1
        RAMP.append(r.get("n"))
        continue  # a modern road running on the line of the wall
    if sum(in_extra_water(x, z) for x, z in samp) > 0.3 * len(samp):
        continue
    mx, mz = q[len(q) // 2]
    town_ = in_town(mx, mz)
    if town_:
        # (A test for later streets cutting through Ferraris house blocks was tried and
        # dropped: at 4 m cells the built-up class also covers Ferraris's narrow streets,
        # so it removed medieval streets such as Mechelen's Bruul.)
        if k == "service" and not near_building(mx, mz, 25):
            continue
        if k in ("residential", "living_street", "unclassified", "pedestrian", "track", "path") and \
                not any(near_building(x, z, 30) for x, z in samp[::3]):
            continue  # a later street laid across the gardens and fields inside the walls
        nr = dict(r)
        nr["c"] = 1
        roads.append(nr)
        continue
    if k in OLD_COUNTRY:
        roads.append(r)
    elif k in ("residential", "living_street", "service", "pedestrian") and near_building(mx, mz):
        roads.append(r)

# ------------------------------------------------------------------ water
OK_CANALS = ("zeekanaal", "willebroek", "brussel-schelde")
water_lines = []
for wl in w["waterLines"]:
    nm = (wl.get("n") or "").lower()
    if wl["k"] == "canal" and not any(s in nm for s in OK_CANALS):
        continue
    q = pts(wl["p"])
    if sum(in_extra_water(x, z) for x, z in q) > 0.5 * len(q):
        continue
    water_lines.append(wl)
# moats: walls/<town>.json "moat" lists ring-vertex ranges [i0, i1] (inclusive, wrapping)
# that had a wet moat in front of them (read off Ferraris: the colour of moat water
# cannot be told from meadow reliably, so this is part of the hand trace)
moat_w = 34.0 if tid == "antwerpen" else 18.0
moats = 0
for i0, i1 in walls.get("moat", []):
    idx = list(range(i0, i1 + 1)) if i1 >= i0 else list(range(i0, len(ring))) + list(range(0, i1 + 1))
    seg = [ring[i % len(ring)] for i in idx]
    off = moat_w / 2 + 6
    line = []
    for j, (x, z) in enumerate(seg):
        xa, za = seg[max(0, j - 1)]
        xb, zb = seg[min(len(seg) - 1, j + 1)]
        tx, tz = xb - xa, zb - za
        Ls = math.hypot(tx, tz) or 1
        nx, nz = tz / Ls, -tx / Ls
        if in_town(x + nx * 4, z + nz * 4):
            nx, nz = -nx, -nz
        line += [round(x + nx * off, 1), round(z + nz * off, 1)]
    if i0 == 0 and i1 == len(ring) - 1:
        line += line[:2]  # a moat all the way round: close it
    water_lines.append({"k": "canal", "w": moat_w, "p": line, "n": "Stadsgracht"})
    moats += 1
water_areas = []
for p in w["waterAreas"]:
    q = pts(p)
    cx, cz = centroid(p)
    wet = sum(cls_at(x, z) in (WATER, MEADOW) for x, z in q) / len(q)
    if wet >= 0.35 or area(p) > 40000:
        water_areas.append(p)
for poly in extra_water:
    water_areas.append([round(v, 1) for xy in poly for v in xy])

# ------------------------------------------------------------------ land cover polygons
land = []
KIND = {MEADOW: "meadow", WOOD: "wood", HEATH: "scrub", WATER: "wet"}
for k, kind in KIND.items():
    mask = (cls == k).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    contours, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    if hier is None:
        continue
    for ci, c in enumerate(contours):
        if hier[0][ci][3] != -1 or cv2.contourArea(c) < 12:
            continue
        c = cv2.approxPolyDP(c, 1.2, True).reshape(-1, 2)
        if len(c) < 3:
            continue
        p = []
        for x, z in c:
            p += [round(X0 + (x + 0.5) * CELL, 1), round(Z0 + (z + 0.5) * CELL, 1)]
        if not in_town(*centroid(p)):
            land.append({"k": kind, "p": p})
town_floor = [v for xy in ring for v in xy]
land.insert(0, {"k": "townYard", "p": town_floor})
for fo in forts:
    land.append({"k": "grass", "p": [v for xy in fo["ring"] for v in xy]})
garden = np.zeros_like(cls)
inside_mask = np.zeros_like(cls)
cv2.fillPoly(inside_mask, [np.array([cell(x, z) for x, z in ring], np.int32)], 1)
garden[(inside_mask == 1) & np.isin(cls, (MEADOW, WOOD))] = 1
contours, _ = cv2.findContours(cv2.morphologyEx(garden, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)), cv2.RETR_EXTERNAL,
                               cv2.CHAIN_APPROX_SIMPLE)
for c in contours:
    if cv2.contourArea(c) < 10:
        continue
    c = cv2.approxPolyDP(c, 1.0, True).reshape(-1, 2)
    if len(c) < 3:
        continue
    p = []
    for x, z in c:
        p += [round(X0 + (x + 0.5) * CELL, 1), round(Z0 + (z + 0.5) * CELL, 1)]
    land.append({"k": "park", "p": p})
gm = [pt for r in w["roads"] if r.get("n") in ("Grote Markt", "Basiliekplein") for pt in pts(r["p"])]
if len(gm) >= 3:
    hull = cv2.convexHull(np.array(gm, np.float32)).reshape(-1, 2)
    land.append({"k": "townSquare", "p": [round(float(v), 1) for xy in hull for v in xy]})

# ------------------------------------------------------------------ points of interest
DROP_POI = ("Oorlog", "Monument", "Moskee", "Station", "Gemenebest", "Pastorie", "Bijstand", "Wachthuisje")
pois = []
# OSM POIs: only kinds that can predate 1650 (castles/manors, wall towers, ruins,
# abbeys, mottes, places) and only when not dated later; churches and monuments only via
# landmarks.json (memorials, neighbourhoods, tombs, bridges and the like are dropped)
POI_OK = {"castle", "manor", "tower", "citywalls", "ruins", "archaeological_site", "monastery", "abbey", "village",
          "hamlet", "city_gate"}
LATE_POI = ("Bar ", "ViaVia", "Dockx", "Academie", "Herenhuis", "Comt in", "Bisschoppelijk", "golden ram", "Arend",
            "TRADITIONELE", "De Borght", "Museum", "Karmelietessen", "Norbertienen", "Capucienen", "Predikheren", "Bacino")
osm_names = {}
for bd in w["buildings"]:
    if bd.get("n"):
        osm_names[bd["n"]] = bd.get("_sd")
for p in w["pois"]:
    if any(k in p["n"] for k in DROP + list(DROP_POI) + list(LATE_POI)):
        continue
    if math.hypot(p["x"], p["z"]) > RAD or p["k"] not in POI_OK:
        continue
    if (osm_names.get(p["n"]) or 0) > YEAR:
        continue
    pois.append(p)
for name, (x, z) in walls["gates"].items():
    pois.append({"n": name, "x": x, "z": z, "k": "city_gate"})
for bd in kept:
    if bd.get("lm") and bd.get("n"):
        cx, cz = centroid(bd["p"])
        pois.append({"n": bd["n"], "x": round(cx, 1), "z": round(cz, 1), "k": bd["lm"]})
for p in lmc.get("pois", []):
    pois.append(dict(p))
for fo in forts:
    cx, cz = centroid([v for xy in fo["ring"] for v in xy])
    pois.append({"n": fo["name"], "x": round(cx, 1), "z": round(cz, 1), "k": "castle"})
pois.append({"n": T["name"], "x": 0.0, "z": 0.0, "k": "town"})
# de-duplicate: same name, or two POIs within 30 m (a modern and a period name for the
# same tower or gate); later entries (gates, landmarks) win over raw OSM ones
dedup = []
for p in reversed(pois):
    if any(q["n"] == p["n"] or (math.hypot(q["x"] - p["x"], q["z"] - p["z"]) < 30 and q["k"] != "town" and p["k"] != "town")
           for q in dedup):
        continue
    dedup.append(p)
pois = dedup[::-1]


# ------------------------------------------------------------------ clip to the town radius
def clip_line(q, Rc):
    """split a polyline into the pieces inside the circle |p| <= Rc."""
    pieces, cur = [], []
    for i, (x, z) in enumerate(q):
        ins = x * x + z * z <= Rc * Rc
        if i > 0:
            px, pz = q[i - 1]
            pin = px * px + pz * pz <= Rc * Rc
            if ins != pin:
                dx, dz = x - px, z - pz
                A = dx * dx + dz * dz
                B = 2 * (px * dx + pz * dz)
                C = px * px + pz * pz - Rc * Rc
                disc = max(0.0, B * B - 4 * A * C)
                tt = [(-B - math.sqrt(disc)) / (2 * A), (-B + math.sqrt(disc)) / (2 * A)]
                t0 = next((t for t in tt if 0 <= t <= 1), 0.5)
                ip = (px + dx * t0, pz + dz * t0)
                cur.append(ip)
                if pin:
                    pieces.append(cur)
                    cur = []
        if ins:
            cur.append((x, z))
    if cur:
        pieces.append(cur)
    return [c for c in pieces if len(c) >= 2]


CIRCLE = [(RAD * math.cos(a), RAD * math.sin(a)) for a in np.linspace(0, 2 * math.pi, 64, endpoint=False)]


def clip_poly(q):
    """Sutherland-Hodgman against the 64-gon of the town circle."""
    outp = q
    for i in range(len(CIRCLE)):
        a, b_ = CIRCLE[i], CIRCLE[(i + 1) % len(CIRCLE)]
        inp, outp = outp, []
        if not inp:
            break

        def side(p):
            return (b_[0] - a[0]) * (p[1] - a[1]) - (b_[1] - a[1]) * (p[0] - a[0])

        for j in range(len(inp)):
            cur, prev = inp[j], inp[j - 1]
            sc, sp = side(cur), side(prev)
            if sc >= 0:
                if sp < 0:
                    t = sp / (sp - sc)
                    outp.append((prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t))
                outp.append(cur)
            elif sp >= 0:
                t = sp / (sp - sc)
                outp.append((prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t))
    return outp


def sh(q):
    return [v for x, z in q for v in (round(x + OX, 1), round(z + OZ, 1))]


def shift_lines(items):
    o = []
    for it in items:
        for piece in clip_line(pts(it["p"]), RAD):
            ni = dict(it)
            ni["p"] = sh(piece)
            o.append(ni)
    return o


def shift_polys(items, key=None):
    o = []
    for it in items:
        p = it if key is None else it[key]
        q = clip_poly(pts(p))
        if len(q) < 3:
            continue
        if key is None:
            o.append(sh(q))
        else:
            ni = dict(it)
            ni[key] = sh(q)
            o.append(ni)
    return o


buildings_out = []
seen_ids = set()
for bd in kept:
    if bd["id"] in seen_ids:  # a multipolygon relation with several outer rings
        bd = dict(bd, id=next_id)
        next_id -= 1
    seen_ids.add(bd["id"])
    nb = dict(bd)
    nb["p"] = sh(pts(bd["p"]))
    buildings_out.append(nb)
roads_out = shift_lines(roads)
water_lines_out = shift_lines(water_lines)
water_areas_out = shift_polys(water_areas)
land_out = shift_polys(land, "p")
pois_out = [dict(p, x=round(p["x"] + OX, 1), z=round(p["z"] + OZ, 1)) for p in pois]
walls_out = {"ring": [[round(x + OX, 1), round(z + OZ, 1)] for x, z in ring],
             "gates": {k: [round(x + OX, 1), round(z + OZ, 1)] for k, (x, z) in walls["gates"].items()}}
if forts:
    walls_out["forts"] = [{"name": fo["name"], "ring": [[round(x + OX, 1), round(z + OZ, 1)] for x, z in fo["ring"]]} for fo in forts]
if "gateSources" in walls:
    walls_out["gateSources"] = walls["gateSources"]
xs = [v for bd in buildings_out for v in bd["p"][0::2]] + [p[0] for p in walls_out["ring"]]
zs = [v for bd in buildings_out for v in bd["p"][1::2]] + [p[1] for p in walls_out["ring"]]
out = {
    "name": f"{T['name']}, c. {YEAR}",
    "attribution": "Map data © OpenStreetMap contributors (ODbL); historical land cover, town walls and gates from the "
                   "Ferraris map (1777) and the Villaret map (1745-48), Digitaal Vlaanderen (geo.api.vlaanderen.be/HISTCART)",
    "origin": {"lat": T["lat"], "lon": T["lon"]},
    "bounds": [math.floor(min(xs)), math.floor(min(zs)), math.ceil(max(xs)), math.ceil(max(zs))],
    "buildings": buildings_out,
    "roads": roads_out,
    "waterLines": water_lines_out,
    "waterAreas": water_areas_out,
    "land": land_out,
    "pois": pois_out,
    "year": YEAR,
    "walls": walls_out,
    "overworld": {"id": tid, "centre": [round(OX, 1), round(OZ, 1)], "radius": round(RAD, 1), "K": cfg["K"],
                  "note": "coordinates are overworld metres: town-local metres (around origin) + centre; 1:1 scale inside radius"},
}
os.makedirs(os.path.dirname(out_path), exist_ok=True)
json.dump(out, open(out_path, "w"), separators=(",", ":"))
stats = {"buildings_osm": len(w["buildings"]), "osm_kept": n_osm_kept, "landmarks": n_land, "town_blocks": added_town,
         "farmsteads": added_farm, "buildings_out": len(buildings_out), "roads": f"{len(w['roads'])}->{len(roads_out)}",
         "roads_dropped": dropped, "moats": moats, "water_lines": len(water_lines_out), "water_areas": len(water_areas_out),
         "land": len(land_out), "pois": len(pois_out), "size_kb": round(os.path.getsize(out_path) / 1024)}
stats["rampart_names"] = sorted({n for n in RAMP if n})
json.dump(stats, open(os.path.join(CACHE, "build", f"{tid}_stats.json"), "w"))
print(tid, {k: v for k, v in stats.items() if k != "rampart_names"})

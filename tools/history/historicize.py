#!/usr/bin/env python3
"""Turns the modern OpenStreetMap world into Diest as it stood around 1560.

Evidence: the Ferraris map (1777, georeferenced; see fetch_maps.py). Diest
hardly grew between the 1500s and the 1770s, so Ferraris is the best
georeferenced witness to the late-medieval town and countryside. Known
exceptions are handled explicitly (Scherpenheuvel's 17th-century town).

What it does:
  * reads the Ferraris colours into land cover at 4 m cells:
    field, built-up, meadow (wet grassland), wood, heath, water
  * keeps a modern building only if it stands on land Ferraris shows as built-up
    (inside the walls: the street frontages; outside: farmsteads and villages),
    caps its height to a period town house, and drops modern building types
  * keeps old roads (country lanes, tracks, town streets) and drops railways,
    motorways, the ring boulevard on the old ramparts, and suburban streets
  * replaces modern land use with the historical land cover
  * adds the town wall and gates traced from Ferraris (walls_1560.json)

Usage: historicize.py <world.json> <maps-dir> <walls.json> <out.json> [year]
  year defaults to 1560. From 1627 on, Scherpenheuvel's basilica and town stand.
"""
import json, math, sys
import cv2
import numpy as np
from PIL import Image

world_path, maps_dir, walls_path, out_path = sys.argv[1:5]
YEAR = int(sys.argv[5]) if len(sys.argv) > 5 else 1560
BASILICA_STANDS = YEAR >= 1627
w = json.load(open(world_path))
walls = json.load(open(walls_path))
meta = json.load(open(f"{maps_dir}/ferraris.json"))

# ------------------------------------------------------------------ land cover
FIELD, BUILT, MEADOW, WOOD, HEATH, WATER = range(6)
CELL = 4.0
img = np.asarray(Image.open(f"{maps_dir}/ferraris.png").convert("RGB")).astype(np.float32)
f = meta["mpp"] / CELL
small = cv2.resize(img, (int(img.shape[1] * f), int(img.shape[0] * f)), interpolation=cv2.INTER_AREA)
b = cv2.GaussianBlur(small, (0, 0), 2.4)
R, G, B = b[..., 0], b[..., 1], b[..., 2]
lum = 0.3 * R + 0.59 * G + 0.11 * B
cls = np.zeros(R.shape, np.uint8)
cls[G > R + 3] = MEADOW
cls[(G - B > 36) & (R - G > 6) & (R - G < 48) & (lum > 110) & (lum < 175)] = HEATH
cls[(lum < 128) & (G >= R - 6)] = WOOD
cls[(B > R + 6) & (G > R + 6)] = WATER
onehot = np.stack([cv2.blur((cls == k).astype(np.float32), (7, 7)) for k in range(6)], -1)
cls = onehot.argmax(-1).astype(np.uint8)
# small heath specks inside fields are tinted strips, not heath
n, lab, stats, _ = cv2.connectedComponentsWithStats((cls == HEATH).astype(np.uint8), 8)
small_heath = np.zeros(n, bool)
small_heath[1:] = stats[1:, cv2.CC_STAT_AREA] < 190
cls[small_heath[lab]] = FIELD
# built-up: pink/red, compact blobs only (red slope hatching is long and thin)
b2 = cv2.GaussianBlur(small, (0, 0), 0.7)
built = ((b2[..., 0] - b2[..., 1] > 40) & (b2[..., 1] - b2[..., 2] < 32)).astype(np.uint8)
n, lab, stats, _ = cv2.connectedComponentsWithStats(built, 8)
keep = np.zeros(n, bool)
for i in range(1, n):
    x, y, ww, hh, a = stats[i]
    fill = a / float(ww * hh)
    if a >= 2 and (fill > 0.35 or a > 60) and not (max(ww, hh) >= 12 and fill < 0.22):
        keep[i] = True
cls[keep[lab]] = BUILT
H, W = cls.shape
X0, Z0 = meta["x0"], meta["z0"]


def cell(x, z):
    return int((x - X0) / CELL), int((z - Z0) / CELL)


# ------------------------------------------------------------------ geometry helpers
ring = walls["ring"]


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


def in_town(x, z):
    return inside(ring, x, z)


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
    """Share of the footprint's cells (grown by `pad`) that Ferraris shows as built-up."""
    q = pts(p)
    xs = [cell(x, z)[0] for x, z in q]
    zs = [cell(x, z)[1] for x, z in q]
    cx0, cx1 = max(0, min(xs) - pad), min(W - 1, max(xs) + pad)
    cz0, cz1 = max(0, min(zs) - pad), min(H - 1, max(zs) + pad)
    if cx0 > cx1 or cz0 > cz1:
        return 0.0
    win = cls[cz0:cz1 + 1, cx0:cx1 + 1]
    return float((win == BUILT).mean())


# ------------------------------------------------------------------ buildings
# Scherpenheuvel: Ferraris shows the star-shaped town laid out around the basilica
# after 1609. Before then the hill held only the oak with its statue.
basilica = next((b for b in w["buildings"] if b.get("t") == "basilica"), None)
SCHERP = centroid(basilica["p"]) if basilica else (-5062, 518)
MODERN_TYPES = {"industrial", "warehouse", "retail", "commercial", "office", "apartments", "garage", "garages",
                "carport", "roof", "service", "greenhouse", "bunker", "supermarket", "sports_hall", "kiosk",
                "toilets", "train_station", "hospital", "school", "civic", "public", "transportation", "mosque",
                "construction", "parking"} | (set() if BASILICA_STANDS else {"basilica"})
ALWAYS = {"Sint-Sulpitius en Dionysiuskerk", "Lakenhalle", "Onze-Lieve-Vrouwekerk", "Sint-Catharinakerk",
          "Hof van Nassau", "De Gulden Maan", "Allerheiligenkapel", "Sint-Trudokerk", "Stadhuis Diest", "Ingang Begijnhof"}
NEVER_NAMES = ("Citadel", "Fort Leopold", "Kazemat", "Saillant", "Station", "Moskee", "Mariahal")

kept = []
for b in w["buildings"]:
    name = b.get("n", "")
    cx, cz = centroid(b["p"])
    if any(k in name for k in NEVER_NAMES):
        continue
    if name in ALWAYS:
        kept.append(b)
        continue
    if b.get("t") in MODERN_TYPES:
        continue
    if b.get("t") == "basilica" and BASILICA_STANDS:
        kept.append(b)
        continue
    if not BASILICA_STANDS and math.hypot(cx - SCHERP[0], cz - SCHERP[1]) < 520:
        continue
    a = area(b["p"])
    frac = built_fraction(b["p"])
    town = in_town(cx, cz)
    if town:
        if frac < 0.3 or a > 1600:
            continue
    else:
        if frac < 0.42 or a > 700:
            continue
    nb = dict(b)
    # period buildings: town houses of two or three storeys, low farmsteads
    cap = (11.5 if town else 7.0) if b.get("t") not in ("church", "chapel") else b["h"]
    nb["h"] = min(b["h"], cap)
    kept.append(nb)

# ------------------------------------------------------------------ fill the gaps from Ferraris
# Where Ferraris shows houses but no surviving building stands on the spot, build
# period ones: row houses along the town's streets, farmsteads in the countryside.
rng = np.random.default_rng(1560)
covered = np.zeros_like(cls)
for b in kept:
    poly = np.array([cell(x, z) for x, z in pts(b["p"])], np.int32)
    cv2.fillPoly(covered, [poly], 1)
covered = cv2.dilate(covered, np.ones((3, 3), np.uint8))
# the wall itself is drawn in the same pink as houses: keep a band along it free
wall_band = np.zeros_like(cls)
cv2.polylines(wall_band, [np.array([cell(x, z) for x, z in ring], np.int32)], True, 1, thickness=11)
gaps = ((cls == BUILT) & (covered == 0) & (wall_band == 0)).astype(np.uint8)
n, lab, stats, cents = cv2.connectedComponentsWithStats(gaps, 8)
next_id = -1
added_town = added_farm = 0
for i in range(1, n):
    a = stats[i, cv2.CC_STAT_AREA]
    cx = X0 + (cents[i][0] + 0.5) * CELL
    cz = Z0 + (cents[i][1] + 0.5) * CELL
    if not BASILICA_STANDS and math.hypot(cx - SCHERP[0], cz - SCHERP[1]) < 520:
        continue
    if BASILICA_STANDS and math.hypot(cx - SCHERP[0], cz - SCHERP[1]) < 45:
        continue  # the basilica itself
    mask = (lab == i).astype(np.uint8)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        continue
    c = contours[0]
    if in_town(cx, cz):
        if a < 4:
            continue
        c = cv2.approxPolyDP(c, 0.8, True).reshape(-1, 2)
        if len(c) < 3:
            continue
        p = []
        for x, z in c:
            p += [round(X0 + (x + 0.5) * CELL, 1), round(Z0 + (z + 0.5) * CELL, 1)]
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
            continue  # thin dashes are road edges and slope hatching, not houses
        ang = math.radians(ang + (90 if rw < rh else 0))
        L, Wd = 13 + rng.random() * 8, 7 + rng.random() * 1.5
        ux, uz = math.cos(ang), math.sin(ang)
        mx, mz = X0 + (rx + 0.5) * CELL, Z0 + (rz + 0.5) * CELL

        def rect(cx_, cz_, l, wd):
            q = []
            for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                q += [round(cx_ + ux * su * l / 2 - uz * sv * wd / 2, 1), round(cz_ + uz * su * l / 2 + ux * sv * wd / 2, 1)]
            return q

        kept.append({"id": next_id, "p": rect(mx, mz, L, Wd), "h": round(float(3.6 + rng.random() * 0.8), 1), "r": "g", "t": "farm"})
        next_id -= 1
        if a > 12 and rng.random() < 0.7:  # a barn across the yard
            bx, bz = mx - uz * (Wd + 6), mz + ux * (Wd + 6)
            kept.append({"id": next_id, "p": rect(bx, bz, L * 1.1, Wd + 2), "h": 4.2, "r": "g", "t": "barn"})
            next_id -= 1
        added_farm += 1
print(f"filled from Ferraris: {added_town} town blocks, {added_farm} farmsteads")

# ------------------------------------------------------------------ roads
grid = {}
for b in kept:
    cx, cz = centroid(b["p"])
    grid.setdefault((int(cx // 40), int(cz // 40)), []).append((cx, cz))


def near_building(x, z, r=35):
    gx, gz = int(x // 40), int(z // 40)
    for i in (-1, 0, 1):
        for j in (-1, 0, 1):
            for bx, bz in grid.get((gx + i, gz + j), []):
                if (bx - x) ** 2 + (bz - z) ** 2 < r * r:
                    return True
    return False


OLD_COUNTRY = {"primary", "secondary", "tertiary", "unclassified", "track", "path", "bridleway"}
roads = []
for r in w["roads"]:
    k = r["k"]
    name = (r.get("n") or "").lower()
    if k == "rail" or k.startswith("motorway") or k.startswith("trunk") or k in ("cycleway", "footway", "steps"):
        continue
    if name.endswith("vest") or "vest " in name or name.startswith("ring"):
        continue  # the 19th-century boulevards laid on the old ramparts
    q = pts(r["p"])
    mx, mz = q[len(q) // 2]
    if len(q) > 4 and math.hypot(q[0][0] - q[-1][0], q[0][1] - q[-1][1]) < 1 and area(r["p"]) < 9000:
        continue  # a closed loop: a modern roundabout
    town = in_town(mx, mz)
    if town:
        if k in ("service",) and not near_building(mx, mz, 25):
            continue
        nr = dict(r)
        nr["c"] = 1  # cobbled
        roads.append(nr)
        continue
    if k in OLD_COUNTRY:
        # a long modern road through open fields still follows an old lane more often than not
        roads.append(r)
    elif k in ("residential", "living_street", "service", "pedestrian") and near_building(mx, mz):
        roads.append(r)

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
        if hier[0][ci][3] != -1:
            continue  # holes are left as fields
        if cv2.contourArea(c) < 12:
            continue
        c = cv2.approxPolyDP(c, 1.2, True).reshape(-1, 2)
        if len(c) < 3:
            continue
        p = []
        for x, z in c:
            p += [round(X0 + (x + 0.5) * CELL, 1), round(Z0 + (z + 0.5) * CELL, 1)]
        land.append({"k": kind, "p": p})
# inside the walls: packed earth yards everywhere, gardens and orchards where Ferraris draws them
town_floor = []
for x, z in ring:
    town_floor += [x, z]
land.insert(0, {"k": "townYard", "p": town_floor})
garden = np.zeros_like(cls)
gx0, gz0 = cell(min(x for x, _ in ring), min(z for _, z in ring))
gx1, gz1 = cell(max(x for x, _ in ring), max(z for _, z in ring))
for zz in range(max(0, gz0), min(H, gz1 + 1)):
    for xx in range(max(0, gx0), min(W, gx1 + 1)):
        if cls[zz, xx] in (MEADOW, WOOD) and in_town(X0 + (xx + 0.5) * CELL, Z0 + (zz + 0.5) * CELL):
            garden[zz, xx] = 1
land = [l for l in land if not in_town(*centroid(l["p"]))]
land.insert(1, None)
land.pop(1)
contours, _ = cv2.findContours(cv2.morphologyEx(garden, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
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
# the market square: the area enclosed by the streets named Grote Markt
gm = [pt for r in w["roads"] if r.get("n") == "Grote Markt" for pt in pts(r["p"])]
if len(gm) >= 3:
    hull = cv2.convexHull(np.array(gm, np.float32)).reshape(-1, 2)
    land.append({"k": "townSquare", "p": [round(float(v), 1) for xy in hull for v in xy]})

# ------------------------------------------------------------------ points of interest
DROP_POI = ("Oorlog", "Monument", "Moskee", "Takwa", "Nour", "Hilaire", "Gemenebest", "Citadel", "Fort", "Saillant",
            "Kazemat", "Mariahal", "Basiliek", "Petrolpoort", "Saspoort", "Schaffensepoort", "Poortgebouw", "AVM",
            "Heilig Kind", "Scherpenheuvel-Zichem", "Wachthuisje", "Sint-Barbarakerk", "Sint-Jansruïne",
            "Holle Griet", "H. Theresia", "Pastorie", "Oosterlinden", "Bijstand")
pois = [p for p in w["pois"] if not any(k in p["n"] for k in DROP_POI)]
pois = [p for p in pois if p["n"] != "Scherpenheuvel"]
for name, (x, z) in walls["gates"].items():
    pois.append({"n": name, "x": x, "z": z, "k": "city_gate"})
pois.append({"n": "Scherpenheuvel", "x": SCHERP[0], "z": SCHERP[1], "k": "village"})
if BASILICA_STANDS:
    # the oak was felled in 1602; the basilica's high altar stands on its spot
    pois.append({"n": "Basiliek van Onze-Lieve-Vrouw van Scherpenheuvel", "x": SCHERP[0], "z": SCHERP[1], "k": "basilica"})
    pois.append({"n": "De Heilige Eik", "x": SCHERP[0], "z": SCHERP[1], "k": "oak-roots"})
else:
    pois.append({"n": "De Heilige Eik", "x": SCHERP[0], "z": SCHERP[1] - 10, "k": "oak"})

out = dict(w)
out.update({
    "name": f"Diest and the Demer valley, c. {YEAR}",
    "year": YEAR,
    "attribution": "Map data © OpenStreetMap contributors (ODbL); historical land cover from the Ferraris map (1777), "
                   "Digitaal Vlaanderen (geo.api.vlaanderen.be/HISTCART)",
    "buildings": kept,
    "roads": roads,
    "land": land,
    "pois": pois,
    "walls": walls,
})
json.dump(out, open(out_path, "w"), separators=(",", ":"))
print(f"buildings {len(w['buildings'])} -> {len(kept)}; roads {len(w['roads'])} -> {len(roads)}; land {len(land)}; pois {len(pois)}")

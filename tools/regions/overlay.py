#!/usr/bin/env python3
"""Verification overlay: draws a world file's buildings (kept OSM = blue, generated
from Ferraris = green, landmarks = magenta), roads (orange), water lines (cyan) and the
wall trace (red) on the town's Ferraris crop.

Works on a town-local world (build/<town>_osm.json) or on an overworld town file
(public/world/regions/<town>.json, coordinates shifted back by its overworld centre).

Usage: overlay.py <town> <world.json> <out.png> [x0 z0 x1 z1] [--px 1600]
"""
import json, os, sys
import cv2
import numpy as np
from PIL import Image
from common import CACHE

a = sys.argv[1:]
px = 1600
if "--px" in a:
    i = a.index("--px")
    px = int(a[i + 1])
    del a[i:i + 2]
tid, wpath, out = a[:3]
w = json.load(open(wpath))
ox, oz = w.get("overworld", {}).get("centre", [0, 0])
meta = json.load(open(os.path.join(CACHE, tid, "maps", "ferraris.json")))
img = Image.open(os.path.join(CACHE, tid, "maps", "ferraris.png"))
m = meta["mpp"]
if len(a) >= 7:
    x0, z0, x1, z1 = map(float, a[3:7])
else:
    x0, z0, x1, z1 = meta["x0"], meta["z0"], meta["x1"], meta["z1"]
crop = img.crop((int((x0 - meta["x0"]) / m), int((z0 - meta["z0"]) / m), int((x1 - meta["x0"]) / m), int((z1 - meta["z0"]) / m)))
s = px / max(crop.size)
crop = crop.resize((int(crop.size[0] * s), int(crop.size[1] * s)), Image.LANCZOS)
base = cv2.cvtColor(np.asarray(crop), cv2.COLOR_RGB2BGR)
c = (base * 0.75 + 255 * 0.25).astype(np.uint8)
k = s / m


def P(p):
    q = np.array(p, np.float64).reshape(-1, 2)
    q[:, 0] = (q[:, 0] - ox - x0) * k
    q[:, 1] = (q[:, 1] - oz - z0) * k
    return np.round(q).astype(np.int32)


for wl in w.get("waterLines", []):
    cv2.polylines(c, [P(wl["p"])], False, (230, 200, 0), max(1, int(wl["w"] * k * 0.5)))
for r in w["roads"]:
    cv2.polylines(c, [P(r["p"])], False, (0, 140, 255), 1)
for b in w["buildings"]:
    col = (255, 0, 255) if b.get("lm") else (0, 160, 0) if b["id"] < 0 else (255, 60, 0)
    cv2.polylines(c, [P(b["p"])], True, col, 2 if b.get("lm") else 1)
if w.get("walls"):
    cv2.polylines(c, [P(w["walls"]["ring"])], True, (0, 0, 255), 2)
    for f in w["walls"].get("forts", []):
        cv2.polylines(c, [P(f["ring"])], True, (0, 0, 255), 2)
    for name, g in w["walls"]["gates"].items():
        q = tuple(P(g)[0])
        cv2.circle(c, q, 6, (0, 255, 255), 2)
        cv2.putText(c, name, (q[0] + 7, q[1] + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 2)
        cv2.putText(c, name, (q[0] + 7, q[1] + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
for b in w["buildings"]:
    if b.get("lm") and b.get("n"):
        q = P(b["p"]).mean(0).astype(int)
        cv2.putText(c, b["n"][:28], (int(q[0]), int(q[1])), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (80, 0, 80), 1)
cv2.imwrite(out, c)
print(out, c.shape[1], c.shape[0])

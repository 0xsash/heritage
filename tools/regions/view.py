#!/usr/bin/env python3
"""Tracing aid: renders a crop of a town's Ferraris (or Villaret) map with a labelled
local-metre grid, optionally with the current wall trace and gates on top.

Usage: view.py <town> <x0> <z0> <x1> <z1> [out.png] [--grid 100] [--px 1300] [--layer ferraris] [--walls]
Writes to $REGIONS_CACHE/previews/ by default.
"""
import json, os, sys
import cv2
import numpy as np
from PIL import Image
from common import CACHE, HERE

a = sys.argv[1:]


def opt(name, default):
    if name in a:
        i = a.index(name)
        v = a[i + 1]
        del a[i:i + 2]
        return type(default)(v)
    return default


grid = opt("--grid", 100.0)
px = opt("--px", 1300)
layer = opt("--layer", "ferraris")
show_walls = "--walls" in a
a = [x for x in a if x != "--walls"]
tid = a[0]
x0, z0, x1, z1 = map(float, a[1:5])
out = a[5] if len(a) > 5 else os.path.join(CACHE, "previews", f"{tid}_{int(x0)}_{int(z0)}_{int(x1)}_{int(z1)}.png")
os.makedirs(os.path.dirname(out), exist_ok=True)
meta = json.load(open(os.path.join(CACHE, tid, "maps", f"{layer}.json")))
img = Image.open(os.path.join(CACHE, tid, "maps", f"{layer}.png"))
m = meta["mpp"]
crop = img.crop((int((x0 - meta["x0"]) / m), int((z0 - meta["z0"]) / m), int((x1 - meta["x0"]) / m), int((z1 - meta["z0"]) / m)))
s = px / max(crop.size)
crop = crop.resize((int(crop.size[0] * s), int(crop.size[1] * s)), Image.LANCZOS)
c = cv2.cvtColor(np.asarray(crop), cv2.COLOR_RGB2BGR).copy()
k = s / m  # pixels per metre


def P(x, z):
    return int(round((x - x0) * k)), int(round((z - z0) * k))


gx = np.arange(np.ceil(x0 / grid) * grid, x1, grid)
gz = np.arange(np.ceil(z0 / grid) * grid, z1, grid)
for x in gx:
    major = abs(x) % (grid * 5) < 1e-6
    cv2.line(c, P(x, z0), P(x, z1), (255, 0, 0) if major else (200, 120, 0), 1)
    cv2.putText(c, str(int(x)), (P(x, z0)[0] + 2, 12), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 0, 0), 1)
for z in gz:
    major = abs(z) % (grid * 5) < 1e-6
    cv2.line(c, P(x0, z), P(x1, z), (255, 0, 0) if major else (200, 120, 0), 1)
    cv2.putText(c, str(int(z)), (2, P(x0, z)[1] - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 0, 0), 1)
if show_walls:
    wp = os.path.join(HERE, "walls", f"{tid}.json")
    wl = json.load(open(wp))
    ring = np.array([P(x, z) for x, z in wl["ring"]], np.int32)
    cv2.polylines(c, [ring], True, (255, 0, 255), 2)
    for i, (x, z) in enumerate(wl["ring"]):
        cv2.putText(c, str(i), P(x, z), cv2.FONT_HERSHEY_SIMPLEX, 0.33, (120, 0, 120), 1)
    for name, (x, z) in wl["gates"].items():
        cv2.circle(c, P(x, z), 6, (0, 255, 255), 2)
        cv2.putText(c, name, (P(x, z)[0] + 7, P(x, z)[1] + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 0, 0), 2)
        cv2.putText(c, name, (P(x, z)[0] + 7, P(x, z)[1] + 4), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 255, 255), 1)
cv2.imwrite(out, c)
print(out, c.shape[1], c.shape[0])

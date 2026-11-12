#!/usr/bin/env python3
"""Downloads georeferenced historical maps of the play area from the Flemish
government's historical-maps service (geo.api.vlaanderen.be/HISTCART, free to
use; see the service's terms) and stitches them into one image aligned with
the game's local metre grid.

  ferraris  Ferraris map (1777): buildings, walls, gardens, fields, roads
  villaret  Villaret map (1745-1748): names of the gates and chapels

Usage: fetch_maps.py <world.json> <out-dir> [metres-per-pixel]
"""
import json, math, os, subprocess, sys, urllib.parse
from PIL import Image

world_path, out = sys.argv[1], sys.argv[2]
MPP = float(sys.argv[3]) if len(sys.argv) > 3 else 1.4
w = json.load(open(world_path))
LAT0, LON0 = w["origin"]["lat"], w["origin"]["lon"]
MX = math.cos(math.radians(LAT0)) * 111320
MZ = 110574
x0, z0, x1, z1 = w["bounds"]
x0, z0, x1, z1 = x0 - 200, z0 - 200, x1 + 200, z1 + 200
TILE = 2000
W, H = int((x1 - x0) / MPP), int((z1 - z0) / MPP)
os.makedirs(out, exist_ok=True)

for layer in sys.argv[4:] or ["ferraris"]:
    canvas = Image.new("RGB", (W, H))
    for ty in range(0, H, TILE):
        for tx in range(0, W, TILE):
            tw, th = min(TILE, W - tx), min(TILE, H - ty)
            ax0, ax1 = x0 + tx * MPP, x0 + (tx + tw) * MPP
            az0, az1 = z0 + ty * MPP, z0 + (ty + th) * MPP
            bbox = f"{LAT0 - az1 / MZ},{LON0 + ax0 / MX},{LAT0 - az0 / MZ},{LON0 + ax1 / MX}"
            q = dict(service="WMS", request="GetMap", version="1.3.0", layers=layer, styles="", crs="EPSG:4326",
                     bbox=bbox, width=tw, height=th, format="image/jpeg")
            f = os.path.join(out, f"_{layer}_{tx}_{ty}.jpg")
            url = "https://geo.api.vlaanderen.be/HISTCART/wms?" + urllib.parse.urlencode(q)
            for attempt in range(4):
                subprocess.run(["curl", "-sS", "-m", "300", "-o", f, url], check=False)
                try:
                    canvas.paste(Image.open(f).convert("RGB"), (tx, ty))
                    break
                except Exception:
                    print("retry", layer, tx, ty)
            os.remove(f)
    canvas.save(os.path.join(out, f"{layer}.png"))
    json.dump({"layer": layer, "x0": x0, "z0": z0, "x1": x1, "z1": z1, "mpp": MPP, "width": W, "height": H},
              open(os.path.join(out, f"{layer}.json"), "w"))
    print(layer, W, H)

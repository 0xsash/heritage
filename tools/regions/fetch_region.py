#!/usr/bin/env python3
"""Downloads the regional (between-town) data for the 1650 overworld:
  * OSM rivers (waterway=river|canal, by name), main roads (trunk/primary/secondary)
    and settlements (place=town|village|hamlet) over the region bbox
  * the Ferraris map over the whole region at 5 m/px, kept as 2000 px tiles in the
    region frame (equirectangular around towns.json "ref", x east, z south)

The OSM part runs only with --overpass; extract_pbf.py writes the same files from a
.osm.pbf extract (preferred, Overpass is slow from some machines).

Usage: fetch_region.py [--overpass]   -> $REGIONS_CACHE/region/{osm,ferraris}/
"""
import json, os, sys
from common import CACHE, Frame, config, overpass, wms_tile

cfg = config()
REGION = cfg.get("region", {"south": 50.78, "west": 4.22, "north": 51.32, "east": 5.20})
ref = Frame(cfg["ref"]["lat"], cfg["ref"]["lon"])
out = os.path.join(CACHE, "region")
osm = os.path.join(out, "osm")
os.makedirs(osm, exist_ok=True)
S, W, N, E = REGION["south"], REGION["west"], REGION["north"], REGION["east"]

RIVERS = "Schelde|Zeeschelde|Rupel|Dijle|Demer|Nete|Zenne|Durme|Leie|Dender|Zeekanaal"
for i in range(2 if "--overpass" in sys.argv else 0):
    for j in range(2):
        s, n = S + (N - S) * i / 2, S + (N - S) * (i + 1) / 2
        w, e = W + (E - W) * j / 2, W + (E - W) * (j + 1) / 2
        B = f"({s},{w},{n},{e})"
        overpass(f'[out:json][timeout:170];(way[waterway~"^(river|canal)$"][name~"{RIVERS}"]{B};);out geom tags;',
                 os.path.join(osm, f"rivers{i}{j}.json"))
for i in range(4 if "--overpass" in sys.argv else 0):
    for j in range(4):
        s, n = S + (N - S) * i / 4, S + (N - S) * (i + 1) / 4
        w, e = W + (E - W) * j / 4, W + (E - W) * (j + 1) / 4
        B = f"({s},{w},{n},{e})"
        overpass(f'[out:json][timeout:170];(way[highway~"^(trunk|primary|secondary)$"]{B};);out geom tags;',
                 os.path.join(osm, f"roads{i}{j}.json"))
if "--overpass" in sys.argv:
    overpass(f'[out:json][timeout:170];(node[place~"^(town|village|hamlet)$"]({S},{W},{N},{E}););out tags;',
             os.path.join(osm, "places.json"))

# Ferraris tiles at 5 m/px in the region frame
MPP, TILE = 5.0, 2000
fdir = os.path.join(out, "ferraris")
os.makedirs(fdir, exist_ok=True)
x0, z0 = ref.fwd(N, W)
x1, z1 = ref.fwd(S, E)
x0, z0 = int(x0 // 1000) * 1000, int(z0 // 1000) * 1000
x1, z1 = int(x1 // 1000 + 1) * 1000, int(z1 // 1000 + 1) * 1000
step = MPP * TILE
tiles = []
z = z0
while z < z1:
    x = x0
    while x < x1:
        path = os.path.join(fdir, f"t_{int(x)}_{int(z)}.jpg")
        if not os.path.exists(path):
            s, w, n, e = ref.bbox_ll(x, z, x + step, z + step)
            wms_tile("ferraris", s, w, n, e, TILE, TILE, path)
            print("  tile", x, z, flush=True)
        tiles.append([x, z])
        x += step
    z += step
json.dump({"mpp": MPP, "tile": TILE, "x0": x0, "z0": z0, "x1": x0 + step * len({t[0] for t in tiles}),
           "z1": z0 + step * len({t[1] for t in tiles}), "tiles": tiles, "lat0": ref.lat0, "lon0": ref.lon0},
          open(os.path.join(fdir, "index.json"), "w"))
print("region done", len(tiles), "tiles")

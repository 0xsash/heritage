#!/usr/bin/env python3
"""Downloads the raw data for one town of the 1650 overworld:
  * OpenStreetMap (Overpass) for the town's bbox, chunked like tools/osm/fetch.sh:
    buildings in ~1 km tiles, roads / water / land / misc in 2x2 tiles
  * the Ferraris map (1777) at 1.4 m/px (and the Villaret map, 1745-48, at 2.8 m/px,
    used only to read gate names) from geo.api.vlaanderen.be/HISTCART

Everything goes to $REGIONS_CACHE/<town>/{osm,maps}/ (see common.py).
Overpass is slow and flaky from some machines; extract_pbf.py writes the same
osm/*.json files from a Geofabrik-style .osm.pbf extract instead (preferred).

Usage: fetch_town.py [--maps-only] <town-id> [<town-id> ...]   (or "all")
"""
import math, os, sys
from common import CACHE, Frame, config, fetch_map, overpass, town

cfg = config()
args = [a for a in sys.argv[1:] if not a.startswith("--")]
MAPS_ONLY = "--maps-only" in sys.argv
ids = [t["id"] for t in cfg["towns"]] if args == ["all"] else args


def tiles(box, n):
    x0, z0, x1, z1 = box
    nx = max(1, math.ceil((x1 - x0) / n))
    nz = max(1, math.ceil((z1 - z0) / n))
    for i in range(nx):
        for j in range(nz):
            yield i * nz + j, (x0 + (x1 - x0) * i / nx, z0 + (z1 - z0) * j / nz,
                               x0 + (x1 - x0) * (i + 1) / nx, z0 + (z1 - z0) * (j + 1) / nz)


for tid in ids:
    t = town(cfg, tid)
    fr = Frame(t["lat"], t["lon"])
    osm = os.path.join(CACHE, tid, "osm")
    os.makedirs(osm, exist_ok=True)
    print(tid, flush=True)

    def bb(box):
        s, w, n, e = fr.bbox_ll(*box)
        return f"({s:.5f},{w:.5f},{n:.5f},{e:.5f})"

    maps = os.path.join(CACHE, tid, "maps")
    if MAPS_ONLY:
        fetch_map(fr, t["bbox"], maps, "ferraris", 1.4)
        fetch_map(fr, t["bbox"], maps, "Villaret", 2.8)
        continue
    big = (t["bbox"][2] - t["bbox"][0]) * (t["bbox"][3] - t["bbox"][1]) > 9e6
    for i, box in tiles(t["bbox"], 1000 if big else 1600):
        B = bb(box)
        overpass(f"[out:json][timeout:170];(way[building]{B};relation[building]{B};);out geom tags;",
                 os.path.join(osm, f"b{i + 1}.json"))
    QUERIES = {
        "roads": "(way[highway]{B};way[railway=rail]{B};)",
        "water": "(way[waterway]{B};way[natural=water]{B};relation[natural=water]{B};way[water]{B};)",
        "land": "(way[landuse]{B};relation[landuse]{B};way[natural~\"wood|wetland|scrub|grassland|heath\"]{B};"
                "relation[natural~\"wood|wetland\"]{B};way[leisure~\"park|garden|pitch\"]{B};)",
        "misc": "(way[barrier=city_wall]{B};way[historic]{B};relation[historic]{B};node[place]{B};node[historic]{B};"
                "node[amenity=place_of_worship]{B};way[amenity=place_of_worship]{B};way[building~\"cathedral|church|chapel|basilica\"]{B};)",
    }
    split = list(tiles(t["bbox"], (t["bbox"][2] - t["bbox"][0]) / 2 + 1)) if big else [(0, t["bbox"])]
    for name, q in QUERIES.items():
        for i, box in split:
            overpass(f"[out:json][timeout:170];{q.format(B=bb(box))};out geom tags;",
                     os.path.join(osm, f"{name}{i if big else ''}.json"))
    maps = os.path.join(CACHE, tid, "maps")
    fetch_map(fr, t["bbox"], maps, "ferraris", 1.4)
    fetch_map(fr, t["bbox"], maps, "Villaret", 2.8)

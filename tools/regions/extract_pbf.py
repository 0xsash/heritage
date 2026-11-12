#!/usr/bin/env python3
"""Writes the OSM inputs of the 1650 regions pipeline from a .osm.pbf extract
(e.g. download.openstreetmap.fr/extracts/europe/belgium/flanders-latest.osm.pbf),
in the same Overpass-JSON layout that fetch_town.py / fetch_region.py produce:

  $REGIONS_CACHE/<town>/osm/{b,roads,water,land,misc}.json   per town bbox
  $REGIONS_CACHE/region/osm/{rivers,roads,places}.json        over towns.json "region"

The selection mirrors the Overpass queries in fetch_town.py. Needs `pip install osmium`.
Usage: extract_pbf.py <extract.osm.pbf> [<town-id> ...]
"""
import json, os, re, sys, time
import osmium
from common import CACHE, Frame, config

cfg = config()
pbf = sys.argv[1]
only = sys.argv[2:]
towns = [t for t in cfg["towns"] if not only or t["id"] in only]
REGION = cfg.get("region", {"south": 50.78, "west": 4.22, "north": 51.32, "east": 5.20})
boxes = {}
for t in towns:
    boxes[t["id"]] = Frame(t["lat"], t["lon"]).bbox_ll(*t["bbox"])  # s, w, n, e
RB = (REGION["south"], REGION["west"], REGION["north"], REGION["east"])
RIVER_RE = re.compile(r"Schelde|Zeeschelde|Rupel|Dijle|Demer|Nete|Zenne|Durme|Leie|Dender|Zeekanaal")
LAND_NAT = {"wood", "wetland", "scrub", "grassland", "heath"}


def hits(bb, s, w, n, e):
    return not (bb[0] > n or bb[2] < s or bb[1] > e or bb[3] < w)


def town_cats(tags, kind):
    """Which per-town files an element belongs to (mirrors fetch_town.py's Overpass queries)."""
    c = []
    g = tags.get
    if g("building"):
        c.append("b")
    if kind == "w" and (g("highway") or g("railway") == "rail"):
        c.append("roads")
    if (kind == "w" and (g("waterway") or g("water"))) or g("natural") == "water":
        c.append("water")
    if g("landuse") or (kind == "w" and (g("natural") in LAND_NAT or g("leisure") in ("park", "garden", "pitch"))) \
            or (kind == "r" and g("natural") in ("wood", "wetland")):
        c.append("land")
    if g("historic") or (kind == "w" and (g("barrier") == "city_wall" or g("amenity") == "place_of_worship")):
        c.append("misc")
    return c


t0 = time.time()
# ---- pass 1: relations of interest and their member ways
rels = {}
member_ways = set()
for r in osmium.FileProcessor(pbf, osmium.osm.RELATION):
    tags = dict(r.tags)
    if tags.get("type") not in ("multipolygon", "building"):
        continue
    cats = town_cats(tags, "r")
    if not cats:
        continue
    mem = [(m.ref, m.role) for m in r.members if m.type == "w"]
    rels[r.id] = (tags, mem, cats)
    member_ways.update(ref for ref, _ in mem)
print(f"relations {len(rels)}, member ways {len(member_ways)}, {time.time() - t0:.0f}s", flush=True)

# ---- pass 2: ways with geometry
out = {tid: {k: [] for k in ("b", "roads", "water", "land", "misc")} for tid in boxes}
region = {"rivers": [], "roads": [], "places": []}
member_geom = {}
nw = 0
for w in osmium.FileProcessor(pbf, osmium.osm.NODE | osmium.osm.WAY).with_locations().with_filter(osmium.filter.EntityFilter(osmium.osm.WAY)):
    nw += 1
    wid = w.id
    tags = None
    cats = None
    if len(w.tags):
        tags = dict(w.tags)
        cats = town_cats(tags, "w")
        hw = tags.get("highway")
        riv = tags.get("waterway") in ("river", "canal") and RIVER_RE.search(tags.get("name", ""))
        reg_road = hw in ("trunk", "primary", "secondary")
    else:
        riv = reg_road = False
    if not cats and not riv and not reg_road and wid not in member_ways:
        continue
    try:
        geom = [{"lat": round(n.lat, 7), "lon": round(n.lon, 7)} for n in w.nodes]
    except osmium.InvalidLocationError:
        geom = [{"lat": round(n.lat, 7), "lon": round(n.lon, 7)} for n in w.nodes if n.location.valid()]
    if len(geom) < 2:
        continue
    lats = [p["lat"] for p in geom]
    lons = [p["lon"] for p in geom]
    bb = (min(lats), min(lons), max(lats), max(lons))
    if wid in member_ways:
        member_geom[wid] = geom
    el = None
    if cats:
        for tid, box in boxes.items():
            if hits(bb, *box):
                el = el or {"type": "way", "id": wid, "tags": tags, "geometry": geom}
                for c in cats:
                    out[tid][c].append(el)
    if (riv or reg_road) and hits(bb, *RB):
        el = el or {"type": "way", "id": wid, "tags": tags, "geometry": geom}
        region["rivers" if riv else "roads"].append(el)
print(f"ways {nw}, {time.time() - t0:.0f}s", flush=True)

for rid, (tags, mem, cats) in rels.items():
    members = [{"type": "way", "ref": ref, "role": role, "geometry": member_geom[ref]}
               for ref, role in mem if ref in member_geom]
    if not members:
        continue
    lats = [p["lat"] for m in members for p in m["geometry"]]
    lons = [p["lon"] for m in members for p in m["geometry"]]
    bb = (min(lats), min(lons), max(lats), max(lons))
    el = {"type": "relation", "id": rid, "tags": tags, "members": members}
    for tid, box in boxes.items():
        if hits(bb, *box):
            for c in cats:
                out[tid][c].append(el)

# ---- pass 3: tagged nodes (places, historic, places of worship)
for n in osmium.FileProcessor(pbf, osmium.osm.NODE).with_filter(osmium.filter.KeyFilter("place", "historic", "amenity")):
    tags = dict(n.tags)
    if not (tags.get("place") or tags.get("historic") or tags.get("amenity") == "place_of_worship"):
        continue
    lat, lon = n.location.lat, n.location.lon
    el = {"type": "node", "id": n.id, "lat": round(lat, 7), "lon": round(lon, 7), "tags": tags}
    for tid, (s, w_, nn, e) in boxes.items():
        if s <= lat <= nn and w_ <= lon <= e:
            out[tid]["misc"].append(el)
    if tags.get("place") in ("town", "village", "hamlet", "city") and RB[0] <= lat <= RB[2] and RB[1] <= lon <= RB[3]:
        region["places"].append(el)
print(f"nodes done, {time.time() - t0:.0f}s", flush=True)

for tid, files in out.items():
    d = os.path.join(CACHE, tid, "osm")
    os.makedirs(d, exist_ok=True)
    for f in os.listdir(d):
        if f.endswith(".json"):
            os.remove(os.path.join(d, f))
    for k, els in files.items():
        json.dump({"elements": els}, open(os.path.join(d, f"{k}.json"), "w"))
    print(tid, {k: len(v) for k, v in files.items()})
if not only:
    d = os.path.join(CACHE, "region", "osm")
    os.makedirs(d, exist_ok=True)
    for k, els in region.items():
        json.dump({"elements": els}, open(os.path.join(d, f"{k}.json"), "w"))
    print("region", {k: len(v) for k, v in region.items()})

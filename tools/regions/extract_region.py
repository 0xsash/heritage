#!/usr/bin/env python3
"""Writes the between-town OSM inputs of the overworld from one or more .osm.pbf extracts
(download.openstreetmap.fr: belgium/flanders, belgium/brussels_capital_region,
belgium/wallonia_french_community, netherlands/zeeland, netherlands/noord_brabant,
netherlands/limburg), merged and de-duplicated, over towns.json "region":

  $REGIONS_CACHE/region/osm/rivers.json   named rivers and canals (RIVER_RE) + named streams (STREAM_RE)
  $REGIONS_CACHE/region/osm/roads.json    highway=trunk|primary|secondary
  $REGIONS_CACHE/region/osm/places.json   place=city|town|village|hamlet nodes
  $REGIONS_CACHE/region/osm/coast.json    natural=coastline ways
  $REGIONS_CACHE/region/osm/dykes.json    man_made=dyke ways (polder dikes; only used near the Scheldt)
  $REGIONS_CACHE/region/osm/admin.json    administrative areas used to build the 1650 polities
                                          (provinces, countries, regions; see politics.json)
Same element layout as Overpass JSON ("elements" with "geometry"); admin areas as
{"name", "admin_level", "rings": [[[lat, lon], ...], ...]} (outer rings, simplified ~50 m).

Usage: extract_region.py <a.osm.pbf> [<b.osm.pbf> ...]
"""
import json, os, re, sys, time
import osmium
from common import CACHE, config

cfg = config()
R = cfg["region"]
RB = (R["south"], R["west"], R["north"], R["east"])
RIVER_RE = re.compile(r"Schelde|Escaut|Rupel|Dijle|Dyle|Demer|Nete|Zenne|Senne|Durme|Leie|Lys|Dender|Dendre|Zeekanaal|"
                      r"^Maas$|Meuse|Gete|Geete|IJzer|Yser|Lieve|Ieperlee|Gent-Oostende|Brugge-Oostende|Moervaart|Zwin|"
                      r"^Mark$|^Marke$|Jeker|Geer|Herk|Velp|Mangelbeek|Zwalm|Kale|Durme|Laan|Dommel|Abeek|Aa$")
STREAM_RE = re.compile(r"^(Velp|Herk|Mangelbeek|Zwalm|Kleine Gete|Grote Gete|Jeker|Abeek|Dommel|Laan|Mark|Marke|"
                       r"Bosbeek|Itterbeek|Ieperlee|Handzamevaart|Kale|Zuidlede|Moervaart)$")
ADMIN_NAMES = {
    # Belgium: regions (4) and provinces (6)
    "Vlaanderen", "Brussel-Hoofdstad - Bruxelles-Capitale", "Région de Bruxelles-Capitale - Brussels Hoofdstedelijk Gewest",
    "Wallonie", "Antwerpen", "Limburg", "Oost-Vlaanderen", "West-Vlaanderen", "Vlaams-Brabant", "Brabant wallon", "Hainaut",
    "Liège", "Namur",
    # Netherlands: provinces (4)
    "Zeeland", "Noord-Brabant",
    # municipalities used for small polities
    "Mechelen", "Maastricht",
}
ADMIN_LEVELS = {"2", "4", "6", "8"}


def inreg(lat, lon, pad=0.05):
    return RB[0] - pad <= lat <= RB[2] + pad and RB[1] - pad <= lon <= RB[3] + pad


out = {k: {} for k in ("rivers", "roads", "places", "coast", "dykes")}
admin = {}
t0 = time.time()
for pbf in sys.argv[1:]:
    print(pbf, flush=True)
    for w in osmium.FileProcessor(pbf, osmium.osm.NODE | osmium.osm.WAY).with_locations().with_filter(
            osmium.filter.EntityFilter(osmium.osm.WAY)):
        tg = w.tags
        ww, hw, nat, mm = tg.get("waterway"), tg.get("highway"), tg.get("natural"), tg.get("man_made")
        name = tg.get("name", "")
        cat = None
        if ww in ("river", "canal") and RIVER_RE.search(name):
            cat = "rivers"
        elif ww == "stream" and STREAM_RE.search(name):
            cat = "rivers"
        elif hw in ("trunk", "primary", "secondary"):
            cat = "roads"
        elif nat == "coastline":
            cat = "coast"
        elif mm == "dyke":
            cat = "dykes"
        if not cat or w.id in out[cat]:
            continue
        try:
            geom = [{"lat": round(n.lat, 6), "lon": round(n.lon, 6)} for n in w.nodes if n.location.valid()]
        except osmium.InvalidLocationError:
            continue
        if len(geom) < 2 or not any(inreg(p["lat"], p["lon"]) for p in geom):
            continue
        out[cat][w.id] = {"type": "way", "id": w.id, "tags": {k: tg.get(k) for k in ("name", "waterway", "highway", "natural", "man_made", "ref") if tg.get(k)},
                          "geometry": geom}
    print("  ways", {k: len(v) for k, v in out.items()}, f"{time.time() - t0:.0f}s", flush=True)
    for n in osmium.FileProcessor(pbf, osmium.osm.NODE).with_filter(osmium.filter.KeyFilter("place", "historic", "military")):
        tg = n.tags
        pl = tg.get("place")
        lat, lon = n.location.lat, n.location.lon
        if not inreg(lat, lon, 0):
            continue
        if pl in ("city", "town", "village", "hamlet") or (tg.get("historic") in ("fort", "castle") and tg.get("name")):
            out["places"][n.id] = {"type": "node", "id": n.id, "lat": round(lat, 6), "lon": round(lon, 6),
                                   "tags": {k: tg.get(k) for k in ("name", "place", "historic", "population") if tg.get(k)}}
    print("  places", len(out["places"]), flush=True)
    # administrative areas (assembled multipolygons)
    for a in osmium.FileProcessor(pbf).with_areas(osmium.filter.TagFilter(("boundary", "administrative"))).with_filter(
            osmium.filter.EntityFilter(osmium.osm.AREA)):
        tg = a.tags
        nm = tg.get("name", "")
        lvl = tg.get("admin_level", "")
        if lvl not in ADMIN_LEVELS or nm not in ADMIN_NAMES or a.from_way():
            continue
        if lvl == "8" and nm not in ("Mechelen", "Maastricht"):
            continue
        key = f"{nm}|{lvl}"
        rings = []
        for ring in a.outer_rings():
            pts = [(round(p.lat, 5), round(p.lon, 5)) for p in ring if p.location.valid()]
            rings.append(pts)
        tot = sum(len(r) for r in rings)
        if key not in admin or tot > admin[key]["n"]:
            admin[key] = {"name": nm, "admin_level": lvl, "n": tot, "rings": rings}
    print("  admin", sorted(admin), f"{time.time() - t0:.0f}s", flush=True)

D = os.path.join(CACHE, "region", "osm")
os.makedirs(D, exist_ok=True)
for k, v in out.items():
    json.dump({"elements": list(v.values())}, open(os.path.join(D, f"{k}.json"), "w"))
# simplify admin rings (Douglas-Peucker in degrees, ~50 m)
try:
    from shapely.geometry import Polygon
    for v in admin.values():
        rr = []
        for r in v["rings"]:
            if len(r) < 4:
                continue
            p = Polygon([(lo, la) for la, lo in r]).simplify(0.0006)
            if p.is_empty or p.geom_type != "Polygon":
                continue
            rr.append([[round(la, 5), round(lo, 5)] for lo, la in p.exterior.coords])
        v["rings"] = rr
except ImportError:
    pass
json.dump(list(admin.values()), open(os.path.join(D, "admin.json"), "w"))
print("region osm", {k: len(v) for k, v in out.items()}, "admin", len(admin))

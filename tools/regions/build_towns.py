#!/usr/bin/env python3
"""Runs build_town.mjs (OSM -> town-local world) and/or historicize_town.py for several towns,
reading centre and name from towns.json.

Usage: build_towns.py [--osm] [--hist] <town-id> ... | all
  --osm   node build_town.mjs $REGIONS_CACHE/<t>/osm $REGIONS_CACHE/build/<t>_osm.json <lat> <lon> <name>
  --hist  historicize_town.py <t>  (needs walls/<t>.json)
(no flag = both)
"""
import os, subprocess, sys
from common import CACHE, HERE, config

cfg = config()
a = sys.argv[1:]
do_osm = "--osm" in a or not ("--osm" in a or "--hist" in a)
do_hist = "--hist" in a or not ("--osm" in a or "--hist" in a)
ids = [x for x in a if not x.startswith("--")]
if ids == ["all"]:
    ids = [t["id"] for t in cfg["towns"]]
for tid in ids:
    t = next(x for x in cfg["towns"] if x["id"] == tid)
    if do_osm:
        subprocess.run(["node", os.path.join(HERE, "build_town.mjs"), os.path.join(CACHE, tid, "osm"),
                        os.path.join(CACHE, "build", f"{tid}_osm.json"), str(t["lat"]), str(t["lon"]), t["name"]], check=True)
    if do_hist:
        if not os.path.exists(os.path.join(HERE, "walls", f"{tid}.json")):
            print(tid, "no wall trace yet, skipped")
            continue
        subprocess.run([sys.executable, os.path.join(HERE, "historicize_town.py"), tid], check=True, cwd=HERE)

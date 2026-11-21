#!/usr/bin/env python3
"""Overview plans: for each town, overlay.py over the whole town circle (Ferraris underneath,
buildings, wall ring, gates (uncertain ones marked '?'), landmark register (magenta stars,
orange = uncertain)), saved as JPEG.

Usage: plans.py <out-dir> <town-id> ... | all
"""
import json, os, subprocess, sys
from PIL import Image
from common import HERE, REPO, config

out_dir = sys.argv[1]
ids = sys.argv[2:]
cfg = config()
if ids == ["all"]:
    ids = [t["id"] for t in cfg["towns"]]
os.makedirs(out_dir, exist_ok=True)
for tid in ids:
    f = os.path.join(REPO, "public", "world", "regions", f"{tid}.json")
    if not os.path.exists(f):
        continue
    w = json.load(open(f))
    R = w["overworld"]["radius"]
    png = os.path.join(out_dir, f"{tid}.png")
    subprocess.run([sys.executable, os.path.join(HERE, "overlay.py"), tid, f, png, str(-R), str(-R), str(R), str(R), "--px", "1400"],
                   check=True, cwd=HERE, capture_output=True)
    Image.open(png).convert("RGB").save(os.path.join(out_dir, f"{tid}.jpg"), quality=82)
    os.remove(png)
    print(os.path.join(out_dir, f"{tid}.jpg"))

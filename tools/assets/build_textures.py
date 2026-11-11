#!/usr/bin/env python3
"""Packs CC0 PBR materials (ambientCG, 1K) into vertical strips the game loads
as texture arrays: one 1024px layer per material, stacked top to bottom.

  <set>_albedo.jpg   sRGB base colour
  <set>_normal.jpg   tangent-space normal (OpenGL convention)
  <set>_orm.jpg      R = ambient occlusion, G = roughness, B = height
  materials.json     layer order, tile size in metres, mean albedo (linear)

Usage: build_textures.py <cache-dir>/tex <out-dir>
"""
import glob, json, os, sys
import numpy as np
from PIL import Image

SRC, OUT = sys.argv[1], sys.argv[2]
SIZE = 1024

# name, ambientCG id, metres covered by one repeat of the texture
SETS = {
    "build": [
        ("brickRed", "Bricks059", 1.0),
        ("brickDark", "Bricks097", 1.15),
        ("brickWhite", "Bricks060", 1.0),
        ("plaster", "Plaster001", 2.4),
        ("stone", "Bricks066", 2.0),
        ("roofClay", "RoofingTiles014A", 2.2),
        ("roofSlate", "RoofingTiles003", 2.2),
        ("brickOld", "Bricks090", 1.2),
    ],
    "ground": [
        ("grass", "Grass004", 2.6),
        ("meadow", "Grass001", 2.8),
        ("cobble", "PavingStones070", 1.6),
        ("dirt", "Ground054", 2.2),
        ("forest", "Ground068", 3.0),
        ("rough", "Ground037", 3.0),
    ],
}


def load(mat, kind, mode):
    f = glob.glob(os.path.join(SRC, mat, f"*_{kind}.jpg"))
    if not f:
        return None
    return Image.open(f[0]).convert(mode).resize((SIZE, SIZE), Image.LANCZOS)


def srgb_to_linear(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


os.makedirs(OUT, exist_ok=True)
meta = {}
for set_name, layers in SETS.items():
    n = len(layers)
    albedo = Image.new("RGB", (SIZE, SIZE * n))
    normal = Image.new("RGB", (SIZE, SIZE * n))
    orm = Image.new("RGB", (SIZE, SIZE * n))
    info = []
    for i, (name, mat, metres) in enumerate(layers):
        col = load(mat, "Color", "RGB")
        nrm = load(mat, "NormalGL", "RGB")
        rough = load(mat, "Roughness", "L") or Image.new("L", (SIZE, SIZE), 200)
        ao = load(mat, "AmbientOcclusion", "L") or Image.new("L", (SIZE, SIZE), 255)
        disp = load(mat, "Displacement", "L") or Image.new("L", (SIZE, SIZE), 128)
        assert col and nrm, f"missing maps for {mat}"
        albedo.paste(col, (0, SIZE * i))
        normal.paste(nrm, (0, SIZE * i))
        orm.paste(Image.merge("RGB", (ao, rough, disp)), (0, SIZE * i))
        mean = srgb_to_linear(np.asarray(col, dtype=np.float64)).reshape(-1, 3).mean(axis=0)
        info.append({"name": name, "source": mat, "metres": metres, "mean": [round(float(v), 4) for v in mean]})
    albedo.save(os.path.join(OUT, f"{set_name}_albedo.jpg"), quality=88, subsampling=0)
    normal.save(os.path.join(OUT, f"{set_name}_normal.jpg"), quality=90, subsampling=0)
    orm.save(os.path.join(OUT, f"{set_name}_orm.jpg"), quality=85)
    meta[set_name] = info
    print(set_name, n, "layers")

meta["licence"] = "All materials CC0 from ambientCG.com"
json.dump(meta, open(os.path.join(OUT, "materials.json"), "w"), indent=1)

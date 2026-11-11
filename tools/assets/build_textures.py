#!/usr/bin/env python3
"""Packs CC0 PBR materials (ambientCG, 1K) into vertical strips the game loads
as texture arrays: one 1024px layer per material, stacked top to bottom.

The game's look is stylised and hand-painted, so the photographs are only a
starting point: each colour map is run through an edge-preserving "painting"
filter that flattens photographic noise into broad brushed shapes, and the
normal maps are softened so only the large forms (brick courses, tile rows,
cobbles) remain.

  <set>_albedo.jpg   sRGB base colour
  <set>_normal.jpg   tangent-space normal (OpenGL convention)
  <set>_orm.jpg      R = ambient occlusion, G = roughness, B = height
  materials.json     layer order, tile size in metres, mean albedo (linear)

Usage: build_textures.py <cache-dir>/tex <out-dir>
"""
import glob, json, os, sys
import cv2
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


PAD = 96


def wrap_pad(a):
    return np.pad(a, ((PAD, PAD), (PAD, PAD), (0, 0)), mode="wrap")


def painterly(img):
    """Photo -> painted: keep the big shapes and edges, drop the fine noise. Tiles seamlessly."""
    a = wrap_pad(np.asarray(img))
    for _ in range(2):
        a = cv2.edgePreservingFilter(a, flags=cv2.RECURS_FILTER, sigma_s=28, sigma_r=0.32)
    # a touch more colour, the way paint is cleaner than a photograph
    hsv = cv2.cvtColor(a, cv2.COLOR_RGB2HSV).astype(np.float32)
    hsv[..., 1] = np.clip(hsv[..., 1] * 1.12, 0, 255)
    a = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)
    return Image.fromarray(a[PAD:-PAD, PAD:-PAD])


def soften_normal(img, strength=0.75):
    a = wrap_pad(np.asarray(img)).astype(np.float32) / 127.5 - 1.0
    a = cv2.GaussianBlur(a, (0, 0), 2.2)
    a[..., :2] *= strength
    a /= np.linalg.norm(a, axis=2, keepdims=True) + 1e-6
    a = ((a + 1.0) * 127.5).clip(0, 255).astype(np.uint8)
    return Image.fromarray(a[PAD:-PAD, PAD:-PAD])


def soften_gray(img):
    a = np.pad(np.asarray(img), PAD, mode="wrap")
    a = cv2.GaussianBlur(a, (0, 0), 2.0)
    return Image.fromarray(a[PAD:-PAD, PAD:-PAD])


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
        col, nrm, rough, ao = painterly(col), soften_normal(nrm), soften_gray(rough), soften_gray(ao)
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

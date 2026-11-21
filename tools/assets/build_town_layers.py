#!/usr/bin/env python3
"""Paints the extra building layers for Diest c. 1650 and appends them to the
packed building strips made by build_textures.py (public/textures/build_*.jpg).

No photographs: each layer is generated from tileable noise so it can be shaped
to what the town was built of, and kept in the painted style of the rest.

  thatch     reed/straw thatch laid in courses (most roofs in Diest were still
             thatched in 1650: the town only subsidised 2-3 new tile roofs a
             year until 1660 - Begijnhof Diest beheersplan, 2015, p. 22)
  ironstone  Diestiaan ijzerzandsteen: coursed rubble of rust-brown iron
             sandstone with dark iron crusts, the stone of Sint-Sulpitius, the
             Lakenhalle, the Begijnhof church, plinths and corner chains
  wood       weathered oak planks/beams for timber frames, doors and shutters
  daub       limewash (kalei) over loam and wattle, the infill of the vakwerk
             houses that were still the majority of the town

Idempotent: the base layers listed in materials.json are kept, any previous
copies of these layers are replaced.

Usage: python3 tools/assets/build_town_layers.py public/textures [base-strip-dir]
"""
import json, os, sys
import cv2
import numpy as np
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else "public/textures"
# where to read the base strips from (default: OUT itself). Pass the untouched
# output of build_textures.py to avoid re-encoding the base layers twice.
SRC = sys.argv[2] if len(sys.argv) > 2 else OUT
SIZE = 1024
rng = np.random.default_rng(1650)


def blur(a, sx, sy=None):
    # tileable: blur a wrapped copy and cut the middle back out
    sy = sx if sy is None else sy
    px, py = min(int(sx * 3) + 2, SIZE), min(int(sy * 3) + 2, SIZE)
    p = np.pad(a.astype(np.float32), ((py, py), (px, px)), mode="wrap")
    p = cv2.GaussianBlur(p, (0, 0), sigmaX=sx, sigmaY=sy)
    return p[py:py + a.shape[0], px:px + a.shape[1]]


def noise(sigma, sy=None):
    n = blur(rng.standard_normal((SIZE, SIZE)), sigma, sy)
    n -= n.min()
    return n / (n.max() + 1e-6)


def fbm(sigmas, weights):
    a = sum(w * noise(s) for s, w in zip(sigmas, weights))
    a -= a.min()
    return a / (a.max() + 1e-6)


def normal_from_height(h, strength):
    gx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    gy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    n = np.dstack([-gx, gy, np.ones_like(h)])  # OpenGL convention (y up)
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return ((n + 1) * 127.5).clip(0, 255).astype(np.uint8)


def to8(a):
    return (np.clip(a, 0, 1) * 255).astype(np.uint8)


def ramp(t, cols):
    """Map t in 0..1 through a list of (pos, rgb) colour stops."""
    t = np.clip(t, 0, 1)
    out = np.zeros(t.shape + (3,), np.float32)
    for (p0, c0), (p1, c1) in zip(cols[:-1], cols[1:]):
        m = (t >= p0) & (t <= p1)
        k = ((t - p0) / max(p1 - p0, 1e-6))[..., None]
        out[m] = (np.array(c0) * (1 - k) + np.array(c1) * k)[m] / 255.0
    return out


Y, X = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32) / SIZE


def thatch():
    # strands run down the slope (texture v); courses every 1/7 of the tile
    strands = noise(0.7, 9.0) * 0.55 + noise(1.6, 26.0) * 0.45
    courses = 7
    cv = (Y * courses + 0.25 * noise(40)) % 1.0
    # each course is thickest at its foot, where the bundle ends are cut
    course_h = np.power(cv, 1.6)
    clump = noise(18, 40)
    h = 0.55 * strands + 0.35 * course_h + 0.25 * clump
    h = (h - h.min()) / (h.max() - h.min())
    shade = 0.55 + 0.45 * strands
    weather = fbm([60, 20], [0.7, 0.3])
    col = ramp(weather, [(0, (92, 78, 56)), (0.45, (128, 108, 74)), (0.75, (150, 128, 84)), (1, (118, 104, 82))])
    col *= (shade * (0.72 + 0.28 * course_h))[..., None]
    # darker shadow line under each course
    col *= (0.55 + 0.45 * np.clip(cv * 6, 0, 1))[..., None]
    rough = 0.92 - 0.06 * strands
    ao = 0.6 + 0.4 * np.clip(cv * 5, 0, 1) * (0.7 + 0.3 * strands)
    return col, h, rough, ao, 8.0


def ironstone():
    # coursed rubble: rows of uneven height, blocks of uneven length, edges
    # weathered round and the faces pitted; the stone is soft and crumbles
    ids = np.zeros((SIZE, SIZE), np.int32)
    y, k = 0, 1
    while y < SIZE:
        rh = int(rng.uniform(0.08, 0.17) * SIZE)
        if SIZE - (y + rh) < 0.05 * SIZE:
            rh = SIZE - y
        x0 = int(rng.uniform(0, 0.2) * SIZE)
        x = x0
        while x < x0 + SIZE:
            bw = min(int(rng.uniform(0.1, 0.3) * SIZE), x0 + SIZE - x)
            g = 5
            j = lambda s=1.0: int(rng.uniform(-1, 1) * 7 * s)
            pts = np.array([[x + g + j(), y + g + j()], [x + bw // 2 + j(), y + g + j(0.6)], [x + bw - g + j(), y + g + j()],
                            [x + bw - g + j(0.6), y + rh // 2 + j()], [x + bw - g + j(), y + rh - g + j()],
                            [x + bw // 2 + j(), y + rh - g + j(0.6)], [x + g + j(), y + rh - g + j()], [x + g + j(0.6), y + rh // 2 + j()]], np.int32)
            for dx in (-SIZE, 0, SIZE):
                for dy in (-SIZE, 0, SIZE):
                    cv2.fillPoly(ids, [pts + [dx, dy]], int(k))
            k += 1
            x += bw
        y += rh
    dist = cv2.distanceTransform((ids > 0).astype(np.uint8), cv2.DIST_L2, 5)
    rough_edge = noise(2.5) * 9
    inside = np.clip((dist - rough_edge + 2) / 3.0, 0, 1)
    dome = np.clip(dist / 14.0, 0, 1)
    per = rng.uniform(0, 1, k + 1).astype(np.float32)
    tone = per[ids]
    pits = noise(1.0)
    crust = noise(5) * 0.6 + noise(20) * 0.4
    h = inside * (0.55 * np.sqrt(dome) + 0.25 * (pits - 0.5) + 0.2 * crust)
    # rust brown, darker purple-brown iron crusts, a few ochre faces
    stone = ramp(np.clip(tone * 0.3 + crust * 0.7 - 0.05, 0, 1), [
        (0, (58, 40, 34)), (0.4, (84, 58, 40)), (0.7, (104, 72, 46)), (1, (122, 88, 56))])
    dark = np.clip((fbm([3, 12], [0.6, 0.4]) - 0.55) * 3.0, 0, 1)
    stone = stone * (1 - 0.5 * dark[..., None]) + np.array([38, 26, 24]) / 255.0 * 0.5 * dark[..., None]
    stone *= (0.8 + 0.3 * pits)[..., None]
    mort = ramp(noise(8), [(0, (66, 52, 42)), (1, (88, 74, 60))])
    col = stone * inside[..., None] + mort * (1 - inside[..., None])
    rough = 0.92 - 0.08 * inside * dome
    ao = 0.55 + 0.45 * np.clip(dist / 8.0, 0, 1)
    return col, h, rough, ao, 4.0


def wood():
    # weathered oak planks; grain runs along texture v
    planks = 5
    px = (X * planks) % 1.0
    pid = np.floor(X * planks).astype(np.int32)
    off = rng.uniform(0, 1, planks + 1).astype(np.float32)[pid]
    grain = noise(0.6, 30.0) * 0.6 + noise(2.0, 60.0) * 0.4
    rings = 0.5 + 0.5 * np.sin((X * 90 + blur(rng.standard_normal((SIZE, SIZE)), 6, 40) * 60 + off * 10) * 2.0)
    seam = np.clip(np.minimum(px, 1 - px) * 60, 0, 1)
    knots = np.clip((noise(10) - 0.82) * 8, 0, 1)
    t = 0.45 * grain + 0.3 * rings + 0.25 * off
    col = ramp(t, [(0, (70, 54, 40)), (0.5, (112, 90, 66)), (1, (140, 118, 90))])
    col *= (1 - 0.45 * knots)[..., None]
    col *= (0.4 + 0.6 * seam)[..., None]
    h = 0.5 * grain + 0.3 * seam + 0.2 * rings
    rough = 0.85 - 0.08 * grain
    ao = 0.5 + 0.5 * seam
    return col, h, rough, ao, 4.0


def daub():
    # limewash on loam: brushy, lumpy, flaking at places to show the loam
    lumps = fbm([30, 9, 3], [0.5, 0.35, 0.15])
    brush = noise(1.0, 7.0) * 0.5 + noise(5, 1.5) * 0.5
    flake = np.clip((fbm([10, 4, 1.5], [0.5, 0.35, 0.15]) - 0.74) * 6, 0, 1) * 0.8
    lime = ramp(lumps * 0.6 + brush * 0.4, [(0, (204, 196, 178)), (0.5, (226, 220, 204)), (1, (238, 234, 222))])
    loam = ramp(noise(4), [(0, (128, 100, 70)), (1, (162, 128, 88))])
    col = lime * (1 - flake[..., None]) + loam * flake[..., None]
    col *= (0.88 + 0.12 * lumps)[..., None]
    h = 0.6 * lumps + 0.2 * brush - 0.3 * flake
    rough = 0.95 - 0.05 * flake
    ao = 0.75 + 0.25 * lumps
    return col, h, rough, ao, 4.0


NEW = [("thatch", thatch, 2.4), ("ironstone", ironstone, 3.2), ("wood", wood, 1.6), ("daub", daub, 2.2)]


def srgb_to_linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


meta = json.load(open(os.path.join(SRC, "materials.json")))
base = [m for m in meta["build"] if m["name"] not in {n for n, _, _ in NEW}]
nb = len(base)
strips = {}
for kind in ("albedo", "normal", "orm"):
    im = Image.open(os.path.join(SRC, f"build_{kind}.jpg")).convert("RGB")
    strips[kind] = np.asarray(im)[: SIZE * nb]

layers = {"albedo": [], "normal": [], "orm": []}
info = []
for name, fn, metres in NEW:
    col, h, rough, ao, strength = fn()
    col = np.clip(col, 0, 1)
    h = (h - h.min()) / (h.max() - h.min() + 1e-6)
    layers["albedo"].append(to8(col))
    layers["normal"].append(normal_from_height(blur(h, 1.6), strength))
    layers["orm"].append(np.dstack([to8(ao), to8(rough), to8(h)]))
    mean = srgb_to_linear(col.astype(np.float64)).reshape(-1, 3).mean(axis=0)
    info.append({"name": name, "source": "procedural (tools/assets/build_town_layers.py)", "metres": metres,
                 "mean": [round(float(v), 4) for v in mean]})
    print(name, "mean", info[-1]["mean"])

q = {"albedo": 88, "normal": 88, "orm": 85}
for kind in ("albedo", "normal", "orm"):
    full = np.concatenate([strips[kind]] + layers[kind], axis=0)
    kw = {"quality": q[kind]}
    if kind != "orm":
        kw["subsampling"] = 0
    Image.fromarray(full).save(os.path.join(OUT, f"build_{kind}.jpg"), **kw)
meta["build"] = base + info
json.dump(meta, open(os.path.join(OUT, "materials.json"), "w"), indent=1)
print("build layers:", [m["name"] for m in meta["build"]])

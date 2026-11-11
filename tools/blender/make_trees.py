"""
BELFORT - tree impostor atlas pipeline (Blender 4.2 LTS, headless, Cycles CPU).

    bash tools/blender/fetch_tree_assets.sh  <work>/assets
    blender -b --factory-startup --python tools/blender/make_trees.py -- \
        --work <work> [--assets <work>/assets] [--out public/textures/trees] \
        [--only oak,willow] [--no-render] [--samples 96]

What it does
  1. Grows five procedural trees (own generator: recursive branching inside a bumpy crown
     envelope, tube limbs, polygon leaves) - oak, poplar, pollard willow, Scots pine, apple.
     Bark is textured with CC0 ambientCG bark photos; everything else is generated here.
  2. Renders each tree orthographically from azimuth 0 and 90 degrees, twice:
       albedo  = unlit base colour x soft ambient occlusion (0.55..1.0), straight alpha
       normal  = billboard-frame normal (X right, Y up, Z to camera), 50/50 blended with the
                 normal of an ellipsoid fitted to the crown, encoded n*0.5+0.5
  3. Packs a 2 x 5 grid of 512 px cells (1024 x 2560), bleeds RGB into the transparent area
     (alpha untouched) and writes trees_albedo.png, trees_normal.png and trees.json.

Per-cell renders are cached in <work>/render so single species can be re-done with --only.
"""
import bpy
import sys
import os
import math
import json
import zlib
import struct
import time
import numpy as np
from mathutils import Vector, noise as mnoise

CELL = 512
COLS = 2
ALPHA_TEST = 0.42          # the game discards alpha below this
AO_MIN = 0.5

# name, target height (m), target width (m)
SPECIES = [
    ("oak", 18.0, 14.0),
    ("poplar", 26.0, 7.0),
    ("willow", 7.0, 5.0),
    ("pine", 20.0, 8.0),
    ("apple", 5.0, 5.0),
]

SOURCES = [
    {"what": "Tree geometry, branching, foliage cards and leaf colours: procedural generator "
             "tools/blender/make_trees.py (own work for BELFORT)",
     "licence": "own work", "url": "tools/blender/make_trees.py"},
    {"what": "Bark 001 colour map - oak, poplar and pollard-willow bark",
     "licence": "CC0", "url": "https://ambientcg.com/view?id=Bark001"},
    {"what": "Bark 014 colour map - Scots pine bark",
     "licence": "CC0", "url": "https://ambientcg.com/view?id=Bark014"},
    {"what": "Bark 006 colour map - apple bark",
     "licence": "CC0", "url": "https://ambientcg.com/view?id=Bark006"},
]


# --------------------------------------------------------------------------- utils
def srgb2lin(c):
    c = np.asarray(c, dtype=np.float64) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def unit(v):
    return v / (np.linalg.norm(v) + 1e-12)


def unit_rows(a):
    return a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-12)


def perp(v):
    a = np.array([0.0, 0.0, 1.0]) if abs(v[2]) < 0.9 else np.array([1.0, 0.0, 0.0])
    return unit(np.cross(v, a))


def rot_about(v, axis, ang):
    c, s = math.cos(ang), math.sin(ang)
    return v * c + np.cross(axis, v) * s + axis * np.dot(axis, v) * (1 - c)


def make_env(c, r, bump=0.2, freq=1.6, seed=0.0):
    """Bumpy ellipsoid crown envelope: gives lobed, clumped crowns rather than a smooth blob."""
    c = np.asarray(c, float)
    r = np.asarray(r, float)

    def inside(p):
        q = (p - c) / r
        d = float(np.linalg.norm(q))
        if d < 1e-6:
            return True
        n = q / d
        b = mnoise.noise(Vector((n[0] * freq + seed, n[1] * freq - seed, n[2] * freq + 2.7 * seed)))
        return d < 1.0 + bump * 2.0 * b
    return inside


# --------------------------------------------------------------------------- tree data
class Tree:
    def __init__(self, name, seed, px):
        self.name = name
        self.rng = np.random.default_rng(seed)
        self.px = px                # approx. metres per atlas pixel (for LOD decisions)
        self.rmin = 0.32 * px       # thinnest twig that still registers in the atlas
        self.tubes = []             # (pts, radii, prof, tint)
        self.leaves = []            # (pos, axis, nrm, L, W, col)
        self.fruit = []             # (pos, r, col)
        self.leaf_profile = [(0.0, 0.0), (0.35, 1.0), (0.72, 0.8), (1.0, 0.0)]
        self.bark = "Bark001"
        self.bark_m = 1.0           # metres of bark covered by one texture repeat
        self.levels = []
        self.env = None
        self.env_levels = 99        # envelope only constrains child levels <= this

    # ---- growth -------------------------------------------------------------------
    def grow(self, start, d, length, r0, level):
        lp = self.levels[level]
        rng = self.rng
        nseg = max(3, int(math.ceil(length / lp["seg"])))
        step = length / nseg
        pts = np.empty((nseg + 1, 3))
        pts[0] = start
        d = unit(np.asarray(d, float))
        wob = lp.get("wobble", 0.0) * math.sqrt(step)
        trop = lp.get("trop", 0.0)
        bend = rng.normal(size=3)
        for i in range(nseg):
            t = (i + 1) / nseg
            bend = unit(bend * 0.65 + rng.normal(size=3) * 0.55)
            d = d + bend * wob
            d[2] += (trop(t) if callable(trop) else trop) * step
            d = unit(d)
            pts[i + 1] = pts[i] + d * step
        t = np.linspace(0.0, 1.0, nseg + 1)
        if "rfun" in lp:
            radii = r0 * lp["rfun"](t)
        else:
            radii = r0 * (1.0 - (1.0 - lp.get("tip", 0.25)) * t ** lp.get("tpow", 1.0))
        radii = np.maximum(radii, self.rmin)
        self.tubes.append((pts, radii, lp.get("prof"), lp.get("tint")))
        if "leaves" in lp:
            self.leaf_twig(pts, length, lp["leaves"])
        if level + 1 < len(self.levels) and lp.get("n", 0) > 0:
            self.spawn(pts, radii, length, level)
        return pts, radii

    def spawn(self, pts, radii, length, level):
        lp = self.levels[level]
        cp = self.levels[level + 1]
        rng = self.rng
        n = lp["n"]
        t0, t1 = lp.get("t0", 0.2), lp.get("t1", 1.0)
        az = rng.uniform(0, 2 * math.pi)
        m = len(pts) - 1
        for k in range(n):
            az += 2.39996 + rng.normal(0, 0.4)
            if rng.random() < lp.get("prune", 0.0):
                continue
            u = (k + rng.uniform(0.15, 0.85)) / n
            t = t0 + (t1 - t0) * u
            f = t * m
            i = min(int(f), m - 1)
            fr = f - i
            p = pts[i] * (1 - fr) + pts[i + 1] * fr
            d = unit(pts[i + 1] - pts[i])
            rp = radii[i] * (1 - fr) + radii[i + 1] * fr
            ang = lp.get("ang", 45.0)
            ang = ang(u) if callable(ang) else ang
            a = math.radians(ang + lp.get("angvar", 12.0) * rng.normal())
            side = rot_about(perp(d), d, az)
            cdir = d * math.cos(a) + side * math.sin(a)
            lo, hi = cp["len"]
            clen = rng.uniform(lo, hi)
            if "shape" in cp:
                clen *= cp["shape"](u)
            if level + 1 <= self.env_levels:
                clen = self.clip_len(p, cdir, clen, cp)
            if clen < cp.get("minlen", 0.6 * lo):
                continue
            cr = min(rp * 0.92, rp * lp.get("rr", 0.55) * rng.uniform(0.85, 1.12))
            if "rabs" in cp:
                cr = min(rp * 0.92, rng.uniform(*cp["rabs"]))
            self.grow(p, cdir, clen, cr, level + 1)

    def clip_len(self, p, d, clen, cp):
        if self.env is None or cp.get("noenv"):
            return clen
        stp = max(0.05, clen / 14.0)
        dist = 0.0
        while dist < clen:
            if not self.env(p + d * (dist + stp)):
                break
            dist += stp
        return min(clen, dist + stp * self.rng.uniform(0.0, 1.0))

    def reach_len(self, p, d, maxlen, minlen):
        """Longest length <= maxlen whose end point is still inside the envelope."""
        ln = maxlen
        while ln > minlen:
            if self.env(p + d * ln):
                return ln
            ln -= 0.25
        return minlen

    # ---- foliage ------------------------------------------------------------------
    def leaf_twig(self, pts, length, lf):
        rng = self.rng
        t0 = lf.get("t0", 0.1)
        n = max(1, int(round(lf["dens"] * length * (1 - t0))))
        t = t0 + (1 - t0) * rng.random(n) ** lf.get("bias", 0.85)
        m = len(pts) - 1
        f = t * m
        i0 = np.minimum(f.astype(int), m - 1)
        fr = (f - i0)[:, None]
        pos = pts[i0] * (1 - fr) + pts[i0 + 1] * fr
        d = unit_rows(pts[i0 + 1] - pts[i0])
        rv = rng.normal(size=(n, 3))
        u = unit_rows(rv - d * np.sum(rv * d, axis=1, keepdims=True))
        a = np.radians(lf.get("ang", 50.0) + lf.get("angvar", 22.0) * rng.normal(size=n))[:, None]
        axis = d * np.cos(a) + u * np.sin(a)
        axis[:, 2] -= lf.get("droop", 0.0) * rng.random(n)
        axis = unit_rows(axis)
        rv2 = rng.normal(size=(n, 3))
        rv2[:, 2] += lf.get("face_up", 0.0)
        nrm = unit_rows(rv2 - axis * np.sum(rv2 * axis, axis=1, keepdims=True))
        L = rng.uniform(lf["len"][0], lf["len"][1], n)
        W = L * lf["wr"]
        # colour: per-twig tint + per-leaf variation (painterly clumps of tone)
        base, light, dark = lf["cols"]
        tw = rng.normal(0, lf.get("tw_var", 0.16))
        k = np.clip(rng.random(n) ** 2.2 * 0.85 + tw, 0, 1)[:, None]
        col = base * (1 - k) + light * k
        kd = np.clip(rng.random(n) ** 2.2 * 0.8 - tw, 0, 1)[:, None]
        col = col * (1 - kd) + dark * kd
        col = col * rng.uniform(0.86, 1.1, n)[:, None]
        self.leaves.append((pos, axis, nrm, L, W, col))

    # ---- normalise to the target size ---------------------------------------------
    def bounds(self):
        zs, xs, ys = [], [], []
        for pts, radii, _, _ in self.tubes:
            zs.append(pts[:, 2].max()); xs.append(np.abs(pts[:, 0]).max()); ys.append(np.abs(pts[:, 1]).max())
        lo = [np.inf, np.inf, np.inf]; hi = [-np.inf, -np.inf, -np.inf]
        for pos, axis, nrm, L, W, col in self.leaves:
            tip = pos + axis * L[:, None]
            for a in (pos, tip):
                lo = np.minimum(lo, a.min(axis=0)); hi = np.maximum(hi, a.max(axis=0))
        zs.append(hi[2])
        return max(zs), lo, hi

    def normalise(self, H, W):
        top, lo, hi = self.bounds()
        s = H / top
        wx = (hi[0] - lo[0]) * s
        wy = (hi[1] - lo[1]) * s
        f = float(np.clip(W / (0.5 * (wx + wy)), 0.85, 1.2))
        S = np.array([s * f, s * f, s])
        self.tubes = [(p * S, r * s, prof, tint) for p, r, prof, tint in self.tubes]
        self.leaves = [(p * S, a, n, L * s, Wd * s, c) for p, a, n, L, Wd, c in self.leaves]
        self.fruit = [(p * S, r * s, c) for p, r, c in self.fruit]
        self.bark_m *= s
        top, lo, hi = self.bounds()
        return top, lo, hi


# --------------------------------------------------------------------------- species
def root_flare(n_ridges, strength, reach, phase, twist=0.8, knob=0.07):
    def prof(th, s, t):
        fl = strength * np.exp(-np.maximum(s, 0) / reach)
        ridges = (0.5 + 0.5 * np.cos(n_ridges * th + twist * s + phase)) ** 1.6
        gn = knob * (np.sin(3 * th + 2.3 * s + phase) + 0.6 * np.sin(7 * th - 3.1 * s))
        return 1.0 + fl * (0.3 + 0.9 * ridges) + gn
    return prof


def bark_tint(c_srgb, var=0.0):
    c = srgb2lin(c_srgb)

    def tint(pts, s):
        return np.tile(c, (len(pts), 1))
    return tint


def palette(base, light, dark):
    return (srgb2lin(base), srgb2lin(light), srgb2lin(dark))


def gen_oak(tr):
    """Pedunculate oak: short massive twisted bole, heavy sinuous boughs, broad lobed dome."""
    rng = tr.rng
    cols = palette((90, 100, 48), (128, 128, 60), (52, 66, 34))
    tr.env = make_env((0, 0, 11.2), (7.3, 7.3, 5.7), bump=0.26, freq=1.9, seed=3.1)
    tr.env_levels = 2
    tr.bark, tr.bark_m = "Bark001", 0.9
    tint = bark_tint((150, 140, 120))

    def rfun(t):
        r = np.where(t < 0.8, 1.0 - 0.2 * t / 0.8, 0.0)
        r = np.where(t >= 0.8, 0.8 * np.sqrt(np.maximum(0.0, 1 - ((t - 0.8) / 0.2) ** 2)) + 0.02, r)
        return r

    leaf = dict(len=(0.15, 0.22), wr=0.6, ang=55, angvar=25, droop=0.25, cols=cols)
    tr.levels = [
        dict(seg=0.3, wobble=0.1, rfun=rfun, prof=root_flare(5, 0.8, 0.6, 0.6, twist=1.1, knob=0.08), tint=tint),
        dict(len=(8.0, 11.5), seg=0.45, wobble=0.24, trop=0.04, tip=0.1, tpow=0.8, tint=tint,
             n=11, t0=0.3, t1=0.98, ang=52, angvar=16, rr=0.5, prune=0.08),
        dict(len=(2.8, 5.6), shape=lambda u: 1.0 - 0.4 * u, seg=0.35, wobble=0.3, trop=0.03,
             tip=0.2, tint=tint, n=9, t0=0.2, t1=0.97, ang=48, angvar=16, rr=0.55, prune=0.16, minlen=0.9),
        dict(len=(1.0, 2.2), seg=0.25, wobble=0.26, tip=0.3, tint=tint,
             n=9, t0=0.12, t1=0.97, ang=46, angvar=16, rr=0.6, prune=0.12,
             leaves=dict(leaf, dens=14, t0=0.4)),
        dict(len=(0.45, 0.95), seg=0.2, wobble=0.2, tip=0.5, tint=tint,
             leaves=dict(leaf, dens=46, t0=0.08)),
    ]
    lean = unit(np.array([0.04, 0.02, 1.0]))
    pts, radii = tr.grow(np.array([0.0, 0.0, -0.15]), lean, 5.4, 0.72, 0)
    top = pts[-1]
    # heavy limbs: a ring of ascending leaders from the crown of the bole + low spreading boughs
    limbs = [(10, 0.50), (26, 0.50), (30, 0.46), (40, 0.46), (46, 0.42), (52, 0.42), (58, 0.40),
             (64, 0.38), (70, 0.36), (78, 0.34), (84, 0.32), (76, 0.30), (86, 0.28)]
    az0 = rng.uniform(0, 6.28)
    for k, (phi, rr) in enumerate(limbs):
        az = az0 + k * 2.39996 + rng.normal(0, 0.25)
        ph = math.radians(phi + rng.normal(0, 4))
        radial = np.array([math.cos(az), math.sin(az), 0.0])
        d = radial * math.sin(ph) + lean * math.cos(ph)
        zdrop = 0.25 + 1.5 * max(0.0, (phi - 40) / 45.0)       # flatter boughs leave the bole lower
        p = top - lean * zdrop + radial * 0.15
        ln = tr.reach_len(p, d, rng.uniform(8.5, 11.0), 6.0) * 0.98
        tr.grow(p, d, ln, 0.72 * rr * rng.uniform(0.92, 1.08), 1)


def gen_poplar(tr):
    """Canada / Lombardy poplar: straight grey stem, steeply ascending branches, tall narrow crown."""
    cols = palette((108, 124, 58), (142, 150, 76), (70, 90, 44))
    tr.env = make_env((0, 0, 15.9), (3.1, 3.1, 10.4), bump=0.24, freq=2.4, seed=1.3)
    tr.env_levels = 2
    tr.bark, tr.bark_m = "Bark001", 0.8
    tint = bark_tint((176, 170, 150))
    leaf = dict(len=(0.19, 0.27), wr=0.8, ang=60, angvar=25, droop=0.5, cols=cols)
    tr.leaf_profile = [(0.0, 0.0), (0.3, 1.0), (0.62, 0.72), (1.0, 0.0)]
    tr.levels = [
        dict(seg=0.8, wobble=0.012, tip=0.05, prof=root_flare(4, 0.35, 0.5, 1.0, knob=0.03), tint=tint,
             n=52, t0=0.17, t1=0.985, ang=lambda u: 46 - 16 * u, angvar=8, rr=0.4, prune=0.04),
        dict(len=(4.2, 8.0), shape=lambda u: 1.0 - 0.78 * u ** 1.4, seg=0.4, wobble=0.1, trop=0.2,
             tip=0.15, tint=tint, n=11, t0=0.18, t1=0.97, ang=36, angvar=12, rr=0.55, prune=0.16),
        dict(len=(0.9, 2.1), seg=0.25, wobble=0.14, trop=0.12, tip=0.3, tint=tint,
             n=6, t0=0.15, t1=0.97, ang=42, angvar=14, rr=0.6, prune=0.08,
             leaves=dict(leaf, dens=12, t0=0.4)),
        dict(len=(0.4, 0.85), seg=0.2, wobble=0.15, tip=0.5, tint=tint,
             leaves=dict(leaf, dens=44, t0=0.1)),
    ]
    tr.grow(np.array([0.0, 0.0, -0.15]), np.array([0.01, 0.0, 1.0]), 25.6, 0.48, 0)


def gen_willow(tr):
    """Pollard willow (knotwilg): squat knobbly bole with a swollen head and a burst of long shoots."""
    rng = tr.rng
    cols = palette((126, 138, 86), (158, 164, 110), (84, 100, 60))
    tr.bark, tr.bark_m = "Bark001", 0.55
    tint = bark_tint((132, 124, 100))
    shoot_tint = bark_tint((150, 138, 84))
    tr.leaf_profile = [(0.0, 0.0), (0.3, 1.0), (0.6, 0.85), (1.0, 0.0)]

    def rfun(t):
        r = np.where(t < 0.55, 1.0 - 0.2 * t / 0.55, 0.0)
        r = np.where((t >= 0.55) & (t < 0.86), 0.8 + 0.62 * np.sin((t - 0.55) / 0.31 * math.pi / 2) ** 1.5, r)
        r = np.where(t >= 0.86, 1.42 * np.sqrt(np.maximum(0.0, 1 - ((t - 0.86) / 0.14) ** 2)) + 0.02, r)
        return r

    fl = root_flare(5, 0.45, 0.25, 2.0, twist=1.5, knob=0.09)

    def prof(th, s, t):
        knobs = 0.10 * np.sin(4 * th + 9 * t) * np.sin(11 * t) + 0.08 * np.sin(9 * th - 14 * t)
        return fl(th, s, t) + knobs * (0.4 + t)

    leaf = dict(len=(0.11, 0.17), wr=0.19, ang=38, angvar=16, droop=0.55, cols=cols, tw_var=0.12)
    tr.levels = [
        dict(seg=0.12, wobble=0.07, rfun=rfun, prof=prof, tint=tint),
        dict(len=(3.0, 4.9), seg=0.22, wobble=0.055, trop=lambda t: 0.05 - 0.22 * t * t, tip=0.25,
             tint=shoot_tint, n=10, t0=0.22, t1=0.96, ang=38, angvar=12, rr=0.55, prune=0.1,
             leaves=dict(leaf, dens=42, t0=0.12, bias=1.0)),
        dict(len=(0.35, 0.95), seg=0.15, wobble=0.1, trop=-0.15, tip=0.5, tint=shoot_tint,
             leaves=dict(leaf, dens=60, t0=0.05, bias=1.0)),
    ]
    lean = unit(np.array([0.07, -0.03, 1.0]))
    pts, radii = tr.grow(np.array([0.0, 0.0, -0.08]), lean, 2.62, 0.36, 0)
    m = len(pts) - 1
    nshoot = 105
    az0 = rng.uniform(0, 6.28)
    for k in range(nshoot):
        az = az0 + k * 2.39996 + rng.normal(0, 0.3)
        u = (k + 0.5) / nshoot
        phi = math.radians(3 + 60 * u ** 0.8 + rng.normal(0, 5))      # angle from vertical
        t = 0.98 - 0.22 * u                                            # steeper shoots sit higher on the head
        f = t * m
        i = min(int(f), m - 1)
        p0 = pts[i] + (pts[i + 1] - pts[i]) * (f - i)
        rr = np.interp(f, np.arange(m + 1), radii)
        radial = np.array([math.cos(az), math.sin(az), 0.0])
        d = radial * math.sin(phi) + lean * math.cos(phi)
        p = p0 + radial * rr * 0.75
        ln = rng.uniform(2.9, 4.9) * (1.0 - 0.26 * u) * (1.0 + 0.12 * math.sin(2.0 * az + 1.0))
        tr.grow(p, d, ln, rng.uniform(0.022, 0.042), 1)


def gen_pine(tr):
    """Scots pine: tall bare stem turning salmon-orange above, irregular open crown carried high."""
    rng = tr.rng
    cols = palette((66, 82, 52), (92, 102, 60), (40, 54, 38))
    tr.env = make_env((0.2, 0, 15.4), (3.9, 3.9, 4.6), bump=0.32, freq=1.5, seed=7.7)
    tr.env_levels = 2
    tr.bark, tr.bark_m = "Bark014", 0.8
    grey = srgb2lin((140, 136, 130))
    orange = srgb2lin((214, 172, 136))

    def tint(pts, s):
        k = np.clip((pts[:, 2] - 6.5) / 6.0, 0, 1)[:, None]
        return grey * (1 - k) + orange * k

    def twig_tint(pts, s):
        return np.tile(srgb2lin((150, 118, 90)), (len(pts), 1))

    tr.leaf_profile = [(0.0, 0.0), (0.2, 1.0), (0.7, 0.9), (1.0, 0.0)]
    needle = dict(len=(0.15, 0.24), wr=0.1, ang=50, angvar=22, droop=0.0, cols=cols, tw_var=0.12)
    tr.levels = [
        dict(seg=0.6, wobble=0.04, rfun=lambda t: 1.0 - 0.75 * t ** 1.3,
             prof=root_flare(4, 0.3, 0.4, 0.3, knob=0.03), tint=tint,
             n=28, t0=0.5, t1=0.985, ang=lambda u: 94 - 44 * u, angvar=14, rr=0.42, prune=0.14),
        dict(len=(3.0, 5.4), shape=lambda u: 1.0 - 0.35 * u, seg=0.3, wobble=0.22,
             trop=lambda t: 0.01 + 0.22 * t, tip=0.2, tint=tint, minlen=1.2,
             n=9, t0=0.3, t1=0.97, ang=55, angvar=18, rr=0.6, prune=0.12),
        dict(len=(0.8, 1.8), seg=0.22, wobble=0.2, trop=0.12, tip=0.35, tint=twig_tint,
             n=8, t0=0.2, t1=0.97, ang=45, angvar=16, rr=0.65, prune=0.08,
             leaves=dict(needle, dens=90, t0=0.5)),
        dict(len=(0.3, 0.62), seg=0.15, wobble=0.15, trop=0.15, tip=0.5, tint=twig_tint,
             leaves=dict(needle, dens=210, t0=0.1, bias=0.75)),
    ]
    pts, radii = tr.grow(np.array([0.0, 0.0, -0.15]), np.array([0.03, 0.01, 1.0]), 19.6, 0.33, 0)
    # a few dead stubs on the bare stem
    stub = dict(len=(0.5, 1.6), seg=0.25, wobble=0.25, trop=-0.08, tip=0.3, tint=bark_tint((120, 108, 98)))
    saved = tr.levels
    tr.levels = [stub]
    m = len(pts) - 1
    for k in range(6):
        t = rng.uniform(0.28, 0.5)
        f = t * m
        i = int(f)
        p = pts[i] + (pts[i + 1] - pts[i]) * (f - i)
        az = rng.uniform(0, 6.28)
        d = np.array([math.cos(az), math.sin(az), rng.uniform(-0.1, 0.35)])
        tr.grow(p, d, rng.uniform(*stub["len"]), rng.uniform(0.025, 0.045), 0)
    tr.levels = saved


def gen_apple(tr):
    """Orchard apple: short leaning bole, spreading scaffold limbs, low rounded crown, some fruit."""
    rng = tr.rng
    cols = palette((84, 110, 50), (118, 134, 62), (50, 74, 38))
    tr.env = make_env((0, 0, 3.4), (2.65, 2.65, 1.95), bump=0.2, freq=1.8, seed=5.2)
    tr.bark, tr.bark_m = "Bark006", 0.45
    tint = bark_tint((150, 140, 124))
    tr.leaf_profile = [(0.0, 0.0), (0.35, 1.0), (0.7, 0.85), (1.0, 0.0)]

    def rfun(t):
        r = np.where(t < 0.45, 1.0 - 0.18 * t / 0.45, 0.0)
        r = np.where((t >= 0.45) & (t < 0.6), 0.82 - 0.32 * (t - 0.45) / 0.15, r)
        r = np.where(t >= 0.6, 0.5 - 0.4 * (t - 0.6) / 0.4, r)
        return r

    leaf = dict(len=(0.09, 0.135), wr=0.56, ang=55, angvar=25, droop=0.3, cols=cols)
    tr.levels = [
        dict(seg=0.14, wobble=0.13, rfun=rfun, prof=root_flare(4, 0.4, 0.14, 0.9, twist=3.0, knob=0.06),
             tint=tint, n=9, t0=0.42, t1=0.97, ang=lambda u: 82 - 55 * u, angvar=9, rr=0.62),
        dict(len=(2.0, 3.0), shape=lambda u: 1.0 - 0.3 * u, seg=0.16, wobble=0.2, trop=0.06, tip=0.15,
             tint=tint, n=13, t0=0.18, t1=0.97, ang=52, angvar=16, rr=0.55, prune=0.06),
        dict(len=(0.6, 1.3), seg=0.11, wobble=0.2, trop=0.04, tip=0.3, tint=tint,
             n=13, t0=0.1, t1=0.97, ang=50, angvar=16, rr=0.6, prune=0.06, minlen=0.25,
             leaves=dict(leaf, dens=30, t0=0.25)),
        dict(len=(0.16, 0.42), seg=0.08, wobble=0.18, tip=0.5, tint=tint, minlen=0.08,
             leaves=dict(leaf, dens=110, t0=0.05)),
    ]
    lean = unit(np.array([-0.05, 0.03, 1.0]))
    tr.grow(np.array([0.0, 0.0, -0.05]), lean, 2.7, 0.17, 0)
    # fruit hanging under the outer twigs
    allpos = np.concatenate([l[0] for l in tr.leaves])
    pick = rng.choice(len(allpos), 110, replace=False)
    reds = [srgb2lin(c) for c in ((168, 62, 44), (186, 96, 52), (176, 150, 70), (150, 46, 40))]
    for i in pick:
        p = allpos[i] + np.array([rng.normal(0, 0.03), rng.normal(0, 0.03), -rng.uniform(0.05, 0.11)])
        tr.fruit.append((p, rng.uniform(0.032, 0.043), reds[rng.integers(len(reds))]))


GENERATORS = {"oak": (gen_oak, 11), "poplar": (gen_poplar, 23), "willow": (gen_willow, 5),
              "pine": (gen_pine, 42), "apple": (gen_apple, 8)}


# --------------------------------------------------------------------------- meshing
def new_mesh(name, verts, loop_total, vertex_index, smooth):
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(verts))
    me.vertices.foreach_set("co", verts.astype(np.float32).ravel())
    me.loops.add(len(vertex_index))
    me.loops.foreach_set("vertex_index", vertex_index.astype(np.int32))
    me.polygons.add(len(loop_total))
    starts = np.concatenate([[0], np.cumsum(loop_total)[:-1]])
    me.polygons.foreach_set("loop_start", starts.astype(np.int32))
    me.polygons.foreach_set("loop_total", loop_total.astype(np.int32))
    me.polygons.foreach_set("use_smooth", np.full(len(loop_total), smooth, dtype=bool))
    me.update(calc_edges=True)
    me.validate()
    return me


def set_col(me, col):
    rgba = np.ones((len(col), 4), dtype=np.float32)
    rgba[:, :3] = col
    attr = me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    attr.data.foreach_set("color", rgba.ravel())


def build_tubes(tr):
    V, UV, COL, IDX = [], [], [], []
    off = 0
    px = tr.px
    for pts, radii, prof, tint in tr.tubes:
        m = len(pts)
        rmax = float(radii.max())
        q = rmax / px
        k = 28 if q > 10 else 14 if q > 4 else 8 if q > 1.5 else 5 if q > 0.6 else 3
        seg = pts[1:] - pts[:-1]
        sl = np.linalg.norm(seg, axis=1)
        T = seg / sl[:, None]
        tang = np.vstack([T[0], unit_rows(T[:-1] + T[1:]), T[-1]])
        s = np.concatenate([[0.0], np.cumsum(sl)])
        N = np.empty((m, 3))
        n = perp(tang[0])
        for i in range(m):
            n = unit(n - tang[i] * np.dot(n, tang[i]))
            N[i] = n
        B = np.cross(tang, N)
        th = np.linspace(0, 2 * math.pi, k + 1)
        if prof is not None:
            mult = prof(th[None, :], s[:, None], (s / s[-1])[:, None]) * np.ones((m, k + 1))
        else:
            mult = np.ones((m, k + 1))
        rad = (radii[:, None] * mult)[:, :, None]
        ring = pts[:, None, :] + rad * (np.cos(th)[None, :, None] * N[:, None, :] +
                                        np.sin(th)[None, :, None] * B[:, None, :])
        circ = 2 * math.pi * rmax
        urep = max(1, int(round(circ / tr.bark_m)))
        uu = np.broadcast_to(th / (2 * math.pi) * urep, (m, k + 1))
        vv = np.broadcast_to((s / (circ / urep))[:, None], (m, k + 1))
        c = tint(pts, s) if tint is not None else np.ones((m, 3))
        V.append(ring.reshape(-1, 3))
        UV.append(np.stack([uu, vv], axis=2).reshape(-1, 2))
        COL.append(np.repeat(c, k + 1, axis=0))
        i_ = np.arange(m - 1)[:, None] * (k + 1)
        j_ = np.arange(k)[None, :]
        a = off + i_ + j_
        IDX.append(np.stack([a, a + 1, a + k + 2, a + k + 1], axis=2).reshape(-1))
        off += m * (k + 1)
    V = np.concatenate(V); UV = np.concatenate(UV); COL = np.concatenate(COL); IDX = np.concatenate(IDX)
    me = new_mesh(tr.name + "_wood", V, np.full(len(IDX) // 4, 4), IDX, True)
    set_col(me, COL)
    uvl = me.uv_layers.new(name="UVMap")
    vi = np.empty(len(me.loops), dtype=np.int32)
    me.loops.foreach_get("vertex_index", vi)
    uvl.data.foreach_set("uv", UV[vi].astype(np.float32).ravel())
    return me


def build_leaves(tr, ell_c, ell_r):
    pos = np.concatenate([l[0] for l in tr.leaves])
    axis = np.concatenate([l[1] for l in tr.leaves])
    nrm = np.concatenate([l[2] for l in tr.leaves])
    L = np.concatenate([l[3] for l in tr.leaves])[:, None]
    W = np.concatenate([l[4] for l in tr.leaves])[:, None]
    col = np.concatenate([l[5] for l in tr.leaves])
    n = len(pos)
    # sky-facing top of the crown slightly lighter / warmer (no sun direction baked in)
    h = np.clip((pos[:, 2] - ell_c[2]) / ell_r[2], -1, 1)[:, None]
    col = col * (1.0 + 0.10 * h)
    side = np.cross(nrm, axis)
    (_, _), (t1, w1), (t2, w2), (_, _) = tr.leaf_profile
    curl = tr.rng.uniform(-0.12, 0.2, (n, 1))
    v0 = pos
    v1 = pos + axis * L * t1 + side * W * 0.5 * w1 + nrm * L * 0.06
    v2 = pos + axis * L * t1 - side * W * 0.5 * w1 + nrm * L * 0.06
    v3 = pos + axis * L * t2 + side * W * 0.5 * w2
    v4 = pos + axis * L * t2 - side * W * 0.5 * w2
    v5 = pos + axis * L - nrm * L * curl
    V = np.stack([v0, v1, v2, v3, v4, v5], axis=1).reshape(-1, 3)
    shade = np.array([0.9, 0.97, 0.97, 1.03, 1.03, 1.1])[None, :, None]
    COL = (col[:, None, :] * shade).reshape(-1, 3)
    base = (np.arange(n) * 6)[:, None]
    pat = np.array([0, 1, 2, 1, 3, 4, 2, 3, 5, 4])[None, :]
    IDX = (base + pat).reshape(-1)
    lt = np.tile(np.array([3, 4, 3]), n)
    me = new_mesh(tr.name + "_leaves", V, lt, IDX, False)
    set_col(me, COL)
    return me, n


def build_fruit(tr):
    if not tr.fruit:
        return None
    nu, nv = 8, 5
    th = np.linspace(0, 2 * math.pi, nu, endpoint=False)
    ph = np.linspace(0, math.pi, nv)
    sph = np.array([[math.sin(p) * math.cos(t), math.sin(p) * math.sin(t), math.cos(p)] for p in ph for t in th])
    quads = []
    for i in range(nv - 1):
        for j in range(nu):
            a = i * nu + j; b = i * nu + (j + 1) % nu
            quads.append([a, b, b + nu, a + nu])
    quads = np.array(quads)
    V, COL, IDX = [], [], []
    for k, (p, r, c) in enumerate(tr.fruit):
        V.append(p + sph * r)
        COL.append(np.tile(c, (len(sph), 1)) * (0.85 + 0.3 * (sph[:, 2:3] * 0.5 + 0.5)))
        IDX.append((quads + k * len(sph)).reshape(-1))
    V = np.concatenate(V); COL = np.concatenate(COL); IDX = np.concatenate(IDX)
    me = new_mesh(tr.name + "_fruit", V, np.full(len(IDX) // 4, 4), IDX, True)
    set_col(me, COL)
    return me


# --------------------------------------------------------------------------- materials
class NB:
    """Tiny node-graph builder."""

    def __init__(self, name):
        self.mat = bpy.data.materials.new(name)
        self.mat.use_nodes = True
        self.nt = self.mat.node_tree
        self.nt.nodes.clear()

    def node(self, typ, **props):
        n = self.nt.nodes.new(typ)
        for k, v in props.items():
            setattr(n, k, v)
        return n

    def link(self, a, b):
        self.nt.links.new(a, b)

    def vmath(self, op, a, b=None):
        n = self.node("ShaderNodeVectorMath", operation=op)
        for i, x in enumerate((a, b)):
            if x is None:
                continue
            if hasattr(x, "is_linked") or hasattr(x, "links"):
                self.link(x, n.inputs[i])
            else:
                n.inputs[i].default_value = tuple(x)
        return n.outputs["Value"] if op in ("DOT_PRODUCT", "LENGTH") else n.outputs["Vector"]

    def math(self, op, a, b=None, clamp=False):
        n = self.node("ShaderNodeMath", operation=op, use_clamp=clamp)
        for i, x in enumerate((a, b)):
            if x is None:
                continue
            if hasattr(x, "links"):
                self.link(x, n.inputs[i])
            else:
                n.inputs[i].default_value = float(x)
        return n.outputs[0]

    def vscale(self, vec, k):
        n = self.node("ShaderNodeVectorMath", operation="SCALE")
        self.link(vec, n.inputs[0])
        if hasattr(k, "links"):
            self.link(k, n.inputs["Scale"])
        else:
            n.inputs["Scale"].default_value = float(k)
        return n.outputs["Vector"]

    def emit(self, color_socket):
        e = self.node("ShaderNodeEmission")
        self.link(color_socket, e.inputs["Color"])
        o = self.node("ShaderNodeOutputMaterial")
        self.link(e.outputs[0], o.inputs["Surface"])


def ell_world_normal(nb, geo, ell_c, ell_r):
    d = nb.vmath("SUBTRACT", geo.outputs["Position"], ell_c)
    d = nb.vmath("MULTIPLY", d, [1.0 / (r * r) for r in ell_r])
    return nb.vmath("NORMALIZE", d)


def to_cam(nb, vec, axes):
    right, up, back = axes
    x = nb.vmath("DOT_PRODUCT", vec, right)
    y = nb.vmath("DOT_PRODUCT", vec, up)
    z = nb.math("ABSOLUTE", nb.vmath("DOT_PRODUCT", vec, back))
    c = nb.node("ShaderNodeCombineXYZ")
    nb.link(x, c.inputs[0]); nb.link(y, c.inputs[1]); nb.link(z, c.inputs[2])
    return c.outputs[0]


def make_material(name, mode, kind, axes, ell_c, ell_r, ao_dist, bark_img=None, sph=0.5):
    """mode: 'albedo' | 'normal';  kind: 'leaf' | 'bark'."""
    nb = NB(name)
    geo = nb.node("ShaderNodeNewGeometry")
    ell = ell_world_normal(nb, geo, ell_c, ell_r)
    if mode == "albedo":
        col = nb.node("ShaderNodeAttribute", attribute_name="Col").outputs["Color"]
        if kind == "bark":
            tex = nb.node("ShaderNodeTexImage")
            tex.image = bark_img
            uv = nb.node("ShaderNodeUVMap", uv_map="UVMap")
            nb.link(uv.outputs[0], tex.inputs["Vector"])
            col = nb.vmath("MULTIPLY", tex.outputs["Color"], col)
        ao = nb.node("ShaderNodeAmbientOcclusion", samples=8)
        ao.inputs["Distance"].default_value = ao_dist
        if kind == "leaf":
            # occlusion measured towards the outside of the crown: inner foliage goes dark,
            # the outer shell stays light -> the crown keeps its depth without any sun baked in
            nmix = nb.vmath("ADD", nb.vscale(geo.outputs["Normal"], 0.5), nb.vscale(ell, 1.0))
            nmix = nb.vmath("NORMALIZE", nb.vmath("ADD", nmix, (0.0, 0.0, 0.9)))
            nb.link(nmix, ao.inputs["Normal"])
        a = nb.math("POWER", ao.outputs["AO"], 0.9, clamp=True)
        if kind == "leaf":
            # analytic crown-volume term: foliage deep inside the fitted ellipsoid is darker
            q = nb.vmath("MULTIPLY", nb.vmath("SUBTRACT", geo.outputs["Position"], ell_c),
                         [1.0 / r for r in ell_r])
            mr = nb.node("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP")
            nb.link(nb.vmath("LENGTH", q), mr.inputs["Value"])
            mr.inputs["From Min"].default_value = 0.25
            mr.inputs["From Max"].default_value = 0.95
            mr.inputs["To Min"].default_value = 0.35
            mr.inputs["To Max"].default_value = 1.0
            a = nb.math("MULTIPLY", a, mr.outputs["Result"])
        a = nb.math("ADD", nb.math("MULTIPLY", a, 1.0 - AO_MIN), AO_MIN)
        nb.emit(nb.vscale(col, a))
    else:
        ncam = to_cam(nb, geo.outputs["Normal"], axes)
        ecam = to_cam(nb, ell, axes)
        k = sph if kind == "leaf" else 0.2
        n = nb.vmath("NORMALIZE", nb.vmath("ADD", nb.vscale(ncam, 1.0 - k), nb.vscale(ecam, k)))
        nb.emit(nb.vmath("ADD", nb.vscale(n, 0.5), (0.5, 0.5, 0.5)))
    return nb.mat


# --------------------------------------------------------------------------- scene / render
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.cycles.use_denoising = False
    sc.cycles.max_bounces = 0
    sc.cycles.filter_width = 1.1
    sc.cycles.use_adaptive_sampling = False
    sc.render.film_transparent = True
    sc.render.resolution_x = CELL
    sc.render.resolution_y = CELL
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.color_depth = "8"
    sc.render.image_settings.compression = 30
    sc.render.dither_intensity = 0.0
    sc.render.threads_mode = "FIXED"
    sc.render.threads = max(1, min(4, os.cpu_count() or 4))
    sc.display_settings.display_device = "sRGB"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = 0.0
    sc.view_settings.gamma = 1.0
    w = bpy.data.worlds.new("W")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Color"].default_value = (0, 0, 0, 1)
    sc.world = w
    return sc


VIEW_AXES = [
    # right,            up,              back (towards camera),  camera euler
    ((1.0, 0.0, 0.0), (0.0, 0.0, 1.0), (0.0, -1.0, 0.0), (math.pi / 2, 0.0, 0.0)),
    ((0.0, 1.0, 0.0), (0.0, 0.0, 1.0), (1.0, 0.0, 0.0), (math.pi / 2, 0.0, math.pi / 2)),
]


def render_species(name, H, W, a):
    t0 = time.time()
    sc = reset_scene()
    sc.cycles.samples = a["samples"]
    gen, seed = GENERATORS[name]
    px = max(H, W) * 1.02 / CELL
    tr = Tree(name, seed, px)
    gen(tr)
    top, lo, hi = tr.normalise(H, W)
    # tube extents too
    xmax = max(abs(lo[0]), abs(hi[0])); ymax = max(abs(lo[1]), abs(hi[1]))
    for pts, radii, _, _ in tr.tubes:
        xmax = max(xmax, float(np.abs(pts[:, 0]).max())); ymax = max(ymax, float(np.abs(pts[:, 1]).max()))
    quad = max(top, 2 * xmax, 2 * ymax) * 1.025
    quad = math.ceil(quad * 20) / 20.0
    tr.px = quad / CELL
    width = 0.5 * ((hi[0] - lo[0]) + (hi[1] - lo[1]))
    ell_c = tuple(0.5 * (lo + hi))
    ell_r = tuple(np.maximum(0.5 * (hi - lo), 0.3))
    wood = build_tubes(tr)
    leaves, nleaf = build_leaves(tr, ell_c, ell_r)
    fruit = build_fruit(tr)
    objs = []
    for me in (wood, leaves, fruit):
        if me is None:
            continue
        ob = bpy.data.objects.new(me.name, me)
        sc.collection.objects.link(ob)
        objs.append(ob)
    bark_img = bpy.data.images.load(os.path.join(a["assets"], tr.bark + "_Color.jpg"))
    cam = bpy.data.cameras.new("cam")
    cam.type = "ORTHO"
    cam.ortho_scale = quad
    cam.clip_start = 0.1
    cam.clip_end = 400
    cob = bpy.data.objects.new("cam", cam)
    sc.collection.objects.link(cob)
    sc.camera = cob
    print("[%s] %d tubes, %d leaves, %d wood verts | H %.2f W %.2f quad %.2f | gen %.1fs" % (
        name, len(tr.tubes), nleaf, len(wood.vertices), top, width, quad, time.time() - t0))
    for vi, (right, up, back, eul) in enumerate(VIEW_AXES):
        cob.location = (back[0] * 100.0, back[1] * 100.0, quad / 2.0)
        cob.rotation_euler = eul
        for mode in ("albedo", "normal"):
            axes = (right, up, back)
            mb = make_material("bark_" + mode, mode, "bark", axes, ell_c, ell_r, 0.12 * top, bark_img)
            ml = make_material("leaf_" + mode, mode, "leaf", axes, ell_c, ell_r, 0.22 * top)
            for ob in objs:
                ob.data.materials.clear()
                ob.data.materials.append(mb if ob.data is wood else ml)
            sc.view_settings.view_transform = "Standard" if mode == "albedo" else "Raw"
            sc.render.filepath = os.path.join(a["render"], "%s_%d_%s.png" % (name, vi, mode))
            t1 = time.time()
            bpy.ops.render.render(write_still=True)
            print("[%s] view %d %s rendered in %.1fs" % (name, vi, mode, time.time() - t1))
    meta = {"name": name, "height": round(float(top), 2), "width": round(float(width), 2),
            "quadHeight": round(quad, 2), "quadWidth": round(quad, 2)}
    with open(os.path.join(a["render"], name + ".json"), "w") as f:
        json.dump(meta, f)
    return meta


# --------------------------------------------------------------------------- atlas
def load_png(path):
    img = bpy.data.images.load(path)
    w, h = img.size
    buf = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(buf)
    bpy.data.images.remove(img)
    arr = buf.reshape(h, w, 4)[::-1]
    return np.clip(np.rint(arr * 255.0), 0, 255).astype(np.uint8)


def write_png(path, arr):
    h, w, c = arr.shape
    ctype = {3: 2, 4: 6}[c]
    raw = np.empty((h, w * c + 1), dtype=np.uint8)
    raw[:, 0] = 0
    raw[:, 1:] = arr.reshape(h, w * c)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, ctype, 0, 0, 0)))
        f.write(chunk(b"IDAT", zlib.compress(raw.tobytes(), 9)))
        f.write(chunk(b"IEND", b""))


def bleed(rgb, valid):
    """Fill RGB of invalid pixels from valid neighbours: a few exact dilation steps close to the
    silhouette, then push-pull for the rest, so mip-mapping never pulls in black/white."""
    rgb = rgb.astype(np.float64).copy()
    valid = valid.copy()
    h, w = valid.shape
    for _ in range(6):
        if valid.all():
            break
        acc = np.zeros_like(rgb)
        cnt = np.zeros((h, w))
        pr = np.pad(rgb * valid[:, :, None], ((1, 1), (1, 1), (0, 0)))
        pv = np.pad(valid.astype(np.float64), 1)
        for dy in (0, 1, 2):
            for dx in (0, 1, 2):
                if dy == 1 and dx == 1:
                    continue
                wgt = 1.0 if (dy == 1 or dx == 1) else 0.7
                acc += wgt * pr[dy:dy + h, dx:dx + w]
                cnt += wgt * pv[dy:dy + h, dx:dx + w]
        new = (~valid) & (cnt > 0)
        rgb[new] = acc[new] / cnt[new][:, None]
        valid |= new
    if valid.all():
        return rgb
    # push
    cs = [rgb * valid[:, :, None]]
    ws = [valid.astype(np.float64)]
    while cs[-1].shape[0] > 1:
        c, wt = cs[-1], ws[-1]
        hh, ww = c.shape[0] // 2, c.shape[1] // 2
        c2 = c.reshape(hh, 2, ww, 2, 3).sum(axis=(1, 3))
        w2 = wt.reshape(hh, 2, ww, 2).sum(axis=(1, 3))
        nz = w2 > 0
        c2[nz] /= w2[nz][:, None]
        cs.append(c2)
        ws.append(nz.astype(np.float64))
    # pull
    for lvl in range(len(cs) - 2, -1, -1):
        up = np.repeat(np.repeat(cs[lvl + 1], 2, axis=0), 2, axis=1)
        hole = ws[lvl] == 0
        if lvl == 0:
            cs[0][hole] = up[hole]
        else:
            cs[lvl][hole] = up[hole]
            ws[lvl][:] = 1.0
    return cs[0]


def assemble(a):
    rows = len(SPECIES)
    alb = np.zeros((rows * CELL, COLS * CELL, 4), dtype=np.uint8)
    nrm = np.zeros((rows * CELL, COLS * CELL, 3), dtype=np.uint8)
    metas = []
    for r, (name, H, W) in enumerate(SPECIES):
        with open(os.path.join(a["render"], name + ".json")) as f:
            m = json.load(f)
        m["row"] = r
        metas.append({k: m[k] for k in ("name", "row", "height", "width", "quadHeight", "quadWidth")})
        for v in range(COLS):
            ca = load_png(os.path.join(a["render"], "%s_%d_albedo.png" % (name, v)))
            cn = load_png(os.path.join(a["render"], "%s_%d_normal.png" % (name, v)))
            alpha = ca[:, :, 3]
            valid = alpha >= 24
            rgb = bleed(ca[:, :, :3], valid)
            nn = bleed(cn[:, :, :3], valid)
            # keep the bled normals unit length
            vec = nn / 127.5 - 1.0
            vec /= np.maximum(np.linalg.norm(vec, axis=2, keepdims=True), 1e-6)
            nn = (vec * 0.5 + 0.5) * 255.0
            ys, xs = slice(r * CELL, (r + 1) * CELL), slice(v * CELL, (v + 1) * CELL)
            alb[ys, xs, :3] = np.clip(np.rint(rgb), 0, 255)
            alb[ys, xs, 3] = alpha
            nrm[ys, xs] = np.clip(np.rint(nn), 0, 255)
    os.makedirs(a["out"], exist_ok=True)
    write_png(os.path.join(a["out"], "trees_albedo.png"), alb)
    write_png(os.path.join(a["out"], "trees_normal.png"), nrm)
    meta = {"cell": CELL, "cols": COLS, "rows": rows, "species": metas, "sources": SOURCES}
    with open(os.path.join(a["out"], "trees.json"), "w") as f:
        json.dump(meta, f, indent=2)
        f.write("\n")
    print("atlas written to", a["out"])
    for m in metas:
        print("  ", m)


# --------------------------------------------------------------------------- main
def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    here = os.path.dirname(os.path.abspath(__file__))
    repo = os.path.dirname(os.path.dirname(here))
    a = {"work": os.path.join(os.environ.get("TMPDIR", "/tmp"), "belfort-trees"), "assets": None,
         "out": os.path.join(repo, "public", "textures", "trees"), "only": None, "render": True,
         "samples": 96}
    i = 0
    while i < len(argv):
        k = argv[i]
        if k == "--no-render":
            a["render"] = False
        elif k in ("--work", "--assets", "--out", "--only", "--samples"):
            i += 1
            a[k[2:]] = argv[i]
        else:
            raise SystemExit("unknown argument " + k)
        i += 1
    a["samples"] = int(a["samples"])
    a["assets"] = a["assets"] or os.path.join(a["work"], "assets")
    a["render_dir"] = os.path.join(a["work"], "render")
    os.makedirs(a["render_dir"], exist_ok=True)
    a["do_render"] = a["render"]
    a["render"] = a["render_dir"]
    return a


def main():
    a = parse_args()
    only = a["only"].split(",") if a["only"] else [s[0] for s in SPECIES]
    if a["do_render"]:
        for name, H, W in SPECIES:
            if name in only:
                render_species(name, H, W, a)
    missing = [s[0] for s in SPECIES if not os.path.exists(os.path.join(a["render"], s[0] + ".json"))]
    if missing:
        print("not assembling atlas yet; species not rendered:", missing)
        return
    assemble(a)


if __name__ == "__main__":
    main()

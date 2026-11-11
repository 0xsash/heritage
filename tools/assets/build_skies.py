#!/usr/bin/env python3
"""Turns Poly Haven pure-sky HDRIs (CC0) into the game's sky presets.

For each preset:
  <id>_bg.jpg    4096x2048 background, HDR compressed with x/(1+x) so the game
                 can expand it again (the shader inverts the curve)
  <id>_env.hdr   1024x512 lighting environment with the sun clamped out
                 (the game adds its own directional sun so it can cast shadows)
and skies.json with the sun direction, horizon colour and exposure.

The panoramas are rolled horizontally so the sun sits at the azimuth we want
in game space (x = east, z = south), which avoids any runtime rotation.

Usage: build_skies.py <cache-dir>/sky <out-dir>
"""
import json, math, os, sys
import cv2
import numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]

# id, source, target mean sky radiance, desired sun azimuth (deg; 90 = south, 180 = west)
PRESETS = [
    ("golden", "wasteland_clouds_puresky", 0.30, 150.0),
    ("day", "kloofendal_48d_partly_cloudy_puresky", 0.42, 115.0),
    ("storm", "overcast_soil_puresky", 0.40, 120.0),
    ("night", "qwantani_moon_noon_puresky", 0.012, 70.0),
]


def lum(img):  # BGR float
    return 0.0722 * img[..., 0] + 0.7152 * img[..., 1] + 0.2126 * img[..., 2]


def sun_pixel(img):
    """Centroid of the brightest pixels (handles the wrap-around seam)."""
    L = lum(img)
    h, w = L.shape
    thresh = np.quantile(L, 0.9997)
    ys, xs = np.nonzero(L >= thresh)
    wts = L[ys, xs]
    ang = xs / w * 2 * math.pi
    cx = math.atan2((np.sin(ang) * wts).sum(), (np.cos(ang) * wts).sum()) % (2 * math.pi) / (2 * math.pi) * w
    cy = (ys * wts).sum() / wts.sum()
    return cx, cy


def process(pid, src, target, sun_az):
    big = cv2.imread(os.path.join(SRC, f"{src}_4k.hdr"), cv2.IMREAD_ANYDEPTH | cv2.IMREAD_COLOR)
    h, w, _ = big.shape
    sx, sy = sun_pixel(big)
    # roll so the sun lands at the requested azimuth: u = az/360 + 0.5
    want_x = ((sun_az / 360.0 + 0.5) % 1.0) * w
    shift = int(round(want_x - sx))
    big = np.roll(big, shift, axis=1)
    elev = (0.5 - (sy + 0.5) / h) * math.pi
    az = math.radians(sun_az)
    sun = [math.cos(elev) * math.cos(az), math.sin(elev), math.cos(elev) * math.sin(az)]

    # exposure: normalise the mean radiance of the upper hemisphere (sun clamped)
    upper = big[: h // 2]
    Lc = np.minimum(lum(upper), np.quantile(lum(upper), 0.995))
    weights = np.cos(np.linspace(math.pi / 2, 0, h // 2, endpoint=False))[:, None]
    mean = float((Lc * weights).sum() / (weights.sum() * w))
    k = target / mean
    big = big * k

    # horizon colour: a band 1.5-5 degrees above the horizon, sun side excluded by median
    y0, y1 = int(h / 2 - 5 / 180 * h), int(h / 2 - 1.5 / 180 * h)
    band = np.minimum(big[y0:y1], 6.0)
    horizon = np.median(band.reshape(-1, 3), axis=0)[::-1]  # → RGB
    zenith = np.median(np.minimum(big[: h // 6], 6.0).reshape(-1, 3), axis=0)[::-1]

    # background: compress HDR → LDR with x/(1+x), then sRGB-ish gamma for 8-bit precision
    comp = big / (1.0 + big)
    bg = np.clip(comp, 0, 1) ** (1 / 2.2)
    cv2.imwrite(os.path.join(OUT, f"{pid}_bg.jpg"), (bg * 255 + 0.5).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])

    # environment: 1024x512, sun clamped so it is not double-counted with the directional light
    small = cv2.imread(os.path.join(SRC, f"{src}_1k.hdr"), cv2.IMREAD_ANYDEPTH | cv2.IMREAD_COLOR)
    small = np.roll(small, int(round(shift * small.shape[1] / w)), axis=1) * k
    cap = max(target * 9.0, 0.05)
    small = np.minimum(small, cap).astype(np.float32)
    cv2.imwrite(os.path.join(OUT, f"{pid}_env.hdr"), small)

    return {
        "id": pid, "source": src,
        "sun": [round(v, 4) for v in sun],
        "sunElevationDeg": round(math.degrees(elev), 1),
        "horizon": [round(float(v), 4) for v in horizon],
        "zenith": [round(float(v), 4) for v in zenith],
        "meanSky": target,
    }


os.makedirs(OUT, exist_ok=True)
out = {"licence": "Skies CC0 from polyhaven.com", "presets": [process(*p) for p in PRESETS]}
json.dump(out, open(os.path.join(OUT, "skies.json"), "w"), indent=1)
for p in out["presets"]:
    print(p["id"], "sun elev", p["sunElevationDeg"], "horizon", p["horizon"])

"""Ferraris colour classifier shared by historicize_town.py and build_overworld.py.

Same structure as tools/history/historicize.py, with one change: the meadow and wood
thresholds adapt to each sheet. The Ferraris sheets were washed by different hands
and their scans differ in tint, so the absolute rule tuned on the Diest sheet
(G > R + 3) misses most meadows on the Mechelen, Leuven and Antwerp sheets. Greenness
gr = (G - R) / luminance (in %) is measured relative to the sheet's median (which is
field): meadow where gr > clip(median + 6.5, -6, 2); wood where it is also clearly
darker than the sheet's median.
"""
import cv2
import numpy as np

FIELD, BUILT, MEADOW, WOOD, HEATH, WATER = range(6)
NAMES = ["field", "built", "meadow", "wood", "heath", "water"]


def red_fraction(full, shape):
    """Share of saturated-red (house) pixels of a full-resolution Ferraris image inside
    each cell of a grid of the given (h, w) shape. Works at the source resolution because
    some sheets (Leuven) draw houses as thin frontage strips that wash out when averaged."""
    R, G, B = full[..., 0], full[..., 1], full[..., 2]
    red = ((R - G > 50) & (G - B < 30) & (R > 110)).astype(np.float32)
    return cv2.resize(red, (shape[1], shape[0]), interpolation=cv2.INTER_AREA)


def classify(small, stats_from=None, full=None, mpp=5.0):
    """small: float32 RGB image at ~4-5 m per pixel. Returns uint8 class image.
    stats_from: optional image to take the median statistics from (default: small).
    full: optional full-resolution image (same extent) for the house detection.
    mpp: metres per pixel of `small` (sets the minimum heath area, 30 ha)."""
    min_heath_px = 300000.0 / (mpp * mpp)
    b = cv2.GaussianBlur(small, (0, 0), 2.4)
    R, G, B = b[..., 0], b[..., 1], b[..., 2]
    lum = 0.3 * R + 0.59 * G + 0.11 * B
    gr = (G - R) / (lum + 1) * 100
    ref = b if stats_from is None else cv2.GaussianBlur(stats_from, (0, 0), 2.4)
    rl = 0.3 * ref[..., 0] + 0.59 * ref[..., 1] + 0.11 * ref[..., 2]
    valid = rl > 40  # ignore blank (outside the map) pixels
    if valid.sum() < 100:
        return np.zeros(R.shape, np.uint8)
    rgr = ((ref[..., 1] - ref[..., 0]) / (rl + 1) * 100)[valid]
    med_gr = float(np.median(rgr))
    med_lum = float(np.median(rl[valid]))
    thr = float(np.clip(med_gr + 6.5, -6, 2))
    cls = np.zeros(R.shape, np.uint8)
    cls[gr > thr] = MEADOW
    cls[(G - B > 36) & (R - G > 6) & (R - G < 48) & (lum > 110) & (lum < 175)] = HEATH
    cls[(lum < min(128, med_lum - 22)) & (gr > thr - 5)] = WOOD
    cls[(B > R + 6) & (G > R + 6) & (lum > 90)] = WATER
    # heath ("bruyère"): Ferraris washes it pale mauve and draws no parcel lines on it, so
    # it is a smooth (low high-pass energy), bluish (low (G-B)/lum) area; only large ones
    g = 0.3 * small[..., 0] + 0.59 * small[..., 1] + 0.11 * small[..., 2]
    hp = cv2.GaussianBlur(np.abs(g - cv2.GaussianBlur(g, (0, 0), 3)), (0, 0), 14)
    gb = cv2.GaussianBlur((G - B) / (lum + 1) * 100, (0, 0), 14)
    lumb = cv2.GaussianBlur(lum, (0, 0), 14)
    cand = ((gb < 12.5) & (hp < 8.5) & (lumb > 150) & (cls != WOOD)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(cand, 8)
    big = np.zeros(n, bool)
    big[1:] = st[1:, cv2.CC_STAT_AREA] > min_heath_px
    cls[big[lab]] = HEATH
    onehot = np.stack([cv2.blur((cls == k).astype(np.float32), (7, 7)) for k in range(6)], -1)
    cls = onehot.argmax(-1).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats((cls == HEATH).astype(np.uint8), 8)
    small_heath = np.zeros(n, bool)
    small_heath[1:] = st[1:, cv2.CC_STAT_AREA] < 190
    cls[small_heath[lab]] = FIELD
    b2 = cv2.GaussianBlur(small, (0, 0), 0.7)
    built = ((b2[..., 0] - b2[..., 1] > 40) & (b2[..., 1] - b2[..., 2] < 32)).astype(np.uint8)
    strong = np.zeros(built.shape, bool)
    if full is not None:
        rf = red_fraction(full, built.shape)
        strong = rf > 0.22
        built |= strong.astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(built, 8)
    keep = np.zeros(n, bool)
    # components made mostly of strongly saturated house red are houses even when long
    # and thin (frontage strips); pale red long thin ones are slope hatching / road edges
    strong_share = np.bincount(lab.ravel(), weights=strong.ravel().astype(np.float64), minlength=n) / np.maximum(st[:, 4], 1)
    for i in range(1, n):
        x, y, ww, hh, a = st[i]
        fill = a / float(ww * hh)
        if a >= 2 and (fill > 0.35 or a > 60) and not (max(ww, hh) >= 12 and fill < 0.22):
            keep[i] = True
        elif a >= 20 and strong_share[i] > 0.6:
            keep[i] = True
    cls[keep[lab]] = BUILT
    cls[~(cv2.GaussianBlur(small, (0, 0), 2.4)[..., 1] > 20)] = FIELD
    return cls

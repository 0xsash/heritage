"""Shared helpers for the 1650 regions pipeline (tools/regions/).

Projections: every town has its own local frame (equirectangular around its
centre, x = east, z = south, metres), exactly like tools/osm/build-world.mjs.
The region frame is the same projection around the reference point (Mechelen).
"""
import json, math, os, subprocess, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
CACHE = os.environ.get(
    "REGIONS_CACHE",
    "/tmp/claude-0/-home-user-heritage/fbffb122-b5ad-5a04-9543-7e04a3e8c2ba/scratchpad/regions")
MZ = 110574.0
MIRRORS = [m for m in os.environ.get("OVERPASS_API", "").split(",") if m] or [
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]
WMS = "https://geo.api.vlaanderen.be/HISTCART/wms"


def config():
    return json.load(open(os.path.join(HERE, "towns.json")))


def town(cfg, tid):
    return next(t for t in cfg["towns"] if t["id"] == tid)


class Frame:
    """Equirectangular metres around (lat0, lon0); x east, z south."""

    def __init__(self, lat0, lon0):
        self.lat0, self.lon0 = lat0, lon0
        self.mx = math.cos(math.radians(lat0)) * 111320

    def fwd(self, lat, lon):
        return (lon - self.lon0) * self.mx, -(lat - self.lat0) * MZ

    def inv(self, x, z):
        return self.lat0 - z / MZ, self.lon0 + x / self.mx

    def bbox_ll(self, x0, z0, x1, z1):
        """(south, west, north, east) of a local-metre box."""
        s, w = self.inv(x0, z1)
        n, e = self.inv(x1, z0)
        return s, w, n, e


def overpass(query, out_path, tries=8):
    """POSTs an Overpass QL query (already including [out:json]) and stores the JSON.
    Rotates over the mirrors; rejects partial answers (runtime-error remarks)."""
    if os.path.exists(out_path):
        try:
            json.load(open(out_path))
            return
        except Exception:
            pass
    data = urllib.parse.urlencode({"data": query})
    for i in range(tries):
        api = MIRRORS[i % len(MIRRORS)]
        tmp = out_path + ".part"
        subprocess.run(["curl", "-sS", "-m", "300", "--data", data, api, "-o", tmp], check=False)
        try:
            d = json.load(open(tmp))
            if "runtime error" in d.get("remark", ""):
                raise ValueError(d["remark"])
            os.replace(tmp, out_path)
            print("  ok", os.path.basename(out_path), len(d["elements"]), "elements", flush=True)
            return
        except Exception as e:
            print("  retry", os.path.basename(out_path), i, api.split("/")[2], str(e)[:80], flush=True)
            time.sleep(5 + 5 * i)
    raise RuntimeError("overpass failed: " + out_path)


def wms_tile(layer, s, w, n, e, width, height, path, fmt="image/jpeg"):
    q = dict(service="WMS", request="GetMap", version="1.3.0", layers=layer, styles="", crs="EPSG:4326",
             bbox=f"{s},{w},{n},{e}", width=width, height=height, format=fmt)
    url = WMS + "?" + urllib.parse.urlencode(q)
    from PIL import Image
    for attempt in range(5):
        subprocess.run(["curl", "-sS", "-m", "300", "-o", path, url], check=False)
        try:
            im = Image.open(path)
            im.load()
            return im.convert("RGB")
        except Exception:
            print("  wms retry", layer, attempt, flush=True)
            time.sleep(3 + 3 * attempt)
    raise RuntimeError("wms failed " + url)


def fetch_map(frame, box, out_dir, layer="ferraris", mpp=1.4, tile=2000):
    """Stitches a WMS layer onto the local metre grid of `frame` over box=(x0,z0,x1,z1)."""
    from PIL import Image
    os.makedirs(out_dir, exist_ok=True)
    png = os.path.join(out_dir, f"{layer}.png")
    if os.path.exists(png) and os.path.exists(os.path.join(out_dir, f"{layer}.json")):
        return
    x0, z0, x1, z1 = box
    W, H = int((x1 - x0) / mpp), int((z1 - z0) / mpp)
    canvas = Image.new("RGB", (W, H))
    for ty in range(0, H, tile):
        for tx in range(0, W, tile):
            tw, th = min(tile, W - tx), min(tile, H - ty)
            ax0, ax1 = x0 + tx * mpp, x0 + (tx + tw) * mpp
            az0, az1 = z0 + ty * mpp, z0 + (ty + th) * mpp
            s, w, n, e = frame.bbox_ll(ax0, az0, ax1, az1)
            f = os.path.join(out_dir, f"_{layer}_{tx}_{ty}.jpg")
            canvas.paste(wms_tile(layer, s, w, n, e, tw, th, f), (tx, ty))
            os.remove(f)
    canvas.save(png)
    json.dump({"layer": layer, "x0": x0, "z0": z0, "x1": x1, "z1": z1, "mpp": mpp, "width": W, "height": H,
               "lat0": frame.lat0, "lon0": frame.lon0}, open(os.path.join(out_dir, f"{layer}.json"), "w"))
    print(" ", layer, W, H, flush=True)

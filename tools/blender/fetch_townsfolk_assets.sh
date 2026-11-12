#!/usr/bin/env bash
# Downloads the third-party inputs that make_townsfolk.py needs and caches them.
#   Usage: tools/blender/fetch_townsfolk_assets.sh [cache-dir]
#   cache-dir defaults to $TOWNSFOLK_CACHE, then ~/.cache/belfort-townsfolk
# Everything fetched here is CC0 except the MPFB add-on code (GPL-3.0-or-later, a build tool only:
# none of its code ships in the kit). See TOWNSFOLK_NOTES.md.
set -euo pipefail
OUT=${1:-${TOWNSFOLK_CACHE:-$HOME/.cache/belfort-townsfolk}}
mkdir -p "$OUT"
UA="belfort-asset-fetch"

# 1. MPFB2 (MakeHuman for Blender): reuse the rider's copy when there is one.
if [ ! -s "$OUT/mpfb.zip" ]; then
  if [ -n "${RIDER_CACHE:-}" ] && [ -s "$RIDER_CACHE/mpfb.zip" ]; then
    cp "$RIDER_CACHE/mpfb.zip" "$OUT/mpfb.zip"
  else
    URL=$(curl -sS -m 120 -A "$UA" "https://extensions.blender.org/api/v1/extensions/" | python3 -I -c '
import sys, json
for e in json.load(sys.stdin)["data"]:
    if e["id"] == "mpfb":
        print(e["archive_url"]); break')
    curl -sS -L -m 900 -A "$UA" -o "$OUT/mpfb.zip.part" "$URL" && mv "$OUT/mpfb.zip.part" "$OUT/mpfb.zip"
  fi
fi

# 2. MakeHuman system assets (CC0): the six caucasian skins used as tonal guides for the painted skins.
#    The pack is ~280 MB; only the skin folders are kept.
SKINS="young_caucasian_male young_caucasian_female middleage_caucasian_male middleage_caucasian_female old_caucasian_male old_caucasian_female"
need=0
for s in $SKINS; do [ -d "$OUT/mh/$s" ] || need=1; done
if [ $need = 1 ]; then
  mkdir -p "$OUT/mh" "$OUT/tmp_sys"
  curl -sS -L -m 3600 -A "$UA" -o "$OUT/tmp_sys/sys.zip" \
    "https://files.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip"
  for s in $SKINS; do
    unzip -q -o "$OUT/tmp_sys/sys.zip" "*skins/$s/*" -d "$OUT/tmp_sys/x"
    mv "$(find "$OUT/tmp_sys/x" -type d -path "*skins/$s" | head -1)" "$OUT/mh/$s"
  done
  rm -rf "$OUT/tmp_sys"
fi
echo "townsfolk assets cached in $OUT"

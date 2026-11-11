#!/usr/bin/env bash
# Downloads the third-party inputs that make_rider.py needs and caches them.
#   Usage: tools/blender/fetch_rider_assets.sh [cache-dir]
#   cache-dir defaults to $RIDER_CACHE, then ~/.cache/belfort-rider
# Everything fetched here is CC0 except the MPFB add-on code (GPL-3.0-or-later,
# a build tool only: none of its code ships in rider.glb). See RIDER_NOTES.md.
set -euo pipefail
OUT=${1:-${RIDER_CACHE:-$HOME/.cache/belfort-rider}}
mkdir -p "$OUT"
UA="belfort-asset-fetch"

# 1. MPFB2 (MakeHuman for Blender) from the Blender extensions platform.
#    make_rider.py installs it into Blender on first run if it is missing.
if [ ! -s "$OUT/mpfb.zip" ]; then
  URL=$(curl -sS -m 120 -A "$UA" "https://extensions.blender.org/api/v1/extensions/" | python3 -I -c '
import sys, json
for e in json.load(sys.stdin)["data"]:
    if e["id"] == "mpfb":
        print(e["archive_url"]); break')
  curl -sS -L -m 900 -A "$UA" -o "$OUT/mpfb.zip.part" "$URL" && mv "$OUT/mpfb.zip.part" "$OUT/mpfb.zip"
fi

# 2. MakeHuman community asset packs (CC0 packs only). Only the folders that
#    make_rider.py uses are kept; the pack zip is deleted after extraction.
#    pack-path | asset folder inside the zip
fetch_pack () {
  local pack=$1 folder=$2 name
  name=$(basename "$folder")
  if [ ! -d "$OUT/mh/$name" ]; then
    mkdir -p "$OUT/mh" "$OUT/tmp_pack"
    curl -sS -L -m 1800 -A "$UA" -o "$OUT/tmp_pack/pack.zip" "https://files.makehumancommunity.org/asset_packs/$pack.zip"
    unzip -q -o "$OUT/tmp_pack/pack.zip" "$folder/*" -d "$OUT/tmp_pack"
    mv "$OUT/tmp_pack/$folder" "$OUT/mh/$name"
    rm -rf "$OUT/tmp_pack"
  fi
}
fetch_pack skins02/skins02_cc0 skins/jartur69_middleage_slavic_male_with_genitals_and_beard
fetch_pack shoes01/shoes01_cc0 clothes/culturalibre_male_boots

# 3. Quaternius "Universal Animation Library" (Standard), CC0, via itch.io's
#    free-download flow (no account needed).
if [ ! -d "$OUT/ual" ]; then
  mkdir -p "$OUT/tmp_ual"
  JAR="$OUT/tmp_ual/jar.txt"
  PAGE="https://quaternius.itch.io/universal-animation-library"
  curl -sS -m 60 -A "$UA" -c "$JAR" -o /dev/null "$PAGE"
  DL=$(curl -sS -m 60 -A "$UA" -b "$JAR" -c "$JAR" -X POST "$PAGE/download_url" | python3 -I -c 'import sys,json; print(json.load(sys.stdin)["url"])')
  curl -sS -m 60 -A "$UA" -b "$JAR" -c "$JAR" -o "$OUT/tmp_ual/dl.html" "$DL"
  CSRF=$(grep -oE 'csrf_token" value="[^"]+"' "$OUT/tmp_ual/dl.html" | head -1 | sed 's/.*value="//;s/"$//')
  UPLOAD=$(grep -oE 'data-upload_id="[0-9]+"' "$OUT/tmp_ual/dl.html" | head -1 | grep -oE '[0-9]+')
  CDN=$(curl -sS -m 60 -A "$UA" -b "$JAR" -c "$JAR" -X POST --data-urlencode "csrf_token=$CSRF" "$PAGE/file/$UPLOAD?source=game_download" | python3 -I -c 'import sys,json; print(json.load(sys.stdin)["url"])')
  curl -sS -L -m 900 -A "$UA" -o "$OUT/tmp_ual/ual.zip" "$CDN"
  mkdir -p "$OUT/tmp_ual/x" && unzip -q -o "$OUT/tmp_ual/ual.zip" -d "$OUT/tmp_ual/x"
  mv "$OUT/tmp_ual/x" "$OUT/ual"
  rm -rf "$OUT/tmp_ual"
fi
echo "rider assets cached in $OUT"

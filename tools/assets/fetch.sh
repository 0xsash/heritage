#!/usr/bin/env bash
# Downloads the CC0 source assets (ambientCG materials, Poly Haven skies) that
# build_textures.py and build_skies.py turn into the game's texture files.
# Usage: tools/assets/fetch.sh <cache-dir>
set -euo pipefail
OUT=${1:?usage: fetch.sh <cache-dir>}
mkdir -p "$OUT/tex" "$OUT/sky"

MATERIALS="Bricks059 Bricks097 Bricks060 Plaster001 Bricks066 RoofingTiles014A RoofingTiles003 Bricks090 Grass004 Grass001 PavingStones070 Ground054 Ground068 Ground037"
for m in $MATERIALS; do
  if [ ! -d "$OUT/tex/$m" ]; then
    curl -sS -L -m 300 -o "$OUT/tex/$m.zip" "https://ambientcg.com/get?file=${m}_1K-JPG.zip"
    mkdir -p "$OUT/tex/$m" && unzip -q -o "$OUT/tex/$m.zip" -d "$OUT/tex/$m" && rm "$OUT/tex/$m.zip"
  fi
done

SKIES="kloofendal_48d_partly_cloudy_puresky wasteland_clouds_puresky overcast_soil_puresky qwantani_moon_noon_puresky"
for s in $SKIES; do
  for res in 4k 1k; do
    f="$OUT/sky/${s}_${res}.hdr"
    [ -f "$f" ] || curl -sS -L -m 600 -o "$f" "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/${res}/${s}_${res}.hdr"
  done
done
echo "assets cached in $OUT"

#!/usr/bin/env bash
# Downloads the CC0 bark textures used by make_trees.py (ambientCG, CC0 1.0).
# Usage: fetch_tree_assets.sh <assets-dir>
# Everything else (branching, foliage, colours) is generated procedurally by make_trees.py.
set -euo pipefail

DEST="${1:-${TMPDIR:-/tmp}/belfort-trees/assets}"
mkdir -p "$DEST"

# asset id        used for
#   Bark001       oak, poplar, pollard willow (grey, deeply furrowed)
#   Bark014       Scots pine (red-brown, plated)
#   Bark006       apple (grey with lichen)
for id in Bark001 Bark014 Bark006; do
  out="$DEST/${id}_Color.jpg"
  if [ -s "$out" ]; then
    echo "have $out"
    continue
  fi
  tmp="$(mktemp -d)"
  echo "fetching $id from ambientCG ..."
  curl -fsSL -o "$tmp/$id.zip" "https://ambientcg.com/get?file=${id}_1K-JPG.zip"
  unzip -o -q "$tmp/$id.zip" "${id}_1K-JPG_Color.jpg" -d "$tmp"
  mv "$tmp/${id}_1K-JPG_Color.jpg" "$out"
  rm -rf "$tmp"
done
ls -la "$DEST"

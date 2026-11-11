#!/usr/bin/env bash
# Downloads raw OpenStreetMap data for the Diest region (Diest, Demer valley,
# Scherpenheuvel) via the Overpass API, in chunks small enough not to time out.
# Usage: tools/osm/fetch.sh <out-dir>
set -euo pipefail
OUT=${1:?usage: fetch.sh <out-dir>}
mkdir -p "$OUT"
API=${OVERPASS_API:-https://maps.mail.ru/osm/tools/overpass/api/interpreter}
BB="(50.962,4.960,51.000,5.085)"

fetch() {
  local name=$1 q=$2
  for i in 1 2 3 4; do
    curl -sS -m 200 --data-urlencode "data=[out:json][timeout:150];$q;out geom tags;" "$API" -o "$OUT/$name.json" || true
    if python3 -c "import json,sys;json.load(open(sys.argv[1]))" "$OUT/$name.json" 2>/dev/null; then
      echo "$name ok"; return
    fi
    echo "$name retry $i"; sleep $((i * 5))
  done
  echo "$name FAILED" >&2; exit 1
}

fetch b1 "(way[building](50.962,4.960,51.000,5.000);relation[building](50.962,4.960,51.000,5.000);)"
fetch b2 "(way[building](50.962,5.000,51.000,5.040);relation[building](50.962,5.000,51.000,5.040);)"
fetch b3 "(way[building](50.962,5.040,51.000,5.085);relation[building](50.962,5.040,51.000,5.085);)"
fetch roads "(way[highway]$BB;way[railway=rail]$BB;)"
fetch water "(way[waterway]$BB;way[natural=water]$BB;relation[natural=water]$BB;way[water]$BB;)"
fetch land "(way[landuse]$BB;relation[landuse]$BB;way[natural~\"wood|wetland|scrub|grassland|heath\"]$BB;relation[natural~\"wood|wetland\"]$BB;way[leisure~\"park|garden|pitch\"]$BB;)"
fetch misc "(way[barrier=city_wall]$BB;way[historic]$BB;node[place]$BB;node[historic]$BB;node[amenity=place_of_worship]$BB;way[amenity=place_of_worship]$BB;)"

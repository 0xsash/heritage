# tools/regions: the 1650 towns and overworld

Builds `public/world/regions/<town>.json` (one file per walled town, c. 1650) and
`public/world/regions/overworld.json` + `landcover.png` (the compressed map between them).
Background, sources and the warp formula: `docs/history/regions-1650.md`.

Downloads go to `$REGIONS_CACHE` (default: the session scratchpad, see `common.py`), never
into the repository.

## Files

| File | What |
|---|---|
| `towns.json` | Town list: id, name, centre (the market square), `bbox` (local metres around the centre), optional `margin`; K, ref point, overworld `region` (lat/lon box for rivers, roads, villages, land cover), road `links` between towns |
| `walls/<town>.json` | Hand trace of the c. 1650 enceinte in town-local metres: `ring`, `gates`, `gateSources`, `gatesUncertain`, `moat` (ring-vertex ranges with a wet moat), optional `forts`, `water`, `walled: false` (open towns: Turnhout), `note`, `source` |
| `landmarks.json` | Per town: `keep`/`drop` name rules for OSM buildings, extra `pois`, and the `landmarks` register (see below) |
| `politics.json` | Who ruled what c. 1650: polities as unions of modern admin areas with corrections, Scheldt forts, per-town ruler |
| `sites.json` | Places on the overworld outside the towns (abbeys, the drowned land of Saeftinghe, the heath, ...), the sea seed point |
| `fetch_town.py --maps-only <id>` | Ferraris (1777) and Villaret maps for a town bbox (geo.api.vlaanderen.be HISTCART) |
| `fetch_region.py` | Ferraris tiles over towns.json `region` (5 m/px) |
| `extract_pbf.py <pbf> <id>...` | OSM per town from a `.osm.pbf` (download.openstreetmap.fr extracts; Overpass is too slow from here) |
| `extract_region.py <pbf>...` | Rivers, main roads, places, coastline, dikes and admin areas over the region from several extracts at once |
| `build_town.mjs` / `build_towns.py --osm` | OSM -> town-local world (`$REGIONS_CACHE/build/<id>_osm.json`) |
| `view.py` | Tracing aid: Ferraris crop with a labelled metre grid (`--walls` draws the current trace) |
| `historicize_town.py` / `build_towns.py --hist` | Town file c. 1650, in overworld coordinates |
| `overlay.py`, `plans.py <dir> <id>... \| all` | Check images: town file over Ferraris, walls, gates (`?` = name uncertain), landmarks (orange = uncertain) |
| `build_overworld.py` | overworld.json + landcover.png + preview (`docs/history/regions-1650-overworld.jpg`) |
| `warp.py` | Layout of the town circles and the overworld <-> real warp |

## Add a town

1. Add it to `towns.json` (centre on the market square, `bbox` covering the walls + ~600 m) and its `links`.
2. `python3 fetch_town.py --maps-only <id>` and `python3 extract_pbf.py <flanders.osm.pbf> <id>` (Brussels: the
   brussels_capital_region extract), then `python3 build_towns.py --osm <id>`.
3. Trace the walls: `python3 view.py <id> x0 z0 x1 z1 out.png --grid 100`, read the main rampart off the Ferraris
   map, write `walls/<id>.json`. Name the gates as they were c. 1650, not by the Ferraris labels (which are 1770s
   names): the Flemish heritage inventory's "Historische stadskern van ..." texts list them; put the source in
   `gateSources` and every name you could not confirm in `gatesUncertain`. Some Ferraris sheets are offset in
   the service: compare with the OSM footprints (the plan image shows both) before trusting a trace.
4. Add the town to `landmarks.json` (register below) and `politics.json` `towns`.
5. `python3 build_towns.py --hist <id>`, check with `python3 plans.py <dir> <id>`.
6. A new town changes the layout of the overworld, so rebuild every town (`build_towns.py --hist all`) and the overworld.

## Landmark register (`landmarks.json` -> `towns.<id>.landmarks`)

Each entry: `n` (name as in 1650), `k` (belfry, church, townhall, clothhall, beguinage, castle, abbey, hall, gate,
tower, house, square, water, wall, cannon, statue), `y1650` (one line: what stood there in 1650), `src`, and a
position: `match` (an OSM building name; the building is then kept, renamed `n`, tagged `lm`, and gives the
position and footprint), `id` (an OSM way id), `x`/`z` (town-local metres) or `lat`/`lon`. Optional: `h` (height,
m), `footprintNote`, `special` (what only this town has), `uncertain: true`. Town files carry the resolved
register as `landmarks` (`x`, `z` in overworld metres, `building` = id of the footprint, `footprint` m²).

## Rebuild the overworld

```bash
cd tools/regions
python3 fetch_region.py                       # Ferraris tiles over towns.json "region" (~225 tiles)
python3 extract_region.py flanders.osm.pbf brussels_capital_region.osm.pbf wallonia_french_community.osm.pbf \
        zeeland.osm.pbf noord_brabant.osm.pbf limburg.osm.pbf   # from download.openstreetmap.fr; delete them after
python3 build_towns.py --hist all             # town files depend on the layout
python3 build_overworld.py                    # classifies the Ferraris tiles once (cached as classfrac20.npy)
```

## Schema additions (second round, all towns)

Town files: `landmarks` (the register above), `ruler` (polity, name, sovereign, source), `walls.gatesUncertain`,
`walls.source`, `walls.note`, `walls.walled` (only when false). Big towns are written with whole-metre
coordinates to stay under 1.5 MB. Overworld: `towns[].polity`, `towns[].landmarks` (summary), `polities`
(warped polygons, flat `[x, z, ...]` rings), `sites`, `dikes`, `drowned` (Saeftinghe), `villages[].polity`,
`villages[].ferraris: false` (outside the Ferraris coverage, not checked against 1777), `foldShare`
(share of the overworld where the warp folds).

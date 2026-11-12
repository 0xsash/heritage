# Diest, c. 1560: how the historical world is built

The game shows Diest and the Demer valley as they stood around **1560**: the Duchy of Brabant under Philip II, with William of Orange as Baron of Diest. The year sits after Sint-Sulpitius was finished (1534) and after the barony passed to Orange-Nassau (1499; William inherited it in 1544). It also comes before Scherpenheuvel became a pilgrimage town (after 1600). Jacob van Deventer drew his town plans of the Low Countries in these years.

## Sources

| Source | Date | Used for |
|---|---|---|
| OpenStreetMap (ODbL) | today | Building footprints, street lines, waterways. Only the parts that match the historical maps are kept. |
| **Ferraris map** (Kabinetskaart der Oostenrijkse Nederlanden), via Digitaal Vlaanderen's historical-maps service `geo.api.vlaanderen.be/HISTCART` | 1777 | Town wall and gates, which blocks were built up, farmsteads, fields, meadows, woods, heath. It is already georeferenced, so it lines up with OSM. |
| Villaret map, same service | 1745–1748 | Names of the gates and the chapel of All Saints. |

**Why a 1777 map for 1560?** Diest barely grew between the 16th and the late 18th century. Its late-medieval wall, its gates and its street plan were still in place when Ferraris surveyed it. Overlaid on today's map, the old streets line up within about 10–20 m. Ferraris is the best georeferenced witness to the older town that we can use directly. Van Deventer's own plan of Diest (c. 1560) would be better still, but its original is in Madrid and no georeferenced copy was available.

## Method (`tools/history/`)

1. `fetch_maps.py` downloads the Ferraris map for the play area and stitches it onto the game's metre grid.
2. `historicize.py` turns the OSM world into the 1560 world:
   - **Land cover.** It reads the Ferraris colours at 4 m cells and classifies each as field, built-up, meadow (wet grassland), wood, heath or water. Hatching is smoothed out. Red slope hatching and road edges are rejected by their long, thin shape.
   - **Buildings.** A modern building is kept only if it stands on land Ferraris shows as built up. Modern building types are dropped (industry, shops, flats, garages, schools, stations). Heights are capped at two or three storeys in town and one storey with a loft in the countryside.
   - **Filling the gaps.** Where Ferraris shows houses but nothing stands on the spot today, period buildings are generated: row-house blocks along the town streets, and farmsteads (a house and often a barn) in the countryside.
   - **Roads.** Railways, motorways, cycle paths, roundabouts and the 19th-century boulevards on the old ramparts (the "vesten") are dropped. Town streets are kept and cobbled. Country lanes and tracks are kept. Suburban streets are kept only next to kept buildings.
   - **Scherpenheuvel.** Ferraris shows the star-shaped town laid out after 1609. In 1560 the hill held only the oak with its statue, so that town is removed.
3. `walls_1560.json` holds the town wall traced by hand from Ferraris (accurate to about 20 m), with seven gates: Antwerpse-, Schaffense-, Koe-, Maastrichtse-, Leuvense-, Allerheiligen- and Demerpoort.

Regenerate:

```bash
python3 tools/history/fetch_maps.py public/world/diest.json /tmp/belfort-maps 1.4 ferraris
python3 tools/history/historicize.py public/world/diest.json /tmp/belfort-maps tools/history/walls_1560.json public/world/diest_1560.json
```

## Known, inferred, invented

**From the sources:**
- The wall line, the gate positions and their names.
- The street plan inside the walls, and which blocks were built up.
- The farmsteads, woods (Prinsenbos and others), heath, the Demer meadows and the gallows hill (Ferraris "Calgen Bergh").

**Inferred:**
- Building heights, wall height, the number and spacing of towers, and gatehouse shapes. Ferraris shows only the plan.
- Materials: brick and ironstone in town; whitewash, plaster and thatch in the countryside.
- Field crops, which are random within the field pattern.

**Known deviations still in the game:**
- The Demer follows its modern course. The meandering 16th-century river in Ferraris is not used yet.
- Building shapes inside the walls are today's footprints where a building still stands on a built-up plot, so some later rebuilds keep a later shape.
- Some modern country roads follow their modern line, and one roundabout fragment remains.
- Sint-Sulpitius: the Baroque carillon lantern (the "Mustard Pot") is later. The 1560 world shows the unfinished tower under a provisional roof.

**Invented for the game:** the dragon, the glowing lights in the oak at Scherpenheuvel, and the story.

## Discovery cards

`src/world/lore.ts` contains only things true by 1560. Legends are given as legends ("shepherds tell…", "folk call it…").

Dates used:
- Begijnhof founded 1253.
- The barony passed to Nassau in 1499.
- Sint-Sulpitius was finished in the 1530s.

Anything doubtful was left out. That includes the Holle Griet cannon, Saint John Berchmans (born 1599), the Scherpenheuvel basilica and the 19th-century citadel.

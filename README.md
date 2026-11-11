# BELFORT

A browser action-RPG over a mythic, twisted medieval Flanders. Ride a gilded hatchling over the **real** streets of Diest, land anywhere, walk the town, and discover its history (and what's wrong with it).

**Status:** M0, the flight prototype. See [`docs/design/vision.md`](docs/design/vision.md) for the plan, and [`docs/research/game-design-talks.md`](docs/research/game-design-talks.md) for the game-design research behind it.

## Run it

```bash
npm install
npm run dev
```

Open the printed URL. Append `?lowq` for weak GPUs, or `?t=0.92` to start at night.

## Controls

| | Keyboard and mouse | Gamepad |
|---|---|---|
| Steer / look | Mouse (click to capture the pointer) | Left stick / right stick |
| Speed | W flap harder · S brake and hover | RT / LT |
| Climb / dive | Space / C | A / B |
| Boost (flying) · run (on foot) | Shift | X |
| Land · mount · call your dragon | E | Y |
| Map · time of day · help | M · T · H | Back · D-pad up · Start |

## World data

`public/world/diest.json` is generated from OpenStreetMap:

```bash
tools/osm/fetch.sh /tmp/osm-raw
node tools/osm/build-world.mjs /tmp/osm-raw public/world/diest.json
```

Map data © OpenStreetMap contributors, available under the ODbL.

## Art sources

- Surface materials: [ambientCG](https://ambientcg.com) (CC0), packed by `tools/assets/build_textures.py`.
- Skies: [Poly Haven](https://polyhaven.com) pure-sky HDRIs (CC0), processed by `tools/assets/build_skies.py`.
- Art direction reference: `docs/art/moodboard.webp` (Flemish Masters realism, with Bosch for the corrupted zones).

```bash
tools/assets/fetch.sh /tmp/belfort-assets
python3 tools/assets/build_textures.py /tmp/belfort-assets/tex public/textures
python3 tools/assets/build_skies.py /tmp/belfort-assets/sky public/sky
```

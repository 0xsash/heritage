# BELFORT art prompts

Prompts for generating the game's artwork with an image model. The look is set by `docs/art/moodboard.webp`: **Flemish Masters realism, with Bosch for the corrupted zones.**

There are two kinds of image, and they need different prompts:

1. **Model sheets** become 3D models. An image-to-3D tool (we plan to use Tripo) turns one clean picture of one object into a game model, so these must be plain and clear, not atmospheric.
2. **Landmark paintings** are the targets for the critic loop (`tools/critic/RUBRIC.md`). They show a place from the camera the game will use, with full mood and light.

Save results here so the pipeline can find them:

- Model sheets: `docs/art/sheets/<id>.png` (use the id given with each prompt)
- Landmark paintings: `docs/art/concepts/<id>.jpg`

---

## 1. Model sheets (for image-to-3D)

### Rules that make a sheet convert well

- One subject only, whole subject in frame, nothing cropped.
- Plain light-grey background. No ground shadow, no scenery, no text, no border.
- Flat, even studio light. No dramatic shadows, no rim light, no fog or glow.
- Characters stand in an **A-pose**: arms straight and held 45° away from the body, legs slightly apart, hands open, facing the camera.
- Creatures stand in a neutral pose with every limb visible. Wings fully spread.
- Nothing loose that hides the body: cloaks hang open behind the shoulders, hoods are down.
- Square image, 1:1.

### Shared ending for every model sheet

Paste this after the subject description:

```text
Full-body game asset reference, single subject centred and fully in frame, plain light grey seamless studio background, flat even soft lighting, no cast shadow, no scenery, no text, no border. Realistic, physically believable materials with fine surface detail: worn leather, rough wool, aged metal, weathered wood. Late-medieval Flanders, 15th century, grounded and practical, not fantasy cosplay. Muted natural-dye palette: madder red, moss green, woad blue, ochre gold, brick red, bone white, charcoal black. Photorealistic rendering in the manner of a Flemish oil painting, sharp focus, high detail, 1:1.
```

### Hero characters and creatures

**Rider** (`rider`)

```text
A lean, weathered man in his thirties with dark tousled hair and a short beard, standing in an A-pose facing the camera, arms straight and 45 degrees from his body, legs slightly apart, hands open. He wears a deep madder-red wool cloak pushed back behind his shoulders with the hood down, edged with a woven band of muted gold and green foliage; a dark studded leather jerkin with straps and brass buckles over a dark linen tunic; leather bracers; a wide leather belt with two pouches and one small brass hand-bell hanging at the hip; dark wool hose; brown calf-high riding boots.
```

**Dragon** (`dragon`)

```text
A lean, rideable western dragon standing on four clawed legs in a neutral pose, seen from a three-quarter front view, both wings fully spread and held flat so the whole membrane is visible, neck extended, tail straight out behind, mouth closed. Aged verdigris green-bronze scales, deep green-teal in the recesses and warm bronze-gold on the raised edges; pale gold-ochre belly plates; translucent amber-gold wing membranes with fine veins and gilded finger bones; a row of backswept tarnished-gold spines along the neck and tail, with a smooth gap behind the shoulders where a rider would sit; long wedge-shaped head with brow ridges and backswept horns; amber eyes; ivory claws. Believable anatomy with a deep chest and strong wing roots.
```

**Kludde** (`kludde`)

```text
A Kludde, the shape-shifting water demon of Flemish folklore, as a gaunt black horse-like beast standing in a neutral pose, three-quarter front view, all four legs visible. Long skull with a drooping muzzle and pale glowing eyes; a soaked, matted coat like wet feathers and river weed hanging in strands; a ridge of spines along the back; long thin legs ending in clawed hooves; a heavy rusted iron chain wrapped around its neck and trailing from one foreleg; river mud and duckweed clinging to its flanks.
```

**Kludde spawn** (`kludde-spawn`)

```text
A small water demon the size of a large dog, standing in a neutral pose, three-quarter front view: a hunched black creature between a drowned hound and a crow, with a narrow beak-like muzzle, pale eyes, a wet matted coat of feathers and weed, thin clawed legs and a short length of broken rusted chain around its neck.
```

**Bosch pot-walker** (`bosch-pot-walker`)

```text
A creature in the manner of Hieronymus Bosch, standing in a neutral pose, three-quarter front view: a large cracked blue-and-white glazed earthenware pot walking on two long thin bird legs, with a fish tail and fins growing from its sides; a small hunched figure in a red hood and a tall pointed grey funnel hat sits inside the pot holding up a lit candle on a stick. Every part is physically believable, with real ceramic, scales, cloth and wax.
```

### Townsfolk

Use the same A-pose sentence as the rider: *"standing in an A-pose facing the camera, arms straight and 45 degrees from the body, legs slightly apart, hands open."*

| Id | Subject |
|---|---|
| `beguine` | A beguine in her forties: white linen veil and wimple, plain black wool habit, undyed linen apron, a small brass bell and a leather herb pouch at her belt, sturdy leather shoes. Calm, capable face. |
| `beguine-elder` | An elderly beguine, the same dress, stooped, with a ring of iron keys at her belt and a wooden walking stick tucked under one arm. |
| `weaver` | A cloth weaver: madder-red wool tunic stained at the cuffs, linen coif, leather apron, wool hose, shears and a wooden shuttle at his belt. Dye-stained hands. |
| `market-woman` | A market woman: white linen headcloth, rust-red wool kirtle with rolled sleeves, green apron, a coin purse at her belt, wooden pattens over her shoes. |
| `merchant` | A prosperous cloth merchant: long woad-blue wool gown trimmed with dark fur, a soft black chaperon hat, a seal ring, a leather document case on a strap. |
| `town-guard` | A town guard of Diest: kettle helmet, padded gambeson under a short black-and-gold livery tabard, leather gloves, a short sword at his belt. No pole weapon in the hands. |
| `norbertine-canon` | A Norbertine canon of Averbode Abbey: white wool habit and scapular, white cloak, leather belt, tonsured head, a small book hanging at his belt. |
| `child` | A boy of about nine: patched undyed linen shirt, short brown wool tunic, bare lower legs, worn leather shoes, a wooden whistle on a cord. |

### Props

No pose sentence needed. Add *"three-quarter view, resting upright"*.

| Id | Subject |
|---|---|
| `bell-clapper` | A bronze bell clapper as long as a man's arm, a heavy ball on a tapering shaft with a forged iron hanging loop, green patina in the recesses, bright wear where it strikes. |
| `hand-bell` | A small brass hand-bell with a turned wooden handle, engraved with a tiny tower, dented and polished by use. |
| `reliquary` | A gilded Gothic reliquary shaped like a small chapel, with pointed arches, tiny painted saints in the niches, blue enamel and a cross on the roof ridge. |
| `holle-griet` | A late-medieval wrought-iron bombard cannon made of long iron staves bound with thick hoops, resting on a low oak cradle, rusted and pitted. |
| `market-stall` | A wooden market stall with a madder-red wool awning on poles, a plank counter with baskets of apples and cabbages, and a hanging pair of scales. |
| `handcart` | A two-wheeled wooden handcart with iron-shod wheels, loaded with folded bolts of red and green cloth tied with cord. |
| `wayside-shrine` | A small brick wayside shrine on a post with a pitched slate roof, an iron grille, a faded painted statue inside and a burnt-down candle. |
| `shop-sign` | A wrought-iron bracket holding a painted wooden hanging sign showing a golden moon on a dark blue ground. |
| `demer-barge` | A flat-bottomed wooden river barge, tarred black below the waterline, with a short mast, a furled brown sail and a steering oar. |

### Buildings (hero models)

Add *"whole building in frame, three-quarter aerial view from slightly above, standing alone"*.

| Id | Subject |
|---|---|
| `sint-sulpitius` | A late-Gothic church built of dark brown iron sandstone blocks with pale limestone trim, tall pointed windows and flying buttresses, an unfinished square west tower, and over the crossing a squat bulbous slate-covered bell lantern shaped like a mustard pot, topped with a gilded ball. |
| `begijnhof-gate` | A Flemish Baroque gateway of red brick and pale sandstone: a round-arched passage flanked by pilasters, a curved scrolled gable above with a niche holding a statue of the Virgin, and whitewashed brick walls running off to each side. |
| `beguine-house` | A small whitewashed brick beguine house with a steep red clay-tile roof, a stepped gable, small leaded windows with green shutters, a low green door and a walled front garden with herbs. |
| `lakenhalle` | A long medieval cloth hall of brown iron sandstone with a steep slate roof, a row of pointed-arch doorways along the ground floor and small dormer windows. |
| `stepped-gable-house-a` | A tall narrow Flemish town house of red brick with a stepped gable facing the street, three storeys, stone-framed leaded windows, a dark green door and a wrought-iron sign bracket. |
| `stepped-gable-house-b` | A Flemish town house with a whitewashed brick front and a stepped gable, timber shutters, a shop opening with a wooden counter on the ground floor and a red clay-tile roof. |
| `city-gate` | A medieval brick city gate: a pointed-arch passage between two round towers with conical slate roofs, arrow slits, a portcullis groove and weathered stone coats of arms. |
| `scherpenheuvel-basilica` | A seven-sided Baroque pilgrimage church of pale sandstone and brick, crowned by a large lead-covered dome studded with gilded stars and a lantern on top, with a tall square bell tower behind it. |
| `watermill` | A brick-and-timber watermill straddling a narrow river channel, with a large wooden undershot wheel, a steep tiled roof and a small footbridge. |
| `root-oak` | An enormous, ancient, gnarled oak with a hollow at the base of its trunk large enough to walk into, massive twisted roots spreading over the ground, and dozens of small bronze bells and faded cloth rags tied in its lower branches. |

---

## 2. Landmark paintings (critic-loop targets)

Each one sets the target for a fixed camera shot in the game. Wide image, 16:9.

### Shared ending for every landmark painting

```text
Realistic late-medieval Flanders, 15th century, painted with the light and colour of the Flemish Masters: jewel-toned madder reds, moss greens and woad blues against warm brick and pale stone, golden light, deep glazed shadows, tall dramatic Low Countries cloud skies, soft atmospheric haze in the distance. Grounded and believable, richly detailed, no modern objects, no text. Cinematic wide composition, 16:9.
```

| Id | Subject (the game camera it must match) |
|---|---|
| `flight-demer-valley` | Seen from just behind and above a rider on a green-bronze dragon in flight: a flat patchwork of fields, poplar rows and pollard willows, a dark river winding to a walled brick town with a church tower, towering summer cumulus. |
| `diest-living-town` | Standing on the cobbled market square of Diest on market day: stalls with red and green awnings, townsfolk, stepped-gable brick houses on both sides and the brown sandstone church of Sint-Sulpitius with its squat bell lantern filling the end of the square. |
| `begijnhof-sanctuary` | Standing in a quiet lane of the Begijnhof at golden hour: whitewashed beguine houses with stepped gables and red tile roofs, walled herb gardens, two beguines at work, the small church of Sint-Catharina at the end of the lane. |
| `mustard-pot-belfry` | Inside the bell lantern of Sint-Sulpitius at dusk: a huge bronze bell with a long crack down its side, heavy oak frame, pigeons, open Gothic louvres looking out over the roofs of Diest. |
| `demer-kludde` | On the bank of the Demer under a storm sky: black water, reeds, a brick warehouse wall, and a chained black Kludde rising from the river. |
| `root-oak-forbidden-pilgrimage` | Night at Scherpenheuvel, eye level: the vast gnarled Root-Oak hung with bells and rags, candles burning in its hollow, a lone hooded pilgrim, and the star-studded dome of the basilica on the hill behind under a full moon. |
| `drowned-march` | A flooded marsh near Webbekom under a sickly yellow-green sky, in the manner of Hieronymus Bosch: pollard willows, dead reeds, fish swimming in the air, a pot-walker creature carrying a candle, a ruined church tower on the horizon. |
| `demer-valley-golden-hour` | From a dragon's height at golden hour: the whole walled town of Diest with long shadows across red and slate roofs, smoke from chimneys, the Demer catching the sun, fields and woods fading into warm haze. |

---

## 3. What happens to the images

1. A model sheet goes to the image-to-3D tool and comes back as a raw 3D model.
2. Blender (run by Claude, see `tools/blender/`) cleans it, sets its size and orientation, reduces it to a game budget, and binds characters to the shared skeleton so they all use one motion library.
3. The model goes into the game, and the critic loop scores the result against the landmark paintings.

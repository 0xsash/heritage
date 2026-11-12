# BELFORT — Design Vision (v0.1)

> *Flanders, in a Long Golden Age that never quite ended. The belfries have gone silent, the Demer runs black, and a gilded hatchling has chosen you. Neither of you is sure why.*

## Locked decisions

| Topic | Decision |
|---|---|
| Look | **Stylised, painterly** (Flemish Masters colour and light, Bosch for corrupted zones), smooth sculpted forms. Moodboard: `docs/art/moodboard.webp`. |
| Genre | **Hybrid action RPG.** Third-person flight and combat, with an ARPG-style loot and build layer. In dense town fights the camera pulls up into a near-top-down "combat zoom". |
| World | **Recognisable real Flanders.** Real street plans, waterways and landmarks from OpenStreetMap. You can fly to any town *and* land and walk its streets. |
| Starting region | **Diest, the Demer valley and Scherpenheuvel.** Ghent is the first big city after that. |
| Mount | **The gilded dragon** (see the alternatives below). |
| Tone | **Dark main story, rooted in true history.** Side content is mischievous, dark and tongue-in-cheek. |
| Era | **Diest in 1560**, historically accurate: the town and countryside rebuilt from the Ferraris map (see `docs/history/diest-1560.md`). In-game text sticks to history; legends are told as legends. |
| Platform | **Desktop browser first**, with keyboard and mouse plus gamepad. |
| Stack | Three.js, TypeScript and Vite. Hosted on Vercel; Supabase for saves and accounts later. Map data © OpenStreetMap contributors (ODbL). |

## Pillars
1. **Flight is the main action.** Getting around, combat, puzzles and even social play are built around flying.
2. **A Flanders you recognise.** Real places and real history first, then the twist.
3. **Towns that remember you.** NPC routines, memory, gossip and Nemesis-style rivals.
4. **Every hit lands.** Juice from day one (see `docs/research/game-design-talks.md`).

## Lore spine (draft)
- **The belfries are wards.** Their carillons play an old song that keeps the drowned sea out of land reclaimed from it. Someone has stolen the bells' clappers.
- **The Demer, "the dark water",** is the first river the sea has poisoned. Its servants are the **Kludde**: shape-shifters that can be a dog, a horse, a crow, or your uncle.
- **Diest:**
  - The **Mustard Pot** (the tower of Sint-Sulpitius) has cracked bells; repairing them is the first belfry quest.
  - The **Beguines** keep a Book of Quiet Bells and teach your first bell magic.
  - **Holle Griet** is a cannon with a memory.
  - The **Round Table mound** is waiting for something to sit on it.
- **Scherpenheuvel:** the folk legend of the oak that held a would-be thief rooted to the spot. The oak was felled, but its roots were not; the **Root-Oak** is growing back. This is a living pilgrimage site, so the fantasy belongs to the tree, never to the shrine.
- **Further afield (later regions):**
  - Ghent: the Belfry dragon and the Mystic Lamb, with its missing *Just Judges* panel.
  - Antwerp: Druon Antigoon.
  - Limburg: the Bokkenrijders.
  - Mechelen: the Maneblussers.
  - Dendermonde: Ros Beiaard.
  - Throughout: Reynaert the fox and Tijl Uilenspiegel.

## Mount alternatives (the dragon stays the default)
1. **The Kludde, tamed.** A reformed shape-shifter with one mount and three forms: a crow to fly, a horse for the streets, an eel for the canals. Its loyalty is negotiable. It fits the mischievous tone perfectly.
2. **Ros Beiaard.** The legendary magic horse of Dendermonde, which can stretch to carry four riders. That makes it a natural mount for co-op or companions, and it gallops across the sky.
3. **A carillon kite.** A belfry-built glider powered by bell resonance. It's slower and more tactical, but each upgrade comes from ringing towers.

## Core loops
- **About 30 seconds:** fly, spot, dive-strike, hitstop, pull up, chain to the next target. Hitting in rhythm builds Resonance, which powers bell magic.
- **About 20 minutes:** land in a town, hear gossip, take quests, fly out, resolve them, return, ring the belfry.
- **Campaign:** free each belfry, which pushes the mist back and opens new regions. Grow the dragon, shift faction politics (guilds, Leliaerts vs Clauwaerts, Beguines, Reynaert's thieves), and uncover the mystery of the Lamb.

## Milestones
- **M0 — Flight toy (this build).** Real Diest, the Demer valley and Scherpenheuvel. Dragon flight; landing; walking the streets; calling the dragon; discoveries with lore; compass; map; day and night; procedural audio.
- **M1 — Combat toy.** Kludde spawn over Diest; dive strikes and bell-fire; hitstop envelope, attack tokens, threat arrows, kills refill resources. Ends with a Mustard Pot boss fight.
- **M2 — Vertical slice.** The first belfry quest chain; 6 side quests; around 20 NPCs with routines (the star/drone split); saves through Supabase; the first loot.
- **M3 — Flanders.** Ghent, then Bruges, Antwerp, Mechelen, Leuven and the coast, streamed by region.
- **M4 — Polish and launch.**

## How we make it look like the real place
- **Now:** OSM footprints, extruded with steep Flemish roofs (ridges along the long axis, so gables face the street), stepped gables in the old town, shader-drawn windows, and lancet windows on churches. Landmarks are built by hand.
- **Next:**
  - Real building heights and roof shapes from Flanders' open **3D GRB** building data.
  - Real terrain from the open **DHM Vlaanderen** elevation model, giving Diest's hills and Scherpenheuvel's "sharp hill".
  - Hero models for each town's landmarks.
  - Modern buildings ("medievalised") replaced by period-appropriate shapes.

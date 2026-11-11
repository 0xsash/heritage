# Art pipeline

How BELFORT's art gets made. Adapted from the process Mike Houser described for *Age of Dragon* ([his thread](https://x.com/M__Houser/status/2120253236309569696)), which built a large browser RPG with Three.js, Tripo and Blender.

| Step | His technique | What we do | Status |
|---|---|---|---|
| 1. Concept first | Paint every landmark and character before building anything. "Without strong references the model just improves things into generic." | The moodboard sets the look. `docs/art/prompts.md` has a prompt for every character, creature, prop, building and landmark. Results go in `docs/art/sheets/` and `docs/art/concepts/`. | Moodboard done. Individual sheets and paintings still to generate. |
| 2. Image to 3D | Every character, creature, castle and prop is a Tripo model made from a concept image. | Send each model sheet to Tripo's API and download the model. | Needs a Tripo API key. The API is reachable from the build machine. |
| 3. Blender, driven by Claude | Rig every model to one shared skeleton and reuse one motion library, retimed for each body's weight. | `tools/blender/` scripts run Blender headless: clean, scale, reduce, rig, export. The rider defines the shared humanoid skeleton and the first motion clips. | Blender installed. Rider, dragon and tree builds in progress. |
| 4. Sound | ElevenLabs through fal: voiced lines, sound effects, music. | Sound is synthesised in code for now (wind, wingbeats, bells). Voices and music would use the same services. | Later. Needs keys. |
| 5. Critic loop | Shoot the same camera frames every round. Blind critics score them 1–10 against the concept. Fixers take the worst notes. Repeat. | `tools/critic/`: fixed shots matched to the moodboard panels, a capture script, a blind-critic brief and a score log. | Set up. Round 0 is the baseline. |
| 6. Play-test loop | Play, write down what feels off, turn each note into a task, play again. | Same. Screenshots cannot judge feel; only playing can. | Needs a playable link on a real GPU. |

## Where we differ

- **Real places.** His world is an invented island. Ours is built from OpenStreetMap footprints of real Flemish towns, so the towns are recognisable.
- **Realism.** His look is stylised fantasy. Ours is realistic, with photographic materials and photographed skies.
- **Scale.** He reports 21 billion tokens and 85,000 tool calls over four days. We grow region by region, starting with Diest.

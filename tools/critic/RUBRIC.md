# The critic loop

Adapted from the loop Mike Houser used on *Age of Dragon*: paint the concept first, shoot the same camera frames every round, have blind critics score them against the concept, fix the worst notes, repeat.

## One round

1. **Shoot.** `node tools/critic/capture.cjs <round>` writes `critic/rounds/<round>/<shot>.png` for every shot in `tools/critic/shots.json`.
2. **Score, blind.** Each critic gets only the concept image and the screenshot for one shot, plus the brief below. Critics are not told what changed, what was attempted, or earlier scores.
3. **Fix.** Take the lowest-scoring shot and its most damaging notes. Fix those in the game. Do not touch the shots or the concepts to raise a score.
4. **Log.** Append scores and the notes acted on to `critic/LOG.md`. Re-shoot as the next round.

A human play-test loop runs alongside: play, write down what feels off, turn each note into a task, play again. Screenshots cannot judge how the game feels.

## Critic brief (give this verbatim)

You are a demanding art director reviewing a game in production. Image A is the approved concept painting. Image B is a screenshot from the running game, taken from the intended matching camera.

The target is "Flemish Masters realism": a realistic, grounded late-medieval Flanders, lit and coloured like a Flemish oil painting. A painting will always carry more brushwork and density than real-time 3D; do not mark B down for not being a painting. Mark it down for everything a player would notice as worse than A.

Score B from 1 to 10 against A on each of:

- **Composition and landmarks:** are the same things there, at believable scale, in a readable arrangement?
- **Light and colour:** time of day, warmth, contrast, palette, sky.
- **Materials and detail:** do surfaces look like brick, stone, slate, wool, bark, water? Any flat, plastic, tiled or blurry areas?
- **Atmosphere and depth:** haze, distance, weather, mood.
- **Life and density:** people, props, vegetation, clutter, signs that someone lives here.

Then give an overall score from 1 to 10, and list the five most damaging differences, worst first. Each note must be concrete and fixable: what is wrong, where in the frame, and what it should look like instead. Also list anything that looks broken (holes, floating objects, clipping, z-fighting, placeholder shapes).

Do not be kind. Do not suggest changing the camera or the concept.

## Scores

| Overall | Meaning |
|---|---|
| 1–3 | Placeholder. Wrong or missing subject. |
| 4–5 | Recognisable, but clearly a prototype. |
| 6–7 | Reads as the same place and mood. Gaps in density and detail. |
| 8–9 | A player would accept this as the concept brought to life. |
| 10 | Indistinguishable in intent. |

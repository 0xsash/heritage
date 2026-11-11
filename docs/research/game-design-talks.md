# Game-design research: 20 talks and videos

Research notes for **BELFORT** (working title): a browser 3D action RPG set in a mythic version of Flanders.

## How this was researched

YouTube blocks transcript downloads from our cloud build machine, so no full transcripts were available. The videos were found and checked on YouTube (IDs and view counts below). Their content was read from these sources instead:

- **Primary sources:**
  - Squirrel Eiserloh's own GDC slide deck (all 62 slides)
  - Jonasson & Purho's own *Juicy Breakout* source code
  - Jeff Orkin's F.E.A.R. paper
  - Sakurai's own column (translated)
- **Secondary sources:** Game Developer, PC Gamer, 4Gamer and Thumbsticks coverage, plus timestamped AI summaries of the transcripts.

Points marked *(low confidence)* came only from thin or AI-generated coverage.

| # | Video | YouTube ID | Views |
|---|---|---|---|
| 1 | Juice it or lose it — Jonasson & Purho | Fy0aCDmgnxg | 618K |
| 2 | The Art of Screenshake — Jan Willem Nijman | AJdEqssNZ-U | 386K |
| 3 | Secrets of Game Feel and Juice — GMTK | 216_5nu4aVQ | 1.1M |
| 4 | Juicing Your Cameras With Math — Squirrel Eiserloh (GDC 2016) | tu-Qe66AvtY | 159K |
| 5 | Eight Hit Stop Techniques — Masahiro Sakurai | tycbMSjDDLg | 106K |
| 6 | What Makes a Good Combat System? — GMTK | 8X4fx-YncqA | 2.0M |
| 7 | Embracing Push Forward Combat in DOOM (GDC) + GMTK "4 P's" | 2KQNpQD8Ayo / I9ZsFT_eqXY | 109K / 571K |
| 8 | Evolving Combat in God of War for a New Perspective — Mihir Sheth | hE5tWF-Ou2k | 65K |
| 9 | Diablo: A Classic Game Postmortem — David Brevik (GDC 2016) | VscdPA6sUkc | 1.1M |
| 10 | Designing Path of Exile to Be Played Forever — Chris Wilson (GDC 2019) | tmuy9fyNUjY | 124K (+925K mirror) |
| 11 | Breaking Conventions with Zelda: Breath of the Wild (GDC 2017) | QyMsF31NdNc | 566K |
| 12 | The Rise of the Systemic Game — GMTK | SnpAAX9CkIc | 1.7M |
| 13 | The World Design of Elden Ring — GMTK | LvnlvB9n6ic | 1.2M |
| 14 | Concrete Jungle Gym: Traversal in Marvel's Spider-Man (GDC 2019) | OEaGEaCUq3g | 64K |
| 15 | An Indie Approach to Procedural Animation — David Rosen (GDC 2014) | LNidsMesxSE | 788K |
| 16 | 10 Quest Design Lessons from Witcher 3 & Cyberpunk — Paweł Sasko (GDC 2023) | nAkH86__g0o | 48K |
| 17 | Helping Players Hate (or Love) Their Nemesis — GDC 2018 | p3ShGfJkLcU | 24K |
| 18 | Narrative Legos — Ken Levine (GDC 2014) | 58FWUkA8y2Q | 169K |
| 19 | Sid Meier's Interesting Decisions (GDC 2012) | WggIdtrqgKg | 69K |
| 20 | Dynamic Quest Design — Timothy Cain | YxtuSiSfsb8 | 18K |
| + | Three States and a Plan: The AI of F.E.A.R. — Jeff Orkin (paper) | — | — |

---

## A. Game feel

**Hitstop (Juicy Breakout code, Sakurai)**
- Hitstop is a time-scale envelope, not a hard pause. Juicy Breakout's settings: duration 0–320 ms, slow-down multiplier, fade-in and fade-out each 0–160 ms.
- The envelope must scale the whole simulation: physics, animation mixers and tweens.
- Hitstop grows with damage, up to a cap. Per-attack modifiers apply, e.g. a sword tip gets more than the blade edge.
- During the freeze, the meshes vibrate but the hitboxes stay still. The victim shakes more than the attacker.
  - Shake is horizontal on the ground and vertical in the air.
  - It starts large and decays across the freeze.
- Over 4 frames during the freeze, the victim blends from its first flinch frame into the hurt pose. The attacker keeps drifting very slightly.
- Keep hitstop short when several enemies are attacking. Save long stops and zooms for kills and bosses.

**Screen shake**
- *Juicy Breakout:* a damped spring pushed along the hit direction. On a hit: `vel += -hitVel*0.5`. Each frame: `vel -= vel*0.1*dt; vel -= pos*0.1*dt; pos += vel*dt`.
- *Eiserloh's trauma model:* trauma is in [0,1]. Each hit adds +0.2 to +0.5, and trauma decays linearly.
  - Shake = trauma² or trauma³, so trauma of 0.3/0.6/0.9 gives 3%/22%/73% shake (cubed).
  - **In 3D, rotate the camera (yaw/pitch/roll); don't move it.** Drive it with Perlin or simplex noise using separate seeds per axis, not random numbers.
- *Nijman:* the camera kicks opposite to firing. A camera that leads in the direction of movement. Things stay where they fall (corpses, scorch marks). More bass on hit sounds.

**Camera (Eiserloh)**
- Smoothing: `x += (target-x)*k`, with k = 0.01 slow, 0.1 fast, 0.5 very fast at 60 FPS.
  - Our addition for variable frame rates: use `k' = 1-pow(1-k, dt*60)`.
  - Use different smoothing for horizontal vs vertical and for up vs down.
- Framing: primary focus points (the player) must never leave the view. Secondary ones (the locked-on target) should stay in view. Points of interest bias the framing, weighted by proximity × importance.

**Order of juice (Juicy Breakout's toggles)**
colour → tween-in (scale/rotation) → squash & stretch → sound → particles → screen shake → hitstop → personality (eyes, faces) → finishers.

**GMTK on game feel**
- Test: is the core verb fun in an empty room?
- Feedback for damage: white flash, knockback, particles, a sound.
- Randomise sound effects, and raise the pitch on combo chains.
- Keep the camera **steady** for precision moves (landings, dives) and shake it only on impacts.

## B. Combat

**GMTK combat**
- Every attack is anticipation → contact → recovery, and trades speed or area against how exposed you are.
- "Range and stickiness" (how much an attack pulls you toward its target) shape how fights start.
- Each move gets a distinct tactical job.
- Keep block, dodge and parry distinct. A parry needs risk attached.
- Readable enemy tells: silhouette, a glint before attacking.
- Reward using the whole moveset.

**DOOM**
- Aggression refills resources.
  - Health drops scale up when the player is low; ammo drops don't.
  - Glory kills always drop something. During a glory kill the player is invincible and the AI pauses new attacks.
- **Attack tokens** cap how many enemies attack at once. Tokens have cooldowns; harder difficulties get more.
- Each enemy archetype is a "chess piece" with one specialty.
- Arenas have ground and air routes.

**God of War**
- With a close camera, players worry about enemies they can't see. Answers:
  - Red arrows for incoming attacks and white arrows for idle enemies off screen.
  - Only **2 enemies are aggressive at once**. They stand in a crescent in front of the player; passive enemies form a wider ring.
- Strike assist knocks enemies toward where the camera is facing. Juggle height is capped so airborne enemies stay visible.
- "Suck to target" pulls attacks onto nearby enemies. Aim friction on throws.
- A weighted-grid approach to enemy positioning was dropped because it couldn't be debugged.

**Diablo (Brevik)**
- Diablo began as a turn-based roguelike. The real-time prototype (click → walk → kill a skeleton) was written in a few hours and made him shout with excitement. That loop *is* the ARPG.
- Every kill is a slot-machine pull. A good drop is a mini-jackpot with its own sound, colour and visual payoff.

**Path of Exile (Wilson)** *(thin coverage)*
- A regular, predictable release rhythm keeps players coming back.
- Several layers of randomness over reused content make the rhythm sustainable. Each release targets a different kind of player.

## C. World and traversal

**Breath of the Wild**
- *Multiplicative gameplay:* a few consistent rules that combine.
- "Chemistry" rules:
  - Elements change materials.
  - Elements change each other.
  - Materials never change each other directly.
- Physics is deliberately "Havok + lies": tuned for feel, but consistent.
- Prototype the systems cheaply (they built a 2D mock-up).
- *(CEDEC 2017)* The triangle rule:
  - Large landmarks attract the player, medium shapes block the view, small ones set the pace.
  - Each one hides what is behind it and offers a choice of going over or around.

**Systemic games (GMTK)**
- Entities broadcast **abstract stimuli** ("fire", "loud noise") rather than checking for specific objects.
- Rules are universal: if one wooden thing burns, all wooden things burn.
- Global systems (weather, day/night) touch everything. Rain puts out fires, muffles sound and boosts electricity.
- "Controlled instability": AI goals collide before the player arrives.
- Avoid one dominant tool.

**Elden Ring (GMTK)** *(low confidence)*
- Each region has a "legacy dungeon" anchor with optional side areas around it.
- Areas can be done out of order. No quest markers.
- Fixed per-area enemy levels let players wander into danger.
- Repeated templates wear down the sense of discovery.

**Spider-Man traversal**
- Swing points are tagged in advance and scored against input direction and range; raycast fans missed too much.
- The swing never has a slack line ("swinging, not falling"). Speed is blended into the swing arc, with a horizontal cap of about 30 m/s.
- Invisible assists:
  - The swing pivot is pulled toward the middle of the street.
  - Look-ahead dampens oversteer.
  - Ground and roof avoidance.
- Every release uses the same gravity, so momentum sets jump size.
- Camera: FOV driven by speed, pitch that flattens on the downswing, careful roll.
- Street widths were tuned early.

**Procedural animation (Rosen)**
- "First, do no harm to the gameplay."
- About 13 key poses in total. Layers, in order:
  1. Pose rotated toward velocity
  2. Tilt from acceleration
  3. A stride wheel driving pass/reach poses from distance travelled
  4. Walk and run speeds blended
  5. Bounce and sway
  6. Spring-dampers between poses
- Each layer can be toggled and viewed on its own for debugging.

## D. Quests, NPCs, story

**Sasko (Witcher 3 / Cyberpunk)**
- Withhold information to create curiosity.
- Emotion first, spectacle second ("fire and embers").
- Let scenes breathe. Use small human gestures.
- Cut repeated recaps. Put key information in focused moments.
- Develop characters before killing them.
- Offer dilemmas, not just choices.
- Make consequences **visible** and sometimes delayed. A consequence nobody notices is wasted work.
- Don't overdesign.

**Nemesis System**
- Enemies that kill you are promoted.
- Each one has a guaranteed weakness, a hidden "Player Interaction Score", a rare cheat-death, and scars or archetypes from earlier fights (the one who lost an arm comes back with a metal one).
- They remember you and taunt you about earlier encounters.
- Silhouettes and names are readable at a glance.
- A few enemies have hand-written arcs; the rest are chosen by the system.

**Narrative Legos (Levine)**
- In a town of about 50 NPCs, around 5 are **stars** with **passions** about the player. The rest are drones that follow the stars.
- Passions are obvious and responsive, with visible thresholds that change rewards and punishments.
- Pleasing one star costs you with another.
- Passions are re-rolled each playthrough.

**Sid Meier**
- Interesting decisions come in several kinds: tradeoff, situational, play-style, persistent, risk/reward, short- vs long-term, and customisation.
- An option that is always picked first, or an outcome that is effectively random, is not interesting.
- Always react to a decision, even with just a sound.
- Use what players already know (real history does the explaining).
- Layer goals over short, medium and long timeframes.

**Cain** *(low confidence)*
- Dynamic quests work best as typed templates (find, defend, escort, gather and craft, explore and report, dialogue) built on existing game systems.
- Mix them with hand-authored quests.

**Orkin (F.E.A.R., paper)**
- A tiny state machine (Goto, Animate, UseSmartObject) plus a goal planner that searches with A*.
- Each NPC type has its own action set: the same goals produce different behaviour.
- Squad tactics emerge from a light coordinator.
- **Dialogue is picked after the decision and explains the intent**, which is most of how intelligent the AI seems.

---

## What this means for BELFORT

1. **Camera:** a third-person chase camera for flight. Pull back to a higher "combat zoom" for crowded fights on the ground.
2. **Feel:**
   - A hitstop envelope that scales the whole simulation and grows with damage.
   - Rotation-only trauma shake in 3D, driven by simplex noise.
   - Framerate-independent smoothing.
   - Squash and stretch on town props.
3. **Combat:**
   - Attack tokens (2 aggressive enemies at once, more on harder difficulty).
   - Threat arrows for enemies off screen. Strike assist and stickiness.
   - Each enemy is a chess piece with one specialty.
   - Kills refill fire and health. Separate ground and air routes.
4. **Loot:** a Diablo-style drop moment with sound and colour. Path of Exile–style layered affixes over hand-made towns.
5. **Systems:**
   - Element × material chemistry: dragon fire, wind and Flemish rain against thatch, wood, peat and canal water.
   - Abstract stimuli that NPCs and props listen for.
6. **World:**
   - Belfries are the large landmarks of the triangle rule, abbeys and woods block the view, hamlets set the pace.
   - Tagged flight anchors with invisible assists. FOV driven by speed.
7. **Animation:** Rosen-style layers. Wingbeat phase comes from airspeed and climb rate (a "stride wheel" for wings), plus springs on the neck and tail.
8. **NPCs:**
   - A star/drone split in each town, with passions and thresholds.
   - A goal planner (GOAP-lite) for daily routines.
   - Barks and LLM lines generated *from the plan the NPC already chose*.
9. **Rivals:** Nemesis-style enemy records with rank, scars, memory, a guaranteed weakness and an interaction score.
10. **Quests:** hand-written arcs that follow Sasko's rules, plus typed templates for the rest. Consequences come back later through gossip that names the cause.

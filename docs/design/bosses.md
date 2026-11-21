# Belfort: bosses

How big fights work, and every boss in story order. `story.md` is the law for who they are; this file says how
they fight. Numbers are written against the code as it is in `src/combat/combat.ts` and `src/combat/enemies.ts`.
Facts and folklore marked (check) have not been through `docs/research/history-check.md`.

## 0. What a fight is today (the numbers everything below is built on)

- **Sword combo:** three blows of 0.50 s, 0.48 s and 0.74 s; they land at 0.20, 0.19 and 0.34 s; damage x1.0,
  x1.1, x1.9; reach 2.7, 2.7, 3.1 m. A full combo takes 1.72 s. **Zware Slag** takes 0.80 s, lands at 0.38 s,
  x2.4, reach 3.5 m. The third blow and Zware Slag are "heavy": they always stagger (0.42 s).
- **Roll:** Space while in combat. 0.55 s long, about 3.5 m, invulnerable for the first 0.42 s. It cannot cancel
  a blow before that blow has landed. So the shortest time from "I see it" to "I am safe" is one frame if idle,
  and up to 0.39 s if the third blow has just started. **No boss attack may have a tell shorter than 0.6 s.**
- **Resonantie:** +8 per hit, +12 per heavy hit, 100 at most. It pays for the two skills.
- **Dragon breath:** one fireball costs 18 of 100 fire, 0.3 s apart, so five in a row and then the tank is empty;
  it refills at 24 per second after 0.6 s without firing (a full tank in 4.2 s). A fireball flies at 80 m/s,
  bursts over 4.8 m, and does (14 + 6 x level) damage before gear. Ground enemies can only reach the dragon
  below 26 m.
- **Enemies** have one attack each: a windup (the tell, the body glows), the blow, a recovery, a cooldown. At most
  two enemies attack at once. Poise is the number of light hits before a stagger. Hero and dragon share one life.
- **The Kludde today** is a hound at scale 2.1 with 130 + 40 x level life, one lunge (0.7 s tell, 1.0 s recovery)
  and a blue ring. He is a big dog, not a boss. Section 2 replaces him.

## 1. The boss framework

### 1.1 Phases
- A boss has **three phases, sometimes four**. A phase is a different body or a different arena, never only "more
  damage". Each phase has two or three attacks, and each attack teaches one thing.
- **A phase ends at a life threshold** (written per boss, usually 70 %, 40 %, 10 %). Damage past the threshold is
  thrown away: one lucky Zware Slag cannot skip a phase.
- **The change itself is a rest of 3 to 5 seconds.** The boss cannot be hurt, the hero cannot be hurt, the camera
  pulls back, the boss changes. The player breathes, drinks, reads the new shape. Potions work during it.
- **Each phase adds one attack and keeps one** from the phase before, so the player always recognises something.
- **Length:** a chapter boss lasts 4 to 7 minutes on a first kill at the right level. No phase over 2 minutes.
- **No enrage timer.** A boss gets more dangerous when the arena shrinks or the water rises, which the player
  can see, never from a hidden clock.

### 1.2 The language of tells
Every heavy attack is announced the same way in every fight, so a player who has beaten the Kludde can read the
Gulden Draak. Sound first, then light, then the body.

| Kind of attack | What the player hears | What the player sees | Tell | Answer |
|---|---|---|---|---|
| **Sprong** (lunge in a line) | chain rattles, or hooves scrape | boss crouches; a narrow strip lights on the ground | 0.7 to 0.9 s | roll sideways |
| **Veeg** (sweep around the boss) | a low growl rising | a ring on the ground grows from the boss outward (`fx.ring`) | 0.9 to 1.1 s | roll out, or roll in through it |
| **Slag van boven** (slam on a spot) | one bell stroke, flat and wrong | a filled circle where it will land, fixed at the start of the tell | 1.0 to 1.4 s | walk out; no roll needed |
| **Greep** (grab; cannot be rolled through) | silence: all other sound drops for the tell | eyes turn from blue to white; no ground mark | 1.2 s | be out of reach; rolling inside it fails |
| **Adem / schot** (ranged, aimed) | intake of breath, or a match hissing | a thin line from boss to hero; it stops following 0.3 s before the shot | 1.1 to 1.5 s | move after the line locks |
| **Roep** (calls helpers or changes the arena) | the boss calls his own name, or a horn | boss rears, cannot be staggered | 2.0 s | hit him: it is the biggest opening in the fight |

Rules that go with the table:
- **Colour means one thing.** Blue-white light on the ground is "this will hurt, get out". Gold light is "stand
  here" (an ally's blessing, the dragon's landing place). Red is kept for human enemies, as now.
- **The eyes are the second tell.** Every boss has eyes that brighten for the last 0.3 s. A player who watches the
  body instead of the ground can still dodge.
- **Sound alone is enough.** Each kind has its own sound, played at the start of the tell. Deaf players get the
  ground mark; players with the screen full of fire get the sound.
- **After every heavy attack the boss stands open** for at least as long as his tell took. The table for each
  boss gives the opening in seconds; a full combo (1.72 s) must fit in the opening of every "punish" attack.
- **Never two heavy tells at once.** Helpers keep to the existing rule of two attackers at a time, and count the
  boss as one.

### 1.3 The arena
- A boss fight has **edges the player can see**: water, a wall, a ring of standing fire, a churchyard hedge.
  Leaving on foot is not possible once the fight starts; leaving on the dragon ends it (the boss recovers fully).
- Size: **30 to 40 m across for a foot phase**, 150 to 300 m for an air phase. Flat enough to roll anywhere.
- Each arena has **one thing to use** (a bell to ring, a sluice, a pile of powder) and **one thing that changes**
  between phases (water rises, a wall falls). Both are written per boss.
- The arena is a real place: the Kludde's is the Demer meadows below Diest, not a round room.

### 1.4 Dragon and foot in one fight
- **The dragon is called and sent away with the key that mounts him now.** In a boss fight the call takes 2.5 s
  (he has to come in), and there are **marked landing places** (gold light). The hero mounts only there.
- **The boss decides which is wiser, the player decides which he does.** Each phase says "foot", "air" or
  "either". In a foot phase the boss can strike the dragon out of the sky (the Greep, or a net of chain), so
  flying is possible and expensive. In an air phase the boss cannot be reached with a sword.
- **Dismount is always a choice with a price:** jumping off above the boss is a **Valslag** (new): a plunging blow
  of x3.0 that staggers any boss, and leaves the hero on foot with the dragon gone for 12 s.
- **The dragon fights on alone while the hero is on foot:** every 8 s he makes one pass and breathes once at the
  boss (half damage). He can be driven off: if the boss hits him he stays away 20 s. The player sees him circle.
- One life for both, as now. The dragon has no separate bar.

### 1.5 Allies
- **A faction sends fighters when it trusts the hero:** from the tier **Geëerd** (50 points in
  `src/rpg/factions.ts`) for a chapter boss in that faction's own region, from **Vertrouweling** (90) anywhere.
  At most **two factions, four fighters** per fight; the player picks at the arena edge from those on offer.
  The rivals in the code (Kroon and Oranje, Kerk and Vrije Lieden) will not stand in the same field: choosing
  one sends the other home, and they remember. Allies are a reward for faction work, not a difficulty setting.
- Each faction's help is one job, so they are chess pieces too:
  - **Gilden:** four schutters of the guild. They fire a volley every 6 s and break a boss's Roep faster.
  - **Kerk:** a pater with a hand bell. Inside his ring (gold, 6 m) the hero takes a third less damage. Old
    things turn on him first. The Oude Volk lose a little trust each time he rings.
  - **Kroon:** two musketeers and a sergeant from the garrison. Heavy single shots; they stagger.
  - **Oranje:** a ruiter who rides through the arena every 20 s and can carry the hero out of a Greep.
  - **Vrije Lieden:** two stropers who set snares before the fight: the first Sprong of each phase is caught.
  - **Het Oude Volk:** send nobody. They tell the hero the boss's weakness (1.5 s more opening, or a way to end
    the fight without a kill). It is the strongest help and it is why they are hidden.
- **Allies can die, and stay dead.** A named ally who falls is gone from his town, and his widow says so.
  That is the price of asking.
- With allies the boss has more life (+15 % per fighter) and aims one attack in three at them.

### 1.6 Death and retry
- Dying returns the hero to the arena edge, **at the start of the phase he reached**, with life full and the
  potions he had when he first walked in. No walk back, no reload.
- The boss says or does one thing on the hero's death and one on the retry. Never the same one twice running.
- After three deaths in one phase the game offers, once, in the dragon's behaviour and one line of text: "Je
  draak wil eerst weg van hier." Leaving and coming back two levels later is a real answer and costs nothing.
- Fallen allies do not come back on a retry.

### 1.7 Loot
- **One named piece of gear** per boss, fixed, not random, with one property no other piece has. First kill only.
- **One mark on the dragon** per boss: a visible change (a scar, a colour on the wing, a link of chain round a
  horn) and one small power. Marks are how another player reads where you have been.
- Sparing a boss, where that is possible, gives a different piece and a different mark. Never both.
- Gold and common gear drop as from an elite today. Later kills (harder returns, story.md section 8) give
  colours for the dragon, not more power.

### 1.8 Difficulty by level
- A boss has the level of his chapter's top (Kludde 5, Wilde Jacht 10, and so on). He does **not** scale down.
  He scales **up** with the hero, to at most 3 levels above his own, so coming back strong is easier, never free.
- Life, as a rule of thumb against today's numbers: total life = **3.5 x the current Kludde formula at that
  level** (3.5 x (130 + 40 x level)), split over the phases. Tune until a first kill takes 4 to 7 minutes.
- Damage: a normal blow takes 12 to 15 % of the hero's life at level, a heavy blow 25 to 30 %, a Greep 40 %.
  Nothing kills from full life in one hit.
- Tells are never shortened by level. A harder return adds an attack to each phase; it does not make tells faster.

### 1.9 What the code needs that it does not have
1. **Attack lists.** `EnemyType` has one windup, one recovery, one cooldown. A boss needs a list of moves, each
   with its own tell kind, tell time, shape (line, ring, circle, cone), damage and opening, and a chooser per phase.
2. **Phases** on an enemy: life thresholds, a body swap, the rest between phases, damage cap at the threshold.
3. **More bodies.** `BodyKind` is human, hound, wisp. Needed: horse, bat, wolf, rider, giant, dragon, and "thing"
   (Het Gietsel, De Waterwolf). `Body.act` needs named moves, not only windup and strike.
4. **Ground marks:** line, filled circle and cone next to `fx.ring`, in the blue-white tell colour.
5. **Attacks that cannot be rolled through** (the Greep ignores `invuln`), knock-back, and being carried.
6. **Fights against the flying dragon:** today a ground enemy only sees the dragon below 26 m and musket shots
   miss beyond 3.5 m. Air phases need aimed projectiles with lead, and hazards in the air.
7. **Arena:** bounds, landing places, the "one thing to use", a start trigger and a clean reset.
8. **Allies:** there are no friendly fighters. Needs a team flag on `Enemy`, targeting, and persistence of deaths.
9. **Mount and dismount inside a fight,** the Valslag, and the dragon's own passes.
10. **Checkpoint per phase,** boss lines on death and retry.
11. **A boss bar** with phase notches and the boss's name (today `bossTarget` only follows elites).
12. **Named gear and dragon marks** in the save (`src/rpg/state.ts`) and on the dragon model.
13. **A tell sound per kind** in the sound module (today: whoosh, hit, shot, fire, hurt).
14. **World bosses:** a calendar from the date alone, a tally of kills per faction, the share card (section 3).
15. **Het Oude Volk as a sixth faction.** `FactionId` has five. The hidden one needs standing of its own and a
    flag per boss for "the hero knows the weakness".
16. **Ending a fight without a kill** (spare, pay, call by name): today a fight ends only when life reaches 0.

## 2. De Kludde, the first real boss

**Where the folklore comes from.** The Kludde is recorded for Brabant and East Flanders, most of all around
Dendermonde and along the Scheldt and Dender: a shape-changer that appears as a black dog, a lean horse, a cat, a
bat or a tree, with two small blue flames dancing before him that are his eyes, the rattle of a chain, and his
own name as his cry. As a horse he lets a man mount, runs wild and throws him in the water (J.W. Wolf,
*Niederländische Sagen*, 1843) (check: the exact source and the list of shapes). Using him at Diest on the
Demer is our invention; story.md sends him home to Dendermonde in chapter 6.

**Level 5. Arena:** the wet meadows on the Demer below the Kludde's nest, at night, in fog. 36 m across, the
river on the north side, a pollard-willow row on the south, the nest (a drowned sheepfold) in the middle. One
thing to use: the stolen clappers hang in the willows; struck with the sword, one rings for 4 s and the Kludde
cannot change shape or vanish while it rings (three clappers, each rings once). One thing that changes: the
river comes into the meadow. Phase 1 dry, phase 2 ankle-deep at the north edge, phase 4 knee-deep everywhere.

**Stakes.** Gilden: their schutters lost two men to him and want his head on the Grote Markt. Kerk: the
clappers are theirs, and the chapter wants no talk of what the bells were holding down. Kroon: the garrison
wants the night roads open for its patrols and its tax carts. Oranje: the drossaard has let him be, because a
haunted road keeps Spanish soldiers inside the walls. Vrije Lieden: they have paid him in dogs and scraps for
years to pass at night, and a dead Kludde ends a trade secret. Oude Volk: he is the smallest of the old things,
and the only one they are a little ashamed of.

**Allies here** (the first fight where they can come): two schutters of the Diest guild, or the pater from
Scherpenheuvel with his hand bell. The player has rarely reached Geëerd by level 5, so most fight him alone.

**Life:** 3.5 x (130 + 40 x 5) = 1155, split 30 / 30 / 25 / 15 %.

**The eyes.** In every shape the only bright thing is two blue flames. In fog the player often sees the eyes
before the body. All his tells use them: they flare white for the last 0.3 s.

### Phase 1: De Hond (100 to 70 %). Foot.
A black hound the size of a cart horse, dragging a chain. This is today's Kludde with a second attack.

| Attack | Tell | What happens | Punishes | Opening |
|---|---|---|---|---|
| **Sprong** | chain rattles, he crouches, strip of light 2 m wide and 12 m long: 0.8 s | he leaps the strip; 14 % life | standing in front of him | 1.2 s: he skids in the mud. A combo without the third blow fits; the third blow fits if you rolled sideways, not back |
| **Kettingveeg** | growl, ring grows to 5.5 m: 1.0 s | chain sweeps all round; 22 % life, knocks back 4 m | hugging his flank and mashing attack | 1.6 s: the chain has to be dragged in. A full combo fits |
| **Roep** (at 85 % once) | he lifts his head and calls "Kludde! Kludde!": 2.0 s | three Broekhonden come out of the fog | ignoring him to watch the fog | the 2.0 s itself; a stagger here stops one hound coming |

Lesson: roll **sideways**, and learn that after his big attack he is yours.

*Change (4 s):* he runs into the fog. Only the two flames are left, then they rise: the eyes are now 2.5 m up.

### Phase 2: Het Paard (70 to 40 %). Foot, or the horse's back.
A starved black horse, every rib showing, far too tall, the chain now a halter. He does not fight the hero. He
runs the hero down, and he offers his back.

| Attack | Tell | What happens | Punishes | Opening |
|---|---|---|---|---|
| **Draf** | hooves scrape, strip of light 3 m wide across the whole meadow: 0.9 s | he gallops the strip, turns in the fog, comes back along a second strip 2.5 s later; 18 % each | rolling too early (the roll is 0.55 s; roll when the eyes flare, not when the strip appears) | none on the first pass; 1.4 s after the second, when he stands blowing |
| **Achteruitslaan** | he turns his hindquarters to the hero, cone behind him lights: 0.7 s | both hind hooves; 25 % and thrown 6 m | attacking from behind, the habit phase 1 taught | 1.0 s |
| **Het aanbod** (Greep; every 25 s) | all sound stops; he stands still, side-on, head low, eyes white: 1.2 s, then stays 3 s | if the hero walks up and presses the mount key he is on the Kludde's back | see below | see below |

**Riding the Kludde.** This is the legend, and it is the phase's real test. He bolts for the river (6 s). The
player hammers attack to hit him from the saddle (x1.5 damage, he cannot dodge) and must **jump off (Space)
before the bank**: a white line on the grass, crossed at second 5. Jump in time: he goes into the river alone
and stands stunned in the shallows for 3 s (the best opening of the fight). Stay on: the hero is thrown in the
Demer, loses 40 % life, and climbs out in soaked clothes: no roll for 5 s. Greed is what it punishes. A player
who never mounts can still win with Draf openings; it takes about a minute longer.

*Change (4 s):* in the shallows the horse folds up like a wet cloth. The eyes go up into the fog.

### Phase 3: De Vleermuis (40 to 15 %). Air, or foot with patience.
A bat with a wing-span of 9 m, the chain hanging 6 m below him. The fog lifts to 30 m: now there is a sky.
Two gold landing places appear, on the sheepfold and by the willows.

| Attack | Tell | What happens | Punishes | Opening |
|---|---|---|---|---|
| **Duik** | a shriek falling in pitch, circle of 4 m on the ground (or a line in the air to the dragon): 1.1 s | he stoops; 20 % | flying straight, or standing still on foot | on foot 1.3 s: he is on the ground. In the air: none |
| **Sleepketting** | chain rattles, long strip under his flight path: 0.9 s | the chain is dragged through the meadow; 16 %, and it **nets the dragon** if he is under 12 m: forced landing, dragon away 20 s | hovering low and breathing | none |
| **Blauw vuur** (adem) | intake of breath, line to the hero that locks 0.3 s early: 1.2 s | three blue flames, one after another, 0.4 s apart; 12 % each | flying in a straight line away from him | 2.0 s: he hangs still to breathe. Five fireballs (the whole tank) fit exactly |

Lesson: the breath tank. Five shots, then 4.2 s of flying and dodging. And the **Valslag**: a hero who climbs
above him and jumps knocks him out of the air for 4 s on the ground.

*Change (5 s):* at 15 % he falls into the river and does not come up. The water comes into the whole meadow.

### Phase 4: In het water (15 to 0 %). Foot, knee-deep.
No body. Two blue flames on black water, and whatever the water lifts. Rolling in water is 2.5 m, not 3.5 m.

| Attack | Tell | What happens | Punishes | Opening |
|---|---|---|---|---|
| **Kolk** (slag van boven) | one flat bell stroke, filled circle of 5 m: 1.2 s | the water rises and slams; 25 % | rolling by habit; walking out is enough | 1.5 s: the flames sit still on the water where it fell. Hit the flames |
| **Greep** | silence, eyes white, no mark: 1.2 s | a chain comes up under the hero and drags him under; 35 %, breaks on six presses of attack | standing within 4 m of the eyes when sound stops | none |
| **De drie gedaanten** (once, at 5 %) | he calls his name three times: 2.0 s | hound, horse and bat come at the hero one after another as water-shapes, each with its phase's first tell, 1.5 s apart | having forgotten phase 1 | after the third: he is open until he dies or is spared |

### If the hero knows his weakness
Het Oude Volk tell it at the end of their quest line in Diest: **the Kludde cannot bear being called by his own
name before he calls it himself**, and **a bell holds him to one shape**. Both are invented for the game; the
recorded part is only that he cries his own name. In play:
- A new prompt appears during his Roep in phases 1 and 4: call his name before he does. His Roep fails, no
  hounds come, and he is staggered 2.5 s.
- The three clappers ring for 8 s, not 4 s.
- The old woman of the Oude Volk says: "Hij roept zijn eigen naam omdat niemand anders het nog doet. Roep hem
  eerst, en hij weet niet meer wie van jullie twee de Kludde is."

### Sparing him
At the end of phase 4 the flames lie still on the water and the hero stands over them. Two prompts.
- **Kill** (strike the flames): the water goes back in a minute. Gear: **De Kluddeketting**, a belt of his chain:
  the hero's roll leaves a blue ring that staggers small enemies. Dragon mark: **Blauwe Vlam**: the dragon's eyes
  burn blue at night and his first fireball after landing is blue and does x1.5. Kerk and Gilden gain trust.
  In chapter 6 the Kludde at Dendermonde is a different, older one, and he knows what was done at Diest.
- **Spare** (sheathe the sword, only offered if the hero has spoken to the Oude Volk at least once): he takes
  the shape of a small wet dog, looks at the hero and goes into the reeds. Gear: **De Halsband**, an iron collar
  with no chain: Broekhonden and Dwaallichten do not attack first. Dragon mark: **Kettingschakel**: one link
  round the left horn; once per fight the dragon breaks a Greep by himself. Oude Volk gain trust; the Kerk loses
  some when Pieter the sexton hears of it. The roads round Diest stay haunted (hounds at night, for good). In
  chapter 6 the Kludde of Dendermonde is **this one**, grown, and phase 2's offer of his back is honest once.
- Either way the clappers come back and the bells of Diest ring; that entry in the ledger is already made.

**His lines** (he has few; he is a servant):
- On the hero's death: "Kludde, Kludde. Het water heeft geduld, en ik ook."
- On a retry: "Je bent teruggekomen. Dat doen ze hier allemaal."
- When spared: nothing. He shakes the water off like a dog.

## 3. World bosses

### 3.1 The calendar
- A world boss is a giant that walks one region for **one week, Monday 00:00 to Sunday 24:00 Brussels time**,
  the same week for every player. There is no server: the game works it out from the date. Week number since
  1 January 2026, modulo the list of world bosses in the game, gives this week's giant. Everybody who opens the
  game in the same week meets the same one, and can say so to a friend.
- **Within the week he moves.** Each region has four to six fixed haunts. Which haunt he is at changes every
  real day, from the same date seed, so two players comparing notes on the same day find him in the same place.
  He is only out between dusk and dawn of the game clock.
- **The town knows.** In the week's region the street remarks change, a notice hangs at the town hall, Marieke
  the pedlar says where he was seen last, and the Kroniek has a page for him. Outside his week the page says
  when he comes back ("Over drie weken is hij terug").
- **A player far below the region's level can see him and cannot start the fight** (2 levels under the region's
  top is the floor). He can watch from the dragon, which is its own advertisement.
- **One kill per week counts.** The player may fight again for the fight's sake; the week's reward comes once.
- **A bell left silent keeps the region's world boss for good** (story.md section 3): in that region he is out
  every night with half the weekly reward, and the roads there pay for it.

### 3.2 One player, with allies
- A world boss is built for **the hero, the dragon and up to three factions (six fighters)**, one more faction
  than a chapter boss allows. This is the fight where the faction work shows.
- His life is 5 x (130 + 40 x level) alone, +12 % for every ally fighter. With six allies: +72 %.
- **Each faction present unlocks one extra attack aimed at that faction's fighters** (he tears down the pater's
  ring, he scatters the schutters). A full field is a bigger and busier fight, not an easier one, and the hero
  has to protect people.
- Allies who survive come back to their town with a line about it and greet the hero by it from then on. Allies
  who die stay dead (1.5).
- No other human players are in the fight. What is shared is the calendar and the card.

### 3.3 What a kill gives
- **First kill ever:** his named gear and his mark on the dragon, as for a chapter boss (1.7).
- **Each week's kill:** a **trofee** (his pelt, his hand) that one faction will pay for, and only one. The hero
  chooses who gets it, and the others notice. A large sum of gold, and trust with that faction.
- **Each later kill:** one colour or pattern for the dragon from that boss's set (four per boss).
- A Kroniek entry with the date, the haunt, who stood with the hero, and who did not come home.

### 3.4 The share card
A picture the game draws on a kill, 1200 x 630, to save or share. On it: the boss's name; the hero on the dragon
with every mark he has earned, drawn from the real model; the real date and "week 47 van 2026"; the haunt ("aan
de Drie Eiken"); how long the fight took; which factions stood with him and how many came home; one line chosen
by how it went, for example "Zonder één keer te vallen", "Met de schutters van Diest, die alle vier naar huis
gingen", "Alleen". No score. The card for a spared boss says "gespaard" and shows the boss walking away.

### 3.5 De Weerwolf van het Hageland

**The folklore.** Werewolf stories are recorded all over Brabant and Flanders in the nineteenth-century
collections (check: Alfons De Cock, *Brabantsch Sagenboek*). The recurring parts: he is a man, often a known
neighbour, who puts on a wolf's skin or belt at night; he jumps on a walker's back and lets himself be carried
until the walker drops; by day he hides the skin (in a hollow tree, in the oven); **burn the skin and the man is
free, but he feels the fire as it burns**; wound the wolf and the same wound is on the man in the morning. A
werewolf recorded for a named Hageland village has still to be found (check); "van het Hageland" is our title.

**Who he is (invented).** Gielis Verstappen, a charcoal burner from the woods between Diest and Scherpenheuvel,
whose farm was burned by soldiers in the 1630s (check: armies in the Hageland in 1635). The skin was offered
him, and he took it to keep deserters out of his wood. It worked. He cannot take it off any more. His wife
Lysbeth still puts bread out for him. **Stakes:** Kroon wants him dead (he kills soldiers). Gilden want the pelt
on the wall of the schutterskamer. Kerk want the man shriven, alive if it can be. Vrije Lieden want him left
alone: he keeps the garrison out of the woods. Oranje would pay for him alive, to loose near a Spanish camp. The
Oude Volk know where the skin lies by day.

**Level 5 (scales to 8). Haunts:** the Drie Eiken crossroads, the charcoal clearing, the sunken road to
Scherpenheuvel, the Demer ford, the burned farm (to be placed on the current map). **Arena:** a clearing 40 m
across in oak and hazel, three charcoal kilns smouldering. One thing to use: a kiln kicked open throws 6 m of
fire for 8 s; he will not cross fire. One thing that changes: he pulls the kilns down, and the smoke hides him.

**Life alone:** 5 x (130 + 200) = 1650, split 35 / 35 / 30 %.

#### Phase 1: De Man (100 to 65 %). Foot.
A big man in a wolf's pelt, on two legs, with a billhook. He fights like a person and talks like one.

| Attack | Tell | What happens | Punishes | Opening |
|---|---|---|---|---|
| **Houw** | he draws the billhook back over his shoulder, strip 2 m by 5 m: 0.7 s | two cuts, 0.5 s apart; 12 % each | rolling once and standing up into the second cut | 1.3 s after the second |
| **Op de rug** (Greep) | silence, eyes go white: 1.2 s | he jumps on the hero's back: half speed and 4 % life a second until the hero rolls three times or walks into fire | staying within 5 m when the sound stops; fighting far from the kilns | 2.0 s if he is shaken off into fire |
| **Roep** (once, at 80 %) | he howls: 2.0 s | four wolves come from the wood (Broekhond body, grey, no chain) | watching the trees | the 2.0 s |

#### Phase 2: De Wolf (65 to 30 %). Foot and air.
*Change (4 s):* he drops to four legs; the pelt closes over him. A wolf the size of an ox. He hunts through the
trees at the clearing's edge; on foot the player sees eyes between the trunks. Two landing places. From the air
the dragon sees all of him, but the trees stop fireballs until he breaks cover.

| Attack | Tell | What happens | Punishes | Opening |
|---|---|---|---|---|
| **Sprong uit het hout** | branches crack on one side (stereo matters), strip 3 m by 16 m: 0.9 s | he crosses the whole clearing; 20 % | watching the wrong side | 1.0 s where he lands, in the open: the dragon's shot |
| **Rondjagen** | growl rising, ring to 7 m: 1.1 s | he circles the hero twice, snapping; 10 % a bite, up to three | rolling outward (he follows); the answer is rolling **in** | 1.8 s: he overruns and has to turn |
| **De meiler omver** | he looks at a kiln: 1.5 s | he pulls it down: smoke 12 m wide for 20 s; inside it tells show only as eyes and sound | leaving the kilns unused | 1.5 s: his back is turned |

#### Phase 3: Gewond (30 to 0 %). Foot.
*Change (3 s):* every wound the hero gave him now shows. He limps on the side that was hit most (the game counts
left and right), and that side takes +50 % damage for the rest of the fight. He stops using the trees. He is
faster and his openings are longer; he is fighting to be finished.

| Attack | Tell | What happens | Punishes | Opening |
|---|---|---|---|---|
| **Sprong** | as phase 2: 0.8 s | 22 % | standing on his strong side | 1.6 s |
| **Op de rug** (Greep) | as phase 1: 1.2 s | 6 % a second | as phase 1 | 2.5 s in fire |
| **Laatste houw** (once, at 10 %) | he stands up on two legs and says the hero's name: 2.0 s | five cuts in a row, 0.6 s apart, each with its own eye-flare | panic; each cut is one clean roll | 3.0 s, on his knees |

**The weakness.** If the hero has done the Oude Volk's errand, he knows the skin's hiding place: by day it lies
in the bread oven of the burned farm. Then there are three ways to end it.
- **Kill him** in the fight. Trofee: the pelt. Gear: **Het Wolfsvel**, a cloak: a blow from behind is ignored
  once every 30 s. Mark: **Wolfsklauw**, three scars on the dragon's flank; wolves and hounds flee the dragon's
  shadow. Lysbeth stops putting out bread, and tells the hero why.
- **Burn the skin by day** (no fight): Gielis is a man again, with every burn on his body, and he will not
  thank the hero. No trofee that week. Gear: **Het Kapmes**, his billhook. Kerk trust up; Vrije Lieden trust
  down; within a week the deserters are back in the wood and the roads show it.
- **Fight him to phase 3 and call him by his name** (prompt during Laatste houw, only with the Oude Volk's
  knowledge): he stops. He keeps the skin and the wood, and owes the hero. No gear. Mark: **Wolvenoog**: the
  dragon sees enemies through trees and smoke. He comes as an ally, once, to one later fight of the player's
  choosing. Kroon trust down, hard.

**Lines.**
- Gielis, phase 1: "Ik ken u niet. Dan zijt ge een soldaat of ge zijt verdwaald, en voor mij is dat hetzelfde."
  (Only he says "ge"; he is from the woods. Keep it light, voice.md rule 4.)
- On the hero's death: "Ga naar huis. Ik heb er al genoeg begraven die niet wilden luisteren."
- Lysbeth, after a kill: "Ik heb elke avond brood buitengezet. Zeg me niet dat hij het niet waard was."
- A schutter who lived: "Mijn vader heeft hem gekend toen hij nog kolen brandde. Dat ga ik thuis niet vertellen."

## 4. The chapter bosses, in story order

Each page gives what is fixed. Attack tables as full as the Kludde's are written when the chapter is built; all
of them use the tell kinds and times of 1.2 and the life rule of 1.8.

### 4.1 De Wilde Jacht (chapter 2, Loon, level 10)
**Source.** The Wild Hunt and the Wilde Jager are recorded for Limburg and the Kempen: a hunter who would not
stop hunting on a holy day and now rides the night sky with his hounds for ever; whoever mocks the hunt or calls
for a share gets a piece of the kill thrown down, and it is not venison (check: source and village).
**Who.** A lord of Loon (invented, unnamed; the Oude Volk call him De Jager) and his pack. Since the bells of
Loon were taken, nothing sends him back to sleep at dawn. He keeps soldiers off the heath, and the villages
leave him a share. **Stakes:** Kerk wants him laid; Vrije Lieden and the Oude Volk live under his protection;
Kroon and Oranje both lose patrols to him; the Gilden of Hasselt cannot move cloth by night.
**Arena.** The heath west of Hasselt at night (place to check on a 1650 map), 300 m across, in the air and on
the ground. Thing to use: the empty bell tower of a heath chapel; land on it and the hounds lose the scent for
6 s. Thing that changes: the moon sets, and with it the light to see hounds by.
- **Phase 1, De Honden (100 to 65 %), air.** The hero is the hunted. Twelve hounds run the sky in a line behind
  the dragon; the horn (Roep, 2.0 s) sends three at a time in a Sprong along a lit line in the air (0.9 s).
  Punishes: flying straight. Opening: a hound that misses hangs in the air 1.5 s. Burn the pack down.
- **Phase 2, De Jager (65 to 30 %), foot.** With his pack thinned he comes down. Boar spear on horseback: Draf
  (as the Kludde's, 0.9 s), a spear Sprong (0.8 s, opening 1.4 s), and a thrown spear (schot, 1.2 s). A Valslag
  unhorses him: 5 s on foot, his longest opening.
- **Phase 3, Het deel (30 to 0 %), either.** He throws down "the hero's share" (slag van boven, 1.2 s, 6 m
  circles, four in a row) and the hounds return two at a time. At 5 % he offers the horn.
**Ending.** Kill: gear **De Jachthoorn** (one blast staggers every enemy within 12 m, once per fight); mark
**Hondenbeet** (a torn tail-fin; the dragon turns tighter). The heath is safe and within a month the soldiers
are on it. Take the horn and ride one night with him (Oude Volk trust needed): mark **Heidewind** (faster at
night); he stays, and comes as an ally to chapter 6. The Kerk will not forget it.
- De Jager: "Ik jaag al langer dan jouw stad een toren heeft. Loop maar, dan heb ik tenminste iets om achteraan te gaan."
- A woman of Zonhoven (check: name of village): "We zetten 's avonds een schotel buiten. Sinds we dat doen, komen de soldaten niet meer."

### 4.2 Wat onder Sint-Pieter ligt: De Grondeloze (chapter 3, Leuven, level 10)
**Source.** Invented, on a real fact: the west front of Sint-Pieter was planned with three towers, the middle
one about 170 m, after a design by Joost Matsys (about 1505); the ground would not carry them, work stopped,
and what stood was partly taken down after collapses (check: dates). The Romanesque crypt under the choir is
real (check). **Who.** Not a creature: the place where the loan was first signed in Brabant. Piles, clay,
water, and the bones of the builders who went down with the first foundation. It is the water's hand under a
bell tower, and it pulls.
**Stakes:** the chapter of Sint-Pieter (Kerk) wants it sealed and not spoken of; the university wants it
measured; the Gilden want the tower finished at last; the Oude Volk say it should be left to finish its work.
**Arena.** The crypt, 30 m, then the flooded foundation below it. **Foot only: the dragon cannot come in.** It
is the one fight without him, in the chapter that explains why bells and dragons cannot share a sky.
- **Phase 1, De Krocht (100 to 60 %).** The floor is the enemy. Slag van boven from the vault (1.2 s circles);
  pillars that sink and tilt the floor so that rolling goes downhill. Opening: the oak pile heads that push up
  through the flags for 2 s after each slam are its body. Hit them.
- **Phase 2, De Palen (60 to 25 %).** The floor gives way; knee-deep water, roll 2.5 m. Piles come up as limbs:
  Veeg (1.0 s) and Greep from below (1.2 s, drags under). Thing to use: the bell rope that still hangs through
  the vault. One pull rings the bell above; everything stops for 4 s; each pull costs the dragon, who is
  heard crying out above. Three pulls at most.
- **Phase 3, Wat het water teruggeeft (25 to 0 %).** A ring of light drifts on the water against the current
  (Fiere Margriet's, check: the legend, 1225). Inside it nothing can grab the hero; it moves. Stand in it and
  strike the keel-beam of the foundation as it rises (three openings of 2.5 s).
**Ending.** It cannot be killed, only driven down; the bell decision of Leuven decides whether it stays down.
Gear: **De Peilstok**, a sounding rod as a staff-sword: shows where a Greep will rise. Mark: **Leemhuid**, grey
clay on the dragon's belly that never washes off; water attacks do a fifth less.
- The canon: "Men heeft de toren niet opgegeven omdat het geld op was. Het geld is er altijd geweest. De grond wilde niet."

### 4.3 Het Gietsel (chapter 4, Mechelen, level 15)
**Source.** Invented. Mechelen as a city of bell founders and of the royal gun foundry is in story.md (check).
**Who.** Forty bells from the towers of Loon and Brabant, broken up and half melted in one pit when the furnace
was let go cold in a hurry. They fused. It still tries to ring, with forty voices and one cracked throat. It is
not angry; it is trying to count the hours and cannot agree with itself.
**Stakes:** the Gilden (the founders) want it broken up and sold as metal; the Kerk wants each bell cut free and
sent home; the Kroon wants the bronze for guns; Vrije Lieden already sell splinters of it as relics; the Oude
Volk want it left dumb.
**Arena.** The casting hall and its pit, 34 m, at night, furnace lit. The dragon will not land in the city
(story.md): phases 1 and 2 are foot, alone. Thing to use: the sluice of the cooling channel (steam: it is slowed
5 s). Thing that changes: the floor fills with runnels of bronze that close off parts of the hall.
- **Every attack is a note.** Each of its bells has its own pitch and each kind of attack is rung by the same
  bell every time: the low bell is the Veeg, the cracked one the Slag van boven. A player who listens knows
  the attack before the ground lights. All tells 1.0 to 1.4 s; it is slow and hits for 30 %.
- **Phase 1, Het rolt (100 to 65 %).** It rolls (Sprong, strip 5 m wide, 0.9 s) and slams. Openings 2.0 s.
  Weak points: the three bells whose crowns still show. Hit one and it rings true once.
- **Phase 2, Het luidt (65 to 30 %).** It rings itself: rings on the floor go out in waves (Veeg, three in a row,
  0.8 s apart; roll through each). Hot bronze is thrown (schot, 1.2 s) and stays on the floor.
- **Phase 3, Het dak (30 to 0 %), air and foot.** It breaks the roof. The dragon comes after all, which he
  refused an hour ago, and it costs him: he lands burned. From the air, breath softens a bell (it glows); on
  foot the hero strikes the glowing bell free. Six bells freed ends it.
**Ending.** No sparing: it is not alive enough. The choice is what becomes of the metal, and each faction asks.
Gear: **De Klepel**, a mace made of a clapper: every third blow rings and staggers. Mark: **Brons**, a row of
bronze scales along the spine where the metal splashed: fire attacks do a fifth less to the pair.
- Lenaert, watching from the gallery: "Veertig torens, en ze kunnen het nog altijd niet eens worden over het uur. Zeg me nu nog eens dat een klok iets beters is dan een kanon."

### 4.4 De Klokkengieter en De Stomme (chapter 5, Antwerpen, level 20)
**Source.** Story.md. The citadel of Antwerp is the pentagon built for Alva from 1567 (check); an unpaid
garrison there around 1650 is (check). De Stomme, the gun cast from the bells of a hundred towers, is invented.
**Who.** Meester Lenaert, a founder and no swordsman, with four gun crews who have not been paid in a year and
stay because he pays them from his own purse. He does not want to kill the hero. He wants one shot.
**Stakes:** the Gilden of Antwerp want the gun fired and the river open; Kroon wants the gun and not the war;
Oranje wants it sunk, and has men in the city to see to it; Kerk wants the bronze back as bells; Vrije Lieden
live from the closed river and want nothing to change; the Oude Volk: one report and every old thing that
hears it sleeps for good.
**Arena.** The south-west bastion and curtain wall above the Scheldt, 250 m of air and 40 m of rampart.
- **Phase 1, De batterijen (100 to 70 %), air.** Four guns on the wall. Each shot: match hiss, a line to the
  dragon that locks 0.3 s early, 1.4 s. Chain-shot from the second gun nets the dragon under 15 m. Opening: a
  gun takes 9 s to reload; burn the crew off it (they run; they are not paid to die) or land and spike it.
- **Phase 2, De wal (70 to 30 %), foot.** Lenaert on the rampart with a founder's long ladle-iron and two
  pistols, behind pikemen who use the two-attackers rule. He gives ground toward De Stomme. Schot (1.1 s, two
  pistols, then 6 s to reload: the opening), Veeg with the iron (1.0 s). He talks the whole time, and he is
  reasonable.
- **Phase 3, De lont (30 % to the end), either.** He lights a slow match to De Stomme: 90 s, burning in plain
  sight along the wall (the one visible clock in the game). The crews fight to keep the hero from it. The player
  can cut the match (foot), burn the powder train (air), or let it burn.
**Ending.** Three outcomes for the gun (sunk in the river; kept whole, which opens "Recast"; fired, which opens
the river, restarts the war and silences every bell that hears it: the ledger moves hard). Lenaert's end follows
the hero's best faction and none is a triumph: hanged by the Kroon he served; taken north by Oranje to cast for
them; shriven and walled up in a cloister; or left on the wall alone with a gun that will never speak. Gear:
**Het Lontijzer**, his linstock: the hero's Zware Slag sets enemies alight. Mark: **Kruitbrand**, a black
powder burn across one wing; the fire tank holds six shots, not five.
- Lenaert: "Mijn dorp had ook een klok. Ze heeft geluid tot het water in de galmgaten stond. Vraag me niet om nog eens op een klok te vertrouwen."
- A gunner: "Hij betaalt ons uit zijn eigen zak. De koning doet dat al een jaar niet meer. Reken zelf maar uit voor wie ik sta."

### 4.5 Het verdronken Ros Beiaard (chapter 6, Dendermonde, level 25)
**Source.** The horse Beiaard of the Vier Heemskinderen, which carried all four brothers; Charlemagne had it
drowned with millstones round its neck, it broke free twice, and went under the third time when its master
Reinout turned his face away. Dendermonde claims the place, at the mouth of the Dender in the Scheldt, and has
carried the horse in its ommegang since the fifteenth century (check: date; check: Dendermonde's claim).
**Who.** The horse itself, as the water kept it: four empty places on its back, a millstone still on its neck.
It is not the water's servant. It is still looking for a rider who will not turn away. The Kludde of chapter 1
returns in this chapter first (killed: an older one; spared: the same one, see section 2); this is the boss
after him.
**Stakes:** the Gilden of Dendermonde hold the ommegang and call the horse theirs; the Kerk calls it a pagan
thing and wants it down; the Kroon is Charlemagne's heir and it knows; Oranje would open the dikes behind it;
the Oude Volk split over it, and which half stands with the hero follows his standing (story.md).
**Arena.** The flooded meadows where the Dender meets the Scheldt, 200 m, dikes on two sides. Foot on the
dike, air over the water.
- **Phase 1, De molensteen (100 to 65 %), foot on the dike.** It comes out of the river at the hero. Draf along
  the dike (0.9 s; nowhere to roll but into the water or down the land side), the millstone swung on its chain
  (Veeg, ring 8 m, 1.1 s, opening 2.0 s). Each Draf breaks a length of dike: the arena shrinks.
- **Phase 2, De vier plaatsen (65 to 30 %), on its back.** Het aanbod, as the Kludde taught in chapter 1, and
  now it is meant. The hero mounts; up to three allies can take the other places. It runs into the river and
  under. Each rider must hold on through three dives (timed presses, a tell each, 1.0 s). A rider who lets go
  is lost; an ally lost here is drowned. Every dive survived breaks one link of the stone's chain.
- **Phase 3, De derde keer (30 to 0 %), air.** It tries to climb out of the water for the third time and the
  water pulls it back; the fight is against the water on it: burn the weed and chains that hold it (weak points,
  2.0 s each as it surfaces) while it thrashes (Slag van boven with the stone, circles of 10 m, 1.3 s).
**Ending.** Free it: it goes up the Dender and is seen in the ommegang's week every year; gear **De Halster**
(the hero's roll works in water at full length); mark **Vier Plaatsen**, a saddle scar: one ally may ride the
dragon and shoot. Or turn away, as Reinout did, and let it go down: the water is fed and holds back one step
(the ledger moves in the hero's favour); gear **De Molensteen**, a shield; mark **Afgewend**, the dragon will
not look at the hero until the next chapter. The dragon is afraid in this fight and shows it: his calls take
4 s, not 2.5 s.
- A schipper of Dendermonde: "Mijn grootvader zei dat het drie keer boven is gekomen. De derde keer keek zijn baas niet om. Dat vergeeft een paard niet."

### 4.6 De Gulden Draak (chapter 7, Gent, level 30)
**Source.** The gilded dragon on the Belfort of Ghent, there since 1377, and the bell Roeland (check: both).
That he was a rider's dragon is story.md's invention.
**Who.** The last rider's dragon, gilded and bound to guard Roeland. He is not trying to kill the hero. He is
finding out whether the hero means it. **Stakes:** every faction has a man in the square below, and after the
fight each remembers what he saw.
**Arena.** The air round the Belfort, 300 m, the roofs of Ghent below, and the tower's gallery. Air, then foot.
- **Phase 1, De spiegel (100 to 70 %), air.** He does not attack first. Whatever the hero does, he does back
  2 s later: five fireballs get five gilt ones. A player who holds fire is circled and watched. Damage is done
  only in the 1.5 s after he has answered. Lesson: he is the hero's own dragon, older.
- **Phase 2, Verguldsel (70 to 35 %), air.** He breathes gilt (adem, a cone 40 m long, 1.4 s). What it touches
  goes stiff: one hit and the dragon turns slower for 10 s; three and he falls, to be caught by a Valslag in
  reverse (the hero must jump to the gallery). Duik (1.1 s) round the tower; the tower is cover, and fireballs
  that hit the Belfort ring Roeland, which staggers both dragons for 2 s. Each such stroke counts in the ledger.
- **Phase 3, De vraag (35 to 10 %), foot, on the gallery.** He lands and waits. The hero's dragon will not
  fight him here and sits on the roof-ridge. On foot against a dragon: Veeg with the tail (ring 9 m, 1.1 s),
  Slag van boven with a claw (1.2 s), gilt breath along the gallery (1.4 s, one safe bay behind each pinnacle).
  Openings of 2.0 s at the old binding-chain on his foreleg. He stops at 10 % and lowers his head.
**Ending.** He cannot be killed before the choice at Roeland; what happens to him is the ending's (story.md
section 2). Strike the chain and he is free for one flight: he fights the Waterwolf beside the hero. Leave it:
he stays on the tower and Roeland is guarded during the last fight. Gear: **De Naam**, the rider of 1377's
knife with her name on it. Mark: **Verguld**, one gilt scale over the dragon's heart, which is where it starts.
- (He does not speak. On the gallery the hero finds, scratched in the stone at the height of a seated woman:)
  "Ik heb de klok gekozen. Vraag hem of het goed was."

### 4.7 De Waterwolf (the end, the Scheldt dikes, level 30)
**Source.** "Waterwolf" is the old Dutch name for water that eats land (check: earliest use; Vondel and
Leeghwater are 17th century). Saeftinghe drowned in 1584 when the dikes were cut in the war (check), and the
legend of its bell ringing under water is (check).
**Who.** The flood coming up the Scheldt in the shape of what it has taken: wrecks, church towers, the bell of
Saeftinghe. Neelke stands on it and speaks for it. It cannot be killed. It can be held long enough to choose.
**Arena.** Three dikes between Saeftinghe and Ghent, each 400 m, fought one after the other from the dragon.
**The bar on screen is the dike's, not the Wolf's.** The Wolf has no life. Each dike must stand for 150 s.
- **Dike 1, De wrakken.** It throws what it has taken: hulks (Slag van boven on the dike, circles of 12 m,
  1.4 s; burn them in the air), and waves that climb the dike (burn the crest, 2.0 s windows). Allies on the
  dike with sandbags and guns are who the ledger sent: towns whose bells ring send their schutters and
  paters; towns left silent send the old things that woke there, the spared bosses among them.
- **Dike 2, De torens.** Drowned towers rise and ring wrong: every stroke is the "slag van boven" sound, used
  now against the player who has trusted it for thirty levels: one in three is false. The ground mark is true.
  The dragon is weakest here by exactly what the ledger took from him.
- **Dike 3, De Telster.** Neelke counts aloud. Every number is an attack, and the player has heard each tell
  before, in order: the Kludde's Sprong, the Jager's horn, the Gietsel's low bell, Lenaert's match, the Ros's
  stone. The whole game, once more, in 150 s. At the end she says the hero's number: the bells he rang.
**Ending.** No loot. The dikes that stood decide how much land is left to decide about. Then Roeland, and the
choice (story.md section 2).
- Neelke: "Ik ben niet boos op jullie. Ik tel alleen. Er is geleend, en wie leent, moet teruggeven. Dat heeft mijn vader mij geleerd, en hij was schipper."
- Neelke, on dike 3: "Je hebt vijf klokken geluid. Ik heb ze alle vijf gehoord. Het was schoon, en het verandert de som niet."

## 5. Two more world bosses (chapter 5, Antwerpen)

### 5.1 Lange Wapper
**Source.** Antwerp's own bogey: a water-devil from the canals who can make himself as small as a child or tall
enough to look in at upper windows, torments drunkards and cheats at cards, and keeps away from images of Our
Lady, which is the reason the legend gives for the Madonnas on Antwerp's street corners. The written record is
nineteenth century (check: source; so in 1650 he is told, not printed).
**Fight.** Level 20, the streets and ruien round the Wapper at night, 60 m of streets, not a round arena.
Thing to use: the Madonnas on the corners (gold light, 6 m): he cannot step in. They are lit only if somebody
keeps the lamp (a Kerk quest in the week before). Phase 1, child-sized and quick (Sprong 0.7 s, he steals a
potion on a hit). Phase 2, three storeys tall: the sword reaches his shins; Slag van boven with a foot (1.3 s,
8 m); the dragon fights his head between the gables, where there is room for one turn. Phase 3, he steps into
the rui and is as long as the street: the fight runs along the water. He cannot be killed in a street with no
lit Madonna: he only laughs and shrinks away until next week. **Stakes:** Kerk wants the lamps lit; Vrije
Lieden lose their night trade if they are; Gilden want the ruien safe for lighters. Trofee: his hat. Gear:
**De Lange Mouw** (reach +0.5 m). Mark: **Rekhals**, the dragon's neck a hand longer; breath range up.
- "Ge hebt gedronken, vriend, of ge zoudt mij niet zien. Kom, we kaarten erom. Ik speel altijd eerlijk tot ik verlies."

### 5.2 Druon Antigoon
**Source.** The giant who held the Scheldt at Antwerp, took toll of every ship and cut off the hand of the
skipper who could not pay, until Silvius Brabo killed him and threw his hand in the river; the tale is in print
since the sixteenth century and is the city's own story of its name (check: earliest printing).
**Why now (invented).** The river has been shut since 1585. A toll that nobody can pay has called the old
toll-taker back. He stands in the roads off the Werf, to the waist in the Scheldt, and takes ships.
**Stakes:** the Gilden want his hand thrown in the river again, in public, by their own dean; **Oranje wants
him left: he keeps the river shut for nothing**; Kroon wants the credit; the Kerk remembers that Brabo was a
Roman and says nothing; Vrije Lieden pay him, and get through.
**Fight.** Level 20, on the river, 300 m; air, with foot on his own arm. Phase 1: he swats (Slag van boven, a
hand 10 m wide, 1.3 s) and throws a hulk (schot, 1.5 s). Phase 2: Greep at the dragon (silence, 1.2 s): caught,
the hero must cut his way out on foot along the forearm, to the wrist: that is the weak point. Phase 3: he
demands the toll. **Pay it** (half the hero's gold, or the trofee of another boss): he lets the hero and one
ship through, and the fight is over without a kill for this week. Refuse: he takes the hero's sword hand in a
Greep that kills from 60 % life. Cut the wrist through (three openings of 2.5 s) and the hand falls on the
quay. Trofee: the hand; who throws it decides which faction gains. Gear: **De Tolhandschoen** (a Greep can be
broken once per fight). Mark: **Handworp**: the dragon can carry and drop one thing (a barrel of powder, an ally).
- "Wie hier voorbij wil, betaalt. Dat was zo voor er een stad stond, en het zal nog zo zijn als ze weer weg is."

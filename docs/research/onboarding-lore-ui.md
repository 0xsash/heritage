# Onboarding, lore presence and a slicker UI: research and recommendations

Research notes for **BELFORT**, written to answer three complaints from the owner:

1. the lore is not present enough;
2. the UI is not slick enough;
3. onboarding is weak (first-time experience, tutorial, perhaps a "what this is / is not" screen).

This doc assumes you have read `game-design-talks.md` and `arpg-guidance-and-gamification.md`. It does not repeat them. In particular, quest markers, the tracker rules, Ghost of Tsushima's guiding wind, Kaplan's text budget, the Skyrim/Witcher/WoW openings, character-creation timing, barks cooldowns and crowd LOD are already covered there.

## How to read this doc

- Every claim names its source by number, e.g. **[S4]**. The full list with URLs is in section 6.
- I could not watch video. Talks and video essays were read through write-ups, slide decks, developer commentary transcripts and official docs. Section 6 says how each source was read.
- **(obs)** means a well-known in-game fact that I did not fetch a source for.
- **(LC)** means low confidence: thin, second-hand or vendor sources.
- **[inference]** means my own reasoning or a default I am proposing. Numbers marked this way are starting points to tune, not findings.
- Recommendations are marked **impact** (high / medium / low) and **effort** (S = up to a day, M = two to five days, L = more than a week, for one developer).

## What the game does today (baseline, read from the code)

These facts drive the recommendations, so check them if the code has moved on.

| Area | Today | Where |
|---|---|---|
| Before play | Title, then five narrated story slides, then character creation. The world loads behind them. | `src/ui/creation.ts` |
| First seconds of play | You start in the air. One banner carries three instructions in one sentence (follow the light, E to land, left mouse breathes fire, H shows controls). An 11-row controls table is on screen for the first 30 s. | `src/main.ts`, `src/ui/hud.ts` |
| Lore | About 20 discovery texts of 35 to 50 words each, well written, shown once on a card at the top of the screen and never again. Items have one `text` field. Townsfolk say one-liners. There is no codex, glossary or bestiary. | `src/world/lore.ts`, `src/rpg/types.ts` |
| Type | EB Garamond and Cinzel. About 40 CSS declarations set text at 10 to 13 px. | `src/ui/style.css` |
| HUD | Compass, three-quest tracker, location line, player frame (name, life, resonance, action slots with text labels, XP), waypoint, prompts, toasts, banners, attribution line. All always on. | `src/ui/gamehud.ts`, `src/ui/style.css` |
| Motion and sound | Fades of 0.15 s to 1.1 s with the default `ease`. No UI sounds except a chime. No `prefers-reduced-motion` handling. | `src/ui/style.css` |
| Download | `public/` is 38 MB: models 16 MB (townsfolk 6.8, dragon 5.2, rider 4.0), textures 9.3 MB, skies 5.8 MB, world data 7.2 MB. The JS bundle is 1.1 MB before compression. | `public/`, `dist/` |
| Page | `<html lang="en">` and the title "Belfort — Flight over Diest", although the game is in Flemish. | `index.html` |

---

# 1. Onboarding and tutorials

## 1a. Principles

**P1. Don't call it a tutorial; blend it into the game.** George Fan's first tip: no section is labelled "tutorial", so players never feel they must study before playing **[S1]**. Valve says the same of Portal: "Portal is effectively an extended player training exercise" (Robin Walker) **[S2]**.

**P2. Do, don't read.** Fan: "The best way for a player to learn is to actually perform actions in the game" **[S1]**. Half-Life 2 teaches that saw blades kill zombies in about 10 seconds with no text: a zombie already cut in half, blades stuck in the wall, a gravity gun in your hands, and then a zombie walks in **[S3]**.

**P3. One concept at a time, then a gate that proves it was learned.** Portal's team added two chambers when a puzzle "introduced too many new concepts at once"; Kim Swift: "Overwhelmed players tend not to digest new information" **[S2]**. A gate is "a mandatory pause in the action" that the player can only pass by using the new skill **[S2]**. Celeste's prologue freezes time until you dash; Super Mario Bros. 1-1 puts a Goomba in your way until you jump **[S4]**.

**P4. Show it safely before it can hurt.** Half-Life 2 introduces enemies where they cannot reach you: a barnacle eats a crow, a zombie throws things from behind a fence **[S3][S4]**. The camera is never taken away to do it **[S3]**.

**P5. Fewer words.** Fan's target is at most eight words on screen at a time, phrased as one terse action ("Click on a seed packet to pick it up") **[S1]**. God of War Ragnarök's UI team found tutorials work at one or two steps, and that players skip ahead once a menu tutorial passes about seven steps **[S5]**.

**P6. Help only the players who need it.** Fan: tips appear only for players making the mistake, so skilled players "can feel smart" **[S1]**. Hollow Knight shows a prompt only if you are stuck at a skill gate for about 5 seconds; a common trigger is no movement for 5 to 10 seconds at the start **[S4]**.

**P7. No noise.** Every message must be "enlightening or entertaining", or players learn to ignore all of them **[S1]**. Messages should not stop play **[S1]**.

**P8. Spread mechanics out.** Plants vs. Zombies does not make money matter until after level 10 **[S1]**. Ragnarök hides UI slots until their system unlocks and holds some systems back to the mid-game on purpose **[S5]**. The onboarding plan attributed to Celia Hodent's practice at Epic: list everything a player must learn, rank by difficulty and importance, schedule when each is taught, teach the "why" through a situation that makes the player care, then watch players and adjust **[S6]**. Her GDC 2016 talk is organised the same way: remove barriers to discovery, use active tutorials, then motivation **[S7]**.

**P9. Training does not always stick; repeat it.** Portal re-teaches the fling because "player training doesn't always stick" (Chris Chin), and only removes the visual cue ("we take the training wheels off") at the end **[S2]**. Half-Life 2 repeats a task several times with slightly rising difficulty **[S3]**.

**P10. Get to the fun fast.** Sakurai: "players should understand why the game is fun in the first three minutes", and "if you make them wait too long, they might just put the game down". His RPG advice is to open on an exciting later moment or with a simplified first chapter, because an RPG cannot teach everything in minutes **[S8]**.

**P11. Tutorials teach rules, not strategy.** Adam Millard's argument: tutorials are fine for simple interactions and objective rules, bad for large amounts of data and for intuition. Combine three methods: discovery (small constrained challenges), research (information the player can look up in-game instead of on a wiki) and acclimation (slow, passive exposure) **[S9]**.

**P12. Optional tutorials get missed.** Elden Ring's tutorial cave was down a hole that many players walked past. Almost two months after launch, patch 1.04 added a pop-up: "Jump down the hole ahead, and you will find the Cave of Knowledge" **[S10]**. Critical verbs belong on the critical path.

**P13. Non-gamers lack conventions, not intelligence.** Write-ups of Razbuten's series report that his wife repeatedly missed features the games never stated because veterans already know them (a dash button, for example), and that Breath of the Wild worked best for her because of how it introduces new actions **[S11]** (LC: I could only read short summaries). Fan's tenth tip is the mirror image: lean on what players already know **[S1]**.

**P14. Watch real people.** Every source above got there by playtesting: Valve's commentary is a list of things playtesters did wrong **[S2]**; Fan's talk is about watching his mother **[S1]**; Poki's team removed an intro animation after a playtest **[S13]**.

## 1b. What the reference games actually do

| Game | First minutes, concretely | Lesson for Belfort |
|---|---|---|
| **Breath of the Wild** | You wake, walk out to a vista, and are on a plateau you cannot leave: the cliffs kill you until an old man trades you a paraglider for finishing four small shrines, each of which gives one tool and one puzzle about it. Cooking, cold and stamina are met on the way between them (obs). Critics call it a miniature of the whole game **[S14]**. | Fence the first area with the game's own rules, not a wall. Make the exit reward the thing that opens the world. |
| **Portal** | One idea per chamber; a gate after each; visual cues for hard moves, removed later; art stripped of clutter because "unnecessary objects... distracted players" **[S2]**. | Keep the first street and the first sky uncluttered. |
| **Half-Life 2** | The only text is key prompts for move, jump, shoot **[S3]**. Everything else is staged scenes. | A staged scene beats a sentence. |
| **Plants vs. Zombies** | Level 1 has one lane and one plant. A coin with a giant arrow teaches collecting in one click **[S1]**. | One verb, one obvious target. |
| **Hades** | No tutorial level. The first run starts at once; you die; the house and its characters are the reward (obs). Kasavin's stated aim was to "take the pain out of dying", so no run feels wasted **[S15]**. God Mode adds damage resistance that grows with each death (obs). | Make the first failure pay out story, and offer a quiet assist. |
| **God of War (2018)** | The opening fight is the tutorial. Barlog said players leave it knowing block, rage and the axe throw without it feeling like one **[S16]** (LC: read as a search summary). | Teach combat inside the first story fight. |
| **Elden Ring** | A boss you are meant to lose to, then an optional tutorial cave, then open world. The cave needed a pop-up after launch **[S10]**. | See P12. |
| **Celeste** | The prologue pauses the world until you dash **[S4]**. Assist Mode is offered with a short text, which was rewritten after players objected to its "intended experience" wording **[S17]**. | Word any assist offer without judging the player. |
| **Diablo** | Click, walk, kill; first quest right outside town (covered in the earlier docs). | Already applied. |
| **Mario (3D Land / 3D World)** | Each level follows introduce safely, develop, twist, conclude (kishōtenketsu), credited to director Koichi Hayashida **[S9][S18]** (LC on the exact wording). | Use the four beats for the first quest hub. |
| **Don't Starve** | Its 2012 free beta ran in the Chrome Web Store. Most new players struggled with the lack of guidance, and Klei added tutorials and kept adjusting from feedback **[S6]**. | A browser audience is less patient with "figure it out" than a Steam one. |

## 1c. Just-in-time prompts or a tutorial level?

The sources agree on a hybrid, and it fits Belfort:

1. **A skill-gated opening stretch that is part of the story** (P1, P3). For Belfort this is the first flight and the first landing.
2. **Contextual prompts after that**, shown only when a player stalls (P6), one at a time (P7), eight words or fewer (P5).
3. **A look-it-up layer** for everything else (P11): the controls page and the codex.
4. **An optional practice space** for depth only. Never put a verb the main quest needs behind an optional door (P12).

A separate tutorial level is the wrong tool here. It delays the fun (P10), it front-loads (P8), and Belfort's verbs are few.

## 1d. Should there be a "what this is / what it is not" screen?

**What good games do.** I found no well-regarded game that opens with a general "what this is / is not" screen. They set expectations in three other ways:

1. **By playing.** The opening is a miniature of the whole game: the Great Plateau **[S14]**, White Orchard (earlier doc).
2. **By a short statement only where a mismatch would hurt.** Darkest Dungeon opens with: "Darkest Dungeon is about making the best of a bad situation. Quests will fail or must be abandoned. Heroes will die." **[S19]** (the wording is sourced; that it appears before the title is (obs)). Its sequel warns about low odds in the first runs **[S19]**. Celeste explains Assist Mode in a few lines **[S17]**. These screens exist because the game breaks a genre promise, and each is under about 60 words.
3. **Outside the game.** Store pages, trailers and interviews do the rest.

**Why Belfort is a special case [inference].** A browser game has no store page. People arrive from a bare link, and Sakurai's three-minute rule (P10) applies before they have read anything. Belfort also breaks two promises its look makes: a dragon suggests fantasy and combat first, while the game is historical and talk-heavy; and "action RPG" suggests English, while the game is in Flemish.

**Recommendation.** Do not add a screen before the title. Put three short lines **on** the title screen, where the load already costs the player a few seconds, and never make them a gate:

> **Wat dit is:** een avontuur in het Brabant van 1650. Gij vliegt op een draak, landt in echte steden en beslist hoe hun zorgen aflopen.
> **Wat dit niet is:** geen jacht op eindeloze buit, geen multiplayer. Het is in het Vlaams, en het mag traag gaan.
> **Hoe lang:** een avond voor Diest en Scherpenheuvel. De rest van het hertogdom is in de maak.

That is under 60 words, the Darkest Dungeon length. Then let the first five minutes prove each line (section 1f).

## 1e. Browser specifics

- **Web games load when the player presses play**, not in advance, so load time is part of the first impression **[S13]**. In Poki's 2026 survey, 46% of web gamers had quit a mobile game because it was slow to open and 28% because the download was too large; the typical session is 11 to 20 minutes **[S21]**.
- **Perception thresholds** quoted by CrazyGames: under 100 ms feels instant, 1 s keeps flow, at 10 s attention wanders, so show progress or give the player something to do **[S12]**.
- **Load what the tutorial needs first** and keep loading the rest in the background while the player is already playing **[S12]**. CrazyGames measures load up to the first moment of real gameplay, not the first loading screen **[S12]**. Its limits are 50 MB initial download, 20 MB for the mobile homepage (as reported in search results; check the requirements page) **[S12]**.
- **Poki's worked example** (a 3D game on PlayCanvas) shipped at **2.4 MB in 76 requests** and converted **81%** of visitors to players. Poki calls above 70% solid and above 80% exceptional. Techniques: Draco mesh compression (3.88 MB to 387 KB for one model), Basis textures (406 KB to 46 KB for one sheet), fewer files, async loading, shader warm-up on the first frame, **no start menu**, an in-game tutorial, and an intro animation removed after a playtest **[S13]**.
- **Belfort today:** the title appears while the world loads, which is right. But the models alone are 16 MB, more than six times Poki's whole game. My estimate of the first-play download is 25 to 30 MB **[inference from file sizes; measure it]**.
- **Vendor heuristics (LC):** something exciting within 30 seconds, core play within 60 seconds, no early failure in the first minute **[S22]**. These are conventions, not research, but they match P10.
- **Things only a browser does [inference]:** the first click must also start audio and capture the mouse; Esc drops the mouse capture and looks like a freeze unless the pause screen says so; a tab switch should pause; a reload must resume from the save at once. Each is a place where a new player leaves.

## 1f. The first session, beat by beat (proposal)

All timings are **[inference]** targets built on P1 to P12. "Prompt" means the just-in-time prompt of R1.

**0 to 30 seconds: one click to the sky.**

| Time | What happens | Teaches | Source idea |
|---|---|---|---|
| 0 to 3 s | Title painting and the three expectation lines. The button reads "Begin" as soon as the first-flight assets are in. | What this is | 1d |
| Click | Two slides at most, about 20 s, each skippable: the bells fell silent; you and the dragon. | The hook | P10 |
| +20 s | Name and origin only (two fields). Cloak colour and dragon name move to an in-world moment later, with defaults filled in. | Who you are | earlier doc |
| +30 s | You are flying. The dragon holds speed and height by itself. No text. | That it is beautiful | P2 |

**30 seconds to 5 minutes: the guided first flight and the first landing.** One verb per beat, each with a gate.

| Beat | Staging | Gate (cannot pass without the verb) | Prompt, only if stalled |
|---|---|---|---|
| Steer | The Demer bends; the golden light sits round the bend. | The light is not straight ahead. | After 4 s with no steering: "Muis: sturen" |
| Climb | The squat tower of Sint-Sulpitius is in the way; the light is above it. | You must gain height. Assist: the dragon will not fly into the tower, it slows and noses up. | After 4 s below the line: "Spatie: stijgen" |
| Land | A wide landing circle on the Grote Markt; townsfolk scatter and shout. | The quest step is "land". Assist: any descent inside the circle becomes a clean landing. | Inside the circle: "E: landen" |
| Talk | The first quest giver stands within sight of the landing spot with a "!" (earlier doc). | The main quest starts here. | Within 4 m: "E: praten" |
| Decide | The first conversation has one real choice with a visible result within a minute. | Shows what kind of game this is. | none |
| Fight | One weak enemy, first seen where it cannot reach you (P4), then met alone. | It blocks the lane. | First time in range: "Linkermuis: slaan" |
| Dodge | Its heavy swing has a long wind-up (about 1.0 s, see the Dark Souls timing table in the earlier doc). | Not gated; adaptive. | On the first wind-up, and again only if you were hit: "Spatie: rollen" |
| Reward | First loot, first level-up, the first codex entry lands (section 2). | The loop | earlier doc |

**5 to 15 minutes: the whole game in miniature.** One side quest with a consequence, one shop visit, one discovery, and then the take-off to Scherpenheuvel with a new objective. End the session on a hook: a bell that should not be able to ring, rings.

**Introducing later verbs.** Skills, potions, the map, the journal, the character panel and calling the dragon each get their prompt the first time they are useful, never in the first two minutes (P8). Hide action-bar slots until they unlock **[S5]**.

## 1g. Recommendations for Belfort

| # | Recommendation | Impact | Effort |
|---|---|---|---|
| **O1** | **Just-in-time prompt system.** One component, bottom centre. One prompt at a time, queued. At most eight words: a key glyph and a verb. Each prompt has a trigger (context plus a stall timer of 3 to 5 s), a success condition, and a "learned" flag in the save. Retire a prompt after one unprompted use or two prompted ones. Re-show at most twice later if the player fails where the verb would have helped (P6). Never during dialogue. Show the glyph for the device last used (section 3). | high | M |
| **O2** | **Remove the opening wall of text.** Delete the three-instruction banner and stop showing the 11-row controls table at the start. Keep the table as a page in the pause menu and on H (P5, P7, P11). | high | S |
| **O3** | **Build the guided first flight** from 1f: three gates (steer, climb, land) with invisible assists, then talk, decide, fight, dodge. No failure is possible before the first landing. | high | M |
| **O4** | **Cut the pre-play story to two slides (about 20 s), skippable.** Move the other three into play: the beguine tells you what the bells hold back; the claw marks and river weed are found in the tower (section 2). The earlier research doc already set "at most 20 s, playable within 60 s"; the five slides break it. | high | S |
| **O5** | **Three expectation lines on the title screen** (1d). No separate screen. | medium | S |
| **O6** | **Put critical verbs on the critical path, depth in an optional yard.** A practice post in the schutters' yard for combos, parry and skills, offered by an NPC. Nothing the main quest needs is taught only there (P12). | medium | M |
| **O7** | **Load diet.** Compress the three character models (Draco or meshopt) and textures (KTX2/Basis); load the townsfolk kit and the walking-only assets while the player is on the first flight; load only the sky in use **[S12][S13]**. Target: title interactive in under 3 s on broadband, in the air within 60 to 90 s of the first click including creation **[inference]**. | high | M |
| **O8** | **Measure the funnel.** Log anonymous events: title shown, start clicked, creation done, first steer, first landing, first talk, first kill, 5 min, 15 min. Read the biggest drop first. Poki's benchmark for visit-to-play is above 70% **[S13]**. | high | S |
| **O9** | **Watch five people play the first ten minutes** without helping: at least two who do not play games (P13, P14). Write down every place they stop moving for more than 5 s; each is a missing prompt or a missing staging. | high | S |
| **O10** | **Fail softly in the first session.** The first death respawns you a few metres back with a line from an NPC, not a death screen. Offer an assist after the third death, worded without judgement **[S15][S17]**. | medium | S |
| **O11** | **Browser hygiene:** the pause overlay explains Esc and the mouse capture; tab-away pauses; reload resumes instantly; set `lang="nl-BE"` and a Flemish page title so browsers do not offer to translate the UI. | medium | S |
| **O12** | **Returning players** get one line of "last time" from the journal on the continue screen, then play **[inference]**. | low | S |

---

# 2. Making the lore present without lore dumps

## 2a. Diagnosis: why the lore feels absent

Belfort has good lore text. The problem is delivery **[inference from the code]**:

1. **It is front-loaded.** Five slides tell the premise before the player cares.
2. **It is shown once.** A discovery card fades after a few seconds, often while the player is busy flying. There is nowhere to read it again.
3. **It has one channel.** Cards and one-liners. Nothing in the streets, the items, the menus or the fights carries it.
4. **It does nothing.** Knowing that the beguines shut their gate at dusk changes no decision.

The fixes below map onto those four: move it into play, keep it, repeat it across channels, and make it useful.

## 2b. Principles

**L1. Let the player assemble the story.** Smith and Worch define environmental storytelling as "staging player-space with environmental properties that can be read as a meaningful whole". It works because it is active (the player infers, which builds investment), personal (players bring their own experience), and **pulled at the player's pace rather than pushed** **[S23]**. Their rules: stage a discernible chain of events; make it echo the game's premise; and avoid setups that make the player want to do something the game will not allow **[S23]**.

**L2. Let the world record what the player did.** Smith and Worch call this systemic environmental storytelling: decals, breakage and persistent changes, plus routes that bring the player back past them **[S23]**. Belfort's "a burnt market stall stays" rule (earlier doc) is this.

**L3. Four ways a space carries story** (Henry Jenkins): it evokes stories the player already knows, it stages events the player enacts, it embeds information to find, and it lets stories emerge from systems **[S24]**. A real Flemish town evokes for free; Belfort under-uses the other three.

**L4. Reactivity reads as life.** Kasavin's aim in Hades was moments where "the game is paying attention": "I try to acknowledge these little aspects of player behaviour" **[S15][S25]**. Characters comment on your weapon, your health, what you carry **[S25]**. The game checks the state of the run and picks one of several pre-written events that fits, with weights so some come up more often **[S15]**. Scale: 21,020 voiced lines, 305,433 words **[S26]**. Secondary analyses say most lines play once and a small repeating pool fills the gaps **[S26]** (LC).

**L5. Use a narrator for what cannot be shown.** Hades' narrator began as a budget fix for emotions the team could not animate. Its rule: "provide information that would never be available to the player in any other way", and never spell out the subtext **[S25]**. Belfort's first-person journal is the same device.

**L6. Fragments, not chapters.** FromSoftware puts its history in two or three lines on each item, and players piece it together. Miyazaki has said he leans on this partly because he is "not that good at" direct storytelling (as reported from a 2016 Wired interview); his long-time translator says the full lore probably exists only in Miyazaki's head **[S28]** (LC: second-hand).

**L7. A codex should fill in through play, and can be honest about the fiction.** Hades' Codex is a book a character gives you after a few runs; entries "become more complete" as you meet, talk to or kill their subjects, and finishing sets feeds achievements **[S27]**. Kingdom Come: Deliverance II's codex has 272 entries in six categories (General 90, Society 72, Crafts 36, Locations 35, Characters 31, Events 8); each has an unlock condition such as visiting a place, finding a kind of tradesperson, or reaching a quest. It sits outside the fiction, "will occasionally speak directly to the player", and explains where the game departs from history **[S29]**. Warhorse employs a full-time historian, Joanna Nowak, to push back on "quasi-Hollywood" readings of the period **[S30]**.

**L8. Short beats long.** Ubisoft's Discovery Tour team cut each tour from about 5,000 words to about 2,000 and aimed for about five minutes a tour, on teachers' advice. Each station frames one building or detail with a fixed camera, a narrated note and an image of a real artefact. About one station per tour is "Behind the Scenes": what was invented, what was reconstructed and why. Motto: "making history everyone's playground"; and do not treat players "like kids" **[S34]**.

**L9. Knowledge should change what you do.** In The Witcher 3 a bestiary entry appears after the first fight and lists the oils, signs and bombs that work, so reading is preparation **[S36]**. Books add entries before you meet the monster (obs). Most side quests there came from quest designers' own short pitches, culled by the team, and each was written to carry the mood of its region **[S35]**.

**L10. Typography can carry class and voice.** Pentiment has five scripts (peasant hand, scribe's cursive, humanist, monastic blackletter, printer's type) drawn from over 2,700 glyphs, so you see a speaker's education before you read a word. Text is written stroke by stroke. Sawyer said no feature took more time across departments, and that testers were confused when a character's font changed without explanation. There is an easy-read setting that uses one legible script for everyone **[S20][S31]**. Its glossary of people, places and terms is praised in reviews for explaining period words without lecturing **[S33]**; it opens from underlined words inside the dialogue and shows a short note in the page margin, so you never leave the conversation (obs).

**L11. Skills and background can speak.** Disco Elysium's 24 skills interject as voices through constant passive checks, so world knowledge arrives as a character's thought at the moment it matters **[S37]** (LC: fan and press analyses).

**L12. Track curiosity, not tasks.** Outer Wilds has no quest log; its ship log has a rumour mode that draws what you know as a web with question marks where more remains **[S38]** (LC). Breath of the Wild's stables hold travellers and "Rumor Mill" books that hint at places without marking them (obs). Ghost of Tsushima's villagers point to nearby content, capped at two hints per type (earlier doc).

## 2c. Techniques, with cost and a Belfort application

Costs assume the current codebase. "Words" are budgets I propose **[inference]**, in the spirit of Kaplan's 511-character quest cap (earlier doc), Fan's eight words **[S1]** and Ubisoft's cut from 5,000 to 2,000 **[S34]**.

| Technique | What it is | Why it works | Cost | Belfort, 1650 |
|---|---|---|---|---|
| **Staged vignette** | A small scene of props that reads as a chain of events **[S23]** | The player infers it, so it sticks (L1) | S each, once a kit of about 10 props exists | The silent belfry: clapperless bells, wet river weed on the bell frame, claw marks on the trapdoor, the ringer's cold supper. A cloth stall with a broken seal press. A deserters' camp using a tercio's colours as a blanket. A wayside shrine with fresh ex-votos and one muddy pilgrim badge. |
| **Persistent change** | The town keeps the marks of what you did **[S23]** | The world tells your story back (L2) | S to M per change | Bells ring again and people set their day by them; a banished widow's shutters stay closed; the stall you failed to save stays burnt. |
| **Item text as fragments** | Two lines per item: what it is, and one loose thread **[S28]** | Read in a quiet moment; rewards attention (L6) | S (the `text` field exists) | "Pelgrimsinsigne. Tin, zevenhoekig als de kerk op de Scherpenheuvel. Dit hier ruikt naar de rivier." Budget: 25 words. |
| **Reactive barks** | Lines with conditions, a priority, and "say once" **[S15][S25]** | Feels like being noticed (L4) | M for the system, then S per 20 lines | Conditions: bells silent or ringing, hour, weather, dragon landed nearby, your last quest outcome, your origin, your renown. Start with 150 lines: 10 roles times 15. |
| **Codex that fills in** | Entries unlock and deepen through play **[S27][S29]** | Lore persists and becomes a collection (L7) | M | The **Kroniek**, a tab in the journal. See R-L1. |
| **Bestiary with a use** | Creature entries that give a combat edge **[S36]** | Reading becomes preparation (L9) | S on top of the codex | The Kludde: first a rumour ("men hoort kettingen"), then after a fight what reveals him (the high bell), then after five a small damage bonus. Will-o'-the-wisps: do not follow, ring the low bell. |
| **Inline glossary** | Underlined period words with a one-line note in place **[S33]** | Removes the fear of not knowing; never leaves the scene (L10) | S to M | drossaard, schepen, begijn, lakenhal, stuiver, tercio, placcaet, schuttersgilde. About 60 terms at 20 words each. |
| **"Waar of verzonnen?"** | A plain note on what is history and what is invented **[S29][S34]** | Builds trust; satisfies the "this really happened" player | S per entry | One line at the foot of each Kroniek entry: a quill for the chronicle, a candle flame for "men zegt". The vision doc already says legends are told as legends. |
| **Station view** | On discovery, hold the camera on the landmark while the note shows **[S34]** | Ties the words to the thing | S to M | When on foot and safe, a 3-second framed view of the tower or gate with its card. Skippable. Never in flight or combat. |
| **Rumours** | Hearsay that points without marking **[S38]** | Curiosity pulls the player (L12) | M | Pilgrims at Scherpenheuvel are the rumour mill (design doc). A rumour becomes a journal line with a direction in 1650 terms ("voorbij de Koepoort"). Resolving it writes a Kroniek entry. Hold at most two per kind. |
| **Readables** | Short texts found in the world (books in Skyrim raise a skill, obs) | Optional depth with a small payoff | S each | An edict nailed to the town hall door, a guild rule, an almanac page, ex-voto tablets, a smuggler's tally. 120 words at most. Each gives a little renown, a map mark or a Kroniek entry. |
| **Dead-time lore** | One line on loading and death screens (Skyrim does this, obs) | Uses time the player is already giving | S | Replace the rotating "pigments are being ground" lines with a fact about the place you are loading into. 20 words. |
| **Origin voice** | Your background adds a line of inner knowledge **[S37]** | Makes lore personal and makes the origin matter (L11) | S to M | At each discovery, one extra line by origin: the bell-ringer's child knows the bell's name and note; the schutter knows who garrisons the gate; the smuggler knows which door is unwatched. 20 cards times 3 origins is 60 short lines. |
| **Collectibles that pay** | A set whose pieces are lore and whose completion is a reward (earlier doc) | Gives explorers a reason | M | Pilgrim badges, one per shrine or chapel. Each is a Kroniek entry; a full town set gives a blessing. The design doc rules out empty collectibles, so every piece must carry text and the set must pay. |
| **Sound as lore** | The world's sounds carry meaning | Constant, wordless presence | S to M | Each tower's bell has a name and a pitch; the hour is rung; a town with silent bells sounds wrong. This is already the main story. Make it audible from the first minute. |
| **Street and place names** | Show the historical name of where you stand **[inference]** | Real names are lore | S | The location line already exists. Add street names on foot (Ketelstraat, Koepoort) from the map data. |

## 2d. Recommendations for Belfort

| # | Recommendation | Impact | Effort |
|---|---|---|---|
| **L-R1** | **The Kroniek (codex).** A tab in the journal with six shelves: *Plaatsen*, *Volk en standen*, *Ambachten en gilden*, *Geloof*, *Oorlog en vrede*, *Wezens en sagen*. Each entry has up to three tiers of 60 words at most. Tier 1 is the existing discovery text, so the first 20 entries are free. Tier 2 unlocks by talking to a local or finishing a quest there. Tier 3 unlocks by finding its secret. Every discovery card ends with "Opgetekend in de Kroniek" and a short sound; the journal key pulses once. A shelf shows "7 van 12". A finished shelf pays a small permanent reward **[S27][S29]**. | high | M |
| **L-R2** | **Inline glossary.** Underline period terms in dialogue, journal and Kroniek text. Hover or a pad button shows a note of 20 words at most in the panel margin. First reading adds the term to the Kroniek. Store terms in one table so writers only tag words **[S33]**. | high | S to M |
| **L-R3** | **Move three of the five slides into the world** as a vignette (the belfry), a conversation (the beguine on what the bells hold back) and a journal line (L1, L5). Pairs with O4. | high | M |
| **L-R4** | **Reactive bark system.** Each line has `when` conditions on world flags, a `priority`, and `once`. Pick the highest-priority eligible unsaid line; fall back to a small repeating pool. Keep the earlier doc's limits (6 m, one bark at a time, 20 to 30 s cooldown). Write the first 150 lines so that at least a third mention a real 1650 fact and a third react to the player **[S15][S25]**. | high | M to L |
| **L-R5** | **Item text pass.** Rewrite every item to the two-line template in 2c, 25 words at most. Cross-reference three or four items so a careful reader spots the trail before the quest says it **[S28]**. | medium | S |
| **L-R6** | **Bestiary tiers with a combat use** for the Kludde, the wisps, deserters and drowned ringers **[S36]**. Tier 1 can come from a rumour or a book before the first fight. | medium | S (after L-R1) |
| **L-R7** | **Ten staged vignettes in Diest and Scherpenheuvel**, each a chain of three to five props that echoes the premise (river water where it should not be) **[S23]**. Build the prop kit first. | medium | M |
| **L-R8** | **"Waar of verzonnen?" line on every Kroniek entry**, written in the developers' voice, as KCD's codex and Ubisoft's Behind the Scenes stations do **[S29][S34]**. | medium | S |
| **L-R9** | **Origin voice lines** on discoveries and at five or six dialogue moments **[S37]**. | medium | S to M |
| **L-R10** | **Rumours from pilgrims**, tracked as journal lines without markers, capped at two per kind **[S38]**. | medium | M |
| **L-R11** | **Dead-time lore**: location-aware one-liners on the loading and respawn screens. | low to medium | S |
| **L-R12** | **Readables**: twelve short documents across the two towns, each with a small payoff. | low to medium | S each |
| **L-R13** | **Text budgets as lint rules** in the content build: card 50 words, Kroniek tier 60, item 25, bark 12, glossary 20, prompt 8. Fail the build when a line is over **[inference]**. | medium | S |
| **L-R14** | **A lore fact that changes a decision in every quest.** The beguines' gate shuts at dusk; the toll is paid at the Tienen gate; markets run on market day. Design rule 5 in `gameplay.md` already asks every quest to "teach the world"; make the lesson something the player must use (L9). | high | per quest |


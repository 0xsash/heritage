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

## What the game did when this research started (baseline, read from the code)

These facts drive the recommendations. The code moved while this was being written; see the update below the table.

| Area | At the start of this research | Where |
|---|---|---|
| Before play | Title, then five narrated story slides, then character creation. The world loads behind them. | `src/ui/creation.ts` |
| First seconds of play | You start in the air. One banner carries three instructions in one sentence (follow the light, E to land, left mouse breathes fire, H shows controls). An 11-row controls table is on screen for the first 30 s. | `src/main.ts`, `src/ui/hud.ts` |
| Lore | About 20 discovery texts of 35 to 50 words each, well written, shown once on a card at the top of the screen and never again. Items have one `text` field. Townsfolk say one-liners. There is no codex, glossary or bestiary. | `src/world/lore.ts`, `src/rpg/types.ts` |
| Type | EB Garamond and Cinzel. The stylesheet uses 22 different font sizes, some in half pixels (10, 10.5, 11, 11.5 ... 30). 43 declarations are 13 px or smaller and 83 are under 16 px. | `src/ui/style.css` |
| HUD | Compass, three-quest tracker, location line, player frame (name, life, resonance, action slots with text labels, XP), waypoint, prompts, toasts, banners, attribution line. All always on. | `src/ui/gamehud.ts`, `src/ui/style.css` |
| Motion and sound | Fades of 0.15 s to 1.1 s with the default `ease`. No UI sounds except a chime. No `prefers-reduced-motion` handling. | `src/ui/style.css` |
| Download | `public/` is 38 MB: models 16 MB (townsfolk 6.8, dragon 5.2, rider 4.0), textures 9.3 MB, skies 5.8 MB, world data 7.2 MB. The JS bundle is 1.1 MB before compression. | `public/`, `dist/` |
| Page | `<html lang="en">` and the title "Belfort — Flight over Diest", although the game is in Flemish. | `index.html` |

### Update: work that landed while this was being written

Other sessions changed the code during this research. Read at 20:15 on 2026-11-12, the tree already contained a hint system, a Kroniek, readable notices and a "this is / this is not" screen. I reviewed them against the findings below. The recommendations in sections 1 to 3 still describe the full target; this table says what is already there and what is still open.

| New code | What it already does | Still open, by the evidence in this doc |
|---|---|---|
| `src/ui/tutorial.ts` (14 hints) | One hint at a time, cleared the moment the player does the thing, a tick on success, `tut_*` flags in the save, keyboard and pad labels, a pause between hints. The opening banner is now one line and the controls table no longer opens by itself. This covers most of O1 and all of O2. | **No stall timer.** A hint shows as soon as its situation is true, even if the player is already doing it. Wait 3 to 5 s first, and mark it learned silently if the player does it unprompted (P6). **Three flight hints run back to back** (steer, speed, climb) with nothing in the world asking for them; speed is not needed in the first minute, so hold it for the second flight (P3, P8). The gated first flight (O3) is not built. **Six texts are over eight words** (P5); suggested trims: land "Daal boven het plein en land"; talk "Spreek wie een gouden ! draagt"; attack "Sla toe. Drie slagen vormen een reeks"; dodge "Gloeit hij rood? Rol weg"; mount "Ver weg? Roep {dragon} en vlieg"; book "Uw dagboek en de Kroniek". **No second showing after a failure**, e.g. dodge again after two telegraphed hits (P6, P9). **Key labels are hard-coded**, not read from bindings (U-R7). |
| `src/rpg/kroniek.ts`, `src/ui/kroniekui.ts` | Four shelves (Plaatsen, Tijd en zeden, Mensen, Wezens). Entries unlock by reaching a place, meeting a person, a first kill, or reading a notice. Each carries a label: Geschiedenis, Volksverhaal or Verzonnen. Locked entries show where to look. A count ("x van y"), a progress bar, milestones and rewards. This covers the core of L-R1 and all of L-R8. | **Entries have one tier.** Deepening entries on repeat contact is what makes Hades' codex a reason to return (L7). **I saw no combat use in creature entries** (L-R6). **No inline glossary** (L-R2). **No origin voice** (L-R9). |
| `src/rpg/readables.ts` | Notices, stones, the pillory and the cannon can be read; unread ones carry a gold scroll mark; reading unlocks an entry. This starts L-R12. | Word budgets as lint (L-R13); staged vignettes (L-R7). |
| The "DIT IS / DIT IS NIET" screen in `src/ui/creation.ts` | First-time visitors get it in place of the title: the BELFORT heading, six bold-led lines in two columns (about 75 words), and one button, "Begin uw verhaal". Returning players get the normal title, with a "wat is dit?" link. It says honestly that this is a first chapter of about an hour, and that the Kroniek marks what is real. This is close to what section 1d recommends: one screen, not a gate in front of a second one. | **Five slides still follow it**, so a newcomer reads about 75 words and then five narrated slides before touching the game (P10, O4). **Trim it** towards the 60 words of the Darkest Dungeon screen. **It promises "vecht, verdien, word sterker" and does not mention choices**, which `gameplay.md` calls the heart of the game; a player who came for loot will find a talk-heavy game. **Log how many visitors leave on this screen** (O8). |
| `src/ui/style.css` | New rules for the above. | The type findings stand: 120 pixel font-size declarations, 22 distinct sizes, 83 under 16 px. No timing tokens, no `prefers-reduced-motion`. |

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

That is under 60 words, the Darkest Dungeon length. Then let the first five minutes prove each line (section 1f). A first-visit screen of this kind was built while this doc was being written; the update near the top compares it with this recommendation.

## 1e. Browser specifics

- **Web games load when the player presses play**, not in advance, so load time is part of the first impression **[S13]**. In Poki's 2026 survey, 46% of web gamers had quit a mobile game because it was slow to open and 28% because the download was too large; the typical session is 11 to 20 minutes **[S21]**.
- **Perception thresholds** quoted by CrazyGames: under 100 ms feels instant, 1 s keeps flow, at 10 s attention wanders, so show progress or give the player something to do **[S12]**.
- **Load what the tutorial needs first** and keep loading the rest in the background while the player is already playing **[S12]**. CrazyGames measures load up to the first moment of real gameplay, not the first loading screen **[S12]**. Its limits are 50 MB initial download, 20 MB for the mobile homepage (as reported in search results; check the requirements page) **[S12]**.
- **Poki's worked example** (a 3D game on PlayCanvas) shipped at **2.4 MB in 76 requests** and converted **81%** of visitors to players. Poki calls above 70% solid and above 80% exceptional. Techniques: Draco mesh compression (3.88 MB to 387 KB for one model), Basis textures (406 KB to 46 KB for one sheet), fewer files, async loading, shader warm-up on the first frame, **no start menu**, an in-game tutorial, and an intro animation removed after a playtest **[S13]**.
- **Belfort today:** the title appears while the world loads, which is right. But the models alone are 16 MB, more than six times Poki's whole game. My estimate of the first-play download is 25 to 30 MB **[inference from file sizes; measure it]**.
- **Vendor heuristics (LC):** something exciting within 30 seconds, core play within 60 seconds, no early failure in the first minute **[S22]**. These are conventions, not research, but they match P10.
- **Things only a browser does [inference]:** the first click must also start audio and capture the mouse; Esc drops the mouse capture and looks like a freeze unless the pause screen says so; a tab switch should pause; a reload must resume from the save at once. Each is a place where a new player leaves.

## 1f. The first session, beat by beat (proposal)

All timings are **[inference]** targets built on P1 to P12. "Prompt" means the just-in-time prompt of O1.

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

**L9. Knowledge should change what you do.** In The Witcher 3 a bestiary entry appears after the first fight and lists the oils, signs and bombs that work, so reading is preparation **[S36]**. Books add entries before you meet the monster (obs). Most side quests there came from quest designers' own short pitches, culled by the team; the Bloody Baron line was written to carry the mood of its region, Velen **[S35]**.

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
| **Codex that fills in** | Entries unlock and deepen through play **[S27][S29]** | Lore persists and becomes a collection (L7) | M | The **Kroniek**, a tab in the journal. See L-R1. |
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

---

# 3. A slick game UI and HUD

## 3a. Principles

**U1. Know the four kinds of UI and choose on purpose.** Fagerholt and Lorentzon's thesis sorts every element by two questions: is it in the fiction, and is it in the 3D space? **[S39]**

| Kind | In fiction | In space | Example | Belfort today |
|---|---|---|---|---|
| Diegetic | yes | yes | Dead Space's health bar on the suit's spine | bells telling the hour; smoke over a camp |
| Meta | yes | no | blood on the screen edge | the red hurt vignette |
| Spatial | no | yes | a glowing trail on the ground | the pillar of light, the "!" over heads |
| Non-diegetic | no | no | a classic HUD | compass, tracker, bars, slots |

The guidance that comes with it: use diegetic where it stays legible; fall back to non-diegetic when the others would cost clarity or consistency **[S39]**.

**U2. Simplify and hide.** Dino Ignacio (Dead Space): show only what the player needs at this moment, keep everything "one click away", "Simplify and hide", after Dieter Rams's "Less, but better" **[S40]**. Sucker Punch's Jason Connell: every HUD element has a purpose, which is why removing one is hard **[S53]**. Max Pears: a HUD is a layer between player and world, so ask how each element could be grounded in the world before copying the standard layout **[S50]**. Riot's UI guide: information "only when you need it"; good UI goes unnoticed **[S57]**.

**U3. Let the HUD change with what the player is doing.** Horizon Zero Dawn lets each element be always on, shown only when relevant, or off **[S52]**. God of War (2018) has an "Immersive" HUD mode and per-element toggles **[S52]**. Elden Ring's HUD comes and goes as needed **[S52]**; it has an "Auto" setting (obs).

**U4. One message at a time.** God of War Ragnarök splits its HUD into a combat HUD (bottom left: abilities, health, rage) and a "companion" HUD for everything else (area names, quest and journal updates, item ticker). All messages go through a single queue so only one shows at once; the team's planned improvement is one queue per screen region, because a long queue is slow to drain **[S5]**. The queue also yields to pause, cinematics, vendors and higher-priority messages **[S5]**.

**U5. Painterly does not survive small sizes.** Diablo IV's team started with painterly item icons and dropped them: the style "doesn't come across as well when we're talking about small elements in the UI". They also made icon backgrounds less bright and less saturated and added border shapes as a second cue for rarity, so colour is not the only signal **[S41]**. This matters directly for a Flemish Masters art direction: paint the backgrounds and panels, not the 32 px icons.

**U6. Put the action bar where the eyes are.** Diablo IV moved its PC default back to bottom centre after tests; players who sit far from the screen preferred the corner, so consoles got the corner and PC got the choice **[S41]**.

**U7. One layout for mouse and pad.** Supporting both at once pushed Diablo IV to grid-based layouts that a stick can walk, with mouse conventions kept on top; every skill slot can be rebound on both devices **[S41]**. Ignacio: "A lot of UI is designed with the mouse in mind. It never translates" **[S40]**.

**U8. Style is allowed to be loud, but it must be tuned until it reads.** Persona 5's director says its menus were "impossible to read at first" and took much adjusting; the team kept one accent colour (red) and used strong lines to steer the eye **[S49]**. Edd Coates (Game UI Database) contrasts Persona 5, where the UI is the visual identity, with Breath of the Wild, where thin transparent panels keep attention on the world **[S47]**. Belfort is the second kind in play and can be the first kind in its menus **[inference]**.

**U9. Type is a voice, and needs a plain fallback.** Pentiment's scripts signal class and education, with an easy-read option that swaps them for one legible script **[S20][S31]**. Xbox's guideline: any stylised font needs a non-stylised alternative **[S42]**.

**U10. Systems and UI are one design.** Ragnarök's enchantment menu took four iterations to balance clarity against density; the team hides slots until their system unlocks **[S5]**. Josh Bycer on X-COM: repeat key numbers on the screen where the decision is made so players do not flip between screens, add tooltips for every icon, and a second, fuller tooltip on a longer hover **[S51]**.

**U11. Motion should be short and eased.** Nielsen Norman Group: most UI animation belongs between 100 and 400 ms; about 100 ms for simple feedback, 200 to 300 ms for a panel or modal entering, up to 400 ms for large moves, and 500 ms starts to feel like "a real drag". Entering can be slightly longer than leaving (300 ms in, 200 to 250 ms out). Never linear; ease-out for things arriving, ease-in for things leaving. The more often an animation is seen, the shorter and subtler it should be. Respect "reduce motion" **[S46]**.

**U12. Readable by default, adjustable by the player.** See the numbers in 3c **[S42][S43][S44][S45]**.

## 3b. References for a painterly, historical look

| Game | What to take | Source |
|---|---|---|
| **Pentiment** (1518) | The whole UI is a book: manuscript and woodcut references, scripts by class, text written stroke by stroke, a glossary in the margin, an easy-read mode. Art and text were developed together by a team of about 13. | **[S20][S31][S32]** |
| **Kingdom Come: Deliverance** (1403) | A codex in an illuminated style that talks to the player and admits its liberties; a historian on staff. Its interface was made to fit the setting "right down to the UI". | **[S29][S30]**; the UI remark is from a 2017 preview (LC) |
| **The Witcher 3** | A cautionary tale as much as a model: the menus were overhauled a year after launch with the Blood and Wine update because the originals were hard to use. | **[S56]** |
| **Diablo IV** | Dark, desaturated panels; icons derived from 3D models rather than painted; rarity by border shape as well as colour; action bar position as an option. | **[S41]** |
| **Hades** | A reference for clarity under pressure and for reactive text. I found no primary source on its UI; reviewers credit its panel framing for making dense information manageable. | (LC) |
| **Ghost of Tsushima** | Almost no HUD outside combat; guidance moved into the world. | **[S53]**, earlier doc |
| **Elden Ring** | A HUD that fades when idle; sparse corner elements. | **[S52]** |
| **Persona 5** | One accent colour, bold shapes, motion as identity, and the warning that it was unreadable until tuned. | **[S49]** |
| **Breath of the Wild** | Thin, translucent panels that never compete with the landscape. | **[S47]** |
| **Disco Elysium, Octopath Traveler** | Painterly panels with clean type on top (obs). I did not find sources worth citing. | (obs) |

**Where to look at screenshots.** Game UI Database (gameuidatabase.com) holds screenshots from over a thousand games, filterable by screen type (the filters are (obs)); it was built by UI artist Edd Coates because tight milestones leave teams no time for reference research **[S47]**. Interface In Game (interfaceingame.com) is a similar library with video clips of menus in motion **[S48]** (obs: I did not fetch it).

**An art-direction point the references miss [inference; general knowledge, not from a fetched source].** Pentiment and Kingdom Come borrow from manuscripts and woodcuts because they are set in 1518 and 1403. Belfort is set in 1650, which is the age of copperplate engraving and the Antwerp print shop. The matching visual language is the engraved town atlas (Blaeu's town books of 1649, Sanderus's *Flandria Illustrata* of 1641 to 1644), the emblem book, the cartouche, and Plantin-Moretus typography. That gives the UI its own look instead of a copy of Pentiment: engraved line icons with hatching, cartouche frames, map-style compass roses, ruled borders, and a Garamond text face (the Plantin press used Garamond's types, so EB Garamond is already right). Paintings by the Flemish Masters then sit *behind* the UI as backgrounds, where U5 says paint belongs.

## 3c. Numbers

### Size and contrast

| Rule | Number | Source |
|---|---|---|
| Minimum default text height on PC at 1080p (lowest descender to highest ascender) | 18 px (26 px on console; 36 px on PC at 4K) | **[S42]** |
| Player text scaling | up to 200% without losing content | **[S42]** |
| Line spacing in paragraphs | 1.5 times | **[S42]** |
| Line length | 80 characters at most | **[S42]** |
| Case | offer sentence case; all caps only for labels of one or two words | **[S42]** |
| Alignment | avoid centred or justified blocks | **[S42]** |
| Contrast, normal text and icons | 4.5:1 | **[S43]** |
| Contrast, large text (36 px and up on PC at 1080p) and disabled items | 3:1 | **[S43]** |
| Text over the game world | measure against the worst part of the background; offer a solid backing with adjustable opacity | **[S43]** |
| High-contrast mode | 7:1 | **[S43]** |
| Colour | never the only carrier of information | **[S43][S44]** |
| Dialogue and subtitles: characters per line | about 38 | **[S45]** |
| Dialogue and subtitles: lines | 2, exceptionally 3 | **[S45]** |
| Subtitle size by broadcast standards | 46 px at 1080p (TV distance); 28 px is a 10-foot minimum for any text | **[S45]** |
| Subtitle backing | a dark box at about 50% opacity by default, with an outline as a minimum | **[S45]** |
| Reading time | 2 to 2.5 s per line; a single word at least 1 s | **[S45]** |
| Speaker | show the name when it is not obvious | **[S45]** |

**What this means in CSS pixels [inference].** A desktop player sits close, so the PC figure applies. A 16 px font has a body height of roughly 18 px, so treat **16 px as the floor for anything meant to be read** and 13 px as the floor for short, letter-spaced, all-caps labels. Belfort has 83 declarations under 16 px, 43 of them at 13 px or less, and 22 distinct sizes where six would do. Set the root size from the viewport so 1440p and 4K scale up, and add a text-size setting (100, 125, 150, 200%).

Proposed scale: 13 (labels only) / 16 (body, tracker, tooltips) / 18 (dialogue) / 22 (panel titles) / 28 (banners) / 40 and up (discovery titles).

### Motion and timing

Values in the first three rows are from **[S46]**; the rest are **[inference]** defaults that follow from it.

| Use | Duration | Easing |
|---|---|---|
| Button press, hover, tick, counter change | 80 to 120 ms | ease-out |
| Tooltip, prompt, tracker line in | 150 to 200 ms | ease-out |
| Panel or menu open | 220 to 300 ms | ease-out |
| Panel or menu close | 150 to 220 ms | ease-in |
| Banner in / hold / out | 300 ms / 2.5 to 3.5 s / 250 ms | ease-out / ease-in |
| Discovery card in / hold / out | 500 ms / 2.5 s per line of text / 400 ms | ease-out / ease-in |
| HUD group fade out when idle | 400 ms, after 4 s without change | ease-in |
| HUD group fade in when needed | 120 ms | ease-out |
| Tooltip delay | 300 ms; fuller tooltip after about 1 s **[S51]** | none |
| Reduced motion | replace movement with a fade of 100 ms or less; no shake, no parallax | none |

As CSS tokens: `--t-1: 100ms; --t-2: 180ms; --t-3: 260ms; --t-4: 400ms; --ease-out: cubic-bezier(.2,.8,.2,1); --ease-in: cubic-bezier(.4,0,1,1);`. Animate only `opacity` and `transform`.

### How much on screen

No source gives a hard number. The practice in the references is that exploration shows two to four small groups and combat adds two or three **[S5][S52][S53]**. A budget for Belfort **[inference]**:

| State | Shown | Hidden |
|---|---|---|
| Flight | compass, one tracked objective line, prompt | life and action bar unless hurt or attacking; XP; location line except on change |
| On foot, calm | compass, tracker (the focused quest; the other two on a key), prompt | life bar if full; action bar dims to 40% |
| Combat | life, resonance, action bar, enemy bars, threat arrows | tracker collapses to a title; compass dims |
| Dialogue or panel | the panel only | everything else (already done through `ui-open`) |

### Sound

No authoritative source; practitioner guidance (LC) **[S54]**:

- Hover is near-silent or silent; only commitments (confirm, toggle, buy) get a present sound.
- Forward actions rise in pitch; back and cancel fall.
- All UI sounds come from one family and sit under the game mix (one guide suggests about 6 dB below). Tune them to the key of the music.
- Belfort **[inference]**: build the family from the world: a quill scratch for journal writes, a page turn for panels, a small hand-bell tick for confirm, a coin for trade, a wax-seal press for quest complete. Vary pitch by a few percent so repeats do not grate (the earlier doc's rule for hit sounds).

### Input glyphs

Practice, not a standard (LC) **[S55]**: one component draws every prompt; it reads the current binding, so remapped keys show correctly; it switches between keyboard and pad art on the last device used; it is used in menus as well as in play. Free glyph sets exist (Kenney's Input Prompts and Xelu's controller prompts are both CC0, obs).

## 3d. Common mistakes

| Mistake | Seen in | Fix |
|---|---|---|
| Text too small for the screen distance | God of War (2018); Ragnarök added scaling up to XX-Large and dynamic layouts to fix it **[S5]** | U12; scale from the root |
| Style before legibility | Persona 5's first drafts **[S49]**; painterly icons in Diablo IV **[S41]** | U5, U8 |
| Decorative type with no fallback | Pentiment testers confused by font changes **[S20]** | U9 |
| Everything always on | the usual open-world HUD **[S50]** | U2, U3 |
| Several notices at once | **[S5]** | U4 |
| Custom icons with no labels | X-COM **[S51]** | tooltips on everything |
| Key numbers on another screen | X-COM's five screens to pick a squad **[S51]** | compare in place |
| Mouse-only layouts | **[S40][S41]** | U7 |
| Colour as the only signal | rarity colours **[S41]**, red and green states **[S44]** | add shape or text |
| Menus that need a manual | The Witcher 3 before its overhaul **[S56]**; menu tutorials beyond seven steps **[S5]** | U10 |
| Animations that are slow or linear | **[S46]** | U11 |
| Settings that are not saved | **[S44]** | persist every option |

## 3e. HUD and UI audit checklist

Answer yes or no for each screen and each HUD state.

**Hierarchy**
1. Can a new player say what the single most important thing on screen is within two seconds?
2. Is there exactly one accent colour for "act here", and is red reserved for danger and life?
3. Does each state (flight, on foot, combat, dialogue) show only its budget from 3c?
4. Does every persistent element change at least once a minute? If not, should it fade?
5. Is only one notice visible at a time, with a queue and priorities?

**Legibility**
6. Is all reading text at least 16 px at 1080p, and does it scale with the viewport?
7. Does all text pass 4.5:1 (3:1 for large) against the worst background it will meet, including a bright sky?
8. Does text over the world have a backing plate or a strong outline?
9. Are lines 80 characters or fewer, with 1.5 line spacing in paragraphs?
10. Are all-caps and wide letter-spacing used only for labels of one to three words?
11. Is there a plain-font option for any decorative script?

**Consistency**
12. One icon style, one stroke weight, one corner treatment, one border colour?
13. Does the same action use the same key, glyph and word everywhere?
14. Do all panels open, close and scroll the same way with mouse, keys and pad?
15. Do icons carry rarity or state by shape as well as colour?
16. Are all durations and easings taken from the token list?

**Feedback**
17. Does every press give a visible response within 100 ms?
18. Does every commitment have a sound, and every hover either none or nearly none?
19. Does progress show the moment it happens (the earlier doc's Kaplan rule)?
20. Does every icon have a tooltip, and every stat a comparison in place?

**Input**
21. Do prompts show the last-used device and the current binding?
22. Can every screen be used with a pad alone and with a keyboard alone?
23. Can keys be remapped, and is the choice saved?

**Accessibility and comfort**
24. Text size, HUD mode (full, dynamic, minimal), screen shake, and reduced motion in settings, all saved?
25. Does `prefers-reduced-motion` switch off movement by default?
26. Is no information carried by colour or by sound alone?
27. Can the player advance all text at their own pace, with no timed reading in dialogue?
28. Are effects, music and voice on separate volume sliders?

**Fit to the fiction**
29. Would this panel look at home in a 1650 print shop?
30. Could any non-diegetic element become a sound, a sight or an NPC line instead?

Most of items 22 to 28 come from the "basic" tier of the Game Accessibility Guidelines **[S44]**; reduced motion is my addition, from **[S46]**.

## 3f. Recommendations for Belfort

| # | Recommendation | Impact | Effort |
|---|---|---|---|
| **U-R1** | **Typography pass.** Collapse the 22 font sizes to the six-step scale in 3c. Raise every reading size to 16 px or more; keep 13 px only for short caps labels. Drive sizes from a root `clamp()` so high-resolution screens scale. Add a text-size setting. Use weight 500 or 600 for HUD text over the world. Dialogue at 18 px, about 38 characters by two lines per beat where possible. | high | S |
| **U-R2** | **HUD state machine** with four states and the budgets in 3c. Each group has `always`, `dynamic` or `off`; default to `dynamic`. Fade rules from the timing table. Add a "minimal" preset. | high | M |
| **U-R3** | **One notice queue.** Banners, discovery cards, toasts, loot, level-ups and Kroniek notes go through one queue with priorities and a top-centre slot; a second, small slot at the right edge for quiet ticks (item gained, entry added). Nothing shows during dialogue; queued items are merged ("3 nieuwe aantekeningen") if the queue is long **[S5]**. | high | M |
| **U-R4** | **Design tokens.** Colours, type scale, spacing (4 px grid), radii, borders, durations and easings as CSS variables; replace the ad-hoc values. This alone removes most of the "not slick" feeling, which usually comes from small inconsistencies **[inference]**. | high | S to M |
| **U-R5** | **Engraved icon set.** One SVG family for action slots, items, map and markers: single-colour line with hatching, 2 px stroke at 32 px, drawn on a 24 px grid. Replace the text labels in action slots with icons plus the key glyph; put the name in a tooltip. Rarity by frame shape as well as colour **[S41]**. | medium to high | M |
| **U-R6** | **Motion and sound pass.** Apply the timing table; add press, open, close, confirm, cancel, quest-update and entry-added sounds from one family; honour `prefers-reduced-motion` and add a toggle. | medium | S to M |
| **U-R7** | **Input glyph component** shared by prompts, the action bar, menus and the controls page; switches on last device; reads remaps **[S55]**. Needed by O1. | medium | S |
| **U-R8** | **Tooltips everywhere**, with a 300 ms delay and a fuller version after about 1 s; item tooltips compare against what is equipped, in place **[S51]**. | medium | S to M |
| **U-R9** | **Panels as printed pages.** Journal, Kroniek, shop and character sheet share one frame: paper tone, ruled border, cartouche title, drop capital on entries, a painted background behind at low contrast. Open in 260 ms with a slight scale from 0.98. | medium | M |
| **U-R10** | **Action bar options:** bottom centre by default, corner as an option; hide slots until unlocked instead of showing them locked **[S5][S41]**. | low to medium | S |
| **U-R11** | **Settings screen** with text size, HUD mode, shake, reduced motion, volumes, key remap, plain font; all saved **[S44]**. | medium | M |
| **U-R12** | **Run the checklist in 3e** on every screen after each of the above and log the answers next to the critic rounds. | medium | S |

---

# 4. Top 15 changes, ranked

Ranked by impact over effort, across all three topics. The order is my judgement **[inference]**; the evidence for each is in the section named.

| Rank | Change | Fixes | Impact | Effort | Detail |
|---|---|---|---|---|---|
| 1 | **Remove the opening text wall and add just-in-time prompts**: one at a time, eight words, shown only when the player stalls, retired once learned, with device-correct glyphs. | onboarding, UI | high | M | O1, O2, U-R7 |
| 2 | **Build the guided first flight**: steer, climb, land as three gates with invisible assists, then talk, decide, fight, dodge, reward inside five minutes. | onboarding | high | M | O3, 1f |
| 3 | **Cut the story slides from five to two (about 20 s), skippable**, and move the rest into a vignette, a conversation and a journal line. | onboarding, lore | high | S to M | O4, L-R3 |
| 4 | **The Kroniek**: a codex in the journal seeded from the 20 existing discovery texts, with three tiers per entry, shelf counts, and a "written in the Kroniek" note on every card. | lore | high | M | L-R1 |
| 5 | **Typography pass**: nothing readable under 16 px, sizes scale with the viewport, a text-size setting, backing behind text over the world. | UI | high | S | U-R1 |
| 6 | **HUD states and one notice queue**: flight, on foot, combat and dialogue each show only their budget; idle groups fade; one notice at a time. | UI | high | M | U-R2, U-R3 |
| 7 | **Inline glossary** for period words in dialogue, journal and Kroniek. | lore | high | S to M | L-R2 |
| 8 | **Design tokens** for colour, type, spacing, timing and easing, then the motion and sound pass, with reduced motion honoured. | UI | high | M | U-R4, U-R6 |
| 9 | **Three expectation lines on the title screen** (not a new screen), plus location-aware lore lines on loading and respawn. | onboarding, lore | medium | S | O5, L-R11 |
| 10 | **Load diet and funnel logging**: compress models and textures, defer what the first flight does not need, log the eight funnel events, and watch five people play. | onboarding | high | M | O7, O8, O9 |
| 11 | **Reactive barks**: conditions, priority and "say once", with a first set of 150 lines that mention 1650 facts and react to the player. | lore | high | M to L | L-R4 |
| 12 | **Item text as lore fragments and a dozen readables**, with word budgets enforced in the content build. | lore | medium | S | L-R5, L-R12, L-R13 |
| 13 | **Engraved icon set** to replace text labels in action slots and to mark rarity by shape; panels restyled as printed pages. | UI | medium | M | U-R5, U-R9 |
| 14 | **Bestiary tiers with a combat use** and a "Waar of verzonnen?" line on every entry. | lore | medium | S | L-R6, L-R8 |
| 15 | **Rumours from pilgrims and origin voice lines**, so lore arrives as hearsay and as your own character's knowledge. | lore | medium | M | L-R9, L-R10 |

**Status at the time of writing.** Parts of 1, 4, 9, 12 and 14 were built by other sessions while this doc was written; see the update near the top for what each still lacks.

**A sensible next week [inference]:** 3 and 5 are small and change the first impression at once. Then finish 1 (stall timer, shorter texts) together with 2, then 7 and the tiers for 4 together, since the glossary writes into the Kroniek.

---

# 5. What surprised me

1. **Good games almost never open with a "what this is / is not" screen.** The ones that do (Darkest Dungeon, Celeste's Assist Mode) use under 60 words and only because they break a genre promise **[S17][S19]**. A browser game with no store page is a fair exception, but the lines belong on the title screen, not in front of it.
2. **Even FromSoftware had to add a pop-up pointing at its tutorial**, two months after launch **[S10]**. "Optional and elegant" loses to "missed".
3. **Painterly art fails at icon size.** Diablo IV dropped painterly icons for that reason **[S41]**, and Persona 5's menus were "impossible to read at first" **[S49]**. For a Flemish Masters look, paint the backgrounds and engrave the icons.
4. **Pentiment's text rendering took more time than any other feature**, and testers were still confused by font changes **[S20]**. Copying it fully is not a one-developer job; the glossary and one legible face are the affordable parts.
5. **The closest historical references use the wrong century's look.** Pentiment and Kingdom Come are manuscript and woodcut games. 1650 is engraving and the Antwerp print shop, which gives Belfort a look of its own **[inference]**.
6. **Ubisoft's historians cut their tour text by 60%**, to about five minutes a tour, and added a "what we made up" station to each **[S34]**. Kingdom Come's codex also steps outside the fiction to admit its liberties **[S29]**. Honesty about invention is a feature in this genre.
7. **Belfort's own numbers.** 22 different font sizes, 83 declarations under 16 px; an 11-row controls table and a three-instruction sentence as the first thing a player reads; five slides before play; 16 MB of models against a Poki reference game of 2.4 MB in total **[S13]**. The lore text itself is already good; it is simply shown once and thrown away.
8. **The earlier research doc already said** "no text crawl, at most 20 s, playable within 60 s" and "one verb per beat". The build drifted from it.
9. **The build moved under me.** A hint system, a Kroniek with history / folk tale / invented labels, readable notices and a "this is / this is not" screen landed while I was writing. They match the direction of this research. The gaps that remain are listed in the update near the top: no stall timer on hints, no gated first flight, single-tier Kroniek entries, no glossary, and five slides still standing between the promise screen and play.

---

# 6. Sources

How each was read is noted. "Search summary" means I saw the page only through search-result extracts, not the full text.

## Onboarding

- **[S1]** George Fan, "How I Got My Mom to Play Through Plants vs. Zombies", GDC 2012. Read through Tom Curtis's write-up, "GDC 2012: 10 tutorial tips from Plants vs. Zombies creator George Fan", Game Developer: https://www.gamedeveloper.com/design/gdc-2012-10-tutorial-tips-from-i-plants-vs-zombies-i-creator-george-fan . Talk page: https://gdcvault.com/play/1015541/
- **[S2]** Valve, *Portal* developer commentary (Robin Walker, Kim Swift, Chris Chin, Jason Brashill, Greg Coomer, Nick Maggiore and others). Transcript at The Portal Wiki: https://theportalwiki.com/wiki/Portal_developer_commentary
- **[S3]** Mark Brown, "Half-Life 2's Invisible Tutorial", Game Maker's Toolkit. Read through the WN Hub write-up: https://wnhub.io/news/other/item-11774
- **[S4]** "Methods of creating invisible tutorials", Game Developer blog (byline not captured): https://www.gamedeveloper.com/design/methods-of-creating-invisible-tutorials
- **[S5]** "A Deep Dive into God of War Ragnarök's User Interface", interview with Zach Bohn (Santa Monica Studio), 80 Level: https://80.lv/articles/a-deep-dive-into-god-of-war-ragnar-k-s-user-interface
- **[S6]** "Game onboarding plan", Acagamic (Lennart Nacke), which says it follows Celia Hodent's approach from an interview: https://acagamic.com/blog/2023/game-onboarding-plan/
- **[S7]** Celia Hodent, "The Gamer's Brain, Part 2: UX of Onboarding and Player Engagement", GDC 2016: https://gdcvault.com/play/1022951/ . Session outline only (search summary).
- **[S8]** Masahiro Sakurai, "Just Let Them Play!", *Masahiro Sakurai on Creating Games*. Read through eXputer: https://exputer.com/news/industry/masahiro-criticize-lengthy-game/ . His separate video on tutorials (https://www.youtube.com/watch?v=Xz53DEwuAcU) is only described by title at GoNintendo: https://gonintendo.com/contents/17747-masahiro-sakurai-s-latest-video-is-on-making-tutorials-feel-natural
- **[S9]** Adam Millard (The Architect of Games), "Why Do We STILL Hate Tutorials?": https://www.youtube.com/watch?v=Mjsbftew1wA . Read through Juha-Matti Santala's notes: https://notes.hamatti.org/sources/talks/why-do-we-still-hate-tutorials
- **[S10]** "Elden Ring's tutorial is now impossible to miss", PC Gamer: https://www.pcgamer.com/elden-rings-tutorial-is-now-impossible-to-miss ; "Elden Ring now makes its tutorial area obvious to players", Automaton: https://automaton-media.com/en/news/20220420-11750/ (search summaries).
- **[S11]** Razbuten, "What Games Are Like For Someone Who Doesn't Play Games": https://www.youtube.com/watch?v=ax7f3JZJHSw . Read through 80 Level (https://80.lv/articles/what-games-are-like-for-non-gamers), the Nerd Cultures blog (https://nerdcultures.blogspot.com/2021/09/where-hell-is-l3-gaming-for-non-gamer.html) and a PatternFly article seen as a search summary (https://medium.com/patternfly/what-we-can-learn-from-our-non-target-audience-c86d12dd93f5). Thin.
- **[S12]** CrazyGames developer docs, "Getting to the first frame": https://docs.crazygames.com/resources/getting-to-the-first-frame/ ; technical requirements (search summary): https://docs.crazygames.com/requirements/technical/
- **[S13]** Poki, "How we made Cannon Clash load fast and boosted conversion": https://poki.com/blog/how-we-made-cannon-clash-load-fast-and-boosted-conversion
- **[S14]** "Great Plateau", Wikipedia, which collects the critical reception including Polygon's "miniature version" line: https://en.wikipedia.org/wiki/Great_Plateau (search summary).
- **[S15]** "How Supergiant weaves narrative rewards into Hades' cycle of perpetual death", Game Developer: https://www.gamedeveloper.com/design/how-supergiant-weaves-narrative-rewards-into-i-hades-i-cycle-of-perpetual-death
- **[S16]** Cory Barlog interview, GameSpot: https://www.gamespot.com/articles/god-of-war-ps4-director-explains-why-they-changed-/1100-6458259/ (search summary).
- **[S17]** "Celeste Assist Mode change and accessibility", Vice: https://www.vice.com/en/article/celeste-assist-mode-change-and-accessibility (search summary).
- **[S18]** MCV/Develop on Game Maker's Toolkit's "Super Mario 3D World's 4 Step Level Design": https://mcvuk.com/business-news/publishing/video-nintendos-level-design-secrets-in-four-steps/ (search summary).
- **[S19]** *Darkest Dungeon* wiki, premise text: https://darkestdungeon.wiki.gg/wiki/Darkest_Dungeon ; Goonhammer on *Darkest Dungeon II*'s opening warning: https://goonhammer.com/darkest-dungeon-ii-early-access-launch-a-new-game-that-hates-you (search summary).
- **[S21]** Poki, "State of Web Gaming Report 2026": https://poki.com/blog/state-of-web-gaming-report-2026
- **[S22]** First-session heuristics from vendor and platform pages, e.g. Roblox's onboarding guide (https://create.roblox.com/docs/production/game-design/onboarding) and "First-time user experience" (https://recognizingpatterns.substack.com/p/first-time-user-experience-your-player). Search summaries; conventions, not research.

## Lore

- **[S20]** Josh Sawyer, "Justifying Absurd Expenditures on Fonts and Other Silly Features", GDC 2025. Read through coverage: a syndicated copy of Game Developer's report (https://www.jikguard.com/news/pentiment-director-explains-how-going-all-in-on-fonts-helped-elevate-the-medieval-detective-rpg) and PC Gamer (https://www.pcgamer.com/games/adventure/random-characters-kept-swearing-in-obsidians-font-obsessed-murder-mystery-when-its-procedural-error-system-ran-amok-naughtiness-abounded). Search summaries.
- **[S23]** Harvey Smith and Matthias Worch, "What Happened Here? Environmental Storytelling", GDC 2010. Slides and notes: https://www.worch.com/files/gdc/What_Happened_Here_Web_Notes.pdf (the address given on Worch's site; I read the deck through https://slidetodoc.com/level-design-workshop-what-happened-here-environmental-storytelling/ ). Talk page: https://www.gdcvault.com/play/1012696
- **[S24]** Henry Jenkins, "Game Design as Narrative Architecture", in *First Person* (MIT Press, 2004). Read through summaries, e.g. https://www.noproscenium.com/evocative-enacted-embedded-emergent-narrative-architectures-for-immersive-storytelling/ (search summary).
- **[S25]** Jini Maxwell, "Hades' Greg Kasavin breaks down Supergiant's unique approach to narrative", ScreenHub: https://www.screenhub.com.au/news-article/features/digital/jini-maxwell/hades-greg-kasavin-breaks-down-supergiants-unique-approach-to-narrative-262459
- **[S26]** Hades voice-over statistics from Supergiant, reported by GoNintendo (https://gonintendo.com/stories/374811-supergiant-shares-voiceover-stats-for-hades-reveals-characters-w) and Screen Rant (https://screenrant.com/hades-dev-script-voice-lines-huge-massive/). The "most lines play once" point is from a personal analysis site (https://saschb2b.github.io/game-mechanics/games/hades/death-as-narrative). Search summaries. The primary source, Kasavin and Korb's GDC 2021 talk "Breathing Life into Greek Myth: The Dialogue of Hades" (https://www.gdcvault.com/play/1026975/), I could not read.
- **[S27]** "Codex", Hades Wiki: https://hades.fandom.com/wiki/Codex (search summary of a mirror).
- **[S28]** Miyazaki on direct storytelling, from a 2016 Wired interview as reported by FandomWire (https://fandomwire.com/im-just-not-good-at-hidetaka-miyazaki-admitted-a-storytelling-flaw-that-stops-thousands-from-enjoying-elden-ring-dark-souls/); translator Ryan Morris in Edge, as reported by GamesRadar (https://www.gamesradar.com/games/action-rpg/long-time-dark-souls-and-elden-ring-dev-thinks-miyazaki-stores-the-entire-lore-in-his-head). Search summaries.
- **[S29]** "Kingdom Come: Deliverance II codex", KCD wiki: https://kingdomcomedeliverance.wiki.gg/wiki/Kingdom_Come:_Deliverance_II_codex
- **[S30]** On Warhorse's historian Joanna Nowak: "Making a historically accurate videogame", History Revealed (https://historyrevealed.com/period/medieval/historically-accurate-videogame-kingdom-come-deliverance-2-warhorse-interview) and GameBanshee's digest (https://gamebanshee.com/k3w4d). On the UI fitting the setting: Twinfinite, 2017 (https://twinfinite.net/2017/06/ways-kingdom-come-deliverance-all-in-historical-setting/). Search summaries.
- **[S31]** Lettermatic, "Custom Fonts for Pentiment" (case study): https://lettermatic.com/custom/pentiment
- **[S32]** "Deep Dive: The art of Pentiment" (Hannah Kennedy), Game Developer: https://www.gamedeveloper.com/art/deep-dive-the-art-of-pentiment
- **[S33]** Reviews that describe Pentiment's glossary: RPGWatch (https://rpgwatch.com/articles/pentiment-review-532.html), Kotaku (https://kotaku.com/pentiment-review-impressions-obsidian-xbox-gamepass-rpg-1849774671). Search summaries. How the glossary opens is (obs).
- **[S34]** "Assassin's Creed Origins Discovery Tour: Q&A with historian Maxime Durand", Ubisoft: https://www.ubisoft.com/en-gb/game/assassins-creed/news/46PlC3yAeikjDI652TayLm/assassins-creed-origins-discovery-tour-qa-with-historian-maxime-durand
- **[S35]** "Witcher 3 quest designers talk design process, most difficult quest to create" (Paweł Sasko, Mateusz Tomaszkiewicz), Shacknews: https://www.shacknews.com/article/94509/witcher-3-quest-designers-talk-design-process-most-difficult-quest-to-create
- **[S36]** Witcher 3 bestiary behaviour, from guides: Twinfinite (https://twinfinite.net/pc/the-witcher-3-wild-hunt-guide-how-to-beginners-combat/2/), TheGamer (https://www.thegamer.com/witcher-3-complete-guide-monster-hunts/). Search summaries.
- **[S37]** Disco Elysium: Wikipedia (https://en.wikipedia.org/wiki/Disco_Elysium), a fan analysis of passive checks (https://awkwardmixture.blogspot.com/2020/03/disco-elysium-skill-checks.html), and GameSpot's piece on the Thought Cabinet, which I could not open (https://www.gamespot.com/articles/how-the-feature-that-almost-sunk-disco-elysium-was/1100-6472676/). Search summaries.
- **[S38]** Outer Wilds: Mobius Digital's blog, "The intentionality of wandering" (https://www.mobiusdigitalgames.com/blog/the-intentionality-of-wandering) and the GDC 2020 listing for "Curiosity-Driven Exploration" (https://www.gdconf.com/news/attend-gdc-and-learn-how-outer-wilds-nailed-curiosity-driven-game-design). Search summaries.

## UI

- **[S39]** "User interface design in video games", Game Developer blog (Anthony Stonehouse; byline from memory), summarising Erik Fagerholt and Magnus Lorentzon, *Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games* (MSc thesis, Chalmers, 2009): https://www.gamedeveloper.com/design/user-interface-design-in-video-games
- **[S40]** "How Dead Space 3 pulled from Dieter Rams and Instagram" (Dino Ignacio), Kill Screen: https://www.killscreen.com/how-dead-space-3-pulled-dieter-rams-and-instagram/ . His GDC 2013 talk, "Crafting Destruction: The Evolution of the Dead Space User Interface": https://gdcvault.com/play/1017723/ (not read).
- **[S41]** "Diablo IV Quarterly Update: February 2020" (UI section by Angela Del Priore), Blizzard: https://news.blizzard.com/en-us/diablo4/23308274/diablo-iv-quarterly-update-february-2020
- **[S42]** Xbox Accessibility Guideline 101, Text display: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/101 (read at devdocs.xbox.com).
- **[S43]** Xbox Accessibility Guideline 102, Contrast: https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102 (read at devdocs.xbox.com).
- **[S44]** Game Accessibility Guidelines, basic tier: https://gameaccessibilityguidelines.com/basic/
- **[S45]** Ian Hamilton, "How to do subtitles well: basics and good practices", Game Developer: https://www.gamedeveloper.com/audio/how-to-do-subtitles-well-basics-and-good-practices
- **[S46]** Nielsen Norman Group, "Executing UX Animations: Duration and Motion Characteristics": https://www.nngroup.com/articles/animation-duration/
- **[S47]** "Game UI Database: Collecting References to Inspire Designers" (Edd Coates), 80 Level: https://80.lv/articles/game-ui-database-collecting-references-to-inspire-designers/ . The database: https://www.gameuidatabase.com/
- **[S48]** Interface In Game: https://interfaceingame.com/ (not fetched).
- **[S49]** Katsura Hashino on Persona 5's menus, GamesRadar: https://www.gamesradar.com/games/jrpg/persona-director-and-jrpg-veteran-says-the-amazing-menus-in-metaphor-refantazio-were-really-annoying-to-make-just-as-persona-5s-were-impossible-to-read-at-first ; "What makes the UI and menus in Persona games so good", Siliconera: https://www.siliconera.com/what-makes-the-ui-and-menus-in-persona-games-so-good/ (search summaries).
- **[S50]** Max Pears, "HUD: barrier for immersion, hide the numbers", Game Developer: https://www.gamedeveloper.com/design/hud-barrier-for-immersion-hide-the-numbers
- **[S51]** Josh Bycer, "The UI missteps behind one of the best games of all time" (X-COM), Game Developer: https://www.gamedeveloper.com/design/the-ui-missteps-behind-one-of-the-best-games-of-all-time-
- **[S52]** Dynamic HUDs: Game Rant on God of War (https://gamerant.com/god-of-war-ragnarok-dynamic-hud-disappear-immersion-combat-hogwarts-legacy-design/), Stevivor on God of War's Immersive mode (https://stevivor.com/news/god-war-ui-difficulty-options-detailed-sony-santa-monica), a Horizon Zero Dawn UI critique (https://medium.com/@a_kill_/horizon-zero-dawn-ui-critique-79663362429), Forge Press on Elden Ring (https://forgepress.org/four-lessons-open-world-games-need-to-learn-from-elden-ring/). Search summaries.
- **[S53]** Jason Connell on Ghost of Tsushima's HUD, as quoted in Twinfinite's coverage: https://twinfinite.net/news/ghost-of-tsushima-details/ (search summary; LC).
- **[S54]** UI sound practice: "UI sound design for indie games", Bugnet (https://bugnet.io/blog/ui-sound-design-for-indie-games); Audiokinetic's "Approaching UI Audio from a UI Design Perspective, Part 2" could not be opened (https://www.audiokinetic.com/en/approaching-ui-audio-ui-design-perspective-2). Search summaries; LC.
- **[S55]** Input glyph practice: s&box docs (https://sbox.game/dev/doc/input/glyphs/), a developer post on glyphs for rebindable inputs (https://www.patreon.com/posts/37676286). Search summaries; LC.
- **[S56]** The Witcher 3's menu overhaul: Push Square (https://www.pushsquare.com/news/2016/05/the_witcher_3s_user_interface_is_being_completely_redesigned), RPG Site (https://www.rpgsite.net/feature/4832-a-look-at-the-witcher-3s-menu-overhaul). Search summaries.
- **[S57]** Riot Games, "So You Wanna Make Games? User Interface Design" (page text only): https://www.riotgames.com/en/artedu/user-interface-design

## Sources asked for that I could not read properly

| Source | What happened | Effect |
|---|---|---|
| Game Maker's Toolkit transcripts (e.g. "How Level Design Can Tell a Story") | The transcript host refused the request. | GMTK is cited only through write-ups **[S3][S18]**. |
| Extra Credits, "Tutorials 101" and "Tutorials That Don't Talk Down to You" | Only episode listings and a one-line fan summary (tutorials should be skippable and never interrupt play). | Not used as evidence. |
| Sakurai's video on tutorials | Only its title and link. | Only "Just Let Them Play!" is used **[S8]**. |
| Razbuten's series | Short summaries only. | P13 is marked LC. |
| Design Doc | No readable summary of a relevant video found. | Not used. |
| noclip (Hades, Witcher 3 documentaries) | Listings only. | Witcher points come from Shacknews **[S35]** and the earlier doc's Sasko talk. |
| Hodent's and Kasavin's GDC talks; Ignacio's Dead Space talk | GDC Vault pages without transcripts. | Used through secondary write-ups, as marked. |
| Material Design motion guidance | The page returned no content. | NN/g is used instead **[S46]**. |

Everything marked (obs) is from general knowledge of the games and should be checked in the game itself before it is quoted elsewhere. The points about 17th-century print culture (Blaeu, Sanderus, Plantin) are general knowledge, not fetched; check them against `docs/history/` before building on them.

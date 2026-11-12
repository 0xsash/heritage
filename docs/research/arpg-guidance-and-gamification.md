# ARPG guidance and gamification: concrete rules

Research notes for **BELFORT**: guidance, onboarding, the reward layer, melee combat and town life. This doc assumes you have read `game-design-talks.md` and does not repeat it (juice, hitstop, shake, DOOM tokens, God of War camera, Brevik, BotW, Sasko and Levine stay there).

**How to read this doc**
- Every point names its source. Most GDC Vault videos are paywalled and YouTube transcripts are blocked here, so talks were read through write-ups: Game Developer (Gamasutra), Engadget, and Japanese and Chinese conference reports.
- **(LC)** means low confidence: thin, community-measured or conflicting sources.
- **(obs)** means a well-known in-game fact that I did not fetch a source for.

---

## 1. Direction and purpose

### 1.1 World of Warcraft: from ping-pong to tracked objectives

**Jeff Kaplan, GDC 2009** ([Game Developer write-up](https://www.gamedeveloper.com/game-platforms/gdc-learning-from-i-world-of-warcraft-i-s-quest-design-mistakes))
- **Quests must be "the smart path."** Players should trust that doing quests beats grinding. XP and gold tuning were "absolutely the most important thing".
- **Scale grew fast.** The target was 600 quests. WoW launched with 2,600, then 5,300 in The Burning Crusade and 7,650 in Wrath of the Lich King. In alpha, an empty quest log "felt very broken".
- **Text cap: 511 characters per quest.** Over-writing was a "huge mistake": players shouldn't have to "read a book".
- **Show progress the instant it happens** (on screen). Without that, players kept reopening the log.
- **Keep the mystery out of the action.** Never say "figure it out". Objectives are concrete (kill X, collect Y); the story can be mysterious, the task cannot.
- **Hubs that light up the minimap "like a Christmas tree"** are popular, but designers lose control of pacing, and players do quests without knowing why. The answer: give choices, but be "a little bit flexible but always guiding you back".
- **Bad flow example:** four kill quests followed by four collect quests.
- **Never send players a long way for a trivial task.** That problem is where breadcrumb quests came from.
- **Collection quests:**
  - Drop chance rises with each kill: about 16%, then 32%, then 48%, and so on until a drop is guaranteed. This removes bad streaks, and the base rate had to rise to compensate.
  - Don't ask for too many of one item or too many different items.
- **Combat target:** about **1 minute per fight**.

**Tom Chilton, GDC 2011, on Cataclysm** ([Engadget](https://www.engadget.com/2011-03-02-gdc-2011-tom-chilton-discusses-cataclysm-design-talent-and-zon.html))
- Vanilla quests "ping-ponged you around the world" because zones had no top-down design. Cataclysm zones were **flowcharted and storyboarded before any quest was written**.
- Old hubs were thin. Sentinel Hill had a few quests, an inn, and a milk-and-bread vendor.
- **Talents:** most options were sub-optimal (an "illusion of choice"). One tooltip ran past five sentences and intimidated new players. Chilton preferred a constrained, Modern Warfare 2–style set of choices.

**Later WoW changes**
- **Quest log size:** 20 at launch, 25 from patch 2.0, 35 in retail today ([Blizzard forum](https://us.forums.blizzard.com/en/wow/t/expand-questlog-list-beyond-25-quests/1436981); [mein-mmo](https://mein-mmo.de/en/wow-your-complaining-has-helped-blizzard-increases-the-quest-log-gives-you-more-space,921568)).
- **Patch 9.0.1 (2020) added the in-world navigational marker** ([Warcraft Wiki](https://warcraft.wiki.gg/wiki/Navigational_marker)).
  - It points straight at the one "super-tracked" objective and shows the distance in yards when you face it.
  - Blizzard's stated goal was to cut map-checking and show whether a target is above or below you ([Icy Veins](https://www.icy-veins.com/forums/topic/49083-quest-interface-improvements-in-shadowlands-3d-indicator-of-tracked-quest-objectives)).
- **Markers (obs):**
  - Yellow `!` = quest available.
  - Grey `!` = available soon, or level too low.
  - Yellow `?` = ready to turn in.
  - Grey `?` = in progress.
  - Modern maps shade the objective area instead of marking one point.

### 1.2 Guild Wars 2: hearts and events instead of quest text

**Colin Johanson** ([Kotaku 2010](https://kotaku.com/guild-wars-2-does-away-with-flawed-quest-systems-5537262); [dynamic-events Q&A](https://wiki.guildwars2.com/wiki/Colin_Johanson_Answers_Your_Dynamic_Event_Questions))
- **Show, don't tell.** Instead of reading about an attack, you see burning buildings and smoke columns and hear shouting guards who recruit you.
- **Threats follow through.** If ogres are coming to smash the house and you don't stop them, they smash it. Failed events don't vanish. They branch: the enemy builds a fort and sends raids.
- **Rewards:**
  - Every participant is rewarded with XP, gold and karma.
  - Failing pays less than succeeding but still pays.
  - Events never drop loot directly. Everyone who helps kill a monster gets its loot.
- **Cycles:** single events loop every **10–15 min**, chains take hours. Events start from world conditions such as time of day or weather, never from real-world clock times.

**Renown hearts** ([GW2 wiki](https://wiki.guildwars2.com/wiki/Renown_Heart))
- A fixed area that holds several possible tasks (kill, water plants, feed cattle, revive NPCs). **Any mix of tasks fills one bar**, and no talk-to-NPC step is needed.
- The heart icon fills with yellow from the bottom. Exact percentages are hidden.
- Hearts are discovered by walking into range or by talking to a scout NPC, who reveals them on the map.
- Rewards: XP plus karma, scaled by level (82 at L1, 150 at L10, 225 at L20). Completing the heart unlocks a vendor that sells for karma.
- Johanson: there are "hundreds of hearts and thousands of events". Hearts are support content; events carry the world ([Engadget column](https://www.engadget.com/2012-03-13-flameseeker-chronicles-quest-education.html)).

### 1.3 Ghost of Tsushima: a diegetic HUD

**Parker Hamilton, "Exploration in Ghost of Tsushima: Letting the Island Guide You", GDC 2021** ([GDC Vault](https://gdcvault.com/play/1027399/Exploration-in-Ghost-of-Tsushima); detailed notes in the [gcores write-up](https://www.gcores.com/articles/168695))
- **Avoid HUD wherever possible, including the minimap.** Heavy HUD breaks immersion and pulls attention from dialogue. Traditional map icons were "clumsy and hard to remember".
- **Guiding Wind:**
  - **One target at a time.** It comes from a map pin or the quest you are tracking.
  - It bends grass, trees and particles toward the target.
  - Playtest fixes:
    - Stronger wind and more visible particles.
    - A button that triggers a gust shown as white threads.
    - A funnel-shaped particle effect that follows the terrain up cliffs.
    - Climbable paths added so routes didn't stall at mountains.
- **Every mission was cut to one objective at a time.** Missions no longer start automatically. The wind switches off near NPCs and inside some areas.
- **Landmarks are tiered by content size:**
  - Big content (enemy camps) gets strong visual or audio cues, such as signal smoke or drums.
  - Small content (shrines) gets weak cues and has to be searched for.
  - Vegetation that hid a town was thinned.
- **Guide animals:**
  - Deer can't climb, so birds take over where deer can't go.
  - Foxes lead along fixed routes to hidden shrines.
  - Fireflies hover between the player and a collectible and pulse faster as you get closer.
  - All of them switch off during conversations.
- **Rumour NPCs:**
  - Villagers tell you about nearby content.
  - Designers tuned their density, the spacing between villagers who give hints, and the hint cooldowns.
  - **You hold at most 2 hints per content type.**
- **Spread quest start and end points apart** so players stumble into side content while travelling.
- Nate Fox: the wind points "without putting in anything too obtrusive", and it grew from a feature into the game's design philosophy ([Press Start](https://press-start.com.au/features/2020/05/22/ghost-of-tsushima-interview-weapon-upgrades-crafting-length-waypoints-and-more/)).

### 1.4 Elden Ring, Skyrim, Diablo IV, Assassin's Creed

**Elden Ring**
- Miyazaki calls the Guidance of Grace "the minimum level of guidance", with discovery and drama if you stray from it ([Famitsu](https://s.famitsu.com/en/news/202201/27249109.html)) (LC: excerpt only).
- **(obs)** At a Site of Grace, golden rays point toward the main path. You place map markers yourself; the game places none.

**Skyrim Radiant** ([UESP](https://en.m.uesp.net/wiki/Skyrim:Radiant); [Creation Kit docs](https://ck.uesp.net/wiki/Radiant_Story); [PC Gamer](https://www.pcgamer.com/uk/the-elder-scrolls-v-skyrim-has-infinite-quests-says-howard))
- Radiant quests are templates whose slots (location, enemy, reward, quest giver) are filled by rules.
- **They prefer locations the player hasn't visited yet.** That turns cheap filler into a reason to explore.
- Weakness: targets ignore the player's level.
- Radiant extends faction work after the scripted storyline ends.

**Diablo IV**
- Side-quest objectives show as a **blue circle** on the map (general area) or **blue diamonds** (exact target). Any map icon can be pinned as the tracked objective ([Fextralife](https://diablo4.wiki.fextralife.com/Side+Quest); [Maxroll](https://maxroll.gg/d4/resources/side-quests)).
- **Whispers (endgame):**
  - Timed bounties marked on the map, worth **1, 3 or 5 favours**. A darker border means more favours.
  - At **10 favours** you return to the Tree and pick one of 3 caches. New whispers stop appearing until you turn in.
  - Batches refresh about every **90 min** (LC).
  - Sources: [Fextralife](https://diablo4.wiki.fextralife.com/Tree+of+Whispers); [PC Gamer](https://www.pcgamer.com/diablo-4-whispers-of-the-dead-grim-favors).
- The **Skip Campaign** option for later characters is an admission that story onboarding should run only once ([devtrackers patch notes](https://devtrackers.gg/diablo4?page=16)).

**AC Odyssey** ([PC Gamer](https://www.pcgamer.com/assassins-creed-odysseys-exploration-mode-culls-the-map-markers))
- "Exploration mode" replaces markers with clues: NPCs give you a region, a landmark and a direction, and you search.
- "Guided mode" keeps the markers. You can switch at any time.
- Ubisoft reportedly said over 50% of players chose Exploration (LC).

### 1.5 Clarity without marker-chasing (synthesis)

1. **One focused objective at a time** (Tsushima, WoW super-track). Everything else is optional context.
2. **Mark an area for "find" tasks and a point for "go here" tasks** (D4 circle vs diamond; WoW shaded areas).
3. **Rely on world signals first** (smoke, bells, birds, landmarks). The HUD marker is a fallback the player can switch on.
4. **Directions in dialogue** ("north of the windmill, past the canal") plus a toggle, as in AC's Exploration mode.
5. **Show progress the instant it happens** (Kaplan). Hide exact percentages on area tasks (GW2 hearts).
6. **Send players past side content** on the way to objectives (Tsushima).

---

## 2. Onboarding and "setting the table"

**Character creation**
- **GW2** asks **5 multiple-choice biography questions**: 1 profession, 1 personality and 3 race-specific. The 3 race questions pick the personal story ([GW2 wiki](https://wiki.guildwars2.com/wiki/Character_creation)).
- **Time spent:**
  - In a reader survey, just over half of MMO players spend **at most 30 min** in the creator. A WoW-depth editor takes about **10 min** ([mein-mmo](https://mein-mmo.de/en/short-hair-gel-and-freshly-shaved-this-is-how-much-time-you-give-to-character-creation-in-mmos,484204)) (LC: survey).
  - In Baldur's Gate 3, about **10%** of players spent 1 hour or more ([Push Square](https://pushsquare.com/news/2023/12/baldurs-gate-3-player-stats-show-crazy-completion-rate-most-popular-romance-class-and-more)).
  - **Rule:** offer a fast default path (2 min or less) and an optional deep editor.
- **Choices that matter vs choices that bloat:**
  - Chilton: an "illusion of choice" and long tooltips scare off new players.
  - Diablo III/IV ask only for class and appearance (obs).
  - Skyrim asks only for race, and your class emerges from how you play (obs).

**Openings**
- **Skyrim:**
  - The Helgen sequence takes about **30 min**, depending on time spent in the creator. It teaches combat, looting, progression and choice ([GamesRadar](https://www.gamesradar.com/the-opening-hour-of-skyrim-is-still-the-best-thing-bethesda-has-ever-made)).
  - The creator interrupts the cart ride at the execution block, so the story hook comes before the menus (obs).
  - **Cost warning:** the physically simulated cart was fragile. One immovable bee launched it into the air, and the team rewatched the scene "close to hundreds of times" ([GamesRadar](https://www.gamesradar.com/skyrims-famous-cart-intro-was-at-one-point-highly-susceptible-to-bee-attack)).
  - For us: put cinematic transport on rails.
- **Witcher 3:**
  - A short Kaer Morhen dream where Geralt spars with Ciri teaches combat inside the story (obs).
  - **White Orchard** is "the entire game in microcosm": a small open zone with the main hunt, side quests and contracts ([PCWorld](https://www.pcworld.com/article/431480/witcher-3-wild-hunt-hands-on-four-hours-with-the-most-anticipated-rpg-of-the-year.html)).
  - Its side quests (e.g. finding a dead brother on the battlefield) give a view of the war ([DualShockers](https://www.dualshockers.com/the-witcher-3-quest-design/)).
- **WoW (obs plus the XP table below):**
  - Each starting area opens with a narrated fly-over of about 1 min. You spawn within sight of a yellow `!`.
  - Level 2 takes **400 XP**, which is **8 same-level kills** (45 + 5×1 = 50 XP each). The first level-up lands in a few minutes.
- **Diablo:**
  - The core loop is click, walk, kill (Brevik, in the other doc).
  - Diablo II: an act-opening cinematic, then a small town. The first quest (Den of Evil) clears one cave right outside and rewards a skill point (obs).
- **Diablo III, Reaper of Souls (Mosqueira, GDC 2015):**
  - Clarify weapon look versus power, and add instant "is this better?" comparison cues.
  - **Randomness alone doesn't motivate**; keep the fantasy central.
  - Sources: [GDC Vault](https://gdcvault.com/play/1021776/Against-the-Burning-Hells-Diablo); [Game Watch, JP](https://game.watch.impress.co.jp/docs/news/691473.html) (LC: translated).

**Rules**
- Skip text crawls. Hook first, then a playable scene.
- Teach each verb inside a story beat, one verb per beat.
- Show the first quest giver from the spawn point.
- Make the first reward come within minutes.
- Make the opening zone a miniature of the full loop.

---

## 3. The gamification layer

### 3.1 XP curve, using WoW Classic as reference

**XP to next level** ([Warcraft Wiki](https://warcraft.wiki.gg/wiki/Experience_to_level))

| Lvl | 1 | 2 | 3 | 5 | 10 | 15 | 20 | 30 | 40 | 50 | 59 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| XP | 400 | 900 | 1,400 | 2,800 | 7,600 | 14,400 | 23,200 | 47,400 | 90,700 | 147,500 | 209,800 |

- **Total to level 60:** 4,084,700 XP.
- **Levels 1–10 follow `XP = 40L² + 360L`** exactly. The page marks the formulas for higher levels as outdated, so use the table there.
- **Kill XP for a same-level mob:** `45 + 5L`.
- **Kills per level** rise from **8** at L1 to about **80** at L10 and about **620** at L59. That steep climb is how WoW slowed leveling down.
- **Quest share:** one quest is worth about **10.7% of a level at L5** and about **3% at L59** ([Warcraft Tavern](https://www.warcrafttavern.com/guides/wow-classic-guide-to-rested-experience/)).

**Rested XP** (same source)
- Rested kills give **200% XP**. Quest and exploration XP don't use up the bonus.
- The bar has **20 bubbles per level**. The cap is **30 bubbles (1.5 levels)**.
- Resting builds 4× faster in an inn than in the wild. Sources disagree on whether one bubble takes 8 or 10 hours in an inn (LC).
- The rested part of the bar is shown in blue. The design is a catch-up for players who play less, not a penalty for those who play more.

### 3.2 Reward schedules

**Hopson, "Behavioral Game Design" (Gamasutra 2001)** ([Game Developer](https://www.gamedeveloper.com/design/behavioral-game-design))
- **Fixed ratio** (e.g. a level every N kills) causes a pause after each reward, and the pause grows as N grows. Very long requirements make players quit.
- **Variable ratio** (random drops) gives "a steady flow of activity at a reasonably high rate".
- **Chained schedules:** reaching the next stage is itself a reward.
- **Avoid sharp drops in the rate of reward.** Players resent it as unfair; extinction "involves a lot of frustration and anger".
- **Run several activities at once**, so low motivation in one doesn't end the session.
- Ethics: Hopson himself calls them "still very much a subject of debate" ([10-year retrospective](https://gamedeveloper.com/design/10-years-of-behavioral-game-design-with-bungie-s-research-boss)).

**Kaplan's collection drops** (rising 16/32/48% chance) are bad-luck protection: random on the surface, with a guaranteed ceiling.

### 3.3 Unlock pacing

- **Diablo III** (Jay Wilson, [official blog](https://us.battle.net/d3/en/blog/4475014)):
  - **At least one new skill or rune every level to 60**, often 3–4.
  - Active skill slots open at **levels 2, 6, 12, 18 and 24**; passive slots at **10, 20 and 30** ([Diablo Wiki](https://di.diablowiki.net/Skill)).
- **WoW Classic** (obs): a talent point every level from 10 (51 by level 60). Cataclysm and later expansions cut talent choices back to fewer, clearer decisions (Chilton).
- **Diablo IV 2.0** ([Blizzard](https://news.blizzard.com/en-us/article/24130178/the-2-0-ptr-what-you-need-to-know)):
  - Level cap of **60**.
  - The 4 World Tiers were replaced by 4 difficulties plus Torment I–IV, unlocked through the Pit.
  - Paragon progress is shared across the realm, up to **300**.
  - Lesson: keep the per-character climb short, then add account-wide progress.

### 3.4 Loot tiers and colours

**Diablo II** ([classic.battle.net](https://classic.battle.net/Diablo2exp/items/magic.shtml))
- **Normal** (white).
- **Magic** (blue): one prefix and/or one suffix. Odds: 25% both, 25% prefix only, 50% suffix only.
- **Rare** (yellow): **2–6 affixes**, at most 3 prefixes and at most 3 suffixes.
- **Set** (green) and **Unique** (gold) (obs).
- Drops are checked in this order: Unique, Set, Rare, Magic, then Superior and Normal ([Diablo Wiki](https://diablo2.diablowiki.net/Item_quality)).

**Diablo III Loot 2.0** ([PC Gamer](https://pcgamer.com/diablo-3-reaper-of-souls-loot-system-designed-to-cut-the-legs-out-from-the-auction-house); [Diablo Wiki](https://di.diablowiki.net/Loot_2.0))
- **Rarity must track power:** fewer legendaries, each much stronger ("less is more").
- **Smart drops** are biased toward your class.

**Rule:** about 5 tiers, each with a fixed colour plus a sound and a light beam. Orange legendaries get a beam and a stinger sound (obs).

### 3.5 Health, potions, resources

**Diablo III** ([Diablo Wiki: potion](https://di.diablowiki.net/Potion); [Health Globe](https://di.diablowiki.net/Health_orb); [Game Informer interview with Jay Wilson](https://gameinformer.com/games/diablo_iii/b/pc/archive/2009/10/27/feature-diablo-iii-game-director-discusses-monks%2C-health-globes%2C-and-the-game%E2%80%99s-mysterious-fifth-class.aspx))
- **Potion: heals 60% instantly, 30 s cooldown.** The cooldown went from none (Diablo II) to 8 s (2010) to 30 s at launch.
- Wilson's intent: about "once a map", to "take the edge off". **No auto-drink at 10% health**, because "it takes the choice away".
- **Health globes drop from kills.** Rares drop one roughly every **25%** of their health. In co-op, nearby friends share the heal.

**Diablo IV** (LC, the system keeps changing)
- 4 potion charges at start, up to about 10 through region Renown.
- Season 11 refills charges on a timer (reportedly 12 s) ([Icy Veins](https://www.icy-veins.com/d4/news/season-11-healing-potion-changes/)).

### 3.6 Dailies and their criticism

- **Mists of Pandaria:**
  - Ghostcrawler: "we might have overdone it a little bit with the daily quests". The new target was **10–20 a day**.
  - Lead quest designer Dave Kosak: much of the backlash came from players feeling the dailies were *required* ([Wowhead interviews](https://fr.wowhead.com/news/interviews-with-lead-quest-designer-dave-kosak-lead-encounter-designer-ion-206589); [Engadget](https://www.engadget.com/2012-11-13-the-evolving-design-of-reputation.html)).
- **GW2 repeatable hearts:** they reset daily, but only if completed. Unfinished progress carries over ([GW2 wiki](https://wiki.guildwars2.com/wiki/Renown_Heart)).
- **Rule:** dailies must be optional and must never pile up guilt. Prefer rested-style catch-up over "log in or lose".
- **Achievements:** Kaplan calls them a "directed gameplay" tool, because players scan the achievement list before deciding what to do (Kaplan source above).

---

## 4. Combat for third-person melee and flight

### 4.1 Telegraph and dodge timing

**"Anatomy of an Enemy Attack in Dark Souls 3"** ([Game Developer](https://www.gamedeveloper.com/game-platforms/anatomy-of-an-enemy-attack-in-dark-souls-3))
- Every enemy attack has 5 phases: **Opening Pose, Attack Signal, Attack, End Pose, Return.**

| Phase | Rule |
|---|---|
| Attack Signal + Attack | **≥340 ms** combined. New moves get longer. |
| Attack (hitbox active) | **2–4 frames** |
| End Pose used as bait | **≥240 ms** |
| End Pose before Return | **≥170 ms**, so the player can see the attack has ended |
| Return | The punish window, usually the longest phase |

- **Player reaction budget:** perceiving about 100 ms, thinking about 70 ms, acting about 70 ms.
- **Input latency:** Dark Souls 3 measured 60–100 ms. Mick West's benchmarks: 50–100 ms feels "tight", over 100 ms is noticeable, about 200 ms feels sluggish.
- **Medium roll:** invincible from frame 1 for **433 ms** (13 frames at 30 fps).
- **Hitboxes are often several times larger than the weapon** to keep the power fantasy.
- **Same-looking wind-ups with different durations** raise difficulty. Sound helps players learn the rhythm.
- **Equip load** (community measured, LC): DS3 and Elden Ring keep about **13 i-frames** for light and medium rolls. Load mostly changes distance and recovery. The thresholds are 30% and 70%, and at 100% or more you can't roll ([Steam thread](https://steamcommunity.com/app/374320/discussions/0/596262211620473504); [Twinfinite](https://twinfinite.net/guides/elden-ring-dodge-rolls-equip-load-explained/)).

### 4.2 Elites and affixes (Diablo III)

**Pack types** ([Maxroll](https://maxroll.gg/d3/resources/elite-affixes))
- **Champions** (blue names): packs of **3 or 5** of the same monster.
- **Rares** (yellow names): one leader plus minions.

**Affix count by character level**

| Character level | 1–29 | 30–49 | 50–59 | 60+ |
|---|---|---|---|---|
| Affixes | 1 | 2 | 3 | 4 |

- Original Diablo III scaled affixes by difficulty instead: 1 on Normal up to 4 on Inferno ([Diablo Wiki](https://di.diablowiki.net/Boss_mods)).
- **Mix rule:** 2–3 offensive affixes, **at most 1 defensive and at most 1 crowd-control**. Some pairs are banned.

**Every dangerous affix has a readable delay**

| Affix | Delay before it hurts | Notes |
|---|---|---|
| Arcane Enchanted | 2 s | Rotating beam, 25-yard radius |
| Frozen | about 4 s | Then freezes you for 2.5 s |
| Molten (death explosion) | 3 s | Can kill in one hit |
| Poison Enchanted | 2 s | Pool expands in an X pattern |
| Wormhole | 1 s | Teleports you between two circles |
| Mortar | — | Ground mark shows the hit zone |

### 4.3 Targeting, aggro, death

- **Lock-on: Ocarina of Time's Z-targeting** came from a ninja show at Toei Kyoto Studio Park: the ninjas circled the hero and attacked one at a time.
  - **Targeting one enemy tells the others to wait.** It is the ancestor of attack tokens.
  - The targeting cursor became the fairy Navi.
  - Source: [Iwata Asks](https://iwataasks.nintendo.com/interviews/3ds/zelda-ocarina-of-time/1/3).
- **Threat (WoW):** to steal aggro, you need **110%** of the current target's threat in melee or **130%** at range. Leashing exists, but no distances were sourced ([Warcraft Wiki](https://warcraft.wiki.gg/wiki/Aggro)) (LC).
- **Death in Elden Ring:**
  - You drop all runes at your bloodstain and get **one chance** to recover them. Die again and they are gone.
  - **Stakes of Marika** offer an optional respawn closer to the fight, often outside boss rooms ([TheGamer](https://www.thegamer.com/elden-ring-stakes-marika-explained/)).
  - The death penalty is a *recoverable* stake, and the respawn point keeps run-backs short.
- **Combos, light/heavy, stamina, tokens and camera:** see `game-design-talks.md` (GMTK combat, DOOM, God of War).

---

## 5. Ambient life

**Assassin's Creed Unity: "Massive Crowd on AC Unity: AI Recycling", François Cournoyer, GDC 2015**
- Sources: [GDC Vault](https://www.gdcvault.com/play/1022141/Massive-Crowd-on-Assassin-s); details from the [Game Watch JP report](https://game.watch.impress.co.jp/docs/news/20150307_691715.html).

| Tier | Distance | AI | Cost per NPC | Notes |
|---|---|---|---|---|
| Autonomous | under 12 m | Full | 0.5–5 ms | **About 40 max** |
| Puppet | 12–40 m | Very few functions | under 150 µs | Realistic look, simple behaviour |
| Low-res bulk | over 40 m | Basic reactive only | under 25 µs | About 2,000 polys, **11 bones**, **29 appearance swaps**, no hand animation |

- NPCs switch between tiers **without the player noticing** (pooling).
- **Collisions only displace NPCs.** Movement uses predefined paths on the navmesh.
- **"Shepherd" NPCs** carry full AI data and lead a nearby crowd.
- Designers paint crowd density, spawn points and shepherd scripts with a level-design tool.
- The previous engine capped out at 100 NPCs, of whom 20 could talk and only about 4 were near the player.
- A separate GDC talk covers systemic crowd events, i.e. events that don't revolve around the player ([GDC Vault](https://www.gdcvault.com/play/1022211/Postmortem-Developing-Systemic-Crowd-Events)).

**Witcher 3**
- **Spawn trees** ([REDkit wiki](https://cdprojektred.atlassian.net/wiki/spaces/W3REDkit/pages/47186233/HOW-TO+Create+an+encounter+with+NPC+merchant)):
  - "Community" spawn trees decide who appears in an area, with **different action points by day and by night**.
  - A **"job"** is a set of animations played at a spot (sweep, haggle, lean).
- **Lessons from lead designer Philipp Weber** ([PC Gamer](https://www.pcgamer.com/games/the-witcher/witcher-3-designer-says-it-wasnt-easy-to-convince-players-its-npc-simulation-wasnt-just-fakery-people-nowadays-are-interested-in-those-kinds-of-details-and-it-really-came-to-haunt-us/)):
  - Fixed routes gave way to NPCs choosing among activities and locations.
  - An ambitious fear system was cut because it couldn't tell what an NPC was holding: mothers fled and dropped their babies.

**Kingdom Come: Deliverance**
- NPCs run daily routines, and **witnesses** decide whether a crime gets reported ([KCD forum Q&A](https://forum.kingdomcomerpg.com/t/warhorse-studios-weekly-torch/29593/55)) (LC).
- In KCD2, routines change after events ([Wccftech](https://wccftech.com/kingdom-come-deliverance-2-dev-talks-about-dynamic-npc-routines-and-emergent-storytelling-for-side-quests/)).

**Ghost of Tsushima:** rumour villagers use tuned density, spacing and cooldowns (§1.3).

**For dialogue structure,** pair these with Levine's star/drone split (in the other doc).

---

## 6. Apply to BELFORT: prioritised checklist

### P0: direction (build first)

1. **Quest-giver glyphs above heads:**
   - Gold `!` = available. Grey `!` = locked or not yet. Gold `?` = ready to turn in. Grey `?` = in progress.
   - Readable from 60 m on foot. In flight, show them as a thin light column so hubs read from the air.
2. **One super-tracked objective:**
   - World beacon plus distance in metres.
   - Clamped to the screen edge as an arrow when the objective is off screen.
   - An up/down chevron when the height difference is over 10 m.
   - Area tasks get a translucent circle on the map and compass; exact targets get a diamond.
3. **Tracker panel:**
   - **At most 3 quests**: the focused one plus 2.
   - Each shows a title, one objective line and a counter (`3/8`).
   - It updates the instant progress happens, with a tick sound and a flash.
   - Nothing shows that doesn't need action.
4. **Text budget:** quest text ≤ 511 characters (Kaplan), i.e. about 3 short lines of dialogue plus a one-line objective. Keep mystery in the story, never in the task.
5. **Hub template (one per Flemish town):**
   - 3–6 quests, mixing kill, collect, talk, escort and fly. Never more than 2 of the same type in a row.
   - Objectives within 150–300 m on foot, or one short flight.
   - The hub ends in a **breadcrumb quest** to the next town.
   - Flowchart every hub before writing any quest (Chilton).
6. **Diegetic guide toggle (our "guiding wind"):**
   - A key makes the dragon's head and a gust of chimney smoke and leaves point toward the tracked objective for 3 s.
   - Rooks or pigeons relay the direction across canals.
   - Belfry bells ring near hubs that have something to turn in.
   - Off near NPCs and in dialogue. One target only.
7. **Landmark tiers:**
   - Big content: smoke columns, belfry fires and drums, visible from flight altitude.
   - Small content: weak cues, found by searching.
   - Keep sightlines to landmarks clear.

### P0: onboarding

8. **Opening:** no text crawl. At most 20 s of title card or narrated fly-over, then playable within 60 s.
9. **Character creation in 2 minutes or less:**
   - Name, 4 appearance presets, and an optional deep editor.
   - **One GW2-style background question** (guild, burgher or peasant) that picks your first quest line and NPC reactions.
   - Do it in-scene, Skyrim-style, after the first hook.
10. **Kaer Morhen–style tutorial, 5 min or less:**
    - A sparring partner teaches light, heavy, dodge and lock-on, one verb per beat.
    - Then a White Orchard–style starter village containing every loop in miniature: hub, event, elite, loot and a first short flight.
    - The first quest giver is visible from spawn. **Level 2 within 3–5 min** (8 kills, plus a quest).

### P0: rewards

11. **XP table** (cap 20):
    - Levels 1–10 use `xpToNext = 40L² + 360L` (400, 900, … 7,600). Levels 11–20 use WoW's values (8,800 … 23,200).
    - Mob XP = `45 + 5L`. Elites ×2–3.
    - Quest XP ≈ 10% of a level early, falling to about 4% at cap.
    - Leveling is driven by quests, not grinding.
12. **Level-up moment:**
    - Full heal, a light pillar and a sound sting.
    - A card: "New: X" with its keybind.
    - **Something unlocks every level** (Diablo III rule). Skill slots open at levels 2, 5, 9 and 14; passives at 7, 12 and 18.
13. **Loot:**
    - 5 tiers: grey (junk), white, blue (1–2 affixes), yellow (3–4), orange (legendary, 1 unique power).
    - Rarity tracks power.
    - Each tier has a ground beam and its own drop sound.
    - Tooltips show green/red comparison arrows.
    - 70% of drops are biased to your weapon type (smart loot).
14. **Collection quests:** chance rises +16% per kill without a drop, with a guaranteed ceiling.
15. **Healing:**
    - Potion heals 60% instantly, 30 s cooldown, no auto-drink.
    - Kills drop "ember" globes (dragon-themed health globes). Elites drop one every 25% of their health.

### P1: combat

16. **Enemy telegraph:**
    - Wind-up plus swing ≥ 340 ms; first-hour enemies ≥ 500 ms.
    - Active hitbox 2–4 frames at 30 fps (66–133 ms).
    - Recovery ≥ 170 ms before the punish window opens.
    - Ground-AoE decals give **1–3 s** warning.
17. **Player dodge:**
    - i-frames for the first **~400 ms** of the roll (24 frames at 60 fps).
    - Recovery 200–300 ms.
    - Input-to-action ≤ 100 ms end to end, so watch browser input lag.
    - Generous hitboxes on player attacks.
18. **Lock-on:**
    - Soft-lock picks the nearest enemy in a 30° camera cone. A hard-lock key toggles.
    - The locked enemy holds one of the 2 attack tokens; the others circle (the Z-targeting principle).
19. **Elites:**
    - Champion packs of 3–5 with blue names; a rare leader plus minions with yellow names.
    - Affixes: 1 until level 8, 2 until level 15, 3 after. At most 1 defensive and 1 crowd-control.
    - Every affix has a decal or colour warning.
    - Starter affixes: *Burning* (fire trail plus a 3 s death burst), *Warded*, *Pulling* (wormhole-style, 1 s).
20. **Leash:** enemies more than 40 m from home or untouched for 8 s run back and fully heal (LC, our own number).
21. **Death:**
    - Respawn at the last belfry or waypoint, or at a "stake" placed before each boss.
    - Unbanked guilders drop at the death spot with one chance to recover them. XP is never lost.

### P1: life and structure

22. **Crowd LOD (browser budget):**
    - Full-AI NPCs under 12 m, cap 8–12.
    - Instanced puppets at 12–40 m, about 60, animation-only, on spline paths.
    - Impostors beyond 40 m.
    - About 6 body and 6 outfit swaps, tinted to roughly 30 looks.
    - Collisions only push NPCs aside. A few "shepherd" NPCs lead each group.
23. **Schedules:**
    - Action points per hour block (market, church, tavern, home), with day and night variants.
    - The NPC picks an activity, and an animation "job" plays at the point.
24. **Barks:**
    - Triggered within 6 m, at most one at a time globally, with a 20–30 s cooldown per NPC.
    - Greetings react to your reputation and your dragon.
    - Rumour villagers point to nearby content, holding at most 2 hints per content type.
25. **GW2-style town events:**
    - Visible from the air (smoke, bells).
    - Participation fills a bar. Failure pays less and changes the town (a burnt market stall stays).
    - They cycle every 10–15 min per region.
26. **Retention (P2):**
    - Up to 3 optional daily "town requests" that never stack.
    - Offline rested bonus: 2× kill XP, capped at 1.5 levels.
    - Achievements used as directed-play hints.
    - No streaks and no "log in or lose".

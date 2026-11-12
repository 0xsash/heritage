# Loops and social: what makes players stay, come back and tell others

Research notes for **BELFORT**: gameplay loops that retain, and viral and social mechanics for a single-player browser game with little or no backend. This doc assumes you have read `game-design-talks.md`, `arpg-guidance-and-gamification.md` and `docs/design/gameplay.md`, and does not repeat them. Guidance, XP curves, loot tiers, Hopson's reward schedules, rested XP, dailies in WoW, Tsushima's wind, crowd LOD, juice and combat stay in those docs. Where this doc touches the same game (BotW, Witcher 3, Elden Ring), it adds a different point.

**How to read this doc**

- Every point names its source. Videos could not be watched, so talks and channels were read through transcripts, slide write-ups and reports.
- No marker: I read the page itself (or a transcript of the video) during this pass.
- **(LC)** low confidence: I only saw the claim in a search summary, or the source is thin, secondary or self-reported.
- **(obs)** a well-known in-game fact I did not fetch a source for.
- **(inference)** my own conclusion or proposal, not something a source says.
- Game Maker's Toolkit (GMTK) quotes come from a public transcript dataset ([taesiri/GMTK-Transcripts](https://huggingface.co/datasets/taesiri/GMTK-Transcripts)). The dataset has no video titles; where the narration does not name the video, the title is my identification.
- `belfort.example` stands for the game's real address.

**What already exists in the game that this doc builds on** (checked in `src/`): a save in local storage (`src/rpg/state.ts`), the Kroniek with its three truth labels, *Geschiedenis / Volksverhaal / Verzonnen* (`src/rpg/kroniek.ts`), discovery cards (`src/world/lore.ts`), flight with dive energy and a boost (`src/player/player.ts`), a seeded random generator (`src/core/math.ts`), and a post-processing pass (`src/render/post.ts`). `index.html` has no description or Open Graph tags, and its title still reads "Belfort — Flight over Diest".

---

## 0. The short version

1. **The design doc is right that depth beats loops, and the sources agree.** Daniel Cook: loops build mastery and can be played for years; arcs (story, authored quests) are consumed once and put the developer on a "content treadmill". Belfort's quests are arcs. One developer cannot out-write the players, so the game needs two or three *loops* that stay fresh without new text: flying well, fighting well, and a daily flight. Arcs give the reason to care; loops give the reason to open the tab tomorrow.
2. **Flight is the loop to double down on.** It is the pillar, it needs no text, it is fair to a first-time visitor, it is watchable, and it is what a shared link can drop someone into within seconds.
3. **What spread on the web was almost never a share button. It was a result worth showing, in a form that fits a chat message, that does not spoil, and that a friend can answer.** Wordle's grid was invented by a player; Wardle only automated it, and he left the link out on purpose.
4. **For a real-place game, the strongest hook is the place.** Players of Microsoft Flight Simulator flew over their own house first (LC). Kingdom Come: Deliverance raised visits to its real villages. Belfort's version: "your street in 1650".

Three concrete proposals are in section 3. The ranked top 15 is in section 4.

---

# Topic 1: gameplay loops that retain

## 1A. Key principles

### 1.1 Loops and arcs

**Daniel Cook, "Loops and Arcs" (Lost Garden, 2012)** ([essay](https://lostgarden.com/2012/04/30/loops-and-arcs/))

- A **loop** is a cycle the player repeats: a mental model prompts an action, the system responds, feedback updates the model. Loops "tend to deliver value through the act of being exercised" and build "wisdom", "a holistic understanding of a complex system".
- An **arc** is "a broken loop you exit immediately": a cutscene, a puzzle with one solution, a scripted quest. Feedback is "99% of the payload". Arcs are efficient at delivering a story, but "people burn out on them rapidly".
- Stringing arcs together creates the **content treadmill**: "If you stop producing content, the business fails."
- Loops are "fractal and occur at multiple levels and frequencies", and nested, dependent loops give "unexpected dynamics".
- Cook's test: "What repeats and what does not?" Take the puzzles, missions and narrative out and see whether the game still works. He finds that "arcs are almost never critical game elements". He also says it is not black and white: use both as ingredients.

**Cook's skill atoms and Koster's game atoms**

- Cook's "The Chemistry of Game Design" (2007) models the player as "driven, consciously or subconsciously, to learn new skills high in perceived value" who gains "pleasure from successfully acquiring skills"; an action felt to be "in vain" produces "boredom or frustration" ([Lost Garden announcement and author comments](https://lostgarden.com/2007/07/19/the-chemistry-of-game-design/); I could not retrieve the full essay, so the four-part atom and the burnout stages are (LC), from summaries).
- **Raph Koster, "An atomic theory of fun game design"** (written 2004, posted 2012) ([post](https://www.raphkoster.com/?p=4090)). Every good loop ("atom") needs:
  - **Preparation**, with more than one viable way to prepare.
  - **A sense of place**: location should change tactics. "It's easy to have locations that turn out not to matter."
  - **A core mechanic** that is "intrinsically interesting", though "probably interesting only for a limited amount of time" on its own.
  - **A range of challenges**: "each enemy provides a unique puzzle". If new challenges fall to old tactics, players feel repetition.
  - **A range of abilities** and real **skill** in using them.
  - **Variable feedback** that is "contextual to what the challenge was"; random drops alone are not enough.
  - **The mastery problem**: "The system cannot permit high level players to derive maximum benefit from less challenging encounters", or you get "bottomfeeding".
  - **A cost of failure.**
- Koster's wider claim in *A Theory of Fun* is that fun is the feeling of learning a pattern, and boredom arrives when the pattern is solved (LC, from book summaries).

**For Belfort:** the existing docs already supply most of Koster's list for combat. The gaps are *preparation* (nothing to decide before a fight), *sense of place* in fights, and the *mastery problem* for respawning camps.

### 1.2 Core loop, session loop, long-term loop

**Michail Katkoff, "Mid-Core Success" parts 1 and 2 (Deconstructor of Fun, 2013)** ([core loops](https://www.deconstructoroffun.com/blog//2013/10/mid-core-success-part-1-core-loops.html); [retention](https://www.deconstructoroffun.com/blog//2013/10/mid-core-success-part-2-retention.html)). These are free-to-play articles; the structure transfers, the timers and negative incentives do not.

- **The dual loop.** A good core loop holds two session loops. The player can "stop their session after the first loop" or "continue playing through both of the loops and thus extend and deepen their session". His Clash of Clans example: a 30-second collect-and-leave session, or a fuller session of under five minutes (LC for the two durations).
- "Short, accessible and rewarding session should be the main goal." "Overlong sessions length is the cardinal sin a mid-core game."
- **Retention rule:** "every session takes them at least a bit closer to that goal", where the goal is one the player set for themselves.
- Daily bonuses and push notifications are, in his words, mostly cosmetic. What brings people back in those games is timers and the fear of falling behind. Belfort should take the first half of that sentence and leave the second.
- **Events** work best when they reuse the existing core loop instead of adding mechanics, and when their reward is a unique, non-consumable keepsake.

**Idle games: Anthony Pecorella (Kongregate)**

- GDC 2015, reported by Simon Parkin ([Game Developer](https://www.gamedeveloper.com/design/the-rise-of-games-you-mostly-don-t-play)): progress always rises, so a brief check-in moves the player up the curve and "creates a small celebration" on each return; the longer you stay away, the stronger the pull. Offline progress was popularised by AdVenture Capitalist and became standard. He recommends a natural pacing system over an energy currency.
- "The Math of Idle Games, Part I" ([Game Developer, 2016](https://www.gamedeveloper.com/design/the-math-of-idle-games-part-i)): costs grow exponentially (`cost = base × rate^owned`, with rate 1.07 for AdVenture Capitalist's first generator), production grows linearly or polynomially, and multipliers at thresholds (×2 at 25 and 50 owned) briefly push production ahead. Prestige resets progress for a permanent multiplier, "similar to New Game+".

**The model for Belfort (inference, built from the above)**

| Loop | Length | What repeats | What ends it well |
|---|---|---|---|
| Moment | 1–10 s | Dive, strike, dodge, bank through a gap | Hit feedback (other docs) |
| Core | 3–8 min | Spot from the air → land → deal with it → reward → take off | A reward and a visible change in the world |
| Session, short | 5–15 min | One daily flight, or one contract, or one camp plus the turn-in | A natural stopping point and one line about what is next |
| Session, long | 30–60 min | A town quest or a main-story step | A journal entry and a cliffhanger |
| Long-term | Days to weeks | Renown per town, Kroniek completion, dragon growth, the acts | A new town on the horizon |

The current build has the core loop and the long session. It lacks a designed **short session** and an explicit **stopping point**, which are exactly what a browser tab needs.

### 1.3 Engaging, not addictive

**GMTK, "How to Keep Players Engaged (Without Being Evil)"** (transcript). Mark Brown rules out "skinner boxes, daily rewards, resource decay, loss aversion" and lists what works on him instead:

- **Pacing:** swap between pillars and between intensities. "Trying to keep the game at max intensity for too long will lead to exhaustion." In an open world, give "lots of different types of activities" so players can "modulate their own fun".
- **Novelty,** and better, **novelty teased in advance**: The Witness's unsolvable door, Sen's Fortress, Hollow Knight's obstacles you cannot pass yet. "If you tease the player, you can get them excited before you've even dropped the new content which increases the amount of time you can go before dropping new stuff. It's economical."
- **Narrative mystery** and cliffhangers.
- **Long-term goals the player owns** (Stardew Valley): short-term milestones on the way, planning, "the thrill of exponential growth", optimisation, and being able to "fantasise about what it will be like" at the end.
- **A compelling challenge.** Failure is fine "if the runs are relatively short, if they feel a sense of getting better each time, and if they know the next session will be markedly different from the one before".

**Extra Credits** makes the same split in "The Skinner Box" and "Progression Systems: How Good Games Avoid Skinner Boxes" (2015): engagement and compulsion are different things, and a progression system should improve the experience instead of replacing it (LC: episode descriptions and forum quotes only; I found no transcript).

**Supergiant on Hades**

- "It was an explicit goal of our early development, to take the pain out of dying and having to restart", so that "the moment of death isn't about rage-quitting" (Greg Kasavin, via [Game Developer](https://www.gamedeveloper.com/design/how-supergiant-weaves-narrative-rewards-into-i-hades-i-cycle-of-perpetual-death)).
- The game checks the state of the run (for example low health) and plays one of several pre-written reactions. "Reactivity has always been a goal of our narrative design."
- "Every run should count." The team was "mindful that players have limited time" and built several story moments where a player can comfortably stop. "Returning to the House of Hades between escape attempts often makes you intrigued to give it another go" ([GameDaily, 2020](https://www.gamedaily.biz/?p=588)).

**Josh Wardle on Wordle:** "It's something that encourages you to spend three minutes a day, and that's it. Like, it doesn't want any more of your time than that" ([NME, quoting the New York Times](https://www.nme.com/news/wordle-creator-pleased-with-games-non-intensive-relationship-3129495)).

### 1.4 Rewards: where the line is

(Hopson's schedules and Kaplan's rising drop chance are in the other doc.)

- **Near misses.** Peter Howell (University of Portsmouth) argues that Vampire Survivors uses the casino "near miss effect": any run short of 30 minutes can feel like almost winning, as can almost reaching a level or a chest. He also notes Poncle "actively avoided the monetisation tactics so often employed on mobiles" ([The Conversation, 2023](https://theconversation.com/vampire-survivors-how-developers-used-gambling-psychology-to-create-a-bafta-winning-game-203613)). Luca Galante himself says his gambling-industry background shaped only the treasure-chest opening, not the game ([Game Developer, 2024](https://www.gamedeveloper.com/design/vampire-survivors-development-sounds-like-an-open-source-fueled-fever-dream)).
- **The dark-pattern list.** darkpattern.games sorts patterns into temporal, monetary, social and psychological. The temporal ones include *Playing by Appointment, Daily Rewards, Grinding, Infinite Treadmill, Can't Pause or Save, Wait to Play*; the social ones include *Social Pyramid Scheme* (rewards for inviting friends), *Social Obligation* and *Friend Spam* (LC, via [arXiv 2412.05039](https://arxiv.org/abs/2412.05039)). Use this list as a checklist of what the daily and the share features must not become.
- **Sakurai:** risk and reward are the "game essence": the designer confronts the player with a challenge and "must reward them accordingly", and combat should reward knowing the counter over mashing ([GDC 2004 report](https://www.gamedeveloper.com/marketing/postcard-from-the-gdc-2004-masahiro-sakurai-on-risk-and-reward); his 2022 "Risk and Reward" video restates it with Space Invaders and Mario's ledge jump, (LC) via [Nintendo Life](https://nintendolife.com/news/2022/08/video-masahiro-sakurai-breaks-down-risk-and-reward-in-games)).

**A working test (inference; it echoes a test attributed to the philosopher Bennett Foddy in [Filmmaker Magazine](https://filmmakermagazine.com/?p=70250) (LC): do the features that make a game more addictive also make it more enjoyable?):** a retention feature is acceptable if a player who learns exactly how it works would still want it. A one-per-day flight passes. A streak that resets passes only if missing a day costs nothing but the number.

### 1.5 Goals and rewards can backfire

**GMTK, "This Psychological Trick Makes Rewards Backfire"** (transcript; title is my identification)

- **Klei, Don't Starve:** tutorial quests taught players to play, then ruined the game. Players "focused exclusively on those quests", "avoided doing anything risky", and "became completely demotivated the second the quests ran out". Klei: "in structuring the game as a series of explicit tasks to be completed, we taught the player to depend upon those tasks to create meaning in the game."
- **Zach Barth** dropped optimisation achievements: "the game already has a reward system", meaning personal scores, friends' scores and histograms of every player's solution. "A goal that you set yourself is way more powerful than a goal someone else sets for you."
- **Mini Metro:** unlock thresholds became the finish line. Goals "are a checklist that can be completed", while "measurements of your skill, such as leaderboards and scoring systems, have no finish".
- **The over-justification effect:** an expected reward for something you already enjoy lowers your interest in it. The exception: rewards that are "unexpected, reasonably low value, and feel tied to the actual performance". Examples given: Mario Odyssey's coin caches in out-of-the-way spots and Breath of the Wild's Korok seeds.
- His advice: prefer large goals reachable any way the player likes; prefer "comparative metrics like leaderboards, histograms, and personal bests, rather than absolute thresholds"; make goals optional or hidden.

**GMTK, "Following the Little Dotted Line"** (transcript): treasure maps and unlisted scavenger hunts make players read the world, and "putting an extra step in before finding a reward makes it all the more sweeter".

**For Belfort:** quests should stay the frame, but flight, exploration and the daily should be scored with personal bests and found things, not with a checklist of achievements.

### 1.6 Persistence: widen, don't just strengthen

**GMTK, "Roguelikes, Persistency, and Progression"** (transcript)

- Pure permadeath rewards only skill, but "every failed run can feel like a waste of time".
- Permanent upgrades give every run meaning but create "a really weird difficulty curve, where the game is at its most challenging when you begin", and leave it "ambiguous whether it was because of your improving skill level, or just the ever-decreasing difficulty".
- The middle paths he praises:
  - Unlocks that add **variety, not power** (Enter the Gungeon adds guns to the pool; Nuclear Throne adds characters with trade-offs).
  - **Cosmetics** (Downwell palettes).
  - **Story as the persistent reward** (Hades): "Unlocking new narrative stuff gives you something to hold onto, even while you're failing over and over again."
  - **Shortcuts** that help practice but do not count for the leaderboard (Spelunky).
  - **Bank it or lose it** (Dead Cells; Rogue Legacy's Charon), which keeps skill in the loop.
- In a later video on the power fantasy he adds that Hades gives "rewards for trying out weapons you haven't used in a while", and that the goal is "letting players find their own way to feel powerful".

**Monster Hunter** (Josh Bycer, [Game Developer, 2019](https://www.gamedeveloper.com/business/examining-the-rise-of-monster-hunter)): the loop is "fight monsters, get loot, grow more powerful, and repeat", but "there is no leveling"; "the only way to get better gear is to craft it" from parts of the monster you chose to hunt, and attacking specific parts breaks off specific materials. Fourteen weapon types each "take dozens of hours to learn, master, and upgrade". The game is "built entirely on its end-game content".

**Elden Ring's level curve** (GMTK's video on game economies, transcript): the rune cost per level rises so steeply that farming early enemies stops paying, which is a negative feedback loop against grinding. The same video on The Witcher 3: players farmed cows for hides until a patch sent a level-27 monster after anyone who killed six.

### 1.7 Daily content that respects players

**Spelunky's Daily Challenge**

- One generated adventure per day, the same for everyone, one attempt, its own leaderboard.
- Mike Rose, "The understated genius of the Spelunky Daily Challenge" ([Game Developer, 2013](https://www.gamedeveloper.com/design/the-understated-genius-of-the-i-spelunky-i-daily-challenge)): the single attempt "amplifies the risk involved" and leads to "slow approaches and more calculated movements"; players started "treating the main game mode as a practice mode for the real game"; communities formed "all vying to beat their friends, co-workers and acquaintances" and watched each other's recorded runs. He contrasts this with daily challenges you can retry freely, where the risk is absent.

**"The 24-hour ticket: Examining daily runs"** ([Game Developer, 2017](https://www.gamedeveloper.com/design/the-24-hour-ticket-examining-daily-runs-))

- Will Lewis (Caveblazers): "The only two principles are that there is a shared seed, and that it changes every day." He reports a very small daily drop-off and says the mode was one of the easiest large features to build. One life makes players "value" it.
- Sébastien Bénard (Dead Cells): a one-shot run "drastically raises the stakes"; unlimited attempts are "less punishing and more welcoming". Dead Cells allows unlimited attempts and saw about 7,000 daily runs a day. Watching a video of the day's level first gives "a considerable and unfair edge".
- OlliOlli: free practice, then one recorded attempt. Its dailies use sections of later levels, so they double as a preview of content the player has not reached.
- The single attempt removes the advantage of players with more time.

**Wordle** ([Game Developer on Wardle's GDC 2022 talk](https://www.gamedeveloper.com/marketing/josh-wardle-reflects-on-the-the-unconventional-road-to-wordle-s-success))

- The first prototype (2013) had endless play. The once-a-day limit came in 2021 from the New York Times crossword and Spelling Bee: "I just wanted a game that was just three minutes of your time a day, and that's it."
- The limit had an effect he did not plan: everyone solves the same puzzle, so there is something to talk about.

**Hades' Pact of Punishment** (obs): after the first clear, the player chooses which difficulty conditions to add, and rewards are tied to raising the total. It is opt-in difficulty the player composes, not a daily. Kasavin on Hades II: "If you don't finish the run, it doesn't mean that you failed" (LC, [GamesRadar](https://gamesradar.com/games/hades/hades-2-director-challenges-roguelike-convention-if-you-dont-finish-the-run-it-doesnt-mean-that-you-failed)).

**Rules that follow**

1. Same seed for everyone, changing at a fixed local midnight.
2. Short enough to be "three minutes a day".
3. One *recorded* attempt, with free practice afterwards (OlliOlli's order reversed, so nobody has to wait to play; this choice is my inference).
4. No power rewards, so the daily is fair to a visitor who has never played and does not become a chore for a regular.
5. Use the daily to show places the player has not reached yet.

### 1.8 Exploration, and what makes flying purposeful

**Breath of the Wild** (GMTK, ["How Nintendo Solved Zelda's Open World Problem"](https://gmtk.substack.com/p/how-nintendo-solved-zeldas-open-world), which reports Nintendo's CEDEC 2017 talk; the triangle rule itself is in the other doc)

- First design: towers as "points" joined by roads as "lines". Playtest heat maps split about **80% on the main route and 20% wandering aimlessly**. Players felt "stuck on a linear path".
- The fix: many small lures (shrines, stables, camps), each with **a clear reward** and **a distinct silhouette or light**: glowing shrines, smoke columns, skull-shaped rocks, a giant horse head over every stable. "Wherever you look, you should find something interesting to do."
- Players get distracted, finish, return to their goal and get distracted again: a breadcrumb trail that still delivers them to the major places.
- What attracts changes with the player's needs and with the time of day.
- From GMTK's Breath of the Wild video (transcript): towers fill in the map's terrain but place no icons, so "you are led through the world, not by icons and waypoints, but by your own curiosity", and "importantly, there's probably something good" there. "Exploration is always encouraged when it's fun to move around."

**The Witcher 3**

- The **40-second rule**: testing suggested a player should come across something worth their attention about every 40 seconds of travel (LC: reported from Noclip's documentary by [TweakTown](https://www.tweaktown.com/news/59420/witcher-3s-40-second-rule-kept-players-engaged/index.html), which I could not open, and the subject of an [Uppsala thesis](https://openaccess.library.uitm.edu.my/Record/ndltd-UPSALLA1-oai-DiVA.org-uu-446386)). A CDPR designer later said he had put too many markers on one map (LC).
- Patrick Klepek's report ([Kotaku, 2015](https://kotaku.com/how-the-witcher-3s-developers-ensured-their-open-world-1735034176)): "the quest content dictated the size of the world, not the other way around". A guideline of about 15 lines of dialogue per side quest. **Generated monster contracts were tried and dropped: "The outcome was very unsatisfying."** Side quests were usually built around assets that already existed.
- Contracts (obs): notice board → talk to the client and haggle → investigate with witcher senses → identify the monster and prepare oils, potions and bombs → fight → a choice at payment. The best ones tie the monster to a human story.

**World of Warcraft: Dragonflight's dragonriding** (the closest reference for a dragon you fly for fun)

- Blizzard's own description ([Dragonriding and You](https://worldofwarcraft.blizzard.com/en-us/news/23818251/updated-aug-25-dragonriding-and-you-ascending-to-new-heights-of-skill), preview numbers):
  - Pointing down gains speed quickly; pointing up trades speed for height.
  - **Vigor** is the resource for bursts (Surge Forward, Skyward Ascent, Whirling Surge). Upgrades raise the maximum to 6. It recharges slowly on the ground (1 per 30 s) and **faster while flying at high speed** (1 per 15 s, down to 1 per 5 s with upgrades). Flying well pays for more flying.
  - **Dragon Glyphs** are collectables placed in the sky and on peaks; "some are simple to find, while others require exploration and clever use of abilities". Collecting them buys the flight upgrades.
  - **Races**: timed courses with checkpoints; personal bests are recorded.
- Lead quest designer Maria Hamilton ([Laptop Mag, 2022](https://www.laptopmag.com/features/wow-dragonflight-zones-deep-dive-with-tina-wang-and-maria-hamilton)): quest givers and events were put high up so "players would have that pleasure of diving off of a high area"; things were placed to be noticed from the air so that "maybe I wanna go back there later, because there's something there". Art lead Tina Wang: the zones needed "negative spaces in between those points of interests" because flight is fast.

**A Short Hike** (Adam Robinson-Yu, [PlayStation Blog, 2021](https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/); his [GDC 2020 postmortem](https://gdcvault.com/play/1026613/) is the fuller source)

- "A tiny open world" built for "a sense of freedom"; he wanted players to take "the road less travelled, and have your curiosity be rewarded", and designed for players who go "the exact opposite of the obvious route".
- Mini-games sit "on the off-paths and break up the hiking".
- The summit is the payoff: "surveying the landscape from a new perspective".
- Music follows movement: strings "chime in whenever the player is flying".
- Golden feathers (obs): each one adds a climb or flap, so the collectable *is* the flight upgrade and the gate to the summit.

**Sable** ([Game Developer, 2021](https://www.gamedeveloper.com/design/using-a-lemon-shaped-structure-to-create-the-sanguine-open-world-of-i-sable-i-))

- A "lemon shape": "a beginning and end alongside a loose middle".
- "We had to make a lot of things that weren't interdependent and could live without each other", which also let two developers cut content safely.
- The rule: if you can see it on the horizon, you can go there.

**Microsoft Flight Simulator's landing challenges** (LC, [fan wiki](https://flight.fandom.com/wiki/Microsoft_Flight_Simulator_(2020)/Landing_Challenges)): score = (precision + ground roll) × smoothness, with world and friends rankings. A landing is a 60-second skill test with a number at the end.

**Forza Horizon** (LC, [Xbox Wire, 2014](https://news.xbox.com/en-us/2014/08/12/gamescom-forza-horizon-2-social-features/)): asynchronous Rivals let you race a friend's ghost on your own schedule; world stunts (speed traps, jumps) show the nearest friend's score to beat.

**What makes flight purposeful (synthesis; the list is my inference from the above)**

1. **An energy game:** height and speed trade against each other, and good flying refills the resource.
2. **Things only visible or reachable from the air:** glyph-style collectables on towers and ridges.
3. **A reason to come down:** content noticed from above, and landings that are a small test.
4. **Courses with a clock and a personal best,** not hoops for their own sake. A ring is only fun when the line between two rings is a decision.
5. **A view as a reward:** summits and towers that reveal the next thing.
6. **Empty space on purpose,** tuned to flight speed, with something to see about every 40 seconds.

### 1.9 Return triggers without dark patterns

What the sources support:

- **An unanswered question.** Tease before you deliver (GMTK). End a session on a hook, not on a reward.
- **A goal the player set.** Each session should move it a little (Katkoff).
- **Something new that is the same for everyone today** (Spelunky, Wordle).
- **A small celebration on return** (Pecorella): the world did something while you were away.
- **A place to stop** (Hades, Wordle). Players come back more readily to a game that let them leave.
- **Other people.** A friend's result is the strongest reminder (Topic 2).

What to avoid, by name: appointment timers that punish absence, daily login rewards, streaks that take something away, energy systems, notifications, and rewards for inviting people.

---

## 1B. What the reference games concretely do

| Game | The loop that retains | The trick worth copying | Fits Belfort? |
|---|---|---|---|
| **Diablo / Path of Exile** | Kill → drop → equip → kill harder | Covered in the other docs. New here: Koster's "contextual" rewards. A drop should say something about what you killed. | Named enemies drop their own named thing |
| **Hades** | Run → die → House → run | Death pays in story; reactive lines about the run you just had; opt-in difficulty; planned stopping points | Yes: gossip about your last deed; stopping points |
| **Vampire Survivors** | 30-minute run, a level-up choice every few seconds | Very short time to first decision; one clear target (survive to 30:00) | The time-to-first-fun lesson, not the near-miss |
| **Monster Hunter** | Choose a target → prepare → hunt → carve → craft | No levels: you hunt *that* monster for *that* part; part breaks | Yes, for folklore monsters and bounties |
| **Breath of the Wild / Tears of the Kingdom** | See → go → small surprise → see the next thing | Many small visible lures, each with a clear reward; surprise rewards for curiosity; TotK: "create a system that makes fun things happen" (LC, [GameSpot on the GDC 2024 talk](https://www.gamespot.com/articles/building-tears-of-the-kingdom-from-the-bones-of-botw-was-harder-than-you-would-think/1100-6522182/)) | Yes: lures readable from the air |
| **Elden Ring** | Explore → find something too hard → come back stronger | Rising level cost kills grinding; danger you can walk into | Camp XP that falls off |
| **Witcher 3 contracts** | Notice → investigate → prepare → fight → decide | Hand-written, 15 lines, built from existing assets; generated ones failed | Yes: the 10-minute session unit |
| **Assassin's Creed** | Climb → synchronise → the map fills → clear the icons | The viewpoint is a fine reward; the icon flood is the warning (GMTK contrasts it with BotW's towers) | Towers reveal terrain and one rumour, not icons |
| **Ghost of Tsushima** | Covered in the other doc | New here: photo mode output (Topic 2) | |
| **Sable / A Short Hike** | See → glide there → small story → new vantage | Collectable = movement upgrade; independent points of interest; content for players who go the wrong way | Yes: this is the flight layer |
| **WoW dragonriding** | Dive → speed → vigor → climb → dive | The energy loop, glyphs, races with personal bests | Yes: closest match |
| **Stardew Valley** | Day → plan → work → sleep | A fixed-length day as the session unit; self-set long goal; growth you can see | The bell-to-bell day as a session frame |
| **Idle games** | Leave → return → collect → reinvest | The return is a celebration; offline progress, capped | Lightly: things waiting at the inn |
| **Spelunky / Dead Cells / Slay the Spire dailies** | One shared seed a day | One recorded attempt; practice allowed; no power rewards | Yes: proposal 3.1 |
| **Wordle** | One puzzle a day | Three minutes, then it lets you go; a result that fits in a message | Yes: proposal 3.1 |

---

## 1C. Recommendations for Belfort: loops

Impact: H/M/L. Effort for one developer: S (a day or two), M (about a week), L (several weeks). Backend: none / optional / required. All of these are my proposals (inference); the last column names the evidence.

| # | Recommendation | Impact | Effort | Backend | Based on |
|---|---|---|---|---|---|
| L1 | **A daily flight, the *Klokkenronde*.** Same course for everyone that day, seeded by the date, 2–4 minutes, one recorded attempt, then free practice. Playable from the title screen without a character. Full design in 3.1. | H | M | none (optional for a ranking) | Spelunky, Caveblazers, OlliOlli, Wordle |
| L2 | **Give the title screen two doors: *Dagvlucht (3 min)* and *Verder spelen*.** The short session is a first-class choice, and a returning player with five minutes has somewhere to go. | H | S | none | Katkoff's dual loop |
| L3 | **Make flying an energy game.** Add a *Vuur* (or *Adem*) gauge of 3–6 charges for the boost and a steep climb. It refills slowly when cruising and fast while diving or skimming roofs and treetops at speed. The boost exists; this turns it from a cooldown into a reward for flying well. | H | M | none | Dragonriding's vigor and "Thrill of the Skies" |
| L4 | ***Torenhanen*: a collectable only reachable in flight.** A gilded weathercock on each church tower, mill cap and gate. Fly through it to ring it. Every few add a charge or speed up the refill. About 12 in Diest and Scherpenheuvel, some trivial, some needing a dive between gables. No map icons; a tower you have not taken glints. | H | S–M | none | Dragon Glyphs; golden feathers; Korok-style surprise |
| L5 | ***Wedvluchten*: authored races between landmarks** (Diest's gates, the Demer bends, the basilica's seven sides). Bronze, silver and gold times, a personal best, and your own ghost. Three to five to start. The daily reuses the same code. | H | M | none | Dragonriding races; Forza Rivals |
| L6 | **Landings as a 30-second skill test.** Mark landing spots (the Grote Markt, a barge on the Demer, the basilica steps). Score = (precision + stopping distance) × softness, shown as a word, not a number: *zacht*, *stevig*, *in de mesthoop*. Townsfolk already scatter; let a soft landing earn a cheer and a hard one a complaint. | M | S–M | none | MSFS landing challenges; Peak's readable failure |
| L7 | **A stopping point and a hook at the end of every session unit.** After a quest step or a daily: a one-screen *Avondklok* summary (what changed, what you found, what is waiting) and one teased line ("In Leuven is een professor verdronken in een droge kelder."). On load: a three-line "*Vorige keer…*" from the journal. Never block quitting. | H | S | none | Hades' stopping points; GMTK on teasing; Katkoff's "every session a bit closer" |
| L8 | **Contracts as the designed 10-minute session,** with a fixed five-beat shape: client → tracks (best read from the air) → prepare (choose one of two salves or bell tunings) → fight → a choice at payment. Hand-write each one in 15 lines or fewer, from assets that exist. Do not generate them. | H | M per batch | none | Witcher 3 (generated contracts "very unsatisfying"); Koster's "preparation" |
| L9 | **Bestiary knowledge that changes the fight.** The Kroniek's *Wezens* page gains three tiers per creature: seen, fought, known. *Known* reveals the weakness and the part to strike (the Kludde's chain, the wisp's lantern), and a named creature drops its own named material for one specific upgrade. | M | M | none | Monster Hunter; Koster's contextual feedback |
| L10 | **Completion shown per town, without icons.** In the Kroniek and on the map: "Diest: 14 van 22 plaatsen, 5 van 12 torenhanen, 3 van 4 wedvluchten". Locked entries keep their existing hint line. No pop-up achievements. | M | S | none | GMTK on long-term goals and on achievements backfiring |
| L11 | **Small, unannounced rewards for curiosity.** A few florins and a line of lore on a roof ridge, under a bridge, in the unfinished tower. Never listed, never counted. | M | S | none | Over-justification effect; Korok seeds; Odyssey's coin caches |
| L12 | **Unlock breadth, not just numbers.** New bell tunings, dragon breaths and salves should be sidegrades with a trade-off. Give a small bonus for using the origin skill you have used least lately. | M | M | none | GMTK on roguelites; Hades |
| L13 | **Fix the mastery problem for respawning camps.** XP and loot from a camp fall off as you out-level it. A cleared camp can come back *harder if you ask for it*: a notice at the camp lets you add one condition (a captain, a night attack, no salves) for a better named reward. | M | M | none | Koster's bottom-feeding; Elden Ring's curve; Hades' Pact |
| L14 | **Something waiting when you come back.** After a day or more away: a letter at the inn, a rumour from the pilgrims, a gift from a town where your renown is high, the rested bonus already planned. Cap it at about two days so staying away is never the best strategy and coming back late never costs anything. | M | S | none | Pecorella: the return as "a small celebration" |
| L15 | **An almanac tied to the real date.** Today's date is the same day in 1650 (the Spanish Netherlands were already on the Gregorian calendar; (inference), check against `docs/history`). Market days, Sint-Maarten, the Scherpenheuvel processions happen on their day. Missed events are retold by a pilgrim the day after, so nothing is lost for good. | M | M | none | The design doc's world events; darkpattern.games on appointment mechanics |
| L16 | **Tease the next town from the first hour.** Leuven's towers on the horizon, a road sign, a locked gate with a guard who says "nog niet". A sealed door in Diest that opens in Act II. | M | S | none | GMTK: tease before you deliver |
| L17 | **Tune empty space for flight speed.** At a 20–30 m/s cruise, 40 seconds is 800–1,200 m: place one readable thing (smoke, a mill, a gallows hill, a wisp light at dusk) at about that spacing along likely flight lines, and leave the rest empty. | M | M | none | The 40-second rule (LC); Dragonflight's "negative spaces" |
| L18 | **A bell-to-bell day as an optional session frame.** The morning Angelus starts a day; the evening bell offers "*Naar de herberg?*" with the summary from L7. | L | S | none | Stardew's day; Wordle's "that's it" |
| L19 | **A weekly bounty, the *Premie*.** One named deserter captain or creature a week, seeded by the week number, with two conditions. Same for everyone, shareable like the daily. | L–M | S after L1 and L13 | none | Daily-run modifiers (Caveblazers) |


---

# Topic 2: viral and social mechanics with little or no backend

## 2A. Key principles

### 2.1 What actually made web games spread

**1. A result that is worth showing and safe to show: Wordle**

- Josh Wardle at GDC 2022 ([Game Developer](https://www.gamedeveloper.com/marketing/josh-wardle-reflects-on-the-the-unconventional-road-to-wordle-s-success)): a player came up with typing the result as a grid of emoji; he saw others copy it and "implemented it into the game". **He left the game's link out of the grid**, for the look of it and because he was uneasy about sharing that mainly served the game. The cryptic grids made it feel like a club.
- How it started ([BuzzFeed News, 2022](https://www.buzzfeednews.com/article/stefficao/how-wordle-went-viral-strategy)): a New Zealand Twitter thread in November 2021, a rule against posting answers ("that meant there was no feeling of exclusion or being too late to the party"), a hashtag (#DailyWordleClub), and then Elizabeth S., who found coloured emoji tiles "much easier" for sharing without spoilers. Daily traffic went from about 90 users to 2 million. Between 1 and 13 January 2022, 1.2 million tweets contained a grid. Journalists played, tweeted, then wrote about it.
- Wardle on the grid: it lets people share "without ruining the game for others" ([The Spinoff](https://thespinoff.co.nz/media/13-01-2022/those-coloured-boxes-on-twitter-are-new-zealands-fault)). He considered an automatic share-to-social tool and found it "trashy" ([NME](https://www.nme.com/news/wordle-creator-pleased-with-games-non-intensive-relationship-3129495)).
- The backlash is part of the record: "Nobody cares about your Wordle performance" (The Spinoff). Keep the artifact small.
- Why the grid works (inference from the above): it shows the *shape of an attempt*, not only a score; it is identical in format for everyone, so two grids can be compared at a glance; it is text, so it pastes anywhere; it carries the game's name and the day's number, which is all a curious reader needs to find it.
- The followers kept the form. Semantle reached nearly 200,000 daily players within two months, and its open code spawned other-language versions (LC, [Wikipedia](https://en.wikipedia.org/wiki/Semantle)). Heardle and Worldle started as mods made for friends (LC). In Dutch, a student built *Woordle* in a day in January 2022; Trouw reported 35,000 daily players, and VRT NWS noted a Belgian variant, Woordol.be (LC, [VRT NWS](https://www.vrt.be/vrtnws/nl/2022/01/21/wordle-verovert-de-wereld-in-een-rotvaart-waarom-dit-lingo-2-0/)). A Dutch-language daily has a ready audience.

**2. No friction between the link and the game**

- Wardle lists "a website instead of an app" among the things he was "not meant to do" (Game Developer, above).
- Among Us grew fastest on mobile, where the cost of trying it was nothing (LC, [PC Gamer](https://www.pcgamer.com/how-among-us-became-so-popular)). agar.io and slither.io were a URL and a nickname; YouTubers and Reddit did the rest (LC, [Pocket Gamer](https://www.pocketgamer.com/agar-io/how-agari-io-conquered-the-app-store-without-spending-a-penny)).
- Max Bittker on Sandspiel: he avoided accounts because they are "annoying for the user and boring to implement" ([Making Sandspiel](https://maxbittker.com/making-sandspiel)).

**3. Other people's videos are the distribution, but only for a game that holds**

- GeoGuessr passed 60 million registered players and its developers "attribute it to creators like Rainbolt"; its second World Cup peaked at 254,918 concurrent viewers ([Tubefilter, 2024](https://www.tubefilter.com/2024/09/16/location-obsessed-creators-put-geoguessr-on-the-map/)). The formats that spread were skill made visible in seconds: a guess from a tenth of a second of footage (LC).
- Chris Zukowski on Among Us ([How To Market A Game, 2020](https://howtomarketagame.com/2020/09/14/among-us-the-4-lessons-of-their-viral-success/)):
  - Virality could not be planned. The chain was an itch.io front-page feature the developers asked for → a Korean streamer → a Steam daily deal → a bigger streamer.
  - "Platforms are really what give your game visibility." "Nobody is going to promote your game for you."
  - Streamers cannot fake retention: several developers saw 3 million viewers produce only 30 downloads. "You need a good game that people play for 4 hours un-coerced."
- Vampire Survivors' sales took off after a single YouTube review by SplatterCat (Game Developer, above). Suika Game sat unnoticed for nearly two years until Japanese streamers and VTubers picked it up in 2023; its maker said it was not clear what triggered it (LC, [Automaton](https://automaton-media.com/en/news/20231005-22096/)). Getting Over It briefly topped Steam on the strength of streamers' rage (LC).
- What makes a game watchable. Nico Deyo on Peak ([Aftermath, 2025](https://aftermath.site/peak-multiplayer-streamers)): the design makes "mistakes and teamwork easy for an audience to read"; the best way forward is to "fail spectacularly"; "streamers have been making quick work at capturing the hilarity in real time". That is a co-op game, but legible failure and physical comedy transfer to a single-player one.
- Tears of the Kingdom's designers describe their aim as "rather than creating something fun, create a system that makes fun things happen" (LC, GDC 2024 via GameSpot, above). Systems that surprise the player are also what gets clipped (inference).

**4. An audience for what the player made**

- Sandspiel: upload galleries give every player "a immediate audience for their creation", and "the added dimension of an audience brings so much depth to playing around with sand". Over 70,000 creations uploaded; "a couple thousand" daily players.
- Townscaper: Oskar Stålberg gained about 90,000 followers by posting progress, and released a free browser version in December 2021 (LC, [PC Gamer](https://www.pcgamer.com/the-most-pleasant-game-of-2021-is-now-playable-in-your-browser)). A town can be copied to the clipboard as a short string and pasted by someone else (obs): a creation shared as text, with no server.
- Photo modes (2.2).

**5. Being first, or being counted**

- Infinite Craft marks a result nobody has made before as a "First Discovery"; its launch post drew over 15 million views in a week (LC, [Wikipedia](https://en.wikipedia.org/wiki/Infinite_Craft)). This needs a server that knows what everyone has found.
- Cookie Clicker peaked at 1.5 million hits in a day in August 2013 (LC). A big number going up is easy to screenshot.

**6. An existing audience, or a platform that lends you one**

- Pieter Levels' browser flight game fly.pieter.com is the nearest recent case to Belfort's technology: a free in-browser flight game built quickly with AI help. He claimed more than $50,000 a month within weeks; 404 Media's point is that his large following did the work and others should not expect the same ([404 Media, 2025](https://www.404media.co/this-game-created-by-ai-vibe-coding-makes-50-000-a-month-yours-probably-wont/)). His own figure was $1M annualised in 17 days; later reports say it fell to about nothing (LC). Novelty spikes fade without a loop.
- Web portals: Poki reports hundreds of millions of players a year and curates by hand; guides describe a revenue split of 100% on traffic you bring and 50/50 on theirs; CrazyGames reports tens of millions of monthly users (all LC and largely self-reported). For a Dutch-language game, the daily flight is the piece that travels, because it needs almost no text (inference).

**7. A real place**

- "Your house" was reported as the most popular destination in Microsoft Flight Simulator (LC, attributed to Microsoft in [GeekWire](https://www.geekwire.com/2020/ability-fly-anywhere-world-microsoft-flight-simulator-players-choose-special-place/), which I could not open). A reviewer describes the impulse: "as I'm sure literally every computer-literate person did when Google Earth first appeared", he flew over his home ([TheSixthAxis, 2020](https://www.thesixthaxis.com/2020/08/18/microsoft-flight-simulator-road-to-review-the-simple-joys-of-flying-over-your-own-home/)). Players shared screenshots of their home towns and back gardens (LC).
- See 2.6.

### 2.2 Shareable artifacts

**Photo modes** (Cody Mello-Klein, [Game Informer, 2017](https://www.gameinformer.com/b/features/archive/2017/11/22/opinion-photo-mode-matters-in-modern-gaming.aspx))

- Jan-Bart van Beek, Guerrilla Games: a programmer there called photo mode "crowdsourcing marketing": "You get all your fans, and they're sort of helping you show the game from its most beautiful viewpoints." His art team "would do nothing else for days but look at a stream of pictures coming in." Fan photo threads for Horizon Zero Dawn reached 50 pages within days; Guerrilla ran a ten-week photo contest.
- Bruno Guerin, Ubisoft Montreal: photo mode gives "even more ownership to players over our games"; "it's no longer a few developers making something for all players".
- Ghost of Tsushima players took about 15.5 million photos in the first ten days (LC, Sony's launch statistics via [PlayStation LifeStyle](https://www.playstationlifestyle.net/2020/07/31/foxes-petted-ghost-of-tsushima-stats-10-days/)).
- I found no figure for what share of players use a photo mode, and no developer statement from Insomniac or Kojima Productions on its marketing value.

**Why photo modes get shared (inference from the quotes):** the picture is the player's own work, it flatters the game, and it needs no explanation to someone who has never played. For Belfort there is a fourth reason: the art direction *is* a kind of picture people already hang on walls.

**Result cards and character sheets (inference):** a result card works when it is a claim about the player ("I did this, like this"), fits one screen of a chat, and has one detail a friend can beat or tease. A character sheet as an image works at moments of pride: a level cap, an act finished, a rare drop.

### 2.3 Asynchronous social: what the references do

| Game | Mechanism | Why it works | Server needed? |
|---|---|---|---|
| **Dark Souls / Elden Ring** | Messages built from fixed phrases; bloodstains replay another player's last seconds; summon signs | Miyazaki traces the feeling to strangers silently pushing his stuck car up a snowy hill and vanishing (LC, [GamesRadar](https://www.gamesradar.com/elden-ring-and-dark-souls-summoning-system-was-inspired-by-miyazakis-car-breaking-down/)). Fixed phrases mean nothing to moderate (obs). | Yes, small |
| **Death Stranding** | Other players' ladders, roads and signs appear in your world; you can only give likes | Kojima: "Giving 'likes' is giving unconditional love." His staff wanted points; he refused because it "would be like a normal game". Likes do nothing mechanically ([Game Informer, 2019](https://www.gameinformer.com/2019/09/16/likes-in-death-stranding-are-unconditional-love-not-currency)). | Yes |
| **Nier: Automata, ending E** | Other players' encouragement appears as you fail; you may give up your save to help a stranger | Yoko Taro wanted players to "ask themselves certain questions" and did not want to force the theme (LC, [Siliconera](https://www.siliconera.com/yoko-taro-speaks-varied-endings-meanings-nier-automata/)) | Yes, small |
| **Kind Words** | Anonymous letters and one reply | Ziba Scott: "So much of my development time is spent on the moderation systems." "If you can say something mean to somebody, but you'll never know if they got it, then you won't get the satisfaction." No follower or like counts ([Inverse, 2023](https://www.inverse.com/gaming/kind-words-2-ziba-scott-interview)). | Yes, plus moderation |
| **Racing ghosts** (Trackmania (obs); Forza Rivals (LC)) | A recording of someone's run plays beside you | Presence without netcode; the rival is always exactly as good as they were | No, if the ghost travels in a link or a file |
| **Spelunky Daily** | Same level, one try, watch each other's videos | Shared circumstances make any two runs comparable | Only for the ranking |
| **Sandspiel** | Upload a creation; others browse and vote | An audience with no comment section | Yes, small: Bittker allowed only GET, INSERT and vote, stored saves as PNG, and moved about 60,000 records from Firestore to Postgres at about a tenth of the cost |

**What can be done with no server (inference)**

- A challenge link that carries a result and a ghost (proposal 3.3).
- Ghosts shipped with the game: the developer's and playtesters' flights on every race, named as people of 1650.
- Comparing two pasted results by eye, as Wordle players do.

**What needs a tiny server (inference)**

- A daily histogram ("better than 62% of today's flights").
- The day's flock: 10–20 stored ghosts flying the daily beside you.
- A communal counter ("the bells of Diest rang 1,204 times today").
- Notes built from fixed phrases, with one positive reaction.

**What not to fake:** invented "other players". The Kroniek labels what is history, what is folk tale and what is made up; a social layer that passes off seeded data as real people would break that promise (inference).

### 2.4 Leaderboards and their pitfalls

- A global first-to-last table motivates the few at the top and tells everyone else they have lost. Fixes that practitioners recommend: show a percentile instead of rank #42,372; small boards of 5–15 people (friends, a region, a cohort); show the few just above and below; reset often ([Yu-kai Chou](https://yukaichou.com/gamification-study/why-most-leaderboards-fail-and-how-to-fix-yours-in-5-steps/); this is practitioner advice, not research).
- Zach Barth's histograms show where your solution sits among everyone's and need no names (GMTK, above).
- Outside knowledge is an edge: watching a video of today's course before your one attempt (Bénard, above).
- A board that shows cheaters stops being a benchmark (LC, gamedev.net). With scores computed in the browser, cheating cannot be prevented, only made unrewarding (inference): the server sets the date, scores outside physical limits are dropped, rank earns nothing, and the default view is a histogram and your friends, not a top ten.

### 2.5 Creator and streamer friendliness

Supported by the sources: a game that is good for hours unprompted (Zukowski); failure that is readable and funny to an audience (Aftermath); a short, same-for-everyone challenge that invites comparison videos (Spelunky); asking platforms for featuring (Zukowski).

My additions (inference): no licensed music (the audio is already procedural); a plain statement on the site that anyone may stream and monetise videos; a "clean screen" toggle that hides the interface; a seed or date in the corner of daily runs so viewers can try the same flight; nothing on screen that leaks personal data.

### 2.6 Local pride and heritage

- **Kingdom Come: Deliverance** ([Radio Prague International, 2026](https://english.radio.cz/node/8880257)):
  - Visitor numbers doubled at the cathedral and ossuary at Sedlec (Kutná Hora).
  - Mobile-operator data showed visits to the game's sites up by as much as 300% among 18–25-year-olds. Fans stay longer than typical tourists.
  - The "KCD Live" project (guided tours in the hero's footsteps, an escape game with about 5,000 visitors a year, a fan festival with 2,500) drew about 50,000 web visitors from 65 countries. A cycling trail between sites is planned.
  - "The idea came from local gaming enthusiasts", not from the studio.
- **Ghost of Tsushima:** the mayor named the two directors permanent tourism ambassadors because they "spread the name and history of Tsushima to the whole world in such a wonderful way"; the city planned a tourism campaign with Sony; fans gave about 540% of a 5-million-yen goal to rebuild a shrine gate, more than 2,000 donors ([VGC, 2021](https://www.videogameschronicle.com/news/ghost-of-tsushima-devs-to-be-made-permanent-ambassadors-of-the-real-island)).
- **Assassin's Creed Discovery Tour:** a preliminary Université de Montréal study (about 330 pupils aged 12–16) found the combat-free tour improved test scores on ancient Egypt, with teacher-led lessons still ahead; Ubisoft's own account calls the results practically identical. McGill later wrote curriculum guides so teachers could build lessons on it (LC throughout: [Variety](https://variety.com/2018/gaming/news/assassins-creed-origins-discovery-tour-effectiveness-1202861325), [Ubisoft](https://news.ubisoft.com/en-ca/article/6hdun1C45bTaxoopauvGY9/from-the-studio-to-the-classroom-ubisofts-educational-games-and-services-help-players-learn-around-the-world)). The lesson: a mode without combat, plus material a teacher can use, is what gets a game into a classroom.
- **Flanders:**
  - I found **no documented case of a Flemish heritage game spreading widely at home.** The nearest things found: *Ename 1665*, a game built on a 3D reconstruction of a 17th-century Flemish village inn (LC, [Europeana](https://leuven2012.europeana.eu/data/virtual-17th-century-flemish-inn)), and the European *Time Machine* project, in which the universities of Antwerp and Ghent planned walkable historical reconstructions for education (LC, [VRT NWS, 2019](https://www.vrt.be/vrtnws/nl/2019/03/01/europees-onderzoeksproject-wil-steden-virtueel-toegankelijk-make/)). That reads as a gap, not as proof of demand.
  - The VAF Gamefonds funds games with "a clearly demonstrable link to the Flemish context", for example through subject, heritage or history, released at least in Dutch (LC, [regulation of November 2024](https://vaf.be/files/downloads-Gamefonds/18.-reglement-gamefonds-08.11.2024.pdf)). Belfort fits the wording; check the current rules before relying on this.
  - A solo developer's free *Hereford 1642*, a recreation of his home city, exists on Steam; I found no press coverage of it (LC). A faithful recreation alone is not a story. A playable game with a hook ("fly a dragon over your street in 1650") is.

**What earns local press and institutional interest (inference from the cases)**

1. A claim a journalist can check in one click: the real street plan, the real year.
2. A picture that is unmistakably *that* town.
3. Local people to quote: the developer, a historian, a teacher.
4. Something for the reader to do today: find their own street.
5. For schools and tourist offices: a mode without fighting, honest sourcing (the Kroniek's truth labels are already this), and no payment or account.

One caution from `vision.md`: Scherpenheuvel is a living place of pilgrimage. Social features should not turn devotion into a counter (no "light a candle" tallies) (inference).

### 2.7 Practical limits: Web Share, clipboard, link previews, results in a URL

**Web Share API** ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share); support data from [mdn/browser-compat-data](https://github.com/mdn/browser-compat-data), `api/Navigator.json`, read November 2026)

- Requires HTTPS and **transient user activation**: it must run from a click or key press and "cannot be launched at arbitrary points by a script".
- `share({ title, text, url, files })`. Test files with `navigator.canShare()` first. PNG, JPEG and WebP are on the list of shareable types.
- Errors to handle: `AbortError` (the user closed the sheet, which is normal), `NotAllowedError` (no activation, or blocked), `TypeError` (unsupported data).
- Support:

| Browser | `share()` | Sharing files |
|---|---|---|
| Chrome desktop | Windows and ChromeOS from 89; **all desktop platforms only from 128** | 89 |
| Edge | Windows from 81; all from 93 | 81 |
| Safari (macOS, iOS) | 12.1 | 14 |
| Firefox desktop | **Behind a preference, off by default** | No |
| Chrome Android | 61 | 76 |
| Firefox Android | 79 | No |

- MDN marks it "not Baseline". A test write-up found `canShare()` returning true for a file type that then failed (LC, [Raymond Camden, 2023](https://www.raymondcamden.com/2023/04/20/testing-the-web-share-api)), so always catch the error and fall back.
- **For a desktop-first game the default must be the clipboard and a download**, with the share sheet as an extra where it exists (inference): *Kopieer resultaat* (`navigator.clipboard.writeText`), *Bewaar als afbeelding* (a download link on a blob), and where supported *Kopieer afbeelding* (`ClipboardItem` with `image/png`).
- Build the image *before* the click that shares it: `canvas.toBlob` is asynchronous, and an await between the click and `share()` can lose the activation in some browsers (inference).

**Link previews (Open Graph)**

- Preview crawlers read the HTML `<head>` and do not run JavaScript, so tags added by the game at runtime are invisible to them (LC: vendor guides agree; treat as standard practice). The image must be a public, absolute HTTPS URL; 1200×630 is the usual size.
- **A URL fragment (`#…`) is never sent to the server**, so a result stored after `#` cannot change the preview (inference; this is how URLs work). A per-result preview needs the result in the path or query, plus a server-rendered page.
- On Vercel this is a small function, not a database: `@vercel/og` renders HTML and CSS to a PNG in a Vercel Function, works with any framework, caches on the CDN, and recommends 1200×630. Limits: flexbox only, `ttf`/`otf`/`woff` fonts, a 500 KB bundle ([Vercel docs](https://vercel.com/docs/og-image-generation)). Vercel's guide also suggests signing parameters so only valid values produce an image.
- Chat apps show a shared *image file* at full size, which is better than any link preview; the painting in 3.2 should travel as a file (inference).

**A result in a URL, with no server (inference)**

- A daily result is tiny: day number, 7 two-bit gate states, time in tenths of a second, landing grade. About 12 characters in base64url.
- A ghost is a list of positions. At 2 samples a second for 3 minutes, delta-encoded and quantised to about 1 m, it is roughly 1–1.5 KB, about 2,000 characters of base64url. That fits in a link but is near the length some apps handle comfortably; keep links under about 2,000 characters and offer "copy as text file" above that.
- Put the payload after `#` so it never reaches server logs, version it (`v1.`), and validate everything on load: a link is untrusted input.
- The date decides the course, so use one time zone for everyone: `new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels' }).format(new Date())` gives `2026-11-12` on every machine. A player can change their clock; without a ranking that harms nobody.
- Derive the course with integer maths only (the existing mulberry32), from the date plus a generator version, and freeze the list of landmarks per version. Otherwise a deploy at noon changes today's course for half the players.

**A tiny backend, when there is one (inference, shaped by Sandspiel's)**

- No accounts. Insert-only endpoints with a rate limit: `POST /dag/{day}/result`, `GET /dag/{day}/histogram`, `GET /dag/{day}/ghosts?n=12`.
- The server stamps the day. It stores no names by default (a character name is free text and so a moderation problem), no IP addresses beyond the rate limiter's window, and nothing that identifies a person.
- Fixed-phrase notes only. One positive reaction, no negative one.

### 2.8 What not to do

- **Do not gate anything behind sharing.** No "share to unlock", no reward for inviting. darkpattern.games lists rewards for invitations as the "Social Pyramid Scheme" and unsolicited messages as "Friend Spam" (LC).
- **Do not interrupt to ask.** One quiet *Deel* button on a result screen the player already wanted to see. Never a modal, never before the player has had the fun.
- **Do not post for the player,** and do not pre-fill hashtags or tags. Wardle thought even an automatic share tool looked "trashy".
- **Do not make the shared thing an advert.** Wardle left the link out entirely. Belfort is unknown and its name is a common word, so 3.1 keeps one short link on the last line and lets the player remove it; that is a deliberate departure from Wordle (inference).
- **Do not spoil.** A result shows how it went, never the route or the answer.
- **Do not require an account to play, save or share.**
- **Do not accept free text from strangers** without a moderation plan (Kind Words).
- **Do not run a global all-time top ten,** and do not reward rank.
- **Do not invent players.**
- **Do not punish absence:** no streak that resets to zero with a sad face, no notification request on first visit, no expiring rewards.
- **Do not flood.** Five lines of text, one image. "Nobody cares about your Wordle performance" is what the tenth grid of the morning earns.
- **Do not let the preview oversell.** The link image should be a real frame of the game.

---

## 2B. Reference cases at a glance

| Case | What spread | The mechanism | Server? | Lesson for Belfort |
|---|---|---|---|---|
| Wordle | An emoji grid | Player-invented, spoiler-free, same puzzle for all, once a day, no link | No | Proposal 3.1 |
| Semantle, Heardle, Worldle, Woordle | Same form, new subject | A recognisable format; Dutch versions found players within days (LC) | No | A Dutch daily has an audience |
| GeoGuessr | Videos of impossible-looking skill; challenge links to the same five rounds (LC) | Creators; same-seed challenges between friends | Yes | Same-course challenges; skill visible in seconds |
| agar.io, slither.io | Videos; a URL anyone could open (LC) | No install, a name, play in seconds | Yes | Time from link to play |
| Townscaper | Screenshots and GIFs; towns as text strings (obs) | Everything you make looks good | No | The painting; state as text |
| Among Us, Peak, Lethal Company | Streams and clips | Readable failure, group comedy, platform featuring | Yes | Legible, funny failure; ask platforms |
| Vampire Survivors | One YouTube review, then word of mouth | Minutes to the first fun; cheap | No | The first 60 seconds |
| QWOP, Getting Over It | Videos of failing (LC; I found nothing specific on QWOP's spread) | Frustration that is funny to watch | No | Landings |
| Sandspiel | Creations in a gallery | An audience without comments; no accounts | Small | A tiny-backend pattern |
| Cookie Clicker | Screenshots of absurd numbers (LC) | A number anyone understands | No | A communal bell count |
| Infinite Craft, neal.fun | "First Discovery" screenshots (LC) | Proof you were first | Yes | "First today" marks, later |
| Suika Game | Streamers, two years late (LC) | Watchable, short, readable | No | Timing is luck; be ready |
| Flight Simulator | "My house" screenshots (LC) | A real place the player cares about | n/a | Your street in 1650 |
| Ghost of Tsushima, Horizon, Spider-Man | Photo-mode pictures | The player's own work, flattering the game | No | Proposal 3.2 |
| Dark Souls, Death Stranding, Nier, Kind Words | Stories about strangers helping | Fixed phrases, likes only, limited replies | Small | Fixed-phrase notes, later |
| Kingdom Come, Tsushima | Local press, tourism projects | A real place done with care; locals took the initiative | n/a | Local outreach |

---

## 2C. Recommendations for Belfort: sharing and social

| # | Recommendation | Impact | Effort | Backend | Based on |
|---|---|---|---|---|---|
| S1 | **Fix the front door: Dutch title, description, Open Graph and Twitter-card tags, and one painted 1200×630 image** of the dragon over Diest. Today `index.html` has none, so every shared link shows a bare URL. | H | S | none | 2.7 |
| S2 | **From a link to flying in under 15 seconds.** A visitor who arrives on `/dag` (or any shared link) gets a default rider and dragon and is in the air after one click, with character creation offered afterwards. Measure the time on a cold cache and cut the first download until it holds. | H | S–M | none | Wardle (web, not app); agar.io; Vampire Survivors |
| S3 | **A spoiler-free daily result as text,** five lines, copied to the clipboard on desktop and offered to the share sheet where it exists. Format in 3.1. | H | S (with L1) | none | Wordle |
| S4 | ***Het Schilderij*: a photo mode that outputs a framed painting** with a title plate. Design in 3.2. | H | M | none | Guerrilla's "crowdsourcing marketing"; Townscaper |
| S5 | ***Schaduwvlucht*: a challenge link carrying the sender's result and ghost.** Design in 3.3. | M–H | M | none | Spelunky's shared runs; Forza Rivals; GeoGuessr challenges |
| S6 | ***Uw straat in 1650.*** A search box for today's street names in the towns that are built (the data comes from OpenStreetMap, so names are there). It drops the player above that street in 1650, with the nearest Kroniek entry, and offers the painting. Where a street did not exist yet, say what was there: "Hier lag in 1650 een boomgaard buiten de Schaffensepoort." | H locally | M | none | Flight Simulator's "your house" (LC); KCD |
| S7 | **A press and partners page in Dutch,** and the outreach to go with it: five paintings, a 20-second clip, a paragraph on sources and the truth labels, a contact address. Send it to the Diest and Scherpenheuvel-Zichem tourist offices, the regional desks of the Flemish papers and the public broadcaster, local history societies and history teachers. (The list is mine; check names and contacts.) | H locally | S–M | none | KCD Live started with local enthusiasts; Zukowski: "Nobody is going to promote your game for you" |
| S8 | **A *Wandelmodus*: no enemies, no damage,** all Kroniek entries readable, for classrooms, tourist offices and grandparents. Add a one-page teacher's note later. | M | S–M | none | Discovery Tour |
| S9 | **A page for people who make videos:** permission to stream and monetise, a clean-screen toggle, the date and course number shown during the daily. | M | S | none | 2.5 |
| S10 | **Make failure funny and readable.** A bad landing skids through a market stall, sends geese up, earns a named complaint from a stallholder. Keep it harmless and repeatable. | M | M | none | Peak; Getting Over It |
| S11 | **A per-result link preview:** `/dag/142/…` rendered by a Vercel Function with an image generated by `@vercel/og` showing the bell row and time. | M | M | optional (a function, no database) | 2.7 |
| S12 | **A chapter card: *Uw jaar 1650, tot nu toe*.** At the end of an act: one image with towns visited, bells restored, the choice you made shown as a symbol (not text, to avoid spoilers), hours flown, and your painting as the background. | M | S–M after S4 | none | 2.2 (inference) |
| S13 | **Tiny-backend daily extras:** a histogram ("beter dan 62% van de vluchten vandaag"), the day's flock of 12 ghosts, and a communal bell count. No names, no ranks. | M | M | required | Zach Barth's histograms; Souls phantoms; Cookie Clicker |
| S14 | **Fixed-phrase notes on notice boards and tavern tables,** with one reaction, *Daar drink ik op*. Phrases like "Pas op voor [wezen] bij [plaats]" and "Goed volk in [herberg]". | M | M | required | Dark Souls; Death Stranding; Kind Words' warning |
| S15 | **List the daily on web-game portals and on itch.io,** and ask each for featuring. Post the launch where three.js and Flemish audiences are. | M | S–M | none | Zukowski on platforms; Poki (LC) |
| S16 | **Give the daily a name, a number and a fixed look,** and never change the format once people have started pasting it. | M | S | none | Wordle and its clones |
| S17 | **"First today" marks:** the first player to ring a tower or find a hidden place each day gets a small mark on their card. | L–M | S after S13 | required | Infinite Craft |
| S18 | **Do not build yet:** accounts for sharing, a global ranking, free-text messages, real-time multiplayer. | n/a | n/a | n/a | 2.8 |


# BELFORT gameplay design (v0.1)

What the player does, minute to minute and month to month, and why they come back. It builds on the research in `docs/research/game-design-talks.md` and the 1560 setting in `docs/history/diest-1560.md`.

## The promise

**You and a young dragon keep watch over the Demer valley as real history unfolds around you.** By day, Diest is a busy cloth town. After the curfew bell, the other Flanders of folklore comes out. You see both from the air, and you can land anywhere.

Three things should keep pulling players back:
1. **Flying feels good**, so just getting somewhere is a pleasure.
2. **The world changes because of you**, and it changes with history.
3. **There is always something on the horizon**: a column of smoke, a bell ringing in a village, a rumour, a question mark on the map.

---

## The loops

### 1. The 30-second loop: fly, spot, act
- Spot something from the air: smoke, a crowd, a glint, a black shape in the Demer reeds.
- Dive to it. Act: fight, carry, rescue, catch, land.
- Get immediate feedback: hitstop, a bell chime, a thank-you, a dropped item.

**Rule:** every action gets a response (Sid Meier), and the response is juicy (the game-feel talks). Flying itself must be fun in an empty sky.

### 2. The 5-minute loop: "the bells are ringing"
The world raises **alarms**. Historically, towns and villages rang a storm bell for fire, flood or attack. In the game that bell is how you find work: you **hear** it from its direction, and a column of smoke or a flare marks it on the horizon. No floating markers are needed.

The first event types, each one real for 1560 apart from the Kludde:

| Event | What you do | Dragon skill used |
|---|---|---|
| **Fire at a farmstead** (thatch burns) | Scoop water from the moat or the Demer, drop it on the fire, carry people out | Carrying, precision hovering |
| **Kludde in the reeds** (dusk and night) | Find the shape-shifter, drive it off, protect the herd | Air combat, chasing |
| **Messenger run** | Carry sealed letters to a gate or village before the bell. Time trial, with medals. | Speed, route-finding |
| **Robbers on the Leuven road** | Stop the wagon raid, return the cloth bales | Combat, carrying |
| **Lost in the Prinsenbos** | Find a missing child or a straying cow before dark | Searching from the air, landing in tight spots |
| **Smugglers at the gate** | Spot carts dodging the toll; land and confront them | Observation, choosing sides |

Each event takes 2–5 minutes and pays out right away. Every event also leaves a trace in the world: the farm is rebuilt, and the farmer waves when you fly over.

### 3. The 30-minute loop: a day in Diest
One in-game day is roughly one play session:
1. **Morning bell.** Land in town. Hear the gossip, take contracts at the Cloth Hall, the Town Hall or the Begijnhof.
2. **Daytime.** Fly out to alarms, deliveries, story quests and exploration.
3. **Curfew bell.** The gates shut, the folklore comes out, and the night events start, with higher risk and rarer rewards.
4. **Vespers summary.** Land at a belfry to rest, which also saves the game. A short page shows what changed today, what you earned, and **the rumours for tomorrow** ("A wedding at Kaggevinne. The Kludde was seen near the Koepoort.").

That last step is the main "one more day" hook: every session ends on a small, concrete reason to come back.

### 4. The long loop: grow, change the world, live through history
- **The dragon grows.** Hatchling → juvenile → adult, in clear stages with new abilities:
  1. Glide and hover.
  2. Carry water and goods.
  3. Breathe fire.
  4. Carry a passenger.
  5. Dive into deep water.

  Each stage changes how you get around, not just a number (from the Spider-Man and Zelda talks).
- **Towns prosper.** Helping a place raises its standing. You see it: market stalls return, banners go up, houses are repaired, and new services open (the bell-founder, the saddler, the herbalist beguine).
- **History moves on, in chapters.** The campaign walks through real events from 1560 onwards (see "Chapters" below), and the world changes between chapters.
- **The map gets drawn.** Your map starts as blank parchment. Flying over land draws it in, in the style of the period's maps, so exploring fills a beautiful object.

---

## What makes it hard to put down

Designed to be **compelling, not manipulative**: no loot boxes, no paid shortcuts, no punishing timers. Every hook below rewards playing well, not paying or grinding.

| Hook | How it works here | Source |
|---|---|---|
| **Mastery** | Flight and combat with a high skill ceiling; medals on messenger runs; flying through the gates and under bridges | Game-feel talks; GMTK |
| **Curiosity** | Things on the horizon; question marks on the half-drawn map; ruins, wells and shrines with a story | Zelda's "triangle" landmarks |
| **Collection** | Real historical objects: **cloth seals** (Diest lead seals), **pilgrims' badges**, **bell inscriptions**, coins of Brabant, dragon scales | Diablo's "jackpot" feeling, without randomness for its own sake |
| **Visible change** | The world remembers what you did: a farm you saved stands, a town you neglected gets shabbier | Nemesis System; Sasko's "consequences must be visible" |
| **Characters** | About 5 "star" NPCs per town with clear wants. Pleasing one can cost you with another. | Ken Levine's *Narrative Legos* |
| **A rival who remembers** | The Kludde is a shape-shifter that learns: it comes back in the form you struggled with, scarred where you hurt it | Nemesis System |
| **Rhythm** | Day for history, night for folklore; bells mark the hours; each session closes at vespers | Sid Meier's short / medium / long goals |
| **Short sessions** | One alarm takes about 5 minutes and one day about 30, so it fits a browser and a lunch break | Browser habits |
| **Builds** | Rider gear and dragon tack from Flemish guilds (weavers, smiths, bell-founders), each piece changing play | Path of Exile |

### Bell magic: the signature mechanic
The carillon is Flanders' instrument, so the rider fights with **bells**:
- Each hit lands on a beat. Hitting on the beat builds **Resonance**.
- Spent Resonance rings one of three bells, and the bells combine like chords:
  - a **low bell** stuns,
  - a **middle bell** wards,
  - a **high bell** reveals hidden things, such as a Kludde in disguise.
- Ringing a town's belfry at dusk works like a "tower" in an open-world game: it reveals the area's alarms and secrets for the night.

---

## Characters to build first (Diest, 1560)

| Character | Who | Wants | Gives |
|---|---|---|---|
| **Jacob van Deventer** (historical) | The King's cartographer, mapping the towns of the Low Countries | Accurate surveys, from the air if possible | Map-drawing quests; the map reveal mechanic |
| **Sister Aleydis** (invented beguine) | Healer at the Begijnhof | Herbs from the marsh; the town's sick looked after | Healing, the low bell, Begijnhof lore |
| **Master Joos** (invented weaver) | Weavers' guild, Cloth Hall | Cloth safely to Antwerp; seals undamaged | Contracts, money, rider gear |
| **The drossaard** (the lord's bailiff) | Keeps the peace for the Prince of Orange | Robbers caught, tolls paid | Bounties, permission to fly over the walls |
| **Wouter** (invented toll keeper) | Leuven Gate | A quiet life, a little extra in his purse | Smuggling dilemmas, gossip |

## Chapters: real history as the story spine
The dark main story follows events that touched Diest and its lords:

| Chapter | Year | What happens |
|---|---|---|
| Prologue | 1560 | The hatchling; the quiet bells of Sint-Sulpitius |
| I | 1566 | The iconoclastic fury sweeps the Low Countries: protect or witness the churches' images |
| II | 1568 | War begins. William of Orange's eldest son, Philip William, is taken from his studies at Leuven to Spain (historical). |
| III | 1580s | War comes to the Demer valley |
| IV | 1602–1609 | The oak at Scherpenheuvel is cut down, a chapel rises, and the Archdukes begin a basilica |
| Epilogue | 1627 | The basilica is consecrated |

Between chapters the world is rebuilt for the new year, the way the 1560 world was built from the Ferraris map.

---

## Scherpenheuvel: the oak and the basilica together

The oak (until 1602) and the basilica (1609–1627) never stood at the same time, so a single year can't show both truthfully. The chapters solve this:
- **1560–1601:** the lone oak with its statue on the hill. Pilgrims, the shepherd legend, and the oak's strange lights at night.
- **1602–1608:** the oak is felled and its wood carved into statuettes; a wooden chapel, then a stone one.
- **1609–1627:** the basilica rises inside the star-shaped town laid out around it, scaffolding included, through to completion.

**The twist:** the oak's **roots** survive under the basilica. Its lights move underground, and the basilica's crypt becomes a late-game place. The player sees the oak, its felling, and the church that replaces it: three states of one landmark, each true to its year.

---

## First prototype (next build)
Build the smallest version that tests whether the loop is fun:
1. Alarms with a sound direction and a smoke beacon: one fire event and one Kludde-at-dusk event.
2. Carrying water and dropping it.
3. A messenger run with medal times.
4. The day cycle with morning, curfew and vespers bells, and a rumours page.
5. The map drawn in as you fly.

Then **play it**. If the fire and the messenger run are fun on their own, the loop works and we widen it. If not, we fix flying and feedback before adding anything else.

### What to measure (later, with saves on Supabase)
- How long first sessions last.
- How many alarms players finish.
- Whether they return the next day.
- Where they stop.

Measure to find what's boring, not to squeeze more playtime out of people.

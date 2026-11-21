# Chapters 6 and 7: Dendermonde, then Gent and Saeftinghe

The end of the game. Written backwards: chapter 7 first, then chapter 6, which must plant what 7 pays off.
Law: `docs/design/story.md`. Voice: `docs/design/voice.md`. Everything not from `history-check.md` is marked
(check). Things we made up are marked (invented). The sister is spelled Neelke as in `story.md`;
`history-check.md` proposes Neelken, and the owner should settle that once for the whole game.

One idea carries both chapters and comes from the prologue: **the bell owed twelve strokes and gave seven.**
Five strokes are still owed. The last fight lasts exactly those five strokes.

---

# Chapter 7: Gent en het Verdronken Land van Saeftinghe (level 25 to 30)

## 7.1 The ledger at the end (read this first; every scene below depends on it)

Six bells are entered before Roeland: Diest (always rings), Hasselt, Leuven, Mechelen, Antwerpen, Dendermonde.
`R` = how many ring (1 to 6). `S` = how many are silent (0 to 5). Flags: `stomme_whole`, Oude Volk standing.

| | Ring | Pay | Recast |
|---|---|---|---|
| Open when | always | always | `stomme_whole`, and `R` is 2, 3 or 4 (close to balance), and Oude Volk standing at its second-highest tier or better, and the hero sided with the Wakers or reconciled the two halves in chapter 6 |
| Land owed | none new; the step the water already took at each silent town is **not** given back | **every town whose bell the hero rang** loses its low quarter and its polder (2 steps each), Diest's Demer meadows first; silent towns lose nothing more, because their guardians are awake and hold. Total `2R + 1` steps (the 1 is the meersen of Gent). Range 3 to 13 | the tide lands only: one named polder per town, under water twice a day, dry twice a day. Nobody's house |
| Who comes to the last fight | one company of townsmen per ringing bell (they hold a dike section 20 seconds longer each) | same as Ring; the fight is the same, the choice comes after | all of both |
| | one woken old thing per silent bell (the world boss that stayed there fights the wave at its section) | | |
| The dragon | has lost a piece of a power for every bell that rings; at `R` = 6 he fights the Waterwolf without his long fire | keeps what he has | gives his fire to the casting: no fire breath in the after-game until the first spring tide (two real weeks) |

The cruel part of Pay, and the reason the ledger exists: the towns the hero made safe are the towns that drown.
A rung bell put that town's guardian to sleep and kept its loan running. When the hero refuses Roeland the count
stops everywhere at once, and only the towns he left silent still have something awake to stand on the dike.
The player who rang every bell "to be safe" and then refuses the last one drowns the most land. Neelke says so
in chapter 6, in plain words, so it is never a trick.

## 7.2 Cast of chapter 7

- **Lieven de torenwachter** (invented), watchman of the Belfort, sixty, has fed "the gilt beast" pigeons since
  he was a boy and has never told the aldermen it eats them. Wants: nobody to hurt it.
- **Bisschop Antoon Triest** of Gent (check: bishop 1622 to 1657). Says "u". Wants Roeland rung and every old
  thing asleep. He is kind, he gives to the poor, and he would gild the hero's dragon himself.
- **Joos Hebbelynck, deken van de vrije schippers** (invented), dean of the Ghent bargemen. The Sassevaart to
  the sea has been shut since the States took Sas van Gent in 1644 (check). Wants De Stomme fired, still.
- **Kapitein don Íñigo de Mendoza** (invented), the Spanjaardenkasteel (check: Charles V's citadel of 1540).
  Unpaid, like every garrison. Wants the dikes held because the dike is the border.
- **Dijkgraaf Cornelis Adriaensz.** (invented), dike master in States service at Hulst (check: Hulst taken by
  Frederik Hendrik in 1645). His grandfather cut the dike of Saeftinghe in 1584 on orders (check). Wants
  somebody to tell him it was not his family that started this.
- **Tanneken van de Lossers** and **Wouter van de Wakers** (invented): the two halves of the Oude Volk after
  chapter 6.
- **Marieke the pedlar**, **Pieter the sexton** (walked from Diest with the three clappers' rubbings, to see
  Roeland once), **the mute boy**, who in Recast lays his stones in a circle for the first time.
- **De Gulden Draak. De Waterwolf. Neelke.**
- **Kateline** (invented), the rider of 1377. Her name is scratched in the stone beside Roeland's frame.

## 7.3 Main line

| # | Quest | Who, where | What the player does (objective kinds) | Choice | Reward |
|---|---|---|---|---|---|
| 1 | **De laatste klok** | Lieven, foot of the Belfort | `talk` Lieven; `reach` the gallery on foot (`onFoot`); `flag` read Kateline's name | Tell Lieven why you came, or lie. If you lie he does not warn you about phase 2 of the boss | xp; Kroniek "De draak van 1377" |
| 2 | **Stroomafwaarts zwijgt alles** | Joos, Graslei | `talk`; `reach` ×4 the silent towers down the Scheldt from the air (`minY`); `collect` 4 tally posts (Neelke's marks, fresh, wet) | none | xp, florins |
| 3 | **Het Verdronken Land** | Cornelis, the dike at Hulst | `reach` Saeftinghe (`minY`); `flag` hear the bell under the water (land on the one tower top that shows at low tide); `kill` camp "Wat het water bewaart" (drowned things on the mudflats, ×8) | Cornelis offers States dike workers if the hero swears not to help fire De Stomme. Kroon standing falls if you swear | named gear: **Dijkgraafsstok**; Oranje renown |
| 4 | **Wie houdt de dijk** | Triest, Mendoza, Joos, Wouter or Tanneken | `talk` ×4; `flag` assign each helper to one of five dike sections (there are fewer helpers than sections) | Which section gets nobody. Each section stands for one ledger town; the unmanned one breaks first in quest 6 | faction renown, by who was asked |
| 5 | **De Gulden Draak** | the sky around the Belfort | `reach` the spire (`minY`); `kill` `gulden_draak` ×1 (the kill counts when he yields at 25%); `flag` enter the bell chamber | see 7.4 | mark on the dragon: **Bladgoud** (gilt edge on one wing); gear **Katelines Teugel** |
| 6 | **De Waterwolf** | the Scheldt dikes below Gent | five `flag` objectives, one per stroke of Roeland; `kill` the wave at each section; `reach` each breach | Which breach to fly to when two open at once | none; it cannot be won |
| 7 | **Roeland** | bell chamber | `talk` Neelke; `reach` the rope `onFoot`; `flag` the choice | Ring, Pay, Recast | the ending |

Engineering note: nothing above needs a new objective kind. It needs: a boss that ends on a yield, not at 0 HP;
`flag` objectives set by a timer (the strokes); and an ending state machine keyed on `R`, `S`, `stomme_whole`.

## 7.4 De Gulden Draak (written in full)

**What is true (check all):** the dragon has stood on the Belfort since 1377, gilded copper. Ghent tells that he
came from far, from a church in Constantinople or from a Norse king's ship, and that Bruges had him first. Klokke
Roeland hangs below him; the rhyme on the bell says that when it tolls there is storm in Flanders. Charles V had
Roeland taken down in 1540 to punish the town. In 1659, nine years after our story, Roeland was really melted
and recast into a carillon by Pieter Hemony. We use that: the Recast ending is what history did anyway.

**What is seen.** The hero climbs past the spire at first light. The gilt figure turns its head. Gold leaf comes
off him in flakes and drifts down over the Korenmarkt; under the gold he is green, like an old roof. A chain
runs from his hind leg into the tower, to Roeland's frame. Every link is as long as a man. He does not roar. He
opens his wings to see if they still work, and one of them tears a little.

The hero's dragon will not look at him.

**What is said.** Nothing by the dragons. Lieven shouts up from the gallery through the whole fight, and what he
shouts is the tell for each phase:

- Lieven (before): "Hij heeft driehonderd jaar op deze stad gepast en niemand heeft hem ooit bedankt. Doe hem geen pijn."
- Lieven (phase 1): "Hij valt je niet aan. Hij kijkt wat je doet."
- Lieven (phase 2): "Hij trekt je naar de daken. Daar wonen mensen, laat je niet meetrekken!"
- Lieven (phase 3): "Hij is moe. Zie je niet dat hij moe is?"
- The hero, journal after: "Hij had me kunnen doden boven de Korenmarkt. Hij heeft drie keer gewacht tot ik klaar was."

**The fight.** Air only, in a ring around the tower; the chain is the arena wall (he cannot go further than
its length, and neither should the fight).

1. **De vraag (100% to 70%).** He circles and does not strike first. He strikes only in answer: every heavy hit
   the player lands is returned once, exactly as hard. Tell: his gilt flashes in the sun one beat before the
   return. A player who holds back takes almost no damage and the phase lasts longer. He is measuring anger.
2. **Het gewicht (70% to 40%).** He closes, locks claws and falls with the hero toward the roofs of the
   Hoogpoort. The player can break the lock (dodge) at any height. Breaking it late does more damage to him and
   tears tiles and a chimney off real houses; breaking it early costs the hero health instead. The game counts
   which the player chose (`gulden_daken`, 0 to 3). He is measuring what the hero will spend that is not his.
3. **De ketting (40% to 25%).** He lands on the spire, puts his neck across Roeland's louvres and stops
   fighting. He can be hit. At 25% he lowers his head onto the stone and the fight ends, whatever the player
   does. A player who never strikes him in this phase ends it sooner: after twenty seconds he moves aside.

**What it costs.**
- The hero's dragon is torn along one flank. The scar is permanent and visible in every ending.
- All Gent has watched two dragons fight over its belfry. Kerk standing falls. For each roof broken in phase 2,
  Gilden standing in Gent falls and one named family appears among the homeless in the epilogue.
- If the player struck him while he lay still in phase 3, the old dragon does not help in 7.5 (in every other
  case he pulls his chain taut across the last breach and holds one stroke by himself).
- What the player learns in the bell chamber: he was not guarding the bell from thieves. He was guarding it from
  the next rider. He let this one through.

## 7.5 De Waterwolf, and Neelke (written in full)

**What is seen.** From the Belfort gallery, north-east: the Scheldt is running the wrong way. Then the flood,
grey and unhurried, as wide as the valley, and in it the things it kept: ship's ribs, a mill, the tops of three
church towers travelling upright, and under the surface a sound, a bell tolling slow and flat. It has no face.
It has a front, and the front is exact: it stops at every dike, measures it, and comes over at the lowest place.

**The fight.** Five dike sections between the Land van Waas and the meersen of Gent (check the line), one for
each of the five decided towns. Roeland strikes behind the hero, once every ninety seconds, five times: the
five strokes Diest never gave. The player flies from breach to breach. There is no health bar on the Wolf. There
is a count: strokes held, sections standing.

- **Stroke 1, wrakhout.** Wreckage rams the dike. Burn the rams from the air.
- **Stroke 2, de torens.** The drowned towers come in upright and lean on the dike; their drowned ringers climb
  out (`kill`, on foot on the dike crown, with the townsmen if that bell rings).
- **Stroke 3, het Ros.** The drowned Ros Beiaard, the millstones still on its neck. If the hero freed it in
  chapter 6 it comes anyway, turns at the dike and stands in the breach against the water. If the hero beat it
  down in chapter 6 it comes for the hero's dragon alone.
- **Stroke 4, de klok van Saeftinghe.** The bell under the water tolls against Roeland, and wherever the two
  sounds cross the hero's dragon falters (controls go heavy for two seconds). The dragon is hearing what
  will put him to sleep.
- **Stroke 5.** The water goes flat and quiet over the last section. Neelke walks on it toward the dike. Nothing
  attacks. If the player attacks, the dragon will not obey.

**What is said.** Neelke speaks after strokes 2 and 4 (her voice carries over the water with no effort) and at 5.

- After stroke 2: "Je vecht goed. Maar het water wordt niet moe, en jouw draak wel. Ik heb zijn vleugelslagen geteld."
- After stroke 4: "Hoor je die klok? Die luidt al zesenzestig jaar onder water. Ze heeft geen enkel uur overgeslagen."
- At stroke 5, at the foot of the dike, looking up: "Het is twaalf. Deze keer zijn alle slagen gekomen."
- "Nu moet jij zeggen wie er betaalt. Ik kan het niet in jouw plaats doen. Ik kan alleen tellen."

She climbs the dike. She is wet to the knees and has grown a finger's width since the prologue; the hero
notices her sleeves are too short. She takes his hand to get up the last step, because her legs are shorter
than his. The water waits at the dike's foot for as long as the player needs. There is no timer on 7.6.

## 7.6 The choice at Roeland (three endings, in full)

The bell chamber. Roeland, the rope, Kateline's name in the stone. Through the louvres: the old dragon on the
spire, the hero's dragon on the roof of the Lakenhalle below, watching the tower. Neelke sits on the stairs and
counts the steps she climbed. "Driehonderdzesenzestig" (check the real count of the Belfort stairs).

Before choosing, the player may ask her three things. Her answers are the same in every playthrough.

- "Kom mee naar huis." → "Als ik meega, telt er niemand meer. Dan neemt het water wat het wil, en dat is altijd te veel."
- "Is het eerlijk?" → "Ik heb de rekening drie keer nageteld. Ze klopt. Ik had ook liever gehad dat ze niet klopte."
- "Wat zou jij doen?" → "Ik ben acht. Jij bent de oudste. Daarom moest jij altijd de deur dichtdoen."

### Ring (Luiden)

**Seen.** The player pulls the rope twelve times; each stroke is one press, and the game never pulls for him.
At each stroke one thing the player met lies down: the weerwolf in the Hageland rye; the Wilde Jacht going to
ground on the heath of Loon; the thing under Sint-Pieter; Lange Wapper shrinking to a man's length on a quay;
the Kludde in the reeds of the Dender, like a dog by a stove. Tanneken's fire goes out and she lets it. At the
eleventh stroke the old dragon lays his head on the spire and the green goes grey; Lieven takes his cap off.

Before the twelfth, the hero's dragon climbs the Belfort from outside. He is afraid: he was afraid in chapter 6
and it shows in the same way, the wings held too tight. He takes the old one's place, and looks in through the
louvres at the hero, and waits. The rope is in the player's hand. The game will wait as long as the player does.

Twelfth stroke. The gilt starts at his claws.

**Said.**
- Lieven: "Ik zal hem elke morgen een duif brengen. Ik weet dat hij ze niet meer kan eten."
- Neelke walks up the quay stairs of the Graslei out of the Leie, counting them. "Twaalf slagen. Moeder gaat niets gemerkt hebben."
- Then, at the tower door, when the hero kneels: "Laat me even. Als ik nu stop met tellen, weet het water niet meer hoeveel het mag houden."
- Last journal line: "Neelke slaapt weer in haar eigen bed. Ze telt in haar slaap. Ik lig wakker en luister tot waar ze komt."

**Costs.** The dragon, for good: the after-game is on foot, by horse and by barge, and the sky is empty. Every
old thing asleep and not waking: no world bosses of the old kind, the Oude Volk without a purpose. The water
steps already taken at silent towns stay taken. And Neelke is home and is still the Telster. That was never the
water's doing. It is who she is.

### Pay (Betalen)

**Seen.** The hero lets go of the rope. The player must walk down all the stairs; the bell stays silent behind
him. The chain on the spire parts link by link, because there is no count left for it to hold. The old dragon
goes east without looking back, still half gold. The water comes over the dikes without hurry and takes what
`2R + 1` says, town by town, in the order the hero rang them. The camera rides on the hero's dragon above each:
Diest first, the Demer meadows and the lane where the prologue was walked; then each rung town's low quarter by
name. At silent towns, something large and old stands in the water at the dike, and the water stops there.
Carts on every road going to high ground, as the carts from Loon came to Diest in chapter 1.

**Said.**
- Neelke, on the dike, before she walks back in: "Ik blijf tot alles afgeteld is. Het water kan niet rekenen. Als ik er niet bij ben, neemt het te veel."
- "Kom me niet halen. Kom kijken wanneer het af is. Ik zal de dagen op de sluisdeur zetten."
- Marieke, on the road with her pack on a stranger's cart: "Ik heb heel mijn leven gezegd dat ik overal thuis was. Nu moet ik het nog waar maken ook."
- Last journal line: "Ik heb elke klok geluid om iemand te sparen. Vandaag heb ik gezien wie dat betaald heeft."
  (at `R` ≤ 2: "Ze hebben me in Hasselt vervloekt toen ik hun klok liet zwijgen. Hasselt staat droog.")

**Costs.** Homes, by name: every side-quest giver who lived in a low quarter of a rung town is shown on the
road. Kerk and Gilden standing collapse. The dragon stays, whole, and others wake: the west in the after-game is
a drowned polder with dragons over it. Neelke is not home. It is her choice and she made it with the sums in
front of her, and the player cannot talk her out of it.

### Recast (Hergieten), earned

Offered by Neelke herself, only if the conditions of 7.1 hold. She has been counting toward it since Mechelen.

- Neelke: "Er is nog een derde som. Ik heb ze pas kunnen maken toen jij dat kanon heel hebt gelaten. Ze komt niet mooi uit. Ze komt wel uit."
- "Het water krijgt elke dag een stuk, en het geeft dat elke dag terug. Zoals een boek dat je uitleent aan iemand die het terugbrengt."

**Seen.** De Stomme comes up the Scheldt on Joos's barges, drawn by every horse the Vrije Lieden can steal. A
casting pit is dug on the square before the Belfort. Roeland is lowered, the bell that called Gent to arms for
three hundred years, and the Gentenaars stand around it in silence and some of them spit at the hero. No furnace
in Flanders will melt both at once. The hero's dragon gives his fire until he has none. The old dragon lies
down beside the pit and lets the heat take his gold, and it runs into the bronze, and he gets up from it bare
and green and free, and the chain stays in the mould.

The new bell rings twice a day, with the tide and not with the hour. The water rises over the tide lands and
goes back. At the first high water Neelke comes up the quay with it.

**Said.**
- Pieter the sexton, hand on the cooling bronze: "Ik heb nog nooit een klok gehoord die niet weet hoe laat het is. Ze klinkt wel schoon."
- Wouter: "Onze wachters blijven wakker en jullie klok blijft luiden. Mijn grootmoeder zou het een slechte koop genoemd hebben. Ze noemde elke koop een slechte koop."
- Neelke, at the table, hair still wet: "Ik kom twee keer per dag. Dat is meer dan vroeger. Toen liep je altijd te rap."
- Last journal line: "Bij laag water staat haar stoel leeg en is de zitting nat. Moeder droogt ze elke keer af. Ze zegt er niets bij."

**Costs.** Roeland is gone and Gent will not forgive it. De Stomme is gone, and with it Antwerp's last hope of
opening the river by force. The farmers of the tide lands become shepherds on salt marsh. The dragon has no
fire until the first spring tide. Neelke is home six hours in twelve. Nobody gets everything, and the mute boy
lays his stones in a circle.

## 7.7 The six factions at the end

What each does in chapter 7, and its epilogue line per ending (one scene each, spoken by the named person).

| Faction | In chapter 7 | Ring | Pay | Recast |
|---|---|---|---|---|
| **Gilden** (Joos) | man a dike section with the schutters; pay for the pit | "De klok luidt en de markt gaat open. Vraag mij niet wat er op die toren zit, ik heb een zaak te houden." | "Ik heb veertig schepen en geen haven meer. Wie mensen wil verhuizen, betaalt vooraf." | "Jij hebt ons kanon in een klok gegoten. De Schelde blijft dicht, en ik moet je nog bedanken ook." |
| **Kerk** (Triest) | rings every bell left; a procession on the dike | "U heeft gedaan wat God vroeg. Ik zal voor uw dier bidden, al weet ik niet of dat mag." | "U heeft een klok laten zwijgen en ik moet nu zesduizend mensen eten geven. Ik zal het doen. Ik zal u niet vergeven." | "Een klok die het getij luidt in plaats van de mis. Rome gaat mij hierover schrijven, en ik ga traag antwoorden." |
| **Kroon** (Mendoza) | holds the section nearest the border | "De grens ligt droog en mijn mannen zijn nog altijd niet betaald. Voor Spanje is dat een goede dag." | "Ik bewaak nu een grens die onder water ligt. Madrid wil weten wie dat getekend heeft." | "Ze vragen mij waar het kanon van de koning is. Ik zeg dat het elke dag twee keer te horen is." |
| **Oranje** (Cornelis) | lends dike workers; knows the water as a weapon | "Mijn grootvader stak die dijk door op bevel. Nu ligt het water vast, en ik weet nog altijd niet of hij schuld had." | "Wij hebben het water altijd als wapen gebruikt. Het heeft nooit van ons geweten." | "Saeftinghe valt twee keer per dag droog. Ik heb de kerkvloer gezien waar mijn grootmoeder gedoopt is." |
| **Vrije Lieden** (Marieke) | ferry people off the low ground, for a price, then for nothing | "Er spookt niets meer langs de wegen. Mijn verhalen zijn niets meer waard, en ik slaap beter." | see Pay, above | "Ik ken een pad dat alleen bij laag water bestaat. Daar staat geen enkele tol op." |
| **Oude Volk** (Wouter or Tanneken) | Wakers bring the woken things to the dike; Lossers open a sluice at night (quest 4 can stop them) | Tanneken: "Je hebt ze in slaap gewiegd, tot de laatste. Kateline heeft dat ook gedaan, en zij had er tenminste spijt van." | Wouter: "De wachters zijn wakker en de helft van het land is weg. Wij wilden het eerste. Zeg dat tegen de mensen op de karren." | Wouter: "Ze slapen niet en ze heersen niet. Ze passen op de dijk, zoals vroeger. Dat is alles wat we ooit gevraagd hebben." |

The epilogue scene is chosen by the hero's best faction; the other five lines are heard as street remarks in
the after-game town of that faction.

## 7.8 Facts to verify (chapter 7)

1. The Ghent dragon: 1377, gilded copper, and the legends of its origin (Constantinople, Sigurd, Bruges).
2. Klokke Roeland: first casting (1314?), the rhyme and its exact wording, its removal in 1540, whether a
   Roeland hung in the Belfort in 1650, the Hemony recasting of 1659 to 1660.
3. Saeftinghe: floods of 1570 and 1584, who cut the last dike and on whose order, and where the legend of the
   bell heard under water was recorded. "Zesenzestig jaar" in Neelke's line assumes 1584 and a story year 1650.
4. Bishop Antoon Triest's dates; the Spanjaardenkasteel and its garrison in 1650.
5. Sas van Gent taken 1644, Hulst 1645, and the Sassevaart closed to Ghent shipping after.
6. The dike line between the Land van Waas and Gent in 1650, and which polders by name would flood.
7. The number of steps in the Belfort.
8. Whether a flood can plausibly reach Gent up the Scheldt: the tide did run to Gent before the locks (check).

---

# Chapter 6: Dendermonde en het Scheldeland, met Aalst (level 20 to 25)

What the hero learns: the whole truth, from Neelke. What the chapter must leave in the player: she is alive, she
is not a prisoner, she is right, and she asked him to stop.

## 6.1 The region

Dendermonde lies where the Dender runs into the Scheldt. It is a fortress town whose best defence is its own
sluices: it can put the land around it under water (check: used against Louis XIV in 1667, after our date).
Up the Dender lies Aalst. Between them lie the villages where the Kludde tales were written down: Lebbeke,
Wichelen, Herdersem, Uitbergen, Aalst (De Cock 1921, source S32 in `history-check.md`). Hamme, on the Durme, has
the Oschaert (S34). The water is rising a thumb a day and it has not rained in five weeks. Cellars that stayed
dry in the floods of their grandfathers are wet. There are tallies on every sluice door.

## 6.2 Cast

- **Adriaen Coppens, sluismeester** (invented). Keeps the peilboek, the book of water levels, back to his
  great-grandfather. Wants somebody to tell him he is not mad.
- **Jaspar, deken van de Pijnders** (invented; the Pijnders are the guild that carries the Ros Beiaard in the
  ommegang, check). Wants the town's horse honoured, and his warehouse on the quay dry.
- **De baljuw van Dendermonde** (Kroon; says "u"). Believes the Dutch have cut a dike again, as in 1584. Wants
  the sluices opened against them, which would drown six villages to save a wall.
- **Meester Huybrecht, landmeter** (invented), a States surveyor in the baljuw's cells as a spy. He can read a
  peilboek, and he says this water is not Dutch. He works for Cornelis of chapter 7.
- **Pastoor Hendrik van Lebbeke** (invented). Buries what the Kludde leaves at the water's edge. Wants the bell.
- **Truyken van Wichelen** (invented), eel fisher (Vrije Lieden). The Kludde rode her back when she was nine,
  and she carried him home. Knows his paths. Wants to be paid in advance.
- **Wouter** (the Wakers) and **Tanneken** (the Lossers): the Oude Volk, splitting. Both names invented.
- **The beguine of the infirmary of Diest**, come to nurse the flooded; **Marieke the pedlar**; **Neelke**.
- **De Kludde. Het verdronken Ros Beiaard.**

## 6.3 Main line

| # | Quest | Who, where | What the player does (objective kinds) | Choice | Reward |
|---|---|---|---|---|---|
| 1 | **Water zonder regen** | Adriaen, the sluice house | `talk`; `collect` 5 level marks along Dender and Scheldt; `flag` read the peilboek | none | xp; Kroniek "Het peilboek" |
| 2 | **De spion van de baljuw** | baljuw, then Huybrecht in the cells | `talk` ×2; `reach` the dike cut the baljuw suspects (there is none); `kill` camp of deserters looting empty farms ×6 | Speak for Huybrecht (Oranje up, Kroon down, he helps in chapter 7) or leave him (the baljuw opens a sluice; a village floods) | florins; renown |
| 3 | **Kludde is thuis** | Pastoor Hendrik, Truyken; Lebbeke to Wichelen | `talk`; `collect` 3 lengths of his chain; `reach` the reeds at night `onFoot`; `kill` `kludde_groot` ×1 | Pay Truyken her price, or track him yourself (longer, and he ambushes) | gear **Kluddes Ketting**; dragon mark **Twee Blauwe Vlammen** |
| 4 | **Twee vuren** | Wouter and Tanneken, two fires on one dike | `talk` ×2; `flag` hear Kateline's name; `reach` the sluice the Lossers mean to open | Wakers, Lossers, or (high Oude Volk standing only) make them sit at one fire | Oude Volk renown; sets `oudevolk_half` |
| 5 | **Neelke komt aan land** | the quay at the mouth of the Dender | `reach` the quay `onFoot`; `talk` Neelke | see 6.5 | none. The journal entry is the reward |
| 6 | **Het Ros** | the confluence | `kill` `ros_beiaard` ×1 (ends at 20%); `flag` the millstones | Keep looking at it, or turn away | see 6.6 |
| 7 | **De klok van Dendermonde** | the belfry on the Grote Markt (check) | `talk` Jaspar, pastoor, Wouter; `reach` the bell chamber `onFoot`; `flag` ring or leave | the bell decision | by decision, 6.7 |

## 6.4 Het Oude Volk split, and the Kludde at home

**Two fires.** They meet where they always met, on the dike, and for the first time they light two fires. The
Wakers want the guardians awake and the sea kept out. The Lossers (from aflossen, to pay off) say a debt is a
debt and want it paid.

- Wouter: "Wij wilden de wachters terug. Niemand van ons heeft ooit om de zee gevraagd."
- Tanneken: "Je leent geen land om het dan vierhonderd jaar te houden. Mijn moeder gaf een geleend brood de dag erna terug."
- Tanneken, on the rider: "Ze heette Kateline en ze kwam uit Saeftinghe, toen dat nog boven water lag. Ze heeft de klok gekozen. Ga kijken wat er van haar dorp geworden is, en van haar draak."
- Wouter, if the hero's standing is low: "Jij hebt in elke stad geluid. Kom niet bij mijn vuur zitten."

Which half the hero gets: at low standing only Tanneken will talk to him, because she can use him. At middle
standing he must choose. At high standing he may make them share one fire, and that is a condition for Recast.

**The Kludde, far larger.** In Diest he was a servant on an errand. Here he is at home. Everything he does is
recorded folklore (S31, S33): a black dog or horse dragging a chain, two small blue flames, the leap onto the
neck, the weight that grows with every step, the rush into the water.

1. *In de dreef* (on foot, a village lane at night). He is the size of a barn. Tell: the chain is heard before
   he is seen; the blue flames show where the next blow lands.
2. *Op de rug* (in the air). He leaps onto the dragon's back and grows heavier. The dragon sinks toward the
   Dender. The player must land and throw him off before the wings give.
3. *Naar het water.* He runs for the river. Following is the player's choice. In the water he cannot be hurt.

He does not die. He goes under, and on the mooring post where he went in there are five strokes and a bar.
- Truyken: "Ik heb hem gedragen toen ik negen was, van de vaart tot aan onze deur. Je verslaat hem niet. Je draagt hem tot hij afstapt."

## 6.5 Neelke comes ashore (written in full)

**Where and when.** The quay where the Dender meets the Scheldt, the evening after the Kludde. No fight, no
music. The dragon will not come onto the quay; he stays on the roof of the Pijnders' warehouse.

**What is seen.** A child sits on the edge of the quay with her feet in the water, counting barges that are not
there. Her dress is the one from the prologue. When the hero comes close she does not disappear. She looks at
the bread in his pack, takes it, and eats all of it, quickly, like any child who is hungry.

**What is said.** Neelke does almost all the talking. Each speech is one box.

1. "Je hebt er lang over gedaan. Ik heb elke dag een streep gezet."
2. "Ik ben niet dood en ik ben niet betoverd. Geef me dat brood eens."
3. "Dit land is van het water. De eerste dijkwerkers hebben het geleend, en ze hebben beloofd de uren te tellen zolang ze het hielden. Daar dienen de klokken voor."
4. "Waar een klok zwijgt, telt niemand meer. Dan is de lening daar afgelopen, en dan mag het water zijn land terughalen."
5. "Voor de klokken pasten de draken op de dijk. Klokken waren goedkoper en ze luisteren beter. Maar als een klok luidt, valt alles in slaap wat oud is, en jouw draak is oud."
6. "De Kludde is maar een knecht. Hij moest de klepels halen, zodat niemand alarm kon slaan toen ze de klokken kwamen wegvoeren."
7. "Meester Lenaert dacht dat hij het water gebruikte. Het water heeft hem laten doen. Het heeft meer geduld dan hij."
8. "Het water is niet kwaad. Het heeft mij ook niet gestolen. Het had iemand nodig die kan tellen, en ik kan tellen."
9. "Elke klok die jij luidt, stelt de rekening uit. Ze wordt er niet kleiner van. En hij daarboven verliest er elke keer iets bij."
10. "Als je op het einde toch niet luidt, verdrinken juist de steden waar jij wel geluid hebt. Daar slaapt dan alles wat de dijk had kunnen houden. Ik zeg het je nu, dan kan je later niet zeggen dat je het niet wist."
11. "Ik heb de rekening gezien. Ze is eerlijk. Dat vind ik er het ergste aan."
12. "Daarom wil ik dat je stopt. Stop met klokken luiden, en stop met mij te zoeken. Ik ben niet verloren. Ik ben aan het werk."

The hero's answer (one of three; sets `neelke_antwoord`):

- **"Je bent mijn zus. Ik laat je hier niet achter."** → "Dat weet ik. Daarom vraag ik het aan jou en niet aan iemand anders."
- **"Moeder wacht elke avond op je."** → She stops counting. It is the only time in the game. Then: "Zeg haar dat ik mijn kousen droog houd. Het is niet waar, maar ze zal er content mee zijn."
- **"Ik stop niet."** → "Dan tel ik verder. Je loopt nog altijd te rap."

She goes down the quay stairs into the river and counts the steps aloud. At the seventh step the water is over
her head.

**What it costs.** Only the bread leaves the inventory. What is taken is the reason the player has had since
the prologue: there is nobody to rescue. From here on:
- If the hero rings the bell of Dendermonde after she asked him to stop, no tallies appear anywhere until the
  last dike. She has stopped counting for him. Players will notice the posts are bare.
- If he leaves it silent, the low quarter along the Dender floods one step, and the infirmary where the beguine
  of Diest is nursing is in it. She is carried out. Two of her sick are not.
- The dragon does not land within sight of open water for the rest of the chapter, until 6.6 forces him.

## 6.6 The drowned Ros Beiaard (boss)

**The legend (check; the Kroniek must say where it is recorded: the chapbook of the Vier Heemskinderen and
Dendermonde's own tradition):** as the price of peace, Charlemagne made Reinout give up the horse Beiaard and
had it thrown in the river with millstones on its neck. It broke the stones and came up twice, looking for its
master. The third time Reinout turned his face away, and the horse, no longer seeing him, went under.

**Seen.** The river heaves and a horse the height of the church stands up out of it, weed where the mane was,
two cracked millstones on its neck and a third still whole. It has four saddles and they are empty. It is not
looking at the hero. It is looking along the bank for a face.

1. *De kaai* (on foot). It charges the quay. The millstones swing a beat after the head: dodge the head, then
   the stone. Jaspar's men will not strike it. Jaspar: "Dat is ons paard. Ik sla ons paard niet."
2. *De stroom* (from the dragon). It goes into deep water and must be fought from the air, low over the river.
   The dragon is afraid: for the first time he balks, climbs when told to dive, and answers slowly below roof
   height. The player fights his own mount as well as the horse. This is the chapter's dragon beat.
3. *De derde keer* (at 20%). It stops and looks straight at the hero. Prompt: **Blijf kijken** or **Draai je weg**.
   - *Blijf kijken* (hold ten seconds while it comes closer; it hurts): the last millstone can be broken. It
     walks into the Scheldt, free, and returns at stroke 3 of the last fight to stand in the breach. No loot.
     Dendermonde has lost its horse to the water: Gilden standing falls.
   - *Draai je weg*: it sinks, as the story says. Gear **De Derde Molensteen**. It returns in chapter 7 against
     the dragon. Jaspar thanks the hero and cannot look at him.

After, in either case, the dragon comes down to the quay at last and looks at the hero the way the horse looked
along the bank.
- Journal: "Het paard had één meester, en die heeft op bevel de andere kant uit gekeken. Mijn draak heeft het zien gebeuren. Sindsdien slaapt hij met één oog open, en dat oog kijkt naar mij."

## 6.7 The bell of Dendermonde, and the factions

| | Bell rings | Bell stays silent |
|---|---|---|
| Town | safe; the Kludde sleeps in the reeds | low quarter floods one step; the Kludde stays as a world boss on the Dender |
| Dragon | loses his low flight over open water for good | whole |
| Standing | Kerk and Gilden up | Oude Volk up |
| Neelke | no tallies until the end | a tally on the belfry door |

World boss suggestion for the region: **De Oschaert van Hamme** (S34), on the roads along the Durme.

| Faction | Stake in chapter 6 |
|---|---|
| Gilden | Jaspar's Pijnders and the bargemen: warehouses on the quay, and the Ros as the town's honour |
| Kerk | Pastoor Hendrik and the abbey of Affligem near Aalst (check): the bell, and a procession against the water |
| Kroon | the baljuw and the garrison: open the sluices on Dutch soldiers who are not there |
| Oranje | Huybrecht in the cells: proof that this water is nobody's weapon |
| Vrije Lieden | Truyken's eel fishers and turf cutters, who already live on the wet side and sell the paths |
| Oude Volk | the split into Wakers and Lossers; they name Kateline |

## 6.8 What chapter 6 must plant for chapter 7

Kateline's name and Saeftinghe. Neelke's warning about Pay (speech 10). The flags `ros_vrij`, `oudevolk_half`,
`neelke_antwoord`. The dragon's fear, shown as wings held too tight. The seventh step. Huybrecht, if freed.

## 6.9 Facts to verify (chapter 6)

1. The Ros Beiaard at Dendermonde: the drowning, the millstones, the turned face, and which river.
2. The Pijnders as carriers of the Ros; the ommegang's first record. Show no ommegang in 1650 unless recorded.
3. Dendermonde's belfry and bell in 1650; its sluices and inundation defence before 1667.
4. Whether a Kludde tale is recorded in Dendermonde town itself (S31 says so; S32 gives the villages).
5. Affligem abbey in 1650; a begijnhof in Dendermonde that could house the beguine.
6. Whether baljuw is the right title for the crown's officer in Dendermonde.
7. "Vierhonderd jaar" in Tanneken's line: the true age of the first Scheldt dikes.

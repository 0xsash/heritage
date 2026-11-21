# Chapter 2: Het Land van Loon

Region: Halen (the last town of Brabant), then Herk-de-Stad, Hasselt, Sint-Truiden, Tongeren, Maaseik and the
heath between them. Level 5 to 10. Law: `story.md` (sections 3 and 5). Voice: `voice.md`.
Everything marked (check) is unverified. Everything marked (invented) is ours.

The chapter's point: this is what a land looks like when its bells are already gone. It is not a ruin. People
have lived a year beside what woke, some worse and some better, and the Oude Volk are strongest here.

## 1. The chapter in ten lines

1. The hero arrives believing what Diest taught him: a silent tower is a wound, and you close it by ringing.
2. He also believes Neelke was taken by one beast in one marsh, and that the trail of that beast leads to her.
3. At Herk he finds the church whose cut bell rope hung in the Kludde's nest. The tower is empty to the beams.
4. On the heath he finds wheel ruts a hand deep, six oxen wide, all going west, and lead seals of the artillery.
5. He spends a night in a boerenschans and learns that the Wild Hunt is why the soldiers stay off the heath.
6. The Oude Volk show him a mill that grinds by itself, a spring that runs again, and a dragon who is happy.
7. On every old stone along the road there are tallies, five strokes and a bar, fresh, in a hand he knows.
8. He leaves knowing that silence is not empty: it has its own people, its own order, and its own dead.
9. He leaves knowing that the bells did not fall silent by themselves. A man with a warrant is carting them west.
10. It cost him one bell decision in the ledger, made knowingly this time, and whichever people he left unguarded:
    the schans to the soldiers (ring), or the night road and lower Hasselt to the Hunt and the water (silent).

## 2. The cast

Names follow the "fine" rows of `history-check.md`. Loon surnames (Vaes, Tans, Briers, Schroots) are Limburg
names (check for 1650). All ten people are invented.

| Who | Where | Wants | Hides |
|---|---|---|---|
| **Lysbeth Vaes**, widow of the bell-ringer of Sint-Quintinus | Hasselt, at the foot of the tower | The Banklok rung once more, so she knows when to pray for her husband | She told the clerk where two village bells were buried, to get her son out of the soldiers' hands |
| **Peeter Tans**, schansmeester | the schans on the heath between Herk and Hasselt (invented) | The Hunt to keep riding: it does at night what no bailiff does by day | Twice he has closed the gate with a man still outside |
| **Mayken van de Alverberg**, midwife and herb woman, speaks for the Oude Volk | a turf hut on the heath; later at Tongeren | That no bell ever hangs in Loon again | She has seen the water rise in the ven by a hand's width and scraped a tally off a stone |
| **Jaspar de Roover**, clerk of the artillery (the polite clerk from Diest) | the inn at Hasselt's market | The last bell of Hasselt on his list, weighed and signed for | His warrant is written for Brabant. In the bishop's land it is worth nothing, and he knows it |
| **Kapitein Nicolas Thiriet**, of the Duke of Lorraine's foot | quartered in a farm outside Hasselt | Soldij for his men, or bronze to sell instead | He has lost eleven men on the heath and will not go there after dark himself |
| **Heer Lambrecht Schroots**, deken of the chapter of Sint-Quintinus (check: Hasselt had a chapter) | Hasselt, the chapter house | The bell rung by the Church, on the Church's terms | He sold two small bells himself to pay the soldiers' contribution |
| **Wouter Briers**, burgemeester and brewer | Hasselt, the market | Market hours and a gate that shuts on time; the soldiers gone | His still sells korenbrandewijn to those same soldiers, and it has never sold so well |
| **Gielis de voerman**, carter | the inn at Herk, drinking | To forget the nights he drove for the clerk | He kept one clapper under his cart and means to sell it |
| **Janneke**, nine years old | the schans | To keep feeding the alvermannekes without her uncle Peeter knowing | Nothing. She is the only person in Loon who is not afraid, and the hero cannot look at her for long |
| **De Jager**, whom the heath people call "de Graaf" | the heath, after dark | The heath as it was before the towers | He was a guardian once, as the dragon is. He does not remember what he guarded |

Returning: **Marieke** the pedlar (in every town; she sells hourglasses here and laughs about it), and the carts
of Loon people from the Diest gate, who now have names.

Two lines for the deken, who has none in the quests below:
- Lambrecht: "De klok is van het kapittel. Wie ze luidt, doet dat met onze zegen."
- Lambrecht: "Ik heb twee kleine klokken verkocht om de grote te sparen. Schrijf dat er ook bij."

Street remarks for a land without bells (twelve words at most, any town):
- "Hoe laat het is? Vraag het aan de haan."
- "Sinds de klok weg is, slaapt mijn man tot de middag."
- "De molen maalt 's nachts. Wij vragen niet door wie."
- "Ze hebben onze klok gewogen zoals je een varken weegt."
- "De soldaten betalen niet, maar na donker zie je ze niet meer."
- "In Sint-Truiden luidt er nog één klok. Daar hebben ze honger."
- "Mijn dochter is zonder klokken getrouwd. Het telt toch, zegt de pastoor."
- "Wie voor het donker niet binnen is, heeft pech gehad."

Where the towns sit in the chapter: Halen and Herk open it (M1, M2), the heath is its middle (M3, M6),
Sint-Truiden and Tongeren carry M4, Hasselt carries M5 and M7. Maaseik is side content only: the Maas, the
ferry, and the door to Oranje in Maastricht.

## 3. The main line (seven quests)

Objective kinds are those of `src/rpg/types.ts`: `talk`, `reach` (with `minY` for "from the air", `onFoot` for
"walk it"), `kill` (`enemy` or `camp`), `collect`, `flag`. New enemy types this chapter needs, each on a body
that exists: `lorreiner` (human, reuse deserteur), `lorreiner_musket` (human, reuse musketier), `heidehond`
(hound), `jager_ruiter` (new: horse and rider), `wolf` (hound). New item ids are named per quest.

### M1. Een toren vol niets (level 5)

- **Giver:** Marieke, at the eastern gate of Diest, among the carts from Loon.
- **Player does:** `reach` the bridge at Halen (the border; `onFoot`, the toll-keeper wants to see you walk).
  `talk` to the toll-keeper. `reach` the top of Herk's church tower from the air (`minY`), which sets the `flag`
  `herk_tower_seen`: the bell frame is empty, the rope still hangs. `talk` to koster Huybrecht. The rope end in
  the hero's pack from the Kludde's nest fits the cut: `flag` `rope_matched`.
- **Choice:** none. This is the door.
- **Reward:** xp, 20 florins, item `touw_van_herk` (quest item), Kroniek page "Loon is van de bisschop".
- **Lines:**
  - Marieke: "In Loon verkoop ik zandlopers. Vroeger kreeg je daar het uur voor niets, van de toren."
  - Huybrecht: "Ze kwamen met een papier en zes ossen. Het papier kon ik niet lezen. De ossen begreep ik wel."
  - Huybrecht: "Het touw hebben ze laten hangen. Ik trek er nog elke middag aan, uit gewoonte."
  - Journal: "Het touw uit het nest van de Kludde past op het touw van Herk. Iemand heeft het hier doorgesneden."

### M2. Het spoor naar het westen (level 6): the bell wagons

- **Giver:** Gielis de voerman, in the inn at Herk, after the third beer the hero pays for (5 florins).
- **Player does:** three `reach` points along the ruts, the first `onFoot` (you have to see how deep they are),
  the other two from the air, where the whole line shows: straight west, around every town with a toll.
  `collect` 4 × `loden_zegel` (lead seals of the artillery) at spawns along the ruts. `kill` the camp
  `lorreiners_wagen` (4 lorreiners, 1 musket, elite "Sergeant La Hache") guarding a wagon sunk to the axle.
  `flag` `wagon_found`: on it lies one bell, cracked from rim to shoulder, with SCHULEN cast in its waist
  (check: Schulen had its own church and bell).
- **Choice: the cracked bell.** It can never ring, so it is not a ledger entry. It is still worth its weight.
  - *Bring it home to Schulen.* Kerk and Gilden gain. The soldiers burn a barn there in answer, and the camp
    in M3 is one man stronger.
  - *Let Gielis sell the bronze.* 90 florins, Vrije Lieden gain. Schulen learns of it in M7 and spits.
  - *Leave it in the sand.* Oude Volk gain. By M4 heather grows through the crack, and Mayken has noticed.
- **Reward:** xp, 40 florins, item `vrachtbrief` (waybill: weights, a column of towers, a signature "J. de R."
  and above it a seal with a gun barrel). The ruts go on west past Halen; that road opens with chapter 4.
- **Lines:**
  - Gielis: "Zes ossen, en nog kwamen we niet door het zand. De zwaarste hebben we laten liggen."
  - Gielis: "Ze betaalden goed, en altijd vooraf. Ik heb niet gevraagd waarom we alleen 's nachts reden."
  - Journal: "Negen wagens, schat ik, aan de sporen. Allemaal naar het westen. Geen enkel spoor komt terug."

### M3. De poort gaat toe (level 7): a night in the schans

- **Giver:** Peeter Tans, at the gate of the schans, when the hero is still on the heath at dusk.
- **Player does:** `collect` 6 × `turf` for the watch fire. `kill` camp `lorreiners_foerage` (foragers who come
  for the cattle before dark). `reach` the wall walk after dark, which sets `flag` `saw_hunt`: horn, hounds,
  riders with no weight on the ground, and the last foragers running from them. The dragon sings back.
- **Choice: the man outside.** A wounded Lorreiner, a boy, begs at the gate after the horn.
  - *Open the gate.* Hounds come in with him: `kill` 5 × `heidehond` inside the schans. A cow dies, Peeter's
    trust drops, the Oude Volk lose a little. The boy lives and names the clerk's inn in M5.
  - *Keep it shut.* Peeter and the Oude Volk gain. In the morning there are boots at the gate, standing neatly
    side by side. Janneke asks whose they are.
- **Reward:** xp, 30 florins, gear `schanspiek` (a peasant pike), a bed, Kroniek page "De boerenschans".
- **Lines:**
  - Peeter: "Als de zon de berken raakt, gaat de poort toe. Wie dan nog buiten is, is van de hei."
  - Peeter: "De soldaten komen overdag. 's Nachts durven ze niet meer, en dat hebben we niet aan onszelf te danken."
  - Janneke: "De honden doen niets als je binnen blijft. Ik heb ze geteld. Het zijn er altijd negen."

### M4. Wat er wakker werd (level 7 to 8): the Oude Volk, Sint-Truiden, Tongeren

- **Giver:** Mayken van de Alverberg, who is waiting by the dragon in the morning, scratching his jaw.
- **Player does:** `reach` three old places, each a `flag` set by what the dragon does there:
  the Alverberg mill at night, grinding with nobody in it (`flag` `mill_seen`); a Roman tumulus in Haspengouw
  on the old road, where the dragon digs like a dog (`flag` `tumulus_seen`) (check: which tumuli stand near
  Tongeren); the spring outside Tongeren that people call Plinius' bron, running red and strong again, where
  he drinks and steams (`flag` `spring_seen`) (check). `talk` to Mayken at Tongeren under the Roman wall.
  On the way: Sint-Truiden, where the abbey alone kept one small bell. Around the abbey nothing is awake, and
  the town is hungry, because the abbot paid the soldiers in the town's grain (invented).
- **Choice: Gielis' clapper** (if the hero got it from him in M2 by paying 25 florins or by threatening him).
  - *Give it to Mayken.* She sinks it in a ven. Oude Volk gain a lot; Kerk loses.
  - *Keep it for Lysbeth.* Opens a cheaper way to ring in M7; Mayken says nothing and remembers.
- **Reward:** xp, the dragon buff "Wakker land" explained in the journal (section 5), Kroniek pages.
- **Lines:**
  - Mayken: "Je draak is hier wakkerder dan thuis, of niet? Hier is er niets dat hem in slaap wil zingen."
  - Mayken: "De molen maalt 's nachts vanzelf sinds de klok weg is. Vraag de molenaar of hij ze terug wil."
  - Mayken: "Die streepjes op de stenen zetten wij niet. Iemand anders houdt hier de rekening bij."

### M5. De klerk telt (level 8): Hasselt

- **Giver:** Wouter Briers, on the market of Hasselt, where the gate now shuts when the watchman gets sleepy.
- **Player does:** `talk` to Lysbeth, to deken Lambrecht, to Jaspar de Roover. `collect` 3 × `kapittelrekening`
  (pages that show who sold which bell). `flag` `banklok_known`: Lysbeth tells the hero that the great bell was
  never taken. Her husband and four brewers carted it out the night before the wagons came and sank it in a
  heath pool, the Klokkenven (invented; sunken-bell stories are common in Limburg and the Kempen (check)).
- **Choice: what to do about the clerk.**
  - *Read his warrant aloud on the market.* It names Brabant, not Loon. Gilden gain, Kroon loses. Thiriet's
    men, now sure of no pay, plunder a hamlet that night.
  - *Buy him off* with the Schulen bronze or 120 florins. He writes "niet gevonden" and leaves. Kroon neutral.
    He will know the hero in Mechelen, and he will know what the hero's word costs.
  - *Lead him onto the heath at dusk to "show him the bell".* Oude Volk gain a lot, Kroon loses a lot. He
    comes back alone at dawn, on foot, white-haired, still polite. He is in chapter 4 like that.
- **Reward:** xp, 50 florins, the `vrachtbrief` completed: forty-two towers, each with a weight. Its top line
  reads "Op last van Meester L., gieter van Zijne Majesteits geschut, te M." This is all of Lenaert that
  chapter 2 shows: an initial, a seal and a hand that never blots. The name and the town wait for chapter 4.
- **Lines:**
  - Jaspar: "Ik neem niets weg. Ik schrijf alleen op wat er niet meer luidt."
  - Jaspar: "Een klok die zwijgt is brons, en de koning heeft brons nodig. Dat heb ik niet verzonnen."
  - Lysbeth: "Ik weet waar ze ligt. Ik zeg het aan niemand die een papier bij zich heeft."
  - Thiriet: "Elf man ben ik kwijt op die hei, en niet één aan een kogel."

### M6. De Wilde Jacht (level 9 to 10): chapter boss

- **Giver:** nobody. The Klokkenven lies in the Hunt's ground. `reach` the ven after dark and the horn answers.
- **Why he fights:** a sunk, mute bell is what let him wake. He will not have it lifted. He also will not have
  it harmed: he hunts whoever comes for it, soldier or sexton.
- **Arena:** the ven, a ring of birches, open heath a kilometre across. Night. Dwaallichten mark the edges.
- **Phase 1, on foot: the hounds.** Nine `heidehond` in threes. *Tell:* the horn, one long note, then a row of
  dwaallichten lights up in a straight line: three seconds later the riders charge down that lane. Stand in it
  and you are ridden down (heavy damage, knockdown). Kill the hounds between charges; they rise again once.
- **Phase 2, from the dragon: the Hunt takes the sky.** A chase low over the heath. Fire breaks riders out of
  the line; the Jager's spear throws are aimed where you will be (*tell:* his arm goes back and the spear
  glows white). **"De hoorn roept":** twice in this phase the horn sounds three short notes and the dragon
  turns toward the Hunt by himself. The player must hold the reins against him (hold a direction for four
  seconds) or be carried into the pack. The dragon wants to go. This is his beat inside the fight.
- **Phase 3, on foot at the ven: de Graaf dismounts.** Slow, long reach, a boar spear. *Tells:* he plants the
  butt before a sweep; he whistles before the last three hounds flank. The sky pales through the phase. He
  cannot be killed. At a quarter of his health, or at first light, he stops.
- **Outcome:** he yields the ven until the hero has decided, and no longer.
- **Reward:** named gear **De Hoorn van Loon** (trinket: once per fight, a hound of the Hunt fights beside you
  for twenty seconds). Dragon mark **Heidebrand**: his wing skins take the purple of heather in August.
- **Lines:**
  - De Jager: "Jij rijdt op een van de mijnen. Weet hij dat nog?"
  - De Jager: "Zolang die klok zwijgt, is de hei van mij. Zo was het afgesproken, lang voor jullie torens er stonden."
  - Journal: "Hij is niet gevallen. Hij is gestopt toen het licht werd, zoals een man die zijn dagwerk neerlegt."

### M7. De Banklok (level 10): the bell decision at Hasselt

- **Giver:** Lysbeth, at the ven at dawn, with the rope over her shoulder. Mayken stands on the other bank.
- **Player does (ring):** `talk` to Wouter for an ox team (40 florins, or free at Gilden "Gezien"); `talk` to
  Lambrecht for the chapter's consent (he wants the `kapittelrekening` pages back first); `collect` the clapper
  (Gielis', or a new one forged for 60 florins); `reach` the tower top; `flag` `banklok_rung`.
- **Player does (silent):** `talk` to Mayken; `reach` the ven; `flag` `banklok_left`. Lysbeth watches.
- **Ring: what it buys and costs** (story.md section 3). Hasselt is safe from the Hunt; the alvermannekes sleep
  and the mill needs a miller's boy again; Kerk and Gilden gain. The dragon loses a little of one power for
  good (his breath reaches about a tenth less far; a little, never the whole) and "Wakker land" ends around Hasselt. Within
  the week the soldiers ride the heath at night again and the schans is plundered; Peeter does not blame the
  hero aloud. Mayken does not speak to him again in this chapter. Jaspar's list gets Hasselt back on it.
- **Silent: what it buys and costs.** The dragon stays whole; Oude Volk gain; the heath keeps richer hunting,
  harder roads, the Hunt as a returning night event and the world boss. The water advances one step: the Demer
  stands in the lowest street of Hasselt by morning with no rain (check: the Demer ran through Hasselt), and
  the ven is a hand higher. Lysbeth takes her rope and goes to her sister in Diest, where the bells still ring.
- **Either way:** a fresh tally on the stone at the gate of Hasselt. One stroke more than yesterday.
- **Reward:** xp, 100 florins; `{ complete: 'loon_banklok', outcome: 'ring' | 'silent' }`; ledger entry 2.
- **Lines:**
  - Lysbeth: "Mijn man heeft ze dertig jaar geluid. Zonder klok weet ik niet wanneer ik voor hem moet bidden."
  - Mayken: "Luid ze maar, als je dat wilt. Kijk daarna wel eens naar je draak, en dan naar de schans."
  - Wouter: "Zonder klok gaat de poort toe wanneer de wachter slaap krijgt. Daar kun je geen markt op houden."

### What the main line needs that the engine does not have yet

- **Reward scale.** Follow `diest.ts`: 220 to 300 xp and 30 to 50 florins for M1 to M5, 700 xp for M6 (the
  Kludde gave 600), 400 xp and 100 florins for M7. Renown goes through `renown: [town, amount]`; add Herk,
  Hasselt, Tongeren and "De Hei" to `RENOWN_TO_FACTION`, or move to faction ids.
- **Het Oude Volk has no id.** `FactionId` in `factions.ts` knows five parties. The hidden sixth needs an id
  (`oude`) and a standing that is not shown until the player has met Mayken.
- **Night.** M3, M6, S2 and the Hunt need a condition on the hour. Until `Cond` has one, set a flag
  (`is_night`) from the day clock and gate the `reach` objectives and the camps on it with `if`.
- **The ledger.** One number in the save, changed only by `{ complete: ..., outcome: ... }` on a bell quest.
  Diest is entry 1 (ring). M7 writes entry 2. The tally stones read this number.
- **The dragon's will.** "De hoorn roept" is the first time the mount steers itself. It needs a small hook in
  the flight code: an outside pull on the heading that the player's input can overcome.
- **Which power the bell takes.** `gameplay.md` lists breath, dive strike and tail sweep. Hasselt takes a
  little of the breath: its reach drops by about a tenth, for good, and the journal says so plainly.

Proposed numbers for the new enemies, in the form of `src/combat/enemies.ts` (`l` is the level; the Kludde is
`130 + l * 40` health for comparison). They are a starting point for tuning, not tested values.

| id | body | hp | dmg | speed | reach | note |
|---|---|---|---|---|---|---|
| `lorreiner` | human | `36 + l * 16` | `5 + l * 2.8` | 4.2 | 2.0 | the deserteur with a regiment's coat |
| `lorreiner_musket` | human | `26 + l * 12` | `9 + l * 3.6` | 3.6 | 1.6 | as the musketier |
| `heidehond` | hound | `20 + l * 10` | `4 + l * 2.3` | 8.2 | 1.7 | in the boss fight each rises once |
| `wolf` | hound | `26 + l * 12` | `5 + l * 2.2` | 7.8 | 1.7 | a real animal; flees at a third health |
| `jager_ruiter` | rider (new) | `40 + l * 14` | `8 + l * 3` | 11 | 2.4 | only charges along a lit lane |
| `de_jager` | rider, then human | `220 + l * 55` | `13 + l * 4.2` | 5 on foot | 4.0 | stops at a quarter health |

### World boss (proposal): De Gloeiende

`story.md` leaves the world boss of Loon open. Proposal: **De Gloeiende**, the burning surveyor. In stories
told across Limburg and the Kempen (check: where and by whom recorded) a surveyor who moved boundary stones in
his life must walk the border after death, burning, carrying the stone and asking "Waar moet ik hem leggen?"
Here he walks the line between Brabant and Loon, from Halen to the heath, on the shared calendar. He is a slow
giant of fire seen from kilometres away at night; he is fought on foot and from the air, and he is put out for
a week, not killed. He stays for good only if the Banklok is left silent; after a ring he walks one last
night and lies down. The side quest "De grenssteen wandelt" is his plant. A player who answers his question
("Leg hem waar je hem gevonden hebt", the answer the stories give (check)) gets a different drop from one who
only fights him.

## 4. Side quests

### S1. De uurroeper van Herk (level 5, light)

- **Giver:** Wouterken, twelve, paid two stuivers a day to turn an hourglass and shout the hour on the market.
- **Player does:** `talk` to the baker and the brewer, who each keep their own hour and each say the boy is
  wrong. `reach` the tower top at noon (`minY`), `flag` `noon_read`: the shadow of the empty bell frame falls
  on the church door at midday, as it always has.
- **Choice:** tell the town the true hour (the brewer loses the half hour of drinking he had added; the boy
  loses his job by winter), or say the brewer was right (10 florins from the brewer; the baker's bread is late
  for good).
- **Reward:** 15 florins, Gilden renown, item `zandloper`.
- **Lines:** "Het is tien uur, denk ik. De zandloper is vannacht omgevallen." / "Bij de bakker is het al elf
  uur. Bij de brouwer wordt het nooit later dan negen."

### S2. Melk voor de Alverberg (level 6, light)

- **Giver:** Janneke, at the schans. Alvermannekes are recorded in Limburg folklore (check where: Hoeselt,
  Bilzen); the motif that they work at night and leave when spied on or paid is widely recorded (check).
- **Player does:** `collect` 3 × `kom_melk` from farms (in Diest people set out pap; on the heath it is
  milk); `reach` the mill after dark `onFoot`; `flag`
  `alver_seen` (you see only the flour settling). `talk` to the miller, who wants to catch one.
- **Choice:** help the miller set his trap (30 florins; the grinding stops for good and the schans eats less
  this winter) or warn Janneke (Oude Volk gain; the miller raises his price to everyone and blames the hero).
- **Reward:** Oude Volk or Gilden renown; a small loaf nobody baked.
- **Lines:** Janneke: "Je moet niet kijken. Als je kijkt, zijn ze beledigd." / Miller: "Ze malen voor een kom
  melk. Ik wil alleen weten of het ook voor een halve kan."

### S3. Christina op het dak (level 8, Sint-Truiden)

- **Giver:** a canon in Sint-Truiden. A bell-ringer's daughter climbs the church roof every evening since the
  bells went. The town says Christina de Wonderbare has come back: she lived here, died in 1224, and in her
  life by Thomas van Cantimpré she flew up to the rafters at her own funeral (check).
- **Player does:** `reach` the roof ridge from the air (`minY`); `talk` to her. She is not mad. She goes up to
  listen, and she can still hear the bells: far off, to the west, and fewer each week.
- **Choice:** bring her down to the canons (Kerk gains; she is locked in the infirmary "for her rest") or leave
  her there (she gives the bearing of the wagons for M2; her father is fined by the chapter every week).
- **Reward:** Kerk renown or a map mark; Kroniek page "Christina de Wonderbare".
- **Lines:** "Ik ben niet zot. Ik luister. Gisteren hoorde ik er nog zeven, vandaag zes." / Canon: "Een heilige
  op het dak brengt pelgrims. Een zottin op het dak kost ons alleen dakpannen."

### Seven shorter ones

1. **De bruid wil klokken** (Herk). A bride will not marry without bells. The hero finds her a noise: the
   smith's anvils, the brewers' kettles, or one roar from the dragon over the church. Each offends somebody.
2. **De grenssteen wandelt** (Halen). The stone between Brabant and Loon moves a rod every night and two farmers
   blame each other. Both are right. Recorded motif: the surveyor who moved stones burns after death (check).
3. **De paarden van Maaseik.** Mares stand sweating each morning with plaited manes: the Maar rides them, people
   say (check: recorded in Limburg). Watch a night in the stable. It is the stable boy, racing them for bets.
4. **Brandewijn voor de kapitein** (Hasselt). Thiriet pays Wouter's still with a silver chalice. Carry it back
   to the church it came from, or to Marieke, who asks no questions (check: grain distilling in Hasselt, 1650).
5. **Wolven op de Donderslag** (contract). Real wolves, not old things: `kill` 6 × `wolf`. The shepherds pay in
   wool, and one wolf wears a soldier's collar (check: the Donderslagse heide; wolves in Loon in 1650).
6. **De gouden koets** (Tongeren). Diggers open a tumulus for the golden coach that every village says lies in
   theirs (check). They find tiles, bones and a camp of dwaallichten. `kill` the camp; fill the hole or do not.
7. **Het veer bij nacht** (Maaseik). The ferryman will not cross the Maas after dark. A courier for Maastricht,
   where the States have sat since 1632, needs to be over before morning (Oranje). Fly him; the dragon is seen.

## 5. Neelke and the dragon

**Neelke: the tallies on the stones.** She is not seen in this chapter. Her hand is. The story file says
milestones; in Loon in 1650 use boundary stones, wayside crosses and the stones of the Roman road from Tongeren
through Sint-Truiden toward Tienen (check: the road and any surviving milestone). The first tally is on the
border stone at Halen in M1: five strokes and a bar, the scratch still white, stone dust on the grass under it.
The hero knows the hand because she draws the bar from right to left. In M2 he counts: the tallies on the stone
nearest the sunk wagon equal the lead seals he picked up. She is counting bells as they pass. He takes it as
proof that she walked this road alive, and for one chapter that is hope. Nobody corrects him. Mayken's line in
M4 is the only crack. The last tally is at Hasselt's gate after M7, and it counts his decision, not a wagon.
Journal: "Vijf streepjes en een dwarsstreep, van rechts naar links. Zo deed ze dat. Ze is hier voorbijgekomen."

**The dragon: stronger and happier.** Mechanically, east of Halen he carries the buff **Wakker land**: faster
stamina return, a longer fire, and he lands without being called when the hero is hurt. In behaviour he is a
different animal. He rolls in the heather. He chases the heath hounds without killing them. He hums at night,
and in the schans the cows stop lowing when he does. He comes on the second whistle, not the first. He brings
the hero a hare and lays it on his boots. In M6 he tries twice to join the Hunt, and the player has to hold him
back by force: the only time in the chapter the two want different things. After **ring**, he sits with his
back to the tower of Hasselt and the buff is gone around the town. After **silent**, he lies in the Klokkenven
until the water steams, and will not get out when called. Journal: "Hij is hier thuis. Ik ben hier op bezoek."

## 6. What each faction wants here

- **De Gilden.** Hasselt's ambachten want the Banklok back as the town's bell: market hours, the gate, the fire
  alarm. They want it owned by the town, not the chapter. Their dirty hand is Wouter's still.
- **De Kerk.** In Loon the Church is also the lord: the prince-bishop of Liège. The chapter wants every bell
  back and every old thing asleep, and wants it done on its authority. It sold bells itself to pay off soldiers.
- **De Kroon.** No law here, only a neighbour's army. The Duke of Lorraine's regiments serve Spain and winter
  in Liège land unpaid (check). The Kroon wants bronze, passage and quiet, and a clerk who is not embarrassed.
- **Oranje.** The States hold Maastricht since 1632 (check: shared with Liège). Oranje's people want to know
  where Spain's bronze goes, and offer to keep Loon's last bells "safe" in Maastricht. They would not come back.
- **De Vrije Lieden.** The carters drove the bell wagons, for good money, and are split over it. The night road
  without tolls is theirs; the Hunt keeps the toll men off it and also takes carters.
- **Het Oude Volk.** Strongest here. They want the Banklok left in the ven and the guardians awake. They do not
  want the sea, and they have not connected the two. Mayken has, and has told nobody.

## 7. Kroniek pages this chapter adds

| Page | Label |
|---|---|
| Loon is van de bisschop: the county fell to Liège in 1366 (check) | geschiedenis |
| De Goede Steden: Hasselt, Herk, Tongeren, Maaseik, Sint-Truiden among the bishop's towns (check) | geschiedenis |
| Halen, de laatste stad van Brabant (check: Halen was Brabant, not Loon) | geschiedenis |
| De Lorreiners: the Duke of Lorraine's troops in the land of Liège around 1650 (check) | geschiedenis |
| De boerenschans: earth-and-water refuges the heath villages dug against soldiers (check dates) | geschiedenis |
| Sint-Truiden, half of the abbot and half of the bishop (check) | geschiedenis |
| De Romeinse weg en de muur van Tongeren (check) | geschiedenis |
| Christina de Wonderbare (died 1224) (check) | geschiedenis |
| De Wilde Jacht (check: where recorded in Limburg, and under which name) | volksverhaal |
| De alvermannekes van de Alverberg (check) | volksverhaal |
| De verzonken klok: bells sunk in a pool that ring on Christmas night (check) | volksverhaal |
| De Maar die paarden berijdt (check) | volksverhaal |
| De gloeiende landmeter (check): proposed world boss, walking the border by night | volksverhaal |
| De Banklok van Hasselt en het Klokkenven | verzonnen |
| De Graaf: that the Hunter was once a guardian, and a count of Loon | verzonnen |
| Wakker land: why the dragon is stronger where no bell rings | verzonnen |
| De vrachtbrief: forty-two towers and a seal with a gun barrel | verzonnen |

## 8. Facts to verify

1. **Halen was a town of Brabant, not of Loon**; the border ran between Halen and Herk. The chapter depends on it.
2. Loon passed to the prince-bishopric of Liège in 1366. The prince-bishop in 1650: Ferdinand of Bavaria, who
   died in September 1650, then Maximiliaan Hendrik. Decide which month the chapter plays.
3. Liège neutrality (history-check F76 says recognised by Spain only in 1654) and Lorraine troops quartered in
   Loon around 1650: dates, places, and whether "Lorreiners" was the word people used.
4. Boerenschansen in Loon: that they existed by 1650, and a real one between Herk and Hasselt to replace ours.
5. Hasselt: a chapter at Sint-Quintinus in 1650, two burgemeesters, the ambachten, the Demer through the town,
   grain distilling this early, and whether Hasselt lost or kept its bells in these years (we invent the loss).
6. Sint-Truiden's double lordship; the abbey's bells. Schulen as a parish with its own bell.
7. Tongeren: the Roman wall, the spring called after Plinius, the tumuli of Haspengouw, the Roman road.
8. The Wild Hunt in Belgian Limburg: recorded name, place and collector. Also alvermannekes, the Maar, sunken
   bells, the burning surveyor, the golden coach in a tumulus. Until checked, none of them is "recorded".
9. Christina de Wonderbare: dates and the rafters episode in Thomas van Cantimpré.
10. Maastricht under the States since 1632, shared with Liège. Wolves on the Limburg heath. Surnames Vaes,
    Tans, Briers, Schroots, Thiriet for 1650. Whether artillery klokkenrecht could reach a neutral land at all.

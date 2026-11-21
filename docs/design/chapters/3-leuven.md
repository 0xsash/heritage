# Chapter 3: Leuven, with Aarschot and Tienen

Level 5 to 10. One and a half to two hours. Follows `docs/design/story.md` (the law) and `docs/design/voice.md`.
Can be played before or after chapter 2. Everything marked (check) is unverified; everything marked (invented)
is ours and the Kroniek must say so. Coordinates are left open until the Leuven map exists; places are named.

## 1. The chapter in ten lines

1. The hero arrives believing what the prologue ends on: the water is a thief, and what a thief takes can be
   taken back.
2. He comes because the oak figure hums west, and because Pieter the sexton says the canons of Sint-Pieter keep
   the oldest bell books in Brabant.
3. Leuven's hour bell has hung silent for three weeks. Nobody stole anything: the tower stump is sinking and the
   bell frame has gone out of true. Chapter and city each say the other must pay.
4. In the registers bells are not entered like gifts or furniture. They are entered like debts, with a column
   for hours owed and hours paid.
5. The towers of Sint-Pieter were never finished because something under them takes the ground away. It has
   been doing so for a hundred and fifty years, and faster since the bell stopped.
6. Fiere Margriet is the one entry in four centuries marked "returned". The chapter's answer (this file's
   proposal): the water gave her back because she was never owed. Men threw her in. The water keeps exact books.
7. The mute boy's stones are written in the register's own notation. They are a date: Allerheiligen, the first
   of November. Canon and student agree on the date and not on what a date from a creditor means.
8. He leaves knowing that the land is a loan, that the bells count its hours, and that Neelke was not stolen.
   Diest struck seven of twelve. She was taken for the missing five.
9. So she cannot be fetched back. She can only be settled for, and every way of settling costs somebody else.
10. What it cost: his first hope; the good name of one of the two people who helped him read; and either a
    piece of the dragon (bell rings) or the low streets along the Dijle (bell stays silent).

## 2. The cast

| Who | Where they stand | Wants | Hides |
|---|---|---|---|
| **Kanunnik Laureys Vranckx**, keeper of the chapter archive of Sint-Pieter (invented) | Chapter room off the choir of Sint-Pieter | The books read as theology: the hours are owed to God, the bell is a prayer, and Rome hears nothing of it while the Augustinus quarrel burns (check: state of that quarrel in 1650) | He cut the Margriet leaf out of the register years ago and keeps it in his breviary. He is afraid of what it proves |
| **Thijs Minten**, student in the Arts at the pedagogy De Valk, born in Diest (invented; surname from the register) | Courtyard of De Valk, Tiensestraat (check) | The books read as bookkeeping. He wants to be the one who proves it and to be primus of his year | He owes eleven florins at the inn and sells copies of register pages to the artillery clerk to pay them |
| **Professor Fromondus** (real: Libert Froidmont, 1587 to 1653; already in `diest.ts`) | His study, ill, by the fire (check: his house, and whether he was dean of Sint-Pieter) | That two clever men stop shouting in his hearing; that the question stays inside Leuven | He wrote six books on weather and water (check: Meteorologicorum libri sex, 1627) and left one observation out |
| **Gooris Bosmans**, klokkenluider and torenwachter of Sint-Pieter (invented) | Foot of the tower stair, west front | The bell hung straight before winter; he is paid by the ringing | He stopped ringing two days before the frame slipped, because of the knocking from below |
| **Meester Peeter van Dormael**, stadsmetser in charge of the tower stumps (invented) | The scaffold on the west front | Money to shore the stumps, from anyone | A report from the last century says the ground "drinks" the foundation. He has had it in his chest for nine years |
| **Jaspar de Coninck**, klerk van de artillerie (the clerk planted in Diest in chapter 1; name invented) | A rented room over the Tafelrond on the Grote Markt (check: use of the Tafelrond in 1650) | The silent bell, bought fairly as scrap, with a warrant that is in order | His list of towers is longer than his warrant |
| **Mayken Haeck**, waardin of the inn Bij Fiere Margriet (invented inn) | The Dijle quay by the Vismarkt (check) | Pilgrims, and her chapel candle money | A chest of things the river has laid on her quay over twenty years. She sells them |
| **Zuster Lysbeth**, begijn of the Groot Begijnhof | The lowest court of the Begijnhof, on the Dijle | The bell rung: her court floods at night | She puts bread out for a child she has seen across the water, and has told no one |
| **Huybrecht Smets**, pedel of the rector (invented) | The Universiteitshal, Naamsestraat (check) | Every student under the rector's law and not the mayor's | He takes a fee from both courts |
| **Josine van de Keizersberg**, of Het Oude Volk (invented) | The ruin of the ducal castle on the Keizersberg (check: state of the castle in 1650) | The bell left crooked, and what sleeps under the hill let be | She knows what is under Sint-Pieter and has not warned the town |

Returning: Marieke the pedlar (on the Tiensestraat, selling forbidden books by weight), Pieter the sexton
(by letter), the beguine of the infirmary in Diest (quest M5).

Sample lines:
- Vranckx: "Een klok wordt gedoopt en krijgt een naam. Een schuld krijgt alleen een bedrag."
- Vranckx: "Die jongen kan rekenen. Ik heb nog nooit iemand zien bidden met een telraam."
- Thijs: "Kijk naar de kolommen. Links staat wat de klok moet, rechts wat ze geslagen heeft. Zo schrijft mijn
  vader zijn klanten op."
- Thijs: "De kanunnik leest Latijn zoals hij de mis leest. Hij weet al wat er gaat staan."
- Gooris: "Ik luid die klok al dertig jaar. Sinds drie weken luistert er iemand mee van onder de vloer."
- De Coninck: "Een klok die niet luidt, is brons. Ik betaal voor brons een eerlijke prijs, en ik betaal vandaag."

## 3. The main line

Seven quests. Objective kinds are the five in `src/rpg/types.ts`: `talk`, `reach` (with `minY`, `onFoot`),
`kill` (by `enemy` or `camp`), `collect`, `flag`. Choices are `Choice` entries that `set` a flag and pay
`renown`. New enemy types are named where needed.

### M1. `lv_aankomst`: De stad die niet af is
- **Giver:** Pieter the sexton in Diest hands over a letter for kanunnik Vranckx (or the quest starts by itself
  when the hero first crosses into Leuven).
- **Do:** `reach` the Grote Markt of Leuven `onFoot`. `talk` to Gooris at the tower stair. `reach` the top of
  the south tower stump with `minY` (on the dragon) and see the hour bell hanging crooked in its frame.
  `talk` to Vranckx with the letter (`item: brief_pieter`).
- **Choice:** none. On the stump, the first discovery card: the stone model of the towers as they were meant to
  be stands in the church below (check: Joost Metsys's model, about 1524).
- **Reward:** 120 xp, renown Leuven +3, the canon's permission to enter the chapter room (`set lv_kapittel`).
- **Lines:** Gooris: "Drie torens hadden het moeten worden. De middelste moest hoger worden dan alles wat een
  mens ooit gebouwd had. Je staat op wat ervan gekomen is." / Vranckx: "Pieter schrijft dat je klepels uit het water hebt
  gehaald. Hier is niets gestolen. Dat maakt het niet eenvoudiger."

### M2. `lv_klokkenboek`: Het Klokkenboek
- **Giver:** Vranckx, chapter room. The register (invented: "het Klokkenboek van Sint-Pieter") is incomplete.
  Three quires were hidden in 1635, when the French and the Dutch lay before the walls (check: siege of Leuven,
  June and July 1635).
- **Do:** `talk` to Thijs at De Valk, the only one who has seen the binder's list. `collect` 3 `katern`:
  behind the ellenmaat in the Universiteitshal, in the tower of Sint-Geertrui, in the library of the abbey of
  Park. At Park a `kill` objective: 5 `dwaallicht` over the abbey ponds at dusk. Then `flag lv_boek_gelezen`,
  set by the reading scene.
- **What the reading shows:** every bell of the duchy on one line: name, weight, the day it was hung, and two
  columns the canon calls *debet* and *solvit*. Hours owed, hours struck. A bell that burst or was taken has
  its line closed with the word a clerk uses for a debt gone bad.
- **Choice:** who gets the quires first.
  - *To the canon:* Kerk +6. He reads fast and well, and keeps one leaf back. M4 then needs an extra step
    (the breviary) and Thijs trusts the hero less (`lv_thijs_koel`).
  - *To the student:* Vrije Lieden +3, Thijs opens the student side quests at once. He copies the list of
    towers that night and sells it to De Coninck: Kroon +3 now, and in chapter 4 Lenaert already knows which
    towers the hero has visited (`lv_lijst_verkocht`).
- **Reward:** 200 xp, 25 florins, gear `leesglas` (trinket; invented).
- **Lines:** Vranckx: "Hier staat Diest. Die klok hangt er sinds de toren er staat. En hier, drie weken geleden,
  staat: zeven van de twaalf. Iemand heeft dat opgeschreven, en het is niet mijn hand." / Thijs: "Dat is geen kerkboek. Dat
  is een kasboek. Ik wil alleen weten wie de schuldeiser is."

### M3. `lv_torens`: Wat de grond niet draagt
- **Giver:** Meester Peeter van Dormael, on the scaffold of the west front.
- **History to use:** the west front was designed for three towers, the middle one far higher than any tower
  then standing; work stopped in the sixteenth century because the foundations gave way, and parts fell or were
  taken down afterwards (check all of it: design by Joost Metsys from 1507, intended height about 170 m, stop in
  1541, collapses in 1570 and 1604, lowering to roof height by about 1613 to 1630).
- **Do:** `reach` the top of the scaffold (`minY`). `collect` 4 `peillood`, the lead marks earlier masons set
  to measure the sinking: two in the cellars under the west front, one in the Dijle wall, one in the well of
  the Grote Markt. `kill` camp `lv_kelders` (4 `dwaallicht`, 3 `broekhond`, elite "De Natte Hond") in the
  cellars. `flag lv_rapport`: open Peeter's chest and read the old report.
- **What it shows:** the marks sink fastest in the weeks a bell was silent. The report says the same in the
  words of a mason of the last century, who did not know what he was saying.
- **Choice:** what to do with the report.
  - *Take it to the magistrate in the Stadhuis:* Gilden +5. The city condemns the stumps and clears the twelve
    houses against the west front before M6, so nobody dies there. Peeter loses his post.
  - *Leave it in the chest:* Peeter keeps his post and gives gear `metsershamer`. In M6 the houses are still
    full, and the fight has a timer on them.
- **Reward:** 240 xp, 30 florins.
- **Lines:** Peeter: "Mijn grootvader heeft aan die toren gemetst. Hij zei dat je 's morgens kon zien wat de
  grond 's nachts had opgedronken." / Peeter: "Diest heeft zijn toren niet af en Mechelen ook niet. Vraag jij je
  nooit af wat er in Brabant met hoge torens gebeurt?"

### M4. `lv_margriet`: Fiere Margriet
- **Giver:** Mayken Haeck, on the Dijle quay. She tells the legend for a stuiver, as she tells every pilgrim.
- **Folklore to use (recorded; check the details):** Margaretha of Leuven, a serving girl at an inn, killed in
  1225 by robbers who had murdered her master and mistress; her body was thrown into the Dijle and was found
  floating upstream, with a light around it. The story is in Caesarius of Heisterbach, in her own century
  (check: Dialogus miraculorum). She had a chapel against the choir of Sint-Pieter by the sixteenth century
  (check).
- **Do:** `talk` to Mayken. `reach` the place below the Vismarkt where the body was found, `onFoot`, after
  dark: the river there runs backwards for the length of nine strokes (`flag lv_ring_gezien`). `talk` to
  Vranckx; if he kept the leaf in M2, first `collect` 1 `margrietblad` from his breviary in the chapter room,
  or persuade him (needs Kerk at Bekende). `talk` to Thijs. `flag lv_margriet_gelezen`.
- **What it shows:** her line in the register is the only one in four hundred years with a third column
  filled in. *Reddita*: given back. Beside it, in the hand that wrote "zeven van de twaalf": not owed.
- **The two readings:** Vranckx: a miracle, God overruling the water for the sake of a clean soul. Thijs: a
  correction. Leuven's bells had struck every hour that night; the town owed nothing; men put her in the
  river. A creditor who keeps honest books returns what was booked by mistake.
- **Choice:** tell Mayken what the page says, or let her keep her miracle.
  - *Tell her:* she stops telling the legend for money and gives the hero the chest (three things the river
    returned, one of them a child's shoe that is not Neelke's). Kerk −3.
  - *Say nothing:* Kerk +3, the pilgrims keep coming, the chest stays shut until chapter 6.
- **Reward:** 260 xp. Journal: "Het water heeft haar teruggegeven omdat het haar niet mocht houden. Neelke
  heeft het wel gehouden. Ik weet nu wat dat wil zeggen, en ik wou dat ik het niet wist."
- **Lines:** Mayken: "Ze dreef tegen de stroom in, met licht rond haar. Mijn grootmoeder zei dat de vissen
  haar droegen. Mijn grootmoeder verkocht ook vis." / Thijs: "Als het water teruggeeft wat het niet toekomt,
  dan houdt het bij wat het wel toekomt. Het spijt me. Ik had het liever anders gelezen."

### M5. `lv_stenen`: De stenen van de stomme jongen
- **Giver:** Thijs, who is from Diest and has seen the boy lay his stones on the infirmary step.
- **Do:** `reach` the infirmary of the Begijnhof in Diest. `talk` to the beguine. `flag lv_stenen_getekend`
  (the hero copies the row: five small stones and a long one across, again and again, then a gap, then one).
  Back in Leuven, `talk` to Vranckx and to Thijs. On the way to De Valk the Neelke beat plays (section 5).
- **What it shows:** the dates in the oldest part of the register are not written in years of Our Lord. They
  are tallied: five strokes and a bar. The boy writes as the register writes. Read that way his row is a day:
  the first of November, Allerheiligen, with no year, which in the register means the next one. (The real
  All Saints' Flood of 1570 struck on that day; check, and check what it did at Saeftinghe.)
- **Choice:** whose reading is posted on the church door and entered in the Kroniek.
  - *The canon's: a vervaldag.* The loan falls due. Kerk +5, the churches fill, the price of candles and of
    carts out of town doubles in every later chapter.
  - *The student's: an afspraak.* A creditor who names a day is willing to talk. Oude Volk +3, Vrije Lieden
    +3. Thijs is summoned before the rector for it and loses his place at De Valk.
  - Either way one of the two pays for having helped (line 10 of section 1).
- **Reward:** 300 xp, the item `telstenen` (quest item, kept to chapter 7).
- **Lines:** Vranckx: "Wie een dag noemt waarop hij komt innen, komt niet onderhandelen." / Thijs: "Een dief
  kondigt zich niet aan, een schuldeiser doet dat wel. Ik weet welke van de twee ik liever aan de deur heb."

### M6. `lv_onder`: Onder Sint-Pieter (chapter boss)
- **Giver:** Gooris, at night, at the tower stair. The knocking has become regular. It is counting.
- **What lies there (from the story, with one recorded name):** under the choir is the crypt of the older
  church, filled in when the Gothic church was built (check: Romanesque crypt, rediscovered in the twentieth
  century). In it sits the water's bailiff for Leuven, **De Nekker onder Sint-Pieter**. The nekker is the
  water spirit of Brabant and Flanders that pulls people under (recorded widely; Nekkerspoel at Mechelen is
  named for one; a Leuven nekker is invented and the Kroniek says so). He has been taking the ground from
  under the towers, a cartload a year, since the first stone. He is not angry. He is foreclosing.
- **Do:** `reach` the crypt `onFoot`. `kill` camp `lv_crypte` (new enemy `verdronkene`, 6, level 8; 3
  `dwaallicht`). `kill` enemy `nekker`, count 1. Then `flag lv_toren_gered`, set by the air phase.
- **The fight:**
  1. *The crypt, on foot.* Water to the knee. He is slow, long-armed, half under. Tells: the water draws back
     from the walls before his sweep; bubbles rise in a line before he pulls. The smaller bells of the church
     still ring the quarters: on every stroke the water drops for six seconds and he is stunned in the open.
     The player learns with his hands that a bell holds him.
  2. *The count.* He begins to knock on the vault, and each knock raises the water one step. Gooris rings by
     hand above; the drowned climb the stair to stop him. The hero chooses, stroke by stroke, between hitting
     the Nekker and defending the ringer. If Gooris falls, the water reaches the chest and dodging costs double.
  3. *The stump, from the dragon.* He goes up through the failed foundation and climbs the north stump to pull
     it down on the Grote Markt. Fought in the air around the towers: burn the arms of water and root that
     hold the stone, dive under the falling blocks (tell: dust before each fall). If the report stayed in the
     chest (M3), the twelve houses are full and each has a health bar.
- **He does not die.** At the end he lets go and sinks, and the hole closes over him. Whether he sleeps is M7.
- **Drops:** gear `nekkerhaak` (a boat hook that pulls enemies in), the dragon mark "Dijleslik" (a grey-green
  stain along the flank), 600 xp.
- **Lines:** Gooris: "Hij klopt twaalf keer en dan wacht hij. Ik heb dertig jaar hetzelfde gedaan aan de
  andere kant van die vloer." / Josine, afterwards: "Je hebt hem geslagen in zijn eigen kelder. Hij was daar
  eerder dan de kerk. Vergeet dat niet als ze je straks bedanken."

### M7. `lv_klok`: De klok van Leuven (the bell decision)
- **Giver:** the chapter and the magistrate together, in the Stadhuis, for the first time in three weeks.
  The frame can be set straight now that the ground is still. Everyone turns to the one who went down.
- **Do:** `talk` to Vranckx, De Coninck, Josine and Thijs (each makes a case, section 6). Then `reach` the
  bell chamber and choose at the bell (`flag lv_klok_besluit`).
- **Ring:** the frame is wedged and Gooris rings twelve. The Nekker sleeps, the cellars dry, the marks stop
  sinking. Kerk +10, Gilden +6, Oude Volk −8. The dragon's eyes fall shut for one long breath on the Grote
  Markt, and afterwards he no longer hears the old things hum: the tracker that led the hero here is gone
  for good (proposal; tune with the ledger). Ledger: Leuven rings.
- **Leave it silent:** the hero takes the wedges out. The dragon stays whole. Oude Volk +10, Kerk −8, Gilden
  −4. The water advances one step: the lowest court of the Groot Begijnhof and the brewers' cellars on the
  Dijle stand under water each night, Zuster Lysbeth moves uphill, and the Nekker returns as a harder weekly
  fight. De Coninck buys the bell as scrap if the hero allows it (Kroon +6; it is seen again in Mechelen) or
  it hangs dumb in the tower (Kroon −4). Ledger: Leuven silent, either way.
- **After either:** Neelke's tally appears on the quay post where she stood. The road to Mechelen opens when
  chapter 2 is also done. Reward: 500 xp, 60 florins, renown Leuven by outcome.
- **Lines:** Vranckx: "Luid ze. Wat het je kost, weet ik niet. Wat het ons kost als je het niet doet, staat
  in mijn boek." / De Coninck: "Ik vraag je niets wat de wet me niet geeft. Vraag eens aan de kanunnik of hij
  hetzelfde kan zeggen." / Josine: "Elke stad die je in slaap luidt, slaapt een beetje van hem mee in."

## 4. Side quests

### Three worked out

**S1. `lv_toga`: De toga en de nachtwacht** (student life; Leuven)
- **Giver:** Thijs, in the courtyard of De Valk, the morning after.
- **Setting (real, check the detail):** a student of Leuven stood under the rector's court and not the city's.
  The night watch has locked up Thijs's friend **Sander Rutten** for singing under the Begijnhof wall and for
  a broken lantern. The mayor wants him fined in the Stadhuis; the pedel wants him out before noon.
- **Do:** `talk` to Sander through the grating of the city lock-up. `collect` 1 `matrikelbewijs` (his proof of
  enrolment) from his room, which his landlady holds against the rent. `talk` to pedel Huybrecht Smets.
- **Choice:**
  - *Hand him to the rector:* he gets three days on bread in the university's own cell and a Latin speech.
    Vrije Lieden +2; the night watch stops greeting the hero (Gilden −2).
  - *Let the mayor fine him:* 4 florins the hero may pay or not. Gilden +3. Sander's father hears of it.
  - *Pay the landlady and the lantern yourself (8 florins):* nobody is fined and everybody is content, which
    in Leuven is the suspicious outcome. Opens short quest 2.
- **Reward:** 90 xp, gear `studentenmuts`.
- **Lines:** Sander: "Ik zong niet vals. Dat wil ik in het verslag hebben." / Smets: "De burgemeester mag
  hem hebben zodra de burgemeester Latijn spreekt." / Landlady: "Hij betaalt in beloften. Ik kan daar geen
  brood mee kopen."

**S2. `tn_klokken`: Wat er van Tienen over is** (Tienen)
- **Giver:** **Janneke Wellens**, widow, at the Onze-Lieve-Vrouw-ten-Poelkerk on the Grote Markt of Tienen.
- **History to use:** in June 1635 a French and Dutch army took Tienen and burned and plundered it; the sack
  was notorious across Europe (check dates and extent). Invented: the bells of Sint-Germanus melted in that
  fire and were never recast. Tienen has lived fifteen years on a single small bell and shows what a town
  looks like when its count runs thin: the pool the church is named for (check: "ten Poel") has come back.
- **Do:** `talk` to Janneke. `collect` 3 `klokspijs` (lumps of bell metal) from the burnt quarter. `kill`
  camp `tn_poel` (5 `verdronkene`, 2 `dwaallicht`) at the pool behind the church, at night. `talk` to the
  dean of Sint-Germanus.
- **Choice:** the metal is enough for one small bell or for Janneke's roof and three others.
  - *To the dean, for a bell:* Kerk +4; the pool stops rising; Janneke winters under canvas.
  - *To Janneke, to sell:* Gilden +2, four roofs. She sells to the only buyer who pays cash, and he is a clerk
    of the artillery. The pool keeps its edge on the market square.
- **Reward:** 150 xp, 20 florins. Neelke's tally is on the church door either way, and it is fifteen years old.
- **Lines:** Janneke: "Ze hebben drie dagen gebrand en geroofd. De klokken zijn als kaarsvet van de toren
  gelopen. Ik was negen." / Dean: "Tienen heeft nog één klok voor de hele stad. Ze slaat de uren, maar je hoort dat ze moe is."

**S3. `as_molen`: De molen die achteruit draait** (Aarschot)
- **Giver:** **Merten Geens**, miller at 's Hertogenmolens on the Demer (check: the ducal mills, sixteenth
  century) in Aarschot.
- **Do:** `talk` to Merten. `reach` the mill sluice `onFoot` at night and see the wheel turn against the
  stream (`flag as_rad_gezien`). `kill` 4 `broekhond` on the Demer bank. `collect` 1 `sluissteen` from under
  the wheel: it carries a tally.
- **What it is:** the same thing the Dijle did for Margriet. Something not owed is being carried back upstream
  toward Diest. If M4 is done the hero understands it; if not, this quest plants it.
- **Choice:** open the sluice and let it pass (Merten loses a week's milling, Oude Volk +3, and in Diest the
  mute boy has a second stone row next morning) or keep the sluice shut for the grain (Gilden +3, Merten pays
  12 florins; the wheel breaks a week later anyway).
- **Reward:** 140 xp.
- **Lines:** Merten: "Water loopt naar beneden. Dat is het enige waar een molenaar op moet kunnen rekenen." /
  Merten: "De toren hier is van dezelfde bruine steen als die van Diest. Ze zeggen dat die steen roest als
  het lang regent."

### Seven in two lines each

1. **`lv_varken`: Het Varken is weg** (student life). The carved pig over the gate of the pedagogy Het Varken
   has been stolen by De Valk (check: the four pedagogies De Valk, Het Varken, De Lelie, De Burcht). `collect`
   it from a hayloft and return it, or hang it on the Stadhuis for a bet; either way one college buys the beer.
2. **`lv_dispuut`: Het dispuut** (student life). Sander must defend in public that water has a memory, and
   has not read a page. `collect` three arguments from Fromondus, Mayken and Josine; he wins on the worst one.
3. **`lv_berg`: De toga in pand** (student life). Thijs's gown lies at the Berg van Barmhartigheid (check: the
   Leuven pawn house and its date). Redeem it for 6 florins, or `talk` the pawn clerk down with his own ledger.
4. **`lv_boeken`: Boeken per pond.** Marieke carries copies of a book printed in Leuven in 1640 and forbidden
   since (check: Jansenius's Augustinus, printer Zegers, the bull In eminenti). Deliver three, to a canon, a
   Jesuit and a brewer. Kerk −2 or Vrije Lieden +4, depending on whom the hero tells.
5. **`lv_peeterman`: Zuur bier.** The brewers on the Dijle say the water has turned since the bell stopped
   (check: Leuven brewing about 1650; the beer name Peeterman). `collect` 4 water samples upstream; the cause
   is in the cellars of M3, and the brewers pay better than the chapter.
6. **`lv_jezuieten`: De put van de paters.** The Jesuits are digging the foundation of a new church in the
   Naamsestraat (check: Sint-Michiel, begun 1650) and the trench fills every night. `kill` 6 `dwaallicht`;
   the lay brother asks the hero not to say what else was in the trench.
7. **`lv_tiensebaan`: De Tiensebaan** (contract). Paid-off soldiers hold the road between Leuven and Tienen
   and tax every cart (check: disbanded troops after 1648; Lorraine troops in Brabant about 1650). `kill`
   camp `lv_baan` (4 `deserteur`, 2 `musketier`, elite "Sergeant Zonder Soldij"). 40 florins from the voerlui.

## 5. Neelke and the dragon

**Neelke.** During M5, on the way from the chapter room to De Valk, the path crosses the Dijle at dusk. On the
far quay a small girl sits with her feet over the edge. Three flat boats come down toward Mechelen (check:
what traffic the Dijle carried below Leuven in 1650; the canal to Mechelen is a century later and must not be
shown). She moves her lips at each one. The hero knows the back of her head. There is no bridge within two
hundred metres, the dragon will not come down to the water, and when the hero reaches the far quay there is a
wet place on the stone and a tally cut in the mooring post: three times five and a bar, and three strokes.
Eighteen. There were three boats. She is not counting boats. No line is spoken; the journal says: "Ze zat daar
zoals ze thuis op de dorpel zat. Ze heeft niet opgekeken. Ze was aan het tellen, en ik weet niet wat." Zuster
Lysbeth's bread is on the wall behind. The eighteen is paid off in chapter 4, when Neelke asks how many bells
he has rung (proposal: eighteen is the number of Brabant towers already silent).

**The dragon.** In Leuven the smaller bells still ring and he is slow and heavy-lidded in the streets. But he
goes to the north tower stump without being steered, turns once and lies down, and the flat top fits him the
way a hearth fits a dog. In M3 Peeter shows the hero grooves in the oldest course of stone, under the mortar:
four, side by side, each as long as a man's arm. During the reading in M2 the first page of the register has
a line above the first bell, with a mark where the name should be and the word *custos* struck through
(invented). The dragon never reacts to the book. On the night of M6 he will not leave the Grote Markt and
lies with his head flat on the cobbles over the crypt, listening. After M7: if the bell rings, his eyes fall
shut for one breath and he does not turn his head any more when the oak figure hums. If it stays silent, he
walks down to the Dijle for the first time and drinks, and the water draws back from his mouth.

## 6. What the six factions want here

- **De Kerk** (the chapter of Sint-Pieter, the beguines, the Jesuits): the bell rung, the register kept shut,
  and the date of the stones read as a call to prayer. Pays with standing and with Vranckx's help in chapter
  4. Costs the hero the dragon's hearing and the truth told plainly.
- **De Gilden** (the magistrate, the brewers, the masons): the bell rung at the chapter's expense, the cellars
  dry, work on the stumps. They want the mason's report buried or published depending on who holds the
  contract. They pay in florins and with a fighter for the world boss.
- **De Kroon** (the artillery, through De Coninck): the silent bell as bronze, the list of towers, and no
  talk of loans, since a king does not hold his land on loan from a river. Legally correct at every step.
- **Oranje** (the baron of Diest holds no land here): news. The drossaard wants to know by letter what the
  register says about Diest's own line and who wrote "zeven van de twaalf", and pays for a copy before the
  canon or the clerk has one. Giving it makes Diest's seven strokes known in The Hague.
- **De Vrije Lieden** (Marieke, the Dijle boatmen, the students in debt): the register copied and sold by the
  page, forbidden books moved, the road to Tienen open. They do not care which way the bell goes as long as
  they hear first.
- **Het Oude Volk** (Josine on the Keizersberg): the bell left crooked and the stump left to the dragon. They
  did not warn the town about the Nekker: he is no friend of theirs, and neither are the bells. This is the
  chapter where the hero learns they will let people drown to keep a guardian awake.

## 7. Kroniek pages this chapter adds

| Page | Label | Content in one line |
|---|---|---|
| De Universiteit van Leuven | geschiedenis | Founded 1425; students stand under the rector's court (check) |
| De vier pedagogieën | geschiedenis | De Valk, Het Varken, De Lelie, De Burcht (check) |
| De torens van Sint-Pieter | geschiedenis | Three towers planned, never finished; the stone model (check) |
| Het beleg van 1635 en de brand van Tienen | geschiedenis | French and Dutch before Leuven; Tienen sacked (check) |
| Fromondus | geschiedenis | Libert Froidmont, professor, wrote on weather and comets (check) |
| De Augustinus | geschiedenis | The book of 1640 that split the university (check) |
| Het Stadhuis van Leuven | geschiedenis | Built in the fifteenth century by Mathijs de Layens (check) |
| 's Hertogenmolens in Aarschot | geschiedenis | The ducal watermills on the Demer (check) |
| Allerheiligenvloed | geschiedenis | The flood of 1 November 1570 (check) |
| Fiere Margriet | volksverhaal | Killed 1225, carried upstream in light; recorded by Caesarius (check) |
| De nekker | volksverhaal | The water spirit of Brabant and Flanders that pulls you under (check sources) |
| Het Klokkenboek van Sint-Pieter | verzonnen | The register with *debet*, *solvit* and *reddita* |
| De lening | verzonnen | The land is a loan; the bells count its hours |
| De Nekker onder Sint-Pieter | verzonnen | That a nekker sits in the old crypt and eats the foundations |
| De stenen van de stomme jongen | verzonnen | The tally notation and the date |
| De gesmolten klokken van Tienen | verzonnen | That the bells melted in 1635 and were not recast |
| Custos | verzonnen | The struck-through line above the first bell |

## 8. Facts to verify

1. Sint-Pieter's west towers: designer and date (Joost Metsys, 1507?), intended height, when and why work
   stopped, which collapses and when, whether the ground or the money failed, and the stone model in the church.
2. The Romanesque crypt under the choir: was it filled in during the fifteenth century, and unknown in 1650?
3. Fiere Margriet: year 1225, the inn, the robbers, floating upstream, the light, Caesarius of Heisterbach as
   the source, and what chapel or shrine she had at Sint-Pieter in 1650. Whether fish belong to the legend.
4. Who owned and paid for the tower bells of Sint-Pieter in 1650: chapter or city. Whether there was a
   carillon and an hour bell, and their names.
5. Fromondus in 1650: alive and in Leuven, his office (dean of Sint-Pieter?), his Meteorologica (1627).
6. The Augustinus quarrel in 1650: what was forbidden, and what a canon risked by owning the book.
7. The pedagogies and their sites; De Valk on the Tiensestraat; the Universiteitshal in the old cloth hall;
   the rector's jurisdiction over students and the university's own cell; the "primus" custom.
8. The siege of Leuven (1635) and the sack of Tienen (June 1635): dates, armies, damage to Tienen's churches
   and bells. The name and meaning of Onze-Lieve-Vrouw-ten-Poel.
9. Aarschot: 's Hertogenmolens, the ijzerzandsteen church tower, who held the duchy in 1650 (Arenberg?).
10. The Dijle in 1650: was it navigable between Leuven and Mechelen, and by what boats. No canal before 1750.
11. The nekker in Brabant folklore: collectors and places (Nekkerspoel, Mechelen); anything recorded for Leuven.
12. The Allerheiligenvloed of 1 November 1570 and its effect on Saeftinghe.
13. Keizersberg: the state of the ducal castle in 1650. The use of the Tafelrond. The Vismarkt on the Dijle.
14. The Jesuit church of Sint-Michiel: begun in 1650? The Leuven Berg van Barmhartigheid. Peeterman beer.
15. Names: Minten, Bosmans, Haeck, Smets, Rutten, Wellens and Geens are in `history-check.md`; Vranckx, van
    Dormael and de Coninck are not and need a look in the register.
16. Whether a canon says "je" under voice.md rule 1 (only the drossaard and the proost say "u"); the sample
    lines assume he does.

## Open points for whoever builds this

- New enemy types needed: `verdronkene` (human body, slow, grabs) and `nekker` (boss, three phases).
- The reading that the water returned Margriet because she was not owed is this file's answer to the question
  `story.md` leaves open. It must be approved before M4 is written.
- The date of the stones (Allerheiligen) fixes the day of the flood in chapter 7. Approve it with chapter 7.
- What the dragon loses if Leuven rings (his hearing of the hum) is a proposal for the ledger.
- A world boss for this region is not chosen here.

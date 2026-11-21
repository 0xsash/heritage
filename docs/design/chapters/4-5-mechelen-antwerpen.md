# Chapters 4 and 5: Mechelen and Antwerpen

Design file for the two chapters in which the hero finds the man who takes the bells, and then has to decide
what to do with what he made. Follows `docs/design/story.md` (the law) and `docs/design/voice.md`. Everything
marked (check) has not been verified. Everything marked (invented) is ours and the Kroniek must say so.

Objective kinds used are the five in `src/rpg/types.ts`: `talk`, `reach` (with `minY` for flying, `onFoot` for
walking), `kill` (by `enemy` or `camp`), `collect`, `flag`. Choices are dialogue `Choice`s that `set` a flag.
Where a design needs something the engine does not have yet, it is listed under "Engine needs" per chapter.

**Lenaert, in one paragraph, for every writer.** Meester Lenaert van Casuwele (surname invented; Casuwele is one
of the villages lost with Saeftinghe (check)). About fifty. Master founder of the king's guns at Mechelen. His
grandfather's village went under in 1584 when the dikes were cut in the war for Antwerp (check: who cut which
dike); the family story is that the bell rang until the water stood in the sound holes, and nobody came. He is
never rude, never raises his voice, offers a chair, pays his workmen on the day, and keeps receipts for
everything. He says "je". He does not lie to the hero once in two chapters. He is wrong about one thing only:
he thinks he is using the water.

---

# CHAPTER 4: MECHELEN, WITH LIER (level 10 to 15)

## 1. The chapter in ten lines

1. The bell wagons from Loon and the registers from Leuven both end at one gate: the Brusselpoort of Mechelen.
2. The dragon will not cross the walls. For the first time the hero walks into a city alone.
3. Mechelen casts bells for half of Europe and guns for the king, in the same streets, from the same bronze.
4. The foundry is closed to strangers. One of four factions gets the hero in, and each sends a bill.
5. Inside lie the bells of Loon, stacked like turnips, each with its town's name still on it.
6. Lenaert receives the hero, opens his books, and shows that nearly every bell was bought or lawfully claimed.
7. In the same books, in his own hand: one bell entered as "not received", the bell of his drowned village.
8. On the Haverwerf a child is counting barges. Neelke asks the hero how many bells he has rung.
9. In the casting pit the half-melted bells wake as one thing, Het Gietsel, and it rings before it strikes.
10. The hero decides whether Mechelen rings. Meanwhile the great gun has already left by water for Antwerpen.

## 2. The cast

| Who | Wants | Hides |
|---|---|---|
| **Meester Lenaert van Casuwele**, master of the gun foundry | To finish one gun before anyone in Brussels changes his mind | That the gun is not for the king. That he has not slept a whole night since the pit began to ring |
| **Neelke**, the Telster | To know whether her brother or sister counts too | Nothing. She answers every question. Nobody asks the right one |
| **Kanunnik Gielis Schoofs**, of the chapter of Sint-Rombout | The bells of the diocese back in their towers, by court order | That the chapter sold four cracked bells to the foundry itself, in 1647, and was paid |
| **Deken Peeter Verhaeghen**, dean of the founders' craft (check: which guild the founders sat in) | Lenaert out, and the king's orders back with the guild masters | That he has a bid ready to cast the guns himself, from the same bells |
| **Sergeant Wouter Hellemans**, of the foundry guard | Fourteen months of back pay | That he has been paid by Lenaert out of Lenaert's own purse, and is ashamed to like him for it |
| **Truyken Bal**, bargewoman on the Dijle | To keep the night trade in bronze, which feeds eleven people | That half her "scrap" goes north to the Dutch, and that she saw the thing in the pit move |
| **Jaspar**, journeyman founder | To be a master before he is thirty | That he hears the names of towns when the bronze melts, and has started answering |
| **Lysbeth Verbeeck**, founder's widow | The death money for her husband, who was "burnt at the casting" | That he was not burnt. She has the page that says what he was |
| **Hendrik Mertens**, clerk of the artillery (the polite clerk from Diest, chapter 1; align the name) | A list that is complete | That his list of silent towers is longer than the list of towns ever taken in war |
| **Oude Janneke van Nekkerspoel**, washerwoman, of Het Oude Volk | The bronze out of the fire and into the pool, where nobody rings it | That she knows what the Gietsel is, because her people have seen one before |
| **Mayken Smets**, the pedlar (returning) | To sell bell-metal buttons in a city that makes them better | That she followed the hero here on purpose |

## 3. The main line

### M1. De draak wil niet (the dragon refuses)
- **Giver, where:** starts by itself on approach from Leuven or Loon. Mayken Smets waits at the Brusselpoort.
- **Player does:** `reach` the air above the Sint-Romboutstoren (`minY`). At the walls the dragon turns away,
  every time, and sets the hero down in the meadow outside the Brusselpoort. `reach` the gate `onFoot`.
  `talk` to Mayken.
- **Beat:** no dialogue explains it. The dragon lies down facing away from the city and will not look at it.
  He can still be ridden everywhere outside the walls (Lier, the Dijle meadows). Inside, the hero is on foot.
- **Choice:** none. This is the first thing in the game the hero cannot choose.
- **Reward:** 300 xp. Journal entry. Kroniek page "De onvoltooide toren".
- **Lines:**
  - Mayken: "Je draak ligt in de wei met zijn rug naar de stad. Ik heb paarden gekend die dat deden bij een slachthuis."
  - Mayken: "Ruik je het? Dat is geen smidse. In een smidse verbranden ze kolen. Hier verbranden ze klokken."
  - Journal: "Hij heeft mij voor de poort afgezet en is gaan liggen. Ik heb hem geroepen. Hij heeft één oor bewogen."

### M2. Vier deuren (the four ways in)
The foundry stands walled by the Dijle (place it by the old arsenal; exact site (check)). The hero needs one
of four sponsors. All four are offered; the hero's standing decides which are open (tier "Bekende" or better),
and the faction of first loyalty is always open. Taking one closes the other three for this chapter.

| Way | Giver, where | Player does | What it costs |
|---|---|---|---|
| **Gilden: as a journeyman** | Deken Verhaeghen, in the craft's room on the Grote Markt | `collect` 5 clay core samples from the guild's three workshops; `talk` to Jaspar, who takes the hero in as a "knecht for the casting" | The dean wants a report on Lenaert's alloy. Refusing later costs Gilden standing; giving it hands the guild the guns |
| **Kroon: with the guard** | Sergeant Hellemans, at the foundry gate | `kill` the camp of bronze thieves on the Leuvense vaart road (camp, 6 + elite); `talk` to Hellemans, who signs the hero on for a week | The hero wears the king's sash inside. Oranje and Vrije Lieden standing drop, and Truyken stops trading with him |
| **Vrije Lieden: with the bronze** | Truyken Bal, at the Haverwerf at night | `reach` three mooring posts on the Dijle `onFoot` in order; `collect` 4 sacks of scrap; ride her barge through the water gate under a tarpaulin | The barge also carries bronze out. The hero is now a smuggler of the king's metal; the Kroon way and the canon's court case are both spoilt |
| **Kerk: with a writ** | Kanunnik Schoofs, in the choir of Sint-Rombout | `talk` to a councillor's clerk at the Grote Raad; `collect` 3 bell descriptions from the chapter archive; enter by the front door with an inventory order | The writ is public. Lenaert knows the hero is coming and receives him at once (M3 is shorter, M4 is colder), and the gun leaves a day earlier |

- **Het Oude Volk** has no door. Oude Janneke offers something else: a wet washing cloth that keeps the heat
  off (item `natte_doek`, a fire resistance for M6). She asks nothing now. She asks in M7.
- **Oranje** has no door either (Mechelen is the king's). An agent, the cloth buyer "Sinjeur Adriaan", pays 40
  florins for the calibre and length of the gun if the hero brings them out. Taking the money is a flag
  (`ch4_sold_measure`) that returns in Antwerpen.
- **Reward:** 350 xp, +8 with the faction used, −4 with its rival (per `RIVALS`).
- **Lines:**
  - Verhaeghen: "Mijn vader goot klokken voor Keulen. Ik giet deurkloppers. Vraag Meester Lenaert maar eens hoe dat komt."
  - Hellemans: "Veertien maanden soldij staan ze mij schuldig. De gieter betaalt ons uit zijn eigen zak. Daar zou ik kwaad om moeten zijn."
  - Truyken: "Ik vraag niet wat je binnen gaat doen. Vraag jij dan niet wat er onder het zeil ligt."
  - Schoofs: "De wet staat aan onze kant, en de wet zit hier om de hoek. Het duurt alleen negen jaar."

### M3. De klokken van Loon (inside the foundry)
- **Giver:** the sponsor from M2.
- **Player does:** `reach` the bell yard `onFoot`; `collect` 6 rubbings of founders' marks and town names
  (`wrijfsel`) from stacked bells; among them one from Hasselt (chapter 2) and, if Diest's clapper quest was
  done, a clapper tag from Diest. `reach` the casting pit. `flag` `ch4_saw_pit`: the bronze in the pit is not
  cooling. `talk` to Jaspar.
- **Fights:** only on the Vrije Lieden way (guards, `kill` 4 `musketier`) or if the hero draws steel. The
  other ways are walked. Guards are unpaid men; killing them is remembered in M4 and in chapter 5.
- **Choice:** Lysbeth Verbeeck stands at the gate with her page. Take it to Lenaert (he pays her death money
  in full and thanks the hero), take it to the canon (it becomes evidence; Lysbeth gets nothing for years), or
  give it back to her (she sells it to the dean).
- **Reward:** 400 xp, 25 florins, item `wrijfsels`.
- **Lines:**
  - Jaspar: "Op deze staat Hasselt. Op die staat Herk. Als ze smelten, hoor ik de namen nog. Zeg dat tegen niemand."
  - Lysbeth: "Verbrand bij het gieten, schrijven ze. Ik heb hem gewassen. Er was niets aan hem verbrand."
  - Journal: "Ze liggen op hun kant in het gras, mond aan mond. Iemand heeft ze genummerd met krijt."

### M4. De rekeningboeken (the account books)
- **Giver, where:** Lenaert, in his counting room above the pit. He sends for the hero; he has known for days.
- **Player does:** `talk` to Lenaert (long conversation, the centre of the chapter). `flag` objectives for
  each ledger the player opens: `boek_gekocht` (bells bought from chapters and towns that needed money),
  `boek_opgeeist` (bells claimed under the right of the artillery after a town was taken (check: klokkenrecht,
  and that towns could buy their bells back)), `boek_niet_ontvangen` (one line: "Casuwele, 1584, één klok, niet
  ontvangen"). The rubbings from M3 let the player check entries: every one is in the book, with a receipt.
- **What the player learns:** he is not lying. Chapters sold bells. Hasselt's magistrate sold its own (check
  against chapter 2). The claims are signed in Brussels. What the law does not cover: the towns were never
  taken. The clappers went missing first, the bells were entered as "scrap, mute", and scrap needs no siege.
  Lenaert did not send the Kludde. He bought what came on the market, and he noticed, and he went on buying.
- **Choice:**
  - **Take the page of Casuwele** (item `blad_casuwele`): opens the truest conversation with him in chapter 5
    and one of his ends. He lets the hero take it. Kroon −5 (it is the king's ledger).
  - **Copy the totals for the canon:** Kerk +8, the court case gets real. The chapter's own sale of 1647 is in
    the copy. Schoofs asks the hero to leave that line out (a second, smaller choice).
  - **Accept his offer:** he offers the hero a post, honestly meant: "someone who has seen what wakes". Kroon
    +8, and the hero is inside the foundry when the gun leaves. Het Oude Volk −6.
- **Reward:** 500 xp, the Kroniek pages "Het recht op de klokken" and "Casuwele".
- **Lines:**
  - Lenaert: "Ga zitten. Je hebt drie dagen rond mijn muren gelopen, je zal moe zijn."
  - Lenaert: "Elke klok in dit boek is gekocht of wettig opgeëist. De kwitanties liggen erbij. Lees ze gerust, ik heb tijd."
  - Lenaert: "De klok van Casuwele heeft geluid tot het water in de galmgaten stond. Mijn grootvader heeft het gehoord vanop de dijk. Er is niemand gekomen."
  - Lenaert: "Een klok vraagt iets aan God. Een kanon wacht niet op het antwoord."
  - Lenaert: "Je mag mij een dief noemen. Zeg er dan wel bij op welke bladzijde het staat."

### M5. Hoeveel heb jij er geluid? (first talk with Neelke)
- **Where:** the Haverwerf at dusk, after M4. No giver; the tallies lead there: five strokes and a bar on each
  mooring post, in chalk still wet (`reach` 3 posts `onFoot`, the same posts Truyken's way used).
- **Player does:** `talk` to Neelke. She sits on the quay with her feet over the water, counting barges. She
  is dry. She knows the hero and is pleased to see him, the way a child is pleased, and does not come closer.
- **The talk:** she asks how many bells the hero has rung. The game knows the answer (the ledger) and offers
  the true number and a lie. She has the true number either way. She says the water is not angry. She says
  she is not cold. She does not say come home, and she does not say she cannot.
- **Choice:** tell the truth (`ch4_neelke_truth`: she gives the hero one of her chalks, item `krijt_van_neelke`,
  which shows the ledger total on the map from now on); lie (she corrects the sum, gently, and the next
  tallies in every town are drawn before the hero decides, not after); reach for her (she is not there; the
  quay is wet where she sat).
- **Reward:** 300 xp. No florins. The scene must not pay.
- **Lines:**
  - Neelke: "Je loopt nog altijd te rap. Ik heb je zien komen van aan de brug."
  - Neelke: "Hoeveel klokken heb jij al geluid? Ik weet het wel. Ik wil weten of jij het ook telt."
  - Neelke: "Het water is niet kwaad op jou. Het is op niemand kwaad. Het houdt alleen bij wat er nog moet komen."
  - Neelke: "Zeg tegen moeder dat ik mijn schoenen nog heb."

### M6. Het Gietsel (chapter boss)
- **Trigger:** the night after M5 the foundry bell does not ring, because something in the pit is ringing
  instead. Giver: whoever the M2 sponsor was; Lenaert himself opens the gate. He asks for help. He means it.
- **Player does:** `reach` the casting pit `onFoot`; `kill` Het Gietsel; `reach` the Dijle quay behind it.
- **What it is (invented):** forty bells of Loon, poured too soon, fused mouth to mouth. Bells that were
  silenced without being unmade. It does not know it is one thing. Het Oude Volk have a word for it; Janneke
  will not say it indoors.
- **The fight, three phases:**
  1. **De kuil.** On foot in the pit, glowing floor at the edges (standing in it burns; `natte_doek` halves
     it). The Gietsel rings before every heavy attack, and the number of strokes is the tell: one stroke is a
     slam where it stands, two is a charge in a line, three is a ring of sound that must be dodged through.
     The player learns to count. Weak points are the bells that still have a name on them; hitting one makes
     it ring true and staggers the whole.
  2. **De namen.** At half health it calls. Small bells break off and roll at the hero (adds: `klokske`, new
     enemy on the `wisp` body, 6 at a time). Jaspar, on the gallery, shouts the town whose bell will strike
     next; that bell glows. If the hero took the guild way, Jaspar is in the pit and must be kept alive.
  3. **De kaai.** It breaks the water gate and drags itself toward the Dijle to cool. `reach` the quay. The
     dragon does not land. He comes once, low over the river, and the player may spend that one pass: fire on
     the Gietsel while it stands in the water (it cracks: the kill) or hold the fire and finish it on foot
     (harder, and the bronze stays whole for M7).
- **Lenaert in the fight:** he works the crane and drops the casting ladle on it twice on a timer. He does not
  flee. A workman dies if the fight runs long; Lenaert carries him out himself.
- **Drops:** named gear **De Klepel van Herk** (mace; its hits ring, a short stun on every third blow). Dragon
  mark **Roetvleugel** (soot on the wing edge). If the dragon cracked it: 60 florins of scrap and no whole
  bronze. If not: item `brons_van_loon`.
- **Lines:**
  - Lenaert: "Ik heb het niet gemaakt. Ik heb het wel laten liggen. Dat is erg genoeg."
  - Jaspar: "Twee slagen, dan komt het recht op je af. Tel mee, tel in godsnaam mee."
  - Journal: "Het luidde voor het sloeg. Eén, twee. Ik heb leren tellen zoals Neelke, en ik weet nu waarom ze het deed."

### M7. De klokken van Sint-Rombout (the bell decision)
- **Why Mechelen is silent:** since the pit began to ring, the bells of Sint-Rombout crack when they are swung
  (they answer it). The ringers have refused the ropes for a month. The count in Mechelen has stopped.
- **Giver, where:** Kanunnik Schoofs under the tower; Oude Janneke at the pool of Nekkerspoel; Deken Verhaeghen
  in between with an offer for the bronze.
- **Player does:** `talk` to all three; `reach` the ringing floor of the tower `onFoot` (the long stair is the
  scene); `flag` `bell_mechelen` = `ring` or `silent`.
- **Choice and price:**
  - **Ring.** The hero pulls the first rope himself. Mechelen is safe from what woke. Kerk +10, Gilden +6.
    Outside the walls the dragon loses a little for good (propose: fire range −5%). The bronze of Loon, if
    whole, is recast for Mechelen, so Hasselt and Herk never get their own bells back; Loon characters say so
    in later chapters.
  - **Silent.** The bronze goes into the pool at Nekkerspoel (Janneke collects her debt) or back east on
    carts as dead metal. Oude Volk +10, Kerk −8. The Dijle stands one step higher on the Haverwerf for the
    rest of the game, the world boss of the region stays, the night roads to Lier are harder and pay more.
  - **Sell it to the dean** (only with `brons_van_loon`): 300 florins, Gilden +10. Either bell choice still
    has to be made, with nothing to cast. The dean casts guns.
- **After either:** a tally on the tower door. Hellemans brings word that the gun went down the Dijle and the
  Rupel three nights ago, on two barges lashed together, and that Lenaert followed it this morning with the
  guard, the powder and the pay chest. He left the hero a receipt for the help in the pit, made out correctly.
- **Reward:** 700 xp, 60 florins, renown per choice, lead to Antwerpen.
- **Lines:**
  - Schoofs: "U vraagt wat het kost. Ik weet het niet. Ik weet alleen wat het kost als ze zwijgen." (Schoofs
    is clergy of rank; if only the proost and drossaard may say "u", change to "je".)
  - Janneke: "Leg het in de poel. Daar heeft het nooit iemand wakker gehouden en nooit iemand in slaap gedaan."
  - Lenaert's note: "Ontvangen van de drager: hulp bij het blussen van een gietsel. Niet betaald. Ik blijf het schuldig."

**Engine needs (chapter 4):** a no-landing volume over Mechelen with a turn-away animation; a scripted single
dragon pass usable once in a boss fight; a boss tell driven by a counted sound; ground hazard zones; an
escort-style "keep this NPC alive" condition (can be a `flag` set by code); the ledger total readable in
dialogue conditions.

## 4. Side quests

**Worked out: S1. De schapenkoppen van Lier.** Giver: brewer Gommaar Peeters on the Grote Markt of Lier. Lier
is said to have chosen a cattle market over a university when the duke offered the choice, and to have been
called sheep heads ever since (volksverhaal (check): date 1425, Duke Jan IV, and where recorded). The market
right is the town's pride and something is killing the sheep on the Nete meadows at night. `reach` the meadow
by dragon (`minY`), `kill` 5 `broekhond` at the fold, then `collect` 3 ear tags: the sheep were not eaten, they
were counted and drowned in a row. Choice: tell Lier the truth (the market empties, Gilden −3, Oude Volk +4)
or say "wolves" (the market holds, 40 florins, and the next flock is lost in chapter 5 news). Lines: Gommaar:
"Ze lachen met ons omdat wij schapen kozen. Van een schaap heb ik nog nooit honger gehad." Shepherd: "Ze lagen
op een rij, van klein naar groot. Welk beest doet zoiets?"

**Worked out: S2. De vuile bruidegom.** Giver: Truyken's nephew Jooris, on the Grote Markt. The guilds carry a
wooden doll in the procession and toss him in a sheet; in 1650 he is called the "Vuile Bruidegom" or "Sotscop",
not yet Opsinjoorke (check: made 1647; the Opsinjoorke name is from 1775 and must not be used). The doll is
gone. `talk` to three witnesses, `collect` 4 scraps of the sheet across the roofs of the Befferstraat,
`flag` find him: Jaspar has him in the foundry loft, because the doll does not answer when he talks to it, and
that is restful. Choice: give the doll back (Gilden +5, Jaspar is laughed at and stops helping in M6 phase 2)
or leave it until after the casting (the procession walks without him; the town calls it a bad sign and it
is). Lines: Jooris: "Hij is van hout en hij is drie jaar oud en de helft van de stad kent hem beter dan de
bisschop." Jaspar: "Hij zegt niets terug. Je weet niet hoe schoon dat is."

**Two lines each:**
- **S3. Negen jaar.** A widow from Zichem has waited nine years for a ruling of the Grote Raad (the high court
  really sat in Mechelen (check: seat in 1650)). Carry her file past three clerks, each of whom wants a fee, or pay a Vrije Lieden forger for a ruling that looks real.
- **S4. De Kludde van Zemst.** Kludde stories are recorded at Zemst and Weerde, just south of the city
  (history-check S31). A ferryman is being ridden at night. Hunt it from the air; it is small, and it is running from something upstream.
- **S5. Het proefstuk.** Jaspar's master piece is a bell. No one in Mechelen will buy a bell this year. Find him a tower in Lier, or bronze for a gun instead; the second makes him a master sooner.
- **S6. Kantwerk.** A lace maker in the Groot Begijnhof (check: Mechelen lace as a named trade by 1650) is paid in bell-metal tokens by the foundry shop. Get her silver, or teach the beguines to refuse the tokens and close the shop that feeds forty families.

## 5. What each faction wants in Mechelen

- **Gilden:** the gun contracts back from a royal master to the craft. They would melt the same bells.
- **Kerk:** the bells back by law, slowly, and the sale of 1647 forgotten.
- **Kroon:** the guns, and quiet. Brussels signed for bells "of taken towns" and has not counted which.
- **Oranje:** the measure of the gun. A buyer of cloth pays for numbers.
- **Vrije Lieden:** the night trade in bronze to stay a night trade. Law in either direction ruins them.
- **Het Oude Volk:** the bronze unmade, neither bell nor gun. They are the only ones who are afraid of the pit.

## 6. Kroniek pages (Mechelen)

| Page | Label | Content in one line |
|---|---|---|
| De onvoltooide toren | geschiedenis | Sint-Rombout's tower was begun in 1452 and stopped near 97 metres; it was meant to go far higher (check: figures) |
| De klokkengieters van Mechelen | geschiedenis | Families such as Waghevens and Van den Ghein cast bells here for all of Europe (check: who was active in 1650) |
| De geschutgieterij | geschiedenis | Guns were cast in Mechelen for the emperor and the king from the days of Hans Poppenruyter (check: status in 1650) |
| Het recht op de klokken | geschiedenis | The master of the artillery could claim the bells of a town taken by force; towns bought them back (check) |
| De Grote Raad | geschiedenis | The highest court of the king's Netherlands sat in Mechelen (check) |
| De schapenkoppen | volksverhaal | Lier, the cattle market and the university (check: where recorded) |
| De vuile bruidegom | geschiedenis / volksverhaal | The procession doll and its tossing (check) |
| Nekkerspoel | volksverhaal | The quarter is named for the nekker, the water spirit of its pool (check: etymology) |
| Casuwele | geschiedenis for the village, verzonnen for the family | A village of the land of Saeftinghe, lost to the water (check); Lenaert's family is ours |
| Het Gietsel | verzonnen | Ours. The Kroniek says so in its first sentence |

## 7. Facts to verify (Mechelen)

1. The royal gun foundry: where it stood, whether it was casting in 1650, who was master (our Lenaert replaces him).
2. Bell founders active in Mechelen in 1650 (Van den Ghein line; Waghevens had died out by then (check)).
3. Klokkenrecht: the legal form in the Spanish Netherlands, who held it, redemption by towns.
4. Which craft guild the founders belonged to in Mechelen.
5. Sint-Romboutstoren dates and heights; which bells hung there in 1650 (the Hemony carillon is later (check: 1679)).
6. **Do not use the Maneblussers:** the story dates from January 1687.
7. Opsinjoorke: date of the doll (1647?), its names before 1775.
8. Grote Raad at Mechelen in 1650; Archbishop Jacobus Boonen as the sitting archbishop.
9. Lier: the sheep-head legend and its source; the Nete meadows; Sint-Gummarus.
10. Nekkerspoel etymology; Casuwele among the villages lost in 1584; who cut the dikes at Saeftinghe.
11. The water route Mechelen to Antwerpen: Dijle, Rupel, Schelde, and whether a heavy gun could travel it.
12. Mechelen lace by 1650; the Haverwerf as a working quay; the Brusselpoort as the gate of that name.

---

# CHAPTER 5: ANTWERPEN AND THE CLOSED SCHELDT (level 15 to 20)

## 1. The chapter in ten lines

1. Antwerpen was the richest port of the north. The quays are still there. The sea ships are not.
2. Since 1585 the Dutch hold the river mouth; the peace of 1648 wrote it down for good (history-check F35).
3. The dragon lands again, on the cathedral tower that was never built. He watches the river, not the city.
4. In the citadel, the Zuidkasteel, lies De Stomme: one gun, cast from the bells of a hundred towers (invented).
5. It points down the river at the Dutch forts of Lillo and Liefkenshoek (check). It has never been fired.
6. Lenaert holds the citadel with soldiers nobody has paid. Antwerpen remembers 1576 and what unpaid soldiers do.
7. The deans of the guilds want it fired: one shot, the river open, the city alive. They are not fools.
8. Its report would open the war again and stop every bell that hears it. Lenaert knows the first. Not the second.
9. The hero takes the citadel on foot and from the air, and Lenaert yields when he hears a bell, not before.
10. Sink De Stomme in the Scheldt or keep it whole. Then Lenaert meets his end, and no faction gives him a good one.

## 2. The cast

| Who | Wants | Hides |
|---|---|---|
| **Meester Lenaert van Casuwele** | One shot at the forts that stand where the dikes were cut | That the gun has been loaded for nine days and he has not been able to give the order |
| **Neelke** | To count the sea ships at the Werf. There are none. She counts them anyway | That she is afraid of the gun, and has been afraid of nothing since the water |
| **Deken Cornelis Wuyts**, dean of the skippers' guild (check: guild and house) | The river open before his sons take service in Amsterdam | That one of them already has |
| **Mayken Bollaert**, widow, runs a "natie" of dock carriers (check: naties in 1650) | Work for ninety men who carry nothing | That she sold the guild silver to feed them; the chest holds stones |
| **Kapitein Jaspar de Wael**, of the citadel garrison | Pay, then orders, in that order | That his men have voted: no pay by Sunday and they take it from the city, as in 1576 |
| **Kanunnik Adriaan Mols**, of Onze-Lieve-Vrouwe | The great bell Carolus (check) never to hear that gun | That the chapter lent the guilds money against the reopening of the river |
| **Sinjeur Adriaan**, cloth buyer, agent of the prince's party (from chapter 4) | The gun fired: his prince wants the war back and Amsterdam does not (check: Willem II in 1650) | That his prince is dying as he speaks (Willem II died 6 November 1650 (check)) |
| **Schipper Thijs Lambrechts**, of the Vrije Lieden | The river to stay shut. Every bale that cannot come by ship comes by him | That he pilots Dutch toll boats when smuggling is slow |
| **Lange Lysbeth**, eel woman of Het Oude Volk, on the mud flats | The gun in the river, mouth down | That part of her people want it fired, to end the bells in one stroke |
| **Raadsheer Peeter van Gorp**, the governor's man from Brussels | Lenaert in irons before Madrid hears of this | That Lenaert's warrant carries a Brussels signature (opens the Brussel chapter) |

## 3. The main line

### A1. De stad met één toren
- **Giver, where:** Mayken Smets, at the Werf below Het Steen. Starts on arrival by air along the Rupel.
- **Player does:** `reach` the unfinished south tower of the cathedral on the dragon (`minY`); he lands there
  by himself, and it is the chapter's landing place. `reach` the Werf `onFoot`. `talk` to Mayken, then to
  Deken Wuyts at the skippers' house.
- **Beat:** Neelke's tallies are on every bollard of the Werf, and each is a bar with no strokes under it.
- **Choice:** none yet. Wuyts invites the hero to the deans' table.
- **Reward:** 400 xp. Kroniek "De gesloten Schelde".
- **Lines:**
  - Mayken: "Kijk naar de kranen. Ze smeren ze nog elke maand. Zeg me voor wie."
  - Wuyts: "Mijn grootvader loste hier specerijen uit Lissabon. Ik los turf uit Mechelen."
  - Journal: "Hij is geland op de toren die er niet staat. Hij kijkt de stroom af en hij knippert niet."

### A2. Wat de dekens willen (the guilds who want it fired)
- **Giver, where:** the deans at table in the skippers' house: Wuyts, Mayken Bollaert, and a dean of the
  Kolveniers, the guild that paid Rubens for the Descent from the Cross (check).
- **Player does:** `talk` to each dean; `collect` 5 pages of sums from the Beurs, the Werf and the Oosters
  Huis (what one open tide is worth); `talk` to Kanunnik Mols, who has the other sum (what a year of war
  costs). Both sums are correct.
- **Their case, written straight:** a whole city lives off a port with no sea. The peace was made in Münster
  by men who do not live here. The gun is loaded and its master is willing. One shot on Lillo and the Dutch
  must talk. They offer to pay the garrison if it is fired.
- **Choice:** promise not to stand in the way (`ch5_guilds` = `with`: Gilden +10, they open a sally port in
  A6, Kerk −5); refuse (`against`: Gilden −8, the deans pay the garrison without the hero and A3 is harder);
  say nothing (they take it for yes, and remember).
- **Reward:** 450 xp, 40 florins.
- **Lines:**
  - Wuyts: "Ze noemen het vrede. Voor ons is het een beleg dat vijfenzestig jaar duurt."
  - Bollaert: "Negentig man heb ik, met sterke ruggen. Ze dragen elkaars kinderen naar het kerkhof. Ander werk is er niet."
  - Mols: "Eén schot, zeggen ze. Ik heb nog nooit een oorlog gezien die bij één schot bleef."

### A3. Soldij (the unpaid garrison)
- **Giver, where:** Kapitein de Wael, at the citadel's town gate. He comes out; nobody goes in.
- **Player does:** `talk` to de Wael, then one of three. Pay: hand over 250 florins of the hero's own, or the
  deans' chest (only if `with`), or Bollaert's chest, which holds stones. Order: `reach` Raadsheer van Gorp
  and bring a royal order (Kroon tier "Gezien"). Force: `kill` the foragers taking "loans" on the road to
  Mechelen (camp: 8 `deserteur`, 3 `musketier`, elite "Vaandrig Sander").
- **Choice and price:** pay, and half the garrison stands aside in A6, and the hero is poor. Bring the order,
  and the garrison splits and fights itself in A6: men die on both sides. Kill the foragers, and the city
  cheers and the citadel shuts its gate for good. The deans' chest binds the hero to the shot. The stones are
  found out in the middle of A6.
- **Reward:** 500 xp, standing per route.
- **Lines:**
  - De Wael: "Mijn mannen hebben in twintig maanden twee keer geld gezien. De gieter heeft zijn eigen zilver laten smelten om brood te kopen. Ze blijven staan voor hem, niet voor de koning."
  - De Wael: "Ik heb ze verteld wat er in 1576 gebeurd is. Ze vroegen hoeveel die mannen eraan verdiend hadden."

### A4. Casuwele (why he does it)
- **Giver, where:** Lenaert, by letter, brought by a drummer under a white flag. He asks the hero to look at
  something before judging him. Lange Lysbeth, at the flats north of the city, knows the place.
- **Player does:** fly down the river: `reach` (`minY`) the Spanish fort line, then Lillo and Liefkenshoek
  (Dutch guns fire at the dragon; a gauntlet, no kill needed), then the edge of the Verdronken Land. `reach`
  a mud bank `onFoot` at low tide. `flag` `ch5_heard_bell`: a bell rings under the water, slowly. `talk` to
  Neelke, on the water side of the bank. Then `talk` to Lenaert on the citadel wall.
- **What the player learns:** the dikes were cut on purpose in 1584, by the defenders of Antwerpen, to stop
  Parma (check). The forts stand on that ground. The bell is still down there and he has heard it too. He
  does not care about the harbour. He wants the answer given. The deans are his excuse, as he is theirs. With
  `blad_casuwele` from chapter 4 the hero can give the page back; he reads it aloud.
- **Neelke's beat:** the gun is the one thing she cannot count, because after it nothing would strike hours.
  She asks the hero to keep it quiet. She is asking as a child. Dragon: over the drowned land he flies lower
  and lower, until his feet trail in the water.
- **Choice:** promise Neelke; promise nobody; or tell Lenaert what the report would do to every bell. He
  believes the hero. It does not change his mind.
- **Reward:** 600 xp.
- **Lines:**
  - Lenaert: "Ze hebben de dijk doorgestoken om een stad te redden die ze daarna toch verloren zijn. Mijn dorp was de prijs. Niemand heeft ons gevraagd of we wilden betalen."
  - Lenaert: "Jij hebt haar horen luiden. Dan weet je dat ze nog altijd om hulp vraagt. Ik ben de enige die antwoordt."
  - Neelke: "Ik kan alles tellen. Dat ding niet. Na dat ding valt er niets meer te tellen."
  - Lysbeth: "Bij laag water kan je de kerk zien. Bij hoog water ziet de kerk jou."

### A5. De lont
- **Giver, where:** with the guilds, Wuyts asks the hero to guard the powder barges. Against them, Mols and
  Thijs Lambrechts ask him to spoil them.
- **Player does:** `reach` three powder barges on the Scheldt by dragon; `kill` their guards or their
  attackers (one camp per barge); `collect` 6 lengths of slow match (`lont`) in the bastion stores `onFoot`.
  How much powder reaches the gun sets how often De Stomme is made ready in A6 (one to three times).
- **Choice:** Sinjeur Adriaan offers 200 florins to let one barge through, whatever side the hero is on. If
  the hero sold him the measure in chapter 4, he already knows the charge, and the offer is a threat.
- **Reward:** 500 xp.
- **Lines:**
  - Thijs: "Als die stroom opengaat, ben ik een voerman zonder werk. Ik zeg het je eerlijk, dan weet je waarom ik help."
  - Adriaan: "Mijn prins wil een oorlog en zijn eigen kooplui willen er geen. Eén schot uit Antwerpen lost dat voor hem op."

### A6. Het Zuidkasteel (boss: De Klokkengieter and De Stomme)
- **Arena:** the five-bastion citadel south of the city (check: bastion names). De Stomme lies on the river
  bastion on a sledge of oak, too heavy for wheels.
- **Three phases:**
  1. **De wallen, on foot.** Enter by the way A2 or A3 opened. `kill` three gun crews on three bastions (new
     enemy `kanonnier`, human body: slow, a cone blast, the tell is the match going to the touch hole). Men
     paid in A3 lay down their arms; killing them anyway is counted. Lenaert calls every order aloud from
     the river bastion, so every volley has a spoken tell.
  2. **De lucht.** The wall guns turn on the dragon. `reach` (`minY`) three powder stores through chain shot
     and burn them. Never cross the line of De Stomme's mouth while it is being made ready (a rising hum; the
     dragon shies by himself): if the count reaches zero with the gun manned, it fires, and the chapter ends
     in the worst way for everybody. Stop it by landing and striking down the man with the linstock.
  3. **Lenaert.** On foot on the river bastion. He fights with a founder's ladle hook and a pistol he fires
     once. He is fifty and no soldier; the danger is the gun behind him. At a third of his health he stops,
     and holds the match over the touch hole. The hero must `reach` him: a walk, not a blow. What stops him
     is not the hero. The bell under the water is heard on the wall, and for the first time he counts the
     strokes. He lowers the match. He yields.
- **Drops:** named gear **De Lontstok van Casuwele** (polearm, fire damage). Dragon mark **Kruitmond**
  (blackened jaw). Kroniek "De Stomme".
- **Lines:**
  - Lenaert: "Derde stuk, richten op de vleugel. Niet op de ruiter. Met de ruiter moet ik nog spreken."
  - Lenaert: "Je vecht voor klokken die jouw draak in slaap gaan doen. Leg mij dat eens uit, als dit voorbij is."
  - Lenaert: "Zeven. Ze slaat er zeven. Waar blijven de andere vijf?"

### A7. Zinken of bewaren (the gun, the bell, and Lenaert's ends)
- **Where:** the river bastion at dawn. Everyone from A2 comes up the wall with a claim.
- **Player does:** `talk` to the claimants; `flag` `stomme` = `sunk` or `whole`; `flag` `bell_antwerpen` =
  `ring` or `silent`; `talk` to Lenaert last.
- **Sink it.** The dragon and ninety carriers tip it off the bastion into the Scheldt, mouth down. Nobody
  will ever fire it. Kerk +8, Oude Volk +6, Vrije Lieden +4, Gilden −12. Bollaert's men do it for a day's
  wage, and it is the last work on that quay. The "Recast" ending is closed for good.
- **Keep it whole.** It stays, loaded, on the wall of a city that wants it fired, under a guard the hero must
  name: guilds, crown or chapter. Gilden +8, Kerk −8. Every later chapter carries news of it, and once it is
  nearly fired. "Recast" stays open. Neelke's tally for Antwerpen is drawn, rubbed out and drawn again.
- **The bell of Antwerpen.** The cathedral bells stopped the night the gun was loaded. **Ring:** the city is
  safe, Lange Wapper leaves the streets, the dragon loses a little more for good. **Silent:** the dragon
  stays whole, Lange Wapper stays as a standing world boss, the water takes the lowest quay of the Werf.
- **Lenaert's ends.** The faction where the hero stands highest claims him; the hero may hand him to another
  at a cost of 10 with the first. None is a triumph:
  - **Kroon:** van Gorp takes him to Brussels in a closed coach, to be judged under the signature that sent
    him. He is locked up at Vilvoorde (check) and the foundry has a new master within the month. He asks the
    hero to see that his workmen get their last week.
  - **Gilden:** the deans hide him in a cellar and set him to cast a second gun. He is now a founder for
    hire, working for men who want a harbour and not an answer. He casts it badly, on purpose, and they know.
  - **Kerk:** penance in the bell house: he is to cast a bell for every tower he emptied. He does it exactly
    and well. He tells the hero each one is a prayer that will not work, and he signs each one.
  - **Oranje:** Adriaan takes him north past Lillo to cast guns for the Republic, whose soldiers cut his
    dike. He goes, because nobody else offers him a furnace. The prince who bought him is dead before he
    arrives.
  - **Vrije Lieden:** Thijs rows him out at night and sets him down where he asks: the mud bank of A4, at low
    water. Nobody sees what he does when the tide turns. In the morning there is a tally on Thijs's boat.
  - **Het Oude Volk:** Lysbeth's people keep him on the flats, alive, to hear the bell under the water at
    every tide until he understands what it says. He asks the hero, courteously, to be given to anyone else.
- **Reward:** 900 xp, 100 florins, the lead to Dendermonde: the Scheldt stands higher than the tide table
  says, and it has not rained.
- **Lines:**
  - Lenaert: "Je hebt gewonnen en ik ben blij dat jij het bent. Begrijp mij niet verkeerd. Ik zou het morgen opnieuw doen."
  - Lenaert: "Geef mij aan wie je wil. Ik vraag één ding: schrijf op wat je met het kanon doet, en zet je naam eronder."
  - Bollaert (sink): "Wij dragen het voor een daghuur de stroom in. Het is het eerste dat hier in jaren vertrekt."

**Engine needs (chapter 5):** guns that fire at a flying player, with tells; a line-of-fire zone with a
countdown; landing and taking off inside a boss fight; a timed walk objective; "highest faction" as a dialogue
condition; news items in later chapters driven by `stomme` = `whole`.

## 4. Side quests

**Worked out: S1. Lange Wapper (world boss, with a quest before it).** Giver: night watchman Merten Geens, at
the Vleeshuis. Lange Wapper is Antwerp folklore: a spirit who makes himself as tall as the houses, looks in at
upper windows, plagues drunks and cheats at cards, and keeps away from images of Our Lady, which is the reason
people give for the Madonnas on the street corners (volksverhaal (check): name the 19th-century source).
`talk` to three people he fooled; `collect` 4 measures of lamp oil and light four corner Madonnas `onFoot`;
he is driven out of the alleys to the Werf, where the calendar fight happens: he grows with each phase and the
last is fought from the dragon at roof height. Choice: the Kerk wants every corner lit for good (he never
returns, and the night trade of the Vrije Lieden dies with him); Thijs wants two alleys left dark. Lines:
Merten: "Hij keek bij mijn zuster binnen op de derde verdieping. Hij stond gewoon op straat." Thijs: "Zonder
Wapper durft de schout 's nachts buiten. Daar heeft niemand iets aan."

**Worked out: S2. De hand in de stroom (world boss Druon Antigoon).** Giver: Mayken Bollaert, at the Werf. The
legend: the giant Antigoon took toll on the Scheldt and cut off the hand of any skipper who would not pay,
until Brabo cut off his and threw it in the river; "hand werpen" is the folk explanation of the city's name
(volksverhaal (check): earliest source). Since the gun was loaded, something on the river takes toll again:
three boats came back with a steersman short of a hand. `reach` three wrecks by dragon; `collect` 3 toll
tokens stamped with a hand; `talk` to Thijs, who has been paying. The giant rises at the river bend on the
calendar and is fought from the air; the weak point is the toll hand. Choice after: throw the hand in the
river as Brabo did (Gilden +8) or give it to Lysbeth (Oude Volk +8). Lines: Bollaert: "Tol aan de Hollanders
bij Lillo, tol aan de koning aan de poort. En nu vraagt het water zelf er ook nog." Thijs: "Hij vroeg een
tiende. De Zeeuwen vragen meer, en die mag ik niet eens een reus noemen."

**Two lines each:**
- **S3. De drukproef.** A printer on the Vrijdagmarkt (check: the Moretus press in 1650) has set a pamphlet calling for the shot. Stop the sheets, let them out, or change one line.
- **S4. Het schilderij van de kolveniers.** The arquebusiers want to pawn their altarpiece to pay the garrison. Find a lender who leaves it hanging, or the buyer who pays most and ships it to Madrid.
- **S5. Brood voor het kasteel.** A baker has fed the citadel on credit for a year. Collect from the soldiers, from the city, or from Lenaert, who pays at once and in full and then cannot pay for powder.
- **S6. De zoon in Amsterdam.** Deken Wuyts's son comes home on a Dutch toll boat, as its clerk. Get him ashore unseen, or let the deans see what an open river would bring back.

## 5. What each faction wants in Antwerpen

- **Gilden:** the shot. One open tide. They will pay for it and they have counted what it is worth.
- **Kerk:** no shot, the bells kept, and its loan to the guilds repaid, which only an open river can do.
- **Kroon:** the peace it signed two years ago, the citadel back, and the Brussels signature never read aloud.
- **Oranje:** the prince's party wants the war back and would let Antwerpen start it; the merchants of
  Holland want the river shut and the peace kept. The agent serves the first and is paid by the second.
- **Vrije Lieden:** the river shut. The closed Scheldt is their living. They are the hero's most honest
  allies here, and they are helping to starve the city.
- **Het Oude Volk:** split for the first time (this plants chapter 6). Most want the gun under water. Some
  want it fired, because one report would end the bells everywhere and wake every guardian at once.

## 6. Kroniek pages (Antwerpen)

| Page | Label | Content in one line |
|---|---|---|
| De gesloten Schelde | geschiedenis | Closed to sea shipping since 1585, confirmed in 1648; trade went on by transshipment and toll (F35) |
| De Spaanse Furie | geschiedenis | In November 1576 unpaid soldiers came out of the citadel and sacked the city (check: figures) |
| Het Zuidkasteel | geschiedenis | Alba's citadel, begun 1567, built to hold the city as much as to guard it (check) |
| De toren die er niet staat | geschiedenis | The north tower of Onze-Lieve-Vrouwe was finished in 1518; the south tower never was (check) |
| Lillo en Liefkenshoek | geschiedenis | The forts below the city stayed in Dutch hands (check) |
| De hand in de stroom | volksverhaal | Brabo and Druon Antigoon |
| Lange Wapper | volksverhaal | The long one of the alleys, and the Madonnas on the corners |
| Het Verdronken Land | geschiedenis | Saeftinghe: flooded in 1570, lost in 1584 when the dikes were cut (check) |
| De klok onder water | volksverhaal (check) | The bell of Saeftinghe is said to ring under water; find the record or relabel verzonnen |
| De Stomme | verzonnen | Ours: no such gun existed. The page names Dulle Griet of Gent as a real great gun |
| Willem II | geschiedenis | The stadtholder who wanted the war back marched on Amsterdam in 1650 and died that November (check) |

## 7. Facts to verify (Antwerpen)

1. What "closed" meant in 1650: transshipment, the Dutch toll at Lillo, who could pass.
2. Lillo and Liefkenshoek Dutch-held in 1650; the Spanish forts facing them.
3. The citadel in 1650: garrison, castellan, bastion names, any record of unpaid troops around 1650.
4. The Spanish Fury: 4 November 1576, mutineers from the citadel; the death toll.
5. Saeftinghe: 1570 flood, 1584 dike cutting, by whom; Casuwele among the lost villages.
6. The bell of Saeftinghe: a recorded source, or relabel as invented.
7. Willem II in 1650: his wish to resume the war, the march on Amsterdam, his death on 6 November.
8. Lange Wapper and Druon Antigoon: earliest written sources; the Madonna explanation.
9. The skippers' guild and its house; the naties in 1650; the Kolveniers and the Rubens altarpiece.
10. Cathedral tower dates; the bell Carolus; the Hemony carillon is later than 1650 and must not appear.
11. Vilvoorde as a state prison; the Oosters Huis; the Moretus press; the population of Antwerpen in 1650.
12. Voice: Schoofs says "u" in one sample; voice.md allows "u" only for the drossaard and the proost. Decide.

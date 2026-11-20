# The voice of Belfort

The owner's brief: the prologue and everything a player reads must pull them in, "written like Tolkien or
George R.R. Martin wrote it": every quest, conversation, street remark and piece of history. And, from an earlier
note: plain present-day Flemish Dutch, "je/jij", no fake-old language.

Those two fit together. What makes Tolkien and Martin grip is not old words. It is depth of time, concrete
detail, people who want things, and a price on everything. All of that works in modern Dutch.

## The rules

1. **Je/jij.** Never gij/ge/uw. Only the drossaard and the proost say "u". No antique word order, no "aldus".
2. **Everything is older than the speaker.** A place has a before: who built it, what stood there, what was lost.
   Give one fact that is older than the person telling it. (Tolkien: the world has a history you only glimpse.)
3. **Concrete, never general.** Name the stone (ijzerzandsteen), the smell (natte klaver, lont, gist), the price
   (drie stuivers), the weather. One exact detail beats three adjectives.
4. **Everyone wants something and nobody says it outright.** People speak from interest: debt, fear, pride, a
   daughter to marry off. A line should tell you what the speaker wants without stating it. (Martin: subtext.)
5. **Everything has a bill.** Help costs, victories leave something broken, the good side has dirty hands and the
   bad side has reasons. No clean heroes, no pure villains. The Kludde took your sister; the bells that would stop
   him would also take your dragon.
6. **Restraint.** Short sentences. One image per paragraph. The worst things happen half-seen or just after you
   look away. Understatement over emphasis. No exclamation marks except when someone shouts.
7. **End on the word that cuts.** Put the sharp word last. Close a paragraph with a short sentence.
8. **Humour belongs to people, not to the narrator.** Dry, local, a little cruel, and never in a dark moment. Keep
   the jokes the game already has; do not explain them.
9. **Plant and pay off.** Early texts carry names and images that return: the seven strokes, the old woman, the
   felled oak, the counting, "wat het water neemt". Do not explain them when they first appear.
10. **No modern idiom, no game-speak inside the fiction.** "Oké", "cool", "missie", "level" never come out of a
    mouth in 1650. Numbers and game words live in the interface only.
11. **History is true or labelled.** Real facts of 1650 stay real. Folklore is told as what people believed.
    Invention is ours and the Kroniek says so.

## Motifs to reuse (sparingly)

- **The water remembers.** This land was won from water. The water has not forgotten.
- **The bells count and hold.** They hold things asleep. They are owed twelve strokes and gave seven.
- **Counting.** Neelke counted everything "so the world could not walk away".
- **The oak.** Felled in 1602 so a church could stand there. Something remembers it.
- **The bill.** Debt, toll, soldij, boetes: everybody in Brabant owes somebody.

## Length (the boxes are measured)

Street remark: 12 words at most. One speech in a conversation: one or two sentences. Discovery card: two or three
sentences. Kroniek entry: 60 words at most. Hint: eight words. Journal entry: one to three sentences, first person.

## Before and after

- Flat: "De Lakenhalle. Hier wordt laken verkocht en gezegeld."
  Better: "Hier werd het laken van Diest gemeten toen Diest nog iets betekende in Keulen. De ellenmaat hangt er
  nog. De kopers niet."
- Flat: "Pas op voor de Kludde in het broek."
  Better: "Mijn vader ging het broek in om een kalf te zoeken. Het kalf kwam terug."
- Flat (quest): "Dood vier deserteurs bij Kaggevinne."
  Better: "Vier man, zegt Driesen. Ze eten zijn wintervoorraad op en ze betalen met zijn eigen hooivork."
- Flat (journal): "Ik heb de klepels gevonden."
  Better: "Drie klepels, zwaar als een kind, koud als de rivier. Aan één ervan kleeft nog wier. Pieter zal huilen."

## The opening lines of a campaign (fixed text: use exactly this)

Epigraph, alone on black, before the place card:

> Dit land is op het water veroverd.
> Het water is dat niet vergeten.

The prologue (`PROLOGUE_LINES` in `src/story/prologue.ts`), the hero remembering:

| id | speaker | text |
|---|---|---|
| pro_n1 | | Ze zeggen dat je de laatste gewone avond van je leven niet herkent. De mijne rook naar natte klaver, en mijn zusje liep te klagen. |
| pro_s1 | Neelke | Je loopt te rap. Mijn benen zijn korter dan de jouwe. |
| pro_n2 | | Neelke telde alles. Stappen, sterren, de slagen van de klok. Ze zei dat de wereld dan niet kon weglopen. |
| pro_s2 | Neelke | Twaalf slagen. Als we voor de laatste binnen zijn, heeft moeder niets gemerkt. |
| pro_s3 | Neelke | Zeven. Het is middernacht. Waar blijven de andere vijf? |
| pro_n3 | | Zolang er een Diest was, hadden de klokken elk uur geslagen. Door pest, door brand, door drie legers. Niemand wist nog waarom dat moest. |
| pro_s4 | Neelke | Kijk. Er branden lichtjes op het water. |
| pro_n4 | | Ik riep haar naam. Ze draaide zich niet om. Ze telde. |
| pro_s5 | Neelke | {name}! |
| pro_n5 | | Het water nam haar zoals het alles neemt. Zonder haast. Zonder geluid. |
| pro_n6 | | Grootmoeder had hem een naam gegeven, bij het vuur, om ons binnen te houden. De Kludde. Ik had erom gelachen. |
| pro_n7 | | De klokken hadden alles in slaap gehouden wat ouder was dan de stad. Het ergste. En, zo bleek, niet alleen het ergste. |
| pro_n8 | | Hij rook naar riet en naar een smidse. Hij keek me aan zoals je iemand aankijkt op wie je lang hebt gewacht. |
| pro_n9 | | Ik heb hem {dragon} genoemd. Hij heeft het toegelaten. |
| pro_n10 | | Later zou een oude vrouw het me zeggen: als alle klokken van Brabant weer samen luiden, gaat alles slapen wat wakker is geworden. De Kludde. En hij. |
| pro_n11 | | Dat was later. Die ochtend wist ik maar één ding. Wat het water neemt, geeft het soms terug. Ik zou het gaan halen. |

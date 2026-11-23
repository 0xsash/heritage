// What people in the street say when you speak to them. Per kind of person:
// gossip, folk belief and their view of the times, and what they have to offer.
// Placeholders: {name} (the hero), {dragon}, {place}, {dir} (direction), {far}
// (distance in words), {what} (something to do), {camp}.
//
// Lines with a condition react to what the player has done; the picker in
// src/life/lines.ts prefers lines not heard in the last ten minutes.

import type { Role } from '../rpg/folk';
import type { FactionId } from '../rpg/factions';
import { OV_GREET, OV_REACTIVE, OV_REP, OV_REP_DEEDS, OV_TOWN_VIEW } from './oudevolk';

export type Special = 'work' | 'food' | 'town' | 'rep' | 'tend' | 'camps' | 'bless' | 'pilgrim' | 'dare' | 'tale';

export const ROLE_INFO: Record<Role, { label: (female: boolean, i: number) => string; faction: FactionId; special: Special; ask: string }> = {
  peasant: { label: (_f, i) => (i % 3 === 0 ? 'farmhand' : 'farmer'), faction: 'vrije', special: 'work', ask: 'Do you know where there is work?' },
  peasantWoman: { label: (_f, i) => (i % 2 ? 'market woman' : 'farmwife'), faction: 'vrije', special: 'food', ask: "What's in your basket?" },
  burgher: { label: (f) => (f ? "burgher's wife" : 'burgher'), faction: 'gilden', special: 'town', ask: 'How does the town stand?' },
  huik: { label: () => "burgher's wife in a huik", faction: 'gilden', special: 'rep', ask: 'What do people say about me?' },
  beguine: { label: () => 'beguine', faction: 'kerk', special: 'tend', ask: 'Can you tend my wounds?' },
  soldier: { label: () => 'garrison soldier', faction: 'kroon', special: 'camps', ask: 'Are the roads safe?' },
  friar: { label: () => 'Franciscan friar', faction: 'kerk', special: 'bless', ask: 'Will you bless me, brother?' },
  pilgrim: { label: (f) => (f ? 'pilgrim' : 'pilgrim'), faction: 'kerk', special: 'pilgrim', ask: 'Tell me about Scherpenheuvel.' },
  child: { label: (f) => (f ? 'girl' : 'boy'), faction: 'vrije', special: 'dare', ask: 'What are you playing?' },
  oldMan: { label: () => 'old man', faction: 'gilden', special: 'tale', ask: 'Tell me an old story.' },
  oldWoman: { label: () => 'old woman', faction: 'kerk', special: 'tale', ask: 'Tell me an old story.' },
};


export const NAMES = {
  m: ['Jan', 'Pieter', 'Hendrik', 'Gillis', 'Adriaan', 'Willem', 'Lucas', 'Cornelis', 'Steven', 'Jacob', 'Lenaert', 'Michiel', 'Merten', 'Andries', 'Rombout', 'Thijs', 'Wouter', 'Arnout', 'Claes', 'Peeter', 'Jooris', 'Frans', 'Gerard', 'Matthijs', 'Laureys', 'Gommaar', 'Huybrecht', 'Daneel', 'Bartel', 'Sander'],
  f: ['Maria', 'Anna', 'Catharina', 'Margriet', 'Elisabeth', 'Barbara', 'Josine', 'Machteld', 'Geertrui', 'Lysken', 'Kathelijne', 'Magdalena', 'Joanna', 'Clara', 'Adriana', 'Digna', 'Lucia', 'Janneken', 'Tanneken', 'Grietken', 'Lynken', 'Beatrijs', 'Heylken', 'Agnes', 'Cornelia', 'Mayken', 'Neelken', 'Wivina', 'Gertrudis', 'Aleid'],
  boy: ['Janneke', 'Peerke', 'Claeske', 'Thijske', 'Wout', 'Lowys', 'Bastiaan', 'Remke'],
  girl: ['Mieke', 'Betke', 'Lieske', 'Anneke', 'Klaarke', 'Leen', 'Griet', 'Sanneke'],
  beguine: ['Zuster Agnes', 'Zuster Beatrijs', 'Zuster Clara', 'Zuster Digna', 'Zuster Barbara', 'Zuster Ida', 'Zuster Josine', 'Zuster Gertrudis'],
  friar: ['Broeder Bonaventura', 'Broeder Leo', 'Broeder Egidius', 'Broeder Anselmus', 'Broeder Ruffinus', 'Broeder Fidelis'],
};

/** How people greet you, by your standing with their party (Stranger .. Confidant). */
export const TIER_GREET: Partial<Record<FactionId, string[][]>> = {
  oranje: [
    ["Yes? The baron isn't here. He never is.", 'A stranger. Whose are you?', "Good day. Don't say aloud what brings you."],
    ['Ah, it is you. The drossaard said your name quietly.', 'Good day. In the Hof van Nassau the walls have ears.', "You're the one with the dragon. The prince would like to see you."],
    ['{name}. The Court remembers who helps it.', 'Good day, {name}. The drossaard speaks well of you, though only indoors.', '{name}. Come closer. Nobody can hear us here.'],
    ['{name}, friend of the Court. What do you need?', 'If the baron ever comes back, {name}, he will know your name.', '{name}. They know who you are in The Hague. Truly.'],
    ["{name}. For you the Court's gate stands open, even when it's shut.", 'The prince in the cradle has one friend in Diest, {name}, and it is you.', '{name}. Orange forgets nothing, and this least of all.'],
  ],
  gilden: [
    ['Yes? What is it?', 'A stranger. What do you want?', "Good day. Keep it short if you can. I've work."],
    ['Ah, it is you. Good day.', "I've heard of you. Nothing bad, so far.", "Good day. You're the one with the dragon, aren't you."],
    ['{name}. Glad to see you.', 'Good day, {name}. The guild speaks well of you.', 'Look who it is, {name}. What can I do for you?'],
    ['{name}. The guild is in your debt.', 'Master {name}, I nearly said. Good day.', 'For you I always have time, {name}.'],
    ['{name}, friend of the town. Say what you need.', 'When the deans talk about you, they take their hats off, {name}.', '{name}. Diest is your town. Say the word.'],
  ],
  kerk: [
    ['God be with you. What do you seek?', 'Peace be with you, stranger.', 'Yes, child? Say it.'],
    ['God bless you. I have heard of you.', "Good day. You're the one with the dragon. We pray for you, and to be safe, for the dragon too.", 'Peace be with you.'],
    ['{name}. The Begijnhof speaks well of you.', 'Good day, {name}. Your name falls in our prayers.', 'God bless you, {name}. Come, say it.'],
    ['{name}, friend of the Church. What can I do?', 'Candles burn for you, {name}. Truly.', 'The provost himself spoke your name, {name}. He speaks few names.'],
    ['{name}. It is a blessing that you are here.', 'If anyone saves the bells of Brabant, it is you, {name}.', '{name}, the door of every convent stands open to you.'],
  ],
  kroon: [
    ['Halt. Who are you? Ah, never mind.', "Have you a pass? No? Fine, but I'm watching you.", 'Move along, citizen.'],
    ['You again. Keep quiet, will you.', 'The sergeant knows your name. Whether that is good or bad depends on the day.', "Day. You're not looking for trouble today, are you?"],
    ['{name}. Good people, the sergeant says.', 'Good day, {name}. The garrison knows you.', "{name}. You've done the king a service, I hear."],
    ['{name}. A friend of the Crown is a friend of mine.', 'Salute, {name}. If you need help, shout.', 'The governor himself ought to know you, {name}.'],
    ["{name}. If it were up to me, you'd get a banner.", 'For you every gate opens, {name}, even after curfew.', "Salute, {name}. The Crown doesn't forget who served her."],
  ],
  vrije: [
    ['What are you doing here?', 'I saw nothing, whatever happened.', 'Hm. A stranger with a sword. What do you want?'],
    ["Ah, the one with the dragon. Rest easy, I'll say nothing.", 'They say you can be trusted. They say it, anyway.', 'Day. You pay no toll, I hear. Clever.'],
    ["{name}. You're half one of us already.", 'Good day, {name}. Gielis speaks well of you. That says a lot, or nothing.', 'Look, {name}. What do you need?'],
    ['{name}. For you I always know a back way.', "Hey, {name}. If you're after something that isn't for sale, ask me.", '{name}, friend. Say it.'],
    ['{name}. Every carter between here and Antwerpen knows your name.', 'For you, {name}, the back doors open.', '{name}. You and I, we never pay toll.'],
  ],
  // the hidden party (src/content/oudevolk.ts): only their own people greet you this way
  oudevolk: OV_GREET,
};

// ===================================================================== "Where am I?"
/** How they begin the answer. */
export const WHERE_FRAMES: Record<string, string[]> = {
  any: [
    'This is {place}. {line}', "You're at {place}. {line}", 'Where are you? At {place}. {line}', 'Everyone knows that: {place}. {line}',
    'Here you stand, at {place}. {line}', 'This is {place}, of course. {line}', "You're by {place}. {line}", 'That there is {place}. {line}',
    'Look around you, this is {place}. {line}', "You're at {place}, stranger. {line}", 'This here is {place}. {line}', 'Lost? This is {place}. {line}',
  ],
  child: ["You don't know? This is {place}! {line}", 'This is {place}! Everyone knows that. {line}', 'Here is {place}. {line} My brother says so.'],
  soldier: ['This is {place}, citizen. {line}', "You're at {place}. {line} Remember it, for when you have to run."],
  pilgrim: ["I'm a stranger here myself, but they say this is {place}. {line}", 'This is {place}, if I have it right. {line}'],
  oldMan: ["That's {place}. I've lived here sixty years. {line}", 'This is {place}. {line} Everything was better once, this too.'],
  oldWoman: ["You're at {place}, child. {line}", 'This is {place}. {line} My grandmother married near here.'],
};

/** In their own words, about each place (discovery keys from src/world/lore.ts). */
export const PLACE_LINES: Record<string, string[]> = {
  Diest: ['A town of brewers and the last weavers, behind thick walls. Everyone knows everyone, and everyone has an opinion.', 'The walls are strong, the beer is good, the lord lives far away. There are worse towns.'],
  'Sint-Sulpitius en Dionysiuskerk': ['The great church. The tower was never finished: they say the money ran out before the builders agreed.', 'The bells hang up there, and you know they are silent. People still look up.'],
  Lakenhalle: ['They check the cloth there. Good cloth gets the town seal. Bad cloth gets the weaver a sermon.', 'The Cloth Hall used to be full of bales. Now it is mostly full of Master Joos.'],
  'Stadhuis Diest': ['The schepenen sit there. They fix the price of bread and quarrel over the walls, sometimes at once.', 'The schepenhuis. You pay a fine there, and if you do not pay it, you end up there too.'],
  'Ingang Begijnhof': ['The Begijnhof: a town within the town. The beguines shut the gate at dusk, and then no one goes in or out.', 'The beguines live there. They weave, they pray, and they know everything about everyone.'],
  'Sint-Catharinakerk': ["The beguines' church. Their bell runs a little ahead of the town's. They say it's on purpose.", 'Sint-Catharina is small, but the sisters sing sweeter than the canons in the great church.'],
  'Hof van Nassau': ['The princes\' house, and nobody lives in it. The baron lives in the north, among the Calvinists, which says enough.', 'The Hof van Nassau. The Nassaus have been lords here a century and a half and never lived here. Only the lock on the door gets replaced, now and then.'],
  'Den Drossaerd': ['The drossaard\'s house. Whoever goes in there has done something wrong, or rides a dragon.', "Jonker Van Gorp, the drossaard, lives there. He sleeps badly, they say. With two lords above me, I'd sleep badly too."],
  'Refugiehuis van Averbode': ['The house of the abbey of Averbode. When soldiers come, the canons flee here with their silver.', 'The refuge of Averbode. The fathers come when the countryside is unsafe. It is often unsafe.'],
  'Het Spijker - Refugiehuis van Tongerlo': ["Het Spijker: the abbey of Tongerlo's grain lies there. In a bad year it is the most important house in town.", "Tongerlo's granary. When the harvest fails, half the town queues here to owe the abbey."],
  'Onze-Lieve-Vrouwekerk': ['A quiet church among the gardens. You hear the birds better than the priest.', 'Onze-Lieve-Vrouw stands in the north of the town, among the orchards.'],
  'Stadspark De Warande': ["The Warande: the lord's hunting park. Catch a hare here and you hang. The hares know it.", "The lord's park, with a wall around it. Inside, the rabbits are richer than we are."],
  'Ruïne Warandekasteel': ['The old castle on the hill. A few walls are left. Children play knights there, and the sheep graze.', 'The ruin. The old lords lived there, before the Nassaus. Now an owl does.'],
  Tafelrondmotte: ['The Round Table is a round hill. They say knights sat at a table there, but I never saw a table.', 'Alvermannekes live there, my mother says: the little folk. I say rabbits.'],
  Allerheiligenkapel: ['The chapel for travellers. Whoever takes the road prays there. Whoever comes back with sense prays there again.', 'All Saints lies outside the gate. Every pilgrim to Scherpenheuvel lights a candle there.'],
  Antwerpsepoort: ['The Schaluinpoort, on the north side. The road to Antwerpen begins here, where the ships no longer sail.', 'The merchants of the Kempen come this way, with butter, wool and chatter.'],
  Schaffensepoort: ['The Schaffensepoort. Beyond it lie the heath and the sheep, and lately the deserters.', "The shooters drill there. If you hear an arrow whistle, don't look round. Duck."],
  Koepoort: ['The old Koepoort. It has been bricked up more than a hundred years. The cows use another gate now, but the name stayed.', 'Past the old Koepoort lie the Broek and the meadows. Fine land, as long as it is day.'],
  Maastrichtsepoort: ['The Beverenpoort, on the southeast side. They charge toll on everything that rolls.', 'The garrison lies near here. You hear them singing in the evening, and they sing flat.'],
  Leuvensepoort: ['The Putterstraatpoort. Wouter the toll-keeper stands there with his list. Everyone knows him and nobody likes him.', 'From here you leave for Leuven, where the scholars live. Sometimes they come through and speak Latin to the cows.'],
  Allerheiligenpoort: ['The west gate, to Aarschot and Scherpenheuvel. Pilgrims go through with their staffs and their songs.', 'The Allerheiligenpoort. From here the road runs west along the Demer.'],
  Demerpoort: ['That is where the Demer comes in. The water is brown and smells of the tanners.', 'The water gate on the Demer. When the water rises, the shutters go down, and then there is praying.'],
  Webbekom: ['Webbekom is a village on the marsh. They cut reed there and stay indoors at night.', 'The people of Webbekom are afraid of the water. They have their reasons.'],
  'Sint-Trudokerk': ['The church of Webbekom. The bell rope is always damp, they say. Nobody knows why.', 'Sint-Trudo, in Webbekom. The church is small, but the fear is large.'],
  Kaggevinne: ['Kaggevinne is a few farms and a great many geese, and lately highwaymen too.', 'Farmer Driesen lives here. He had three pigs, until recently.'],
  'Veldkapel Galgeberg': ['The Galgenberg. The Kaggevinne schepenbank hangs its thieves there, where every traveller can see. It does not help.', "Don't look at the gallows too long. They say it looks back."],
  Scherpenheuvel: ['Scherpenheuvel. All Brabant comes here to pray, and afterwards to buy, eat and drink.', 'The holy hill. Fifty years ago it was heath and one oak. Now there is a town with seven sides.'],
  'Basiliek van Onze-Lieve-Vrouw van Scherpenheuvel': ["The church has seven sides and a dome full of golden stars. I've never seen anything lovelier.", 'The altar stands where the oak stood. Go in, and look up.'],
  'De Heilige Eik': ['The oak stood there. They cut it down and carved little figures from it. The roots are still there.', 'The roots of the oak lie under the altar. Some say they are still growing.'],
};

// ===================================================================== "What is there to do here?"
export const TODO_OPEN = [
  'What is there to do? ', 'Hm, something to do... ', "If you're bored: ", 'I know something. ', 'Now, look: ', 'For someone like you? ',
  "There's always something to do. ", 'Let me think. ', 'Well, ', 'Do you know what you should do? ', "Then you've come to the right person. ", 'Around here? ',
];
export const TODO: Record<string, string[]> = {
  read: ["There's {what} {far}, {dir}. Can you read? Then you know more than I do.", "Go and read {what}, {dir}, {far}. I don't know what it says. Tell me.", '{what}, {dir}. Everyone walks past it, but you might stop.'],
  shop: ["{what} is {far}, {dir}. Say I sent you and you might get a discount, or you might not.", "Know {what} yet? It's {far}, {dir}. The goods are good, but the prices are peppery.", 'Call on {what}, {dir}. You need it, by the look of you.'],
  guide: ['Talk to {what}, {dir}, {far}. Knows more than is good for them.', '{what} will explain everything, {dir}. Everything, so take your time.', 'If you want to know something, ask {what}, {far}, {dir}.'],
  board: ['The notice board hangs on the market. They always want people there. It is {far}, {dir}.', 'Look at the notice board, {dir}. There is work, there are bounties, and sometimes a lost hen.', 'On the notice board, {far}, there is work for those who can read and fight.'],
  camp: ['Trouble at {what}, {far}, {dir}. Someone has to drive them off. You have a sword.', "There's trouble at {what}, {dir}, {far}. That's for someone who likes danger.", "Don't go {dir}, that's where {what} is. Unless it's what you're after, of course."],
  giver: ['{what} is looking for help, {dir}, {far}. You can see it in the face.', '{what} is in a bad way, {far}. Go and listen, {dir}.', 'Talk to {what}, {dir}. Something is weighing on that one.'],
  place: ["Been to {what} yet? It's {far}, {dir}. You should see it.", '{what}, {dir}. Worth seeing, and it is {far}.', 'Go and look at {what}, {far}, {dir}.'],
  spot: ["There's {what} {far}, {dir}. Not much, but something.", '{what}, {dir}. Go and look.', 'See that, {dir}? {what}. Everyone stops there a moment.'],
  none: ["Something to do? You've done everything already, by the look of it. Sit down.", 'I think there is nothing left to do. Go to the inn.', 'You know this town better than I do by now.'],
};

// ===================================================================== "Tell me something"
export const GOSSIP: Record<Role, string[]> = {
  peasant: [
    "The rye stands well this year, if the soldiers don't come to cut it for us.", 'Tithe to the abbey, rent to the lord, levy to the king. The mouse gets what is left.',
    'A hen fetches less at market than it eats in feed. But the town must eat, they say.', 'My neighbour saw lights in the Broek. He had been drinking. So had I, and I saw them too.',
    'Last spring the Demer came up to the meadow and sat there a week. The cows stood on the dyke like saints. It went home when it was ready.', 'A farmer without a horse is a man with worries. I have no horse.',
    'The soldiers pay in paper. \"The king pays later.\" The king has never visited me.', 'They say you can smell rain when the cows lie down. My cows always lie down. It always rains, too.',
    'I only go to town on market day. The rest of the week the town has no need of me.', 'In the war of thirty-five the French burned our barn. My father rebuilt it. I keep it up. My son will see it burn again.',
    'Whoever pays toll at the gate on his own eggs has not understood life. Or he is honest, which comes to the same.', 'Ever seen that beast of yours eat a sheep? I have. It was mine.',
    'The Schaffen heath is good for sheep and nothing else. Not for deserters either, but they sit there anyway.', 'My grandfather said: work till dark, then go indoors. After dark the land is not ours.',
    'My grandfather ploughed this field. He found a sword in it. We still plough around the spot.',
    'The abbey wants its tithe in rye, the soldiers want bacon. I have no bacon left.',
  ],
  peasantWoman: [
    "I have butter, eggs, cheese, and a hen if it comes to it. I've stood here since the gate opened.", 'The baker asks too much for his bread. But who quarrels with a baker?',
    'The Cloth Hall people never buy at market. They send their maid. She buys from me.', 'Mind the cutpurses, child. They work in pairs: one talks and the other cuts.',
    'My husband is in Antwerpen with the cart. He says the city has been quiet since the Schelde closed. He also says the beer is dear there.', 'On market day the burghers buy first, and we from outside after. By then the burghers are gone and everything is still for sale.',
    "The drossaard's maid buys two hens a week, for one man. I say nothing. I only think what I think.", 'They say the beguines weave the best cloth. I say they have the best looms, and no man to complain about them.',
    "A dragon stood on the market this morning, and now the hens won't lay. I don't blame you. Well, a little.", 'Cherries in June, apples in September, and cabbage soup all winter. That is the year.',
    "When the bells rang, you knew when the market began. Without them everyone comes late, except me. I'm always early.", 'The toll-keeper wants toll on everything: my eggs, my basket, and nearly my child.',
    'My daughter wants to be a beguine. I say marry a weaver instead. She says: that is why.',
    'Three eggs for a stuiver. Last year you got four. The hens have not changed.',
    'My husband counts the coins, I count what is left. I finish sooner.',
  ],
  burgher: [
    'The cloth trade is not what it was. My forefathers sold at every great market. I sell in Aarschot.', 'I have two billeted soldiers. They eat for four and pay for none.',
    'The schepenen want the walls mended. With whose money? Mine, naturally.', 'The baron lives in The Hague, among the heretics. He sends a drossaard and asks for taxes. It has always been so.',
    'A new printing house has opened in Antwerpen. There are too many already. Everyone wants to read and nobody wants to pay.', 'Diest beer goes as far as Mechelen. There they pay double and say it is theirs.',
    "A burgher pays no toll at his own gate. That is why I'm a burgher. It cost me a fortune, but in a hundred years I'll earn it back.", 'My son-in-law studies law in Leuven. He writes that he needs money, and he writes it in Latin.',
    'The Peace of Munster was good for the Hollanders. For us it was mostly good for the Hollanders.', 'They say the young Prince of Orange is dead. So the baron is still in the cradle. I hope his guardians do their sums better than he does.',
    'On the schepenbank they pass judgement. Then they go to the inn and pass more.', 'My house is called Het Gulden Hoofd. My neighbour calls it Pieter\'s Gulden Hoofd. He is jealous.',
    'Whoever is in the guild has work. Whoever is not has time. I do not know who is better off.',
    'My grandfather had six looms. I have two, and a debt to the abbey.',
    'The wall by the water gate sinks a finger every year. The schepenen measure it. They like measuring.',
  ],
  huik: [
    "A huik is not fashion, it is decency. A woman who goes to church without one has nothing to hide. That is suspicious.", "The drossaard's wife wears Spanish lace, here in Diest. I'll say no more.",
    'The canon of Sint-Sulpitius preaches too long. I count the pigeons in the vault. Last time there were twenty-eight.', 'My daughter marries in summer, a brewer\'s son. Good family, though they smell of malt.',
    'They say the beguines hear everything. True. They tell God, and God tells the priest.', 'In Brussels they wear black, my cousin says. We wear black too. But in Brussels it costs more.',
    "A woman without a husband may not practise a trade, unless she is a widow, and then only if the guild allows. It is that simple.", "There was a feast at the shooters'. The shooters' king stood treat for three days. His wife is still paying.",
    'I hear that in Leuven the professors quarrel over grace. Here we quarrel over the price of bread. That is a kind of grace too.', 'The weather is not what it was. The winters are colder. So are the summers.',
    "You mustn't wear a huik at the market. I wear mine everywhere. Nobody says a word. That is decency.", 'My grandmother remembered the breaking of the images. She never spoke of it. She just prayed a little longer.',
    'There is a dragon in town and the ladies talk of nothing else. The gentlemen too, but they pretend it is about the war.',
    'My mother wore this huik to her mother\'s funeral. I wear it to market. So everything goes downhill.',
    "The dean's daughter is marrying a man from Leuven. Nobody says it aloud. Everybody knows.",
  ],
  beguine: [
    'In the infirmary there are six: two with fever, one with a broken leg, and three who are mostly lonely.', 'We take no vows for life. Whoever wants to go may go. Hardly anyone goes.',
    'Sister Margriet knows every herb. I know every prayer. Together we help most of them.', 'We weave, and we sell the cloth. The guild does not approve. The guild approves of little.',
    'At dusk the court gate closes. Whoever is late sleeps at the priest\'s. He snores.', 'A beguine goes to the sick in town, even when it is plague. Especially then.',
    "Our bell runs ahead of the town's. That way we are always in time for vespers.", 'Pilgrims passing here say the church at Scherpenheuvel hums at night. I pray it is angels.',
    "The town's children are afraid of us. They think we eat them. We only give them porridge.", 'A widow without work can live with us. She must be able to spin, and to keep quiet. The second is harder.',
    "We bake the court's bread ourselves. It is not as good as the baker's. It is better for the soul.", 'Someone left a basket of kittens at our gate. Now we have eleven cats. Sister Clara names them after the apostles.',
    'The Church nearly banned us centuries ago. We are still here. So is the Church. We tolerate each other.',
    'Sister Clara is ninety. She remembers how the court looked before the soldiers came. She does not like to talk of it.',
    'Whoever dies among us gets a candle and a name in the book. The book is old. It is nearly full.',
  ],
  soldier: [
    "I haven't seen pay in three months. I live on the kindness of the burgher I'm billeted with, and that is used up.", "I'm from Naples. Or rather, I was. Now I belong to Diest, to the king, and to nobody.",
    'The French are far off, in Artois. It is quiet here, too quiet. Quiet turns soldiers bad.', 'Loading a musket takes longer than a prayer. I learned prayers, to fill the time.',
    "My comrade ran last week. He is with the deserters on the heath now. If I find him I must hang him. I hope I don't find him.", 'The sergeant says discipline is everything. The sergeant has been paid.',
    'Guard at the gate is the best work. You see everyone, and nobody sees you.', "In thirty-five this garrison retook the town. I wasn't there, I was a child. But it is on our banner.",
    'Nobody said anything about a dragon at recruitment.', "The burgher I'm billeted with has a daughter. I may not speak to her, so I talk to the dog. Frankly, the dog is better company.",
    'Sleep on watch and you are punished. Do not sleep and you go mad. I sleep with one eye open.', 'Diest beer is good, too good. Half the garrison fell in the moat with it yesterday.',
    'They say the governor in Brussels has a picture gallery as long as this street. And we get no pay.',
    'My musket is older than I am. It served in Germany. It still shoots too far left.',
    'Billeted with a widow. She counts my food. I count my days.',
  ],
  friar: [
    'We beg for the poor. The rich give, the poor receive, and we get blisters on our feet.', 'A sermon should be short, my superior said. He preached two hours on short sermons.',
    'In the war the soldiers emptied our friary. They left only our bread. That is how bad it is.', 'People confess to me what they dare not tell the priest. I keep silent. I keep a great deal.',
    'I walked to Rome. It was far and it was hot. I saw the pope, from a distance.', 'Saint Francis spoke to the birds. I try with the pigeons of the Grote Markt. They do not listen.',
    'Whoever gives to the poor lends to the Lord. The Lord repays, but not always in this world.', 'Some pilgrims to Scherpenheuvel go barefoot. I do it every day, and nobody calls it a pilgrimage.',
    'They say the bells keep the dark out. I say a good heart holds more than bronze.', 'Friary food is plain: porridge, bread, beer, and on Sundays more porridge.',
    "A dragon is also one of God's creatures. I haven't found my own yet, but I'm looking.", 'The Jansenists in Leuven quarrel with the Jesuits over grace. I give grace away free, here in the street.',
    'Every morning I rise at four. Then it is pray, work, pray and sleep. It sounds dull, and it is. But it is good.',
    'My sandals have been resoled three times. The soles come from a horse harness. I walk like a horse.',
    'A dying man asked me yesterday whether the bells would ring again. I said yes. I hope it is true.',
  ],
  pilgrim: [
    'I come from Mechelen and walked three days. My feet are holy now, or at least swollen.', 'I made a vow when my son was sick. He recovered. Now I walk. A vow is a vow.',
    "On the road by Kaggevinne men lay in the bushes. We were thirty strong, they didn't dare. Alone I'd never have made it.", 'You walk praying round the church, as once round the oak. Then you buy a tin badge for your hat, and then a pint. In that order.',
    'At Scherpenheuvel I saw a man leave his crutches behind. He walked away without them. I saw it, and I still do not fully believe it.', 'The inns at Scherpenheuvel charge three times what Diest does. It is a holy town, and they make you pay for it.',
    'My aunt went every year. She said the little statue sat in the oak before they built the church. She saw it herself, as a child.', 'On the road I sleep in barns. Farmers are usually good to pilgrims. Sometimes they loose the dog.',
    'You hear a lot on the road: that the bells of Diest fell silent, that there is a dragon. I thought it was talk. And then I see you.', 'My staff has walked four pilgrimages. Its last owner was found dead in a ditch with it. He looked happy.',
    'A pilgrim must not swear, steal or lie. The rule says nothing about drinking.', 'They sell thousands of figures made from the real oak. It must have been a very big oak.',
    'On the way back we sing. On the way there we pray. In between we complain about our feet.',
    'My mother walked this road with me in her belly. I walk it now with her rosary.',
    'They want twelve stuivers for a bed in Scherpenheuvel. For that price I would rather pray in the barn.',
  ],
  child: [
    'My brother says dragons eat children. I say he is lying. He is lying, isn\'t he?', "I know where the church pigeons sleep. I won't tell the sexton.",
    'Yesterday we played shoot-the-jay. I was the jay. It hurt.', 'There is a pike in the moat as big as a dog. I nearly saw it.',
    'The beguines give porridge. You have to say a prayer. I know half of one.', "When I'm big I'll be a dragon rider or a baker. The baker's is warmer.",
    "My mother says the Kludde takes naughty children. I'm good nearly all the time.", 'Know what the shooters do when they are not shooting? They drink. My father is a shooter.',
    'I can count to a hundred. Want to hear? One, two, three...', "Alvermannekes live on the Tafelronde. If you go and look at night, you see them. I'm not allowed out at night.",
    'The toll-keeper has a wart on his nose. If you look at it, you pay double.', 'Can I pet your dragon? No? Can I look at it, then? I am already looking.',
    'The night the bells stopped, nobody knew when to sleep. I stayed up till the cock crowed.',
    "I found a bullet in the moat. From the war, my father says. I'll swap it for your dragon.",
    'My sister counts the pigeons. I count the soldiers. There are more pigeons.',
  ],
  oldMan: [
    "In my great-grandfather's day Diest cloth was the best in Brabant. Now hardly anyone buys it.", "I've seen three armies march by. All of them took my hens. The Spaniards too, and they were ours.",
    'My knees forecast the weather better than the almanac. It rains tomorrow. I feel it in the left.', 'In thirty-five the town gave itself to the French and the Dutch. The same year the Spaniards stood at the gate again. I forget who we were meant to cheer.',
    'The old lords lived in the castle on the Warande. Now it is a ruin. That is how it goes with lords.', 'I was a boy when Jan Berchmans walked about here. A good child, too good. I never saw him fight.',
    "We used to drink beer warm, with an egg in it. The young drink it cold. I don't understand the world any more.", 'My father was a bell-ringer. He said: a bell has a soul. When it falls silent it is not dead. It is listening.',
    'Whoever lives by the Demer knows: the water takes and the water gives. Mostly it takes.', 'I know every stone in this street. I laid half of them myself, when I could still bend.',
    'The young have no patience. They want everything at once. I wanted everything at once too. I never got it.', 'They say there is a dragon. I saw one as a child, on a tapestry in Brussels. Yours is bigger.',
    'A good pipe, a pint and a bench in the sun. A man needs no more, except perhaps his teeth.',
    'I have always known that tower that flat. My father too, and his father before him.',
    'My father was there when they opened the gate in thirty-five. He never said who did it.',
  ],
  oldWoman: [
    'I bore nine children. Four live. That is a lot, in these times.', 'I burn a candle for Sint-Rochus every week, against the plague. It works: I have never had the plague.',
    'The beguines are good folk. I nearly became one. Then my husband came. I still regret it a little.', 'If you see a magpie, greet it, or it brings bad luck. I greet ten a day.',
    'Never lay a loaf upside down. Then the devil sits at your table. My mother said so, and she never saw him, so it works.', 'The Demer took my brother when he was six. Mother said it was the Nekker. I say it was the current. Either way, he is gone.',
    'They used to ring the bell in thunderstorms, to drive them off. I do not know if it helped. But it was a fine sound in the dark.', 'My grandmother saw the soldiers of Orange empty the church of Sint-Jan in seventy-eight. She said some wept as they smashed the statues. I never understood that.',
    'On Sint-Maarten the children get apples and nuts, and sing for them at the doors, out of tune but with conviction.', 'A woman who lives alone is called a witch. A man who lives alone is a bachelor. That is the world.',
    "Don't whistle after dark. You call the things that live in it. My grandson whistles all the time. So far he hasn't been fetched.", 'Camomile for stomach ache, elder for fever, and a kind word for the rest.',
    'The old sexton rang the bells sixty years. Now it is Pieter. He is nervous, that boy. He is fifty.',
    "I sold my wedding ring in a dear winter. I'll never buy it back. It would not fit any more.",
    'What the water takes, it sometimes gives back, my mother said. She did not say when.',
  ],
};

/** Lines anyone may say (or only `roles`), that react to what the player has done (conditions: cond() in src/life/life.ts). */
export const REACTIVE: { t: string; if: string; roles?: string[] }[] = [
  { if: 'bells_silent', t: 'Since the bells fell silent, the baker bakes whenever he wakes. He wakes late.' },
  { if: 'bells_silent', t: 'They say there was wet weed on the bell frame, forty ells above the ground. Who carries weed up there?' },
  { if: 'bells_silent', t: 'My neighbour put a candle in the window that night, for her boy. It is still burning.' },
  { if: 'bells_silent', t: 'Without bells the gates shut whenever the watchman feels like it. Yesterday that was three o\'clock.' },
  { if: 'bells_ring', t: 'Hear the bells? They strike every hour again. I never thought I would miss that sound. I did.' },
  { if: 'bells_ring', t: 'They say you fetched the clappers out of the Kludde\'s nest. I almost believe it.' },
  { if: 'bells_ring', t: 'At the first stroke your dragon lay down, I saw, like a dog by the fire.' },
  { if: 'bells_ring', t: 'The bells ring again, and the baker is up on time. The bread has not improved.' },
  { if: 'seals_reported', t: 'That widow Vranckx has been banished. Her cottage stands empty and her loom is sold. The law is the law, says the guild.' },
  { if: 'seals_begijnhof', t: 'Lijsbet Vranckx weaves with the beguines now. Better so, I say. The guild says otherwise, but quietly.' },
  { if: 'seals_warned', t: 'That widow of the false seals has fled, they say. Someone warned her. Nobody knows who. Everyone is looking at you.' },
  { if: 'toll_bribe', t: 'A keg of brandy is going round that never paid toll. You smell a little of it yourself, to be honest.' },
  { if: 'toll_seized', t: 'Gielis de Ton has lost his brandy. He swears in three languages, and badly in all three.' },
  { if: 'toll_paid', t: 'Gielis de Ton paid toll, for the first time in twenty years. Wouter the toll-keeper lit a candle for it.' },
  { if: 'roelof_done', t: 'Lambrecht de Rode is dead, and in Kaggevinne the doors shut normally again. They say it was you.' },
  { if: 'kludde_done', t: 'You drove off the Kludde, they say. My grandmother asks in what shape. And she adds: driven off is not dead.' },
  { if: 'wisps_done', t: 'No lights dance in the oak wood any more. Pilgrims find the road again. Two never came back, but nobody looks for them now.' },
  { if: 'herbs_done', t: 'Sister Margriet has woundwort again. The fever in the infirmary is falling. She says it is your herb. She does not like saying so.' },
  { if: 'letter_done', t: 'You took the drossaard\'s letter to Scherpenheuvel? On a dragon? Then the provost knew before the drossaard had written it.' },
  { if: 'walk_done', t: 'You have walked the whole town, I hear. Then you know it better than most burghers. They only know the way to the inn.' },
  { if: 'many_jobs', t: 'You do all the notice-board work, they say. The crier must write new notices for you.' },
  { if: 'famous', t: 'There is {name}, the one with the dragon. Everyone talks about you, and not always kindly.' },
  { if: 'famous', t: '{name}, my son wants a dragon too when he is big. I said: finish your plate first.' },
  { if: 'high_level', t: "That is a stout sword, {name}. I would not want to face it. I am facing it. I'll step aside." },
  { if: 'gilden_high', t: 'The guild deans speak well of you. They do that of hardly anyone. They even speak ill of each other.' },
  { if: 'kerk_high', t: 'The beguines pray for you, they say, all together. That is a lot of prayer.' },
  { if: 'kroon_high', t: 'The soldiers salute you, I saw. They salute nobody else, not even their own captain when he is not looking.' },
  { if: 'vrije_high', t: 'They say you know the smugglers\' paths. I say nothing. I know them too.' },
  { if: 'kroon_low_vrije_high', t: 'The sergeant had your name written down, I hear, in the book of those being watched. It is a thick book.' },
  { if: 'blessed', t: 'You look blessed. I do not know what that looks like, but it must be about like this.' },
  { if: 'night', t: "It is getting dark. Don't go to the Broek. My father went, looking for a calf. The calf came back." },
  { if: 'poor', t: 'Your purse looks light. At the notice board they always want people.' },
  // the Oude Volk: rumours before you find them, talk after, and what De Kerk's people say
  ...OV_REACTIVE,
];

// ===================================================================== role specials
export const TEND = {
  offer: ["Let me see. Hm. That does not look good. A gift for the sick, two stuivers, and I'll dress it.", "You're bleeding on the pavement. Come here. Two stuivers for the poor, and you are whole again.", 'Sit. A gift for the infirmary, if you can, two stuivers. Then I will clean it.', "Lucky I have my bag with me. Two stuivers for the sick and I'll do it."],
  fine: ["You have nothing, a scratch at most. Come back when you really bleed.", 'You are perfectly healthy. Go and confess instead, you may need that more.', 'I see no wounds. I see a soul that could use some rest. I have no salve for that.'],
  done: ["There. Don't pick at it, and don't go fighting. You will fight anyway, I can see it.", 'Done. God help you, and me, now and then.', "It is dressed. Thank you for your gift: someone sick will eat from it tonight.", 'There. That will heal, with God\'s help and a little comfrey.'],
  poor: ['No money? Then I will do it for a prayer. Pray for the sick tonight. Promise?', "Your purse is empty and your wounds are open. Come, I'll do it anyway. Don't tell the Grand Mistress."],
};

export const CAMPS_WARN = [
  'Beware {camp}, {far}, {dir}. If you go there, draw your sword first. I will mark it on your map.',
  'You will find {camp} {dir}, {far}. We may not go without orders. You need no orders. I will mark it on your map.',
  'Unsafe ground {dir}, {far}: {camp}. I will draw it on your map.',
  'The sergeant warns about {camp}, {dir}. They attack in a group. Watch your back. I will mark it on your map.',
  "I wouldn't go {dir}. {camp} lies there, {far}. But you have a dragon. I will mark it on your map.",
  'They report {camp}, {dir}, {far}. Drive them off and the garrison may pay. Look at the notice board.',
  'The roads are safe, except {dir}. {camp} is there, {far}. It is on your map now.',
  'Hm. There is {camp}, {dir}, {far}. Some were soldiers once. Now they have only hunger and a sword.',
  'If you like danger, seek out {camp}, {dir}. I will mark it on your map. After that you are on your own.',
  "Wait, let me show you: {dir}, {far}, there is {camp}. Don't go alone. Ah, you are never alone, with that beast.",
  'Everyone talks about {camp}, {dir}. Pilgrims walk wide around it. You may not need to.',
  'My comrade came back wounded from {camp}, {dir}, {far}. Be careful.',
];
export const CAMPS_NONE = ['Is it safe? For now, and partly thanks to you. They come back, they always come back.', 'All is quiet, almost too quiet. Try the inn, more happens there.', 'I know nothing. And if I know nothing, it is safe.'];

export const BLESS = [
  'In nomine Patris... There. Go in peace, and strike only who deserves it.', 'The Lord bless and keep you, and your dragon too. Especially your dragon, he needs it.',
  'I bless you. It is free. An alms for the poor is welcome, but not required.', 'Kneel. No, not in the mud, there. So. Now you are blessed.',
  'May Sint-Michiel guide your sword and Sint-Franciscus your heart. They do not know each other, but they work well together.', 'You are blessed. That helps against blows, say the soldiers. They say a lot.',
  'A little cross on your forehead. There. You are slightly better protected now. Slightly.', "Go, and don't be afraid. Or be a little afraid. It is healthy.",
  "The Lord's blessing, for those on the road. You are always on the road, it seems.", 'I bless you, your sword and your boots. Especially your boots, they go farthest.',
  'Pax tecum. That is Latin for: watch where you swing.', 'Blessed is whoever protects the weak. I hope you do.',
];
export const BLESS_AGAIN = ["I have just blessed you. God's blessing does not wear thin so fast. Come back tomorrow if you still doubt.", 'Again? The Lord heard you already. He is not deaf.', 'One blessing at a time, friend. Otherwise it becomes pride.'];

export const PILGRIM_TALES = [
  'At Scherpenheuvel there once stood an oak with a little statue of Mary. A shepherd boy tried to take it and could not move, until his master put it back. So they tell it. Since then the people come.',
  'The archdukes had a church built there with seven sides, in a town with seven corners. It is the loveliest thing I have seen. And I have been to Mechelen.',
  'They walk praying round the church, some on their knees. I did it once on my knees and never again. My knees are pilgrims now too.',
  'Inside hang crutches, wax arms, wax legs and even a wax heart. All from people who were healed, or hoped to be.',
  'You go west, along the Aarschot road. Mind the highwaymen at Kaggevinne. Then you see the dome above the trees, and you are nearly there.',
  'The dome is blue inside, with golden stars. Look long enough and you think they move. That is the incense, says the provost.',
  "Truyken sells figures by the church. Real ones, from the oak's wood, she says. I bought three. They don't hum. That is good, I think.",
  "In the oak wood east of Scherpenheuvel you see lights in the evening. Don't follow them. Two of our group did. We prayed. They did not come back.",
  'The inns are full around the great pilgrimage days. Then the pilgrims sleep in barns, in the church, and in the ditch if need be.',
  'My grandfather walked to Scherpenheuvel when there was no church yet, only a chapel and the oak. He said it was quieter then. He also said he was younger then.',
  'You buy a tin badge and pin it to your hat. Then everyone on the road knows where you have been. Sometimes you get a bowl of soup. Pilgrims help pilgrims.',
  'They say the church of Scherpenheuvel hums at night, lately. The provost says it is the wind. The wind does not hum, I say.',
  'Spaniards, Brabanders, Walloons, even French come. In church we are all the same. Outside we are not: the Walloons sing louder.',
  "The oak's wood was sawn up and carved into figures. They stand in churches across the world now. In Spain and further, they say. One Brabant oak, everywhere on earth.",
];

export const DARES = {
  race: [
    'I dare you! First to {what}, {dir}! I count to {n}!', "Bet you can't reach {what} before I've counted to {n}? {dir}! Run!",
    'First one there! To {what}, {dir}. I count to {n}. One, two...', 'Can you run without your dragon? Prove it! To {what}, {dir}, before I count to {n}!',
    "I'm the fastest on the street. And you? To {what}! {dir}! I count to {n}!",
  ],
  win: ["You made it! You're quick, for a grown-up. I know a secret: {what}, {dir}. Don't tell!", "You win! Here, my best marble. No, you can't have that. But I'll tell you something: {what}, {dir}.", 'Oh, you got there! My brother will laugh. Here, an apple. It is only a little bitten.'],
  lose: ['Too late! I won! I beat the dragon rider!', 'Ha! You are slow! Even my grandmother is faster, and she has a stick!', 'Too late, too late! Want another go? Tomorrow. Now I have to eat.'],
  guess: ['Which hand is the marble in? Guess!', "Guess! Left or right? If you win, you get it. If you lose, I get a stuiver. No, I'm joking.", 'Pick a hand. Quick!'],
  guessWin: ['How did you know?! Here, it is glass and nearly from Antwerpen.', 'Right! You peeked. I am sure of it. Here, you may keep it, but only for a moment.'],
  guessLose: ["Wrong! It was in the other one! I'm the best conjuror in Diest.", 'Wrong! My brother always guesses it. My brother is cleverer than you. He is six.'],
};

/** Old folks' tales: what people told each other (volksverhaal), or what we made up in that spirit (verzonnen). */
export const TALES: { t: string; truth: 'volksverhaal' | 'verzonnen' }[] = [
  { truth: 'verzonnen', t: 'Long ago a giant lived in the Demer and made the bargemen pay toll. A woman of Diest cooked him porridge with nails in it. He ate it and sank. So they tell it. I say: you cannot cook with nails.' },
  { truth: 'volksverhaal', t: 'The Kludde, child. He is whatever he wishes: a thin horse, a dog, a cat, a bat. You know him by two blue flames dancing ahead of him. He jumps on your back and grows heavier with every step, all the way to the water. If you hear chains, do not look round, and pray.' },
  { truth: 'volksverhaal', t: 'The Nekker lives in the Demer. He pulls children who play at the edge into the water. My mother told me so every day. I never fell in. So it works.' },
  { truth: 'volksverhaal', t: 'On the Tafelronde, that round hill, live the alvermannekes. Put out a bowl of porridge and they finish your work in the night. But spy on them and they smash everything. My grandfather spied on them. After that he never had a whole plate.' },
  { truth: 'volksverhaal', t: 'A smith in a village near here struck a wolf with his hammer one night. Next morning his neighbour walked with a bandaged arm. Werewolf, said the village. The neighbour moved away. What else could he do?' },
  { truth: 'volksverhaal', t: 'When it thunders, the bells are rung. The sound drives off the storm, and the devils who ride in it. That is why bells have names and are baptised. A bell without a name is only bronze.' },
  { truth: 'volksverhaal', t: 'Sint-Maarten shared his cloak with a beggar. That is why children get apples and nuts on his feast. We share our apples. The apples belong to the neighbours, mind.' },
  { truth: 'verzonnen', t: 'They say the stones of the great church come from the hills, where there is iron in the ground. That is why the church is brown, and why lightning never strikes it. That last is not true. It has struck twice.' },
  { truth: 'verzonnen', t: 'In the war, long ago, the people of Diest hid their silver in the Warande. Not everyone came back to fetch it. There is still silver under the trees, they say. Many have dug. They found roots.' },
  { truth: 'volksverhaal', t: 'An egg laid on Good Friday never spoils. My mother had one, twenty years old. Nobody dared break it open. It is still in the cupboard.' },
  { truth: 'volksverhaal', t: 'The marsh lights are the souls of those who lost their way. They seek company. Do not follow them. If you see them, turn your coat inside out. Then they will not know you.' },
  { truth: 'verzonnen', t: 'A magpie on the roof: news is coming. Two magpies: a wedding. Three: a funeral. Four: too many magpies, and then you need a cat.' },
  { truth: 'verzonnen', t: 'Whoever listens under the apple tree on New Year\'s Eve hears who will marry in the coming year. I did. I heard nothing. I never married either. So it is true.' },
  { truth: 'verzonnen', t: 'In the tower of Sint-Sulpitius lives an owl as old as the tower. It saw when they stopped building. It still laughs about it at night. You can hear it, if you listen well.' },
  { truth: 'verzonnen', t: 'The Galgenberg did not steal its name. They say whoever walks past at full moon hears the ropes creak, even when nobody hangs. I never walked past at full moon. I am not mad.' },
  { truth: 'verzonnen', t: 'My grandmother said: when the bells fall silent, the water comes. I never knew what she meant. She said it when the bells were ringing. Now they are silent, and I think of it every night.' },
];
/** Which tales open which pages of the Kroniek (index into TALES). */
export const TALE_PAGES: Record<number, string> = { 1: 'wezen:kludde', 2: 'wezen:nekker', 3: 'wezen:alvermannekes', 4: 'wezen:weerwolf', 10: 'wezen:dwaallicht' };

export const TOWN_VIEW: { t: string; if?: string }[] = [
  { t: 'Things are bad. The cloth trade is nearly dead, the garrison eats us out of house and home, and the baron lies in the cradle. But the beer is good.' },
  { t: 'The town holds itself up, like an old man on a stick. It goes on. But do not ask the stick.' },
  { t: 'The schepenen raised the beer tax to mend the walls. So we drink more, for the walls.' },
  { t: 'Nearly all the looms stand idle, but not the breweries. Diest went from cloth to beer. It could have been worse.' },
  { t: 'Since the peace with the Republic it is quieter. Since the war with France it is less quiet. All told it stays the same.' },
  { t: 'Too many soldiers, too little work and too much talk. It has really always been so.' },
  { if: 'bells_silent', t: 'Without bells it is a town without a heart. People come late, the gates shut whenever it suits, and at night there are candles in the windows.' },
  { if: 'bells_ring', t: 'The bells ring again. You notice it everywhere: people walk straighter. It sounds absurd, but it is true.' },
  { if: 'gilden_low', t: 'The guilds do not know you yet. Do business at the market, help someone, and they will learn you. That is how it goes here.' },
  { if: 'gilden_mid', t: 'The guilds are beginning to know you. You get better prices already, I have noticed. That is how you start to become a burgher.' },
  { if: 'gilden_high', t: 'The guilds almost call you one of their own. Careful: soon you will have to sit in their meetings.' },
  { if: 'kroon_high', t: 'The garrison is pleased with you, and so is the captain. Good for you, good for the town. Less good for the smugglers.' },
  { if: 'vrije_high', t: 'They say you stand well with the carters and pedlars. Handy, but do not say it too loudly near the toll-keeper.' },
  { if: 'kerk_high', t: 'The Church is glad of you, and the beguines more so. If you fall ill, you are in good hands.' },
  ...OV_TOWN_VIEW,
];

/** What people say about you, per party and tier (src/life/talk.ts). */
export const REP: Partial<Record<FactionId, string[]>> = {
  oranje: ['The Court of Nassau does not know who you are.', "The drossaard has put your name in his book, without judgement for now.", 'They say quietly that the Court looks kindly on you.', "The prince's men greet you as one of their own.", 'They say your name is known in The Hague.'],
  gilden: ['The guilds do not know you.', 'The guilds have heard your name once.', 'The guilds say you are good people.', 'The guild deans speak of you with respect.', 'The guilds call you a friend of the town. They say that of hardly anyone.'],
  kerk: ['The Church does not know who you are.', 'The beguines have heard of you.', 'The beguines pray for you, now and then.', 'The Church speaks well of you, from sexton to dean.', 'In church they say you were sent by God. Or by the dragon. They have not settled it.'],
  kroon: ['The garrison does not know you. Perhaps just as well.', 'The sergeant had your name written down, with nothing beside it.', 'The soldiers say you can be trusted.', 'The Crown is grateful. The sergeant even greets you.', 'They say the governor himself has heard of you.'],
  oudevolk: OV_REP,
  vrije: ['The carters and pedlars do not know who you are.', 'The carters saw you fly. They wonder what you carry.', 'The pedlars say you are one of them, half and half.', 'The smugglers call you a friend. Do not tell the toll-keeper.', 'Every carter between here and Antwerpen knows your name, and keeps his mouth shut.'],
};
export const REP_DEEDS: { t: string; if: string }[] = [
  { if: 'bells_ring', t: 'Everyone knows you made the bells ring again.' },
  { if: 'seals_reported', t: 'They know you reported the widow Vranckx. Some think that was right, but not everyone.' },
  { if: 'seals_begijnhof', t: 'They know you sent Lijsbet Vranckx to the beguines. They call that human.' },
  { if: 'seals_warned', t: 'They whisper that you let the forger go.' },
  { if: 'toll_bribe', t: 'And about the brandy everyone knows. Everyone.' },
  { if: 'roelof_done', t: 'In Kaggevinne they say your name at table, since the business with Lambrecht de Rode.' },
  { if: 'kludde_done', t: 'And the business with the Kludde: they tell that to the children.' },
  ...OV_REP_DEEDS,
];

export const WORK = [
  'Work? There is always something on the notice board at the market. {what}', "I'd say: the notice board. Or see who is standing about with a worried face. {what}",
  'Someone always needs help, if you look. {what}', 'Work for a strong arm? {what}', "I have no work, I've none myself. But {what}",
  'The crier knows who is wanted. And the notice board. {what}', 'Hm. {what} Go and look.',
  'For those who want to work, there is work. For those who want to be paid, it is harder. {what}', 'My cousin looked for work and found a wife. You might find work. {what}',
  "Work doesn't lie in the street. Except today: {what}", 'Ask the gatekeepers. Or: {what}', 'I know something. {what}',
];

export const FOOD = {
  open: ['I have apples, cheese and a piece of bread. All fresh from the farm, or nearly.', "What's in my basket? Everything a person needs, except money.", "Look. My cheese is the best at the market, says my husband. He's a cheese farmer.", 'A stranger pays the same as a burgher here. A dragon pays double.'],
};
export const FOOD_GOODS = [
  { id: 'appel', name: 'An apple', text: 'You feel a little better at once.', price: 1, use: { heal: 0.15 } },
  { id: 'kaas', name: 'A piece of cheese', text: 'The cheese slowly restores your health during a fight. You keep it in your bag.', price: 2, use: { regen: 0.018, secs: 30 } },
  { id: 'eieren', name: 'Two boiled eggs', text: 'You feel a good deal better at once.', price: 2, use: { heal: 0.35 } },
] as const;

/** After an answer: the way back to the menu. */
export const MORE = ['I want to ask something else.', 'I have another question.', 'What else do you know?'];
export const BYE = ['Thank you. Goodbye.', "Thank you. I'll be going.", 'Good. Day.'];
export const BYE_REPLY = ['Goodbye. Mind the carts.', 'Farewell. And keep that beast of yours in check.', 'Good day.', 'God be with you.', 'Mind how you go.', 'Go in peace.'];

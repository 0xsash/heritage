// De Kroniek: everything the player has learned about Brabant in 1650.
// Entries unlock by doing things in the world (reaching a place, meeting a
// person, killing a creature, reading a notice) and every entry says plainly
// what kind of knowledge it is: history, folk tale, or invented for this game.
// That label is the game's promise: the towns and their past are real, the
// monsters are what people then believed in, and the dragon is ours.

import { LORE } from '../world/lore';

export type Truth = 'geschiedenis' | 'volksverhaal' | 'verzonnen';
export type Cat = 'plaats' | 'tijd' | 'mens' | 'wezen';

export const TRUTH: Record<Truth, { name: string; note: string }> = {
  geschiedenis: { name: "History", note: "This is how it was, or how the archives record it." },
  volksverhaal: { name: "Folk tale", note: "This is what people told one another." },
  verzonnen: { name: "Invented", note: "This part we made up." },
};
export const CATS: Record<Cat, string> = { plaats: "Places", tijd: "Times and customs", mens: "People", wezen: "Creatures" };

export interface Entry {
  id: string;
  cat: Cat;
  title: string;
  text: string;
  truth: Truth;
  /** shown while the entry is still locked */
  hint: string;
  /** a page about something the player has to find first (Het Oude Volk): not listed, not counted, until unlocked */
  secret?: boolean;
}

/** A notice, a stone, a thing you can read in the world: reading it unlocks an entry. */
export interface Readable {
  entry: string;
  /** what the prompt calls it */
  label: string;
  at: [number, number];
  /** what stands there (default: a notice board) */
  kind?: 'board' | 'stone' | 'cannon' | 'pillory';
}

// Places whose card tells a legend or something we made up (the rest is history). Every place card is
// history now: the Tafelronde card says what the folk call it, and the roots of the oak have their own page.
const PLACE_TRUTH: Record<string, Truth> = {};

const places: Entry[] = Object.entries(LORE).map(([key, l]) => ({
  id: `plaats:${key}`,
  cat: 'plaats',
  title: l.title,
  text: l.text,
  truth: PLACE_TRUTH[key] ?? 'geschiedenis',
  hint: "Go there, on foot or on the dragon.",
}));

const tijd: Entry[] = [
  { id: 'tijd:klokken', cat: 'tijd', truth: 'geschiedenis', title: "The bells rule", hint: "Read the bell ordinance at Sint-Sulpitius.",
    text: "A town lives by its bells. The work bell opens and closes the day, the gate bell the gates; the ban bell calls the citizens out for fire or alarm. Whoever walks the streets after curfew without a lantern pays a fine. A town that cannot hear its bells no longer knows when to be afraid." },
  { id: 'tijd:laken', cat: 'tijd', truth: 'geschiedenis', title: "The cloth seal", hint: "Read the board at the Cloth Hall.",
    text: "As in every cloth town, each length is measured and judged. If it passes, the waardijn pinches a lead seal onto it bearing the town arms. Two hundred years ago that bit of lead was the word of Diest: buyers far over the border trusted it without ever seeing the weaver. Few buyers come now." },
  { id: 'tijd:kaak', cat: 'tijd', truth: 'geschiedenis', title: "The pillory", hint: "Look at the pillory on the Grote Markt.",
    text: "Whoever weighs false, steals or slanders stands in the pillory for a market day, his crime on a board round his neck. The shame is the sentence. The rotten cabbages are a gift from the neighbours." },
  { id: 'tijd:tol', cat: 'tijd', truth: 'geschiedenis', title: "The toll tariff", hint: "Read the toll board at the Putterstraatpoort.",
    text: "Every gate has its tariff: so many stuivers a barrel of beer, a sack of salt, an ox. Twenty stuivers make one gulden, which folk still call a florijn. Burghers of the town pay nothing. That is why everyone at the gate suddenly knows a burgher." },
  { id: 'tijd:schutters', cat: 'tijd', truth: 'geschiedenis', title: "The militia guilds", hint: "Read the guild board on the practice field by the Schaffensepoort.",
    text: "Sint-Sebastiaan has shot the longbow since 1388; the kolveniers shoot the firelock. The guilds man the walls when they must. When they need not, they shoot the popinjay off its pole and drink to the year's king." },
  { id: 'tijd:vrede', cat: 'tijd', truth: 'geschiedenis', title: "The Peace of Munster", hint: "Read the proclamation on the town hall.",
    text: "In 1648 the King of Spain made peace with the Republic in the north, after eighty years. The Scheldt stayed closed to seagoing ships, and Antwerpen went on paying the price. The war with France goes on regardless, and the soldiers who fight it have to eat somewhere." },
  { id: 'tijd:1635', cat: 'tijd', truth: 'geschiedenis', title: "The year 1635", hint: "Read the stone in the town wall by the Schaluinpoort.",
    text: "Fifteen years ago a French army and a Dutch one marched through Brabant together. Tienen was sacked and burned. Diest surrendered, and the Spanish took it back the same year. Whoever was a child then still flinches at drums." },
  { id: 'tijd:hollegriet', cat: 'tijd', truth: 'verzonnen', title: 'Holle Griet', hint: "Look at the great cannon of Diest.",
    text: "A wrought-iron bombard, too heavy to move and too old to trust. She fired stone balls the size of a cheese. This Holle Griet we made up, but such giants really stood in many towns, like the Dulle Griet in Gent." },
  { id: 'tijd:berchmans', cat: 'tijd', truth: 'geschiedenis', title: 'Jan Berchmans', hint: "Read the plaque on the shoemaker's house, by the market.",
    text: "Jan Berchmans was a Diest shoemaker's son, born in 1599. He became a Jesuit and died in Rome in 1621, twenty-two years old. In Rome they already call him a saint. In Diest they say he was a good boy, and he always said good morning." },
  { id: 'tijd:bier', cat: 'tijd', truth: 'geschiedenis', title: "The beer of Diest", hint: "Read the sign at the brewers' house, north of the market.",
    text: "Diest has brewed since anyone can remember, and drinks much of its own beer. The rest goes down the Demer in barrels, the brewers say, as far as Mechelen and Antwerpen. They also say the excise pays for the town walls, so every pint is an act of civic duty." },
  { id: 'tijd:demer', cat: 'tijd', truth: 'geschiedenis', title: "The Demer", hint: "Read the gauge stone by the water gate on the Demer.",
    text: "The river is the town's road, its miller and its sewer. In wet years the Broek floods up to the walls, and people tell each other what comes out of the water then, and what never comes out again." },
  { id: 'tijd:garnizoen', cat: 'tijd', truth: 'geschiedenis', title: "The garrison", hint: "Read the billeting order by the Beverenpoort.",
    text: "The king's soldiers are billeted on the citizens, who must give them a bed, fire, light and salt. Their pay comes months late or never. A soldier without pay becomes first a thief, then a deserter." },
  { id: 'tijd:baron', cat: 'tijd', truth: 'geschiedenis', title: "The baron in the cradle", hint: "Read the notice on the door of the Hof van Nassau.",
    text: "The lord of Diest is the Prince of Orange. This autumn's news: Prince Willem II died of the smallpox, and eight days later his son was born. The baron of Diest lies in a cradle in Den Haag, and others rule in his name." },
  { id: 'tijd:bedevaart', cat: 'tijd', truth: 'geschiedenis', title: "The pilgrimage", hint: "Read the pilgrims' board in Scherpenheuvel.",
    text: "Pilgrims walk here from all of Brabant and go round the church praying, as their grandparents walked three times round the old oak. They take home a pilgrim badge or a paper pennant. Whoever is healed leaves the crutches behind. The innkeeper, the chandler and the cobbler grow no poorer for it." },
  { id: 'tijd:zeven', cat: 'tijd', truth: 'geschiedenis', title: "The town of seven", hint: "Read the memorial stone on the church at Scherpenheuvel.",
    text: "The Archdukes had Scherpenheuvel laid out with seven corners, round a seven-sided church, to a plan by Wenceslas Cobergher. Around the church the trees stand in a seven-pointed star. The whole town is meant as a prayer. Whether enough people will ever come to live in it is another matter." },
  { id: 'tijd:wortels', cat: 'tijd', truth: 'verzonnen', title: "The roots of the oak", hint: "Ask the pilgrims' guide whether the church really hums.",
    text: "The roots of the oak were never dug out, and they are still growing, under the altar at Scherpenheuvel. Whoever stays in the church at night feels them humming through the floor. That we invented: no chronicle says the church hums." },
  { id: 'tijd:draken', cat: 'tijd', truth: 'verzonnen', title: "Dragons in Brabant", hint: "You are sitting on one.",
    text: "You will find dragons in no archive. The land itself is as it was: the streets, the walls, the churches, the war. The dragon we added. The people of 1650 would have been less surprised by him than you think." },
  { id: 'tijd:klank', cat: 'tijd', truth: 'verzonnen', title: "The power of bronze", hint: "Make the bells of Diest ring again.",
    text: "People truly believed that the ringing of bells drove off storms, plague and devils: bells were baptised and given names. That a bell-ringer can fell enemies with them is our invention. We did not have to invent much." },
];

const mensen: Entry[] = [
  { id: 'mens:neelke', cat: 'mens', truth: 'verzonnen', title: 'Neelke', hint: "She is your little sister.",
    text: "Neelke is your little sister. She counted everything: steps, stars, the strokes of the bell, so the world couldn't walk off. On the night the bells of Diest fell silent, the water took her. What the water takes, it sometimes gives back." },
  { id: 'mens:pieter', cat: 'mens', truth: 'verzonnen', title: 'Pieter Vandenbempt', hint: "Speak to the sexton of Sint-Sulpitius.",
    text: "Pieter is the sexton of Sint-Sulpitius. He rings the bells, digs the graves, and knows of every soul in Diest when they were baptised and what they still owe the church wardens." },
  { id: 'mens:marieke', cat: 'mens', truth: 'verzonnen', title: 'Marieke Smets', hint: "Speak to the pedlar on the Grote Markt.",
    text: "Marieke is a pedlar. She sells anything that fits in a basket and buys anything you want rid of, at half the price. She knows the news a day before it happens." },
  { id: 'mens:joos', cat: 'mens', truth: 'verzonnen', title: "Master Joos Peeters", hint: "Speak to the dean of the weavers.",
    text: "Joos is dean of the weavers' craft. He guards the seal of Diest as if it were his own honour, and so it is. He has not woven a thread himself in years." },
  { id: 'mens:aleydis', cat: 'mens', truth: 'verzonnen', title: "Sister Margriet", hint: "Speak to the begijn in the Begijnhof.",
    text: "Margriet is a begijn and nurses the sick. She knows every herb in the garden and every pilgrim badge in Brabant. She has taken no vows that stop her saying what she thinks." },
  { id: 'mens:drossaard', cat: 'mens', truth: 'verzonnen', title: 'Jonker Hendrik van Gorp', hint: "Speak to the drossaard.",
    text: "He is the drossaard of Diest: the baron's man, who keeps the peace and collects the fines. He serves a lord in the north and a king in the south, and he sleeps badly for it." },
  { id: 'mens:wouter', cat: 'mens', truth: 'verzonnen', title: 'Wouter Claes', hint: "Speak to the toll-keeper at the Putterstraatpoort.",
    text: "Wouter keeps the toll at the Putterstraatpoort. He counts barrels, carts and oxen, and he likes to count them in his own favour." },
  { id: 'mens:lijsbet', cat: 'mens', truth: 'verzonnen', title: 'Lijsbet Vranckx', hint: "Speak to the weaver's widow.",
    text: "Lijsbet is a weaver's widow. The craft took her husband's loom from her; now she weaves on an old one at the back of the house. Her children left home long ago. Her debts did not. That is what poverty looks like in a cloth town." },
  { id: 'mens:gielis', cat: 'mens', truth: 'verzonnen', title: 'Gielis "de Ton"', hint: "Speak to the carter outside the west gate.",
    text: "He is a carter, he says. His cart runs mostly at night, and his barrels are on no toll list." },
  { id: 'mens:driesen', cat: 'mens', truth: 'verzonnen', title: "Farmer Jan Driesen", hint: "Speak to the farmer in Kaggevinne.",
    text: "Driesen farms at Kaggevinne. In thirty years he has watched three armies cross his field, and he loved all three of them equally." },
  { id: 'mens:truyken', cat: 'mens', truth: 'verzonnen', title: 'Truyken', hint: "Speak to the stallholder in Scherpenheuvel.",
    text: "She sells little figures of oak at the foot of the pilgrimage church, and remembers every face that buys one." },
  { id: 'mens:provost', cat: 'mens', truth: 'verzonnen', title: "Father Jan Cools", hint: "Speak to the superior of Scherpenheuvel.",
    text: "Jan Cools is superior of the Oratorians, the fathers of Scherpenheuvel. He is a learned man who runs the shrine the way a general runs a campaign: with lists." },
];

const wezens: Entry[] = [
  { id: 'wezen:deserteur', cat: 'wezen', truth: 'geschiedenis', title: "Deserters", hint: "Defeat one.",
    text: "Soldiers without pay and without a banner. They live on what the farmers have, and take it with the sword they were meant to protect those farmers with. They wind up wide before they strike: wait for the red glow, roll aside, then strike back." },
  { id: 'wezen:musketier', cat: 'wezen', truth: 'geschiedenis', title: "Musketeers", hint: "Defeat one.",
    text: "Loading a musket takes half a minute, two hands and a burning match. Then it shoots through armour. Never run straight at them, and give them no time to reload." },
  { id: 'wezen:broekhond', cat: 'wezen', truth: 'verzonnen', title: "Marsh hounds", hint: "Defeat one.",
    text: "Black, wet and thin, with eyes like lanterns. The Kludde could be a dog when he wished, but folk never gave him a pack. That we made up. They are quick but weak: keep them before your sword, never behind your back." },
  { id: 'wezen:dwaallicht', cat: 'wezen', truth: 'volksverhaal', title: "Will-o'-the-wisps", hint: "Defeat one.",
    text: "Little blue flames above the marsh. People said they were the souls of unbaptised children, luring travellers into the bog. Whoever followed one never came home. They throw fire from afar, so get in close." },
  { id: 'wezen:kludde', cat: 'wezen', truth: 'volksverhaal', title: "The Kludde", hint: "Find him in the Broek.",
    text: "Brabant and Flanders both knew him, but most of the tales were written down along the Dender and the Scheldt: in Lebbeke, Wichelen, Herdersem and Aalst. He is whatever he likes: a starved horse, a dog or a cat, with two blue flames dancing ahead of him. He torments travellers and vanishes into the water. That he lives in the Demer is our invention." },
  { id: 'wezen:roelof', cat: 'wezen', truth: 'verzonnen', title: 'Lambrecht de Rode', hint: "Look for him on the Galgenberg.",
    text: "He was a captain in the king's army, he says. His men say he was an ensign. When the pay stopped coming, he began levying his own tax on the road to Scherpenheuvel. We invented him, but there were plenty of men like him." },
];

export const ENTRIES: Entry[] = [...places, ...tijd, ...mensen, ...wezens];
const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

/** More pages, written elsewhere (src/content/diest_life.ts: what guides and townsfolk teach). */
export function addEntries(list: Entry[]) {
  for (const e of list) {
    if (BY_ID.has(e.id)) continue;
    ENTRIES.push(e);
    BY_ID.set(e.id, e);
  }
}

/** Things to read in and around Diest (positions are adjusted to open ground when placed). */
export const READABLES: Readable[] = [
  { entry: 'tijd:klokken', label: "the bell ordinance", at: [22, 44] },
  { entry: 'tijd:kaak', label: "the pillory", at: [-10, -14], kind: 'pillory' },
  { entry: 'tijd:laken', label: "the inspection board", at: [84, 34] },
  { entry: 'tijd:vrede', label: "the proclamation", at: [-50, 30] },
  { entry: 'tijd:berchmans', label: "the plaque", at: [48, -40] },
  { entry: 'tijd:tol', label: "the toll board", at: [-108, 362] },
  { entry: 'tijd:schutters', label: "the guild board", at: [520, -560] },
  { entry: 'tijd:1635', label: "the stone", at: [-52, -676], kind: 'stone' },
  { entry: 'tijd:hollegriet', label: "the great cannon", at: [150, 62], kind: 'cannon' },
  { entry: 'tijd:bier', label: "the sign", at: [-8, -118] },
  { entry: 'tijd:demer', label: "the gauge stone", at: [-290, -52], kind: 'stone' },
  { entry: 'tijd:garnizoen', label: "the order", at: [330, 580] },
  { entry: 'tijd:baron', label: "the notice", at: [300, 162] },
  { entry: 'tijd:bedevaart', label: "the pilgrims' board", at: [-5020, 560] },
  { entry: 'tijd:zeven', label: "the memorial stone", at: [-5040, 500], kind: 'stone' },
];

export interface KroniekEvents {
  /** a new entry: toast it and pay the reward */
  unlocked(e: Entry, count: number, total: number): void;
  /** every tenth entry */
  milestone(count: number, total: number): void;
}

export class Kroniek {
  constructor(private store: { kroniek: string[] }, private ev: KroniekEvents, private save: () => void) {}

  /** what the player can see exists: every page, except secret ones not found yet */
  private shown(e: Entry) {
    return !e.secret || this.has(e.id);
  }
  get total() {
    return ENTRIES.filter((e) => this.shown(e)).length;
  }
  get count() {
    return this.store.kroniek.filter((id) => BY_ID.has(id)).length;
  }
  has(id: string) {
    return this.store.kroniek.includes(id);
  }
  entry(id: string) {
    return BY_ID.get(id);
  }
  list(cat: Cat) {
    return ENTRIES.filter((e) => e.cat === cat && this.shown(e));
  }

  /** Learn something. Returns the entry when it is new. */
  unlock(id: string, quiet = false): Entry | null {
    const e = BY_ID.get(id);
    if (!e || this.has(id)) return null;
    this.store.kroniek.push(id);
    this.save();
    if (!quiet) this.ev.unlocked(e, this.count, this.total);
    if (this.count % 10 === 0) this.ev.milestone(this.count, this.total);
    return e;
  }

  /** A line of lore the player already knows (for loading screens and gossip), or any place card. */
  tip(r = Math.random()): Entry {
    const known = ENTRIES.filter((e) => this.has(e.id) && e.cat !== 'mens');
    const pool = known.length >= 4 ? known : ENTRIES.filter((e) => e.cat === 'tijd' && e.truth === 'geschiedenis' && !e.secret);
    return pool[Math.floor(r * pool.length)];
  }
}

/** Words of the time, explained where they are used (hover in a conversation or the Kroniek). */
export const GLOSSARY: Record<string, string> = {
  drossaard: "The lord's officer: he keeps the peace and collects the fines.",
  schepen: "One of the town's governors and judges.",
  schepenen: "The town's governors and judges.",
  schepenbank: "The court and council of a town or village.",
  begijn: "A devout woman living in a begijnhof, without permanent vows.",
  begijnen: "Devout women living in a begijnhof, without permanent vows.",
  koster: "He keeps the church and rings the bells.",
  deken: "The elected head of a craft guild or a chapter.",
  ambacht: "The guild of all the masters of one trade. Whoever is not in it may not practise the trade.",
  poorter: "A citizen with town rights: he pays no toll at his own gate.",
  florijn: "A gulden: twenty stuivers. A day's wage is ten to twelve stuivers.",
  florijnen: "Guldens: twenty stuivers each. A day's wage is ten to twelve stuivers.",
  stuiver: "The everyday coin. Twenty stuivers make a gulden; a day's wage is ten to twelve stuivers.",
  stuivers: "The everyday coin. Twenty stuivers make a gulden; a day's wage is ten to twelve stuivers.",
  overste: "The cleric at the head of a religious house or order.",
  oratorianen: "Priests who live together without monastic vows. They have served Scherpenheuvel since 1624.",
  waardijn: "The inspector who measures and seals cloth.",
  huik: "A long black hooded cloak, worn by respectable women.",
  landvoogd: "He governs the Netherlands in the name of the King of Spain.",
  klepel: "The iron heart of a bell, which strikes the bronze.",
  klepels: "The iron hearts of the bells, which strike the bronze.",
  broek: "Low, wet land along the river: marsh.",
  soldij: "A soldier's pay.",
  inkwartiering: "Soldiers lodged in citizens' homes, at the citizen's cost.",
  lakenzegel: "The lead seal that vouches for the quality of Diest cloth.",
  schutterij: "The armed guilds that guard the town.",
  tollenaar: "He collects the toll at the gate.",
};

/** Words that also have an everyday meaning: glossed only right after these words (the Broek: the marsh, not trousers). */
const GLOSS_AFTER: Record<string, RegExp> = { broek: /(^|[^\p{L}])(the|het)\s+$/iu };

const GLOSS_RE = new RegExp(`(^|[^\\p{L}])(${Object.keys(GLOSSARY).sort((a, b) => b.length - a.length).join('|')})(?![\\p{L}])`, 'giu');

/** Mark the period words in a piece of (already escaped) text, once each. */
export function gloss(html: string) {
  const seen = new Set<string>();
  return html.replace(GLOSS_RE, (m, pre: string, word: string, at: number, all: string) => {
    const k = word.toLowerCase();
    if (seen.has(k)) return m;
    const after = GLOSS_AFTER[k];
    if (after && !after.test(all.slice(Math.max(0, at - 12), at + pre.length))) return m;
    seen.add(k);
    return `${pre}<span class="gl" tabindex="0" data-g="${GLOSSARY[k].replace(/"/g, '&quot;')}">${word}</span>`;
  });
}

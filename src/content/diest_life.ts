// Daily life in Diest, 1650: who sells what, who points the way, what there is to do in the
// streets and what hangs on the notice board. What is true is filed as history; what the
// people told, as folklore; what we added ourselves, as invented (see Truth in
// src/rpg/kroniek.ts). The names of the sellers, guides and watchmen are invented.
//
// Positions are local metres from the Grote Markt (x east, z south); the game
// moves each stall and person to the nearest open ground.

import type { FactionId } from '../rpg/factions';
import type { Good, JobTemplate, Page, ServiceDef, Topic } from '../life/types';

// ===================================================================== services
// The Grote Markt is the triangle between the Zoutstraat, the Schepenhuis and the
// road south; its middle is about (-38, 98).
export const MARKET_CENTRE: [number, number] = [-38, 98];

export const SERVICES: ServiceDef[] = [
  // ------------------------------------------------------------ the market
  {
    id: 'bakker', name: 'Jan Verhoeven', role: 'baker', faction: 'gilden', at: [-51, 91], stall: 'bread', glyph: '⚖', label: 'Baker', market: true,
    look: { body: 'man_stout', wear: { hair_crop: 'h_blond', smock: 'linen', belt: null, cap_flat: 'linen', breeches: 'brown', stockings: 'linen', clogs: null }, prop: 'bread' },
    shop: 'bakker',
    greet: ["Bread from this morning, or yesterday's if you'd rather pay less.", 'Rye is for the stomach and currant bread for the heart. Pie is for men going to fight.', 'A hungry soldier is a poor soldier. A hungry dragon rider is a danger to my stall.'],
    shopGreet: ["Whatever you buy goes in your bag. When a fight turns bad, you'll eat it without thinking. Everyone does.", 'The schepenen set what bread costs. I set how it tastes.'],
  },
  {
    id: 'kruiden', name: 'Wanne Coels', role: 'herbwife', faction: 'vrije', at: [-46, 109], stall: 'herbs', glyph: '❦', label: 'Herbwife', market: true,
    look: { body: 'woman_old', wear: { hair_bun: 'h_grey', coif: null, bodice: 'moss', kerchief: null, skirt: 'brown', apron: 'linen', clogs: null }, prop: 'basket' },
    shop: 'kruiden',
    greet: ["Wormwood, chamomile, comfrey. And salve, for those who won't wait for the chamomile to work.", 'The begijnen sell their salve with a blessing. I sell mine without, and cheaper.', 'What do you need? Something for the fever, for the pain, or for a mother-in-law?'],
    shopGreet: ["Don't ask where I pick it. I pick it where it still grows, and that is further out every year."],
  },
  {
    id: 'drukker', name: 'Lucas Haeck', role: 'bookseller', faction: 'gilden', at: [-31, 111], stall: 'books', glyph: '✒', label: 'Bookseller', market: true,
    look: { body: 'man_old', wear: { hair_thin: 'h_grey', beard_pointed: 'h_grey', skullcap: 'black', doublet: 'black', collar_band: null, breeches: 'black', stockings: 'black', shoes: null } },
    shop: 'drukker',
    greet: ['Maps, almanacs, song sheets and proclamations, printed in Leuven and Antwerpen.', 'A print of a place is nearly as good as having been there. Nearly, I say.', "Whoever reads knows the road. Whoever doesn't must ask for it. I only earn from the first."],
    shopGreet: ['A map shows where a thing lies. An almanac says when to go. A song sheet lies, but it lies beautifully.'],
  },
  {
    id: 'kleermaker', name: 'Cornelis Mertens', role: 'master tailor', faction: 'gilden', at: [-24, 99], stall: 'cloth', glyph: '✂', label: 'Tailor', market: true,
    look: { body: 'man', wear: { hair_long: 'h_chestnut', moustache: 'h_chestnut', hat_wide: 'woad_dk', doublet: 'violet', collar_band: null, breeches: 'violet', stockings: 'white', shoes: null } },
    shop: 'kleermaker',
    greet: ['Doublets, jerkins, and dye for your cloak. It needs it, if I may be honest.', 'True Diest cloth is hardly woven any more. What I still have, I cut myself.', 'A good cloak keeps off the rain, and what people say.'],
    shopGreet: ['Woad comes from the south, madder from Zeeland, and weld from round the corner. Black is dearest, because dyeing black is an art.'],
  },
  {
    id: 'smid', name: 'Gillis Bosmans', role: 'weaponsmith', faction: 'gilden', at: [-27, 85], stall: 'iron', glyph: '⚒', label: 'Weaponsmith', market: true,
    look: { body: 'man_stout', wear: { hair_crop: 'h_black', beard_full: 'h_black', smock: 'umber', belt: null, breeches: 'brown', stockings: 'grey', boots: null }, prop: 'sword' },
    shop: 'smid',
    greet: ['Smallswords, rapiers, and a battle sword for strong arms. All Diest iron. Well, the iron is from Liège and the fire is from Diest.', "Let me see your sword. That's no sword now. It was one, once.", "I don't forge for deserters. I forge for those who stop them."],
    shopGreet: ["The better the guild knows you, the better the steel I show you. That's not greed. That's caution."],
  },
  {
    id: 'omroeper', name: 'Rombout Smolders', role: 'town crier', faction: 'gilden', at: [-39, 97], stall: 'crier', glyph: '♫', label: 'Crier', market: true, guide: 'crier',
    look: { body: 'man', wear: { hair_long: 'h_brown', beard_pointed: 'h_brown', hat_wide: 'madder', plume: 'white', doublet: 'madder', collar_band: null, breeches: 'madder_dk', stockings: 'white', shoes: null }, prop: 'staff' },
    greet: ['Hear, see and keep silent, they say. That last part is no use to a crier.', 'I cry what the schepenen tell me to cry. What I hear myself costs a pint.', 'I bring news from Diest, from Brabant and from the world. In that order, because that is what the town pays me for.'],
  },
  // ------------------------------------------------------------ around town
  {
    id: 'notaris', name: 'Master Adriaan Wellens', role: 'notary', faction: 'kroon', at: [-58, 42], stall: 'door', glyph: '✍', label: 'Notary', guide: 'notary',
    look: { body: 'man_old', wear: { hair_long: 'h_white', beard_pointed: 'h_white', hat_wide: 'black', doublet: 'black', collar_band: null, breeches: 'black', stockings: 'black', shoes: null } },
    greet: ['Here for a deed, a will, or an explanation? Explanations are free. The rest you pay for.', 'The Council of Brabant admitted me, so I know how matters stand here. Ask.', 'You want to know something. I can see it. People who want to know nothing walk faster.'],
  },
  {
    id: 'waard', name: 'Mattheus Ceulemans', role: 'landlord of De Zwaan', faction: 'gilden', at: [-14, -112], stall: 'beer', glyph: '♣', label: 'Inn De Zwaan', shop: 'waard', guide: 'inn',
    look: { body: 'man_stout', wear: { hair_thin: 'h_brown', moustache: 'h_brown', smock: 'linen', belt: null, breeches: 'russet', stockings: 'grey', clogs: null } },
    greet: ["Welcome to De Zwaan. Beer, a bed, and a storyteller who doesn't know when to stop.", 'The beer is local, the bed is mine, and the dice are mostly honest.', 'Sit. Everyone who comes in here has a story. Yours starts at the river. I can see it in your face.'],
    shopGreet: ['Diest beer: you drink it here, or you drink it in Antwerpen at twice the price.'],
  },
  {
    id: 'infirmerie', name: 'Sister Machteld', role: 'salve-maker of the Begijnhof', faction: 'kerk', at: [705, -341], stall: 'salves', glyph: '✚', label: 'Infirmary',
    look: { body: 'woman_stout', wear: { hair_bun: 'h_brown', habit: 'beguine', beguine_veil: null, shoes: null }, prop: 'basket' },
    shop: 'infirmerie',
    greet: ["The infirmary is for the sick of the hof. The salve is for whoever needs it. That's you, by the look of it.", 'Sister Margriet says you can be trusted. Sister Margriet says that of very few.', 'Sit. No, not there. A cow sat there.'],
    shopGreet: ["What you pay goes to the sick, and you go home well. That's a fair trade."],
  },
  {
    id: 'sergeant', name: 'Sergeant Alonso Ruiz', role: 'quartermaster of the garrison', faction: 'kroon', at: [326, 556], stall: 'army', glyph: '⚔', label: 'Quartermaster', shop: 'sergeant',
    look: { body: 'man', wear: { hair_crop: 'h_black', moustache: 'h_black', morion: null, doublet: 'madder_dk', buff_coat: null, sash: 'madder', breeches: 'umber', stockings: 'grey', boots: null }, prop: 'musket' },
    greet: ["Not a soldier, then. A citizen with a dragon. For my paperwork, that's worse.", 'The king pays late. I sell what the king no longer needs, to those who pay on time.', "I have jerkins, cuirasses and morions. The garrison has more of them than men. Don't ask me why."],
    shopGreet: ['Army goods, a little used. The hole in this cuirass was there when I got it, I swear.'],
  },
  {
    id: 'kastelein', name: 'Daneel Vander Borcht', role: 'castellan of the Hof van Nassau', faction: 'oranje', at: [300, 128], stall: 'door', glyph: '♜', label: 'Hof van Nassau', shop: 'kastelein',
    look: { body: 'man_old', wear: { hair_thin: 'h_grey', beard_pointed: 'h_grey', hat_wide: 'umber', doublet: 'ochre', collar_band: null, breeches: 'brown', stockings: 'grey', shoes: null }, prop: 'lantern' },
    greet: ['I keep the house warm for a lord who never comes. Thirty-seven years now. The keys have grown heavier.', 'This is the Hof van Nassau. It belongs to the prince, say the papers. The mice have lived here far longer than he has.', "Here for the baron? He lies in his cradle in The Hague. I'll tell him you called."],
    shopGreet: ["This is what the Hof still has to sell. Don't ask the drossaard where the money goes. He doesn't know himself."],
  },
  // ------------------------------------------------------------ gatekeepers
  {
    id: 'poort_antwerpen', name: 'Jaspar Jacobs', role: 'gatekeeper, Schaluinpoort', faction: 'kroon', at: [-62, -690], stall: 'door', glyph: '⚑', label: 'Gatekeeper', guide: 'gate', gate: 'Antwerpsepoort',
    look: { body: 'man', wear: { hair_crop: 'h_dark', beard_full: 'h_dark', morion: null, doublet: 'woad_dk', bandolier: null, breeches: 'grey', stockings: 'grey', boots: null }, prop: 'lantern' },
    greet: ['This is the Schaluinpoort. North lie the Kempen, and walk long enough and you reach Antwerpen.', "Halt. No, never mind. I don't stop a man with a dragon.", 'At dusk the gate shuts. Since the bells fell silent, I decide when that is.'],
  },
  {
    id: 'poort_schaffen', name: 'Wouter Peeters', role: 'gatekeeper, Schaffensepoort', faction: 'kroon', at: [575, -622], stall: 'door', glyph: '⚑', label: 'Gatekeeper', guide: 'gate', gate: 'Schaffensepoort',
    look: { body: 'man_young', wear: { hair_crop: 'h_blond', morion: null, doublet: 'moss', bandolier: null, breeches: 'brown', stockings: 'grey', boots: null } },
    greet: ["This is the Schaffensepoort. Beyond it you'll find heath, sheep, and whatever else lives on the heath.", 'Coming from the market? Bring something next time. Nothing has happened here in years.', 'I count everyone who comes in. You count double, with that beast.'],
  },
  {
    id: 'poort_koe', name: 'Lenaert Vos', role: 'watchman at the old Koepoort', faction: 'kroon', at: [724, 80], stall: 'door', glyph: '⚑', label: 'Wall watch', guide: 'gate', gate: 'Koepoort',
    look: { body: 'man_stout', wear: { hair_thin: 'h_grey', moustache: 'h_grey', hat_wide: 'umber', doublet: 'russet', breeches: 'umber', stockings: 'grey', boots: null }, prop: 'stick' },
    greet: ['The old Koepoort has been walled up a long time. From the wall I count the cows in the Broek, twice a day.', 'Behind the wall lies the Broek. By day it is pretty. By night it is as if the Broek counts me.', "You smell of dragon. That's a new smell on this wall, and I know them all."],
  },
  {
    id: 'poort_maastricht', name: 'Andries Wouters', role: 'gatekeeper, Beverenpoort', faction: 'kroon', at: [338, 594], stall: 'door', glyph: '⚑', label: 'Gatekeeper', guide: 'gate', gate: 'Maastrichtsepoort',
    look: { body: 'man', wear: { hair_long: 'h_dark', moustache: 'h_dark', morion: null, doublet: 'madder_dk', bandolier: null, breeches: 'grey', stockings: 'grey', boots: null } },
    greet: ["This is the Beverenpoort. You pay toll on wine, salt and anything with wheels. A dragon has no wheels. They're still debating it.", 'The road runs from here to Hasselt and Maastricht. Mind the marshes at Webbekom.', "The garrison lies close by. If you hear the soldiers singing, don't join in. They don't know the words."],
  },
  {
    id: 'poort_leuven', name: 'Jacob Smets', role: 'gatekeeper, Putterstraatpoort', faction: 'kroon', at: [-108, 368], stall: 'door', glyph: '⚑', label: 'Gatekeeper', guide: 'gate', gate: 'Leuvensepoort',
    look: { body: 'man_young', wear: { hair_crop: 'h_chestnut', morion: null, doublet: 'woad', bandolier: null, breeches: 'woad_dk', stockings: 'grey', boots: null } },
    greet: ['This is the Putterstraatpoort. From here you go to Leuven and the university, and on to Brussel and the governor.', 'Wouter the toll-man stands there. He counts and I watch. Between the two of us we make a gate.', "The road to Leuven is good. So is the road back, unless you're a lawyer."],
  },
  {
    id: 'poort_allerheiligen', name: 'Hendrik Coeckx', role: 'gatekeeper, Allerheiligenpoort', faction: 'kroon', at: [-310, 66], stall: 'door', glyph: '⚑', label: 'Gatekeeper', guide: 'gate', gate: 'Allerheiligenpoort',
    look: { body: 'man_old', wear: { hair_thin: 'h_white', beard_full: 'h_white', hat_wide: 'brown', doublet: 'grey', breeches: 'brown', stockings: 'grey', boots: null }, prop: 'stick' },
    greet: ['This is the Allerheiligenpoort. West you follow the Demer to Aarschot, or to Scherpenheuvel if you want to pray.', "I've stood here thirty years. I've watched armies come and go. A dragon, I hadn't seen yet.", 'The chapel outside is for travellers. Pray there before you leave. It costs nothing.'],
  },
  {
    id: 'poort_demer', name: 'Pauwel Geens', role: 'keeper of the water gate on the Demer', faction: 'kroon', at: [-298, -56], stall: 'door', glyph: '⚑', label: 'Gatekeeper', guide: 'gate', gate: 'Demerpoort',
    look: { body: 'man', wear: { hair_crop: 'h_red', beard_pointed: 'h_red', morion: null, doublet: 'slate', bandolier: null, breeches: 'grey', stockings: 'grey', boots: null } },
    greet: ['This is the water gate on the Demer. Here the river enters the town, with everything it carries.', 'I guard a gate no man can pass through. Only the water comes in.', "That night the water stood an ell higher than it should. And it hadn't rained. Not a drop."],
  },
  // ------------------------------------------------------------ Scherpenheuvel
  {
    id: 'tekens', name: 'Lysken Mols', role: 'seller of pewter tokens', faction: 'kerk', at: [-5032, 568], stall: 'badges', glyph: '✪', label: 'Pilgrim tokens', shop: 'tekens',
    look: { body: 'woman', wear: { hair_bun: 'h_red', coif: null, bodice: 'woad', kerchief: null, pelerine: 'grey', skirt: 'russet', clogs: null }, prop: 'basket' },
    greet: ['I sell tokens of Our Lady, in tin, in lead, and in silver for those who can afford it.', "Truyken mostly sells figurines, and I mostly tokens. We're rivals, and we're cousins.", "With a token on your hat everyone knows where you've been. With a dragon beside you, nobody looks at your hat."],
    shopGreet: ['Wear it on your heart or on your hat. Your pocket will do too, but then nobody sees it.'],
  },
  {
    id: 'pelgrimsgids', name: 'Father Willem Pauwels', role: 'Oratorian and guide to the pilgrims', faction: 'kerk', at: [-5032, 478], stall: 'door', glyph: '✝', label: 'Pilgrim guide', guide: 'pilgrims',
    look: { body: 'man', wear: { hair_thin: 'h_brown', skullcap: 'black', habit: 'black', bands: null, shoes: null }, prop: 'rosary' },
    greet: ['Welcome to Scherpenheuvel. You come to pray, to look, or to fly. All three are allowed.', "Pilgrims walk round the church praying, as is the custom. With a dragon that's soon done.", 'I explain what stands here and why. The prior explains what it costs.'],
  },
];

/** The notice board on the market. */
export const BOARD = { id: 'aanplakbord', name: 'The notice board', at: [-33, 87] as [number, number], glyph: '☰', label: 'Notice board' };

/** Named people from diest.ts who belong to a party (and Marieke's shop). */
export const NPC_FACTION: Record<string, FactionId> = {
  pieter: 'kerk', marieke: 'vrije', joos: 'gilden', aleydis: 'kerk', drossaard: 'oranje', wouter: 'kroon',
  lijsbet: 'vrije', gielis: 'vrije', driesen: 'vrije', truyken: 'kerk', provost: 'kerk',
};
export const MARIEKE = { id: 'marieke', shop: 'marieke', glyph: '⚖', label: 'Peddler' };

/** What finishing a quest does for your standing, beyond the standing its reward names (by outcome). */
export const QUEST_STANDING: Record<string, [FactionId, number][] | Record<string, [FactionId, number][]>> = {
  main_bells: [['kerk', 8]],
  main_kludde: [['kerk', 10], ['gilden', 6]],
  side_herbs: [['kerk', 3]],
  side_roelof: [['kroon', 8], ['vrije', 5]],
  side_wisps: [['kerk', 4]],
  contract_letter: [['oranje', 6]],
  walk_diest: [['gilden', 6]],
  side_seals: {
    reported: [['gilden', 6], ['oranje', 5], ['vrije', -4]],
    begijnhof: [['kerk', 6], ['gilden', -2]],
    warned: [['vrije', 8], ['gilden', -3], ['kroon', -2]],
  },
  side_toll: {
    paid: [['kroon', 6]],
    bribed: [['vrije', 8], ['kroon', -5]],
    seized: [['kroon', 8], ['vrije', -5]],
  },
  // Het Oude Volk (src/content/oudevolk.ts): helping them costs you with De Kerk, and the other way round
  ov_tekens: [['oudevolk', 10]],
  ov_eik: [['oudevolk', 12], ['kerk', -4]],
  ov_broek: [['oudevolk', 14]],
  ov_dof: {
    volk: [['oudevolk', 22], ['kerk', -10]],
    kerk: [['kerk', 12], ['oudevolk', -6]],
    genoemd: [['kerk', 16], ['oudevolk', -30]],
  },
  ov_leuven: [['oudevolk', 10]],
};

// ===================================================================== wares
/** Cloak dyes (the period's dyestuffs). */
const DYES: [string, string, string, number, number][] = [
  // id, name, colour, price, tier
  ['dye_meekrap', 'Madder red', '#8c2a1e', 4, 0],
  ['dye_wede', 'Woad blue', '#33507a', 4, 0],
  ['dye_russet', 'Rust brown', '#6e4630', 3, 0],
  ['dye_wouw', 'Weld yellow', '#b89040', 6, 1],
  ['dye_groen', 'Woad-and-weld green', '#4e6a38', 8, 1],
  ['dye_rose', 'Rose red', '#a8584a', 8, 2],
  ['dye_zwart', 'Deep black', '#1e1c20', 14, 2],
  ['dye_violet', 'Violet', '#5a3a62', 16, 3],
  ['dye_scharlaken', 'Scarlet', '#b0201a', 24, 4],
];

export const GOODS: Record<string, Good[]> = {
  bakker: [
    { id: 'roggebrood', name: 'Rye bread', text: 'Slowly restores health in a fight. It goes in your bag.', price: 2, use: { regen: 0.015, secs: 30 } },
    { id: 'krentenbrood', name: 'Currant bread', text: 'Sweeter, and it works faster. It goes in your bag.', price: 4, use: { regen: 0.022, secs: 30 } },
    { id: 'wafel', name: 'Waffle', text: 'You feel a little better at once. Nobody saves a waffle for later.', price: 1, use: { heal: 0.2 } },
    { id: 'vleespastei', name: 'Meat pie', text: 'For those about to fight: heals a great deal, spread over half a minute.', price: 8, tier: 1, use: { regen: 0.03, secs: 30 } },
    { id: 'peperkoek', name: 'Honey gingerbread', text: "Only for the baker's best customers. Heals you almost completely.", price: 14, tier: 3, use: { regen: 0.04, secs: 30 } },
  ],
  kruiden: [
    { id: 'zalf', name: 'Salve', text: 'Wound salve in a pot. Use it with Q.', price: 5, use: { salve: 1 } },
    { id: 'zalf3', name: 'Three pots of salve', text: 'Cheaper per pot.', price: 13, tier: 1, use: { salve: 3 } },
    { id: 'kamille', name: 'Chamomile infusion', text: 'Heals over half a minute. It keeps in your bag.', price: 2, use: { regen: 0.015, secs: 30 } },
    { id: 'alsem', name: 'Wormwood in brandy', text: 'It tastes bitter. For a few minutes the blows hurt less.', price: 6, tier: 1, use: { buff: 'moed', secs: 180 } },
    { id: 'duivelsdrek', name: "Devil's dung", text: "It stinks so badly that the Kludde won't have you, in whatever shape he comes. So the farmers say. It makes you braver, at any rate.", price: 10, tier: 2, use: { buff: 'moed', secs: 420 } },
  ],
  infirmerie: [
    { id: 'zalf', name: 'Beguine salve', text: 'Restores half your health. Use it with Q (gamepad: d-pad down).', price: 6, use: { salve: 1 } },
    { id: 'zalf3', name: 'Three pots of beguine salve', text: 'For those who fight a lot, or fight badly.', price: 15, use: { salve: 3 } },
    { id: 'verzorging', name: 'Be tended', text: 'A sister binds your wounds. After that you are fully healed.', price: 2, use: { heal: 1 } },
    { id: 'wijwater', name: 'Holy water', text: 'A blessing for the road: for ten minutes the blows land softer.', price: 6, tier: 1, use: { buff: 'zegen', secs: 600 } },
    { id: 'zalf5', name: 'Five pots, for a friend of the hof', text: 'Only for those who have helped the Begijnhof.', price: 20, tier: 2, use: { salve: 5 } },
    { id: 'rozenkrans', name: 'Rosary of the Begijnhof', text: 'A talisman. The sisters say prayer helps. Toughness helps too.', price: 30, tier: 3, use: { talisman: 'rozenkrans_begijn' } },
  ],
  drukker: [
    { id: 'kaart_diest', name: 'Map of Diest', text: "An engraving of the town, with the churches, the gates and the Warande. You'll see them on your map afterwards.", price: 8, use: { reveal: ['Lakenhalle', 'Stadhuis Diest', 'Hof van Nassau', 'Den Drossaerd', 'Ruïne Warandekasteel', 'Tafelrondmotte', 'Onze-Lieve-Vrouwekerk', 'Sint-Catharinakerk', 'Refugiehuis van Averbode', 'Het Spijker - Refugiehuis van Tongerlo'] } },
    { id: 'kaart_poorten', name: 'The gates of Diest', text: "A print of every gate of Diest and the roads that leave them. You'll see them on your map afterwards.", price: 6, use: { reveal: ['Antwerpsepoort', 'Schaffensepoort', 'Koepoort', 'Maastrichtsepoort', 'Leuvensepoort', 'Allerheiligenpoort', 'Demerpoort'] } },
    { id: 'kaart_demer', name: 'Map of the Demer valley', text: "The villages and chapels round Diest, and the Galgenberg of Kaggevinne. You'll see them on your map afterwards.", price: 10, tier: 1, use: { reveal: ['Webbekom', 'Sint-Trudokerk', 'Kaggevinne', 'Veldkapel Galgeberg', 'Allerheiligenkapel'] } },
    { id: 'prent_scherpenheuvel', name: 'Print of Scherpenheuvel', text: 'The seven-sided town, with the church at its heart. This becomes a page in your Kroniek.', price: 6, use: { kroniek: ['tijd:zeven', 'plaats:Scherpenheuvel'] } },
    { id: 'almanak', name: 'Almanac for the year 1650', text: 'Feast days, fairs, the weather, and when to let blood. This becomes a page in your Kroniek.', price: 3, use: { kroniek: ['tijd:almanak'] } },
    { id: 'liedblad', name: 'Song sheet: The Kludde of the Broek', text: 'A song for the market, with a picture. This becomes a page in your Kroniek.', price: 2, use: { kroniek: ['wezen:kludde'] } },
    { id: 'pamflet_vrede', name: 'Pamphlet on the Peace of Munster', text: 'What was signed in 1648, and what was not. This becomes a page in your Kroniek.', price: 3, use: { kroniek: ['tijd:vrede'] } },
    { id: 'berchmans', name: 'The Life of Jan Berchmans', text: "A thin book about the cobbler's son of Diest who died in Rome like a saint. This becomes a page in your Kroniek.", price: 4, use: { kroniek: ['tijd:berchmans'] } },
    { id: 'tijdingen', name: 'News from the World', text: 'A news sheet from Antwerpen, with reports from England, France and Portugal. This becomes a page in your Kroniek.', price: 4, tier: 1, use: { kroniek: ['tijd:wereld'] } },
    { id: 'wapenboek', name: 'Armorial of the Nassaus', text: 'How the lords of Diest became princes of Orange. This becomes a page in your Kroniek.', price: 9, tier: 2, use: { kroniek: ['tijd:nassau'] } },
  ],
  kleermaker: DYES.map(([id, name, hex, price, tier]) => ({ id, name: `Dye: ${name}`, text: 'Dyes your cloak this colour.', price, tier, use: { cloak: hex } })),
  waard: [
    { id: 'pint', name: 'A pint of Diest beer', text: 'For three minutes the blows hurt a little less.', price: 1, use: { buff: 'moed', secs: 180 } },
    { id: 'hutsepot', name: 'A bowl of hutsepot', text: 'Hot food. You are fully healed at once.', price: 3, use: { heal: 1 } },
    { id: 'kamer', name: 'A bed for the night', text: 'You rest: fully healed, and for a quarter of an hour you heal on your own, even in a fight.', price: 4, use: { buff: 'uitgerust', secs: 900 } },
    { id: 'brandewijn', name: 'A glass of brandy', text: 'No excise was paid on this, whispers the landlord. Ten minutes of courage.', price: 4, tier: 2, use: { buff: 'moed', secs: 600 } },
  ],
  tekens: [
    { id: 'wijwater', name: 'Bottle of holy water', text: 'Blessed at the altar. For a quarter of an hour the blows land softer.', price: 4, use: { buff: 'zegen', secs: 900 } },
    { id: 'insigne', name: 'Tin badge of Scherpenheuvel', text: 'A talisman to pin on your hat.', price: 8, use: { talisman: 'insigne_tin' } },
    { id: 'vaantje', name: "Paper pilgrim's banner", text: 'A small print of Our Lady. This becomes a page in your Kroniek.', price: 2, use: { kroniek: ['tijd:bedevaart'] } },
    { id: 'eikbeeld', name: 'Oak figurine', text: "It isn't from the real oak, Lysken admits, but from a good one.", price: 22, tier: 1, use: { talisman: 'beeldje_eik' } },
    { id: 'zilver', name: 'Silver badge', text: 'Only for those in good standing with the Church.', price: 45, tier: 2, use: { talisman: 'insigne_zilver' } },
    { id: 'gewijd', name: 'Blessed badge', text: 'It touched the altar, on the spot where the oak stood. Only for friends of the prior.', price: 80, tier: 3, use: { talisman: 'insigne_gewijd' } },
  ],
  marieke: [
    { id: 'zalf', name: 'Beguine salve', text: 'Restores half your health. Use it with Q (gamepad: d-pad down).', price: 6, use: { salve: 1 } },
    { id: 'wafel', name: 'Waffle', text: 'She always keeps a few in her basket. Nobody knows why.', price: 1, use: { heal: 0.2 } },
  ],
  kastelein: [
    { id: 'wapenboek', name: 'Armorial of the Nassaus', text: 'How the lords of Diest became princes of Orange. The page on 1568 has been torn out. This becomes a page in your Kroniek.', price: 8, use: { kroniek: ['tijd:nassau'] } },
    { id: 'kaart_diest', name: 'Old map of the barony', text: "Drawn for the previous prince, but the streets still hold. You'll see the places of Diest on your map afterwards.", price: 7, use: { reveal: ['Lakenhalle', 'Stadhuis Diest', 'Hof van Nassau', 'Den Drossaerd', 'Ruïne Warandekasteel', 'Tafelrondmotte', 'Onze-Lieve-Vrouwekerk', 'Sint-Catharinakerk', 'Refugiehuis van Averbode', 'Het Spijker - Refugiehuis van Tongerlo'] } },
    { id: 'penning', name: 'Nassau medal', text: 'A copper medal with the hunting horn of Orange. A talisman for those in good standing with the Hof.', price: 30, tier: 2, use: { talisman: 'penning_nassau' } },
  ],
  sergeant: [
    { id: 'kruit', name: 'A swig from the field flask', text: "Gives you a soldier's courage for five minutes.", price: 2, use: { buff: 'moed', secs: 300 } },
  ],
};

/** Talismans sold in Scherpenheuvel and at the Begijnhof. */
export const TALISMANS: Record<string, { name: string; rarity: 0 | 1 | 2; mods: Record<string, number>; text: string }> = {
  insigne_tin: { name: 'Tin badge', rarity: 0, mods: { taaiheid: 2 }, text: 'It is seven-sided, like the church. It shines when it rains.' },
  beeldje_eik: { name: 'Oak figurine', rarity: 1, mods: { klank: 3, hp: 10 }, text: 'Carved by a man who says he knew the oak.' },
  insigne_zilver: { name: 'Silver badge', rarity: 1, mods: { taaiheid: 3, hp: 18 }, text: 'Silver from Antwerpen, cast in Scherpenheuvel.' },
  insigne_gewijd: { name: 'Blessed badge', rarity: 2, mods: { taaiheid: 4, klank: 4, hp: 25 }, text: 'It touched the altar where the oak stood. It feels warmer than tin should.' },
  penning_nassau: { name: 'Nassau medal', rarity: 1, mods: { list: 3, kracht: 2, hp: 12 }, text: 'The hunting horn of Orange, struck in copper. In Diest you wear it under your shirt.' },
  rozenkrans_begijn: { name: 'Rosary of the Begijnhof', rarity: 2, mods: { taaiheid: 3, hp: 30, list: 2 }, text: 'Fifty beads of palm wood. A sister prayed over every bead for you, she says.' },
};

/** What gear each smith and tailor shows: [slot, rarity floor by tier]. */
export const GEAR_STOCK: Record<string, { slot: 'wapen' | 'harnas' | 'talisman' | null; count: number }> = {
  smid: { slot: 'wapen', count: 3 },
  kleermaker: { slot: 'harnas', count: 2 },
  sergeant: { slot: 'harnas', count: 3 },
  marieke: { slot: null, count: 4 },
};

/** Their best piece, for the highest standing. */
export const SPECIALS: Record<string, { tier: number; base: 'wapen' | 'harnas'; name: string; text: string }[]> = {
  smid: [
    { tier: 3, base: 'wapen', name: 'Diest battle sword', text: 'Forged for the arquebusiers of Diest. Bosmans sells one a year.' },
    { tier: 4, base: 'wapen', name: "Gillis's masterpiece", text: 'The sword that made him a master. He sells it to nobody but you.' },
  ],
  kleermaker: [{ tier: 3, base: 'harnas', name: 'Lined jerkin of Diest cloth', text: "Three layers of cloth and a fourth of leather. The town's lead seal hangs from the hem." }],
  sergeant: [{ tier: 3, base: 'harnas', name: "Captain's cuirass", text: "From a captain who no longer needed it. Don't ask why." }],
};

// ===================================================================== Kroniek pages
export const PAGES: Page[] = [
  { id: 'tijd:oorlog', cat: 'tijd', truth: 'geschiedenis', title: 'The war with France', hint: 'Ask the notary about the war.',
    text: 'Since 1635 the king of Spain has fought France, even after making peace with the Republic in 1648. The armies cross Artois, Hainaut and Flanders, and whoever pays them pays for their plunder too. Brabant lies just behind the front: far enough for peace, near enough for deserters.' },
  { id: 'tijd:ambachten', cat: 'tijd', truth: 'geschiedenis', title: 'The crafts', hint: 'Ask the notary about the guilds.',
    text: 'Whoever wants a trade in town must be a master of the craft: first apprentice, then journeyman, then a masterpiece and a heavy sum of money. The craft decides who may work, how much, and how well. It protects its members. Those who are not members, like a widow without the right, it does not protect.' },
  { id: 'tijd:begijnen', cat: 'tijd', truth: 'geschiedenis', title: 'The begijnen', hint: 'Ask about the begijnen.',
    text: 'Begijnen are devout women who live together without lifelong vows: they may leave the hof and marry. They earn their bread by spinning, weaving and nursing the sick, and every hof has its own infirmary. That they were not nuns made them suspect to the Church for centuries, and beloved of the people.' },
  { id: 'tijd:geld', cat: 'tijd', truth: 'geschiedenis', title: 'Money', hint: 'Ask about money.',
    text: 'Accounts are kept in gulden of twenty stuivers, which the people also call florins. But the purse holds coins from everywhere: Spanish reals, Brabant patakons, Dutch daalders, and a great deal of copper. The moneychanger weighs them and knows what each is worth. A day labourer earns ten to twelve stuivers a day, if he has work.' },
  { id: 'tijd:bestuur', cat: 'tijd', truth: 'geschiedenis', title: 'Who rules', hint: 'Ask about the drossaard and the schepenen.',
    text: 'Diest has a lord, the baron, and he is the prince of Orange. His drossaard keeps order and collects the fines. The schepenen govern the town and give judgment. Above them stands the duke of Brabant, who is the king of Spain. His Council of Brabant in Brussel decides when they disagree. They often do.' },
  { id: 'tijd:almanak', cat: 'tijd', truth: 'geschiedenis', title: 'The almanac', hint: 'Buy an almanac from the bookseller.',
    text: 'Every year the printers of Antwerpen and Leuven print an almanac: the feast days, the fairs, the phases of the moon, the weather to come and the best days for bloodletting. The weather is seldom right. Everyone buys it anyway, for where else does it say when the fair is?' },
  { id: 'tijd:wereld', cat: 'tijd', truth: 'geschiedenis', title: 'News from the world', hint: 'Listen to the crier or buy a news sheet.',
    text: 'Last year, in 1649, the English beheaded their king Charles. In France the nobles rise against Cardinal Mazarin, and the prince of Condé has been in prison since January. Portugal has fought ten years for a king of its own, apart from Spain. The news comes by Antwerpen, in printed sheets, three weeks or so late.' },
  { id: 'tijd:nassau', cat: 'tijd', truth: 'geschiedenis', title: 'The Nassaus and Diest', hint: 'Ask about the prince of Orange.',
    text: 'In 1499 the barony of Diest passed to the house of Nassau, and so William of Orange became its lord. His eldest son, Philip William, grew up in Spain and stayed Catholic. He died in 1618 and lies buried in Sint-Sulpitius. His brothers in the north made war on the king. That is Diest: a town of two lords.' },
  { id: 'tijd:markt', cat: 'tijd', truth: 'geschiedenis', title: 'Market day', hint: 'Talk to the people on the Grote Markt.',
    text: 'On market day the farmers come through the gate with butter, eggs, cheese and vegetables, and pay toll for it. The town checks the weights and fixes the price of bread. Whoever weighs falsely stands in the pillory. Whoever is not of the town may sell only once the burghers have bought.' },
  { id: 'tijd:huisnamen', cat: 'tijd', truth: 'geschiedenis', title: 'Houses with names', hint: 'Look at a signboard in the streets.',
    text: "Houses have no numbers. They have names: De Zwaan, Het Hert, De Gulden Hoorn. The name hangs on a sign or stands in a stone above the door, and that is how you find someone: 'the baker at De Drie Koningen'. We invented the names in these streets, but that such names hung there is true." },
  { id: 'tijd:kapelletjes', cat: 'tijd', truth: 'geschiedenis', title: 'Wayside shrines', hint: 'Pray at a shrine in town.',
    text: 'On street corners, in a niche in a façade or on a post along the road, stands a figure of Mary or a saint. Neighbours set flowers and candles there and pray for a sick person or a journey. Brabant has thousands. Each has its own story, and half of it is true.' },
  { id: 'tijd:putten', cat: 'tijd', truth: 'geschiedenis', title: 'Water', hint: 'Drink from a well in town.',
    text: 'Water comes from the well on the square or nearby, and whoever shares a well shares the upkeep and the quarrels. Whoever can afford it drinks beer, which is safer. The Demer is for the mills, the tanners and the refuse, not for drinking.' },
  { id: 'tijd:poorten', cat: 'tijd', truth: 'geschiedenis', title: 'The gates', hint: 'Speak with a gatekeeper.',
    text: 'The gates open at dawn and close at dusk, at the sign of the gate bell. At the gate toll is levied and it is noted who comes in: in wartime that is a matter of life and death. Whoever arrives after closing waits for morning, or pays the guard.' },
  { id: 'tijd:herberg', cat: 'tijd', truth: 'geschiedenis', title: 'The inn', hint: 'Go into the inn De Zwaan.',
    text: 'In the inn travellers sleep, neighbours drink and business is done. The landlord pays excise on every cask, and the town keeps an eye on who sits late. Dicing for money is forbidden. That it is forbidden is written on a board on the wall, just above the table where the dicing is done.' },
  { id: 'tijd:stadswandeling', cat: 'tijd', truth: 'verzonnen', title: 'A walk through Diest', hint: 'Ask the crier about a walk.',
    text: 'Guided tours for strangers did not exist in 1650: whoever wanted to see a town asked an innkeeper or a sexton. We devised this walk. The stops, and what you hear about them, are real.' },
  // folk tales (the creatures people believed in)
  { id: 'wezen:nekker', cat: 'wezen', truth: 'volksverhaal', title: 'The Nekker', hint: 'Have an old man or woman tell a tale.',
    text: 'A water spirit that lives in rivers, canals and wells and pulls children who come too near the edge into the water. Mothers spoke his name to keep their children away from the water. It worked better than explaining why.' },
  { id: 'wezen:alvermannekes', cat: 'wezen', truth: 'volksverhaal', title: 'Alvermannekes', hint: 'Have an old man or woman tell a tale.',
    text: 'Little men who live in hills and old burial mounds and finish the work of farmers and craftsmen at night, if you leave them in peace and set out a bowl of porridge. Whoever spies on them or mocks them finds everything broken next morning.' },
  { id: 'wezen:weerwolf', cat: 'wezen', truth: 'volksverhaal', title: 'The werewolf', hint: 'Have an old man or woman tell a tale.',
    text: "A person who puts on a wolf's pelt at night and goes over the fields as a wolf. By day you know him by a wound in the same place where you struck the wolf. All over Brabant they told it, and in some regions people were tried for it." },
  { id: 'wezen:oschaert', cat: 'wezen', truth: 'volksverhaal', title: 'The Oschaert', hint: 'Have someone in the inn tell a tale.',
    text: "The Oschaert of Hamme, near Dendermonde, is a spirit with glowing eyes that leaps on the backs of guilty travellers and grows heavier with every step, until they fall at the water's edge. How you get rid of him they tell differently in every village. That you get rid of him, they tell everywhere." },
];

// ===================================================================== the notary's topics
export const TOPICS: Topic[] = [
  { id: 'oorlog', ask: 'The war', page: 'tijd:oorlog', truth: 'geschiedenis',
    answer: 'With the Republic it is peace, since Munster. With France it is war still: it has lasted since 1635 and nobody knows how to stop it. That is why there are soldiers in town, and why deserters walk the roads.' },
  { id: 'oranje', ask: 'The prince of Orange', page: 'tijd:nassau', truth: 'geschiedenis',
    answer: 'The baron of Diest is the prince of Orange, ever since Diest passed to the Nassaus in 1499. Philip William, son of the Silent, lies buried here in Sint-Sulpitius. And now young Prince William has died of smallpox, and his son was born only after his death. Our lord lies in the cradle.' },
  { id: 'gilden', ask: 'The guilds and crafts', page: 'tijd:ambachten', truth: 'geschiedenis',
    answer: 'First you are an apprentice, then a journeyman, then a master. Whoever is not a master of the craft may not practise it, and that is that. It protects quality, say the deans. It protects the deans, say the others. They are both right.' },
  { id: 'klokken', ask: 'The bells', page: 'tijd:klokken', truth: 'geschiedenis',
    answer: 'There is the work bell, the gate bell and the court bell, and the church rings for the hours of prayer and the dead. Whoever does not hear them does not know when the gate closes or when the market opens. A town without bells is a town that keeps no appointments. Not even the old ones.' },
  { id: 'begijnen', ask: 'The begijnen', page: 'tijd:begijnen', truth: 'geschiedenis',
    answer: 'They are devout women without lifelong vows. They may leave the hof and marry, and a few do. The rest spin, weave and nurse the sick. For a notary that is fascinating: they are not nuns, but not entirely of the town either.' },
  { id: 'geld', ask: 'Money', page: 'tijd:geld', truth: 'geschiedenis',
    answer: 'A gulden is twenty stuivers; the people say florin. But your purse holds reals, patakons and daalders all mixed. Have a moneychanger weigh them before you buy anything big. And if someone hands you wet coins, refuse them.' },
  { id: 'garnizoen', ask: 'The garrison', page: 'tijd:garnizoen', truth: 'geschiedenis',
    answer: "They are the king's soldiers, billeted on the citizens. The citizen supplies bed, fire, light and salt. The king supplies pay, when he remembers. Whoever waits too long for his pay goes to collect it from the farmers himself." },
  { id: 'schutters', ask: 'The civic guard', page: 'tijd:schutters', truth: 'geschiedenis',
    answer: "Sint-Sebastiaan shoots with the handbow, and the arquebusiers shoot with the firearm. They guard the walls when they must and shoot the popinjay when they mustn't. Whoever shoots the popinjay is king for a year, and pays for the drink." },
  { id: 'bestuur', ask: 'The drossaard and the schepenen', page: 'tijd:bestuur', truth: 'geschiedenis',
    answer: "The drossaard is the baron's man. The schepenen are the town's men. Together they give judgment, and they seldom agree. When it truly goes wrong, it goes to the Council of Brabant in Brussel. That is where I earn my bread." },
  { id: 'demer', ask: 'The Demer', page: 'tijd:demer', truth: 'geschiedenis',
    answer: "The river drives the mills, carries the beer to Mechelen and takes the refuse away. In wet years the Broek stands flooded to the wall. What people then see come out of the water, I don't write down. What disappears into it, I do, because I am a notary." },
  { id: 'bedevaart', ask: 'Scherpenheuvel', page: 'tijd:bedevaart', truth: 'geschiedenis',
    answer: "The archdukes had a church and a whole town built there, round the spot where an oak with a statuette of Mary stood. Now half of Brabant comes on foot. It lies west, along the road to Aarschot. With a dragon you'll be there before you can say your Hail Mary." },
  { id: 'berchmans', ask: 'Jan Berchmans', page: 'tijd:berchmans', truth: 'geschiedenis',
    answer: "He was a cobbler's son here, born in 1599. He became a Jesuit and died in 1621 in Rome, aged twenty-two. They want him declared a saint. His father still resoled his shoes, they say. That is no proof, but it is a good story." },
  { id: 'kaak', ask: 'Law and the pillory', page: 'tijd:kaak', truth: 'geschiedenis',
    answer: 'For small crimes you get a fine or the pillory, a day on show on the market. For great crimes there is banishment or the gallows. Most justice is not spoken but settled, with me, by a deed and a handshake. That is cheaper for everyone, except the hangman.' },
  { id: 'bier', ask: 'The beer of Diest', page: 'tijd:bier', truth: 'geschiedenis',
    answer: "Diest brews more than it drinks, and it drinks a lot. The beer goes down the Demer to Mechelen and Antwerpen. The excise on it pays for the walls. So every pint is an act of civic duty. I don't say that; the landlord does. But he is right." },
  { id: 'kludde', ask: 'The Kludde', page: 'wezen:kludde', truth: 'volksverhaal',
    answer: "I won't vouch for that, as a notary. My grandmother said: a starved horse, or a dog, or a cat, with two blue flames dancing ahead of him. He torments whoever is out at night and ends in the water. She came from Dendermonde. They tell it better there." },
];

/** The crier's news of 1650 (and of this game). */
export const NEWS: { t: string; truth: 'geschiedenis' | 'verzonnen' }[] = [
  { truth: 'geschiedenis', t: 'From The Hague: Prince William of Orange, the second of that name, has died of smallpox. Eight days later his son was born. The baron of Diest lies in the cradle.' },
  { truth: 'geschiedenis', t: 'From France: the cardinal has had the prince of Condé locked up, and the nobles rise. They call it the Fronde. We call it good news for the king of Spain.' },
  { truth: 'geschiedenis', t: "They say the French marshal Turenne now fights on Spain's side, against his own king. That is how it goes with marshals." },
  { truth: 'geschiedenis', t: 'The governor, Archduke Leopold William, carries on the war against France. If you see soldiers: greet them politely and count your chickens.' },
  { truth: 'geschiedenis', t: 'From England, still: last year they beheaded their own king. Diest has never beheaded anyone grander than a thief.' },
  { truth: 'geschiedenis', t: 'It is two years of peace with the Republic, since Munster. The Scheldt stays shut. Antwerpen weeps, Amsterdam laughs, and Diest sells its beer to whoever pays.' },
  { truth: 'geschiedenis', t: 'Portugal has fought ten years for a king of its own. The king of Spain holds that Portugal already has a king: him.' },
  { truth: 'verzonnen', t: 'By order of the schepenen: whoever walks the street after curfew without a light pays a fine. Whoever walks the street with a dragon, people will talk about.' },
  { truth: 'geschiedenis', t: 'The price of bread stays the same this week, say the schepenen. The bakers say nothing about it, at least not aloud.' },
  { truth: 'geschiedenis', t: 'Pilgrims for Scherpenheuvel: the road by Kaggevinne is not safe. Go in a group, or go with someone who has a sword.' },
  { truth: 'verzonnen', t: 'Seen above the Demer: a dragon with a rider. The schepenen announce that no one need be afraid. Curiosity is permitted.' },
  { truth: 'verzonnen', t: 'Found in the Cloth Hall: a lead seal with too many teeth. Whoever knows more, report to Master Joos, dean of the weavers.' },
  { truth: 'verzonnen', t: "Wanted: messengers, watchmen and strong arms. See the notice board here beside me. Yes, that board, I'm pointing at it." },
  { truth: 'verzonnen', t: 'The ferryman asks news of his boy, gone since the night of the seven strokes. He pays in fish.' },
  { truth: 'geschiedenis', t: "Next month is the fair. Merchants from outside pay stall money, the burghers don't. The burghers are glad. So are the merchants from outside, because they raise their prices." },
];

/** Stops of the town walk (a quest made by src/life/walk.ts). Each line is history, or says that it is not. */
export const WALK: { at: [number, number]; title: string; go: string; line: string }[] = [
  { at: [-38, 98], title: 'The Grote Markt', go: 'Begin on the Grote Markt, by the crier.',
    line: 'A triangular square where the roads from the gates meet. On market day the stalls stand here, on court days the pillory. What the town wants to say is cried here.' },
  { at: [-62, 36], title: 'The Schepenhuis', go: 'Walk to the Schepenhuis, on the north-west side of the market.',
    line: 'Here the schepenen meet and give judgment. Under the house lie old vaulted cellars: the town builds on what it already had.' },
  { at: [10, 44], title: 'Sint-Sulpitius', go: 'Go to the south side of the Sint-Sulpitiuskerk.',
    line: 'The church is built of brown ironstone from the hills round the town. More than two centuries of work went into it, and the tower was never finished. Philip William of Orange, eldest son of William the Silent, lies buried here.' },
  { at: [88, 40], title: 'The Cloth Hall', go: 'On east, to the Cloth Hall.',
    line: "Diest cloth was measured, checked and sealed here, in the centuries when it sold far abroad. The town's seal was its word. That trade is nearly dead now, and the hall stands half empty." },
  { at: [300, 128], title: 'The Hof van Nassau', go: 'Follow the street east to the Hof van Nassau.',
    line: 'This is the house of the Nassaus, lords of Diest since 1499. They never lived here long. Nobody lives here now: the baron lies in his cradle in The Hague.' },
  { at: [420, 40], title: 'The Warande', go: 'Go to the Warande, the hunting park on the hill.',
    line: "This is the lord's hunting park, behind a high wall. On the hill lie the remains of the old castle of the lords of Diest, from before the Nassaus. Whoever poaches here risks the gallows, so the hares are brazen." },
  { at: [500, -40], title: 'The Tafelronde', go: 'A little further lies a green hill: the Tafelronde.',
    line: "This is an old motte, where the first stronghold of the lords of Diest once stood. The people call it the Tafelronde, after King Arthur's knights. That knights ever sat at a round table here is folklore. The hill is real." },
  { at: [636, -318], title: 'The Begijnhof', go: 'End at the gate of the Begijnhof, in the north-east.',
    line: 'A town within the town, with its own streets, its own church and an infirmary. The first begijnen came here around 1245. They take no lifelong vows. They close their gate at dusk, and whoever is late stays outside.' },
];

/** What each gatekeeper tells about his road (and which camp or place to watch for). */
export const GATES: Record<string, { road: string; watch: string; mark: string | null; lore: string }> = {
  Antwerpsepoort: {
    road: 'This road runs north through the Kempen, to Geel and Herentals, and whoever walks long enough reaches Antwerpen. Sand roads through heath and pinewood. On foot it is two days to the Scheldt.',
    watch: 'North-east of here, on the road to Schaffen, deserters lie in wait. Three of them, poorly armed and ill-disposed.', mark: 'schaffen',
    lore: "Fifteen years ago the French army came by this side. The town surrendered. I was there, and I'll say no more.",
  },
  Schaffensepoort: {
    road: "This road goes to Schaffen and on into the heath. Sheep, shepherds and sand. The shooters' practice ground lies close by, inside the wall.",
    watch: 'There are deserters on the road to Schaffen. They rob whoever travels alone. With a dragon you never travel alone, I think.', mark: 'schaffen',
    lore: 'The shooters practise here on the popinjay. If you see an arrow fly, duck first and clap afterwards.',
  },
  Koepoort: {
    road: 'The old Koepoort has long been walled up. East lie the Demer meadows and the Broek, and beyond them Hasselt. The cattle now go out by another gate.',
    watch: "In the Broek, to the south-east, big black dogs roam. They hunt in packs. I don't let the cows wander that far any more.", mark: 'broek',
    lore: 'Outside the wall lie the bleaching fields, where the cloth whitens in the sun. Master Joos watches over it as if it were gold.',
  },
  Maastrichtsepoort: {
    road: 'This road runs south-east, to Sint-Truiden and on to Maastricht. It is a good road, as far as good roads exist.',
    watch: "To the left of the road lies the marsh of Webbekom. The people there stay indoors after dark. They don't say why.", mark: 'broek2',
    lore: "The garrison lies close by. Sergeant Ruiz sells what the army no longer needs, and sometimes what the army hasn't missed yet.",
  },
  Leuvensepoort: {
    road: "This road runs south-west to Leuven with its university, and on to the governor's court in Brussel. Toll is levied at the gate; Wouter knows what each cask costs.",
    watch: 'To the south lies the Galgenberg, where Kaggevinne keeps its gallows. Deserters sit there, with a captain as big as a door.', mark: 'galgeberg',
    lore: "Scholars and lawyers come through this gate, but seldom together. They can't bear each other in the same coach.",
  },
  Allerheiligenpoort: {
    road: 'This road runs west along the Demer, to Aarschot and Scherpenheuvel. Pilgrims take this gate. They pray in the chapel before they leave.',
    watch: "At Kaggevinne, on the road to Scherpenheuvel, highwaymen rob the pilgrims. Further west, in the oak wood, lights wander. Don't follow them.", mark: 'kaggevinne',
    lore: 'The Allerheiligenkapel is older than this gate. Travellers pray there for a safe road. Townsfolk pray there for travellers who still owe them money.',
  },
  Demerpoort: {
    road: 'This is the water gate on the Demer: here the river flows under the wall. It is no road for feet, only for boats, beer and whatever the river carries.',
    watch: "Mind the water. Whoever plays too near the edge is taken by the Nekker, say the mothers. I say it's the current. It comes to the same.", mark: null,
    lore: 'When it rains hard the water stands against the gate. Then the sluice boards go down and we pray they hold.',
  },
};

/** The pilgrims' guide at the church of Scherpenheuvel. */
export const PILGRIM_TOPICS: Topic[] = [
  { id: 'kerk', ask: 'Why seven sides?', page: 'tijd:zeven', truth: 'geschiedenis',
    answer: 'Seven, for the seven joys and seven sorrows of Mary. The church has seven sides and so does the town around it. The trees round the church stand in a seven-pointed star. Master builder Cobergher drew it for the archdukes. The church was consecrated in 1627.' },
  { id: 'eik', ask: 'The oak', page: 'plaats:De Heilige Eik', truth: 'geschiedenis',
    answer: 'An oak stood here with a statuette of Mary in it. People came to pray and healings happened. Shortly after 1600 the bishop had the oak felled. They carved figurines from the wood. The altar stands where the oak stood.' },
  { id: 'rondgang', ask: 'What do the pilgrims do here?', page: 'tijd:bedevaart', truth: 'geschiedenis',
    answer: 'They come on foot, from all over Brabant and beyond. They go round the church, praying, and buy a token or a banner to show at home. Whoever is healed leaves something behind: a crutch, a wax arm, a thank-you. Look at the walls.' },
  { id: 'aartshertogen', ask: 'Who were the archdukes?', page: 'plaats:Scherpenheuvel', truth: 'geschiedenis',
    answer: 'Albert and Isabella. They ruled the Netherlands as sovereigns until Albert died in 1621 and Isabella in 1633. They were pious and they liked to build. This town is their prayer in stone. They had no children, but they had Scherpenheuvel.' },
  { id: 'nacht', ask: 'Does the church really hum at night?', page: 'tijd:wortels', truth: 'verzonnen',
    answer: "So the pilgrims say. I'm asleep then. But one thing I can tell you: the roots of the oak were never dug out, and sometimes, when it is quiet, you feel something through the floor. It is in no chronicle: this part of the tale is invented." },
];

// ===================================================================== the inn
/** The storyteller in De Zwaan: tales that hint where creatures live (camp to point at). */
export const INN_TALES: { t: string; camp: string | null; page?: string }[] = [
  { camp: 'broek', t: 'My cousin herded cows in the Broek, beyond the old Koepoort. One evening he counted one too many: a black one, with eyes like lanterns. Next morning there was one too few. They still roam there, those dogs. Folklore, you say? Ask the cow, then.' },
  { camp: 'broek2', t: 'Further into the marsh, towards Webbekom, the water turns black and the dogs grow bigger. The reed cutters go there only by day, and always three together. Two to cut, one to count whether they are all still there.' },
  { camp: 'eikenbos', t: "In the oak wood east of Scherpenheuvel you see lights dancing, like candles in a procession. Pilgrims follow them, and those pilgrims do not come back. Will-o'-the-wisps, say the old: souls that have lost the way and seek company." },
  { camp: 'kaggevinne', t: "At Kaggevinne, on the road to Scherpenheuvel, men lie in the bushes. They were soldiers once. Now they take the pilgrims' shoes, and sometimes the feet with them. Don't go alone. Or do, with that beast of yours, and bring me a pair of shoes." },
  { camp: 'schaffen', t: 'On the heath at Schaffen lies a handful of deserters. They sold their colours for brandy and their honour for less. Poor devils, but dangerous ones.' },
  { camp: 'galgeberg', t: 'On the Galgenberg the schepenbank of Kaggevinne hangs its thieves. Now thieves sit there whom nobody hangs: Lambrecht the Red and his men. They say the gallows creaks with impatience when he passes.' },
  { camp: null, page: 'wezen:oschaert', t: 'In Hamme they have the Oschaert: he jumps on your back and grows heavier with every step. Round Dendermonde they have the Kludde, and since that night, so do we. The difference? The Kludde rattles his chains, so at least you hear him coming.' },
  { camp: null, page: 'wezen:nekker', t: 'Children, stay away from the Demer, my mother said, or the Nekker will pull you in. I never fell in the Demer. My brother did. He came out again, but he was never quite the same. He became a lawyer.' },
  { camp: null, page: 'wezen:alvermannekes', t: "On the Tafelronde, that green hill in town, alvermannekes live. Set out a bowl of porridge in the evening and your work is done by morning. I tried it. The porridge was gone, but the work wasn't done. The cats, I think." },
  { camp: null, page: 'wezen:weerwolf', t: 'One night a smith in Zichem struck a wolf on the paw with a hammer. Next morning his neighbour limped. That is how it goes with werewolves: by day you know them by the wounds, or by the neighbours.' },
];

/** Dice: what the waard and the players say. */
export const DICE = {
  ask: ['Fancy a game? We throw three dice and the highest throw wins. The stake is one stuiver.', 'You have the face of someone who wants to lose. Will you throw?'],
  win: ["Hm. That's luck, or your dragon is whispering to you. Here is your stuiver.", 'You win. The table falls silent. That is the sound of losers.', "You again. I'm going to take a proper look at those dice."],
  lose: ['You threw too few pips. Thank you for the stuiver.', 'Not your day, but it is mine.', 'The dice are honest, and so am I, today at least.'],
  tie: ["We're level. Nobody wins, not even the landlord, and that is the worst."],
  sign: 'The board above the table says dicing for money is forbidden.',
};

// ===================================================================== the notice board
export const JOBS: JobTemplate[] = [
  {
    id: 'premie_kamp', kind: 'bounty', title: 'Bounty: {campName}',
    notice: 'BOUNTY. Whoever drives out {n} of {camp} at {where} earns a reward from {client}. Coming back alive is proof enough.',
    journal: ['A bounty hung on the notice board: {campName} at {where}. {client} pays whoever drives them out.', 'It is done. Now to let {client} know the road is safe again.'],
    thanks: 'Is it done? Then someone sleeps better tonight, though perhaps not you. Here is your bounty.',
    clients: ['sergeant', 'poort_allerheiligen', 'poort_koe', 'omroeper'],
  },
  {
    id: 'premie_wacht', kind: 'bounty', title: 'Clear the road',
    notice: 'WANTED by the garrison: a strong arm against {camp} at {where}. It concerns {n} of them. Report to {client}.',
    journal: ['The garrison has no men to spare to drive {camp} from {where}. So it seems I must.', 'The road is clear. {client} wants to hear it.'],
    thanks: 'The king thanks you. I pay you. The latter is surer.',
    clients: ['sergeant', 'poort_maastricht', 'poort_schaffen'],
  },
  {
    id: 'bezorg_brood', kind: 'delivery', title: 'A delivery for {to}',
    notice: 'COURIER WANTED to carry {what} from {from} to {to}. It must arrive quickly, dry and whole. Pay on delivery.',
    journal: ['{from} has a parcel ready for {to}: {what}. First I fetch it.', 'I have {what} with me. Now to {to}, before it goes cold.'],
    thanks: 'At last, and all still whole, I see. Here is your pay.',
    clients: ['waard', 'notaris', 'infirmerie', 'sergeant', 'omroeper'],
    goods: ['a basket of loaves', 'a bundle of printed sheets', 'a bundle of herbs', 'a cask of beer', 'a roll of cloth', 'a box of nails'],
    from: ['bakker', 'drukker', 'kruiden', 'waard', 'kleermaker', 'smid'],
  },
  {
    id: 'lees', kind: 'read', title: 'What hangs on the walls',
    notice: 'The crier wants someone who can read. Read {n} proclamations, signs or stones in town and tell him what they say.',
    journal: ['Rombout the crier wants to know what hangs on the walls all over town. He can read it himself, he says, but not everywhere at once.', "I've read enough. Back to the crier on the market."],
    thanks: "So, so. And that's all it says? Then I know what to cry again. Here, for your trouble.",
    clients: ['omroeper'],
  },
  {
    id: 'haal', kind: 'fetch', title: 'Lost: {what}',
    notice: 'LOST {where}: {what}. Whoever returns it to {client} receives a reward. No questions asked.',
    journal: ['{client} has lost {what}, somewhere {where}. It must still be findable. From above I may spot it sooner.', "I've found everything. Now back to {client}."],
    thanks: 'Those are my things. I thought the Kludde had them, for he takes everything these days. Here, and thank you.',
    clients: ['waard', 'kleermaker', 'smid', 'bakker', 'drukker'],
  },
];

/** Where lost things lie (outside the walls, on open ground near a road). */
export const FETCH_SPOTS: { where: string; what: string; at: [number, number][] }[] = [
  { where: 'on the bleaching fields beyond the old Koepoort', what: 'three lengths of cloth', at: [[880, 50], [915, 120], [866, 180]] },
  { where: 'along the road to Schaffen', what: 'three bags of nails', at: [[640, -760], [690, -800], [610, -720]] },
  { where: 'in the meadows along the Demer', what: 'three lost chickens', at: [[960, 200], [1010, 260], [940, 290]] },
  { where: 'along the road to Kaggevinne', what: 'three small casks', at: [[-700, 240], [-760, 280], [-650, 300]] },
  { where: 'at the Allerheiligenkapel, outside the Allerheiligenpoort', what: 'three bundles of books', at: [[-420, 120], [-380, 160], [-460, 80]] },
];

// ===================================================================== the streets
/** House names, as they hung on signs (the names are ours; the custom is real). */
export const SIGN_NAMES = [
  'De Zwaan', 'Het Hert', 'De Gulden Hoorn', 'De Drie Koningen', 'De Rode Leeuw', 'Het Wit Paard', 'De Sterre', 'De Gulden Arend', 'Het Schaakbord',
  'De Pelikaan', 'De Maan', 'Het Vliegend Hert', 'De Blauwe Hand', 'De Gouden Sleutel', 'Het Lam Gods', 'De Drie Haringen', 'De Engel', 'De Kroon',
  'De Wildeman', 'Het Zwart Schaap', 'De Hazewind', 'De Klok', 'De Gulden Pot', 'Het Anker', 'De Rozenhoed', 'De Pauw', 'De Valk', 'Het Rad',
  'De Schaar', 'De Eenhoorn', 'De Kat', 'De Druif', 'De Ketel', 'Sint-Michiel', 'Sint-Maarten', 'De Spiegel', 'Het Kasteel', 'De Lelie',
  'De Drie Ringen', 'Het Gulden Vlies', 'De Molen', 'De Ham', 'Het Hoefijzer', 'De Kroonkraan', 'De Zon', 'De Bijenkorf', 'Het Schip', 'De Os',
];

/** What you notice about a sign ({name}). */
export const SIGN_LINES = [
  'A painted sign on a wrought-iron arm. "{name}". The paint flakes; the name stays.',
  '"{name}", in gold letters. Whoever lives here is proud of the house, or of the painter.',
  'A sign reading "{name}" with a little picture, for those who can\'t read. That\'s half the town.',
  '"{name}". The sign is older than the house. It hung on the previous one, which burned down.',
  'In the stone above the door: "{name}", and a year you can no longer read.',
  '"{name}". Someone has drawn a moustache on it in chalk. It suits the sign.',
  'A signboard: "{name}". It creaks in the wind. The neighbours have given up.',
  '"{name}". That is how you find a house in Diest: not by a number, but by a name.',
  'The sign of "{name}" hangs crooked. Or the house does; hard to say.',
  '"{name}", in red and gold. The owner paid more for it than for his door.',
  'On the sign: "{name}". Beneath, smaller: "Nothing is sold here. Do not knock."',
  'A gable stone: "{name}". The pigeons have added their own decoration.',
];

/** Knock on a door: who answers. */
export const DOOR_LINES = [
  'A woman opens, sees your sword, and shuts the door. Then opens again: "You\'re the one with the dragon. Good day." And shuts it again.',
  'Nobody answers. Inside, someone is being very quiet.',
  'A boy opens: "Mother isn\'t here. Father isn\'t either. Neither am I." He shuts the door.',
  'An old man: "I buy nothing, I sell nothing, and I have no daughter." He does have a dog, which agrees with him.',
  'A maid with flour on her hands: "If you want the baker, he\'s on the market. If you want me: I\'m busy."',
  'A man in his shirt: "Is there a fire? No? Then why are you knocking?"',
  'A woman with a child on her arm: "Are you the new sexton? No? Pity. The old one doesn\'t ring any more."',
  'A weaver with fluff in his beard: "The loom stands still when you knock. Keep it short, please."',
  'You hear a chair scrape, footsteps, and then nothing. An eye regards you through the keyhole.',
  'A billeted soldier of the garrison opens: "This isn\'t my house, I only sleep here. Ask the owner. He\'s in the attic."',
  'A woman hands you an apple without a word and shuts the door. You have no idea why. The apple is good.',
  'A man with ink on his fingers: "A writer has no time. A writer has no money either. What do you want?"',
  'Inside someone calls: "If it\'s the tax man: I\'m dead!" You decide to believe it.',
  'A girl opens, looks past you at the sky, and asks: "Where\'s your dragon?"',
  'A visiting begijn opens: "The sick one is sleeping. Come back later, or never, that\'s allowed too."',
  'A tailor\'s journeyman with pins in his mouth: "Mmf. Mmmf." You understand and leave.',
  'An old woman: "You look hungry. Come in, eat something." You eat something. It is porridge. It is good porridge.',
  "The door isn't locked and swings open by itself. A cat looks at you as if you don't belong here. You close the door again.",
  'A brewer\'s man: "Beer? Not here. This is my mother\'s house. She drinks water, poor woman."',
  'A woman with a broom: "The step has just been swept." She looks at your boots. She looks at the step.',
  'A woman opens, looks at you for a long time and says: "No. I thought you were my son."',
];

/** A shrine in a wall or on a post: what you see when you stop to pray. */
export const SHRINE_LINES = [
  'A little statue of Mary in a niche, with fresh flowers. Someone looks after it.',
  'Sint-Rochus, with his dog and his wound. He helps against the plague. A small candle burns.',
  'A little shrine on a post, with a blue roof. A wax hand hangs from a nail: a prayer that was answered.',
  'Our Lady of Scherpenheuvel, in tin, with a string of beads round her.',
  'Sint-Antonius, with his pig. Farmers pray here for their animals.',
  'A crucifix, weathered by rain. Someone has tucked a green twig beside it.',
  "Sint-Sulpitius, patron of the town, with a bishop's staff. He looks a little stern.",
  'A niche with a Mary and a note: "For my son in the army." No name.',
  'Sint-Barbara, for those who work near gunpowder. Two musket balls lie at her feet.',
  "A shrine with a candle still burning. Someone has just gone before you. She left a child's shoe behind.",
  'Sint-Christoffel, carrying the child over the water. He protects travellers, and so you.',
  'An old figure, sunk crooked. The face has been worn away by the hands that touched it.',
];

export const WELL_LINES = [
  'Fresh water from the well, tasting of rust. You feel better.',
  'The water tastes of iron and stone. It does you good.',
  'A bucket on a chain, and water so cold it hurts your teeth. It tastes wonderful.',
  'Someone has left a wooden cup by the well. You drink, and put it back.',
  "A woman come to fetch water waits politely until you've drunk. Then she waits a little longer, because you have a dragon.",
  'The water is clear. The well is well kept: the neighbours pay for it together.',
  "You drink. A child watches and asks whether dragons drink water too. You honestly don't know.",
  'The pulley squeaks, the bucket comes up. You drink, and you think of the river. You drink anyway.',
  'A leaf floats in the bucket. You drink around it.',
  'It is neither beer nor wine, just water. Sometimes that is best.',
  'You wash the dust from your face and drink. For a moment the town smells less of the town.',
  'The water is cold and good. Scratched on the rim of the well: "Joos drank here, 1621".',
];

// The parties of Brabant in 1650, as the player meets them. You pick a first
// loyalty from the five public ones when you make your character; what you do
// afterwards moves your standing with each. Standing opens doors: prices,
// wares, work, and how people greet you.
//
// A sixth party, Het Oude Volk, is hidden: it cannot be chosen at creation and
// shows in no list until the player has found it (flag `ov_found`, see
// src/life/oudevolk.ts). It lives on FACTIONS as a non-enumerable key, so
// FACTIONS.oudevolk works everywhere while Object.keys(FACTIONS) (the creation
// screen, the standing bars, any list) still gives the five public parties.

export type FactionId = 'gilden' | 'kerk' | 'kroon' | 'oranje' | 'vrije' | 'oudevolk';

/** Helping one of these costs you a little with the other. */
export const RIVALS: [FactionId, FactionId][] = [['kroon', 'oranje'], ['kerk', 'vrije'], ['kerk', 'oudevolk']];

/** Parties that stay out of every list until found (see `isKnown` in src/life/standing.ts). */
export const HIDDEN_FACTIONS: FactionId[] = ['oudevolk'];

export interface FactionDef {
  id: FactionId;
  name: string;
  /** one line for lists */
  tagline: string;
  /** who they are and what they want */
  text: string;
  color: string;
}

const PUBLIC: Record<Exclude<FactionId, 'oudevolk'>, FactionDef> = {
  gilden: {
    id: 'gilden', name: 'De Gilden', tagline: 'Crafts, militia and schepenen', color: '#c9a44e',
    text: 'The town belongs to those who work it. Weavers, brewers and the militia guilds run Diest through their crafts and the schepenbank. They want quiet, honest trade and bells that ring.',
  },
  kerk: {
    id: 'kerk', name: 'De Kerk', tagline: 'Beguines, chapter and pilgrimage', color: '#d8d2c0',
    text: 'The beguines nurse the sick, the chapter keeps the bells, and Scherpenheuvel draws pilgrims from all of Brabant. They know more than they say about what the bells hold back.',
  },
  kroon: {
    id: 'kroon', name: 'De Kroon', tagline: 'The king, the governor, the garrison', color: '#a8443a',
    text: 'Brabant belongs to the King of Spain. His governor sits in Brussel; his soldiers are billeted in the townsfolk\'s houses. They want order, taxes and no surprises. A dragon is a surprise.',
  },
  oranje: {
    id: 'oranje', name: 'Oranje', tagline: 'The baron, his drossaard, his people', color: '#d98a2b',
    text: 'Diest belongs to the Prince of Orange: a Protestant lord in the north over a Catholic town under a Spanish king. His drossaard collects the fines and waits for better times. To serve Oranje is to serve a lord who is never here. Such lords remember a great deal.',
  },
  vrije: {
    id: 'vrije', name: 'De Vrije Lieden', tagline: 'Pedlars, carters, smugglers', color: '#6f8a5a',
    text: 'These are the people with no master and no wish to pay the toll. They know every path around every town wall; they buy anything and sell it on. They do not ask where your dragon came from.',
  },
};

/** The hidden party: ordinary people who keep their grandparents' habits (invented for this game; see the Kroniek). */
export const OUDE_VOLK: FactionDef = {
  id: 'oudevolk', name: 'The Oude Volk', tagline: 'Midwives, reed-cutters and shepherds', color: '#8fa39a',
  text: 'No guild and no church: ordinary people who still do what their grandparents did. They leave milk by the well and knot reeds to the chapel post. They alone in Diest do not want the bells to ring again, because the bells also put the land\'s old guardians to sleep.',
};

export const FACTIONS = PUBLIC as Record<FactionId, FactionDef>;
Object.defineProperty(FACTIONS, 'oudevolk', { value: OUDE_VOLK, enumerable: false });

/** Standing, WoW-style: each tier opens something (prices, wares, work). */
export const TIERS: { at: number; name: string }[] = [
  { at: 0, name: 'Stranger' },
  { at: 10, name: 'Known' },
  { at: 25, name: 'Respected' },
  { at: 50, name: 'Honoured' },
  { at: 90, name: 'Trusted' },
];

export function tierOf(points: number) {
  let t = 0;
  for (let i = 0; i < TIERS.length; i++) if (points >= TIERS[i].at) t = i;
  return { index: t, name: TIERS[t].name, next: TIERS[t + 1]?.at ?? null };
}

/** Older saves kept renown per place; those places belong to a party (state.ts carries it over when it loads one). */
export const RENOWN_TO_FACTION: Record<string, FactionId> = { Diest: 'gilden', Begijnhof: 'kerk', Scherpenheuvel: 'kerk', Kaggevinne: 'vrije' };

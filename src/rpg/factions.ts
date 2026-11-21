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
    id: 'gilden', name: 'De Gilden', tagline: 'Ambachten, schutters en schepenen', color: '#c9a44e',
    text: 'De stad is van wie er werkt. Wevers, brouwers en schutters besturen Diest via hun ambachten en de schepenbank. Ze willen rust, eerlijke handel en klokken die luiden.',
  },
  kerk: {
    id: 'kerk', name: 'De Kerk', tagline: 'Begijnen, kapittel en bedevaart', color: '#d8d2c0',
    text: 'Begijnen verzorgen de zieken, het kapittel bewaart de klokken, en Scherpenheuvel trekt pelgrims uit heel Brabant. Ze weten meer over wat de klokken tegenhouden dan ze zeggen.',
  },
  kroon: {
    id: 'kroon', name: 'De Kroon', tagline: 'De koning, de landvoogd, het garnizoen', color: '#a8443a',
    text: 'Brabant hoort bij de koning van Spanje. Zijn landvoogd zit in Brussel, zijn soldaten liggen bij de burgers in huis. Ze willen orde, belasting en geen verrassingen. Een draak is een verrassing.',
  },
  oranje: {
    id: 'oranje', name: 'Oranje', tagline: 'De baron, zijn drossaard, zijn mensen', color: '#d98a2b',
    text: 'Diest is van de Prins van Oranje: een protestantse heer in het noorden over een katholieke stad onder een Spaanse koning. Zijn drossaard int de boetes en wacht op betere tijden. Wie Oranje dient, dient een heer die er nooit is. Zulke heren onthouden veel.',
  },
  vrije: {
    id: 'vrije', name: 'De Vrije Lieden', tagline: 'Marskramers, voerlui, smokkelaars', color: '#6f8a5a',
    text: 'Dit zijn de mensen die geen meester hebben en geen tol willen betalen. Ze kennen elk pad rond elke stadsmuur, kopen alles en verkopen het verder. Ze vragen niet waar je draak vandaan komt.',
  },
};

/** The hidden party: ordinary people who keep their grandparents' habits (invented for this game; see the Kroniek). */
export const OUDE_VOLK: FactionDef = {
  id: 'oudevolk', name: 'Het Oude Volk', tagline: 'Vroedvrouwen, rietsnijders en herders', color: '#8fa39a',
  text: 'Geen gilde en geen kerk: gewone mensen die nog doen wat hun grootouders deden. Ze zetten melk bij de put en knopen riet aan de kapelpaal. Als enigen in Diest willen ze niet dat de klokken weer luiden, want de klokken laten ook de oude wakers van het land slapen.',
};

export const FACTIONS = PUBLIC as Record<FactionId, FactionDef>;
Object.defineProperty(FACTIONS, 'oudevolk', { value: OUDE_VOLK, enumerable: false });

/** Standing, WoW-style: each tier opens something (prices, wares, work). */
export const TIERS: { at: number; name: string }[] = [
  { at: 0, name: 'Vreemde' },
  { at: 10, name: 'Bekende' },
  { at: 25, name: 'Gezien' },
  { at: 50, name: 'Geëerd' },
  { at: 90, name: 'Vertrouweling' },
];

export function tierOf(points: number) {
  let t = 0;
  for (let i = 0; i < TIERS.length; i++) if (points >= TIERS[i].at) t = i;
  return { index: t, name: TIERS[t].name, next: TIERS[t + 1]?.at ?? null };
}

/** Older saves kept renown per place; those places belong to a party (state.ts carries it over when it loads one). */
export const RENOWN_TO_FACTION: Record<string, FactionId> = { Diest: 'gilden', Begijnhof: 'kerk', Scherpenheuvel: 'kerk', Kaggevinne: 'vrije' };

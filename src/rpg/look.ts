// The hero's looks: what the creation screen offers and how a saved hero
// becomes a figure from the townsfolk kit. Men and women dress in their own
// clothes: every class has three or more outfits per sex, each with a main and
// an accent dye. The kit's manifest `hero` section lists the bodies, hair,
// beards, headwear and mantles; a kit made before those existed still works
// (the hero is then dressed from what that kit has).

import type { OriginId } from './character';
import type { HeroData } from './state';
import type { FolkSpec, TownsfolkKit } from './townsfolk';

export type Sex = 'm' | 'f';

/** Pieces that serve as the hero's travelling cloak, best first: the one that takes the cloak colour. */
export const CLOAK_PIECES = ['mantle', 'mantle_short', 'mantle_hood', 'pelerine', 'huik'];
/** Clips the hero uses that the kit may not have yet (they then come from rider.glb, or a near clip). */
export const HERO_CLIPS = ['jump', 'fall', 'land', 'roll', 'attack3', 'cast', 'ride_idle'];

const BUILD_NAMES: Record<string, string> = {
  man_young: 'Slank', man: 'Gewoon', man_stout: 'Fors', man_old: 'Oud',
  woman_lean: 'Slank', woman: 'Gewoon', woman_stout: 'Fors', woman_old: 'Oud',
};
/** Body order on screen: slim, average, heavy. */
const BUILD_ORDER = ['man_young', 'man', 'man_stout', 'woman_lean', 'woman', 'woman_stout'];
const HAIR_NAMES: Record<string, string> = {
  hair_crop: 'Kortgeknipt', hair_long: 'Lang, met scheiding', hair_thin: 'Dun en grijzend', hair_tail: 'Staartje', hair_bun: 'Knot',
  hair_braid: 'Lange vlecht', hair_m_curly: 'Krullen tot de schouders', hair_m_lovelock: 'Lang, met liefdeslok',
  hair_m_shag: 'Ruig, met pony', hair_m_swept: 'Achterover gekamd', hair_m_fringe: 'Kort, met pony',
  hair_f_curls: 'Pijpenkrullen', hair_f_loose: 'Los en lang', hair_f_twin: 'Twee vlechten', hair_f_crown: 'Vlechtenkroon',
  hair_f_low: 'Lage knot', hair_f_fringe: 'Krulletjes en knot', hair_f_tail: 'Hoge staart',
};
const BEARD_NAMES: Record<string, string> = {
  moustache: 'Snor', beard_pointed: 'Puntbaard', beard_full: 'Volle baard', beard_short: 'Korte baard',
  beard_goatee: 'Sik en snorretje', moustache_wide: 'Brede krulsnor',
};
const HEADWEAR_NAMES: Record<string, string> = {
  hat_wide: 'Brede hoed', hat_tall: 'Hoge hoed', cap_flat: 'Platte muts', cap_knit: 'Gebreide muts', morion: 'Stormhoed',
  hat_pilgrim: 'Pelgrimshoed', coif: 'Witte kap', hat_f: 'Rijhoed', hat_straw: 'Strohoed', bontmuts: 'Bontmuts',
  muts_f: 'Wollen muts',
};
const MANTLE_NAMES: Record<string, string> = { mantle: 'Lang', mantle_short: 'Kort', mantle_hood: 'Met kap' };

export const HAIR_COLORS: [string, string][] = [
  ['h_black', 'Zwart'], ['h_dark', 'Donkerbruin'], ['h_brown', 'Bruin'], ['h_chestnut', 'Kastanje'], ['#5a2a18', 'Roodbruin'],
  ['h_red', 'Rood'], ['#8a7658', 'Asblond'], ['h_blond', 'Blond'], ['#d2b67a', 'Vlasblond'], ['h_grey', 'Grijs'], ['h_white', 'Wit'],
];
export const CLOAKS: [string, string][] = [
  ['#8c2a1e', 'Meekraprood'], ['#2e5a3c', 'Mosgroen'], ['#2f3f66', 'Wedeblauw'], ['#5a3a6a', 'Paars'],
  ['#b0782a', 'Oker'], ['#3a3a3a', 'Zwart'], ['#7a5a3a', 'Bruin'], ['#e8e0d0', 'Ongeverfd'],
];
/** Dyes a clothier in Brabant could sell in 1650: madder, woad, weld and walnut, and the wool as it came off the sheep. */
export const DYES: [string, string][] = [
  ['madder', 'Meekraprood'], ['madder_dk', 'Donkerrood'], ['rose', 'Rozerood'], ['woad', 'Wedeblauw'], ['woad_dk', 'Donkerblauw'],
  ['woad_lt', 'Lichtblauw'], ['moss', 'Mosgroen'], ['green_dk', 'Donkergroen'], ['ochre', 'Oker'], ['saffron', 'Goudgeel'],
  ['russet', 'Roestbruin'], ['brown', 'Bruin'], ['umber', 'Notenbruin'], ['violet', 'Paars'], ['slate', 'Leigrijs'],
  ['grey', 'Grijs'], ['black', 'Zwart'], ['linen', 'Ongeverfd'],
];
export const EYES: [string | null, string][] = [
  [null, 'Zoals geschilderd'], ['#5a3a1e', 'Bruin'], ['#34200f', 'Donkerbruin'], ['#7a6030', 'Hazelaar'], ['#4a6e9e', 'Blauw'],
  ['#7a8692', 'Grijs'], ['#557a48', 'Groen'],
];
export const MARKS: [string | null, string][] = [
  [null, 'Geen'], ['scar', 'Litteken'], ['freckles', 'Sproeten'], ['eyepatch', 'Ooglap'], ['weathered', 'Verweerd'],
];
export const MORPH_NAMES: Record<string, string> = {
  nose_length: 'Neus: lengte', nose_width: 'Neus: breedte', nose_bridge: 'Neusrug', jaw_width: 'Kaak', chin_length: 'Kin',
  cheeks: 'Wangen', brow: 'Wenkbrauwen', eyes: 'Ogen', mouth_width: 'Mond', lips: 'Lippen', face_fat: 'Vol of mager',
};

export const buildName = (b: string, i: number) => BUILD_NAMES[b] ?? `Bouw ${i + 1}`;
export const hairName = (h: string | null) => (h ? HAIR_NAMES[h] ?? h.replace(/^hair_/, '') : 'Kaal');
export const beardName = (b: string | null) => (b ? BEARD_NAMES[b] ?? b.replace(/^beard_/, '') : 'Geen');
export const headwearName = (p: string | null) => (p ? HEADWEAR_NAMES[p] ?? p : 'Niets');
export const mantleName = (p: string) => MANTLE_NAMES[p] ?? p;
export const dyeName = (d: string | null | undefined) => DYES.find(([k]) => k === d)?.[1] ?? 'Eigen kleur';

/** Faces: presets made from the kit's face morphs (values outside a morph's range are clamped by the kit). */
export const FACES: [string, Record<string, number>][] = [
  ['Open', { eyes: 0.3, lips: 0.2, cheeks: 0.1 }],
  ['Scherp', { nose_length: 0.6, nose_bridge: 0.7, jaw_width: -0.5, cheeks: -0.6, chin_length: 0.5, face_fat: -0.5 }],
  ['Breed', { jaw_width: 0.8, nose_width: 0.6, face_fat: 0.4, cheeks: 0.5, mouth_width: 0.4 }],
  ['Fijn', { nose_width: -0.6, nose_length: -0.3, jaw_width: -0.6, lips: 0.5, eyes: 0.5, chin_length: -0.2 }],
  ['Hoekig', { jaw_width: 0.7, chin_length: 0.7, brow: 0.8, cheeks: -0.4, nose_bridge: 0.4 }],
  ['Rond', { face_fat: 0.8, cheeks: 0.8, nose_length: -0.4, chin_length: -0.5, eyes: 0.2 }],
  ['Getekend', { brow: 0.6, nose_bridge: 0.9, nose_length: 0.5, cheeks: -0.8, face_fat: -0.8, lips: -0.5 }],
  ['Zacht', { brow: -0.4, eyes: 0.6, lips: 0.6, nose_length: -0.5, jaw_width: -0.3, face_fat: 0.2 }],
];
/** Two more each, so every sex has ten: faces as the painters of the time saw them. */
export const FACES_BY_SEX: Record<Sex, [string, Record<string, number>][]> = {
  m: [...FACES,
    ['Boers', { nose_width: 0.9, nose_length: 0.3, jaw_width: 0.6, lips: 0.4, face_fat: 0.5, brow: 0.5, eyes: -0.3 }],
    ['Haviksneus', { nose_bridge: 1.0, nose_length: 0.8, nose_width: -0.3, cheeks: -0.5, chin_length: 0.4, eyes: -0.2 }],
    ['Jongensachtig', { eyes: 0.6, nose_length: -0.6, chin_length: -0.4, jaw_width: -0.3, face_fat: 0.3, cheeks: 0.4 }]],
  f: [...FACES,
    ['Sproetig rond', { cheeks: 0.9, nose_length: -0.7, nose_width: -0.2, eyes: 0.5, chin_length: -0.4, face_fat: 0.4 }],
    ['Streng', { brow: 0.7, jaw_width: 0.4, lips: -0.7, mouth_width: -0.4, nose_bridge: 0.5, cheeks: -0.5 }],
    ['Lang en smal', { jaw_width: -0.8, chin_length: 0.8, nose_length: 0.5, cheeks: -0.6, face_fat: -0.6, mouth_width: -0.3 }]],
};
export function faceName(face: Record<string, number>, sex: Sex = 'm') {
  const same = (a: Record<string, number>, b: Record<string, number>) =>
    [...new Set([...Object.keys(a), ...Object.keys(b)])].every((k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0)) < 1e-3);
  const list = FACES_BY_SEX[sex];
  const i = list.findIndex(([, f]) => same(f, face));
  return i >= 0 ? list[i][0] : 'Eigen gezicht';
}

export const NAMES: Record<Sex, string[]> = {
  m: ['Lieven', 'Joris', 'Rombout', 'Gommaar', 'Bartel', 'Arnout', 'Willem', 'Gillis', 'Jacob', 'Adriaan', 'Cornelis', 'Michiel', 'Steven', 'Gerard'],
  f: ['Machteld', 'Clara', 'Katelijne', 'Margriet', 'Barbara', 'Josijne', 'Geertruid', 'Anna', 'Johanna', 'Magdalena', 'Beatrijs', 'Agnes', 'Elisabeth', 'Kathelijn'],
};
export const DRAGONS = ['Gloed', 'Sintel', 'Vonk', 'Brons', 'Goudvleugel', 'Beiaard', 'Demerdraak', 'Gouden Griet', 'Roet', 'Heidebrand'];

// ------------------------------------------------------------------ the class outfits

/** In `wear`, 'main' and 'accent' take the chosen colours; a palette name is fixed; null is as painted. */
export interface Outfit {
  name: string;
  wear: Record<string, string | null>;
  main: string;
  accent: string;
  /** the headwear it comes with (null: bare-headed) */
  hat: string | null;
  prop: string;
}

const O = (name: string, wear: Record<string, string | null>, main: string, accent: string, hat: string | null, prop: string): Outfit => ({ name, wear, main, accent, hat, prop });

/**
 * Three outfits per class and sex. The women's are cut for women (jak, lijfje, rok over onderrok, schort, kraag):
 * no piece a man wears. The first men's outfit of each class is the one the hero wore before there was a choice.
 */
export const OUTFITS: Record<OriginId, Record<Sex, Outfit[]>> = {
  schutter: {
    m: [
      O('Buffelkolder', { doublet: 'main', buff_coat: null, sash: 'accent', breeches: 'slate', stockings: 'grey', boots: null }, 'madder_dk', 'madder', null, 'sword'),
      O('Musketier', { doublet: 'main', collar_band: null, bandolier: null, breeches: 'accent', stockings: 'linen', boots: null }, 'woad_dk', 'slate', 'hat_wide', 'sword'),
      O('Ruiterskazak', { doublet: 'accent', collar_band: null, casaque: 'main', breeches: 'black', stockings: 'grey', boots: null }, 'madder_dk', 'black', 'hat_tall', 'sword'),
    ],
    f: [
      O('Rijjak', { jak: 'main', kraag_f: null, waist_sash: 'madder', onderrok: 'madder', rok: 'accent', boots_f: null }, 'woad_dk', 'black', 'hat_f', 'sword'),
      O('Lijfje en sjerp', { bodice: 'main', kraag_f: null, waist_sash: 'madder', onderrok: 'accent', rok: 'slate', boots_f: null }, 'black', 'ochre', null, 'sword'),
      O('Jak en lange rok', { jak: 'main', kraag_f: null, waist_sash: 'madder', skirt: 'accent', shoes: null }, 'black', 'madder_dk', 'hat_f', 'sword'),
    ],
  },
  klokkenluider: {
    m: [
      O('Wambuis', { doublet: 'main', collar_band: null, breeches: 'accent', stockings: 'linen', shoes: null }, 'woad_dk', 'umber', 'cap_flat', 'bellstaff'),
      O('Leren kolder', { doublet: 'accent', jerkin: null, collar_band: null, breeches: 'main', stockings: 'grey', shoes: null }, 'umber', 'woad', 'cap_flat', 'bellstaff'),
      O('Kiel', { smock: 'main', belt: null, breeches: 'accent', stockings: 'grey', shoes: null }, 'linen', 'brown', 'cap_knit', 'bellstaff'),
    ],
    f: [
      O('Lijfje en schort', { bodice: 'main', kerchief: null, onderrok: 'accent', rok: 'umber', schort: 'linen', shoes: null }, 'woad', 'ochre', 'coif', 'bellstaff'),
      O('Stadsjak', { jak: 'main', kraag_f: null, skirt: 'accent', shoes: null }, 'black', 'woad_dk', 'muts_f', 'bellstaff'),
      O('Werkkleed', { bodice: 'main', kerchief: null, skirt: 'accent', apron: 'linen', clogs: null }, 'moss', 'russet', 'coif', 'bellstaff'),
    ],
  },
  smokkelaar: {
    m: [
      O('Bandelier', { doublet: 'main', bandolier: null, breeches: 'accent', stockings: 'umber', boots: null }, 'umber', 'black', 'hat_wide', 'dagger'),
      O('Kiel en laarzen', { smock: 'main', belt: null, breeches: 'accent', stockings: 'grey', boots: null }, 'grey', 'brown', 'cap_knit', 'dagger'),
      O('Donkere kazak', { doublet: 'accent', casaque: 'main', breeches: 'black', stockings: 'umber', boots: null }, 'green_dk', 'umber', 'hat_wide', 'dagger'),
    ],
    f: [
      O('Reisjak', { jak: 'main', onderrok: 'accent', rok: 'umber', boots_f: null }, 'green_dk', 'ochre', 'hat_f', 'dagger'),
      O('Lijfje en laarzen', { bodice: 'main', kerchief: null, onderrok: 'accent', rok: 'grey', schort: 'grey', boots_f: null }, 'brown', 'madder_dk', 'muts_f', 'dagger'),
      O('Donkere jak', { jak: 'main', kraag_f: null, skirt: 'accent', boots_f: null }, 'black', 'green_dk', 'bontmuts', 'dagger'),
    ],
  },
};

/** What a sex may choose, from the kit's hero section or from what the kit has today. */
export interface HeroOptions {
  bodies: Record<Sex, string[]>;
  hair: Record<Sex, (string | null)[]>;
  beards: (string | null)[];
  headwear: Record<Sex, (string | null)[]>;
  mantles: string[];
  /** false when the kit has no hero section yet (the hero wears what townsfolk wear) */
  heroKit: boolean;
}

export function heroOptions(kit: TownsfolkKit | null): HeroOptions {
  const H = kit?.m.hero;
  const has = (b: string) => !kit || kit.hasBody(b);
  const anyFits = (p: string | null, bodies: string[]) => p === null || !kit || bodies.some((b) => kit.fits(p, b));
  const order = (l: string[]) => [...l].sort((a, b) => BUILD_ORDER.indexOf(a) - BUILD_ORDER.indexOf(b));
  const bodies: Record<Sex, string[]> = {
    m: order((H?.bodies?.m ?? ['man_young', 'man', 'man_stout']).filter(has)),
    f: order((H?.bodies?.f ?? ['woman', 'woman_stout']).filter(has)),
  };
  if (!bodies.m.length) bodies.m = ['man'];
  if (!bodies.f.length) bodies.f = ['woman'];
  const hairM = H?.hair?.m ?? ['hair_long', 'hair_crop', 'hair_tail', 'hair_thin'];
  const hairF = H?.hair?.f ?? ['hair_braid', 'hair_bun'];
  const hair: Record<Sex, (string | null)[]> = {
    m: [...hairM.filter((p) => anyFits(p, bodies.m)), null],
    f: hairF.filter((p) => anyFits(p, bodies.f)),
  };
  if (!hair.f.length) hair.f = [null];
  const beards = [...(H?.beards ?? [null, 'moustache', 'beard_pointed', 'beard_full'])].filter((p) => anyFits(p, bodies.m));
  if (!beards.includes(null)) beards.unshift(null);
  else beards.sort((a, b) => (a === null ? -1 : b === null ? 1 : 0));
  const hw = H?.headwear ?? { m: ['hat_wide', 'cap_flat'], f: ['coif'] };
  const headwear: Record<Sex, (string | null)[]> = {
    m: [null, ...(hw.m ?? []).filter((p) => anyFits(p, bodies.m))],
    f: [null, ...(hw.f ?? []).filter((p) => anyFits(p, bodies.f))],
  };
  const mantles = (H?.mantles ?? ['mantle']).filter((p) => !kit || kit.m.pieces[p]);
  return { bodies, hair, beards: beards.length ? beards : [null], headwear, mantles: mantles.length ? mantles : ['mantle'], heroKit: !!H?.outfits };
}

/** The outfits a class offers this sex in this kit (an older kit lacks the women's pieces: then what it has). */
export function outfitsFor(kit: TownsfolkKit | null, origin: OriginId, sex: Sex): Outfit[] {
  const all = OUTFITS[origin]?.[sex] ?? OUTFITS.schutter[sex];
  if (!kit) return all;
  const body = sex === 'f' ? 'woman' : 'man';
  const ok = all.filter((o) => Object.keys(o.wear).every((p) => kit.fits(p, body)));
  if (ok.length) return ok;
  // a kit from before phase E: the women in bodice and skirt (their own cut, at least), the men as they were
  if (sex === 'f') return [O('Lijfje', { bodice: 'main', kerchief: null, skirt: 'accent', shoes: null }, 'woad_dk', 'black', 'coif', all[0].prop)];
  return [O(all[0].name, Object.fromEntries(Object.entries(kit.m.hero?.outfits?.[origin === 'klokkenluider' ? 'beiaardier' : origin]?.wear ?? {}).map(([k, v]) => [k, v])), all[0].main, all[0].accent, null, all[0].prop)];
}

/** The outfit a saved hero wears (index clamped; old saves have none: the first). */
export function outfitOf(kit: TownsfolkKit | null, h: Pick<HeroData, 'origin' | 'sex'> & { outfit?: number }) {
  const list = outfitsFor(kit, h.origin, h.sex === 'f' ? 'f' : 'm');
  return list[Math.max(0, Math.min(list.length - 1, Math.round(h.outfit ?? 0)))];
}

/** The headwear a hero wears: chosen, or (an older save) the outfit's own when the hat was on. */
export function headwearOf(kit: TownsfolkKit | null, h: Pick<HeroData, 'origin' | 'sex' | 'hat'> & { outfit?: number; headwear?: string | null }) {
  if (h.headwear !== undefined) return h.headwear;
  return h.hat === false ? null : outfitOf(kit, h).hat;
}

/** Hair that would poke through a close cap: hide what lies above the hat band, as under a hat. */
const CAPS = new Set(['coif', 'muts_f', 'bontmuts', 'cap_flat', 'cap_knit']);
const FLAT_HAIR = new Set(['hair_bun', 'hair_braid', 'hair_tail', 'hair_f_crown', 'hair_f_low', 'hair_f_tail', 'hair_f_twin', 'hair_f_fringe']);

/** The kit spec of a saved hero. */
export function heroSpec(kit: TownsfolkKit, h: HeroData): FolkSpec {
  const opts = heroOptions(kit);
  const sex: Sex = h.sex === 'f' ? 'f' : 'm';
  const body = opts.bodies[sex].includes(h.build) ? h.build : opts.bodies[sex][Math.min(1, opts.bodies[sex].length - 1)];
  const outfit = outfitOf(kit, h);
  const main = h.main ?? outfit.main;
  const accent = h.accent ?? outfit.accent;
  const wear: Record<string, string | null> = {};
  for (const [p, dye] of Object.entries(outfit.wear)) wear[p] = dye === 'main' ? main : dye === 'accent' ? accent : dye;
  const hat = headwearOf(kit, h);
  const hide: string[] = [];
  if (hat && kit.fits(hat, body)) {
    wear[hat] = hat === 'coif' ? null : hat === 'hat_straw' ? 'linen' : accentFor(hat, main);
    if (CAPS.has(hat)) hide.push('hair_crown');
  }
  // hair that lies flat (drawn back into a bun, a plait or a tail) stays whole under a hat: nothing of it pokes out
  const flat = h.hair && FLAT_HAIR.has(h.hair) && hat && !CAPS.has(hat);
  // the mantle: the hero's signature, in the chosen style and colour
  const mantle = [h.mantle, kit.m.hero?.mantle?.piece, 'mantle'].find((p) => p && kit.fits(p, body)) ?? null;
  if (mantle) wear[mantle] = h.cloak;
  const hair = h.hair === null && sex === 'm' ? null : h.hair && kit.fits(h.hair, body) ? h.hair : opts.hair[sex].find((p) => p && kit.fits(p, body)) ?? null;
  if (hair) wear[hair] = h.hairColor;
  if (sex === 'm' && h.beard && kit.fits(h.beard, body)) wear[h.beard] = h.hairColor;
  if (h.mark === 'eyepatch' && kit.fits('eyepatch', body)) wear.eyepatch = null;
  const scale = Math.max(0.92, Math.min(1.08, h.height ?? 1));
  return {
    body, wear, prop: outfit.prop, role: 'burgher', face: h.face, skin: h.skin, accent,
    eyes: h.eyes ?? null, mark: h.mark && h.mark !== 'eyepatch' ? h.mark : null, scale, hide, unhide: flat ? ['hair_crown'] : undefined,
  };
}

/** Hats are dark felt; a cap may take the outfit's colour. */
function accentFor(hat: string, main: string) {
  if (hat === 'cap_flat' || hat === 'cap_knit' || hat === 'muts_f' || hat === 'bontmuts') return main === 'linen' ? 'umber' : main;
  if (hat === 'morion') return null;
  return 'black';
}

/** Which piece on the hero takes the cloak colour (for re-dyeing it live). */
export function cloakPiece(spec: FolkSpec) {
  return CLOAK_PIECES.find((p) => p in spec.wear) ?? null;
}

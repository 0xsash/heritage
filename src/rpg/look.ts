// The hero's looks: what the creation screen offers and how a saved hero
// becomes a figure from the townsfolk kit. Men and women dress in their own
// clothes: every class has three or more outfits per sex, each with a main and
// an accent dye. The kit's manifest `hero` section lists the bodies, hair,
// beards, headwear and mantles; a kit made before those existed still works
// (the hero is then dressed from what that kit has).

import { WEAPON_KITS, weaponKind } from './character';
import type { HeroData } from './state';
import type { FolkSpec, TownsfolkKit } from './townsfolk';

export type Sex = 'm' | 'f';

/** Pieces that serve as the hero's travelling cloak, best first: the one that takes the cloak colour. */
export const CLOAK_PIECES = ['mantle', 'mantle_short', 'mantle_hood', 'pelerine', 'huik'];
/** Clips the hero uses that the kit may not have yet (they then come from rider.glb, or a near clip). */
export const HERO_CLIPS = ['jump', 'fall', 'land', 'roll', 'attack3', 'cast', 'ride_idle'];

const BUILD_NAMES: Record<string, string> = {
  man_young: 'Slim', man: 'Average', man_stout: 'Stout', man_old: 'Old',
  woman_lean: 'Slim', woman: 'Average', woman_stout: 'Stout', woman_old: 'Old',
};
/** Body order on screen: slim, average, heavy. */
const BUILD_ORDER = ['man_young', 'man', 'man_stout', 'woman_lean', 'woman', 'woman_stout'];
const HAIR_NAMES: Record<string, string> = {
  hair_crop: 'Cropped', hair_long: 'Long, parted', hair_thin: 'Thin and greying', hair_tail: 'Ponytail', hair_bun: 'Bun',
  hair_braid: 'Long braid', hair_m_curly: 'Shoulder curls', hair_m_lovelock: 'Long, with lovelock',
  hair_m_shag: 'Shaggy, with fringe', hair_m_swept: 'Swept back', hair_m_fringe: 'Short, with fringe',
  hair_f_curls: 'Ringlets', hair_f_loose: 'Loose and long', hair_f_twin: 'Two braids', hair_f_crown: 'Braided crown',
  hair_f_low: 'Low bun', hair_f_fringe: 'Curls and bun', hair_f_tail: 'High tail',
};
const BEARD_NAMES: Record<string, string> = {
  moustache: 'Moustache', beard_pointed: 'Pointed beard', beard_full: 'Full beard', beard_short: 'Short beard',
  beard_goatee: 'Goatee and moustache', moustache_wide: 'Wide curled moustache',
};
const HEADWEAR_NAMES: Record<string, string> = {
  hat_wide: 'Wide hat', hat_tall: 'Tall hat', cap_flat: 'Flat cap', cap_knit: 'Knitted cap', morion: 'Morion',
  hat_pilgrim: 'Pilgrim hat', coif: 'White coif', hat_f: 'Riding hat', hat_straw: 'Straw hat', bontmuts: 'Fur cap',
  muts_f: 'Wool cap',
};
const MANTLE_NAMES: Record<string, string> = { mantle: 'Long', mantle_short: 'Short', mantle_hood: 'Hooded' };

export const HAIR_COLORS: [string, string][] = [
  ['h_black', 'Black'], ['h_dark', 'Dark brown'], ['h_brown', 'Brown'], ['h_chestnut', 'Chestnut'], ['#5a2a18', 'Red-brown'],
  ['h_red', 'Red'], ['#8a7658', 'Ash blond'], ['h_blond', 'Blond'], ['#d2b67a', 'Flaxen'], ['h_grey', 'Grey'], ['h_white', 'White'],
];
export const CLOAKS: [string, string][] = [
  ['#8c2a1e', 'Madder red'], ['#2e5a3c', 'Moss green'], ['#2f3f66', 'Woad blue'], ['#5a3a6a', 'Purple'],
  ['#b0782a', 'Ochre'], ['#3a3a3a', 'Black'], ['#7a5a3a', 'Brown'], ['#e8e0d0', 'Undyed'],
];
/** Dyes a clothier in Brabant could sell in 1650: madder, woad, weld and walnut, and the wool as it came off the sheep. */
export const DYES: [string, string][] = [
  ['madder', 'Madder red'], ['madder_dk', 'Dark red'], ['rose', 'Rose red'], ['woad', 'Woad blue'], ['woad_dk', 'Dark blue'],
  ['woad_lt', 'Light blue'], ['moss', 'Moss green'], ['green_dk', 'Dark green'], ['ochre', 'Ochre'], ['saffron', 'Saffron yellow'],
  ['russet', 'Russet'], ['brown', 'Brown'], ['umber', 'Walnut'], ['violet', 'Purple'], ['slate', 'Slate grey'],
  ['grey', 'Grey'], ['black', 'Black'], ['linen', 'Undyed'],
];
export const EYES: [string | null, string][] = [
  [null, 'As painted'], ['#5a3a1e', 'Brown'], ['#34200f', 'Dark brown'], ['#7a6030', 'Hazel'], ['#4a6e9e', 'Blue'],
  ['#7a8692', 'Grey'], ['#557a48', 'Green'],
];
export const MARKS: [string | null, string][] = [
  [null, 'None'], ['scar', 'Scar'], ['freckles', 'Freckles'], ['eyepatch', 'Eyepatch'], ['weathered', 'Weathered'],
];
export const MORPH_NAMES: Record<string, string> = {
  nose_length: 'Nose: length', nose_width: 'Nose: width', nose_bridge: 'Nose bridge', jaw_width: 'Jaw', chin_length: 'Chin',
  cheeks: 'Cheeks', brow: 'Brows', eyes: 'Eyes', mouth_width: 'Mouth', lips: 'Lips', face_fat: 'Full or lean',
};

export const buildName = (b: string, i: number) => BUILD_NAMES[b] ?? `Build ${i + 1}`;
export const hairName = (h: string | null) => (h ? HAIR_NAMES[h] ?? h.replace(/^hair_/, '') : 'Kaal');
export const beardName = (b: string | null) => (b ? BEARD_NAMES[b] ?? b.replace(/^beard_/, '') : 'Geen');
export const headwearName = (p: string | null) => (p ? HEADWEAR_NAMES[p] ?? p : 'None');
export const mantleName = (p: string) => MANTLE_NAMES[p] ?? p;
export const dyeName = (d: string | null | undefined) => DYES.find(([k]) => k === d)?.[1] ?? 'Custom colour';

/** Faces: presets made from the kit's face morphs (values outside a morph's range are clamped by the kit). */
export const FACES: [string, Record<string, number>][] = [
  ['Open', { eyes: 0.3, lips: 0.2, cheeks: 0.1 }],
  ['Sharp', { nose_length: 0.6, nose_bridge: 0.7, jaw_width: -0.5, cheeks: -0.6, chin_length: 0.5, face_fat: -0.5 }],
  ['Broad', { jaw_width: 0.8, nose_width: 0.6, face_fat: 0.4, cheeks: 0.5, mouth_width: 0.4 }],
  ['Fine', { nose_width: -0.6, nose_length: -0.3, jaw_width: -0.6, lips: 0.5, eyes: 0.5, chin_length: -0.2 }],
  ['Angular', { jaw_width: 0.7, chin_length: 0.7, brow: 0.8, cheeks: -0.4, nose_bridge: 0.4 }],
  ['Round', { face_fat: 0.8, cheeks: 0.8, nose_length: -0.4, chin_length: -0.5, eyes: 0.2 }],
  ['Lined', { brow: 0.6, nose_bridge: 0.9, nose_length: 0.5, cheeks: -0.8, face_fat: -0.8, lips: -0.5 }],
  ['Soft', { brow: -0.4, eyes: 0.6, lips: 0.6, nose_length: -0.5, jaw_width: -0.3, face_fat: 0.2 }],
];
/** Two more each, so every sex has ten: faces as the painters of the time saw them. */
export const FACES_BY_SEX: Record<Sex, [string, Record<string, number>][]> = {
  m: [...FACES,
    ['Rustic', { nose_width: 0.9, nose_length: 0.3, jaw_width: 0.6, lips: 0.4, face_fat: 0.5, brow: 0.5, eyes: -0.3 }],
    ['Hawk-nosed', { nose_bridge: 1.0, nose_length: 0.8, nose_width: -0.3, cheeks: -0.5, chin_length: 0.4, eyes: -0.2 }],
    ['Boyish', { eyes: 0.6, nose_length: -0.6, chin_length: -0.4, jaw_width: -0.3, face_fat: 0.3, cheeks: 0.4 }]],
  f: [...FACES,
    ['Freckled round', { cheeks: 0.9, nose_length: -0.7, nose_width: -0.2, eyes: 0.5, chin_length: -0.4, face_fat: 0.4 }],
    ['Stern', { brow: 0.7, jaw_width: 0.4, lips: -0.7, mouth_width: -0.4, nose_bridge: 0.5, cheeks: -0.5 }],
    ['Long and narrow', { jaw_width: -0.8, chin_length: 0.8, nose_length: 0.5, cheeks: -0.6, face_fat: -0.6, mouth_width: -0.3 }]],
};
export function faceName(face: Record<string, number>, sex: Sex = 'm') {
  const same = (a: Record<string, number>, b: Record<string, number>) =>
    [...new Set([...Object.keys(a), ...Object.keys(b)])].every((k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0)) < 1e-3);
  const list = FACES_BY_SEX[sex];
  const i = list.findIndex(([, f]) => same(f, face));
  return i >= 0 ? list[i][0] : 'Your own face';
}

export const NAMES: Record<Sex, string[]> = {
  m: ['Lieven', 'Joris', 'Rombout', 'Gommaar', 'Bartel', 'Arnout', 'Willem', 'Gillis', 'Jacob', 'Adriaan', 'Cornelis', 'Michiel', 'Steven', 'Gerard'],
  f: ['Cornelia', 'Clara', 'Katelijne', 'Adriana', 'Barbara', 'Josijne', 'Geertruid', 'Anna', 'Johanna', 'Magdalena', 'Beatrijs', 'Agnes', 'Elisabeth', 'Kathelijn'],
};
export const DRAGONS = ['Gloed', 'Sintel', 'Vonk', 'Brons', 'Goudvleugel', 'Beiaard', 'Demerdraak', 'Gouden Griet', 'Roet', 'Heidebrand'];

// ------------------------------------------------------------------ the outfits

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
 * The wardrobe, in three groups of three per sex (militia, town, road: once the clothes of three classes, and
 * still in that order, so a save from before version 4 keeps its outfit; see MIGRATE[3] in state.ts). The women's
 * are cut for women (jak, lijfje, rok over onderrok, schort, kraag): no piece a man wears. The prop listed is
 * only a fallback: the hero holds the weapon they carry.
 */
const WARDROBE: Record<'schutter' | 'klokkenluider' | 'smokkelaar', Record<Sex, Outfit[]>> = {
  schutter: {
    m: [
      O('Buff Coat', { doublet: 'main', buff_coat: null, sash: 'accent', breeches: 'slate', stockings: 'grey', boots: null }, 'madder_dk', 'madder', null, 'sword'),
      O('Musketeer', { doublet: 'main', collar_band: null, bandolier: null, breeches: 'accent', stockings: 'linen', boots: null }, 'woad_dk', 'slate', 'hat_wide', 'sword'),
      O('Rider\'s Casaque', { doublet: 'accent', collar_band: null, casaque: 'main', breeches: 'black', stockings: 'grey', boots: null }, 'madder_dk', 'black', 'hat_tall', 'sword'),
    ],
    f: [
      O('Riding Jacket', { jak: 'main', kraag_f: null, waist_sash: 'madder', onderrok: 'madder', rok: 'accent', boots_f: null }, 'woad_dk', 'black', 'hat_f', 'sword'),
      O('Bodice and Sash', { bodice: 'main', kraag_f: null, waist_sash: 'madder', onderrok: 'accent', rok: 'slate', boots_f: null }, 'black', 'ochre', null, 'sword'),
      O('Jacket and Long Skirt', { jak: 'main', kraag_f: null, waist_sash: 'madder', skirt: 'accent', shoes: null }, 'black', 'madder_dk', 'hat_f', 'sword'),
    ],
  },
  klokkenluider: {
    m: [
      O('Doublet', { doublet: 'main', collar_band: null, breeches: 'accent', stockings: 'linen', shoes: null }, 'woad_dk', 'umber', 'cap_flat', 'bellstaff'),
      O('Leather Jerkin', { doublet: 'accent', jerkin: null, collar_band: null, breeches: 'main', stockings: 'grey', shoes: null }, 'umber', 'woad', 'cap_flat', 'bellstaff'),
      O('Smock', { smock: 'main', belt: null, breeches: 'accent', stockings: 'grey', shoes: null }, 'linen', 'brown', 'cap_knit', 'bellstaff'),
    ],
    f: [
      O('Bodice and Apron', { bodice: 'main', kerchief: null, onderrok: 'accent', rok: 'umber', schort: 'linen', shoes: null }, 'woad', 'ochre', 'coif', 'bellstaff'),
      O('Town Jacket', { jak: 'main', kraag_f: null, skirt: 'accent', shoes: null }, 'black', 'woad_dk', 'muts_f', 'bellstaff'),
      O('Work Dress', { bodice: 'main', kerchief: null, skirt: 'accent', apron: 'linen', clogs: null }, 'moss', 'russet', 'coif', 'bellstaff'),
    ],
  },
  smokkelaar: {
    m: [
      O('Bandolier', { doublet: 'main', bandolier: null, breeches: 'accent', stockings: 'umber', boots: null }, 'umber', 'black', 'hat_wide', 'dagger'),
      O('Smock and Boots', { smock: 'main', belt: null, breeches: 'accent', stockings: 'grey', boots: null }, 'grey', 'brown', 'cap_knit', 'dagger'),
      O('Dark Casaque', { doublet: 'accent', casaque: 'main', breeches: 'black', stockings: 'umber', boots: null }, 'green_dk', 'umber', 'hat_wide', 'dagger'),
    ],
    f: [
      O('Travel Jacket', { jak: 'main', onderrok: 'accent', rok: 'umber', boots_f: null }, 'green_dk', 'ochre', 'hat_f', 'dagger'),
      O('Bodice and Boots', { bodice: 'main', kerchief: null, onderrok: 'accent', rok: 'grey', schort: 'grey', boots_f: null }, 'brown', 'madder_dk', 'muts_f', 'dagger'),
      O('Dark Jacket', { jak: 'main', kraag_f: null, skirt: 'accent', boots_f: null }, 'black', 'green_dk', 'bontmuts', 'dagger'),
    ],
  },
};

export const OUTFITS: Record<Sex, Outfit[]> = {
  m: [...WARDROBE.schutter.m, ...WARDROBE.klokkenluider.m, ...WARDROBE.smokkelaar.m],
  f: [...WARDROBE.schutter.f, ...WARDROBE.klokkenluider.f, ...WARDROBE.smokkelaar.f],
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

/** The outfits this sex may wear in this kit (an older kit lacks the women's pieces: then what it has). */
export function outfitsFor(kit: TownsfolkKit | null, sex: Sex): Outfit[] {
  const all = OUTFITS[sex];
  if (!kit) return all;
  const body = sex === 'f' ? 'woman' : 'man';
  const ok = all.filter((o) => Object.keys(o.wear).every((p) => kit.fits(p, body)));
  if (ok.length) return ok;
  // a kit from before phase E: the women in bodice and skirt (their own cut, at least), the men as they were
  if (sex === 'f') return [O('Bodice', { bodice: 'main', kerchief: null, skirt: 'accent', shoes: null }, 'woad_dk', 'black', 'coif', all[0].prop)];
  return [O(all[0].name, Object.fromEntries(Object.entries(kit.m.hero?.outfits?.schutter?.wear ?? {}).map(([k, v]) => [k, v])), all[0].main, all[0].accent, null, all[0].prop)];
}

/** The outfit a saved hero wears (index clamped; old saves have none: the first). */
export function outfitOf(kit: TownsfolkKit | null, h: Pick<HeroData, 'sex'> & { outfit?: number }) {
  const list = outfitsFor(kit, h.sex === 'f' ? 'f' : 'm');
  return list[Math.max(0, Math.min(list.length - 1, Math.round(h.outfit ?? 0)))];
}

/** The headwear a hero wears: chosen, or (an older save) the outfit's own when the hat was on. */
export function headwearOf(kit: TownsfolkKit | null, h: Pick<HeroData, 'sex' | 'hat'> & { outfit?: number; headwear?: string | null }) {
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
    body, wear, prop: h.gear?.wapen ? WEAPON_KITS[weaponKind(h.gear.wapen)].prop : outfit.prop, role: 'burgher', face: h.face, skin: h.skin, accent,
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

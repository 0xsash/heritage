// The hero's looks: what the creation screen offers and how a saved hero
// becomes a figure from the townsfolk kit. The kit's manifest may carry a
// `hero` section (bodies, hair and beards a hero may choose, an outfit per
// class); until it does, the hero is dressed from pieces the kit has today.

import type { OriginId } from './character';
import type { HeroData } from './state';
import type { FolkSpec, TownsfolkKit } from './townsfolk';

export type Sex = 'm' | 'f';

/** Pieces that serve as the hero's travelling cloak, best first: the one that takes the cloak colour. */
export const CLOAK_PIECES = ['mantle', 'pelerine', 'huik'];
/** Clips the hero uses that the kit may not have yet (they then come from rider.glb, or a near clip). */
export const HERO_CLIPS = ['jump', 'fall', 'land', 'roll', 'attack3', 'cast', 'ride_idle'];

const BUILD_NAMES: Record<string, string> = {
  man_young: 'Slank', man: 'Gemiddeld', man_stout: 'Fors', man_old: 'Oud',
  woman: 'Slank', woman_stout: 'Fors', woman_old: 'Oud',
};
const HAIR_NAMES: Record<string, string> = {
  hair_crop: 'Kort', hair_long: 'Lang', hair_thin: 'Dun', hair_tail: 'Staart', hair_bun: 'Knot', hair_braid: 'Vlecht',
};
const BEARD_NAMES: Record<string, string> = { moustache: 'Snor', beard_pointed: 'Puntbaard', beard_full: 'Volle baard' };
export const HAIR_COLORS: [string, string][] = [
  ['h_black', 'Zwart'], ['h_dark', 'Donkerbruin'], ['h_brown', 'Bruin'], ['h_chestnut', 'Kastanje'],
  ['h_red', 'Rood'], ['h_blond', 'Blond'], ['h_grey', 'Grijs'], ['h_white', 'Wit'],
];
export const CLOAKS: [string, string][] = [
  ['#8c2a1e', 'Meekraprood'], ['#2e5a3c', 'Mosgroen'], ['#2f3f66', 'Wedeblauw'], ['#5a3a6a', 'Paars'],
  ['#b0782a', 'Oker'], ['#3a3a3a', 'Zwart'], ['#7a5a3a', 'Bruin'], ['#e8e0d0', 'Ongeverfd'],
];

export const buildName = (b: string, i: number) => BUILD_NAMES[b] ?? `Bouw ${i + 1}`;
export const hairName = (h: string | null) => (h ? HAIR_NAMES[h] ?? h.replace(/^hair_/, '') : 'Kaal');
export const beardName = (b: string | null) => (b ? BEARD_NAMES[b] ?? b.replace(/^beard_/, '') : 'Geen');

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
export function faceName(face: Record<string, number>) {
  const same = (a: Record<string, number>, b: Record<string, number>) =>
    [...new Set([...Object.keys(a), ...Object.keys(b)])].every((k) => Math.abs((a[k] ?? 0) - (b[k] ?? 0)) < 1e-3);
  const i = FACES.findIndex(([, f]) => same(f, face));
  return i >= 0 ? FACES[i][0] : 'Eigen gezicht';
}

export const NAMES: Record<Sex, string[]> = {
  m: ['Lieven', 'Joris', 'Rombout', 'Gommaar', 'Bartel', 'Arnout', 'Willem', 'Gillis', 'Jacob', 'Adriaan', 'Cornelis', 'Michiel', 'Steven', 'Gerard'],
  f: ['Machteld', 'Clara', 'Katelijne', 'Margriet', 'Barbara', 'Josijne', 'Geertruid', 'Anna', 'Johanna', 'Magdalena', 'Beatrijs', 'Digna', 'Amelberga', 'Kathelijn'],
};
export const DRAGONS = ['Gloed', 'Sintel', 'Vonk', 'Brons', 'Goudvleugel', 'Beiaard', 'Demerdraak', 'Gouden Griet', 'Roet', 'Heidebrand'];

/** What a sex may choose, from the kit's hero section or from what the kit has today. */
export interface HeroOptions {
  bodies: Record<Sex, string[]>;
  hair: Record<Sex, (string | null)[]>;
  beards: (string | null)[];
  /** false when the kit has no hero section yet (the hero wears what townsfolk wear) */
  heroKit: boolean;
}

export function heroOptions(kit: TownsfolkKit | null): HeroOptions {
  const H = kit?.m.hero;
  const has = (b: string) => !kit || kit.hasBody(b);
  const anyFits = (p: string | null, bodies: string[]) => p === null || !kit || bodies.some((b) => kit.fits(p, b));
  const bodies: Record<Sex, string[]> = {
    m: (H?.bodies?.m ?? ['man_young', 'man', 'man_stout']).filter(has),
    f: (H?.bodies?.f ?? ['woman', 'woman_stout']).filter(has),
  };
  if (!bodies.m.length) bodies.m = ['man'];
  if (!bodies.f.length) bodies.f = ['woman'];
  const hairM = H?.hair?.m ?? ['hair_long', 'hair_crop', 'hair_tail', 'hair_thin', null];
  const hairF = H?.hair?.f ?? ['hair_braid', 'hair_bun'];
  const hair: Record<Sex, (string | null)[]> = {
    m: hairM.filter((p) => anyFits(p, bodies.m)),
    f: hairF.filter((p) => anyFits(p, bodies.f)),
  };
  if (!hair.f.length) hair.f = [null];
  if (!hair.m.length) hair.m = [null];
  const beards = (H?.beards ?? [null, 'moustache', 'beard_pointed', 'beard_full']).filter((p) => anyFits(p, bodies.m));
  return { bodies, hair, beards: beards.length ? beards : [null], heroKit: !!H?.outfits };
}

/**
 * What each class wears before the kit has hero outfits: men from the
 * townsfolk pieces (a short pilgrim's cape as the cloak), women in bodice and
 * skirt. The kit's `hero.outfits` replaces all of this when it lands.
 */
const STOPGAP: Record<OriginId, Record<Sex, Record<string, string | null>>> = {
  schutter: {
    m: { doublet: 'woad_dk', collar_band: null, breeches: 'black', stockings: 'grey', boots: null, hat_wide: 'black', plume: 'white', pelerine: '' },
    f: { bodice: 'woad_dk', kerchief: null, skirt: 'black', shoes: null, pelerine: '' },
  },
  klokkenluider: {
    m: { doublet: 'black', collar_band: null, breeches: 'umber', stockings: 'black', shoes: null, cap_flat: 'black', pelerine: '' },
    f: { bodice: 'black', kerchief: null, skirt: 'umber', shoes: null, coif: null, pelerine: '' },
  },
  smokkelaar: {
    m: { smock: 'grey', belt: null, breeches: 'brown', stockings: 'grey', boots: null, hat_wide: 'brown', pelerine: '' },
    f: { bodice: 'brown', kerchief: null, skirt: 'green_dk', apron: 'grey', clogs: null, pelerine: '' },
  },
};
const HATS = new Set(['hat_wide', 'hat_pilgrim', 'cap_flat', 'morion', 'coif', 'skullcap', 'plume']);

/** Does this class's outfit have a hat to take off? */
export function outfitHasHat(kit: TownsfolkKit | null, origin: OriginId, sex: Sex) {
  return Object.keys(outfitOf(kit, origin, sex).wear).some((p) => HATS.has(p));
}

function outfitOf(kit: TownsfolkKit | null, origin: OriginId, sex: Sex) {
  const o = kit?.m.hero?.outfits?.[origin === 'klokkenluider' ? 'beiaardier' : origin] ?? kit?.m.hero?.outfits?.[origin];
  if (o) return { wear: o.wear, prop: o.prop ?? 'sword' };
  return { wear: STOPGAP[origin][sex], prop: 'sword' };
}

/** The kit spec of a saved hero. */
export function heroSpec(kit: TownsfolkKit, h: HeroData): FolkSpec {
  const opts = heroOptions(kit);
  const sex: Sex = h.sex === 'f' ? 'f' : 'm';
  const body = opts.bodies[sex].includes(h.build) ? h.build : opts.bodies[sex][0];
  const outfit = outfitOf(kit, h.origin, sex);
  const wear: Record<string, string | null> = {};
  for (const [p, dye] of Object.entries(outfit.wear)) {
    if (!h.hat && HATS.has(p)) continue;
    wear[p] = dye;
  }
  // the cloak takes the chosen colour
  const cloak = CLOAK_PIECES.find((p) => p in wear && kit.fits(p, body));
  if (cloak) wear[cloak] = h.cloak;
  for (const p of CLOAK_PIECES) if (p !== cloak && wear[p] === '') delete wear[p];
  const hair = h.hair && kit.fits(h.hair, body) ? h.hair : opts.hair[sex].find((p) => p && kit.fits(p, body)) ?? null;
  if (hair && (h.hair !== null || sex === 'f')) wear[hair] = h.hairColor;
  if (sex === 'm' && h.beard && kit.fits(h.beard, body)) wear[h.beard] = h.hairColor;
  return { body, wear, prop: outfit.prop, role: 'burgher', face: h.face, skin: h.skin };
}

/** Which piece on the hero takes the cloak colour (for re-dyeing it live). */
export function cloakPiece(spec: FolkSpec) {
  return CLOAK_PIECES.find((p) => p in spec.wear) ?? null;
}

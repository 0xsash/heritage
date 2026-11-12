// The character sheet: origins, attributes, levels, gear and loot.
// Numbers follow the usual ARPG shape (see docs/research): quick early levels,
// a steady curve after; loot in four rarities, coloured as players expect.

import type { HeroData } from './state';

export type OriginId = 'schutter' | 'klokkenluider' | 'smokkelaar';
export type Slot = 'wapen' | 'harnas' | 'talisman';
export type Stat = 'kracht' | 'klank' | 'list' | 'taaiheid';
export type Stats = Record<Stat, number>;

export const STAT_NAMES: Record<Stat, string> = { kracht: 'Kracht', klank: 'Klank', list: 'List', taaiheid: 'Taaiheid' };
export const STAT_HELP: Record<Stat, string> = {
  kracht: 'Meer schade met het zwaard.',
  klank: 'Sterkere klokkenmagie en drakenvuur.',
  list: 'Meer kans op een voltreffer.',
  taaiheid: 'Meer levenskracht en pantser.',
};

export interface SkillDef {
  id: string;
  name: string;
  text: string;
  /** seconds */
  cooldown: number;
  /** Resonance it costs */
  cost: number;
  /** level it unlocks at */
  level: number;
}

export interface OriginDef {
  id: OriginId;
  name: string;
  tagline: string;
  text: string;
  base: Stats;
  growth: Stats;
  skill: SkillDef; // right mouse
  skill2: SkillDef; // R
  start: string; // starting weapon (catalogue id)
}

export const ORIGINS: Record<OriginId, OriginDef> = {
  schutter: {
    id: 'schutter',
    name: 'Schuttersgezel',
    tagline: 'Zwaard en schild van de schutterij',
    text: 'Ge zijt opgegroeid op het oefenveld van de Sint-Jorisgilde. Ge slaat hard, ge staat stevig, en ge weet dat een gesloten poort ook maar hout is.',
    base: { kracht: 8, klank: 3, list: 4, taaiheid: 7 },
    growth: { kracht: 3, klank: 1, list: 1, taaiheid: 2 },
    skill: { id: 'zware_slag', name: 'Zware slag', text: 'Een brede houw die alles voor u wegslaat.', cooldown: 4, cost: 0, level: 1 },
    skill2: { id: 'strijdkreet', name: 'Strijdkreet', text: 'Acht tellen lang een derde meer schade, en wie dichtbij staat, deinst terug.', cooldown: 18, cost: 40, level: 3 },
    start: 'gildezwaard',
  },
  klokkenluider: {
    id: 'klokkenluider',
    name: 'Klokkenluiderskind',
    tagline: 'Wie de klokken kent, kent hun macht',
    text: 'Uw vader luidde de klokken van Sint-Sulpitius, en zijn vader voor hem. Ge hoort dingen in brons die anderen niet horen. Soms hoort het brons u terug.',
    base: { kracht: 4, klank: 9, list: 4, taaiheid: 5 },
    growth: { kracht: 1, klank: 3, list: 1, taaiheid: 2 },
    skill: { id: 'klokslag', name: 'Klokslag', text: 'Een galm die alles rondom u verdooft en raakt.', cooldown: 5, cost: 25, level: 1 },
    skill2: { id: 'zuivere_toon', name: 'Zuivere toon', text: 'Een toon zo zuiver dat hij door een vijand heen snijdt.', cooldown: 6, cost: 30, level: 3 },
    start: 'klepelstaf',
  },
  smokkelaar: {
    id: 'smokkelaar',
    name: 'Smokkelaarsjong',
    tagline: 'Langs de tol, door de nacht',
    text: 'Ge kent elk pad rond elke stadsmuur van hier tot Maastricht. Ge vecht niet eerlijk, en daarom leeft ge nog.',
    base: { kracht: 5, klank: 3, list: 9, taaiheid: 5 },
    growth: { kracht: 2, klank: 1, list: 3, taaiheid: 1 },
    skill: { id: 'pistoolschot', name: 'Pistoolschot', text: 'Een schot met uw radslotpistool. Hard, ver, en luid.', cooldown: 3, cost: 0, level: 1 },
    skill2: { id: 'rookbom', name: 'Rookbom', text: 'Verdwijn in de rook: vijanden zijn verblind en uw volgende slagen zijn voltreffers.', cooldown: 16, cost: 35, level: 3 },
    start: 'ponjaard',
  },
};

export const LEVEL_CAP = 20;
/** XP needed to go from `level` to the next. */
export function xpToNext(level: number) {
  return Math.round(90 * Math.pow(level, 1.5) + 30 * level);
}

// ------------------------------------------------------------------ gear
export type Rarity = 0 | 1 | 2 | 3;
export const RARITY = [
  { name: 'Gewoon', color: '#d8d0c0' },
  { name: 'Magisch', color: '#7e9cff' },
  { name: 'Zeldzaam', color: '#f2cf55' },
  { name: 'Legendarisch', color: '#ff8c32' },
] as const;

export interface Gear {
  uid: string;
  base: string;
  name: string;
  slot: Slot;
  rarity: Rarity;
  ilvl: number;
  dmg?: [number, number];
  armor?: number;
  mods: Partial<Stats> & { crit?: number; hp?: number; fire?: number };
  text?: string;
}

interface Base { id: string; name: string; slot: Slot; ilvl: number; dmg?: [number, number]; armor?: number }
const BASES: Base[] = [
  { id: 'roestig_zwaard', name: 'Roestig zwaard', slot: 'wapen', ilvl: 1, dmg: [3, 6] },
  { id: 'korte_degen', name: 'Korte degen', slot: 'wapen', ilvl: 2, dmg: [4, 7] },
  { id: 'rapier', name: 'Rapier', slot: 'wapen', ilvl: 3, dmg: [5, 9] },
  { id: 'slagzwaard', name: 'Slagzwaard', slot: 'wapen', ilvl: 5, dmg: [8, 14] },
  { id: 'schutterszwaard', name: 'Schutterszwaard', slot: 'wapen', ilvl: 7, dmg: [11, 18] },
  { id: 'officiersdegen', name: 'Officiersdegen', slot: 'wapen', ilvl: 9, dmg: [14, 22] },
  { id: 'linnen_wambuis', name: 'Linnen wambuis', slot: 'harnas', ilvl: 1, armor: 4 },
  { id: 'leren_kolder', name: 'Leren kolder', slot: 'harnas', ilvl: 2, armor: 8 },
  { id: 'buffeljas', name: 'Buffeljas', slot: 'harnas', ilvl: 4, armor: 14 },
  { id: 'borstkuras', name: 'Borstkuras', slot: 'harnas', ilvl: 7, armor: 24 },
  { id: 'pelgrimsinsigne', name: 'Pelgrimsinsigne', slot: 'talisman', ilvl: 1 },
  { id: 'rozenkrans', name: 'Rozenkrans', slot: 'talisman', ilvl: 2 },
  { id: 'eiken_beeldje', name: 'Eikenhouten beeldje', slot: 'talisman', ilvl: 4 },
  { id: 'bronzen_amulet', name: 'Klokkenbronzen amulet', slot: 'talisman', ilvl: 6 },
];

const SUFFIX: [string, keyof Gear['mods']][] = [
  ['van de Schutterij', 'kracht'],
  ['van de Beiaard', 'klank'],
  ['van de Smokkelaar', 'list'],
  ['van de Begijnen', 'taaiheid'],
  ['der Demer', 'hp'],
  ['van het Galgenveld', 'crit'],
  ['van de Draak', 'fire'],
];
const RARE_NAMES = ['Demerdoorn', 'Klokkenhart', 'Weversdank', 'Galgenrust', 'Torenwacht', 'Brandbelofte', 'Moerasbeet', 'Heidegloed', 'Poortbreker', 'Nachtklepel', 'Laatste Mis', 'Tolvrij'];

/** Named pieces: starting gear and quest rewards. */
const UNIQUE: Record<string, Omit<Gear, 'uid'>> = {
  gildezwaard: { base: 'korte_degen', name: 'Gildezwaard', slot: 'wapen', rarity: 0, ilvl: 1, dmg: [4, 7], mods: {}, text: 'Het oefenzwaard van de Sint-Jorisgilde. Bot, maar eerlijk.' },
  klepelstaf: { base: 'roestig_zwaard', name: 'Klepelstaf', slot: 'wapen', rarity: 0, ilvl: 1, dmg: [3, 6], mods: { klank: 2 }, text: 'Een oude klepel aan een essenhouten steel.' },
  ponjaard: { base: 'korte_degen', name: 'Ponjaard', slot: 'wapen', rarity: 0, ilvl: 1, dmg: [3, 6], mods: { crit: 3 }, text: 'Kort, scherp en makkelijk te verbergen.' },
  pelgrimsmantel: { base: 'linnen_wambuis', name: 'Pelgrimsmantel', slot: 'harnas', rarity: 1, ilvl: 2, armor: 6, mods: { taaiheid: 2 }, text: 'Gezegend in Scherpenheuvel. Ruikt naar wierook.' },
  roelofs_slagzwaard: { base: 'slagzwaard', name: 'Roelofs slagzwaard', slot: 'wapen', rarity: 3, ilvl: 5, dmg: [11, 18], mods: { kracht: 4, crit: 5 }, text: 'Roelof de Rode heeft er drie dorpen mee geplunderd. Het zwaard weet dat nog.' },
  kluddevel: { base: 'buffeljas', name: 'Kluddevel', slot: 'harnas', rarity: 3, ilvl: 5, armor: 20, mods: { taaiheid: 4, hp: 25 }, text: 'De pels van de Kludde. Nog altijd nat. Nog altijd warm.' },
  eikenhart: { base: 'eiken_beeldje', name: 'Eikenhart', slot: 'talisman', rarity: 3, ilvl: 4, mods: { klank: 5, fire: 20, hp: 15 }, text: 'Hout van de heilige eik. Het zoemt als de klokken zwijgen.' },
  zegelring: { base: 'pelgrimsinsigne', name: 'Wevers zegelring', slot: 'talisman', rarity: 2, ilvl: 3, mods: { list: 3, crit: 4 }, text: 'Het zegel van het weversambacht. Opent deuren in elke lakenhalle.' },
};

let uidCounter = Date.now() % 100000;
const uid = () => `g${(uidCounter++).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

export function uniqueGear(id: string): Gear | null {
  const u = UNIQUE[id];
  return u ? { ...u, mods: { ...u.mods }, uid: uid() } : null;
}

/** A random piece of loot for a monster of this level. */
export function rollGear(level: number, minRarity: Rarity = 0, slot?: Slot): Gear {
  const r = Math.random();
  let rarity: Rarity = r < 0.02 ? 3 : r < 0.12 ? 2 : r < 0.42 ? 1 : 0;
  if (rarity < minRarity) rarity = minRarity;
  if (rarity === 3) rarity = 2; // legendaries come from named enemies and quests
  const fits = BASES.filter((b) => b.ilvl <= level + 1 && (!slot || b.slot === slot));
  const best = fits.filter((b) => b.ilvl >= Math.max(1, level - 4));
  const base = pick(best.length ? best : fits);
  const ilvl = Math.max(1, level + Math.floor(Math.random() * 3) - 1);
  const scale = 1 + (ilvl - base.ilvl) * 0.08 + rarity * 0.12;
  const g: Gear = { uid: uid(), base: base.id, name: base.name, slot: base.slot, rarity, ilvl, mods: {} };
  if (base.dmg) g.dmg = [Math.round(base.dmg[0] * scale), Math.round(base.dmg[1] * scale)];
  if (base.armor) g.armor = Math.round(base.armor * scale);
  const nMods = rarity === 0 ? (base.slot === 'talisman' ? 1 : 0) : rarity === 1 ? 1 : 3;
  const used = new Set<string>();
  for (let i = 0; i < nMods; i++) {
    const [suffix, stat] = pick(SUFFIX.filter(([, s]) => !used.has(s)));
    used.add(stat);
    const amount = stat === 'hp' ? 6 + ilvl * 3 : stat === 'crit' ? 2 + Math.round(ilvl * 0.5) : stat === 'fire' ? 8 + ilvl * 2 : 1 + Math.round(ilvl * 0.6);
    g.mods[stat] = amount;
    if (rarity === 1) g.name = `${base.name} ${suffix}`;
  }
  if (rarity === 2) g.name = `${pick(RARE_NAMES)}`;
  return g;
}

export function gearValue(g: Gear) {
  return Math.max(1, Math.round(g.ilvl * 2 * (1 + g.rarity * 1.6)));
}

export function gearLines(g: Gear): string[] {
  const out: string[] = [];
  if (g.dmg) out.push(`${g.dmg[0]}–${g.dmg[1]} schade`);
  if (g.armor) out.push(`${g.armor} pantser`);
  for (const [k, v] of Object.entries(g.mods)) {
    if (!v) continue;
    if (k === 'crit') out.push(`+${v}% kans op voltreffer`);
    else if (k === 'hp') out.push(`+${v} levenskracht`);
    else if (k === 'fire') out.push(`+${v}% drakenvuur`);
    else out.push(`+${v} ${STAT_NAMES[k as Stat]}`);
  }
  return out;
}

// ------------------------------------------------------------------ sheet
export interface Derived extends Stats {
  maxHp: number;
  dmg: [number, number];
  armor: number;
  crit: number;
  fire: number;
  /** multiplier for bell skills and dragon fire */
  power: number;
}

export class Sheet {
  constructor(public h: HeroData) {}

  get origin() {
    return ORIGINS[this.h.origin];
  }

  derived(): Derived {
    const o = this.origin;
    const L = this.h.level - 1;
    const st: Stats = {
      kracht: o.base.kracht + o.growth.kracht * L,
      klank: o.base.klank + o.growth.klank * L,
      list: o.base.list + o.growth.list * L,
      taaiheid: o.base.taaiheid + o.growth.taaiheid * L,
    };
    let hpMod = 0, critMod = 0, fireMod = 0, armor = 0;
    let dmg: [number, number] = [2, 4];
    for (const g of Object.values(this.h.gear)) {
      if (!g) continue;
      for (const k of ['kracht', 'klank', 'list', 'taaiheid'] as Stat[]) st[k] += g.mods[k] ?? 0;
      hpMod += g.mods.hp ?? 0;
      critMod += g.mods.crit ?? 0;
      fireMod += g.mods.fire ?? 0;
      armor += g.armor ?? 0;
      if (g.dmg) dmg = [...g.dmg];
    }
    const kr = st.kracht * 0.45;
    return {
      ...st,
      maxHp: Math.round(70 + st.taaiheid * 9 + this.h.level * 12 + hpMod),
      dmg: [Math.round(dmg[0] + kr), Math.round(dmg[1] + kr)],
      armor: Math.round(armor + st.taaiheid * 0.6),
      crit: Math.min(60, 5 + st.list * 0.6 + critMod),
      fire: fireMod,
      power: 1 + st.klank * 0.035,
    };
  }

  /** Add XP; returns how many levels were gained. */
  gainXp(n: number) {
    let gained = 0;
    if (this.h.level >= LEVEL_CAP) return 0;
    this.h.xp += n;
    while (this.h.level < LEVEL_CAP && this.h.xp >= xpToNext(this.h.level)) {
      this.h.xp -= xpToNext(this.h.level);
      this.h.level++;
      gained++;
    }
    if (gained) this.h.hp = this.derived().maxHp;
    return gained;
  }

  equip(uidToEquip: string) {
    const i = this.h.bag.findIndex((g) => g.uid === uidToEquip);
    if (i < 0) return;
    const g = this.h.bag[i];
    const old = this.h.gear[g.slot];
    const before = this.derived().maxHp;
    this.h.gear[g.slot] = g;
    this.h.bag.splice(i, 1);
    if (old) this.h.bag.push(old);
    const after = this.derived().maxHp;
    this.h.hp = Math.max(1, Math.min(after, this.h.hp + (after - before)));
  }

  /** Is this better than what is worn? (for the green arrow on loot) */
  better(g: Gear) {
    const cur = this.h.gear[g.slot];
    if (!cur) return true;
    const score = (x: Gear) => (x.dmg ? (x.dmg[0] + x.dmg[1]) * 1.5 : 0) + (x.armor ?? 0) + Object.values(x.mods).reduce((a, b) => a + (b ?? 0), 0) * 1.2;
    return score(g) > score(cur);
  }
}

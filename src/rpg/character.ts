// The character sheet: attributes, weapon skills, levels, gear and loot.
// Numbers follow the usual ARPG shape (see docs/research): quick early levels,
// a steady curve after; loot in four rarities, coloured as players expect.

import type { HeroData } from './state';
import { FACTION_GIFTS, type PublicFactionId } from './factions';

export type Slot = 'wapen' | 'harnas' | 'talisman';
export type Stat = 'kracht' | 'klank' | 'list' | 'taaiheid';
export type Stats = Record<Stat, number>;

export const STAT_NAMES: Record<Stat, string> = { kracht: 'Might', klank: 'Chime', list: 'Guile', taaiheid: 'Grit' };
export const STAT_HELP: Record<Stat, string> = {
  kracht: 'Your weapon strikes harder.',
  klank: 'Your bell magic and dragonfire grow stronger.',
  list: 'You land critical hits more often.',
  taaiheid: 'You have more health and armour.',
};

export interface SkillDef {
  id: string;
  name: string;
  /** one word for the action bar */
  short: string;
  text: string;
  /** seconds */
  cooldown: number;
  /** Resonance it costs */
  cost: number;
  /** level it unlocks at */
  level: number;
}

/**
 * There are no classes. The two combat skills come from the weapon in your hand: a sword cuts wide, a bell
 * staff rings, a light blade leaves a hand free for the pistol. Change the weapon and the skills change with it.
 */
export type WeaponKind = 'sword' | 'staff' | 'blade';

export interface WeaponKit {
  id: WeaponKind;
  /** what the weapon type is called, for tooltips and the character panel */
  name: string;
  /** how it fights, in one line */
  text: string;
  /** the prop the hero holds (src/rpg/look.ts) */
  prop: string;
  skill: SkillDef; // right mouse
  skill2: SkillDef; // R
}

export const WEAPON_KITS: Record<WeaponKind, WeaponKit> = {
  sword: {
    id: 'sword', name: 'Sword', prop: 'sword',
    text: 'A sword hits hard and holds the line, the way the guilds drill on the practice field.',
    skill: { id: 'zware_slag', short: 'Cleave', name: 'Heavy Blow', text: 'A broad cut that sweeps everything aside.', cooldown: 4, cost: 0, level: 1 },
    skill2: { id: 'strijdkreet', short: 'Cry', name: 'War Cry', text: 'For eight counts you deal a third more damage, and anyone close flinches back.', cooldown: 18, cost: 40, level: 3 },
  },
  staff: {
    id: 'staff', name: 'Bell staff', prop: 'bellstaff',
    text: 'A clapper on a shaft. In the right hands the bronze still answers, and Chime makes it ring harder.',
    skill: { id: 'klokslag', short: 'Strike', name: 'Bell Strike', text: 'A boom that hits everything around you and stuns.', cooldown: 5, cost: 25, level: 1 },
    skill2: { id: 'zuivere_toon', short: 'Tone', name: 'Pure Tone', text: 'A tone so pure it cuts clean through an enemy.', cooldown: 6, cost: 30, level: 3 },
  },
  blade: {
    id: 'blade', name: 'Light blade', prop: 'dagger',
    text: 'A short blade leaves your other hand free for a wheel-lock pistol. Quick, mean, and best with Guile.',
    skill: { id: 'pistoolschot', short: 'Shot', name: 'Pistol Shot', text: 'A shot from your wheel-lock pistol: hard, far and loud.', cooldown: 3, cost: 0, level: 1 },
    skill2: { id: 'rookbom', short: 'Smoke', name: 'Smoke Bomb', text: 'You vanish in smoke: enemies lose sight of you and your next strikes are critical hits.', cooldown: 16, cost: 35, level: 3 },
  },
};

/** Everyone starts the same and grows the same: what you carry and who you serve make the difference. */
const BASE_STATS: Stats = { kracht: 6, klank: 5, list: 5, taaiheid: 6 };
const GROWTH: Stats = { kracht: 2, klank: 2, list: 2, taaiheid: 2 };

export const LEVEL_CAP = 20;
/** XP needed to go from `level` to the next. */
export function xpToNext(level: number) {
  return Math.round(90 * Math.pow(level, 1.5) + 30 * level);
}

// ------------------------------------------------------------------ gear
export type Rarity = 0 | 1 | 2 | 3;
export const RARITY = [
  { name: 'Common', color: '#d8d0c0' },
  { name: 'Magic', color: '#7e9cff' },
  { name: 'Rare', color: '#f2cf55' },
  { name: 'Legendary', color: '#ff8c32' },
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
  /** what you paid for it at a shop: a merchant never buys it back for more than half of that */
  paid?: number;
  /** the party of the merchant it was bought from: selling it again takes back the standing that purchase earned */
  from?: string;
}

interface Base { id: string; name: string; slot: Slot; ilvl: number; dmg?: [number, number]; armor?: number; kind?: WeaponKind }
const BASES: Base[] = [
  { id: 'roestig_zwaard', name: 'Rusty Sword', slot: 'wapen', ilvl: 1, dmg: [3, 6], kind: 'sword' },
  { id: 'korte_degen', name: 'Short Sword', slot: 'wapen', ilvl: 2, dmg: [4, 7], kind: 'sword' },
  { id: 'rapier', name: 'Rapier', slot: 'wapen', ilvl: 3, dmg: [5, 9], kind: 'blade' },
  { id: 'slagzwaard', name: 'Heavy Sword', slot: 'wapen', ilvl: 5, dmg: [8, 14], kind: 'sword' },
  { id: 'schutterszwaard', name: 'Guildsman\'s Sword', slot: 'wapen', ilvl: 7, dmg: [11, 18], kind: 'sword' },
  { id: 'officiersdegen', name: 'Officer\'s Blade', slot: 'wapen', ilvl: 9, dmg: [14, 22], kind: 'blade' },
  { id: 'ponjaard', name: 'Poniard', slot: 'wapen', ilvl: 1, dmg: [3, 6], kind: 'blade' },
  { id: 'klepelstaf', name: 'Clapper Staff', slot: 'wapen', ilvl: 1, dmg: [3, 6], kind: 'staff' },
  { id: 'beiaardstaf', name: 'Carillon Staff', slot: 'wapen', ilvl: 4, dmg: [6, 10], kind: 'staff' },
  { id: 'bronsstaf', name: 'Bell-Bronze Staff', slot: 'wapen', ilvl: 8, dmg: [11, 18], kind: 'staff' },
  { id: 'linnen_wambuis', name: 'Linen Doublet', slot: 'harnas', ilvl: 1, armor: 4 },
  { id: 'leren_kolder', name: 'Leather Jerkin', slot: 'harnas', ilvl: 2, armor: 8 },
  { id: 'buffeljas', name: 'Buff Coat', slot: 'harnas', ilvl: 4, armor: 14 },
  { id: 'borstkuras', name: 'Breastplate', slot: 'harnas', ilvl: 7, armor: 24 },
  { id: 'pelgrimsinsigne', name: 'Pilgrim\'s Badge', slot: 'talisman', ilvl: 1 },
  { id: 'rozenkrans', name: 'Rosary', slot: 'talisman', ilvl: 2 },
  { id: 'eiken_beeldje', name: 'Oak Figurine', slot: 'talisman', ilvl: 4 },
  { id: 'bronzen_amulet', name: 'Bell-Bronze Amulet', slot: 'talisman', ilvl: 6 },
];

const SUFFIX: [string, keyof Gear['mods']][] = [
  ['of the Guildsmen', 'kracht'],
  ['of the Carillonneur', 'klank'],
  ['of the Smuggler', 'list'],
  ['of the Begijnen', 'taaiheid'],
  ['of the Demer', 'hp'],
  ['of the Gallows Field', 'crit'],
  ['of the Dragon', 'fire'],
];
const RARE_NAMES = ['Demerthorn', 'Bellheart', 'Weaver\'s Thanks', 'Gallows Rest', 'Towerwatch', 'Fire\'s Promise', 'Marshbite', 'Heathglow', 'Gatebreaker', 'Night Clapper', 'Last Mass', 'Toll-Free'];

/** Named pieces: starting gear and quest rewards. */
const UNIQUE: Record<string, Omit<Gear, 'uid'>> = {
  gildezwaard: { base: 'korte_degen', name: 'Guild Sword', slot: 'wapen', rarity: 0, ilvl: 1, dmg: [4, 7], mods: {}, text: 'The practice sword of the guild of Sint-Sebastiaan. It is blunt, but honest.' },
  klepelstaf: { base: 'klepelstaf', name: 'Clapper Staff', slot: 'wapen', rarity: 0, ilvl: 1, dmg: [3, 6], mods: { klank: 2 }, text: 'An old bell clapper on an ash-wood shaft.' },
  garnizoenszwaard: { base: 'korte_degen', name: 'Garrison Sword', slot: 'wapen', rarity: 0, ilvl: 1, dmg: [4, 7], mods: {}, text: 'Issued in Brussel, stamped with the king\'s mark. Nobody ever asked for it back.' },
  drossaardsdegen: { base: 'rapier', name: 'Drossaard\'s Rapier', slot: 'wapen', rarity: 0, ilvl: 1, dmg: [3, 6], mods: { list: 1 }, text: 'A thin blade with the arms of Nassau filed off the guard. The prince\'s men carry it quietly.' },
  ponjaard: { base: 'ponjaard', name: 'Poniard', slot: 'wapen', rarity: 0, ilvl: 1, dmg: [3, 6], mods: { crit: 3 }, text: 'Short, sharp and easy to hide.' },
  pelgrimsmantel: { base: 'linnen_wambuis', name: 'Pilgrim\'s Cloak', slot: 'harnas', rarity: 1, ilvl: 2, armor: 6, mods: { taaiheid: 2 }, text: 'Blessed in Scherpenheuvel. It still smells of incense.' },
  roelofs_slagzwaard: { base: 'slagzwaard', name: 'Lambrecht\'s Heavy Sword', slot: 'wapen', rarity: 3, ilvl: 5, dmg: [11, 18], mods: { kracht: 4, crit: 5 }, text: 'Lambrecht the Red plundered three villages with it. The sword remembers.' },
  kluddevel: { base: 'buffeljas', name: 'Kludde Hide', slot: 'harnas', rarity: 3, ilvl: 5, armor: 20, mods: { taaiheid: 4, hp: 25 }, text: 'The pelt of the Kludde. It is still wet and still warm.' },
  eikenhart: { base: 'eiken_beeldje', name: 'Oakheart', slot: 'talisman', rarity: 3, ilvl: 4, mods: { klank: 5, fire: 20, hp: 15 }, text: 'Wood of the holy oak. It hums when the bells fall silent.' },
  zegelring: { base: 'pelgrimsinsigne', name: 'Weaver\'s Signet', slot: 'talisman', rarity: 2, ilvl: 3, mods: { list: 3, crit: 4 }, text: 'The seal of the weavers\' guild. It opens doors in every cloth hall.' },
};

const KIND_OF_BASE: Record<string, WeaponKind> = Object.fromEntries(BASES.filter((b) => b.kind).map((b) => [b.id, b.kind!]));

/** What kind of weapon this is (and so which two skills it gives): no weapon, or an unknown one, fights as a sword. */
export function weaponKind(g: Gear | null | undefined): WeaponKind {
  return (g && KIND_OF_BASE[g.base]) || 'sword';
}

/** The two skills a weapon gives, for tooltips. */
export function weaponSkillLine(g: Gear): string | null {
  if (g.slot !== 'wapen') return null;
  const k = WEAPON_KITS[weaponKind(g)];
  return `${k.name}: ${k.skill.name} and ${k.skill2.name}`;
}

let uidCounter = Date.now() % 100000;
const uid = () => `g${(uidCounter++).toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

export function uniqueGear(id: string): Gear | null {
  const u = UNIQUE[id];
  return u ? { ...u, mods: { ...u.mods }, uid: uid() } : null;
}

/** A random piece of loot for a monster of this level (`rnd`: a seeded generator, for a shop's table). */
export function rollGear(level: number, minRarity: Rarity = 0, slot?: Slot, rnd: () => number = Math.random): Gear {
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
  const r = rnd();
  let rarity: Rarity = r < 0.02 ? 3 : r < 0.12 ? 2 : r < 0.42 ? 1 : 0;
  if (rarity < minRarity) rarity = minRarity;
  if (rarity === 3) rarity = 2; // legendaries come from named enemies and quests
  const fits = BASES.filter((b) => b.ilvl <= level + 1 && (!slot || b.slot === slot));
  const best = fits.filter((b) => b.ilvl >= Math.max(1, level - 4));
  const base = pick(best.length ? best : fits);
  const ilvl = Math.max(1, level + Math.floor(rnd() * 3) - 1);
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

/** What a merchant pays for it: its value at their rate, and never more than half of what you paid for it. */
export function sellValue(g: Gear, rate = 1) {
  const v = gearValue(g) * rate;
  return Math.max(1, Math.round(g.paid !== undefined ? Math.min(v, g.paid * 0.5) : v));
}

export function gearLines(g: Gear): string[] {
  const out: string[] = [];
  if (g.dmg) out.push(`${g.dmg[0]}–${g.dmg[1]} damage`);
  if (g.armor) out.push(`${g.armor} armour`);
  for (const [k, v] of Object.entries(g.mods)) {
    if (!v) continue;
    if (k === 'crit') out.push(`+${v}% critical chance`);
    else if (k === 'hp') out.push(`+${v} health`);
    else if (k === 'fire') out.push(`+${v}% dragonfire`);
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

  /** the two skills of the weapon in your hand */
  get kit(): WeaponKit {
    return WEAPON_KITS[weaponKind(this.h.gear.wapen)];
  }

  /** what your first loyalty gives: a small passive, a signature ability and where you come from */
  get gift() {
    return FACTION_GIFTS[this.h.faction as PublicFactionId] ?? FACTION_GIFTS.gilden;
  }

  derived(): Derived {
    const L = this.h.level - 1;
    const st: Stats = {
      kracht: BASE_STATS.kracht + GROWTH.kracht * L,
      klank: BASE_STATS.klank + GROWTH.klank * L,
      list: BASE_STATS.list + GROWTH.list * L,
      taaiheid: BASE_STATS.taaiheid + GROWTH.taaiheid * L,
    };
    // your faction: one small passive
    const bg = this.gift.bonus;
    for (const k of ['kracht', 'klank', 'list', 'taaiheid'] as Stat[]) st[k] += bg[k] ?? 0;
    let hpMod = bg.hp ?? 0, critMod = bg.crit ?? 0, fireMod = 0, armor = bg.armor ?? 0;
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
      power: (1 + st.klank * 0.035) * (1 + (bg.power ?? 0)),
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
    // at the top there is nothing left to fill
    if (this.h.level >= LEVEL_CAP) this.h.xp = 0;
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
    // keep the same share of your life: taking a piece off and putting it back changes nothing
    this.h.hp = Math.max(1, Math.min(after, (this.h.hp * after) / Math.max(1, before)));
  }

  /**
   * How strong the hero is with these stats, in one number to compare gear by: the damage of an average
   * hit (with crits), how much it takes to bring you down (life and armour, as combat counts them), and,
   * weighed lightly, dragon fire. Bell skills scale with Chime, so with a bell staff in hand it counts for the hits too.
   */
  private worth(d: Derived) {
    const hit = ((d.dmg[0] + d.dmg[1]) / 2) * (1 + (0.75 * d.crit) / 100) * (weaponKind(this.h.gear.wapen) === 'staff' ? Math.sqrt(d.power) : 1);
    const life = d.maxHp * (1 + (d.armor * 2.2) / 100);
    const fire = d.power * (1 + d.fire / 100);
    return Math.log(hit) + 0.5 * Math.log(life) + 0.1 * Math.log(fire);
  }

  /** Is this better than what is worn? (for the "beter" mark on loot and in shops) */
  better(g: Gear) {
    const cur = this.h.gear[g.slot];
    if (!cur) return true;
    if (cur.uid === g.uid) return false;
    const now = this.worth(this.derived());
    const withIt = this.worth(new Sheet({ ...this.h, gear: { ...this.h.gear, [g.slot]: g } }).derived());
    return withIt > now + 1e-6;
  }
}

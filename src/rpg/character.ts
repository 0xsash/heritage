// The character sheet: origins, attributes, levels, gear and loot.
// Numbers follow the usual ARPG shape (see docs/research): quick early levels,
// a steady curve after; loot in four rarities, coloured as players expect.

import type { HeroData } from './state';

export type OriginId = 'schutter' | 'klokkenluider' | 'smokkelaar';
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

export interface OriginDef {
  id: OriginId;
  name: string;
  tagline: string;
  text: string;
  /** a paragraph for the creation screen: who they are in 1650 */
  lore: string;
  /** how it plays, in a few words */
  role: string;
  /** 1 easy .. 3 hard */
  difficulty: 1 | 2 | 3;
  base: Stats;
  growth: Stats;
  skill: SkillDef; // right mouse
  skill2: SkillDef; // R
  start: string; // starting weapon (catalogue id)
}

export const ORIGINS: Record<OriginId, OriginDef> = {
  schutter: {
    id: 'schutter',
    name: 'Guildsman',
    tagline: 'Sword and steel',
    text: 'You belong to the guild of Sint-Sebastiaan. You hit hard and stand firm.',
    lore: 'The guild of Sint-Sebastiaan has shot in its own yard since the days of the dukes. You saved a year for your oath. Your name hangs in the guildroom, under the names of the dead.',
    role: 'close combat, takes a beating',
    difficulty: 1,
    base: { kracht: 8, klank: 3, list: 4, taaiheid: 7 },
    growth: { kracht: 3, klank: 1, list: 1, taaiheid: 2 },
    skill: { id: 'zware_slag', short: 'Cleave', name: 'Heavy Blow', text: 'A broad cut that sweeps everything aside.', cooldown: 4, cost: 0, level: 1 },
    skill2: { id: 'strijdkreet', short: 'Cry', name: 'War Cry', text: 'For eight counts you deal a third more damage, and anyone close flinches back.', cooldown: 18, cost: 40, level: 3 },
    start: 'gildezwaard',
  },
  klokkenluider: {
    id: 'klokkenluider',
    name: 'Carillonneur',
    tagline: 'Sound as a weapon',
    text: 'You learned the trade in Mechelen. You hear what is in the bronze.',
    lore: 'You learned the keyboard in Mechelen, with fists and feet, under a master who went deaf from his own bells. Diest has only ordinary bells, but you hear what is in the bronze. A pure tone cuts like a knife in your hands. Since Sunday, the bronze has gone quiet.',
    role: 'sound at range, fragile up close',
    difficulty: 3,
    base: { kracht: 4, klank: 9, list: 4, taaiheid: 5 },
    growth: { kracht: 1, klank: 3, list: 1, taaiheid: 2 },
    skill: { id: 'klokslag', short: 'Strike', name: 'Bell Strike', text: 'A boom that hits everything around you and stuns.', cooldown: 5, cost: 25, level: 1 },
    skill2: { id: 'zuivere_toon', short: 'Tone', name: 'Pure Tone', text: 'A tone so pure it cuts clean through an enemy.', cooldown: 6, cost: 30, level: 3 },
    start: 'klepelstaf',
  },
  smokkelaar: {
    id: 'smokkelaar',
    name: 'Smuggler',
    tagline: 'Quick and dirty',
    text: 'You know every path round the toll, and you do not fight fair.',
    lore: 'Every bridge in Brabant has a toll house, and every toll house wants its stuiver. You know the cart tracks across the heath to the Dutch border. Three years of smuggled salt paid for your pistol. It has paid for itself already.',
    role: 'quick and mean, lives on criticals',
    difficulty: 2,
    base: { kracht: 5, klank: 3, list: 9, taaiheid: 5 },
    growth: { kracht: 2, klank: 1, list: 3, taaiheid: 1 },
    skill: { id: 'pistoolschot', short: 'Shot', name: 'Pistol Shot', text: 'A shot from your wheel-lock pistol: hard, far and loud.', cooldown: 3, cost: 0, level: 1 },
    skill2: { id: 'rookbom', short: 'Smoke', name: 'Smoke Bomb', text: 'You vanish in smoke: enemies lose sight of you and your next strikes are critical hits.', cooldown: 16, cost: 35, level: 3 },
    start: 'ponjaard',
  },
};

// ------------------------------------------------------------------ backgrounds
// Origin: where you are from. Each gives one small passive and changes what
// people say about you. All five are places and lives that existed in 1650.

export type BackgroundId = 'diest' | 'kempen' | 'hageland' | 'luik' | 'tros';

export interface BackgroundDef {
  id: BackgroundId;
  /** what you are called: a man, a woman */
  name: [string, string];
  /** the place, for lists */
  place: string;
  lore: string;
  /** the passive, as the screen states it */
  perk: string;
  perkName: string;
  /** what people say about where you are from */
  said: string[];
  /** added to the sheet */
  bonus: Partial<Stats> & { hp?: number; armor?: number; crit?: number; power?: number };
}

export const BACKGROUNDS: Record<BackgroundId, BackgroundDef> = {
  diest: {
    id: 'diest', name: ['Diest-born', 'Diest-born'], place: 'Diest and the Demer meadows',
    lore: 'You were born on a farm just outside the walls, in sight of Sint-Sulpitius. Diest once sold cloth in every great market; now it mostly brews beer. A prince of Orange lies buried in the choir. The living princes never come.',
    perkName: 'Bell Child', perk: '+5% power of bell magic and dragonfire.',
    said: ['From here? Then you always knew the hour. Until Sunday.', 'Someone from Diest, with a dragon. My mother will never believe it.'],
    bonus: { power: 0.05 },
  },
  kempen: {
    id: 'kempen', name: ['Kempen-born', 'Kempen-born'], place: 'the Kempen, north of the Demer',
    lore: 'North of the Demer the sand begins. Your parents kept sheep on heath that was once forest, and cut peat for a lord they never saw. Nobody in the Kempen complains about the weather. The weather does not listen.',
    perkName: 'Tough as Heather', perk: '+15 health.',
    said: ['From the Kempen? They eat sand there and still say thank you.', 'A man of the Kempen keeps walking after the horse lies down.'],
    bonus: { hp: 15 },
  },
  hageland: {
    id: 'hageland', name: ['Hageland-born', 'Hageland-born'], place: 'the Hageland, south of Diest',
    lore: 'South of Diest lie the hills of the Hageland, with vineyards on the sunny side. The brown ironstone the churches are built from comes from its quarries. You carried stone before you could read. Your back remembers.',
    perkName: 'Stonecarrier\'s Arms', perk: '+2 Might.',
    said: ['Hageland folk are sour as their wine and hard as their stone.', 'From the hills? Bring wine next time. Or no, don\'t.'],
    bonus: { kracht: 2 },
  },
  luik: {
    id: 'luik', name: ['Luik-born', 'Luik-born'], place: 'the prince-bishopric of Luik',
    lore: 'Luik belongs neither to Spain nor to Brabant but to a prince-bishop, who means to stay neutral. The city sells arms to every army. You grew up among anvils and musket barrels. You know what a barrel costs, and who pays.',
    perkName: 'Knows Steel', perk: '+5 armour.',
    said: ['From Luik. Count your fingers after the handshake.', 'From Luik? Then have a look at the lock on my door.'],
    bonus: { armor: 5 },
  },
  tros: {
    id: 'tros', name: ['Camp child', 'Camp child'], place: 'the army\'s baggage train',
    lore: 'Behind every army marches a second: sutlers, laundresses, servants, children. You were born on a cart in Henegouwen. In 1648 peace came with the Dutch, but not with France. The baggage train still moves on.',
    perkName: 'Fighting Dirty', perk: '+5% critical chance.',
    said: ['From the baggage train? Keep your hands where I can see them.', 'A soldier\'s child. Lock up the chickens.'],
    bonus: { crit: 5 },
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

interface Base { id: string; name: string; slot: Slot; ilvl: number; dmg?: [number, number]; armor?: number }
const BASES: Base[] = [
  { id: 'roestig_zwaard', name: 'Rusty Sword', slot: 'wapen', ilvl: 1, dmg: [3, 6] },
  { id: 'korte_degen', name: 'Short Sword', slot: 'wapen', ilvl: 2, dmg: [4, 7] },
  { id: 'rapier', name: 'Rapier', slot: 'wapen', ilvl: 3, dmg: [5, 9] },
  { id: 'slagzwaard', name: 'Heavy Sword', slot: 'wapen', ilvl: 5, dmg: [8, 14] },
  { id: 'schutterszwaard', name: 'Guildsman\'s Sword', slot: 'wapen', ilvl: 7, dmg: [11, 18] },
  { id: 'officiersdegen', name: 'Officer\'s Blade', slot: 'wapen', ilvl: 9, dmg: [14, 22] },
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
  klepelstaf: { base: 'roestig_zwaard', name: 'Clapper Staff', slot: 'wapen', rarity: 0, ilvl: 1, dmg: [3, 6], mods: { klank: 2 }, text: 'An old bell clapper on an ash-wood shaft.' },
  ponjaard: { base: 'korte_degen', name: 'Poniard', slot: 'wapen', rarity: 0, ilvl: 1, dmg: [3, 6], mods: { crit: 3 }, text: 'Short, sharp and easy to hide.' },
  pelgrimsmantel: { base: 'linnen_wambuis', name: 'Pilgrim\'s Cloak', slot: 'harnas', rarity: 1, ilvl: 2, armor: 6, mods: { taaiheid: 2 }, text: 'Blessed in Scherpenheuvel. It still smells of incense.' },
  roelofs_slagzwaard: { base: 'slagzwaard', name: 'Lambrecht\'s Heavy Sword', slot: 'wapen', rarity: 3, ilvl: 5, dmg: [11, 18], mods: { kracht: 4, crit: 5 }, text: 'Lambrecht the Red plundered three villages with it. The sword remembers.' },
  kluddevel: { base: 'buffeljas', name: 'Kludde Hide', slot: 'harnas', rarity: 3, ilvl: 5, armor: 20, mods: { taaiheid: 4, hp: 25 }, text: 'The pelt of the Kludde. It is still wet and still warm.' },
  eikenhart: { base: 'eiken_beeldje', name: 'Oakheart', slot: 'talisman', rarity: 3, ilvl: 4, mods: { klank: 5, fire: 20, hp: 15 }, text: 'Wood of the holy oak. It hums when the bells fall silent.' },
  zegelring: { base: 'pelgrimsinsigne', name: 'Weaver\'s Signet', slot: 'talisman', rarity: 2, ilvl: 3, mods: { list: 3, crit: 4 }, text: 'The seal of the weavers\' guild. It opens doors in every cloth hall.' },
};

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

  get origin() {
    return ORIGINS[this.h.origin];
  }

  get background() {
    return BACKGROUNDS[this.h.background] ?? BACKGROUNDS.diest;
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
    // where you are from: one small passive
    const bg = this.background.bonus;
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
   * weighed lightly, dragon fire. Bell skills scale with Klank, so it counts for the Beiaardier's hits too.
   */
  private worth(d: Derived) {
    const hit = ((d.dmg[0] + d.dmg[1]) / 2) * (1 + (0.75 * d.crit) / 100) * (this.h.origin === 'klokkenluider' ? Math.sqrt(d.power) : 1);
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

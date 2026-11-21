// The player's progress: who they are, quests, flags, inventory, money and
// renown. Saved to this browser's local storage (a per-player convenience for
// the prototype; accounts and cloud saves come later).

import type { BackgroundId, Gear, OriginId, Slot } from './character';
import type { FactionId } from './factions';
import type { QuestStatus } from './types';

export interface QuestState {
  status: QuestStatus;
  stage: string;
  /** objective ids done in the current stage */
  done: string[];
  /** kill counts for the current stage, by objective id */
  counts: Record<string, number>;
  /** journal entries, oldest first */
  log: string[];
  outcome?: string;
  /** order the quest was started in (for sorting) */
  started: number;
}

export interface HeroData {
  name: string;
  origin: OriginId;
  cloak: string;
  dragon: string;
  // --- who you are (made in the creation screen; an older save gets the defaults: a man of his class)
  sex: 'm' | 'f';
  /** the kit body (see look.ts): man_young, man, man_stout, woman, woman_stout... */
  build: string;
  /** face morph weights, by name (explicit, so the face is the same every time) */
  face: Record<string, number>;
  /** index into the kit's skin tones */
  skin: number;
  /** hair piece (null: bare head) and its palette colour */
  hair: string | null;
  hairColor: string;
  beard: string | null;
  /** wear the class's hat */
  hat: boolean;
  /** herkomst: where you are from */
  background: BackgroundId;
  /** the party you chose as your first loyalty */
  faction: FactionId;
  /** the dragon's scale colour (see src/player/scales.ts) */
  scales: string;
  // --- added with the second character kit; an older save has none of these and gets the defaults in look.ts
  /** overall scale of the figure, 0.92 .. 1.08 (1: the body as built) */
  height?: number;
  /** iris colour (hex); null: as painted */
  eyes?: string | null;
  /** scar, freckles, eyepatch, weathered; null: none */
  mark?: string | null;
  /** which of the class's outfits (index into look.ts OUTFITS) */
  outfit?: number;
  /** the outfit's main and accent dyes (palette names); absent: the outfit's own */
  main?: string;
  accent?: string;
  /** headwear piece, null for bare-headed; absent: the outfit's own (when `hat` is on) */
  headwear?: string | null;
  /** mantle style: mantle, mantle_short, mantle_hood */
  mantle?: string;
  /** the dragon's belly and wing membranes, its eyes (hex; null: as painted) and its horns (see scales.ts) */
  dragonBelly?: string | null;
  dragonEyes?: string | null;
  dragonHorns?: string;
  level: number;
  xp: number;
  hp: number;
  gear: Partial<Record<Slot, Gear>>;
  bag: Gear[];
}

export interface SaveData {
  v: 2;
  /** false until the character has been made */
  created: boolean;
  hero: HeroData;
  quests: Record<string, QuestState>;
  flags: Record<string, string | number | boolean>;
  inv: Record<string, number>;
  florins: number;
  renown: Record<string, number>;
  tracked: string | null;
  /** pickups already taken, as "quest:objective:index" */
  taken: string[];
  discovered: string[];
  counter: number;
  kills: number;
  /** ids of the Kroniek entries the player has unlocked */
  kroniek: string[];
  /** standing with each party (see factions.ts), in points */
  standing: Record<string, number>;
  /** everyday life in town (src/life): visits, buffs, jobs, collections */
  life: LifeSave;
}

/** What src/life remembers. Every field has a default, so older saves load as they are. */
export interface LifeSave {
  /** services and guides spoken to at least once (by id) */
  met: string[];
  /** small things in the streets used at least once (sign, door, well, shrine keys) */
  spots: string[];
  /** spot key -> day key of the last use, for once-a-day things */
  spotDay: Record<string, string>;
  /** guide topics asked about */
  topics: string[];
  /** active buffs: id -> seconds left */
  buffs: Record<string, number>;
  /** the day the notice board was last read, and the jobs taken from it that day */
  boardDay: string;
  boardTaken: string[];
  /** readables read (or re-read) while a "read the notices" job runs */
  reads: string[];
  /** florins spent per party, not yet turned into standing */
  spent: Record<string, number>;
  /** renown already carried over into standing (old saves) */
  migrated: boolean;
  /** stops of the town walk reached */
  walk: number;
  /** wins at dice, and games played */
  dice: [number, number];
  /** golden weathercocks taken */
  cocks: string[];
}

export function freshLife(): LifeSave {
  return { met: [], spots: [], spotDay: {}, topics: [], buffs: {}, boardDay: '', boardTaken: [], reads: [], spent: {}, migrated: false, walk: 0, dice: [0, 0], cocks: [] };
}

const KEY = 'belfort-save-v2';

export function freshSave(): SaveData {
  return {
    v: 2,
    created: false,
    hero: {
      name: 'Lieven', origin: 'schutter', cloak: '#8c2a1e', dragon: 'Gloed', level: 1, xp: 0, hp: 100, gear: {}, bag: [],
      sex: 'm', build: 'man_young', face: {}, skin: 1, hair: 'hair_long', hairColor: 'h_brown', beard: 'moustache', hat: true,
      background: 'diest', faction: 'gilden', scales: 'demer',
    },
    quests: {},
    flags: {},
    inv: { salve: 3 },
    florins: 12,
    renown: {},
    tracked: null,
    taken: [],
    discovered: [],
    counter: 0,
    kills: 0,
    kroniek: [],
    standing: {},
    life: freshLife(),
  };
}

export function hasSave() {
  try {
    const raw = localStorage.getItem(KEY);
    return !!raw && (JSON.parse(raw) as SaveData).created === true;
  } catch {
    return false;
  }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const d = JSON.parse(raw) as SaveData;
    if (d.v !== 2) return freshSave();
    const f = freshSave();
    return { ...f, ...d, hero: { ...f.hero, ...d.hero }, life: { ...freshLife(), ...(d.life ?? {}) } };
  } catch {
    return freshSave();
  }
}

export function writeSave(d: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
  } catch {
    /* private window or storage blocked: play on without saving */
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

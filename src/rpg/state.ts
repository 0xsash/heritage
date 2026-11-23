// The player's progress: who they are, quests, flags, inventory, money and
// standing with the parties. Saved to this browser's local storage (a per-player convenience for
// the prototype; accounts and cloud saves come later).

import type { BackgroundId, Gear, OriginId, Slot } from './character';
import { RENOWN_TO_FACTION, type FactionId } from './factions';
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
  /** the format's version (SAVE_VERSION); loadSave walks an older one up through MIGRATE */
  v: 3;
  /** false until the character has been made */
  created: boolean;
  hero: HeroData;
  quests: Record<string, QuestState>;
  flags: Record<string, string | number | boolean>;
  inv: Record<string, number>;
  florins: number;
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
  /** the old per-place renown has been carried over into standing (see MIGRATE[2]) */
  migrated: boolean;
  /** stops of the town walk reached */
  walk: number;
  /** wins at dice, and games played */
  dice: [number, number];
  /** golden weathercocks taken */
  cocks: string[];
  /** the last piece of gear sold today, so it can be bought back at the price you got (absent: none) */
  sold?: { day: string; at: string; price: number; gear: Gear } | null;
}

export function freshLife(): LifeSave {
  return { met: [], spots: [], spotDay: {}, topics: [], buffs: {}, boardDay: '', boardTaken: [], reads: [], spent: {}, migrated: false, walk: 0, dice: [0, 0], cocks: [] };
}

const KEY = 'belfort-save-v2';
/** a save that could not be read is copied here before anything can overwrite it */
const BROKEN_KEY = 'belfort-save-v2-broken';
/** which open tab plays the save: only that one writes it (see claimSave) */
const OWNER_KEY = 'belfort-save-v2-owner';

/** The save format's version. A change to the format adds a step to MIGRATE and raises this by one. */
export const SAVE_VERSION = 3;

/**
 * Numbered steps that bring an older save up to date: MIGRATE[n] turns a version-n save into version n+1,
 * in place. Never drop a step: a save from any older version must still walk up to SAVE_VERSION.
 * (There is no step from 1: version 1 lived under another key and never reaches loadSave.)
 */
const MIGRATE: Record<number, (d: Record<string, unknown>) => void> = {
  // 2 -> 3: one reputation. Renown per place ("faam") is gone; what a save still holds of it goes to the
  // party that owns the place, unless an earlier build already carried it over (life.migrated).
  2: (d) => {
    const renown = isObj(d.renown) ? d.renown : {};
    const life = isObj(d.life) ? d.life : (d.life = {});
    const standing = isObj(d.standing) ? d.standing : (d.standing = {});
    if (!life.migrated) {
      for (const [place, n] of Object.entries(renown)) {
        const f = RENOWN_TO_FACTION[place];
        if (f && typeof n === 'number' && n) standing[f] = Math.max(0, (Number(standing[f]) || 0) + n);
      }
    }
    life.migrated = true;
    delete d.renown;
  },
};

export function freshSave(): SaveData {
  return {
    v: SAVE_VERSION,
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
  return loadSave().created === true;
}

const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);

/** Walk a parsed save up to SAVE_VERSION and fill in defaults; null when it cannot be read (not a save, or from a newer build). */
export function migrate(raw: unknown): SaveData | null {
  if (!isObj(raw) || typeof raw.v !== 'number') return null;
  const d = raw;
  if ((d.v as number) > SAVE_VERSION) return null;
  while ((d.v as number) < SAVE_VERSION) {
    const step = MIGRATE[d.v as number];
    if (!step) return null;
    step(d);
    d.v = (d.v as number) + 1;
  }
  // every field has a default, so a save missing one (an older or hand-edited one) still loads
  const f = freshSave();
  const obj = <T,>(x: unknown, def: T): T => (isObj(x) ? (x as T) : def);
  const arr = <T,>(x: unknown, def: T[]): T[] => (Array.isArray(x) ? (x as T[]) : def);
  const hero = { ...f.hero, ...obj(d.hero, {}) } as HeroData;
  hero.gear = obj(hero.gear, {});
  hero.bag = arr(hero.bag, []);
  const quests = obj<Record<string, QuestState>>(d.quests, {});
  for (const [id, q] of Object.entries(quests)) {
    if (!isObj(q)) delete quests[id];
    else Object.assign(q, { done: arr(q.done, []), counts: obj(q.counts, {}), log: arr(q.log, []), started: Number(q.started) || 0 });
  }
  return {
    ...f,
    ...d,
    v: SAVE_VERSION,
    hero,
    quests,
    flags: obj(d.flags, {}),
    inv: obj(d.inv, f.inv),
    standing: obj(d.standing, {}),
    taken: arr(d.taken, []),
    discovered: arr(d.discovered, []),
    kroniek: arr(d.kroniek, []),
    life: { ...freshLife(), ...obj(d.life, {}) },
  } as SaveData;
}

/** the save as this page found it at its first read: undefined before that, null once this page has written one */
let foundAtBoot: string | null | undefined;

export function loadSave(): SaveData {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    /* storage blocked: play on with a fresh save */
  }
  if (foundAtBoot === undefined) foundAtBoot = raw;
  if (!raw) return freshSave();
  let d: SaveData | null = null;
  try {
    d = migrate(JSON.parse(raw));
  } catch {
    d = null;
  }
  if (d) return d;
  // unreadable (cut off, garbage, or from a newer build): keep a copy before a new game can overwrite it
  try {
    if (localStorage.getItem(BROKEN_KEY) !== raw) localStorage.setItem(BROKEN_KEY, raw);
  } catch {
    /* ignore */
  }
  return freshSave();
}

/** The save this page plays was already in storage when the page opened (an earlier visit), not written by this page. */
export function fromEarlierVisit() {
  return typeof foundAtBoot === 'string';
}

// ------------------------------------------------------------ one tab at a time
// Each tab holds the whole save in memory and writes all of it, so two open tabs would undo each other's
// progress. The tab that last started playing owns the save; any other tab stops writing and says so.
const TAB = Math.random().toString(36).slice(2) + Date.now().toString(36);
let claimed = false;
let lost = false;

/** This tab plays the save from now on (call it before reading the save to play it). */
export function claimSave() {
  claimed = true;
  try {
    localStorage.setItem(OWNER_KEY, TAB);
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
}

function onStorage(e: StorageEvent) {
  if (e.key === OWNER_KEY && e.newValue && e.newValue !== TAB) loseSave();
}

function ownedElsewhere() {
  try {
    const o = localStorage.getItem(OWNER_KEY);
    return claimed && !!o && o !== TAB;
  } catch {
    return false;
  }
}

/** Another tab took the save over: stop writing here, and cover this tab with a notice. */
function loseSave() {
  if (lost) return;
  lost = true;
  if (typeof document === 'undefined') return;
  document.exitPointerLock?.();
  const el = document.createElement('div');
  el.className = 'elsewhere';
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(12,10,8,.92);color:#e8dcc0;font:18px/1.5 Georgia,serif;text-align:center;padding:16px';
  el.innerHTML = '<div style="max-width:30em">The game has been opened in another window. Your progress is saved there now, not here.</div><button style="font:inherit;padding:8px 18px;cursor:pointer">CONTINUE HERE</button>';
  el.querySelector('button')!.addEventListener('click', () => location.reload());
  for (const t of ['pointerdown', 'mousedown', 'click', 'wheel'] as const) el.addEventListener(t, (ev) => ev.stopPropagation());
  document.body.appendChild(el);
}

/** false when the save was not written (storage blocked or full, or another tab plays it) */
export function writeSave(d: SaveData): boolean {
  if (lost) return false;
  if (ownedElsewhere()) {
    loseSave();
    return false;
  }
  // a tab that writes a save before it claimed one (a new game, the debug default) plays that save
  if (!claimed) claimSave();
  foundAtBoot = null;
  try {
    localStorage.setItem(KEY, JSON.stringify(d));
    return true;
  } catch {
    /* private window or storage blocked: play on without saving */
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

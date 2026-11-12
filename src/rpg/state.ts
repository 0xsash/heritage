// The player's progress: who they are, quests, flags, inventory, money and
// renown. Saved to this browser's local storage (a per-player convenience for
// the prototype; accounts and cloud saves come later).

import type { Gear, OriginId, Slot } from './character';
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
}

const KEY = 'belfort-save-v2';

export function freshSave(): SaveData {
  return {
    v: 2,
    created: false,
    hero: { name: 'Lieven', origin: 'schutter', cloak: '#8c2a1e', dragon: 'Gloed', level: 1, xp: 0, hp: 100, gear: {}, bag: [] },
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
    return { ...f, ...d, hero: { ...f.hero, ...d.hero } };
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

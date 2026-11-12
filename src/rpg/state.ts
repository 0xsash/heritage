// The player's progress: quests, flags, inventory, money and renown.
// Saved to this browser's local storage (a per-player convenience for the
// prototype; accounts and cloud saves come later).

import type { QuestStatus } from './types';

export interface QuestState {
  status: QuestStatus;
  stage: string;
  /** objective ids done in the current stage */
  done: string[];
  /** journal entries, oldest first */
  log: string[];
  outcome?: string;
  /** order the quest was started in (for sorting) */
  started: number;
}

export interface SaveData {
  v: 1;
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
}

const KEY = 'belfort-save-v1';

export function freshSave(): SaveData {
  return { v: 1, quests: {}, flags: {}, inv: {}, florins: 12, renown: {}, tracked: null, taken: [], discovered: [], counter: 0 };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshSave();
    const d = JSON.parse(raw) as SaveData;
    if (d.v !== 1) return freshSave();
    return { ...freshSave(), ...d };
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

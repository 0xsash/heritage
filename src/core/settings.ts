// The player's settings: how the mouse turns the camera, how loud it is, how
// fine the picture. Kept in this browser next to the save (a key of its own),
// read once at boot and written on every change. Storage may be blocked: then
// the defaults hold and nothing breaks.

export type Quality = 'low' | 'high';

export interface Settings {
  /** mouse sensitivity as a multiplier on the default (0.3 .. 2.5) */
  sens: number;
  /** up and down turned round, for the mouse and the right stick */
  invert: boolean;
  /** 0 .. 1 */
  volume: number;
  /** the sounds of the game: wind, wings, swords, bells (0 .. 1, under the volume) */
  effects: number;
  /** the background in the films and the prologue: water, drone, the murmur of a town (0 .. 1) */
  ambience: number;
  /** picture quality; `low` is what ?lowq gives (smaller textures, no shadows, no ambient occlusion) */
  quality: Quality;
}

const KEY = 'belfort-settings';

export const DEFAULT_SETTINGS: Settings = { sens: 1, invert: false, volume: 0.8, effects: 1, ambience: 1, quality: 'high' };

const num = (x: unknown, lo: number, hi: number, def: number) => (typeof x === 'number' && Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : def);

export function loadSettings(): Settings {
  const d = DEFAULT_SETTINGS;
  let raw: Record<string, unknown> = {};
  try {
    const t = localStorage.getItem(KEY);
    if (t) raw = JSON.parse(t) as Record<string, unknown>;
  } catch {
    /* blocked or unreadable: the defaults */
  }
  if (!raw || typeof raw !== 'object') raw = {};
  return {
    sens: num(raw.sens, 0.3, 2.5, d.sens),
    invert: typeof raw.invert === 'boolean' ? raw.invert : d.invert,
    volume: num(raw.volume, 0, 1, d.volume),
    effects: num(raw.effects, 0, 1, d.effects),
    ambience: num(raw.ambience, 0, 1, d.ambience),
    quality: raw.quality === 'low' ? 'low' : 'high',
  };
}

export function saveSettings(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage blocked: the settings hold for this visit only */
  }
}

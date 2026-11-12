// Data model for quests, dialogue, NPCs and items. Content lives in
// src/content/*.ts and is pure data: the engine (state.ts, quests.ts) runs it.

/** A condition on the game state. */
export type Cond =
  | { flag: string; is?: string | number | boolean } // flag equals `is` (default: is truthy)
  | { quest: string; state: QuestStatus | 'none'; stage?: string }
  | { item: string; count?: number }
  | { florins: number } // at least this many
  | { not: Cond }
  | { all: Cond[] }
  | { any: Cond[] };

/** Something that happens: from a dialogue line, a choice, or a finished stage. */
export type Effect =
  | { start: string } // start a quest
  | { stage: [quest: string, stage: string] } // move a quest to a stage
  | { done: [quest: string, objective: string] } // mark an objective done
  | { complete: string; outcome?: string } // finish a quest (pays its reward)
  | { fail: string }
  | { set: string; to?: string | number | boolean }
  | { give: string; n?: number }
  | { take: string; n?: number }
  | { florins: number }
  | { renown: [town: string, amount: number] }
  | { note: [quest: string, text: string] } // add a journal entry
  | { toast: string }
  | { xp: number }
  | { gear: string } // a named piece of gear from the catalogue (character.ts)
  | { open: 'shop' | 'character' }; // open a panel

export type QuestStatus = 'active' | 'done' | 'failed';

export interface Choice {
  text: string;
  next?: string;
  effects?: Effect[];
  /** only offered when this holds */
  if?: Cond;
}

export interface Line {
  /** speaker: an NPC id, or 'you' */
  who: string;
  text: string;
  next?: string;
  choices?: Choice[];
  effects?: Effect[];
}

export interface NpcDef {
  id: string;
  name: string;
  role: string;
  /** where they stand (local metres); the engine finds open ground nearby */
  at: [number, number];
  facing?: number;
  /** cloak colour (multiplies the model's red) */
  tint?: string;
  /** who they are, from the townsfolk kit: body, clothes (piece -> dye), prop */
  look?: { body: string; wear: Record<string, string | null>; prop?: string | null };
  /** which conversation to start: the first entry whose condition holds */
  talk: { if?: Cond; start: string }[];
  /** quests this NPC gives (drives the "!" marker) */
  offers?: string[];
  /** sells potions and gear */
  shop?: boolean;
  /** a small walk around their spot, so the square does not look like a waxworks */
  wander?: number;
}

export type Objective =
  | { id: string; text: string; kind: 'talk'; npc: string }
  | { id: string; text: string; kind: 'reach'; at: [number, number]; r: number; minY?: number; onFoot?: boolean }
  | { id: string; text: string; kind: 'kill'; enemy?: string; camp?: string; count: number; at: [number, number]; r: number }
  | { id: string; text: string; kind: 'collect'; item: string; count: number; spawns: [number, number][] }
  | { id: string; text: string; kind: 'flag'; flag: string; hint?: [number, number] };

export interface Stage {
  id: string;
  /** journal entry written when the stage begins */
  journal: string;
  objectives: Objective[];
  /** run when every objective is done (usually moves to the next stage or completes the quest) */
  onDone?: Effect[];
}

export interface QuestDef {
  id: string;
  title: string;
  kind: 'main' | 'side' | 'contract';
  town: string;
  giver?: string;
  summary: string;
  stages: Stage[];
  reward?: { xp?: number; florins?: number; renown?: [string, number][]; items?: [string, number][]; gear?: string[] };
  /** the level the quest is meant for (shown in the journal and on markers) */
  level?: number;
}

export interface ItemDef {
  id: string;
  name: string;
  text: string;
  /** quest items can't be sold or dropped */
  quest?: boolean;
}

/** A group of enemies that holds a place. */
export interface CampDef {
  id: string;
  name: string;
  at: [number, number];
  /** how far they wander from the spot */
  r: number;
  /** [enemy type, level, count] */
  enemies: [string, number, number][];
  /** a named, tougher leader */
  elite?: { type: string; level: number; name: string };
  /** seconds before a cleared camp fills again (0 = never) */
  respawn: number;
  /** only there while this holds */
  if?: Cond;
}

export interface Content {
  camps: CampDef[];
  npcs: NpcDef[];
  quests: QuestDef[];
  dialogue: Record<string, Line>;
  items: ItemDef[];
}

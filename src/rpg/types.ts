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
  | { toast: string };

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
  /** which conversation to start: the first entry whose condition holds */
  talk: { if?: Cond; start: string }[];
  /** quests this NPC gives (drives the "!" marker) */
  offers?: string[];
}

export type Objective =
  | { id: string; text: string; kind: 'talk'; npc: string }
  | { id: string; text: string; kind: 'reach'; at: [number, number]; r: number; minY?: number }
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
  reward?: { florins?: number; renown?: [string, number][]; items?: [string, number][] };
}

export interface ItemDef {
  id: string;
  name: string;
  text: string;
  /** quest items can't be sold or dropped */
  quest?: boolean;
}

export interface Content {
  npcs: NpcDef[];
  quests: QuestDef[];
  dialogue: Record<string, Line>;
  items: ItemDef[];
}

// Data shapes for everyday life in town: services (merchants and guides),
// their wares, the things in the streets, jobs on the notice board. The
// content is in src/content/diest_life.ts and src/content/diest_talk.ts.

import type { FactionId } from '../rpg/factions';
import type { Truth } from '../rpg/kroniek';

/** What stands at a service: a market stall with goods, or a door in a wall. */
export type StallKind = 'bread' | 'herbs' | 'books' | 'cloth' | 'iron' | 'beer' | 'salves' | 'badges' | 'army' | 'crier' | 'door';

export interface ServiceDef {
  id: string;
  name: string;
  /** what they are, shown under the name */
  role: string;
  faction: FactionId;
  at: [number, number];
  /** which way the stall or the person faces (radians, 0 = south); searched for if absent */
  facing?: number;
  look: { body: string; wear: Record<string, string | null>; prop?: string | null };
  /** one character for the map and the sign over their head */
  glyph: string;
  /** what the map calls them */
  label: string;
  stall: StallKind;
  /** their own greetings (the tier greeting of their party comes first) */
  greet: string[];
  /** what they say while you browse */
  shopGreet?: string[];
  /** their stock (src/life/shop.ts) */
  shop?: string;
  /** a guide: what they explain */
  guide?: 'crier' | 'notary' | 'gate' | 'pilgrims' | 'inn';
  /** the gate they keep */
  gate?: string;
  /** part of the market (one mark on the zoomed-out map) */
  market?: boolean;
}

/** Something to buy that is not gear. */
export interface Good {
  id: string;
  name: string;
  text: string;
  price: number;
  /** standing tier with the seller's party needed (0..4) */
  tier?: number;
  /** hero level needed */
  level?: number;
  /** what it does */
  use:
    | { heal: number } // share of max life, at once
    | { regen: number; secs: number } // share of max life per second, for a while
    | { salve: number } // salves to carry
    | { buff: string; secs: number } // a named buff (zegen, moed...)
    | { cloak: string } // dye the cloak
    | { reveal: string[] } // places shown on the map (discovery keys)
    | { kroniek: string[] } // pages for the Kroniek
    | { talisman: string }; // a talisman (see TALISMANS)
}

/** A page for the Kroniek written for this layer (topics, tales). */
export interface Page {
  id: string;
  cat: 'plaats' | 'tijd' | 'mens' | 'wezen';
  title: string;
  text: string;
  truth: Truth;
  hint: string;
}

/** A topic a guide can explain. */
export interface Topic {
  id: string;
  ask: string;
  answer: string;
  /** the Kroniek page it opens */
  page: string;
  truth: Truth;
}

/** Small things in the streets. */
export type SpotKind = 'sign' | 'door' | 'well' | 'shrine';

export interface JobTemplate {
  id: string;
  kind: 'bounty' | 'delivery' | 'read' | 'fetch';
  /** the notice as it hangs on the board ({camp}, {from}, {to}, {n}, {what}, {where}) */
  notice: string;
  title: string;
  /** journal entries for the stages */
  journal: string[];
  /** what the client says when paying */
  thanks: string;
  /** who pays (service ids); one is picked */
  clients: string[];
  /** delivery: the goods, and who sends them */
  goods?: string[];
  from?: string[];
}

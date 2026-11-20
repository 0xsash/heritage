// Conversations built while you talk: each answer is written the moment you
// choose a question, into the same dialogue box the quests use. A choice either
// leads to a reply (written by its function) or closes the conversation (and
// may then open a shop, start a race...).

import type { QuestEngine } from '../rpg/quests';
import type { Line } from '../rpg/types';
import type { DialogueUI } from '../ui/rpgui';

export interface Ch {
  text: string;
  /** writes the next line */
  reply?: () => Spec;
  /** closes the conversation, then runs this */
  close?: () => void;
}

export interface Spec {
  who: string;
  text: string;
  choices?: Ch[];
  /** when there are no choices: run this when the line is closed */
  then?: () => void;
}

export class Talk {
  private n = 0;
  private lines: string[] = [];
  private actions = new Map<string, () => void>();
  private after: (() => void) | null = null;

  constructor(private q: QuestEngine, private dialogue: DialogueUI, private closed: () => void) {}

  /** The name and role shown above what someone says. */
  speaker(id: string, name: string, role: string, at: [number, number] = [0, 0]) {
    const n = this.q.npcs.get(id);
    if (n) {
      n.name = name;
      n.role = role;
    } else this.q.npcs.set(id, { id, name, role, at, talk: [] });
  }

  get open() {
    return this.dialogue.open;
  }

  /** Begin a conversation with `who` (an id registered with speaker()). */
  start(who: string, first: Spec) {
    this.clear();
    const id = this.write(first);
    this.dialogue.start(who, id, () => {
      const a = this.after;
      this.after = null;
      this.clear();
      this.closed();
      a?.();
    });
  }

  private clear() {
    for (const id of this.lines) delete this.q.content.dialogue[id];
    this.lines = [];
    this.actions.clear();
  }

  private id() {
    const id = `life:${++this.n}`;
    this.lines.push(id);
    return id;
  }

  /** Write a line (and the hooks behind its choices) into the dialogue table. */
  private write(spec: Spec, into?: string): string {
    const id = into ?? this.id();
    const line: Line = { who: spec.who, text: spec.text };
    if (spec.choices?.length) {
      line.choices = spec.choices.map((c) => {
        const token = `life:${++this.n}`;
        if (c.reply) {
          const next = this.id();
          const reply = c.reply;
          this.actions.set(token, () => this.write(reply(), next));
          return { text: c.text, next, effects: [{ call: token }] };
        }
        const close = c.close;
        this.actions.set(token, () => (this.after = close ?? null));
        return { text: c.text, effects: [{ call: token }] };
      });
    } else if (spec.then) {
      this.after = spec.then;
    }
    this.q.content.dialogue[id] = line;
    return id;
  }

  /** A `{call}` effect from the dialogue box: true when it was one of ours. */
  call(token: string) {
    const a = this.actions.get(token);
    if (!a) return false;
    a();
    return true;
  }
}

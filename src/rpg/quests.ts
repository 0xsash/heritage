// The quest engine: evaluates conditions, applies effects, tracks objectives,
// pays rewards, and tells the UI what happened.

import { type Gear, Sheet, uniqueGear } from './character';
import type { Cond, Content, Effect, ItemDef, NpcDef, Objective, QuestDef, Stage } from './types';
import { type SaveData, loadSave, writeSave } from './state';

export interface QuestEvents {
  toast(kicker: string, text: string): void;
  changed(): void;
  /** a big centred banner: quest accepted / completed */
  banner(kind: 'start' | 'done' | 'failed', title: string, lines: string[]): void;
  xp(amount: number, levels: number): void;
  gear(g: Gear): void;
  open(panel: 'shop' | 'character'): void;
}

export interface Target {
  quest: QuestDef;
  objective: Objective;
  x: number;
  z: number;
}

export class QuestEngine {
  s: SaveData;
  private quests = new Map<string, QuestDef>();
  private items = new Map<string, ItemDef>();
  npcs = new Map<string, NpcDef>();
  /** NPC positions after they were placed in the world */
  npcPos = new Map<string, [number, number]>();
  private dirty = false;
  sheet: Sheet;

  constructor(public content: Content, private ev: QuestEvents) {
    this.s = loadSave();
    this.sheet = new Sheet(this.s.hero);
    for (const q of content.quests) this.quests.set(q.id, q);
    for (const i of content.items) this.items.set(i.id, i);
    for (const n of content.npcs) this.npcs.set(n.id, n);
  }

  quest(id: string) {
    return this.quests.get(id);
  }

  item(id: string) {
    return this.items.get(id);
  }

  allQuests() {
    return [...this.quests.values()];
  }

  stageOf(q: QuestDef): Stage | undefined {
    const st = this.s.quests[q.id];
    return st ? q.stages.find((s) => s.id === st.stage) : undefined;
  }

  // ------------------------------------------------------------ conditions
  test(c: Cond | undefined): boolean {
    if (!c) return true;
    if ('all' in c) return c.all.every((x) => this.test(x));
    if ('any' in c) return c.any.some((x) => this.test(x));
    if ('not' in c) return !this.test(c.not);
    if ('flag' in c) {
      const v = this.s.flags[c.flag];
      return c.is === undefined ? !!v : v === c.is;
    }
    if ('quest' in c) {
      const st = this.s.quests[c.quest];
      if (c.state === 'none') return !st;
      if (!st || st.status !== c.state) return false;
      return c.stage === undefined || st.stage === c.stage;
    }
    if ('item' in c) return (this.s.inv[c.item] ?? 0) >= (c.count ?? 1);
    if ('florins' in c) return this.s.florins >= c.florins;
    return true;
  }

  // ------------------------------------------------------------ effects
  apply(effects: Effect[] | undefined) {
    if (!effects) return;
    for (const e of effects) this.applyOne(e);
    this.dirty = true;
    this.ev.changed();
  }

  private applyOne(e: Effect) {
    if ('start' in e) return this.start(e.start);
    if ('stage' in e) return this.setStage(e.stage[0], e.stage[1]);
    if ('done' in e) return this.markDone(e.done[0], e.done[1]);
    if ('complete' in e) return this.complete(e.complete, e.outcome);
    if ('fail' in e) {
      const st = this.s.quests[e.fail];
      if (st) {
        st.status = 'failed';
        this.ev.toast('QUEST FAILED', this.quests.get(e.fail)?.title ?? e.fail);
      }
      return;
    }
    if ('set' in e) {
      this.s.flags[e.set] = e.to ?? true;
      return;
    }
    if ('give' in e) {
      const n = e.n ?? 1;
      this.s.inv[e.give] = (this.s.inv[e.give] ?? 0) + n;
      this.ev.toast('RECEIVED', `${this.items.get(e.give)?.name ?? e.give}${n > 1 ? ' ×' + n : ''}`);
      return;
    }
    if ('take' in e) {
      this.s.inv[e.take] = Math.max(0, (this.s.inv[e.take] ?? 0) - (e.n ?? 1));
      return;
    }
    if ('florins' in e) {
      this.s.florins += e.florins;
      this.ev.toast(e.florins >= 0 ? 'FLORINS' : 'PAID', `${e.florins >= 0 ? '+' : ''}${e.florins} florins`);
      return;
    }
    if ('renown' in e) {
      const [town, n] = e.renown;
      this.s.renown[town] = (this.s.renown[town] ?? 0) + n;
      this.ev.toast('RENOWN', `${town} ${n >= 0 ? '+' : ''}${n}`);
      return;
    }
    if ('note' in e) {
      this.s.quests[e.note[0]]?.log.push(e.note[1]);
      return;
    }
    if ('toast' in e) return this.ev.toast('', e.toast);
    if ('xp' in e) return this.addXp(e.xp);
    if ('gear' in e) {
      const g = uniqueGear(e.gear);
      if (g) this.giveGear(g);
      return;
    }
    if ('open' in e) this.ev.open(e.open);
  }

  addXp(n: number) {
    const levels = this.sheet.gainXp(n);
    this.ev.xp(n, levels);
    this.dirty = true;
  }

  giveGear(g: Gear) {
    this.s.hero.bag.push(g);
    this.ev.gear(g);
    this.dirty = true;
  }

  /** Fill in the hero's and the dragon's names. */
  fill(text: string) {
    return text.replace(/\{name\}/g, this.s.hero.name).replace(/\{dragon\}/g, this.s.hero.dragon);
  }

  start(id: string) {
    const q = this.quests.get(id);
    if (!q || this.s.quests[id]) return;
    const first = q.stages[0];
    this.s.quests[id] = { status: 'active', stage: first.id, done: [], counts: {}, log: [first.journal], started: ++this.s.counter };
    // a quest you just took is the one you want to follow
    this.s.tracked = id;
    this.ev.banner('start', q.title, [q.kind === 'main' ? 'Hoofdverhaal' : q.kind === 'contract' ? 'Opdracht' : 'Zijverhaal', this.fill(first.objectives[0]?.text ?? '')]);
    this.checkStage(q);
  }

  setStage(id: string, stage: string) {
    const q = this.quests.get(id);
    const st = this.s.quests[id];
    if (!q || !st || st.status !== 'active') return;
    const s = q.stages.find((x) => x.id === stage);
    if (!s) return;
    st.stage = stage;
    st.done = [];
    st.counts = {};
    st.log.push(s.journal);
    this.ev.toast('DAGBOEK', q.title);
    this.checkStage(q);
  }

  markDone(id: string, objective: string) {
    const q = this.quests.get(id);
    const st = this.s.quests[id];
    if (!q || !st || st.status !== 'active' || st.done.includes(objective)) return;
    const stage = this.stageOf(q);
    if (!stage?.objectives.some((o) => o.id === objective)) return;
    st.done.push(objective);
    this.checkStage(q);
  }

  complete(id: string, outcome?: string) {
    const q = this.quests.get(id);
    const st = this.s.quests[id];
    if (!q || !st || st.status !== 'active') return;
    st.status = 'done';
    st.outcome = outcome;
    const r = q.reward;
    const lines: string[] = [];
    if (r?.xp) lines.push(`+${r.xp} ervaring`);
    if (r?.florins) lines.push(`+${r.florins} florijnen`);
    for (const [town, n] of r?.renown ?? []) lines.push(`${town} +${n} aanzien`);
    for (const id of r?.gear ?? []) {
      const g = uniqueGear(id);
      if (g) lines.push(g.name);
    }
    this.ev.banner('done', q.title, lines);
    if (r?.florins) this.s.florins += r.florins;
    for (const [town, n] of r?.renown ?? []) this.s.renown[town] = (this.s.renown[town] ?? 0) + n;
    for (const [item, n] of r?.items ?? []) this.applyOne({ give: item, n });
    for (const id of r?.gear ?? []) this.applyOne({ gear: id });
    if (r?.xp) this.addXp(r.xp);
    if (this.s.tracked === id) {
      const next = Object.entries(this.s.quests).filter(([, v]) => v.status === 'active').sort((a, b) => b[1].started - a[1].started)[0];
      this.s.tracked = next?.[0] ?? null;
    }
  }

  /** Mark objectives that are already satisfied (items held, flags set), then run the stage's onDone if all are done. */
  private checkStage(q: QuestDef) {
    const st = this.s.quests[q.id];
    const stage = this.stageOf(q);
    if (!st || !stage || st.status !== 'active') return;
    for (const o of stage.objectives) {
      if (st.done.includes(o.id)) continue;
      if (o.kind === 'collect' && (this.s.inv[o.item] ?? 0) >= o.count) st.done.push(o.id);
      if (o.kind === 'flag' && this.s.flags[o.flag]) st.done.push(o.id);
      if (o.kind === 'kill' && (st.counts[o.id] ?? 0) >= o.count) st.done.push(o.id);
    }
    if (stage.objectives.every((o) => st.done.includes(o.id)) && stage.onDone) {
      const before = st.stage;
      this.apply(stage.onDone);
      // guard against a stage whose onDone does not move on
      if (st.stage === before && st.status === 'active') return;
    }
  }

  // ------------------------------------------------------------ per-frame checks
  /** Reach objectives and collected items. */
  update(x: number, y: number, z: number, onFoot = false) {
    for (const [id, st] of Object.entries(this.s.quests)) {
      if (st.status !== 'active') continue;
      const q = this.quests.get(id)!;
      const stage = this.stageOf(q);
      if (!stage) continue;
      for (const o of stage.objectives) {
        if (st.done.includes(o.id)) continue;
        if (o.kind === 'reach' && (x - o.at[0]) ** 2 + (z - o.at[1]) ** 2 < o.r * o.r && (o.minY === undefined || y >= o.minY) && (!o.onFoot || onFoot)) {
          st.done.push(o.id);
          this.dirty = true;
          this.ev.toast('', this.fill(o.text) + ' ✓');
          this.checkStage(q);
          this.ev.changed();
        }
      }
    }
    if (this.dirty) {
      this.dirty = false;
      writeSave(this.s);
    }
  }

  /** An enemy died: count it for any kill objective it matches. */
  onKill(type: string, camp: string | null, x: number, z: number, elite = false) {
    this.s.kills++;
    for (const [id, st] of Object.entries(this.s.quests)) {
      if (st.status !== 'active') continue;
      const q = this.quests.get(id)!;
      const stage = this.stageOf(q);
      for (const o of stage?.objectives ?? []) {
        if (o.kind !== 'kill' || st.done.includes(o.id)) continue;
        if (o.enemy && (o.enemy === 'elite' ? !elite : o.enemy !== type)) continue;
        if (o.camp && o.camp !== camp) continue;
        if (!o.camp && (x - o.at[0]) ** 2 + (z - o.at[1]) ** 2 > (o.r + 60) ** 2) continue;
        st.counts[o.id] = (st.counts[o.id] ?? 0) + 1;
        this.ev.toast('', `${this.fill(o.text)}: ${Math.min(st.counts[o.id], o.count)}/${o.count}`);
        this.checkStage(q);
        this.dirty = true;
        this.ev.changed();
      }
    }
  }

  /** Progress text for an objective, e.g. "(2/4)". */
  progress(questId: string, o: Objective) {
    const st = this.s.quests[questId];
    if (!st) return '';
    if (o.kind === 'collect') return ` (${Math.min(this.s.inv[o.item] ?? 0, o.count)}/${o.count})`;
    if (o.kind === 'kill') return ` (${Math.min(st.counts?.[o.id] ?? 0, o.count)}/${o.count})`;
    return '';
  }

  /** Pickups that should be in the world now. */
  activePickups(): { key: string; item: string; x: number; z: number }[] {
    const out: { key: string; item: string; x: number; z: number }[] = [];
    for (const [id, st] of Object.entries(this.s.quests)) {
      if (st.status !== 'active') continue;
      const stage = this.stageOf(this.quests.get(id)!);
      for (const o of stage?.objectives ?? []) {
        if (o.kind !== 'collect' || st.done.includes(o.id)) continue;
        o.spawns.forEach(([x, z], i) => {
          const key = `${id}:${o.id}:${i}`;
          if (!this.s.taken.includes(key)) out.push({ key, item: o.item, x, z });
        });
      }
    }
    return out;
  }

  take(key: string, item: string) {
    if (this.s.taken.includes(key)) return;
    this.s.taken.push(key);
    this.apply([{ give: item }]);
    for (const q of this.quests.values()) this.checkStage(q);
    writeSave(this.s);
  }

  /** The objective the compass and map should point at. */
  target(): Target | null {
    const id = this.s.tracked;
    if (!id) return null;
    const q = this.quests.get(id);
    const st = this.s.quests[id];
    if (!q || !st || st.status !== 'active') return null;
    const stage = this.stageOf(q);
    const o = stage?.objectives.find((x) => !st.done.includes(x.id));
    if (!o) return null;
    let at: [number, number] | undefined;
    if (o.kind === 'talk') at = this.npcPos.get(o.npc);
    else if (o.kind === 'reach' || o.kind === 'kill') at = o.at;
    else if (o.kind === 'collect') {
      const left = o.spawns.filter((_, i) => !this.s.taken.includes(`${id}:${o.id}:${i}`));
      at = left[0];
    } else if (o.kind === 'flag') at = o.hint;
    return at ? { quest: q, objective: o, x: at[0], z: at[1] } : null;
  }

  /** Active quests' next objectives, tracked first (for the on-screen tracker). */
  activeList(): { quest: QuestDef; objectives: Objective[]; tracked: boolean }[] {
    const out: { quest: QuestDef; objectives: Objective[]; tracked: boolean; started: number }[] = [];
    for (const [id, st] of Object.entries(this.s.quests)) {
      if (st.status !== 'active') continue;
      const q = this.quests.get(id)!;
      const stage = this.stageOf(q);
      out.push({ quest: q, objectives: (stage?.objectives ?? []).filter((o) => !st.done.includes(o.id)), tracked: this.s.tracked === id, started: st.started });
    }
    return out.sort((a, b) => Number(b.tracked) - Number(a.tracked) || (a.quest.kind === 'main' ? -1 : 0) - (b.quest.kind === 'main' ? -1 : 0) || b.started - a.started);
  }

  /** The nearest person with work to give, for when nothing is tracked. */
  nearestGiver(x: number, z: number): { npc: NpcDef; x: number; z: number } | null {
    let best: { npc: NpcDef; x: number; z: number } | null = null, bd = Infinity;
    for (const n of this.content.npcs) {
      if (this.marker(n.id) !== '!') continue;
      const p = this.npcPos.get(n.id);
      if (!p) continue;
      const d = (p[0] - x) ** 2 + (p[1] - z) ** 2;
      if (d < bd) { bd = d; best = { npc: n, x: p[0], z: p[1] }; }
    }
    return best;
  }

  /** "!" if the NPC has a quest to give, "?" if an active objective needs them. */
  marker(npcId: string): '!' | '?' | null {
    for (const [id, st] of Object.entries(this.s.quests)) {
      if (st.status !== 'active') continue;
      const stage = this.stageOf(this.quests.get(id)!);
      if (stage?.objectives.some((o) => o.kind === 'talk' && o.npc === npcId && !st.done.includes(o.id))) return '?';
    }
    const n = this.npcs.get(npcId);
    if (n?.offers?.some((q) => !this.s.quests[q])) return '!';
    return null;
  }

  conversationFor(npcId: string): string | null {
    const n = this.npcs.get(npcId);
    if (!n) return null;
    for (const t of n.talk) if (this.test(t.if)) return t.start;
    return null;
  }

  save() {
    writeSave(this.s);
  }
}

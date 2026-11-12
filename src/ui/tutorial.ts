// Learning by doing. One short hint at a time, shown only when it is the
// thing to do right now, and gone the moment the player does it. Nothing is
// taught before it is needed (flying first, then landing, walking, talking,
// and fighting only when the first enemy turns on you), nothing is repeated,
// and the world never stops for it.

import { keyGlyph } from './gamehud';

export interface TutorialCtx {
  mode: string; // fly | walk | landing | calling ...
  pad: boolean;
  /** radians turned and metres walked since the game started */
  turned: number;
  walked: number;
  throttle: number; // -1..1 this frame
  climbing: boolean;
  boosting: boolean;
  canLand: boolean;
  /** what the first-flight course is asking for right now, if anything */
  gate: 'steer' | 'climb' | null;
  /** metres to the tracked objective (Infinity when none) */
  toGoal: number;
  goalIsHere: boolean;
  talking: boolean;
  bookOpen: boolean;
  nearGiver: boolean;
  quests: number;
  inCombat: boolean;
  hpFrac: number;
  salves: number;
  tally: { hits: number; rolls: number; skills: number; potions: number; breaths: number; telegraphs: number };
  dragon: string;
  skill: string;
  uiOpen: boolean;
}

interface Step {
  id: string;
  /** keys shown as caps; text may use {dragon} and {skill} */
  keys: (pad: boolean) => string[];
  text: string;
  /** is this the thing to do right now? */
  when(c: TutorialCtx, t: Tutorial): boolean;
  /** has the player done it? */
  done(c: TutorialCtx, t: Tutorial): boolean;
  /** seconds after which the hint gives up (it has been seen) */
  patience?: number;
  /** seconds the situation must last before the hint shows (default 4) */
  stall?: number;
}

// Order is priority. `stall` is how long the situation must last, without the
// player doing the thing, before the hint appears: someone already doing it
// never sees it (and it counts as learned).
const STEPS: Step[] = [
  { id: 'steer', keys: (p) => (p ? ['L'] : ['MUIS']), text: 'Sturen', when: (c) => c.mode === 'fly', done: (c) => c.turned > 1.0 },
  { id: 'climb', keys: (p) => (p ? ['A', 'B'] : ['SPATIE', 'C']), text: 'Stijgen en dalen', when: (c) => c.mode === 'fly' && c.gate === 'climb', done: (c, t) => (t.acc.climb += c.climbing ? t.dt : 0) > 0.5, stall: 2.5 },
  { id: 'land', keys: (p) => (p ? ['Y'] : ['E']), text: 'Daal boven het plein en land', when: (c) => c.mode === 'fly' && c.toGoal < 260, done: (c) => c.mode !== 'fly', stall: 2 },
  { id: 'walk', keys: (p) => (p ? ['L'] : ['W', 'A', 'S', 'D']), text: 'Lopen · Shift rent', when: (c) => c.mode === 'walk', done: (c) => c.walked > 8 },
  { id: 'talk', keys: (p) => (p ? ['Y'] : ['E']), text: 'Spreek wie een gouden ! draagt', when: (c) => c.mode === 'walk' && !c.inCombat, done: (c) => c.talking, stall: 6 },
  { id: 'dodge', keys: (p) => (p ? ['A'] : ['SPATIE']), text: 'Gloeit hij rood? Rol weg', when: (c, t) => c.mode === 'walk' && c.inCombat && c.tally.telegraphs > t.base.telegraphs, done: (c, t) => c.tally.rolls > t.base.rolls, stall: 0.1 },
  { id: 'attack', keys: () => ['LMB'], text: 'Sla toe. Drie slagen vormen een reeks', when: (c) => c.mode === 'walk' && c.inCombat, done: (c, t) => c.tally.hits - t.base.hits >= 3, stall: 2 },
  { id: 'salve', keys: (p) => (p ? ['▼'] : ['Q']), text: 'Begijnenzalf geneest u', when: (c) => c.hpFrac < 0.5 && c.salves > 0, done: (c, t) => c.tally.potions > t.base.potions, stall: 1 },
  { id: 'skill', keys: () => ['RMB'], text: '{skill}', when: (c) => c.mode === 'walk' && c.inCombat, done: (c, t) => c.tally.skills > t.base.skills, stall: 5 },
  { id: 'breath', keys: () => ['LMB'], text: '{dragon} spuwt vuur', when: (c) => c.mode === 'fly' && c.inCombat, done: (c) => c.tally.breaths > 0, stall: 2 },
  { id: 'mount', keys: (p) => (p ? ['Y'] : ['E']), text: 'Ver weg? Roep {dragon} en vlieg', when: (c) => c.mode === 'walk' && c.toGoal > 300 && c.toGoal < 1e8 && !c.inCombat, done: (c) => c.mode === 'fly', stall: 6 },
  // the second flight: now speed matters
  { id: 'speed', keys: (p) => (p ? ['RT', 'LT'] : ['W', 'S']), text: 'Sneller en trager', when: (c, t) => c.mode === 'fly' && t.learned('land'), done: (c, t) => (t.acc.speed += Math.abs(c.throttle) > 0.3 ? t.dt : 0) > 0.8, stall: 5 },
  { id: 'book', keys: () => ['J', 'K'], text: 'Uw dagboek en de Kroniek', when: (c) => c.quests >= 2 && !c.talking && !c.inCombat, done: (c) => c.bookOpen, patience: 14, stall: 8 },
];

export class Tutorial {
  el = document.createElement('div');
  /** per-step accumulators */
  acc: Record<string, number> = { speed: 0, climb: 0 };
  /** tallies when the current step began */
  base = { hits: 0, rolls: 0, skills: 0, potions: 0, breaths: 0, telegraphs: 0 };
  dt = 0;
  enabled = true;
  /** the step whose situation holds now (shown or still waiting out its stall) */
  private cur: Step | null = null;
  private visible = false;
  private waited = 0;
  private shown = 0;
  private gap = 2;

  constructor(root: HTMLElement, private flags: Record<string, string | number | boolean>, private save: () => void, private onDone: (id: string) => void = () => {}) {
    this.el.className = 'tut';
    root.appendChild(this.el);
  }

  private seen(id: string) {
    return !!this.flags[`tut_${id}`];
  }

  /** Mark everything as learned (a returning player who wants no hints). */
  skipAll() {
    for (const s of STEPS) this.flags[`tut_${s.id}`] = true;
    this.cur = null;
    this.visible = false;
    this.el.classList.remove('show');
    this.save();
  }

  /** the hint on screen, if any */
  get active() {
    return this.visible ? this.cur?.id ?? null : null;
  }

  learned(id: string) {
    return this.seen(id);
  }

  private hide(ok: boolean) {
    if (!this.visible) return;
    this.visible = false;
    if (ok) this.el.classList.add('ok');
    setTimeout(() => {
      if (!this.visible) this.el.classList.remove('show', 'ok');
    }, ok ? 650 : 0);
  }

  update(dt: number, c: TutorialCtx) {
    this.dt = dt;
    if (!this.enabled) return;
    this.el.classList.toggle('dim', c.uiOpen);
    if (c.uiOpen || c.talking) {
      if (this.cur && this.cur.done(c, this)) this.learn(this.cur, c);
      return;
    }
    this.gap -= dt;
    // what is the thing to do right now?
    const next = STEPS.find((s) => !this.seen(s.id) && s.when(c, this)) ?? null;
    if (next !== this.cur) {
      this.hide(false);
      this.cur = next;
      this.waited = 0;
      this.shown = 0;
      this.base = { ...c.tally };
      this.acc = { speed: 0, climb: 0 };
      if (!next) return;
    }
    const s = this.cur;
    if (!s) return;
    if (s.done(c, this)) return this.learn(s, c);
    if (this.visible) {
      this.shown += dt;
      if (s.patience !== undefined && this.shown > s.patience) {
        this.flags[`tut_${s.id}`] = true;
        this.save();
        this.hide(false);
        this.cur = null;
      }
      return;
    }
    // not doing it by themselves? then say it
    this.waited += dt;
    if (this.waited < (s.stall ?? 4) || this.gap > 0) return;
    const keys = s.keys(c.pad).map((k) => `<kbd>${k === 'MUIS' ? '<svg class="mouse" viewBox="0 0 14 20"><path d="M1 8V7a6 6 0 0 1 12 0v6a6 6 0 0 1-12 0z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M7 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' : keyGlyph(k)}</kbd>`).join('');
    this.el.innerHTML = `<span class="tut-keys">${keys}</span><span class="tut-text">${s.text.replace('{dragon}', c.dragon).replace('{skill}', c.skill)}</span><span class="tut-ok">✓</span>`;
    this.el.classList.remove('ok');
    this.el.classList.add('show');
    this.visible = true;
  }

  /** Done: with a tick if the hint was up, silently if they never needed it. */
  private learn(s: Step, _c: TutorialCtx) {
    this.flags[`tut_${s.id}`] = true;
    this.save();
    if (this.visible) {
      this.hide(true);
      this.onDone(s.id);
      this.gap = 1.2;
    } else if (s.id === 'land') this.onDone(s.id);
    this.cur = null;
  }
}

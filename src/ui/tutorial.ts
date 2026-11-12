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
}

const STEPS: Step[] = [
  { id: 'steer', keys: (p) => (p ? ['L'] : ['MUIS']), text: 'Stuur {dragon} waarheen ge kijkt', when: (c) => c.mode === 'fly', done: (c) => c.turned > 1.2 },
  { id: 'speed', keys: (p) => (p ? ['RT', 'LT'] : ['W', 'S']), text: 'Sneller en trager', when: (c) => c.mode === 'fly', done: (c, t) => (t.acc.speed += Math.abs(c.throttle) > 0.3 ? t.dt : 0) > 0.8 },
  { id: 'climb', keys: (p) => (p ? ['A', 'B'] : ['SPATIE', 'C']), text: 'Stijgen en dalen', when: (c) => c.mode === 'fly', done: (c, t) => (t.acc.climb += c.climbing ? t.dt : 0) > 0.6 },
  { id: 'follow', keys: () => [], text: 'Volg de gouden ruit ⬥ naar de Grote Markt', when: (c) => c.mode === 'fly' && c.toGoal > 260, done: (c) => c.toGoal < 260, patience: 14 },
  { id: 'land', keys: (p) => (p ? ['Y'] : ['E']), text: 'Vlieg laag en traag boven een open plek, en land', when: (c) => c.mode === 'fly' && c.toGoal < 320, done: (c) => c.mode !== 'fly' },
  { id: 'walk', keys: (p) => (p ? ['L'] : ['W', 'A', 'S', 'D']), text: 'Lopen · Shift om te rennen', when: (c) => c.mode === 'walk', done: (c) => c.walked > 8 },
  { id: 'talk', keys: (p) => (p ? ['Y'] : ['E']), text: 'Wie een gouden ! draagt, heeft werk voor u. Ga erheen en spreek', when: (c) => c.mode === 'walk' && !c.inCombat, done: (c) => c.talking },
  { id: 'book', keys: () => ['J', 'K'], text: 'Uw dagboek, en de Kroniek van alles wat ge leert', when: (c) => c.quests >= 2 && !c.talking && !c.inCombat, done: (c) => c.bookOpen, patience: 16 },
  { id: 'mount', keys: (p) => (p ? ['Y'] : ['E']), text: 'Ver weg? Roep {dragon} op een open plek en vlieg', when: (c) => c.mode === 'walk' && c.toGoal > 300 && c.toGoal < 1e8 && !c.inCombat, done: (c) => c.mode === 'fly' },
  { id: 'breath', keys: () => ['LMB'], text: '{dragon} spuwt vuur waar ge kijkt', when: (c) => c.mode === 'fly' && c.inCombat, done: (c) => c.tally.breaths > 0 },
  { id: 'attack', keys: () => ['LMB'], text: 'Sla toe. Drie slagen na elkaar maken een reeks', when: (c) => c.mode === 'walk' && c.inCombat, done: (c, t) => c.tally.hits - t.base.hits >= 3 },
  { id: 'dodge', keys: (p) => (p ? ['A'] : ['SPATIE']), text: 'Gloeit een vijand rood? Rol weg voor de slag valt', when: (c, t) => c.mode === 'walk' && c.inCombat && c.tally.telegraphs > t.base.telegraphs, done: (c, t) => c.tally.rolls > t.base.rolls },
  { id: 'skill', keys: () => ['RMB'], text: '{skill}: uw eigen kunst', when: (c) => c.mode === 'walk' && c.inCombat, done: (c, t) => c.tally.skills > t.base.skills },
  { id: 'salve', keys: (p) => (p ? ['▼'] : ['Q']), text: 'Gewond? Begijnenzalf geneest de helft', when: (c) => c.hpFrac < 0.55 && c.salves > 0, done: (c, t) => c.tally.potions > t.base.potions },
];

export class Tutorial {
  el = document.createElement('div');
  /** per-step accumulators */
  acc: Record<string, number> = { speed: 0, climb: 0 };
  /** tallies when the current step began */
  base = { hits: 0, rolls: 0, skills: 0, potions: 0, breaths: 0, telegraphs: 0 };
  dt = 0;
  enabled = true;
  private cur: Step | null = null;
  private shown = 0;
  private gap = 2.5;

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
    this.el.classList.remove('show');
    this.save();
  }

  get active() {
    return this.cur?.id ?? null;
  }

  update(dt: number, c: TutorialCtx) {
    this.dt = dt;
    if (!this.enabled) return;
    if (this.cur) {
      this.shown += dt;
      const s = this.cur;
      const finished = s.done(c, this);
      const gaveUp = !finished && ((s.patience !== undefined && this.shown > s.patience) || (!s.when(c, this) && this.shown > 1.5));
      this.el.classList.toggle('dim', c.uiOpen);
      if (finished || gaveUp) {
        // a step you walked away from comes back later; one you did is learned
        if (finished || s.patience !== undefined) {
          this.flags[`tut_${s.id}`] = true;
          this.save();
        }
        if (finished) {
          this.el.classList.add('ok');
          this.onDone(s.id);
        }
        this.cur = null;
        this.gap = finished ? 1.4 : 0.6;
        setTimeout(() => this.el.classList.remove('show', 'ok'), finished ? 650 : 0);
      }
      return;
    }
    this.gap -= dt;
    if (this.gap > 0 || c.uiOpen) return;
    const next = STEPS.find((s) => !this.seen(s.id) && s.when(c, this));
    if (!next) return;
    this.cur = next;
    this.shown = 0;
    this.base = { ...c.tally };
    const keys = next.keys(c.pad).map((k) => `<kbd>${k === 'MUIS' ? '<svg class="mouse" viewBox="0 0 14 20"><path d="M1 8V7a6 6 0 0 1 12 0v6a6 6 0 0 1-12 0z" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M7 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>' : keyGlyph(k)}</kbd>`).join('');
    this.el.innerHTML = `<span class="tut-keys">${keys}</span><span class="tut-text">${next.text.replace('{dragon}', c.dragon).replace('{skill}', c.skill)}</span><span class="tut-ok">✓</span>`;
    this.el.classList.remove('ok');
    this.el.classList.add('show');
  }
}

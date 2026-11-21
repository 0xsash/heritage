// The card at the end of a chapter: what you chose and what it cost, where you
// stand with the parties, and where the story goes next. One button closes it
// (also Enter, Escape, Space, or A / B / Start on a gamepad), after a moment, so a
// key still held from the film does not close it unread.

import type { EndRow } from '../content/diest_end';

export interface ChapterCardData {
  kicker: string;
  title: string;
  rows: EndRow[];
  /** side stories still open, as names ("de brandewijn van Gielis de Ton") */
  open: string[];
  standing: { name: string; tier: string; color: string }[];
  roads: { west: string; east: string; next: string };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export class ChapterCard {
  el = document.createElement('div');
  open = false;
  private done: (() => void) | null = null;
  private readyAt = 0;
  private raf = 0;
  private padPrev: boolean[] = [];

  constructor(root: HTMLElement) {
    this.el.className = 'chapter-card';
    this.el.hidden = true;
    root.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (!this.open || !['Enter', 'Escape', 'Space', 'KeyE'].includes(e.code)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      this.close();
    }, { capture: true });
  }

  show(d: ChapterCardData): Promise<void> {
    const and = (l: string[]) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} en ${l[l.length - 1]}` : l[0] ?? '');
    this.el.innerHTML = `<div class="chc-card">
      <div class="chc-kick">${esc(d.kicker)}</div>
      <h1>${esc(d.title)}</h1>
      <h3>WAT JE KOOS, EN WAT HET KOSTTE</h3>
      <div class="chc-rows">${d.rows.map((r) => `<div class="chc-row"><b>${esc(r.what)}</b><span>${esc(r.cost)}</span></div>`).join('')}</div>
      ${d.open.length ? `<p class="chc-open">Nog open in Diest: ${esc(and(d.open))}.</p>` : ''}
      <h3>JE AANZIEN</h3>
      <div class="chc-stand">${d.standing.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)} · <b>${esc(s.tier)}</b></span>`).join('')}</div>
      <h3>HOE HET VERDER GAAT</h3>
      <div class="chc-roads"><p><b>Naar het westen</b>${esc(d.roads.west)}</p><p><b>Naar het oosten</b>${esc(d.roads.east)}</p></div>
      <p class="chc-next">${esc(d.roads.next)}</p>
      <button class="chc-go">VERDER SPELEN IN DIEST</button>
    </div>`;
    this.el.querySelector('.chc-go')!.addEventListener('click', () => this.close());
    this.el.hidden = false;
    this.open = true;
    this.readyAt = performance.now() + 1200;
    document.exitPointerLock?.();
    requestAnimationFrame(() => this.el.classList.add('show'));
    // a gamepad: A, B or Start
    this.padPrev = this.pad();
    const loop = () => {
      if (!this.open) return;
      const b = this.pad();
      if ([0, 1, 9].some((i) => b[i] && !this.padPrev[i])) this.close();
      this.padPrev = b;
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    return new Promise((res) => (this.done = res));
  }

  private pad() {
    const p = [...(navigator.getGamepads?.() ?? [])].find((x) => x && x.connected);
    return p ? p.buttons.map((x) => !!x?.pressed) : [];
  }

  close() {
    if (!this.open || performance.now() < this.readyAt) return;
    this.open = false;
    cancelAnimationFrame(this.raf);
    this.el.classList.remove('show');
    setTimeout(() => {
      if (!this.open) this.el.hidden = true;
    }, 600);
    const d = this.done;
    this.done = null;
    d?.();
  }
}

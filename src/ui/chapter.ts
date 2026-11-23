// The card at the end of a chapter: what you chose and what it cost, where you
// stand with the parties, and where the story goes next. One button closes it
// (also Enter, Escape, Space, or A / B / Start on a gamepad), after a moment, so a
// key still held from the film does not close it unread.

import type { EndRow } from '../content/diest_end';
import { hint, nav } from './nav';

export interface ChapterCardData {
  kicker: string;
  title: string;
  rows: EndRow[];
  /** side stories still open, as names ("Gielis de Ton's brandy") */
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

  constructor(root: HTMLElement) {
    this.el.className = 'chapter-card';
    this.el.hidden = true;
    root.appendChild(this.el);
    // Enter, Space, Escape, A, B, Start (the shared navigation, nav.ts); up and down scroll the card; E as well
    nav.add({
      layer: 50,
      active: () => this.open,
      root: () => this.el,
      back: () => this.close(),
      handle: (cmd) => {
        if (cmd === 'ok' || cmd === 'start') {
          this.close();
          return true;
        }
        return false;
      },
    });
    window.addEventListener('keydown', (e) => {
      if (this.open && e.code === 'KeyE') this.close();
    });
  }

  show(d: ChapterCardData): Promise<void> {
    const and = (l: string[]) => (l.length > 1 ? `${l.slice(0, -1).join(', ')} and ${l[l.length - 1]}` : l[0] ?? '');
    this.el.innerHTML = `<div class="chc-card">
      <div class="chc-kick">${esc(d.kicker)}</div>
      <h1>${esc(d.title)}</h1>
      <h3>WHAT YOU CHOSE, AND WHAT IT COST</h3>
      <div class="chc-rows">${d.rows.map((r) => `<div class="chc-row"><b>${esc(r.what)}</b><span>${esc(r.cost)}</span></div>`).join('')}</div>
      ${d.open.length ? `<p class="chc-open">Still open in Diest: ${esc(and(d.open))}.</p>` : ''}
      <h3>YOUR STANDING</h3>
      <div class="chc-stand">${d.standing.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.name)} · <b>${esc(s.tier)}</b></span>`).join('')}</div>
      <h3>WHAT COMES NEXT</h3>
      <div class="chc-roads"><p><b>West</b>${esc(d.roads.west)}</p><p><b>East</b>${esc(d.roads.east)}</p></div>
      <p class="chc-next">${esc(d.roads.next)}</p>
      <button class="chc-go">CONTINUE IN DIEST <kbd>${hint('Enter', 'A')}</kbd></button>
    </div>`;
    this.el.querySelector('.chc-go')!.addEventListener('click', () => this.close());
    this.el.hidden = false;
    this.open = true;
    this.readyAt = performance.now() + 1200;
    document.exitPointerLock?.();
    requestAnimationFrame(() => this.el.classList.add('show'));
    return new Promise((res) => (this.done = res));
  }

  close() {
    if (!this.open || performance.now() < this.readyAt) return;
    this.open = false;
    this.el.classList.remove('show');
    setTimeout(() => {
      if (!this.open) this.el.hidden = true;
    }, 600);
    const d = this.done;
    this.done = null;
    d?.();
  }
}

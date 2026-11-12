// The Kroniek panel (K) and the reading card that opens when you read a
// notice in the world. Every entry carries its label: history, folk tale, or
// invented. Locked entries show where to look.

import { CATS, ENTRIES, TRUTH, type Cat, type Entry, type Kroniek } from '../rpg/kroniek';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const badge = (e: Entry) => `<span class="truth t-${e.truth}" title="${esc(TRUTH[e.truth].note)}">${TRUTH[e.truth].name}</span>`;

export class KroniekUI {
  el = document.createElement('div');
  card = document.createElement('div');
  open = false;
  reading = false;
  private sel: string | null = null;
  private cat: Cat = 'plaats';
  onClose: () => void = () => {};

  constructor(root: HTMLElement, private k: Kroniek) {
    this.el.className = 'journal kroniek';
    this.el.hidden = true;
    this.card.className = 'leeskaart';
    this.card.hidden = true;
    root.append(this.el, this.card);
    window.addEventListener('keydown', (e) => {
      if (this.reading && (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        this.closeCard();
      } else if (this.open && e.code === 'Escape') this.toggle();
    });
    this.card.addEventListener('click', () => this.closeCard());
  }

  toggle(focus?: string) {
    this.open = !this.open;
    this.el.hidden = !this.open;
    if (this.open) {
      document.exitPointerLock?.();
      if (focus) {
        this.sel = focus;
        this.cat = this.k.entry(focus)?.cat ?? this.cat;
      }
      this.render();
    }
    return this.open;
  }

  /** The parchment card for something just read (or just learned). */
  show(e: Entry, isNew: boolean, reward: string) {
    this.reading = true;
    this.sel = e.id;
    this.cat = e.cat;
    document.exitPointerLock?.();
    this.card.innerHTML = `<div class="lk-in">
      <div class="lk-kick">${isNew ? 'NIEUW IN DE KRONIEK' : 'UIT DE KRONIEK'} · ${CATS[e.cat].toUpperCase()}</div>
      <h2>${esc(e.title)}</h2>
      <div class="lk-rule"></div>
      <p>${esc(e.text)}</p>
      <div class="lk-foot">${badge(e)}<span>${esc(TRUTH[e.truth].note)}</span></div>
      <div class="lk-close">${isNew && reward ? esc(reward) + ' · ' : ''}${this.k.count} van ${this.k.total} · <kbd>E</kbd> verder</div>
    </div>`;
    this.card.hidden = false;
    // restart the entrance animation
    this.card.classList.remove('in');
    void this.card.offsetWidth;
    this.card.classList.add('in');
  }

  closeCard() {
    if (!this.reading) return;
    this.reading = false;
    this.card.hidden = true;
    this.onClose();
  }

  render() {
    if (!this.open) return;
    const k = this.k;
    const list = k.list(this.cat);
    if (!this.sel || this.k.entry(this.sel)?.cat !== this.cat) this.sel = (list.find((e) => k.has(e.id)) ?? list[0])?.id ?? null;
    const cur = this.sel ? k.entry(this.sel) : null;
    const tabs = (Object.keys(CATS) as Cat[])
      .map((c) => {
        const all = k.list(c);
        return `<button data-cat="${c}" class="${c === this.cat ? 'on' : ''}">${CATS[c]}<i>${all.filter((e) => k.has(e.id)).length}/${all.length}</i></button>`;
      })
      .join('');
    const items = list
      .map((e) => (k.has(e.id) ? `<button data-e="${e.id}" class="${e.id === this.sel ? 'sel' : ''}">${esc(e.title)}<span class="dot t-${e.truth}"></span></button>` : `<button data-e="${e.id}" class="locked ${e.id === this.sel ? 'sel' : ''}">· · ·</button>`))
      .join('');
    let detail = '';
    if (cur && k.has(cur.id)) detail = `<h1>${esc(cur.title)}</h1><div class="meta">${badge(cur)} <span>${esc(TRUTH[cur.truth].note)}</span></div><p class="lore">${esc(cur.text)}</p>`;
    else if (cur) detail = `<h1 class="dim">Nog onbekend</h1><p class="lore dim">${esc(cur.hint)}</p>`;
    const pct = Math.round((k.count / k.total) * 100);
    this.el.innerHTML = `<header><h2>KRONIEK</h2><div class="kr-prog"><i style="width:${pct}%"></i></div><span class="purse">${k.count} van ${k.total} · K om te sluiten</span></header>
      <div class="list"><div class="kr-tabs">${tabs}</div>${items}</div>
      <div class="detail">${detail}</div>
      <div class="inv">Wat hier staat is echt, tenzij er iets anders bij staat: <span class="truth t-geschiedenis">Geschiedenis</span> <span class="truth t-volksverhaal">Volksverhaal</span> <span class="truth t-verzonnen">Verzonnen</span></div>`;
    this.el.querySelectorAll<HTMLButtonElement>('button[data-cat]').forEach((b) =>
      b.addEventListener('click', () => {
        this.cat = b.dataset.cat as Cat;
        this.sel = null;
        this.render();
      }),
    );
    this.el.querySelectorAll<HTMLButtonElement>('button[data-e]').forEach((b) =>
      b.addEventListener('click', () => {
        this.sel = b.dataset.e!;
        this.render();
      }),
    );
  }
}

/** How many entries exist (for the title screen and share cards). */
export const KRONIEK_TOTAL = ENTRIES.length;

// The Kroniek panel (K) and the reading card that opens when you read a
// notice in the world. Every entry carries its label: history, folk tale, or
// invented. Locked entries show where to look.

import { CATS, ENTRIES, TRUTH, gloss, type Cat, type Entry, type Kroniek } from '../rpg/kroniek';
import { hint, nav } from './nav';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** The three sections of the player's book, as tabs in every panel header. */
export const bookTabs = (on: 'journal' | 'kroniek' | 'character') =>
  `<nav class="booktabs"><kbd class="k-pad bt-lr">LB</kbd>${([['journal', 'Journal', 'J'], ['kroniek', 'Kroniek', 'K'], ['character', 'Character', 'I']] as const)
    .map(([id, name, key]) => `<button data-book="${id}" class="${id === on ? 'on' : ''}"><kbd class="k-kbd">${key}</kbd>${name}</button>`)
    .join('')}<kbd class="k-pad bt-lr">RB</kbd></nav>`;
/** Every panel says how to leave it, in the same words and place: top right (main.ts closes on [data-close]). */
export const closeBtn = () => `<button class="bk-close" data-close>CLOSE <kbd>${hint('Esc', 'B')}</kbd></button>`;

const badge = (e: Entry) => `<span class="truth t-${e.truth}" title="${esc(TRUTH[e.truth].note)}">${TRUTH[e.truth].name}</span>`;

export class KroniekUI {
  el = document.createElement('div');
  card = document.createElement('div');
  open = false;
  reading = false;
  private sel: string | null = null;
  private cat: Cat = 'plaats';
  /** the pages still to find are listed (else only one line says how many) */
  private showLocked = false;
  onClose: () => void = () => {};

  constructor(root: HTMLElement, private k: Kroniek) {
    this.el.className = 'journal kroniek';
    this.el.hidden = true;
    this.card.className = 'leeskaart';
    this.card.hidden = true;
    root.append(this.el, this.card);
    // E closes the card; Enter, Space, Escape, A and B come through nav.ts
    window.addEventListener('keydown', (e) => {
      if (this.reading && e.code === 'KeyE' && !e.repeat) {
        e.preventDefault();
        this.closeCard();
      }
    });
    this.card.addEventListener('click', () => this.closeCard());
    nav.add({
      layer: 40,
      active: () => this.reading,
      root: () => this.card,
      items: () => [],
      back: () => this.closeCard(),
      handle: (cmd) => {
        if (cmd === 'ok') {
          this.closeCard();
          return true;
        }
        return false;
      },
    });
  }

  toggle(focus?: string) {
    this.open = !this.open;
    this.el.hidden = !this.open;
    if (this.open) {
      document.exitPointerLock?.();
      nav.refocus();
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
      <div class="lk-kick">${isNew ? 'NEW IN THE KRONIEK' : 'FROM THE KRONIEK'} · ${CATS[e.cat].toUpperCase()}</div>
      <h2>${esc(e.title)}</h2>
      <div class="lk-rule"></div>
      <p>${esc(e.text)}</p>
      <div class="lk-foot">${badge(e)}<span>${esc(TRUTH[e.truth].note)}</span></div>
      <div class="lk-close">${isNew && reward ? esc(reward) + ' · ' : ''}${this.k.count} of ${this.k.total} · ${hint('<kbd>E</kbd> close', '<kbd>A</kbd> close')}</div>
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
    // what you know first; the pages still to find are one line, which opens their hints
    const known = list.filter((e) => k.has(e.id)), locked = list.filter((e) => !k.has(e.id));
    const items = known.map((e) => `<button data-e="${e.id}" class="${e.id === this.sel ? 'sel' : ''}">${esc(e.title)}<span class="dot t-${e.truth}"></span></button>`).join('') +
      (locked.length ? `<button data-more class="more${this.showLocked ? ' open' : ''}">${this.showLocked ? '▾' : '▸'} ${locked.length} ${locked.length === 1 ? 'page' : 'pages'} still to find</button>` : '') +
      (this.showLocked ? locked.map((e) => `<button data-e="${e.id}" class="locked ${e.id === this.sel ? 'sel' : ''}">· · ·</button>`).join('') : '');
    let detail = '';
    if (cur && k.has(cur.id)) detail = `<h1>${esc(cur.title)}</h1><div class="meta">${badge(cur)} <span>${esc(TRUTH[cur.truth].note)}</span></div><p class="lore">${gloss(esc(cur.text))}</p>`;
    else if (cur) detail = `<h1 class="dim">Not yet known</h1><p class="lore dim">${esc(cur.hint)}</p>`;
    const pct = Math.round((k.count / k.total) * 100);
    this.el.innerHTML = `<header>${bookTabs('kroniek')}<div class="kr-prog"><i style="width:${pct}%"></i></div><span class="purse">${k.count} of ${k.total} pages</span>${closeBtn()}</header>
      <div class="list"><div class="kr-tabs">${tabs}</div>${items}</div>
      <div class="detail">${detail}</div>
      <div class="inv">Each page says what kind of tale it is: <span class="truth t-geschiedenis">${TRUTH.geschiedenis.name}</span> <span class="truth t-volksverhaal">${TRUTH.volksverhaal.name}</span> <span class="truth t-verzonnen">${TRUTH.verzonnen.name}</span></div>`;
    this.el.querySelectorAll<HTMLButtonElement>('button[data-cat]').forEach((b) =>
      b.addEventListener('click', () => {
        this.cat = b.dataset.cat as Cat;
        this.sel = null;
        this.render();
      }),
    );
    this.el.querySelector<HTMLButtonElement>('button[data-more]')?.addEventListener('click', () => {
      this.showLocked = !this.showLocked;
      const first = this.k.list(this.cat).find((e) => !this.k.has(e.id));
      if (this.showLocked && first) this.sel = first.id;
      this.render();
    });
    this.el.querySelectorAll<HTMLButtonElement>('button[data-e]').forEach((b) =>
      b.addEventListener('click', () => {
        this.sel = b.dataset.e!;
        this.render();
      }),
    );
  }
}

/** How many entries exist (for the title screen and share cards). */
export const KRONIEK_TOTAL = ENTRIES.filter((e) => !e.secret).length;

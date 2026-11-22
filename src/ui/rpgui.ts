// Dialogue box and journal (quest log). Both free the mouse while open; keys:
// dialogue 1-4 / click / arrows and Enter / d-pad and A to choose, Space or E to continue,
// Escape or B to walk away; journal J, Escape or B (src/ui/nav.ts has the shared keys and buttons).

import { bookTabs, closeBtn } from './kroniekui';
import { hint, nav } from './nav';
import { gloss } from '../rpg/kroniek';
import { stuivers } from '../rpg/money';
import { type QuestEngine, standingLine } from '../rpg/quests';
import { ROADS } from '../content/diest_end';
import type { Line } from '../rpg/types';

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

export class DialogueUI {
  el = document.createElement('div');
  open = false;
  npcId: string | null = null;
  private line: Line | null = null;
  private onClose?: () => void;
  /** a line is shown (the voice plays it, if it has been recorded) */
  onLine: (id: string) => void = () => {};

  constructor(root: HTMLElement, private q: QuestEngine) {
    this.el.className = 'dialogue';
    this.el.hidden = true;
    root.appendChild(this.el);
    // the number keys choose, E goes on; arrows, Enter, Space, Escape and the pad come through nav.ts
    window.addEventListener('keydown', (e) => {
      if (!this.open || !this.line) return;
      const choices = this.visibleChoices();
      if (choices.length) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= choices.length) {
          e.preventDefault();
          this.choose(n - 1);
        }
      } else if (e.code === 'KeyE' && !e.repeat) {
        e.preventDefault();
        this.advance();
      }
    });
    nav.add({ layer: 30, active: () => this.open, root: () => this.el, back: () => this.close(), wrap: true });
  }

  start(npcId: string, lineId: string, onClose?: () => void) {
    this.npcId = npcId;
    this.onClose = onClose;
    this.open = true;
    this.el.hidden = false;
    document.exitPointerLock?.();
    this.show(lineId);
  }

  private visibleChoices() {
    return (this.line?.choices ?? []).filter((c) => this.q.test(c.if));
  }

  private show(id: string | undefined) {
    if (!id) return this.close();
    const line = this.q.content.dialogue[id];
    if (!line) {
      console.warn('missing dialogue line', id);
      return this.close();
    }
    this.onLine(id);
    this.line = line;
    this.q.apply(line.effects);
    const npc = this.q.npcs.get(line.who);
    const who = line.who === 'you' ? this.q.s.hero.name : npc?.name ?? line.who;
    const role = line.who === 'you' ? '' : npc?.role ?? '';
    const choices = this.visibleChoices();
    const keys = choices.length
      ? hint(`<kbd>1</kbd>–<kbd>${choices.length}</kbd> of <kbd>Enter</kbd> kiezen · <kbd>Esc</kbd> weggaan`, '<kbd>A</kbd> kiezen · <kbd>B</kbd> weggaan')
      : hint('<kbd>Esc</kbd> weggaan', '<kbd>B</kbd> weggaan');
    this.el.innerHTML = `<div class="who">${esc(who)}<span class="role">${esc(role)}</span></div>
      <div class="text${line.who === 'you' ? ' you' : ''}">${gloss(esc(this.q.fill(line.text)))}</div>
      ${choices.length ? '<div class="choices"></div>' : ''}
      <div class="dl-foot"><span class="dl-keys">${keys}</span>${choices.length ? '' : `<button class="cont" data-cont>VERDER <kbd>${hint('Spatie', 'A')}</kbd></button>`}</div>`;
    const box = this.el.querySelector('.choices');
    choices.forEach((c, i) => {
      const b = document.createElement('button');
      const starts = c.effects?.find((e) => 'start' in e) as { start: string } | undefined;
      const tag = starts ? '<span class="qtag">opdracht</span>' : '';
      b.dataset.c = String(i);
      b.innerHTML = `<span class="n">${i + 1}</span>${esc(this.q.fill(c.text))}${tag}`;
      b.addEventListener('click', (e) => {
        // the box's own click (advance) would otherwise get this same click and skip the reply
        e.stopPropagation();
        this.choose(i);
      });
      box?.appendChild(b);
    });
    if (!choices.length) this.el.onclick = () => this.advance();
    else this.el.onclick = null;
    // a new line: the keyboard and the pad start on its first choice (or on VERDER)
    nav.refocus();
  }

  private choose(i: number) {
    const c = this.visibleChoices()[i];
    if (!c) return;
    this.q.apply(c.effects);
    this.show(c.next);
  }

  private advance() {
    this.show(this.line?.next);
  }

  close() {
    this.open = false;
    this.el.hidden = true;
    this.line = null;
    this.npcId = null;
    this.onClose?.();
  }
}

/** the journal's page for the roads out of Diest, after chapter 1 (not a quest: nothing to finish) */
const NEXT = '__next';

export class JournalUI {
  el = document.createElement('div');
  open = false;
  private sel: string | null = null;

  constructor(root: HTMLElement, private q: QuestEngine) {
    this.el.className = 'journal';
    this.el.hidden = true;
    root.appendChild(this.el);
  }

  toggle() {
    this.open = !this.open;
    this.el.hidden = !this.open;
    if (this.open) {
      document.exitPointerLock?.();
      nav.refocus();
      this.sel = this.q.s.tracked ?? this.sel;
      this.render();
    }
    return this.open;
  }

  render() {
    if (!this.open) return;
    const s = this.q.s;
    const quests = this.q.allQuests().filter((x) => s.quests[x.id]);
    const by = (kind: string, status: string) =>
      quests.filter((x) => x.kind === kind && s.quests[x.id].status === status).sort((a, b) => s.quests[b.id].started - s.quests[a.id].started);
    // once chapter 1 is over, a page on top points along the two roads out of Diest (src/content/diest_end.ts)
    const next = !!s.flags.ch1_end;
    if (!this.sel || (!s.quests[this.sel] && !(next && this.sel === NEXT))) this.sel = next && !s.tracked ? NEXT : quests[0]?.id ?? null;
    const section = (title: string, list: typeof quests) =>
      list.length
        ? `<h3>${title}</h3>` +
          list
            .map((x) => `<button data-q="${x.id}" class="${x.id === this.sel ? 'sel' : ''} ${s.quests[x.id].status !== 'active' ? 'done' : ''}">${esc(x.title)}${s.tracked === x.id ? '<span class="trk">⬥</span>' : ''}</button>`)
            .join('')
        : '';
    const list =
      (next ? `<h3>VOLGEND HOOFDSTUK</h3><button data-q="${NEXT}" class="${this.sel === NEXT ? 'sel' : ''}">${esc(ROADS.title)}</button>` : '') +
      section('HOOFDVERHAAL', by('main', 'active')) + section('ZIJVERHALEN', by('side', 'active')) + section('OPDRACHTEN', by('contract', 'active')) +
      section('VOLTOOID', [...by('main', 'done'), ...by('side', 'done'), ...by('contract', 'done'), ...quests.filter((x) => s.quests[x.id].status === 'failed')]);
    let detail = '<div class="empty">Nog geen opdrachten. Spreek met de mensen van Diest: zoek het gouden ! boven hun hoofd.</div>';
    const cur = this.sel ? this.q.quest(this.sel) : null;
    if (next && this.sel === NEXT) {
      detail = `<h1>${esc(ROADS.title)}</h1>
        <div class="meta">Hoofdstuk 2 · binnenkort</div>
        <div class="reward">${esc(ROADS.next)}</div>
        <div class="entries"><p>${esc(this.q.fill(ROADS.west))}</p><p>${esc(this.q.fill(ROADS.east))}</p></div>`;
    } else if (cur) {
      const st = s.quests[cur.id];
      const stage = this.q.stageOf(cur);
      const giver = cur.giver ? this.q.npcs.get(cur.giver)?.name : null;
      const objs =
        st.status === 'active'
          ? (stage?.objectives ?? [])
              .map((o) => {
                const t = this.q.fill(o.text) + this.q.progress(cur.id, o);
                return `<div class="obj ${st.done.includes(o.id) ? 'ok' : ''}">${st.done.includes(o.id) ? '☑' : '☐'} ${esc(t)}</div>`;
              })
              .join('')
          : `<div class="obj ok">${st.status === 'done' ? 'Voltooid' : 'Mislukt'}</div>`;
      const r = cur.reward;
      const reward = r
        ? [r.xp ? `${r.xp} ervaring` : '', r.florins ? stuivers(r.florins) : '', ...(r.standing ?? []).map(([f, n]) => standingLine(f, n)), ...(r.items ?? []).map(([i, n]) => `${this.q.item(i)?.name ?? i}${n > 1 ? ' ×' + n : ''}`), ...(r.gear?.length ? ['een uniek voorwerp'] : [])].filter(Boolean).join(' · ')
        : '';
      detail = `<h1>${esc(cur.title)}</h1>
        <div class="meta">${cur.kind === 'main' ? 'Hoofdverhaal' : cur.kind === 'contract' ? 'Opdracht' : 'Zijverhaal'} · ${esc(cur.town)}${cur.level ? ' · niveau ' + cur.level : ''}${giver ? ' · van ' + esc(giver) : ''}</div>
        ${objs}
        ${reward ? `<div class="reward">Beloning: ${esc(reward)}</div>` : ''}
        ${st.status === 'active' ? `<div class="actions"><button data-track="${cur.id}">${s.tracked === cur.id ? 'NIET MEER VOLGEN' : 'DEZE OPDRACHT VOLGEN'}</button></div>` : ''}
        <div class="entries">${[...st.log].reverse().map((p) => `<p>${gloss(esc(this.q.fill(p)))}</p>`).join('')}</div>`;
    }
    const inv = Object.entries(s.inv).filter(([, n]) => n > 0).map(([i, n]) => `${this.q.item(i)?.name ?? i}${n > 1 ? ' ×' + n : ''}`).join(' · ');
    this.el.innerHTML = `<header>${bookTabs('journal')}<span class="purse">${stuivers(s.florins)}</span>${closeBtn()}</header>
      <div class="list">${list || '<div class="empty">Je hebt nog geen opdrachten.</div>'}</div>
      <div class="detail">${detail}</div>
      <div class="inv">Op zak: ${inv ? esc(inv) : 'niets bijzonders'}</div>`;
    this.el.querySelectorAll<HTMLButtonElement>('button[data-q]').forEach((b) =>
      b.addEventListener('click', () => {
        this.sel = b.dataset.q!;
        this.render();
      }),
    );
    this.el.querySelector<HTMLButtonElement>('button[data-track]')?.addEventListener('click', (e) => {
      const id = (e.currentTarget as HTMLButtonElement).dataset.track!;
      s.tracked = s.tracked === id ? null : id;
      this.q.save();
      this.render();
    });
  }
}

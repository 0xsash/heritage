// Dialogue box and journal (quest log). Both free the mouse while open; keys:
// dialogue 1-4 / click to choose, Space or E to continue; journal J or Esc.

import type { QuestEngine } from '../rpg/quests';
import type { Line } from '../rpg/types';

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

export class DialogueUI {
  el = document.createElement('div');
  open = false;
  npcId: string | null = null;
  private line: Line | null = null;
  private onClose?: () => void;

  constructor(root: HTMLElement, private q: QuestEngine) {
    this.el.className = 'dialogue';
    this.el.hidden = true;
    root.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (!this.open || !this.line) return;
      const choices = this.visibleChoices();
      if (choices.length) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= choices.length) {
          e.preventDefault();
          this.choose(n - 1);
        }
      } else if (e.code === 'Space' || e.code === 'KeyE' || e.code === 'Enter') {
        e.preventDefault();
        this.advance();
      }
      if (e.code === 'Escape') this.close();
    });
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
    this.line = line;
    this.q.apply(line.effects);
    const npc = this.q.npcs.get(line.who);
    const who = line.who === 'you' ? 'You' : npc?.name ?? line.who;
    const role = line.who === 'you' ? '' : npc?.role ?? '';
    const choices = this.visibleChoices();
    this.el.innerHTML = `<div class="who">${esc(who)}<span class="role">${esc(role)}</span></div>
      <div class="text${line.who === 'you' ? ' you' : ''}">${esc(line.text)}</div>
      ${choices.length ? '<div class="choices"></div>' : '<div class="cont">SPACE / E · CONTINUE</div>'}`;
    const box = this.el.querySelector('.choices');
    choices.forEach((c, i) => {
      const b = document.createElement('button');
      b.innerHTML = `<span class="n">${i + 1}</span>${esc(c.text)}`;
      b.addEventListener('click', () => this.choose(i));
      box?.appendChild(b);
    });
    if (!choices.length) this.el.onclick = () => this.advance();
    else this.el.onclick = null;
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

export class JournalUI {
  el = document.createElement('div');
  open = false;
  private sel: string | null = null;

  constructor(root: HTMLElement, private q: QuestEngine) {
    this.el.className = 'journal';
    this.el.hidden = true;
    root.appendChild(this.el);
    window.addEventListener('keydown', (e) => {
      if (this.open && e.code === 'Escape') this.toggle();
    });
  }

  toggle() {
    this.open = !this.open;
    this.el.hidden = !this.open;
    if (this.open) {
      document.exitPointerLock?.();
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
    if (!this.sel || !s.quests[this.sel]) this.sel = quests[0]?.id ?? null;
    const renown = Object.entries(s.renown).map(([t, n]) => `${t} ${n}`).join(' · ');
    const section = (title: string, list: typeof quests) =>
      list.length
        ? `<h3>${title}</h3>` +
          list
            .map((x) => `<button data-q="${x.id}" class="${x.id === this.sel ? 'sel' : ''} ${s.quests[x.id].status !== 'active' ? 'done' : ''}">${esc(x.title)}${s.tracked === x.id ? '<span class="trk">⬥</span>' : ''}</button>`)
            .join('')
        : '';
    const list =
      section('MAIN', by('main', 'active')) + section('QUESTS', by('side', 'active')) + section('CONTRACTS', by('contract', 'active')) +
      section('COMPLETED', [...by('main', 'done'), ...by('side', 'done'), ...by('contract', 'done'), ...quests.filter((x) => s.quests[x.id].status === 'failed')]);
    let detail = '<div class="empty">No quests yet. Talk to the people of Diest: look for the gold ! above their heads.</div>';
    const cur = this.sel ? this.q.quest(this.sel) : null;
    if (cur) {
      const st = s.quests[cur.id];
      const stage = this.q.stageOf(cur);
      const giver = cur.giver ? this.q.npcs.get(cur.giver)?.name : null;
      const objs =
        st.status === 'active'
          ? (stage?.objectives ?? [])
              .map((o) => {
                let t = o.text;
                if (o.kind === 'collect') t += ` (${Math.min(s.inv[o.item] ?? 0, o.count)}/${o.count})`;
                return `<div class="obj ${st.done.includes(o.id) ? 'ok' : ''}">${st.done.includes(o.id) ? '☑' : '☐'} ${esc(t)}</div>`;
              })
              .join('')
          : `<div class="obj ok">${st.status === 'done' ? 'Completed' : 'Failed'}</div>`;
      const r = cur.reward;
      const reward = r
        ? [r.florins ? `${r.florins} florins` : '', ...(r.renown ?? []).map(([t, n]) => `${t} renown +${n}`), ...(r.items ?? []).map(([i, n]) => `${this.q.item(i)?.name ?? i}${n > 1 ? ' ×' + n : ''}`)].filter(Boolean).join(' · ')
        : '';
      detail = `<h1>${esc(cur.title)}</h1>
        <div class="meta">${cur.kind === 'main' ? 'Main quest' : cur.kind === 'contract' ? 'Contract' : 'Quest'} · ${esc(cur.town)}${giver ? ' · from ' + esc(giver) : ''}</div>
        ${objs}
        ${reward ? `<div class="reward">Reward: ${esc(reward)}</div>` : ''}
        ${st.status === 'active' ? `<div class="actions"><button data-track="${cur.id}">${s.tracked === cur.id ? 'UNTRACK' : 'TRACK'}</button></div>` : ''}
        <div class="entries">${[...st.log].reverse().map((p) => `<p>${esc(p)}</p>`).join('')}</div>`;
    }
    const inv = Object.entries(s.inv).filter(([, n]) => n > 0).map(([i, n]) => `${this.q.item(i)?.name ?? i}${n > 1 ? ' ×' + n : ''}`).join(' · ');
    this.el.innerHTML = `<header><h2>JOURNAL</h2><span class="purse">${s.florins} florins${renown ? ' · Renown: ' + esc(renown) : ''} · J to close</span></header>
      <div class="list">${list || '<div class="empty">Nothing yet.</div>'}</div>
      <div class="detail">${detail}</div>
      <div class="inv">Carrying: ${inv ? esc(inv) : 'nothing of note'}</div>`;
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

// The pause menu and the settings screen. Escape (or Start on a gamepad) in
// the game opens the pause menu: go on playing, the settings, the controls,
// or back to the title screen. The title screen opens the settings directly.
// Everything works with the mouse, the keyboard (arrows, Enter, Escape) and
// a gamepad (d-pad or left stick to choose and change, A to confirm, B back),
// and every change is saved in this browser at once and applied where it can be.

import { type Quality, type Settings, saveSettings } from '../core/settings';

export interface MenuHost {
  settings: Settings;
  /** put a changed setting to work now (camera, sound) */
  apply(s: Settings): void;
  /** the picture quality this page was started with (a change needs a reload) */
  bootQuality: Quality;
  /** load the page again, so a new picture quality takes effect (the game is saved first) */
  reload(): void;
}

/** What the game adds: the pause page. */
export interface GameHooks {
  resume(): void;
  toTitle(): void;
  /** the controls, as a table (hud.ts) */
  helpHtml(): string;
}

type Page = 'pause' | 'settings' | 'help';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

interface RangeRow { key: 'sens' | 'volume' | 'effects' | 'ambience'; label: string; min: number; max: number; step: number }
const RANGES: RangeRow[] = [
  { key: 'sens', label: 'Muisgevoeligheid', min: 0.3, max: 2.5, step: 0.1 },
  { key: 'volume', label: 'Volume', min: 0, max: 1, step: 0.05 },
  { key: 'effects', label: 'Geluidseffecten', min: 0, max: 1, step: 0.05 },
  { key: 'ambience', label: 'Achtergrond in filmpjes', min: 0, max: 1, step: 0.05 },
];

export class GameMenu {
  el = document.createElement('div');
  open = false;
  page: Page = 'pause';
  /** where the settings were opened from: back goes there */
  private from: 'pause' | 'title' = 'pause';
  private game: GameHooks | null = null;
  private focus = 0;
  private padPrev: boolean[] = [];
  private padHeld = 0;
  private padDir = '';
  /** ms a held direction waits before it repeats */
  repeatDelay = 380;
  private raf = 0;
  /** the last time the menu closed (ms): the Start press that closed it must not open it again */
  closedAt = 0;

  constructor(root: HTMLElement, private h: MenuHost) {
    this.el.className = 'gmenu';
    this.el.hidden = true;
    root.appendChild(this.el);
    // a click beside the panel: go on playing (the old pause screen did that), or close the settings on the title screen
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.back(true);
    });
    window.addEventListener('keydown', (e) => this.key(e), { capture: true });
  }

  /** The game is running: the pause page exists from now on. */
  attach(game: GameHooks) {
    this.game = game;
  }

  openPause() {
    if (!this.game) return;
    this.show('pause');
  }

  openSettings(from: 'pause' | 'title' = 'pause') {
    this.from = from;
    this.show('settings');
  }

  close() {
    if (!this.open) return;
    this.open = false;
    this.el.hidden = true;
    this.closedAt = performance.now();
    cancelAnimationFrame(this.raf);
  }

  private show(page: Page) {
    const was = this.open;
    this.page = page;
    this.focus = 0;
    this.open = true;
    this.el.hidden = false;
    document.exitPointerLock?.();
    this.render();
    if (!was) {
      // the press that opened the menu is not a press inside it
      this.padPrev = this.padButtons();
      this.padDir = '';
      cancelAnimationFrame(this.raf);
      const loop = () => {
        if (!this.open) return;
        this.pollPad();
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }
  }

  /** B, Escape, TERUG: one step back. `outside`: a click beside the panel. */
  back(outside = false) {
    if (this.page === 'settings' && this.from === 'pause' && this.game && !outside) return this.show('pause');
    if (this.page === 'help') return this.show('pause');
    if (this.page === 'pause' || (this.page === 'settings' && this.from === 'pause' && this.game)) {
      this.close();
      this.game?.resume();
      return;
    }
    this.close();
  }

  // ---------------------------------------------------------------- drawing
  private render() {
    const s = this.h.settings;
    let body = '';
    if (this.page === 'pause') {
      body = `<h2>PAUZE</h2>
        <button data-nav data-do="resume">VERDER SPELEN</button>
        <button data-nav data-do="settings">INSTELLINGEN</button>
        <button data-nav data-do="help">BESTURING</button>
        <button data-nav data-do="title">NAAR HET TITELSCHERM</button>
        <p class="gm-note">Je voortgang wordt bewaard. Op het titelscherm kies je Verder spelen.</p>`;
    } else if (this.page === 'help') {
      body = `<div class="gm-help">${this.game?.helpHtml() ?? ''}</div><button data-nav data-do="back">TERUG</button>`;
    } else {
      const range = (r: RangeRow) => {
        const v = s[r.key];
        return `<div class="gm-row" data-nav data-kind="range" data-key="${r.key}" tabindex="-1"><span>${esc(r.label)}</span>
          <input type="range" min="${r.min}" max="${r.max}" step="${r.step}" value="${v}" tabindex="-1" aria-label="${esc(r.label)}"><b>${Math.round(v * 100)}%</b></div>`;
      };
      const reloadNote = s.quality !== this.h.bootQuality
        ? `<p class="gm-note warn">Je ziet de nieuwe beeldkwaliteit pas als het spel opnieuw laadt.</p><button data-nav data-do="reload">NU OPNIEUW LADEN</button>`
        : `<p class="gm-note">Laag is sneller op een trage computer: minder scherp en zonder schaduwen.</p>`;
      body = `<h2>INSTELLINGEN</h2>
        <h3>BESTURING</h3>
        ${range(RANGES[0])}
        <div class="gm-row" data-nav data-kind="toggle" data-key="invert" tabindex="-1"><span>Op en neer omkeren</span><button class="gm-tog${s.invert ? ' on' : ''}" tabindex="-1">${s.invert ? 'AAN' : 'UIT'}</button></div>
        <h3>GELUID</h3>
        ${RANGES.slice(1).map(range).join('')}
        <h3>BEELD</h3>
        <div class="gm-row" data-nav data-kind="seg" data-key="quality" tabindex="-1"><span>Beeldkwaliteit</span><div class="gm-seg">${(['low', 'high'] as const).map((q) => `<button data-q="${q}" class="${s.quality === q ? 'on' : ''}" tabindex="-1">${q === 'low' ? 'LAAG' : 'HOOG'}</button>`).join('')}</div></div>
        ${reloadNote}
        <button data-nav data-do="back">TERUG</button>`;
    }
    this.el.innerHTML = `<div class="gm-panel gm-${this.page}">${body}<div class="gm-pad">Gamepad: kies met de kruistoetsen · A om te bevestigen · B om terug te gaan</div></div>`;
    // mouse: buttons do what they say, sliders and switches change at once
    this.el.querySelectorAll<HTMLButtonElement>('button[data-do]').forEach((b) => b.addEventListener('click', () => this.run(b.dataset.do!)));
    this.el.querySelectorAll<HTMLInputElement>('.gm-row input[type=range]').forEach((inp) =>
      inp.addEventListener('input', () => this.set(inp.closest<HTMLElement>('.gm-row')!.dataset.key as RangeRow['key'], Number(inp.value), false)),
    );
    this.el.querySelector<HTMLButtonElement>('.gm-tog')?.addEventListener('click', () => this.toggle());
    this.el.querySelectorAll<HTMLButtonElement>('.gm-seg button').forEach((b) => b.addEventListener('click', () => this.quality(b.dataset.q as Quality)));
    // the mouse moving over a line chooses it (not a line that comes to lie under a resting mouse)
    this.navs().forEach((n, i) => n.addEventListener('mousemove', () => i !== this.focus && this.setFocus(i)));
    this.setFocus(Math.min(this.focus, this.navs().length - 1));
  }

  private navs() {
    return [...this.el.querySelectorAll<HTMLElement>('[data-nav]')];
  }

  private setFocus(i: number) {
    const n = this.navs();
    if (!n.length) return;
    this.focus = (i + n.length) % n.length;
    n.forEach((x, k) => x.classList.toggle('focus', k === this.focus));
    n[this.focus].focus({ preventScroll: true });
    n[this.focus].scrollIntoView({ block: 'nearest' });
  }

  // ---------------------------------------------------------------- changes
  private changed(redraw: boolean) {
    saveSettings(this.h.settings);
    this.h.apply(this.h.settings);
    if (redraw) this.render();
  }

  private set(key: RangeRow['key'], v: number, redraw: boolean) {
    const r = RANGES.find((x) => x.key === key)!;
    const val = Math.round(Math.min(r.max, Math.max(r.min, v)) / r.step) * r.step;
    this.h.settings[key] = +val.toFixed(2);
    const row = this.el.querySelector<HTMLElement>(`.gm-row[data-key="${key}"]`);
    if (row && !redraw) {
      row.querySelector('b')!.textContent = `${Math.round(this.h.settings[key] * 100)}%`;
      const inp = row.querySelector<HTMLInputElement>('input')!;
      if (Number(inp.value) !== this.h.settings[key]) inp.value = String(this.h.settings[key]);
    }
    this.changed(redraw);
  }

  private toggle() {
    this.h.settings.invert = !this.h.settings.invert;
    this.changed(true);
  }

  private quality(q: Quality) {
    if (this.h.settings.quality === q) return;
    this.h.settings.quality = q;
    this.changed(true);
  }

  private run(what: string) {
    if (what === 'resume') {
      this.close();
      this.game?.resume();
    } else if (what === 'settings') this.openSettings('pause');
    else if (what === 'help') this.show('help');
    else if (what === 'title') this.game?.toTitle();
    else if (what === 'reload') this.h.reload();
    else if (what === 'back') this.back();
  }

  // ---------------------------------------------------------------- keyboard and gamepad
  /** Move (up/down), change (left/right), or press the chosen line. */
  private nav(cmd: 'up' | 'down' | 'left' | 'right' | 'ok' | 'back') {
    if (cmd === 'back') return this.back();
    if (cmd === 'up' || cmd === 'down') return this.setFocus(this.focus + (cmd === 'up' ? -1 : 1));
    const n = this.navs()[this.focus];
    if (!n) return;
    const kind = n.dataset.kind;
    if (kind === 'range') {
      const r = RANGES.find((x) => x.key === n.dataset.key)!;
      if (cmd === 'left' || cmd === 'right') this.set(r.key, this.h.settings[r.key] + (cmd === 'right' ? r.step : -r.step), false);
    } else if (kind === 'toggle') this.toggle();
    else if (kind === 'seg') {
      if (cmd === 'ok') this.quality(this.h.settings.quality === 'low' ? 'high' : 'low');
      else this.quality(cmd === 'left' ? 'low' : 'high');
    } else if (cmd === 'ok') n.click();
  }

  private key(e: KeyboardEvent) {
    if (!this.open) return;
    const map: Record<string, Parameters<GameMenu['nav']>[0]> = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', Enter: 'ok', Space: 'ok', Escape: 'back', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    };
    const cmd = map[e.code];
    if (!cmd) return;
    // the menu has the keys: the game and the panels behind it do not see them
    e.preventDefault();
    e.stopImmediatePropagation();
    if (!e.repeat || cmd !== 'ok') this.nav(cmd);
  }

  private padButtons(): boolean[] {
    const pads = navigator.getGamepads?.() ?? [];
    const p = [...pads].find((x) => x && x.connected);
    if (!p) return [];
    const b = p.buttons.map((x) => !!x?.pressed);
    // the left stick as a d-pad
    const ax = p.mapping === 'standard' ? p.axes : [];
    b[100] = (ax[1] ?? 0) < -0.6;
    b[101] = (ax[1] ?? 0) > 0.6;
    b[102] = (ax[0] ?? 0) < -0.6;
    b[103] = (ax[0] ?? 0) > 0.6;
    return b;
  }

  private pollPad() {
    const b = this.padButtons();
    if (!b.length) return;
    const edge = (i: number) => b[i] && !this.padPrev[i];
    if (edge(0)) this.nav('ok');
    else if (edge(1)) this.nav('back');
    else if (edge(9)) {
      // Start again: straight back to the game
      if (this.game) {
        this.close();
        this.game.resume();
      } else this.back();
    }
    // directions repeat while held
    const dir = b[12] || b[100] ? 'up' : b[13] || b[101] ? 'down' : b[14] || b[102] ? 'left' : b[15] || b[103] ? 'right' : '';
    const now = performance.now();
    if (dir && dir !== this.padDir) {
      this.nav(dir as 'up');
      this.padHeld = now + this.repeatDelay;
    } else if (dir && now > this.padHeld) {
      this.nav(dir as 'up');
      this.padHeld = now + 110;
    }
    this.padDir = dir;
    this.padPrev = b;
  }
}

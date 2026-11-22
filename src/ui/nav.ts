// One way through every screen: the title, character creation, the pause menu,
// the dialogue box, the book (Dagboek, Kroniek, Personage), the shop, the
// reading card, the map and the chapter card. The keyboard and the gamepad do
// the same things everywhere:
//
//   arrows / WASD, d-pad / left stick  move to the next control (by where it lies on screen)
//   Enter / Space, A                   press it
//   Escape, B                          back, or close the screen
//   Tab / Shift+Tab                    the next / previous control
//   LB / RB                            the previous / next page (the book's tabs, creation's tabs, map zoom)
//
// The screen on top (the highest `layer` that is `active()`) gets every key and
// button; nothing it handles reaches the game behind it. Each screen only says
// what it holds and what "back" means; a screen with its own logic (the
// pause menu's sliders) handles the commands itself. The pad reading (left
// stick as a d-pad, a held direction repeats) is the pause menu's, moved here.

export type NavCmd = 'up' | 'down' | 'left' | 'right' | 'ok' | 'back' | 'prev' | 'next' | 'start' | 'select' | 'x' | 'y' | 'tab' | 'untab';

export interface NavScreen {
  /** higher layers are on top */
  layer: number;
  /** is the screen showing now? */
  active(): boolean;
  /** the element that holds the screen's controls */
  root(): HTMLElement | null;
  /** the controls to move between (default: buttons, inputs and [data-nav] inside root) */
  items?(): HTMLElement[];
  /** what to put the focus on when the screen opens (default: the first control) */
  first?(): HTMLElement | null;
  /** a command the screen handles itself: return true when it did */
  handle?(cmd: NavCmd, focused: HTMLElement | null): boolean;
  /** B, Escape */
  back(): void;
  /** up and down go round from the last control to the first (short lists) */
  wrap?: boolean;
  /** the screen keeps its own focus (the pause menu): the manager only delivers commands */
  ownFocus?: boolean;
}

const SEL = 'button, input, select, textarea, [data-nav]';

/** Is this element drawn (not hidden, not inside something hidden)? */
const shown = (el: HTMLElement) => {
  if (el.closest('[hidden]') || (el as HTMLButtonElement).disabled) return false;
  if (el.dataset.nonav !== undefined) return false;
  const r = el.getClientRects();
  if (!r.length) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden';
};

/** Text you type into (where the arrows, Space and letters belong to the field). */
const typing = (el: Element | null): el is HTMLInputElement =>
  !!el && ((el instanceof HTMLInputElement && !['range', 'checkbox', 'radio', 'button', 'submit'].includes(el.type)) || el instanceof HTMLTextAreaElement);

/** A stable name for a control, so the focus survives a panel redrawing itself. */
const sigOf = (el: HTMLElement) => {
  const d = Object.entries(el.dataset).filter(([k]) => k !== 'nonav').map(([k, v]) => `${k}=${v}`).join(',');
  return `${el.tagName}|${d || (el.textContent ?? '').trim().slice(0, 40)}`;
};

/** The pad's buttons, with the left stick as a d-pad (100-103: up, down, left, right). */
export function padButtons(): boolean[] {
  const pads = navigator.getGamepads?.() ?? [];
  const p = [...pads].find((x) => x && x.connected);
  if (!p) return [];
  const b = p.buttons.map((x) => !!x?.pressed);
  const ax = p.mapping === 'standard' ? p.axes : [];
  b[100] = (ax[1] ?? 0) < -0.6;
  b[101] = (ax[1] ?? 0) > 0.6;
  b[102] = (ax[0] ?? 0) < -0.6;
  b[103] = (ax[0] ?? 0) > 0.6;
  return b;
}

/** Is this pad button held right now? */
export const padHeld = (i: number) => !!padButtons()[i];

type Memo = { sig: string; x: number; y: number };

export class Nav {
  private screens: NavScreen[] = [];
  private cur: NavScreen | null = null;
  private focused: HTMLElement | null = null;
  private memo = new Map<NavScreen, Memo>();
  private padPrev: boolean[] = [];
  private padDir = '';
  private padHeld = 0;
  private fresh = false;
  /** ms a held direction waits before it repeats */
  repeatDelay = 380;
  /** the game's frame loop polls the pad, in step with its own input (see main.ts); until then the manager polls itself */
  external = false;
  private dev: 'kbm' | 'pad' = 'kbm';

  constructor() {
    window.addEventListener('keydown', (e) => this.key(e), { capture: true });
    // Space and Enter press a focused button on their own as well: once is enough
    window.addEventListener('keyup', (e) => {
      if (this.top() && (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') && !typing(e.target as Element)) e.preventDefault();
    }, { capture: true });
    const mouse = () => document.documentElement.classList.add('nav-mouse');
    window.addEventListener('mousemove', (e) => {
      // a captured mouse turning the camera is not a mouse pointing at a screen
      if (!document.pointerLockElement && (e.movementX || e.movementY)) mouse();
    });
    window.addEventListener('mousedown', mouse);
    // a click or a Tab inside a screen moves the focus there too
    window.addEventListener('focusin', (e) => {
      const t = e.target as HTMLElement;
      const s = this.top();
      if (!s || s.ownFocus || t === this.focused) return;
      if (this.items(s).includes(t)) this.setFocus(t, false);
    });
    const loop = () => {
      if (!this.external) this.poll();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** The device last used: hints show its buttons (`html.dev-pad` switches .k-kbd / .k-pad spans). */
  get device() {
    return this.dev;
  }
  set device(d: 'kbm' | 'pad') {
    if (d === this.dev) return;
    this.dev = d;
    document.documentElement.classList.toggle('dev-pad', d === 'pad');
  }

  add<T extends NavScreen>(s: T): T {
    this.screens.push(s);
    return s;
  }

  /** The screen on top, if one is showing. */
  top(): NavScreen | null {
    let best: NavScreen | null = null;
    for (const s of this.screens) if ((!best || s.layer > best.layer) && s.active()) best = s;
    return best;
  }

  /** The screen redrew with new controls (a new line of dialogue): focus its first control again. */
  refocus() {
    this.fresh = true;
  }

  /** The control that has the focus now. */
  get current() {
    return this.focused;
  }

  private items(s: NavScreen): HTMLElement[] {
    const list = s.items ? s.items() : [...(s.root()?.querySelectorAll<HTMLElement>(SEL) ?? [])];
    return list.filter(shown);
  }

  private setFocus(el: HTMLElement | null, scroll = true) {
    if (this.focused && this.focused !== el) this.focused.classList.remove('nav-focus');
    this.focused = el;
    if (!el) return;
    el.classList.add('nav-focus');
    if (document.activeElement !== el) {
      if (!el.hasAttribute('tabindex') && !(el instanceof HTMLButtonElement || el instanceof HTMLInputElement)) el.tabIndex = -1;
      el.focus({ preventScroll: true });
    }
    if (scroll) el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (this.cur) {
      const r = el.getBoundingClientRect();
      this.memo.set(this.cur, { sig: sigOf(el), x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
  }

  /** Keep the focus on a control of the screen on top (screens redraw; screens open and close). */
  private sync() {
    const s = this.top();
    if (s !== this.cur) {
      if (this.focused) this.focused.classList.remove('nav-focus');
      this.focused = null;
      this.cur = s;
      if (!s || s.ownFocus) return;
      // back on a screen you were on before (the title after the settings): where you were
      const m = this.memo.get(s);
      const items = this.items(s);
      const again = m && items.find((x) => sigOf(x) === m.sig);
      this.setFocus(again || (s.first?.() ?? null) || items[0] || null, false);
      return;
    }
    if (!s || s.ownFocus) return;
    if (this.fresh) {
      this.fresh = false;
      const items = this.items(s);
      this.setFocus((s.first?.() ?? null) || items[0] || null, false);
      return;
    }
    if (this.focused && this.focused.isConnected && shown(this.focused)) {
      if (!this.focused.classList.contains('nav-focus')) this.focused.classList.add('nav-focus');
      return;
    }
    // the control went away (the panel redrew): the same one again, else the nearest to where it was
    const items = this.items(s);
    if (!items.length) return this.setFocus(null);
    const m = this.memo.get(s);
    let pick = m ? items.find((x) => sigOf(x) === m.sig) : undefined;
    if (!pick && m) {
      let bd = Infinity;
      for (const x of items) {
        const r = x.getBoundingClientRect();
        const d = Math.hypot(r.left + r.width / 2 - m.x, r.top + r.height / 2 - m.y);
        if (d < bd) { bd = d; pick = x; }
      }
    }
    this.setFocus(pick ?? items[0], false);
  }

  /** The nearest control in a direction, by where things are on screen. */
  private nearest(items: HTMLElement[], from: HTMLElement, dir: 'up' | 'down' | 'left' | 'right') {
    const a = from.getBoundingClientRect();
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best: HTMLElement | null = null, bs = Infinity;
    for (const el of items) {
      if (el === from || el.contains(from) || from.contains(el)) continue;
      const b = el.getBoundingClientRect();
      const bx = b.left + b.width / 2, by = b.top + b.height / 2;
      let main: number, cross: number, off: number;
      if (dir === 'down' || dir === 'up') {
        main = dir === 'down' ? by - ay : ay - by;
        if (main <= 4 || (dir === 'down' ? b.bottom <= a.bottom : b.top >= a.top)) continue;
        cross = Math.max(0, b.left - a.right, a.left - b.right);
        off = Math.abs(bx - ax);
      } else {
        main = dir === 'right' ? bx - ax : ax - bx;
        if (main <= 4 || (dir === 'right' ? b.right <= a.right : b.left >= a.left)) continue;
        cross = Math.max(0, b.top - a.bottom, a.top - b.bottom);
        off = Math.abs(by - ay);
      }
      // up and down may drift sideways a little; left and right stay on the same line when there is one
      const score = dir === 'up' || dir === 'down' ? main + cross * 3 + off * 0.15 : main + off * 0.15 + (cross > 0 ? 5000 + cross * 3 : 0);
      if (score < bs) { bs = score; best = el; }
    }
    return best;
  }

  /** Nothing further that way: scroll what can scroll (a long card, a long list). */
  private scroll(s: NavScreen, dir: 'up' | 'down') {
    let el: HTMLElement | null = this.focused ?? s.root();
    while (el && el !== document.body) {
      const cs = getComputedStyle(el);
      if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2) {
        el.scrollBy({ top: (dir === 'down' ? 1 : -1) * Math.max(60, el.clientHeight * 0.4) });
        return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  /** Do one command on the screen on top. Returns true when a screen took it. */
  run(cmd: NavCmd): boolean {
    this.sync();
    const s = this.cur;
    if (!s) return false;
    const f = s.ownFocus ? null : this.focused;
    if (s.handle?.(cmd, f)) return true;
    if (s.ownFocus) {
      if (cmd === 'back') s.back();
      return true;
    }
    if (cmd === 'back') {
      s.back();
      return true;
    }
    const items = this.items(s);
    if (cmd === 'ok') {
      if (f && f instanceof HTMLInputElement && f.type === 'range') return true;
      if (f && !typing(f)) f.click();
      return true;
    }
    if (cmd === 'tab' || cmd === 'untab') {
      if (!items.length) return true;
      const i = f ? items.indexOf(f) : -1;
      this.setFocus(items[(i + (cmd === 'tab' ? 1 : -1) + items.length) % items.length]);
      return true;
    }
    if (cmd === 'up' || cmd === 'down' || cmd === 'left' || cmd === 'right') {
      if (f instanceof HTMLInputElement && f.type === 'range' && (cmd === 'left' || cmd === 'right')) {
        const lo = +f.min || 0, hi = +f.max || 100;
        const step = Math.max(+f.step || 0, (hi - lo) / 20);
        f.value = String(Math.min(hi, Math.max(lo, +f.value + (cmd === 'right' ? step : -step))));
        f.dispatchEvent(new Event('input', { bubbles: true }));
        f.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      if (!f || !items.includes(f)) {
        if (items.length) this.setFocus(items[0]);
        else if (cmd === 'up' || cmd === 'down') this.scroll(s, cmd);
        return true;
      }
      const next = this.nearest(items, f, cmd);
      if (next) this.setFocus(next);
      else if (cmd === 'up' || cmd === 'down') {
        if (!this.scroll(s, cmd) && s.wrap && items.length > 1) this.setFocus(cmd === 'down' ? items[0] : items[items.length - 1]);
      }
      return true;
    }
    // prev / next / start / select / x / y: only what the screen made of them
    return true;
  }

  // ---------------------------------------------------------------- keyboard
  private key(e: KeyboardEvent) {
    document.documentElement.classList.remove('nav-mouse');
    const s = this.top();
    if (!s) return;
    this.device = 'kbm';
    const t = typing(document.activeElement);
    const map: Record<string, NavCmd> = {
      ArrowUp: 'up', ArrowDown: 'down', Enter: 'ok', NumpadEnter: 'ok', Escape: 'back', Tab: e.shiftKey ? 'untab' : 'tab',
      ...(t ? {} : { ArrowLeft: 'left', ArrowRight: 'right', Space: 'ok', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' } as Record<string, NavCmd>),
    };
    const cmd = map[e.code];
    if (!cmd) return;
    // the screen has the key: the game and the panels behind it do not see it
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.repeat && (cmd === 'ok' || cmd === 'back')) return;
    this.run(cmd);
  }

  // ---------------------------------------------------------------- gamepad
  /** Read the pad once (each frame). Edges only: a press that opened a screen is not a press inside it. */
  poll() {
    const b = padButtons();
    if (!b.length) {
      this.padPrev = [];
      this.sync();
      return;
    }
    const edge = (i: number) => b[i] && !this.padPrev[i];
    const any = b.some((x, i) => x && !this.padPrev[i]);
    if (any) {
      this.device = 'pad';
      document.documentElement.classList.remove('nav-mouse');
    }
    if (!this.top()) {
      this.padPrev = b;
      this.padDir = '';
      this.sync();
      return;
    }
    if (edge(0)) this.run('ok');
    else if (edge(1)) this.run('back');
    else if (edge(9)) this.run('start');
    else if (edge(8)) this.run('select');
    else if (edge(4)) this.run('prev');
    else if (edge(5)) this.run('next');
    else if (edge(2)) this.run('x');
    else if (edge(3)) this.run('y');
    // directions repeat while held
    const dir = b[12] || b[100] ? 'up' : b[13] || b[101] ? 'down' : b[14] || b[102] ? 'left' : b[15] || b[103] ? 'right' : '';
    const now = performance.now();
    if (dir && dir !== this.padDir) {
      this.run(dir as NavCmd);
      this.padHeld = now + this.repeatDelay;
    } else if (dir && now > this.padHeld) {
      this.run(dir as NavCmd);
      this.padHeld = now + 110;
    }
    this.padDir = dir;
    this.padPrev = b;
    this.sync();
  }
}

/** The one manager for the page. */
export const nav = new Nav();

/** A key hint for both devices; CSS shows the one in use (html.dev-pad). */
export const hint = (kbd: string, pad: string) => `<span class="k-kbd">${kbd}</span><span class="k-pad">${pad}</span>`;

// Unified keyboard / mouse / gamepad input. Game code reads abstract axes and
// actions, never raw keys, so remapping and gamepad support stay in one place.

export type Action =
  | 'interact' // E / Y   — land, dismount, call the dragon
  | 'jump' // Space / A — climb (flight) or jump (on foot)
  | 'descend' // Ctrl/C / B — dive down (flight)
  | 'boost' // Shift / X, L3 (and LB on foot) — boost (flight) or run (on foot)
  | 'brake' // S held in flight, LT
  | 'time' // T — advance time of day
  | 'map' // M / Back — toggle map
  | 'journal' // J / RB — quest journal
  | 'kroniek' // K — the chronicle
  | 'paint' // P — the view as a painting
  | 'attack' // left mouse / RT on foot, LB flying — sword (on foot), fire (flying; RT is the throttle there)
  | 'skill' // right mouse / LT — origin skill
  | 'skill2' // R / B on foot — second skill
  | 'potion' // Q / d-pad down — drink a salve
  | 'dragon' // G / d-pad left — call the dragon to your side in a fight (once Het Oude Volk taught it)
  | 'character' // I, Tab / d-pad right — character and bag
  | 'help' // H — the controls
  | 'menu'; // Start — the pause menu (Escape is the browser's own: it lets go of the mouse, see main.ts)

const KEYMAP: Record<string, Action> = {
  KeyE: 'interact',
  KeyF: 'interact',
  Space: 'jump',
  ControlLeft: 'descend',
  KeyC: 'descend',
  ShiftLeft: 'boost',
  ShiftRight: 'boost',
  KeyT: 'time',
  KeyM: 'map',
  KeyJ: 'journal',
  KeyK: 'kroniek',
  KeyP: 'paint',
  KeyR: 'skill2',
  KeyQ: 'potion',
  KeyG: 'dragon',
  KeyI: 'character',
  Tab: 'character',
  KeyH: 'help',
};

/**
 * The controls as the player reads them (the H card and the pause menu's BESTURING page, src/ui/hud.ts).
 * Kept next to KEYMAP and the pad map in poll(): change a binding, change its line here.
 */
export interface ControlRow { what: string; kbd: string; pad: string }
export const CONTROLS: { group: string; when: 'fly' | 'foot' | 'any' | 'screen'; rows: ControlRow[] }[] = [
  { group: 'In de lucht', when: 'fly', rows: [
    { what: 'Sturen', kbd: 'Muis · A / D', pad: 'Linkerstick' },
    { what: 'Sneller / trager', kbd: 'W / S · muiswiel', pad: 'RT / LT' },
    { what: 'Stijgen / dalen', kbd: 'Spatie / C', pad: 'A / B' },
    { what: 'Versnellen', kbd: 'Shift', pad: 'X' },
    { what: 'Drakenvuur', kbd: 'Linkermuis', pad: 'LB' },
    { what: 'Gaven van je draak', kbd: 'Rechtermuis · R', pad: 'LT · B' },
    { what: 'Landen', kbd: 'E', pad: 'Y' },
  ] },
  { group: 'Te voet', when: 'foot', rows: [
    { what: 'Stappen · rondkijken', kbd: 'W A S D · muis', pad: 'Linkerstick · rechterstick' },
    { what: 'Rennen', kbd: 'Shift', pad: 'LB · X' },
    { what: 'Springen · in een gevecht wegrollen', kbd: 'Spatie', pad: 'A' },
    { what: 'Praten · oprapen · lezen', kbd: 'E', pad: 'Y' },
    { what: 'Je draak roepen en bestijgen', kbd: 'E', pad: 'Y' },
    { what: 'Zwaardslag', kbd: 'Linkermuis', pad: 'RT' },
    { what: 'Vaardigheden van je klasse', kbd: 'Rechtermuis · R', pad: 'LT · B' },
    { what: 'Je draak te hulp roepen', kbd: 'G', pad: '◀ kruistoets' },
  ] },
  { group: 'Altijd', when: 'any', rows: [
    { what: 'Begijnenzalf', kbd: 'Q', pad: '▼ kruistoets' },
    { what: 'Dagboek · Kroniek · Personage', kbd: 'J · K · I', pad: 'RB · ▶ kruistoets' },
    { what: 'Kaart', kbd: 'M', pad: 'Back' },
    { what: 'Licht van de dag veranderen', kbd: 'T', pad: '▲ kruistoets' },
    { what: 'Het Schilderij', kbd: 'P', pad: '–' },
    { what: 'Besturing tonen of verbergen', kbd: 'H', pad: '–' },
    { what: 'Pauze en instellingen', kbd: 'Esc', pad: 'Start' },
  ] },
  { group: 'In een scherm', when: 'screen', rows: [
    { what: 'Kiezen', kbd: 'Pijltjes · Tab', pad: 'Kruistoetsen · linkerstick' },
    { what: 'Bevestigen', kbd: 'Enter · Spatie', pad: 'A' },
    { what: 'Terug of sluiten', kbd: 'Esc', pad: 'B' },
    { what: 'Andere bladzijde van je boek', kbd: 'J · K · I', pad: 'LB / RB' },
  ] },
];

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

export class Input {
  private keys = new Set<string>();
  private pressed = new Set<Action>();
  private padPrev: boolean[] = [];
  private mouse = new Set<number>();
  private trigPrev = [false, false, false];
  mouseDX = 0;
  mouseDY = 0;
  private wheel = 0;
  pointerLocked = false;
  /** false once a pointer-lock request has failed (sandboxed iframes): use drag-to-look */
  lockSupported = true;
  private dragging = false;
  private everLocked = false;
  /** last device used: affects steering model & prompts */
  device: 'kbm' | 'pad' = 'kbm';
  /** set by the game each frame: in flight RT is the throttle, so the pad breathes fire with LB */
  flying = false;
  /** a screen is open (a panel, the dialogue, the map, the pause menu: src/ui/nav.ts has its keys and buttons):
   *  the pad's buttons and both sticks, the movement keys and the mouse do nothing in the game behind it */
  ui = false;
  /** the game has started: from now on Space, Tab and the arrows belong to it (not to the page) */
  gameKeys = false;

  // Analog state, refreshed each frame by poll().
  moveX = 0; // strafe / yaw  (-1..1)
  moveY = 0; // forward / pitch (-1..1, +1 = forward / nose down on pad)
  lookX = 0; // right stick
  lookY = 0;
  throttle = 0; // 0..1
  brakeAxis = 0; // 0..1

  constructor(private canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      // typing a name is not playing
      const t = e.target as HTMLElement | null;
      if (t && (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) && !(t instanceof HTMLInputElement && t.type === 'range')) return;
      this.device = 'kbm';
      this.keys.add(e.code);
      const a = KEYMAP[e.code];
      if (a) this.pressed.add(a);
      if (this.gameKeys && (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow'))) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked && !this.dragging) return;
      // a mouse that did not move (events the browser sends on its own) does not take the controls from the pad
      if (e.movementX || e.movementY) this.device = 'kbm';
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    canvas.addEventListener('mousedown', (e) => {
      this.dragging = !this.pointerLocked;
      this.device = 'kbm';
      this.mouse.add(e.button);
      if (e.button === 0) this.pressed.add('attack');
      if (e.button === 2) this.pressed.add('skill');
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mouseup', (e) => this.mouse.delete(e.button));
    canvas.addEventListener(
      'wheel',
      (e) => {
        this.wheel += -Math.sign(e.deltaY);
        e.preventDefault();
      },
      { passive: false },
    );
    window.addEventListener('mouseup', () => (this.dragging = false));
    // A failed request only means "unsupported" if lock has never worked here:
    // browsers also reject re-locking for a moment after Esc.
    document.addEventListener('pointerlockerror', () => {
      if (!this.everLocked) this.lockSupported = false;
    });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (this.pointerLocked) this.everLocked = true;
    });
  }

  requestLock() {
    if (this.pointerLocked || !this.lockSupported) return;
    try {
      const r = this.canvas.requestPointerLock?.() as unknown as Promise<void> | undefined;
      r?.catch?.(() => {
        if (!this.everLocked) this.lockSupported = false;
      });
    } catch {
      if (!this.everLocked) this.lockSupported = false;
    }
  }

  down(code: string) {
    return this.keys.has(code);
  }

  held(a: Action): boolean {
    if (this.ui) return false;
    if (a === 'attack' && this.mouse.has(0)) return true;
    for (const [code, act] of Object.entries(KEYMAP)) if (act === a && this.keys.has(code)) return true;
    const pad = this.pad();
    if (pad) {
      const b = (i: number) => !!pad.buttons[i]?.pressed;
      if (a === 'jump' && b(0)) return true;
      if (a === 'descend' && b(1)) return true;
      if (a === 'boost' && (b(2) || b(10) || (!this.flying && b(4)))) return true;
      if (a === 'interact' && b(3)) return true;
      if (a === 'attack' && (this.flying ? b(4) : (pad.buttons[7]?.value ?? 0) > 0.5)) return true;
    }
    return false;
  }

  /** Was this pressed this frame (without using it up)? */
  peek(a: Action): boolean {
    return this.pressed.has(a);
  }

  /** True once per press. */
  consume(a: Action): boolean {
    if (this.pressed.has(a)) {
      this.pressed.delete(a);
      return true;
    }
    return false;
  }

  private pad(): Gamepad | null {
    const pads = navigator.getGamepads?.() ?? [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }

  /** Call once per frame before game update. */
  poll() {
    const k = (c: string) => (this.keys.has(c) ? 1 : 0);
    let mx = k('KeyD') + k('ArrowRight') - k('KeyA') - k('ArrowLeft');
    let my = k('KeyW') + k('ArrowUp') - k('KeyS') - k('ArrowDown');
    let lx = 0, ly = 0, thr = k('KeyW') || k('ArrowUp') ? 1 : 0, brk = k('KeyS') || k('ArrowDown') ? 1 : 0;

    const pad = this.pad();
    if (pad) {
      const dz = (v: number) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);
      // only the two sticks of a standard pad: other layouts (wheels, joysticks, Firefox on Linux)
      // put their triggers on axes that rest at -1, which would look like a stick held over
      const raw = pad.mapping === 'standard' ? pad.axes.slice(0, 4) : [];
      const ax = raw.map((v) => dz(v ?? 0));
      const rt = pad.buttons[7]?.value ?? 0;
      const lt = pad.buttons[6]?.value ?? 0;
      // taking the pad up means a real push, not a worn stick drifting past the dead zone
      const active = raw.some((v) => Math.abs(v ?? 0) > 0.35) || rt > 0.2 || lt > 0.2 || pad.buttons.some((b) => b.pressed);
      if (active) this.device = 'pad';
      if (this.device === 'pad' && !this.ui) {
        // added to the keys, not instead of them: a held key always works
        mx = clamp1(mx + (ax[0] ?? 0));
        my = clamp1(my - (ax[1] ?? 0));
        lx = ax[2] ?? 0;
        ly = ax[3] ?? 0;
        thr = Math.max(thr, rt);
        brk = Math.max(brk, lt);
      }
      // Edge-triggered pad buttons → actions.
      const map: [number, Action][] = [
        [3, 'interact'],
        [0, 'jump'],
        [8, 'map'],
        [5, 'journal'],
        [13, 'potion'],
        [14, 'dragon'],
        [1, 'skill2'],
        [9, 'menu'],
        [12, 'time'],
        [15, 'character'],
      ];
      // triggers as buttons: RT attacks, LT uses the skill (both also drive flight speed).
      // In flight RT is the throttle, so fire is LB there.
      const trig = [(pad.buttons[7]?.value ?? 0) > 0.5, (pad.buttons[6]?.value ?? 0) > 0.5, !!pad.buttons[4]?.pressed];
      // with a screen open the buttons belong to it (nav.ts): only remember them, so that a press
      // that closed the screen does not also act in the game the frame after
      const ui = this.ui;
      if (!ui && trig[0] && !this.trigPrev[0] && !this.flying) this.pressed.add('attack');
      if (!ui && trig[1] && !this.trigPrev[1]) this.pressed.add('skill');
      if (!ui && trig[2] && !this.trigPrev[2] && this.flying) this.pressed.add('attack');
      this.trigPrev = trig;
      for (const [i, a] of map) {
        const now = !!pad.buttons[i]?.pressed;
        if (!ui && now && !this.padPrev[i]) this.pressed.add(a);
        this.padPrev[i] = now;
      }
    }
    if (this.ui) {
      // nothing moves behind an open screen: no walking, no camera, no throttle
      mx = my = lx = ly = thr = brk = 0;
      this.mouseDX = this.mouseDY = 0;
    }
    this.moveX = mx;
    this.moveY = my;
    this.lookX = lx;
    this.lookY = ly;
    this.throttle = thr;
    this.brakeAxis = brk;
  }

  /** Mouse-wheel notches since the last call (+ = up). */
  consumeWheel() {
    const w = this.wheel;
    this.wheel = 0;
    return w;
  }

  /** Call at end of frame. */
  endFrame() {
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.pressed.clear();
  }
}

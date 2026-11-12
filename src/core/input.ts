// Unified keyboard / mouse / gamepad input. Game code reads abstract axes and
// actions, never raw keys, so remapping and gamepad support stay in one place.

export type Action =
  | 'interact' // E / Y   — land, dismount, call the dragon
  | 'jump' // Space / A — climb (flight) or jump (on foot)
  | 'descend' // Ctrl/C / B — dive down (flight)
  | 'boost' // Shift / X(LB) — boost (flight) or run (on foot)
  | 'brake' // S held in flight, LT
  | 'time' // T — advance time of day
  | 'map' // M / Back — toggle map
  | 'journal' // J / RB — quest journal
  | 'kroniek' // K — the chronicle
  | 'attack' // left mouse / RT on foot — sword (on foot), fire (flying)
  | 'skill' // right mouse / LT — origin skill
  | 'skill2' // R / B on foot — second skill
  | 'potion' // Q / d-pad down — drink a salve
  | 'character' // I / C(on foot) — character and bag
  | 'help'; // H / Start

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
  KeyR: 'skill2',
  KeyQ: 'potion',
  KeyI: 'character',
  Tab: 'character',
  KeyH: 'help',
};

export class Input {
  private keys = new Set<string>();
  private pressed = new Set<Action>();
  private padPrev: boolean[] = [];
  private mouse = new Set<number>();
  private trigPrev = [false, false];
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
      this.device = 'kbm';
      this.keys.add(e.code);
      const a = KEYMAP[e.code];
      if (a) this.pressed.add(a);
      if (e.code === 'Space' || e.code === 'Tab' || e.code.startsWith('Arrow')) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked && !this.dragging) return;
      this.device = 'kbm';
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
    if (a === 'attack' && this.mouse.has(0)) return true;
    for (const [code, act] of Object.entries(KEYMAP)) if (act === a && this.keys.has(code)) return true;
    const pad = this.pad();
    if (pad) {
      const b = (i: number) => !!pad.buttons[i]?.pressed;
      if (a === 'jump' && b(0)) return true;
      if (a === 'descend' && b(1)) return true;
      if (a === 'boost' && (b(2) || b(4) || b(10))) return true;
      if (a === 'interact' && b(3)) return true;
      if (a === 'attack' && (pad.buttons[7]?.value ?? 0) > 0.5) return true;
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
      const ax = pad.axes.map((v) => dz(v ?? 0));
      const rt = pad.buttons[7]?.value ?? 0;
      const lt = pad.buttons[6]?.value ?? 0;
      const active = ax.some((v) => v !== 0) || rt > 0.1 || lt > 0.1 || pad.buttons.some((b) => b.pressed);
      if (active) this.device = 'pad';
      if (this.device === 'pad') {
        mx = ax[0] ?? 0;
        my = -(ax[1] ?? 0);
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
        [1, 'skill2'],
        [9, 'help'],
        [12, 'time'],
      ];
      // triggers as buttons: RT attacks, LT uses the skill (both also drive flight speed)
      const trig = [(pad.buttons[7]?.value ?? 0) > 0.5, (pad.buttons[6]?.value ?? 0) > 0.5];
      if (trig[0] && !this.trigPrev[0]) this.pressed.add('attack');
      if (trig[1] && !this.trigPrev[1]) this.pressed.add('skill');
      this.trigPrev = trig;
      for (const [i, a] of map) {
        const now = !!pad.buttons[i]?.pressed;
        if (now && !this.padPrev[i]) this.pressed.add(a);
        this.padPrev[i] = now;
      }
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

// The cinematic player: in-engine films made of shots. A shot is a camera
// move (position and look-at splines with easing), a time of day, fog and
// light, people and creatures staged for it, sound cues and narration. Shots
// follow each other with cuts, dips to black or cross-fades; letterbox bars,
// subtitles and a hold-to-skip hint sit on top. The same player also gives
// the prologue its "beats": a few seconds where the camera is taken from the
// player, moved, and handed back with a blend.
//
// The film's clock is its own (`update(dt)`), so tests can step it, and a skip
// at any moment ends in the same clean state as playing to the end: every
// staged object removed, light and fog restored, the HUD back.

import * as THREE from 'three';
import { Voice } from '../audio/voice';
import type { Sound } from '../audio/sound';
import type { Folk, FolkSpec, TownsfolkKit } from '../rpg/townsfolk';

export type V3 = [number, number, number];
export type SkyId = 'golden' | 'day' | 'night' | 'storm';
export type Ease = 'inout' | 'in' | 'out' | 'linear' | 'slowout';

export interface CamMove {
  /** camera positions, from start to end (two or more: a smooth curve through them) */
  path: V3[];
  /** what the camera looks at, from start to end */
  look: V3[];
  ease?: Ease;
  /** field of view, fixed or from..to */
  fov?: number | [number, number];
  /** roll in radians */
  roll?: number;
  /** a slow hand-held drift (metres) */
  drift?: number;
}

export interface Env {
  /** multipliers on the time of day's own values */
  fog?: number;
  sun?: number;
  exposure?: number;
  /** windows lit (0..1), overrides the sky's */
  night?: number;
}

export interface Line {
  id: string;
  /** speaker; empty for the narrator */
  who: string;
  text: string;
}

export interface Shot {
  name: string;
  sky: SkyId;
  /** narration over this shot, in order */
  lines?: string[];
  /** seconds before the first line, after the last, and between lines */
  lead?: number;
  tail?: number;
  gap?: number;
  /** the shot lasts at least this long */
  min?: number;
  cam: CamMove;
  /** how this shot begins: a cut, a dip through black, or a cross-fade from the last frame */
  into?: 'cut' | 'black' | 'cross';
  /** seconds of that transition */
  blend?: number;
  /** where the world should be awake: people, shadows */
  focus: [number, number];
  env?: Env;
  /** the street crowd and the market around the focus */
  crowd?: boolean;
  /** a title in the corner: [kicker, title] */
  title?: [string, string];
  /** build the people and things of this shot */
  cast?(s: Stage): void;
  /** every frame: t seconds into the shot, k = t / duration */
  tick?(s: Stage, t: number, dt: number, k: number): void;
  /** sound and other events at a time into the shot (negative: from the end) */
  cues?: [number, (s: Stage) => void][];
}

export interface Film {
  id: string;
  shots: Shot[];
  lines: Record<string, Line>;
}

export interface CineDeps {
  ui: HTMLElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  voice: Voice;
  sound: Sound;
  kit: TownsfolkKit | null;
  ground(x: number, z: number): number;
  setSky(id: SkyId): Promise<void>;
  /** the sky's own values, to multiply */
  look(): { fogDensity: number; sunIntensity: number; exposure: number; night: number };
  /** set exposure and windows for this frame */
  grade(exposure: number, night: number): void;
  fog(): THREE.FogExp2;
  sun(): THREE.DirectionalLight;
  /** fill {name} and similar */
  fill(text: string): string;
  /** compile what the film will draw, while the screen is still black (no stall at the first cut to it) */
  warm?(): void;
}

// ------------------------------------------------------------------ easing and curves
export function ease(k: number, e: Ease = 'inout') {
  k = Math.min(1, Math.max(0, k));
  switch (e) {
    case 'linear': return k;
    case 'in': return k * k * k;
    case 'out': return 1 - (1 - k) ** 3;
    case 'slowout': return 1 - (1 - k) ** 2;
    default: return k * k * (3 - 2 * k) * 0.7 + k * 0.3; // gentle: never quite stops in the middle of a shot
  }
}

/** A path through points: straight for two, a smooth curve for more. */
export class Path {
  private curve: THREE.CatmullRomCurve3 | null;
  private a: THREE.Vector3;
  private b: THREE.Vector3;
  constructor(pts: V3[]) {
    const v = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
    this.a = v[0];
    this.b = v[v.length - 1];
    this.curve = v.length > 2 ? new THREE.CatmullRomCurve3(v, false, 'centripetal') : null;
  }
  at(k: number, out: THREE.Vector3) {
    if (this.curve) return this.curve.getPointAt(Math.min(1, Math.max(0, k)), out);
    return out.lerpVectors(this.a, this.b, k);
  }
}

// ------------------------------------------------------------------ staged figures
export interface Fig {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  folk: Folk | null;
  /** current clip action */
  cur: THREE.AnimationAction | null;
  x: number;
  z: number;
  yaw: number;
  /** walking along a path: points, speed m/s, distance so far */
  route: { path: THREE.CatmullRomCurve3 | null; a: THREE.Vector3; b: THREE.Vector3; len: number; speed: number; s: number; clip: string } | null;
  /** play this clip, cross-fading from the last */
  play(name: string, fade?: number, rate?: number): void;
  update(dt: number): void;
}

/** What a shot can put on stage. Everything added here is removed when the shot ends. */
export class Stage {
  group = new THREE.Group();
  figs: Fig[] = [];
  /** objects owned by the game that a shot borrowed (shown, moved): restored on clear */
  private borrowed: { o: THREE.Object3D; visible: boolean; parent: THREE.Object3D | null; pos: THREE.Vector3; quat: THREE.Quaternion; scale: THREE.Vector3 }[] = [];
  private lights: THREE.Light[] = [];
  private updaters: ((dt: number) => void)[] = [];
  /** anything else a shot made (bodies with dispose) */
  private disposers: (() => void)[] = [];
  constructor(private d: CineDeps) {}

  get sound() { return this.d.sound; }
  get kit() { return this.d.kit; }
  ground(x: number, z: number) { return this.d.ground(x, z); }

  /** A person built from the character kit: a spec, or an archetype id. */
  person(what: FolkSpec | string, x: number, z: number, yaw: number, clip = 'idle', seed = 1): Fig | null {
    const kit = this.d.kit;
    if (!kit) return null;
    let s = seed * 9301 + 49297;
    const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    const folk = typeof what === 'string' ? kit.build(r, undefined, what) : kit.buildSpec(what);
    if (!folk) return null;
    folk.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = true;
    });
    this.group.add(folk.root);
    const fig = this.figFrom(folk.root, folk, x, z, yaw);
    fig.play(clip, 0);
    // everyone a little out of step with everyone else
    if (fig.cur) fig.cur.time = (seed * 0.37) % Math.max(0.1, fig.cur.getClip().duration);
    return fig;
  }

  /** Treat any object as a figure (no clips): it can still be moved along a route. */
  thing(o: THREE.Object3D, x: number, z: number, yaw: number): Fig {
    this.group.add(o);
    return this.figFrom(o, null, x, z, yaw);
  }

  private figFrom(root: THREE.Object3D, folk: Folk | null, x: number, z: number, yaw: number): Fig {
    const mixer = folk ? new THREE.AnimationMixer(root) : null;
    const actions = new Map<string, THREE.AnimationAction>();
    const fig: Fig = {
      root, mixer, folk, cur: null, x, z, yaw, route: null,
      play(name, fade = 0.3, rate = 1) {
        if (!mixer || !folk) return;
        let a = actions.get(name);
        if (!a) {
          const clip = name === 'walk' ? folk.clips.walk : name === 'idle' ? folk.clips.idle : name === 'talk' ? folk.clips.talk ?? folk.clip('talk') : name === 'run' ? folk.clips.run ?? folk.clip('run') : folk.clip(name);
          if (!clip) return;
          a = mixer.clipAction(clip);
          if (['death', 'hit', 'attack1', 'attack2', 'attack3', 'land', 'jump', 'cast', 'point'].includes(name)) {
            a.setLoop(THREE.LoopOnce, 1);
            a.clampWhenFinished = true;
          }
          actions.set(name, a);
        }
        a.timeScale = rate;
        if (a === this.cur) return;
        a.reset().play();
        if (this.cur && fade > 0) this.cur.crossFadeTo(a, fade, false);
        else if (this.cur) this.cur.stop();
        this.cur = a;
      },
      update(dt) {
        const r = this.route;
        if (r) {
          r.s = Math.min(r.len, r.s + r.speed * dt);
          const k = r.len ? r.s / r.len : 1;
          const p = r.path ? r.path.getPointAt(k) : new THREE.Vector3().lerpVectors(r.a, r.b, k);
          const dx = p.x - this.x, dz = p.z - this.z;
          if (dx * dx + dz * dz > 1e-6) this.yaw = Math.atan2(dx, dz);
          this.x = p.x;
          this.z = p.z;
          if (r.s >= r.len) {
            this.route = null;
            this.play('idle', 0.4);
          }
        }
        this.root.position.set(this.x, (this.root.userData.y as number | undefined) ?? 0, this.z);
        const cur = this.root.rotation.y;
        this.root.rotation.y = cur + Math.atan2(Math.sin(this.yaw - cur), Math.cos(this.yaw - cur)) * Math.min(1, dt * 6);
        mixer?.update(dt);
      },
    };
    root.position.set(x, 0, z);
    root.rotation.y = yaw;
    this.figs.push(fig);
    return fig;
  }

  /** Send a figure along a route (points on the ground) at a pace, playing a gait. */
  walk(f: Fig | null, pts: [number, number][], speed = 1.3, clip = 'walk') {
    if (!f) return;
    const v = [[f.x, f.z], ...pts].map(([x, z]) => new THREE.Vector3(x, 0, z));
    const path = v.length > 2 ? new THREE.CatmullRomCurve3(v, false, 'centripetal') : null;
    const len = path ? path.getLength() : v[0].distanceTo(v[1]);
    f.route = { path, a: v[0], b: v[v.length - 1], len, speed, s: 0, clip };
    // play the gait at the pace of the feet: one loop of the clip covers `stride` metres
    const stride = f.folk?.stride || 1.4, len0 = f.folk?.clips.walk.duration || 1;
    const gait = clip === 'walk' || clip === 'walk_old' || clip === 'walk_formal';
    f.play(clip, 0.3, gait ? Math.min(2.2, Math.max(0.5, (speed * len0) / stride)) : clip === 'run' ? Math.max(0.7, speed / 5) : 1);
  }

  /**
   * Point lights for the film, made once and kept in the scene while it plays. Changing how many lights
   * a scene has makes every material compile again (a stall of seconds on a weak machine), so a shot
   * borrows one of these instead of adding its own.
   */
  pool: THREE.PointLight[] = [];
  private used = new Set<THREE.PointLight>();

  /** A light for this shot (a point light: taken from the pool, with this one's colour, power and reach). */
  light(l: THREE.PointLight, x: number, y: number, z: number): THREE.PointLight {
    const p = this.pool.find((q) => !this.used.has(q));
    if (!p) {
      // the pool is spent: add it anyway (costs a recompile)
      l.position.set(x, y, z);
      this.group.add(l);
      this.lights.push(l);
      return l;
    }
    this.used.add(p);
    p.color.copy(l.color);
    p.intensity = l.intensity;
    p.distance = l.distance;
    p.decay = l.decay;
    p.position.set(x, y, z);
    return p;
  }

  /** Show and place one of the game's own objects for this shot; it goes back as it was afterwards. */
  borrow(o: THREE.Object3D) {
    if (!this.borrowed.some((b) => b.o === o)) this.borrowed.push({ o, visible: o.visible, parent: o.parent, pos: o.position.clone(), quat: o.quaternion.clone(), scale: o.scale.clone() });
    o.visible = true;
    return o;
  }

  /** Run something every frame of this shot (after the figures). */
  every(fn: (dt: number) => void) {
    this.updaters.push(fn);
  }

  /** Something to clean up when the shot ends. */
  onClear(fn: () => void) {
    this.disposers.push(fn);
  }

  update(dt: number) {
    for (const f of this.figs) f.update(dt);
    for (const u of this.updaters) u(dt);
  }

  clear() {
    for (const fn of this.disposers.splice(0)) {
      try {
        fn();
      } catch (e) {
        console.warn(e);
      }
    }
    for (const f of this.figs) f.mixer?.stopAllAction();
    this.figs = [];
    this.updaters = [];
    this.group.clear();
    for (const l of this.lights) l.dispose();
    this.lights = [];
    for (const p of this.used) p.intensity = 0;
    this.used.clear();
    for (const b of this.borrowed) {
      b.o.visible = b.visible;
      if (b.parent && b.o.parent !== b.parent) b.parent.add(b.o);
      b.o.position.copy(b.pos);
      b.o.quaternion.copy(b.quat);
      b.o.scale.copy(b.scale);
    }
    this.borrowed = [];
  }
}

// ------------------------------------------------------------------ a soft round sprite, drawn once
let softTex: THREE.Texture | null = null;
export function softTexture() {
  if (softTex) return softTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  softTex = new THREE.CanvasTexture(c);
  softTex.colorSpace = THREE.SRGBColorSpace;
  return softTex;
}

/** Banks of mist: a handful of large soft sprites that drift low over the ground. Cheap: no extra pass. */
export function mist(group: THREE.Object3D, cx: number, cz: number, spread: number, n: number, color = '#9fb3c4', opacity = 0.16, size = 26, seed = 7) {
  const mat = new THREE.SpriteMaterial({ map: softTexture(), color, transparent: true, opacity, depthWrite: false, fog: true });
  const sprites: THREE.Sprite[] = [];
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const sp = new THREE.Sprite(mat);
    sp.position.set(cx + (r() - 0.5) * spread, 0.8 + r() * 1.6, cz + (r() - 0.5) * spread);
    sp.scale.set(size * (0.7 + r() * 0.8), size * 0.32 * (0.7 + r() * 0.6), 1);
    sp.userData.drift = (r() - 0.5) * 0.6;
    sp.renderOrder = 5;
    group.add(sp);
    sprites.push(sp);
  }
  return {
    mat,
    sprites,
    update(dt: number) {
      for (const sp of sprites) sp.position.x += sp.userData.drift * dt;
    },
  };
}

// ------------------------------------------------------------------ the player
interface Planned {
  shot: Shot;
  start: number;
  dur: number;
  /** line ids with their start time (film clock) */
  lines: { id: string; at: number; dur: number }[];
}

export class Cine {
  active = false;
  /** the film's clock; tests can step it with update() */
  time = 0;
  /** the frame loop leaves the clock alone (a test drives it) */
  manual = false;
  /** where the world should be awake this frame */
  focus = new THREE.Vector3();
  /** the film's skies are loaded and its clock runs */
  ready = false;
  /** the shot being shown, and its index */
  index = -1;
  shot: Shot | null = null;
  skipped = false;
  /** a prologue beat holds the camera (blend 0..1) */
  beatWeight = 0;

  private film: Film | null = null;
  private plan: Planned[] = [];
  private total = 0;
  private stage: Stage;
  private el = document.createElement('div');
  private sub: HTMLElement;
  private titleEl: HTMLElement;
  private fadeEl: HTMLElement;
  private snap: HTMLCanvasElement;
  private wantSnap = false;
  private snapT = 0;
  private snapDur = 1;
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private paths: { p: Path; l: Path } | null = null;
  private lineShown: string | null = null;
  private speaking = false;
  private cuesDone = new Set<string>();
  private skipHeld = 0;
  private skipDown = false;
  private resolve: (() => void) | null = null;
  private env: Required<Env> = { fog: 1, sun: 1, exposure: 1, night: -1 };
  private envFrom: Required<Env> = { fog: 1, sun: 1, exposure: 1, night: -1 };
  private envT = 1;
  private skyBusy: Promise<void> = Promise.resolve();
  private sky: SkyId | null = null;
  /** seconds to hold the clock while a recorded line is still being spoken */
  private hold = 0;

  // prologue beats
  private beat: {
    cam: CamMove; dur: number; t: number; inT: number; outT: number; p: Path; l: Path; fov: [number, number];
    /** a moving thing: the camera looks towards it (or, with carry, the whole move travels with it) */
    track: (() => THREE.Vector3 | null) | null; carry: boolean; from: THREE.Vector3 | null; lookW: number; lastSeen?: THREE.Vector3;
  } | null = null;
  private gamePos = new THREE.Vector3();
  private gameQuat = new THREE.Quaternion();
  private gameFov = 60;

  constructor(private d: CineDeps) {
    this.stage = new Stage(d);
    this.el.className = 'film';
    this.el.innerHTML = '<div class="film-bar top"></div><div class="film-bar bot"></div><div class="film-title"></div><div class="film-sub"></div><div class="film-skip">Backspace ingedrukt houden · overslaan</div>';
    this.fadeEl = document.createElement('div');
    this.fadeEl.className = 'film-fade';
    this.snap = document.createElement('canvas');
    this.snap.className = 'film-snap';
    this.el.prepend(this.snap);
    this.el.append(this.fadeEl);
    this.sub = this.el.querySelector('.film-sub')!;
    this.titleEl = this.el.querySelector('.film-title')!;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Backspace' && this.active) this.skipDown = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Backspace') this.skipDown = false;
    });
    // touch: hold anywhere to skip
    window.addEventListener('pointerdown', (e) => {
      if (this.active && e.pointerType === 'touch') this.skipDown = true;
    });
    window.addEventListener('pointerup', () => {
      if (this.active) this.skipDown = false;
    });
  }

  /** Is the skip key held right now? (The prologue waits for it to be let go.) */
  get skipKeyDown() {
    return this.skipDown;
  }

  /** Seconds a line stays up. */
  private lineTime(id: string) {
    const L = this.film!.lines[id];
    return L ? Voice.readTime(this.d.fill(L.text)) + 0.2 : 3;
  }

  /** Lay the film out in time: each shot is as long as its words need. */
  private layout(film: Film) {
    let t = 0;
    this.plan = [];
    for (const shot of film.shots) {
      const lead = shot.lead ?? 0.6, tail = shot.tail ?? 0.4, gap = shot.gap ?? 0.35;
      const lines: Planned['lines'] = [];
      let lt = t + lead;
      for (const id of shot.lines ?? []) {
        const dur = this.lineTime(id);
        lines.push({ id, at: lt, dur });
        lt += dur + gap;
      }
      const need = (shot.lines?.length ? lt - gap - t : lead) + tail;
      const dur = Math.max(shot.min ?? 3, need);
      this.plan.push({ shot, start: t, dur, lines });
      t += dur;
    }
    this.total = t;
  }

  /** The planned length in seconds. */
  get length() {
    return this.total;
  }

  /** The shot list with start times (for review). */
  get schedule() {
    return this.plan.map((p) => ({ name: p.shot.name, start: +p.start.toFixed(2), dur: +p.dur.toFixed(2), lines: p.lines.map((l) => l.id) }));
  }

  /** Play a film. Resolves when it has ended (played out or skipped). */
  async play(film: Film): Promise<boolean> {
    if (this.active) this.end(true);
    this.film = film;
    this.layout(film);
    this.active = true;
    this.ready = false;
    this.skipped = false;
    this.time = 0;
    this.index = -1;
    this.shot = null;
    this.cuesDone.clear();
    this.lineShown = null;
    this.hold = 0;
    this.skipHeld = 0;
    this.d.ui.classList.add('film-on');
    this.d.ui.append(this.el);
    this.el.classList.remove('bars', 'gone');
    this.fadeEl.style.transition = 'none';
    this.fadeEl.style.opacity = '1';
    this.d.scene.add(this.stage.group);
    if (!this.stage.pool.length) for (let i = 0; i < 3; i++) this.stage.pool.push(new THREE.PointLight('#ffffff', 0, 10, 2));
    for (const p of this.stage.pool) {
      p.intensity = 0;
      this.d.scene.add(p);
    }
    // every time of day this film needs, loaded now, under black, so cuts between them are instant
    const skies = [...new Set(film.shots.map((s) => s.sky))];
    for (const s of skies) {
      if (!this.active) break;
      await this.d.setSky(s);
    }
    this.sky = null;
    try {
      this.d.warm?.();
    } catch (e) {
      console.warn(e);
    }
    this.ready = true;
    requestAnimationFrame(() => this.el.classList.add('bars'));
    return new Promise<boolean>((res) => {
      if (!this.active) return res(this.skipped);
      this.resolve = () => res(this.skipped);
    });
  }

  /** Advance the film. dt in seconds. */
  update(dt: number) {
    if (!this.active || !this.film) return;
    // hold Backspace to skip
    this.skipHeld = this.skipDown ? this.skipHeld + dt : 0;
    this.el.classList.toggle('skipping', this.skipHeld > 0.1);
    if (this.skipHeld > 0.8) return this.end(true);
    if (!this.ready) return;

    // a recorded line still being spoken holds the picture a moment longer
    if (this.speaking && this.hold < 6) {
      const p = this.plan[this.index];
      const ln = p?.lines.find((l) => l.id === this.lineShown);
      if (ln && this.time > ln.at + ln.dur - 0.3) {
        this.hold += dt;
        dt = 0;
      }
    }
    this.time += dt;
    if (this.time >= this.total) return this.end(false);

    // which shot?
    let i = this.index;
    while (i + 1 < this.plan.length && this.time >= this.plan[i + 1].start) i++;
    if (i !== this.index) this.enter(i);
    const p = this.plan[this.index];
    const t = this.time - p.start, k = t / p.dur;

    // cues
    for (const [j, [at, fn]] of (p.shot.cues ?? []).entries()) {
      const key = `${this.index}:${j}`;
      const when = at < 0 ? p.dur + at : at;
      if (!this.cuesDone.has(key) && t >= when) {
        this.cuesDone.add(key);
        fn(this.stage);
      }
    }

    // the camera
    if (this.paths) {
      const e = ease(k, p.shot.cam.ease);
      this.paths.p.at(e, this.camPos);
      this.paths.l.at(e, this.camLook);
      const dr = p.shot.cam.drift ?? 0.25;
      if (dr) {
        const T = this.time;
        this.camPos.x += Math.sin(T * 0.53) * dr * 0.6;
        this.camPos.y += Math.sin(T * 0.71 + 1) * dr * 0.35;
        this.camPos.z += Math.sin(T * 0.41 + 2) * dr * 0.6;
      }
      // never under the ground or inside a roof
      const floor = this.d.ground(this.camPos.x, this.camPos.z) + 0.35;
      if (this.camPos.y < floor) this.camPos.y = floor;
    }
    this.focus.set(p.shot.focus[0], 0, p.shot.focus[1]);

    this.stage.update(dt);
    p.shot.tick?.(this.stage, t, dt, k);

    // narration
    const ln = p.lines.find((l) => this.time >= l.at && this.time < l.at + l.dur);
    if (ln && ln.id !== this.lineShown) this.showLine(ln.id);
    else if (!ln && this.lineShown && !this.speaking) this.hideLine();

    // fade in at the start, and out before the end
    this.envT = Math.min(1, this.envT + dt / 1.2);
    if (this.time > this.total - 1.4) this.setFade(1, 1.2);

    // cross-fade overlay
    if (this.snapT > 0) {
      this.snapT = Math.max(0, this.snapT - dt);
      this.snap.style.opacity = String(Math.min(1, this.snapT / this.snapDur));
    }
  }

  private enter(i: number) {
    const prev = this.plan[this.index];
    this.index = i;
    const p = this.plan[i];
    const s = p.shot;
    this.shot = s;
    const into = this.index === 0 ? 'black' : s.into ?? 'cut';
    if (into === 'cross' && prev) {
      // keep the last frame of the old shot and fade it out over the new one
      this.wantSnap = false;
      this.snapT = this.snapDur = s.blend ?? 1.4;
      this.snap.style.opacity = '1';
    } else if (into === 'black') {
      this.fadeEl.style.transition = 'none';
      this.fadeEl.style.opacity = '1';
      requestAnimationFrame(() => this.setFade(0, s.blend ?? 1.6));
      this.snapT = 0;
      this.snap.style.opacity = '0';
    } else {
      this.snapT = 0;
      this.snap.style.opacity = '0';
    }
    this.stage.clear();
    this.paths = { p: new Path(s.cam.path), l: new Path(s.cam.look) };
    this.paths.p.at(0, this.camPos);
    this.paths.l.at(0, this.camLook);
    if (s.sky !== this.sky) {
      this.sky = s.sky;
      const id = s.sky;
      this.skyBusy = this.skyBusy.then(() => this.d.setSky(id));
    }
    this.envFrom = { ...this.env };
    this.env = { fog: s.env?.fog ?? 1, sun: s.env?.sun ?? 1, exposure: s.env?.exposure ?? 1, night: s.env?.night ?? -1 };
    this.envT = into === 'cut' || into === 'black' ? 1 : 0;
    this.focus.set(s.focus[0], 0, s.focus[1]);
    try {
      s.cast?.(this.stage);
    } catch (e) {
      console.warn('shot cast failed', s.name, e);
    }
    this.stage.update(0);
    // a title in the corner
    if (s.title) {
      this.titleEl.innerHTML = `<i>${s.title[0]}</i><b>${s.title[1]}</b>`;
      this.titleEl.classList.add('show');
      setTimeout(() => this.titleEl.classList.remove('show'), 5200);
    }
  }

  /** Call right after the frame is rendered: takes the last frame for a cross-fade when one is coming. */
  afterRender(canvas: HTMLCanvasElement) {
    if (!this.active) return;
    // snapshot every frame near a cross-fade boundary (cheap: only during the last 0.15 s before one)
    const next = this.plan[this.index + 1];
    if (next && next.shot.into === 'cross' && next.start - this.time < 0.25) this.wantSnap = true;
    if (this.wantSnap) {
      if (this.snap.width !== canvas.width || this.snap.height !== canvas.height) {
        this.snap.width = canvas.width;
        this.snap.height = canvas.height;
      }
      this.snap.getContext('2d')?.drawImage(canvas, 0, 0);
    }
  }

  private showLine(id: string) {
    const L = this.film!.lines[id];
    if (!L) return;
    this.lineShown = id;
    const text = this.d.fill(L.text);
    this.sub.innerHTML = `${L.who ? `<b>${L.who}</b>` : ''}<span>${text}</span>`;
    this.sub.classList.add('show');
    if (this.d.voice.has(id)) {
      this.speaking = true;
      void this.d.voice.play(id).then(() => {
        if (this.lineShown === id) this.speaking = false;
      });
    } else this.speaking = false;
  }

  private hideLine() {
    this.lineShown = null;
    this.sub.classList.remove('show');
  }

  private setFade(v: number, s: number) {
    this.fadeEl.style.transition = `opacity ${s}s ease`;
    this.fadeEl.style.opacity = String(v);
  }

  /**
   * Put the film's camera (or a prologue beat's) on the game camera. Call after the
   * game's own camera rig has run this frame.
   */
  apply(cam: THREE.PerspectiveCamera, dt: number) {
    if (this.active && this.paths && this.shot) {
      cam.position.copy(this.camPos);
      cam.up.set(0, 1, 0);
      cam.lookAt(this.camLook);
      if (this.shot.cam.roll) cam.rotateZ(this.shot.cam.roll);
      const f = this.shot.cam.fov ?? 50;
      const p = this.plan[this.index];
      const k = ease((this.time - p.start) / p.dur, this.shot.cam.ease);
      cam.fov = Array.isArray(f) ? f[0] + (f[1] - f[0]) * k : f;
      cam.updateProjectionMatrix();
      this.applyEnv();
      return;
    }
    if (this.beat) this.applyBeat(cam, dt);
  }

  private applyEnv() {
    const L = this.d.look();
    const m = (a: number, b: number) => a + (b - a) * this.envT;
    const fog = m(this.envFrom.fog, this.env.fog), sun = m(this.envFrom.sun, this.env.sun), ex = m(this.envFrom.exposure, this.env.exposure);
    this.d.fog().density = L.fogDensity * fog;
    this.d.sun().intensity = L.sunIntensity * sun;
    this.d.grade(L.exposure * ex, this.env.night >= 0 ? this.env.night : L.night);
  }

  private restoreEnv() {
    const L = this.d.look();
    this.d.fog().density = L.fogDensity;
    this.d.sun().intensity = L.sunIntensity;
    this.d.grade(L.exposure, L.night);
  }

  /** End the film now (skipped) or as played out. Always leaves the game whole. */
  end(skipped: boolean) {
    if (!this.active) return;
    this.active = false;
    this.skipped = skipped;
    this.d.voice.stop();
    this.stage.clear();
    this.d.scene.remove(this.stage.group);
    for (const p of this.stage.pool) this.d.scene.remove(p);
    this.d.sound.cineStop?.();
    this.restoreEnv();
    this.hideLine();
    this.paths = null;
    this.shot = null;
    this.snapT = 0;
    this.d.ui.classList.remove('film-on');
    // black, then the bars go and the overlay leaves (the prologue's own black card takes over)
    this.setFade(1, skipped ? 0.15 : 0.6);
    this.el.classList.remove('bars');
    this.el.classList.add('gone');
    setTimeout(() => {
      if (!this.active) this.el.remove();
    }, 900);
    const r = this.resolve;
    this.resolve = null;
    r?.();
  }

  // ================================================================ prologue beats
  /**
   * Take the camera for a few seconds: blend from wherever the game's camera is
   * into this move, then blend back. `update` it with the prologue's dt.
   */
  startBeat(cam: CamMove, dur: number, blendIn = 1.2, blendOut = 1.4, track: (() => THREE.Vector3 | null) | null = null, carry = false) {
    const f = cam.fov ?? 55;
    const at = track?.() ?? null;
    this.beat = { cam, dur, t: 0, inT: blendIn, outT: blendOut, p: new Path(cam.path), l: new Path(cam.look), fov: Array.isArray(f) ? f : [f, f], track, carry, from: at ? at.clone() : null, lookW: 0 };
  }

  /** Is a beat holding the camera? */
  get beating() {
    return !!this.beat;
  }

  /** Hand the camera back now (with the blend out). */
  releaseBeat() {
    if (!this.beat) return;
    const b = this.beat;
    b.dur = Math.min(b.dur, b.t + b.outT);
  }

  /** Drop the beat at once (skip, end). */
  cancelBeat() {
    this.beat = null;
    this.beatWeight = 0;
  }

  updateBeat(dt: number) {
    const b = this.beat;
    if (!b) return;
    b.t += dt;
    if (b.t >= b.dur) {
      this.beat = null;
      this.beatWeight = 0;
      return;
    }
    const wIn = Math.min(1, b.t / Math.max(0.01, b.inT)), wOut = Math.min(1, (b.dur - b.t) / Math.max(0.01, b.outT));
    const w = Math.min(wIn, wOut);
    this.beatWeight = w * w * (3 - 2 * w);
    const k = ease(b.t / b.dur, b.cam.ease ?? 'inout');
    b.p.at(k, this.camPos);
    b.l.at(k, this.camLook);
    const now = b.track?.() ?? null;
    if (now && b.carry && b.from) {
      const dx = now.x - b.from.x, dy = now.y - b.from.y, dz = now.z - b.from.z;
      this.camPos.x += dx; this.camPos.y += dy; this.camPos.z += dz;
      this.camLook.x += dx; this.camLook.y += dy; this.camLook.z += dz;
    } else if (b.track) {
      // turn towards the thing once it is there
      b.lookW = Math.min(1, Math.max(0, b.lookW + (now ? dt : -dt) * 1.2));
      if (now) b.lastSeen = now;
      if (b.lastSeen) this.camLook.lerp(b.lastSeen, b.lookW * b.lookW * (3 - 2 * b.lookW) * 0.85);
    }
  }

  private tmpM = new THREE.Matrix4();
  private tmpQ = new THREE.Quaternion();
  private applyBeat(cam: THREE.PerspectiveCamera, _dt: number) {
    const b = this.beat!;
    const w = this.beatWeight;
    if (w <= 0) return;
    this.gamePos.copy(cam.position);
    this.gameQuat.copy(cam.quaternion);
    this.gameFov = cam.fov;
    const floor = this.d.ground(this.camPos.x, this.camPos.z) + 0.35;
    if (this.camPos.y < floor) this.camPos.y = floor;
    this.tmpM.lookAt(this.camPos, this.camLook, new THREE.Vector3(0, 1, 0));
    this.tmpQ.setFromRotationMatrix(this.tmpM);
    if (b.cam.roll) this.tmpQ.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), b.cam.roll));
    cam.position.lerpVectors(this.gamePos, this.camPos, w);
    cam.quaternion.slerpQuaternions(this.gameQuat, this.tmpQ, w);
    const k = b.t / b.dur;
    cam.fov = this.gameFov + (b.fov[0] + (b.fov[1] - b.fov[0]) * k - this.gameFov) * w;
    cam.updateProjectionMatrix();
  }
}

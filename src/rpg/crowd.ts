// Townsfolk. A pool of people walks the real streets around the player and is
// recycled as you move (the Assassin's Creed Unity trick: full people near
// you, nobody far away). They greet you, gossip about what is going on, know
// your name once you are famous, and scatter when the dragon lands.

import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { recolor } from '../render/recolor';
import type { World } from '../world/world';
import type { QuestEngine } from './quests';

const POOL = 36;
const NEAR = 9, FAR = 70, DROP = 95;
const CLOAKS = ['#2e4a3c', '#5a3a22', '#3b3f55', '#6b5a3a', '#7a2e22', '#4f4a44', '#2f2f33', '#7a6a4a', '#3d5a5a', '#5e2f45', '#8a7a5a', '#45503a'];
const TINTS = ['#ffffff', '#f2ece4', '#e8e2dc', '#fff4e8'];

interface Line { p: number[]; len: number; seg: number[] }
interface Walker {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  walk: THREE.AnimationAction;
  idle: THREE.AnimationAction;
  line: Line | null;
  s: number;
  dir: 1 | -1;
  speed: number;
  standT: number;
  barkCd: number;
  flee: number;
  x: number;
  z: number;
  yaw: number;
  lod: number;
}

export class Crowd {
  group = new THREE.Group();
  private lines: Line[] = [];
  private ends = new Map<string, Line[]>();
  private walkers: Walker[] = [];
  private timer = 0;
  private barkGlobal = 0;
  private v = new THREE.Vector3();
  enabled = true;

  constructor(model: GLTF, private world: World, private quests: QuestEngine, private bark: (text: string, at: THREE.Vector3) => void) {
    // streets people walk: everything inside the walls, and the bigger roads near the towns
    const keep = new Set(['residential', 'pedestrian', 'living_street', 'service', 'tertiary', 'secondary', 'primary', 'unclassified', 'path']);
    const near = (x: number, z: number) => world.inTown(x, z) || Math.hypot(x + 5062, z - 518) < 420;
    for (const r of world.data.roads) {
      if (!keep.has(r.k)) continue;
      const mid = r.p.length >> 1 & ~1;
      if (!near(r.p[mid], r.p[mid + 1]) && !near(r.p[0], r.p[1])) continue;
      const seg: number[] = [0];
      let len = 0;
      for (let i = 2; i < r.p.length; i += 2) {
        len += Math.hypot(r.p[i] - r.p[i - 2], r.p[i + 1] - r.p[i - 1]);
        seg.push(len);
      }
      if (len < 15) continue;
      const line = { p: r.p, len, seg };
      this.lines.push(line);
      for (const k of [this.key(r.p[0], r.p[1]), this.key(r.p[r.p.length - 2], r.p[r.p.length - 1])]) {
        if (!this.ends.has(k)) this.ends.set(k, []);
        this.ends.get(k)!.push(line);
      }
    }
    const walkClips = model.animations.filter((a) => a.name === 'walk' || a.name === 'walk_formal');
    const idleClip = model.animations.find((a) => a.name === 'talk') ?? model.animations.find((a) => a.name === 'idle')!;
    for (let i = 0; i < POOL; i++) {
      const root = SkeletonUtils.clone(model.scene);
      const cloak = CLOAKS[i % CLOAKS.length];
      const tint = TINTS[i % TINTS.length];
      root.traverse((o) => {
        const m = o as THREE.SkinnedMesh;
        if (!m.isMesh) return;
        if (m.name === 'sword' || o.parent?.name === 'sword') { m.visible = false; return; }
        m.frustumCulled = false;
        m.castShadow = i % 3 === 0; // a third of them cast shadows: enough to ground the crowd
        m.material = recolor(m.material as THREE.MeshStandardMaterial, /cloak/i.test(m.name) ? cloak : '#c94b34', tint);
      });
      root.scale.setScalar(0.9 + ((i * 37) % 17) / 100);
      root.visible = false;
      const mixer = new THREE.AnimationMixer(root);
      const walk = mixer.clipAction(walkClips[i % walkClips.length]);
      const idle = mixer.clipAction(idleClip);
      walk.play();
      idle.play();
      idle.weight = 0;
      walk.time = Math.random() * 2;
      this.group.add(root);
      this.walkers.push({ root, mixer, walk, idle, line: null, s: 0, dir: 1, speed: 1.2, standT: 0, barkCd: 0, flee: 0, x: 0, z: 0, yaw: 0, lod: i });
    }
  }

  private key(x: number, z: number) {
    return `${Math.round(x / 3)},${Math.round(z / 3)}`;
  }

  private at(line: Line, s: number, out: { x: number; z: number; yaw: number }) {
    const seg = line.seg;
    let i = 1;
    while (i < seg.length - 1 && seg[i] < s) i++;
    const a = seg[i - 1], b = seg[i];
    const t = b > a ? (s - a) / (b - a) : 0;
    const x0 = line.p[(i - 1) * 2], z0 = line.p[(i - 1) * 2 + 1], x1 = line.p[i * 2], z1 = line.p[i * 2 + 1];
    out.x = x0 + (x1 - x0) * t;
    out.z = z0 + (z1 - z0) * t;
    out.yaw = Math.atan2(x1 - x0, z1 - z0);
    return out;
  }

  /** Put a walker somewhere on a street between NEAR and FAR from the focus, ideally out of view. */
  private place(w: Walker, fx: number, fz: number, cam: THREE.Camera) {
    const pos = { x: 0, z: 0, yaw: 0 };
    for (let tries = 0; tries < 14; tries++) {
      const line = this.lines[Math.floor(Math.random() * this.lines.length)];
      // cheap reject: the line's ends are both far away
      const ex = line.p[0], ez = line.p[1];
      if (Math.hypot(ex - fx, ez - fz) > FAR + line.len) continue;
      const s = Math.random() * line.len;
      this.at(line, s, pos);
      const d = Math.hypot(pos.x - fx, pos.z - fz);
      if (d < NEAR || d > FAR) continue;
      if (this.world.collision.heightAround(pos.x, pos.z, 0.4) > this.world.collision.heightAt(pos.x, pos.z) + 0.4) continue;
      // appear where the player is not looking, when we can
      if (tries < 8) {
        this.v.set(pos.x, this.world.collision.heightAt(pos.x, pos.z) + 1, pos.z).project(cam);
        if (this.v.z < 1 && Math.abs(this.v.x) < 1 && Math.abs(this.v.y) < 1 && d < 60) continue;
      }
      w.line = line;
      w.s = s;
      w.dir = Math.random() < 0.5 ? 1 : -1;
      w.speed = 0.9 + Math.random() * 0.6;
      w.standT = Math.random() < 0.25 ? 4 + Math.random() * 10 : 0;
      w.x = pos.x;
      w.z = pos.z;
      w.root.visible = true;
      return;
    }
    w.line = null;
    w.root.visible = false;
  }

  update(dt: number, fx: number, fz: number, altitude: number, cam: THREE.Camera, player: { x: number; z: number; onFoot: boolean; dragonX: number; dragonZ: number; dragonDown: boolean }) {
    const show = this.enabled && altitude < 140 && this.lines.length > 0;
    this.timer -= dt;
    this.barkGlobal -= dt;
    if (this.timer <= 0 && show) {
      this.timer = 0.25;
      for (const w of this.walkers) {
        if (!w.line || Math.hypot(w.x - fx, w.z - fz) > DROP) {
          this.place(w, fx, fz, cam);
          break; // one per tick keeps the cost flat
        }
      }
    }
    const pos = { x: 0, z: 0, yaw: 0 };
    for (const w of this.walkers) {
      w.root.visible = show && !!w.line;
      if (!w.root.visible || !w.line) continue;
      w.barkCd -= dt;
      const dPlayer = Math.hypot(player.x - w.x, player.z - w.z);
      const dDragon = Math.hypot(player.dragonX - w.x, player.dragonZ - w.z);
      // the dragon on the ground nearby: get out of its way, loudly
      if (player.dragonDown && dDragon < 16 && w.flee <= 0) {
        w.flee = 4;
        w.standT = 0;
        const away = Math.atan2(w.x - player.dragonX, w.z - player.dragonZ);
        this.at(w.line, w.s, pos);
        w.dir = Math.cos(away - pos.yaw) >= 0 ? 1 : -1;
        if (this.barkGlobal <= 0 && Math.random() < 0.5) this.say(w, FLEE[Math.floor(Math.random() * FLEE.length)]);
      }
      w.flee -= dt;
      let moving = w.standT <= 0;
      if (w.standT > 0) w.standT -= dt;
      if (moving) {
        const sp = w.speed * (w.flee > 0 ? 2.4 : 1);
        w.s += w.dir * sp * dt;
        if (w.s < 0 || w.s > w.line.len) {
          // at the end of the street: take another one from the same corner, or turn back
          const endX = w.s < 0 ? w.line.p[0] : w.line.p[w.line.p.length - 2];
          const endZ = w.s < 0 ? w.line.p[1] : w.line.p[w.line.p.length - 1];
          const next = (this.ends.get(this.key(endX, endZ)) ?? []).filter((l) => l !== w.line);
          if (next.length && Math.random() < 0.8) {
            const l = next[Math.floor(Math.random() * next.length)];
            const startHere = this.key(l.p[0], l.p[1]) === this.key(endX, endZ);
            w.line = l;
            w.s = startHere ? 0 : l.len;
            w.dir = startHere ? 1 : -1;
          } else {
            w.dir = w.dir === 1 ? -1 : 1;
            w.s = Math.max(0, Math.min(w.line.len, w.s));
            if (Math.random() < 0.3) w.standT = 2 + Math.random() * 6;
          }
        }
        this.at(w.line, w.s, pos);
        // keep to one side of the street, like people do
        const side = w.dir * 1.3;
        w.x = pos.x + Math.cos(pos.yaw) * side;
        w.z = pos.z - Math.sin(pos.yaw) * side;
        w.yaw = pos.yaw + (w.dir < 0 ? Math.PI : 0);
        // step round the player
        if (dPlayer < 1.2 && player.onFoot) {
          w.x += (w.x - player.x) / Math.max(0.2, dPlayer) * 0.6;
          w.z += (w.z - player.z) / Math.max(0.2, dPlayer) * 0.6;
        }
      } else if (dPlayer < 6 && player.onFoot) {
        // standing about: look at the stranger
        w.yaw += Math.atan2(Math.sin(Math.atan2(player.x - w.x, player.z - w.z) - w.yaw), Math.cos(Math.atan2(player.x - w.x, player.z - w.z) - w.yaw)) * Math.min(1, dt * 3);
      }
      const y = this.world.collision.heightAt(w.x, w.z);
      w.root.position.set(w.x, y, w.z);
      w.root.rotation.y += Math.atan2(Math.sin(w.yaw - w.root.rotation.y), Math.cos(w.yaw - w.root.rotation.y)) * Math.min(1, dt * 6);
      // blend walk and idle; animate far ones less often
      const target = moving ? 1 : 0;
      w.walk.weight += (target - w.walk.weight) * Math.min(1, dt * 5);
      w.idle.weight = 1 - w.walk.weight;
      w.walk.timeScale = (w.flee > 0 ? 2.2 : w.speed / 1.3);
      const d = Math.hypot(w.x - fx, w.z - fz);
      w.lod++;
      const every = d < 30 ? 1 : d < 60 ? 2 : 4;
      if (w.lod % every === 0) w.mixer.update(dt * every);
      // greetings and gossip
      if (player.onFoot && dPlayer < 3.6 && w.barkCd <= 0 && this.barkGlobal <= 0 && Math.random() < 0.6) this.say(w, this.line());
    }
  }

  private say(w: Walker, text: string) {
    w.barkCd = 25;
    this.barkGlobal = 3.5;
    this.v.set(w.x, this.world.collision.heightAt(w.x, w.z) + 2.15, w.z);
    this.bark(this.quests.fill(text), this.v.clone());
  }

  /** What people say depends on what you have done (towns that remember you). */
  private line() {
    const q = this.quests;
    const s = q.s;
    const pool: string[] = [...GREET];
    const fame = (s.renown.Diest ?? 0) + (s.renown.Begijnhof ?? 0);
    if (fame >= 15) pool.push(...FAMOUS, ...FAMOUS);
    if (q.test({ quest: 'main_bells', state: 'active' }) || q.test({ quest: 'main_bells', state: 'none' })) pool.push(...BELLS);
    if (q.test({ flag: 'seals_reported' })) pool.push('Vranckx\' weduwe is verbannen. Hard, maar de wet is de wet.', 'Ze zeggen dat gij de valse zegels gevonden hebt. Den ambacht is u dankbaar.');
    if (q.test({ flag: 'seals_begijnhof' })) pool.push('Lijsbet weeft nu bij de begijnen. Beter zo, zeg ik.');
    if (q.test({ flag: 'toll_bribe' })) pool.push('*knipoog* Lekkere brandewijn gehad, gisteren?');
    if (q.test({ quest: 'side_roelof', state: 'done' })) pool.push('Roelof de Rode is dood! Ze zeggen dat gij hem verslagen hebt!', 'De boeren van Kaggevinne slapen weer, dankzij u.');
    if (q.test({ quest: 'side_kludde', state: 'done' })) pool.push('De Kludde! Gij hebt de Kludde verjaagd! Mijn grootmoeder zal het niet geloven.');
    if (s.hero.level >= 5) pool.push('Dat is een stevig zwaard, {name}.');
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

const GREET = [
  'Goeiendag.', 'Dag, vreemdeling.', 'Allee, kijk uit waar ge loopt!', 'Schoon weer vandaag, hé.', 'God zij met u.',
  'Hebt ge al gegeten? De wafels aan de Lakenhalle zijn goed.', 'De tol is weer omhoog. Altijd omhoog.', 'Mijn koe is ziek. Weet gij iets van koeien?',
  'Ze zeggen dat de Fransen in Henegouwen zitten.', 'Amai, wat een mantel.', 'Pas op voor de zakkenrollers aan de markt.',
  'De Demer staat hoog dit jaar.', 'Gij zijt niet van hier, hé?', 'Het bier van Diest is beter dan dat van Leuven. Zeg het voort.',
];
const BELLS = [
  'De klokken zwijgen al dagen. Ik weet niet meer hoe laat het is.', 'Zonder klokken gaan de poorten dicht wanneer de wachter er zin in heeft.',
  'Ze zeggen dat het de Kludde is die de klepels gestolen heeft.', 'Pieter de koster loopt rond als een kip zonder kop.',
];
const FAMOUS = [
  'Daar is {name}! Die van de draak!', 'Goeiendag, {name}! Hoe gaat het met {dragon}?', '{name}! Mijn zoon wil later ook een draak.',
  'Iedereen spreekt over u, {name}.', 'Kijk, daar gaat {name}. Ze zeggen dat die de Kludde niet vreest.',
];
const FLEE = ['Een draak! Een DRAAK!', 'Jezus Maria!', 'Weg! Weg!', 'Mijn kippen!', 'Niet opeten, niet opeten!'];

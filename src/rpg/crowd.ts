// Townsfolk. A pool of people walks the real streets around the player and is
// recycled as you move (the Assassin's Creed Unity trick: full people near
// you, nobody far away). They greet you, gossip about what is going on, know
// your name once you are famous, and scatter when the dragon lands.

import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { rng } from '../core/math';
import { recolor } from '../render/recolor';
import { dress, pickRole, type Role } from './folk';
import type { TownsfolkKit } from './townsfolk';
import type { World } from '../world/world';
import type { QuestEngine } from './quests';

const POOL = 36;
const NEAR = 9, FAR = 70, DROP = 95;

interface Line { p: number[]; len: number; seg: number[] }
interface Walker {
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  walk: THREE.AnimationAction;
  idle: THREE.AnimationAction;
  /** kit people: chatting and running clips (stopgap people have neither) */
  talk: THREE.AnimationAction | null;
  run: THREE.AnimationAction | null;
  /** metres per loop of the walk clip on this body (0: estimate from height) */
  stride: number;
  /** seconds left in a conversation (talk clip) */
  talkT: number;
  /** standing post, for soldiers at the gates */
  post: { x: number; z: number; yaw: number; gate: string } | null;
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
  role: Role;
  /** base walking pace for this person (m/s) */
  pace: number;
  /** body height scale (children walk with shorter strides) */
  height: number;
  pose: () => void;
  lines: string[];
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

  /** true when the crowd is built from the character kit */
  kitted = false;
  private gates: { name: string; x: number; z: number }[] = [];

  constructor(model: GLTF, private world: World, private quests: QuestEngine, private bark: (text: string, at: THREE.Vector3) => void, kit?: TownsfolkKit | null) {
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
    const formal = walkClips.find((c) => c.name === 'walk_formal');
    const plain = walkClips.find((c) => c.name === 'walk') ?? walkClips[0];
    const gates = world.data.walls?.gates ?? {};
    this.gates = Object.entries(gates).map(([name, [x, z]]) => ({ name, x, z }));
    for (let i = 0; i < POOL; i++) {
      const r = rng(1009 + i * 7919);
      const shadow = i % 3 === 0; // a third of them cast shadows: enough to ground the crowd
      // the character kit when it is there: real bodies, fitted clothes, dyes
      const folk = kit?.build(r);
      if (folk) {
        const root = folk.root;
        root.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          m.castShadow = shadow;
          m.receiveShadow = true;
          m.frustumCulled = false;
        });
        root.visible = false;
        const mixer = new THREE.AnimationMixer(root);
        const walk = mixer.clipAction(folk.clips.walk);
        const idle = mixer.clipAction(folk.clips.idle);
        const talk = folk.clips.talk ? mixer.clipAction(folk.clips.talk) : null;
        const run = folk.clips.run ? mixer.clipAction(folk.clips.run) : null;
        for (const a of [walk, idle, talk, run]) if (a) { a.play(); a.weight = 0; a.time = Math.random() * a.getClip().duration; }
        walk.weight = 1;
        this.group.add(root);
        this.walkers.push({
          root, mixer, walk, idle, talk, run, stride: folk.stride, talkT: 0, post: null,
          line: null, s: 0, dir: 1, speed: folk.speed, standT: 0, barkCd: 0, flee: 0, x: 0, z: 0, yaw: 0, lod: i,
          role: folk.role, pace: folk.speed, height: folk.height, pose: () => {}, lines: folk.lines,
        });
        continue;
      }
      // stopgap: the hero's body in role costumes (folk.ts)
      const root = SkeletonUtils.clone(model.scene);
      const role = pickRole(r);
      const look = dress(root, role, r);
      const garments: THREE.Mesh[] = [];
      root.traverse((o) => {
        const m = o as THREE.SkinnedMesh;
        if (!m.isMesh) return;
        if (m.name === 'sword' || o.parent?.name === 'sword') { m.visible = false; return; }
        if (!m.isSkinnedMesh) { garments.push(m); return; }
        m.frustumCulled = false;
        m.castShadow = shadow;
        if (/cloak/i.test(m.name)) {
          if (!look.cloak) m.visible = false;
          else m.material = recolor(m.material as THREE.MeshStandardMaterial, look.cloak, look.tint);
        } else m.material = recolor(m.material as THREE.MeshStandardMaterial, '#c94b34', look.tint);
      });
      for (const g of garments) g.castShadow = shadow;
      root.scale.copy(look.scale);
      root.visible = false;
      const mixer = new THREE.AnimationMixer(root);
      const stately = role === 'burgher' || role === 'huik' || role === 'beguine' || role === 'friar';
      const walk = mixer.clipAction((stately && formal) || plain);
      const idle = mixer.clipAction(idleClip);
      walk.play();
      idle.play();
      idle.weight = 0;
      walk.time = Math.random() * 2;
      this.group.add(root);
      this.walkers.push({
        root, mixer, walk, idle, talk: null, run: null, stride: 0, talkT: 0, post: null,
        line: null, s: 0, dir: 1, speed: look.speed, standT: 0, barkCd: 0, flee: 0, x: 0, z: 0, yaw: 0, lod: i,
        role, pace: look.speed, height: look.scale.y, pose: look.pose, lines: look.lines,
      });
    }
    this.kitted = !!kit?.ok;
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

  /** Streets within an anchor's radius (cached): where beguines, pilgrims and friars spend their day. */
  private anchorLines = new Map<Anchor, Line[]>();
  private linesNear(a: Anchor) {
    let l = this.anchorLines.get(a);
    if (!l) {
      l = this.lines.filter((line) => {
        for (let i = 0; i < line.p.length; i += 2) if (Math.hypot(line.p[i] - a.x, line.p[i + 1] - a.z) < a.r) return true;
        return false;
      });
      this.anchorLines.set(a, l);
    }
    return l;
  }

  /** A soldier takes a post at a gate near the focus (two to a gate), if one is free. */
  private postAt(w: Walker, fx: number, fz: number) {
    if (!this.gates.length) return false;
    const cx = this.gates.reduce((s, g) => s + g.x, 0) / this.gates.length;
    const cz = this.gates.reduce((s, g) => s + g.z, 0) / this.gates.length;
    for (const g of this.gates) {
      const d = Math.hypot(g.x - fx, g.z - fz);
      if (d < NEAR || d > FAR) continue;
      const taken = this.walkers.filter((o) => o !== w && o.post?.gate === g.name).length;
      if (taken >= 2) continue;
      // just inside the gate, one either side of the road, facing out of town
      const out = Math.atan2(g.x - cx, g.z - cz);
      const side = taken === 0 ? 1 : -1;
      const x = g.x - Math.sin(out) * 6 + Math.cos(out) * side * 2.8;
      const z = g.z - Math.cos(out) * 6 - Math.sin(out) * side * 2.8;
      w.post = { x, z, yaw: out, gate: g.name };
      w.line = null;
      w.x = x;
      w.z = z;
      w.yaw = out;
      w.root.rotation.y = out;
      w.root.visible = true;
      return true;
    }
    return false;
  }

  /** Put a walker somewhere on a street between NEAR and FAR from the focus, ideally out of view. */
  private place(w: Walker, fx: number, fz: number, cam: THREE.Camera) {
    w.post = null;
    if (w.role === 'soldier' && Math.random() < 0.6 && this.postAt(w, fx, fz)) return;
    // people have somewhere to be: beguines stay near the Begijnhof, pilgrims near the basilica...
    let anchor: Anchor | null = null;
    for (const a of ANCHORS[w.role] ?? []) if (Math.hypot(a.x - fx, a.z - fz) < FAR + a.r && Math.random() < a.p) { anchor = a; break; }
    const pool = anchor ? this.linesNear(anchor) : this.lines;
    if (!pool.length) anchor = null;
    const from = anchor ? pool : this.lines;
    const pos = { x: 0, z: 0, yaw: 0 };
    for (let tries = 0; tries < (anchor ? 24 : 14); tries++) {
      const line = from[Math.floor(Math.random() * from.length)];
      // cheap reject: the line's ends are both far away
      const ex = line.p[0], ez = line.p[1];
      if (Math.hypot(ex - fx, ez - fz) > FAR + line.len) continue;
      const s = Math.random() * line.len;
      this.at(line, s, pos);
      const d = Math.hypot(pos.x - fx, pos.z - fz);
      if (d < NEAR || d > FAR) continue;
      if (anchor && Math.hypot(pos.x - anchor.x, pos.z - anchor.z) > anchor.r) continue;
      if (this.world.collision.heightAround(pos.x, pos.z, 0.4) > this.world.collision.heightAt(pos.x, pos.z) + 0.4) continue;
      // appear where the player is not looking, when we can
      if (tries < 8) {
        this.v.set(pos.x, this.world.collision.heightAt(pos.x, pos.z) + 1, pos.z).project(cam);
        if (this.v.z < 1 && Math.abs(this.v.x) < 1 && Math.abs(this.v.y) < 1 && d < 60) continue;
      }
      w.line = line;
      w.s = s;
      w.dir = Math.random() < 0.5 ? 1 : -1;
      w.speed = w.pace * (0.9 + Math.random() * 0.2);
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
        if ((!w.line && !w.post) || Math.hypot(w.x - fx, w.z - fz) > DROP) {
          this.place(w, fx, fz, cam);
          break; // one per tick keeps the cost flat
        }
      }
    }
    const pos = { x: 0, z: 0, yaw: 0 };
    for (const w of this.walkers) {
      w.root.visible = show && (!!w.line || !!w.post);
      if (!w.root.visible) continue;
      w.barkCd -= dt;
      w.talkT -= dt;
      const dPlayer = Math.hypot(player.x - w.x, player.z - w.z);
      const dDragon = Math.hypot(player.dragonX - w.x, player.dragonZ - w.z);
      let moving = false;
      if (w.post) {
        // on guard: face the road, eye the stranger, and do not run from any dragon
        let yaw = w.post.yaw;
        if (player.dragonDown && dDragon < 30) yaw = Math.atan2(player.dragonX - w.x, player.dragonZ - w.z);
        else if (player.onFoot && dPlayer < 7) yaw = Math.atan2(player.x - w.x, player.z - w.z);
        w.yaw = yaw;
      } else if (w.line) {
        // the dragon on the ground nearby: get out of its way, loudly
        if (player.dragonDown && dDragon < 16 && w.flee <= 0) {
          w.flee = 4;
          w.standT = 0;
          w.talkT = 0;
          const away = Math.atan2(w.x - player.dragonX, w.z - player.dragonZ);
          this.at(w.line, w.s, pos);
          w.dir = Math.cos(away - pos.yaw) >= 0 ? 1 : -1;
          if (this.barkGlobal <= 0 && Math.random() < 0.5) this.say(w, FLEE[Math.floor(Math.random() * FLEE.length)]);
        }
        w.flee -= dt;
        moving = w.standT <= 0 && w.talkT <= 0;
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
          const to = Math.atan2(player.x - w.x, player.z - w.z);
          w.yaw += Math.atan2(Math.sin(to - w.yaw), Math.cos(to - w.yaw)) * Math.min(1, dt * 3);
        }
      }
      const y = this.world.collision.heightAt(w.x, w.z);
      w.root.position.set(w.x, y, w.z);
      w.root.rotation.y += Math.atan2(Math.sin(w.yaw - w.root.rotation.y), Math.cos(w.yaw - w.root.rotation.y)) * Math.min(1, dt * 6);
      // blend walk / run / talk / idle; animate far ones less often
      const fleeing = moving && w.flee > 0;
      const k = Math.min(1, dt * 5);
      const tRun = fleeing && w.run ? 1 : 0;
      const tWalk = moving && !tRun ? 1 : 0;
      const tTalk = !moving && w.talkT > 0 && w.talk ? 1 : 0;
      w.walk.weight += (tWalk - w.walk.weight) * k;
      if (w.run) w.run.weight += (tRun - w.run.weight) * k;
      if (w.talk) w.talk.weight += (tTalk - w.talk.weight) * k;
      w.idle.weight = Math.max(0, 1 - w.walk.weight - (w.run?.weight ?? 0) - (w.talk?.weight ?? 0));
      // feet must not slide: the clip plays at the rate the person actually covers ground
      if (fleeing && !w.run) w.walk.timeScale = 2.2;
      else if (w.stride > 0) w.walk.timeScale = (w.speed * w.walk.getClip().duration) / w.stride;
      else w.walk.timeScale = w.speed / (1.3 * w.height);
      if (w.run) w.run.timeScale = Math.min(1.4, 1 / Math.max(0.6, w.height));
      const d = Math.hypot(w.x - fx, w.z - fz);
      w.lod++;
      const every = d < 30 ? 1 : d < 60 ? 2 : 4;
      if (w.lod % every === 0) {
        w.mixer.update(dt * every);
        w.pose();
      }
      // greetings and gossip: stop, turn, and say it
      if (player.onFoot && dPlayer < 3.6 && w.barkCd <= 0 && this.barkGlobal <= 0 && Math.random() < 0.6) {
        this.say(w, Math.random() < 0.45 ? w.lines[Math.floor(Math.random() * w.lines.length)] : this.line());
        if (w.talk && w.flee <= 0) w.talkT = 2.6;
      }
    }
  }

  private say(w: Walker, text: string) {
    w.barkCd = 25;
    this.barkGlobal = 3.5;
    this.v.set(w.x, this.world.collision.heightAt(w.x, w.z) + 2.15 * Math.min(1, w.height + 0.1), w.z);
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
    if (q.test({ quest: 'main_kludde', state: 'done' })) pool.push('De Kludde! Gij hebt de Kludde verjaagd! Mijn grootmoeder zal het niet geloven.');
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
interface Anchor { x: number; z: number; r: number; p: number }
/** Where each kind of person tends to be (p: how often they stick to it). */
const ANCHORS: Partial<Record<Role, Anchor[]>> = {
  beguine: [{ x: 690, z: -320, r: 120, p: 0.8 }], // the Begijnhof
  pilgrim: [{ x: -5062, z: 518, r: 320, p: 0.85 }], // the basilica of Scherpenheuvel
  friar: [{ x: 4, z: 20, r: 170, p: 0.5 }], // Sint-Sulpitius and the old town
  peasantWoman: [{ x: 0, z: 0, r: 90, p: 0.35 }], // market day on the Grote Markt
  burgher: [{ x: 40, z: 10, r: 150, p: 0.4 }], // the Grote Markt and the Lakenhalle
};

const FLEE = ['Een draak! Een DRAAK!', 'Jezus Maria!', 'Weg! Weg!', 'Mijn kippen!', 'Niet opeten, niet opeten!'];

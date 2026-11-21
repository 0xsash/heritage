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
import { OV_BARKS } from '../content/oudevolk';

const POOL = 36;
const NEAR = 9, FAR = 70, DROP = 95;

export interface Line { p: number[]; len: number; seg: number[]; /** how far off the middle people may walk, per point */ side: number[] }
export interface Walker {
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
  /** a woman or a girl (for names and forms of address in src/life) */
  female: boolean;
  /** seconds left talking with the player: stands still and faces them */
  chat: number;
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
    // Streets come from the modern map, houses from 1650: where a street runs
    // into a house, the street stops. Sample every metre, keep the open runs,
    // and remember how far from the middle people can keep to the side there.
    const clear = (x: number, z: number) => world.collision.heightAround(x, z, 0.45) < 0.05;
    for (const r of world.data.roads) {
      if (!keep.has(r.k)) continue;
      const mid = r.p.length >> 1 & ~1;
      if (!near(r.p[mid], r.p[mid + 1]) && !near(r.p[0], r.p[1])) continue;
      let run: number[] = [];
      let sides: number[] = [];
      const flush = () => {
        if (run.length >= 8) this.addLine(run, sides);
        run = [];
        sides = [];
      };
      for (let i = 2; i < r.p.length; i += 2) {
        const x0 = r.p[i - 2], z0 = r.p[i - 1], x1 = r.p[i], z1 = r.p[i + 1];
        const len = Math.hypot(x1 - x0, z1 - z0);
        const n = Math.max(1, Math.ceil(len));
        const nx = (z1 - z0) / (len || 1), nz = -(x1 - x0) / (len || 1);
        for (let k = i === 2 ? 0 : 1; k <= n; k++) {
          const x = x0 + ((x1 - x0) * k) / n, z = z0 + ((z1 - z0) * k) / n;
          if (!clear(x, z)) { flush(); continue; }
          let side = 0;
          for (const o of [1.3, 0.9, 0.5]) if (clear(x + nx * o, z + nz * o) && clear(x - nx * o, z - nz * o)) { side = o; break; }
          run.push(x, z);
          sides.push(side);
        }
      }
      flush();
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
          female: kit?.m.bodies[folk.body]?.sex === 'f', chat: 0,
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
        female: role === 'peasantWoman' || role === 'huik' || role === 'beguine' || role === 'oldWoman', chat: 0,
      });
    }
    this.kitted = !!kit?.ok;
  }

  private addLine(p: number[], side: number[]) {
    const seg: number[] = [0];
    let len = 0;
    for (let i = 2; i < p.length; i += 2) {
      len += Math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]);
      seg.push(len);
    }
    if (len < 6) return;
    const line = { p, len, seg, side };
    this.lines.push(line);
    for (const k of [this.key(p[0], p[1]), this.key(p[p.length - 2], p[p.length - 1])]) {
      if (!this.ends.has(k)) this.ends.set(k, []);
      this.ends.get(k)!.push(line);
    }
  }

  private key(x: number, z: number) {
    return `${Math.round(x / 3)},${Math.round(z / 3)}`;
  }

  private at(line: Line, s: number, out: { x: number; z: number; yaw: number; side?: number }) {
    const seg = line.seg;
    // binary search: lines are sampled every metre
    let lo = 1, hi = seg.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (seg[m] < s) lo = m + 1;
      else hi = m;
    }
    const i = lo;
    const a = seg[i - 1], b = seg[i];
    const t = b > a ? (s - a) / (b - a) : 0;
    const x0 = line.p[(i - 1) * 2], z0 = line.p[(i - 1) * 2 + 1], x1 = line.p[i * 2], z1 = line.p[i * 2 + 1];
    out.x = x0 + (x1 - x0) * t;
    out.z = z0 + (z1 - z0) * t;
    out.yaw = Math.atan2(x1 - x0, z1 - z0);
    out.side = Math.min(line.side[i - 1], line.side[i]);
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
      // inside the passage, against its side, on open ground (never in a gate tower)
      let x = 0, z = 0, ok = false;
      for (const [back, off] of [[6, 2.8], [8, 2.2], [10, 1.6], [7, 1.0]]) {
        x = g.x - Math.sin(out) * back + Math.cos(out) * side * off;
        z = g.z - Math.cos(out) * back - Math.sin(out) * side * off;
        if (this.world.collision.heightAround(x, z, 0.5) < 0.05) { ok = true; break; }
      }
      if (!ok) continue;
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
    const pos = { x: 0, z: 0, yaw: 0, side: 0 };
    for (const w of this.walkers) {
      w.root.visible = show && (!!w.line || !!w.post);
      if (!w.root.visible) continue;
      w.barkCd -= dt;
      w.talkT -= dt;
      w.chat -= dt;
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
        moving = w.standT <= 0 && w.talkT <= 0 && w.chat <= 0;
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
          const side = w.dir * pos.side;
          w.x = pos.x + Math.cos(pos.yaw) * side;
          w.z = pos.z - Math.sin(pos.yaw) * side;
          w.yaw = pos.yaw + (w.dir < 0 ? Math.PI : 0);
          // step round the player
          if (dPlayer < 1.2 && player.onFoot) {
            const sx = w.x + (w.x - player.x) / Math.max(0.2, dPlayer) * 0.6;
            const sz = w.z + (w.z - player.z) / Math.max(0.2, dPlayer) * 0.6;
            if (this.world.collision.heightAt(sx, sz) < 0.05) { w.x = sx; w.z = sz; } // never into a wall
          }
        } else if (dPlayer < 6 && player.onFoot) {
          // standing about: look at the stranger
          const to = Math.atan2(player.x - w.x, player.z - w.z);
          w.yaw += Math.atan2(Math.sin(to - w.yaw), Math.cos(to - w.yaw)) * Math.min(1, dt * 3);
        }
      }
      w.root.position.set(w.x, 0, w.z); // the streets are at ground level
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
      if (player.onFoot && dPlayer < 3.6 && w.chat <= 0 && w.barkCd <= 0 && this.barkGlobal <= 0 && Math.random() < 0.6) {
        this.say(w, Math.random() < 0.45 ? w.lines[Math.floor(Math.random() * w.lines.length)] : this.line());
        if (w.talk && w.flee <= 0) w.talkT = 2.6;
      }
    }
  }

  /** The streets people walk (for src/life: where to put things, and the density measure). */
  streets(): readonly Line[] {
    return this.lines;
  }

  /** The walker within reach of (x, z), if any: anyone in the street can be spoken to. */
  nearestWalker(x: number, z: number, reach = 2.6): Walker | null {
    let best: Walker | null = null, bd = reach * reach;
    for (const w of this.walkers) {
      if (!w.root.visible || w.flee > 0) continue;
      const d = (w.x - x) ** 2 + (w.z - z) ** 2;
      if (d < bd) { bd = d; best = w; }
    }
    return best;
  }

  /** Which of the pool this is (stable for the session: the same body and clothes). */
  indexOf(w: Walker) {
    return this.walkers.indexOf(w);
  }

  /** Stop, turn to the player and talk for a while. */
  engage(w: Walker, seconds: number, px: number, pz: number) {
    w.chat = seconds;
    w.talkT = Math.min(seconds, 3);
    w.flee = 0;
    w.barkCd = Math.max(w.barkCd, 20);
    // the world stops while the conversation is open: stand and face the player now
    w.yaw = Math.atan2(px - w.x, pz - w.z);
    w.root.rotation.y = w.yaw;
    w.walk.weight = 0;
    if (w.run) w.run.weight = 0;
    if (w.talk) w.talk.weight = 1;
    w.idle.weight = w.talk ? 0 : 1;
    w.mixer.update(0);
  }

  /** Keep a talking walker gesturing while the rest of the world waits. */
  tickChat(dt: number) {
    for (const w of this.walkers) if (w.chat > 0 && w.root.visible) w.mixer.update(dt);
  }

  private say(w: Walker, text: string) {
    w.barkCd = 25;
    this.barkGlobal = 3.5;
    this.v.set(w.x, 2.15 * Math.min(1, w.height + 0.1), w.z);
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
    if (q.test({ flag: 'seals_reported' })) pool.push('Lijsbet Vranckx is weg. Haar getouw staat nu bij de buren.', 'De wevers drinken op jou. De weduwe drinkt niet mee.');
    if (q.test({ flag: 'seals_begijnhof' })) pool.push('Lijsbet weeft nu bij de begijnen. Meester Joos is er ziek van.');
    if (q.test({ flag: 'toll_bribe' })) pool.push('Was hij lekker, die azijn van Gielis? Zeg maar niets.');
    if (q.test({ quest: 'side_roelof', state: 'done' })) pool.push('Lambrecht dood? Dat geloof ik pas als ik zijn laarzen zie.', 'In Kaggevinne gaan de deuren weer dicht, maar niet meer op slot.');
    if (q.test({ quest: 'main_kludde', state: 'done' })) pool.push('Jij hebt de Kludde verjaagd. Grootmoeder zegt: verjaagd is niet dood.', 'Hoor je de klokken? Mijn man weende bij de eerste slag.', 'Ze luiden weer. Je draak slaapt er staand bij, zie ik.');
    if (s.hero.level >= 5) pool.push('Dat is een stevig zwaard, {name}. Hou het in de schede.');
    // Het Oude Volk (src/content/oudevolk.ts): a rumour now and then before you find them, talk after
    const f = s.flags;
    const ov: Record<string, boolean> = { ov_rumour: !f.ov_found && Math.random() < 0.3, ov_found: !!f.ov_found, ov_choice_volk: f.ov_choice === 'volk', ov_named: !!f.ov_named };
    for (const b of OV_BARKS) if (ov[b.if]) pool.push(b.t);
    return pool[Math.floor(Math.random() * pool.length)];
  }
}

const GREET = [
  'Goeiendag.', 'Dag, vreemdeling. Hou je beest uit mijn moestuin.', 'Allee, kijk uit waar je loopt.', 'Droog weer, hé. Dat blijft niet duren.', 'Goeiemorgen. Heb jij een geit gezien?',
  'Heb je al gegeten? De wafels aan de Lakenhalle zijn goed.', 'De tol is alweer verhoogd. Zakken doet hij nooit.', 'Mijn koe is ziek. Ken jij iets van koeien?',
  'Ze zeggen dat de Fransen in Henegouwen zitten.', 'Amai, wat een mantel. Wie heeft die betaald?', 'Pas op voor de zakkenrollers op de markt.',
  'De Demer staat hoog dit jaar. Ze wil iets.', 'Jij komt niet veel in de stad, hé?', 'Diests bier is beter dan dat van Leuven. Zeg het voort.',
];
const BELLS = [
  'Ik hoorde zeven slagen en daarna niets meer. Ik lag nog wakker.', 'Zonder klokken sluit de wachter de poort wanneer hij goesting heeft.',
  'Hij was een hond zo groot als een kalf, zegt de veerman.', 'Pieter de koster loopt rond als een kip zonder kop.',
  'Mijn man ging die nacht vissen. Zijn netten zijn teruggekomen.', 'Niemand weet nog hoe laat het is, mijn deeg ook niet.',
];
const FAMOUS = [
  'Daar is {name}, die van de draak.', 'Goeiendag, {name}. Eet {dragon} ook vis?', '{name}! Mijn zoon wil later ook een draak.',
  'Iedereen praat over jou, {name}, maar niet altijd goed.', 'Daar gaat {name}. Die is niet bang van de Kludde, zeggen ze.',
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

const FLEE = ['Een draak! Een DRAAK!', 'Jezus Maria!', 'Weg hier! Weg!', 'Mijn kippen!', 'Eet me niet op!'];

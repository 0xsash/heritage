// Who you fight, and what they look like. Every archetype has one job (the
// DOOM "chess piece" rule): deserters press in, musketeers punish standing
// still, the Kludde's hounds flank fast, will-o'-the-wisps harass from the air.

import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { makeSword, recolor } from '../render/recolor';

export type BodyKind = 'human' | 'hound' | 'wisp';

export interface EnemyType {
  id: string;
  name: string;
  body: BodyKind;
  hp: (lvl: number) => number;
  dmg: (lvl: number) => number;
  speed: number;
  reach: number;
  /** telegraph time before the blow lands */
  windup: number;
  recover: number;
  cooldown: number;
  xp: (lvl: number) => number;
  scale: number;
  /** hits it can take before it staggers (elites ignore light hits) */
  poise: number;
  aggro: number;
  ranged?: { range: number; keep: number; projectile: 'shot' | 'orb' };
  cloak?: string[];
  weapon?: 'sword' | 'musket';
  /** lunges forward this far when it strikes */
  lunge?: number;
}

export const TYPES: Record<string, EnemyType> = {
  deserteur: {
    id: 'deserteur', name: 'Deserteur', body: 'human', hp: (l) => 34 + l * 16, dmg: (l) => 5 + l * 2.6, speed: 4.2, reach: 2.0,
    windup: 0.55, recover: 0.7, cooldown: 1.4, xp: (l) => 14 + l * 7, scale: 1, poise: 2, aggro: 17, weapon: 'sword', lunge: 0.8,
    cloak: ['#4a4f3a', '#5a4a38', '#3d4248', '#6a3a2a', '#53513f'],
  },
  musketier: {
    id: 'musketier', name: 'Musketier', body: 'human', hp: (l) => 26 + l * 12, dmg: (l) => 9 + l * 3.6, speed: 3.6, reach: 1.6,
    windup: 1.1, recover: 0.9, cooldown: 3.2, xp: (l) => 16 + l * 8, scale: 1, poise: 1, aggro: 26, weapon: 'musket',
    ranged: { range: 30, keep: 13, projectile: 'shot' }, cloak: ['#3a3f4f', '#4a3a4a', '#2f3a33'],
  },
  broekhond: {
    id: 'broekhond', name: 'Broekhond', body: 'hound', hp: (l) => 22 + l * 11, dmg: (l) => 4 + l * 2.1, speed: 7.5, reach: 1.7,
    windup: 0.38, recover: 0.6, cooldown: 1.1, xp: (l) => 12 + l * 6, scale: 0.85, poise: 1, aggro: 22, lunge: 2.2,
  },
  dwaallicht: {
    id: 'dwaallicht', name: 'Dwaallicht', body: 'wisp', hp: (l) => 18 + l * 9, dmg: (l) => 6 + l * 2.6, speed: 3.2, reach: 1.5,
    windup: 0.8, recover: 0.6, cooldown: 2.4, xp: (l) => 14 + l * 7, scale: 1, poise: 1, aggro: 24,
    ranged: { range: 22, keep: 9, projectile: 'orb' },
  },
  kludde: {
    id: 'kludde', name: 'De Kludde', body: 'hound', hp: (l) => 130 + l * 40, dmg: (l) => 11 + l * 4, speed: 8.5, reach: 3.2,
    windup: 0.7, recover: 1.0, cooldown: 1.4, xp: (l) => 160 + l * 40, scale: 2.1, poise: 6, aggro: 30, lunge: 4,
  },
};

// ------------------------------------------------------------------ bodies
export interface Body {
  root: THREE.Group;
  /** height of the head, for health bars */
  top: number;
  /** locomotion: ground speed in m/s */
  move(speed: number): void;
  /** windup (telegraph), strike, hit, death */
  act(what: 'windup' | 'strike' | 'hit' | 'death' | 'idle', dur?: number): void;
  update(dt: number): void;
  /** 0..1 white flash (hit) or red glow (telegraph) */
  glow(white: number, red: number): void;
  dispose(): void;
}

class HumanBody implements Body {
  root = new THREE.Group();
  top = 2.05;
  private mixer: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current = '';
  private mats: THREE.MeshStandardMaterial[] = [];
  private lock = 0;
  private lean = 0;
  private leanTarget = 0;
  private model: THREE.Object3D;
  private dead = false;

  constructor(gltf: GLTF, cloak: string, weapon: 'sword' | 'musket' | undefined, scale: number) {
    this.model = SkeletonUtils.clone(gltf.scene);
    this.model.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.frustumCulled = false;
      if (m.name === 'sword' || o.parent?.name === 'sword') return;
      const mat = recolor(m.material as THREE.MeshStandardMaterial, /cloak/i.test(m.name) ? cloak : '#c94b34', '#d8d2c8', true);
      mat.emissive = new THREE.Color(0, 0, 0);
      m.material = mat;
      this.mats.push(mat);
    });
    const own = this.model.getObjectByName('sword');
    if (own) own.visible = weapon === 'sword';
    const hand = this.model.getObjectByName('hand_r');
    if (hand && weapon === 'sword' && !own) hand.add(makeSword());
    if (hand && weapon === 'musket') hand.add(makeMusket());
    this.model.scale.setScalar(scale);
    this.top *= scale;
    this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    for (const c of gltf.animations) {
      const a = this.mixer.clipAction(c);
      if (['attack1', 'attack2', 'attack3', 'hit', 'death', 'cast'].includes(c.name)) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      this.actions.set(c.name, a);
    }
    this.play(this.actions.has('sword_idle') ? 'sword_idle' : 'idle', 0);
    this.actions.get(this.current)!.time = Math.random() * 2;
  }

  private play(name: string, fade = 0.2, speed = 1) {
    const next = this.actions.get(name);
    if (!next) return false;
    if (this.current === name) {
      next.timeScale = speed;
      return true;
    }
    const prev = this.actions.get(this.current);
    next.reset().setEffectiveWeight(1).play();
    next.timeScale = speed;
    if (prev && fade > 0) prev.crossFadeTo(next, fade, false);
    else prev?.stop();
    this.current = name;
    return true;
  }

  move(speed: number) {
    if (this.lock > 0 || this.dead) return;
    if (speed > 4) this.play('run', 0.2, speed / 5);
    else if (speed > 0.3) this.play('walk', 0.2, speed / 1.5);
    else this.play(this.actions.has('sword_idle') ? 'sword_idle' : 'idle');
  }

  act(what: 'windup' | 'strike' | 'hit' | 'death' | 'idle', dur = 0.5) {
    if (this.dead) return;
    if (what === 'death') {
      this.dead = true;
      if (!this.play('death', 0.1)) this.leanTarget = -1.5;
      return;
    }
    if (what === 'windup') {
      // hold the start of the swing: the pause before the blow is the tell
      if (this.play('attack1', 0.1, 0.25)) this.lock = dur;
      else this.leanTarget = -0.25;
    } else if (what === 'strike') {
      if (this.current === 'attack1') this.actions.get('attack1')!.timeScale = 1.4;
      else if (this.play('attack1', 0.05, 1.4)) { /* started */ } else this.leanTarget = 0.45;
      this.lock = dur;
    } else if (what === 'hit') {
      if (this.play('hit', 0.05)) this.lock = 0.35;
      else this.lean = -0.3;
    }
  }

  update(dt: number) {
    this.lock -= dt;
    this.mixer.update(dt);
    this.lean += (this.leanTarget - this.lean) * Math.min(1, dt * 8);
    if (!this.dead) this.leanTarget *= Math.exp(-dt * 6);
    this.model.rotation.x = this.lean;
  }

  glow(white: number, red: number) {
    for (const m of this.mats) {
      m.emissive.setRGB(white * 0.9 + red * 0.9, white * 0.85 + red * 0.08, white * 0.75 + red * 0.02);
    }
  }

  dispose() {
    for (const m of this.mats) m.dispose();
  }
}

function makeMusket() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#4a2e1a', roughness: 0.7 });
  const iron = new THREE.MeshStandardMaterial({ color: '#3a3a3e', metalness: 0.8, roughness: 0.4 });
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.09), wood);
  stock.position.y = -0.05;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 1.1, 8), iron);
  barrel.position.y = 0.65;
  g.add(stock, barrel);
  g.rotation.set(Math.PI / 2, 0, 0);
  g.position.set(0, 0.05, -0.05);
  return g;
}

/** The Kludde's hounds: built from shapes, shaggy and black, with a chain and blue eyes. */
class HoundBody implements Body {
  root = new THREE.Group();
  top: number;
  private body = new THREE.Group();
  private legs: THREE.Group[] = [];
  private head = new THREE.Group();
  private tail = new THREE.Group();
  private mats: THREE.MeshStandardMaterial[] = [];
  private phase = Math.random() * 6;
  private speed = 0;
  private pose = 0; // 0 stand, 1 crouch (windup), -1 lunge
  private poseT = 0;
  private dead = false;
  private deadT = 0;
  private time = 0;

  constructor(scale: number, eye = '#7cc4ff') {
    const fur = new THREE.MeshStandardMaterial({ color: '#17140f', roughness: 0.95, flatShading: true });
    const furDark = new THREE.MeshStandardMaterial({ color: '#0d0b09', roughness: 1, flatShading: true });
    this.mats.push(fur, furDark);
    const eyeM = new THREE.MeshBasicMaterial({ color: eye });
    const chainM = new THREE.MeshStandardMaterial({ color: '#5a5650', metalness: 0.9, roughness: 0.4 });
    this.root.add(this.body);
    this.body.position.y = 0.72;
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.75, 4, 8).rotateX(Math.PI / 2), fur);
    torso.scale.set(1, 0.95, 1);
    const chest = new THREE.Mesh(new THREE.IcosahedronGeometry(0.36, 1), fur);
    chest.position.set(0, 0.04, 0.38);
    chest.scale.set(1, 1.05, 0.95);
    this.body.add(torso, chest);
    // shaggy tufts along the back
    for (let i = 0; i < 9; i++) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 4), furDark);
      t.position.set((Math.random() - 0.5) * 0.18, 0.27 + Math.random() * 0.05, -0.45 + i * 0.12);
      t.rotation.set(-0.9 + Math.random() * 0.3, 0, (Math.random() - 0.5) * 0.6);
      this.body.add(t);
    }
    // head
    this.head.position.set(0, 0.24, 0.66);
    this.body.add(this.head);
    const skull = new THREE.Mesh(new THREE.IcosahedronGeometry(0.21, 1), fur);
    skull.scale.set(0.95, 0.9, 1.05);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 6).rotateX(Math.PI / 2), fur);
    snout.position.set(0, -0.05, 0.25);
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.24), furDark);
    jaw.position.set(0, -0.13, 0.17);
    this.head.add(skull, snout, jaw);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 4), furDark);
      ear.position.set(0.11 * s, 0.19, -0.04);
      ear.rotation.set(-0.3, 0, -0.35 * s);
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), eyeM);
      e.position.set(0.09 * s, 0.04, 0.16);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ color: eye, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.setScalar(0.18);
      glow.position.copy(e.position);
      this.head.add(ear, e, glow);
    }
    // the chain round its neck (the Kludde drags a chain; you hear it before you see it)
    for (let i = 0; i < 10; i++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 4, 8), chainM);
      const a = (i / 10) * Math.PI * 2;
      link.position.set(Math.cos(a) * 0.24, Math.sin(a) * 0.24 + 0.02, 0.5);
      link.rotation.set(0, Math.PI / 2, a + (i % 2) * Math.PI / 2);
      this.body.add(link);
    }
    // legs: shoulder and hip pivots
    for (const [x, z] of [[-0.17, 0.42], [0.17, 0.42], [-0.17, -0.42], [0.17, -0.42]]) {
      const leg = new THREE.Group();
      leg.position.set(x, -0.05, z);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.32, 3, 6), fur);
      upper.position.y = -0.2;
      const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.3, 3, 6), furDark);
      lower.position.set(0, -0.52, 0.03);
      leg.add(upper, lower);
      this.body.add(leg);
      this.legs.push(leg);
    }
    this.tail.position.set(0, 0.12, -0.72);
    const tailM = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 5).rotateX(-Math.PI / 2 - 0.5), furDark);
    tailM.position.z = -0.22;
    this.tail.add(tailM);
    this.body.add(this.tail);
    this.root.scale.setScalar(scale);
    this.top = 1.35 * scale;
    this.root.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  }

  move(speed: number) {
    this.speed = speed;
  }

  act(what: 'windup' | 'strike' | 'hit' | 'death' | 'idle', dur = 0.4) {
    if (this.dead) return;
    if (what === 'windup') { this.pose = 1; this.poseT = dur; }
    else if (what === 'strike') { this.pose = -1; this.poseT = dur; }
    else if (what === 'hit') { this.pose = 0.6; this.poseT = 0.15; }
    else if (what === 'death') { this.dead = true; }
    else this.pose = 0;
  }

  update(dt: number) {
    this.time += dt;
    if (this.dead) {
      this.deadT = Math.min(1, this.deadT + dt * 3);
      this.body.rotation.z = this.deadT * 1.45;
      this.body.position.y = 0.72 - this.deadT * 0.45;
      for (const l of this.legs) l.rotation.x *= 0.9;
      return;
    }
    this.poseT -= dt;
    if (this.poseT <= 0) this.pose = 0;
    // gallop above a trot, trot below
    const gallop = this.speed > 4;
    this.phase += dt * (gallop ? this.speed * 1.5 : this.speed * 2.6 + 0.001);
    const amp = Math.min(1, this.speed / 3) * (gallop ? 0.85 : 0.55);
    const p = this.phase;
    const off = gallop ? [0, 0.35, Math.PI, Math.PI + 0.35] : [0, Math.PI, Math.PI, 0];
    this.legs.forEach((l, i) => (l.rotation.x = Math.sin(p + off[i]) * amp));
    const crouch = this.pose > 0 ? this.pose : 0;
    const lunge = this.pose < 0 ? 1 : 0;
    this.body.position.y = 0.72 - crouch * 0.18 + (gallop ? Math.abs(Math.sin(p)) * 0.08 : 0) + Math.sin(this.time * 2) * 0.01;
    this.body.rotation.x = (gallop ? Math.sin(p) * 0.08 : 0) + crouch * 0.12 - lunge * 0.25;
    this.head.rotation.x = -crouch * 0.25 + lunge * 0.3 + Math.sin(this.time * 1.3) * 0.04;
    this.tail.rotation.x = 0.3 + Math.sin(this.time * 7) * 0.15 * (1 - crouch);
    this.tail.rotation.y = Math.sin(this.time * 5) * 0.3;
  }

  glow(white: number, red: number) {
    this.mats[0].emissive.setRGB(white * 0.8 + red * 0.15, white * 0.8 + red * 0.35, white * 0.8 + red * 0.9);
    this.mats[1].emissive.setRGB(red * 0.1, red * 0.3, red * 0.8);
  }

  dispose() {
    for (const m of this.mats) m.dispose();
  }
}

class WispBody implements Body {
  root = new THREE.Group();
  top = 3.6;
  private core: THREE.Mesh;
  private halo: THREE.Sprite;
  private t = Math.random() * 10;
  private dead = false;
  private mat: THREE.MeshBasicMaterial;

  constructor() {
    this.mat = new THREE.MeshBasicMaterial({ color: '#b8f0ff' });
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 2), this.mat);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ color: '#58c8ff', transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.halo.scale.setScalar(1.6);
    this.core.position.y = this.halo.position.y = 2.6;
    this.root.add(this.core, this.halo);
  }
  move() {}
  act(what: string) {
    if (what === 'death') this.dead = true;
    if (what === 'windup') this.halo.scale.setScalar(2.6);
  }
  update(dt: number) {
    this.t += dt;
    const y = 2.6 + Math.sin(this.t * 2.1) * 0.35;
    this.core.position.y = this.halo.position.y = this.dead ? Math.max(0.2, this.core.position.y - dt * 3) : y;
    const s = this.halo.scale.x + (1.6 + Math.sin(this.t * 9) * 0.15 - this.halo.scale.x) * Math.min(1, dt * 4);
    this.halo.scale.setScalar(this.dead ? Math.max(0.01, this.halo.scale.x - dt * 3) : s);
  }
  glow(white: number, red: number) {
    this.mat.color.setRGB(0.72 + white * 0.3 + red * 0.3, 0.94 - red * 0.4, 1 - red * 0.5);
  }
  dispose() {
    this.mat.dispose();
  }
}

export function makeBody(t: EnemyType, model: GLTF | null, elite: boolean): Body {
  if (t.body === 'hound') return new HoundBody(t.scale * (elite ? 1.25 : 1), t.id === 'kludde' ? '#9fe2ff' : '#7cc4ff');
  if (t.body === 'wisp') return new WispBody();
  if (!model) return new HoundBody(0.8); // never happens in practice: the rider model ships with the game
  const cloaks = t.cloak ?? ['#444'];
  return new HumanBody(model, elite ? '#9a1a12' : cloaks[Math.floor(Math.random() * cloaks.length)], t.weapon, t.scale * (elite ? 1.12 : 1));
}

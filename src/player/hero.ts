// The rider on foot: a cloaked figure with Rosen-style procedural locomotion
// (stride wheel driven by distance travelled, lean from acceleration, bob).

import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clamp, damp, lerp } from '../core/math';
import { recolor, makeSword } from '../render/recolor';

const M = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });

export class Hero {
  root = new THREE.Group();
  private hips = new THREE.Group();
  private torso = new THREE.Group();
  private legs: THREE.Group[] = [];
  private arms: THREE.Group[] = [];
  private cape: THREE.Mesh;
  private stride = 0;
  private lean = 0;
  private time = 0;

  // Rigged model with motion clips (tools/blender/make_rider.py). When present
  // it replaces the primitive stand-in.
  private model?: THREE.Object3D;
  private mixer?: THREE.AnimationMixer;
  private actions = new Map<string, THREE.AnimationAction>();
  private current = '';
  private pelvis?: THREE.Object3D;
  private cloak: THREE.Object3D[] = [];
  private cloakSwing = 0;
  private riding = true;
  private tmp = new THREE.Vector3();
  /** a one-shot clip (attack, roll, hit, death) that overrides walking */
  private shot: { name: string; t: number; dur: number } | null = null;
  sword?: THREE.Object3D;
  private armed = false;
  private lungeLean = 0;

  constructor() {
    const cloakM = M('#2e4a3c');
    const tunic = M('#7b5a3a');
    const leather = M('#3d2b1f');
    const skin = M('#e1b994');
    this.root.add(this.hips);
    this.hips.position.y = 0.95;
    for (const s of [-1, 1]) {
      const leg = new THREE.Group();
      leg.position.set(0.13 * s, 0, 0);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 0.18), leather);
      thigh.position.y = -0.25;
      leg.add(thigh);
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.16), leather);
      shin.position.y = -0.7;
      leg.add(shin);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.28), M('#2a1d15'));
      boot.position.set(0, -0.92, 0.05);
      leg.add(boot);
      this.hips.add(leg);
      this.legs.push(leg);
    }
    this.hips.add(this.torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.26), tunic);
    chest.position.y = 0.32;
    this.torso.add(chest);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.08, 0.28), leather);
    belt.position.y = 0.06;
    this.torso.add(belt);
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15, 1), skin);
    head.position.y = 0.8;
    this.torso.add(head);
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.42, 6, 1, true), cloakM);
    hood.position.set(0, 0.86, -0.03);
    hood.rotation.x = -0.15;
    this.torso.add(hood);
    for (const s of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(0.28 * s, 0.56, 0);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.13), tunic);
      upper.position.y = -0.27;
      arm.add(upper);
      const hand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.1), skin);
      hand.position.y = -0.6;
      arm.add(hand);
      this.torso.add(arm);
      this.arms.push(arm);
    }
    const cloakGeo = new THREE.PlaneGeometry(0.62, 1.15, 1, 4);
    cloakGeo.translate(0, -0.55, 0);
    this.cape = new THREE.Mesh(cloakGeo, M('#2e4a3c', { side: THREE.DoubleSide }));
    this.cape.position.set(0, 0.62, -0.16);
    this.torso.add(this.cape);
    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }

  /** Swap the primitive stand-in for the rigged, animated model. */
  useModel(gltf: GLTF) {
    this.hips.visible = false;
    this.model = gltf.scene;
    this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of gltf.animations) {
      const a = this.mixer.clipAction(clip);
      if (['jump', 'land', 'attack1', 'attack2', 'attack3', 'roll', 'hit', 'death', 'cast'].includes(clip.name)) {
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
      }
      this.actions.set(clip.name, a);
    }
    this.pelvis = this.model.getObjectByName('pelvis');
    this.sword = this.model.getObjectByName('sword') ?? undefined;
    if (!this.sword) {
      const hand = this.model.getObjectByName('hand_r');
      if (hand) {
        this.sword = makeSword();
        hand.add(this.sword);
      }
    }
    if (this.sword) this.sword.visible = false;
    for (const n of ['cloak1', 'cloak2', 'cloak3', 'cloak4']) {
      const b = this.model.getObjectByName(n);
      if (b) this.cloak.push(b);
    }
    this.play(this.riding ? 'ride_idle' : 'idle', 0);
  }

  /** Recolour the cloak (the red of the painted texture). */
  setCloak(color: string) {
    this.model?.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && /cloak/i.test(m.name)) m.material = recolor(m.material as THREE.MeshStandardMaterial, color);
    });
  }

  setArmed(on: boolean) {
    this.armed = on;
    if (this.sword) this.sword.visible = on && !this.riding;
  }

  has(name: string) {
    return this.actions.has(name);
  }

  /** Play a one-shot clip over the walk cycle; `dur` overrides the clip length. */
  act(name: string, dur?: number, speed = 1) {
    const a = this.actions.get(name);
    const len = dur ?? (a ? a.getClip().duration / speed : 0.5);
    this.shot = { name, t: 0, dur: len };
    if (a) {
      this.current = '';
      a.timeScale = a.getClip().duration / len;
      this.play(name, 0.06);
    } else if (name.startsWith('attack')) this.lungeLean = 0.35; // no clip yet: lean into the blow
  }

  /** Back on your feet after falling in battle. */
  revive() {
    this.shot = null;
    this.current = '';
    this.lungeLean = 0;
  }

  get acting() {
    return this.shot?.name ?? null;
  }

  private play(name: string, fade = 0.22) {
    if (this.current === name) return;
    const next = this.actions.get(name);
    if (!next) return;
    const prev = this.actions.get(this.current);
    next.reset().setEffectiveWeight(1).play();
    if (prev && fade > 0) prev.crossFadeTo(next, fade, false);
    else prev?.stop();
    this.current = name;
  }

  /** Wind in the cloak: swing the cloak bones back with speed, on top of the clip's own sway. */
  private blowCloak(dt: number, speed: number, max: number) {
    this.cloakSwing = lerp(this.cloakSwing, clamp(speed * 0.045, 0, max), damp(0.08, dt));
    const gust = Math.sin(this.time * 5.3) * 0.04 * this.cloakSwing;
    this.cloak.forEach((b, i) => b.rotateX((this.cloakSwing * (i === 0 ? 0.5 : 0.28) + gust)));
  }

  /** Call every frame while mounted. `speed` is the dragon's airspeed. */
  updateRiding(dt: number, speed: number) {
    if (!this.mixer) return;
    this.time += dt;
    this.play('ride_idle');
    this.mixer.update(dt);
    this.blowCloak(dt, speed, 1.1);
    // sit the pelvis on the saddle point, whatever height the clip puts it at
    if (this.pelvis) {
      this.root.updateWorldMatrix(true, true);
      const p = this.root.worldToLocal(this.pelvis.getWorldPosition(this.tmp));
      this.root.position.y = -p.y + 0.06;
      this.root.position.z = -p.z;
    }
  }

  /** Riding pose on the dragon. */
  sit() {
    this.riding = true;
    this.shot = null;
    if (this.sword) this.sword.visible = false;
    if (this.mixer) {
      this.play('ride_idle', 0.15);
      return;
    }
    this.legs[0].rotation.set(-1.3, 0, -0.35);
    this.legs[1].rotation.set(-1.3, 0, 0.35);
    this.arms[0].rotation.set(-0.9, 0, 0);
    this.arms[1].rotation.set(-0.9, 0, 0);
    this.torso.rotation.x = 0.25;
    this.cape.rotation.x = 0.9;
    this.hips.position.y = 0.2;
  }

  update(dt: number, speed: number, accel: number, airborne: boolean) {
    this.time += dt;
    this.riding = false;
    if (this.sword) this.sword.visible = this.armed;
    if (this.shot) {
      this.shot.t += dt;
      if (this.shot.t >= this.shot.dur && this.shot.name !== 'death') this.shot = null;
    }
    this.lungeLean = lerp(this.lungeLean, 0, damp(0.12, dt));
    if (this.model) this.model.rotation.x = this.lungeLean;
    if (this.mixer && this.shot && this.actions.has(this.shot.name)) {
      this.mixer.update(dt);
      this.blowCloak(dt, speed, 0.5);
      return;
    }
    if (this.mixer) {
      // pick the clip from how the rider is actually moving, and play it at the pace of the feet
      let clip = this.armed && this.actions.has('sword_idle') ? 'sword_idle' : 'idle', rate = 1;
      if (airborne) clip = 'fall';
      else if (speed > 4.2) { clip = 'run'; rate = clamp(speed / 5.0, 0.7, 1.5); }
      else if (speed > 0.35) { clip = 'walk'; rate = clamp(speed / 1.5, 0.5, 2.6); }
      this.play(clip);
      this.actions.get(clip)!.timeScale = rate;
      this.mixer.update(dt);
      this.blowCloak(dt, speed, 0.5);
      return;
    }
    this.hips.position.y = 0.95;
    // stride wheel: one full cycle per ~1.6 m (walk) .. 2.4 m (run)
    const strideLen = lerp(1.6, 2.4, clamp((speed - 2) / 5, 0, 1));
    this.stride += (speed * dt) / strideLen * Math.PI * 2;
    const moving = clamp(speed / 2, 0, 1);
    const amp = lerp(0.0, lerp(0.55, 0.9, clamp((speed - 2) / 5, 0, 1)), moving);
    const sw = Math.sin(this.stride);
    if (airborne) {
      this.legs[0].rotation.x = lerp(this.legs[0].rotation.x, -0.6, damp(0.2, dt));
      this.legs[1].rotation.x = lerp(this.legs[1].rotation.x, 0.3, damp(0.2, dt));
    } else {
      this.legs[0].rotation.set(sw * amp, 0, 0);
      this.legs[1].rotation.set(-sw * amp, 0, 0);
    }
    this.arms[0].rotation.set(-sw * amp * 0.8, 0, 0.08);
    this.arms[1].rotation.set(sw * amp * 0.8, 0, -0.08);
    // bob twice per stride, breathe when idle
    this.hips.position.y += Math.abs(Math.cos(this.stride)) * 0.06 * moving - 0.03 * moving + Math.sin(this.time * 2) * 0.008 * (1 - moving);
    this.lean = lerp(this.lean, clamp(accel * 0.03 + speed * 0.025, -0.3, 0.35), damp(0.1, dt));
    this.torso.rotation.x = this.lean;
    this.cape.rotation.x = lerp(this.cape.rotation.x, 0.15 + speed * 0.07 + (airborne ? 0.6 : 0), damp(0.08, dt)) + Math.sin(this.time * 3.1) * 0.02;
  }
}

// The hatchling: a gilded young dragon built from primitives and animated
// procedurally (Rosen: "do no harm to the gameplay" — motion drives the
// animation, never the other way round). Model faces +Z.

import * as THREE from 'three';
import { clamp, damp, lerp } from '../core/math';
import { BoneRig } from '../render/models';

export interface DragonAnimInput {
  speed: number;
  climb: number; // vertical speed m/s
  thrust: number; // 0..1
  turnRate: number; // rad/s, + = left
  grounded: number; // 0 flying .. 1 standing
  boosting: boolean;
}

const mats = {
  scale: new THREE.MeshStandardMaterial({ color: '#b07e2c', metalness: 0.55, roughness: 0.42, flatShading: true }),
  scaleDark: new THREE.MeshStandardMaterial({ color: '#7d5420', metalness: 0.5, roughness: 0.5, flatShading: true }),
  belly: new THREE.MeshStandardMaterial({ color: '#d9b76d', metalness: 0.3, roughness: 0.55, flatShading: true }),
  membrane: new THREE.MeshStandardMaterial({ color: '#7a2621', roughness: 0.75, side: THREE.DoubleSide, flatShading: true }),
  horn: new THREE.MeshStandardMaterial({ color: '#e9dfc6', roughness: 0.6, flatShading: true }),
  eye: new THREE.MeshStandardMaterial({ color: '#ffcf5a', emissive: '#ff9a20', emissiveIntensity: 2.2 }),
};

function seg(r: number, len: number, mat: THREE.Material) {
  const g = new THREE.SphereGeometry(1, 8, 6);
  g.scale(r, r * 0.92, len * 0.62);
  const m = new THREE.Mesh(g, mat);
  m.castShadow = true;
  return m;
}

function membraneGeo(pts: [number, number, number][]) {
  const pos: number[] = [];
  for (let i = 1; i < pts.length - 1; i++) pos.push(...pts[0], ...pts[i], ...pts[i + 1]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

interface Wing {
  shoulder: THREE.Group;
  elbow: THREE.Group;
  side: number;
}

export class Dragon {
  root = new THREE.Group();
  /** visual body (pitched/rolled), child of root (yaw) */
  body = new THREE.Group();
  riderSeat = new THREE.Object3D();
  private neck: THREE.Group[] = [];
  private tail: THREE.Group[] = [];
  private head!: THREE.Group;
  private jaw!: THREE.Mesh;
  private wings: Wing[] = [];
  private legs: THREE.Group[] = [];

  private phase = 0;
  private flapAmp = 0.6;
  private fold = 0;
  private neckYaw: number[] = [];
  private tailYaw: number[] = [];
  private tailPitch: number[] = [];
  private time = 0;
  private jawOpen = 0;
  /** rigged model (tools/blender/make_dragon.py); when present it replaces the primitive stand-in */
  private rig?: BoneRig;
  private footY = 0;
  /** called on each downstroke with a strength 0..1 */
  onFlap?: (strength: number) => void;

  constructor() {
    this.root.add(this.body);
    const torso = seg(1.05, 3.6, mats.scale);
    this.body.add(torso);
    const belly = seg(0.85, 3.0, mats.belly);
    belly.position.set(0, -0.32, 0.1);
    this.body.add(belly);
    // dorsal ridge
    for (let i = 0; i < 7; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 4), mats.scaleDark);
      spike.position.set(0, 0.95 - Math.abs(i - 3) * 0.06, 1.4 - i * 0.45);
      spike.rotation.x = -0.5;
      this.body.add(spike);
    }
    this.riderSeat.position.set(0, 0.95, 0.9);
    this.body.add(this.riderSeat);

    // neck chain
    let parent: THREE.Object3D = this.body;
    const neckLen = 0.75;
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      g.position.set(0, i === 0 ? 0.35 : 0.06, i === 0 ? 1.7 : neckLen);
      const m = seg(0.5 - i * 0.05, 1.0, mats.scale);
      m.position.z = neckLen * 0.5;
      g.add(m);
      parent.add(g);
      parent = g;
      this.neck.push(g);
      this.neckYaw.push(0);
    }
    this.neck[0].rotation.x = -0.45;
    // head
    this.head = new THREE.Group();
    this.head.position.z = neckLen;
    parent.add(this.head);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.9), mats.scale);
    skull.position.z = 0.35;
    skull.castShadow = true;
    this.head.add(skull);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.8), mats.scale);
    snout.position.set(0, -0.05, 1.05);
    this.head.add(snout);
    this.jaw = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 1.1), mats.belly);
    this.jaw.position.set(0, -0.28, 0.85);
    this.head.add(this.jaw);
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.9, 5), mats.horn);
      horn.position.set(0.24 * s, 0.32, -0.05);
      horn.rotation.set(-1.9, 0, 0.25 * s);
      this.head.add(horn);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 4), mats.eye);
      eye.position.set(0.3 * s, 0.1, 0.6);
      this.head.add(eye);
    }
    this.head.rotation.x = 0.5;

    // tail chain
    parent = this.body;
    for (let i = 0; i < 10; i++) {
      const g = new THREE.Group();
      g.position.set(0, i === 0 ? 0.1 : 0, i === 0 ? -1.9 : -0.66);
      const r0 = 0.42 * (1 - i / 11) + 0.05, r1 = 0.42 * (1 - (i + 1) / 11) + 0.05;
      const tg = new THREE.CylinderGeometry(r1, r0, 0.7, 7);
      tg.rotateX(Math.PI / 2);
      const m = new THREE.Mesh(tg, i % 2 ? mats.scaleDark : mats.scale);
      m.position.z = -0.3;
      g.add(m);
      parent.add(g);
      parent = g;
      this.tail.push(g);
      this.tailYaw.push(0);
      this.tailPitch.push(0);
    }
    const fin = new THREE.Mesh(membraneGeo([[0, 0, 0], [0.55, 0, -0.3], [0, 0, -1.1], [-0.55, 0, -0.3]]), mats.membrane);
    fin.position.z = -0.5;
    parent.add(fin);

    // wings
    for (const side of [1, -1]) this.wings.push(this.makeWing(side));
    // legs
    for (const [x, z] of [[0.6, 1.1], [-0.6, 1.1], [0.6, -1.2], [-0.6, -1.2]]) {
      const hip = new THREE.Group();
      hip.position.set(x, -0.45, z);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.12, 1.0, 6), mats.scale);
      thigh.position.y = -0.5;
      hip.add(thigh);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.45), mats.scaleDark);
      foot.position.set(0, -1.0, 0.12);
      hip.add(foot);
      this.body.add(hip);
      this.legs.push(hip);
    }
    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.castShadow = true;
    });
  }

  private makeWing(side: number): Wing {
    const shoulder = new THREE.Group();
    shoulder.position.set(0.75 * side, 0.55, 0.75);
    this.body.add(shoulder);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 2.6, 5), mats.scale);
    arm.rotation.z = Math.PI / 2;
    arm.position.x = 1.3 * side;
    shoulder.add(arm);
    const inner = new THREE.Mesh(
      membraneGeo([[0, 0, 0], [2.6 * side, 0, 0], [2.8 * side, 0, -2.4], [0.1 * side, -0.1, -2.5]]),
      mats.membrane,
    );
    shoulder.add(inner);
    const elbow = new THREE.Group();
    elbow.position.x = 2.6 * side;
    shoulder.add(elbow);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 3.2, 5), mats.scale);
    fore.rotation.z = Math.PI / 2;
    fore.position.x = 1.6 * side;
    elbow.add(fore);
    const tips: [number, number, number][] = [[6.4, 0, -0.5], [5.6, 0, -2.0], [3.9, 0, -2.8]];
    for (const t of tips) {
      const len = Math.hypot(t[0] - 3.2, t[2] - 0.2);
      const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.06, len, 4), mats.scaleDark);
      finger.position.set(((3.2 + t[0]) / 2) * side, 0, (0.2 + t[2]) / 2);
      finger.rotation.y = -Math.atan2(t[2] - 0.2, t[0] - 3.2) * side;
      finger.rotation.z = Math.PI / 2;
      elbow.add(finger);
    }
    const claw = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 4), mats.horn);
    claw.position.set(3.2 * side, 0.15, 0.25);
    elbow.add(claw);
    const outer = new THREE.Mesh(
      membraneGeo([
        [0.2 * side, 0, -2.4], [0, 0, 0], [3.2 * side, 0, 0.2], [6.4 * side, 0, -0.5], [5.6 * side, 0, -2.0], [3.9 * side, 0, -2.8],
      ]),
      mats.membrane,
    );
    elbow.add(outer);
    return { shoulder, elbow, side };
  }

  /** Cosmetic jaw snap for future fire breath / roars. */
  roar(t: number) {
    this.jawOpen = t;
    this.jaw.rotation.x = 0.5 * t;
  }

  /** Swap the primitive stand-in for the rigged model. Same axes: +Z forward, +Y up, left wing on +X. */
  useModel(model: THREE.Object3D) {
    for (const c of this.body.children) if (c !== this.riderSeat) c.visible = false;
    this.body.add(model);
    this.rig = new BoneRig(model);
    this.footY = new THREE.Box3().setFromObject(model).min.y;
    this.riderSeat.position.set(0, 1.22, 0.7); // the model's back is higher than the stand-in's
  }

  /** Jump straight to the folded (1) or flying (0) pose, without the blend. */
  snapFold(v: number) {
    this.fold = v;
  }

  /** Drive the model's skeleton. Angles are about the model's own axes, relative to its rest pose (wings spread, standing). */
  private poseRig(s: DragonAnimInput, dihedral: number) {
    const r = this.rig!;
    const f = this.fold, fly = 1 - f;
    const D = Math.PI / 180;
    const wave = Math.sin(this.phase);
    const flap = wave * this.flapAmp + dihedral; // + = wings up
    const lag = Math.sin(this.phase - 0.7) * this.flapAmp;
    const down = Math.max(0, -wave) * this.flapAmp; // 0..1 during the downstroke
    const sweep = Math.sin(this.phase + 1.2) * this.flapAmp * 0.2;
    const fingers: [string, number, number][] = [['f1', 128, 10], ['f2', 96, 6], ['f3', 70, 2]];
    for (const [n, k] of [['L', 1], ['R', -1]] as const) {
      // flying: flap about the body axis, forearm and fingers trail the upper arm.
      // standing: the arm swings back and the wing folds shut like a fan.
      r.rotate(`wing${n}_shoulder`, 0, lerp(sweep, 72 * D, f) * k, lerp(flap, 18 * D, f) * k);
      r.rotate(`wing${n}_elbow`, 0, lerp(0.1 + down * 0.45, -150 * D, f) * k, lerp(lag * 0.55, 0, f) * k);
      for (const [fn, folded, bend] of fingers) {
        r.rotate(`wing${n}_${fn}`, 0, lerp(bend * D * down * 1.6, folded * D, f) * k, lerp(lag * 0.3, 0, f) * k);
      }
      r.rotate(`legF${n}_upper`, 65 * D * fly, 0, 0);
      r.rotate(`legF${n}_lower`, -55 * D * fly, 0, 0);
      r.rotate(`legB${n}_upper`, 70 * D * fly, 0, 0);
      r.rotate(`legB${n}_lower`, -40 * D * fly, 0, 0);
    }
    const climbLook = clamp(-s.climb * 0.006, -0.08, 0.08) * fly;
    for (let i = 0; i < 5; i++) {
      const standX = (i < 2 ? -6 : 8) * D * f; // head held up and tucked when standing
      r.rotate(`neck${i + 1}`, climbLook + standX, this.neckYaw[i] ?? 0, 0);
    }
    r.rotate('head', clamp(s.climb * 0.008, -0.15, 0.2) * fly, (this.neckYaw[4] ?? 0) * 0.5, 0);
    r.rotate('jaw', 0.5 * this.jawOpen, 0, 0);
    for (let i = 0; i < 10; i++) r.rotate(`tail${i + 1}`, this.tailPitch[i] ?? 0, this.tailYaw[i] ?? 0, 0);
    // stand on the feet when grounded; bob against the wingbeat in flight
    this.body.position.y = -wave * this.flapAmp * 0.22 * fly + f * (-this.footY - 0.05);
  }

  update(dt: number, s: DragonAnimInput) {
    this.time += dt;
    this.fold = lerp(this.fold, s.grounded, damp(0.08, dt));
    const fly = 1 - this.fold;

    // Wingbeat model: hover = deep fast flaps; cruise = moderate; fast glide = held wings.
    const gliding = s.speed > 28 && s.thrust < 0.1 && s.climb < 2 && !s.boosting;
    const hover = clamp(1 - s.speed / 14, 0, 1);
    let rate = 1.0 + s.thrust * 1.1 + hover * 0.9 + clamp(s.climb, 0, 15) * 0.05 + (s.boosting ? 0.8 : 0);
    let amp = 0.55 + s.thrust * 0.35 + hover * 0.35 + clamp(s.climb, 0, 15) * 0.02;
    if (gliding) { rate = 0.35; amp = 0.07; }
    this.flapAmp = lerp(this.flapAmp, amp * fly, damp(0.06, dt));
    const prev = Math.sin(this.phase);
    this.phase += dt * Math.PI * 2 * rate;
    const now = Math.sin(this.phase);
    if (prev > 0 && now <= 0 && this.flapAmp > 0.25) this.onFlap?.(clamp(this.flapAmp, 0, 1));

    const dihedral = gliding ? 0.12 : 0.05;
    for (const w of this.wings) {
      const flapZ = (Math.sin(this.phase) * this.flapAmp + dihedral) * w.side;
      const elbowZ = Math.sin(this.phase - 0.7) * this.flapAmp * 0.7 * w.side;
      const sweep = Math.sin(this.phase + 1.2) * this.flapAmp * 0.25;
      // folded pose (standing)
      const foldZ = 1.05 * w.side, foldY = -1.25 * w.side, elbowFold = -2.55 * w.side;
      w.shoulder.rotation.set(0, lerp(sweep * w.side, foldY, this.fold), lerp(flapZ, foldZ, this.fold));
      w.elbow.rotation.set(0, lerp(0, 0.4 * w.side, this.fold), lerp(elbowZ, elbowFold, this.fold));
    }

    // Body bob from flapping (opposes wing).
    this.body.position.y = -Math.sin(this.phase) * this.flapAmp * 0.18 * fly + this.fold * 0.45;

    // Neck leads into turns, tail trails behind (springy lag per segment).
    const sway = Math.sin(this.time * 1.3) * 0.05;
    for (let i = 0; i < this.neck.length; i++) {
      const target = s.turnRate * 0.09 + sway * (i + 1) * 0.3;
      this.neckYaw[i] = lerp(this.neckYaw[i], target, damp(0.12 - i * 0.012, dt));
      this.neck[i].rotation.y = this.neckYaw[i];
      if (i > 0) this.neck[i].rotation.x = lerp(0.08, -0.02, this.fold) + clamp(-s.climb * 0.006, -0.08, 0.08);
    }
    this.head.rotation.x = lerp(0.42, 0.3, this.fold) + clamp(s.climb * 0.01, -0.2, 0.25);
    for (let i = 0; i < this.tail.length; i++) {
      const lagSrc = i === 0 ? -s.turnRate * 0.12 : this.tailYaw[i - 1];
      const wave = Math.sin(this.time * 2.0 - i * 0.6) * 0.035 * (1 + this.fold);
      this.tailYaw[i] = lerp(this.tailYaw[i], lagSrc + wave, damp(0.15, dt));
      this.tail[i].rotation.y = this.tailYaw[i];
      const pitchSrc = i === 0 ? clamp(s.climb * 0.01, -0.15, 0.15) + this.fold * 0.12 : this.tailPitch[i - 1];
      this.tailPitch[i] = lerp(this.tailPitch[i], pitchSrc + Math.sin(this.phase - i * 0.5) * this.flapAmp * 0.03, damp(0.12, dt));
      this.tail[i].rotation.x = this.tailPitch[i];
    }

    // Legs tucked back in flight, planted when standing.
    for (let i = 0; i < this.legs.length; i++) {
      this.legs[i].rotation.x = lerp(-1.2, 0, this.fold) + (i < 2 ? 0.1 : -0.1) * fly;
    }
    if (this.rig) this.poseRig(s, dihedral);
  }
}

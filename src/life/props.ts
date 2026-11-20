// Stalls, doors, signs, wells and shrines: simple shapes in vertex colours,
// all merged into one mesh so the whole market and every sign in town cost a
// single draw call. Each piece is placed in a local frame (x right, y up,
// z towards the customer) and moved to its spot in the world.

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { StallKind } from './types';

const C = (hex: string) => new THREE.Color(hex);
const WOOD = C('#5a3c24'), WOOD_DK = C('#3e2a1a'), WOOD_LT = C('#7a5634'), STONE = C('#8a8478'), IRON = C('#33302e'), LINEN = C('#d8ccb0');

/** Collects shapes in world space, then merges them. */
export class PropKit {
  private parts: THREE.BufferGeometry[] = [];
  private base = new THREE.Matrix4();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();

  /** Put the next shapes at (x, y, z), turned by yaw (local +z faces the customer). */
  at(x: number, y: number, z: number, yaw: number) {
    this.base.makeRotationY(yaw).setPosition(x, y, z);
    return this;
  }

  private add(g: THREE.BufferGeometry, color: THREE.Color, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
    const geo = g.index ? g.toNonIndexed() : g;
    geo.deleteAttribute('uv');
    const n = geo.getAttribute('position').count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = color.r; col[i * 3 + 1] = color.g; col[i * 3 + 2] = color.b; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.m.compose(this.v.set(x, y, z), this.q.setFromEuler(this.e.set(rx, ry, rz)), this.s.set(1, 1, 1));
    geo.applyMatrix4(this.m.premultiply(this.base));
    this.parts.push(geo);
    if (geo !== g) g.dispose();
  }

  box(w: number, h: number, d: number, color: THREE.Color, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) {
    this.add(new THREE.BoxGeometry(w, h, d), color, x, y, z, rx, ry, rz);
  }

  cyl(r0: number, r1: number, h: number, color: THREE.Color, x: number, y: number, z: number, rx = 0, rz = 0, seg = 8) {
    this.add(new THREE.CylinderGeometry(r0, r1, h, seg, 1), color, x, y, z, rx, 0, rz);
  }

  ball(r: number, color: THREE.Color, x: number, y: number, z: number, sy = 1) {
    const g = new THREE.SphereGeometry(r, 7, 5);
    g.scale(1, sy, 1);
    this.add(g, color, x, y, z);
  }

  get count() {
    return this.parts.length;
  }

  build(): THREE.Mesh | null {
    if (!this.parts.length) return null;
    const g = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    if (!g) return null;
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02 }));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}

const AWNINGS: Record<string, [string, string]> = {
  bread: ['#b8862e', '#e2d6bc'], herbs: ['#56663e', '#d8ccb0'], books: ['#2c4260', '#d8ccb0'], cloth: ['#6e2219', '#c49a3a'],
  iron: ['#3a3634', '#7a756c'], beer: ['#9a3226', '#e2d6bc'], salves: ['#e2d6bc', '#1f1c1e'], badges: ['#41618a', '#e2d6bc'], army: ['#9a3226', '#c49a3a'],
};

/** A market stall: a trestle table under an awning, with goods by kind. The seller stands at z = -1.2. */
export function stall(k: PropKit, kind: StallKind, seed: number) {
  const rnd = (i: number) => ((Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453) % 1 + 1) % 1;
  if (kind === 'door') return;
  if (kind === 'crier') {
    // a wooden step and a post with a hand bell
    k.box(1.4, 0.25, 1.0, WOOD, 0, 0.125, -0.2);
    k.box(0.1, 1.6, 0.1, WOOD_DK, 0.9, 0.8, 0.1);
    k.box(0.5, 0.06, 0.06, WOOD_DK, 0.75, 1.55, 0.1);
    k.cyl(0.06, 0.14, 0.2, C('#b08a3a'), 0.55, 1.42, 0.1);
    k.box(0.7, 0.5, 0.04, LINEN, 0.9, 1.15, 0.16);
    return;
  }
  if (kind === 'beer') {
    // the inn: barrels, a bench and a table by the door
    k.box(1.8, 0.07, 0.8, WOOD_LT, 0, 0.78, 0.2);
    for (const x of [-0.75, 0.75]) k.box(0.08, 0.78, 0.6, WOOD_DK, x, 0.39, 0.2);
    k.box(1.8, 0.06, 0.32, WOOD, 0, 0.45, 0.95);
    for (const x of [-0.75, 0.75]) k.box(0.06, 0.45, 0.28, WOOD_DK, x, 0.225, 0.95);
    for (let i = 0; i < 3; i++) k.cyl(0.36, 0.36, 0.9, WOOD, -1.6 + (i % 2) * 0.1, 0.45 + (i === 2 ? 0.9 : 0), -0.6 + (i === 1 ? 0.75 : 0), 0, 0, 10);
    for (let i = 0; i < 3; i++) k.cyl(0.06, 0.06, 0.14, C('#8a7a5a'), -0.5 + i * 0.4, 0.88, 0.2);
    // the sign: a green bush over the door
    k.box(0.08, 0.08, 1.0, IRON, 0, 2.9, -0.4);
    k.ball(0.32, C('#4e6a38'), 0, 2.6, 0.05, 1.1);
    return;
  }
  // table on trestles
  k.box(2.4, 0.07, 0.95, WOOD_LT, 0, 0.84, 0);
  for (const x of [-0.95, 0.95]) {
    k.box(0.07, 0.84, 0.07, WOOD_DK, x, 0.42, 0.35, 0.18);
    k.box(0.07, 0.84, 0.07, WOOD_DK, x, 0.42, -0.35, -0.18);
  }
  // awning on four poles, sloping to the front, striped
  for (const [x, z, h] of [[-1.25, -0.75, 2.45], [1.25, -0.75, 2.45], [-1.25, 0.65, 2.05], [1.25, 0.65, 2.05]]) k.box(0.07, h, 0.07, WOOD_DK, x, h / 2, z);
  const [a, b] = AWNINGS[kind] ?? ['#9a3226', '#e2d6bc'];
  for (let i = 0; i < 5; i++) k.box(0.56, 0.03, 1.7, C(i % 2 ? b : a), -1.12 + i * 0.56, 2.27, -0.02, 0.27);
  // goods
  const top = 0.88;
  if (kind === 'bread') {
    for (let i = 0; i < 9; i++) k.ball(0.13, C(i % 3 ? '#a8743a' : '#7a4a24'), -0.95 + (i % 5) * 0.45, top + 0.07, -0.25 + Math.floor(i / 5) * 0.4, 0.6);
    k.cyl(0.28, 0.22, 0.25, WOOD_LT, 0.95, top + 0.12, 0.2);
  } else if (kind === 'herbs') {
    for (let i = 0; i < 6; i++) k.cyl(0.08, 0.08, 0.18, C(i % 2 ? '#c8c0a8' : '#6a5a40'), -0.9 + i * 0.35, top + 0.09, 0.25);
    for (let i = 0; i < 5; i++) k.box(0.1, 0.4, 0.1, C(['#56663e', '#7a8a4a', '#8a7a3a'][i % 3]), -0.9 + i * 0.45, 1.95, -0.6);
    k.cyl(0.3, 0.24, 0.22, WOOD_LT, 0.6, top + 0.11, -0.2);
  } else if (kind === 'books') {
    const cols = ['#6e2219', '#2c4260', '#4a3626', '#56663e', '#262326'];
    for (let i = 0; i < 7; i++) k.box(0.28, 0.06 + rnd(i) * 0.08, 0.38, C(cols[i % 5]), -1.0 + i * 0.32, top + 0.05, 0.05 + (i % 2) * 0.1);
    k.box(0.9, 0.65, 0.04, LINEN, 0.6, 1.25, -0.42, -0.25);
    k.box(0.7, 0.5, 0.04, LINEN, -0.5, 1.2, -0.42, -0.25);
  } else if (kind === 'cloth') {
    const cols = ['#9a3226', '#41618a', '#c49a3a', '#56663e', '#5a4256', '#262326'];
    for (let i = 0; i < 6; i++) k.cyl(0.11, 0.11, 0.8, C(cols[i]), -0.85 + i * 0.34, top + 0.11, 0.05, Math.PI / 2);
    k.box(0.05, 1.3, 0.05, WOOD_DK, 1.45, 0.65, 0.4);
    k.box(0.5, 0.9, 0.03, C('#9a3226'), 1.45, 1.05, 0.42);
  } else if (kind === 'iron') {
    for (let i = 0; i < 4; i++) k.box(0.06, 0.03, 0.95, C('#8a8a90'), -0.8 + i * 0.3, top + 0.03, 0, 0, 0.2 * (i - 1.5));
    k.box(0.5, 0.32, 0.3, IRON, 0.75, top + 0.16, 0);
    // anvil on a stump beside the table
    k.cyl(0.25, 0.28, 0.55, WOOD, 1.7, 0.27, 0.5);
    k.box(0.55, 0.22, 0.24, IRON, 1.7, 0.66, 0.5);
    k.box(0.06, 1.5, 0.06, WOOD_DK, -1.65, 0.75, -0.2);
    for (let i = 0; i < 3; i++) k.box(0.04, 1.1, 0.04, C('#9a9aa0'), -1.65 + (i - 1) * 0.15, 0.9, -0.12);
  } else if (kind === 'salves') {
    for (let i = 0; i < 10; i++) k.cyl(0.06, 0.07, 0.12 + (i % 3) * 0.04, C(i % 2 ? '#e2d6bc' : '#8a6a4a'), -0.95 + i * 0.21, top + 0.08, 0.1 + (i % 2) * 0.2);
    k.box(0.5, 0.3, 0.35, LINEN, 0.8, top + 0.15, -0.2);
  } else if (kind === 'badges') {
    k.box(1.6, 0.9, 0.05, C('#5a4430'), 0, 1.35, -0.38, -0.2);
    for (let i = 0; i < 12; i++) k.cyl(0.06, 0.06, 0.02, C(i % 4 ? '#b8b2a8' : '#d8c070'), -0.6 + (i % 6) * 0.24, 1.2 + Math.floor(i / 6) * 0.3, -0.33, Math.PI / 2 - 0.2);
    for (let i = 0; i < 4; i++) k.box(0.1, 0.22, 0.08, C('#7a5634'), -0.8 + i * 0.5, top + 0.11, 0.25);
  } else if (kind === 'army') {
    for (let i = 0; i < 3; i++) {
      k.box(0.06, 1.3, 0.06, WOOD_DK, -1.9 + i * 0.0, 0.65, -0.4 + i * 0.5);
    }
    k.box(0.5, 0.6, 0.3, C('#8a6a3a'), -1.9, 1.15, -0.4);
    k.box(0.5, 0.6, 0.3, C('#7a7a80'), -1.9, 1.15, 0.6);
    k.ball(0.2, C('#8a8a90'), -0.6, top + 0.12, 0.1, 0.7);
    k.ball(0.2, C('#8a8a90'), 0.0, top + 0.12, 0.1, 0.7);
    k.cyl(0.32, 0.32, 0.8, WOOD, 1.7, 0.4, 0.3, 0, 0, 10);
  }
}

/** A door in a wall (local frame: the wall is at z = 0, the street at +z). */
export function door(k: PropKit, color = WOOD_DK) {
  k.box(1.4, 2.5, 0.1, STONE, 0, 1.25, 0.02);
  k.box(1.05, 2.1, 0.08, color, 0, 1.05, 0.09);
  k.cyl(0.05, 0.05, 0.03, IRON, 0.32, 1.1, 0.14, Math.PI / 2);
  k.box(0.08, 0.5, 0.1, STONE, -0.66, 0.25, 0.2);
}

/** A house sign on an iron arm (local frame as door). */
export function sign(k: PropKit, color: string) {
  k.box(0.05, 0.05, 1.0, IRON, 0, 3.3, 0.5);
  k.box(0.05, 0.5, 0.05, IRON, 0, 3.05, 0.1, 0.9);
  k.box(0.04, 0.55, 0.7, C(color), 0, 2.95, 0.65);
  k.box(0.05, 0.6, 0.76, WOOD_DK, 0, 2.95, 0.65);
}

/** A shrine: in a wall niche (onWall) or on a post. */
export function shrine(k: PropKit, onWall: boolean) {
  const y = onWall ? 2.1 : 1.5;
  if (!onWall) k.box(0.14, 1.5, 0.14, WOOD, 0, 0.75, 0);
  k.box(0.55, 0.7, 0.32, onWall ? STONE : WOOD_LT, 0, y + 0.35, onWall ? 0.16 : 0);
  k.box(0.42, 0.55, 0.05, C('#2c4260'), 0, y + 0.36, onWall ? 0.33 : 0.17);
  k.cyl(0.06, 0.09, 0.36, C('#ece6d6'), 0, y + 0.3, onWall ? 0.36 : 0.2);
  k.box(0.65, 0.06, 0.42, onWall ? STONE : WOOD_DK, 0, y + 0.72, onWall ? 0.18 : 0, 0.0);
  k.cyl(0.04, 0.04, 0.1, C('#f0e0a0'), 0.17, y + 0.06, onWall ? 0.38 : 0.2);
}

/** A well with a roof and a bucket. */
export function well(k: PropKit) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.box(0.5, 0.75, 0.22, STONE, Math.sin(a) * 0.72, 0.375, Math.cos(a) * 0.72, 0, a);
  }
  for (const x of [-0.85, 0.85]) k.box(0.12, 2.2, 0.12, WOOD_DK, x, 1.1, 0);
  k.box(1.9, 0.1, 0.1, WOOD_DK, 0, 1.9, 0);
  k.box(1.9, 0.05, 0.75, WOOD, 0, 2.35, 0.3, 0.5);
  k.box(1.9, 0.05, 0.75, WOOD, 0, 2.35, -0.3, -0.5);
  k.cyl(0.16, 0.13, 0.25, WOOD_LT, 0.3, 0.95, 0.75);
}

/** The notice board: two posts, a roof and paper. */
export function board(k: PropKit) {
  for (const x of [-1.1, 1.1]) k.box(0.14, 2.6, 0.14, WOOD_DK, x, 1.3, 0);
  k.box(2.4, 1.4, 0.08, WOOD, 0, 1.6, 0);
  k.box(2.7, 0.06, 0.6, WOOD_DK, 0, 2.55, 0.05, 0.25);
  const papers: [number, number, number, number][] = [[-0.75, 1.75, 0.5, 0.65], [-0.1, 1.6, 0.5, 0.7], [0.55, 1.8, 0.45, 0.55], [0.6, 1.25, 0.5, 0.35], [-0.6, 1.15, 0.4, 0.3]];
  papers.forEach(([x, y, w, h], i) => k.box(w, h, 0.02, C(i % 2 ? '#e6d8b4' : '#d8c8a0'), x, y, 0.05));
}

/** Gold weathercock on a tower: its own small mesh (it turns and is taken). */
export function weathercock(): THREE.Group {
  const k = new PropKit();
  k.at(0, 0, 0, 0);
  const GOLD = C('#e8b83a');
  k.box(0.06, 1.6, 0.06, IRON, 0, 0.8, 0);
  k.box(0.9, 0.06, 0.06, IRON, 0, 0.6, 0);
  k.box(0.06, 0.06, 0.9, IRON, 0, 0.6, 0);
  k.box(1.1, 0.5, 0.06, GOLD, 0.05, 1.75, 0);
  k.box(0.35, 0.55, 0.06, GOLD, -0.55, 1.95, 0, 0, 0, 0.5);
  k.box(0.25, 0.35, 0.06, GOLD, 0.6, 2.1, 0);
  k.box(0.18, 0.12, 0.06, C('#c8402a'), 0.68, 2.33, 0);
  const mesh = k.build()!;
  (mesh.material as THREE.MeshStandardMaterial).metalness = 0.6;
  (mesh.material as THREE.MeshStandardMaterial).roughness = 0.35;
  (mesh.material as THREE.MeshStandardMaterial).emissive = new THREE.Color('#5a3a08');
  const g = new THREE.Group();
  g.add(mesh);
  return g;
}

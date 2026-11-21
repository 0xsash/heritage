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
  fish: ['#41618a', '#c8c0a8'], cheese: ['#b8862e', '#6e2219'], pots: ['#86522e', '#e2d6bc'], veg: ['#56663e', '#b89040'], poultry: ['#e2d6bc', '#7a5634'],
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
  } else if (kind === 'fish') {
    // eel and herring on a wet board, a herring cask, a tub of water
    k.box(2.0, 0.04, 0.8, C('#4a4038'), 0, top + 0.02, 0);
    for (let i = 0; i < 8; i++) k.box(0.36, 0.05, 0.09, C(i % 3 ? '#9aa4a8' : '#5a5a4a'), -0.75 + (i % 4) * 0.48, top + 0.07, -0.2 + Math.floor(i / 4) * 0.36, 0, rnd(i) * 0.5 - 0.25);
    k.cyl(0.3, 0.3, 0.75, WOOD, 1.65, 0.38, 0.4, 0, 0, 10);
    k.cyl(0.31, 0.31, 0.05, IRON, 1.65, 0.62, 0.4, 0, 0, 10);
    k.cyl(0.42, 0.36, 0.3, WOOD_LT, -1.7, 0.15, 0.45, 0, 0, 10);
    k.cyl(0.38, 0.38, 0.02, C('#3e5058'), -1.7, 0.29, 0.45, 0, 0, 10);
  } else if (kind === 'cheese') {
    for (let i = 0; i < 5; i++) k.cyl(0.24, 0.24, 0.13, C(i % 2 ? '#d8a840' : '#c89030'), -0.85 + i * 0.42, top + 0.07, 0.05 + (i % 2) * 0.12, 0, 0, 12);
    for (let i = 0; i < 3; i++) k.cyl(0.2, 0.2, 0.12, C('#c89030'), 0.6, top + 0.2 + i * 0.12, -0.25, 0, 0, 12);
    k.box(0.3, 0.14, 0.2, C('#ecd890'), -0.4, top + 0.08, -0.3);
    k.cyl(0.3, 0.26, 0.5, WOOD_LT, 1.7, 0.25, 0.4, 0, 0, 10);
  } else if (kind === 'pots') {
    const clay = ['#9a5a34', '#7a4a2a', '#b07848', '#5a5048'];
    for (let i = 0; i < 6; i++) {
      const x = -0.9 + i * 0.36, h = 0.22 + rnd(i) * 0.2;
      k.cyl(0.08, 0.13, h, C(clay[i % 4]), x, top + h / 2, 0.1 + (i % 2) * 0.15, 0, 0, 10);
      k.cyl(0.06, 0.08, 0.08, C(clay[i % 4]), x, top + h + 0.04, 0.1 + (i % 2) * 0.15, 0, 0, 10);
    }
    for (let i = 0; i < 5; i++) k.cyl(0.22, 0.12, 0.12, C(clay[(i + 1) % 4]), -1.8 + (i % 2) * 0.1, 0.06 + i * 0.12, 0.3, 0, 0, 12);
    k.cyl(0.2, 0.26, 0.55, C('#86522e'), 1.7, 0.28, 0.5, 0, 0, 12);
  } else if (kind === 'veg') {
    const veg = ['#5e7a3a', '#8a5a7a', '#c8a050', '#d07830', '#e6dcc0'];
    for (let b = 0; b < 3; b++) {
      k.cyl(0.32, 0.26, 0.2, C('#8a6a3a'), -0.75 + b * 0.75, top + 0.1, 0, 0, 0, 10);
      for (let i = 0; i < 5; i++) k.ball(0.1 + (b === 0 ? 0.04 : 0), C(veg[(b * 2 + (i % 2)) % 5]), -0.75 + b * 0.75 + (i % 3 - 1) * 0.14, top + 0.24 + Math.floor(i / 3) * 0.06, (i % 2 - 0.5) * 0.18, 0.85);
    }
    for (let i = 0; i < 2; i++) k.ball(0.32, LINEN, 1.65 + i * 0.25, 0.3, 0.55 - i * 0.6, 1.15);
  } else if (kind === 'poultry') {
    // wicker cages with hens, a basket of eggs
    for (let i = 0; i < 2; i++) {
      const x = -0.55 + i * 1.1;
      k.box(0.8, 0.45, 0.6, C('#8a6a3a'), x, top + 0.23, 0);
      k.box(0.82, 0.04, 0.62, WOOD_DK, x, top + 0.47, 0);
      for (let h = 0; h < 2; h++) k.ball(0.13, C(h + i ? '#f0e8d8' : '#9a5a2a'), x - 0.16 + h * 0.32, top + 0.2, 0.18, 0.85);
    }
    k.cyl(0.24, 0.18, 0.16, C('#8a6a3a'), 1.55, 0.5, 0.35, 0, 0, 10);
    for (let i = 0; i < 6; i++) k.ball(0.05, C('#f4ecd8'), 1.5 + (i % 3) * 0.06, 0.6, 0.3 + Math.floor(i / 3) * 0.08, 1.3);
    k.box(0.9, 0.5, 0.6, C('#7a5634'), 1.6, 0.25, -0.4);
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

/**
 * A wayside shrine (kapelletje): a little house with a pitched roof and an iron cross, the Virgin in a
 * blue niche, a candle and a few flowers. In a wall (onWall, local z = 0 is the wall) or on a post.
 */
export function shrine(k: PropKit, onWall: boolean) {
  const y = onWall ? 1.95 : 1.4;
  const z0 = onWall ? 0.17 : 0;
  const body = onWall ? STONE : WOOD_LT, dark = onWall ? C('#6e6a60') : WOOD_DK;
  if (!onWall) {
    k.box(0.36, 0.14, 0.36, STONE, 0, 0.07, 0);
    k.cyl(0.07, 0.085, y, WOOD, 0, y / 2, 0, 0, 0, 6);
    k.box(0.5, 0.06, 0.4, WOOD_DK, 0, y + 0.02, 0);
  } else k.box(0.62, 0.08, 0.4, STONE, 0, y - 0.02, z0 + 0.02);
  // the house: a back, two side posts and a lintel round a blue niche
  k.box(0.5, 0.66, 0.06, body, 0, y + 0.36, z0 - 0.12);
  for (const x of [-0.22, 0.22]) k.box(0.07, 0.66, 0.3, body, x, y + 0.36, z0);
  k.box(0.5, 0.09, 0.3, body, 0, y + 0.66, z0);
  k.box(0.37, 0.5, 0.02, C('#2c4260'), 0, y + 0.32, z0 - 0.085);
  for (let i = 0; i < 5; i++) k.box(0.02, 0.02, 0.02, C('#e8c860'), -0.12 + i * 0.06, y + 0.5 - (i % 2) * 0.08, z0 - 0.07);
  // the roof: two slopes and a ridge, and the cross
  for (const sd of [-1, 1]) k.box(0.36, 0.035, 0.42, dark, sd * 0.15, y + 0.79, z0, 0, 0, -sd * 0.6);
  k.box(0.05, 0.05, 0.44, dark, 0, y + 0.88, z0);
  k.box(0.03, 0.26, 0.03, IRON, 0, y + 1.02, z0);
  k.box(0.15, 0.03, 0.03, IRON, 0, y + 1.07, z0);
  // Our Lady: a white robe, a head, a gilt crown
  k.cyl(0.045, 0.1, 0.3, C('#ece6d6'), 0, y + 0.2, z0 - 0.02, 0, 0, 8);
  k.cyl(0.07, 0.05, 0.06, C('#5a7ab0'), 0, y + 0.32, z0 - 0.02, 0, 0, 8);
  k.ball(0.045, C('#e8cfb0'), 0, y + 0.39, z0 - 0.02);
  k.cyl(0.04, 0.035, 0.03, C('#e8b83a'), 0, y + 0.44, z0 - 0.02, 0, 0, 6);
  // a candle and flowers on the sill
  k.cyl(0.018, 0.018, 0.09, C('#f4ecd8'), 0.15, y + 0.1, z0 + 0.08, 0, 0, 6);
  k.ball(0.014, C('#ffd070'), 0.15, y + 0.16, z0 + 0.08, 1.6);
  for (let i = 0; i < 3; i++) k.ball(0.028, C(['#c8402a', '#e8d060', '#f0e8d8'][i]), -0.16 + i * 0.035, y + 0.09 + (i % 2) * 0.02, z0 + 0.09);
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

/** Market clutter: a barrel, a crate, a stack of sacks or a handcart (local frame as a stall). */
export function clutter(k: PropKit, kind: number) {
  if (kind === 0) {
    k.cyl(0.34, 0.34, 0.85, WOOD, 0, 0.43, 0, 0, 0, 10);
    for (const y of [0.15, 0.7]) k.cyl(0.355, 0.355, 0.05, IRON, 0, y, 0, 0, 0, 10);
  } else if (kind === 1) {
    k.box(0.7, 0.5, 0.55, WOOD_LT, 0, 0.25, 0);
    k.box(0.6, 0.4, 0.5, WOOD, 0.1, 0.7, 0.02, 0, 0.3);
  } else if (kind === 2) {
    for (let i = 0; i < 3; i++) k.ball(0.3, i === 2 ? C('#c8b890') : LINEN, (i - 1) * 0.45, 0.28, 0, 1.1);
    k.ball(0.28, LINEN, 0, 0.72, 0.05, 1.05);
  } else {
    // a two-wheeled handcart, shafts on the ground
    k.box(1.3, 0.08, 0.9, WOOD_LT, 0, 0.62, 0, 0.12);
    for (const z of [-0.47, 0.47]) k.box(1.3, 0.25, 0.05, WOOD, 0, 0.78, z, 0.12);
    for (const z of [-0.55, 0.55]) k.cyl(0.42, 0.42, 0.06, WOOD_DK, 0.15, 0.42, z, Math.PI / 2, 0, 12);
    for (const z of [-0.3, 0.3]) k.box(1.4, 0.07, 0.07, WOOD_DK, -1.2, 0.3, z, 0, 0, 0.4);
    k.ball(0.28, LINEN, 0.1, 0.9, 0, 1.1);
  }
}

// The town wall of Diest c. 1560, traced from the Ferraris map (1777), which
// still shows the late-medieval enceinte: a brick curtain wall with a
// crenellated walk, half-round towers, gatehouses on the roads, and a moat.

import * as THREE from 'three';
import { hash01 } from '../core/math';
import type { MaterialSet } from '../render/textures';
import type { WorldCollision } from './collision';
import { analyse } from './footprint';
import { GeomBuilder } from './geom';

export interface WallData {
  ring: [number, number][];
  gates: Record<string, [number, number]>;
}

const WALL_H = 7.5;
const WALL_T = 2.4;
const TOWER_EVERY = 62;
const GATE_GAP = 11;

const brick = new THREE.Color('#6c4636');
const stone = new THREE.Color('#5f4a33'); // brown ironstone, as in the church
const slate = new THREE.Color('#3b3f47');

function box(gb: GeomBuilder, c: [number, number], u: [number, number], halfU: number, halfN: number, y0: number, y1: number, color: THREE.Color) {
  const n: [number, number] = [-u[1], u[0]];
  const P = (su: number, sn: number, y: number) => [c[0] + u[0] * su * halfU + n[0] * sn * halfN, y, c[1] + u[1] * su * halfU + n[1] * sn * halfN];
  const sides: [number, number, number, number, [number, number, number]][] = [
    [1, -1, 1, 1, [u[0], 0, u[1]]],
    [-1, 1, -1, -1, [-u[0], 0, -u[1]]],
    [-1, 1, 1, 1, [n[0], 0, n[1]]],
    [1, -1, -1, -1, [-n[0], 0, -n[1]]],
  ];
  // each face runs between two outline corners (a0,b0) -> (a1,b1); the hint fixes the winding
  for (const [a0, b0, a1, b1, hint] of sides) {
    gb.quad(P(a0, b0, y0), P(a1, b1, y0), P(a1, b1, y1), P(a0, b0, y1), color, hint);
  }
  gb.quad(P(1, 1, y1), P(1, -1, y1), P(-1, -1, y1), P(-1, 1, y1), color, [0, 1, 0]);
}

function roundTower(gb: GeomBuilder, x: number, z: number, r: number, h: number, wallMat: number, roofMat: number) {
  const sides = 14;
  gb.curMat = wallMat;
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2, am = (a0 + a1) / 2;
    const p = (a: number, y: number) => [x + Math.cos(a) * r, y, z + Math.sin(a) * r];
    gb.quad(p(a0, -0.3), p(a1, -0.3), p(a1, h), p(a0, h), brick, [Math.cos(am), 0, Math.sin(am)]);
  }
  // corbelled ring under the roof
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2, am = (a0 + a1) / 2;
    const p = (a: number, rr: number, y: number) => [x + Math.cos(a) * rr, y, z + Math.sin(a) * rr];
    gb.quad(p(a0, r, h), p(a1, r, h), p(a1, r + 0.45, h + 0.8), p(a0, r + 0.45, h + 0.8), stone, [Math.cos(am), -0.4, Math.sin(am)]);
  }
  gb.curMat = roofMat;
  const rr = r + 0.6, rh = r * 2.1;
  for (let i = 0; i < sides; i++) {
    const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2, am = (a0 + a1) / 2;
    gb.tri([x + Math.cos(a0) * rr, h + 0.8, z + Math.sin(a0) * rr], [x + Math.cos(a1) * rr, h + 0.8, z + Math.sin(a1) * rr], [x, h + 0.8 + rh, z], slate, [Math.cos(am), 0.5, Math.sin(am)]);
  }
  gb.curMat = wallMat;
}

export function buildWalls(data: WallData, set: MaterialSet, col: WorldCollision, mat: THREE.Material, waterMat: THREE.Material) {
  const group = new THREE.Group();
  const gb = new GeomBuilder();
  const wallMat = set.index.brickOld + 0.31;
  const stoneMat = set.index.stone + 0.62;
  const roofMat = set.index.roofSlate + 0.17;
  gb.curMat = wallMat;

  let ring = data.ring.map(([x, z]) => [x, z] as [number, number]);
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x0, z0] = ring[i], [x1, z1] = ring[(i + 1) % ring.length];
    area += x0 * z1 - x1 * z0;
  }
  if (area < 0) ring = ring.reverse();
  const gates = Object.entries(data.gates);
  const nearGate = (x: number, z: number, r: number) => gates.some(([, [gx, gz]]) => Math.hypot(gx - x, gz - z) < r);

  // ---- curtain wall, walk and crenellations, sampled every ~2.6 m along the ring
  let id = -900000;
  let sinceTower = TOWER_EVERY * 0.5;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.5) continue;
    const u: [number, number] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    const out: [number, number] = [u[1], -u[0]]; // outward for a counter-clockwise ring
    const steps = Math.max(1, Math.round(len / 2.6));
    const step = len / steps;
    for (let k = 0; k < steps; k++) {
      const t = (k + 0.5) * step;
      const c: [number, number] = [a[0] + u[0] * t, a[1] + u[1] * t];
      if (nearGate(c[0], c[1], GATE_GAP)) continue;
      // ironstone footing, brick above (slightly overlapping pieces so corners close)
      gb.curMat = stoneMat;
      box(gb, c, u, step / 2 + 0.35, WALL_T / 2 + 0.25, -0.3, 1.6, stone);
      gb.curMat = wallMat;
      box(gb, c, u, step / 2 + 0.35, WALL_T / 2, 1.6, WALL_H, brick);
      // merlon on the outer edge, every other piece
      if (k % 2 === 0) {
        const m: [number, number] = [c[0] + out[0] * (WALL_T / 2 - 0.3), c[1] + out[1] * (WALL_T / 2 - 0.3)];
        box(gb, m, u, 0.65, 0.3, WALL_H, WALL_H + 1.1, brick);
      }
      // collision: the wall is a narrow, tall footprint
      const q: number[] = [];
      for (const [su, sn] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        q.push(c[0] + u[0] * su * (step / 2 + 0.2) - u[1] * sn * WALL_T / 2, c[1] + u[1] * su * (step / 2 + 0.2) + u[0] * sn * WALL_T / 2);
      }
      col.add(analyse({ id: id--, p: q, h: WALL_H + 1, r: 'f', t: 'wall' }));

      sinceTower += step;
      if (sinceTower > TOWER_EVERY && !nearGate(c[0], c[1], 30)) {
        sinceTower = 0;
        // half-round tower projecting out of the wall
        const tx = c[0] + out[0] * 1.6, tz = c[1] + out[1] * 1.6;
        const h = WALL_H + 2.5 + hash01(i * 31 + k) * 1.5;
        roundTower(gb, tx, tz, 3.3, h, wallMat, roofMat);
        col.addColumn(tx, tz, 3.4, h + 1);
      }
    }
  }

  // ---- gatehouses: two round towers flanking an arched passage, a gate hall above
  for (const [, [gx, gz]] of gates) {
    // wall direction at the gate: from the nearest ring segment
    let best = 0, bd = Infinity;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((gx - a[0]) * dx + (gz - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      const d = Math.hypot(a[0] + dx * t - gx, a[1] + dz * t - gz);
      if (d < bd) { bd = d; best = i; }
    }
    const a = ring[best], b = ring[(best + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const u: [number, number] = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
    const out: [number, number] = [u[1], -u[0]];
    for (const s of [-1, 1]) {
      const tx = gx + u[0] * s * 6.8 + out[0] * 1.5, tz = gz + u[1] * s * 6.8 + out[1] * 1.5;
      roundTower(gb, tx, tz, 3.8, 14, wallMat, roofMat);
      col.addColumn(tx, tz, 3.9, 15);
    }
    // the gate hall bridges the passage above head height (no collision below it)
    gb.curMat = stoneMat;
    box(gb, [gx, gz], u, 4.2, 4.2, 6.2, 12.5, stone);
    gb.curMat = wallMat;
    // a steep roof over the gate hall
    gb.curMat = roofMat;
    const n: [number, number] = [-u[1], u[0]];
    const P = (su: number, sn: number, y: number) => [gx + u[0] * su * 4.6 + n[0] * sn * 4.6, y, gz + u[1] * su * 4.6 + n[1] * sn * 4.6];
    gb.tri(P(-1, -1, 12.5), P(1, -1, 12.5), P(1, 0, 17.5), slate, [-n[0], 0.6, -n[1]]);
    gb.tri(P(-1, -1, 12.5), P(1, 0, 17.5), P(-1, 0, 17.5), slate, [-n[0], 0.6, -n[1]]);
    gb.tri(P(1, 1, 12.5), P(-1, 1, 12.5), P(-1, 0, 17.5), slate, [n[0], 0.6, n[1]]);
    gb.tri(P(1, 1, 12.5), P(-1, 0, 17.5), P(1, 0, 17.5), slate, [n[0], 0.6, n[1]]);
    gb.tri(P(1, -1, 12.5), P(1, 1, 12.5), P(1, 0, 17.5), slate, [u[0], 0.3, u[1]]);
    gb.tri(P(-1, 1, 12.5), P(-1, -1, 12.5), P(-1, 0, 17.5), slate, [-u[0], 0.3, -u[1]]);
    gb.curMat = wallMat;
  }

  const mesh = new THREE.Mesh(gb.build(), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // ---- moat: a ribbon of water outside the wall, crossed by earth causeways at the gates
  const moat = new GeomBuilder();
  const white = new THREE.Color(1, 1, 1);
  const OFF = 16, HALF = 9;
  const m = ring.length;
  const offset = (i: number, d: number): [number, number] => {
    const p = ring[i], prev = ring[(i - 1 + m) % m], next = ring[(i + 1) % m];
    let nx = (p[1] - prev[1]) / (Math.hypot(p[0] - prev[0], p[1] - prev[1]) || 1) + (next[1] - p[1]) / (Math.hypot(next[0] - p[0], next[1] - p[1]) || 1);
    let nz = -(p[0] - prev[0]) / (Math.hypot(p[0] - prev[0], p[1] - prev[1]) || 1) - (next[0] - p[0]) / (Math.hypot(next[0] - p[0], next[1] - p[1]) || 1);
    const l = Math.hypot(nx, nz) || 1;
    nx /= l; nz /= l;
    return [p[0] + nx * d, p[1] + nz * d];
  };
  for (let i = 0; i < m; i++) {
    const a0 = offset(i, OFF - HALF), a1 = offset(i, OFF + HALF);
    const b0 = offset((i + 1) % m, OFF - HALF), b1 = offset((i + 1) % m, OFF + HALF);
    const segLen = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]);
    const pieces = Math.max(1, Math.ceil(segLen / 4));
    for (let k = 0; k < pieces; k++) {
      const t0 = k / pieces, t1 = (k + 1) / pieces;
      const L = (p: [number, number], q: [number, number], t: number) => [p[0] + (q[0] - p[0]) * t, 0.04, p[1] + (q[1] - p[1]) * t];
      const p0 = L(a0, b0, t0), p1 = L(a0, b0, t1), p2 = L(a1, b1, t1), p3 = L(a1, b1, t0);
      const cx = (p0[0] + p2[0]) / 2, cz = (p0[2] + p2[2]) / 2;
      if (nearGate(cx, cz, 16)) continue;
      moat.quad(p0, p1, p2, p3, white, [0, 1, 0]);
    }
  }
  const water = new THREE.Mesh(moat.build(), waterMat);
  water.renderOrder = -14;
  water.receiveShadow = true;
  water.frustumCulled = false;
  group.add(water);
  return group;
}

/** Point-in-polygon test for "inside the walls". */
export function makeTownTest(ring: [number, number][]) {
  return (x: number, z: number) => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, zi] = ring[i], [xj, zj] = ring[j];
      if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  };
}

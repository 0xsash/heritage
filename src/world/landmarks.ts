// Hand-shaped landmarks layered on top of the real footprints: church towers
// (the skyline you navigate by), Sint-Sulpitius' "Mustard Pot", the domed
// basilica of Scherpenheuvel, city gates, Holle Griet, the Round Table mound
// and the impossible Root-Oak.

import * as THREE from 'three';
import { hash01 } from '../core/math';
import type { WorldCollision } from './collision';
import type { Footprint } from './footprint';
import { GeomBuilder } from './geom';
import type { MaterialSet } from '../render/textures';
import * as P from './palette';

const SLATE = new THREE.Color('#3a3e46');

function prism(gb: GeomBuilder, cx: number, cz: number, r: number, sides: number, y0: number, y1: number, color: THREE.Color, rot = 0, r1 = r) {
  for (let i = 0; i < sides; i++) {
    const a0 = rot + (i / sides) * Math.PI * 2, a1 = rot + ((i + 1) / sides) * Math.PI * 2;
    const p = (a: number, rr: number, y: number) => [cx + Math.cos(a) * rr, y, cz + Math.sin(a) * rr];
    const am = (a0 + a1) / 2;
    gb.quad(p(a0, r, y0), p(a1, r, y0), p(a1, r1, y1), p(a0, r1, y1), color, [Math.cos(am), 0, Math.sin(am)]);
  }
  // cap
  for (let i = 0; i < sides; i++) {
    const a0 = rot + (i / sides) * Math.PI * 2, a1 = rot + ((i + 1) / sides) * Math.PI * 2;
    gb.tri([cx, y1, cz], [cx + Math.cos(a0) * r1, y1, cz + Math.sin(a0) * r1], [cx + Math.cos(a1) * r1, y1, cz + Math.sin(a1) * r1], color, [0, 1, 0]);
  }
}

function spire(gb: GeomBuilder, cx: number, cz: number, r: number, sides: number, y0: number, h: number, color: THREE.Color, rot = 0) {
  const prev = gb.curMat;
  gb.curMat = M.slate;
  for (let i = 0; i < sides; i++) {
    const a0 = rot + (i / sides) * Math.PI * 2, a1 = rot + ((i + 1) / sides) * Math.PI * 2;
    const am = (a0 + a1) / 2;
    gb.tri([cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], [cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r], [cx, y0 + h, cz], color, [Math.cos(am), 0.4, Math.sin(am)]);
  }
  gb.curMat = prev;
}

/** Rotated box (square tower) aligned with the footprint axis. */
function towerBox(gb: GeomBuilder, cx: number, cz: number, ux: number, uz: number, half: number, y0: number, y1: number, color: THREE.Color) {
  const nx = -uz, nz = ux;
  const c = [
    [cx + (ux + nx) * half, cz + (uz + nz) * half],
    [cx + (ux - nx) * half, cz + (uz - nz) * half],
    [cx + (-ux - nx) * half, cz + (-uz - nz) * half],
    [cx + (-ux + nx) * half, cz + (-uz + nz) * half],
  ];
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4];
    const mx = (a[0] + b[0]) / 2 - cx, mz = (a[1] + b[1]) / 2 - cz;
    gb.quad([a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y1, b[1]], [a[0], y1, a[1]], color, [mx, 0, mz], [0, y0, -2], [0, y0, -2], [0, y1, -2], [0, y1, -2]);
  }
  gb.tri([c[0][0], y1, c[0][1]], [c[1][0], y1, c[1][1]], [c[2][0], y1, c[2][1]], color, [0, 1, 0]);
  gb.tri([c[0][0], y1, c[0][1]], [c[2][0], y1, c[2][1]], [c[3][0], y1, c[3][1]], color, [0, 1, 0]);
  return c;
}

let M = { stone: 0, slate: 0, brick: 0, grass: 0 };

export interface LandmarkResult {
  group: THREE.Group;
  extraPois: { n: string; x: number; z: number; k: string }[];
}

export function buildLandmarks(
  footprints: Footprint[],
  pois: { n: string; x: number; z: number; k: string }[],
  col: WorldCollision,
  buildingMat: THREE.Material,
  set: MaterialSet,
  year = 2000,
): LandmarkResult {
  const group = new THREE.Group();
  const gb = new GeomBuilder();
  M = { stone: set.index.stone + 0.5, slate: set.index.roofSlate + 0.5, brick: set.index.brickOld + 0.5, grass: set.index.plaster + 0.5 };
  gb.curMat = M.stone;
  const extraPois: LandmarkResult['extraPois'] = [];

  for (const f of footprints) {
    const isChurch = f.kind === 'church' || f.kind === 'cathedral';
    const isChapel = f.kind === 'chapel';
    if (f.name === 'Sint-Sulpitius en Dionysiuskerk') {
      sulpitius(gb, f, col, group, year);
      continue;
    }
    if (f.kind === 'basilica') {
      basilica(gb, f, col, group);

      continue;
    }
    if (isChurch && f.hu * f.hw * 4 > 180) {
      // Tower at the west-most end of the long axis.
      const end = f.ux * 1 > 0 ? -1 : 1;
      const side = Math.min(Math.max(f.hw * 1.15, 3.5), 8);
      const tx = f.cx + f.ux * (f.hu - side * 0.5) * end;
      const tz = f.cz + f.uz * (f.hu - side * 0.5) * end;
      const H = f.h + f.rise + 7 + hash01(f.id) * 12;
      towerBox(gb, tx, tz, f.ux, f.uz, side / 2, 0, H, P.IRONSTONE);
      // belfry openings band
      towerBox(gb, tx, tz, f.ux, f.uz, side / 2 + 0.25, H - 4.2, H - 3.6, P.IRONSTONE_DARK);
      const rot = Math.atan2(f.uz, f.ux) + Math.PI / 8;
      spire(gb, tx, tz, side * 0.62, 8, H, side * 2.6, SLATE, rot);
      prism(gb, tx, tz, 0.25, 6, H + side * 2.6 - 0.3, H + side * 2.6 + 1.4, P.GOLD);
      col.addColumn(tx, tz, side * 0.7, H + side * 1.2);
    } else if (isChapel || (isChurch && f.rise > 0)) {
      // small roof turret (dakruiter)
      const y0 = f.h + f.rise - 0.4;
      prism(gb, f.cx, f.cz, 0.9, 6, y0, y0 + 2.2, P.IRONSTONE_DARK);
      spire(gb, f.cx, f.cz, 1.1, 6, y0 + 2.2, 4.5, SLATE);
    }
  }

  for (const p of pois) {
    if (p.n === 'Holle Griet') cannon(group, p.x, p.z);
    if (p.n === 'De Heilige Eik') {
      rootOak(group, p.x, p.z, col);
      continue;
    }
    if (p.n === 'Tafelrondmotte') motte(gb, p.x, p.z, col);
  }

  const mesh = new THREE.Mesh(gb.build(), buildingMat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return { group, extraPois };
}

// --- Sint-Sulpitius: brown ironstone tower with the bell-shaped "Mustard Pot" lantern
function sulpitius(gb: GeomBuilder, f: Footprint, col: WorldCollision, group: THREE.Group, year: number) {
  const end = f.ux > 0 ? -1 : 1; // west end
  const half = Math.min(f.hw * 0.75, 6.5);
  const tx = f.cx + f.ux * (f.hu - half) * end;
  const tz = f.cz + f.uz * (f.hu - half) * end;
  const H = 34;
  towerBox(gb, tx, tz, f.ux, f.uz, half, 0, H, P.IRONSTONE);
  towerBox(gb, tx, tz, f.ux, f.uz, half + 0.35, 14, 14.8, P.IRONSTONE_DARK);
  towerBox(gb, tx, tz, f.ux, f.uz, half + 0.35, H - 0.8, H, P.IRONSTONE_DARK);
  // corner pinnacles
  const nx = -f.uz, nz = f.ux;
  for (const [a, b] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) {
    const px = tx + (f.ux * a + nx * b) * (half - 0.6);
    const pz = tz + (f.uz * a + nz * b) * (half - 0.6);
    spire(gb, px, pz, 0.7, 4, H, 3.2, P.IRONSTONE_DARK);
  }
  // octagonal drum
  prism(gb, tx, tz, half * 0.62, 8, H, H + 4, P.IRONSTONE_DARK, Math.PI / 8);
  col.addColumn(tx, tz, half * 1.1, H);

  if (year < 1650) {
    // Before the Baroque carillon lantern ("the Mustard Pot") the tower stood
    // unfinished: a squat stump of ironstone under a low provisional roof.
    const prev = gb.curMat;
    gb.curMat = M.slate;
    spire(gb, tx, tz, half * 0.95, 4, H + 4, half * 0.9, SLATE, Math.atan2(f.uz, f.ux) + Math.PI / 4);
    gb.curMat = prev;
    return;
  }
  // the bell-shaped cupola (lathe)
  const prof: THREE.Vector2[] = [];
  const R = half * 0.72;
  const pts: [number, number][] = [
    [R * 1.0, 0], [R * 1.08, 0.6], [R * 1.02, 1.8], [R * 0.86, 3.4], [R * 0.62, 5.0], [R * 0.5, 6.0],
    [R * 0.56, 6.8], [R * 0.4, 7.6], [R * 0.18, 8.4], [R * 0.16, 10.2], [R * 0.3, 10.6], [0.05, 12.2],
  ];
  for (const [r, y] of pts) prof.push(new THREE.Vector2(r, y));
  const lathe = new THREE.LatheGeometry(prof, 24);
  const pot = new THREE.Mesh(
    lathe,
    new THREE.MeshStandardMaterial({ color: '#39443f', roughness: 0.5, metalness: 0.55 }),
  );
  pot.position.set(tx, H + 4, tz);
  pot.castShadow = true;
  group.add(pot);
  const ball = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.55, 1),
    new THREE.MeshStandardMaterial({ color: P.GOLD, roughness: 0.3, metalness: 0.9, emissive: '#4a3510' }),
  );
  ball.position.set(tx, H + 4 + 12.4, tz);
  group.add(ball);
}

// --- Scherpenheuvel basilica: heptagonal domed church
function basilica(gb: GeomBuilder, f: Footprint, col: WorldCollision, group: THREE.Group) {
  const r = Math.min(f.hw, f.hu) * 0.62;
  const cx = (f.minX + f.maxX) / 2, cz = (f.minZ + f.maxZ) / 2;
  const stone = new THREE.Color('#cdc2ab');
  prism(gb, cx, cz, r * 0.95, 7, 0, 22, stone, 0);
  prism(gb, cx, cz, r * 1.02, 7, 21, 23, new THREE.Color('#b5a88f'), 0);
  prism(gb, cx, cz, r * 0.66, 14, 23, 30, stone, 0);
  col.addColumn(cx, cz, r, 30);
  const prof: THREE.Vector2[] = [];
  const R = r * 0.66;
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2);
    prof.push(new THREE.Vector2(Math.cos(a) * R, Math.sin(a) * R * 1.15));
  }
  const dome = new THREE.Mesh(
    new THREE.LatheGeometry(prof, 28),
    new THREE.MeshStandardMaterial({ color: '#465a60', roughness: 0.45, metalness: 0.5 }),
  );
  dome.position.set(cx, 30, cz);
  dome.castShadow = true;
  group.add(dome);
  // gilded stars on the dome
  const starMat = new THREE.MeshStandardMaterial({ color: P.GOLD, metalness: 0.9, roughness: 0.25, emissive: '#3a2a08' });
  const starGeo = new THREE.OctahedronGeometry(0.6, 0);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2 * 3.3;
    const el = 0.25 + (i % 4) * 0.17;
    const s = new THREE.Mesh(starGeo, starMat);
    s.position.set(cx + Math.cos(a) * Math.cos(el) * R * 1.01, 30 + Math.sin(el) * R * 1.16, cz + Math.sin(a) * Math.cos(el) * R * 1.01);
    group.add(s);
  }
  prism(gb, cx, cz, 1.6, 8, 30 + R * 1.15 - 0.5, 30 + R * 1.15 + 3.5, stone);
  spire(gb, cx, cz, 1.9, 8, 30 + R * 1.15 + 3.5, 3, new THREE.Color('#4a6474'));
}

// --- Holle Griet, the cannon
function cannon(group: THREE.Group, x: number, z: number) {
  const g = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ color: '#5b4a2a', metalness: 0.8, roughness: 0.4, flatShading: true });
  const wood = new THREE.MeshStandardMaterial({ color: '#4a3220', roughness: 0.9, flatShading: true });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.6, 4.2, 10), bronze);
  barrel.rotation.z = Math.PI / 2 - 0.12;
  barrel.position.y = 1.2;
  g.add(barrel);
  const carriage = new THREE.Mesh(new THREE.BoxGeometry(3, 0.5, 1.2), wood);
  carriage.position.y = 0.55;
  g.add(carriage);
  for (const s of [-0.75, 0.75]) {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.18, 12), wood);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(-0.4, 0.7, s);
    g.add(wheel);
  }
  g.position.set(x, 0, z);
  g.rotation.y = 0.6;
  g.traverse((o) => (o.castShadow = true));
  group.add(g);
}

// --- Tafelrondmotte: grassy castle mound
function motte(gb: GeomBuilder, x: number, z: number, col: WorldCollision) {
  const grass = new THREE.Color('#5d7a3a');
  gb.curMat = M.grass;
  const rings = [
    [26, 0],
    [20, 3.5],
    [12, 6.5],
    [9, 7],
  ];
  for (let i = 0; i < rings.length - 1; i++) prism(gb, x, z, rings[i][0], 18, rings[i][1], rings[i + 1][1], grass, 0, rings[i + 1][0]);
  col.addColumn(x, z, 14, 6.5);
  col.addColumn(x, z, 20, 3.5);
  gb.curMat = M.stone;
}

// --- The Root-Oak (fantasy): the tree itself is planted by the tree system at
// three times natural size; here we add what should not be there — the lights.
function rootOak(group: THREE.Group, x: number, z: number, col: WorldCollision) {
  const g = new THREE.Group();
  const glow = new THREE.MeshStandardMaterial({ color: '#b8f0c8', emissive: '#7fe0a8', emissiveIntensity: 3.0 });
  const geo = new THREE.IcosahedronGeometry(0.16, 1);
  const r = (s: number) => hash01(s);
  for (let i = 0; i < 60; i++) {
    const m = new THREE.Mesh(geo, glow);
    const a = r(i + 200) * Math.PI * 2, d = 4 + r(i + 400) * 22;
    m.position.set(Math.cos(a) * d, 2 + r(i + 300) * 44, Math.sin(a) * d);
    m.userData.float = r(i + 500) * 10;
    g.add(m);
  }
  g.position.set(x, 0, z);
  g.name = 'rootOak';
  group.add(g);
  col.addColumn(x, z, 3.5, 30);
}

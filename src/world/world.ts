// Assembles the playable world from real OSM data, dressed with photographic
// PBR materials.

import * as THREE from 'three';
import { hash01, rng } from '../core/math';
import type { MaterialSet } from '../render/textures';
import { addBuilding, makeBuildingMaterial, setTownTest, styleFor } from './buildings';
import { WorldCollision } from './collision';
import { analyse, pointInRing, toRing, type Footprint } from './footprint';
import { GeomBuilder, triangulate } from './geom';
import { makeGroundMaterial, makeWaterMaterial } from './ground';
import { buildLandmarks } from './landmarks';
import { LORE } from './lore';
import { LAND, ROAD, pick } from './palette';
import { TreeRenderer, type TreeAtlas, type TreeItem } from './trees';
import { buildWalls, makeTownTest } from './walls';
import type { PoiData, RoadData, WorldData } from './types';

const CHUNK = 400;
// Overlays sit a few centimetres above the base ground so they never z-fight.
const Y_LAND = 0.02, Y_WATER = 0.035, Y_ROAD = 0.05;

export interface Discovery {
  key: string;
  title: string;
  text: string;
  x: number;
  z: number;
  r: number;
  major: boolean;
  found: boolean;
}

export interface NamedSegment {
  name: string;
  ax: number; az: number; bx: number; bz: number;
}

export interface WorldAssets {
  build: MaterialSet;
  ground: MaterialSet;
  trees: TreeAtlas | null;
}

export class World {
  group = new THREE.Group();
  collision = new WorldCollision();
  footprints: Footprint[] = [];
  discoveries: Discovery[] = [];
  streets: NamedSegment[] = [];
  private streetGrid = new Map<number, NamedSegment[]>();
  uniforms = { uNight: { value: 0 }, uTime: { value: 0 } };
  demerMat!: THREE.MeshStandardMaterial;
  oak?: THREE.Object3D;
  /** inside the town walls? (a rough circle when the world has no wall data) */
  inTown: (x: number, z: number) => boolean = (x, z) => Math.hypot(x, z) < 680;
  private plainWater!: THREE.MeshStandardMaterial;
  private cullables: THREE.Mesh[] = [];
  /** cells (4 m) covered by roads or water, where trees must not stand */
  private blocked = new Set<number>();

  constructor(public data: WorldData, private assets: WorldAssets) {
    if (data.walls) {
      this.inTown = makeTownTest(data.walls.ring);
      setTownTest(this.inTown);
    }
  }

  /** Distance culling for building and tree chunks (the haze hides the cut). */
  cull(cam: THREE.Vector3) {
    for (const m of this.cullables) {
      // instanced meshes: the geometry's sphere is one local tree; the mesh's own sphere covers all instances
      const im = m as THREE.InstancedMesh;
      const s = im.isInstancedMesh ? im.boundingSphere : m.geometry.boundingSphere;
      if (!s) continue;
      const d = Math.hypot(s.center.x - cam.x, s.center.z - cam.z) - s.radius;
      m.visible = d < m.userData.cullDist;
    }
  }

  build(onProgress: (msg: string) => void) {
    onProgress('Raising the polders…');
    this.buildGround();
    onProgress('Ploughing the Hageland…');
    this.buildLand();
    onProgress('Letting in the Demer…');
    this.buildWater();
    onProgress('Laying cobbles…');
    this.buildRoads();
    onProgress('Building Diest, brick by brick…');
    this.buildBuildings();
    onProgress('Planting willows and poplars…');
    this.buildTrees();
    this.buildDiscoveries();
  }

  private addGroundMesh(geo: THREE.BufferGeometry, mat: THREE.Material, order: number) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = order;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    this.group.add(mesh);
    return mesh;
  }

  // ---------------- ground ----------------
  private buildGround() {
    const [x0, z0, x1, z1] = this.data.bounds;
    const margin = 9000;
    const w = x1 - x0 + margin * 2, d = z1 - z0 + margin * 2;
    const geo = new THREE.PlaneGeometry(w, d, 220, 120);
    geo.rotateX(-Math.PI / 2);
    geo.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const pos = geo.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const mats = new Float32Array(pos.count);
    const walls = new Float32Array(pos.count * 3);
    const tints = [...LAND.meadow.tints, ...LAND.farm.tints];
    const layer = this.assets.ground.index.meadow;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      // a patchwork of fields beyond the mapped area
      const fx = Math.floor(pos.getX(i) / 180), fz = Math.floor(pos.getZ(i) / 140);
      c.copy(tints[Math.floor(hash01(fx * 7919 + fz * 104729) * tints.length)]);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
      mats[i] = layer;
      walls[i * 3 + 2] = 1; // open farmland beyond the mapped area
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.setAttribute('aMat', new THREE.BufferAttribute(mats, 1));
    geo.setAttribute('aWall', new THREE.BufferAttribute(walls, 3));
    this.addGroundMesh(geo, makeGroundMaterial(this.assets.ground, 'base'), -20);
  }

  // ---------------- land cover ----------------
  private buildLand() {
    const gb = new GeomBuilder();
    const idx = this.assets.ground.index;
    const c = new THREE.Color();
    for (let li = 0; li < this.data.land.length; li++) {
      const l = this.data.land[li];
      let surf = LAND[l.k];
      if (!surf) continue;
      let tag = [0, 0, 0];
      const a = hash01(li * 17 + 3) * Math.PI;
      if (l.k === 'farm') {
        // some fields lie ploughed
        if (hash01(li * 31 + 9) < 0.2) surf = LAND.soil;
        tag = [a, 0, 1];
      } else if (l.k === 'meadow' || l.k === 'grass') {
        tag = [a, 0, 3];
      }
      const ring = toRing(l.p);
      c.copy(pick(surf.tints, li * 13 + 7)).multiplyScalar(0.94 + hash01(li * 3) * 0.12);
      gb.curMat = idx[surf.mat];
      for (const [a, b, cc] of triangulate(ring)) {
        gb.tri([ring[a][0], Y_LAND, ring[a][1]], [ring[b][0], Y_LAND, ring[b][1]], [ring[cc][0], Y_LAND, ring[cc][1]], c, [0, 1, 0], tag, tag, tag);
      }
    }
    this.addGroundMesh(gb.build(), makeGroundMaterial(this.assets.ground, 'land'), -19);
  }

  private block(x: number, z: number, r: number) {
    const n = Math.ceil(r / 4);
    const cx = Math.floor(x / 4), cz = Math.floor(z / 4);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) this.blocked.add((cx + i + 4096) * 8192 + (cz + j + 4096));
  }

  private blockLine(p: number[], width: number) {
    for (let i = 0; i + 3 < p.length; i += 2) {
      const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3];
      const len = Math.hypot(bx - ax, bz - az);
      const steps = Math.max(1, Math.ceil(len / 3));
      for (let s = 0; s <= steps; s++) this.block(ax + ((bx - ax) * s) / steps, az + ((bz - az) * s) / steps, width / 2);
    }
  }

  private isBlocked(x: number, z: number) {
    return this.blocked.has((Math.floor(x / 4) + 4096) * 8192 + (Math.floor(z / 4) + 4096));
  }

  // ---------------- water ----------------
  private buildWater() {
    const plain = makeWaterMaterial(this.uniforms, '#232f2b');
    this.plainWater = plain;
    // The Demer: "dark water". Blacker than it should be, with a faint uncanny sheen.
    this.demerMat = makeWaterMaterial(this.uniforms, '#0f1716', '#0a2b25');
    const white = new THREE.Color(1, 1, 1);
    const areas = new GeomBuilder();
    for (const p of this.data.waterAreas) {
      const ring = toRing(p);
      for (const [a, b, c] of triangulate(ring)) {
        areas.tri([ring[a][0], Y_WATER, ring[a][1]], [ring[b][0], Y_WATER, ring[b][1]], [ring[c][0], Y_WATER, ring[c][1]], white, [0, 1, 0]);
      }
      for (let i = 0; i < ring.length; i += 1) this.block(ring[i][0], ring[i][1], 3);
    }
    this.addGroundMesh(areas.build(), plain, -15);
    const demer = new GeomBuilder();
    const other = new GeomBuilder();
    for (const wl of this.data.waterLines) {
      const isDemer = (wl.n ?? '').toLowerCase().includes('demer');
      ribbon(isDemer ? demer : other, wl.p, wl.w, white, Y_WATER, false);
      this.blockLine(wl.p, wl.w + 2);
    }
    this.addGroundMesh(other.build(), plain, -14);
    this.addGroundMesh(demer.build(), this.demerMat, -14);
  }

  // ---------------- roads ----------------
  private buildRoads() {
    const gb = new GeomBuilder();
    const idx = this.assets.ground.index;
    const c = new THREE.Color();
    const order = ['track', 'path', 'footway', 'cycleway', 'bridleway', 'steps', 'service', 'rail', 'unclassified', 'living_street', 'residential', 'pedestrian', 'tertiary', 'secondary', 'primary', 'trunk', 'motorway'];
    const minor = new Set(['track', 'path', 'footway', 'cycleway', 'bridleway', 'steps']);
    const roads = this.data.roads.slice().sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k));
    for (let i = 0; i < roads.length; i++) {
      const r = roads[i];
      const mid = midpoint(r);
      const inTown = this.data.walls ? r.c === 1 : Math.hypot(mid[0], mid[1]) < 680;
      const kind = r.k === 'rail' ? ROAD.rail : minor.has(r.k) ? ROAD.path : inTown || r.k === 'pedestrian' || r.k === 'living_street' ? ROAD.cobble : ROAD.dirt;
      c.set(kind.tint).multiplyScalar(0.93 + hash01(i * 7) * 0.14);
      gb.curMat = idx[kind.mat];
      // medieval roads are narrower than modern ones; the soft edge needs a little extra width
      const w = (r.k === 'motorway' || r.k === 'trunk' ? 9 : Math.min(r.w, 8)) * 1.25;
      ribbon(gb, r.p, w, c, Y_ROAD, true);
      this.blockLine(r.p, w + 1.5);
      if (r.n) this.addStreet(r);
    }
    this.addGroundMesh(gb.build(), makeGroundMaterial(this.assets.ground, 'road'), -12);
  }

  private addStreet(r: RoadData) {
    for (let i = 0; i + 3 < r.p.length; i += 2) {
      const s: NamedSegment = { name: r.n!, ax: r.p[i], az: r.p[i + 1], bx: r.p[i + 2], bz: r.p[i + 3] };
      this.streets.push(s);
      const x0 = Math.floor(Math.min(s.ax, s.bx) / 64), x1 = Math.floor(Math.max(s.ax, s.bx) / 64);
      const z0 = Math.floor(Math.min(s.az, s.bz) / 64), z1 = Math.floor(Math.max(s.az, s.bz) / 64);
      for (let x = x0; x <= x1; x++)
        for (let z = z0; z <= z1; z++) {
          const k = (x + 2048) * 4096 + (z + 2048);
          let l = this.streetGrid.get(k);
          if (!l) this.streetGrid.set(k, (l = []));
          l.push(s);
        }
    }
  }

  /** Nearest named street within maxD metres. */
  streetAt(x: number, z: number, maxD = 18): string | null {
    const l = this.streetGrid.get((Math.floor(x / 64) + 2048) * 4096 + (Math.floor(z / 64) + 2048));
    if (!l) return null;
    let best: string | null = null, bd = maxD * maxD;
    for (const s of l) {
      const dx = s.bx - s.ax, dz = s.bz - s.az;
      const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz || 1)));
      const ex = s.ax + dx * t - x, ez = s.az + dz * t - z;
      const d = ex * ex + ez * ez;
      if (d < bd) { bd = d; best = s.name; }
    }
    return best;
  }

  // ---------------- buildings ----------------
  private buildBuildings() {
    const set = this.assets.build;
    const mat = makeBuildingMaterial(set, this.uniforms);
    const chunks = new Map<string, GeomBuilder>();
    for (const b of this.data.buildings) {
      const f = analyse(b);
      this.footprints.push(f);
      this.collision.add(f);
      const key = Math.floor(f.cx / CHUNK) + ',' + Math.floor(f.cz / CHUNK);
      let gb = chunks.get(key);
      if (!gb) chunks.set(key, (gb = new GeomBuilder()));
      addBuilding(gb, f, styleFor(f), set);
    }
    for (const gb of chunks.values()) {
      const mesh = new THREE.Mesh(gb.build(), mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.cullDist = 5200;
      this.cullables.push(mesh);
      this.group.add(mesh);
    }
    if (this.data.walls) this.group.add(buildWalls(this.data.walls, set, this.collision, mat, this.plainWater));
    const lm = buildLandmarks(this.footprints, this.data.pois, this.collision, mat, set, this.data.year);
    this.group.add(lm.group);
    this.oak = lm.group.getObjectByName('rootOak');
    this.data.pois.push(...lm.extraPois);
  }

  // ---------------- trees ----------------
  private buildTrees() {
    const atlas = this.assets.trees;
    if (!atlas) return;
    const renderer = new TreeRenderer(atlas);
    const rand = rng(1302);
    const items: TreeItem[] = [];
    const MAX = 60000;
    const has = (s: string) => !!atlas.species[s];
    const add = (x: number, z: number, species: string, scale = 1, force = false) => {
      if (items.length >= MAX || !has(species)) return;
      if (!force && (this.isBlocked(x, z) || this.collision.heightAround(x, z, 2.2) > 0)) return;
      const v = 0.82 + rand() * 0.3;
      const tint = new THREE.Color(v * (0.96 + rand() * 0.1), v, v * (0.9 + rand() * 0.12));
      items.push({ x, y: 0, z, species, scale: scale * (0.78 + rand() * 0.45), rot: rand() * Math.PI, tint });
    };

    // woods, parks, orchards
    const DENS: Record<string, number> = { wood: 1 / 60, park: 1 / 160, cemetery: 1 / 400, wet: 1 / 900, scrub: 1 / 520, farmyard: 1 / 900, meadow: 1 / 3200, farm: 1 / 14000, res: 1 / 520, grass: 1 / 2600 };
    for (let li = 0; li < this.data.land.length; li++) {
      const l = this.data.land[li];
      const ring = toRing(l.p);
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      for (const [x, z] of ring) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
      if (l.k === 'orchard') {
        // fruit trees stand in rows
        const a = hash01(li * 17 + 3) * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
        const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
        const R = Math.hypot(maxX - minX, maxZ - minZ) / 2;
        for (let u = -R; u <= R; u += 7) for (let v = -R; v <= R; v += 6) {
          const x = cx + ca * u - sa * v, z = cz + sa * u + ca * v;
          if (pointInRing(ring, x, z)) add(x, z, 'apple', 1);
        }
        continue;
      }
      const dens = DENS[l.k];
      if (!dens) continue;
      const n = Math.min(5000, Math.floor((maxX - minX) * (maxZ - minZ) * dens));
      // each wood leans towards one kind of tree
      const lean = hash01(li * 41 + 1);
      for (let i = 0; i < n; i++) {
        const x = minX + rand() * (maxX - minX), z = minZ + rand() * (maxZ - minZ);
        if (!pointInRing(ring, x, z)) continue;
        let sp = 'oak';
        const r = rand();
        if (l.k === 'wood') sp = lean < 0.25 ? (r < 0.7 ? 'pine' : 'oak') : r < 0.74 ? 'oak' : r < 0.86 ? 'poplar' : r < 0.94 ? 'pine' : 'willow';
        else if (l.k === 'scrub') sp = r < 0.55 ? 'pine' : r < 0.85 ? 'oak' : 'willow'; // heath: pines and scrub oak
        else if (l.k === 'wet' || l.k === 'meadow') sp = r < 0.7 ? 'willow' : 'poplar';
        else if (l.k === 'park') sp = r < 0.6 ? 'apple' : r < 0.9 ? 'oak' : 'willow'; // town gardens and orchards
        else if (l.k === 'res' || l.k === 'farmyard') sp = r < 0.45 ? 'apple' : r < 0.85 ? 'oak' : 'willow';
        add(x, z, sp, l.k === 'res' || l.k === 'park' ? 0.75 : l.k === 'scrub' ? 0.8 : 1);
      }
    }

    // pollard willows along ditches and streams; poplar rows along the river and canals
    for (let wi = 0; wi < this.data.waterLines.length; wi++) {
      const wl = this.data.waterLines[wi];
      const big = wl.k === 'river' || wl.k === 'canal';
      const species = big ? 'poplar' : 'willow';
      const spacing = big ? 15 : 24;
      const side0 = hash01(wi * 7) < 0.5 ? 1 : -1;
      alongLine(wl.p, spacing, (x, z, nx, nz, k) => {
        if (hash01(wi * 131 + k) < 0.3) return; // gaps
        const side = big ? side0 : k % 2 ? 1 : -1;
        const off = wl.w / 2 + (big ? 6 : 2.6);
        add(x + nx * off * side, z + nz * off * side, species, big ? 1 : 0.95);
      });
    }

    // poplar avenues along the main country roads
    for (let ri = 0; ri < this.data.roads.length; ri++) {
      const r = this.data.roads[ri];
      if (r.k !== 'primary' && r.k !== 'secondary' && r.k !== 'tertiary') continue;
      if (hash01(ri * 53 + 5) < 0.45) continue;
      alongLine(r.p, 18, (x, z, nx, nz, k) => {
        if (this.inTown(x, z) || Math.hypot(x, z) < 950) return;
        const off = Math.min(r.w, 8) * 0.62 + 4.5;
        for (const side of [1, -1]) {
          const tx = x + nx * off * side, tz = z + nz * off * side;
          if (this.collision.heightAround(tx, tz, 7) > 0) continue;
          if (hash01(ri * 17 + k * 3 + side) < 0.12) continue;
          add(tx, tz, 'poplar', 0.95, true);
        }
      });
    }

    // the Root-Oak of Scherpenheuvel: an oak three times the size it has any right to be
    const oak = this.data.pois.find((p) => p.n === 'De Heilige Eik' && p.k === 'oak');
    if (oak && has('oak')) {
      items.push({ x: oak.x, y: 0, z: oak.z, species: 'oak', scale: 3.1, rot: 0.4, tint: new THREE.Color(0.72, 0.86, 0.74) });
    }

    const perChunk = new Map<string, TreeItem[]>();
    for (const it of items) {
      const key = Math.floor(it.x / CHUNK) + ',' + Math.floor(it.z / CHUNK);
      let list = perChunk.get(key);
      if (!list) perChunk.set(key, (list = []));
      list.push(it);
    }
    for (const list of perChunk.values()) {
      const mesh = renderer.build(list);
      mesh.userData.cullDist = 3800;
      this.cullables.push(mesh);
      this.group.add(mesh);
    }
  }

  // ---------------- discoveries ----------------
  private buildDiscoveries() {
    const seen = new Set<string>();
    const add = (name: string, x: number, z: number) => {
      const lore = LORE[name];
      if (!lore || seen.has(name)) return;
      seen.add(name);
      this.discoveries.push({
        key: name, title: lore.title, text: lore.text, x, z,
        r: lore.r ?? 50, major: !!lore.major, found: false,
      });
    };
    for (const p of this.data.pois as PoiData[]) add(p.n, p.x, p.z);
    for (const f of this.footprints) if (f.name) add(f.name, f.cx, f.cz);
  }
}

function midpoint(r: RoadData): [number, number] {
  const i = Math.floor(r.p.length / 4) * 2;
  return [r.p[i], r.p[i + 1]];
}

/** Walk a polyline, calling back every `spacing` metres with the position and left normal. */
function alongLine(p: number[], spacing: number, cb: (x: number, z: number, nx: number, nz: number, k: number) => void) {
  let carry = spacing * 0.5, k = 0;
  for (let i = 0; i + 3 < p.length; i += 2) {
    const ax = p[i], az = p[i + 1], bx = p[i + 2], bz = p[i + 3];
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 0.01) continue;
    const dx = (bx - ax) / len, dz = (bz - az) / len;
    let t = carry;
    while (t < len) {
      cb(ax + dx * t, az + dz * t, -dz, dx, k++);
      t += spacing;
    }
    carry = t - len;
  }
}

/**
 * Flat ribbon along a polyline (mitred joins, round caps). With `edges` the
 * vertices carry an across-the-road coordinate (-1..1) for the soft-edge shader.
 */
function ribbon(gb: GeomBuilder, p: number[], width: number, color: THREE.Color, y: number, edges: boolean) {
  const n = p.length / 2;
  if (n < 2) return;
  const hw = width / 2;
  const L: number[][] = [], R: number[][] = [];
  for (let i = 0; i < n; i++) {
    const x = p[i * 2], z = p[i * 2 + 1];
    const pi = Math.max(0, i - 1), ni = Math.min(n - 1, i + 1);
    let dx0 = x - p[pi * 2], dz0 = z - p[pi * 2 + 1];
    let dx1 = p[ni * 2] - x, dz1 = p[ni * 2 + 1] - z;
    const l0 = Math.hypot(dx0, dz0) || 1, l1 = Math.hypot(dx1, dz1) || 1;
    dx0 /= l0; dz0 /= l0; dx1 /= l1; dz1 /= l1;
    if (i === 0) { dx0 = dx1; dz0 = dz1; }
    if (i === n - 1) { dx1 = dx0; dz1 = dz0; }
    let tx = dx0 + dx1, tz = dz0 + dz1;
    const tl = Math.hypot(tx, tz) || 1;
    tx /= tl; tz /= tl;
    const nx = -tz, nz = tx;
    const dot = nx * -dz0 + nz * dx0;
    const m = Math.min(hw / Math.max(Math.abs(dot), 0.35), hw * 2.5);
    L.push([x + nx * m, y, z + nz * m]);
    R.push([x - nx * m, y, z - nz * m]);
  }
  const tl = edges ? [1, 0, 2] : undefined, tr = edges ? [-1, 0, 2] : undefined;
  const tc = edges ? [0, 0, 2] : undefined;
  for (let i = 0; i < n - 1; i++) gb.quad(L[i], L[i + 1], R[i + 1], R[i], color, [0, 1, 0], tl, tl, tr, tr);
  for (const i of [0, n - 1]) {
    const cx = p[i * 2], cz = p[i * 2 + 1];
    for (let k = 0; k < 8; k++) {
      const a0 = (k / 8) * Math.PI * 2, a1 = ((k + 1) / 8) * Math.PI * 2;
      gb.tri([cx, y, cz], [cx + Math.cos(a0) * hw, y, cz + Math.sin(a0) * hw], [cx + Math.cos(a1) * hw, y, cz + Math.sin(a1) * hw], color, [0, 1, 0], tc, tl, tl);
    }
  }
}

// Assembles the playable world from real OSM data.

import * as THREE from 'three';
import { hash01, rng } from '../core/math';
import { addBuilding, patchBuildingMaterial, styleFor } from './buildings';
import { WorldCollision } from './collision';
import { analyse, pointInRing, toRing, type Footprint } from './footprint';
import { GeomBuilder, triangulate } from './geom';
import { buildLandmarks } from './landmarks';
import { LORE } from './lore';
import { LAND_COLORS, ROAD_COLORS } from './palette';
import type { PoiData, RoadData, WorldData } from './types';

const CHUNK = 400;

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

export class World {
  group = new THREE.Group();
  collision = new WorldCollision();
  footprints: Footprint[] = [];
  discoveries: Discovery[] = [];
  streets: NamedSegment[] = [];
  private streetGrid = new Map<number, NamedSegment[]>();
  uniforms = { uNight: { value: 0 }, uTime: { value: 0 } };
  waterMat!: THREE.MeshStandardMaterial;
  demerMat!: THREE.MeshStandardMaterial;
  oak?: THREE.Object3D;

  private cullables: THREE.Mesh[] = [];

  constructor(public data: WorldData) {}

  /** Distance culling for building and tree chunks (fog hides the cut). */
  cull(cam: THREE.Vector3) {
    for (const m of this.cullables) {
      const s = m.geometry.boundingSphere ?? (m as THREE.InstancedMesh).boundingSphere;
      if (!s) continue;
      const d = Math.hypot(s.center.x - cam.x, s.center.z - cam.z) - s.radius;
      m.visible = d < m.userData.cullDist;
    }
  }

  build(onProgress: (msg: string) => void) {
    onProgress('Raising the polders…');
    this.buildGround();
    onProgress('Planting the Hageland…');
    this.buildLand();
    onProgress('Letting in the Demer…');
    this.buildWater();
    onProgress('Laying cobbles…');
    this.buildRoads();
    onProgress('Building Diest, brick by brick…');
    this.buildBuildings();
    onProgress('Growing the woods…');
    this.buildTrees();
    this.buildDiscoveries();
  }

  private groundMat(order: number, color = 0xffffff) {
    const m = new THREE.MeshLambertMaterial({ vertexColors: true, color, depthWrite: false });
    m.userData.order = order;
    return m;
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
    const cols: number[] = [];
    const base = new THREE.Color('#7f9d4e');
    const alt = [new THREE.Color('#9aa858'), new THREE.Color('#6f9046'), new THREE.Color('#b3a35c'), new THREE.Color('#8b8a4c')];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i), pz = pos.getZ(i);
      // field patchwork outside the mapped area
      const fx = Math.floor(px / 180), fz = Math.floor(pz / 140);
      const h = hash01(fx * 7919 + fz * 104729);
      c.copy(base).lerp(alt[Math.floor(h * alt.length)], 0.55 + 0.4 * hash01(fx * 31 + fz * 17));
      cols.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    this.addGroundMesh(geo, this.groundMat(-20), -20);
  }

  // ---------------- land cover ----------------
  private buildLand() {
    const gb = new GeomBuilder();
    const c = new THREE.Color();
    for (let li = 0; li < this.data.land.length; li++) {
      const l = this.data.land[li];
      const pal = LAND_COLORS[l.k];
      if (!pal) continue;
      c.set(pal[Math.floor(hash01(li * 13 + 7) * pal.length)]);
      const jitter = 0.94 + hash01(li * 3) * 0.1;
      c.multiplyScalar(jitter);
      const ring = toRing(l.p);
      const tris = triangulate(ring);
      for (const [a, b, cc] of tris) {
        gb.tri([ring[a][0], 0, ring[a][1]], [ring[b][0], 0, ring[b][1]], [ring[cc][0], 0, ring[cc][1]], c, [0, 1, 0]);
      }
    }
    this.addGroundMesh(gb.build(), this.groundMat(-19), -19);
  }

  // ---------------- water ----------------
  private buildWater() {
    this.waterMat = new THREE.MeshStandardMaterial({
      color: '#3f6272', roughness: 0.12, metalness: 0.25, depthWrite: false,
    });
    // The Demer: "dark water". Darker, with a faint uncanny sheen.
    this.demerMat = new THREE.MeshStandardMaterial({
      color: '#1d2c2e', roughness: 0.08, metalness: 0.35, depthWrite: false, emissive: '#0b2a26', emissiveIntensity: 0.6,
    });
    const areas = new GeomBuilder();
    const white = new THREE.Color(1, 1, 1);
    for (const p of this.data.waterAreas) {
      const ring = toRing(p);
      for (const [a, b, c] of triangulate(ring)) {
        areas.tri([ring[a][0], 0, ring[a][1]], [ring[b][0], 0, ring[b][1]], [ring[c][0], 0, ring[c][1]], white, [0, 1, 0]);
      }
    }
    this.addGroundMesh(areas.build(), this.waterMat, -15);

    const demer = new GeomBuilder();
    const other = new GeomBuilder();
    for (const wl of this.data.waterLines) {
      const isDemer = (wl.n ?? '').toLowerCase().includes('demer');
      ribbon(isDemer ? demer : other, wl.p, wl.w, white, 0);
    }
    this.addGroundMesh(other.build(), this.waterMat, -14);
    this.addGroundMesh(demer.build(), this.demerMat, -14);
  }

  // ---------------- roads ----------------
  private buildRoads() {
    const gb = new GeomBuilder();
    const c = new THREE.Color();
    const order = ['track', 'path', 'footway', 'cycleway', 'bridleway', 'steps', 'service', 'rail', 'unclassified', 'living_street', 'residential', 'pedestrian', 'tertiary', 'secondary', 'primary', 'trunk', 'motorway'];
    const roads = this.data.roads.slice().sort((a, b) => order.indexOf(a.k) - order.indexOf(b.k));
    for (const r of roads) {
      c.set(ROAD_COLORS[r.k] ?? '#9a8f7e');
      // old-town cobbles are warmer
      const mid = midpoint(r);
      if (Math.hypot(mid[0], mid[1]) < 650 && r.k !== 'rail') c.lerp(new THREE.Color('#a08a6e'), 0.4);
      ribbon(gb, r.p, r.w, c, 0);
      if (r.n) this.addStreet(r);
    }
    this.addGroundMesh(gb.build(), this.groundMat(-12), -12);
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
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.0 });
    patchBuildingMaterial(mat, this.uniforms);
    const chunks = new Map<string, GeomBuilder>();
    for (const b of this.data.buildings) {
      const f = analyse(b);
      this.footprints.push(f);
      this.collision.add(f);
      const key = Math.floor(f.cx / CHUNK) + ',' + Math.floor(f.cz / CHUNK);
      let gb = chunks.get(key);
      if (!gb) chunks.set(key, (gb = new GeomBuilder()));
      addBuilding(gb, f, styleFor(f));
    }
    for (const gb of chunks.values()) {
      const mesh = new THREE.Mesh(gb.build(), mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.cullDist = 5200;
      this.cullables.push(mesh);
      this.group.add(mesh);
    }
    const lm = buildLandmarks(this.footprints, this.data.pois, this.collision, mat);
    this.group.add(lm.group);
    this.oak = lm.group.getObjectByName('rootOak');
    this.data.pois.push(...lm.extraPois);
  }

  // ---------------- trees ----------------
  private buildTrees() {
    const crownGeo = new THREE.IcosahedronGeometry(1, 0);
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 1, 4, 1, true);
    trunkGeo.translate(0, 0.5, 0);
    const tree = mergeTree(crownGeo, trunkGeo);
    const pine = mergePine();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });

    const perChunk = new Map<string, { m: THREE.Matrix4; c: THREE.Color; pine: boolean }[]>();
    const rand = rng(1302);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    let total = 0;
    const MAX = 42000;
    const DENS: Record<string, number> = { wood: 1 / 70, park: 1 / 260, orchard: 1 / 90, cemetery: 1 / 300, wet: 1 / 400, scrub: 1 / 300 };
    for (const l of this.data.land) {
      const dens = DENS[l.k];
      if (!dens) continue;
      const ring = toRing(l.p);
      let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
      for (const [x, z] of ring) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
      }
      const n = Math.min(4000, Math.floor((maxX - minX) * (maxZ - minZ) * dens));
      for (let i = 0; i < n && total < MAX; i++) {
        const x = minX + rand() * (maxX - minX), z = minZ + rand() * (maxZ - minZ);
        if (!pointInRing(ring, x, z)) continue;
        if (this.collision.buildingAt(x, z)) continue;
        const isPine = l.k === 'wood' && rand() < 0.22;
        const s = l.k === 'orchard' ? 2.2 + rand() * 1.2 : 3.2 + rand() * 3.6;
        q.setFromAxisAngle(up, rand() * Math.PI * 2);
        m4.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(s, s * (0.9 + rand() * 0.4), s));
        const key = Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK);
        let list = perChunk.get(key);
        if (!list) perChunk.set(key, (list = []));
        const tint = new THREE.Color().setHSL(0.22 + rand() * 0.08, 0.35 + rand() * 0.2, 0.75 + rand() * 0.25);
        list.push({ m: m4.clone(), c: tint, pine: isPine });
        total++;
      }
    }
    for (const list of perChunk.values()) {
      for (const pineFlag of [false, true]) {
        const items = list.filter((t) => t.pine === pineFlag);
        if (!items.length) continue;
        const im = new THREE.InstancedMesh(pineFlag ? pine : tree, mat, items.length);
        items.forEach((t, i) => {
          im.setMatrixAt(i, t.m);
          im.setColorAt(i, t.c);
        });
        im.castShadow = true;
        im.receiveShadow = true;
        im.computeBoundingSphere();
        im.userData.cullDist = 1900;
        this.cullables.push(im);
        this.group.add(im);
      }
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
    const begijn = this.footprints.find((f) => f.name === 'Ingang Begijnhof');
    if (begijn) add('Ingang Begijnhof', begijn.cx, begijn.cz);
  }
}

function midpoint(r: RoadData): [number, number] {
  const i = Math.floor(r.p.length / 4) * 2;
  return [r.p[i], r.p[i + 1]];
}

/** Flat ribbon along a polyline (mitred joins, capped). */
function ribbon(gb: GeomBuilder, p: number[], width: number, color: THREE.Color, y: number) {
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
  for (let i = 0; i < n - 1; i++) gb.quad(L[i], L[i + 1], R[i + 1], R[i], color, [0, 1, 0]);
  // round-ish caps so joints between separate ways don't gap
  for (const i of [0, n - 1]) {
    const cx = p[i * 2], cz = p[i * 2 + 1];
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI * 2, a1 = ((k + 1) / 6) * Math.PI * 2;
      gb.tri([cx, y, cz], [cx + Math.cos(a0) * hw, y, cz + Math.sin(a0) * hw], [cx + Math.cos(a1) * hw, y, cz + Math.sin(a1) * hw], color, [0, 1, 0]);
    }
  }
}

function colorize(g: THREE.BufferGeometry, hex: string) {
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function mergeGeos(geos: THREE.BufferGeometry[]) {
  const parts = geos.map((g) => (g.index ? g.toNonIndexed() : g));
  const total = parts.reduce((s, g) => s + g.attributes.position.count, 0);
  const pos = new Float32Array(total * 3), nrm = new Float32Array(total * 3), col = new Float32Array(total * 3);
  let o = 0;
  for (const g of parts) {
    g.computeVertexNormals();
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nrm.set(g.attributes.normal.array as Float32Array, o * 3);
    col.set(g.attributes.color.array as Float32Array, o * 3);
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}

function mergeTree(crown: THREE.BufferGeometry, trunk: THREE.BufferGeometry) {
  const c1 = colorize(crown.clone().scale(1.0, 0.85, 1.0).translate(0, 1.6, 0), '#557f36');
  const t = colorize(trunk.clone(), '#5a4330');
  return mergeGeos([t, c1]);
}

function mergePine() {
  const cone = colorize(new THREE.ConeGeometry(0.75, 2.6, 6).translate(0, 2.0, 0), '#2f4f2a');
  const trunk = colorize(new THREE.CylinderGeometry(0.1, 0.14, 0.9, 4, 1, true).translate(0, 0.45, 0), '#4f3a2a');
  return mergeGeos([trunk, cone]);
}

// Narrow period plots out of the long blocks of the map.
//
// The footprints come from modern OSM outlines and from blocks traced on the
// Ferraris map, so many streets are lined by one long building, and a few
// modern buildings are huge single masses (the pentagon on the Grote Markt).
// In 1650 a Diest street was a row of separate houses: plots with street fronts
// of about 5 to 7 m and deep behind, a front house with outbuildings
// (achterhuizen) behind it; two storeys on the market and the main streets, one
// storey with a garret in the side streets (Begijnhof beheersplan, see
// buildings.ts). So each long block is cut along its street front into plots of
// seeded width, deep plots are cut again into a front house and lower back
// buildings, and each plot gets its own height and ridge: gable to the street
// near the market, more often eaves to the street towards the walls.
//
// The plots tile the block exactly (same outline, no gaps, no new yards), so
// what is solid and what is open does not change: streets, squares, gate
// passages, walkers, props and landing spots stay as they were. Blocks the
// splitter cannot cut cleanly are kept whole.

import { hash01 } from '../core/math';
import { analyse, pointInRing, type Footprint } from './footprint';
import { signedArea } from './geom';
import type { BuildingData } from './types';

type Pt = [number, number];

/** Streets of the old town that had two-storey houses (the market, the main streets to the gates). */
const MAIN = new Set([
  'Grote Markt', 'Demerstraat', 'Koning Albertstraat', 'Hasseltsestraat', 'Schaffensestraat', 'Leuvensestraat',
  'Sint-Jan Berchmansstraat', 'Begijnenstraat', 'Botermarkt', 'Graanmarkt', 'Veemarkt', 'Zoutstraat',
  'Antwerpsestraat', 'Ketelstraat', 'Kaai', 'Overstraat', 'Statiestraat',
]);
const MARKT_X = -20, MARKT_Z = 60;

export interface PlotEnv {
  /** open street, square or quay just outside a wall */
  isStreet(x: number, z: number): boolean;
  /** nearest named street within a few metres */
  streetName(x: number, z: number): string | null;
  /** keep this footprint whole (churches, halls, named houses, the Begijnhof, the countryside) */
  keepWhole(f: Footprint): boolean;
}

export interface PlotStats { blocks: number; plots: number; rejected: number }

/** Replace every long block by its plots; everything else passes through unchanged. */
export function splitBlocks(buildings: BuildingData[], env: PlotEnv): { out: BuildingData[]; stats: PlotStats } {
  const out: BuildingData[] = [];
  const stats: PlotStats = { blocks: 0, plots: 0, rejected: 0 };
  for (const b of buildings) {
    const f = analyse(b);
    const plots = env.keepWhole(f) || f.rise <= 0 ? null : plotsOf(b, f, env);
    if (plots === undefined) stats.rejected++;
    if (!plots) {
      out.push(b);
      continue;
    }
    stats.blocks++;
    stats.plots += plots.length;
    out.push(...plots);
  }
  return { out, stats };
}

const dot = (p: Pt, ax: number, az: number) => p[0] * ax + p[1] * az;
const area = (r: Pt[]) => Math.abs(signedArea(r));

function centroid(r: Pt[]): Pt {
  let a = 0, x = 0, z = 0;
  for (let i = 0; i < r.length; i++) {
    const [x0, z0] = r[i], [x1, z1] = r[(i + 1) % r.length];
    const c = x0 * z1 - x1 * z0;
    a += c;
    x += (x0 + x1) * c;
    z += (z0 + z1) * c;
  }
  if (Math.abs(a) < 1e-9) return r[0];
  return [x / (3 * a), z / (3 * a)];
}

function extent(r: Pt[], ax: number, az: number): [number, number] {
  let lo = Infinity, hi = -Infinity;
  for (const p of r) {
    const v = dot(p, ax, az);
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
}

/**
 * Split a simple polygon by the line p·(ax,az) = c into all its pieces (a concave
 * polygon can fall into more than two). Pieces keep the ring's orientation.
 */
export function splitByLine(ring: Pt[], ax: number, az: number, c: number): Pt[][] {
  // keep vertices off the line so every crossing is a proper one
  let d = ring.map((p) => dot(p, ax, az) - c);
  for (let k = 0; k < 8 && d.some((v) => Math.abs(v) < 1e-4); k++) {
    c += 3e-4;
    d = ring.map((p) => dot(p, ax, az) - c);
  }
  if (d.every((v) => v > 0) || d.every((v) => v < 0)) return [ring];
  interface Node { p: Pt; cross: boolean; t: number; partner: number }
  const nodes: Node[] = [];
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    nodes.push({ p: ring[i], cross: false, t: 0, partner: -1 });
    if (d[i] > 0 !== d[j] > 0) {
      const s = d[i] / (d[i] - d[j]);
      const p: Pt = [ring[i][0] + (ring[j][0] - ring[i][0]) * s, ring[i][1] + (ring[j][1] - ring[i][1]) * s];
      // position along the line
      nodes.push({ p, cross: true, t: p[0] * -az + p[1] * ax, partner: -1 });
    }
  }
  const cross = nodes.map((nd, i) => (nd.cross ? i : -1)).filter((i) => i >= 0).sort((i, j) => nodes[i].t - nodes[j].t);
  if (cross.length % 2) return [ring];
  for (let k = 0; k < cross.length; k += 2) {
    nodes[cross[k]].partner = cross[k + 1];
    nodes[cross[k + 1]].partner = cross[k];
  }
  const N = nodes.length;
  const seen = new Uint8Array(N);
  const pieces: Pt[][] = [];
  for (let s = 0; s < N; s++) {
    if (seen[s] || nodes[s].cross) continue;
    const piece: Pt[] = [];
    let i = s, guard = 0;
    do {
      piece.push(nodes[i].p);
      seen[i] = 1;
      if (nodes[i].cross) {
        const j = nodes[i].partner;
        piece.push(nodes[j].p);
        seen[j] = 1;
        i = (j + 1) % N;
      } else i = (i + 1) % N;
    } while (i !== s && ++guard < N * 2);
    if (guard >= N * 2) return [ring];
    const clean = piece.filter((p, k) => {
      const q = piece[(k + 1) % piece.length];
      return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-3;
    });
    if (clean.length >= 3) pieces.push(clean);
  }
  return pieces;
}

/**
 * Cut by parallel lines, dropping a cut wherever it would leave a sliver of less
 * than minA square metres (an odd corner of the outline) beside it.
 */
function cutClean(ring: Pt[], ax: number, az: number, cuts: number[], minA: number): Pt[][] {
  const cs = cuts.slice();
  for (let it = 0; it < 8; it++) {
    const pieces = cutAll(ring, ax, az, cs);
    const small = pieces.find((p) => area(p) < minA);
    if (!small || !cs.length) return pieces;
    const v = dot(centroid(small), ax, az);
    let bi = 0;
    for (let i = 1; i < cs.length; i++) if (Math.abs(cs[i] - v) < Math.abs(cs[bi] - v)) bi = i;
    if (Math.abs(cs[bi] - v) > 9) return pieces;
    cs.splice(bi, 1);
  }
  return cutAll(ring, ax, az, cs);
}

/** Cut a polygon by several parallel lines p·a = c. */
function cutAll(ring: Pt[], ax: number, az: number, cuts: number[]): Pt[][] {
  let pieces = [ring];
  for (const c of cuts) pieces = pieces.flatMap((p) => splitByLine(p, ax, az, c));
  return pieces;
}

const flat = (r: Pt[]) => r.flatMap((p) => [p[0], p[1]]);

/**
 * The plots of one block, null to keep it whole, undefined when the cut failed
 * (the pieces did not tile the block exactly) and it is kept whole.
 */
function plotsOf(b: BuildingData, f: Footprint, env: PlotEnv): BuildingData[] | null | undefined {
  const ring = f.ring.map((p) => [p[0], p[1]] as Pt);
  if (signedArea(ring) < 0) ring.reverse();
  const A = area(ring);
  if (A < 90) return null;
  const seed = Math.abs(b.id) * 13 + (b.id < 0 ? 7 : 0);
  const rnd = (k: number) => hash01(seed * 31 + k * 977 + 17);

  // where are the streets: the street edges, with how much of each looks onto a street
  const edges: { phi: number; L: number; ox: number; oz: number }[] = [];
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], c = ring[(i + 1) % ring.length];
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    if (len < 0.8) continue;
    const ox = (c[1] - a[1]) / len, oz = -(c[0] - a[0]) / len;
    let s = 0;
    for (const t of [0.2, 0.5, 0.8]) if (env.isStreet(a[0] + (c[0] - a[0]) * t + ox * 2.4, a[1] + (c[1] - a[1]) * t + oz * 2.4)) s++;
    if (s) edges.push({ phi: Math.atan2(c[1] - a[1], c[0] - a[0]), L: (len * s) / 3, ox, oz });
  }
  // the street front runs along a (the direction most street frontage follows), the plots go back along d
  let ax = f.ux, az = f.uz;
  let bestScore = 0;
  for (const e of edges) {
    let score = 0;
    for (const g of edges) score += g.L * Math.max(0, Math.cos(2 * (e.phi - g.phi))) ** 8;
    if (score > bestScore) {
      bestScore = score;
      ax = Math.cos(e.phi);
      az = Math.sin(e.phi);
    }
  }
  const dx = -az, dz = ax;
  let Fp = 0, Fm = 0;
  for (const e of edges) {
    const dd = e.ox * dx + e.oz * dz;
    if (dd > 0.5) Fp += e.L;
    else if (dd < -0.5) Fm += e.L;
  }
  const [a0, a1] = extent(ring, ax, az);
  const [d0, d1] = extent(ring, dx, dz);
  const La = a1 - a0, D = d1 - d0;
  // already one house wide: a mapped house (even a deep one) or a short block
  if (La <= 11 && (D <= 20 || b.id > 0)) return null;

  // back-to-back rows on a deep block
  const rows: { ring: Pt[]; front: number; street: boolean }[] = [];
  if (D > 26) {
    const c = d0 + D * (0.5 + (rnd(1) - 0.5) * 0.16);
    for (const p of splitByLine(ring, dx, dz, c)) {
      const front = dot(centroid(p), dx, dz) > c ? 1 : -1;
      rows.push({ ring: p, front, street: (front > 0 ? Fp : Fm) > 0.5 });
    }
  } else {
    const front = Fp >= Fm ? 1 : -1;
    rows.push({ ring, front, street: Math.max(Fp, Fm) > 0.5 });
  }

  const out: BuildingData[] = [];
  let k = 0;
  const id = (n: number) => (b.id < 0 ? -(1_000_000 + -b.id * 128 + n) : b.id * 128 + n);
  rows.forEach((row, ri) => {
    const [ra0, ra1] = extent(row.ring, ax, az);
    const [rd0, rd1] = extent(row.ring, dx, dz);
    const dF = row.front > 0 ? rd1 : rd0;
    const cen = centroid(row.ring);
    const dMarkt = Math.hypot(cen[0] - MARKT_X, cen[1] - MARKT_Z);
    const rich = dMarkt < 130;
    // eaves to the street grows more common away from the market
    const pEaves = Math.max(0, Math.min(0.55, (dMarkt - 160) / 380));
    // the front houses stand in a band along the street; behind them, outbuildings
    // (a row that faces no street is all yards and outbuildings)
    const fd = row.street ? 8.5 + rnd(10 + ri) * 3.5 : 0;
    let fronts = [row.ring];
    const backs: Pt[][] = [];
    if (!row.street) {
      fronts = [];
      backs.push(row.ring);
    } else if (rd1 - rd0 > fd + 4) {
      fronts = [];
      for (const p of splitByLine(row.ring, dx, dz, dF - row.front * fd)) ((dF - dot(centroid(p), dx, dz)) * row.front < fd ? fronts : backs).push(p);
    }
    // front houses: strips of seeded width along the street
    const strips: { s0: number; s1: number; eaves: boolean }[] = [];
    let s = ra0, q = ri * 50;
    for (;;) {
      const r1 = rnd(100 + q), r2 = rnd(200 + q);
      q++;
      const eaves = r1 < pEaves;
      const w = eaves ? 7.5 + r2 * 2.5 : rich ? 6 + r2 * 3 : 5 + r2 * 2;
      if (ra1 - (s + w) < 3.5) {
        strips.push({ s0: s, s1: ra1, eaves: eaves && ra1 - s < 11 });
        break;
      }
      strips.push({ s0: s, s1: s + w, eaves });
      s += w;
    }
    const cuts = strips.slice(1).map((st) => st.s0);
    for (const piece of fronts.flatMap((r) => cutClean(r, ax, az, cuts, 9))) {
      const pc = centroid(piece);
      const pa = dot(pc, ax, az);
      const si = Math.max(0, strips.findIndex((st) => pa >= st.s0 - 1e-6 && pa <= st.s1 + 1e-6));
      const r = (n: number) => rnd(1000 + si * 37 + ri * 911 + n);
      // the street in front of this house: two storeys on the market and the main streets
      const toFront = dF - dot(pc, dx, dz);
      const fx = pc[0] + dx * (toFront + row.front * 4), fz = pc[1] + dz * (toFront + row.front * 4);
      const name = env.streetName(fx, fz);
      const dm = Math.hypot(fx - MARKT_X, fz - MARKT_Z);
      const main = row.street && (dm < 110 || (name !== null && MAIN.has(name)));
      const h = main ? 6.0 + r(6) * 1.5 + (dm < 110 ? 0.6 : 0)
        : r(5) < 0.3 ? 5.6 + r(6) * 0.8
        : 4.3 + r(6) * 0.6;
      out.push({
        id: id(k++), p: flat(piece), h: Math.round(h * 10) / 10, r: 'g', t: 'yes', pid: b.id,
        rd: strips[si].eaves ? [ax, az] : [dx, dz],
      });
    }
    // outbuildings: wider pieces, cut every 12-16 m further back; one storey under a lower pitch
    const bcutsA: number[] = [];
    for (let v = ra0 + 9 + rnd(300 + ri) * 5; v < ra1 - 5; v += 9 + rnd(301 + ri + bcutsA.length) * 5) bcutsA.push(v);
    const bcutsD: number[] = [];
    for (let v = fd + 12 + rnd(400 + ri) * 4; v < rd1 - rd0 - 6; v += 12 + rnd(401 + ri + bcutsD.length) * 4) bcutsD.push(dF - row.front * v);
    for (const piece of backs.flatMap((r) => cutClean(r, dx, dz, bcutsD, 12)).flatMap((r) => cutClean(r, ax, az, bcutsA, 12))) {
      const r = rnd(500 + k * 7);
      out.push({ id: id(k++), p: flat(piece), h: Math.round((4.1 + r * 0.6) * 10) / 10, r: 'h', t: r < 0.3 ? 'shed' : 'outbuilding', pid: b.id });
    }
  });
  // the plots must tile the block exactly, or the block stays whole: same area, and on a fine
  // grid every point of the block in exactly one plot and no point outside it in any (this
  // catches the traced outlines that touch or cross themselves)
  const sum = out.reduce((s2, o) => s2 + Math.abs(signedArea(toPts(o.p))), 0);
  if (Math.abs(sum - A) > A * 0.004 + 0.5) return undefined;
  if (!tiles(f.ring, out.map((o) => toPts(o.p)))) return undefined;
  return out;
}

function tiles(block: Pt[], pieces: Pt[][]) {
  const box = (r: Pt[]) => {
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const [x, z] of r) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    }
    return [x0, z0, x1, z1];
  };
  const [x0, z0, x1, z1] = box(block);
  const boxes = pieces.map(box);
  const step = 0.73;
  for (let x = x0 + 0.137; x < x1; x += step)
    for (let z = z0 + 0.291; z < z1; z += step) {
      let n = 0;
      for (let i = 0; i < pieces.length; i++) {
        const b = boxes[i];
        if (x < b[0] || x > b[2] || z < b[1] || z > b[3]) continue;
        if (pointInRing(pieces[i], x, z)) n++;
      }
      if (n !== (pointInRing(block, x, z) ? 1 : 0)) return false;
    }
  return true;
}

function toPts(p: number[]): Pt[] {
  const r: Pt[] = [];
  for (let i = 0; i < p.length; i += 2) r.push([p[i], p[i + 1]]);
  return r;
}

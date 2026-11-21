// Footprint analysis shared by mesh building and collision: oriented bounding
// box, ridge line and the roof-height function for each building.

import { hash01 } from '../core/math';
import type { BuildingData } from './types';

export interface Footprint {
  ring: [number, number][];
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  /** eave height */
  h: number;
  /** OBB centre */
  cx: number;
  cz: number;
  /** unit vector along the ridge (long axis) */
  ux: number;
  uz: number;
  /** unit vector across the ridge */
  nx: number;
  nz: number;
  /** half length along u, half width along n */
  hu: number;
  hw: number;
  /** roof rise at the ridge (0 = flat) */
  rise: number;
  /**
   * Slope of the hipped ends (m rise per m), 0 for a plain gable. Thatched
   * farmhouses of the Hageland were mostly hipped (schilddak), so the roof
   * comes down on all four sides; set by the building style before the
   * footprint enters collision, so walking on the roof matches the mesh.
   */
  hip: number;
  kind: string;
  name?: string;
  id: number;
  /** the block this plot was cut from (plots.ts) */
  pid?: number;
}

const SHED_KINDS = new Set(['roof', 'carport', 'garage', 'garages', 'shed', 'service', 'kiosk', 'toilets', 'greenhouse', 'bunker']);

export function toRing(p: number[]): [number, number][] {
  const r: [number, number][] = [];
  for (let i = 0; i < p.length; i += 2) r.push([p[i], p[i + 1]]);
  return r;
}

export function analyse(b: BuildingData): Footprint {
  const ring = toRing(b.p);
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const [x, z] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  // Minimum-area oriented box, testing each edge direction (or the ridge the plot layout chose).
  let best = { area: Infinity, ux: 1, uz: 0, lo: 0, hi: 0, nlo: 0, nhi: 0 };
  const dirs: [number, number][] = [];
  if (b.rd) dirs.push(b.rd);
  else
    for (let i = 0; i < ring.length; i++) {
      const [ax, az] = ring[i];
      const [bx, bz] = ring[(i + 1) % ring.length];
      const len = Math.hypot(bx - ax, bz - az);
      if (len >= 0.5) dirs.push([(bx - ax) / len, (bz - az) / len]);
    }
  for (const [ux, uz] of dirs) {
    const nx = -uz, nz = ux;
    let lo = Infinity, hi = -Infinity, nlo = Infinity, nhi = -Infinity;
    for (const [x, z] of ring) {
      const u = x * ux + z * uz;
      const n = x * nx + z * nz;
      if (u < lo) lo = u;
      if (u > hi) hi = u;
      if (n < nlo) nlo = n;
      if (n > nhi) nhi = n;
    }
    const area = (hi - lo) * (nhi - nlo);
    if (area < best.area) best = { area, ux, uz, lo, hi, nlo, nhi };
  }
  let { ux, uz, lo, hi, nlo, nhi } = best;
  let nx = -uz, nz = ux;
  // Ridge runs along the long side.
  if (!b.rd && nhi - nlo > hi - lo) {
    [ux, uz, nx, nz] = [nx, nz, -ux, -uz];
    [lo, hi, nlo, nhi] = [nlo, nhi, -hi, -lo];
  }
  const cu = (lo + hi) / 2, cn = (nlo + nhi) / 2;
  const cx = cu * ux + cn * nx;
  const cz = cu * uz + cn * nz;
  const hu = (hi - lo) / 2;
  const hw = (nhi - nlo) / 2;

  const kind = b.t ?? 'yes';
  let rise = 0;
  if (kind === 'basilica') {
    // The landmark builder raises the domed drum; keep the footprint low and flat.
    return { ring, minX, minZ, maxX, maxZ, h: 13, cx, cz, ux, uz, nx, nz, hu, hw, rise: 0, hip: 0, kind, name: b.n, id: b.id };
  }
  const church = kind === 'church' || kind === 'chapel' || kind === 'cathedral';
  const tiny = SHED_KINDS.has(kind) || hu * hw * 4 < 28;
  if (!tiny || b.r !== 'f') {
    // Flemish roofs are steep (~50 degrees). Wide halls and barns get lower pitches.
    // Buildings mapped with flat roofs (modern sheds, shops) are given low pitched
    // roofs too, so they read as barns and halls rather than modern boxes.
    const wide = hw * 2;
    // No two old houses had quite the same pitch: +-4 degrees by plot.
    const jit = church ? 0 : (hash01(b.id * 7 + 13) - 0.5) * 8;
    const pitchDeg = jit + (church ? 52 : b.r === 'f' ? (wide > 16 ? 26 : 38) : b.r === 'h' ? 36 : wide > 14 ? 40 : 50);
    rise = Math.tan((pitchDeg * Math.PI) / 180) * hw;
    rise = Math.min(rise, church ? 22 : wide > 16 ? 7.5 : 9);
  }
  // Eaves were never level along a street: each plot was built on its own, so
  // let the eave line wander by a few decimetres (kept above 2.6 m).
  let h = b.h;
  if (rise > 0 && !church && kind !== 'wall') {
    // low houses only grow, so nothing hung on their walls ends up above the eave
    const j = hash01(b.id * 3 + 29);
    h = b.h < 4 ? h + j * 0.35 : h + (j - 0.5) * 0.7;
  }
  return {
    ring, minX, minZ, maxX, maxZ, h, cx, cz, ux, uz, nx, nz, hu, hw, rise, hip: 0, kind, name: b.n, id: b.id, pid: b.pid,
  };
}

/** Roof surface height at (x,z) — assumes the point is inside the footprint. */
export function roofHeight(f: Footprint, x: number, z: number): number {
  if (f.rise <= 0) return f.h;
  const d = Math.abs((x - f.cx) * f.nx + (z - f.cz) * f.nz);
  const t = 1 - d / Math.max(f.hw, 0.01);
  let y = f.h + f.rise * (t > 0 ? t : 0);
  if (f.hip > 0) {
    const a = Math.abs((x - f.cx) * f.ux + (z - f.cz) * f.uz);
    y = Math.min(y, f.h + f.hip * Math.max(0, f.hu - a));
  }
  return y;
}

export function pointInRing(ring: [number, number][], x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

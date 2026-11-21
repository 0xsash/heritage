// Turns the historical footprints into the houses of Diest around 1650.
//
// What the town looked like (sources read for this; see the report for links):
//  - Begijnhof Diest beheersplan (Onroerend Erfgoed, 2015), pp. 22-33, 131-160:
//    in the 15th and early 16th c. most Diest houses were "opgetrokken uit hout
//    en leem en bedekt met daken van stro": oak frames with wattle-and-loam
//    infill (vitswerk) on a footing of brick or ironstone; only cellars,
//    hearths and chimneys were stone. From 1546 the town subsidised hard roofs
//    (pannen, leien, "tichelen", a local tile), but until 1660 only two or three
//    houses a year, so in 1650 thatch was still common away from the market.
//    Only houses on the Markt and the main streets had an upper floor; side
//    streets were mostly one storey with a garret.
//  - The same plan on the Begijnhof: in 1665 only 23 of its 62 houses were of
//    stone, the rest "leem en vakwerk"; the stone ones are in the Brabant
//    "bak- en zandsteenstijl" with Diest ironstone for plinths, corner chains,
//    bands and window frames and white Gobertange stone for sills, lintels and
//    cross-windows; facades were limewashed (kalei), the plinth tarred black
//    ("gepikt"), joinery dark green, the lower lights of cross-windows closed by
//    shutters, windows set high, a niche with the house saint over the door.
//  - RBINS excursion guide "Ijzerzandsteen in Diest" (2014): Sint-Sulpitius is
//    ironstone with a west tower of white Gobertange stone; the 14th-c.
//    Lakenhalle, the Begijnhof church and Onze-Lieve-Vrouwekerk are ironstone;
//    houses such as De Fortuyn (16th c.) have an ironstone plinth and door frame.
//  - Teniers, Brouwer and Bruegel streets and inns (from the paintings): low
//    limewashed houses with dark timbers, small leaded windows, plank doors,
//    shutters (often painted in diagonal two-colour bands), pentices over shop
//    fronts, sagging thatch with mossy ridges, brick stepped gables only on the
//    better houses.
//
// So each plot gets a seeded house type, richer near the Grote Markt and
// poorer, lower and more timber and thatch towards the walls and outside them:
//   timber    vakwerk with limewashed daub, dark oak, planked gable, jetty
//   brick     brick front with ironstone plinth, sandstone bands and quoins,
//             stepped or plain gable with a coping
//   plaster   limewashed brick or loam, tarred plinth
//   ironstone the old stone houses and refuges
//   begijn    whitewashed Begijnhof house with white stone frames and a niche
//   farm/barn low daub-and-timber walls under hipped thatch, plank barns
//   hall      the Lakenhalle and the town hall, ironstone with cross-windows
// Doors, cross-windows, leaded glass, shutters, anchors, damp and grime are
// drawn by the shader from a per-vertex facade description (aStyle).

import * as THREE from 'three';
import { hash01 } from '../core/math';
import { GLSL_COMMON, type MaterialSet } from '../render/textures';
import { type Footprint, pointInRing, roofHeight } from './footprint';
import { GeomBuilder, signedArea, triangulate } from './geom';
import * as P from './palette';

const UP: [number, number, number] = [0, 1, 0];
let inTown = (x: number, z: number) => Math.hypot(x, z) < 720;
/** Tell the style rules where the town walls are. */
export function setTownTest(test: (x: number, z: number) => boolean) {
  inTown = test;
}
/** Is a point (just outside a wall) open street or square, as opposed to a yard or a neighbour? */
let onStreet = (_x: number, _z: number) => true;
export function setStreetTest(test: (x: number, z: number) => boolean) {
  onStreet = test;
}

// The Grote Markt, from which wealth falls off.
const MARKT_X = -20, MARKT_Z = 60;
const inBegijnhof = (x: number, z: number) => x > 630 && x < 800 && z > -385 && z < -140;

/** Facade type codes read by the shader (integer part of aStyle.x). */
export const T = { plain: 0, timber: 1, brick: 2, plaster: 3, ironstone: 4, farm: 5, barn: 6, begijn: 7, church: 8, hall: 9 } as const;
type HouseType = keyof typeof T;
/** wall flags (aStyle.z) */
const F_STREET = 1, F_RICH = 2, F_GABLE = 4, F_JETTY = 8, F_POOR = 16;

export interface BuildingStyle {
  type: HouseType;
  wall: P.Surface;
  wallTint: THREE.Color;
  roof: P.Surface;
  roofTint: THREE.Color;
  /** stepped gable (trapgevel) at both ends */
  stepped: boolean;
  /** plain brick gable rising above the roof with a stone coping */
  parapet: boolean;
  chimney: boolean;
  /** hipped-end slope (0 = gable) */
  hip: number;
  /** upper floor overhangs the street (timber houses) */
  jetty: boolean;
  /** pentice (luifel) over the ground floor of a shop */
  luifel: boolean;
  /** ground-floor height */
  G: number;
  rich: boolean;
  poor: boolean;
}

const CHURCH = new Set(['church', 'basilica', 'chapel', 'cathedral']);
const SHEDLIKE = new Set(['roof', 'carport', 'garage', 'garages', 'shed', 'service', 'greenhouse', 'bunker', 'barn', 'farm_auxiliary', 'ruins']);
// The Lakenhalle (begun 1346) and, on the site of the present town hall of the
// 1720s, the medieval schepenhuis (named 1337, its cellars survive): both drawn
// as late-medieval ironstone halls (inventaris.onroerenderfgoed.be 41643, 41642).
const HALLS = new Set(['Lakenhalle', 'Stadhuis Diest']);

export function styleFor(f: Footprint): BuildingStyle {
  const s = f.id;
  const town = inTown(f.cx, f.cz);
  const k = f.kind;
  const area = f.hu * f.hw * 4;
  const church = CHURCH.has(k);
  const r = hash01(s * 3 + 1);
  const r2 = hash01(s * 7 + 3);
  const r3 = hash01(s * 19 + 11);
  const dMarkt = Math.hypot(f.cx - MARKT_X, f.cz - MARKT_Z);
  // wealth: 1 on the market, falling towards the walls; named houses (inns, refuges, burgher houses) are well off
  let wealth = town ? Math.max(0, Math.min(1, 1.12 - dMarkt / 430)) + (hash01(s * 23 + 7) - 0.5) * 0.45 : 0.08 + hash01(s * 23 + 7) * 0.15;
  if (f.name) wealth = Math.max(wealth, 0.8);
  const rich = wealth > 0.68, poor = wealth < 0.32;
  const begijn = town && inBegijnhof(f.cx, f.cz);
  const shed = SHEDLIKE.has(k) || f.h < 2.6;
  const farmish = !town && (k === 'farm' || k === 'barn' || k === 'farm_auxiliary' || f.id < 0);

  let type: HouseType;
  let wall: P.Surface, roof: P.Surface;
  if (church) {
    type = 'church';
    wall = k === 'basilica' ? P.WALL.limestone : P.WALL.ironstone;
    roof = P.ROOF.slate;
  } else if (f.name && HALLS.has(f.name)) {
    type = 'hall';
    wall = P.WALL.ironstone;
    roof = P.ROOF.slate;
  } else if (shed || k === 'barn' || (farmish && area > 260)) {
    // barns and sheds: plank or daub walls, no windows, a big door
    type = 'barn';
    wall = r < 0.55 ? P.WALL.planks : P.WALL.daubLoam;
    roof = town && r2 < 0.5 ? P.ROOF.clay : P.ROOF.thatch;
  } else if (farmish || (!town && r < 0.6)) {
    // the long low farmhouses of the Hageland: timber and daub under thatch
    type = 'farm';
    wall = r2 < 0.75 ? P.WALL.daub : P.WALL.daubLoam;
    roof = r3 < 0.88 ? P.ROOF.thatch : P.ROOF.clay;
  } else if (!town) {
    type = r < 0.85 ? 'timber' : 'plaster';
    wall = type === 'timber' ? P.WALL.daub : P.WALL.limewash;
    roof = r2 < 0.7 ? P.ROOF.thatch : P.ROOF.clay;
  } else if (begijn) {
    // c. 1650 about a third of the beguines' houses were stone, the rest loam and timber
    type = r < 0.45 ? 'begijn' : 'timber';
    wall = type === 'begijn' ? P.WALL.begijn : P.WALL.daub;
    roof = type === 'begijn' ? P.ROOF.clay : r2 < 0.55 ? P.ROOF.clay : P.ROOF.thatch;
  } else if (area > 900 || k === 'industrial' || k === 'warehouse' || k === 'retail') {
    // big town buildings: breweries, granaries, refuges of the abbeys
    type = r < 0.45 ? 'brick' : r < 0.75 ? 'ironstone' : 'plaster';
    wall = type === 'brick' ? P.WALL.brickOld : type === 'ironstone' ? P.WALL.ironstone : P.WALL.limewash;
    roof = r2 < 0.75 ? P.ROOF.clay : P.ROOF.slate;
  } else {
    const t = r;
    if (rich) type = t < 0.5 ? 'brick' : t < 0.7 ? 'timber' : t < 0.88 ? 'plaster' : 'ironstone';
    else if (!poor) type = t < 0.48 ? 'timber' : t < 0.72 ? 'brick' : t < 0.94 ? 'plaster' : 'ironstone';
    else type = t < 0.66 ? 'timber' : t < 0.92 ? 'plaster' : 'brick';
    wall = type === 'brick' ? (r2 < 0.45 ? P.WALL.brickRed : r2 < 0.8 ? P.WALL.brickOld : P.WALL.brickDark)
      : type === 'plaster' ? P.WALL.limewash
      : type === 'ironstone' ? P.WALL.ironstone
      : P.WALL.daub;
    // hard roofs near the market, thatch growing towards the walls (1546 tile subsidy, slow uptake)
    const thatchP = type === 'timber' ? (rich ? 0.12 : poor ? 0.7 : 0.4) : type === 'plaster' ? (poor ? 0.5 : 0.22) : 0.04;
    roof = r3 < thatchP ? P.ROOF.thatch : rich && r2 < 0.3 && type !== 'timber' ? P.ROOF.slate : P.ROOF.clay;
  }

  const width = f.hw * 2;
  const narrowFront = f.hu * 2 > width * 0.9 && width > 3.5 && width < 11;
  const stepped = f.rise > 0 && squareEnd(f, 1) && squareEnd(f, -1) && ((type === 'hall' && f.hw < 11) || (type === 'brick' && narrowFront && r2 < (rich ? 0.75 : 0.45)));
  const parapet = !stepped && f.rise > 0 && (type === 'hall' || ((type === 'brick' || type === 'ironstone' || type === 'begijn') && hash01(s * 41) < 0.7));
  const thatched = roof === P.ROOF.thatch;
  // hipped thatch on farms and barns; data-tagged hipped roofs keep their hips
  const hip = f.rise > 0 && !church && (thatched && (type === 'farm' || type === 'barn') ? hash01(s * 43) < 0.8 : false) && f.hu > f.hw * 1.15
    ? (f.rise / Math.max(f.hw, 0.01)) * 1.05
    : 0;
  const chimney = !church && type !== 'barn' && f.rise > 1.2 && area > 25 && area < 900;
  const twoStorey = f.h >= 5.4;
  const G = type === 'hall' ? Math.min(4.2, f.h * 0.5) : twoStorey ? Math.max(2.8, Math.min(3.55, f.h * 0.5)) : f.h;
  const jetty = type === 'timber' && town && twoStorey && G >= 3.45 && hash01(s * 47) < (rich ? 0.75 : 0.5);
  const luifel = town && !jetty && rich && (type === 'brick' || type === 'timber' || type === 'plaster') && twoStorey && hash01(s * 53) < 0.4;
  return {
    type, wall, wallTint: P.pick(wall.tints, s * 5 + 2),
    roof, roofTint: P.pick(roof.tints, s * 11 + 4),
    stepped, parapet, chimney, hip, jetty, luifel, G, rich, poor,
  };
}

/** Does the footprint end in a straight gable wall at this end of the ridge (so a gable can stand on it)? */
function squareEnd(f: Footprint, end: number) {
  const at = (s: number, d: number) => {
    const uu = (f.hu - d) * end;
    return pointInRing(f.ring, f.cx + f.ux * uu + f.nx * s, f.cz + f.uz * uu + f.nz * s);
  };
  return at(0, 0.3) && at(f.hw * 0.6, 0.3) && at(-f.hw * 0.6, 0.3) && !at(0, -0.3);
}

// ---------------------------------------------------------------- roof planes

/** height = c + gx * x + gz * z */
interface Plane { gx: number; gz: number; c: number }

function roofPlanes(f: Footprint): Plane[] {
  const k = f.rise / Math.max(f.hw, 0.01);
  // across = (x-cx)*nx + (z-cz)*nz ; side +: h + rise - k*across ; side -: h + rise + k*across
  const a0 = -(f.cx * f.nx + f.cz * f.nz);
  const top = f.h + f.rise;
  const planes: Plane[] = [
    { gx: -k * f.nx, gz: -k * f.nz, c: top - k * a0 },
    { gx: k * f.nx, gz: k * f.nz, c: top + k * a0 },
  ];
  if (f.hip > 0) {
    const b0 = -(f.cx * f.ux + f.cz * f.uz);
    const e = f.h + f.hip * f.hu;
    planes.push({ gx: -f.hip * f.ux, gz: -f.hip * f.uz, c: e - f.hip * b0 }, { gx: f.hip * f.ux, gz: f.hip * f.uz, c: e + f.hip * b0 });
  }
  return planes;
}

const evalPlane = (p: Plane, x: number, z: number) => p.c + p.gx * x + p.gz * z;

/** Keep the part of a ring where gx*x + gz*z + c >= 0. */
function clipLinear(ring: [number, number][], gx: number, gz: number, c: number) {
  const out: [number, number][] = [];
  const d = (p: [number, number]) => gx * p[0] + gz * p[1] + c;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const da = d(a), db = d(b);
    if (da >= 0) out.push(a);
    if (da >= 0 !== db >= 0) {
      const t = da / (da - db);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}

/** Parameters along a->b where the roof changes plane (so wall tops follow the ridge and hips). */
function creases(planes: Plane[], a: [number, number], b: [number, number]) {
  const ts: number[] = [];
  for (let i = 0; i < planes.length; i++)
    for (let j = i + 1; j < planes.length; j++) {
      const da = evalPlane(planes[i], a[0], a[1]) - evalPlane(planes[j], a[0], a[1]);
      const db = evalPlane(planes[i], b[0], b[1]) - evalPlane(planes[j], b[0], b[1]);
      if (da * db < 0) {
        const t = da / (da - db);
        if (t > 0.02 && t < 0.98) ts.push(t);
      }
    }
  return ts.sort((x, y) => x - y);
}

// ---------------------------------------------------------------- building

let woodLayer = 0;

export function addBuilding(gb: GeomBuilder, f: Footprint, style: BuildingStyle, set: MaterialSet) {
  woodLayer = set.index.wood ?? set.index.brickDark;
  const seed = hash01(f.id * 17 + 5) * 0.98;
  const wallMat = set.index[style.wall.mat] + seed;
  const roofMat = set.index[style.roof.mat] + seed;
  const ring = f.ring.slice();
  if (signedArea(ring) < 0) ring.reverse();
  const planes = f.rise > 0 ? roofPlanes(f) : [];
  const top = (x: number, z: number) => roofHeight(f, x, z);
  const code = T[style.type] + seed;
  const riseCode = Math.min(99, Math.round(f.rise * 4)) * 10;
  const baseFlags = (style.rich ? F_RICH : 0) | (style.poor ? F_POOR : 0);
  const base = -0.3;
  const thatch = style.roof === P.ROOF.thatch;

  // Walls: one straight run per footprint edge, split where the roof changes plane.
  gb.curMat = wallMat;
  const jettyJ = 0.34;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.05) continue;
    const ox = (b[1] - a[1]) / len, oz = -(b[0] - a[0]) / len;
    const out: [number, number, number] = [ox, 0, oz];
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const street = len > 1.2 && onStreet(mx + ox * 2.2, mz + oz * 2.2);
    const ts = [0, ...(planes.length ? creases(planes, a, b) : []), 1];
    const pts = ts.map((t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as [number, number]);
    const tops = pts.map((p) => top(p[0], p[1]));
    const gable = tops.some((y) => y > f.h + 0.3);
    let flags = baseFlags | (street ? F_STREET : 0) | (gable ? F_GABLE : 0);
    const jet = style.jetty && street && f.h > style.G + 1.2;
    const lowTop = jet ? style.G : Infinity;
    gb.curStyle = [code, len, flags, style.G + riseCode];
    for (let k = 0; k + 1 < pts.length; k++) {
      const p0 = pts[k], p1 = pts[k + 1];
      const u0 = ts[k] * len, u1 = ts[k + 1] * len;
      const y0 = Math.min(tops[k], lowTop), y1 = Math.min(tops[k + 1], lowTop);
      gb.quad([p0[0], base, p0[1]], [p1[0], base, p1[1]], [p1[0], y1, p1[1]], [p0[0], y0, p0[1]], style.wallTint, out,
        [u0, base, f.h], [u1, base, f.h], [u1, y1, f.h], [u0, y0, f.h]);
    }
    if (jet) {
      // the upper storey stands out over the street on its joists; its top
      // follows the roof planes carried out over it
      gb.curStyle = [code, len, flags | F_JETTY, style.G + riseCode];
      const J = jettyJ, G = style.G;
      const topsJ = pts.map((p, k) => Math.max(G + 0.5, Math.min(tops[k], ...planes.map((pl) => evalPlane(pl, p[0] + ox * J, p[1] + oz * J)))));
      for (let k = 0; k + 1 < pts.length; k++) {
        const p0 = pts[k], p1 = pts[k + 1];
        const u0 = ts[k] * len, u1 = ts[k + 1] * len;
        gb.quad([p0[0] + ox * J, G, p0[1] + oz * J], [p1[0] + ox * J, G, p1[1] + oz * J], [p1[0] + ox * J, topsJ[k + 1], p1[1] + oz * J], [p0[0] + ox * J, topsJ[k], p0[1] + oz * J],
          style.wallTint, out, [u0, G, f.h], [u1, G, f.h], [u1, topsJ[k + 1], f.h], [u0, topsJ[k], f.h]);
      }
      // cheeks at both ends and the soffit under the overhang
      const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
      const n = pts.length - 1;
      gb.quad([a[0], G, a[1]], [a[0] + ox * J, G, a[1] + oz * J], [a[0] + ox * J, topsJ[0], a[1] + oz * J], [a[0], tops[0], a[1]], style.wallTint, [-ux, 0, -uz],
        [0, G, f.h], [0, G, f.h], [0, topsJ[0], f.h], [0, tops[0], f.h]);
      gb.quad([b[0], G, b[1]], [b[0] + ox * J, G, b[1] + oz * J], [b[0] + ox * J, topsJ[n], b[1] + oz * J], [b[0], tops[n], b[1]], style.wallTint, [ux, 0, uz],
        [len, G, f.h], [len, G, f.h], [len, topsJ[n], f.h], [len, tops[n], f.h]);
      gb.curMat = woodLayer + seed;
      gb.curStyle = [0, 0, 0, 0];
      gb.quad([a[0], G, a[1]], [b[0], G, b[1]], [b[0] + ox * J, G, b[1] + oz * J], [a[0] + ox * J, G, a[1] + oz * J], P.TIMBER_DARK, [0, -1, 0]);
      // the joist ends and bressummer: a dark beam along the front
      gb.quad([a[0] + ox * J, G - 0.12, a[1] + oz * J], [b[0] + ox * J, G - 0.12, b[1] + oz * J], [b[0] + ox * J, G, b[1] + oz * J], [a[0] + ox * J, G, a[1] + oz * J], P.TIMBER_DARK, out);
      gb.curMat = wallMat;
    }
    if (style.luifel && street && !gable && len > 3) addLuifel(gb, a, b, ox, oz, len, style.G, seed);
    else if (style.luifel && street && gable && len > 3 && len < 9) addLuifel(gb, a, b, ox, oz, len, style.G, seed);
  }
  gb.curStyle = [0, 0, 0, 0];

  // Roof
  gb.curMat = roofMat;
  if (f.rise <= 0) {
    const tag = [0, 0, -2];
    for (const [i0, i1, i2] of triangulate(ring)) {
      const p = (i: number) => [ring[i][0], f.h, ring[i][1]];
      gb.tri(p(i0), p(i1), p(i2), style.roofTint, UP, tag, tag, tag);
    }
    return;
  }
  // every roof plane is the part of the footprint where it is the lowest plane
  const sideK = f.rise / Math.max(f.hw, 0.01);
  const ridgeV = f.rise * Math.hypot(1, sideK) / sideK;
  for (let pi = 0; pi < planes.length; pi++) {
    const pl = planes[pi];
    let poly = ring;
    for (let pj = 0; pj < planes.length && poly.length >= 3; pj++) {
      if (pj === pi) continue;
      const q = planes[pj];
      poly = clipLinear(poly, q.gx - pl.gx, q.gz - pl.gz, q.c - pl.c);
    }
    if (poly.length < 3) continue;
    const k = Math.hypot(pl.gx, pl.gz);
    const sx = -pl.gz / k, sz = pl.gx / k; // along the eave of this plane
    const shade = style.roofTint.clone().multiplyScalar(pi === 0 ? 1 : pi === 1 ? 0.95 : 0.9);
    gb.curStyle = [0, ridgeV, 0, 0];
    for (const [i0, i1, i2] of triangulate(poly)) {
      const pt = (i: number) => [poly[i][0], Math.max(f.h, evalPlane(pl, poly[i][0], poly[i][1])), poly[i][1]];
      const uv = (i: number) => {
        const y = Math.max(f.h, evalPlane(pl, poly[i][0], poly[i][1]));
        return [poly[i][0] * sx + poly[i][1] * sz, ((y - f.h) * Math.hypot(1, k)) / k, -1];
      };
      gb.tri(pt(i0), pt(i1), pt(i2), shade, UP, uv(i0), uv(i1), uv(i2));
    }
  }
  addEaves(gb, f, ring, planes, style, roofMat, seed, thatch);
  gb.curStyle = [0, 0, 0, 0];

  if (style.stepped) {
    gb.curMat = wallMat;
    addSteppedGables(gb, f, style.wallTint, set.index.stone + seed);
  } else if (style.parapet && f.hip <= 0) {
    addParapets(gb, f, style, wallMat, set.index.stone + seed);
  }
  if (style.chimney) {
    gb.curMat = set.index[f.id % 3 === 0 ? 'brickDark' : 'brickRed'] + seed;
    addChimney(gb, f, P.pick(P.WALL.brickRed.tints, f.id * 3).clone().multiplyScalar(0.85), set.index.stone + seed, thatch);
  }
}

/**
 * Eaves that stand out past the walls (the "box" look comes from roofs cut flush
 * with the walls), verges over gable ends; thatch gets a thick, rounded edge.
 * Each strip is drawn twice: roof on top, dark boarding underneath.
 */
function addEaves(gb: GeomBuilder, f: Footprint, ring: [number, number][], planes: Plane[], style: BuildingStyle, roofMat: number, seed: number, thatch: boolean) {
  const o = thatch ? 0.55 : f.h < 4 ? 0.22 : 0.4;
  const ov = (thatch ? 0.35 : 0.22) + (style.jetty ? 0.36 : 0);
  const under = P.TIMBER_DARK;
  const woodMat = woodLayer + seed;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.3) continue;
    const ox = (b[1] - a[1]) / len, oz = -(b[0] - a[0]) / len;
    const ts = [0, ...creases(planes, a, b), 1];
    const pts = ts.map((t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as [number, number]);
    const tops = pts.map((p) => roofHeight(f, p[0], p[1]));
    const eave = tops.every((y) => y < f.h + 0.05);
    if (eave) {
      // which plane runs down to this edge: the steepest drop outwards
      const pl = planes.reduce((best, p) => (p.gx * ox + p.gz * oz < best.gx * ox + best.gz * oz ? p : best), planes[0]);
      const k = Math.max(0.3, -(pl.gx * ox + pl.gz * oz));
      const drop = o * k;
      const kk = Math.hypot(pl.gx, pl.gz);
      const sx = -pl.gz / kk, sz = pl.gx / kk;
      const vO = (-drop * Math.hypot(1, kk)) / kk;
      // run the strip a little past the corners so neighbouring strips meet
      const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
      const ex = ux * ov, ez = uz * ov;
      const A = [a[0] - ex, f.h, a[1] - ez], B = [b[0] + ex, f.h, b[1] + ez];
      const C = [b[0] + ex + ox * o, f.h - drop, b[1] + ez + oz * o], D = [a[0] - ex + ox * o, f.h - drop, a[1] - ez + oz * o];
      const uvA = [A[0] * sx + A[2] * sz, 0, -1], uvB = [B[0] * sx + B[2] * sz, 0, -1];
      const uvC = [C[0] * sx + C[2] * sz, vO, -1], uvD = [D[0] * sx + D[2] * sz, vO, -1];
      gb.curMat = roofMat;
      gb.curStyle = [0, 0, 0, 0];
      gb.quad(A, B, C, D, style.roofTint, [ox * 0.3, 1, oz * 0.3], uvA, uvB, uvC, uvD);
      gb.curMat = woodMat;
      gb.quad(A, B, C, D, under, [0, -1, 0]);
      if (thatch) {
        // the cut edge of the thatch, a hand thick
        const th = 0.28;
        const C2 = [C[0], C[1] - th, C[2]], D2 = [D[0], D[1] - th, D[2]];
        gb.curMat = roofMat;
        gb.quad(D2, C2, C, D, style.roofTint.clone().multiplyScalar(0.7), [ox, 0, oz], [D[0] * sx + D[2] * sz, vO - 0.3, -1], [C[0] * sx + C[2] * sz, vO - 0.3, -1], uvC, uvD);
        gb.curMat = woodMat;
        gb.quad(A, B, C2, D2, under, [0, -1, 0]);
      }
    } else if (!((style.stepped || (style.parapet && f.hip <= 0)) && Math.abs(ox * f.ux + oz * f.uz) > 0.7 && squareEnd(f, Math.sign(ox * f.ux + oz * f.uz)))) {
      // verge: the roof runs on past the gable wall
      gb.curStyle = [0, 0, 0, 0];
      for (let k = 0; k + 1 < pts.length; k++) {
        const p0 = pts[k], p1 = pts[k + 1];
        const y0 = tops[k] + 0.04, y1 = tops[k + 1] + 0.04;
        const A = [p0[0], y0, p0[1]], B = [p1[0], y1, p1[1]];
        const C = [p1[0] + ox * ov, y1, p1[1] + oz * ov], D = [p0[0] + ox * ov, y0, p0[1] + oz * ov];
        gb.curMat = roofMat;
        const tag = [0, 0, -2];
        gb.quad(A, B, C, D, style.roofTint, UP, tag, tag, tag, tag);
        gb.curMat = woodMat;
        gb.quad(A, B, C, D, under, [0, -1, 0]);
        // barge board
        const th = thatch ? 0.3 : 0.16;
        gb.quad([D[0], D[1] - th, D[2]], [C[0], C[1] - th, C[2]], C, D, under, [ox, 0, oz]);
      }
    }
  }
}

/** A pentice (luifel) over the shop front: planks on brackets, above head height. */
function addLuifel(gb: GeomBuilder, a: [number, number], b: [number, number], ox: number, oz: number, len: number, G: number, seed: number) {
  const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
  const inset = 0.35;
  const y0 = Math.min(G - 0.4, 2.75), y1 = y0 - 0.28, d = 0.75;
  const P0 = [a[0] + ux * inset, y0, a[1] + uz * inset], P1 = [b[0] - ux * inset, y0, b[1] - uz * inset];
  const P2 = [P1[0] + ox * d, y1, P1[2] + oz * d], P3 = [P0[0] + ox * d, y1, P0[2] + oz * d];
  const prev = gb.curMat, prevS = gb.curStyle;
  gb.curMat = woodLayer + seed;
  gb.curStyle = [0, 0, 0, 0];
  const tag = [0, 0, -2];
  gb.quad(P0, P1, P2, P3, P.LUIFEL, [ox * 0.3, 1, oz * 0.3], tag, tag, tag, tag);
  gb.quad(P0, P1, P2, P3, P.TIMBER_DARK, [0, -1, 0]);
  // front board
  gb.quad([P3[0], y1 - 0.12, P3[2]], [P2[0], y1 - 0.12, P2[2]], P2, P3, P.TIMBER_DARK, [ox, 0, oz]);
  gb.curMat = prev;
  gb.curStyle = prevS;
}

/** A brick stack on the ridge near one gable, with a stone cap. */
function addChimney(gb: GeomBuilder, f: Footprint, color: THREE.Color, stoneMat: number, thatch: boolean) {
  // stacks stood on the gable or party wall more often than mid-roof
  const end = hash01(f.id * 29) < 0.5 ? 1 : -1;
  const along = hash01(f.id * 59) < 0.65 ? end * Math.max(0, f.hu - (f.hip > 0 ? f.rise / f.hip + 0.6 : 0.8)) : (hash01(f.id * 29) - 0.5) * f.hu * 1.2;
  const off = hash01(f.id * 61) < 0.6 ? 0 : Math.min(f.hw * 0.25, 0.9) * (hash01(f.id * 31) < 0.5 ? 1 : -1);
  const cx = f.cx + f.ux * along + f.nx * off, cz = f.cz + f.uz * along + f.nz * off;
  const y0 = roofHeight(f, cx, cz) - 0.6;
  // on thatch the flue had to clear the ridge well (fire)
  const y1 = f.h + f.rise + (thatch ? 1.4 : 0.8) + hash01(f.id * 37) * 0.6;
  const hx = 0.4, hz = 0.55;
  const box = (hxx: number, hzz: number, ya: number, yb: number, c: THREE.Color) => {
    const corner = (a: number, b: number, y: number) => [cx + f.ux * a * hzz + f.nx * b * hxx, y, cz + f.uz * a * hzz + f.nz * b * hxx];
    const sides: [number, number][] = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
    for (let i = 0; i < 4; i++) {
      const [a0, b0] = sides[i], [a1, b1] = sides[(i + 1) % 4];
      const mx = (a0 + a1) / 2, mz = (b0 + b1) / 2;
      gb.quad(corner(a0, b0, ya), corner(a1, b1, ya), corner(a1, b1, yb), corner(a0, b0, yb), c, [f.ux * mx + f.nx * mz, 0, f.uz * mx + f.nz * mz]);
    }
    gb.quad(corner(1, 1, yb), corner(1, -1, yb), corner(-1, -1, yb), corner(-1, 1, yb), c.clone().multiplyScalar(0.3), UP);
  };
  box(hx, hz, y0, y1, color);
  // a projecting cap course, blackened by smoke
  const prev = gb.curMat;
  gb.curMat = stoneMat;
  box(hx + 0.08, hz + 0.08, y1, y1 + 0.16, P.SOOT_STONE);
  gb.curMat = prev;
}

/** Plain gable that rises a little above the roof, with shoulder stones and a coping (brick houses). */
function addParapets(gb: GeomBuilder, f: Footprint, style: BuildingStyle, wallMat: number, stoneMat: number) {
  const hgt = 0.32, th = 0.32;
  for (const end of [1, -1]) {
    const uOut = f.hu * end + 0.01 * end, uIn = uOut - th * end;
    const P3 = (s: number, y: number, uu: number) => [f.cx + f.ux * uu + f.nx * s, y, f.cz + f.uz * uu + f.nz * s];
    const outward: [number, number, number] = [f.ux * end, 0, f.uz * end];
    // only where the footprint really ends in a straight gable wall
    if (!squareEnd(f, end)) continue;
    const prof: [number, number][] = [[-f.hw - 0.05, f.h], [0, f.h + f.rise], [f.hw + 0.05, f.h]];
    for (let k = 0; k < 2; k++) {
      const [s0, y0] = prof[k], [s1, y1] = prof[k + 1];
      gb.curMat = wallMat;
      gb.curStyle = [0, 0, 0, 0];
      // outer face continues the gable, inner face looks onto the roof
      gb.quad(P3(s0, y0, uOut), P3(s1, y1, uOut), P3(s1, y1 + hgt, uOut), P3(s0, y0 + hgt, uOut), style.wallTint, outward);
      gb.quad(P3(s0, y0, uIn), P3(s1, y1, uIn), P3(s1, y1 + hgt, uIn), P3(s0, y0 + hgt, uIn), style.wallTint, [-outward[0], 0, -outward[2]]);
      gb.curMat = stoneMat;
      gb.quad(P3(s0, y0 + hgt, uOut + 0.04 * end), P3(s1, y1 + hgt, uOut + 0.04 * end), P3(s1, y1 + hgt, uIn), P3(s0, y0 + hgt, uIn), P.COPING, UP);
    }
    // shoulder stones (schouderstukken) at the foot of the gable
    for (const side of [-1, 1]) {
      const s0 = side * (f.hw + 0.12), s1 = side * (f.hw - 0.45);
      gb.curMat = stoneMat;
      const yb = f.h - 0.05, yt = f.h + 0.42;
      gb.quad(P3(s0, yb, uOut + 0.05 * end), P3(s1, yb, uOut + 0.05 * end), P3(s1, yt, uOut + 0.05 * end), P3(s0, yt, uOut + 0.05 * end), P.COPING, outward);
      gb.quad(P3(s0, yt, uOut + 0.05 * end), P3(s1, yt, uOut + 0.05 * end), P3(s1, yt, uIn), P3(s0, yt, uIn), P.COPING, UP);
      gb.quad(P3(s0, yb, uOut + 0.05 * end), P3(s0, yb, uIn), P3(s0, yt, uIn), P3(s0, yt, uOut + 0.05 * end), P.COPING, [f.nx * side, 0, f.nz * side]);
    }
  }
  gb.curStyle = [0, 0, 0, 0];
}

/** Flemish stepped gable (trapgevel) at both ends of the ridge, each step capped with white stone. */
function addSteppedGables(gb: GeomBuilder, f: Footprint, color: THREE.Color, stoneMat: number) {
  const steps = f.hw * 2 > 7 ? 5 : 4;
  const thick = 0.45;
  // Profile in (s across ridge, y up).
  const prof: [number, number][] = [];
  for (let k = 0; k < steps; k++) {
    const w = f.hw * (1 - k / steps) + 0.12;
    const y0 = f.h + (f.rise * k) / steps;
    const y1 = f.h + (f.rise * (k + 1)) / steps + 0.25;
    prof.push([-w, y0], [-w, y1]);
  }
  const capW = Math.max(0.35, f.hw / steps);
  const top = f.h + f.rise + 0.9;
  prof.push([-capW, f.h + f.rise + 0.25], [-capW, top], [capW, top], [capW, f.h + f.rise + 0.25]);
  for (let k = steps - 1; k >= 0; k--) {
    const w = f.hw * (1 - k / steps) + 0.12;
    const y0 = f.h + (f.rise * k) / steps;
    const y1 = f.h + (f.rise * (k + 1)) / steps + 0.25;
    prof.push([w, y1], [w, y0]);
  }
  const tris = triangulate(prof);
  const wallMat = gb.curMat;
  for (const end of [1, -1]) {
    const uOut = f.hu * end + 0.02 * end;
    const uIn = uOut - thick * end;
    const P3 = (s: number, y: number, uu: number) => [f.cx + f.ux * uu + f.nx * s, y, f.cz + f.uz * uu + f.nz * s];
    const outward: [number, number, number] = [f.ux * end, 0, f.uz * end];
    const inward: [number, number, number] = [-f.ux * end, 0, -f.uz * end];
    gb.curMat = wallMat;
    for (const [a, b, c] of tris) {
      gb.tri(P3(prof[a][0], prof[a][1], uOut), P3(prof[b][0], prof[b][1], uOut), P3(prof[c][0], prof[c][1], uOut), color, outward);
      gb.tri(P3(prof[a][0], prof[a][1], uIn), P3(prof[b][0], prof[b][1], uIn), P3(prof[c][0], prof[c][1], uIn), color, inward);
    }
    for (let i = 0; i < prof.length; i++) {
      const a = prof[i], b = prof[(i + 1) % prof.length];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      const len = Math.hypot(ex, ey) || 1;
      // profile runs clockwise in (s, y) → outward normal is (-ey, ex)
      const ns = -ey / len, ny = ex / len;
      const hint: [number, number, number] = [f.nx * ns, ny, f.nz * ns];
      // the tread of each step is a white sandstone slab
      const tread = ny > 0.9;
      gb.curMat = tread ? stoneMat : wallMat;
      gb.quad(P3(a[0], a[1], uOut), P3(b[0], b[1], uOut), P3(b[0], b[1], uIn), P3(a[0], a[1], uIn), tread ? P.COPING : color, hint);
    }
  }
  gb.curMat = wallMat;
}

// ---------------------------------------------------------------- material

/** The building surface material: PBR texture arrays + shader-drawn facades. */
export function makeBuildingMaterial(set: MaterialSet, shared: { uNight: { value: number } }) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const L = (n: string, fb: string) => set.index[n] ?? set.index[fb];
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, set.uniforms, { uNight: shared.uNight });
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec3 aWall;
attribute float aMat;
attribute vec4 aStyle;
varying vec3 vWall;
varying vec3 vWPos;
varying vec3 vWN;
varying float vMat;
varying vec4 vStyle;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vWall = aWall;
vMat = aMat;
vStyle = aStyle;
vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
vWN = normalize(mat3(modelMatrix) * normal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
precision highp sampler2DArray;
uniform sampler2DArray uAlbedoArr;
uniform sampler2DArray uNormalArr;
uniform vec3 uMean[${set.layers.length}];
uniform float uScale[${set.layers.length}];
uniform float uNight;
varying vec3 vWall;
varying vec3 vWPos;
varying vec3 vWN;
varying float vMat;
varying vec4 vStyle;
${GLSL_COMMON}
vec3 gWN; vec3 gT; vec3 gB; vec3 gNrm; vec3 gEmit;
float gRough; float gAO;
const int L_SLATE = ${set.index.roofSlate};
const int L_THATCH = ${L('thatch', 'roofClay')};
const int L_WOOD = ${L('wood', 'brickDark')};
const int L_IRON = ${L('ironstone', 'stone')};
const int L_STONE = ${set.index.stone};
const int L_BRICK = ${set.index.brickRed};
const int L_DAUB = ${L('daub', 'plaster')};
${GLSL_FACADE}`,
      )
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAG_SURFACE}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = gRough;')
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
{
  vec3 wN = normalize(gT * gNrm.x + gB * gNrm.y + gWN * gNrm.z);
  normal = normalize((viewMatrix * vec4(wN, 0.0)).xyz);
}`,
      )
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += gEmit;')
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= mix(1.0, gAO, 0.85);');
  };
  mat.customProgramCacheKey = () => 'belfort-building-v3';
  return mat;
}

/** Helpers for the facade shader. Colours are linear. */
const GLSL_FACADE = /* glsl */ `
vec3 layerDetail(int l, vec2 p) {
  vec4 a = texture(uAlbedoArr, vec3(p.x / uScale[l], -p.y / uScale[l], float(l)));
  return clamp(toLinear(a.rgb) / uMean[l], 0.0, 2.6);
}
vec3 layerNormal(int l, vec2 p) {
  return texture(uNormalArr, vec3(p.x / uScale[l], -p.y / uScale[l], float(l))).xyz * 2.0 - 1.0;
}
// paint over wood: keep only a hint of the grain so paints stay their colour
vec3 woodPaint(vec3 paint, vec2 p) { return paint * mix(vec3(1.0), layerDetail(L_WOOD, p), 0.35); }
float inRect(vec2 p, vec2 lo, vec2 hi) { return step(lo.x, p.x) * step(p.x, hi.x) * step(lo.y, p.y) * step(p.y, hi.y); }
float bit(float flags, float b) { return mod(floor((flags + 0.5) / b), 2.0); }
// 17th-c. joinery and shutter paints: the Begijnhof's oldest layer is a dark green (NCS S7010-B90G)
vec3 paintFor(float h) {
  return h < 0.34 ? vec3(0.035, 0.07, 0.05)
       : h < 0.55 ? vec3(0.11, 0.028, 0.02)
       : h < 0.72 ? vec3(0.25, 0.12, 0.05)
       : h < 0.86 ? vec3(0.07, 0.1, 0.14)
       : vec3(0.16, 0.13, 0.1);
}
const vec3 C_TIMBER = vec3(0.075, 0.05, 0.034);
const vec3 C_WSTONE = vec3(0.56, 0.52, 0.42);
const vec3 C_IRON = vec3(0.2, 0.11, 0.055);
const vec3 C_TAR = vec3(0.022, 0.02, 0.019);
`;

const FRAG_SURFACE = /* glsl */ `
{
  gWN = normalize(vWN);
  gEmit = vec3(0.0);
  bool flatFace = abs(gWN.y) > 0.999;
  gT = flatFace ? vec3(1.0, 0.0, 0.0) : normalize(vec3(-gWN.z, 0.0, gWN.x));
  gB = cross(gT, gWN);
  int layer = int(vMat);
  float bseed = fract(vMat);
  vec2 uv = vWall.z > -1.5 ? vWall.xy : vec2(dot(vWPos, gT), dot(vWPos, gB));
  vec3 tc = vec3(uv.x / uScale[layer], -uv.y / uScale[layer], float(layer));
  vec4 ar = texture(uAlbedoArr, tc);
  vec4 nao = texture(uNormalArr, tc);
  vec3 detail = clamp(toLinear(ar.rgb) / uMean[layer], 0.0, 2.6);
  diffuseColor.rgb *= detail;
  gRough = ar.a;
  gAO = nao.a;
  gNrm = nao.xyz * 2.0 - 1.0;
  vec3 V = normalize(vWPos - cameraPosition);

  if (vWall.z > -1.5 && vWall.z < 0.0) {
    float ridgeV = vStyle.y;
    float vv = vWall.y;
    float w = vnoise(vWPos.xz * 0.45) * 0.6 + vnoise(vWPos.xz * 1.9) * 0.4;
    if (layer == L_THATCH) {
      // thatch: grey-brown with age, golden where it was patched, moss low down and on the ridge
      float patchy = vnoise(vWPos.xz * 0.3 + bseed * 17.0);
      diffuseColor.rgb *= mix(vec3(0.82, 0.84, 0.86), vec3(1.15, 1.05, 0.82), smoothstep(0.55, 0.8, patchy));
      diffuseColor.rgb *= 0.78 + 0.4 * w;
      float moss = smoothstep(0.5, 0.78, vnoise(vWPos.xz * 0.5 + bseed * 40.0)) * (0.35 + 0.4 * smoothstep(1.5, 0.0, vv));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.11, 0.05), moss * 0.45);
      gRough = 0.95;
      if (ridgeV > 0.5) {
        // the ridge was capped with turf or clay, sprouting grass
        float rg = smoothstep(ridgeV - 0.55, ridgeV - 0.4, vv + (vnoise(vWall.xx * 2.0) - 0.5) * 0.15);
        vec3 turf = mix(vec3(0.07, 0.055, 0.035), vec3(0.08, 0.11, 0.035), vnoise(vWall.xy * 3.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, turf, rg);
      }
      // the lower course is darker, wet and shaded
      diffuseColor.rgb *= mix(0.7, 1.0, smoothstep(-0.6, 0.6, vv));
    } else {
      bool slate = layer == L_SLATE;
      vec2 tsize = slate ? vec2(0.34, 0.44) : vec2(0.25, 0.34);
      vec2 tuv = vWall.xy / tsize;
      if (slate) tuv.x += 0.5 * mod(floor(tuv.y), 2.0);
      vec2 tf = fract(tuv);
      float tfade = 1.0 - smoothstep(0.12, 0.55, fwidth(tuv.y) + fwidth(tuv.x));
      float lip = smoothstep(0.0, 0.26, tf.y);
      float each = 0.84 + 0.32 * hash12(floor(tuv) + bseed * 31.0);
      if (slate) {
        float gap = smoothstep(0.0, 0.07, min(tf.x, 1.0 - tf.x));
        diffuseColor.rgb *= mix(1.0, (0.58 + 0.42 * lip) * (0.82 + 0.18 * gap) * each, tfade);
        gNrm = normalize(gNrm + vec3(0.0, (0.5 - tf.y) * 0.55 * tfade, 0.0));
      } else {
        // Flemish pantiles: S-curved, so each row is a run of rolls and troughs
        float roll = sin(tf.x * 6.2832);
        float shadeR = 0.72 + 0.28 * (0.5 + 0.5 * roll);
        diffuseColor.rgb *= mix(1.0, (0.6 + 0.4 * lip) * shadeR * each, tfade);
        gNrm = normalize(gNrm + vec3(cos(tf.x * 6.2832) * 0.5 * tfade, (0.5 - tf.y) * 0.45 * tfade, 0.0));
        // a few replaced tiles, brighter, and old blackened ones
        float odd = hash12(floor(tuv) * 1.7 + bseed * 13.0);
        diffuseColor.rgb *= odd > 0.97 ? vec3(1.25, 1.1, 0.95) : odd < 0.05 ? vec3(0.6, 0.55, 0.5) : vec3(1.0);
        if (ridgeV > 0.5) {
          float rg = step(ridgeV - 0.22, vv);
          diffuseColor.rgb *= mix(1.0, 0.62 + 0.2 * step(0.1, fract(vWall.x / 0.42)), rg);
        }
      }
      diffuseColor.rgb *= 0.8 + 0.34 * w;
      // moss and lichen, thicker towards the eaves
      float moss = smoothstep(0.58, 0.8, vnoise(vWPos.xz * 0.23 + bseed * 40.0)) * (0.3 + 0.3 * smoothstep(2.5, 0.0, vv));
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.1, 0.13, 0.05), moss);
      float lichen = step(0.93, hash12(floor(vWall.xy * 3.0) + bseed * 9.0)) * 0.5;
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.45, 0.32, 0.12), lichen * (slate ? 0.6 : 0.4));
    }
  }

  // any upright face: damp and splash at the foot, a little general grime
  if (!flatFace && abs(gWN.y) < 0.5 && vWall.z < 0.5) {
    float dmp = smoothstep(1.2, 0.0, vWPos.y + (vnoise(vWPos.xz * 1.3) - 0.5) * 0.8);
    diffuseColor.rgb *= mix(1.0, 0.66, dmp);
  }

  if (vWall.z > 0.5) {
    float E = vWall.z;
    float u = vWall.x;
    float v = vWall.y;
    float typ = floor(vStyle.x + 0.001);
    float sd = fract(vStyle.x);
    float Lw = max(vStyle.y, 0.5);
    float flags = vStyle.z;
    bool street = bit(flags, 1.0) > 0.5;
    bool rich = bit(flags, 2.0) > 0.5;
    bool gableW = bit(flags, 4.0) > 0.5;
    bool poor = bit(flags, 16.0) > 0.5;
    float G = mod(vStyle.w + 0.001, 10.0);
    float rise = floor((vStyle.w + 0.001) / 10.0) / 4.0;
    bool church = typ > 7.5 && typ < 8.5;
    vec3 col = diffuseColor.rgb;
    vec3 wallBase = col;

    // grime rising from the street, rain streaks below the eave
    float grime = mix(0.7, 1.0, smoothstep(0.0, 1.6, v + (vnoise(vec2(u * 0.8, 3.0)) - 0.5) * 0.8));
    float streak = mix(0.84, 1.0, smoothstep(0.0, 0.9, E - v + (vnoise(vec2(u * 2.3, 9.0)) - 0.5) * 0.7));
    col *= grime * streak;

    if (church) {
      // ironstone walls; tall pointed lancets in white sandstone frames, buttresses with white quoins
      float cu = fract(u / 4.4);
      float ci = floor(u / 4.4);
      float x = abs(cu - 0.5) * 2.0;
      float top = E - 1.3;
      float sill = min(3.0, E * 0.28);
      float arch = top - 2.2 * (x / 0.42) * (x / 0.42);
      float win = step(x, 0.42) * step(sill, v) * step(v, arch);
      float surround = step(x, 0.52) * step(sill - 0.3, v) * step(v, arch + 0.45) * (1.0 - win);
      vec3 ws = C_WSTONE * 0.85 * layerDetail(L_STONE, vec2(u, v) * 0.7) * (0.8 + 0.3 * vnoise(vec2(u, v) * 4.0));
      col = mix(col, ws * grime * streak, surround);
      // buttress between bays, with white stone corner blocks
      float bt = 1.0 - smoothstep(0.0, 0.09, abs(cu - 0.02));
      float quoin = bt * step(0.5, fract(v / 0.62));
      col = mix(col * mix(0.7, 1.0, 1.0 - bt), ws, quoin * 0.8);
      if (win > 0.5) {
        vec2 cell = floor(vec2(u, v) / 0.21);
        float h = hash12(cell + ci * 17.0);
        vec3 glass = h < 0.3 ? vec3(0.08, 0.14, 0.5) : h < 0.55 ? vec3(0.5, 0.06, 0.07) : h < 0.78 ? vec3(0.62, 0.42, 0.08) : vec3(0.1, 0.36, 0.2);
        vec2 f2 = abs(fract(vec2(u, v) / 0.21) - 0.5);
        float leadFade = 1.0 - smoothstep(0.0, 0.5, fwidth(u) * 6.0);
        float lead = (step(0.43, max(f2.x, f2.y)) * leadFade + (1.0 - step(0.035, x)) + (1.0 - step(0.02, abs(x - 0.21))));
        vec3 gcol = mix(glass, vec3(0.02), min(lead, 1.0));
        col = mix(vec3(0.03, 0.033, 0.04), gcol, 0.1);
        gEmit = gcol * uNight * 0.7;
        gRough = 0.16;
        gNrm = vec3(0.0, 0.0, 1.0);
        gAO = 1.0;
      }
      diffuseColor.rgb = col;
    } else {
      bool timber = typ > 0.5 && typ < 1.5;
      bool brick = typ > 1.5 && typ < 2.5;
      bool plaster = typ > 2.5 && typ < 3.5;
      bool stoneH = typ > 3.5 && typ < 4.5;
      bool farm = typ > 4.5 && typ < 5.5;
      bool barn = typ > 5.5 && typ < 6.5;
      bool begijn = typ > 6.5 && typ < 7.5;
      bool hall = typ > 8.5;
      bool framed = timber || farm;
      bool stoneFrames = brick || stoneH || begijn || hall || (plaster && rich);
      float h0 = hash12(vec2(sd * 91.0, 3.0));
      float h1 = hash12(vec2(sd * 57.0, 11.0));
      vec3 paint = begijn ? vec3(0.035, 0.07, 0.05) : paintFor(h0);
      vec2 p = vec2(u, v);

      // ---- storeys
      bool single = E - G < 1.6;
      float nU = single ? 0.0 : max(1.0, floor((E - G) / 2.45));
      float FH = single ? 3.0 : (E - G) / nU;
      float s = v < G || single ? 0.0 : (v < E ? 1.0 + floor((v - G) / FH) : 99.0);
      float sy = s < 0.5 ? v : (s > 50.0 ? v - E : v - G - (s - 1.0) * FH);
      float sh = s < 0.5 ? (single ? E : G) : FH;

      // ---- plinth (sokkel): ironstone, tarred brick or a low wall under the sill beam
      float plH = framed ? 0.42 : (rich ? 0.85 : 0.6);
      plH += (vnoise(vec2(u * 0.7, sd * 9.0)) - 0.5) * 0.06;
      float plinth = step(v, plH);
      vec3 ironC = C_IRON * layerDetail(L_IRON, p) * (0.85 + 0.3 * h1);
      if (plinth > 0.5 && !barn) {
        if (plaster || begijn) col = C_TAR * (0.9 + 0.3 * vnoise(p * 6.0));
        else if (brick && !rich) col = mix(col * 0.45, C_TAR, 0.5);
        else col = ironC;
        gRough = 0.8;
      }

      // ---- timber framing (vakwerk): posts, sill, rails, top plate, braces
      float np = max(2.0, floor(Lw / (farm ? 1.0 : 0.82) + 0.5));
      float pw = Lw / np;
      float pi = floor(u / pw);
      float pf = u - pi * pw;
      float tim = 0.0;
      vec2 timUV = p;
      if (framed && plinth < 0.5) {
        float postW = farm ? 0.1 : 0.085;
        float post = step(pf, postW) + step(pw - postW, pf);
        float sill = inRect(p, vec2(-1.0, plH), vec2(Lw + 1.0, plH + 0.2));
        float plate = step(E - 0.2, v) * step(v, E + 0.02);
        float floorB = single ? 0.0 : step(abs(v - G), 0.13);
        // one rail through each storey at sill height (Flemish frames are mostly posts)
        float rail = s < 50.0 ? step(abs(sy - (s < 0.5 ? 1.0 : 0.75)), 0.055) : 0.0;
        // braces in the end panels of each storey
        float endP = step(pi, 0.5) + step(np - 1.5, pi);
        float xl = pi < 0.5 ? pf / pw : 1.0 - pf / pw;
        float brace = endP * step(abs(xl - sy / sh), 0.09 * pw / max(sh, 0.5)) * step(s, 50.0);
        // St Andrew's crosses under the windows of better houses
        float under = rich && s > 0.5 && s < 50.0 && sy < 0.8 && mod(pi, 2.0) > 0.5 ? step(min(abs(pf / pw - sy / 0.8), abs(1.0 - pf / pw - sy / 0.8)), 0.08) : 0.0;
        tim = min(1.0, post * step(v, E + 0.02) + sill + plate + floorB + rail + brace + under);
        if (s > 50.0) {
          // gable: planked (vertical boards) on half the houses, framed on the rest
          if (h1 < 0.55 || farm) tim = 2.0;
          else tim = min(1.0, post + step(abs(v - E - rise * 0.5), 0.07));
        }
        timUV = (rail + floorB + sill + plate) > 0.5 ? vec2(v, u) : p;
        // the infill: limewash over loam, flaking here and there
        float flake = smoothstep(0.7, 0.82, vnoise(p * 2.6 + sd * 30.0)) * (poor ? 0.6 : 0.3);
        col = mix(col, wallBase * vec3(0.72, 0.6, 0.45) * grime, flake * 0.6);
      }

      // ---- brick dressings: quoins, sandstone bands (speklagen), cordons
      if ((brick || stoneH || begijn || hall) && plinth < 0.5) {
        float cu2 = min(u, Lw - u);
        float course = floor(v / 0.3);
        float qw = mod(course, 2.0) < 0.5 ? 0.52 : 0.3;
        float quoin = step(cu2, qw) * step(v, E + 0.05) * step(1.3, Lw);
        vec3 qc = (rich || begijn) && h1 < 0.6 ? C_WSTONE * layerDetail(L_STONE, p * 0.8) : ironC;
        if (brick && (rich || h1 < 0.5)) col = mix(col, qc * grime, quoin);
        if ((begijn || hall || stoneH) && h1 < 0.7) col = mix(col, (hall ? C_WSTONE : ironC) * grime, quoin);
        float band = 0.0;
        if (brick && rich) band = step(mod(v - plH, 0.66), 0.14) * step(v, E);
        if (brick || hall) band = max(band, step(abs(v - G - 0.06), 0.09) * (single ? 0.0 : 1.0));
        col = mix(col, C_WSTONE * layerDetail(L_STONE, p * 0.8) * grime * streak, band * 0.9);
      }
      if ((plaster || begijn) && plinth < 0.5) {
        // limewash worn thin, the brick showing through in patches
        float worn = smoothstep(0.6, 0.78, vnoise(p * 0.9 + sd * 20.0));
        col = mix(col, col * vec3(0.78, 0.6, 0.48) * mix(vec3(1.0), layerDetail(L_BRICK, p), 0.5), worn * 0.45);
      }
      if (barn) {
        // boards or daub; a tarred lower band
        col *= mix(1.0, 0.55, step(v, 0.5));
      }

      // ---- openings: where they go
      // bays: timber houses put windows between posts; brick fronts are laid out in bays
      float bw = framed ? pw : (hall ? 3.6 : 2.4);
      float nb = framed ? np : max(1.0, floor(Lw / bw + 0.3));
      bw = Lw / nb;
      float bi = floor(u / bw);
      float bx = u - (bi + 0.5) * bw;
      float hb = hash12(vec2(bi * 1.37 + sd * 97.0, s * 7.1 + sd * 13.0));
      float doorBay = floor(hash12(vec2(sd * 31.0, 5.0)) * nb * 0.999);
      bool facade = street || Lw > 3.4;
      // kinds: 0 none, 1 window, 2 cross-window, 3 door, 4 shop front, 5 hatch, 6 barn door, 7 arch (hall)
      float kind = 0.0;
      vec2 wlo = vec2(0.0), whi = vec2(0.0);
      if (s > 50.0) {
        // garret in the gable: a hoisting hatch near the top, small windows lower down
        if (gableW && rise > 2.4 && !barn) {
          float cx = u - Lw * 0.5;
          float hy0 = rise > 5.0 ? 2.4 : 0.6;
          if (abs(cx) < 0.42 && sy > hy0 && sy < hy0 + min(1.3, rise * 0.4)) { kind = 5.0; wlo = vec2(-0.42, hy0); whi = vec2(0.42, hy0 + min(1.3, rise * 0.4)); }
          if (rise > 5.0 && abs(abs(cx) - 1.2) < 0.32 && sy > 0.6 && sy < 1.5) { kind = 1.0; float sx = sign(cx) * 1.2; wlo = vec2(sx - 0.32, 0.6); whi = vec2(sx + 0.32, 1.5); }
          bx = cx;
        }
      } else if (barn) {
        if (street && !gableW && Lw > 4.0 && abs(u - Lw * 0.5) < 1.4) { kind = 6.0; bx = u - Lw * 0.5; wlo = vec2(-1.4, 0.0); whi = vec2(1.4, min(E - 0.3, 3.2)); }
        if (gableW && Lw > 4.0 && abs(u - Lw * 0.5) < 1.25) { kind = 6.0; bx = u - Lw * 0.5; wlo = vec2(-1.25, 0.0); whi = vec2(1.25, min(E + 0.6, 3.4)); }
      } else if (facade) {
        float halfW = framed ? min(0.5, pw * 0.5 - 0.11) : 0.5;
        if (s < 0.5) {
          bool doorHere = (street || Lw > 5.0) && bi == doorBay && Lw > 1.6;
          if (framed) doorHere = (street || Lw > 5.0) && bi == doorBay;
          float wprob = framed ? (street ? 0.35 : 0.1) : street ? (poor ? 0.4 : 0.55) : 0.15;
          if (hall) {
            kind = mod(bi, 2.0) < 0.5 || bi == doorBay ? 7.0 : 1.0;
            if (kind > 6.5) { wlo = vec2(-0.85, 0.0); whi = vec2(0.85, min(G - 0.4, 3.3)); }
            else { wlo = vec2(-0.5, 1.4); whi = vec2(0.5, min(G - 0.5, 2.8)); }
          } else if (doorHere) {
            kind = 3.0;
            float dh = min(2.05, sh - 0.35);
            float dw = framed ? min(0.48, halfW) : 0.5;
            wlo = vec2(-dw, 0.02); whi = vec2(dw, dh);
          } else if (street && rich && !begijn && hb < 0.42 && bw > 1.9) {
            kind = 4.0; wlo = vec2(-0.85, 0.75); whi = vec2(0.85, min(2.3, sh - 0.4));
          } else if (hb < wprob) {
            kind = 1.0;
            float sill = begijn ? 1.55 : farm ? 1.1 : 1.05;
            float hw = farm ? min(0.34, halfW) : min(0.42, halfW);
            wlo = vec2(-hw, sill); whi = vec2(hw, min(sill + (farm ? 0.75 : 1.05), sh - 0.3));
          }
        } else if (!farm) {
          float wprob = framed ? (street ? (rich ? 0.6 : 0.45) : 0.15) : street ? (rich ? 0.9 : poor ? 0.5 : 0.7) : 0.25;
          if (hb < wprob) {
            kind = framed ? 1.0 : 2.0;
            if (hall) kind = 2.0;
            float ww = framed ? halfW : (rich ? 0.55 : 0.48);
            if (hall) ww = 0.7;
            float sill = 0.75;
            if (framed) ww = min(ww, 0.4);
            wlo = vec2(-ww, sill); whi = vec2(ww, min(sill + (framed ? 1.0 : 1.55), sh - 0.25));
          }
        }
      }
      if (whi.y - wlo.y < 0.4) kind = 0.0;
      vec2 m = vec2(bx, sy);

      // relieving arch over windows in brick fronts
      if ((brick || plaster) && !framed && (kind == 1.0 || kind == 2.0 || kind == 3.0) && plinth < 0.5) {
        float aw = (whi.x - wlo.x) * 0.5 + 0.18;
        vec2 q = vec2(m.x / aw, (m.y - whi.y) / 0.34);
        float r = length(q);
        float ring = step(0.62, r) * step(r, 1.0) * step(0.0, q.y);
        col = mix(col, col * vec3(0.8, 0.68, 0.62), ring * (brick ? 0.85 : 0.35));
      }
      // niche with the house saint over the door (Begijnhof)
      if (begijn && s < 0.5 && bi == doorBay && plinth < 0.5) {
        vec2 q = vec2(m.x, sy - 2.35);
        float nicheF = inRect(q, vec2(-0.32, -0.08), vec2(0.32, 0.8)) * step(length(vec2(q.x, max(q.y - 0.5, 0.0))), 0.32);
        float nicheI = inRect(q, vec2(-0.22, 0.02), vec2(0.22, 0.72)) * step(length(vec2(q.x, max(q.y - 0.5, 0.0))), 0.22);
        col = mix(col, C_WSTONE, nicheF * (1.0 - nicheI));
        float fig = step(length((q - vec2(0.0, 0.3)) / vec2(0.07, 0.24)), 1.0) + step(length(q - vec2(0.0, 0.58)), 0.05);
        if (nicheI > 0.5) col = mix(vec3(0.05, 0.08, 0.2), vec3(0.75, 0.72, 0.65), min(fig, 1.0));
      }

      float inO = kind > 0.5 ? inRect(m, wlo, whi) : 0.0;
      // the frame round the opening: white stone, ironstone or dark oak
      float frW = stoneFrames ? 0.13 : 0.075;
      float inF = kind > 0.5 ? inRect(m, wlo - vec2(frW, kind == 3.0 || kind == 6.0 || kind == 7.0 ? 0.0 : frW), whi + vec2(frW, frW)) : 0.0;
      bool kindArch = kind == 7.0;
      if (kindArch) {
        // pointed arch: cut the top corners
        float ax = abs(m.x) / 0.85;
        float archTop = whi.y - 0.9 + 0.9 * sqrt(max(0.0, 1.0 - ax * ax));
        inO *= step(m.y, archTop);
        inF = kind > 0.5 ? inRect(m, wlo - vec2(0.16, 0.0), whi + vec2(0.16, 0.2)) * step(m.y, archTop + 0.2) : 0.0;
      }
      if (inF > 0.5 && inO < 0.5) {
        vec3 fc = stoneFrames ? ((begijn || stoneH) && h1 > 0.6 ? ironC : C_WSTONE * layerDetail(L_STONE, p * 0.8)) : C_TIMBER * layerDetail(L_WOOD, p.yx);
        col = fc * grime * (0.85 + 0.3 * vnoise(p * 9.0));
        gRough = 0.85;
        gNrm = vec3(0.0, 0.0, 1.0);
        tim = 0.0;
      }
      // timber after frames so the posts run past windows correctly
      if (tim > 0.5 && inO < 0.5 && inF < 0.5) {
        if (tim > 1.5) {
          // vertical boards in the gable
          vec3 wd = layerDetail(L_WOOD, vec2(u * 0.9, v));
          col = vec3(0.16, 0.12, 0.085) * wd * (0.75 + 0.5 * h1) * mix(1.0, 0.45, step(fract(u / 0.24), 0.08));
          gNrm = layerNormal(L_WOOD, vec2(u * 0.9, v));
        } else {
          vec3 wd = layerDetail(L_WOOD, timUV);
          col = C_TIMBER * wd * (h1 < 0.15 ? vec3(2.0, 1.4, 1.0) : vec3(1.0)) * grime;
          gNrm = normalize(vec3(layerNormal(L_WOOD, timUV).xy * 0.6, 1.0));
        }
        gRough = 0.8;
      }

      // ---- what is in the opening
      if (inO > 0.5) {
        gNrm = vec3(0.0, 0.0, 1.0);
        gAO = 1.0;
        vec2 o = m - wlo;
        vec2 sz = whi - wlo;
        float rs = hash12(vec2(bi * 3.7 + sd * 57.0, s * 5.3 + 1.0));
        vec3 wd = layerDetail(L_WOOD, vec2(o.x * 1.3, o.y));
        if (kind == 3.0 || kind == 6.0 || kind == 5.0 || (kindArch && hb < 0.5)) {
          // plank door: boards of uneven width, iron strap hinges, a split (stable) door on some
          float seamP = fract(o.x / (kind == 6.0 ? 0.26 : 0.19) + hash12(vec2(floor(o.x / 0.19), sd)) * 0.1);
          float seam = step(seamP, 0.07);
          vec3 dpaint = kind == 6.0 || (h1 < 0.3 && !begijn) ? vec3(0.13, 0.1, 0.075) : paint * 1.4;
          vec3 dc = woodPaint(dpaint, vec2(o.x * 1.3, o.y)) * mix(1.0, 0.45, seam);
          float strap = (step(abs(o.y - 0.35), 0.035) + step(abs(o.y - (sz.y - 0.35)), 0.035)) * step(o.x, sz.x * 0.62);
          float split = kind == 3.0 && h0 > 0.5 ? step(abs(o.y - 1.05), 0.025) : 0.0;
          dc = mix(dc, vec3(0.025, 0.022, 0.02), min(1.0, strap * 0.9 + split * 0.8));
          if (kind == 6.0) dc = mix(dc, dc * 0.4, step(abs(o.x - sz.x * 0.5), 0.03));
          // a low door in a deep reveal: darker at the edges
          float edge = min(min(o.x, sz.x - o.x), sz.y - o.y);
          dc *= mix(0.55, 1.0, smoothstep(0.0, 0.12, edge));
          col = dc;
          gRough = 0.75;
          gNrm = normalize(vec3((seam - 0.5) * 0.25, 0.0, 1.0));
        } else if (kind == 4.0 || kindArch) {
          // open shop front: dark interior with goods, a counter flap let down, the upper shutter propped up
          vec3 inside = vec3(0.05, 0.035, 0.025) * (0.6 + 0.8 * vnoise(o * 6.0 + rs * 9.0));
          float shelf = step(fract(o.y / 0.42), 0.12);
          inside = mix(inside, vec3(0.16, 0.1, 0.05), shelf * 0.6);
          float goods = step(0.55, vnoise(o * vec2(5.0, 2.0) + rs * 17.0)) * (1.0 - shelf);
          inside = mix(inside, mix(vec3(0.25, 0.16, 0.06), vec3(0.3, 0.26, 0.18), rs), goods * 0.6);
          float counter = step(o.y, 0.18);
          float flap = step(sz.y - 0.22, o.y);
          col = mix(inside, woodPaint(paint * 1.4, o), max(counter, flap));
          gEmit = inside * vec3(1.0, 0.6, 0.3) * uNight * 3.0;
          gRough = 0.8;
        } else {
          // window: cross-window with leaded lights above and shutters below
          bool cross = kind == 2.0;
          float midX = sz.x * 0.5;
          float tr = sz.y * (cross ? 0.58 : 0.5);
          float bar = cross ? step(abs(o.x - midX), stoneFrames ? 0.06 : 0.04) + step(abs(o.y - tr), 0.05) : step(abs(o.y - tr), 0.035);
          bool lower = o.y < tr;
          float shutP = kind == 1.0 && s < 0.5 ? 0.72 : 0.5;
          bool shut = lower && fract(rs * 7.3) < shutP;
          bool shutAll = kind == 1.0 && s < 0.5 && fract(rs * 3.1) < 0.25;
          if (bar > 0.5 && !shutAll) {
            col = stoneFrames && cross ? C_WSTONE * layerDetail(L_STONE, p * 0.8) * grime : C_TIMBER * 1.3;
            gRough = 0.8;
          } else if (shut || shutAll) {
            // shutters: planked, painted; some in the diagonal two-colour bands of the paintings
            float sx = cross ? mod(o.x, midX) : o.x;
            float sw = cross ? midX : sz.x;
            float sYlo = shutAll ? 0.0 : 0.0;
            float sYhi = shutAll ? sz.y : tr;
            vec3 sp = woodPaint(paint * 1.25, vec2(o.x * 1.6, o.y));
            if (h1 > 0.82 && !begijn) {
              float dg = fract((abs(sx - sw * 0.5) + (o.y - sYlo)) / 0.22);
              sp = mix(sp, vec3(0.5, 0.46, 0.38), step(0.5, dg));
            }
            float rim = step(min(min(sx, sw - sx), min(o.y - sYlo, sYhi - o.y)), 0.04);
            float sseam = step(fract(sx / 0.15), 0.1);
            col = sp * mix(1.0, 0.6, rim) * mix(1.0, 0.7, sseam);
            gRough = 0.75;
          } else {
            // leaded glass: small quarries, diamonds in the older windows; dark, catching the sky
            vec2 g = o;
            vec2 qd = h0 < 0.5 ? vec2(g.x + g.y, g.x - g.y) * 0.7071 / 0.13 : g / vec2(0.12, 0.155);
            vec2 qf = abs(fract(qd) - 0.5);
            float leadW = fwidth(qd.x) * 1.5;
            float lead = smoothstep(0.5 - max(0.06, leadW), 0.5, max(qf.x, qf.y)) * (1.0 - smoothstep(0.08, 0.25, leadW));
            float qh = hash12(floor(qd) + rs * 7.0);
            float fres = pow(1.0 - abs(dot(V, gWN)), 3.0);
            vec3 glass = vec3(0.03, 0.036, 0.03) * (0.7 + 0.6 * qh) + vec3(0.16, 0.17, 0.16) * (0.06 + 0.3 * fres) * (0.6 + 0.8 * qh);
            col = mix(glass, vec3(0.02, 0.018, 0.016), lead * 0.85);
            float lit = step(1.0 - uNight * 0.58, hash12(vec2(rs * 113.0, bseed * 7.0 + bi)));
            gEmit = vec3(1.0, 0.55, 0.22) * lit * (0.8 + 1.2 * fract(rs * 43.0)) * (1.0 - lead) * (0.6 + 0.4 * qh);
            gRough = 0.1;
            gNrm = normalize(vec3((qh - 0.5) * 0.12, (fract(qh * 7.0) - 0.5) * 0.12, 1.0));
          }
        }
      }
      // rain streaks under sills
      if (kind > 0.5 && kind < 3.5 && inF < 0.5 && m.y < wlo.y && m.y > wlo.y - 1.4 && abs(m.x) < (whi.x - wlo.x) * 0.5) {
        col *= mix(1.0, 0.78, smoothstep(0.4, 0.8, vnoise(vec2(u * 7.0, 1.0))) * smoothstep(wlo.y - 1.4, wlo.y, m.y));
      }

      // ---- iron wall anchors on brick and stone fronts, at the floor beams and gable
      if ((brick || stoneH || hall || begijn) && plinth < 0.5) {
        float ay = single ? E - 0.35 : G + 0.05;
        float ax = mod(u - 0.55, 1.7);
        float anch = step(abs(ax - 0.85), 0.035) * step(abs(v - ay), 0.26) + step(abs(ax - 0.85), 0.12) * step(abs(v - ay), 0.03);
        anch *= step(0.3, u) * step(u, Lw - 0.3) * step(1.0 - inF, 0.5);
        if (gableW && v > E) anch = step(abs(u - Lw * 0.5), 0.035) * step(abs(v - E - rise * 0.62), 0.3);
        col = mix(col, vec3(0.02, 0.018, 0.017), min(anch, 1.0) * (brick || begijn ? 1.0 : 0.0));
      }

      // ---- weathering: damp and moss at the foot, splash, lime runs, soot under the eaves
      float damp = smoothstep(0.95, 0.0, v + (vnoise(vec2(u * 1.3, sd * 5.0)) - 0.5) * 0.7);
      col *= mix(1.0, 0.62, damp);
      col = mix(col, col * vec3(0.8, 0.95, 0.72), damp * 0.5 * step(0.5, vnoise(vec2(u * 3.0, v * 3.0))));
      col *= 0.9 + 0.2 * vnoise(vec2(u * 0.4 + sd * 30.0, v * 0.25));
      if (v > E - 0.6 && v < E + 0.05 && !gableW) col *= 0.78;
      diffuseColor.rgb = col;
    }
  }
}
`;

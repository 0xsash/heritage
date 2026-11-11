// Turns real OSM footprints into Flemish buildings with photographic PBR
// materials: brick, whitewash and ironstone walls, clay and slate roofs whose
// ridge follows the long axis (so narrow town houses show their gable to the
// street), stepped gables in the old town, chimneys, and windows drawn by the
// shader with a mapped interior behind the glass.

import * as THREE from 'three';
import { hash01 } from '../core/math';
import { GLSL_COMMON, type MaterialSet } from '../render/textures';
import { type Footprint, roofHeight } from './footprint';
import { GeomBuilder, clipHalf, signedArea, triangulate } from './geom';
import * as P from './palette';

const UP: [number, number, number] = [0, 1, 0];
const OLD_TOWN_R = 720; // metres from Grote Markt

export interface BuildingStyle {
  wall: P.Surface;
  wallTint: THREE.Color;
  roof: P.Surface;
  roofTint: THREE.Color;
  stepped: boolean;
  chimney: boolean;
}

export function styleFor(f: Footprint): BuildingStyle {
  const s = f.id;
  const dist = Math.hypot(f.cx, f.cz);
  const k = f.kind;
  const area = f.hu * f.hw * 4;
  const church = k === 'church' || k === 'basilica' || k === 'chapel' || k === 'cathedral';
  const r = hash01(s * 3 + 1);
  let wall: P.Surface, roof: P.Surface;
  if (church) {
    wall = k === 'basilica' ? P.WALL.limestone : P.WALL.ironstone;
    roof = P.ROOF.slate;
  } else if (area > 900 || k === 'industrial' || k === 'warehouse' || k === 'retail' || k === 'barn' || k === 'farm_auxiliary') {
    wall = r < 0.5 ? P.WALL.barn : r < 0.8 ? P.WALL.brickOld : P.WALL.whitewash;
    roof = hash01(s * 7) < 0.8 ? P.ROOF.clay : P.ROOF.slate;
  } else if (dist < OLD_TOWN_R) {
    wall = r < 0.34 ? P.WALL.brickRed : r < 0.54 ? P.WALL.brickOld : r < 0.64 ? P.WALL.brickDark : r < 0.84 ? P.WALL.whitewash : P.WALL.plaster;
    roof = hash01(s * 7 + 3) < 0.58 ? P.ROOF.clay : P.ROOF.slate;
  } else {
    wall = r < 0.36 ? P.WALL.whitewash : r < 0.66 ? P.WALL.brickRed : r < 0.84 ? P.WALL.brickOld : P.WALL.plaster;
    roof = hash01(s * 7 + 3) < 0.76 ? P.ROOF.clay : P.ROOF.slate;
  }
  const width = f.hw * 2;
  const town = dist < OLD_TOWN_R;
  const stepped = !church && town && f.rise > 0 && width > 3.5 && width < 11 && f.hu * 2 > width * 0.9 && hash01(s * 13) < 0.62;
  const chimney = !church && f.rise > 1.2 && area > 35 && area < 700;
  return {
    wall, wallTint: P.pick(wall.tints, s * 5 + 2),
    roof, roofTint: P.pick(roof.tints, s * 11 + 4),
    stepped, chimney,
  };
}

export function addBuilding(gb: GeomBuilder, f: Footprint, style: BuildingStyle, set: MaterialSet) {
  const seed = hash01(f.id * 17 + 5) * 0.98;
  const wallMat = set.index[style.wall.mat] + seed;
  const roofMat = set.index[style.roof.mat] + seed;
  let ring = f.ring.slice();
  if (signedArea(ring) < 0) ring.reverse();

  // Insert ridge crossings so gable-end walls rise to the ridge.
  if (f.rise > 0) {
    const out: [number, number][] = [];
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      out.push(a);
      const da = (a[0] - f.cx) * f.nx + (a[1] - f.cz) * f.nz;
      const db = (b[0] - f.cx) * f.nx + (b[1] - f.cz) * f.nz;
      if (da * db < 0) {
        const t = da / (da - db);
        out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
      }
    }
    ring = out;
  }

  // Walls
  gb.curMat = wallMat;
  const base = -0.3;
  let u = hash01(f.id) * 3;
  const church = f.kind === 'church' || f.kind === 'basilica' || f.kind === 'chapel' || f.kind === 'cathedral';
  const plainWalls = SHEDLIKE.has(f.kind) || f.h < 2.6;
  const wallH = plainWalls ? 0.01 : church ? f.h + 1000 : f.h; // > 1000 → lancet windows; ~0 → no openings
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.05) continue;
    const ta = roofHeight(f, a[0], a[1]);
    const tb = roofHeight(f, b[0], b[1]);
    const out: [number, number, number] = [(b[1] - a[1]) / len, 0, -(b[0] - a[0]) / len];
    // Centre the window bays on each wall so narrow fronts get tidy, symmetric windows.
    const bays = Math.max(1, Math.round(len / BAY));
    const cell = u - (u % BAY);
    const u0 = len < 1.4 ? cell + 0.72 * BAY : cell + (BAY * bays - len) / 2;
    const wA0 = [u0, 0, wallH], wB0 = [u0 + len, 0, wallH], wB1 = [u0 + len, tb, wallH], wA1 = [u0, ta, wallH];
    gb.quad([a[0], base, a[1]], [b[0], base, b[1]], [b[0], tb, b[1]], [a[0], ta, a[1]], style.wallTint, out, wA0, wB0, wB1, wA1);
    u += Math.ceil(len / BAY + 1) * BAY * 7;
  }

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
  const slope = Math.hypot(f.hw, f.rise) / Math.max(f.hw, 0.01); // slope length per metre across
  for (const side of [1, -1]) {
    const half = clipHalf(ring, f.cx, f.cz, f.nx, f.nz, side);
    if (half.length < 3) continue;
    const shade = side > 0 ? style.roofTint : style.roofTint.clone().multiplyScalar(0.96);
    for (const [i0, i1, i2] of triangulate(half)) {
      const p = (i: number) => [half[i][0], roofHeight(f, half[i][0], half[i][1]), half[i][1]];
      const uv = (i: number) => {
        const dx = half[i][0] - f.cx, dz = half[i][1] - f.cz;
        const across = Math.abs(dx * f.nx + dz * f.nz);
        return [(dx * f.ux + dz * f.uz) * side, (f.hw - across) * slope, -1];
      };
      gb.tri(p(i0), p(i1), p(i2), shade, UP, uv(i0), uv(i1), uv(i2));
    }
  }

  if (style.stepped) {
    gb.curMat = wallMat;
    addSteppedGables(gb, f, style.wallTint);
  }
  if (style.chimney) {
    gb.curMat = set.index[f.id % 3 === 0 ? 'brickDark' : 'brickRed'] + seed;
    addChimney(gb, f, P.pick(P.WALL.brickRed.tints, f.id * 3).clone().multiplyScalar(0.85));
  }
}

const BAY = 2.5;
const SHEDLIKE = new Set(['roof', 'carport', 'garage', 'garages', 'shed', 'service', 'greenhouse', 'bunker', 'barn', 'farm_auxiliary', 'ruins']);

/** A brick stack just off the ridge. */
function addChimney(gb: GeomBuilder, f: Footprint, color: THREE.Color) {
  const along = (hash01(f.id * 29) - 0.5) * f.hu * 1.2;
  const off = Math.min(f.hw * 0.25, 0.9) * (hash01(f.id * 31) < 0.5 ? 1 : -1);
  const cx = f.cx + f.ux * along + f.nx * off, cz = f.cz + f.uz * along + f.nz * off;
  const y0 = roofHeight(f, cx, cz) - 0.6;
  const y1 = f.h + f.rise + 0.9 + hash01(f.id * 37) * 0.5;
  const hx = 0.36, hz = 0.5;
  const corner = (a: number, b: number, y: number) => [cx + f.ux * a * hz + f.nx * b * hx, y, cz + f.uz * a * hz + f.nz * b * hx];
  const sides: [number, number][] = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  for (let i = 0; i < 4; i++) {
    const [a0, b0] = sides[i], [a1, b1] = sides[(i + 1) % 4];
    const mx = (a0 + a1) / 2, mz = (b0 + b1) / 2;
    gb.quad(corner(a0, b0, y0), corner(a1, b1, y0), corner(a1, b1, y1), corner(a0, b0, y1), color, [f.ux * mx + f.nx * mz, 0, f.uz * mx + f.nz * mz]);
  }
  gb.quad(corner(1, 1, y1), corner(1, -1, y1), corner(-1, -1, y1), corner(-1, 1, y1), color.clone().multiplyScalar(0.5), UP);
}

/** Flemish stepped gable (trapgevel) at both ends of the ridge. */
function addSteppedGables(gb: GeomBuilder, f: Footprint, color: THREE.Color) {
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
  for (const end of [1, -1]) {
    const uOut = f.hu * end + 0.02 * end;
    const uIn = uOut - thick * end;
    const P3 = (s: number, y: number, uu: number) => [f.cx + f.ux * uu + f.nx * s, y, f.cz + f.uz * uu + f.nz * s];
    const outward: [number, number, number] = [f.ux * end, 0, f.uz * end];
    const inward: [number, number, number] = [-f.ux * end, 0, -f.uz * end];
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
      gb.quad(P3(a[0], a[1], uOut), P3(b[0], b[1], uOut), P3(b[0], b[1], uIn), P3(a[0], a[1], uIn), color, hint);
    }
  }
}

/** The building surface material: PBR texture arrays + shader-drawn openings. */
export function makeBuildingMaterial(set: MaterialSet, shared: { uNight: { value: number } }) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, set.uniforms, { uNight: shared.uNight });
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
attribute vec3 aWall;
attribute float aMat;
varying vec3 vWall;
varying vec3 vWPos;
varying vec3 vWN;
varying float vMat;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vWall = aWall;
vMat = aMat;
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
${GLSL_COMMON}
vec3 gWN; vec3 gT; vec3 gB; vec3 gNrm; vec3 gEmit;
float gRough; float gAO;
const float BAY = ${BAY.toFixed(1)};
const float FLOOR_H = 3.0;
const float ROOM_DEPTH = 3.6;`,
      )
      .replace('#include <color_fragment>', `#include <color_fragment>\n${fragSurface(set.index.roofSlate)}`)
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
  mat.customProgramCacheKey = () => 'belfort-building-v2';
  return mat;
}

const fragSurface = (SLATE: number) => /* glsl */ `
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

  if (vWall.z > -1.5 && vWall.z < 0.0) {
    // roofs: rows of overlapping tiles or slates, drawn so each course catches the light
    bool slate = layer == ${SLATE};
    vec2 tsize = slate ? vec2(0.36, 0.5) : vec2(0.3, 0.4);
    vec2 tuv = vWall.xy / tsize;
    tuv.x += 0.5 * mod(floor(tuv.y), 2.0);
    vec2 tf = fract(tuv);
    float tfade = 1.0 - smoothstep(0.12, 0.55, fwidth(tuv.y) + fwidth(tuv.x));
    float lip = smoothstep(0.0, 0.26, tf.y);                        // shadow where the course above overlaps
    float gap = smoothstep(0.0, 0.07, min(tf.x, 1.0 - tf.x));       // joint between neighbours
    float each = 0.86 + 0.28 * hash12(floor(tuv) + bseed * 31.0);   // every tile fired a little differently
    diffuseColor.rgb *= mix(1.0, (0.58 + 0.42 * lip) * (0.82 + 0.18 * gap) * each, tfade);
    gNrm = normalize(gNrm + vec3(0.0, (0.5 - tf.y) * 0.55 * tfade, 0.0));
    // weathering streaks and patchy moss
    float w = vnoise(vWPos.xz * 0.45) * 0.6 + vnoise(vWPos.xz * 1.9) * 0.4;
    diffuseColor.rgb *= 0.8 + 0.34 * w;
    float moss = smoothstep(0.62, 0.8, vnoise(vWPos.xz * 0.23 + bseed * 40.0)) * 0.35;
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.12, 0.15, 0.06), moss);
  }

  if (vWall.z > 0.5) {
    bool church = vWall.z > 1000.0;
    float eave = church ? vWall.z - 1000.0 : vWall.z;
    float u = vWall.x;
    float v = vWall.y;
    // grime rising from the street, rain streaks below the eave
    float grime = mix(0.66, 1.0, smoothstep(0.0, 1.6, v + (vnoise(vec2(u * 0.8, 3.0)) - 0.5) * 0.8));
    float streak = mix(0.84, 1.0, smoothstep(0.0, 0.9, eave - v + (vnoise(vec2(u * 2.3, 9.0)) - 0.5) * 0.7));
    diffuseColor.rgb *= grime * streak;

    if (church) {
      // tall pointed lancets with stained glass
      float cu = fract(u / 4.4);
      float ci = floor(u / 4.4);
      float x = abs(cu - 0.5) * 2.0;
      float top = eave - 1.3;
      float sill = min(3.0, eave * 0.28);
      float arch = top - 2.2 * (x / 0.42) * (x / 0.42);
      float win = step(x, 0.42) * step(sill, v) * step(v, arch);
      float surround = step(x, 0.5) * step(sill - 0.3, v) * step(v, arch + 0.5) * (1.0 - win);
      diffuseColor.rgb *= 1.0 - 0.3 * surround;
      // buttress between bays
      diffuseColor.rgb *= mix(0.7, 1.0, smoothstep(0.0, 0.09, abs(cu - 0.02)));
      if (win > 0.5) {
        vec2 cell = floor(vec2(u, v) / 0.21);
        float h = hash12(cell + ci * 17.0);
        vec3 glass = h < 0.3 ? vec3(0.08, 0.14, 0.5) : h < 0.55 ? vec3(0.5, 0.06, 0.07) : h < 0.78 ? vec3(0.62, 0.42, 0.08) : vec3(0.1, 0.36, 0.2);
        vec2 f2 = abs(fract(vec2(u, v) / 0.21) - 0.5);
        float leadFade = 1.0 - smoothstep(0.0, 0.5, fwidth(u) * 6.0);
        float lead = (step(0.43, max(f2.x, f2.y)) * leadFade + (1.0 - step(0.035, x)) + (1.0 - step(0.02, abs(x - 0.21))));
        vec3 col = mix(glass, vec3(0.02), min(lead, 1.0));
        // from outside by day stained glass is dark, with only a hint of colour; lit from within at night it glows
        diffuseColor.rgb = mix(vec3(0.03, 0.033, 0.04), col, 0.1);
        gEmit = col * uNight * 0.7;
        gRough = 0.16;
        gNrm = vec3(0.0, 0.0, 1.0);
        gAO = 1.0;
      }
    } else {
      float cu = fract(u / BAY);
      float ci = floor(u / BAY);
      float fl = floor(v / FLOOR_H);
      float fv = fract(v / FLOOR_H);
      float nFloors = max(1.0, floor((eave - 0.2) / FLOOR_H));
      float inFloors = step(fl, nFloors - 0.5);
      float wx0 = 0.29, wx1 = 0.71, wy0 = 0.30, wy1 = 0.80;
      bool door = fl < 0.5 && hash12(vec2(ci, bseed * 91.0)) < 0.24;
      if (door) { wx0 = 0.31; wx1 = 0.69; wy0 = 0.0; wy1 = 0.72; }
      float open = step(wx0, cu) * step(cu, wx1) * step(wy0, fv) * step(fv, wy1) * inFloors;
      float trim = step(wx0 - 0.035, cu) * step(cu, wx1 + 0.035) * step(wy0 - 0.05, fv) * step(fv, wy1 + 0.055) * inFloors;
      if (trim > 0.5 && open < 0.5) {
        // stone lintel, sill and jambs
        diffuseColor.rgb = vec3(0.4, 0.37, 0.31) * (0.85 + 0.3 * vnoise(vec2(u, v) * 9.0)) * grime;
        gRough = 0.86;
        gNrm = vec3(0.0, 0.0, 1.0);
      }
      if (open > 0.5) {
        vec2 sizeM = vec2((wx1 - wx0) * BAY, (wy1 - wy0) * FLOOR_H);
        vec2 m = vec2((cu - wx0) * BAY, (fv - wy0) * FLOOR_H);
        float rs = hash12(vec2(ci * 3.7 + bseed * 57.0, fl * 5.3 + 1.0));
        gNrm = vec3(0.0, 0.0, 1.0);
        gAO = 1.0;
        if (door) {
          vec3 paint = rs < 0.35 ? vec3(0.1, 0.17, 0.12) : rs < 0.65 ? vec3(0.27, 0.08, 0.06) : vec3(0.2, 0.13, 0.08);
          float plank = 0.82 + 0.18 * step(0.08, fract(m.x / 0.21));
          float iron = step(abs(fract(m.y / 0.75) - 0.5), 0.035);
          diffuseColor.rgb = mix(paint * plank, vec3(0.03), iron * 0.85);
          gRough = 0.62;
        } else {
          float fr = 0.075;
          float inner = step(fr, m.x) * step(m.x, sizeM.x - fr) * step(fr, m.y) * step(m.y, sizeM.y - fr);
          float bars = (1.0 - step(0.028, abs(m.x - sizeM.x * 0.5))) + (1.0 - step(0.028, abs(m.y - sizeM.y * 0.64)));
          if (inner < 0.5 || bars > 0.5) {
            vec3 paint = fract(bseed * 13.0) < 0.6 ? vec3(0.74, 0.71, 0.63) : vec3(0.14, 0.2, 0.15);
            diffuseColor.rgb = paint * (0.9 + 0.2 * vnoise(m * 30.0));
            gRough = 0.5;
          } else {
            // interior mapping: march the view ray into a virtual room behind the glass
            vec3 V = normalize(vWPos - cameraPosition);
            vec3 rd = vec3(dot(V, gT), V.y, max(-dot(V, gWN), 0.04));
            vec3 ro = vec3(cu * BAY, fv * FLOOR_H, 0.0);
            float tx = rd.x > 0.0 ? (BAY - ro.x) / rd.x : -ro.x / min(rd.x, -1e-4);
            float ty = rd.y > 0.0 ? (FLOOR_H - ro.y) / rd.y : -ro.y / min(rd.y, -1e-4);
            float tz = ROOM_DEPTH / rd.z;
            float t = min(tx, min(ty, tz));
            vec3 hp = ro + rd * t;
            vec3 wallCol = mix(vec3(0.5, 0.43, 0.33), vec3(0.38, 0.3, 0.25), rs);
            vec3 col;
            if (t == tz) {
              col = wallCol;
              vec2 bw = hp.xy / vec2(BAY, FLOOR_H);
              float cupboard = step(0.56, bw.x) * step(bw.x, 0.86) * step(bw.y, 0.68);
              col = mix(col, vec3(0.13, 0.08, 0.05), cupboard * step(0.35, rs));
              float frame = step(0.14, bw.x) * step(bw.x, 0.4) * step(0.45, bw.y) * step(bw.y, 0.75);
              col = mix(col, vec3(0.3, 0.2, 0.1) + 0.2 * vec3(rs, fract(rs * 7.0), fract(rs * 13.0)), frame * step(rs, 0.6));
            } else if (t == ty) {
              col = rd.y > 0.0 ? vec3(0.4, 0.34, 0.27) * (0.6 + 0.4 * step(0.25, fract(hp.x * 1.4))) : vec3(0.17, 0.11, 0.07) * (0.8 + 0.2 * step(0.1, fract(hp.x * 4.0)));
            } else {
              col = wallCol * 0.8;
            }
            col *= 1.0 - 0.5 * clamp(hp.z / ROOM_DEPTH, 0.0, 1.0);
            // curtains on some windows
            float q = m.x / sizeM.x;
            float curt = step(0.55, fract(rs * 17.0)) * (step(q, 0.2) + step(0.8, q));
            vec3 cloth = mix(vec3(0.4, 0.1, 0.08), vec3(0.42, 0.38, 0.28), fract(rs * 29.0));
            col = mix(col, cloth * (0.7 + 0.3 * sin(q * 70.0)), min(curt, 1.0));
            // leaded panes, fading out with distance
            vec2 pane = abs(fract(m / vec2(0.2, 0.26)) - 0.5);
            float leadW = fwidth(m.x) * 4.0;
            float lead = step(0.47, max(pane.x, pane.y));
            col *= 1.0 - 0.6 * lead * (1.0 - smoothstep(0.0, 0.2, leadW));
            float lit = step(1.0 - uNight * 0.58, hash12(vec2(rs * 113.0, bseed * 7.0 + ci)));
            diffuseColor.rgb = col * 0.16;
            gEmit = col * vec3(1.0, 0.6, 0.28) * lit * (1.6 + 1.6 * fract(rs * 43.0));
            gRough = 0.07;
            // hand-blown glass is never flat
            gNrm = normalize(vec3((vnoise(m * 7.0 + rs * 9.0) - 0.5) * 0.09, (vnoise(m * 7.0 + 5.2) - 0.5) * 0.09, 1.0));
          }
        }
      }
    }
  }
}
`;

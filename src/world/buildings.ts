// Turns real OSM footprints into Flemish buildings: brick/whitewash walls with
// shader windows, steep gabled roofs whose ridge follows the long axis (so
// narrow town houses show their gable to the street), and stepped gables
// (trapgevels) in the old town.

import * as THREE from 'three';
import { hash01 } from '../core/math';
import { type Footprint, roofHeight } from './footprint';
import { GeomBuilder, clipHalf, signedArea, triangulate } from './geom';
import * as P from './palette';

const UP: [number, number, number] = [0, 1, 0];
const OLD_TOWN_R = 720; // metres from Grote Markt

export interface BuildingStyle {
  wall: THREE.Color;
  roof: THREE.Color;
  stepped: boolean;
}

export function styleFor(f: Footprint): BuildingStyle {
  const s = f.id;
  const dist = Math.hypot(f.cx, f.cz);
  const k = f.kind;
  const church = k === 'church' || k === 'basilica' || k === 'chapel' || k === 'cathedral';
  if (church) return { wall: P.IRONSTONE, roof: P.pick(P.ROOFS_SLATE, s), stepped: false };
  const big = f.hu * f.hw * 4 > 900;
  if (f.rise === 0 && (k === 'industrial' || k === 'warehouse' || k === 'retail' || big))
    return { wall: P.pick(P.WALLS_IND, s), roof: P.ROOF_FLAT, stepped: false };
  const town = dist < OLD_TOWN_R;
  const wall = P.pick(town ? P.WALLS_TOWN : P.WALLS_RURAL, s);
  const roof = hash01(s * 7 + 3) < (town ? 0.45 : 0.25) ? P.pick(P.ROOFS_SLATE, s * 3) : P.pick(P.ROOFS_TILE, s * 5);
  const width = f.hw * 2;
  const stepped = town && f.rise > 0 && width > 3.5 && width < 11 && f.hu * 2 > width * 0.9 && hash01(s * 13) < 0.62;
  return { wall, roof, stepped };
}

export function addBuilding(gb: GeomBuilder, f: Footprint, style: BuildingStyle) {
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
  const base = -0.3;
  let u = hash01(f.id) * 3; // window phase offset per building
  const church = f.kind === 'church' || f.kind === 'basilica' || f.kind === 'chapel' || f.kind === 'cathedral';
  const wallH = church ? f.h + 1000 : f.h; // > 1000 → lancet windows in the shader
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.05) continue;
    const ta = roofHeight(f, a[0], a[1]);
    const tb = roofHeight(f, b[0], b[1]);
    const out: [number, number, number] = [(b[1] - a[1]) / len, 0, -(b[0] - a[0]) / len];
    const wA0 = [u, 0, wallH], wB0 = [u + len, 0, wallH], wB1 = [u + len, tb, wallH], wA1 = [u, ta, wallH];
    gb.quad([a[0], base, a[1]], [b[0], base, b[1]], [b[0], tb, b[1]], [a[0], ta, a[1]], style.wall, out, wA0, wB0, wB1, wA1);
    u += len;
  }

  // Roof
  const roofTag = [0, 0, -1];
  if (f.rise <= 0) {
    const tris = triangulate(ring);
    for (const [i0, i1, i2] of tris) {
      const p = (i: number) => [ring[i][0], f.h, ring[i][1]];
      gb.tri(p(i0), p(i1), p(i2), style.roof, UP, roofTag, roofTag, roofTag);
    }
    // A thin parapet keeps flat roofs from looking like cardboard.
    return;
  }
  for (const side of [1, -1]) {
    const half = clipHalf(ring, f.cx, f.cz, f.nx, f.nz, side);
    if (half.length < 3) continue;
    const tris = triangulate(half);
    const shade = side > 0 ? style.roof : style.roof.clone().multiplyScalar(0.94);
    for (const [i0, i1, i2] of tris) {
      const p = (i: number) => [half[i][0], roofHeight(f, half[i][0], half[i][1]), half[i][1]];
      gb.tri(p(i0), p(i1), p(i2), shade, UP, roofTag, roofTag, roofTag);
    }
  }

  if (style.stepped) addSteppedGables(gb, f, style.wall);
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
      // outward normal of the profile edge in (s,y), mapped to world
      const len = Math.hypot(ex, ey) || 1;
      // profile runs clockwise in (s, y) → outward normal is (-ey, ex)
      const ns = -ey / len, ny = ex / len;
      const hint: [number, number, number] = [f.nx * ns, ny, f.nz * ns];
      gb.quad(P3(a[0], a[1], uOut), P3(b[0], b[1], uOut), P3(b[0], b[1], uIn), P3(a[0], a[1], uIn), color, hint);
    }
  }
}

/** Shader patch: windows (lit at night), brick speckle, roof tile bands. */
export function patchBuildingMaterial(mat: THREE.MeshStandardMaterial, uniforms: { uNight: { value: number } }) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = uniforms.uNight;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 aWall;\nvarying vec3 vWall;\nvarying vec3 vWPos;')
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvWall = aWall;\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uNight;
varying vec3 vWall;
varying vec3 vWPos;
float bHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float gWin = 0.0;
float gLit = 0.0;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
if (vWall.z > 1000.0) {
  // church: tall pointed lancet windows with stone tracery, buttress shading
  float u = vWall.x;
  float v = vWall.y;
  float eave = vWall.z - 1000.0;
  float cu = fract(u / 5.5);
  float ci = floor(u / 5.5);
  float top = eave - 1.8;
  float x = abs(cu - 0.5) * 2.0;          // 0 centre .. 1 edge of bay
  float arch = top - 1.6 * sqrt(max(0.0, x / 0.32));
  float win = step(x, 0.32) * step(2.2, v) * step(v, arch);
  float tracery = 1.0 - (1.0 - step(0.05, abs(x - 0.0))) * win;
  gWin = win * tracery;
  gLit = step(0.4, bHash(vec2(ci, 3.0)));
  float stone = bHash(vec2(floor(u * 1.6 + floor(v * 2.5) * 0.5), floor(v * 2.5)));
  diffuseColor.rgb *= 0.88 + 0.14 * stone;
  diffuseColor.rgb *= mix(0.8, 1.0, smoothstep(0.0, 0.08, abs(cu - 0.02)));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.2, 0.3), gWin);
} else if (vWall.z > 0.0) {
  float u = vWall.x;
  float v = vWall.y;
  float fv = fract(v / 3.0);
  float fl = floor(v / 3.0);
  float cu = fract(u / 2.7);
  float ci = floor(u / 2.7);
  float win = step(0.33, cu) * step(cu, 0.67) * step(0.30, fv) * step(fv, 0.80);
  win *= step(0.8, v) * step(v, vWall.z - 0.5);
  // mullion cross
  float mull = 1.0 - (1.0 - step(0.035, abs(cu - 0.5))) * win;
  mull *= 1.0 - (1.0 - step(0.03, abs(fv - 0.58))) * win;
  gWin = win * mull;
  gLit = step(0.52, bHash(vec2(ci + floor(vWPos.x * 0.01), fl + floor(vWPos.z * 0.01))));
  // brick speckle + plinth
  float brick = bHash(vec2(floor(u * 3.6 + floor(v * 7.0) * 0.5), floor(v * 7.0)));
  diffuseColor.rgb *= 0.9 + 0.12 * brick;
  diffuseColor.rgb *= mix(0.72, 1.0, step(0.55, v));
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.19, 0.23), gWin);
  // dark window frames
  float frame = step(0.30, cu) * step(cu, 0.70) * step(0.27, fv) * step(fv, 0.83) * step(0.8, v) * step(v, vWall.z - 0.5);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.55, frame * (1.0 - gWin));
} else if (vWall.z > -1.5) {
  // roof tiles: horizontal courses
  float course = fract(vWPos.y * 2.4 + bHash(floor(vWPos.xz * 0.5)) * 0.2);
  diffuseColor.rgb *= 0.86 + 0.14 * smoothstep(0.0, 0.25, course);
}`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
totalEmissiveRadiance += gWin * gLit * uNight * vec3(1.0, 0.62, 0.28) * 1.6;`,
      );
  };
  mat.customProgramCacheKey = () => 'belfort-building';
}

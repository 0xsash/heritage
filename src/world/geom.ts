// Non-indexed geometry accumulator with flat normals, vertex colours (the
// surface tint) and two custom attributes read by the surface shaders:
//   aMat  = material layer + per-object random seed in the fraction
//   aWall = meaning depends on the shader. Buildings:
//     (u, v, eaveHeight)   walls  → windows, doors, grime
//     (u, v, -1)           roofs  → u along the ridge, v up the slope
//     (0, 0, -2)           plain  → texture projected from world position

import * as THREE from 'three';

export class GeomBuilder {
  pos: number[] = [];
  nrm: number[] = [];
  col: number[] = [];
  wall: number[] = [];
  mat: number[] = [];
  /** material layer (integer part) + per-object seed (fraction) for the next triangles */
  curMat = 0;

  get vertexCount() {
    return this.pos.length / 3;
  }

  /**
   * Push one triangle. If `hint` is given the winding is flipped so the face
   * normal points along it.
   */
  tri(
    a: number[], b: number[], c: number[],
    color: THREE.Color,
    hint?: [number, number, number],
    wa?: number[], wb?: number[], wc?: number[],
  ) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz);
    if (len < 1e-9) return;
    nx /= len; ny /= len; nz /= len;
    if (hint && nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) {
      [b, c] = [c, b];
      [wb, wc] = [wc, wb];
      nx = -nx; ny = -ny; nz = -nz;
    }
    this.pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    for (let i = 0; i < 3; i++) {
      this.nrm.push(nx, ny, nz);
      this.col.push(color.r, color.g, color.b);
    }
    const d = [0, 0, -2];
    this.wall.push(...(wa ?? d), ...(wb ?? d), ...(wc ?? d));
    this.mat.push(this.curMat, this.curMat, this.curMat);
  }

  quad(
    a: number[], b: number[], c: number[], d: number[],
    color: THREE.Color,
    hint?: [number, number, number],
    wa?: number[], wb?: number[], wc?: number[], wd?: number[],
  ) {
    this.tri(a, b, c, color, hint, wa, wb, wc);
    this.tri(a, c, d, color, hint, wa, wc, wd);
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aWall', new THREE.Float32BufferAttribute(this.wall, 3));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.mat, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** Triangulate a flat 2D ring (x,z pairs) — returns index triples. */
export function triangulate(ring: [number, number][]): number[][] {
  const contour = ring.map(([x, z]) => new THREE.Vector2(x, z));
  try {
    return THREE.ShapeUtils.triangulateShape(contour, []);
  } catch {
    return [];
  }
}

export function signedArea(ring: [number, number][]) {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x0, z0] = ring[i];
    const [x1, z1] = ring[(i + 1) % ring.length];
    s += x0 * z1 - x1 * z0;
  }
  return s / 2;
}

/** Keep the part of a ring where (p - o)·n * side >= 0 (Sutherland–Hodgman). */
export function clipHalf(ring: [number, number][], ox: number, oz: number, nx: number, nz: number, side: number) {
  const out: [number, number][] = [];
  const d = (p: [number, number]) => ((p[0] - ox) * nx + (p[1] - oz) * nz) * side;
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

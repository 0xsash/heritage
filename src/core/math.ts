// Small math helpers. Smoothing is frame-rate independent (Eiserloh's
// x += (target - x) * k is tuned per 60 FPS frame; we convert k for any dt).

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Exponential smoothing factor for "k per 60fps frame" at an arbitrary dt (seconds). */
export const damp = (k: number, dt: number) => 1 - Math.pow(1 - k, dt * 60);

/** Shortest signed angle from a to b, radians. */
export const angleDelta = (a: number, b: number) => {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Deterministic hash → [0,1). */
export const hash01 = (n: number) => {
  let x = (n | 0) ^ 0x9e3779b9;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};

/** Seeded PRNG (mulberry32). */
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// 1D value noise for camera shake (smooth, seeded, replay-safe).
export const noise1 = (x: number, seed: number) => {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash01(i * 374761393 + seed * 668265263) * 2 - 1;
  const b = hash01((i + 1) * 374761393 + seed * 668265263) * 2 - 1;
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
};

/** Critically-damped spring step for a scalar. Returns [value, velocity]. */
export const spring = (x: number, v: number, target: number, omega: number, dt: number): [number, number] => {
  const f = 1 + 2 * dt * omega;
  const oo = omega * omega;
  const hoo = dt * oo;
  const hhoo = dt * hoo;
  const detInv = 1 / (f + hhoo);
  const nx = (f * x + dt * v + hhoo * target) * detInv;
  const nv = (v + hoo * (target - x)) * detInv;
  return [nx, nv];
};

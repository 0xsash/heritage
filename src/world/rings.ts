// Rings of light in the sky: fly through them in order. Used twice: the
// short course on the very first flight (it asks you to steer and to climb,
// so nobody has to be told), and the Dagvlucht, a timed course that is the
// same for every player on a given day.

import * as THREE from 'three';
import { rng } from '../core/math';

export interface RingDef { x: number; y: number; z: number; r: number }

export interface CourseEvents {
  pass?(i: number, n: number): void;
  done?(seconds: number): void;
}

export class RingCourse {
  group = new THREE.Group();
  defs: RingDef[] = [];
  index = 0;
  time = 0;
  /** the clock runs from the first ring */
  timed = false;
  running = false;
  private meshes: THREE.Mesh[] = [];
  private ev: CourseEvents = {};
  private t = 0;
  private geo = new THREE.TorusGeometry(1, 0.07, 8, 56);

  get active() {
    return this.defs.length > 0 && this.index < this.defs.length;
  }
  get next(): RingDef | null {
    return this.active ? this.defs[this.index] : null;
  }

  start(defs: RingDef[], color: string, timed: boolean, ev: CourseEvents) {
    this.stop();
    this.defs = defs;
    this.ev = ev;
    this.timed = timed;
    this.index = 0;
    this.time = 0;
    this.running = false;
    defs.forEach((d, i) => {
      const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.position.set(d.x, d.y, d.z);
      m.scale.setScalar(d.r);
      // face along the course
      const a = defs[Math.max(0, i - 1)], b = defs[Math.min(defs.length - 1, i + 1)];
      m.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      m.frustumCulled = false;
      this.group.add(m);
      this.meshes.push(m);
    });
  }

  stop() {
    for (const m of this.meshes) {
      this.group.remove(m);
      (m.material as THREE.Material).dispose();
    }
    this.meshes = [];
    this.defs = [];
    this.running = false;
  }

  update(dt: number, pos: THREE.Vector3, flying: boolean) {
    if (!this.active) return;
    this.t += dt;
    if (this.running && this.timed) this.time += dt;
    this.meshes.forEach((m, i) => {
      const mat = m.material as THREE.MeshBasicMaterial;
      if (i < this.index) {
        // passed: widen and fade
        m.scale.multiplyScalar(1 + dt * 1.6);
        mat.opacity = Math.max(0, mat.opacity - dt * 1.4);
        m.visible = mat.opacity > 0.01;
      } else if (i === this.index) {
        mat.opacity = 0.75 + Math.sin(this.t * 4) * 0.2;
        m.scale.setScalar(this.defs[i].r * (1 + Math.sin(this.t * 4) * 0.02));
      } else {
        mat.opacity = i === this.index + 1 ? 0.3 : 0.12;
        // a timed course shows only its start until you fly through it
        m.visible = this.running || !this.timed;
      }
    });
    const d = this.defs[this.index];
    if (flying && pos.distanceToSquared(this.v.set(d.x, d.y, d.z)) < (d.r * 1.12) ** 2) {
      this.running = true;
      this.index++;
      this.ev.pass?.(this.index, this.defs.length);
      if (this.index >= this.defs.length) {
        this.running = false;
        this.ev.done?.(this.time);
      }
    }
  }
  private v = new THREE.Vector3();
}

/** The first flight: from the meadows east of Diest to the Grote Markt. Ring 2 is off to the side (steer), ring 3 is high (climb). */
export const FIRST_FLIGHT: RingDef[] = [
  { x: 930, y: 92, z: 320, r: 17 },
  { x: 660, y: 88, z: 130, r: 17 },
  { x: 390, y: 132, z: 70, r: 17 },
  { x: 170, y: 82, z: 24, r: 19 },
];

/** Where the Dagvlucht starts: high over the Grote Markt. */
export const DAY_START: RingDef = { x: 0, y: 125, z: -40, r: 20 };

// landmarks the day's course is strung between (x, z, lowest safe height)
const ANCHORS: [number, number, number][] = [
  [8, 20, 75], // Sint-Sulpitius
  [100, 23, 45], // Lakenhalle
  [690, -320, 45], // Begijnhof
  [446, 19, 60], // Warande
  [-68, -700, 45], [583, -634, 45], [737, 77, 45], [345, 610, 45], [-117, 380, 45], [-324, 63, 45], // gates
  [305, 141, 45], // Hof van Nassau
  [-420, -300, 40], [900, -500, 40], [-600, 500, 40], [1000, 500, 40], [200, -900, 40], // the fields and the Demer
];

export function dayKey(d = new Date()) {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** Day 1 was the first of November 2026. */
export function dayNumber(d = new Date()) {
  return Math.max(1, Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 10, 1)) / 86400000) + 1);
}

/** Today's Klokkenronde: a start ring over the market and seven bells, the same for everyone. `par[i]` is the time by which bell i should ring. */
export function dayCourse(key = dayKey()): { rings: RingDef[]; length: number; par: number[]; gold: number; silver: number; bronze: number } {
  const r = rng(key * 7 + 13);
  const pool = ANCHORS.map((a) => a.slice() as [number, number, number]);
  const picks: [number, number, number][] = [];
  for (let i = 0; i < 6; i++) picks.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  // nearest-neighbour order from the start, so the course is a tour and not a zigzag
  const order: [number, number, number][] = [];
  let cx = DAY_START.x, cz = DAY_START.z;
  while (picks.length) {
    let bi = 0, bd = Infinity;
    picks.forEach((p, i) => {
      const d = Math.hypot(p[0] - cx, p[1] - cz);
      if (d < bd) { bd = d; bi = i; }
    });
    const p = picks.splice(bi, 1)[0];
    order.push(p);
    cx = p[0];
    cz = p[1];
  }
  const rings: RingDef[] = [DAY_START];
  for (const [x, z, minY] of order) rings.push({ x: x + (r() - 0.5) * 60, y: minY + r() * 70, z: z + (r() - 0.5) * 60, r: 15 });
  // the seventh bell is Sint-Sulpitius itself: the round always ends at home
  rings.push({ x: 8, y: 92, z: 20, r: 18 });
  let length = 0;
  const par = [0];
  for (let i = 1; i < rings.length; i++) {
    length += Math.hypot(rings[i].x - rings[i - 1].x, rings[i].y - rings[i - 1].y, rings[i].z - rings[i - 1].z);
    par.push(length / 34);
  }
  // medal times from the length: a clean line at speed is gold
  return { rings, length, par, gold: length / 40, silver: length / 34, bronze: length / 27 };
}

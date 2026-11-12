// Combat effects: one pooled particle system (sparks, embers, dust, smoke),
// slash arcs, shockwave rings, scorch marks that stay where they fall, and
// floating text (damage numbers, barks) drawn as HTML over the canvas.

import * as THREE from 'three';

const MAX = 1400;

export interface Burst {
  n: number;
  color: THREE.ColorRepresentation;
  speed: number;
  up?: number;
  life: number;
  size: number;
  gravity?: number;
  spread?: number;
  dir?: THREE.Vector3;
  drag?: number;
}

export class Particles {
  points: THREE.Points;
  private pos = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 3);
  private size = new Float32Array(MAX);
  private alpha = new Float32Array(MAX);
  private vel = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private maxLife = new Float32Array(MAX);
  private grav = new Float32Array(MAX);
  private drag = new Float32Array(MAX);
  private size0 = new Float32Array(MAX);
  private next = 0;
  private geo = new THREE.BufferGeometry();
  private tmpC = new THREE.Color();

  constructor() {
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float size; attribute float alpha; varying vec3 vC; varying float vA;
        void main() {
          vC = color; vA = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 900.0 / max(1.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        varying vec3 vC; varying float vA;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = dot(d, d) * 4.0;
          if (r > 1.0) discard;
          gl_FragColor = vec4(vC * (1.0 - r * 0.6), vA * (1.0 - r));
        }`,
      vertexColors: true,
    });
    this.points = new THREE.Points(this.geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  emit(at: THREE.Vector3, b: Burst) {
    this.tmpC.set(b.color);
    for (let k = 0; k < b.n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % MAX;
      const sp = b.speed * (0.4 + Math.random() * 0.8);
      let dx = Math.random() * 2 - 1, dy = Math.random() * 2 - 1, dz = Math.random() * 2 - 1;
      const l = Math.hypot(dx, dy, dz) || 1;
      dx /= l; dy /= l; dz /= l;
      if (b.dir) {
        const s = b.spread ?? 0.5;
        dx = b.dir.x + dx * s; dy = b.dir.y + dy * s; dz = b.dir.z + dz * s;
      }
      this.pos[i * 3] = at.x; this.pos[i * 3 + 1] = at.y; this.pos[i * 3 + 2] = at.z;
      this.vel[i * 3] = dx * sp; this.vel[i * 3 + 1] = dy * sp + (b.up ?? 0); this.vel[i * 3 + 2] = dz * sp;
      const v = 0.75 + Math.random() * 0.25;
      this.col[i * 3] = this.tmpC.r * v; this.col[i * 3 + 1] = this.tmpC.g * v; this.col[i * 3 + 2] = this.tmpC.b * v;
      this.maxLife[i] = this.life[i] = b.life * (0.6 + Math.random() * 0.6);
      this.size0[i] = b.size * (0.6 + Math.random() * 0.8);
      this.grav[i] = b.gravity ?? 9;
      this.drag[i] = b.drag ?? 1.5;
    }
  }

  update(dt: number) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) {
        this.alpha[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const t = Math.max(0, this.life[i] / this.maxLife[i]);
      const dr = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= dr; this.vel[i * 3 + 2] *= dr;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * dr - this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.alpha[i] = Math.min(1, t * 2.2);
      this.size[i] = this.size0[i] * (0.4 + 0.6 * t);
    }
    for (const n of ['position', 'color', 'size', 'alpha']) this.geo.getAttribute(n).needsUpdate = true;
  }
}

/** Short-lived meshes: slash arcs, shockwave rings, flashes. */
interface Flash {
  mesh: THREE.Mesh;
  t: number;
  life: number;
  grow: number;
  baseScale: number;
}

export class Fx {
  group = new THREE.Group();
  particles = new Particles();
  private flashes: Flash[] = [];
  private scorches: THREE.Mesh[] = [];
  private arcGeo: THREE.BufferGeometry;
  private ringGeo = new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2);
  private discGeo = new THREE.CircleGeometry(1, 20).rotateX(-Math.PI / 2);
  private scorchMat = new THREE.MeshBasicMaterial({ color: '#1a120c', transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 });
  private flashTex: THREE.Texture;

  constructor() {
    this.group.add(this.particles.points);
    // a crescent, thick in the middle and thin at the tips
    const pts: number[] = [];
    const idx: number[] = [];
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const a = -1.25 + (2.5 * i) / N;
      const w = Math.sin((i / N) * Math.PI) * 0.35;
      pts.push(Math.sin(a) * 1.0, 0, Math.cos(a) * 1.0, Math.sin(a) * (1 + w), 0, Math.cos(a) * (1 + w));
      if (i < N) {
        const b = i * 2;
        idx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
      }
    }
    this.arcGeo = new THREE.BufferGeometry();
    this.arcGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.arcGeo.setIndex(idx);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.3, 'rgba(255,220,160,0.6)');
    grd.addColorStop(1, 'rgba(255,160,60,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    this.flashTex = new THREE.CanvasTexture(c);
  }

  private addFlash(mesh: THREE.Mesh, life: number, grow: number) {
    this.group.add(mesh);
    this.flashes.push({ mesh, t: 0, life, grow, baseScale: mesh.scale.x });
  }

  /** A sword arc in front of `at`, facing yaw, tilted by `tilt`. */
  slash(at: THREE.Vector3, yaw: number, tilt: number, radius: number, color: THREE.ColorRepresentation = '#fff2d0') {
    const m = new THREE.Mesh(this.arcGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.copy(at);
    m.rotation.set(0, yaw, tilt, 'YXZ');
    m.scale.setScalar(radius);
    this.addFlash(m, 0.16, 0.25);
  }

  ring(at: THREE.Vector3, radius: number, color: THREE.ColorRepresentation, life = 0.45) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.copy(at);
    m.position.y += 0.15;
    m.scale.setScalar(radius * 0.25);
    this.addFlash(m, life, radius * 0.75 / (radius * 0.25));
  }

  flash(at: THREE.Vector3, size: number, color: THREE.ColorRepresentation = '#ffd9a0', life = 0.12) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.flashTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.copy(at);
    s.scale.setScalar(size);
    this.addFlash(s as unknown as THREE.Mesh, life, 0.4);
  }

  /** Burnt ground; the last 40 stay. */
  scorch(at: THREE.Vector3, r: number) {
    const m = new THREE.Mesh(this.discGeo, this.scorchMat);
    m.position.set(at.x, at.y + 0.04, at.z);
    m.scale.setScalar(r);
    m.rotation.y = Math.random() * 6;
    this.group.add(m);
    this.scorches.push(m);
    if (this.scorches.length > 40) this.group.remove(this.scorches.shift()!);
  }

  sparks(at: THREE.Vector3, dir?: THREE.Vector3, color: THREE.ColorRepresentation = '#ffcf7a', n = 14) {
    this.particles.emit(at, { n, color, speed: 7, up: 2, life: 0.35, size: 0.09, gravity: 14, dir, spread: 0.9, drag: 2 });
  }

  update(dt: number) {
    this.particles.update(dt);
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i];
      f.t += dt;
      const k = f.t / f.life;
      const mat = f.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, 1 - k) * 0.9;
      f.mesh.scale.setScalar(f.baseScale * (1 + f.grow * k));
      if (k >= 1) {
        this.group.remove(f.mesh);
        mat.dispose();
        this.flashes.splice(i, 1);
      }
    }
  }
}

/** HTML text that floats over a point in the world: damage numbers, barks, names. */
export class Floaters {
  layer = document.createElement('div');
  private items: { el: HTMLElement; p: THREE.Vector3; t: number; life: number; rise: number; drift: number }[] = [];
  private v = new THREE.Vector3();

  constructor(root: HTMLElement) {
    this.layer.className = 'floaters';
    root.appendChild(this.layer);
  }

  add(text: string, at: THREE.Vector3, cls: string, life = 0.9, rise = 1.6) {
    const el = document.createElement('div');
    el.className = 'fl ' + cls;
    el.textContent = text;
    this.layer.appendChild(el);
    this.items.push({ el, p: at.clone(), t: 0, life, rise, drift: (Math.random() - 0.5) * 0.8 });
    if (this.items.length > 60) {
      const old = this.items.shift()!;
      old.el.remove();
    }
  }

  update(dt: number, cam: THREE.Camera, w: number, h: number) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      const k = it.t / it.life;
      if (k >= 1) {
        it.el.remove();
        this.items.splice(i, 1);
        continue;
      }
      this.v.copy(it.p);
      this.v.y += it.rise * (1 - (1 - k) * (1 - k));
      this.v.x += it.drift * k;
      this.v.project(cam);
      if (this.v.z > 1) {
        it.el.style.display = 'none';
        continue;
      }
      it.el.style.display = '';
      const pop = k < 0.12 ? 1 + (0.12 - k) * 5 : 1;
      it.el.style.transform = `translate(${(this.v.x * 0.5 + 0.5) * w}px, ${(-this.v.y * 0.5 + 0.5) * h}px) translate(-50%, -50%) scale(${pop})`;
      it.el.style.opacity = String(k > 0.7 ? (1 - k) / 0.3 : 1);
    }
  }
}

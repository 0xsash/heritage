// The live figure on the creation screen: its own small renderer and canvas,
// the hero as chosen, in idle, lit warmly against the painted backdrop. Drag
// to turn. Disposed when creation ends (the kit's meshes and materials are
// shared with the game and are not freed here).

import * as THREE from 'three';
import type { FolkSpec, TownsfolkKit } from '../rpg/townsfolk';
import { cloakPiece } from '../rpg/look';

export class HeroPreview {
  readonly canvas = document.createElement('canvas');
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(22, 1, 0.1, 50);
  private turntable = new THREE.Group();
  private figure: THREE.Object3D | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private kit: TownsfolkKit | null = null;
  private spec: FolkSpec | null = null;
  private clock = new THREE.Clock();
  private raf = 0;
  private yaw = -0.42;
  private spin = 0;
  private drag: { x: number; yaw: number } | null = null;
  private height = 1.7;
  private ro: ResizeObserver | null = null;
  private dirty = true;

  /** `inset`: pixels at the bottom of the host covered by other UI; the figure stands just above them */
  constructor(private host: HTMLElement, private inset: () => number = () => 0, watch: HTMLElement[] = []) {
    this.canvas.className = 'cc-canvas';
    host.appendChild(this.canvas);
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch {
      this.renderer = null; // no second WebGL context: the painted backdrop stays on its own
      return;
    }
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    r.setClearColor(0x000000, 0);
    // warm key from the front left (a window, a fire), a cool rim from behind, a low warm fill
    this.scene.add(new THREE.HemisphereLight('#ffe2b8', '#2a1a10', 0.9));
    const key = new THREE.DirectionalLight('#ffd49a', 2.6);
    key.position.set(-2.2, 3.2, 3.4);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#9fb4ff', 1.6);
    rim.position.set(2.4, 2.6, -3.2);
    this.scene.add(rim);
    const fill = new THREE.PointLight('#ff9a4a', 1.4, 8, 1.6);
    fill.position.set(1.8, 0.6, 2.2);
    this.scene.add(fill);
    // a pool of light on the floor
    const g = document.createElement('canvas');
    g.width = g.height = 128;
    const c = g.getContext('2d')!;
    const grad = c.createRadialGradient(64, 64, 4, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0.75)');
    grad.addColorStop(0.45, 'rgba(0,0,0,0.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = grad;
    c.fillRect(0, 0, 128, 128);
    const blob = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(g), transparent: true, depthWrite: false }));
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.005;
    this.scene.add(blob, this.turntable);

    this.canvas.addEventListener('pointerdown', (e) => {
      this.drag = { x: e.clientX, yaw: this.yaw };
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener('pointermove', (e) => {
      if (this.drag) this.yaw = this.drag.yaw + (e.clientX - this.drag.x) * 0.012;
    });
    const up = () => (this.drag = null);
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', up);
    this.ro = new ResizeObserver(() => (this.dirty = true));
    this.ro.observe(host);
    for (const w of watch) this.ro.observe(w);
    this.loop();
  }

  get ok() {
    return !!this.renderer;
  }

  setKit(kit: TownsfolkKit | null) {
    this.kit = kit;
    if (this.spec) this.show(this.spec);
  }

  /** Turn by `a` radians (keyboard). */
  turn(a: number) {
    this.spin += a;
  }

  /** Show this person (rebuilt from the kit). */
  show(spec: FolkSpec) {
    this.spec = spec;
    if (!this.kit || !this.renderer) return;
    const folk = this.kit.buildSpec(spec);
    if (!folk) return;
    const time = this.mixer ? this.mixer.time : 0;
    if (this.figure) this.turntable.remove(this.figure);
    this.mixer?.stopAllAction();
    this.figure = folk.root;
    this.height = 1.72 * folk.height;
    this.turntable.add(folk.root);
    this.mixer = new THREE.AnimationMixer(folk.root);
    const idle = this.mixer.clipAction(folk.clips.idle);
    idle.play();
    this.mixer.setTime(time);
    this.dirty = true;
  }

  /** Re-dye the cloak without rebuilding. */
  setCloak(color: string) {
    if (!this.spec || !this.kit || !this.figure) return;
    const p = cloakPiece(this.spec);
    if (!p) return;
    this.spec.wear[p] = color;
    this.kit.redye(this.figure, p, color);
  }

  private frame() {
    const r = this.renderer!;
    const w = this.host.clientWidth, h = this.host.clientHeight;
    if (this.dirty && w > 0 && h > 0) {
      this.dirty = false;
      r.setSize(w, h, false);
      this.camera.aspect = w / h;
      // frame the whole figure, head to boots, with a little air, in the part of the view above the inset
      const covered = Math.min(h * 0.5, Math.max(0, this.inset() - 24));
      const free = h - covered;
      const H = Math.max(1.3, this.height) * 1.1;
      const fov = this.camera.fov * (Math.PI / 180);
      const fit = Math.max(H / 2 / Math.tan(fov / 2), (H * 0.62) / 2 / Math.tan(fov / 2) / this.camera.aspect) * (h / free);
      this.camera.position.set(0, H * 0.5, fit);
      this.camera.lookAt(0, H * 0.47, 0);
      // move the picture up so the figure is centred in the free part
      this.camera.setViewOffset(w, h, 0, covered / 2, w, h);
      this.camera.updateProjectionMatrix();
    }
    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.mixer?.update(dt);
    if (this.spin) {
      const s = Math.sign(this.spin) * Math.min(Math.abs(this.spin), dt * 4);
      this.yaw += s;
      this.spin -= s;
    }
    this.turntable.rotation.y = this.yaw;
    r.render(this.scene, this.camera);
  }

  private loop = () => {
    if (!this.renderer) return;
    this.raf = requestAnimationFrame(this.loop);
    this.frame();
  };

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    this.mixer?.stopAllAction();
    if (this.figure) this.turntable.remove(this.figure);
    this.figure = null;
    const r = this.renderer;
    this.renderer = null;
    if (r) {
      r.dispose();
      r.forceContextLoss();
    }
    this.canvas.remove();
  }
}

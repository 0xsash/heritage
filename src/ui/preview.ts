// The live figure on the creation screen: its own small renderer and canvas,
// the hero as chosen, in idle, lit warmly against the painted backdrop. Drag
// to turn. The camera moves in on the face while the face is being edited and
// steps back to show the dragon while the dragon is. Disposed when creation
// ends (the kit's and the dragon's meshes and materials are shared with the
// game and are not freed here).

import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { FolkSpec, TownsfolkKit } from '../rpg/townsfolk';
import { cloakPiece } from '../rpg/look';
import { darkenLeather } from '../player/herokit';
import { tintDragon, type DragonLook } from '../player/scales';

export type Focus = 'body' | 'face' | 'dragon';

export class HeroPreview {
  readonly canvas = document.createElement('canvas');
  private renderer: THREE.WebGLRenderer | null = null;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(22, 1, 0.1, 80);
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
  private focus: Focus = 'body';
  private dragon: THREE.Object3D | null = null;
  private dragonBox = new THREE.Box3();
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private headY = 1.55;
  /** test pages: a fixed camera { pos, look } */
  debugView: { pos: THREE.Vector3; look: THREE.Vector3 } | null = null;
  /** test pages: where the dragon's head is */
  dragonHead() {
    const h = this.dragon?.getObjectByName('head');
    return h ? h.getWorldPosition(new THREE.Vector3()) : null;
  }

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

  /** Where the camera looks: the whole figure, the face, or the dragon behind. */
  setFocus(f: Focus) {
    this.focus = f;
    if (f === 'face') this.spin += -this.yaw * 0.85; // turn the face toward us
    if (this.dragon) this.dragon.visible = f === 'dragon';
  }

  /** The dragon (a clone of the game's model; geometry and materials stay shared). */
  setDragon(gltf: GLTF | null) {
    if (!gltf || this.dragon || !this.renderer) return;
    const d = SkeletonUtils.clone(gltf.scene);
    d.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).frustumCulled = false;
    });
    d.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(d);
    d.position.set(1.4, -box.min.y, -3.2);
    d.rotation.y = 1.15;
    d.updateMatrixWorld(true);
    this.dragonBox.setFromObject(d);
    d.visible = this.focus === 'dragon';
    this.dragon = d;
    this.scene.add(d);
  }

  /** Recolour the dragon in the preview (the game's own model is coloured when play starts). */
  showDragon(scales: string, look: DragonLook) {
    if (this.dragon) tintDragon(this.dragon, scales, look);
  }

  /** Show this person (rebuilt from the kit). */
  show(spec: FolkSpec) {
    this.spec = spec;
    if (!this.kit || !this.renderer) return;
    const folk = this.kit.buildSpec(spec);
    if (!folk) return;
    darkenLeather(folk.root); // as the hero in the game
    const time = this.mixer ? this.mixer.time : 0;
    if (this.figure) this.turntable.remove(this.figure);
    this.mixer?.stopAllAction();
    this.figure = folk.root;
    this.height = 1.72 * folk.height;
    this.turntable.add(folk.root);
    folk.root.updateMatrixWorld(true);
    const head = folk.root.getObjectByName('head');
    if (head) this.headY = head.getWorldPosition(new THREE.Vector3()).y + 0.08 * folk.height;
    this.mixer = new THREE.AnimationMixer(folk.root);
    const idle = this.mixer.clipAction(folk.clips.idle);
    idle.play();
    this.mixer.setTime(time);
    this.dirty = true;
  }

  /** Move one face morph on the live figure (body and whatever frames the face), without rebuilding. */
  setMorph(name: string, w: number) {
    this.figure?.traverse((o) => {
      const m = o as THREE.Mesh;
      const i = m.morphTargetDictionary?.[name];
      if (i !== undefined && m.morphTargetInfluences) m.morphTargetInfluences[i] = w;
    });
  }

  /** Scale the live figure (the height slider), without rebuilding. */
  setScale(s: number) {
    if (this.figure) this.figure.scale.setScalar(s);
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
    const dt = Math.min(this.clock.getDelta(), 0.1);
    if (w > 0 && h > 0) {
      if (this.dirty) {
        this.dirty = false;
        r.setSize(w, h, false);
        this.camera.aspect = w / h;
      }
      // frame the whole figure, head to boots, with a little air, in the part of the view above the inset;
      // or the face; or the dragon with the hero before it
      const covered = Math.min(h * 0.5, Math.max(0, this.inset() - 24));
      const free = h - covered;
      const fov = this.camera.fov * (Math.PI / 180);
      const fitH = (H: number, Wd: number) => Math.max(H / 2 / Math.tan(fov / 2), Wd / 2 / Math.tan(fov / 2) / this.camera.aspect) * (h / free);
      const H = Math.max(1.3, this.height) * 1.1;
      const body = { pos: new THREE.Vector3(0, H * 0.5, fitH(H, H * 0.62)), look: new THREE.Vector3(0, H * 0.47, 0) };
      const fh = 0.42;
      const face = { pos: new THREE.Vector3(0, this.headY, fitH(fh, fh * 0.9)), look: new THREE.Vector3(0, this.headY - 0.02, 0) };
      let target = body;
      if (this.debugView) target = this.debugView;
      else if (this.focus === 'face') target = face;
      else if (this.focus === 'dragon' && this.dragon) {
        const b = this.dragonBox;
        const c = b.getCenter(new THREE.Vector3());
        const size = b.getSize(new THREE.Vector3());
        const Hd = Math.max(size.y, 2.2) * 1.15;
        const Wd = size.x * 0.8 + 1.0;
        const cx = (c.x + 0) / 2;
        target = { pos: new THREE.Vector3(cx, Hd * 0.55, fitH(Hd, Wd) + 1.0), look: new THREE.Vector3(cx, Hd * 0.4, c.z * 0.4) };
      }
      const k = 1 - Math.exp(-dt * 5);
      if (this.camPos.lengthSq() === 0) {
        this.camPos.copy(target.pos);
        this.camLook.copy(target.look);
      }
      this.camPos.lerp(target.pos, k);
      this.camLook.lerp(target.look, k);
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook);
      // move the picture up so the figure is centred in the free part
      this.camera.setViewOffset(w, h, 0, covered / 2, w, h);
      this.camera.updateProjectionMatrix();
    }
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
    if (this.dragon) this.scene.remove(this.dragon);
    this.figure = null;
    this.dragon = null;
    const r = this.renderer;
    this.renderer = null;
    if (r) {
      r.dispose();
      r.forceContextLoss();
    }
    this.canvas.remove();
  }
}

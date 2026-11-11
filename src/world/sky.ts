// Low Countries skies. Each time-of-day preset is a real photographed sky
// (Poly Haven, CC0; see tools/assets/build_skies.py): a 4K panorama for the
// visible dome and an HDR environment for image-based lighting, with a
// directional sun/moon added on top so it can cast shadows.

import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { asset, fetchBinary } from '../core/assets';
import { clamp } from '../core/math';

interface SkyData {
  id: string;
  sun: [number, number, number];
  horizon: [number, number, number];
  zenith: [number, number, number];
}

export interface Look {
  label: string;
  sunColor: string;
  sunIntensity: number;
  envIntensity: number;
  fogDensity: number;
  /** 0..1 how many windows are lit */
  night: number;
  exposure: number;
  stars: number;
  /** split-toning (shadow tint, highlight tint) and saturation for the grade pass */
  shadowTint: [number, number, number];
  highlightTint: [number, number, number];
  saturation: number;
  /** light the scene from this elevation (degrees) instead of the photographed sun's, keeping its compass direction */
  lightElevation?: number;
}

// Flemish Masters grading: cool, slightly green-blue glazed shadows; warm, creamy lights.
const LOOKS: Record<string, Look> = {
  golden: {
    label: 'Golden hour', sunColor: '#ffb574', sunIntensity: 5.2, envIntensity: 1.75, fogDensity: 0.00015, night: 0.2, exposure: 0.86, stars: 0,
    shadowTint: [0.96, 0.99, 1.05], highlightTint: [1.06, 1.0, 0.88], saturation: 1.1, lightElevation: 17,
  },
  day: {
    label: 'High summer', sunColor: '#fff0d8', sunIntensity: 4.8, envIntensity: 1.25, fogDensity: 0.00009, night: 0, exposure: 0.66, stars: 0,
    shadowTint: [0.97, 0.99, 1.04], highlightTint: [1.04, 1.0, 0.93], saturation: 1.08,
  },
  storm: {
    label: 'Storm light', sunColor: '#b8c2d0', sunIntensity: 0.9, envIntensity: 1.5, fogDensity: 0.00026, night: 0.45, exposure: 0.8, stars: 0,
    shadowTint: [0.95, 0.98, 1.03], highlightTint: [1.02, 1.0, 0.96], saturation: 0.86,
  },
  night: {
    label: 'Moonlit night', sunColor: '#8fa8dc', sunIntensity: 0.42, envIntensity: 2.6, fogDensity: 0.00018, night: 1, exposure: 2.0, stars: 1,
    shadowTint: [0.88, 0.96, 1.12], highlightTint: [1.05, 0.98, 0.88], saturation: 0.9,
  },
};
const ORDER = ['golden', 'night', 'storm', 'day'];


export class Atmosphere {
  sun = new THREE.DirectionalLight('#ffffff', 3);
  dome: THREE.Mesh;
  night = 0;
  look: Look = LOOKS.golden;
  current = 'golden';
  sunDir = new THREE.Vector3(0.3, 0.8, 0.5).normalize();
  private data = new Map<string, SkyData>();
  private cache = new Map<string, { bg: THREE.Texture; env: THREE.Texture }>();
  private pmrem: THREE.PMREMGenerator;
  private domeMat: THREE.ShaderMaterial;
  private loading = false;
  onChange?: (look: Look) => void;

  constructor(private scene: THREE.Scene, private renderer: THREE.WebGLRenderer, private shadowSize: number) {
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.domeMat = new THREE.ShaderMaterial({
      uniforms: {
        uSky: { value: null },
        uHorizon: { value: new THREE.Color() },
        uStars: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uSky;
        uniform vec3 uHorizon;
        uniform float uStars;
        varying vec3 vDir;
        float h31(vec3 p) { p = fract(p * 0.1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
        void main() {
          vec3 d = normalize(vDir);
          vec2 uv = vec2(atan(d.z, d.x) * 0.15915494 + 0.5, asin(clamp(d.y, -1.0, 1.0)) * 0.31830989 + 0.5);
          vec3 c = pow(texture2D(uSky, uv).rgb, vec3(2.2));
          c = c / max(1.0 - c, 0.025);            // undo the x/(1+x) compression → HDR
          // tiny, sharp stars in the clear parts of the night sky
          vec3 cell = floor(d * 260.0);
          float star = step(0.9972, h31(cell)) * smoothstep(0.02, 0.2, d.y);
          c += uStars * star * (0.25 + 0.75 * h31(cell + 7.0)) * vec3(0.9, 0.95, 1.0) * 0.35;
          // below the horizon the panorama is a mirror image: fade to haze instead
          c = mix(uHorizon, c, smoothstep(-0.03, 0.02, d.y));
          gl_FragColor = vec4(c, 1.0);
        }`,
      side: THREE.BackSide,
      depthTest: false,
      depthWrite: false,
      fog: false,
      toneMapped: false,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), this.domeMat);
    this.dome.scale.setScalar(9000);
    this.dome.renderOrder = -1000;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    this.sun.castShadow = shadowSize > 0;
    if (shadowSize > 0) this.sun.shadow.mapSize.set(shadowSize, shadowSize);
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 2600;
    scene.add(this.sun, this.sun.target);
    scene.fog = new THREE.FogExp2('#c9d6df', 0.00012);
  }

  async init(start: string) {
    const res = await fetch(asset('sky/skies.json'));
    const json = (await res.json()) as { presets: SkyData[] };
    for (const p of json.presets) this.data.set(p.id, p);
    await this.setPreset(this.data.has(start) ? start : 'golden');
  }

  private async load(id: string) {
    let c = this.cache.get(id);
    if (c) return c;
    const [bg, raw] = await Promise.all([
      new THREE.TextureLoader().loadAsync(asset(`sky/${id}_bg.jpg`)),
      fetchBinary(`sky/${id}_env.hdr`),
    ]);
    const d = new RGBELoader().parse(raw);
    const hdr = new THREE.DataTexture(d.data, d.width, d.height, THREE.RGBAFormat, d.type);
    hdr.colorSpace = THREE.LinearSRGBColorSpace;
    hdr.minFilter = hdr.magFilter = THREE.LinearFilter;
    hdr.generateMipmaps = false;
    hdr.flipY = true;
    hdr.needsUpdate = true;
    bg.colorSpace = THREE.NoColorSpace;
    bg.generateMipmaps = false;
    bg.minFilter = THREE.LinearFilter;
    bg.wrapS = THREE.RepeatWrapping;
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    const env = this.pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
    c = { bg, env };
    this.cache.set(id, c);
    return c;
  }

  async setPreset(id: string) {
    if (this.loading) return;
    this.loading = true;
    try {
      const tex = await this.load(id);
      const d = this.data.get(id)!;
      const look = LOOKS[id];
      this.current = id;
      this.look = look;
      this.night = look.night;
      this.domeMat.uniforms.uSky.value = tex.bg;
      this.domeMat.uniforms.uHorizon.value.setRGB(d.horizon[0], d.horizon[1], d.horizon[2]);
      this.domeMat.uniforms.uStars.value = look.stars;
      this.scene.environment = tex.env;
      this.scene.environmentIntensity = look.envIntensity;
      this.sunDir.set(d.sun[0], d.sun[1], d.sun[2]).normalize();
      if (look.lightElevation !== undefined) {
        const e = (look.lightElevation * Math.PI) / 180;
        const h = Math.hypot(d.sun[0], d.sun[2]) || 1;
        this.sunDir.set((d.sun[0] / h) * Math.cos(e), Math.sin(e), (d.sun[2] / h) * Math.cos(e));
      }
      this.sun.color.set(look.sunColor);
      this.sun.intensity = look.sunIntensity;
      const fog = this.scene.fog as THREE.FogExp2;
      fog.color.setRGB(d.horizon[0], d.horizon[1], d.horizon[2]);
      fog.density = look.fogDensity;
      this.renderer.toneMappingExposure = look.exposure;
      this.onChange?.(look);
    } finally {
      this.loading = false;
    }
  }

  /** Cycle to the next time of day. */
  advance() {
    const i = ORDER.indexOf(this.current);
    void this.setPreset(ORDER[(i + 1) % ORDER.length]);
  }

  /**
   * Keep the sky centred on the camera and fit the shadow map around the
   * player: tight and crisp near the ground, wide when flying high.
   */
  update(camPos: THREE.Vector3, focus: THREE.Vector3, altitude: number) {
    this.dome.position.copy(camPos);
    if (!this.sun.castShadow) {
      this.sun.position.copy(focus).addScaledVector(this.sunDir, 1000);
      this.sun.target.position.copy(focus);
      return;
    }
    const extent = clamp(110 + altitude * 2.4, 110, 760);
    const cam = this.sun.shadow.camera;
    if (Math.abs(cam.right - extent) > extent * 0.04) {
      cam.left = -extent; cam.right = extent; cam.top = extent; cam.bottom = -extent;
      cam.updateProjectionMatrix();
    }
    const texel = (cam.right * 2) / this.shadowSize;
    // snap the shadow frustum to whole texels so shadows don't shimmer as we move
    const fwd = this.sunDir;
    const right = new THREE.Vector3(0, 1, 0).cross(fwd).normalize();
    const up = fwd.clone().cross(right).normalize();
    const sx = Math.round(focus.dot(right) / texel) * texel;
    const sy = Math.round(focus.dot(up) / texel) * texel;
    const sz = focus.dot(fwd);
    const snapped = right.multiplyScalar(sx).addScaledVector(up, sy).addScaledVector(fwd, sz);
    this.sun.target.position.copy(snapped);
    this.sun.position.copy(snapped).addScaledVector(fwd, 1300);
    this.sun.shadow.bias = -0.00012 - texel * 0.0006;
    this.sun.shadow.normalBias = texel * 2.2;
  }
}

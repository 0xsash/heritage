// Low Countries skies: physical sky dome, a sun that drives light colour and
// fog, a cold moon at night (when the windows of Diest light up), stars, and
// low-poly cumulus to give flight a sense of speed.

import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { clamp, lerp, rng, smoothstep } from '../core/math';

export class Atmosphere {
  sky = new Sky();
  sun = new THREE.DirectionalLight('#fff1d6', 3);
  hemi = new THREE.HemisphereLight('#bcd2e8', '#5a5838', 1.1);
  stars: THREE.Points;
  clouds = new THREE.Group();
  /** 0..1, 0 = midnight, 0.5 = noon */
  time = 0.69;
  night = 0;
  private pmrem: THREE.PMREMGenerator;
  private envScene = new THREE.Scene();
  private envSky = new Sky();
  private envRT: THREE.WebGLRenderTarget | null = null;
  private sunDir = new THREE.Vector3();

  constructor(private scene: THREE.Scene, private renderer: THREE.WebGLRenderer) {
    this.sky.scale.setScalar(30000);
    // The sky shader writes at the far plane; ground layers don't write depth,
    // so the sky must draw first or it paints over the fields.
    this.sky.renderOrder = -100;
    scene.add(this.sky);
    this.envSky.scale.setScalar(1000);
    this.envScene.add(this.envSky);
    this.pmrem = new THREE.PMREMGenerator(renderer);

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const s = this.sun.shadow.camera;
    s.left = -140; s.right = 140; s.top = 140; s.bottom = -140; s.near = 10; s.far = 1200;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.6;
    scene.add(this.sun, this.sun.target, this.hemi);

    // stars
    const r = rng(77);
    const pts: number[] = [];
    for (let i = 0; i < 1800; i++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2;
      const y = Math.abs(u);
      const rr = Math.sqrt(1 - u * u);
      pts.push(Math.cos(th) * rr * 9000, y * 9000 + 200, Math.sin(th) * rr * 9000);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#dfe8ff', size: 14, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.stars.renderOrder = -99;
    scene.add(this.stars);

    this.buildClouds();
    scene.add(this.clouds);
    scene.fog = new THREE.Fog('#c9d6df', 600, 7500);
    this.apply(true);
  }

  private buildClouds() {
    const r = rng(1566);
    const mat = new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: false, transparent: true, opacity: 0.86, emissive: '#8f98a6', depthWrite: false });
    const geo = new THREE.IcosahedronGeometry(1, 2);
    for (let i = 0; i < 70; i++) {
      const c = new THREE.Group();
      const n = 6 + Math.floor(r() * 7);
      for (let k = 0; k < n; k++) {
        const m = new THREE.Mesh(geo, mat);
        const s = 22 + r() * 34;
        m.scale.set(s * 1.4, s * 0.55, s);
        m.position.set((r() - 0.5) * 170, (r() - 0.2) * 14 + s * 0.15, (r() - 0.5) * 80);
        c.add(m);
      }
      c.position.set(-7500 + r() * 12000, 260 + r() * 260, -4500 + r() * 9000);
      c.rotation.y = r() * Math.PI;
      this.clouds.add(c);
    }
  }

  advance(step = 0.08) {
    this.time = (this.time + step) % 1;
    this.apply(true);
  }

  /** Recompute lights/sky. `env` re-bakes the environment map (expensive). */
  apply(env: boolean) {
    const ang = (this.time - 0.25) * Math.PI * 2; // sunrise at 0.25
    const elev = Math.sin(ang);
    // sun travels east → south → west
    this.sunDir.set(-Math.cos(ang) * 0.9, elev, 0.45).normalize();
    const day = smoothstep(-0.08, 0.2, elev);
    const golden = 1 - smoothstep(0.05, 0.45, elev);
    this.night = 1 - smoothstep(-0.15, 0.05, elev);

    const u = this.sky.material.uniforms;
    u.turbidity.value = lerp(4, 9, golden);
    u.rayleigh.value = lerp(1.2, 2.8, golden);
    u.mieCoefficient.value = 0.006;
    u.mieDirectionalG.value = 0.86;
    const skySun = this.sunDir.clone();
    if (skySun.y < -0.05) skySun.y = -0.05;
    u.sunPosition.value.copy(skySun);
    this.envSky.material.uniforms.sunPosition.value.copy(skySun);
    for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG'] as const)
      this.envSky.material.uniforms[k].value = u[k].value;

    // light: warm low sun, cool moonlight
    const sunCol = new THREE.Color('#fff4e0').lerp(new THREE.Color('#ffb070'), golden * 0.8);
    const moonCol = new THREE.Color('#7f95c8');
    this.sun.color.copy(sunCol).lerp(moonCol, this.night);
    this.sun.intensity = lerp(0.9, lerp(2.2, 3.2, 1 - golden), day);
    this.hemi.intensity = lerp(0.75, 1.15, day);
    this.hemi.color.set('#bcd2e8').lerp(new THREE.Color('#4d5f92'), this.night);
    this.hemi.groundColor.set('#5a5838').lerp(new THREE.Color('#1c1f28'), this.night);

    const fog = this.scene.fog as THREE.Fog;
    const fogDay = new THREE.Color('#c8d5de').lerp(new THREE.Color('#e3c39e'), golden * 0.7);
    fog.color.copy(fogDay).lerp(new THREE.Color('#141b2b'), this.night);
    (this.stars.material as THREE.PointsMaterial).opacity = this.night;
    this.sky.visible = this.night < 0.98;
    this.renderer.toneMappingExposure = lerp(0.62, 0.55, golden) + this.night * 0.35;
    this.scene.background = this.night > 0.98 ? new THREE.Color('#0b1020') : null;

    if (env) {
      this.envRT?.dispose();
      this.envRT = this.pmrem.fromScene(this.envScene, 0, 0.1, 2000);
      this.scene.environment = this.envRT.texture;
      this.scene.environmentIntensity = lerp(0.15, 0.55, day);
    }
  }

  update(dt: number, focus: THREE.Vector3) {
    // shadows follow the player
    const moonDir = this.night > 0.5 ? new THREE.Vector3(0.3, 0.8, -0.5).normalize() : this.sunDir;
    const dir = this.sunDir.y > 0.02 ? this.sunDir : moonDir;
    this.sun.position.copy(focus).addScaledVector(dir, 500);
    this.sun.target.position.copy(focus);
    this.sky.position.copy(focus);
    this.stars.position.set(focus.x, 0, focus.z);
    // drift clouds with the wind (west → east)
    for (const c of this.clouds.children) {
      c.position.x += dt * 4;
      if (c.position.x > focus.x + 8000) c.position.x -= 16000;
      if (c.position.x < focus.x - 8000) c.position.x += 16000;
    }
    const cm = (this.clouds.children[0]?.children[0] as THREE.Mesh | undefined)?.material as THREE.MeshLambertMaterial | undefined;
    if (cm) {
      cm.color.setScalar(clamp(1 - this.night * 0.75, 0.2, 1));
      cm.emissive.set('#8f98a6').multiplyScalar(1 - this.night * 0.85);
    }
  }
}

// Post-processing: ambient occlusion (contact shadows that ground every
// building), bloom for sun glints and lamplit windows, then one final pass
// that grades, tone-maps (ACES) and adds a soft vignette and film grain.
// The grade is the "Flemish Masters" look: cool glazed shadows, warm lights.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { N8AOPass } from 'n8ao';

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uExposure: { value: 1 },
    uTime: { value: 0 },
    uShadowTint: { value: new THREE.Vector3(1, 1, 1) },
    uHighlightTint: { value: new THREE.Vector3(1, 1, 1) },
    uSaturation: { value: 1 },
    uContrast: { value: 0.18 },
    uVignette: { value: 0.32 },
    uGrain: { value: 0.022 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uExposure, uTime, uSaturation, uContrast, uVignette, uGrain;
    uniform vec3 uShadowTint, uHighlightTint;
    varying vec2 vUv;
    vec3 RRTAndODTFit(vec3 v) {
      vec3 a = v * (v + 0.0245786) - 0.000090537;
      vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
      return a / b;
    }
    vec3 aces(vec3 color) {
      const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      return clamp(outM * RRTAndODTFit(inM * color), 0.0, 1.0);
    }
    float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb * uExposure / 0.6;
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      // split toning, like a glaze over the darks and a warm varnish over the lights
      c *= mix(uShadowTint, uHighlightTint, smoothstep(0.02, 1.1, l));
      c = mix(vec3(l), c, uSaturation);
      c = aces(max(c, 0.0));
      c = mix(c, c * c * (3.0 - 2.0 * c), uContrast);
      c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
      float d = distance(vUv, vec2(0.5));
      c *= 1.0 - uVignette * smoothstep(0.38, 0.9, d);
      c += (hash(vUv * 1400.0 + fract(uTime) * 91.0) - 0.5) * uGrain;
      gl_FragColor = vec4(c, 1.0);
    }`,
};

export class Post {
  composer: EffectComposer;
  private final: ShaderPass;
  private bloom?: UnrealBloomPass;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, quality: 'low' | 'medium' | 'high') {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.composer = new EffectComposer(renderer);
    if (quality === 'low') {
      this.composer.addPass(new RenderPass(scene, camera));
    } else {
      const ao = new N8AOPass(scene, camera, size.x, size.y);
      ao.configuration.aoRadius = 3.2;
      ao.configuration.distanceFalloff = 1.0;
      ao.configuration.intensity = 2.4;
      ao.configuration.color = new THREE.Color(0.03, 0.035, 0.05);
      ao.configuration.gammaCorrection = false;
      ao.configuration.halfRes = quality === 'medium';
      ao.setQualityMode(quality === 'high' ? 'Medium' : 'Low');
      this.composer.addPass(ao);
      this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.2, 0.6, 1.15);
      this.composer.addPass(this.bloom);
    }
    this.final = new ShaderPass(FinalShader);
    this.composer.addPass(this.final);
    if (quality !== 'low') this.composer.addPass(new SMAAPass(size.x, size.y));
  }

  setLook(look: { shadowTint: number[]; highlightTint: number[]; saturation: number; exposure: number; night: number }) {
    const u = this.final.uniforms;
    u.uShadowTint.value.set(look.shadowTint[0], look.shadowTint[1], look.shadowTint[2]);
    u.uHighlightTint.value.set(look.highlightTint[0], look.highlightTint[1], look.highlightTint[2]);
    u.uSaturation.value = look.saturation;
    u.uExposure.value = look.exposure;
    if (this.bloom) this.bloom.strength = 0.2 + look.night * 0.25;
  }

  setSize(w: number, h: number) {
    this.composer.setSize(w, h);
  }

  render(dt: number) {
    this.final.uniforms.uTime.value += dt;
    this.composer.render(dt);
  }
}

// The dragon's scale colour, chosen at creation. The painted texture keeps its
// light and shade; only its hue moves toward the chosen colour (the eyes keep
// their glow). Demergroen is the dragon as painted.

import * as THREE from 'three';

export const SCALES: { id: string; name: string; color: string | null; swatch: string }[] = [
  { id: 'demer', name: 'Demergroen', color: null, swatch: '#2f7a70' },
  { id: 'brons', name: 'Brons', color: '#b07a3a', swatch: '#8a5a2a' },
  { id: 'roest', name: 'Roest', color: '#b0482a', swatch: '#9a3a22' },
  { id: 'mos', name: 'Mos', color: '#6a8a48', swatch: '#4f6a36' },
  { id: 'nacht', name: 'Nacht', color: '#4a5a8a', swatch: '#303a5a' },
  { id: 'as', name: 'As', color: '#9a948a', swatch: '#6a665e' },
  { id: 'goud', name: 'Goud', color: '#e0b040', swatch: '#c89a32' },
];

const tinted = new WeakMap<THREE.Material, THREE.MeshStandardMaterial>();
const baseOf = new WeakMap<THREE.Material, THREE.MeshStandardMaterial>();
const uniformOf = new WeakMap<THREE.Material, { value: THREE.Color }>();

/** Tint the dragon model's body and wing materials (call again to change it). */
export function tintDragon(model: THREE.Object3D, id: string) {
  const s = SCALES.find((x) => x.id === id) ?? SCALES[0];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const out = mats.map((mat) => {
      const base = baseOf.get(mat) ?? (mat as THREE.MeshStandardMaterial);
      if (!/body|membrane/i.test(base.name) || !s.color) return base;
      let t = tinted.get(base);
      if (!t) {
        t = base.clone();
        baseOf.set(t, base);
        const u = { value: new THREE.Color() };
        uniformOf.set(t, u);
        t.onBeforeCompile = (sh) => {
          sh.uniforms.uScale = u;
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform vec3 uScale;')
            .replace(
              '#include <map_fragment>',
              `#include <map_fragment>
              {
                float l = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
                float lt = max(dot(uScale, vec3(0.2126, 0.7152, 0.0722)), 1e-3);
                diffuseColor.rgb = mix(diffuseColor.rgb, uScale * (l / lt), 0.78);
              }`,
            );
        };
        t.customProgramCacheKey = () => 'dragon-scales';
        tinted.set(base, t);
      }
      uniformOf.get(t)!.value.set(s.color);
      return t;
    });
    m.material = Array.isArray(m.material) ? out : out[0];
  });
}

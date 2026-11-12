// One painted texture, many people: swap the cloak's red for another colour in
// the shader (only strongly red, saturated texels change; skin and leather
// keep theirs), with an optional overall tint and a flash for hits.

import * as THREE from 'three';

const cache = new Map<string, THREE.MeshStandardMaterial>();

/**
 * A copy of `base` whose red cloth reads as `cloak`. Materials are shared per
 * colour unless `unique` (enemies need their own, to flash when hit).
 */
export function recolor(base: THREE.MeshStandardMaterial, cloak: string, tint = '#ffffff', unique = false): THREE.MeshStandardMaterial {
  const key = `${base.uuid}|${cloak}|${tint}|${unique}`;
  if (!unique && cache.has(key)) return cache.get(key)!;
  const m = base.clone();
  const uCloak = { value: new THREE.Color(cloak) };
  m.color.multiply(new THREE.Color(tint));
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCloak = uCloak;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uCloak;')
      .replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
          vec4 sampledDiffuseColor = texture2D( map, vMapUv );
          vec3 sc = sampledDiffuseColor.rgb;
          float mx = max(sc.r, max(sc.g, sc.b));
          // red cloth at any brightness: how much redder than it is anything else
          float red = smoothstep(0.5, 0.75, (sc.r - max(sc.g, sc.b)) / max(sc.r, 1e-3)) * smoothstep(0.004, 0.03, sc.r);
          vec3 lum = uCloak * clamp(mx * 1.9, 0.0, 1.5);
          sampledDiffuseColor.rgb = mix(sc, lum, red);
          diffuseColor *= sampledDiffuseColor;
        #endif`,
      );
  };
  m.customProgramCacheKey = () => 'recolor-v1';
  if (!unique) cache.set(key, m);
  return m;
}

/** A plain arming sword, for when the rider model has none of its own. */
export function makeSword() {
  const g = new THREE.Group();
  g.name = 'sword-fallback';
  const steel = new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.85, roughness: 0.28 });
  const brass = new THREE.MeshStandardMaterial({ color: '#b08a3a', metalness: 0.8, roughness: 0.35 });
  const grip = new THREE.MeshStandardMaterial({ color: '#3a2618', roughness: 0.8 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.82, 0.012), steel);
  blade.position.y = 0.52;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.09, 4), steel);
  tip.position.y = 0.975;
  tip.rotation.y = Math.PI / 4;
  tip.scale.z = 0.3;
  const guard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.025, 0.03), brass);
  guard.position.y = 0.1;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.14, 8), grip);
  handle.position.y = 0.02;
  const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), brass);
  pommel.position.y = -0.06;
  g.add(blade, tip, guard, handle, pommel);
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  // MPFB hand bones run along +Y towards the fingers; the fist closes around -Z
  g.rotation.set(Math.PI / 2, 0, 0);
  g.position.set(0, 0.08, -0.03);
  return g;
}

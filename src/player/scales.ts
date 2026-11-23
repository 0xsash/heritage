// The dragon's colours, chosen at creation: the scales, the belly and wing
// membranes, the eyes. The painted texture keeps its light and shade; only its
// hue moves toward the chosen colour (the eyes keep their glow). Demergroen is
// the dragon as painted. Horns: extra horns grown on the head bone at run time.

import * as THREE from 'three';

export const SCALES: { id: string; name: string; color: string | null; swatch: string }[] = [
  { id: 'demer', name: 'Demer green', color: null, swatch: '#2f7a70' },
  { id: 'brons', name: 'Bronze', color: '#b07a3a', swatch: '#8a5a2a' },
  { id: 'roest', name: 'Rust', color: '#b0482a', swatch: '#9a3a22' },
  { id: 'mos', name: 'Moss', color: '#6a8a48', swatch: '#4f6a36' },
  { id: 'nacht', name: 'Night', color: '#4a5a8a', swatch: '#303a5a' },
  { id: 'as', name: 'Ash', color: '#9a948a', swatch: '#6a665e' },
  { id: 'goud', name: 'Gold', color: '#e0b040', swatch: '#c89a32' },
];
/** Belly plates and wing membranes; null: the same as the scales. */
export const BELLIES: { id: string | null; name: string; color: string | null; swatch: string }[] = [
  { id: null, name: 'Like the scales', color: null, swatch: 'linear-gradient(135deg,#2f7a70 50%,#8a5a2a 50%)' },
  { id: 'room', name: 'Cream', color: '#e0c890', swatch: '#d8c088' },
  { id: 'vuur', name: 'Fire red', color: '#c84a28', swatch: '#b04024' },
  { id: 'okergeel', name: 'Ochre yellow', color: '#d09a38', swatch: '#c08a30' },
  { id: 'zeegroen', name: 'Sea green', color: '#4a9a88', swatch: '#3a8070' },
  { id: 'paars', name: 'Purple', color: '#7a4a8a', swatch: '#6a3a78' },
  { id: 'roet', name: 'Soot', color: '#3a3430', swatch: '#2a2624' },
];
export const DRAGON_EYES: { id: string | null; name: string; color: string | null; swatch: string }[] = [
  { id: null, name: 'As painted', color: null, swatch: '#e0c050' },
  { id: 'amber', name: 'Amber', color: '#ffb030', swatch: '#ffb030' },
  { id: 'vuur', name: 'Fire', color: '#ff4a20', swatch: '#ff4a20' },
  { id: 'ijs', name: 'Ice blue', color: '#70d0ff', swatch: '#70d0ff' },
  { id: 'gifgroen', name: 'Poison green', color: '#7aff50', swatch: '#7aff50' },
  { id: 'wit', name: 'White', color: '#f4f0e0', swatch: '#f4f0e0' },
];
export const HORNS: { id: string; name: string }[] = [
  { id: 'gewoon', name: 'As painted' },
  { id: 'ram', name: 'Ram horns' },
  { id: 'kroon', name: 'Spike crown' },
  { id: 'spies', name: 'Long spears' },
];

/** What the creation screen chose for the dragon (all optional: an older save is the painted dragon). */
export interface DragonLook {
  dragonBelly?: string | null;
  dragonEyes?: string | null;
  dragonHorns?: string;
}

const tinted = new WeakMap<THREE.Material, THREE.MeshStandardMaterial>();
const baseOf = new WeakMap<THREE.Material, THREE.MeshStandardMaterial>();
const uniformOf = new WeakMap<THREE.Material, { scale: { value: THREE.Color }; belly: { value: THREE.Color }; on: { value: THREE.Vector2 } }>();

/** Tint the dragon model's body, membranes and eyes, and grow its horns (call again to change it). */
export function tintDragon(model: THREE.Object3D, id: string, look: DragonLook = {}) {
  const s = SCALES.find((x) => x.id === id) ?? SCALES[0];
  const b = BELLIES.find((x) => x.id === (look.dragonBelly ?? null)) ?? BELLIES[0];
  const e = DRAGON_EYES.find((x) => x.id === (look.dragonEyes ?? null)) ?? DRAGON_EYES[0];
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    const out = mats.map((mat) => {
      const base = baseOf.get(mat) ?? (mat as THREE.MeshStandardMaterial);
      if (/eye/i.test(base.name)) return eyeMaterial(base, e.color);
      const membrane = /membrane/i.test(base.name);
      if (!/body|membrane/i.test(base.name)) return base;
      const scaleCol = s.color, bellyCol = b.color;
      if (!scaleCol && !bellyCol) return base;
      let t = tinted.get(base);
      if (!t) {
        t = base.clone();
        baseOf.set(t, base);
        const u = { scale: { value: new THREE.Color() }, belly: { value: new THREE.Color() }, on: { value: new THREE.Vector2() } };
        uniformOf.set(t, u);
        t.onBeforeCompile = (sh) => {
          sh.uniforms.uScale = u.scale;
          sh.uniforms.uBelly = u.belly;
          sh.uniforms.uOn = u.on;
          sh.vertexShader = sh.vertexShader
            .replace('#include <common>', '#include <common>\nvarying float vDown;')
            .replace('#include <defaultnormal_vertex>', `#include <defaultnormal_vertex>\nvDown = ${membrane ? '1.0' : '-objectNormal.y'};`);
          sh.fragmentShader = sh.fragmentShader
            .replace('#include <common>', '#include <common>\nuniform vec3 uScale;\nuniform vec3 uBelly;\nuniform vec2 uOn;\nvarying float vDown;')
            .replace(
              '#include <map_fragment>',
              `#include <map_fragment>
              {
                float l = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
                float belly = uOn.y * smoothstep(0.25, 0.7, vDown);
                vec3 tgt = mix(uScale, uBelly, belly);
                float on = max(uOn.x * (1.0 - belly), belly);
                float lt = max(dot(tgt, vec3(0.2126, 0.7152, 0.0722)), 1e-3);
                diffuseColor.rgb = mix(diffuseColor.rgb, tgt * (l / lt), 0.78 * on);
              }`,
            );
        };
        t.customProgramCacheKey = () => (membrane ? 'dragon-scales-m' : 'dragon-scales');
        tinted.set(base, t);
      }
      const u = uniformOf.get(t)!;
      u.scale.value.set(scaleCol ?? '#ffffff');
      u.belly.value.set(bellyCol ?? scaleCol ?? '#ffffff');
      u.on.value.set(scaleCol ? 1 : 0, bellyCol ? 1 : 0);
      return t;
    });
    m.material = Array.isArray(m.material) ? out : out[0];
  });
  growHorns(model, look.dragonHorns ?? 'gewoon');
}

const eyeMats = new WeakMap<THREE.Material, Map<string, THREE.Material>>();
function eyeMaterial(base: THREE.MeshStandardMaterial, color: string | null) {
  if (!color) return base;
  let per = eyeMats.get(base);
  if (!per) eyeMats.set(base, (per = new Map()));
  let m = per.get(color);
  if (!m) {
    const t = base.clone();
    baseOf.set(t, base);
    t.color = new THREE.Color(color);
    t.emissive = new THREE.Color(color);
    t.emissiveIntensity = Math.max(0.6, base.emissiveIntensity || 1);
    m = t;
    per.set(color, m);
  }
  return m;
}

/**
 * Extra horns on the head bone: a pair of curling ram's horns, a crown of short spikes, or two long spears swept
 * back. Sized from the head bone's own scale in the model; removed and regrown on every call.
 */
function growHorns(model: THREE.Object3D, kind: string) {
  const head = model.getObjectByName('head');
  if (!head) return;
  const old = head.getObjectByName('extra-horns');
  if (old) head.remove(old);
  if (kind === 'gewoon') return;
  const g = new THREE.Group();
  g.name = 'extra-horns';
  // a horn material like the body's (the painted texture would need UVs; a flat bone colour reads as horn)
  const mat = new THREE.MeshStandardMaterial({ color: '#c29a5e', roughness: 0.5, metalness: 0.05 });
  // the head's size in its own space (from the skinned body mesh would be exact; the model is ~1 unit per metre)
  model.updateMatrixWorld(true);
  const ws = new THREE.Vector3();
  head.getWorldScale(ws);
  const mscale = new THREE.Vector3();
  model.getWorldScale(mscale);
  const k = mscale.x / Math.max(ws.x, 1e-6);
  const horn = (len: number, r: number, bend: number, twist = 0, segs = 10) => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const a = bend * t;
      pts.push(new THREE.Vector3(Math.sin(twist * t) * len * 0.3 * t, Math.sin(a) * len * 0.5 * t, Math.cos(a) * len * t));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const geo = new THREE.TubeGeometry(curve, segs * 2, r, 7, false);
    // taper: scale the rings towards the tip
    const p = geo.getAttribute('position') as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      const ring = Math.floor(i / 8) / (segs * 2);
      const c = curve.getPoint(Math.min(1, ring));
      v.fromBufferAttribute(p, i).sub(c).multiplyScalar(Math.max(0.08, 1 - ring * 0.92)).add(c);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat);
  };
  // head bone frame: the dragon's head bone points forward (+Z of the model) in the rest pose; horns go back (-Z) and up
  const add = (m: THREE.Mesh, x: number, y: number, z: number, rx: number, ry: number, rz: number) => {
    m.position.set(x * k, y * k, z * k);
    m.rotation.set(rx, ry, rz);
    m.scale.setScalar(k);
    m.castShadow = true;
    g.add(m);
  };
  // the dragon's head is big (about 1.5 m from the brow to the snout): sizes are in that model's metres
  if (kind === 'ram') {
    for (const s of [-1, 1]) add(horn(0.95, 0.12, 4.4, 0.9 * s, 18), 0.36 * s, 0.22, -0.30, 0.5, Math.PI + 1.1 * s, 0.5 * s);
  } else if (kind === 'kroon') {
    for (let i = 0; i < 9; i++) {
      const a = -1.2 + (2.4 * i) / 8;
      add(horn(0.7 + 0.25 * Math.cos(a * 1.3), 0.075, 0.5), Math.sin(a) * 0.34, 0.36, -0.12 - 0.22 * Math.cos(a), -1.3, Math.PI + a * 0.8, 0);
    }
  } else if (kind === 'spies') {
    for (const s of [-1, 1]) add(horn(2.3, 0.11, 0.3), 0.24 * s, 0.34, -0.22, -0.30, Math.PI + 0.16 * s, 0);
  }
  head.add(g);
}

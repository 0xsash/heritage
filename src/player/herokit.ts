// Building the player's hero from the townsfolk kit, with what it still lacks
// taken from rider.glb (same skeleton, same bone names, near-identical rest
// pose), and the stand-in model the rest of the game clones when it needs a
// generic person and rider.glb was never fetched.

import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { rng } from '../core/math';
import { cloakPiece, heroSpec, HERO_CLIPS } from '../rpg/look';
import type { HeroData } from '../rpg/state';
import type { Folk, TownsfolkKit } from '../rpg/townsfolk';
import type { Hero } from './hero';

/**
 * The rider's clips, fitted to a kit body: joint rotations as they are, the
 * hips' travel scaled from the rider's pelvis height to this body's, and no
 * other translation or scale tracks (the kit's own clips follow the same rule).
 */
export function borrowClips(rider: GLTF, folk: Folk, names: string[]): THREE.AnimationClip[] {
  const kp = folk.root.getObjectByName('pelvis'), rp = rider.scene.getObjectByName('pelvis');
  const k = kp && rp && rp.position.length() > 1e-3 ? kp.position.length() / rp.position.length() : 1;
  const bones = new Set<string>();
  folk.root.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones.add(o.name);
  });
  const out: THREE.AnimationClip[] = [];
  for (const name of names) {
    const src = rider.animations.find((c) => c.name === name);
    if (!src) continue;
    const c = src.clone();
    c.tracks = c.tracks.filter((t) => {
      const i = t.name.lastIndexOf('.');
      const bone = t.name.slice(0, i), prop = t.name.slice(i + 1);
      if (!bones.has(bone)) return false;
      if (prop === 'quaternion') return true;
      return prop === 'position' && bone === 'pelvis';
    });
    for (const t of c.tracks)
      if (t.name === 'pelvis.position') {
        t.values = t.values.slice();
        for (let i = 0; i < t.values.length; i++) t.values[i] *= k;
      }
    out.push(c);
  }
  return out;
}

/**
 * Dress the hero as saved. Returns false when the kit cannot make them (the
 * caller then falls back to rider.glb). `rider` is only awaited when the kit
 * lacks some of the hero's clips.
 */
export async function dressHero(hero: Hero, kit: TownsfolkKit, h: HeroData, rider: () => Promise<GLTF | null>): Promise<{ folk: Folk; rider: GLTF | null } | null> {
  const spec = heroSpec(kit, h);
  const folk = kit.buildSpec(spec);
  if (!folk) return null;
  const missing = HERO_CLIPS.filter((c) => !kit.hasClip(c));
  const r = missing.length ? await rider() : null;
  const extra = r ? borrowClips(r, folk, missing) : [];
  const piece = cloakPiece(spec);
  darkenLeather(folk.root);
  hero.useFolk(folk, extra, (color) => {
    if (piece) kit.redye(folk.root, piece, color);
  });
  return { folk, rider: r };
}

/**
 * The kit paints boots in a light tan leather that reads as bare skin at play distance (the hero looked
 * barefoot from behind). Darken the hero's boots to a worn brown; the rest of the figure is untouched.
 */
export function darkenLeather(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || o.userData.folk?.piece !== 'boots') return;
    const mat = (m.material as THREE.MeshStandardMaterial).clone();
    mat.color.multiplyScalar(0.32);
    m.material = mat;
  });
}

/** A plain person from the kit, for code that clones "the hero's model" as a generic figure. */
export function kitStandIn(kit: TownsfolkKit): GLTF | null {
  const folk = kit.build(rng(4242), undefined, 'journeyman') ?? kit.buildSpec({ body: 'man', wear: { hair_crop: 'h_brown', smock: 'linen', belt: null, breeches: 'brown', stockings: 'grey', shoes: null } });
  if (!folk) return null;
  return { scene: folk.root as THREE.Group, animations: kit.animations, scenes: [folk.root as THREE.Group], cameras: [], asset: {}, parser: null, userData: {} } as unknown as GLTF;
}

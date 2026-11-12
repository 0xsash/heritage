// Loading rigged GLB models (built in Blender, see tools/blender) and driving
// their skeletons from code.

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { fetchBinary } from '../core/assets';

/** Load a GLB from /public. Returns null if it is missing or broken, so callers can fall back. */
export async function loadModel(path: string): Promise<GLTF | null> {
  try {
    // meshopt-compressed and quantised files (gltfpack) load as well as plain ones
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(await fetchBinary(path), '');
    gltf.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false; // skinned bounds are unreliable once bones move
    });
    return gltf;
  } catch (e) {
    console.warn('model not loaded', path, e);
    return null;
  }
}

/**
 * Drives a skeleton procedurally. Rotations are given in MODEL space (the
 * axes of the whole model at rest: +Z forward, +Y up, +X left), so animation
 * code does not need to know how each bone happens to be oriented.
 */
export class BoneRig {
  private bones = new Map<string, { bone: THREE.Bone; rest: THREE.Quaternion; world: THREE.Quaternion; worldInv: THREE.Quaternion; restPos: THREE.Vector3 }>();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();

  constructor(root: THREE.Object3D) {
    root.updateWorldMatrix(true, true);
    const rootInv = new THREE.Quaternion();
    root.getWorldQuaternion(rootInv).invert();
    root.traverse((o) => {
      const b = o as THREE.Bone;
      if (!b.isBone) return;
      const world = new THREE.Quaternion();
      b.getWorldQuaternion(world).premultiply(rootInv);
      this.bones.set(b.name, { bone: b, rest: b.quaternion.clone(), world, worldInv: world.clone().invert(), restPos: b.position.clone() });
    });
  }

  has(name: string) {
    return this.bones.has(name);
  }

  get(name: string) {
    return this.bones.get(name)?.bone;
  }

  names() {
    return [...this.bones.keys()];
  }

  /** Rotate a bone away from its rest pose by Euler angles about the model's own axes. */
  rotate(name: string, x: number, y: number, z: number, order: THREE.EulerOrder = 'XYZ') {
    const b = this.bones.get(name);
    if (!b) return;
    this.q.setFromEuler(this.e.set(x, y, z, order));
    // local = rest * (worldRest^-1 * delta * worldRest)
    b.bone.quaternion.copy(b.worldInv).multiply(this.q).multiply(b.world).premultiply(b.rest);
  }

  /** Add a rotation (model-space Euler) on top of whatever the bone currently has (e.g. after a mixer update). */
  rotateOnTop(name: string, x: number, y: number, z: number) {
    const b = this.bones.get(name);
    if (!b) return;
    this.q.setFromEuler(this.e.set(x, y, z, 'XYZ'));
    const local = b.worldInv.clone().multiply(this.q).multiply(b.world);
    b.bone.quaternion.multiply(local);
  }

  reset() {
    for (const b of this.bones.values()) {
      b.bone.quaternion.copy(b.rest);
      b.bone.position.copy(b.restPos);
    }
  }
}

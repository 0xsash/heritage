// People and things in the world that quests use: NPCs (clones of the rider
// model on the shared skeleton, recoloured, playing the idle clip) with "!" and
// "?" markers, and quest pickups that glow so they can be found from the air.

import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { WorldCollision } from '../world/collision';
import type { QuestEngine } from './quests';
import type { NpcDef } from './types';

interface Npc {
  def: NpcDef;
  root: THREE.Object3D;
  mixer?: THREE.AnimationMixer;
  marker: THREE.Sprite;
  shown: '!' | '?' | null;
  x: number;
  z: number;
  yaw: number;
}

function markerTexture(glyph: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.font = 'bold 104px Cinzel, Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = 'rgba(30, 18, 6, 0.9)';
  g.strokeText(glyph, 64, 70);
  g.fillStyle = '#f2c35a';
  g.fillText(glyph, 64, 70);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function openGround(col: WorldCollision, x: number, z: number): [number, number] {
  for (let r = 0; r < 40; r += 1) {
    for (let a = 0; a < Math.PI * 2; a += 0.35) {
      const tx = x + Math.cos(a) * r, tz = z + Math.sin(a) * r;
      if (col.heightAround(tx, tz, 1.2) < 0.1) return [tx, tz];
    }
  }
  return [x, z];
}

export class Actors {
  group = new THREE.Group();
  npcs: Npc[] = [];
  private pickups = new Map<string, { mesh: THREE.Group; item: string; x: number; z: number }>();
  private tex = { '!': markerTexture('!'), '?': markerTexture('?') };
  private pickupGeo = new THREE.OctahedronGeometry(0.32, 0);
  private pickupMat = new THREE.MeshStandardMaterial({ color: '#e8c060', emissive: '#c08a20', emissiveIntensity: 1.8, roughness: 0.3, metalness: 0.6 });
  private beamMat = new THREE.MeshBasicMaterial({ color: '#ffd780', transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
  private beamGeo = new THREE.CylinderGeometry(0.15, 0.5, 14, 8, 1, true).translate(0, 7, 0);
  private time = 0;

  constructor(private model: GLTF | null, private engine: QuestEngine, private col: WorldCollision) {}

  spawnNpcs(defs: NpcDef[]) {
    for (const def of defs) {
      const [x, z] = openGround(this.col, def.at[0], def.at[1]);
      const root = new THREE.Group();
      let mixer: THREE.AnimationMixer | undefined;
      if (this.model) {
        const m = SkeletonUtils.clone(this.model.scene);
        m.traverse((o) => {
          const mesh = o as THREE.SkinnedMesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          mesh.frustumCulled = false;
          if (def.tint && /cloak/i.test(mesh.name)) {
            const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
            mat.color.set(def.tint);
            mesh.material = mat;
          }
        });
        root.add(m);
        mixer = new THREE.AnimationMixer(m);
        const idle = this.model.animations.find((a) => a.name === 'idle');
        if (idle) {
          const act = mixer.clipAction(idle);
          act.play();
          act.time = Math.random() * idle.duration;
        }
      } else {
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.1, 4, 8), new THREE.MeshStandardMaterial({ color: def.tint ?? '#7a3a2a' }));
        body.position.y = 0.9;
        root.add(body);
      }
      const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex['!'], depthTest: true, transparent: true }));
      marker.scale.setScalar(0.75);
      marker.position.y = 2.35;
      marker.visible = false;
      root.add(marker);
      const yaw = def.facing ?? 0;
      root.position.set(x, this.col.heightAt(x, z), z);
      root.rotation.y = yaw;
      this.group.add(root);
      this.npcs.push({ def, root, mixer, marker, shown: null, x, z, yaw });
      this.engine.npcPos.set(def.id, [x, z]);
    }
  }

  /** The NPC within reach of (x,z), if any. */
  nearestNpc(x: number, z: number, reach = 3.2): NpcDef | null {
    let best: Npc | null = null, bd = reach * reach;
    for (const n of this.npcs) {
      const d = (n.x - x) ** 2 + (n.z - z) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    return best?.def ?? null;
  }

  nearestPickup(x: number, z: number, reach = 2.6) {
    let best: { key: string; item: string } | null = null, bd = reach * reach;
    for (const [key, p] of this.pickups) {
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bd) { bd = d; best = { key, item: p.item }; }
    }
    return best;
  }

  /** Keep pickups in step with the active objectives. */
  syncPickups() {
    const want = this.engine.activePickups();
    const keys = new Set(want.map((w) => w.key));
    for (const [key, p] of this.pickups) {
      if (!keys.has(key)) {
        this.group.remove(p.mesh);
        this.pickups.delete(key);
      }
    }
    for (const w of want) {
      if (this.pickups.has(w.key)) continue;
      const [x, z] = openGround(this.col, w.x, w.z);
      const g = new THREE.Group();
      const gem = new THREE.Mesh(this.pickupGeo, this.pickupMat);
      gem.position.y = 1.0;
      g.add(gem, new THREE.Mesh(this.beamGeo, this.beamMat));
      g.position.set(x, this.col.heightAt(x, z), z);
      this.group.add(g);
      this.pickups.set(w.key, { mesh: g, item: w.item, x, z });
    }
  }

  update(dt: number, px: number, pz: number, talkingTo: string | null) {
    this.time += dt;
    for (const n of this.npcs) {
      const d2 = (n.x - px) ** 2 + (n.z - pz) ** 2;
      if (d2 < 120 * 120) n.mixer?.update(dt);
      // turn to face the player when they come close
      const want = d2 < 36 || talkingTo === n.def.id ? Math.atan2(px - n.x, pz - n.z) : n.yaw;
      let dy = want - n.root.rotation.y;
      dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      n.root.rotation.y += dy * Math.min(1, dt * 4);
      const m = this.engine.marker(n.def.id);
      if (m !== n.shown) {
        n.shown = m;
        n.marker.visible = !!m;
        if (m) (n.marker.material as THREE.SpriteMaterial).map = this.tex[m];
      }
      if (m) n.marker.position.y = 2.35 + Math.sin(this.time * 2.4) * 0.06;
    }
    for (const p of this.pickups.values()) {
      const gem = p.mesh.children[0];
      gem.rotation.y += dt * 1.6;
      gem.position.y = 1.0 + Math.sin(this.time * 2 + p.x) * 0.12;
    }
  }
}

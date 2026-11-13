// Things to read in the world: notice boards, inscribed stones, the pillory,
// the great cannon. Each one teaches something about 1650 (see kroniek.ts).
// Unread ones carry a small gold scroll mark, like quest givers carry a "!".

import * as THREE from 'three';
import type { WorldCollision } from '../world/collision';
import type { Kroniek, Readable } from './kroniek';

interface Placed { def: Readable; x: number; z: number; mark: THREE.Sprite; glint: THREE.Mesh }

function scrollTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.lineJoin = 'round';
  g.lineWidth = 9;
  g.strokeStyle = 'rgba(30, 18, 6, 0.9)';
  g.fillStyle = '#f2c35a';
  // an open scroll: a sheet with rolled ends
  const path = () => {
    g.beginPath();
    g.roundRect(30, 26, 68, 76, 6);
  };
  path();
  g.stroke();
  path();
  g.fill();
  g.fillStyle = '#b8862a';
  g.fillRect(26, 20, 76, 12);
  g.fillRect(26, 96, 76, 12);
  g.fillStyle = 'rgba(40, 24, 8, 0.75)';
  for (let i = 0; i < 4; i++) g.fillRect(42, 44 + i * 13, i === 3 ? 30 : 44, 5);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function paperTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#e6d8b4';
  g.fillRect(0, 0, 128, 160);
  g.fillStyle = 'rgba(60, 40, 20, 0.7)';
  g.fillRect(34, 14, 60, 9);
  for (let i = 0; i < 9; i++) g.fillRect(14, 36 + i * 12, 100 - ((i * 37) % 30), 4);
  g.fillStyle = '#8a2a1e';
  g.beginPath();
  g.arc(98, 142, 9, 0, Math.PI * 2);
  g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Readables {
  group = new THREE.Group();
  private items: Placed[] = [];
  private time = 0;

  constructor(defs: Readable[], private col: WorldCollision, private kroniek: Kroniek) {
    const wood = new THREE.MeshStandardMaterial({ color: '#4a3220', roughness: 0.85 });
    const stone = new THREE.MeshStandardMaterial({ color: '#8a8478', roughness: 0.9 });
    const iron = new THREE.MeshStandardMaterial({ color: '#2e2c2c', roughness: 0.55, metalness: 0.7 });
    const paper = new THREE.MeshStandardMaterial({ map: paperTexture(), roughness: 0.9 });
    const markMat = new THREE.SpriteMaterial({ map: scrollTexture(), depthWrite: false, transparent: true });
    const glintMat = new THREE.MeshBasicMaterial({ color: '#ffd780', transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending });
    const glintGeo = new THREE.CylinderGeometry(0.12, 0.4, 9, 8, 1, true).translate(0, 4.5, 0);
    const box = (w: number, h: number, d: number, m: THREE.Material, x = 0, y = 0, z = 0) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z);
      b.castShadow = true;
      b.receiveShadow = true;
      return b;
    };
    for (const def of defs) {
      const [x, z] = this.open(def.at[0], def.at[1]);
      const g = new THREE.Group();
      let top = 2.6;
      if (def.kind === 'stone') {
        g.add(box(0.9, 1.25, 0.3, stone, 0, 0.62, 0), box(1.1, 0.2, 0.5, stone, 0, 0.1, 0), box(0.62, 0.7, 0.02, paper, 0, 0.78, 0.16));
        top = 2.0;
      } else if (def.kind === 'pillory') {
        g.add(box(1.8, 0.35, 1.8, stone, 0, 0.17, 0), box(0.28, 2.6, 0.28, wood, 0, 1.6, 0), box(1.3, 0.3, 0.12, wood, 0, 2.05, 0), box(0.4, 0.5, 0.02, paper, 0, 2.6, 0.15));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 6, 12), iron);
        ring.position.set(0.5, 1.9, 0.08);
        const ring2 = ring.clone();
        ring2.position.x = -0.5;
        g.add(ring, ring2);
        top = 3.4;
      } else if (def.kind === 'cannon') {
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 3.4, 14), iron);
        barrel.rotation.z = Math.PI / 2 - 0.12;
        barrel.position.set(0, 0.95, 0);
        barrel.castShadow = true;
        g.add(barrel, box(2.6, 0.4, 1.0, wood, 0, 0.3, 0), box(0.3, 0.9, 0.9, wood, -0.9, 0.5, 0), box(0.3, 0.7, 0.9, wood, 0.9, 0.45, 0));
        for (let i = 0; i < 4; i++) {
          const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.5 - i * 0.02, 0.04, 6, 16), iron);
          hoop.rotation.y = Math.PI / 2;
          hoop.rotation.z = -0.12;
          hoop.position.set(-1.2 + i * 0.8, 0.95 + (i - 1.5) * 0.1, 0);
          g.add(hoop);
        }
        top = 2.6;
      } else {
        g.add(box(0.14, 2.1, 0.14, wood, 0, 1.05, 0), box(0.95, 0.85, 0.08, wood, 0, 1.75, 0.06), box(0.62, 0.72, 0.02, paper, 0, 1.75, 0.11), box(1.1, 0.1, 0.3, wood, 0, 2.22, 0.06));
      }
      // face the open side (away from the nearest wall)
      let best = 0, bestH = Infinity;
      for (let a = 0; a < 8; a++) {
        const yaw = (a / 8) * Math.PI * 2;
        const h = this.col.heightAround(x + Math.sin(yaw) * 2.2, z + Math.cos(yaw) * 2.2, 0.8);
        if (h < bestH) { bestH = h; best = yaw; }
      }
      g.rotation.y = best;
      g.position.set(x, 0, z);
      const mark = new THREE.Sprite(markMat.clone());
      mark.position.set(x, top, z);
      mark.scale.setScalar(0.6);
      mark.renderOrder = 19;
      const glint = new THREE.Mesh(glintGeo, glintMat);
      glint.position.set(x, 0, z);
      this.group.add(g, mark, glint);
      this.items.push({ def, x, z, mark, glint });
    }
  }

  private open(x: number, z: number): [number, number] {
    for (let r = 0; r < 40; r += 1.5)
      for (let a = 0; a < Math.PI * 2; a += 0.4) {
        const tx = x + Math.cos(a) * r, tz = z + Math.sin(a) * r;
        if (this.col.heightAround(tx, tz, 1.4) < 0.05) return [tx, tz];
      }
    return [x, z];
  }

  /** The readable within reach, if any. */
  nearest(x: number, z: number, reach = 2.8) {
    let best: Placed | null = null, bd = reach * reach;
    for (const it of this.items) {
      const d = (it.x - x) ** 2 + (it.z - z) ** 2;
      if (d < bd) { bd = d; best = it; }
    }
    return best ? { def: best.def, read: this.kroniek.has(best.def.entry) } : null;
  }

  /** The marks over unread things (hidden when the view is painted). */
  signs(): THREE.Object3D[] {
    return this.items.flatMap((it) => [it.mark, it.glint]);
  }

  /** Unread ones, for the map. */
  unread() {
    return this.items.filter((it) => !this.kroniek.has(it.def.entry)).map((it) => ({ x: it.x, z: it.z }));
  }

  update(dt: number, px: number, pz: number) {
    this.time += dt;
    for (const it of this.items) {
      const unread = !this.kroniek.has(it.def.entry);
      it.mark.visible = it.glint.visible = unread;
      if (!unread) continue;
      const d = Math.hypot(it.x - px, it.z - pz);
      const sc = Math.min(6, Math.max(0.55, d * 0.018));
      it.mark.scale.setScalar(sc);
      it.mark.position.y = (it.def.kind === 'stone' ? 1.8 : it.def.kind === 'pillory' ? 3.2 : 2.6) + sc * 0.4 + Math.sin(this.time * 2.2 + it.x) * 0.05;
      (it.mark.material as THREE.SpriteMaterial).opacity = d > 260 ? 0 : d > 200 ? (260 - d) / 60 : 1;
    }
  }
}

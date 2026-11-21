// Merchants, guides and gatekeepers: people built from the townsfolk kit who
// stand at their stall or door. Beyond 90 m they are hidden and not animated
// (each is several skinned meshes). Over their heads: a small sign of their
// trade, or the gold "?" when a job needs them.

import * as THREE from 'three';
import type { TownsfolkKit } from '../rpg/townsfolk';
import type { ServiceDef } from './types';

const HIDE = 90;

export interface Person {
  def: { id: string; glyph: string };
  root: THREE.Object3D;
  mixer: THREE.AnimationMixer | null;
  idle: THREE.AnimationAction | null;
  talk: THREE.AnimationAction | null;
  sign: THREE.Sprite;
  x: number;
  z: number;
  yaw: number;
  top: number;
  lod: number;
  /** what the sign shows now: the trade glyph, '?' or '!' */
  shown: string;
}

const texCache = new Map<string, THREE.CanvasTexture>();

/** A round medallion with a glyph (trade), or a bare gold mark ('!' and '?'). */
export function glyphTexture(glyph: string) {
  let t = texCache.get(glyph);
  if (t) return t;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (glyph === '!' || glyph === '?') {
    g.font = 'bold 104px Cinzel, Georgia, serif';
    g.lineWidth = 10;
    g.strokeStyle = 'rgba(30, 18, 6, 0.9)';
    g.strokeText(glyph, 64, 70);
    g.fillStyle = '#f2c35a';
    g.fillText(glyph, 64, 70);
  } else {
    g.beginPath();
    g.arc(64, 64, 50, 0, Math.PI * 2);
    g.fillStyle = 'rgba(28, 20, 12, 0.88)';
    g.fill();
    g.lineWidth = 6;
    g.strokeStyle = '#d6ad57';
    g.stroke();
    g.font = '62px "DejaVu Sans", "Segoe UI Symbol", "Apple Symbols", sans-serif';
    g.fillStyle = '#f3ead6';
    g.fillText(glyph, 64, 68);
  }
  t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(glyph, t);
  return t;
}

function seedOf(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

export class People {
  group = new THREE.Group();
  list: Person[] = [];
  private time = 0;

  constructor(private kit: TownsfolkKit | null) {}

  /** Put someone at (x, z) facing yaw. */
  add(def: Pick<ServiceDef, 'id' | 'glyph' | 'look'>, x: number, y: number, z: number, yaw: number): Person {
    const root = new THREE.Group();
    let mixer: THREE.AnimationMixer | null = null, idle: THREE.AnimationAction | null = null, talk: THREE.AnimationAction | null = null;
    let top = 2.3;
    const folk = this.kit?.buildSpec({ ...def.look, seed: seedOf(def.id) }) ?? null;
    if (folk) {
      folk.root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        m.castShadow = true;
        m.receiveShadow = true;
      });
      root.add(folk.root);
      top = 1.72 * folk.height + 0.55;
      mixer = new THREE.AnimationMixer(folk.root);
      idle = mixer.clipAction(folk.clips.idle);
      idle.play();
      idle.time = Math.random() * folk.clips.idle.duration;
      if (folk.clips.talk) {
        talk = mixer.clipAction(folk.clips.talk);
        talk.play();
        talk.weight = 0;
      }
    } else {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.1, 4, 8), new THREE.MeshStandardMaterial({ color: '#6a4a34' }));
      body.position.y = 0.9;
      root.add(body);
    }
    root.position.set(x, y, z);
    root.rotation.y = yaw;
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: glyphTexture(def.glyph), depthWrite: false, transparent: true }));
    sign.renderOrder = 20;
    sign.position.set(x, y + top, z);
    sign.scale.setScalar(0.6);
    this.group.add(root, sign);
    const p: Person = { def: { id: def.id, glyph: def.glyph }, root, mixer, idle, talk, sign, x, z, yaw, top: y + top, lod: this.list.length, shown: def.glyph };
    this.list.push(p);
    return p;
  }

  /** A sign alone (the notice board). */
  addSign(id: string, glyph: string, x: number, y: number, z: number): Person {
    const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: glyphTexture(glyph), depthWrite: false, transparent: true }));
    sign.renderOrder = 20;
    sign.position.set(x, y, z);
    this.group.add(sign);
    const p: Person = { def: { id, glyph }, root: sign, mixer: null, idle: null, talk: null, sign, x, z, yaw: 0, top: y, lod: 0, shown: glyph };
    this.list.push(p);
    return p;
  }

  /**
   * Animate who is near, hide who is far, turn to face the player, and set each sign:
   * mark(id) returns '?' or '!' when a job or quest needs them, else null.
   */
  update(dt: number, px: number, pz: number, talkingTo: string | null, mark: (id: string) => string | null) {
    this.time += dt;
    for (const p of this.list) {
      const d = Math.hypot(p.x - px, p.z - pz);
      const want = mark(p.def.id) ?? p.def.glyph;
      if (!want) p.sign.visible = false; // no trade sign (a market-day seller)
      if (want !== p.shown) {
        p.shown = want;
        (p.sign.material as THREE.SpriteMaterial).map = glyphTexture(want);
      }
      const job = want === '?' || want === '!';
      // the trade sign shows within 70 m; a job mark is seen from further, like a quest giver's
      const show = !!want && d < (job ? 600 : 70);
      p.sign.visible = show;
      if (show) {
        const sc = job ? Math.min(12, Math.max(0.75, d * 0.024)) : Math.min(1.6, Math.max(0.5, d * 0.02));
        p.sign.scale.setScalar(sc);
        p.sign.position.y = p.top + (job ? sc * 0.45 - 0.15 : sc * 0.4) + Math.sin(this.time * 2.2 + p.x) * 0.05;
        (p.sign.material as THREE.SpriteMaterial).depthTest = d < 40;
        (p.sign.material as THREE.SpriteMaterial).opacity = job ? 1 : d > 55 ? (70 - d) / 15 : 1;
      }
      if (!p.mixer) continue;
      const near = d < HIDE;
      p.root.visible = near;
      if (!near) continue;
      const talking = talkingTo === p.def.id;
      if (p.talk && p.idle) {
        p.talk.weight += ((talking ? 1 : 0) - p.talk.weight) * Math.min(1, dt * 4);
        p.idle.weight = 1 - p.talk.weight;
      }
      p.lod++;
      const every = d < 40 || talking ? 1 : 2;
      if (p.lod % every === 0) p.mixer.update(dt * every);
      const yaw = d < 6 || talking ? Math.atan2(px - p.x, pz - p.z) : p.yaw;
      const dy = Math.atan2(Math.sin(yaw - p.root.rotation.y), Math.cos(yaw - p.root.rotation.y));
      p.root.rotation.y += dy * Math.min(1, dt * 4);
    }
  }

  /** Signs and marks, hidden when the view is painted. */
  signs() {
    return this.list.map((p) => p.sign);
  }
}

// The end of chapter 1, at the tower of Sint-Sulpitius: the bells ring over
// Diest, the dragon's eyes fall shut at every stroke and stay shut a little
// longer each time, and the town settles for the night. Three camera beats for
// the cinematic player (src/story/cine.ts); the words are in
// src/content/diest_end.ts. Played once, after Pieter has the clappers back
// (src/main.ts), then the chapter card.

import * as THREE from 'three';
import type { Film, Shot, V3 } from './cine';
import type { Dragon } from '../player/dragon';
import { END_LINES } from '../content/diest_end';

export interface ChapterEndContext {
  dragon: Dragon;
  /** where the dragon stands for the second shot (open ground on the market), facing the tower */
  at: { x: number; y: number; z: number; yaw: number };
  /** the sky the film plays in (the game's own, so the cut back is clean) */
  sky: 'golden' | 'day' | 'night' | 'storm';
}

/** the top of the tower of Sint-Sulpitius (the quest's own point, main_bells 'tower') */
const TOWER: V3 = [-26, 38, 30];

export function makeChapterEnd(c: ChapterEndContext): Film {
  const d = c.dragon;
  const { x, y, z, yaw } = c.at;
  // where his head is when he stands there (the camera of the second shot looks at it)
  const head = headAt(d, c.at);
  const fx = Math.sin(yaw), fz = Math.cos(yaw);
  // beside the head, a little in front and lower, looking up past it at the tower
  const side = (k: number): V3 => [head.x + fz * k + fx * 3.2, head.y - 0.4, head.z - fx * k + fz * 3.2];

  const lines: Film['lines'] = {};
  for (const [id, text] of Object.entries(END_LINES)) lines[id] = { id, who: '', text };

  const shots: Shot[] = [
    {
      name: 'ch1-toren', sky: c.sky, lines: ['ch1_end_1'], lead: 1.0, min: 7.5,
      env: { exposure: 1.02 },
      focus: [-20, 40],
      // up the tower, past the belfry, while the first strokes roll over the market
      cam: { path: [[-82, 14, 108], [-68, 26, 92], [-58, 38, 80]], look: [[-30, 22, 40], [-27, 30, 37], [TOWER[0], TOWER[1], TOWER[2]]], fov: [46, 40], ease: 'inout' },
      crowd: true,
      cues: [
        [0, (s) => s.sound.bed('drone', 0.25, 3)],
        [0.6, (s) => s.sound.bell(147, 0.5)],
        [2.8, (s) => s.sound.bell(147, 0.48)],
        [5.0, (s) => s.sound.bell(131, 0.5)],
      ],
    },
    {
      name: 'ch1-ogen', sky: c.sky, lines: ['ch1_end_2'], into: 'black', blend: 0.9, lead: 1.2, min: 10, tail: 1.2,
      env: { exposure: 0.98 },
      focus: [x, z],
      // close on his head: at every stroke the eyes go dark and the head sinks; each time he is slower to come back
      cam: { path: [side(2.6), side(1.8)], look: [[head.x, head.y + 0.1, head.z], [head.x + fx * 0.6, head.y + 0.4, head.z + fz * 0.6]], fov: [34, 30], ease: 'slowout', drift: 0.06 },
      cast: (s) => {
        s.borrow(d.root);
        const f = s.thing(d.root, x, z, yaw);
        f.root.userData.y = y;
        d.snapFold(1);
        const eyes = eyeMaterials(d.root);
        const neck = ['neck3', 'neck4', 'neck5', 'head'].map((n) => d.root.getObjectByName(n)).filter((o): o is THREE.Object3D => !!o);
        // shut: 1 = eyes closed and head down; it falls at once at a stroke and lifts slowly, slower each time
        let shut = 0, back = 1.2, t = 0;
        const STROKES = [0.9, 3.2, 5.5, 7.8];
        let next = 0;
        s.every((dt) => {
          t += dt;
          if (next < STROKES.length && t >= STROKES[next]) {
            s.sound.bell(next === STROKES.length - 1 ? 131 : 147, 0.5);
            shut = 1;
            back = 1.2 + next * 0.9;
            next++;
          } else shut = Math.max(next === STROKES.length && t > STROKES[next - 1] + 1.6 ? 0.55 : 0, shut - dt / back);
          d.update(dt, { speed: 0, climb: 0, thrust: 0, turnRate: 0, grounded: 1, boosting: false });
          for (const [i, o] of neck.entries()) o.rotation.x += shut * (0.05 + i * 0.03);
          for (const e of eyes) {
            e.mat.emissiveIntensity = e.glow * (1 - shut * 0.95);
            e.mat.color.copy(e.color).multiplyScalar(1 - shut * 0.8);
          }
        });
        s.onClear(() => {
          for (const e of eyes) {
            e.mat.emissiveIntensity = e.glow;
            e.mat.color.copy(e.color);
          }
          delete d.root.userData.y;
        });
      },
    },
    {
      name: 'ch1-stad', sky: c.sky, lines: ['ch1_end_3'], into: 'cross', blend: 1.8, lead: 1.0, min: 7.5, tail: 1.4,
      env: { exposure: 0.92, night: 0.35 },
      focus: [10, 40],
      // high over the roofs, the tower in the middle, the town going quiet
      cam: { path: [[150, 95, 210], [118, 104, 172]], look: [[-10, 18, 40], [-22, 22, 34]], fov: [44, 42], ease: 'linear', drift: 0.1 },
      cues: [
        [0.5, (s) => s.sound.bellFar(147, 0.36)],
        [3.2, (s) => s.sound.bellFar(147, 0.3)],
        [-1.6, (s) => s.sound.bed('drone', 0, 2)],
      ],
    },
  ];
  return { id: 'ch1_end', shots, lines };
}

/** The dragon's head, as it would stand at `at` (a dry run of the pose; the model is put back). */
function headAt(d: Dragon, at: ChapterEndContext['at']): THREE.Vector3 {
  const r = d.root;
  const pos = r.position.clone(), quat = r.quaternion.clone();
  r.position.set(at.x, at.y, at.z);
  r.rotation.set(0, at.yaw, 0);
  r.updateMatrixWorld(true);
  const h = r.getObjectByName('head');
  const out = h ? h.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(at.x + Math.sin(at.yaw) * 4, at.y + 3.2, at.z + Math.cos(at.yaw) * 4);
  // standing folded the head is held up a little higher than in the flying rest pose
  if (out.y < at.y + 1.5) out.y = at.y + 3;
  r.position.copy(pos);
  r.quaternion.copy(quat);
  r.updateMatrixWorld(true);
  return out;
}

/** The glowing eye materials of the dragon model (scales.ts names them), with what they were. */
function eyeMaterials(root: THREE.Object3D) {
  const out: { mat: THREE.MeshStandardMaterial; glow: number; color: THREE.Color }[] = [];
  const seen = new Set<THREE.Material>();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      const sm = mat as THREE.MeshStandardMaterial;
      if (seen.has(mat) || !sm.isMeshStandardMaterial || !/eye/i.test(mat.name)) continue;
      seen.add(mat);
      out.push({ mat: sm, glow: sm.emissiveIntensity, color: sm.color.clone() });
    }
  });
  return out;
}

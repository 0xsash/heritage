// Stopgap townsfolk variety, until the modular character kit lands
// (tools/blender/make_townsfolk.py). Each walker gets a role, and the role
// decides build, skin tone, headwear, skirt or habit, props, gait and what
// they say. Pieces are simple shapes attached to the shared skeleton's bones,
// authored in model space (Y up, Z forward) and corrected for each bone's
// rest orientation, so they sit right whatever the rig's bone axes are.
//
// The rider model has one (bearded, male) head; women's costumes use the
// period's chin-bands and wimples, which also keep that beard out of sight.

import * as THREE from 'three';

export type Role =
  | 'peasant' | 'peasantWoman' | 'burgher' | 'huik' | 'beguine' | 'soldier' | 'friar' | 'pilgrim' | 'child' | 'oldMan' | 'oldWoman';

interface RoleDef {
  weight: number;
  /** [min, max] height scale */
  h: [number, number];
  /** width scale range */
  w: [number, number];
  cloak: string[] | null; // null hides the rider's cloak
  speed: [number, number];
  bend?: number;
}

export const ROLES: Record<Role, RoleDef> = {
  peasant: { weight: 6, h: [0.94, 1.02], w: [0.98, 1.14], cloak: ['#6b5a3a', '#5a4a30', '#4f5a3a', '#7a6a4a', '#5a3a22'], speed: [1.0, 1.35] },
  peasantWoman: { weight: 6, h: [0.9, 0.96], w: [0.92, 1.08], cloak: null, speed: [0.95, 1.25] },
  burgher: { weight: 4, h: [0.96, 1.04], w: [1.0, 1.15], cloak: ['#1e1c1e', '#2a2630', '#3a2a24'], speed: [0.9, 1.15] },
  huik: { weight: 3, h: [0.9, 0.96], w: [0.92, 1.02], cloak: null, speed: [0.85, 1.1] },
  beguine: { weight: 3, h: [0.9, 0.95], w: [0.92, 1.0], cloak: null, speed: [0.85, 1.05] },
  soldier: { weight: 3, h: [0.97, 1.05], w: [1.0, 1.1], cloak: ['#b08a52', '#9a7a4a'], speed: [1.05, 1.35] },
  friar: { weight: 2, h: [0.95, 1.02], w: [1.0, 1.12], cloak: null, speed: [0.8, 1.0] },
  pilgrim: { weight: 3, h: [0.93, 1.01], w: [0.95, 1.05], cloak: ['#6a6052', '#5a5448', '#7a6a58'], speed: [0.9, 1.1] },
  child: { weight: 4, h: [0.62, 0.74], w: [0.62, 0.74], cloak: ['#7a2e22', '#3b3f55', '#6b5a3a', '#4f5a3a'], speed: [1.2, 1.6] },
  oldMan: { weight: 2, h: [0.9, 0.96], w: [0.92, 1.02], cloak: ['#4f4a44', '#3a3a3a', '#5a4a3a'], speed: [0.6, 0.8], bend: 0.32 },
  oldWoman: { weight: 2, h: [0.86, 0.92], w: [0.9, 1.0], cloak: null, speed: [0.6, 0.8], bend: 0.36 },
};

const SKIN = ['#ffffff', '#f6ece2', '#eadbcc', '#fff2e6', '#e2cdb8', '#f0e0d0'];
const WOOL = ['#7a2e22', '#3b3f55', '#6b5a3a', '#4f5a3a', '#5e2f45', '#8a6a3a', '#3d5a5a', '#6a4a3a', '#7a6a58'];

// ------------------------------------------------------------------ shared materials
const mats = new Map<string, THREE.MeshStandardMaterial>();
const mat = (color: string, rough = 0.88, metal = 0) => {
  const k = `${color}|${rough}|${metal}`;
  if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, side: THREE.DoubleSide }));
  return mats.get(k)!;
};
const LINEN = '#ece4d4';
const FELT = '#221c18';

// ------------------------------------------------------------------ geometry (cached)
const geos = new Map<string, THREE.BufferGeometry>();
const geo = (k: string, make: () => THREE.BufferGeometry) => {
  if (!geos.has(k)) geos.set(k, make());
  return geos.get(k)!;
};

function mesh(g: THREE.BufferGeometry, m: THREE.Material, pos: [number, number, number] = [0, 0, 0], rot: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) {
  const o = new THREE.Mesh(g, m);
  o.position.set(...pos);
  o.rotation.set(...rot);
  o.scale.set(...scale);
  o.castShadow = false;
  return o;
}

/** A piece authored in model space, hung on `bone` with its rest orientation undone. */
function attach(bone: THREE.Object3D, piece: THREE.Object3D, rootInv: THREE.Matrix4) {
  const m = new THREE.Matrix4().multiplyMatrices(rootInv, bone.matrixWorld);
  const pos = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  m.decompose(pos, q, s);
  const holder = new THREE.Group();
  holder.quaternion.copy(q).invert();
  holder.scale.set(1 / s.x, 1 / s.y, 1 / s.z);
  holder.add(piece);
  bone.add(holder);
  return holder;
}

/** Hand pieces live in the hand's own frame: +Y runs toward the fingers (down when the arm hangs). */
function handPiece(kind: 'staff' | 'basket' | 'lantern' | 'stick' | 'gourdStaff') {
  const g = new THREE.Group();
  const wood = mat('#5a3e26', 0.8);
  if (kind === 'staff' || kind === 'gourdStaff' || kind === 'stick') {
    const len = kind === 'stick' ? 0.95 : 1.55;
    const s = mesh(geo(`staff${len}`, () => new THREE.CylinderGeometry(0.016, 0.02, len, 6)), wood, [0, len / 2 - (kind === 'stick' ? 0.05 : 0.6), 0]);
    g.add(s);
    if (kind === 'gourdStaff') g.add(mesh(geo('gourd', () => new THREE.SphereGeometry(0.05, 8, 6)), mat('#b08a4a', 0.6), [0.04, -0.52, 0], [0, 0, 0], [1, 1.3, 1]));
  } else if (kind === 'basket') {
    g.add(mesh(geo('handle', () => new THREE.TorusGeometry(0.11, 0.008, 4, 12, Math.PI)), mat('#7a5a32'), [0, 0.12, 0], [0, Math.PI / 2, Math.PI]));
    g.add(mesh(geo('basket', () => new THREE.CylinderGeometry(0.15, 0.11, 0.14, 10, 1, false)), mat('#9a7442', 0.95), [0, 0.2, 0]));
    g.add(mesh(geo('bread', () => new THREE.SphereGeometry(0.06, 8, 6)), mat('#b8823e', 0.7), [0.04, 0.13, 0.02], [0, 0, 0], [1.4, 0.7, 1]));
  } else {
    g.add(mesh(geo('lanternBox', () => new THREE.BoxGeometry(0.1, 0.15, 0.1)), mat('#3a3330', 0.5, 0.6), [0, 0.2, 0]));
    const flame = new THREE.Mesh(geo('flame', () => new THREE.SphereGeometry(0.03, 6, 4)), new THREE.MeshBasicMaterial({ color: '#ffcf70' }));
    flame.position.set(0, 0.2, 0);
    g.add(flame);
  }
  return g;
}

export interface Dressed {
  role: Role;
  speed: number;
  /** after the mixer updates: add the stoop */
  pose(): void;
  /** what this person says */
  lines: string[];
}

const pick = <T,>(a: readonly T[], r: () => number) => a[Math.floor(r() * a.length)];
const range = ([a, b]: [number, number], r: () => number) => a + (b - a) * r();

export function pickRole(r: () => number): Role {
  const all = Object.entries(ROLES) as [Role, RoleDef][];
  const total = all.reduce((s, [, d]) => s + d.weight, 0);
  let x = r() * total;
  for (const [k, d] of all) {
    x -= d.weight;
    if (x <= 0) return k;
  }
  return 'peasant';
}

/**
 * Dress a fresh (unscaled, rest-pose) clone of the rider model as `role`.
 * Returns the cloak colour to use (or null to hide the cloak), the body tint
 * and how to pose them.
 */
export function dress(root: THREE.Object3D, role: Role, r: () => number): Dressed & { cloak: string | null; tint: string; scale: THREE.Vector3 } {
  const d = ROLES[role];
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const bone = (n: string) => root.getObjectByName(n);
  const head = bone('head'), neck = bone('neck_01'), chest = bone('spine_03'), pelvis = bone('pelvis');
  const handR = bone('hand_r'), handL = bone('hand_l');

  // where the head is, in model space, and how tall the body is
  const headPos = new THREE.Vector3();
  head?.getWorldPosition(headPos).applyMatrix4(rootInv);
  const pelvisPos = new THREE.Vector3();
  pelvis?.getWorldPosition(pelvisPos).applyMatrix4(rootInv);
  const top = headPos.y + 0.24; // crown of the head
  const hy = top - headPos.y; // head bone → crown
  const at = (b: THREE.Object3D | undefined, piece: THREE.Object3D, worldY: number, z = 0) => {
    if (!b) return;
    const p = new THREE.Vector3();
    b.getWorldPosition(p).applyMatrix4(rootInv);
    piece.position.y += worldY - p.y;
    piece.position.z += z;
    attach(b, piece, rootInv);
  };

  const wool = pick(WOOL, r);

  // ---------------------------------------------------------------- headwear
  const H = new THREE.Group(); // on the head, y=0 at the head bone
  const brimHat = (color: string, shell = false) => {
    H.add(mesh(geo('brim', () => new THREE.CylinderGeometry(0.27, 0.27, 0.014, 20)), mat(color), [0, hy - 0.05, 0.01], [-0.06, 0, 0]));
    H.add(mesh(geo('crown', () => new THREE.CylinderGeometry(0.105, 0.125, 0.15, 14)), mat(color), [0, hy + 0.025, 0.0], [-0.06, 0, 0]));
    H.add(mesh(geo('band', () => new THREE.CylinderGeometry(0.127, 0.127, 0.025, 14, 1, true)), mat('#3a2a1a'), [0, hy - 0.03, 0.0], [-0.06, 0, 0]));
    if (shell) H.add(mesh(geo('shell', () => new THREE.SphereGeometry(0.035, 8, 6)), mat('#f2e8d8', 0.5), [0, hy - 0.01, 0.125], [0, 0, 0], [1, 0.9, 0.35]));
  };
  const coif = (chin: boolean, color = LINEN) => {
    H.add(mesh(geo('coif', () => new THREE.SphereGeometry(0.128, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62)), mat(color, 0.95), [0, hy - 0.115, -0.015], [-0.25, 0, 0], [1.04, 1.05, 1.12]));
    if (chin) H.add(mesh(geo('chin', () => new THREE.TorusGeometry(0.105, 0.03, 6, 18)), mat(color, 0.95), [0, hy - 0.13, 0.045], [0, 0, 0], [0.95, 1.2, 1]));
  };
  switch (role) {
    case 'peasant':
      if (r() < 0.7) H.add(mesh(geo('cap', () => new THREE.SphereGeometry(0.135, 12, 8)), mat(pick(['#4a3a2a', '#5a4a30', '#3a3a3a', '#6a2a22'], r)), [0, hy - 0.04, -0.01], [-0.2, 0, 0.12], [1, 0.42, 1.08]));
      break;
    case 'burgher':
      brimHat(FELT);
      break;
    case 'pilgrim':
      brimHat('#4a3e30', true);
      break;
    case 'soldier':
      H.add(mesh(geo('morion', () => new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mat('#8a8c90', 0.35, 0.85), [0, hy - 0.08, 0], [0, 0, 0], [1, 1.05, 1.15]));
      H.add(mesh(geo('morionBrim', () => new THREE.TorusGeometry(0.16, 0.022, 4, 20)), mat('#8a8c90', 0.35, 0.85), [0, hy - 0.08, 0], [Math.PI / 2, 0, 0], [0.95, 1.25, 1]));
      H.add(mesh(geo('comb', () => new THREE.CylinderGeometry(0.1, 0.1, 0.012, 16, 1, false, 0, Math.PI)), mat('#8a8c90', 0.35, 0.85), [0, hy + 0.02, 0], [0, Math.PI / 2, Math.PI / 2], [1, 1, 1]));
      break;
    case 'friar':
      H.add(mesh(geo('cowl', () => new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.7)), mat('#5a3e26', 0.95), [0, hy - 0.13, -0.05], [-0.5, 0, 0], [1, 1.1, 1.15]));
      break;
    case 'peasantWoman':
    case 'oldWoman':
      coif(true, role === 'oldWoman' ? '#d8d0c4' : LINEN);
      break;
    case 'beguine':
      coif(true);
      H.add(mesh(geo('veil', () => new THREE.CylinderGeometry(0.15, 0.27, 0.5, 14, 1, true, Math.PI * 0.6, Math.PI * 1.8)), mat('#1a1818', 0.95), [0, hy - 0.3, -0.03], [0.12, 0, 0]));
      break;
    case 'huik':
      H.add(mesh(geo('huikHood', () => new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.68)), mat('#141214', 0.95), [0, hy - 0.11, -0.04], [-0.3, 0, 0], [1.05, 1.12, 1.18]));
      H.add(mesh(geo('huikTop', () => new THREE.ConeGeometry(0.035, 0.12, 8)), mat('#141214', 0.95), [0, hy + 0.07, -0.02]));
      coif(true);
      break;
    case 'child':
      if (r() < 0.5) coif(false, r() < 0.5 ? LINEN : '#c8b898');
      else H.add(mesh(geo('cap', () => new THREE.SphereGeometry(0.135, 12, 8)), mat(pick(WOOL, r)), [0, hy - 0.04, -0.01], [-0.2, 0, 0], [1, 0.42, 1.08]));
      break;
    case 'oldMan':
      if (r() < 0.6) H.add(mesh(geo('cap', () => new THREE.SphereGeometry(0.135, 12, 8)), mat('#3a3330'), [0, hy - 0.04, -0.01], [-0.2, 0, 0], [1, 0.42, 1.08]));
      break;
  }
  if (H.children.length) at(head, H, headPos.y);

  // ---------------------------------------------------------------- body pieces
  const groundToWaist = pelvisPos.y + 0.08;
  const skirt = (color: string, len = groundToWaist - 0.04, rTop = 0.19, rBot = 0.36) => {
    const s = mesh(geo(`skirt${len.toFixed(2)}${rBot}`, () => new THREE.CylinderGeometry(rTop, rBot, len, 18, 1, true).translate(0, -len / 2, 0)), mat(color, 0.92), [0, 0, 0]);
    const w = new THREE.Group();
    w.add(s);
    at(pelvis, w, groundToWaist);
    return w;
  };
  const apron = (color = LINEN) => {
    const len = groundToWaist * 0.72;
    const a = mesh(geo(`apron${len.toFixed(2)}`, () => new THREE.PlaneGeometry(0.34, len).translate(0, -len / 2, 0)), mat(color, 0.95), [0, 0, 0.215], [-0.13, 0, 0]);
    const w = new THREE.Group();
    w.add(a);
    at(pelvis, w, groundToWaist - 0.02);
  };
  const shoulderY = headPos.y - 0.12;
  switch (role) {
    case 'peasantWoman':
      skirt(wool);
      if (r() < 0.75) apron(r() < 0.5 ? LINEN : '#c8b898');
      break;
    case 'oldWoman':
      skirt(pick(['#3a3330', '#4a3a30', '#2a2a2e'], r));
      apron('#bcb0a0');
      break;
    case 'beguine':
      skirt('#1a1818', groundToWaist - 0.02, 0.2, 0.38);
      break;
    case 'huik': {
      skirt(pick(['#2a2026', '#3a2a24', '#22262e'], r));
      // the mantle: from the shoulders to below the knee, open at the front
      const len = shoulderY - 0.42;
      const m = mesh(geo(`huik${len.toFixed(2)}`, () => new THREE.CylinderGeometry(0.2, 0.46, len, 20, 1, true, Math.PI * 0.2, Math.PI * 1.6).translate(0, -len / 2, 0)), mat('#141214', 0.95), [0, 0, -0.02]);
      const w = new THREE.Group();
      w.add(m);
      at(chest, w, shoulderY);
      break;
    }
    case 'friar': {
      const len = shoulderY - 0.03;
      const m = mesh(geo(`habit${len.toFixed(2)}`, () => new THREE.CylinderGeometry(0.21, 0.37, len, 18, 1, true).translate(0, -len / 2, 0)), mat('#5a3e26', 0.95), [0, 0, -0.01]);
      const w = new THREE.Group();
      w.add(m);
      at(chest, w, shoulderY);
      const rope = new THREE.Group();
      rope.add(mesh(geo('rope', () => new THREE.TorusGeometry(0.2, 0.014, 5, 20)), mat('#d8c8a0'), [0, 0, 0], [Math.PI / 2, 0, 0]));
      at(pelvis, rope, groundToWaist);
      break;
    }
    case 'burgher': {
      // the white falling band collar
      const c = new THREE.Group();
      c.add(mesh(geo('collar', () => new THREE.CylinderGeometry(0.085, 0.19, 0.06, 18, 1, true)), mat('#f4f0e8', 0.8), [0, 0, 0.01]));
      at(neck, c, headPos.y - 0.07);
      break;
    }
    case 'soldier': {
      const s = new THREE.Group();
      s.add(mesh(geo('sash', () => new THREE.TorusGeometry(0.2, 0.03, 5, 22)), mat('#b0261c', 0.8), [0, 0, 0], [Math.PI / 2, 0.55, 0], [1, 1.25, 1]));
      at(chest, s, headPos.y - 0.36);
      break;
    }
    case 'pilgrim': {
      const p = new THREE.Group();
      p.add(mesh(geo('pelerine', () => new THREE.CylinderGeometry(0.15, 0.33, 0.3, 18, 1, true).translate(0, -0.15, 0)), mat('#6a6052', 0.95), [0, 0, -0.01]));
      at(chest, p, shoulderY + 0.06);
      break;
    }
  }

  // ---------------------------------------------------------------- props
  const prop = (b: THREE.Object3D | undefined, kind: Parameters<typeof handPiece>[0]) => {
    if (b) b.add(handPiece(kind));
  };
  if (role === 'pilgrim') prop(handR, 'gourdStaff');
  else if (role === 'oldMan' || role === 'oldWoman') prop(handR, 'stick');
  else if ((role === 'peasantWoman' || role === 'huik') && r() < 0.6) prop(handL, 'basket');
  else if (role === 'peasant' && r() < 0.3) prop(handL, 'basket');
  else if (role === 'beguine' && r() < 0.3) prop(handL, 'lantern');

  // ---------------------------------------------------------------- stoop
  const bends: { b: THREE.Object3D; q: THREE.Quaternion }[] = [];
  if (d.bend) {
    for (const [n, k] of [['spine_02', 0.45], ['spine_03', 0.35], ['neck_01', -0.25]] as const) {
      const b = bone(n);
      if (!b) continue;
      // a bend about the model's sideways axis, expressed in the bone's frame
      const restQ = new THREE.Quaternion();
      new THREE.Matrix4().multiplyMatrices(rootInv, b.matrixWorld).decompose(new THREE.Vector3(), restQ, new THREE.Vector3());
      const bendM = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), d.bend * k);
      bends.push({ b, q: restQ.clone().invert().multiply(bendM).multiply(restQ) });
    }
  }

  const h = range(d.h, r), w = range(d.w, r);
  return {
    role,
    speed: range(d.speed, r),
    cloak: d.cloak ? pick(d.cloak, r) : null,
    tint: pick(SKIN, r),
    scale: new THREE.Vector3(w, h, w),
    pose: () => {
      for (const { b, q } of bends) b.quaternion.multiply(q);
    },
    lines: LINES[role],
  };
}

const LINES: Record<Role, string[]> = {
  peasant: ['De haver staat goed dit jaar.', 'Weer tol betalen. Altijd tol.', 'Hebt ge mijn koe gezien? Een bruine.'],
  peasantWoman: ['Verse eieren! Wie wil er eieren?', 'Mijn man zit weer in de herberg.', 'Pas op, de kasseien zijn glad.'],
  burgher: ['Goedendag. Ik heb het druk.', 'De lakenhandel gaat slecht, slecht.', 'Een draak in de stad. Wat zal de schepenbank daarvan zeggen?'],
  huik: ['Goedendag, heer.', 'Mijn man is schepen. Ge hebt van hem gehoord.', 'Zulk een beest in de stad... schandalig.'],
  beguine: ['God zegene u.', 'Kom eens naar onze kapel.', 'Wij bidden voor de klokken.'],
  soldier: ['¡Hola! Pas op, ruiter.', 'Halt. Ah, de drakenrijder. Ga maar.', 'De soldij is drie maanden te laat. Weer.'],
  friar: ['Pax tecum.', 'Een aalmoes voor de kapucijnen?', 'Ook draken zijn schepselen van God. Denk ik.'],
  pilgrim: ['Op weg naar Scherpenheuvel.', 'Onze-Lieve-Vrouw zal mijn knie genezen.', 'Nog zeven dagen stappen.'],
  child: ['Een draak! Mag ik hem aaien?', 'Mijn vader zegt dat ge een tovenaar zijt.', 'Kunt ge vuurspuwen? Toe, één keer!'],
  oldMan: ['In mijn tijd hadden we geen draken.', 'Mijn rug, mijn rug.', 'De klokken... vroeger luidden ze altijd.'],
  oldWoman: ['Ach jongen, ge zijt veel te mager.', 'De Kludde, ik heb hem gezien, toen ik zo klein was.', 'God zegene u en uw beest.'],
};

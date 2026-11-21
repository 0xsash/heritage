// The townsfolk character kit (tools/blender/make_townsfolk.py): nine bodies
// on the hero's skeleton, each with every garment, hat, hair style and beard
// fitted to it, plus hand props and a shared clip set. A walker is assembled
// from an archetype in townsfolk.json: pick a body, one piece per slot (with a
// period dye), maybe a prop; hide the body under the clothes; play the
// archetype's gait.
//
// Data conventions (see tools/blender/TOWNSFOLK_NOTES.md):
//  - node extras (userData): {kit:'rig'|'body'|'piece'|'prop', body, piece, prop}
//  - COLOR_0.r = 1 where a garment takes its dye (texture * dye / 0.55)
//  - _REGION vertex attribute on bodies and hair: a triangle whose three
//    vertices all lie in hidden regions is dropped

import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { asset } from '../core/assets';
import { rng } from '../core/math';
import { loadModel } from '../render/models';
import { LINES, ROLES, type Role } from './folk';

export interface KitManifest {
  version: number;
  regions: Record<string, number>;
  bodies: Record<string, {
    sex: 'm' | 'f';
    age: 'child' | 'adult' | 'old';
    height: number;
    pelvisScale?: number;
    grips?: Record<string, { bone: string; pos: [number, number, number]; quat: [number, number, number, number] }>;
  }>;
  pieces: Record<string, { slot: string; layer?: number; bodies: string[]; dyeable?: boolean; hides?: string[]; requires?: string[]; excludes?: string[]; accent?: boolean }>;
  props: Record<string, { grip: string; hand: string }>;
  palette: Record<string, string>;
  clips: Record<string, { stride?: number; loop?: boolean }>;
  archetypes: KitArchetype[];
  /** face shape keys on the bodies (and on headwear that frames the face), with their safe range */
  faceMorphs?: Record<string, { min: number; max: number }>;
  /** multipliers for the skin, where the body's COLOR_0.r marks skin */
  skinTones?: [number, number, number][];
  /** what the player's hero may be made of (see src/rpg/look.ts); absent in kits made before the hero existed */
  hero?: HeroKit;
}

/** The manifest's `hero` section: bodies, hair and beards the hero may choose, and an outfit per class. */
export interface HeroKit {
  bodies?: Partial<Record<'m' | 'f', string[]>>;
  hair?: Partial<Record<'m' | 'f', (string | null)[]>>;
  beards?: (string | null)[];
  outfits?: Record<string, { wear: Record<string, string | null>; prop?: string | null }>;
  /** phase E: headwear by sex, the mantle styles, the marks (an eyepatch) */
  headwear?: Partial<Record<'m' | 'f', string[]>>;
  mantles?: string[];
  marks?: string[];
  /** the hero's travelling mantle: not part of any outfit, the game adds it (and dyes it the chosen colour) */
  mantle?: { piece: string; dyes?: string[] };
}

export interface KitArchetype {
  id: string;
  role: Role;
  weight: number;
  bodies: string[];
  slots: Record<string, { piece: string; dye?: string[] }[]>;
  optional?: Record<string, number>;
  props?: [string | null, number][];
  gait?: string;
  /** false: never picked for the street crowd (enemies) */
  crowd?: boolean;
}

/** A particular person: named characters and enemies. */
export interface FolkSpec {
  body: string;
  /** piece -> palette name or hex (null: as painted) */
  wear: Record<string, string | null>;
  prop?: string | null;
  role?: Role;
  gait?: string;
  /** fixes the face */
  seed?: number;
  /** an explicit face: morph name -> weight (missing morphs stay at 0); overrides the seed's face */
  face?: Record<string, number>;
  /** an explicit skin tone (index into the manifest's skinTones) */
  skin?: number;
  /** the accent dye (palette name or hex) for the parts of pieces that take one (COLOR_0.g: cuffs, ribbons, bands) */
  accent?: string | null;
  /** iris colour (hex); null or absent: as painted */
  eyes?: string | null;
  /** a mark drawn on the face: scar, freckles, weathered (the eyepatch is a piece) */
  mark?: string | null;
  /** overall scale (1 = the body as built); named people get 1 */
  scale?: number;
  /** more regions to hide (the hero's hair under a coif) */
  hide?: string[];
}

export interface Folk {
  root: THREE.Object3D;
  role: Role;
  archetype: string;
  body: string;
  /** clip per use: walk (the archetype's gait), idle, talk, run */
  clips: { walk: THREE.AnimationClip; idle: THREE.AnimationClip; talk?: THREE.AnimationClip; run?: THREE.AnimationClip };
  /** metres covered by one loop of the walk clip on this body (0 when unknown) */
  stride: number;
  /** height relative to the hero */
  height: number;
  speed: number;
  lines: string[];
  pieces: string[];
  /** any other clip of the kit, fitted to this body (null when the kit lacks it) */
  clip(name: string): THREE.AnimationClip | null;
}

const REF_HEIGHT = 1.7;

interface Tagged { kind: 'rig' | 'body' | 'piece' | 'prop'; body?: string; piece?: string; prop?: string }

export class TownsfolkKit {
  private templates = new Map<string, THREE.Object3D>();
  private props = new Map<string, THREE.Object3D>();
  private clipCache = new Map<string, THREE.AnimationClip>();
  private mats = new Map<string, THREE.Material>();
  private geos = new Map<string, THREE.BufferGeometry>();
  /** the kit's own material of each dyed or toned mesh, so a piece can be re-dyed on a live figure */
  private bases = new WeakMap<THREE.Object3D, THREE.MeshStandardMaterial>();
  private bodyNames: string[];

  constructor(private gltf: GLTF, readonly m: KitManifest) {
    this.bodyNames = Object.keys(m.bodies).sort((a, b) => b.length - a.length);
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);
    // GLTFLoader makes node names unique across the file, so eight of the nine
    // rigs arrive with bones like "pelvis_1". Restore the real names (kept in
    // userData.name) on bones and in the clip tracks, so one clip set drives
    // every body and hands are found by name.
    const orig = new Map<string, string>();
    scene.traverse((o) => {
      if ((o as THREE.Bone).isBone && typeof o.userData.name === 'string' && o.name !== o.userData.name) {
        orig.set(o.name, o.userData.name);
        o.name = o.userData.name;
      }
    });
    for (const c of gltf.animations)
      for (const t of c.tracks) {
        const i = t.name.lastIndexOf('.');
        const n = orig.get(t.name.slice(0, i));
        if (n) t.name = n + t.name.slice(i);
      }
    // tag every mesh with what it is (extras when present, else the sanitised node name)
    const tagged: [THREE.Object3D, Tagged][] = [];
    scene.traverse((o) => {
      const t = this.tag(o);
      if (t) tagged.push([o, t]);
    });
    // one template per body: its armature plus all of its own meshes, nothing else
    for (const body of Object.keys(m.bodies)) {
      const rig = tagged.find(([, t]) => t.kind === 'rig' && t.body === body)?.[0]
        ?? tagged.find(([, t]) => t.kind === 'body' && t.body === body)?.[0]?.parent;
      if (!rig) continue;
      const group = new THREE.Group();
      group.name = `folk.${body}`;
      const mine = tagged.filter(([o, t]) => t.body === body && t.kind !== 'rig' && !isInside(o, rig)).map(([o]) => o);
      group.attach(rig);
      // move only the outermost tagged nodes (a tagged group carries its meshes along)
      for (const o of mine) if (!mine.some((p) => p !== o && isInside(o, p))) group.attach(o);
      // drop other bodies' meshes that happen to live under this rig
      const foreign: THREE.Object3D[] = [];
      group.traverse((o) => {
        const t = o.userData.folk as Tagged | undefined;
        if (t && t.body && t.body !== body) foreign.push(o);
      });
      for (const o of foreign) o.removeFromParent();
      this.templates.set(body, group);
    }
    for (const [o, t] of tagged) {
      if (t.kind !== 'prop' || !t.prop) continue;
      o.updateMatrixWorld(true);
      const p = o.clone();
      p.position.set(0, 0, 0);
      p.quaternion.identity();
      p.scale.setScalar(1);
      this.props.set(t.prop, p);
    }
  }

  get ok() {
    return this.templates.size > 0 && this.m.archetypes.length > 0;
  }

  /** the shared clip set (all bodies), as loaded */
  get animations() {
    return this.gltf.animations;
  }

  hasBody(body: string) {
    return this.templates.has(body);
  }

  /** Does this piece exist, fitted to this body? */
  fits(piece: string, body: string) {
    return !!this.m.pieces[piece]?.bodies.includes(body);
  }

  hasClip(name: string) {
    return this.gltf.animations.some((c) => c.name === name);
  }

  /** A face as the crowd gets one: three features at the ends of their range, the rest moderate. */
  randomFace(r: () => number): Record<string, number> {
    const face: Record<string, number> = {};
    const morphs = Object.entries(this.m.faceMorphs ?? {});
    const signature = new Set<number>();
    while (morphs.length && signature.size < Math.min(3, morphs.length)) signature.add(Math.floor(r() * morphs.length));
    morphs.forEach(([name, lim], i) => {
      const mid = (lim.min + lim.max) / 2, half = (lim.max - lim.min) / 2;
      const t = signature.has(i) ? (r() < 0.5 ? -1 : 1) * (0.7 + r() * 0.3) : (r() * 2 - 1) * 0.45;
      face[name] = mid + half * t;
    });
    return face;
  }

  /** Re-dye one piece on a figure already built (the hero's cloak); `accent` too when the piece takes one. */
  redye(root: THREE.Object3D, piece: string, dye: string | null, accent: string | null = null) {
    const hex = this.dye(dye ?? undefined);
    const acc = this.dye(accent ?? undefined);
    root.traverse((o) => {
      const t = o.userData.folk as Tagged | undefined;
      const base = this.bases.get(o);
      if (t?.kind === 'piece' && t.piece === piece && base) (o as THREE.Mesh).material = this.dyed(base, hex, this.m.pieces[piece]?.accent ? acc : null);
    });
  }

  /** The hex of a palette name or hex colour (null when it is neither). */
  colour(name: string | null | undefined) {
    return this.dye(name ?? undefined);
  }

  /** Identify a kit node: from glTF extras, or by its name ("hat_wide.man" arrives as "hat_wideman"). */
  private tag(o: THREE.Object3D): Tagged | null {
    const u = o.userData;
    let t: Tagged | null = null;
    if (u.kit === 'rig' || u.kit === 'body' || u.kit === 'piece' || u.kit === 'prop') t = { kind: u.kit, body: u.body, piece: u.piece, prop: u.prop };
    else if (o.name) {
      const n = o.name.replace(/_\d+$/, '');
      if (n.startsWith('prop') && this.m.props[n.slice(4)]) t = { kind: 'prop', prop: n.slice(4) };
      else
        for (const b of this.bodyNames) {
          if (!n.endsWith(b)) continue;
          const head = n.slice(0, -b.length);
          if (head === 'rig') t = { kind: 'rig', body: b };
          else if (head === 'body') t = { kind: 'body', body: b };
          else if (this.m.pieces[head]) t = { kind: 'piece', body: b, piece: head };
          if (t) break;
        }
    }
    if (!t) return null;
    // carry the tag down to the meshes (a multi-material node is a group of meshes)
    o.traverse((c) => {
      if (!c.userData.folk) c.userData.folk = t;
    });
    return t;
  }

  private pickArchetype(r: () => number, role?: Role) {
    const pool = this.m.archetypes.filter((a) => a.crowd !== false && (!role || a.role === role) && a.bodies.some((b) => this.templates.has(b)));
    const all = pool.length ? pool : this.m.archetypes.filter((a) => a.crowd !== false);
    let x = r() * all.reduce((s, a) => s + a.weight, 0);
    for (const a of all) if ((x -= a.weight) <= 0) return a;
    return all[0];
  }

  private dye(name: string | undefined) {
    if (!name) return null;
    return this.m.palette[name] ?? (/^#[0-9a-f]{6}$/i.test(name) ? name : null);
  }

  /** Assemble one person from an archetype (random within its variants). */
  build(r: () => number, role?: Role, archetype?: string, forceProp?: string | null): Folk | null {
    if (!this.ok) return null;
    const a = (archetype && this.m.archetypes.find((x) => x.id === archetype)) || this.pickArchetype(r, role);
    const bodies = a.bodies.filter((b) => this.templates.has(b));
    const body = bodies[Math.floor(r() * bodies.length)];

    // one piece per slot
    const chosen = new Map<string, string | null>(); // piece -> dye hex
    for (const [slot, options] of Object.entries(a.slots)) {
      const p = a.optional?.[slot];
      if (p !== undefined && r() > p) continue;
      const fits = options.filter((o) => this.m.pieces[o.piece]?.bodies.includes(body));
      if (!fits.length) continue;
      const o = fits[Math.floor(r() * fits.length)];
      chosen.set(o.piece, this.dye(o.dye?.length ? o.dye[Math.floor(r() * o.dye.length)] : undefined));
    }
    const props = a.props ?? [];
    let x = r() * props.reduce((s, [, w]) => s + w, 0);
    let prop: string | null = null;
    for (const [p, w] of props) if ((x -= w) <= 0) { prop = p; break; }
    if (forceProp !== undefined) prop = forceProp;
    return this.assemble(body, chosen, prop, r, a.role, a.id, a.gait);
  }

  /** Assemble a particular person: this body, these pieces (piece -> palette name or hex), this prop. */
  buildSpec(spec: FolkSpec): Folk | null {
    if (!this.ok || !this.templates.has(spec.body)) return null;
    const chosen = new Map<string, string | null>();
    for (const [piece, dye] of Object.entries(spec.wear)) if (this.m.pieces[piece]?.bodies.includes(spec.body)) chosen.set(piece, this.dye(dye ?? undefined));
    return this.assemble(spec.body, chosen, spec.prop ?? null, rng(spec.seed ?? hashStr(spec.body + Object.keys(spec.wear).join())), spec.role ?? 'burgher', 'named', spec.gait, spec.scale ?? 1, spec);
  }

  private assemble(body: string, chosen: Map<string, string | null>, prop: string | null, r: () => number, role: Role, id: string, gait = 'walk', scale?: number, look?: Pick<FolkSpec, 'face' | 'skin' | 'accent' | 'eyes' | 'mark' | 'hide'>): Folk {
    const B = this.m.bodies[body];
    // layering rules: a collar needs its doublet, a hat excludes a hood...
    for (let pass = 0; pass < 3; pass++)
      for (const piece of [...chosen.keys()]) {
        const P = this.m.pieces[piece];
        if (P.requires?.some((q) => !chosen.has(q))) chosen.delete(piece);
        else if (P.excludes?.some((q) => chosen.has(q))) chosen.delete(piece);
      }
    const hidden = new Set<number>();
    for (const piece of chosen.keys()) for (const h of this.m.pieces[piece].hides ?? []) if (this.m.regions[h] !== undefined) hidden.add(this.m.regions[h]);
    for (const h of look?.hide ?? []) if (this.m.regions[h] !== undefined) hidden.add(this.m.regions[h]);
    const accent = this.dye(look?.accent ?? undefined);

    // the face: every person gets their own (morph weights and skin tone), when the kit has them;
    // a chosen face (the hero's) is given explicitly
    const face = new Map<string, number>();
    const lims = this.m.faceMorphs ?? {};
    if (look?.face) {
      for (const [name, lim] of Object.entries(lims)) face.set(name, Math.min(lim.max, Math.max(lim.min, look.face[name] ?? 0)));
    } else for (const [name, w] of Object.entries(this.randomFace(r))) face.set(name, w);
    const tones = this.m.skinTones ?? [];
    const tone = !tones.length ? null : look?.skin !== undefined ? tones[Math.min(tones.length - 1, Math.max(0, Math.round(look.skin)))] : tones[Math.floor(r() * tones.length)];

    const root = SkeletonUtils.clone(this.templates.get(body)!);
    const drop: THREE.Object3D[] = [];
    root.traverse((o) => {
      const t = o.userData.folk as Tagged | undefined;
      const mesh = o as THREE.SkinnedMesh;
      if (t?.kind === 'piece' && t.piece && !chosen.has(t.piece)) {
        drop.push(o);
        return;
      }
      if (!mesh.isMesh) return;
      mesh.frustumCulled = false;
      if (hidden.size) mesh.geometry = this.hide(mesh.geometry, hidden);
      if (t?.kind === 'piece' && t.piece) {
        this.bases.set(mesh, mesh.material as THREE.MeshStandardMaterial);
        mesh.material = this.dyed(mesh.material as THREE.MeshStandardMaterial, chosen.get(t.piece) ?? null, this.m.pieces[t.piece]?.accent ? accent : null);
      } else if (t?.kind === 'body' && tone && mesh.geometry.getAttribute('color')) {
        this.bases.set(mesh, mesh.material as THREE.MeshStandardMaterial);
        mesh.material = look?.eyes || look?.mark ? this.skinned(mesh, tone, look.eyes ?? null, look.mark ?? null) : this.toned(mesh.material as THREE.MeshStandardMaterial, tone);
      }
      // the same face on the body and on whatever frames it (coif, wimple, beard)
      const dict = mesh.morphTargetDictionary, inf = mesh.morphTargetInfluences;
      if (dict && inf) for (const [name, w] of face) if (dict[name] !== undefined) inf[dict[name]] = w;
    });
    for (const o of drop) o.removeFromParent();

    // a prop in hand
    if (prop && this.props.has(prop)) {
      const P = this.m.props[prop];
      const grip = B.grips?.[P.grip];
      const bone = root.getObjectByName(grip?.bone ?? P.hand);
      if (bone) {
        const mesh = this.props.get(prop)!.clone();
        if (grip) {
          mesh.position.fromArray(grip.pos);
          mesh.quaternion.fromArray(grip.quat);
        }
        mesh.name = `prop.${prop}`;
        mesh.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) m.material = this.dyed(m.material as THREE.MeshStandardMaterial, null);
        });
        bone.add(mesh);
      }
    }

    // variety on top of the nine bodies: a few percent either way
    const s = scale ?? 0.97 + r() * 0.06;
    root.scale.setScalar(s);
    const height = (B.height / REF_HEIGHT) * s;
    const walk = this.clip(gait, body) ?? this.clip('walk', body)!;
    const stride = this.m.clips[walk.name.split('@')[0]]?.stride ?? 0;
    const range = ROLES[role]?.speed ?? [1, 1.3];
    return {
      root,
      role,
      archetype: id,
      body,
      clips: { walk, idle: this.clip('idle', body) ?? walk, talk: this.clip('talk', body) ?? undefined, run: this.clip('run', body) ?? undefined },
      stride: stride * height,
      height,
      speed: range[0] + (range[1] - range[0]) * r(),
      lines: LINES[role] ?? [],
      pieces: [...chosen.keys()],
      clip: (name: string) => this.clip(name, body),
    };
  }

  /** A clip for a body: the shared clip, with the hips' travel scaled to the body's build. */
  clip(name: string, body: string) {
    const src = this.gltf.animations.find((c) => c.name === name);
    if (!src) return null;
    const k = this.m.bodies[body]?.pelvisScale ?? 1;
    if (Math.abs(k - 1) < 1e-3) return src;
    const key = `${name}@${body}`;
    let c = this.clipCache.get(key);
    if (!c) {
      c = src.clone();
      c.name = key;
      for (const t of c.tracks) {
        if (!/^(pelvis|Root)\.position$/.test(t.name)) continue;
        t.values = t.values.slice();
        for (let i = 0; i < t.values.length; i++) t.values[i] *= k;
      }
      this.clipCache.set(key, c);
    }
    return c;
  }

  /** The same mesh without the triangles that lie entirely in hidden regions. */
  private hide(g: THREE.BufferGeometry, hidden: Set<number>) {
    const reg = g.getAttribute('_region') as THREE.BufferAttribute | undefined;
    if (!reg) return g;
    const key = `${g.uuid}|${[...hidden].sort((p, q) => p - q).join(',')}`;
    let out = this.geos.get(key);
    if (out) return out;
    const n = g.index ? g.index.count : g.getAttribute('position').count;
    const idx = (i: number) => (g.index ? g.index.getX(i) : i);
    const keep: number[] = [];
    for (let i = 0; i < n; i += 3) {
      const a = idx(i), b = idx(i + 1), c = idx(i + 2);
      const gone = hidden.has(Math.round(reg.getX(a))) && hidden.has(Math.round(reg.getX(b))) && hidden.has(Math.round(reg.getX(c)));
      if (!gone) keep.push(a, b, c);
    }
    out = new THREE.BufferGeometry();
    for (const [name, attr] of Object.entries(g.attributes)) out.setAttribute(name, attr);
    out.morphAttributes = g.morphAttributes;
    out.morphTargetsRelative = g.morphTargetsRelative;
    out.setIndex(keep);
    out.boundingSphere = g.boundingSphere;
    out.boundingBox = g.boundingBox;
    this.geos.set(key, out);
    return out;
  }

  /** The skin material with a skin tone where COLOR_0.r marks skin (not eyes or lips). */
  private toned(base: THREE.MeshStandardMaterial, tone: [number, number, number]) {
    return this.masked(base, `tone${tone.join(',')}`, new THREE.Color(tone[0], tone[1], tone[2]));
  }

  /** The kit material with a dye where COLOR_0.r says so, and an accent dye where COLOR_0.g says so (null: as painted). */
  private dyed(base: THREE.MeshStandardMaterial, hex: string | null, accent: string | null = null) {
    const acc = accent ? new THREE.Color(accent).multiplyScalar(1 / 0.55) : null;
    return this.masked(base, `${hex ?? '-'}${accent ? '|' + accent : ''}`, hex ? new THREE.Color(hex).multiplyScalar(1 / 0.55) : new THREE.Color(1, 1, 1), acc);
  }

  /**
   * A chosen face (the hero's): the skin tone where COLOR_0.r marks skin, the iris tinted where COLOR_0.g marks the
   * eyeballs, and a mark on the face (scar, freckles, weathered) drawn from the rest pose, so it stays put in motion.
   */
  private skinned(mesh: THREE.Mesh, tone: [number, number, number], eyes: string | null, mark: string | null) {
    const base = this.bases.get(mesh) ?? (mesh.material as THREE.MeshStandardMaterial);
    const g = mesh.geometry;
    // the face's box in the rest pose (region 1 = face): where the marks go
    const reg = g.getAttribute('_region') as THREE.BufferAttribute | undefined;
    const pos = g.getAttribute('position') as THREE.BufferAttribute;
    const lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    const v = new THREE.Vector3();
    const face = this.m.regions.face ?? 1;
    for (let i = 0; i < pos.count; i++) {
      if (reg && Math.round(reg.getX(i)) !== face) continue;
      v.fromBufferAttribute(pos, i);
      lo.min(v);
      hi.max(v);
    }
    const centre = lo.clone().add(hi).multiplyScalar(0.5);
    const size = hi.clone().sub(lo);
    const key = `${base.uuid}|skin|${tone.join(',')}|${eyes ?? '-'}|${mark ?? '-'}|${centre.toArray().map((x) => x.toFixed(3)).join(',')}`;
    const had = this.mats.get(key);
    if (had) return had;
    const mat = base.clone();
    mat.vertexColors = false;
    const markId = mark === 'scar' ? 1 : mark === 'freckles' ? 2 : mark === 'weathered' ? 3 : 0;
    const eye = eyes ? new THREE.Color(eyes) : null;
    const scar = `
            vec2 a = vec2(-0.20, 0.30), b = vec2(-0.08, -0.22);
            vec2 pa = q.xy - a, ba = b - a;
            float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
            float d = length(pa - ba * h);
            float line = smoothstep(0.024, 0.008, d) * front;
            float rim = clamp(smoothstep(0.05, 0.022, d) * front - line, 0.0, 1.0);
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.8, 0.62, 0.6), rim * 0.55);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.68, 0.64) * max(dot(diffuseColor.rgb, vec3(0.333)), 0.2) * 1.8, line * 0.85);`;
    const freckles = `
            float zone = smoothstep(0.34, 0.12, length(vec2(abs(q.x) * 0.9, q.y + 0.02))) * front;
            float f = step(0.80, hsh(floor(vRest * 420.0))) * zone;
            diffuseColor.rgb *= 1.0 - f * vec3(0.30, 0.42, 0.50);`;
    const weathered = `
            float lines = smoothstep(0.55, 1.0, sin(q.y * 150.0 + hsh(floor(vRest * 60.0)) * 3.0)) * smoothstep(0.1, 0.35, q.y) * front;
            diffuseColor.rgb *= mix(vec3(1.0), vec3(0.86, 0.74, 0.64), vMask.r);
            diffuseColor.rgb *= 1.0 - 0.14 * lines;
            float cheek = smoothstep(0.25, 0.06, length(vec2(abs(q.x) - 0.24, q.y + 0.08))) * front;
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.12, 0.84, 0.78), cheek * 0.65);`;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uDye = { value: new THREE.Color(tone[0], tone[1], tone[2]) };
      sh.uniforms.uEye = { value: eye ?? new THREE.Color(1, 1, 1) };
      sh.uniforms.uHead = { value: centre };
      sh.uniforms.uHeadSize = { value: size };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n#ifndef USE_COLOR\nattribute vec4 color;\n#endif\nvarying vec3 vMask;\nvarying vec3 vRest;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMask = color.rgb;\nvRest = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform vec3 uDye; uniform vec3 uEye; uniform vec3 uHead; uniform vec3 uHeadSize;
          varying vec3 vMask; varying vec3 vRest;
          float hsh(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          diffuseColor.rgb *= mix(vec3(1.0), uDye, vMask.r);
          ${eye ? `{
            float l = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
            float iris = vMask.g * smoothstep(0.42, 0.30, l) * smoothstep(0.015, 0.05, l);
            diffuseColor.rgb = mix(diffuseColor.rgb, uEye * (0.35 + 2.2 * l), iris);
          }` : ''}
          ${markId ? `{
            vec3 q = (vRest - uHead) / max(uHeadSize.y, 0.05);
            float front = smoothstep(-0.05, 0.25, q.z) * vMask.r;
            ${markId === 1 ? scar : markId === 2 ? freckles : weathered}
          }` : ''}`);
    };
    mat.customProgramCacheKey = () => `folk-skin-${eye ? 1 : 0}-${markId}`;
    this.mats.set(key, mat);
    return mat;
  }

  private masked(base: THREE.MeshStandardMaterial, id: string, dye: THREE.Color, accent: THREE.Color | null = null) {
    const key = `${base.uuid}|${id}`;
    let m = this.mats.get(key);
    if (m) return m;
    const mat = base.clone();
    // the mask lives in COLOR_0; it must not tint the whole mesh
    mat.vertexColors = false;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uDye = { value: dye };
      sh.uniforms.uAccent = { value: accent ?? new THREE.Color(1, 1, 1) };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\n#ifndef USE_COLOR\nattribute vec4 color;\n#endif\nvarying vec2 vDyeMask;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvDyeMask = color.rg;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uDye;\nuniform vec3 uAccent;\nvarying vec2 vDyeMask;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= mix(vec3(1.0), uDye, vDyeMask.x) * mix(vec3(1.0), uAccent, vDyeMask.y);');
    };
    mat.customProgramCacheKey = () => 'folk-dye2';
    this.mats.set(key, mat);
    return mat;
  }
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function isInside(o: THREE.Object3D, root: THREE.Object3D) {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === root) return true;
  return false;
}

/** Load the kit; null when it is not there yet (the crowd then uses the stopgap costumes). */
export async function loadTownsfolk(): Promise<TownsfolkKit | null> {
  try {
    const res = await fetch(asset('models/townsfolk.json'));
    if (!res.ok) return null;
    const manifest = (await res.json()) as KitManifest;
    const gltf = await loadModel('models/townsfolk.glb');
    if (!gltf) return null;
    const kit = new TownsfolkKit(gltf, manifest);
    return kit.ok ? kit : null;
  } catch (e) {
    console.warn('townsfolk kit not loaded', e);
    return null;
  }
}

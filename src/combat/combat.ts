// Combat. The research rules this runs on (docs/research/game-design-talks.md,
// docs/research/arpg-guidance-and-gamification.md):
//  - every attack is anticipation → contact → recovery; enemies telegraph with a red glow
//  - only two enemies may swing at once (attack tokens); the rest circle
//  - hits stop time for a few frames, shake the camera, flash white, knock back
//  - aggression pays: hits build Resonance, kills drop coin, potions and gear
//  - "suck to target": attacks turn and lunge toward the enemy you meant
//  - the dodge roll has invulnerable frames; enemies leash back to their camp

import * as THREE from 'three';
import type { TownsfolkKit } from '../rpg/townsfolk';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Sound } from '../audio/sound';
import type { Input } from '../core/input';
import { angleDelta, clamp } from '../core/math';
import type { Player } from '../player/player';
import { type Gear, RARITY, gearLines, rollGear } from '../rpg/character';
import type { QuestEngine } from '../rpg/quests';
import type { CampDef } from '../rpg/types';
import type { WorldCollision } from '../world/collision';
import { type Body, type EnemyType, TYPES, makeBody } from './enemies';
import { Floaters, Fx } from './fx';

export interface CombatEvents {
  trauma(n: number): void;
  hurt(fraction: number): void;
  died(): void;
  levelUp(level: number): void;
  loot(g: Gear): void;
}

type State = 'idle' | 'chase' | 'circle' | 'windup' | 'strike' | 'recover' | 'stagger' | 'return' | 'dead';

class Enemy {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = Math.random() * 6;
  state: State = 'idle';
  t = 0;
  cd = Math.random();
  hp: number;
  maxHp: number;
  token = false;
  aggro = false;
  poiseHits = 0;
  stun = 0;
  blind = 0;
  flash = 0;
  telegraph = 0;
  deadT = 0;
  wanderT = 0;
  wanderTo = new THREE.Vector3();
  circleDir = Math.random() < 0.5 ? -1 : 1;
  bar: HTMLElement;
  barFill: HTMLElement;
  hitThisSwing = false;
  aimAt = new THREE.Vector3();
  lastHurt = 0;

  constructor(public type: EnemyType, public level: number, public name: string, public elite: boolean, public camp: CampState, public body: Body, home: [number, number]) {
    this.maxHp = this.hp = Math.round(type.hp(level) * (elite ? 2.6 : 1));
    this.pos.set(home[0], 0, home[1]);
    this.bar = document.createElement('div');
    this.bar.className = 'ebar' + (elite ? ' elite' : '');
    this.bar.innerHTML = `<div class="en">${name}<span class="lv">${level}</span></div><div class="eb"><i></i></div>`;
    this.barFill = this.bar.querySelector('i')!;
  }

  get alive() {
    return this.state !== 'dead';
  }

  get radius() {
    return this.type.body === 'hound' ? 0.6 * this.type.scale * (this.elite ? 1.25 : 1) : 0.45;
  }
}

interface CampState {
  def: CampDef;
  enemies: Enemy[];
  spawned: boolean;
  clearedAt: number;
}

interface Projectile {
  kind: 'fire' | 'orb' | 'tone';
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  dmg: number;
  life: number;
  sprite: THREE.Sprite;
  hit: Set<Enemy>;
}

interface Loot {
  kind: 'coin' | 'salve' | 'gear';
  amount: number;
  gear?: Gear;
  obj: THREE.Object3D;
  pos: THREE.Vector3;
  label?: HTMLElement;
  age: number;
  vy: number;
}

interface AttackDef {
  clip: string;
  dur: number;
  hit: number;
  mult: number;
  arc: number;
  range: number;
  lunge: number;
  tilt: number;
  stop: number;
  heavy?: boolean;
}

const COMBO: AttackDef[] = [
  { clip: 'attack1', dur: 0.5, hit: 0.2, mult: 1.0, arc: 2.0, range: 2.7, lunge: 0.9, tilt: -0.5, stop: 0.06 },
  { clip: 'attack2', dur: 0.48, hit: 0.19, mult: 1.1, arc: 2.0, range: 2.7, lunge: 0.9, tilt: 0.7, stop: 0.06 },
  { clip: 'attack3', dur: 0.74, hit: 0.34, mult: 1.9, arc: 2.6, range: 3.1, lunge: 1.5, tilt: -1.3, stop: 0.12, heavy: true },
];
const HEAVY: AttackDef = { clip: 'attack3', dur: 0.8, hit: 0.38, mult: 2.4, arc: 3.4, range: 3.5, lunge: 1.2, tilt: -0.1, stop: 0.13, heavy: true };

const SPAWN_R = 300;
const DESPAWN_R = 460;
const MAX_TOKENS = 2;

export class Combat {
  group = new THREE.Group();
  fx = new Fx();
  floaters: Floaters;
  private bars = document.createElement('div');
  private boss = document.createElement('div');
  private camps: CampState[] = [];
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private loot: Loot[] = [];
  private campTimer = 0;
  private time = 0;

  // player combat state
  private atk: { def: AttackDef; t: number; done: boolean; queued: boolean; skill?: string } | null = null;
  private combo = 0;
  private comboT = 0;
  private roll: { t: number; dir: THREE.Vector3 } | null = null;
  private invuln = 0;
  private hitstop = 0;
  timeScale = 1;
  resonance = 0;
  fire = 100;
  private fireCd = 0;
  private fireIdle = 0;
  cds: Record<string, number> = { skill: 0, skill2: 0, potion: 0 };
  private heal = 0;
  private buff = 0;
  private critsLeft = 0;
  private lastFight = -99;
  private deadT = -1;
  /** the townsfolk kit, when loaded: human enemies are built from it */
  kit: TownsfolkKit | null = null;
  /** story scenes: no camps spawn */
  quiet = false;
  inCombat = false;
  /** things the player has done (the tutorial watches these) */
  tally = { hits: 0, rolls: 0, skills: 0, potions: 0, breaths: 0, telegraphs: 0 };
  /** the elite you are fighting, for the bar at the top of the screen */
  bossTarget: Enemy | null = null;

  private v = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private fireTex: THREE.Texture;
  private coinGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.03, 10);
  private coinMat = new THREE.MeshStandardMaterial({ color: '#e8c25a', metalness: 0.9, roughness: 0.25, emissive: '#5a3a08', emissiveIntensity: 0.6 });
  private bottleMat = new THREE.MeshStandardMaterial({ color: '#4fae6a', roughness: 0.2, transparent: true, opacity: 0.85, emissive: '#1f5a2e', emissiveIntensity: 0.8 });
  private beamGeo = new THREE.CylinderGeometry(0.06, 0.22, 7, 8, 1, true).translate(0, 3.5, 0);

  constructor(
    private model: GLTF | null,
    private col: WorldCollision,
    private player: Player,
    private quests: QuestEngine,
    private sound: Sound,
    uiRoot: HTMLElement,
    private ev: CombatEvents,
  ) {
    this.group.add(this.fx.group);
    this.floaters = new Floaters(uiRoot);
    this.bars.className = 'ebars';
    this.boss.className = 'bossbar';
    this.boss.hidden = true;
    uiRoot.append(this.bars, this.boss);
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d')!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,250,220,1)');
    grd.addColorStop(0.25, 'rgba(255,190,80,0.9)');
    grd.addColorStop(0.6, 'rgba(230,90,20,0.45)');
    grd.addColorStop(1, 'rgba(120,20,0,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    this.fireTex = new THREE.CanvasTexture(c);
  }

  get sheet() {
    return this.quests.sheet;
  }

  setCamps(defs: CampDef[]) {
    this.camps = defs.map((def) => ({ def, enemies: [], spawned: false, clearedAt: -1e9 }));
  }

  // ================================================================ camps
  private manageCamps(px: number, pz: number) {
    if (this.quiet) return;
    for (const c of this.camps) {
      const d = Math.hypot(c.def.at[0] - px, c.def.at[1] - pz);
      const allowed = this.quests.test(c.def.if);
      if (c.spawned && (d > DESPAWN_R || !allowed)) {
        for (const e of c.enemies) this.removeEnemy(e);
        c.enemies = [];
        c.spawned = false;
      } else if (!c.spawned && allowed && d < SPAWN_R) {
        const cleared = c.clearedAt > -1e8;
        const ready = !cleared || (c.def.respawn > 0 && this.time - c.clearedAt > c.def.respawn && d > 120);
        if (ready) this.spawnCamp(c);
      }
    }
  }

  private spawnCamp(c: CampState) {
    c.spawned = true;
    c.clearedAt = -1e9;
    const list: [string, number, string, boolean][] = [];
    if (c.def.elite) list.push([c.def.elite.type, c.def.elite.level, c.def.elite.name, true]);
    for (const [type, level, n] of c.def.enemies) for (let i = 0; i < n; i++) list.push([type, level, TYPES[type].name, false]);
    list.forEach(([type, level, name, elite], i) => {
      const t = TYPES[type];
      const a = (i / list.length) * Math.PI * 2 + Math.random();
      const r = elite ? 0 : 3 + Math.random() * c.def.r * 0.5;
      const home: [number, number] = [c.def.at[0] + Math.cos(a) * r, c.def.at[1] + Math.sin(a) * r];
      const e = new Enemy(t, level, name, elite, c, makeBody(t, this.model, elite, this.kit), home);
      e.pos.y = this.col.heightAt(e.pos.x, e.pos.z);
      e.wanderTo.copy(e.pos);
      e.body.root.position.copy(e.pos);
      this.group.add(e.body.root);
      this.bars.appendChild(e.bar);
      c.enemies.push(e);
      this.enemies.push(e);
    });
  }

  private removeEnemy(e: Enemy) {
    this.group.remove(e.body.root);
    e.body.dispose();
    e.bar.remove();
    const i = this.enemies.indexOf(e);
    if (i >= 0) this.enemies.splice(i, 1);
    if (this.bossTarget === e) this.bossTarget = null;
  }

  // ================================================================ per frame
  update(dt: number, input: Input, camYaw: number, cam: THREE.PerspectiveCamera, canAct: boolean) {
    // hitstop is a time-scale envelope: almost frozen, then straight back
    this.hitstop -= dt;
    this.timeScale = this.hitstop > 0 ? 0.05 : 1;
    const sdt = dt * this.timeScale;
    this.time += sdt;
    const p = this.player;
    const onFoot = p.mode === 'walk' || p.mode === 'calling';
    const flying = p.mode === 'fly';
    const me = onFoot ? p.heroPos : p.pos;

    this.campTimer -= dt;
    if (this.campTimer <= 0) {
      this.campTimer = 0.5;
      this.manageCamps(me.x, me.z);
    }

    // ---- player death and respawn
    if (this.deadT >= 0) {
      this.deadT += dt;
      if (this.deadT > 3.4) {
        this.deadT = -1;
        p.dead = false;
        this.ev.died();
      }
    }

    // ---- cooldowns and meters
    for (const k of Object.keys(this.cds)) this.cds[k] = Math.max(0, this.cds[k] - sdt);
    this.comboT -= sdt;
    this.invuln -= sdt;
    this.buff -= sdt;
    this.fireCd -= sdt;
    this.fireIdle += sdt;
    if (this.fireIdle > 0.6) this.fire = Math.min(100, this.fire + 24 * sdt);
    const d = this.sheet.derived();
    const fighting = this.time - this.lastFight < 5;
    this.inCombat = fighting || this.enemies.some((e) => e.aggro && e.alive && e.pos.distanceToSquared(me) < 900);
    if (!this.inCombat) this.resonance = Math.max(0, this.resonance - 5 * sdt);
    if (this.heal > 0) {
      const h = Math.min(this.heal, d.maxHp * 0.4 * sdt);
      this.heal -= h;
      this.sheet.h.hp = Math.min(d.maxHp, this.sheet.h.hp + h);
    } else if (!this.inCombat && this.deadT < 0) {
      this.sheet.h.hp = Math.min(d.maxHp, this.sheet.h.hp + d.maxHp * 0.04 * sdt);
    }
    if (this.sheet.h.hp > d.maxHp) this.sheet.h.hp = d.maxHp;

    // ---- player actions
    if (canAct && this.deadT < 0) {
      if (onFoot) this.footActions(sdt, input, camYaw, d);
      else if (flying) this.flightActions(sdt, input, cam, d);
      if (input.consume('potion')) this.drink(d.maxHp);
    } else {
      input.consume('attack');
      input.consume('skill');
      input.consume('skill2');
    }
    p.hero.setArmed(onFoot && (this.inCombat || this.atk !== null || this.time - this.lastFight < 8));

    // ---- enemies
    let tokens = this.enemies.filter((e) => e.token).length;
    const target = this.deadT >= 0 ? null : onFoot ? p.heroPos : flying && p.altitude() < 26 ? p.pos : null;
    for (const e of this.enemies) {
      tokens += this.think(e, sdt, target, flying, tokens, d);
      this.moveEnemy(e, sdt);
    }
    // a cleared camp starts its respawn clock
    for (const c of this.camps) {
      if (c.spawned && c.enemies.length && c.clearedAt < -1e8 && c.enemies.every((e) => !e.alive)) c.clearedAt = this.time;
      if (c.spawned && c.enemies.length && c.enemies.every((e) => !e.alive && e.deadT > 12)) {
        for (const e of c.enemies) this.removeEnemy(e);
        c.enemies = [];
      }
    }

    this.updateProjectiles(sdt, d);
    this.updateLoot(sdt, me, onFoot);
    this.fx.update(sdt);
    this.floaters.update(dt, cam, window.innerWidth, window.innerHeight);
    this.drawBars(cam, me);
  }

  // ================================================================ on foot
  private footActions(dt: number, input: Input, camYaw: number, d: ReturnType<Combat['sheet']['derived']>) {
    const p = this.player;
    const hero = p.hero;
    // roll: Space while fighting (jump otherwise)
    if (this.inCombat && !this.roll && input.peek('jump')) {
      input.consume('jump');
      if (!this.atk || this.atk.t > this.atk.def.hit + 0.05) {
        const dir = p.moveDir(input, camYaw);
        if (dir.lengthSq() < 0.01) dir.set(-Math.sin(p.heroYaw), 0, -Math.cos(p.heroYaw)); // no direction: hop back
        this.roll = { t: 0, dir };
        this.atk = null;
        this.invuln = 0.42;
        this.tally.rolls++;
        p.heroYaw = Math.atan2(dir.x, dir.z);
        hero.act('roll', 0.55);
        this.sound.whoosh();
      }
    }
    if (this.roll) {
      this.roll.t += dt;
      const k = this.roll.t / 0.55;
      const sp = 11 * Math.max(0, 1 - k) ** 0.7;
      p.push(this.roll.dir.x * sp * dt, this.roll.dir.z * sp * dt);
      p.lock = 0.05;
      if (k >= 1) this.roll = null;
      input.consume('attack');
      return;
    }

    if (input.consume('attack')) {
      if (this.atk) {
        if (this.atk.t > this.atk.def.dur * 0.35) this.atk.queued = true;
      } else this.startAttack(COMBO[this.comboT > 0 ? this.combo : 0], input, camYaw);
    }
    const o = this.sheet.origin;
    if (input.consume('skill') && !this.atk && this.cds.skill <= 0 && this.resonance >= o.skill.cost) this.useSkill(o.skill.id, input, camYaw, d);
    if (input.consume('skill2')) {
      if (this.sheet.h.level < o.skill2.level) this.floaters.add(`${o.skill2.name}: vanaf niveau ${o.skill2.level}`, this.headPos(), 'note', 1.4, 0.6);
      else if (this.resonance < o.skill2.cost) this.floaters.add('Te weinig Resonantie', this.headPos(), 'note', 1.2, 0.6);
      else if (!this.atk && this.cds.skill2 <= 0) this.useSkill(o.skill2.id, input, camYaw, d);
    }

    if (this.atk) {
      const a = this.atk;
      a.t += dt;
      p.lock = 0.05;
      // lunge through the first part of the swing
      if (a.t < a.def.hit) {
        const f = (a.def.lunge / a.def.hit) * dt;
        p.push(Math.sin(p.heroYaw) * f, Math.cos(p.heroYaw) * f);
      }
      if (!a.done && a.t >= a.def.hit) {
        a.done = true;
        this.resolveSwing(a.def, d, a.skill);
      }
      if (a.t >= a.def.dur) {
        const queued = a.queued && !a.skill;
        this.atk = null;
        if (queued) this.startAttack(COMBO[this.combo], input, camYaw);
      }
    }
  }

  private headPos() {
    return this.v2.copy(this.player.heroPos).setY(this.player.heroPos.y + 2.1).clone();
  }

  /** Face the enemy the player meant: the nearest one roughly where they are pushing or looking. */
  private assist(input: Input, camYaw: number, reach: number) {
    const p = this.player;
    const want = p.moveDir(input, camYaw);
    const wantYaw = want.lengthSq() > 0.01 ? Math.atan2(want.x, want.z) : camYaw;
    let best: Enemy | null = null, bs = Infinity;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.pos.x - p.heroPos.x, dz = e.pos.z - p.heroPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > reach) continue;
      const da = Math.abs(angleDelta(wantYaw, Math.atan2(dx, dz)));
      if (da > 1.4) continue;
      const score = dist + da * 3;
      if (score < bs) { bs = score; best = e; }
    }
    p.heroYaw = best ? Math.atan2(best.pos.x - p.heroPos.x, best.pos.z - p.heroPos.z) : wantYaw;
    return best;
  }

  private startAttack(def: AttackDef, input: Input, camYaw: number, skill?: string) {
    const p = this.player;
    const t = this.assist(input, camYaw, 6);
    let lunge = def.lunge;
    if (t) {
      const dist = Math.hypot(t.pos.x - p.heroPos.x, t.pos.z - p.heroPos.z) - t.radius - 1.0;
      lunge = clamp(dist, 0, Math.max(def.lunge, 2.6));
    }
    this.atk = { def: { ...def, lunge }, t: 0, done: false, queued: false, skill };
    this.combo = (COMBO.indexOf(def) + 1) % COMBO.length;
    this.comboT = def.dur + 0.55;
    p.hero.act(def.clip, def.dur);
    this.sound.swing(!!def.heavy);
    this.lastFight = this.time;
  }

  private resolveSwing(def: AttackDef, d: ReturnType<Combat['sheet']['derived']>, skill?: string) {
    const p = this.player;
    const at = this.v.copy(p.heroPos).setY(p.heroPos.y + 1.1);
    const fwd = new THREE.Vector3(Math.sin(p.heroYaw), 0, Math.cos(p.heroYaw));
    this.fx.slash(at.clone().addScaledVector(fwd, 0.4), p.heroYaw, def.tilt, def.range * 0.8, skill ? '#ffd27a' : '#fff2d0');
    let hits = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dx = e.pos.x - p.heroPos.x, dz = e.pos.z - p.heroPos.z;
      const dist = Math.hypot(dx, dz) - e.radius;
      if (dist > def.range || Math.abs(e.pos.y - p.heroPos.y) > 3) continue;
      if (Math.abs(angleDelta(p.heroYaw, Math.atan2(dx, dz))) > def.arc / 2) continue;
      this.damage(e, this.roll ? 0 : this.rollDamage(d, def.mult), !!def.heavy, fwd);
      hits++;
    }
    if (hits) {
      this.hitstop = Math.max(this.hitstop, def.stop + (hits > 1 ? 0.02 : 0));
      this.ev.trauma(def.heavy ? 0.32 : 0.16);
    }
  }

  private rollDamage(d: ReturnType<Combat['sheet']['derived']>, mult: number) {
    let dmg = (d.dmg[0] + Math.random() * (d.dmg[1] - d.dmg[0])) * mult * (this.buff > 0 ? 1.33 : 1);
    let crit = Math.random() * 100 < d.crit;
    if (this.critsLeft > 0) {
      crit = true;
      this.critsLeft--;
    }
    if (crit) dmg *= 1.75;
    return crit ? -Math.round(dmg) : Math.round(dmg); // negative = crit (keeps the call sites short)
  }

  private useSkill(id: string, input: Input, camYaw: number, d: ReturnType<Combat['sheet']['derived']>) {
    this.tally.skills++;
    const p = this.player;
    const o = this.sheet.origin;
    const def = o.skill.id === id ? o.skill : o.skill2;
    const slot = o.skill.id === id ? 'skill' : 'skill2';
    this.cds[slot] = def.cooldown;
    this.resonance -= def.cost;
    this.lastFight = this.time;
    const at = this.v.copy(p.heroPos).setY(p.heroPos.y + 0.2).clone();
    if (id === 'zware_slag') return this.startAttack(HEAVY, input, camYaw, id);
    if (id === 'strijdkreet') {
      this.buff = 8;
      p.hero.act('cast', 0.6);
      this.fx.ring(at, 7, '#ff6a3a');
      this.floaters.add('Strijdkreet!', this.headPos(), 'skill', 1.2);
      this.sound.howl();
      for (const e of this.enemies) if (e.alive && e.pos.distanceTo(p.heroPos) < 6.5) this.stagger(e, this.v2.copy(e.pos).sub(p.heroPos).setY(0).normalize(), 6);
      this.ev.trauma(0.25);
      return;
    }
    if (id === 'klokslag') {
      p.hero.act('cast', 0.6);
      this.fx.ring(at, 7, '#ffd56a', 0.55);
      this.fx.ring(at, 4.5, '#fff1c0', 0.4);
      this.sound.bell(131, 0.45);
      let hit = 0;
      for (const e of this.enemies) {
        if (!e.alive || e.pos.distanceTo(p.heroPos) > 7) continue;
        const dir = this.v2.copy(e.pos).sub(p.heroPos).setY(0).normalize();
        this.damage(e, Math.round(this.rollDamage(d, 1.5) * d.power), true, dir);
        e.stun = 1.8;
        hit++;
      }
      if (hit) this.hitstop = 0.1;
      this.ev.trauma(0.3);
      return;
    }
    if (id === 'zuivere_toon') {
      this.assist(input, camYaw, 25);
      p.hero.act('cast', 0.5);
      const dir = new THREE.Vector3(Math.sin(p.heroYaw), 0, Math.cos(p.heroYaw));
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.fireTex, color: '#bfe8ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.scale.setScalar(1.6);
      const pos = p.heroPos.clone().setY(p.heroPos.y + 1.2).addScaledVector(dir, 0.8);
      s.position.copy(pos);
      this.group.add(s);
      this.projectiles.push({ kind: 'tone', pos, vel: dir.multiplyScalar(34), dmg: Math.round(Math.abs(this.rollDamage(d, 2.6)) * d.power), life: 0.9, sprite: s, hit: new Set() });
      this.sound.bell(523, 0.25);
      return;
    }
    if (id === 'pistoolschot') {
      const t = this.assist(input, camYaw, 30);
      p.hero.act('cast', 0.45);
      const from = p.heroPos.clone().setY(p.heroPos.y + 1.4);
      const dir = new THREE.Vector3(Math.sin(p.heroYaw), 0, Math.cos(p.heroYaw));
      this.sound.shot();
      this.fx.particles.emit(from.clone().addScaledVector(dir, 0.7), { n: 18, color: '#9a948a', speed: 2, up: 1, life: 1.2, size: 0.35, gravity: -0.5, drag: 1.5 });
      this.fx.flash(from.clone().addScaledVector(dir, 0.8), 1.2, '#ffd27a');
      if (t) this.damage(t, this.rollDamage(d, 2.8), true, dir);
      this.ev.trauma(0.2);
      return;
    }
    if (id === 'rookbom') {
      p.hero.act('cast', 0.5);
      for (let i = 0; i < 4; i++) this.fx.particles.emit(at, { n: 30, color: '#7d7a74', speed: 4, up: 1.2, life: 2.2, size: 0.9, gravity: -0.3, drag: 1.2 });
      this.critsLeft = 3;
      this.invuln = 0.6;
      this.sound.whoosh();
      for (const e of this.enemies) if (e.alive && e.pos.distanceTo(p.heroPos) < 7) { e.blind = 3; this.releaseToken(e); e.state = 'idle'; }
      this.floaters.add('Verdwenen in de rook', this.headPos(), 'skill', 1.2);
    }
  }

  private drink(maxHp: number) {
    const inv = this.quests.s.inv;
    if (this.cds.potion > 0) return;
    if ((inv.salve ?? 0) <= 0) {
      this.floaters.add('Geen zalf meer', this.headPos(), 'note', 1.1, 0.6);
      return;
    }
    inv.salve--;
    this.cds.potion = 12;
    this.tally.potions++;
    this.heal += maxHp * 0.5;
    const at = this.player.onFoot ? this.player.heroPos : this.player.pos;
    this.fx.particles.emit(at.clone().setY(at.y + 1), { n: 26, color: '#7dffa0', speed: 1.5, up: 2.5, life: 1, size: 0.12, gravity: -1 });
    this.floaters.add(`+${Math.round(maxHp * 0.5)}`, this.headPos(), 'heal', 1.1);
    this.quests.save();
  }

  // ================================================================ flight
  private flightActions(_dt: number, input: Input, cam: THREE.PerspectiveCamera, d: ReturnType<Combat['sheet']['derived']>) {
    input.consume('skill');
    input.consume('skill2');
    const wants = input.consume('attack') || input.held('attack');
    if (!wants || this.fireCd > 0 || this.fire < 18) return;
    this.fireCd = 0.3;
    this.fire -= 18;
    this.fireIdle = 0;
    const p = this.player;
    // aim where the camera looks: the ground, or an enemy close to the line of sight
    const origin = cam.position.clone();
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    let aim: THREE.Vector3 | null = null;
    let best = 0.14;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      this.v.copy(e.pos).setY(e.pos.y + 1).sub(origin);
      const dist = this.v.length();
      if (dist > 260) continue;
      const ang = this.v.normalize().angleTo(dir);
      if (ang < best) { best = ang; aim = e.pos.clone().setY(e.pos.y + 0.8).addScaledVector(e.vel, dist / 75); }
    }
    if (!aim) {
      const step = this.v.copy(dir).multiplyScalar(4);
      const q = origin.clone();
      for (let i = 0; i < 110; i++) {
        q.add(step);
        if (q.y < this.col.heightAt(q.x, q.z)) break;
      }
      aim = q;
    }
    const fwd = p.forward;
    const start = p.pos.clone().addScaledVector(fwd, 4.6).setY(p.pos.y + 1.4);
    const vel = aim.clone().sub(start).normalize().multiplyScalar(80).addScaledVector(fwd, p.speed * 0.5);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.fireTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(2.4);
    s.position.copy(start);
    this.group.add(s);
    const dragonDmg = (14 + this.sheet.h.level * 6) * d.power * (1 + d.fire / 100);
    this.projectiles.push({ kind: 'fire', pos: start, vel, dmg: Math.round(dragonDmg), life: 4, sprite: s, hit: new Set() });
    this.sound.fire();
    this.tally.breaths++;
    this.ev.trauma(0.06);
  }

  // ================================================================ projectiles
  private updateProjectiles(dt: number, d: ReturnType<Combat['sheet']['derived']>) {
    const p = this.player;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      if (pr.kind === 'fire') pr.vel.y -= 6 * dt;
      if (pr.kind === 'orb') {
        // slow, slightly homing: you can outrun it or roll through it
        const tgt = p.onFoot ? p.heroPos : p.pos;
        this.v.copy(tgt).setY(tgt.y + 1.1).sub(pr.pos).normalize().multiplyScalar(9);
        pr.vel.lerp(this.v, Math.min(1, dt * 0.9));
      }
      pr.pos.addScaledVector(pr.vel, dt);
      pr.sprite.position.copy(pr.pos);
      if (pr.kind === 'fire') this.fx.particles.emit(pr.pos, { n: 3, color: '#ff8a2a', speed: 1.5, life: 0.4, size: 0.5, gravity: -2 });
      if (pr.kind === 'orb') this.fx.particles.emit(pr.pos, { n: 1, color: '#58c8ff', speed: 0.4, life: 0.5, size: 0.25, gravity: 0 });
      const ground = this.col.heightAt(pr.pos.x, pr.pos.z);
      let end = pr.life <= 0 || pr.pos.y < ground + 0.2;
      if (pr.kind === 'fire') {
        for (const e of this.enemies) if (e.alive && e.pos.distanceToSquared(this.v.copy(pr.pos).setY(pr.pos.y - 1)) < (1.8 + e.radius) ** 2) end = true;
        if (end) this.explode(pr.pos.clone().setY(Math.max(pr.pos.y, ground)), pr.dmg);
      } else if (pr.kind === 'tone') {
        for (const e of this.enemies) {
          if (!e.alive || pr.hit.has(e)) continue;
          if (e.pos.distanceToSquared(this.v.copy(pr.pos).setY(e.pos.y)) < (1.3 + e.radius) ** 2 && Math.abs(pr.pos.y - e.pos.y - 1) < 2.5) {
            pr.hit.add(e);
            this.damage(e, pr.dmg, true, pr.vel.clone().normalize());
            this.hitstop = Math.max(this.hitstop, 0.07);
          }
        }
        end = pr.life <= 0;
      } else if (pr.kind === 'orb') {
        const tgt = p.onFoot ? p.heroPos : p.pos;
        if (this.v.copy(tgt).setY(tgt.y + 1.1).distanceToSquared(pr.pos) < (p.onFoot ? 1.1 : 3) ** 2) {
          this.hurtPlayer(pr.dmg, d);
          this.fx.particles.emit(pr.pos, { n: 20, color: '#58c8ff', speed: 5, life: 0.5, size: 0.15 });
          end = true;
        }
      }
      if (end) {
        this.group.remove(pr.sprite);
        pr.sprite.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private explode(at: THREE.Vector3, dmg: number) {
    const R = 4.8;
    this.fx.flash(at.clone().setY(at.y + 1), 7, '#ffb060', 0.22);
    this.fx.particles.emit(at, { n: 46, color: '#ff8a2a', speed: 9, up: 4, life: 0.7, size: 0.35, gravity: 6 });
    this.fx.particles.emit(at, { n: 18, color: '#4a3a2a', speed: 3, up: 2.5, life: 1.6, size: 0.9, gravity: -0.6, drag: 1 });
    this.fx.scorch(at, 2.6);
    this.fx.ring(at, R, '#ff9a40', 0.35);
    this.sound.boom();
    const p = this.player;
    const me = p.onFoot ? p.heroPos : p.pos;
    const near = me.distanceTo(at);
    this.ev.trauma(clamp(0.45 - near / 120, 0.05, 0.45));
    let hits = 0;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const dist = e.pos.distanceTo(at);
      if (dist > R + e.radius) continue;
      const f = 1 - 0.5 * clamp(dist / R, 0, 1);
      this.damage(e, Math.round(dmg * f * (0.9 + Math.random() * 0.2)), true, this.v2.copy(e.pos).sub(at).setY(0).normalize());
      e.aggro = true;
      hits++;
    }
    if (hits) this.hitstop = Math.max(this.hitstop, 0.06);
  }

  // ================================================================ damage
  private damage(e: Enemy, raw: number, heavy: boolean, dir: THREE.Vector3) {
    if (!e.alive) return;
    const crit = raw < 0;
    const dmg = Math.max(1, Math.abs(raw));
    e.hp -= dmg;
    e.flash = 1;
    e.aggro = true;
    e.lastHurt = this.time;
    this.lastFight = this.time;
    this.resonance = Math.min(100, this.resonance + (heavy ? 12 : 8));
    const top = e.pos.clone().setY(e.pos.y + e.body.top * 0.8);
    this.floaters.add(String(dmg), top, crit ? 'dmg crit' : 'dmg', crit ? 1.0 : 0.8, crit ? 2.2 : 1.6);
    this.fx.sparks(top.clone().setY(e.pos.y + 1.1), dir, e.type.body === 'hound' ? '#9fd6ff' : '#ffcf7a', crit ? 22 : 12);
    this.sound.hit(crit, e.type.body === 'human');
    this.tally.hits++;
    // alert the camp
    for (const o of e.camp.enemies) if (o.alive && o.pos.distanceToSquared(e.pos) < 400) o.aggro = true;
    if (e.hp <= 0) return this.kill(e, dir);
    e.poiseHits++;
    if (heavy || e.poiseHits >= e.type.poise * (e.elite ? 2 : 1)) this.stagger(e, dir, heavy ? 7 : 4);
    else e.vel.addScaledVector(dir, 2.5);
    if (e.elite) this.bossTarget = e;
  }

  private stagger(e: Enemy, dir: THREE.Vector3, force: number) {
    e.poiseHits = 0;
    this.releaseToken(e);
    e.state = 'stagger';
    e.t = 0.42;
    e.telegraph = 0;
    e.vel.addScaledVector(dir, force / (e.elite ? 2 : 1));
    e.body.act('hit');
  }

  private kill(e: Enemy, dir: THREE.Vector3) {
    this.releaseToken(e);
    e.state = 'dead';
    e.deadT = 0;
    e.vel.addScaledVector(dir, 6);
    e.body.act('death');
    e.bar.style.display = 'none';
    this.hitstop = Math.max(this.hitstop, e.elite ? 0.28 : 0.15);
    this.ev.trauma(e.elite ? 0.6 : 0.3);
    this.sound.kill();
    const xp = Math.round(e.type.xp(e.level) * (e.elite ? 4 : 1) * (e.level >= this.sheet.h.level - 3 ? 1 : 0.3));
    this.floaters.add(`+${xp} ervaring`, e.pos.clone().setY(e.pos.y + e.body.top + 0.4), 'xp', 1.5, 1.2);
    const before = this.sheet.h.level;
    this.quests.addXp(xp);
    if (this.sheet.h.level > before) this.ev.levelUp(this.sheet.h.level);
    this.quests.onKill(e.type.id, e.camp.def.id, e.pos.x, e.pos.z, e.elite);
    if (this.bossTarget === e) this.bossTarget = null;
    this.drop(e);
  }

  private drop(e: Enemy) {
    const at = e.pos.clone();
    const coins = Math.round((1 + Math.random() * 2.5) * e.level * (e.elite ? 6 : 1));
    this.spawnLoot('coin', coins, at);
    if (Math.random() < (e.elite ? 1 : 0.12)) this.spawnLoot('salve', 1, at);
    const gearChance = e.elite ? 1 : e.type.id === 'kludde' ? 1 : 0.2;
    if (Math.random() < gearChance) this.spawnLoot('gear', 1, at, rollGear(e.level, e.elite ? 2 : 0));
    if (e.elite && Math.random() < 0.5) this.spawnLoot('gear', 1, at, rollGear(e.level, 1));
  }

  private spawnLoot(kind: Loot['kind'], amount: number, at: THREE.Vector3, gear?: Gear) {
    const pos = at.clone();
    pos.x += (Math.random() - 0.5) * 2.4;
    pos.z += (Math.random() - 0.5) * 2.4;
    const obj = new THREE.Group();
    if (kind === 'coin') {
      for (let i = 0; i < Math.min(6, 2 + amount / 4); i++) {
        const c = new THREE.Mesh(this.coinGeo, this.coinMat);
        c.position.set((Math.random() - 0.5) * 0.3, 0.02 + i * 0.03, (Math.random() - 0.5) * 0.3);
        c.rotation.set(Math.random() * 0.4, 0, Math.random() * 0.4);
        obj.add(c);
      }
    } else if (kind === 'salve') {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.24, 8), this.bottleMat);
      b.position.y = 0.14;
      obj.add(b);
    } else if (gear) {
      const col = new THREE.Color(RARITY[gear.rarity].color);
      const mat = new THREE.MeshStandardMaterial({ color: '#8a7a60', metalness: 0.6, roughness: 0.4, emissive: col, emissiveIntensity: 0.35 });
      const shape = gear.slot === 'wapen' ? new THREE.BoxGeometry(0.06, 0.04, 0.9) : gear.slot === 'harnas' ? new THREE.BoxGeometry(0.45, 0.12, 0.4) : new THREE.TorusGeometry(0.12, 0.03, 6, 12);
      const m = new THREE.Mesh(shape, mat);
      m.position.y = 0.1;
      m.rotation.y = Math.random() * 3;
      obj.add(m);
      // only magic and better get a beam (Diablo's rule: rarity you can see from afar)
      if (gear.rarity >= 1) obj.add(new THREE.Mesh(this.beamGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: gear.rarity >= 2 ? 0.32 : 0.16, depthWrite: false, blending: THREE.AdditiveBlending })));
    }
    obj.position.copy(pos);
    obj.position.y = this.col.heightAt(pos.x, pos.z) + 0.6;
    this.group.add(obj);
    const l: Loot = { kind, amount, gear, obj, pos, age: 0, vy: 3.5 };
    if (gear) {
      l.label = document.createElement('div');
      l.label.className = 'lootlabel';
      l.label.style.color = RARITY[gear.rarity].color;
      l.label.textContent = gear.name;
      this.bars.appendChild(l.label);
      this.sound.loot(gear.rarity);
    }
    this.loot.push(l);
  }

  private updateLoot(dt: number, me: THREE.Vector3, onFoot: boolean) {
    for (let i = this.loot.length - 1; i >= 0; i--) {
      const l = this.loot[i];
      l.age += dt;
      const floor = this.col.heightAt(l.obj.position.x, l.obj.position.z);
      if (l.vy !== 0) {
        l.vy -= 14 * dt;
        l.obj.position.y += l.vy * dt;
        if (l.obj.position.y <= floor) { l.obj.position.y = floor; l.vy = 0; }
      }
      if (l.kind !== 'gear') l.obj.rotation.y += dt * 2;
      l.pos.copy(l.obj.position);
      const dist = Math.hypot(me.x - l.pos.x, me.z - l.pos.z);
      const auto = l.kind !== 'gear' && l.age > 0.5 && ((onFoot && dist < 4.5) || (!onFoot && dist < 7 && Math.abs(me.y - l.pos.y) < 8));
      if (auto) {
        // a short magnet pull, then it's yours
        l.obj.position.lerp(this.v.copy(me).setY(me.y + 1), Math.min(1, dt * 10));
        if (l.obj.position.distanceTo(this.v) < 0.8) this.pickUp(l);
      }
      if (l.age > 300) this.removeLoot(l);
    }
  }

  private pickUp(l: Loot) {
    if (l.kind === 'coin') {
      this.quests.s.florins += l.amount;
      this.floaters.add(`+${l.amount} florijnen`, this.headPos(), 'coin', 1.1, 0.8);
      this.sound.coins();
    } else if (l.kind === 'salve') {
      this.quests.s.inv.salve = (this.quests.s.inv.salve ?? 0) + 1;
      this.floaters.add('+1 Begijnenzalf', this.headPos(), 'heal', 1.1, 0.8);
      this.sound.coins();
    } else if (l.gear) {
      this.quests.s.hero.bag.push(l.gear);
      this.ev.loot(l.gear);
    }
    this.quests.save();
    this.removeLoot(l);
  }

  private removeLoot(l: Loot) {
    this.group.remove(l.obj);
    l.label?.remove();
    this.loot.splice(this.loot.indexOf(l), 1);
  }

  /** Gear on the ground within reach (picked up with E). */
  nearestLoot(x: number, z: number) {
    let best: Loot | null = null, bd = 2.6 * 2.6;
    for (const l of this.loot) {
      if (l.kind !== 'gear') continue;
      const d2 = (l.pos.x - x) ** 2 + (l.pos.z - z) ** 2;
      if (d2 < bd) { bd = d2; best = l; }
    }
    return best ? { name: best.gear!.name, rarity: best.gear!.rarity, take: () => this.pickUp(best!), lines: gearLines(best.gear!) } : null;
  }

  // ================================================================ enemy AI
  private releaseToken(e: Enemy) {
    e.token = false;
  }

  /** Returns tokens taken this frame (+1) or released (-1). */
  private think(e: Enemy, dt: number, target: THREE.Vector3 | null, targetFlying: boolean, tokens: number, d: ReturnType<Combat['sheet']['derived']>): number {
    e.body.update(dt);
    e.flash = Math.max(0, e.flash - dt * 7);
    e.telegraph = e.state === 'windup' ? Math.min(1, e.telegraph + dt / e.type.windup) : Math.max(0, e.telegraph - dt * 5);
    e.body.glow(e.flash, e.telegraph);
    if (!e.alive) {
      e.deadT += dt;
      e.vel.multiplyScalar(Math.exp(-dt * 4));
      return 0;
    }
    e.t -= dt;
    e.cd -= dt;
    e.stun -= dt;
    e.blind -= dt;
    const t = e.type;
    const home = e.camp.def.at;
    const fromHome = Math.hypot(e.pos.x - home[0], e.pos.z - home[1]);
    const dist = target ? Math.hypot(target.x - e.pos.x, target.z - e.pos.z) : Infinity;
    const want = (speed: number, tx: number, tz: number) => {
      const dx = tx - e.pos.x, dz = tz - e.pos.z;
      const l = Math.hypot(dx, dz);
      if (l < 0.05) return;
      e.vel.x += ((dx / l) * speed - e.vel.x) * Math.min(1, dt * 6);
      e.vel.z += ((dz / l) * speed - e.vel.z) * Math.min(1, dt * 6);
    };
    const face = (tx: number, tz: number, rate = 8) => {
      e.yaw += angleDelta(e.yaw, Math.atan2(tx - e.pos.x, tz - e.pos.z)) * Math.min(1, dt * rate);
    };
    let tokenDelta = 0;

    if (e.stun > 0 || e.blind > 0) {
      e.vel.multiplyScalar(Math.exp(-dt * 6));
      if (e.stun > 0 && Math.random() < dt * 4) this.fx.particles.emit(e.pos.clone().setY(e.pos.y + e.body.top), { n: 2, color: '#ffe080', speed: 1, life: 0.5, size: 0.1, gravity: 0 });
      if (e.token) { e.token = false; tokenDelta--; }
      if (e.state === 'windup' || e.state === 'strike') e.state = 'chase';
      e.body.move(0);
      return tokenDelta;
    }

    // leash: too far from home, go back and heal
    if (e.state !== 'return' && fromHome > e.camp.def.r + 55 && e.state !== 'stagger') {
      e.state = 'return';
      e.aggro = false;
      if (e.token) { e.token = false; tokenDelta--; }
    }
    if (e.state === 'return') {
      want(t.speed * 1.2, home[0], home[1]);
      face(home[0], home[1]);
      e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.25 * dt);
      if (fromHome < e.camp.def.r * 0.5 + 2) e.state = 'idle';
      e.body.move(Math.hypot(e.vel.x, e.vel.z));
      return tokenDelta;
    }

    if (!e.aggro && target && dist < t.aggro * (e.elite ? 1.3 : 1) && (!targetFlying || t.ranged || dist < 12)) {
      e.aggro = true;
      if (t.body === 'hound') this.sound.howl();
      if (t.body === 'human') this.floaters.add(['Daar! Pak hem!', 'Een ruiter!', 'Halt!', 'Voor de buit!'][Math.floor(Math.random() * 4)], e.pos.clone().setY(e.pos.y + 2.3), 'bark', 1.6, 0.3);
      for (const o of e.camp.enemies) if (o.alive && o.pos.distanceToSquared(e.pos) < 625) o.aggro = true;
    }
    if (e.aggro && (!target || dist > 70)) {
      e.aggro = false;
      e.state = 'idle';
    }

    switch (e.state) {
      case 'idle': {
        if (e.aggro) { e.state = 'chase'; break; }
        e.wanderT -= dt;
        if (e.wanderT <= 0) {
          e.wanderT = 3 + Math.random() * 5;
          const a = Math.random() * 6.28, r = Math.random() * e.camp.def.r;
          e.wanderTo.set(home[0] + Math.cos(a) * r, 0, home[1] + Math.sin(a) * r);
        }
        if (Math.hypot(e.wanderTo.x - e.pos.x, e.wanderTo.z - e.pos.z) > 1) {
          want(1.2, e.wanderTo.x, e.wanderTo.z);
          face(e.wanderTo.x, e.wanderTo.z, 3);
        } else e.vel.multiplyScalar(Math.exp(-dt * 5));
        break;
      }
      case 'chase':
      case 'circle': {
        if (!target) { e.state = 'idle'; break; }
        face(target.x, target.z);
        const ranged = t.ranged;
        const reach = (ranged ? ranged.range : t.reach) + (ranged ? 0 : e.radius);
        const canSwing = e.cd <= 0 && (dist < reach || (ranged && dist < ranged.range));
        const hasToken = e.token || e.elite || tokens + tokenDelta < MAX_TOKENS + (ranged ? 1 : 0);
        if (canSwing && hasToken && (!targetFlying || ranged)) {
          if (!e.token) { e.token = true; tokenDelta++; }
          e.state = 'windup';
          e.t = t.windup;
          e.hitThisSwing = false;
          e.aimAt.copy(target);
          e.body.act('windup', t.windup);
          this.tally.telegraphs++;
          if (ranged?.projectile === 'shot') this.fx.flash(e.pos.clone().setY(e.pos.y + 1.5), 0.6, '#ff5030', t.windup);
          break;
        }
        if (ranged) {
          // keep your distance and line up a shot
          const keep = ranged.keep;
          if (dist < keep - 2) want(t.speed, e.pos.x * 2 - target.x, e.pos.z * 2 - target.z);
          else if (dist > ranged.range - 4) want(t.speed, target.x, target.z);
          else {
            const a = Math.atan2(e.pos.x - target.x, e.pos.z - target.z) + e.circleDir * 0.4;
            want(t.speed * 0.5, target.x + Math.sin(a) * dist, target.z + Math.cos(a) * dist);
          }
        } else if (targetFlying || (!hasToken && dist < 7)) {
          // wait your turn in a ring around the player (God of War's crescent)
          const ring = targetFlying ? 4 : 4.8;
          const a = Math.atan2(e.pos.x - target.x, e.pos.z - target.z) + e.circleDir * dt * 0.6;
          want(t.speed * 0.45, target.x + Math.sin(a) * ring, target.z + Math.cos(a) * ring);
          e.state = 'circle';
        } else {
          want(t.speed, target.x, target.z);
          e.state = 'chase';
        }
        break;
      }
      case 'windup': {
        e.vel.multiplyScalar(Math.exp(-dt * 8));
        if (target) {
          face(target.x, target.z, t.ranged ? 3 : 5);
          if (t.ranged?.projectile === 'shot') e.aimAt.lerp(target, Math.min(1, dt * 1.5)); // the aim lags: keep moving
          else e.aimAt.copy(target);
        }
        if (e.t <= 0) {
          e.state = 'strike';
          e.t = 0.18;
          e.body.act('strike', 0.4);
          this.strike(e, target, d);
        }
        break;
      }
      case 'strike': {
        if (e.t <= 0) {
          e.state = 'recover';
          e.t = t.recover;
        }
        break;
      }
      case 'recover': {
        e.vel.multiplyScalar(Math.exp(-dt * 6));
        if (e.t <= 0) {
          e.state = 'chase';
          e.cd = t.cooldown * (0.7 + Math.random() * 0.6);
          if (e.token) { e.token = false; tokenDelta--; }
        }
        break;
      }
      case 'stagger': {
        e.vel.multiplyScalar(Math.exp(-dt * 5));
        if (e.t <= 0) e.state = e.aggro ? 'chase' : 'idle';
        break;
      }
    }
    e.body.move(Math.hypot(e.vel.x, e.vel.z));
    return tokenDelta;
  }

  private strike(e: Enemy, target: THREE.Vector3 | null, d: ReturnType<Combat['sheet']['derived']>) {
    const t = e.type;
    const dmg = Math.round(t.dmg(e.level) * (e.elite ? 1.6 : 1) * (0.85 + Math.random() * 0.3));
    const p = this.player;
    if (t.ranged?.projectile === 'shot') {
      // a musket: hits where it aimed, so moving or rolling is the answer
      const from = e.pos.clone().setY(e.pos.y + 1.45);
      const dir = e.aimAt.clone().setY(e.aimAt.y + 1.1).sub(from).normalize();
      this.fx.flash(from.clone().addScaledVector(dir, 0.9), 1.4, '#ffcf80', 0.1);
      this.fx.particles.emit(from.clone().addScaledVector(dir, 1), { n: 16, color: '#9a948a', speed: 1.5, up: 0.6, life: 1.4, size: 0.4, gravity: -0.4 });
      this.sound.shot();
      const me = p.onFoot ? p.heroPos : p.pos;
      const miss = Math.hypot(me.x - e.aimAt.x, me.z - e.aimAt.z);
      if (target && miss < (p.onFoot ? 1.4 : 3.5)) this.hurtPlayer(dmg, d);
      else this.floaters.add('mis', me.clone().setY(me.y + 2), 'note', 0.7, 0.5);
      return;
    }
    if (t.ranged?.projectile === 'orb') {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.fireTex, color: '#7fd8ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.scale.setScalar(1.1);
      const pos = e.pos.clone().setY(e.pos.y + 2.6);
      s.position.copy(pos);
      this.group.add(s);
      const vel = (target ?? e.aimAt).clone().setY((target ?? e.aimAt).y + 1).sub(pos).normalize().multiplyScalar(9);
      this.projectiles.push({ kind: 'orb', pos, vel, dmg, life: 5, sprite: s, hit: new Set() });
      return;
    }
    if (t.lunge) {
      const f = new THREE.Vector3(Math.sin(e.yaw), 0, Math.cos(e.yaw));
      e.vel.addScaledVector(f, t.lunge * 6);
    }
    if (e.type.id === 'kludde') {
      this.fx.ring(e.pos, t.reach + 1.5, '#7cc4ff', 0.4);
      this.ev.trauma(0.25);
    }
    if (!target || !p.onFoot) return;
    const dx = target.x - e.pos.x, dz = target.z - e.pos.z;
    const dist = Math.hypot(dx, dz);
    const inArc = Math.abs(angleDelta(e.yaw, Math.atan2(dx, dz))) < 1.1;
    if (dist < t.reach + e.radius + (t.lunge ?? 0) * 0.6 + 0.5 && inArc) this.hurtPlayer(dmg, d);
  }

  private hurtPlayer(raw: number, d: ReturnType<Combat['sheet']['derived']>) {
    const p = this.player;
    const at = (p.onFoot ? p.heroPos : p.pos).clone();
    if (this.deadT >= 0) return;
    if (this.invuln > 0) {
      this.floaters.add('ontweken', at.setY(at.y + 2.2), 'note', 0.8, 0.6);
      return;
    }
    const dmg = Math.max(1, Math.round(raw * (100 / (100 + d.armor * 2.2))));
    this.sheet.h.hp -= dmg;
    this.lastFight = this.time;
    this.floaters.add(`-${dmg}`, at.clone().setY(at.y + 2.1), 'hurt', 0.9, 1.0);
    this.sound.hurt();
    this.ev.trauma(0.35);
    this.ev.hurt(dmg / d.maxHp);
    if (p.onFoot && !p.hero.acting?.startsWith('attack')) p.hero.act('hit', 0.35);
    if (this.sheet.h.hp <= 0) {
      this.sheet.h.hp = 0;
      this.deadT = 0;
      p.dead = true;
      this.atk = null;
      this.roll = null;
      if (p.onFoot) p.hero.act('death', 99);
      for (const e of this.enemies) { e.aggro = false; e.token = false; if (e.alive) e.state = 'return'; }
    }
  }

  get playerDead() {
    return this.deadT >= 0;
  }

  /** Clear the field after a respawn. */
  reset() {
    this.atk = null;
    this.roll = null;
    this.heal = 0;
    this.sheet.h.hp = this.sheet.derived().maxHp;
  }

  private moveEnemy(e: Enemy, dt: number) {
    // keep a little apart from each other
    for (const o of this.enemies) {
      if (o === e || !o.alive || !e.alive) continue;
      const dx = e.pos.x - o.pos.x, dz = e.pos.z - o.pos.z;
      const dd = dx * dx + dz * dz;
      const min = e.radius + o.radius + 0.4;
      if (dd < min * min && dd > 1e-4) {
        const l = Math.sqrt(dd);
        e.vel.x += (dx / l) * (min - l) * 8 * dt;
        e.vel.z += (dz / l) * (min - l) * 8 * dt;
      }
    }
    // and out of the player
    const p = this.player;
    if (p.onFoot && e.alive) {
      const dx = e.pos.x - p.heroPos.x, dz = e.pos.z - p.heroPos.z;
      const l = Math.hypot(dx, dz), min = e.radius + 0.5;
      if (l < min && l > 1e-3) { e.pos.x += (dx / l) * (min - l); e.pos.z += (dz / l) * (min - l); }
    }
    const nx = e.pos.x + e.vel.x * dt, nz = e.pos.z + e.vel.z * dt;
    const h = this.col.heightAround(nx, nz, 0.35);
    if (h < e.pos.y + 0.7 || e.type.body === 'wisp') {
      e.pos.x = nx;
      e.pos.z = nz;
    } else {
      e.vel.multiplyScalar(-0.3);
      e.circleDir *= -1;
    }
    const floor = this.col.heightAt(e.pos.x, e.pos.z);
    e.pos.y += (floor - e.pos.y) * Math.min(1, dt * 12);
    e.body.root.position.copy(e.pos);
    e.body.root.rotation.y = e.yaw;
  }

  // ================================================================ health bars
  private drawBars(cam: THREE.PerspectiveCamera, me: THREE.Vector3) {
    const w = window.innerWidth, h = window.innerHeight;
    for (const e of this.enemies) {
      const near = e.pos.distanceToSquared(me) < 50 * 50;
      const show = e.alive && near && (e.aggro || e.hp < e.maxHp || e.pos.distanceToSquared(me) < 18 * 18);
      if (!show) {
        if (e.bar.style.display !== 'none') e.bar.style.display = 'none';
        continue;
      }
      this.v.copy(e.pos).setY(e.pos.y + e.body.top + 0.35).project(cam);
      if (this.v.z > 1 || Math.abs(this.v.x) > 1.1 || Math.abs(this.v.y) > 1.1) {
        e.bar.style.display = 'none';
        continue;
      }
      e.bar.style.display = '';
      e.bar.style.transform = `translate(${(this.v.x * 0.5 + 0.5) * w}px, ${(-this.v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
      e.barFill.style.width = `${(100 * e.hp) / e.maxHp}%`;
      e.bar.classList.toggle('tele', e.state === 'windup');
    }
    for (const l of this.loot) {
      if (!l.label) continue;
      const near = l.pos.distanceToSquared(me) < 40 * 40;
      this.v.copy(l.pos).setY(l.pos.y + 0.9).project(cam);
      if (!near || this.v.z > 1) { l.label.style.display = 'none'; continue; }
      l.label.style.display = '';
      l.label.style.transform = `translate(${(this.v.x * 0.5 + 0.5) * w}px, ${(-this.v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
    }
    const b = this.bossTarget;
    if (b && b.alive && b.aggro && b.pos.distanceToSquared(me) < 60 * 60) {
      this.boss.hidden = false;
      const html = `<div class="bn">${b.name}</div><div class="bb"><i style="width:${(100 * b.hp) / b.maxHp}%"></i></div>`;
      if (this.boss.innerHTML !== html) this.boss.innerHTML = html;
    } else this.boss.hidden = true;
  }

  /** Enemy camps for the map: where, what level, and whether they are cleared. */
  campMarks() {
    return this.camps
      .filter((c) => this.quests.test(c.def.if))
      .map((c) => ({ x: c.def.at[0], z: c.def.at[1], name: c.def.name, level: Math.max(...c.def.enemies.map((e) => e[1]), c.def.elite?.level ?? 0), cleared: c.spawned && c.enemies.length > 0 && c.enemies.every((e) => !e.alive) }));
  }
}

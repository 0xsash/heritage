// Player: rider + dragon. Two modes — flying on the dragon, and walking the
// real streets on foot. Landing / mounting / calling the dragon link them.

import * as THREE from 'three';
import { angleDelta, clamp, damp, lerp } from '../core/math';
import type { Input } from '../core/input';
import type { WorldCollision } from '../world/collision';
import { Dragon } from './dragon';
import { Hero } from './hero';

export type Mode = 'fly' | 'walk' | 'landing' | 'mounting' | 'calling';

export interface PlayerEvents {
  trauma(amount: number): void;
  flap(strength: number): void;
  land(impact: number): void;
  takeoff(): void;
  step(): void;
}

const CLEARANCE = 1.7; // dragon belly above surface
const MIN_FLY_SPEED = 3;
const CRUISE = 20;
const MAX_SPEED = 52;
const BOOST_SPEED = 82;

export class Player {
  /** add this to the scene; holds the dragon, and the hero when on foot */
  group = new THREE.Group();
  dragon = new Dragon();
  hero = new Hero();
  mode: Mode = 'fly';

  // Dragon flight state
  pos = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  roll = 0;
  speed = CRUISE;
  vy = 0; // extra vertical velocity (hover climb/descend, takeoff hop)
  turnRate = 0;
  boostTime = 0;
  thrust = 0;
  climbRate = 0;

  // Hero on-foot state
  heroPos = new THREE.Vector3();
  heroVel = new THREE.Vector3();
  heroYaw = 0;
  heroVy = 0;
  heroGrounded = true;
  private heroSpeed = 0;
  private prevHeroSpeed = 0;
  private stepAcc = 0;

  // Transitions
  private tTimer = 0;
  private tFrom = new THREE.Vector3();
  private tTo = new THREE.Vector3();
  private grounded = 0;

  constructor(private col: WorldCollision, private ev: PlayerEvents) {
    this.group.add(this.dragon.root);
    this.dragon.onFlap = (s) => ev.flap(s);
    this.hero.sit();
    this.dragon.riderSeat.add(this.hero.root);
    this.hero.root.position.set(0, -0.15, 0);
    this.hero.root.scale.setScalar(1);
  }

  spawn(x: number, y: number, z: number, yaw: number) {
    this.pos.set(x, y, z);
    this.yaw = yaw;
    this.pitch = -0.08;
    this.speed = 26;
  }

  get forward() {
    const cp = Math.cos(this.pitch);
    return new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
  }

  /** Height of the dragon above whatever is below it. */
  altitude() {
    return this.pos.y - this.col.heightAround(this.pos.x, this.pos.z, 2.5);
  }

  canLand() {
    return this.mode === 'fly' && this.altitude() < 30;
  }

  distanceToDragon() {
    return Math.hypot(this.heroPos.x - this.pos.x, this.heroPos.z - this.pos.z);
  }

  /**
   * @param aimYaw/aimPitch camera aim (mouse steering); ignored for pads
   */
  update(dt: number, input: Input, aimYaw: number, aimPitch: number) {
    switch (this.mode) {
      case 'fly':
        this.updateFlight(dt, input, aimYaw, aimPitch);
        if (input.consume('interact') && this.canLand()) this.beginLanding();
        break;
      case 'landing':
        this.updateLanding(dt);
        break;
      case 'walk':
        this.updateWalk(dt, input, aimYaw);
        if (input.consume('interact')) {
          if (this.distanceToDragon() < 7) this.beginMount();
          else this.beginCall();
        }
        break;
      case 'mounting':
        this.updateMount(dt);
        break;
      case 'calling':
        this.updateWalk(dt, input, aimYaw);
        this.updateCall(dt);
        break;
    }
    this.syncVisuals(dt);
  }

  // ---------------------------------------------------------------- flight
  private updateFlight(dt: number, input: Input, aimYaw: number, aimPitch: number) {
    const pad = input.device === 'pad';
    const boost = input.held('boost');
    const brake = input.brakeAxis;
    this.thrust = input.throttle;

    // --- steering
    let targetYaw: number, targetPitch: number;
    if (pad) {
      targetYaw = this.yaw - input.moveX * 1.6;
      targetPitch = clamp(this.pitch + input.moveY * 0.9, -1.2, 1.1);
    } else {
      targetYaw = aimYaw - input.moveX * 0.35;
      targetPitch = clamp(aimPitch, -1.2, 1.1);
    }
    if (input.held('jump')) targetPitch = Math.max(targetPitch, 0.55);
    if (input.held('descend')) targetPitch = Math.min(targetPitch, -0.6);

    // Turn authority drops a little at speed — weight without losing control.
    const speedT = clamp(this.speed / MAX_SPEED, 0, 1.5);
    const yawRateMax = lerp(2.4, 1.25, clamp(speedT, 0, 1));
    const dy = angleDelta(this.yaw, targetYaw);
    const wantRate = clamp(dy * 3.2, -yawRateMax, yawRateMax);
    this.turnRate = lerp(this.turnRate, wantRate, damp(0.14, dt));
    this.yaw += this.turnRate * dt;
    const dp = targetPitch - this.pitch;
    this.pitch += clamp(dp * 3.0, -1.6, 1.6) * dt;

    // --- energy: dive to gain speed, climb to spend it
    let target = CRUISE + this.thrust * (MAX_SPEED - CRUISE);
    if (brake > 0) target = lerp(target, MIN_FLY_SPEED, brake);
    if (boost && this.boostTime <= 0 && this.speed > 8) {
      this.boostTime = 1.4;
      this.ev.trauma(0.32);
    }
    if (this.boostTime > 0) {
      this.boostTime -= dt;
      target = BOOST_SPEED;
    }
    this.speed += -Math.sin(this.pitch) * 9.8 * 0.85 * dt; // gravity along the flight path
    const rate = this.speed < target ? (this.boostTime > 0 ? 0.09 : 0.03) : brake > 0 ? 0.05 : 0.012;
    this.speed = lerp(this.speed, target, damp(rate, dt));
    this.speed = clamp(this.speed, MIN_FLY_SPEED, BOOST_SPEED + 15);

    // Hovering: vertical control directly when slow.
    const hover = clamp(1 - this.speed / 12, 0, 1);
    let vyTarget = 0;
    if (input.held('jump')) vyTarget = 9 * hover;
    if (input.held('descend')) vyTarget = -9 * hover;
    this.vy = lerp(this.vy, vyTarget, damp(0.08, dt));

    // Roll from turning (bank), small pitch wobble with wingbeats handled by anim.
    const targetRoll = clamp(-this.turnRate * 0.55, -1.1, 1.1);
    this.roll = lerp(this.roll, targetRoll, damp(0.1, dt));

    // --- integrate
    const f = this.forward;
    const prevY = this.pos.y;
    this.pos.addScaledVector(f, this.speed * dt);
    this.pos.y += this.vy * dt;
    this.climbRate = (this.pos.y - prevY) / Math.max(dt, 1e-4);

    // --- invisible assists: ground & roof avoidance (look-ahead), hard floor
    const ahead = this.pos.clone().addScaledVector(new THREE.Vector3(f.x, 0, f.z).normalize(), Math.min(this.speed * 0.6, 30));
    const floorAhead = this.col.heightAround(ahead.x, ahead.z, 3) + CLEARANCE + 2;
    if (this.pos.y < floorAhead && this.pitch < 0.35) {
      this.pitch = lerp(this.pitch, 0.35, damp(0.12, dt)); // pull up before impact
    }
    const floor = this.col.heightAround(this.pos.x, this.pos.z, 2.2) + CLEARANCE;
    if (this.pos.y < floor) {
      const impact = Math.max(0, -this.climbRate);
      this.pos.y = floor;
      if (this.pitch < 0) this.pitch *= 0.4;
      if (impact > 6) {
        this.ev.trauma(clamp(impact / 40, 0.1, 0.5));
        this.speed *= 0.85;
      }
    }
    if (this.pos.y > 650) this.pos.y = 650;
  }

  private beginLanding() {
    this.mode = 'landing';
    this.tTimer = 0;
    this.tFrom.copy(this.pos);
    const f = this.forward;
    const glide = Math.min(this.speed * 0.7, 22);
    const x = this.pos.x + f.x * glide, z = this.pos.z + f.z * glide;
    const surf = this.col.heightAround(x, z, 2);
    this.tTo.set(x, surf + 0.05, z);
  }

  private updateLanding(dt: number) {
    this.tTimer += dt;
    const T = 1.1;
    const t = clamp(this.tTimer / T, 0, 1);
    const e = 1 - Math.pow(1 - t, 3);
    this.pos.lerpVectors(this.tFrom, this.tTo, e);
    this.pos.y += Math.sin(t * Math.PI) * 2.5 * (1 - t);
    this.pitch = lerp(this.pitch, 0, damp(0.15, dt));
    this.roll = lerp(this.roll, 0, damp(0.15, dt));
    this.speed = lerp(this.speed, 0, damp(0.1, dt));
    this.turnRate = lerp(this.turnRate, 0, damp(0.2, dt));
    this.grounded = clamp(t * 1.4, 0, 1);
    this.thrust = 0.3 * (1 - t);
    if (t >= 1) {
      this.ev.land(0.6);
      this.ev.trauma(0.22);
      this.dismount();
    }
  }

  private dismount() {
    this.mode = 'walk';
    this.speed = 0;
    this.vy = 0;
    // hero hops off to the dragon's right side
    const right = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    this.heroPos.copy(this.pos).addScaledVector(right, 3.2);
    this.heroPos.y = this.col.heightAt(this.heroPos.x, this.heroPos.z);
    if (this.heroPos.y > this.pos.y + 0.6) this.heroPos.copy(this.pos); // blocked: stand by the dragon
    this.heroYaw = this.yaw;
    this.heroVy = 0;
    this.heroGrounded = true;
    this.group.add(this.hero.root); // re-parents off the dragon
    this.hero.root.position.copy(this.heroPos);
    this.hero.root.scale.setScalar(1);
  }

  // ---------------------------------------------------------------- on foot
  private updateWalk(dt: number, input: Input, camYaw: number) {
    const run = input.held('boost');
    const maxSpeed = run ? 6.8 : 3.3;
    // camera-relative move: forward = camera facing
    const fx = Math.sin(camYaw), fz = Math.cos(camYaw);
    const rx = -Math.cos(camYaw), rz = Math.sin(camYaw);
    let mx = fx * input.moveY + rx * input.moveX;
    let mz = fz * input.moveY + rz * input.moveX;
    const ml = Math.hypot(mx, mz);
    if (ml > 1) { mx /= ml; mz /= ml; }
    const accel = this.heroGrounded ? 0.22 : 0.05;
    this.heroVel.x = lerp(this.heroVel.x, mx * maxSpeed, damp(accel, dt));
    this.heroVel.z = lerp(this.heroVel.z, mz * maxSpeed, damp(accel, dt));
    const sp = Math.hypot(this.heroVel.x, this.heroVel.z);
    if (sp > 0.3) this.heroYaw += angleDelta(this.heroYaw, Math.atan2(this.heroVel.x, this.heroVel.z)) * damp(0.2, dt);

    if (input.consume('jump') && this.heroGrounded) {
      this.heroVy = 5.2;
      this.heroGrounded = false;
    }
    this.heroVy -= 18 * dt;

    // horizontal move with step-up limit; slide along walls
    const STEP = 0.55, R = 0.32;
    const tryMove = (nx: number, nz: number) => {
      const h = this.col.heightAround(nx, nz, R);
      if (h > this.heroPos.y + STEP) return false;
      this.heroPos.x = nx;
      this.heroPos.z = nz;
      return true;
    };
    const nx = this.heroPos.x + this.heroVel.x * dt, nz = this.heroPos.z + this.heroVel.z * dt;
    if (!tryMove(nx, nz)) {
      if (!tryMove(nx, this.heroPos.z)) this.heroVel.x = 0;
      if (!tryMove(this.heroPos.x, nz)) this.heroVel.z = 0;
    }
    const floor = this.col.heightAt(this.heroPos.x, this.heroPos.z);
    this.heroPos.y += this.heroVy * dt;
    if (this.heroPos.y <= floor) {
      if (!this.heroGrounded && this.heroVy < -9) this.ev.trauma(clamp(-this.heroVy / 40, 0.05, 0.4));
      this.heroPos.y = floor;
      this.heroVy = 0;
      this.heroGrounded = true;
    } else if (this.heroPos.y > floor + 0.08) {
      this.heroGrounded = false;
    }
    // step-down snap when walking down kerbs / off low roofs
    if (this.heroGrounded && this.heroPos.y - floor < STEP) this.heroPos.y = floor;

    this.prevHeroSpeed = this.heroSpeed;
    this.heroSpeed = sp;
    if (this.heroGrounded && sp > 0.5) {
      this.stepAcc += sp * dt;
      const strideLen = run ? 1.2 : 0.8;
      if (this.stepAcc > strideLen) { this.stepAcc = 0; this.ev.step(); }
    }
  }

  private beginMount() {
    this.mode = 'mounting';
    this.tTimer = 0;
    this.tFrom.copy(this.heroPos);
  }

  private updateMount(dt: number) {
    this.tTimer += dt;
    const t = clamp(this.tTimer / 0.45, 0, 1);
    const seat = new THREE.Vector3();
    this.dragon.riderSeat.getWorldPosition(seat);
    this.hero.root.position.lerpVectors(this.tFrom, seat, t);
    this.hero.root.position.y += Math.sin(t * Math.PI) * 1.6;
    if (t >= 1) this.takeoff();
  }

  private takeoff() {
    this.dragon.riderSeat.add(this.hero.root);
    this.hero.root.position.set(0, -0.15, 0);
    this.hero.root.rotation.set(0, 0, 0);
    this.hero.sit();
    this.mode = 'fly';
    this.grounded = 0;
    this.speed = 10;
    this.pitch = 0.55;
    this.vy = 11;
    this.ev.takeoff();
    this.ev.trauma(0.3);
  }

  private beginCall() {
    this.mode = 'calling';
    this.tTimer = 0;
    this.tFrom.copy(this.pos);
  }

  private updateCall(dt: number) {
    // The dragon flies to you in a lazy arc and lands beside you.
    this.tTimer += dt;
    const d = this.tFrom.distanceTo(this.heroPos);
    const T = clamp(d / 30, 1.6, 6);
    const t = clamp(this.tTimer / T, 0, 1);
    const behind = new THREE.Vector3(Math.sin(this.heroYaw), 0, Math.cos(this.heroYaw)).multiplyScalar(-4);
    const right = new THREE.Vector3(-Math.cos(this.heroYaw), 0, Math.sin(this.heroYaw)).multiplyScalar(3.5);
    const to = this.heroPos.clone().add(behind).add(right);
    to.y = this.col.heightAround(to.x, to.z, 2) + 0.05;
    const prev = this.pos.clone();
    this.pos.lerpVectors(this.tFrom, to, t * t * (3 - 2 * t));
    this.pos.y += Math.sin(t * Math.PI) * clamp(d * 0.25, 15, 80);
    const v = this.pos.clone().sub(prev);
    const hv = Math.hypot(v.x, v.z);
    if (hv > 0.01) {
      const want = Math.atan2(v.x, v.z);
      this.turnRate = angleDelta(this.yaw, want) / Math.max(dt, 1e-3) * 0.1;
      this.yaw += angleDelta(this.yaw, want) * damp(0.15, dt);
    }
    this.speed = hv / Math.max(dt, 1e-3);
    this.pitch = Math.atan2(v.y, hv) * 0.6;
    this.climbRate = v.y / Math.max(dt, 1e-3);
    this.thrust = t < 0.8 ? 0.7 : 0.2;
    this.grounded = t > 0.85 ? (t - 0.85) / 0.15 : 0;
    if (t >= 1) {
      this.mode = 'walk';
      this.pitch = 0;
      this.speed = 0;
      this.turnRate = 0;
      this.ev.land(0.5);
    }
  }

  // ---------------------------------------------------------------- visuals
  private syncVisuals(dt: number) {
    const d = this.dragon;
    d.root.position.copy(this.pos);
    d.root.rotation.set(0, this.yaw, 0);
    d.body.rotation.order = 'YXZ';
    d.body.rotation.set(-this.pitch, 0, this.roll);
    const flying = this.mode === 'fly' || this.mode === 'calling';
    d.update(dt, {
      speed: this.mode === 'fly' ? this.speed : flying ? this.speed : 0,
      climb: this.climbRate,
      thrust: this.mode === 'fly' ? Math.max(this.thrust, this.boostTime > 0 ? 1 : 0) : this.thrust,
      turnRate: this.turnRate,
      grounded: this.mode === 'walk' || this.mode === 'mounting' ? 1 : this.mode === 'landing' || this.mode === 'calling' ? this.grounded : 0,
      boosting: this.boostTime > 0,
    });
    if (this.mode === 'walk' || this.mode === 'calling') {
      this.hero.root.position.copy(this.heroPos);
      this.hero.root.rotation.set(0, this.heroYaw, 0);
      const acc = (this.heroSpeed - this.prevHeroSpeed) / Math.max(dt, 1e-3);
      this.hero.update(dt, this.heroSpeed, acc, !this.heroGrounded);
    }
  }

  /** Focus point for the camera. */
  focus(out: THREE.Vector3) {
    if (this.mode === 'walk' || this.mode === 'calling' || this.mode === 'mounting') {
      out.copy(this.mode === 'mounting' ? this.hero.root.position : this.heroPos);
      out.y += 1.65;
    } else {
      out.copy(this.pos);
      out.y += 2.2;
    }
    return out;
  }

  get onFoot() {
    return this.mode === 'walk' || this.mode === 'calling' || this.mode === 'mounting';
  }
}

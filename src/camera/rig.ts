// Camera rig. From the research:
//  - Eiserloh: trauma in [0,1], shake = trauma², rotation-only in 3D, smooth
//    noise (not random), frame-rate independent smoothing.
//  - Spider-Man: FOV widens with speed; pitch/roll follow motion gently.
//  - GMTK: keep the camera steady during precision (landing, walking).

import * as THREE from 'three';
import { clamp, damp, lerp, noise1 } from '../core/math';
import type { Input } from '../core/input';
import type { WorldCollision } from '../world/collision';
import type { Player } from '../player/player';

export class CameraRig {
  camera: THREE.PerspectiveCamera;
  yaw = 0;
  pitch = -0.15;
  private trauma = 0;
  private time = 0;
  private pos = new THREE.Vector3();
  private focus = new THREE.Vector3();
  private smoothFocus = new THREE.Vector3();
  private dist = 14;
  private roll = 0;
  private fov = 62;
  private initialised = false;
  sensitivity = 0.0022;

  constructor(aspect: number, private col: WorldCollision) {
    this.camera = new THREE.PerspectiveCamera(62, aspect, 0.3, 16000);
  }

  /** Skip smoothing next frame (after teleports / respawns). */
  snap() {
    this.initialised = false;
    this.snapNext = true;
  }
  private snapNext = false;

  addTrauma(t: number) {
    this.trauma = clamp(this.trauma + t, 0, 1);
  }

  update(dt: number, input: Input, player: Player) {
    this.time += dt;
    const onFoot = player.onFoot;

    // --- aim
    this.yaw -= input.mouseDX * this.sensitivity;
    this.pitch -= input.mouseDY * this.sensitivity;
    if (input.device === 'pad') {
      this.yaw -= input.lookX * 2.6 * dt;
      this.pitch -= input.lookY * 1.8 * dt;
      if (!onFoot && player.mode === 'fly') {
        // auto-follow behind the dragon when the right stick is idle
        const idle = Math.abs(input.lookX) < 0.05 && Math.abs(input.lookY) < 0.05;
        if (idle) {
          let d = player.yaw - this.yaw;
          d = Math.atan2(Math.sin(d), Math.cos(d));
          this.yaw += d * damp(0.06, dt);
          this.pitch = lerp(this.pitch, player.pitch * 0.6 - 0.12, damp(0.05, dt));
        }
      }
    }
    this.pitch = clamp(this.pitch, onFoot ? -1.2 : -1.35, onFoot ? 0.9 : 1.2);

    // --- focus & distance
    player.focus(this.focus);
    if (!this.initialised) {
      this.smoothFocus.copy(this.focus);
      if (!this.snapNext) this.yaw = player.yaw;
      this.initialised = true;
    }
    const speed = onFoot ? 0 : player.speed;
    // Look slightly ahead along the flight path (Nijman: lead the camera).
    if (!onFoot) this.focus.addScaledVector(player.forward, clamp(speed * 0.05, 0, 4));
    if (!onFoot) this.focus.y += 1.2; // sit a little above the dragon so its back and wings read
    this.smoothFocus.lerp(this.focus, damp(onFoot ? 0.35 : 0.5, dt));

    const targetDist = onFoot ? 4.6 : 9.5 + clamp(speed, 0, 90) * 0.08;
    this.dist = lerp(this.dist, targetDist, damp(onFoot ? 0.15 : 0.06, dt));

    // Camera direction: the camera looks along (yaw, pitch); it sits behind.
    const cp = Math.cos(this.pitch);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);
    const shoulder = onFoot ? new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw)).multiplyScalar(0.55) : new THREE.Vector3();
    const pivot = this.smoothFocus.clone().add(shoulder);

    // Collision: pull in if a roof/wall is between pivot and camera.
    let d = this.dist;
    const steps = 10;
    for (let i = 1; i <= steps; i++) {
      const t = (i / steps) * this.dist;
      const p = pivot.clone().addScaledVector(dir, -t);
      if (this.col.heightAt(p.x, p.z) > p.y - 0.4) {
        d = Math.max(0.8, t - this.dist / steps);
        break;
      }
    }
    const want = pivot.clone().addScaledVector(dir, -d);
    const floor = this.col.heightAt(want.x, want.z) + 0.5;
    if (want.y < floor) want.y = floor;
    this.pos.lerp(want, damp(onFoot ? 0.6 : 0.45, dt));
    if (this.snapNext || this.pos.distanceTo(want) > 200) {
      this.pos.copy(want);
      this.snapNext = false;
    }

    // --- rotation: look at pivot, gentle roll with the dragon's bank
    this.camera.position.copy(this.pos);
    this.camera.lookAt(pivot.clone().addScaledVector(dir, 2));
    const targetRoll = onFoot ? 0 : clamp(player.roll * 0.18, -0.2, 0.2);
    this.roll = lerp(this.roll, targetRoll, damp(0.05, dt));

    // Trauma shake: rotation only, noise-driven, shake = trauma².
    this.trauma = Math.max(0, this.trauma - dt * 0.9);
    const shake = this.trauma * this.trauma;
    const n = this.time * 18;
    const maxAng = 0.06;
    this.camera.rotateZ(this.roll + maxAng * shake * noise1(n, 3));
    this.camera.rotateX(maxAng * shake * noise1(n, 1));
    this.camera.rotateY(maxAng * shake * noise1(n, 2));

    // FOV with speed (subtle at cruise, dramatic when boosting).
    const targetFov = onFoot ? 60 : 60 + clamp((speed - 15) / 70, 0, 1) * 24;
    this.fov = lerp(this.fov, targetFov, damp(0.05, dt));
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
  }
}

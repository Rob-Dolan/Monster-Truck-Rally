// Follow camera: high and tilted, behind the truck. Pulls back and up on jumps.
import * as THREE from '../vendor/three.module.min.js';

const _look = new THREE.Vector3();

export class FollowCam {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.air = 0;
    this.look = new THREE.Vector3();
  }

  update(dt, truck, world, snap = false) {
    // turn to stay behind the truck (shortest way round)
    let d = truck.yaw - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += snap ? d : d * Math.min(1, dt * 2.6);

    // how "in the air" we are, smoothed, drives the pull-back
    const airTarget = Math.min(30, truck.heightAbove);
    const rate = airTarget > this.air ? 3 : 1.5;
    this.air += snap ? airTarget - this.air : (airTarget - this.air) * Math.min(1, dt * rate);

    const dist = 15 + this.air * 0.9;
    const height = 15 + this.air * 0.55;
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const tx = truck.x - s * dist, tz = truck.z - c * dist;
    let ty = truck.y + height;
    ty = Math.max(ty, world.heightAt(tx, tz) + 5);   // never dip inside a ramp

    const p = this.camera.position;
    if (snap) p.set(tx, ty, tz);
    else {
      const k = Math.min(1, dt * 6);
      p.x += (tx - p.x) * k; p.z += (tz - p.z) * k;
      p.y += (ty - p.y) * Math.min(1, dt * 4);
    }
    _look.set(truck.x + s * 4, truck.y + 1.5, truck.z + c * 4);
    if (snap) this.look.copy(_look); else this.look.lerp(_look, Math.min(1, dt * 8));
    this.camera.lookAt(this.look);
  }
}

// Particles: one instanced mesh of little chunks used for mud, glass and confetti.
import * as THREE from '../vendor/three.module.min.js';

const MAX = 600;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(),
  _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
const MUD = ['#5d3a1f', '#6b4224', '#7a4e2b', '#4a2f1a'];
const GLASS = ['#d8f3ff', '#ffffff', '#a8e0ff'];
const CONFETTI = ['#ff4d4d', '#ffd23c', '#4aa8ff', '#5ad16a', '#ff8ad0', '#ffffff', '#b06bff'];
const pick = (a) => a[(Math.random() * a.length) | 0];

export class Particles {
  constructor() {
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial(), MAX);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < MAX; i++) this.mesh.setColorAt(i, _c.set('#ffffff'));
    this.mesh.count = 0;
    this.list = [];
  }

  spawn(x, y, z, vx, vy, vz, size, life, color, grav = 30, flat = false) {
    if (this.list.length >= MAX) return;
    this.list.push({
      x, y, z, vx, vy, vz, size, life, max: life, color, grav, flat,
      r: Math.random() * 6, rs: (Math.random() - 0.5) * 14,
    });
  }

  // steady spray from a spinning tyre
  mudSpray(x, y, z, dx, dz, power) {
    this.spawn(x, y + 0.2, z,
      dx * power + (Math.random() - 0.5) * 3, 3 + Math.random() * power * 0.5, dz * power + (Math.random() - 0.5) * 3,
      0.18 + Math.random() * 0.22, 0.5 + Math.random() * 0.4, pick(MUD));
  }

  mudBurst(x, y, z, n, power) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = power * (0.4 + Math.random() * 0.8);
      this.spawn(x + Math.cos(a) * 1.5, y + 0.2, z + Math.sin(a) * 1.5,
        Math.cos(a) * r, 4 + Math.random() * power, Math.sin(a) * r,
        0.2 + Math.random() * 0.35, 0.7 + Math.random() * 0.6, pick(MUD));
    }
  }

  glassBurst(x, y, z, carColor) {
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 7;
      this.spawn(x + Math.cos(a), y + 0.6, z + Math.sin(a),
        Math.cos(a) * r, 5 + Math.random() * 8, Math.sin(a) * r,
        0.12 + Math.random() * 0.16, 0.6 + Math.random() * 0.5, i % 4 === 0 ? carColor : pick(GLASS));
    }
  }

  confetti(x, y, z) {
    for (let i = 0; i < 90; i++) {
      const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 10;
      this.spawn(x, y + 2, z, Math.cos(a) * r, 10 + Math.random() * 12, Math.sin(a) * r,
        0.3 + Math.random() * 0.2, 1.6 + Math.random() * 1.2, pick(CONFETTI), 9, true);
    }
  }

  update(dt, world) {
    const list = this.list;
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy -= p.grav * dt;
      if (p.flat) { p.vx *= 1 - dt * 1.5; p.vz *= 1 - dt * 1.5; if (p.vy < -5) p.vy = -5; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const floor = world.heightAt(p.x, p.z) + 0.05;
      if (p.y < floor && p.vy < 0) { p.y = floor; p.vy = 0; p.vx *= 0.5; p.vz *= 0.5; }
      p.r += p.rs * dt;
      const k = Math.min(1, p.life / (p.max * 0.3)) * p.size;
      _e.set(p.r, p.r * 0.7, 0);
      _q.setFromEuler(_e);
      _m.compose(_p.set(p.x, p.y, p.z), _q, _s.set(k, p.flat ? k * 0.15 : k, k));
      this.mesh.setMatrixAt(n, _m);
      this.mesh.setColorAt(n, _c.set(p.color));
      list[n++] = p;
    }
    list.length = n;
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor.needsUpdate = true;
  }

  clear() { this.list.length = 0; this.mesh.count = 0; }
}

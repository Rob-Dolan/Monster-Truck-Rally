// Truck: builds the low-poly model from a config entry and runs the
// hand-tuned arcade driving / jumping / trick model.
import * as THREE from '../vendor/three.module.min.js';

export const G = 20;          // arcade gravity
const WB = 1.9;               // half wheelbase
const TR = 1.7;               // half track width
const R = 1.15;               // wheel radius
const CM = 1.7;               // height of the point the truck flips around
const TAU = Math.PI * 2;
const TRICK_RATE = TAU / 0.65;

const TRICKS = {
  backflip: { axis: 'pitch', dir: 1 },
  frontflip: { axis: 'pitch', dir: -1 },
  spin: { axis: 'yaw', dir: 1 },
  cartwheel: { axis: 'roll', dir: 1 },
};
const AXES = ['pitch', 'yaw', 'roll'];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ---------------------------------------------------------------- model ----
export function buildTruckModel(cfg) {
  const mats = new Map();
  const mat = (color, glow) => {
    const key = color + (glow ? 'g' : '');
    if (!mats.has(key)) {
      mats.set(key, new THREE.MeshStandardMaterial({
        color, flatShading: true, roughness: 0.65, metalness: 0.05,
        emissive: glow ? color : '#000000', emissiveIntensity: glow ? 0.7 : 0,
      }));
    }
    return mats.get(key);
  };
  const add = (parent, geo, color, glow) => {
    const m = new THREE.Mesh(geo, mat(color, glow));
    m.castShadow = true;
    parent.add(m);
    return m;
  };

  const root = new THREE.Group();      // pivots around the centre of mass
  root.rotation.order = 'YXZ';
  const inner = new THREE.Group();
  inner.position.y = -CM;
  root.add(inner);
  const chassis = new THREE.Group();   // bounces on the suspension
  inner.add(chassis);

  // frame
  const c = cfg.colors;
  add(chassis, new THREE.BoxGeometry(1.5, 0.3, 4.4), c.frame).position.set(0, 1.6, 0);
  for (const z of [WB, -WB]) {
    for (const x of [1, -1]) {
      const s = add(chassis, new THREE.BoxGeometry(0.16, 0.9, 0.16), c.hub);
      s.position.set(x * 0.95, 1.5, z);
      s.rotation.z = x * 0.5;
    }
  }

  // body parts from config
  for (const p of cfg.parts) {
    let geo;
    const s = p.size;
    switch (p.shape) {
      case 'box': geo = new THREE.BoxGeometry(s[0], s[1], s[2]); break;
      case 'cyl': geo = new THREE.CylinderGeometry(s[0], s[1], s[2], p.segs || 8); break;
      case 'cone': geo = new THREE.ConeGeometry(s[0], s[1], p.segs || 6); break;
      case 'sphere': geo = new THREE.SphereGeometry(s[0], 8, 6); break;
      case 'torus': geo = new THREE.TorusGeometry(s[0], s[1], 6, 12); break;
      default: continue;
    }
    if (p.segs === 4) geo.rotateY(Math.PI / 4);
    const sides = p.mirror ? [1, -1] : [1];
    for (const side of sides) {
      const m = add(chassis, geo, p.color, p.glow);
      m.position.set(p.pos[0] * side, p.pos[1], p.pos[2]);
      if (p.rot) m.rotation.set(p.rot[0], p.rot[1] * side, p.rot[2] * side);
      if (p.scale) m.scale.set(p.scale[0], p.scale[1], p.scale[2]);
    }
  }

  // wheels
  const tireGeo = new THREE.CylinderGeometry(R, R, 1.0, 14);
  tireGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.55, 0.55, 1.06, 8);
  hubGeo.rotateZ(Math.PI / 2);
  const lugGeo = new THREE.BoxGeometry(1.04, 0.22, 0.4);
  const axleGeo = new THREE.CylinderGeometry(0.13, 0.13, TR * 2, 6);
  axleGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const front of [true, false]) {
    const z = front ? WB : -WB;
    add(inner, axleGeo, c.frame).position.set(0, R, z);
    for (const side of [1, -1]) {
      const holder = new THREE.Group();
      holder.position.set(side * TR, R, z);
      inner.add(holder);
      const wheel = new THREE.Group();
      holder.add(wheel);
      add(wheel, tireGeo, c.tire);
      add(wheel, hubGeo, c.hub);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const lug = add(wheel, lugGeo, c.tire);
        lug.position.set(0, Math.cos(a) * R, Math.sin(a) * R);
        lug.rotation.x = a;
      }
      wheels.push({ holder, wheel, front, side, off: 0 });
    }
  }
  return { root, inner, chassis, wheels };
}

// -------------------------------------------------------------- physics ----
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _up = new THREE.Vector3();

export class Truck {
  constructor(cfg) {
    this.cfg = cfg;
    this.model = buildTruckModel(cfg);
    this.object = this.model.root;
    this.events = [];
    this._g = { h: 0, pitch: 0, roll: 0, fl: 0, fr: 0, rl: 0, rr: 0 };
    this.reset(0, 0, 0, 0);
  }

  reset(x, y, z, yaw) {
    this.x = x; this.y = y; this.z = z;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.yaw = yaw; this.pitch = 0; this.roll = 0;
    this.grounded = true;
    this.airTime = 0;
    this.heightAbove = 0;
    this.landReported = true;
    this.bounces = 0;
    this.tricksThisAir = 0;
    this.flipped = 0;
    this.mudDrag = 0;
    this.steer = 0;
    this.fwd = 0;
    this.susY = 0; this.susV = 0;
    this.wheelSpin = 0;
    this.cur = { pitch: 0, yaw: 0, roll: 0 };
    this.target = { pitch: 0, yaw: 0, roll: 0 };
    this.events.length = 0;
  }

  get speed() { return Math.hypot(this.vx, this.vz); }
  get inAir() { return !this.grounded && (this.airTime > 0.1 || this.heightAbove > 0.8); }

  _h(world, x, z, yaw) {
    const s = Math.sin(yaw), c = Math.cos(yaw);
    const fx = s * WB, fz = c * WB, lx = c * TR, lz = -s * TR;
    return (world.heightAt(x + fx + lx, z + fz + lz) + world.heightAt(x + fx - lx, z + fz - lz) +
      world.heightAt(x - fx + lx, z - fz + lz) + world.heightAt(x - fx - lx, z - fz - lz) +
      world.heightAt(x, z)) / 5;
  }

  _ground(world, x, z, yaw) {
    const s = Math.sin(yaw), c = Math.cos(yaw);
    const fx = s * WB, fz = c * WB, lx = c * TR, lz = -s * TR;
    const g = this._g;
    const hits = world.carHits;
    g.fl = world.heightAt(x + fx + lx, z + fz + lz);
    g.fr = world.heightAt(x + fx - lx, z + fz - lz);
    g.rl = world.heightAt(x - fx + lx, z - fz + lz);
    g.rr = world.heightAt(x - fx - lx, z - fz - lz);
    g.h = (g.fl + g.fr + g.rl + g.rr + world.heightAt(x, z)) / 5;
    g.onCar = world.carHits !== hits;
    g.pitch = clamp(Math.atan2((g.fl + g.fr - g.rl - g.rr) / 2, 2 * WB), -1, 1);
    g.roll = clamp(Math.atan2((g.fl + g.rl - g.fr - g.rr) / 2, 2 * TR), -0.7, 0.7);
    return g;
  }

  // Called when a trick button is pressed.
  doTrick(name) {
    const t = TRICKS[name];
    if (!t || this.flipped > 0) return;
    if (this.grounded) {
      // on the ground only Spin works: it does a donut
      if (name === 'spin' && Math.abs(this.target.yaw - this.cur.yaw) < 0.2) {
        this.target.yaw += TAU;
        this.events.push({ type: 'donut' });
      }
      return;
    }
    if (!this.inAir) return;
    if (Math.abs(this.target[t.axis] - this.cur[t.axis]) < TAU * 1.2) {
      this.target[t.axis] += t.dir * TAU;
      this.tricksThisAir++;
      this.events.push({ type: 'trick', name });
    }
  }

  _upsideDown() {
    return Math.cos(this.cur.pitch) * Math.cos(this.cur.roll) < 0;
  }

  // Snap trick targets to the nearest "wheels down" pose (or roof-down if flipped).
  _settle(upside) {
    for (const a of AXES) {
      const v = this.cur[a];
      if (upside && a !== 'yaw' && Math.cos(v) < 0) {
        this.target[a] = Math.round((v - Math.PI) / TAU) * TAU + Math.PI;
      } else {
        this.target[a] = Math.round(v / TAU) * TAU;
      }
    }
  }

  step(dt, inp, world) {
    const st = this.cfg.stats;
    const b = world.bounds;
    const ox = this.x, oz = this.z;

    // --- flipped on the roof: wait a moment, then hop back over
    if (this.flipped > 0) {
      this.flipped -= dt;
      if (this.flipped <= 0) {
        this.flipped = 0;
        this.grounded = false;
        this.airTime = 0;
        this.landReported = true;
        this.bounces = 0;
        this.vy = 10;
        this.y += 0.05;
        for (const a of AXES) this.target[a] = Math.ceil((this.cur[a] - 0.01) / TAU) * TAU;
        this.events.push({ type: 'unflip' });
      }
    }

    // --- slope under the truck
    let flat = 1;
    if (this.grounded) {
      const e = 0.6;
      const gx = (this._h(world, ox + e, oz, this.yaw) - this._h(world, ox - e, oz, this.yaw)) / (2 * e);
      const gz = (this._h(world, ox, oz + e, this.yaw) - this._h(world, ox, oz - e, this.yaw)) / (2 * e);
      const g2 = Math.min(9, gx * gx + gz * gz);
      if (g2 > 0.0004) {
        const k = (G / (1 + g2)) * dt;
        this.vx -= gx * k; this.vz -= gz * k;
      }
      flat = 1 - Math.min(1, Math.sqrt(g2) * 3);
    }

    // --- driving
    this.steer += (inp.steer - this.steer) * Math.min(1, dt * 9);
    let s = Math.sin(this.yaw), c = Math.cos(this.yaw);
    let f = this.vx * s + this.vz * c;      // forward speed
    let l = this.vx * c - this.vz * s;      // sideways speed
    if (this.grounded && this.flipped <= 0) {
      const sf = clamp(f / 6, -1, 1);
      this.yaw += this.steer * st.turn * sf * dt;
      if (inp.gas && f < st.maxSpeed) f += st.accel * dt;
      if (inp.brake) {
        if (f > 1) f -= 34 * dt;
        else if (f > -st.maxSpeed * 0.45) f -= st.accel * 0.8 * dt;
      }
      if (!inp.gas && !inp.brake) f *= Math.exp(-0.6 * flat * dt);
      // after a big landing the deep mud soaks up extra speed for a few seconds
      if (this.mudDrag > 0) {
        this.mudDrag -= dt;
        if (f > st.maxSpeed) f -= (f - st.maxSpeed) * Math.min(1, 1.6 * dt);
      }
      l *= Math.exp(-st.grip * dt);
      s = Math.sin(this.yaw); c = Math.cos(this.yaw);
      this.vx = f * s + l * c; this.vz = f * c - l * s;
    } else if (this.grounded) {
      const k = Math.exp(-2.5 * dt);
      this.vx *= k; this.vz *= k;
    } else {
      this.yaw += this.steer * 0.9 * dt;    // a little air steering
    }
    this.fwd = f;

    // --- move
    let nx = ox + this.vx * dt, nz = oz + this.vz * dt;
    // arena edge: gently bounce back in
    if (nx < b.minX) { nx = b.minX; this.vx = Math.abs(this.vx) * 0.4 + 2; }
    if (nx > b.maxX) { nx = b.maxX; this.vx = -Math.abs(this.vx) * 0.4 - 2; }
    if (nz < b.minZ) { nz = b.minZ; this.vz = Math.abs(this.vz) * 0.4 + 2; }
    if (nz > b.maxZ) { nz = b.maxZ; this.vz = -Math.abs(this.vz) * 0.4 - 2; }
    let g = this._ground(world, nx, nz, this.yaw);
    if (g.h - this.y > 1.7 && (nx !== ox || nz !== oz)) {
      // ran into something too tall to climb: bounce off
      this.vx *= -0.35; this.vz *= -0.35;
      nx = ox; nz = oz;
      g = this._ground(world, nx, nz, this.yaw);
    }
    this.x = nx; this.z = nz;
    const sp = this.speed;
    // ramps can launch the truck; cars only give it a little hop
    const maxUp = g.onCar ? Math.min(8, sp * 1.1 + 1) : sp * 1.1 + 1;

    if (this.grounded) {
      const ball = this.y + this.vy * dt - G * dt * dt;
      if (ball > g.h + 0.03) {
        // the ground dropped away: take off!
        this.grounded = false;
        this.airTime = 0;
        this.landReported = false;
        this.bounces = 1;
        this.tricksThisAir = 0;
        this.y = ball;
        this.vy -= G * dt;
      } else {
        const follow = (g.h - this.y) / dt;
        this.vy = clamp(follow, -80, maxUp);
        this.y = g.h;
      }
      const k = Math.min(1, dt * 14);
      this.pitch += (g.pitch - this.pitch) * k;
      this.roll += (g.roll - this.roll) * k;
    } else {
      this.airTime += dt;
      this.vy -= G * dt;
      this.y += this.vy * dt;
      if (this.y <= g.h) {
        const hPrev = this._h(world, ox, oz, this.yaw);
        const rate = Math.min(maxUp, (g.h - hPrev) / dt);
        const impact = Math.max(0, rate - this.vy);
        const upside = this._upsideDown();
        this.y = g.h;
        this._settle(upside);
        if (!this.landReported && this.airTime > 0.35) {
          this.landReported = true;
          this.events.push({ type: 'land', impact, airTime: this.airTime, tricks: this.tricksThisAir, upside });
          if (this.airTime > 1) this.mudDrag = 4;
        }
        this.susV -= impact * 0.55;
        if (upside) {
          this.flipped = 1.0;
          this.grounded = true;
          this.vy = 0;
          this.events.push({ type: 'flipped' });
        } else if (impact > 7 && this.bounces > 0) {
          this.bounces--;
          this.vy = rate + impact * st.bounce;   // big bouncy tyres
        } else {
          this.grounded = true;
          this.vy = rate;
        }
      } else {
        // nose follows the arc a little, roll levels out
        const tp = clamp(Math.atan2(this.vy, sp + 8) * 0.5, -0.45, 0.45);
        this.pitch += (tp - this.pitch) * Math.min(1, dt * 3);
        this.roll += (0 - this.roll) * Math.min(1, dt * 4);
      }
    }
    this.heightAbove = Math.max(0, this.y - g.h);

    // --- tricks: spin toward targets; hurry up if the ground is coming
    let rate = TRICK_RATE * 2;
    if (!this.grounded) {
      const tti = (this.vy + Math.sqrt(this.vy * this.vy + 2 * G * this.heightAbove)) / G;
      let rem = 0;
      for (const a of AXES) rem = Math.max(rem, Math.abs(this.target[a] - this.cur[a]));
      rate = clamp(rem / Math.max(0.06, tti - 0.12), TRICK_RATE, TRICK_RATE * 3.5);
    }
    for (const a of AXES) {
      const r = (this.grounded && a === 'yaw' && this.flipped <= 0 ? TRICK_RATE * 0.8 : rate) * dt;
      const d = this.target[a] - this.cur[a];
      this.cur[a] += Math.abs(d) <= r ? d : Math.sign(d) * r;
    }
    if (this.grounded && this.flipped <= 0) {
      // keep the numbers small once a trick is finished
      for (const a of AXES) {
        if (this.cur[a] === this.target[a] && this.cur[a] !== 0) { this.cur[a] = 0; this.target[a] = 0; }
      }
    }

    // --- suspension spring (visual body bounce)
    this.susV += (-130 * this.susY - 11 * this.susV) * dt;
    this.susY = clamp(this.susY + this.susV * dt, -0.6, 0.5);
    this.wheelSpin += (f / R) * dt;
  }

  kick(v) { this.susV += v; }

  syncVisual(dt) {
    const m = this.model;
    _e.set(-this.pitch, this.yaw, this.roll);
    _up.set(0, 1, 0).applyEuler(_e);
    m.root.position.set(this.x + _up.x * CM, this.y + _up.y * CM, this.z + _up.z * CM);
    m.root.rotation.set(-(this.pitch + this.cur.pitch), this.yaw + this.cur.yaw, this.roll + this.cur.roll);
    m.chassis.position.y = this.susY;
    m.chassis.rotation.z = -this.steer * clamp(this.fwd / 20, -1, 1) * 0.12;
    const g = this._g;
    const tp = Math.tan(this.pitch) * WB, tr = Math.tan(this.roll) * TR;
    for (const w of m.wheels) {
      let off = -0.3;
      if (this.grounded && this.flipped <= 0) {
        const hw = w.front ? (w.side > 0 ? g.fl : g.fr) : (w.side > 0 ? g.rl : g.rr);
        const plane = this.y + (w.front ? tp : -tp) + (w.side > 0 ? tr : -tr);
        off = clamp(hw - plane, -0.35, 0.45);
      }
      w.off += (off - w.off) * Math.min(1, dt * 16);
      w.holder.position.y = R + w.off;
      w.holder.rotation.y = w.front ? this.steer * 0.42 : 0;
      w.wheel.rotation.x = this.wheelSpin;
    }
  }
}

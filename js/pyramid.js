// CarPyramid: a giant pyramid of stacked cars. It never blocks the truck.
// Any car the truck touches is knocked flying, and the cars resting on top of
// a missing car tumble down after it, so one hit sets off a chain reaction.
// All the cars are drawn with two instanced meshes, so a thousand cars is cheap.
import * as THREE from '../vendor/three.module.min.js';

const SX = 4.6, SZ = 2.3, SY = 1.4;      // spacing: along, across, up
const GRAV = 20;
const COLORS = ['#e23b3b', '#f2c230', '#3b8fe2', '#49c463', '#f08a2c', '#b05ad8', '#f4f4f4', '#30c9c0'];
const STILL = 0, FLYING = 1, WRECK = 2;

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(),
  _s = new THREE.Vector3(), _e = new THREE.Euler(), _c = new THREE.Color();
const rnd = (a) => (Math.random() - 0.5) * 2 * a;

export class CarPyramid {
  // x, z = centre of the base; layers = how many cars tall
  constructor({ x, z, layers }) {
    this.x = x; this.z = z; this.layers = layers;
    this.halfX = (layers * SX) / 2; this.halfZ = (layers * SZ) / 2; this.height = layers * SY;
    this.cars = [];
    this.byKey = new Map();
    this.time = 0;
    this.touched = false;
    const key = (i, a, b) => i * 10000 + a * 100 + b;
    for (let i = 0; i < layers; i++) {
      const n = layers - i;
      for (let a = 0; a < n; a++) for (let b = 0; b < n; b++) {
        const car = {
          i, a, b,
          hx: x + (a - (n - 1) / 2) * SX, hy: i * SY + 0.7, hz: z + (b - (n - 1) / 2) * SZ,
          color: COLORS[(i * 7 + a * 3 + b * 5) % COLORS.length],
          above: [],
        };
        this.byKey.set(key(i, a, b), car);
        this.cars.push(car);
      }
    }
    // each car holds up the (up to four) cars resting on it in the next layer
    for (const car of this.cars) {
      for (let da = -1; da <= 0; da++) for (let db = -1; db <= 0; db++) {
        const up = this.byKey.get(key(car.i + 1, car.a + da, car.b + db));
        if (up && car.a + da >= 0 && car.b + db >= 0) car.above.push(up);
      }
    }

    const n = this.cars.length;
    const bodyGeo = new THREE.BoxGeometry(4.3, 0.75, 2.0).translate(0, -0.15, 0);
    const cabGeo = new THREE.BoxGeometry(2.2, 0.5, 1.8).translate(-0.2, 0.45, 0);
    this.body = new THREE.InstancedMesh(bodyGeo, new THREE.MeshLambertMaterial(), n);
    this.cab = new THREE.InstancedMesh(cabGeo, new THREE.MeshLambertMaterial({ color: '#bfe9ff' }), n);
    this.body.frustumCulled = false; this.cab.frustumCulled = false;
    this.body.castShadow = true;
    this.cars.forEach((car, idx) => { car.idx = idx; this.body.setColorAt(idx, _c.set(car.color)); });
    this.group = new THREE.Group();
    this.group.add(this.body, this.cab);
    this.reset();
  }

  reset() {
    this.touched = false;
    for (const car of this.cars) {
      car.state = STILL;
      car.x = car.hx; car.y = car.hy; car.z = car.hz;
      car.vx = car.vy = car.vz = 0;
      car.rx = car.ry = car.rz = 0;
      car.wx = car.wy = car.wz = 0;
      car.fallAt = Infinity;
      car.squash = 1;
      this._write(car);
    }
    this._flush();
  }

  _write(car) {
    _e.set(car.rx, car.ry, car.rz);
    _q.setFromEuler(_e);
    _m.compose(_p.set(car.x, car.y, car.z), _q, _s.set(1, car.squash, 1));
    this.body.setMatrixAt(car.idx, _m);
    this.cab.setMatrixAt(car.idx, _m);
  }

  _flush() {
    this.body.instanceMatrix.needsUpdate = true;
    this.cab.instanceMatrix.needsUpdate = true;
  }

  _launch(car, vx, vy, vz, spin) {
    car.state = FLYING;
    car.vx = vx; car.vy = vy; car.vz = vz;
    car.wx = rnd(spin); car.wy = rnd(spin); car.wz = rnd(spin);
    // the cars resting on this one lose their support a moment later
    for (const up of car.above) {
      if (up.state === STILL) up.fallAt = Math.min(up.fallAt, this.time + 0.08 + Math.random() * 0.22);
    }
  }

  // Returns null, or { count, points, first } for cars the truck smashed this frame.
  update(dt, truck) {
    this.time += dt;
    let result = null;
    let moved = false;

    // --- truck smashing through
    const tx = truck.x, ty = truck.y + 1.7, tz = truck.z;
    const near = Math.abs(tx - this.x) < this.halfX + 6 && Math.abs(tz - this.z) < this.halfZ + 6 && ty < this.height + 5;
    if (near) {
      for (const car of this.cars) {
        if (car.state !== STILL) continue;
        if (Math.abs(car.x - tx) > 4.6 || Math.abs(car.y - ty) > 2.7 || Math.abs(car.z - tz) > 3.3) continue;
        const k = 0.55 + Math.random() * 0.5;
        this._launch(car, truck.vx * k + rnd(9), Math.max(4, truck.vy * 0.4) + 5 + Math.random() * 12, truck.vz * k + rnd(9), 9);
        if (!result) result = { count: 0, points: [], first: !this.touched };
        result.count++;
        if (result.points.length < 3) result.points.push(car);
        this.touched = true;
      }
    }

    // --- collapse + flying cars
    for (const car of this.cars) {
      if (car.state === STILL) {
        if (car.fallAt <= this.time) {
          // tumble outwards, away from the middle of the pyramid
          const ox = car.x - this.x, oz = car.z - this.z, d = Math.hypot(ox, oz) || 1;
          const push = 2 + Math.random() * 5;
          this._launch(car, (ox / d) * push + rnd(2), Math.random() * 3, (oz / d) * push + rnd(2), 3.5);
        } else continue;
      }
      if (car.state !== FLYING) continue;
      moved = true;
      car.vy -= GRAV * dt;
      car.x += car.vx * dt; car.y += car.vy * dt; car.z += car.vz * dt;
      car.rx += car.wx * dt; car.ry += car.wy * dt; car.rz += car.wz * dt;
      if (car.y < 0.55 && car.vy < 0) {
        car.y = 0.55;
        if (car.vy < -5) {
          car.vy *= -0.3; car.vx *= 0.6; car.vz *= 0.6;
          car.wx *= 0.5; car.wy *= 0.5; car.wz *= 0.5;
        } else {
          // comes to rest as a flattened wreck
          car.state = WRECK;
          car.squash = 0.6;
          car.y = 0.45;
          car.rx = Math.round(car.rx / Math.PI) * Math.PI;
          car.rz = Math.round(car.rz / Math.PI) * Math.PI;
        }
      }
      this._write(car);
    }
    if (moved) this._flush();
    return result;
  }
}

// World: the ground height function (ramps + cars), crushable cars and
// shared scenery builders. Every ramp mesh is generated from the same height
// function the truck drives on, so what you see is what you drive.
import * as THREE from '../vendor/three.module.min.js';

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// ---- ramp profiles: height along the ramp for u in [0, len] ----------------
export const profiles = {
  // curved kicker that ends in a lip
  kicker: (len, H, back = 1.5) => (u) => {
    const L = len - back;
    return u < L ? H * (u / L) * (u / L) : H * (1 - smooth((u - L) / back));
  },
  // up, flat top, down
  tabletop: (len, H, up, down = up) => (u) =>
    u < up ? H * smooth(u / up) : u > len - down ? H * smooth((len - u) / down) : H,
  // rounded bump
  mound: (len, H) => (u) => H * 0.5 * (1 - Math.cos((u / len) * Math.PI * 2)),
};

class Feature {
  constructor(o) {
    Object.assign(this, { margin: 1.5, color: '#9a6a3c' }, o);
    this.s = Math.sin(this.yaw); this.c = Math.cos(this.yaw);
  }
  local(x, z) {
    const dx = x - this.x, dz = z - this.z;
    return [dx * this.s + dz * this.c, dx * this.c - dz * this.s];
  }
  heightLocal(u, v) {
    if (u < 0 || u > this.len) return 0;
    const side = (this.wid / 2 - Math.abs(v)) / this.margin;
    if (side <= 0) return 0;
    return this.profile(u) * smooth(side);
  }
  heightAt(x, z) {
    const dx = x - this.x, dz = z - this.z;
    return this.heightLocal(dx * this.s + dz * this.c, dx * this.c - dz * this.s);
  }
  buildMesh() {
    const w = this.wid / 2, m = this.margin;
    const vs = [-w, -w + m * 0.5, -w + m, 0, w - m, w - m * 0.5, w];
    const nu = Math.max(8, Math.ceil(this.len / 0.6));
    const pos = [], idx = [];
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * this.len;
      for (const v of vs) {
        const y = this.heightLocal(u, v);
        pos.push(this.x + u * this.s + v * this.c, y + 0.03, this.z + u * this.c - v * this.s);
      }
    }
    const n = vs.length;
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < n - 1; j++) {
        const a = i * n + j, b = a + 1, c2 = a + n, d = c2 + 1;
        idx.push(a, b, c2, b, d, c2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      color: this.color, roughness: 0.85, side: THREE.DoubleSide,
    }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    return mesh;
  }
}

// ---- crushable cars --------------------------------------------------------
const CAR_COLORS = ['#e23b3b', '#f2c230', '#3b8fe2', '#49c463', '#f08a2c', '#b05ad8', '#f4f4f4', '#30c9c0'];
const CAR_TYPES = {
  car: { len: 4.3, wid: 2.0, h: 1.35 },
  bus: { len: 9.5, wid: 2.7, h: 2.7 },
};
let carGeo = null;
function carGeos() {
  if (!carGeo) {
    carGeo = {
      box: new THREE.BoxGeometry(1, 1, 1),
      wheel: new THREE.CylinderGeometry(0.38, 0.38, 0.3, 8).rotateZ(Math.PI / 2),
      glass: new THREE.MeshStandardMaterial({ color: '#bfe9ff', roughness: 0.2, flatShading: true }),
      dark: new THREE.MeshStandardMaterial({ color: '#22242a', roughness: 0.8, flatShading: true }),
      smashed: new THREE.MeshStandardMaterial({ color: '#39424a', roughness: 0.9, flatShading: true }),
    };
  }
  return carGeo;
}

class Car {
  constructor(o, index) {
    this.type = o.type || 'car';
    const t = CAR_TYPES[this.type];
    this.len = t.len; this.wid = t.wid; this.h = t.h;
    this.x = o.x; this.z = o.z; this.yaw = o.yaw || 0;
    this.s = Math.sin(this.yaw); this.c = Math.cos(this.yaw);
    this.on = o.on || [];
    this.color = o.color || (this.type === 'bus' ? '#ffc21a' : CAR_COLORS[index % CAR_COLORS.length]);
    this.base = 0;
    this.curH = this.h;
    this.crushed = false;
    this.tilt = 0;
    this.buildMesh();
  }
  buildMesh() {
    const G = carGeos();
    const g = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({ color: this.color, roughness: 0.5, flatShading: true });
    const box = (mat, sx, sy, sz, x, y, z) => {
      const m = new THREE.Mesh(G.box, mat);
      m.scale.set(sx, sy, sz); m.position.set(x, y, z);
      m.castShadow = true; m.receiveShadow = true;
      g.add(m); return m;
    };
    const { len, wid, h } = this;
    this.glass = [];
    if (this.type === 'bus') {
      box(paint, wid, h - 0.4, len, 0, 0.4 + (h - 0.4) / 2, 0);
      this.glass.push(box(G.glass, wid + 0.04, 0.7, len - 1.2, 0, h - 0.85, 0));
      this.glass.push(box(G.glass, wid - 0.4, 0.8, 0.1, 0, h - 0.9, len / 2));
    } else {
      box(paint, wid, 0.6, len, 0, 0.65, 0);
      box(paint, wid - 0.2, 0.5, len * 0.5, 0, 1.1, -0.2);
      this.glass.push(box(G.glass, wid - 0.16, 0.36, len * 0.5 + 0.06, 0, 1.1, -0.2));
      this.glass.push(box(G.glass, wid - 0.4, 0.4, len * 0.5 + 0.14, 0, 1.08, -0.2));
    }
    const wz = len / 2 - 0.9;
    for (const x of [1, -1]) for (const z of [1, -1]) {
      const w = new THREE.Mesh(G.wheel, G.dark);
      w.position.set(x * (wid / 2 - 0.1), 0.38, z * wz);
      g.add(w);
    }
    g.position.set(this.x, 0, this.z);
    g.rotation.y = this.yaw;
    this.mesh = g;
  }
  heightAt(x, z) {
    const dx = x - this.x, dz = z - this.z;
    const u = Math.abs(dx * this.s + dz * this.c) - this.len / 2;
    const v = Math.abs(dx * this.c - dz * this.s) - this.wid / 2;
    const d = Math.max(u, v);
    if (d >= 0.7) return 0;
    const top = this.base + this.curH;
    return d <= 0 ? top : top * smooth(1 - d / 0.7);
  }
  touches(t) {
    const dx = t.x - this.x, dz = t.z - this.z;
    const u = Math.abs(dx * this.s + dz * this.c) - this.len / 2;
    const v = Math.abs(dx * this.c - dz * this.s) - this.wid / 2;
    if (u > 1.7 || v > 1.7) return false;
    const top = this.base + this.curH;
    return t.y < top + 0.7 && t.y > this.base - 0.7;
  }
  crush() {
    this.crushed = true;
    this.tilt = (Math.random() - 0.5) * 0.16;
    const G = carGeos();
    for (const m of this.glass) m.material = G.smashed;
  }
  restore() {
    this.crushed = false;
    this.curH = this.h;
    this.tilt = 0;
    const G = carGeos();
    for (const m of this.glass) m.material = G.glass;
  }
  update(dt) {
    let base = 0;
    for (const o of this.on) base = Math.max(base, o.base + o.curH);
    this.base = base;
    const targetH = this.crushed ? this.h * 0.3 : this.h;
    this.curH += (targetH - this.curH) * Math.min(1, dt * 22);
    const k = this.curH / this.h;
    const m = this.mesh;
    m.position.y += (base - m.position.y) * Math.min(1, dt * 14);
    m.scale.set(1 + (1 - k) * 0.22, k, 1 + (1 - k) * 0.08);
    m.rotation.z = this.tilt * (1 - k) * 1.4;
  }
}

// ---- the world -------------------------------------------------------------
export class World {
  constructor() {
    this.group = new THREE.Group();
    this.features = [];
    this.cars = [];
    this.bounds = { minX: -50, maxX: 50, minZ: -50, maxZ: 50 };
    this.crowds = [];
    this.cheerT = 0;
    this.time = 0;
    this.carHits = 0;      // counts height samples that landed on a car
  }

  heightAt(x, z) {
    let h = 0;
    const fs = this.features, cs = this.cars;
    for (let i = 0; i < fs.length; i++) { const v = fs[i].heightAt(x, z); if (v > h) h = v; }
    for (let i = 0; i < cs.length; i++) { const v = cs[i].heightAt(x, z); if (v > h) { h = v; this.carHits++; } }
    return h;
  }

  addRamp(o) {
    const f = new Feature(o);
    this.features.push(f);
    this.group.add(f.buildMesh());
    return f;
  }

  addCar(o) {
    const car = new Car(o, this.cars.length);
    this.cars.push(car);
    this.group.add(car.mesh);
    for (const c of this.cars) c.update(1);
    return car;
  }

  resetCars() { for (const c of this.cars) c.restore(); }

  // returns the list of cars crushed this frame
  update(dt, truck) {
    this.time += dt;
    let crushed = null;
    for (const car of this.cars) {
      if (!car.crushed && truck && truck.flipped <= 0 && car.touches(truck)) {
        car.crush();
        (crushed || (crushed = [])).push(car);
      }
      car.update(dt);
    }
    // crowd hops when cheering
    if (this.cheerT > 0) this.cheerT -= dt;
    const hop = this.cheerT > 0 ? Math.abs(Math.sin(this.time * 14)) * 0.5 : 0;
    for (const c of this.crowds) c.position.y = hop;
    return crushed;
  }

  cheer() { this.cheerT = 1.6; }

  // ---- scenery ------------------------------------------------------------
  addGround(w, d, cx = 0, cz = 0) {
    const tex = mudTexture();
    tex.repeat.set(w / 28, d / 28);
    const mud = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.0 }),
    );
    mud.rotation.x = -Math.PI / 2;
    mud.position.set(cx, 0, cz);
    mud.receiveShadow = true;
    this.group.add(mud);
    const grass = new THREE.Mesh(
      new THREE.PlaneGeometry(4000, 4000),
      new THREE.MeshLambertMaterial({ color: '#6cc04a' }),
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.set(cx, -0.15, cz);
    this.group.add(grass);
    // shiny wet puddles
    const pm = new THREE.MeshStandardMaterial({ color: '#4a2f1a', roughness: 0.08, metalness: 0.1 });
    const pg = new THREE.CircleGeometry(1, 9);
    for (let i = 0; i < 22; i++) {
      const p = new THREE.Mesh(pg, pm);
      p.rotation.x = -Math.PI / 2;
      p.position.set(cx + (rand(i * 3.1) - 0.5) * w * 0.9, 0.02, cz + (rand(i * 7.7 + 2) - 0.5) * d * 0.9);
      p.scale.set(1.5 + rand(i) * 3, 1 + rand(i + 9) * 2, 1);
      p.rotation.z = rand(i + 4) * 3;
      p.receiveShadow = true;
      this.group.add(p);
    }
  }

  addBox(sx, sy, sz, x, y, z, color, yaw = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, y, z); m.rotation.y = yaw;
    m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  // a wall with a coloured stripe
  addWall(x1, z1, x2, z2, h = 3) {
    const len = Math.hypot(x2 - x1, z2 - z1) + 1;
    const yaw = Math.atan2(x2 - x1, z2 - z1);
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    this.addBox(1, h, len, cx, h / 2, cz, '#f4f1e6', yaw);
    this.addBox(1.1, h * 0.3, len, cx, h * 0.8, cz, '#e8412f', yaw);
  }

  // stepped stands full of a blocky crowd. (x,z) = centre of the front edge,
  // yaw = direction the stands face.
  addStands(x, z, len, yaw, rows = 5) {
    const s = Math.sin(yaw), c = Math.cos(yaw);
    const people = [];
    for (let r = 0; r < rows; r++) {
      const back = 2 + r * 2.4, y = 3 + r * 1.6;
      this.addBox(len, y, 2.4, x - s * back, y / 2, z - c * back, r % 2 ? '#5b6f8f' : '#6d83a6', yaw);
      const count = Math.floor(len / 1.3);
      for (let i = 0; i < count; i++) {
        if (rand(i * 1.37 + r * 91.7 + x + z) < 0.15) continue;
        const along = -len / 2 + 0.8 + i * 1.3;
        people.push([x - s * back + c * along, y, z - c * back - s * along]);
      }
    }
    const geo = new THREE.BoxGeometry(0.7, 1.2, 0.6);
    geo.translate(0, 0.6, 0);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial(), people.length);
    const m4 = new THREE.Matrix4(), col = new THREE.Color();
    const shirts = ['#ff5a5a', '#ffd23c', '#4aa8ff', '#5ad16a', '#ff8ad0', '#ffffff', '#ff9a3c', '#9a7bff'];
    people.forEach((p, i) => {
      m4.makeTranslation(p[0], p[1], p[2]);
      mesh.setMatrixAt(i, m4);
      mesh.setColorAt(i, col.set(shirts[Math.floor(rand(i * 5.3 + p[0]) * shirts.length)]));
    });
    mesh.frustumCulled = false;
    this.group.add(mesh);
    this.crowds.push(mesh);
  }

  dispose() {
    this.group.traverse((o) => {
      if (o.geometry && o.geometry !== carGeos().box && o.geometry !== carGeos().wheel) o.geometry.dispose();
    });
  }
}

function rand(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function mudTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const g = cv.getContext('2d');
  g.fillStyle = '#7a4e2b';
  g.fillRect(0, 0, 256, 256);
  const shades = ['#6b4224', '#86582f', '#5d3a1f', '#8f6238', '#704627'];
  for (let i = 0; i < 90; i++) {
    g.fillStyle = shades[i % shades.length];
    g.globalAlpha = 0.5;
    const x = rand(i) * 256, y = rand(i + 50) * 256, r = 8 + rand(i + 99) * 26;
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
      g.beginPath();
      g.ellipse(x + ox, y + oy, r, r * 0.6, rand(i + 7) * 3, 0, Math.PI * 2);
      g.fill();
    }
  }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

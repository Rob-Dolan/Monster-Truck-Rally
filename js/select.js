// Truck selection screen: every truck in the config, big and slowly rotating.
import * as THREE from '../vendor/three.module.min.js';
import { buildTruckModel } from './truck.js';

const SPACING = 9;
const FOV = 32;

export class SelectScreen {
  constructor(trucks) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#4fb4ff');
    this.camera = new THREE.PerspectiveCamera(FOV, 1, 1, 300);
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#5a6fa8', 1.6));
    const sun = new THREE.DirectionalLight('#fff6e0', 2.4);
    sun.position.set(6, 12, 10);
    this.scene.add(sun);

    this.items = [];
    this.selected = -1;
    this.time = 0;
    const n = trucks.length;
    const padGeo = new THREE.CylinderGeometry(4.1, 4.5, 0.6, 24);
    trucks.forEach((cfg, i) => {
      const x = (i - (n - 1) / 2) * SPACING;
      const pad = new THREE.Mesh(padGeo, new THREE.MeshLambertMaterial({ color: '#27406e' }));
      pad.position.set(x, -0.3, 0);
      this.scene.add(pad);
      const model = buildTruckModel(cfg);
      const holder = new THREE.Group();
      holder.position.set(x, 0, 0);
      model.root.position.y = 1.7;       // model pivots around its middle
      holder.add(model.root);
      holder.rotation.y = -0.6 + i * 0.5;
      this.scene.add(holder);
      this.items.push({ holder, pad, model, x, hop: 0, scale: 1 });
    });
    this.halfW = ((n - 1) / 2) * SPACING + 5;
  }

  // Fit all trucks on screen; returns each truck's screen x (0..1) and cell width.
  layout(w, h) {
    const aspect = w / h;
    const t = Math.tan((FOV * Math.PI) / 360);
    const d = Math.max(this.halfW / (t * aspect), 9.5 / t);
    const cam = this.camera;
    cam.aspect = aspect;
    cam.position.set(0, 7, d);
    cam.lookAt(0, 2.4, 0);
    // slide the picture up so the trucks sit above the mode buttons
    cam.setViewOffset(w, h, 0, h * 0.19, w, h);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const v = new THREE.Vector3();
    const xs = this.items.map((it) => (v.set(it.x, 2, 0).project(cam).x + 1) / 2);
    const width = this.items.length > 1 ? Math.abs(xs[1] - xs[0]) * 0.96 : 0.5;
    return { xs, width };
  }

  setSelected(i) {
    this.selected = i;
    if (i >= 0) this.items[i].hop = 1;
    this.items.forEach((it, j) => {
      it.pad.material.color.set(j === i ? '#ffe14d' : '#27406e');
    });
  }

  update(dt) {
    this.time += dt;
    this.items.forEach((it, i) => {
      const sel = i === this.selected;
      it.holder.rotation.y += dt * (sel ? 1.6 : 0.6);
      const target = this.selected < 0 ? 1 : sel ? 1.12 : 0.88;
      it.scale += (target - it.scale) * Math.min(1, dt * 8);
      it.holder.scale.setScalar(it.scale);
      it.hop = Math.max(0, it.hop - dt * 2.2);
      const bob = sel ? Math.abs(Math.sin(this.time * 5)) * 0.35 : 0;
      it.holder.position.y = Math.sin(it.hop * Math.PI) * 2.2 + bob;
      for (const w of it.model.wheels) w.wheel.rotation.x += dt * (sel ? 6 : 0);
    });
  }
}

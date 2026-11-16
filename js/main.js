// Main: renderer, game loop and the tiny state machine (select <-> play).
import * as THREE from '../vendor/three.module.min.js';
import { TRUCKS } from './trucks.config.js';
import { Truck } from './truck.js';
import { FollowCam } from './camera.js';
import { input, initInput } from './input.js';
import { ui } from './ui.js';
import { audio } from './audio.js';
import { Particles } from './particles.js';
import { SelectScreen } from './select.js';
import { buildArena } from './modes/arena.js';
import { buildMegaRamp } from './modes/megaramp.js';

const MODES = { arena: buildArena, mega: buildMegaRamp };
const SKY = '#8fd3ff';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const camera = new THREE.PerspectiveCamera(55, 1, 1, 3000);
const followCam = new FollowCam(camera);
const select = new SelectScreen(TRUCKS);

let screen = 'select';
let truckIndex = -1;
let game = null;          // everything for the current play session
let celebrateCooldown = 0;
const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse)');

// ------------------------------------------------------------- set up ----
function startGame(modeId) {
  endGame();
  const mode = MODES[modeId]();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, ...(mode.fog || [180, 600]));
  scene.add(new THREE.HemisphereLight('#ffffff', '#9a7a55', 1.5));
  const sun = new THREE.DirectionalLight('#fff3dc', 2.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 220;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.4;
  scene.add(sun, sun.target);

  const truck = new Truck(TRUCKS[truckIndex]);
  const particles = new Particles();
  scene.add(mode.world.group, truck.object, particles.mesh);

  game = { modeId, mode, world: mode.world, scene, sun, truck, particles };
  placeTruck();
  screen = 'play';
  ui.showHud(modeId);
}

function endGame() {
  if (!game) return;
  game.world.dispose();
  game = null;
}

function placeTruck() {
  const { mode, truck, world, particles } = game;
  const s = mode.start;
  world.resetCars();
  truck.reset(s.x, s.y, s.z, s.yaw);
  truck.syncVisual(1);
  followCam.update(0, truck, world, true);
  particles.clear();
  input.tricks.length = 0;
  ui.pulseAgain(false);
}

function goHome() {
  endGame();
  screen = 'select';
  ui.showSelect();
  audio.tap();
}

function celebrate() {
  if (celebrateCooldown > 0) return;
  celebrateCooldown = 1.6;
  const { truck, particles, world } = game;
  particles.confetti(truck.x, truck.y, truck.z);
  audio.cheer();
  world.cheer();
  ui.pop();
}

// --------------------------------------------------------------- loop ----
function updateGame(dt) {
  const { truck, world, particles, mode, modeId, sun } = game;
  celebrateCooldown -= dt;

  for (const t of input.tricks) truck.doTrick(t);
  input.tricks.length = 0;

  const steps = 3;
  for (let i = 0; i < steps; i++) {
    truck.step(dt / steps, input, world);
    mode.update(truck);
  }

  const crushed = world.update(dt, truck);
  if (crushed) {
    for (const car of crushed) particles.glassBurst(car.x, car.base + car.curH, car.z, car.color);
    audio.crunch();
    truck.kick(3.5);
  }

  for (const ev of truck.events) {
    if (ev.type === 'land') {
      const power = Math.min(1.5, Math.max(0.2, ev.impact / 20));
      particles.mudBurst(truck.x, truck.y, truck.z, 18 + power * 40, 5 + power * 9);
      audio.splat(power);
      const big = modeId === 'mega' ? 1.5 : 0.95;
      if (ev.airTime > big && !ev.upside) celebrate();
      if (modeId === 'mega' && ev.airTime > 1.5) ui.pulseAgain(true);
    } else if (ev.type === 'trick') audio.whoosh();
    else if (ev.type === 'donut') { audio.whoosh(); particles.mudBurst(truck.x, truck.y, truck.z, 30, 9); }
    else if (ev.type === 'unflip') audio.boing();
    else if (ev.type === 'flipped') audio.splat(0.6);
  }
  truck.events.length = 0;

  // mud flying off the back tyres
  const f = truck.fwd;
  if (truck.grounded && truck.flipped <= 0 && Math.abs(f) > 5) {
    const s = Math.sin(truck.yaw), c = Math.cos(truck.yaw);
    const dir = f > 0 ? -1 : 1;
    const n = Math.abs(f) > 16 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? 1.7 : -1.7;
      particles.mudSpray(truck.x - s * 1.9 + c * side, truck.y, truck.z - c * 1.9 - s * side,
        s * dir, c * dir, 2 + Math.abs(f) * 0.22);
    }
  }

  particles.update(dt, world);
  truck.syncVisual(dt);
  followCam.update(dt, truck, world);
  sun.position.set(truck.x + 28, truck.y + 60, truck.z + 18);
  sun.target.position.set(truck.x, truck.y, truck.z);

  audio.engine(Math.min(1.5, truck.speed / 28), input.gas, true);
}

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (portrait.matches || document.hidden) { audio.engine(0, false, false); return; }
  if (screen === 'select') {
    select.update(dt);
    audio.engine(0, false, false);
    renderer.render(select.scene, select.camera);
  } else {
    updateGame(dt);
    renderer.render(game.scene, camera);
  }
}

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const { xs, width } = select.layout(w, h);
  ui.placeTruckCells(xs, width);
}

// --------------------------------------------------------------- wire ----
ui.init({
  trucks: TRUCKS,
  onGesture: () => audio.unlock(),
  onPickTruck(i) {
    truckIndex = i;
    select.setSelected(i);
    ui.setSelected(i);
    audio.tap();
  },
  onPickMode(modeId) {
    if (truckIndex < 0) return;
    audio.tap();
    startGame(modeId);
  },
  onHome: goHome,
  onAgain() { audio.tap(); placeTruck(); },
  onReset() { audio.tap(); game.world.resetCars(); },
  onMute() { audio.setMuted(!audio.muted); ui.setMuted(audio.muted); },
});
ui.setMuted(audio.muted);
ui.setSelected(-1);
input.onFirstGesture = () => audio.unlock();
initInput(document.getElementById('hud'));
window.addEventListener('pointerdown', () => audio.unlock());

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 200));
resize();
requestAnimationFrame(frame);

// offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// handy for debugging from the console
window.__game = () => game;
window.__step = (n = 1, dt = 1 / 60) => {
  if (!game) return;
  for (let i = 0; i < n; i++) updateGame(dt);
  renderer.render(game.scene, camera);
};

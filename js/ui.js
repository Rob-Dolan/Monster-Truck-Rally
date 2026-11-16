// UI: the HTML overlay (truck picker, mode buttons, HUD buttons, pop-up text).
const $ = (id) => document.getElementById(id);

const WORDS = ['WHOA!', 'AWESOME!', 'WOW!', 'BOOM!', 'SUPER!', 'YEAH!', 'MEGA!'];
let popTimer = 0;

export const ui = {
  cells: [],

  init({ trucks, onPickTruck, onPickMode, onHome, onAgain, onReset, onMute, onGesture }) {
    const row = $('truck-row');
    trucks.forEach((t, i) => {
      const b = document.createElement('button');
      b.className = 'truck-cell';
      b.setAttribute('aria-label', t.name);
      b.innerHTML = `<span class="name"></span>`;
      b.firstChild.textContent = t.name;
      b.addEventListener('click', () => { onGesture(); onPickTruck(i); });
      row.appendChild(b);
      this.cells.push(b);
    });
    document.querySelectorAll('.mode-btn').forEach((b) => {
      b.addEventListener('click', () => { onGesture(); onPickMode(b.dataset.mode); });
    });
    $('btn-home').addEventListener('click', onHome);
    $('btn-again').addEventListener('click', onAgain);
    $('btn-reset').addEventListener('click', onReset);
    $('btn-mute').addEventListener('click', () => { onGesture(); onMute(); });
  },

  // xs: screen x (0..1) of each truck; width: fraction of the screen per truck
  placeTruckCells(xs, width) {
    this.cells.forEach((c, i) => {
      c.style.left = (xs[i] * 100).toFixed(2) + '%';
      c.style.width = (width * 100).toFixed(2) + '%';
    });
  },

  setSelected(i) {
    this.cells.forEach((c, j) => c.classList.toggle('selected', i === j));
    $('mode-row').classList.toggle('hidden', i < 0);
  },

  showSelect() {
    $('select').classList.remove('hidden');
    $('hud').classList.add('hidden');
    $('pop').classList.remove('show');
  },

  showHud(modeId) {
    $('select').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('btn-again').classList.toggle('hidden', modeId !== 'mega');
    $('btn-reset').classList.toggle('hidden', modeId !== 'arena');
    this.pulseAgain(false);
  },

  pulseAgain(on) { $('btn-again').classList.toggle('pulse', on); },

  setMuted(m) { $('btn-mute').classList.toggle('muted', m); },

  pop() {
    const el = $('pop');
    el.textContent = WORDS[(Math.random() * WORDS.length) | 0];
    el.classList.remove('show');
    void el.offsetWidth;            // restart the animation
    el.classList.add('show');
    clearTimeout(popTimer);
    popTimer = setTimeout(() => el.classList.remove('show'), 1600);
  },
};

// Input: keyboard + multi-touch on-screen buttons (which also work with a mouse).
export const input = {
  left: false, right: false, gas: false, brake: false,
  steer: 0,
  tricks: [],       // queue of trick names pressed since last frame
  onFirstGesture: null,
};

const keys = { left: false, right: false, gas: false, brake: false };
const touch = { left: 0, right: 0, gas: 0, brake: 0 };   // number of fingers on each
const KEY_HOLD = {
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', Space: 'brake',
};
const KEY_TRICK = { KeyJ: 'backflip', KeyK: 'frontflip', KeyL: 'spin', KeyI: 'cartwheel' };

function refresh() {
  for (const k of ['left', 'right', 'gas', 'brake']) input[k] = keys[k] || touch[k] > 0;
  input.steer = (input.left ? 1 : 0) - (input.right ? 1 : 0);
}

function gesture() {
  if (input.onFirstGesture) input.onFirstGesture();
}

export function initInput(hud) {
  // pointerId -> the hold button currently under that finger
  const pointers = new Map();

  window.addEventListener('keydown', (e) => {
    gesture();
    if (KEY_HOLD[e.code]) { keys[KEY_HOLD[e.code]] = true; refresh(); e.preventDefault(); }
    else if (KEY_TRICK[e.code]) { if (!e.repeat) input.tricks.push(KEY_TRICK[e.code]); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    if (KEY_HOLD[e.code]) { keys[KEY_HOLD[e.code]] = false; refresh(); }
  });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    for (const k in touch) touch[k] = 0;
    pointers.clear();
    hud.querySelectorAll('.down').forEach((el) => el.classList.remove('down'));
    refresh();
  });

  const holdAt = (x, y) => {
    const el = document.elementFromPoint(x, y);
    return el ? el.closest('[data-hold]') : null;
  };
  const setBtn = (id, el) => {
    const old = pointers.get(id);
    if (old === el) return;
    if (old) {
      touch[old.dataset.hold] = Math.max(0, touch[old.dataset.hold] - 1);
      if (!touch[old.dataset.hold]) old.classList.remove('down');
    }
    if (el) {
      touch[el.dataset.hold]++;
      el.classList.add('down');
      pointers.set(id, el);
    } else pointers.delete(id);
    refresh();
  };

  hud.addEventListener('pointerdown', (e) => {
    gesture();
    const trick = e.target.closest('[data-trick]');
    if (trick) {
      input.tricks.push(trick.dataset.trick);
      trick.classList.add('down');
      setTimeout(() => trick.classList.remove('down'), 150);
      e.preventDefault();
      return;
    }
    const hold = e.target.closest('[data-hold]');
    if (hold) {
      // let the finger slide between buttons instead of being captured by one
      try { e.target.releasePointerCapture(e.pointerId); } catch (err) { /* not captured */ }
      setBtn(e.pointerId, hold);
      e.preventDefault();
    }
  });
  window.addEventListener('pointermove', (e) => {
    if (pointers.has(e.pointerId)) {
      const el = holdAt(e.clientX, e.clientY);
      if (el) setBtn(e.pointerId, el);   // slide between steering buttons / pedals
    }
  });
  const up = (e) => { if (pointers.has(e.pointerId)) setBtn(e.pointerId, null); };
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);

  // Stop Safari from scrolling, zooming, selecting or popping up menus.
  const stop = (e) => e.preventDefault();
  document.addEventListener('touchmove', stop, { passive: false });
  document.addEventListener('gesturestart', stop);
  document.addEventListener('gesturechange', stop);
  document.addEventListener('dblclick', stop);
  document.addEventListener('contextmenu', stop);
  document.addEventListener('selectstart', stop);
}

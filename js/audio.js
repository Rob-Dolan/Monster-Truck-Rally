// Audio: everything is synthesised with the Web Audio API, so there are no
// sound files to load. Audio is unlocked on the first tap (needed on iPad).
let ctx = null, master = null, noiseBuf = null;
let engine = null;
let muted = false;
try { muted = localStorage.getItem('mr-muted') === '1'; } catch (e) { /* private mode */ }

function ensure() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.9;
  master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  // engine: two oscillators through a low-pass filter
  const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
  o1.type = 'sawtooth'; o2.type = 'square';
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
  const g = ctx.createGain(); g.gain.value = 0;
  const g2 = ctx.createGain(); g2.gain.value = 0.5;
  o1.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g); g.connect(master);
  o1.start(); o2.start();
  engine = { o1, o2, lp, g };
  return true;
}

function noise(dur, type, f0, f1, vol, q = 1, delay = 0) {
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.03, dur * 0.2));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t, Math.random()); src.stop(t + dur + 0.05);
}

function tone(type, f0, f1, dur, vol, delay = 0) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

export const audio = {
  get muted() { return muted; },
  unlock() {
    if (!ensure()) return;
    if (ctx.state !== 'running') ctx.resume();
  },
  setMuted(m) {
    muted = m;
    try { localStorage.setItem('mr-muted', m ? '1' : '0'); } catch (e) { /* ignore */ }
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.03);
  },
  // speed 0..1.5, throttle true/false, on = engine running at all
  engine(speed, throttle, on) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const f = 42 + speed * 95 + (throttle ? 14 : 0);
    engine.o1.frequency.setTargetAtTime(f, t, 0.08);
    engine.o2.frequency.setTargetAtTime(f * 0.5, t, 0.08);
    engine.lp.frequency.setTargetAtTime(260 + speed * 700 + (throttle ? 250 : 0), t, 0.1);
    engine.g.gain.setTargetAtTime(on ? (throttle ? 0.14 : 0.08) : 0, t, 0.1);
  },
  crunch() {
    if (!ctx) return;
    noise(0.28, 'bandpass', 1800, 500, 0.7, 0.8);
    noise(0.12, 'highpass', 5000, 3000, 0.35, 0.5, 0.03);   // glass tinkle
    tone('square', 110, 40, 0.2, 0.35);
  },
  splat(power = 1) {
    if (!ctx) return;
    noise(0.35, 'lowpass', 900, 150, Math.min(0.9, 0.35 + power * 0.4), 1);
    tone('sine', 120, 45, 0.3, Math.min(0.8, 0.3 + power * 0.4));
  },
  whoosh() {
    if (!ctx) return;
    noise(0.45, 'bandpass', 400, 2400, 0.4, 2);
  },
  boing() {
    if (!ctx) return;
    tone('sine', 180, 520, 0.28, 0.4);
    tone('sine', 520, 300, 0.2, 0.25, 0.28);
  },
  cheer() {
    if (!ctx) return;
    // crowd roar: layered bands of noise, plus a couple of whistles
    noise(2.0, 'bandpass', 900, 1300, 0.5, 0.6);
    noise(1.2, 'bandpass', 1200, 1000, 0.3, 0.8, 0.5);
    noise(2.0, 'bandpass', 2400, 2000, 0.2, 1.2, 0.05);
    tone('sine', 1500, 2300, 0.25, 0.08, 0.3);
    tone('sine', 1700, 2600, 0.3, 0.07, 0.8);
  },
  tap() {
    if (!ctx) return;
    tone('triangle', 500, 800, 0.1, 0.25);
  },
};

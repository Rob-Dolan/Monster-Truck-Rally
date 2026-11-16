// ---------------------------------------------------------------------------
// TRUCKS CONFIG
// Add a new truck by copying one entry, changing the id/name/colors/parts.
//
// Coordinates (in metres): +Z is the FRONT of the truck, +X is its LEFT side,
// +Y is up. y = 0 is the ground under the tyres. The body normally sits
// between y = 1.7 and y = 4.
//
// Part shapes and their `size`:
//   box    [width(x), height(y), depth(z)]
//   cyl    [radiusTop, radiusBottom, height]      (stands upright along Y)
//   cone   [radius, height]                       (points up along Y)
//   sphere [radius]
//   torus  [radius, tubeRadius]
// Optional on any part:
//   rot    [x, y, z] in radians
//   scale  [x, y, z]
//   segs   number of sides for cyl/cone (4 = pyramid)
//   mirror true  -> also adds a copy flipped to the other side of the truck
//   glow   true  -> lights up (headlights, eyes)
//
// Stats (all trucks stay easy to drive, keep values near these ranges):
//   accel 14-22, maxSpeed 22-32, bounce 0.2-0.5, turn 1.9-2.5, grip 4-7
// ---------------------------------------------------------------------------
const PI = Math.PI;

export const TRUCKS = [
  {
    id: 'boneyard',
    name: 'Boneyard',
    colors: { tire: '#19191d', hub: '#7dff3c', frame: '#4b3a6b' },
    stats: { accel: 17, maxSpeed: 26, bounce: 0.48, turn: 2.2, grip: 5 }, // the bouncy one
    parts: [
      { shape: 'box', size: [2.5, 1.0, 4.8], pos: [0, 2.3, -0.1], color: '#17171c' },
      { shape: 'box', size: [2.3, 0.95, 2.7], pos: [0, 3.25, -1.0], color: '#222229' },
      { shape: 'box', size: [2.2, 0.4, 1.7], pos: [0, 2.95, 1.25], color: '#1d1d24' },
      // windscreen + side windows (ghostly green glass)
      { shape: 'box', size: [2.0, 0.6, 0.1], pos: [0, 3.3, 0.37], color: '#9dffb0', glow: true },
      { shape: 'box', size: [0.06, 0.5, 1.6], pos: [1.16, 3.3, -0.9], color: '#9dffb0', mirror: true },
      // slime-green stripes
      { shape: 'box', size: [0.06, 0.3, 4.4], pos: [1.26, 2.45, -0.1], color: '#5dff2e', mirror: true },
      { shape: 'box', size: [0.06, 0.16, 3.4], pos: [1.26, 2.1, -0.5], color: '#a04dff', mirror: true },
      // red glowing headlights
      { shape: 'sphere', size: [0.22], pos: [0.8, 2.45, 2.3], color: '#ff3020', glow: true, mirror: true },
      // bumper
      { shape: 'box', size: [2.6, 0.25, 0.3], pos: [0, 1.9, 2.4], color: '#8a8a95' },
      // tombstone on the roof
      { shape: 'box', size: [1.0, 0.8, 0.28], pos: [0, 4.1, -1.9], color: '#9aa0a8' },
      { shape: 'cyl', size: [0.5, 0.5, 0.28], pos: [0, 4.5, -1.9], rot: [PI / 2, 0, 0], color: '#9aa0a8', segs: 10 },
      { shape: 'box', size: [0.5, 0.1, 0.3], pos: [0, 4.35, -1.89], color: '#5c6068' },
      { shape: 'box', size: [0.1, 0.5, 0.3], pos: [0, 4.3, -1.89], color: '#5c6068' },
      // little ghost-flame exhausts
      { shape: 'cone', size: [0.22, 0.9], pos: [1.0, 3.5, 1.3], color: '#5dff2e', glow: true, mirror: true, segs: 5 },
    ],
  },
  {
    id: 'bigbull',
    name: 'Big Bull',
    colors: { tire: '#1d1a19', hub: '#ffd23c', frame: '#7a2a12' },
    stats: { accel: 15, maxSpeed: 24, bounce: 0.28, turn: 2.0, grip: 6 }, // the heavy one
    parts: [
      { shape: 'box', size: [2.6, 1.2, 4.6], pos: [0, 2.4, -0.2], color: '#ff7a14' },
      { shape: 'box', size: [2.3, 0.85, 2.0], pos: [0, 3.4, -0.7], color: '#e65f08' },
      { shape: 'box', size: [2.0, 0.55, 0.1], pos: [0, 3.4, 0.33], color: '#bfe8ff' },
      { shape: 'box', size: [0.06, 0.5, 1.3], pos: [1.16, 3.4, -0.7], color: '#bfe8ff', mirror: true },
      // bull head
      { shape: 'box', size: [1.9, 1.3, 1.0], pos: [0, 2.75, 2.5], color: '#e65f08' },
      { shape: 'box', size: [1.3, 0.75, 0.6], pos: [0, 2.35, 3.2], color: '#f6c890' },
      { shape: 'sphere', size: [0.13], pos: [0.3, 2.45, 3.5], color: '#3a1a0a', mirror: true },
      { shape: 'torus', size: [0.3, 0.07], pos: [0, 2.05, 3.5], color: '#ffd23c' },
      // angry eyes
      { shape: 'sphere', size: [0.26], pos: [0.55, 3.05, 2.95], color: '#ffffff', mirror: true },
      { shape: 'sphere', size: [0.14], pos: [0.55, 3.03, 3.15], color: '#111111', mirror: true },
      { shape: 'box', size: [0.7, 0.14, 0.2], pos: [0.55, 3.36, 3.02], rot: [0, 0, -0.35], color: '#7a2a12', mirror: true },
      // horns
      { shape: 'cyl', size: [0.2, 0.3, 0.9], pos: [1.3, 3.35, 2.4], rot: [0, 0, -PI / 2], color: '#fff3d6', mirror: true, segs: 7 },
      { shape: 'cone', size: [0.2, 1.1], pos: [1.95, 3.8, 2.4], rot: [0, 0, -0.25], color: '#fff3d6', mirror: true, segs: 7 },
      // ears
      { shape: 'cone', size: [0.25, 0.5], pos: [1.05, 2.9, 2.2], rot: [0, 0, -1.3], color: '#c94f05', mirror: true, segs: 4 },
      // tail
      { shape: 'cyl', size: [0.07, 0.07, 1.3], pos: [0, 3.0, -2.8], rot: [0.9, 0, 0], color: '#7a2a12', segs: 5 },
      { shape: 'sphere', size: [0.25], pos: [0, 3.45, -3.3], color: '#3a1a0a' },
    ],
  },
  {
    id: 'chomper',
    name: 'Chomper',
    colors: { tire: '#161a20', hub: '#ffffff', frame: '#0c3f7a' },
    stats: { accel: 20, maxSpeed: 30, bounce: 0.36, turn: 2.3, grip: 5 }, // the fast one
    parts: [
      { shape: 'box', size: [2.5, 1.0, 4.6], pos: [0, 2.75, -0.3], color: '#1e7fe0' },
      { shape: 'box', size: [2.4, 0.5, 4.4], pos: [0, 2.0, -0.3], color: '#f2f7ff' },
      { shape: 'box', size: [2.0, 0.5, 2.4], pos: [0, 3.4, -0.6], color: '#1a6fc7' },
      // pointy nose
      { shape: 'cone', size: [1.72, 2.1], pos: [0, 2.78, 3.03], rot: [PI / 2, 0, 0], scale: [1, 1, 0.42], color: '#1e7fe0', segs: 4 },
      // mouth + teeth
      { shape: 'box', size: [2.1, 0.12, 1.5], pos: [0, 2.22, 2.6], color: '#c2263a' },
      { shape: 'cone', size: [0.16, 0.42], pos: [0.95, 2.02, 2.15], rot: [PI, 0, 0], color: '#ffffff', mirror: true, segs: 4 },
      { shape: 'cone', size: [0.16, 0.42], pos: [0.75, 2.02, 2.6], rot: [PI, 0, 0], color: '#ffffff', mirror: true, segs: 4 },
      { shape: 'cone', size: [0.16, 0.42], pos: [0.5, 2.02, 3.0], rot: [PI, 0, 0], color: '#ffffff', mirror: true, segs: 4 },
      { shape: 'cone', size: [0.16, 0.42], pos: [0.22, 2.02, 3.3], rot: [PI, 0, 0], color: '#ffffff', mirror: true, segs: 4 },
      // eyes
      { shape: 'sphere', size: [0.26], pos: [1.12, 3.0, 2.2], color: '#ffffff', mirror: true },
      { shape: 'sphere', size: [0.14], pos: [1.3, 3.0, 2.3], color: '#111111', mirror: true },
      // gills
      { shape: 'box', size: [0.06, 0.6, 0.12], pos: [1.26, 2.8, 1.3], color: '#0c3f7a', mirror: true },
      { shape: 'box', size: [0.06, 0.6, 0.12], pos: [1.26, 2.8, 1.0], color: '#0c3f7a', mirror: true },
      { shape: 'box', size: [0.06, 0.6, 0.12], pos: [1.26, 2.8, 0.7], color: '#0c3f7a', mirror: true },
      // dorsal fin
      { shape: 'cone', size: [1.0, 1.8], pos: [0, 4.4, -0.8], rot: [-0.35, 0, 0], scale: [0.18, 1, 1], color: '#155fae', segs: 4 },
      // side fins
      { shape: 'cone', size: [0.6, 1.3], pos: [1.7, 2.3, 0.2], rot: [-0.4, 0, -1.9], scale: [1, 1, 0.2], color: '#155fae', mirror: true, segs: 4 },
      // tail fin
      { shape: 'cone', size: [0.8, 1.7], pos: [0, 3.6, -2.9], rot: [-0.7, 0, 0], scale: [0.18, 1, 1], color: '#155fae', segs: 4 },
      { shape: 'cone', size: [0.6, 1.1], pos: [0, 2.3, -2.9], rot: [-2.3, 0, 0], scale: [0.18, 1, 1], color: '#155fae', segs: 4 },
    ],
  },
];

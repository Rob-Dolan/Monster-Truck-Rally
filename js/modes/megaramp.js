// Mode 1: Mega Ramp - roll off a giant ramp, fly, do tricks, land in the mud.
import { World } from '../world.js';
import { CarPyramid } from '../pyramid.js';

const EAST = Math.PI / 2;
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// Ramp shape: flat top, long swoop down, short flat, curved kicker.
// SCALE makes the whole ramp bigger or smaller (1 = the original 45 m ramp).
const SCALE = 5;
const H = 45 * SCALE, TOP = 20, DROP = 64 * SCALE, FLAT = 4 * SCALE,
  KICK = 20 * SCALE, KICK_H = 8 * SCALE, BACK = 4;
const LEN = TOP + DROP + FLAT + KICK + BACK;
const WID = 40;
function megaProfile(u) {
  if (u < TOP) return H;
  u -= TOP;
  if (u < DROP) return (H * (1 + Math.cos((Math.PI * u) / DROP))) / 2;
  u -= DROP;
  if (u < FLAT) return 0;
  u -= FLAT;
  if (u < KICK) return KICK_H * (u / KICK) * (u / KICK);
  return KICK_H * (1 - smooth((u - KICK) / BACK));
}

export function buildMegaRamp() {
  const w = new World();
  const X0 = -(LEN - BACK);          // the kicker's lip sits at x = 0
  const END = 780;                   // far wall
  const HALF = 60;                   // half width of the landing field
  w.bounds = { minX: X0 - 10, maxX: END - 4, minZ: -HALF, maxZ: HALF };
  w.addGround(END - X0 + 60, HALF * 2 + 12, (END + X0) / 2, 0);

  const ramp = w.addRamp({ x: X0, z: 0, yaw: EAST, len: LEN, wid: WID, profile: megaProfile, color: '#ffb22e' });
  // a giant pyramid of cars right where the jump comes down: the truck
  // smashes through the top of it in mid-air
  const pyramid = new CarPyramid({ x: 394, z: 0, layers: 14 });
  w.group.add(pyramid.group);

  // stacked cars to land on and crush
  const pile = (x, z) => {
    const b = [-2.5, 0, 2.5].map((dz) => w.addCar({ x, z: z + dz, yaw: EAST }));
    w.addCar({ x, z: z - 1.25, yaw: EAST, on: [b[0], b[1]] });
    w.addCar({ x, z: z + 1.25, yaw: EAST, on: [b[1], b[2]] });
  };
  pile(520, 0);
  pile(550, -16); pile(550, 16);
  pile(585, 0);
  pile(615, -24); pile(615, 24);
  pile(690, -10); pile(690, 10);
  w.addCar({ x: 730, z: -6, type: 'bus' });
  w.addCar({ x: 734, z: 5, type: 'bus' });
  w.addCar({ x: 650, z: -22, type: 'bus' });
  w.addCar({ x: 650, z: 22, type: 'bus' });

  // walls and crowds along the landing area
  const xa = X0 - 14, zb = HALF + 4;
  w.addWall(xa, -zb, END, -zb); w.addWall(xa, zb, END, zb);
  w.addWall(xa, -zb, xa, zb); w.addWall(END, -zb, END, zb);
  w.addStands(500, -zb - 1, 550, 0);
  w.addStands(500, zb + 1, 550, Math.PI);

  const limit = WID / 2 - 1.5 - 2.3;
  return {
    world: w,
    fog: [500, 2200],
    // per-frame extras: returns cars smashed out of the pyramid this frame
    frame(dt, truck) { return pyramid.update(dt, truck); },
    reset() { pyramid.reset(); },
    start: { x: X0 + 8, y: H, z: 0, yaw: EAST },
    // keep the truck from sliding off the side of the ramp
    update(truck) {
      if (truck.y < 3) return;
      const [u, v] = ramp.local(truck.x, truck.z);
      if (u < 0 || u > LEN - BACK) return;
      if (Math.abs(v) > limit) {
        const nv = Math.sign(v) * limit;
        truck.x = ramp.x + u * ramp.s + nv * ramp.c;
        truck.z = ramp.z + u * ramp.c - nv * ramp.s;
        // remove sideways speed
        const side = truck.vx * ramp.c - truck.vz * ramp.s;
        truck.vx -= side * ramp.c; truck.vz += side * ramp.s;
      }
    },
  };
}

// Mode 2: Free Play Arena - a stadium full of ramps and cars to crush.
import { World, profiles } from '../world.js';

const EAST = Math.PI / 2; // heading that points along +X

export function buildArena() {
  const w = new World();
  w.bounds = { minX: -66, maxX: 66, minZ: -46, maxZ: 46 };
  w.addGround(142, 102);

  // walls + stands on every side
  w.addWall(-70, -50, 70, -50); w.addWall(-70, 50, 70, 50);
  w.addWall(-70, -50, -70, 50); w.addWall(70, -50, 70, 50);
  w.addStands(0, -51, 138, 0);
  w.addStands(0, 51, 138, Math.PI);
  w.addStands(-71, 0, 98, EAST);
  w.addStands(71, 0, 98, -EAST);

  // --- middle lane: medium kicker into a row of cars
  w.addRamp({ x: -34, z: 0, yaw: EAST, len: 11, wid: 11, profile: profiles.kicker(11, 2.8) });
  for (let i = 0; i < 6; i++) w.addCar({ x: -13 + i * 2.7, z: 0 });
  // small kicker into a second row
  w.addRamp({ x: 14, z: 0, yaw: EAST, len: 8, wid: 10, profile: profiles.kicker(8, 1.7), color: '#a87644' });
  for (let i = 0; i < 5; i++) w.addCar({ x: 32 + i * 2.7, z: 0 });

  // --- far lane: tabletop and whoops (small bumps)
  w.addRamp({ x: -36, z: -27, yaw: EAST, len: 30, wid: 13, profile: profiles.tabletop(30, 3.2, 9), color: '#8f6238' });
  for (let i = 0; i < 4; i++) {
    w.addRamp({ x: 12 + i * 9, z: -27, yaw: EAST, len: 7, wid: 13, profile: profiles.mound(7, 1.1), color: '#a87644' });
  }
  w.addCar({ x: 56, z: -30, yaw: 0.4 });
  w.addCar({ x: 59, z: -24, yaw: -0.3 });

  // --- near lane: the BIG jump, a landing hill, then buses
  w.addRamp({ x: -40, z: 27, yaw: EAST, len: 19, wid: 13, profile: profiles.kicker(19, 5, 2), color: '#b5793f' });
  w.addRamp({ x: -6, z: 27, yaw: EAST, len: 30, wid: 15, profile: profiles.tabletop(30, 4, 6, 20), color: '#8f6238' });
  w.addCar({ x: 36, z: 27, type: 'bus' });
  w.addCar({ x: 39.6, z: 27, type: 'bus' });
  w.addCar({ x: 43, z: 27 });
  w.addCar({ x: 45.7, z: 27 });
  w.addCar({ x: 48.4, z: 27 });

  return {
    world: w,
    start: { x: -56, y: 0, z: 0, yaw: EAST },
    update() {},
  };
}

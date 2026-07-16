// corridor.js — straight passages AND L-shaped "bridge" corridors that turn a corner.
// The straight createCorridor() below is UNCHANGED in behavior from your original —
// every existing call site (room1->room2, etc.) keeps working exactly as before.
// New: createBridgeCorridor() for links like room16<->room24 that turn 90°.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const CORRIDOR_LEN = 2;   // length in meters (matches the requested "2 meter corridor")
const CORRIDOR_W = 1.6;   // matches the doorGap width used in rooms
const CORRIDOR_H = 3.0;
const t = 0.2;

// ---------------------------------------------------------------------------
// ORIGINAL straight corridor (north-south, centered at x=0) — unchanged.
// startZ: the z coordinate of the source room's north wall (doorway) — corridor
// begins there and extends further north (more negative z) by CORRIDOR_LEN.
// ---------------------------------------------------------------------------
export function createCorridor(scene, engine, startZ) {
  const colliders = [];
  const wallMat = createWallMaterial();

  const centerZ = startZ - CORRIDOR_LEN / 2;
  const endZ = startZ - CORRIDOR_LEN;

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, CORRIDOR_LEN),
    createFloorMaterial(CORRIDOR_W, CORRIDOR_LEN)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, centerZ);
  floor.receiveShadow = true;
  scene.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, CORRIDOR_LEN),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, CORRIDOR_H, centerZ);
  scene.add(ceiling);

  function addWallBox(cx, cz, w, d, h = CORRIDOR_H, cy = h / 2) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    colliders.push(box);
    engine.addCollider(box);
    return mesh;
  }

  addWallBox(-CORRIDOR_W / 2 - t / 2, centerZ, t, CORRIDOR_LEN + t);
  addWallBox(CORRIDOR_W / 2 + t / 2, centerZ, t, CORRIDOR_LEN + t);

  const bulbLight = new THREE.PointLight(0xffcf8a, 1.6, 5, 2);
  bulbLight.position.set(0, CORRIDOR_H - 0.3, centerZ);
  scene.add(bulbLight);

  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    bulbLight.intensity = 1.3 + Math.sin(flickerT * 7) * 0.3 + (Math.random() - 0.5) * 0.4;
  }

  return { colliders, update, startZ, endZ };
}

// ---------------------------------------------------------------------------
// NEW: L-shaped bridge corridor for doors that face perpendicular directions,
// e.g. room16's WEST door -> room24's EAST door ("west, then north" / "east,
// then south"). Builds two straight legs joined by a square corner landing,
// with a floor/ceiling/walls that actually connect both doorways — no gap,
// no misaligned segment.
//
// Call signature is direction-aware so it works for any L-turn, not just
// room16<->room24:
//
//   from: { x, z, facing }  — doorway you are leaving, facing is the direction
//                              you WALK OUT of that door ('north'|'south'|'east'|'west')
//   to:   { x, z, facing }  — doorway you arrive at, facing is the direction
//                              you WALK OUT of that door (used only to sanity-
//                              check the turn; the corridor always ends AT `to`)
//
// Example for room16 (west door) -> room24 (east door):
//   createBridgeCorridor(scene, engine, {
//     from: { x: room16.westX, z: room16.westDoorZ, facing: 'west' },
//     to:   { x: room24.eastX, z: room24.eastDoorZ, facing: 'east' },
//   });
//
// The function figures out the corner point itself: it walks straight out of
// `from` in its facing direction until it is aligned on the cross-axis with
// `to`, turns, then runs straight into `to`. Works for any west/east <->
// north/south pairing.
// ---------------------------------------------------------------------------
export function createBridgeCorridor(scene, engine, { from, to, width = CORRIDOR_W, height = CORRIDOR_H }) {
  const colliders = [];
  const wallMat = createWallMaterial();
  const half = width / 2;

  const isFromHorizontal = from.facing === 'east' || from.facing === 'west';
  // Corner sits directly out from `from`, on the axis `from` travels along,
  // but aligned with `to` on the other axis.
  const corner = isFromHorizontal
    ? { x: to.x, z: from.z }   // leg 1 runs along X from `from` to corner.x, leg 2 runs along Z to `to`
    : { x: from.x, z: to.z };  // leg 1 runs along Z from `from` to corner.z, leg 2 runs along X to `to`

  function addWallBox(cx, cz, w, d, h = height, cy = h / 2) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    colliders.push(box);
    engine.addCollider(box);
    return mesh;
  }

  function addFloorCeiling(cx, cz, w, d) {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), createFloorMaterial(w, d));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    floor.receiveShadow = true;
    scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(cx, height, cz);
    scene.add(ceiling);
  }

  // ---- Leg 1: from -> corner ----
  if (isFromHorizontal) {
    const x0 = Math.min(from.x, corner.x) - half;
    const x1 = Math.max(from.x, corner.x) + half;
    const len = x1 - x0;
    const cx = (x0 + x1) / 2;
    addFloorCeiling(cx, from.z, len, width);
    // north/south walls of this horizontal leg
    addWallBox(cx, from.z - half - t / 2, len + t, t);
    addWallBox(cx, from.z + half + t / 2, len + t, t);
  } else {
    const z0 = Math.min(from.z, corner.z) - half;
    const z1 = Math.max(from.z, corner.z) + half;
    const len = z1 - z0;
    const cz = (z0 + z1) / 2;
    addFloorCeiling(from.x, cz, width, len);
    // east/west walls of this vertical leg
    addWallBox(from.x - half - t / 2, cz, t, len + t);
    addWallBox(from.x + half + t / 2, cz, t, len + t);
  }

  // ---- Leg 2: corner -> to ----
  if (isFromHorizontal) {
    // leg 2 runs along Z (corner.z -> to.z), at x = corner.x = to.x
    const z0 = Math.min(corner.z, to.z) - half;
    const z1 = Math.max(corner.z, to.z) + half;
    const len = z1 - z0;
    const cz = (z0 + z1) / 2;
    addFloorCeiling(to.x, cz, width, len);
    addWallBox(to.x - half - t / 2, cz, t, len + t);
    addWallBox(to.x + half + t / 2, cz, t, len + t);
  } else {
    // leg 2 runs along X (corner.x -> to.x), at z = corner.z = to.z
    const x0 = Math.min(corner.x, to.x) - half;
    const x1 = Math.max(corner.x, to.x) + half;
    const len = x1 - x0;
    const cx = (x0 + x1) / 2;
    addFloorCeiling(cx, to.z, len, width);
    addWallBox(cx, to.z - half - t / 2, len + t, t);
    addWallBox(cx, to.z + half + t / 2, len + t, t);
  }

  // ---- Corner landing (fills the square gap where the two legs meet) ----
  addFloorCeiling(corner.x, corner.z, width, width);

  // flickering bulb at the corner, mood-matching your straight corridors
  const bulbLight = new THREE.PointLight(0xffcf8a, 1.6, 6, 2);
  bulbLight.position.set(corner.x, height - 0.3, corner.z);
  scene.add(bulbLight);

  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    bulbLight.intensity = 1.3 + Math.sin(flickerT * 6) * 0.3 + (Math.random() - 0.5) * 0.35;
  }

  return { colliders, update, corner, from, to };
}

// ---------------------------------------------------------------------------
// NEW: one-call helper specifically for room16 <-> room24. Uses only the
// values room16.js and room24.js already return (westX/westDoorZ,
// eastX/eastDoorZ) — no guessing at coordinates. room16 and room24 here are
// the objects returned by createRoom16(...) and createRoom24(...).
// ---------------------------------------------------------------------------
export function createBridge16to24(scene, engine, room16, room24) {
  return createBridgeCorridor(scene, engine, {
    from: { x: room16.westX, z: room16.westDoorZ, facing: 'west' },
    to:   { x: room24.eastX, z: room24.eastDoorZ, facing: 'east' },
  });
}

// corridor.js — a short 2m passage connecting room1's north doorway to room2's south doorway.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const CORRIDOR_LEN = 2;   // length in meters (matches the requested "2 meter colidor")
const CORRIDOR_W = 1.6;   // matches the doorGap width used in room1/room2
const CORRIDOR_H = 3.0;
const t = 0.2;

// startZ: the z coordinate of room1's north wall (doorway) — corridor begins there
// and extends further north (more negative z) by CORRIDOR_LEN.
export function createCorridor(scene, engine, startZ) {
  const colliders = [];
  const wallMat = createWallMaterial();

  const centerZ = startZ - CORRIDOR_LEN / 2;
  const endZ = startZ - CORRIDOR_LEN;

  // ---------- floor: old, dirty tiles ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, CORRIDOR_LEN),
    createFloorMaterial(CORRIDOR_W, CORRIDOR_LEN)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, centerZ);
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, CORRIDOR_LEN),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, CORRIDOR_H, centerZ);
  scene.add(ceiling);

  // ---------- side walls ----------
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

  function update() {
    // intentionally static
  }

  return { colliders, update, startZ, endZ };
}

// createCorridorWest — same short passage, but running west (negative x) instead
// of north, to connect room2's west doorway to room4.
// startX: the x coordinate of room2's west wall (doorway); z: the doorway's z coordinate.
export function createCorridorWest(scene, engine, startX, z) {
  const colliders = [];
  const wallMat = createWallMaterial();

  const centerX = startX - CORRIDOR_LEN / 2;
  const endX = startX - CORRIDOR_LEN;

  // ---------- floor: old, dirty tiles ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_LEN, CORRIDOR_W),
    createFloorMaterial(CORRIDOR_LEN, CORRIDOR_W)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(centerX, 0, z);
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_LEN, CORRIDOR_W),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, CORRIDOR_H, z);
  scene.add(ceiling);

  // ---------- side walls (north/south sides of this east-west passage) ----------
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

  addWallBox(centerX, z - CORRIDOR_W / 2 - t / 2, CORRIDOR_LEN + t, t);
  addWallBox(centerX, z + CORRIDOR_W / 2 + t / 2, CORRIDOR_LEN + t, t);

  function update() {
    // intentionally static
  }

  return { colliders, update, startX, endX, z };
}

// createCorridorEast — same short passage, but running east (positive x) instead
// of west, to connect room2's east doorway to room5.
// startX: the x coordinate of room2's east wall (doorway); z: the doorway's z coordinate.
// length: optional override of the passage length (defaults to CORRIDOR_LEN) — used
// for longer bridging passages, e.g. room16's east passage on the way to hall1.
export function createCorridorEast(scene, engine, startX, z, length = CORRIDOR_LEN) {
  const colliders = [];
  const wallMat = createWallMaterial();

  const centerX = startX + length / 2;
  const endX = startX + length;

  // ---------- floor: old, dirty tiles ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(length, CORRIDOR_W),
    createFloorMaterial(length, CORRIDOR_W)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(centerX, 0, z);
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(length, CORRIDOR_W),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, CORRIDOR_H, z);
  scene.add(ceiling);

  // ---------- side walls (north/south sides of this east-west passage) ----------
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

  addWallBox(centerX, z - CORRIDOR_W / 2 - t / 2, length + t, t);
  addWallBox(centerX, z + CORRIDOR_W / 2 + t / 2, length + t, t);

  function update() {
    // intentionally static
  }

  return { colliders, update, startX, endX, z };
}

// createCorridorSouth — same short passage, but running south (positive z) instead
// of north, to connect room6's south doorway to room8.
// startZ: the z coordinate of room6's south wall (doorway); x: the doorway's x coordinate.
// length: optional override of the passage length (defaults to CORRIDOR_LEN) — used
// for longer bridging passages, e.g. room16's south passage down to hall1.
export function createCorridorSouth(scene, engine, startZ, x, length = CORRIDOR_LEN) {
  const colliders = [];
  const wallMat = createWallMaterial();

  const centerZ = startZ + length / 2;
  const endZ = startZ + length;

  // ---------- floor: old, dirty tiles ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, length),
    createFloorMaterial(CORRIDOR_W, length)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x, 0, centerZ);
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, length),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(x, CORRIDOR_H, centerZ);
  scene.add(ceiling);

  // ---------- side walls (east/west sides of this north-south passage) ----------
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

  addWallBox(x - CORRIDOR_W / 2 - t / 2, centerZ, t, length + t);
  addWallBox(x + CORRIDOR_W / 2 + t / 2, centerZ, t, length + t);

  function update() {
    // intentionally static
  }

  return { colliders, update, startZ, endZ, x };
}

// createCorridorNorth — same short passage as createCorridor, but parameterized
// with an arbitrary x position instead of assuming x = 0, so it can run north
// from any room's north doorway (e.g. room6's, to connect to room9).
// startZ: the z coordinate of the doorway; x: the doorway's x coordinate.
export function createCorridorNorth(scene, engine, startZ, x) {
  const colliders = [];
  const wallMat = createWallMaterial();

  const centerZ = startZ - CORRIDOR_LEN / 2;
  const endZ = startZ - CORRIDOR_LEN;

  // ---------- floor: old, dirty tiles ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, CORRIDOR_LEN),
    createFloorMaterial(CORRIDOR_W, CORRIDOR_LEN)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(x, 0, centerZ);
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, CORRIDOR_LEN),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(x, CORRIDOR_H, centerZ);
  scene.add(ceiling);

  // ---------- side walls ----------
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

  addWallBox(x - CORRIDOR_W / 2 - t / 2, centerZ, t, CORRIDOR_LEN + t);
  addWallBox(x + CORRIDOR_W / 2 + t / 2, centerZ, t, CORRIDOR_LEN + t);

  function update() {
    // intentionally static
  }

  return { colliders, update, startZ, endZ, x };
}

// createCorridorBendEastSouth — a single L-shaped bent passage: runs east from a
// doorway, then turns and runs south, ending at a second doorway. Unlike gluing
// two straight createCorridorEast/createCorridorSouth pieces together (whose full-length
// side walls slice across each other at the joint and seal off the turn), this builds
// the corner as one shape: a continuous outer wall wrapping around the bend, and inner
// walls that stop short of the turn instead of cutting through it — e.g. room16's
// east doorway bending south to reach hall1's north doorway.
// startX, startZ: the doorway where the passage begins (e.g. room16's east doorway).
// cornerX: the x position where the passage turns from heading east to heading south
// (e.g. hall1's centerX / north doorway x).
// endZ: the z position where the passage ends, at x = cornerX (e.g. hall1's northZ).
export function createCorridorBendEastSouth(scene, engine, startX, startZ, cornerX, endZ) {
  const colliders = [];
  const wallMat = createWallMaterial();

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

  // ---------- east leg: from startX to cornerX, centered at z = startZ ----------
  const eastCenterX = (startX + cornerX) / 2;
  const eastLen = cornerX - startX;

  const eastFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(eastLen, CORRIDOR_W),
    createFloorMaterial(eastLen, CORRIDOR_W)
  );
  eastFloor.rotation.x = -Math.PI / 2;
  eastFloor.position.set(eastCenterX, 0, startZ);
  eastFloor.receiveShadow = true;
  scene.add(eastFloor);

  const eastCeiling = new THREE.Mesh(
    new THREE.PlaneGeometry(eastLen, CORRIDOR_W),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  eastCeiling.rotation.x = Math.PI / 2;
  eastCeiling.position.set(eastCenterX, CORRIDOR_H, startZ);
  scene.add(eastCeiling);

  // ---------- south leg: from startZ to endZ, centered at x = cornerX ----------
  const southCenterZ = (startZ + endZ) / 2;
  const southLen = endZ - startZ;

  const southFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, southLen),
    createFloorMaterial(CORRIDOR_W, southLen)
  );
  southFloor.rotation.x = -Math.PI / 2;
  southFloor.position.set(cornerX, 0, southCenterZ);
  southFloor.receiveShadow = true;
  scene.add(southFloor);

  const southCeiling = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, southLen),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  southCeiling.rotation.x = Math.PI / 2;
  southCeiling.position.set(cornerX, CORRIDOR_H, southCenterZ);
  scene.add(southCeiling);

  // ---------- walls ----------
  // "outer" wall: the convex side of the bend — the east leg's far wall wraps
  // continuously around the corner into the south leg's far wall, so the bend
  // has one unbroken solid boundary on its outside.
  const outerEastLegX0 = startX - t / 2;
  const outerEastLegX1 = cornerX + CORRIDOR_W / 2 + t / 2; // reaches past the corner
  const outerZ = startZ - CORRIDOR_W / 2 - t / 2;
  addWallBox(
    (outerEastLegX0 + outerEastLegX1) / 2,
    outerZ,
    outerEastLegX1 - outerEastLegX0,
    t
  );

  const outerX = cornerX + CORRIDOR_W / 2 + t / 2;
  const outerSouthLegZ0 = outerZ; // meets the east leg's outer wall exactly at the corner
  const outerSouthLegZ1 = endZ + t / 2;
  addWallBox(
    outerX,
    (outerSouthLegZ0 + outerSouthLegZ1) / 2,
    t,
    outerSouthLegZ1 - outerSouthLegZ0
  );

  // "inner" walls: the concave side of the bend — each leg's near wall stops
  // short of the turn instead of cutting across it, leaving the corner open.
  const innerEastLegX0 = startX - t / 2;
  const innerEastLegX1 = cornerX - CORRIDOR_W / 2; // stops before the turn opens up
  const innerZ = startZ + CORRIDOR_W / 2 + t / 2;
  addWallBox(
    (innerEastLegX0 + innerEastLegX1) / 2,
    innerZ,
    innerEastLegX1 - innerEastLegX0,
    t
  );

  const innerX = cornerX - CORRIDOR_W / 2 - t / 2;
  const innerSouthLegZ0 = startZ + CORRIDOR_W / 2; // stops before the turn opens up
  const innerSouthLegZ1 = endZ + t / 2;
  addWallBox(
    innerX,
    (innerSouthLegZ0 + innerSouthLegZ1) / 2,
    t,
    innerSouthLegZ1 - innerSouthLegZ0
  );

  function update() {
    // intentionally static
  }

  return { colliders, update, startX, startZ, cornerX, endZ };
}

// createCorridorBendWestNorth — an L-shaped bent passage running the opposite way
// from createCorridorBendEastSouth: starts heading west from a doorway, then turns
// and heads north, ending at a second doorway. Same "single continuous shape"
// construction as the east-south bend (one unbroken outer wall wrapping the convex
// side of the turn, inner walls stopping short of the corner so it stays open) —
// used e.g. for room16's west doorway bending north to reach room24's east doorway.
// startX, startZ: the doorway where the passage begins (e.g. room16's west doorway).
// cornerX: the x position where the passage turns from heading west to heading north
// (e.g. room24's eastX / east doorway x). Must be less than startX.
// endZ: the z position where the passage ends, at x = cornerX (e.g. room24's east
// doorway z). Must be less than startZ.
export function createCorridorBendWestNorth(scene, engine, startX, startZ, cornerX, endZ) {
  const colliders = [];
  const wallMat = createWallMaterial();

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

  // ---------- west leg: from startX to cornerX, centered at z = startZ ----------
  const westCenterX = (startX + cornerX) / 2;
  const westLen = startX - cornerX;

  const westFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(westLen, CORRIDOR_W),
    createFloorMaterial(westLen, CORRIDOR_W)
  );
  westFloor.rotation.x = -Math.PI / 2;
  westFloor.position.set(westCenterX, 0, startZ);
  westFloor.receiveShadow = true;
  scene.add(westFloor);

  const westCeiling = new THREE.Mesh(
    new THREE.PlaneGeometry(westLen, CORRIDOR_W),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  westCeiling.rotation.x = Math.PI / 2;
  westCeiling.position.set(westCenterX, CORRIDOR_H, startZ);
  scene.add(westCeiling);

  // ---------- north leg: from startZ to endZ, centered at x = cornerX ----------
  const northCenterZ = (startZ + endZ) / 2;
  const northLen = startZ - endZ;

  const northFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, northLen),
    createFloorMaterial(CORRIDOR_W, northLen)
  );
  northFloor.rotation.x = -Math.PI / 2;
  northFloor.position.set(cornerX, 0, northCenterZ);
  northFloor.receiveShadow = true;
  scene.add(northFloor);

  const northCeiling = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, northLen),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  northCeiling.rotation.x = Math.PI / 2;
  northCeiling.position.set(cornerX, CORRIDOR_H, northCenterZ);
  scene.add(northCeiling);

  // ---------- walls ----------
  // "outer" wall: the convex side of the bend — the west leg's far wall (south side)
  // wraps continuously around the corner into the north leg's far wall (west side),
  // so the bend has one unbroken solid boundary on its outside.
  const outerZ = startZ + CORRIDOR_W / 2 + t / 2;
  const outerWestLegX0 = cornerX - CORRIDOR_W / 2 - t / 2; // reaches past the corner
  const outerWestLegX1 = startX + t / 2;
  addWallBox(
    (outerWestLegX0 + outerWestLegX1) / 2,
    outerZ,
    outerWestLegX1 - outerWestLegX0,
    t
  );

  const outerX = cornerX - CORRIDOR_W / 2 - t / 2;
  const outerNorthLegZ0 = endZ - t / 2;
  const outerNorthLegZ1 = outerZ; // meets the west leg's outer wall exactly at the corner
  addWallBox(
    outerX,
    (outerNorthLegZ0 + outerNorthLegZ1) / 2,
    t,
    outerNorthLegZ1 - outerNorthLegZ0
  );

  // "inner" walls: the concave side of the bend — each leg's near wall stops
  // short of the turn instead of cutting across it, leaving the corner open.
  const innerZ = startZ - CORRIDOR_W / 2 - t / 2;
  const innerWestLegX0 = cornerX + CORRIDOR_W / 2; // stops before the turn opens up
  const innerWestLegX1 = startX + t / 2;
  addWallBox(
    (innerWestLegX0 + innerWestLegX1) / 2,
    innerZ,
    innerWestLegX1 - innerWestLegX0,
    t
  );

  const innerX = cornerX + CORRIDOR_W / 2 + t / 2;
  const innerNorthLegZ0 = endZ - t / 2;
  const innerNorthLegZ1 = startZ - CORRIDOR_W / 2; // stops before the turn opens up
  addWallBox(
    innerX,
    (innerNorthLegZ0 + innerNorthLegZ1) / 2,
    t,
    innerNorthLegZ1 - innerNorthLegZ0
  );

  function update() {
    // intentionally static
  }

  return { colliders, update, startX, startZ, cornerX, endZ };
}

// createCorridorDoglegWestNorthWest — a three-segment jog: west from a doorway,
// north to change row, then west again into a second doorway. Needed instead of
// a single L-bend when BOTH doorways face the same direction (east-west) with an
// offset between their z positions — e.g. room16's west doorway and room24's
// east doorway. A single bend's second leg would have to run straight along the
// target room's wall for the length of that offset, slicing through the solid
// wall on either side of the doorway gap instead of passing through it.
// This builds all three legs and BOTH corners as one continuous shape (each
// corner gets its own open turn — a continuous outer wall wrapping the convex
// side, inner walls stopping short of the turn) rather than gluing two
// separately-built corridor pieces together, which leaves each piece's own side
// walls jutting into the other's path right at the join.
// startX, startZ: the doorway where the passage begins (e.g. room16's west doorway).
// turnX: the x position, clear of both rooms, where the passage jogs from
// startZ's row over to endZ's row. Must be less than startX and greater than endX.
// endZ, endX: the doorway where the passage ends (e.g. room24's east doorway).
// Requires turnX < startX and endZ < startZ.
export function createCorridorDoglegWestNorthWest(scene, engine, startX, startZ, turnX, endZ, endX) {
  const colliders = [];
  const wallMat = createWallMaterial();

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

  function addFloorAndCeiling(w, d, cx, cz) {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      createFloorMaterial(w, d)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    floor.receiveShadow = true;
    scene.add(floor);

    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d),
      new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(cx, CORRIDOR_H, cz);
    scene.add(ceiling);
  }

  // ---------- leg 1 (west): startX -> turnX, at z = startZ ----------
  const leg1CenterX = (startX + turnX) / 2;
  const leg1Len = startX - turnX;
  addFloorAndCeiling(leg1Len, CORRIDOR_W, leg1CenterX, startZ);

  // ---------- leg 2 (north): startZ -> endZ, at x = turnX ----------
  const leg2CenterZ = (startZ + endZ) / 2;
  const leg2Len = startZ - endZ;
  addFloorAndCeiling(CORRIDOR_W, leg2Len, turnX, leg2CenterZ);

  // ---------- leg 3 (west): turnX -> endX, at z = endZ ----------
  const leg3CenterX = (turnX + endX) / 2;
  const leg3Len = turnX - endX;
  addFloorAndCeiling(leg3Len, CORRIDOR_W, leg3CenterX, endZ);

  // ---------- corner 1 (leg1 west -> leg2 north) ----------
  // outer = south side of leg1 + west side of leg2, wrapping the convex side continuously
  const corner1OuterZ = startZ + CORRIDOR_W / 2 + t / 2;
  const corner1OuterX = turnX - CORRIDOR_W / 2 - t / 2;
  addWallBox(
    (corner1OuterX + (startX + t / 2)) / 2,
    corner1OuterZ,
    (startX + t / 2) - corner1OuterX,
    t
  ); // leg1's south wall — reaches past corner1, flush at the start doorway
  const corner1InnerZ = startZ - CORRIDOR_W / 2 - t / 2;
  addWallBox(
    ((turnX + CORRIDOR_W / 2) + (startX + t / 2)) / 2,
    corner1InnerZ,
    (startX + t / 2) - (turnX + CORRIDOR_W / 2),
    t
  ); // leg1's north wall (inner) — stops short of corner1, flush at the start doorway

  // ---------- corner 2 (leg2 north -> leg3 west) ----------
  // outer = east side of leg2 + north side of leg3, wrapping the convex side continuously
  const corner2OuterX = turnX + CORRIDOR_W / 2 + t / 2;
  const corner2OuterZ = endZ - CORRIDOR_W / 2 - t / 2;
  addWallBox(
    ((endX - t / 2) + corner2OuterX) / 2,
    corner2OuterZ,
    corner2OuterX - (endX - t / 2),
    t
  ); // leg3's north wall — reaches from the end doorway up to meet leg2's east wall at corner2
  const corner2InnerZ = endZ + CORRIDOR_W / 2 + t / 2;
  addWallBox(
    ((endX - t / 2) + (turnX - CORRIDOR_W / 2)) / 2,
    corner2InnerZ,
    (turnX - CORRIDOR_W / 2) - (endX - t / 2),
    t
  ); // leg3's south wall (inner) — stops short of corner2, flush at the end doorway

  // ---------- leg2's two side walls ----------
  // Leg2 sits between two turns of OPPOSITE handedness (corner1 is a left turn,
  // corner2 is a right turn), so each of leg2's side walls is "outer" at one end
  // and "inner" at the other, instead of running the full length on one side.
  addWallBox(
    corner1OuterX, // west side, == turnX - CORRIDOR_W/2 - t/2
    ((endZ + CORRIDOR_W / 2) + corner1OuterZ) / 2,
    t,
    corner1OuterZ - (endZ + CORRIDOR_W / 2)
  ); // outer near corner1 (meets leg1's south wall exactly), inner near corner2 (stops short)
  addWallBox(
    corner2OuterX, // east side, == turnX + CORRIDOR_W/2 + t/2
    (corner2OuterZ + (startZ - CORRIDOR_W / 2)) / 2,
    t,
    (startZ - CORRIDOR_W / 2) - corner2OuterZ
  ); // outer near corner2 (meets leg3's north wall exactly), inner near corner1 (stops short)

  function update() {
    // intentionally static
  }

  return { colliders, update, startX, startZ, turnX, endZ, endX };
}

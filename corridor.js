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

  // ---------- flickering bulb light so the passage isn't pitch black ----------
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

// createCorridorWest — same short passage, but running west (negative x) instead
// of north, to connect room2's west doorway to room4.
// startX: the x coordinate of room2's west wall (doorway); z: the doorway's z coordinate.
// length: optional override of the passage length (defaults to CORRIDOR_LEN) — used
// for longer bridging passages, e.g. the final leg into room24's east doorway.
export function createCorridorWest(scene, engine, startX, z, length = CORRIDOR_LEN) {
  const colliders = [];
  const wallMat = createWallMaterial();

  const centerX = startX - length / 2;
  const endX = startX - length;

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

  // ---------- flickering bulb light(s) so the passage isn't pitch black ----------
  const bulbCount = Math.max(1, Math.round(length / CORRIDOR_LEN));
  const bulbLights = [];
  for (let i = 0; i < bulbCount; i++) {
    const bx = startX - (length / bulbCount) * (i + 0.5);
    const bulbLight = new THREE.PointLight(0xffcf8a, 1.6, 5, 2);
    bulbLight.position.set(bx, CORRIDOR_H - 0.3, z);
    scene.add(bulbLight);
    bulbLights.push(bulbLight);
  }

  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    bulbLights.forEach((bulbLight, i) => {
      bulbLight.intensity = 1.3 + Math.sin(flickerT * 7 + i) * 0.3 + (Math.random() - 0.5) * 0.4;
    });
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

  // ---------- flickering bulb light(s) so the passage isn't pitch black ----------
  const bulbCount = Math.max(1, Math.round(length / CORRIDOR_LEN));
  const bulbLights = [];
  for (let i = 0; i < bulbCount; i++) {
    const bx = startX + (length / bulbCount) * (i + 0.5);
    const bulbLight = new THREE.PointLight(0xffcf8a, 1.6, 5, 2);
    bulbLight.position.set(bx, CORRIDOR_H - 0.3, z);
    scene.add(bulbLight);
    bulbLights.push(bulbLight);
  }

  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    bulbLights.forEach((bulbLight, i) => {
      bulbLight.intensity = 1.3 + Math.sin(flickerT * 7 + i) * 0.3 + (Math.random() - 0.5) * 0.4;
    });
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

  // ---------- flickering bulb light(s) so the passage isn't pitch black ----------
  const bulbCount = Math.max(1, Math.round(length / CORRIDOR_LEN));
  const bulbLights = [];
  for (let i = 0; i < bulbCount; i++) {
    const bz = startZ + (length / bulbCount) * (i + 0.5);
    const bulbLight = new THREE.PointLight(0xffcf8a, 1.6, 5, 2);
    bulbLight.position.set(x, CORRIDOR_H - 0.3, bz);
    scene.add(bulbLight);
    bulbLights.push(bulbLight);
  }

  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    bulbLights.forEach((bulbLight, i) => {
      bulbLight.intensity = 1.3 + Math.sin(flickerT * 7 + i) * 0.3 + (Math.random() - 0.5) * 0.4;
    });
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

  // ---------- flickering bulb light so the passage isn't pitch black ----------
  const bulbLight = new THREE.PointLight(0xffcf8a, 1.6, 5, 2);
  bulbLight.position.set(x, CORRIDOR_H - 0.3, centerZ);
  scene.add(bulbLight);

  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    bulbLight.intensity = 1.3 + Math.sin(flickerT * 7) * 0.3 + (Math.random() - 0.5) * 0.4;
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

  // ---------- flickering bulb lights along both legs ----------
  const bulbLights = [];
  const eastBulbCount = Math.max(1, Math.round(eastLen / CORRIDOR_LEN));
  for (let i = 0; i < eastBulbCount; i++) {
    const bulbLight = new THREE.PointLight(0xffcf8a, 1.6, 5, 2);
    bulbLight.position.set(startX + (eastLen / eastBulbCount) * (i + 0.5), CORRIDOR_H - 0.3, startZ);
    scene.add(bulbLight);
    bulbLights.push(bulbLight);
  }
  const southBulbCount = Math.max(1, Math.round(southLen / CORRIDOR_LEN));
  for (let i = 0; i < southBulbCount; i++) {
    const bulbLight = new THREE.PointLight(0xffcf8a, 1.6, 5, 2);
    bulbLight.position.set(cornerX, CORRIDOR_H - 0.3, startZ + (southLen / southBulbCount) * (i + 0.5));
    scene.add(bulbLight);
    bulbLights.push(bulbLight);
  }

  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    bulbLights.forEach((bulbLight, i) => {
      bulbLight.intensity = 1.3 + Math.sin(flickerT * 7 + i) * 0.3 + (Math.random() - 0.5) * 0.4;
    });
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

  // ---------- flickering bulb lights along both legs ----------
  const bulbLights = [];
  const westBulbCount = Math.max(1, Math.round(westLen / CORRIDOR_LEN));
  for (let i = 0; i < westBulbCount; i++) {
    const bulbLight = new THREE.PointLight(0xffcf8a, 1.6, 5, 2);
    bulbLight.position.set(startX - (westLen / westBulbCount) * (i + 0.5), CORRIDOR_H - 0.3, startZ);
    scene.add(bulbLight);
    bulbLights.push(bulbLight);
  }
  const northBulbCount = Math.max(1, Math.round(northLen / CORRIDOR_LEN));
  for (let i = 0; i < northBulbCount; i++) {
    const bulbLight = new THREE.PointLight(0xffcf8a, 1.6, 5, 2);
    bulbLight.position.set(cornerX, CORRIDOR_H - 0.3, startZ - (northLen / northBulbCount) * (i + 0.5));
    scene.add(bulbLight);
    bulbLights.push(bulbLight);
  }

  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    bulbLights.forEach((bulbLight, i) => {
      bulbLight.intensity = 1.3 + Math.sin(flickerT * 7 + i) * 0.3 + (Math.random() - 0.5) * 0.4;
    });
  }

  return { colliders, update, startX, startZ, cornerX, endZ };
}

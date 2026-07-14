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

  // ---------- flickering bulb light so the passage isn't pitch black ----------
  const bulbLight = new THREE.PointLight(0xffcf8a, 1.6, 5, 2);
  bulbLight.position.set(centerX, CORRIDOR_H - 0.3, z);
  scene.add(bulbLight);

  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    bulbLight.intensity = 1.3 + Math.sin(flickerT * 7) * 0.3 + (Math.random() - 0.5) * 0.4;
  }

  return { colliders, update, startX, endX, z };
}

// createCorridorEast — same short passage, but running east (positive x) instead
// of west, to connect room2's east doorway to room5.
// startX: the x coordinate of room2's east wall (doorway); z: the doorway's z coordinate.
export function createCorridorEast(scene, engine, startX, z) {
  const colliders = [];
  const wallMat = createWallMaterial();

  const centerX = startX + CORRIDOR_LEN / 2;
  const endX = startX + CORRIDOR_LEN;

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

  // ---------- flickering bulb light so the passage isn't pitch black ----------
  const bulbLight = new THREE.PointLight(0xffcf8a, 1.6, 5, 2);
  bulbLight.position.set(centerX, CORRIDOR_H - 0.3, z);
  scene.add(bulbLight);

  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    bulbLight.intensity = 1.3 + Math.sin(flickerT * 7) * 0.3 + (Math.random() - 0.5) * 0.4;
  }

  return { colliders, update, startX, endX, z };
}

// createCorridorSouth — same short passage, but running south (positive z) instead
// of north, to connect room6's south doorway to room8.
// startZ: the z coordinate of room6's south wall (doorway); x: the doorway's x coordinate.
export function createCorridorSouth(scene, engine, startZ, x) {
  const colliders = [];
  const wallMat = createWallMaterial();

  const centerZ = startZ + CORRIDOR_LEN / 2;
  const endZ = startZ + CORRIDOR_LEN;

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

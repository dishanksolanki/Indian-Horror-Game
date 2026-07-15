// room10.js — ROOM 10: a hidden storage room of the haveli, reached via a corridor
// running east from room3's east doorway.
// West wall has a doorway gap matching the corridor width (entrance from room3).
// North/south/east walls remain solid, no window — this is the furthest, most
// forgotten corner of the house, beyond room3's cracked mirror.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 5; // east-west
const ROOM_D = 5.5; // north-south
const ROOM_H = 2.7; // lowest ceiling yet — cramped and forgotten
const DOOR_GAP = 1.6; // must match corridor width

// doorX: the x coordinate where room10's west wall (and doorway) sits —
// this is corridor10.endX, so the door lines up exactly with the passage.
// doorZ: the z coordinate of the doorway, matching the corridor's z (room3's east door).
export function createRoom10(scene, engine, doorX, doorZ) {
  const colliders = [];

  // room center sits further east (more positive x) than its west doorway
  const centerX = doorX + ROOM_W / 2;
  const centerZ = doorZ;

  // ---------- floor: old, dirty tiles ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    createFloorMaterial(ROOM_W / 2, ROOM_D / 2)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(centerX, 0, centerZ);
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling + beams ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ color: 0x14110d, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, ROOM_D), beamMat);
    beam.position.set(centerX + i * (ROOM_W / 3), ROOM_H - 0.1, centerZ);
    beam.castShadow = true;
    scene.add(beam);
  }

  // ---------- walls ----------
  const wallMat = createWallMaterial();
  const t = 0.2;

  function addWallBox(cx, cz, w, d, h = ROOM_H, cy = h / 2) {
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

  const westX = centerX - ROOM_W / 2; // == doorX
  const eastX = centerX + ROOM_W / 2;

  // north wall — solid, no window
  addWallBox(centerX, centerZ - ROOM_D / 2, ROOM_W + t, t);
  // south wall — solid, no window
  addWallBox(centerX, centerZ + ROOM_D / 2, ROOM_W + t, t);
  // east wall — solid, dead end of this wing
  addWallBox(eastX, centerZ, t, ROOM_D + t);

  // west wall — doorway gap in the middle, aligned with the corridor from room3
  const westSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(westX, centerZ - (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ + (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // ---------- furnishing: stacked old trunks against the east wall ----------
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2c1d10, roughness: 0.85 });
  const trunkPositions = [
    [eastX - 0.4, 0.25, centerZ - 1.1, 0],
    [eastX - 0.4, 0.25, centerZ + 0.4, 0.1],
    [eastX - 0.42, 0.72, centerZ - 1.05, -0.05],
  ];
  trunkPositions.forEach(([tx, ty, tz, rot]) => {
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.55), trunkMat);
    trunk.position.set(tx, ty, tz);
    trunk.rotation.y = rot;
    trunk.castShadow = trunk.receiveShadow = true;
    scene.add(trunk);
  });
  const trunkBox = new THREE.Box3(
    new THREE.Vector3(eastX - 0.95, 0, centerZ - 1.4),
    new THREE.Vector3(eastX - 0.05, 1.0, centerZ + 0.7)
  );
  colliders.push(trunkBox);
  engine.addCollider(trunkBox);

  // ---------- ambient room lighting: dim, dusty, forgotten ----------
  const ambient = new THREE.AmbientLight(0x362f24, 1.3);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x6a6152, 0x241d12, 0.8);
  scene.add(fillLight);

  const dustyLight = new THREE.PointLight(0xc9a35f, 1.3, 6, 2);
  dustyLight.position.set(centerX, ROOM_H - 0.3, centerZ);
  scene.add(dustyLight);

  // ---------- per-frame update: weak, dying-bulb flicker ----------
  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    dustyLight.intensity = 1.0 + Math.sin(flickerT * 3.1) * 0.15 + (Math.random() - 0.5) * 0.2;
  }

  return { colliders, update, centerX, centerZ, westX, eastX };
}

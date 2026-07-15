// room13.js — ROOM 13: a narrow antechamber storage room sitting between room12
// (the sealed puja room) and Hall 2, reached via a corridor running west from
// room12's west doorway.
// East wall has a doorway gap matching the corridor width (entrance from room12).
// West wall also has a doorway gap, leading further out via a corridor to Hall 2.
// North/south walls remain solid, no window — just a dim passage room.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 4;   // east-west
const ROOM_D = 3.5; // north-south
const ROOM_H = 2.7;
const DOOR_GAP = 1.6; // must match corridor width

// doorX: the x coordinate where room13's east wall (and doorway) sits —
// this is the corridor's endX, so the door lines up exactly with the passage
// from room12's west doorway.
// doorZ: the z coordinate of the doorway, matching the corridor's z
// (room12's westDoorZ), since the corridor runs straight west.
export function createRoom13(scene, engine, doorX, doorZ) {
  const colliders = [];

  // room center sits further west (more negative x) than its east doorway
  const centerX = doorX - ROOM_W / 2;
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
    new THREE.MeshStandardMaterial({ color: 0x140f0a, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x241a0e, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(ROOM_W, 0.14, 0.14), beamMat);
    beam.position.set(centerX, ROOM_H - 0.1, centerZ + i * (ROOM_D / 3));
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

  const northZ = centerZ - ROOM_D / 2;
  const southZ = centerZ + ROOM_D / 2;
  const westX = centerX - ROOM_W / 2;
  const eastX = centerX + ROOM_W / 2; // == doorX

  // north wall — solid, no window
  addWallBox(centerX, northZ, ROOM_W + t, t);

  // south wall — solid, no window
  addWallBox(centerX, southZ, ROOM_W + t, t);

  // east wall — doorway gap in the middle, aligned with the corridor from room12
  const eastSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(eastX, centerZ - (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ + (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // west wall — doorway gap in the middle, aligned with the corridor to hall2
  const westSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(westX, centerZ - (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ + (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // ---------- ambient room lighting: dim, cramped passage room ----------
  const ambient = new THREE.AmbientLight(0x211c15, 1.0);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x3f362a, 0x120d09, 0.6);
  scene.add(fillLight);

  const flickerLight = new THREE.PointLight(0xffcf8a, 1.2, 6, 2);
  flickerLight.position.set(centerX, ROOM_H - 0.3, centerZ);
  scene.add(flickerLight);

  // ---------- per-frame update: faint bulb flicker ----------
  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    flickerLight.intensity = 1.0 + Math.sin(flickerT * 6) * 0.2 + (Math.random() - 0.5) * 0.25;
  }

  // eastDoorZ/westDoorZ: both doorways share the same z since the corridors on
  // either side run straight east-west — used by main.js to attach the
  // corridor coming in from room12 (east) and the corridor going out to
  // hall2 (west).
  const eastDoorZ = centerZ;
  const westDoorZ = centerZ;

  return { colliders, update, centerX, centerZ, northZ, southZ, westX, eastX, eastDoorZ, westDoorZ };
}

// room2.js — ROOM 2: a second old Indian haveli room, reached via the corridor from room1.
// South wall has a doorway gap matching the corridor width (entrance from room1).
// North wall also has a matching doorway gap (exit toward room3 via a second corridor).
// West wall has a matching doorway gap (exit toward room4 via a second corridor).
// East wall now also has a matching doorway gap (exit toward room5 via a third corridor).

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 6; // east-west
const ROOM_D = 7; // north-south
const ROOM_H = 3.0;
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where room2's south wall (and doorway) sits —
// this is corridor.endZ, so the door lines up exactly with the passage.
export function createRoom2(scene, engine, doorZ) {
  const colliders = [];

  // room center sits further north (more negative z) than its south doorway
  const centerZ = doorZ - ROOM_D / 2;

  // ---------- floor: old, dirty tiles ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    createFloorMaterial(ROOM_W / 2, ROOM_D / 2)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, centerZ);
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling + beams ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x2e2013, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, ROOM_D), beamMat);
    beam.position.set(i * (ROOM_W / 3), ROOM_H - 0.1, centerZ);
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
  const southZ = centerZ + ROOM_D / 2; // == doorZ

  // east wall — doorway gap in the middle, aligned with the corridor to room5
  const eastSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(ROOM_W / 2, centerZ - (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(ROOM_W / 2, centerZ + (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(ROOM_W / 2, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // west wall — doorway gap in the middle, aligned with the corridor to room4
  const westSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(-ROOM_W / 2, centerZ - (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(-ROOM_W / 2, centerZ + (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(-ROOM_W / 2, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // south wall — doorway gap in the middle, aligned with the corridor from room1
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(-(DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox((DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(0, southZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // north wall — doorway gap in the middle, aligned with the corridor to room3
  const northSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(-(DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox((DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(0, northZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- per-frame update: no scene lights anymore — player relies on the flashlight ----------
  function update() {
    // intentionally static
  }

  // westX/westDoorZ: the doorway sits in the middle of the west wall —
  // corridor.js's createCorridorWest starts here and runs further west toward room4.
  const westX = -ROOM_W / 2;
  const westDoorZ = centerZ;

  // eastX/eastDoorZ: the doorway sits in the middle of the east wall —
  // corridor.js's createCorridorEast starts here and runs further east toward room5.
  const eastX = ROOM_W / 2;
  const eastDoorZ = centerZ;

  return { colliders, update, centerZ, northZ, westX, westDoorZ, eastX, eastDoorZ };
}

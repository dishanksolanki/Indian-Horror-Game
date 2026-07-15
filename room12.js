// room12.js — ROOM 12: a sealed puja room deep in the haveli, reached via a corridor
// running north from room3's north doorway, past the cracked mirror in room3.
// South wall has a doorway gap matching the corridor width (entrance from room3).
// West wall also has a doorway gap, leading further out via a corridor to room13/Hall 2.
// East wall also has a doorway gap, leading further out via a corridor to room14.
// North wall now also has a doorway gap, leading further out via a corridor to room15.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 4.5; // east-west
const ROOM_D = 5; // north-south
const ROOM_H = 2.6; // low, close ceiling — the smallest room yet
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where room12's south wall (and doorway) sits —
// this is corridor12.endZ, so the door lines up exactly with the passage from room3.
export function createRoom12(scene, engine, doorZ) {
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
    new THREE.MeshStandardMaterial({ color: 0x100d0a, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x24180d, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, ROOM_D), beamMat);
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
  const westX = -ROOM_W / 2;
  const eastX = ROOM_W / 2;

  // north wall — doorway gap in the middle, aligned with the corridor to room15
  const northSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(-(DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox((DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(0, northZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // south wall — doorway gap in the middle, aligned with the corridor from room3
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(-(DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox((DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(0, southZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // west wall — doorway gap in the middle, aligned with the corridor to hall2
  const westSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(westX, centerZ - (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ + (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // east wall — doorway gap in the middle, aligned with the corridor to room14
  const eastSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(eastX, centerZ - (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ + (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // ---------- ambient room lighting: airless, sealed, the deepest silence in the house ----------
  const ambient = new THREE.AmbientLight(0x241f19, 1.0);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x453b2e, 0x160f0a, 0.6);
  scene.add(fillLight);

  // ---------- per-frame update: nothing animated here — a quiet, still room ----------
  function update() {
    // intentionally static
  }

  // westX/westDoorZ: the doorway sits in the middle of the west wall —
  // used by main.js to attach the corridor running out to room13/hall2.
  const westDoorZ = centerZ;
  // eastX/eastDoorZ: the doorway sits in the middle of the east wall —
  // used by main.js to attach the corridor running out to room14.
  const eastDoorZ = centerZ;
  // northDoorX: the doorway sits in the middle of the north wall —
  // used by main.js to attach the corridor running out to room15.
  const northDoorX = 0;

  return { colliders, update, centerZ, northZ, southZ, westX, eastX, westDoorZ, eastDoorZ, northDoorX };
}

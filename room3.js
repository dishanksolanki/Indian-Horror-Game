// room3.js — ROOM 3: a smaller, more claustrophobic inner room of the haveli,
// reached via the second corridor leading north from room2.
// South wall has a doorway gap matching the corridor width.
// East wall has a matching doorway gap (exit toward room10 via a tenth corridor).
// West wall has a matching doorway gap (exit toward room11 via an eleventh corridor).
// North wall now also has a matching doorway gap (exit toward room12 via a twelfth
// corridor) — the cracked mirror shifts to sit beside the doorway instead of centered.
// This room is deeper in the house, so it's kept dimmer and tighter than room1/room2.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 5.5; // east-west
const ROOM_D = 6.5; // north-south
const ROOM_H = 2.8; // slightly lower ceiling than the earlier rooms
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where room3's south wall (and doorway) sits —
// this is corridor2.endZ, so the door lines up exactly with the passage from room2.
export function createRoom3(scene, engine, doorZ) {
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
    new THREE.MeshStandardMaterial({ color: 0x161310, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x2e2013, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, ROOM_D), beamMat);
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

  // north wall — doorway gap in the middle, aligned with the corridor to room12
  const northSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(-(DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox((DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(0, northZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel
  // east wall — doorway gap in the middle, aligned with the corridor to room10
  const eastSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(ROOM_W / 2, centerZ - (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(ROOM_W / 2, centerZ + (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(ROOM_W / 2, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel
  // west wall — doorway gap in the middle, aligned with the corridor to room11
  const westSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(-ROOM_W / 2, centerZ - (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(-ROOM_W / 2, centerZ + (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(-ROOM_W / 2, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // south wall — doorway gap in the middle, aligned with the corridor from room2
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(-(DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox((DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(0, southZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- furnishing: a small wall shelf with a cracked mirror ----------
  // shifted onto the solid east segment of the north wall, beside the new doorway to room12
  const mirrorX = (DOOR_GAP / 2 + northSideLen / 2);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f150c, roughness: 0.8 });
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.04), frameMat);
  mirrorFrame.position.set(mirrorX, 1.5, northZ + 0.05);
  mirrorFrame.castShadow = mirrorFrame.receiveShadow = true;
  scene.add(mirrorFrame);

  const mirrorGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.5, 0.7),
    new THREE.MeshStandardMaterial({
      color: 0x2a2f33,
      metalness: 0.6,
      roughness: 0.35,
      emissive: 0x0a0d10,
      emissiveIntensity: 0.4,
    })
  );
  mirrorGlass.position.set(mirrorX, 1.5, northZ + 0.071);
  scene.add(mirrorGlass);

  // ---------- per-frame update: no scene lights anymore — player relies on the flashlight ----------
  function update() {
    // intentionally static
  }

  // eastX/eastDoorZ: the doorway sits in the middle of the east wall —
  // corridor.js's createCorridorEast starts here and runs further east toward room10.
  const eastX = ROOM_W / 2;
  const eastDoorZ = centerZ;

  // westX/westDoorZ: the doorway sits in the middle of the west wall —
  // corridor.js's createCorridorWest starts here and runs further west toward room11.
  const westX = -ROOM_W / 2;
  const westDoorZ = centerZ;

  return { colliders, update, centerZ, northZ, eastX, eastDoorZ, westX, westDoorZ };
}

// hall3.js — HALL 3: a large hall of the haveli, sized to match Hall 1/Hall 2
// (10x13m), reached via a corridor running north from room23's north doorway.
// South wall has a doorway gap matching the corridor width (entrance from room23).
// North wall also has a matching doorway gap (exit toward room24 via a corridor).
// East wall now also has a doorway gap, leading via a bridging corridor to hall2.
// West wall remains solid, no window.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 10; // east-west — matches hall1/hall2
const ROOM_D = 13; // north-south — matches hall1/hall2
const ROOM_H = 3.4; // matches hall1/hall2
const DOOR_GAP = 1.6; // must match corridor width
// how far the new east doorway (to hall2) sits from the south wall — chosen to
// land inside the z-band where hall3's east wall and hall2's west wall actually
// overlap (see the matching offset in hall2.js)
const EAST_DOOR_OFFSET_FROM_SOUTH = 1.75;

// doorZ: the z coordinate where hall3's south wall (and doorway) sits —
// this is corridor26.endZ, so the door lines up exactly with the passage.
// doorX: the x coordinate of the doorway, matching the corridor's x (room23's north door).
export function createHall3(scene, engine, doorZ, doorX) {
  const colliders = [];

  // hall center sits further north (more negative z) than its south doorway
  const centerZ = doorZ - ROOM_D / 2;
  const centerX = doorX;

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
    new THREE.MeshStandardMaterial({ color: 0x18140f, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x2e2013, roughness: 0.9 });
  for (let i = -2; i <= 2; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, ROOM_D), beamMat);
    beam.position.set(centerX + i * (ROOM_W / 5), ROOM_H - 0.12, centerZ);
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

  // north wall — doorway gap in the middle, aligned with the corridor to room24
  const northSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(centerX, northZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel
  // west wall — solid, no window
  addWallBox(centerX - ROOM_W / 2, centerZ, t, ROOM_D + t);
  // east wall — doorway gap toward hall2 (previously fully solid, no window)
  const eastDoorZ = southZ - EAST_DOOR_OFFSET_FROM_SOUTH;
  const eastGapNorthZ = eastDoorZ - DOOR_GAP / 2;
  const eastGapSouthZ = eastDoorZ + DOOR_GAP / 2;
  const eastNorthSegLen = eastGapNorthZ - northZ;
  const eastSouthSegLen = southZ - eastGapSouthZ;
  const eastX = centerX + ROOM_W / 2;
  addWallBox(eastX, northZ + eastNorthSegLen / 2, t, eastNorthSegLen);
  addWallBox(eastX, eastGapSouthZ + eastSouthSegLen / 2, t, eastSouthSegLen);
  addWallBox(eastX, eastDoorZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // south wall — doorway gap in the middle, aligned with the corridor from room23
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(centerX, southZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- decorative wooden pillars flanking the central walkway ----------
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a2717, roughness: 0.85 });
  const pillarRadius = 0.22;
  const pillarPositions = [
    [centerX - 2.6, centerZ - 3], [centerX + 2.6, centerZ - 3],
    [centerX - 2.6, centerZ + 3], [centerX + 2.6, centerZ + 3],
  ];
  pillarPositions.forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(pillarRadius, pillarRadius, ROOM_H, 12),
      pillarMat
    );
    pillar.position.set(px, ROOM_H / 2, pz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);

    const pillarBox = new THREE.Box3().setFromObject(pillar);
    colliders.push(pillarBox);
    engine.addCollider(pillarBox);
  });

  // ---------- per-frame update: no scene lights anymore — player relies on the flashlight ----------
  function update() {
    // intentionally static
  }

  // northDoorX: the doorway sits in the middle of the north wall — corridor.js's
  // createCorridorNorth starts here and runs further north toward room24.
  const northDoorX = centerX;

  return { colliders, update, centerX, centerZ, northZ, southZ, northDoorX, eastX, eastDoorZ };
}

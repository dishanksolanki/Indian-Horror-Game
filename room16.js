// room16.js — ROOM 16: a small connecting landing between the two far wings of the
// haveli. Reached via a corridor running north from room15's north doorway, and in
// turn connects onward (east, then south) via a bridging corridor to hall1, and also
// (west, then north) via a second bridging corridor to room24.
// South wall has a doorway gap matching the corridor width (entrance from room15).
// East wall also has a doorway gap, leading to the long bridging corridor to hall1.
// West wall also has a doorway gap, leading to the long bridging corridor to room24.
// North wall has a big double door boarded shut with planks — the player must find a
// hammer and remove the planks before the door can be passed through.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 6; // east-west
const ROOM_D = 6; // north-south
const ROOM_H = 3.0;
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where room16's south wall (and doorway) sits —
// this is the corridor's endZ, so the door lines up exactly with the passage from room15.
// doorX: the x coordinate of the doorway, matching the corridor's x (room15's north door).
export function createRoom16(scene, engine, doorZ, doorX) {
  const colliders = [];

  // room center sits further north (more negative z) than its south doorway
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
    new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, ROOM_D), beamMat);
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

  const northZ = centerZ - ROOM_D / 2;
  const southZ = centerZ + ROOM_D / 2; // == doorZ
  const westX = centerX - ROOM_W / 2;
  const eastX = centerX + ROOM_W / 2;

  // north wall — a big double door, boarded shut with planks. Blocked until the
  // player removes the planks using a hammer.
  const BIG_DOOR_W = 2.0;
  const BIG_DOOR_H = 2.5;
  const northSideLen = (ROOM_W - BIG_DOOR_W) / 2;
  addWallBox(centerX - (BIG_DOOR_W / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(centerX + (BIG_DOOR_W / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(
    centerX, northZ, BIG_DOOR_W, t,
    ROOM_H - BIG_DOOR_H, ROOM_H - (ROOM_H - BIG_DOOR_H) / 2
  ); // lintel above the door

  // -- decorative closed door leaves --
  const doorMat = new THREE.MeshStandardMaterial({ color: 0x2b1a0d, roughness: 0.85 });
  const leafW = BIG_DOOR_W / 2 - 0.03;
  const leafGeo = new THREE.BoxGeometry(leafW, BIG_DOOR_H, 0.08);

  const leftDoor = new THREE.Mesh(leafGeo, doorMat);
  leftDoor.position.set(centerX - leafW / 2 - 0.015, BIG_DOOR_H / 2, northZ);
  leftDoor.castShadow = true;
  scene.add(leftDoor);

  const rightDoor = new THREE.Mesh(leafGeo, doorMat);
  rightDoor.position.set(centerX + leafW / 2 + 0.015, BIG_DOOR_H / 2, northZ);
  rightDoor.castShadow = true;
  scene.add(rightDoor);

  // -- planks nailed across the door, blocking it until removed with a hammer --
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x4a3218, roughness: 0.95 });
  const nailMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0.7 });
  const plankHeights = [0.85, 1.35, 1.85];
  const plankGroup = new THREE.Group();
  const plankColliders = [];

  for (const py of plankHeights) {
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(BIG_DOOR_W + 0.3, 0.16, 0.05),
      plankMat
    );
    plank.position.set(centerX, py, northZ - 0.05);
    plank.rotation.z = (Math.random() - 0.5) * 0.04;
    plank.castShadow = true;
    scene.add(plank);
    plankGroup.add(plank);

    const box = new THREE.Box3().setFromObject(plank);
    plankColliders.push(box);
    engine.addCollider(box);

    for (const nx of [centerX - BIG_DOOR_W / 2 + 0.15, centerX + BIG_DOOR_W / 2 - 0.15]) {
      const nail = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), nailMat);
      nail.position.set(nx, py, northZ - 0.08);
      scene.add(nail);
    }
  }

  let plankRemoved = false;
  const plankAnchor = new THREE.Object3D();
  plankAnchor.position.set(centerX, 1.4, northZ - 0.05);
  scene.add(plankAnchor);

  engine.addInteractable(plankAnchor, {
    radius: 1.8,
    prompt: "Remove Plank",
    onInteract: () => {
      if (plankRemoved) return;
      if (!engine.hasItem("hammer")) {
        engine.showMessage("It's boarded shut. I'd need a hammer to pry these planks off.");
        return;
      }
      plankRemoved = true;
      for (const box of plankColliders) engine.removeCollider(box);
      scene.remove(plankGroup);
      plankGroup.traverse((obj) => obj.geometry && obj.geometry.dispose());
      engine.removeInteractable(plankAnchor);
      scene.remove(plankAnchor);
      engine.showMessage("The planks splinter and fall away. The door is clear now.");
    },
  });

  // west wall — doorway gap in the middle, leading onward (via a second bridging
  // corridor) to room24
  const westSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(westX, centerZ - (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ + (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // east wall — doorway gap in the middle, leading onward (via a bridging corridor) to hall1
  const eastSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(eastX, centerZ - (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ + (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // south wall — doorway gap in the middle, aligned with the corridor from room15
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(centerX, southZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- ambient room lighting: dim, a quiet in-between space ----------
  const ambient = new THREE.AmbientLight(0x231e18, 1.0);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x453b2e, 0x160f0a, 0.6);
  scene.add(fillLight);

  const landingLight = new THREE.PointLight(0xffcf8a, 1.5, 6, 2);
  landingLight.position.set(centerX, ROOM_H - 0.3, centerZ);
  scene.add(landingLight);

  // ---------- per-frame update: gentle flicker, tying it to the corridor mood ----------
  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    landingLight.intensity = 1.3 + Math.sin(flickerT * 6) * 0.25 + (Math.random() - 0.5) * 0.3;
  }

  // eastDoorZ: the doorway sits in the middle of the east wall — bridging corridor to hall1 starts here.
  const eastDoorZ = centerZ;
  // westDoorZ: the doorway sits in the middle of the west wall — bridging corridor to room24 starts here.
  const westDoorZ = centerZ;

  return {
    colliders, update, centerX, centerZ, northZ, southZ, westX, eastX,
    eastDoorZ, westDoorZ, northDoorZ: northZ,
  };
}

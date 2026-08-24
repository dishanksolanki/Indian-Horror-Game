// room24.js — ROOM 24: a side room of the haveli, reached via a corridor
// running north from hall3's north doorway, and also connected onward (east, then
// south) via a bridging corridor to room16.
// South wall has a doorway gap matching the corridor width (entrance from hall3).
// East wall also has a doorway gap, leading to the long bridging corridor to room16.
// North/west walls remain solid, no window.
//
// NEW: a wooden table holding the IRON KEY that unlocks the caged book holder
// in room25. Walk up, press [E] to pick the key up — like the hammer, the
// flag (engine.inventory.holderKey) is set on PICKUP, not on later use, so
// once grabbed once the cage stays unlockable even if the key is later
// dropped somewhere else via [G].

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 6; // east-west
const ROOM_D = 6.5; // north-south
const ROOM_H = 2.9;
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where room24's south wall (and doorway) sits —
// this is corridor27.endZ, so the door lines up exactly with the passage.
// doorX: the x coordinate of the doorway, matching the corridor's x (hall3's north door).
export function createRoom24(scene, engine, doorZ, doorX) {
  const colliders = [];

  if (!engine.inventory) engine.inventory = {};

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
    new THREE.MeshStandardMaterial({ color: 0x18140f, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x2e2013, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, ROOM_D), beamMat);
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

  const southZ = centerZ + ROOM_D / 2; // == doorZ
  const northZ = centerZ - ROOM_D / 2;

  // north wall — solid, dead end of this wing
  addWallBox(centerX, northZ, ROOM_W + t, t);
  // west wall — solid, no window
  addWallBox(centerX - ROOM_W / 2, centerZ, t, ROOM_D + t);

  const eastX = centerX + ROOM_W / 2;
  // east wall — doorway gap in the middle, leading onward (via a bridging corridor)
  // to room16
  const eastSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(eastX, centerZ - (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ + (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // south wall — doorway gap in the middle, aligned with the corridor from hall3
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(centerX, southZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- wooden table with the book-holder cage key ----------
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.8 });
  const tableGroup = new THREE.Group();
  const tableX = centerX - 1.8;
  const tableZ = centerZ - 1.8;
  tableGroup.position.set(tableX, 0, tableZ);
  scene.add(tableGroup);

  const tabletop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.7), tableMat);
  tabletop.position.set(0, 0.75, 0);
  tabletop.castShadow = tabletop.receiveShadow = true;
  tableGroup.add(tabletop);

  const legGeo = new THREE.BoxGeometry(0.08, 0.75, 0.08);
  for (const lx of [-0.48, 0.48]) {
    for (const lz of [-0.28, 0.28]) {
      const leg = new THREE.Mesh(legGeo, tableMat);
      leg.position.set(lx, 0.375, lz);
      leg.castShadow = leg.receiveShadow = true;
      tableGroup.add(leg);
    }
  }

  const tableBox = new THREE.Box3().setFromObject(tableGroup);
  colliders.push(tableBox);
  engine.addCollider(tableBox);

  // ---------- the iron key resting on the table (unlocks the cage in room25) ----------
  const keyMat = new THREE.MeshStandardMaterial({ color: 0x9a8a4a, roughness: 0.4, metalness: 0.75 });
  const keyGroup = new THREE.Group();
  keyGroup.position.set(tableX + 0.15, 0.8, tableZ + 0.1);
  keyGroup.rotation.x = Math.PI / 2; // lay flat on the tabletop
  scene.add(keyGroup);

  const keyShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 8), keyMat);
  keyShaft.rotation.z = Math.PI / 2;
  keyShaft.position.x = 0.02;
  keyGroup.add(keyShaft);

  const keyRing = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 12), keyMat);
  keyRing.position.x = -0.06;
  keyGroup.add(keyRing);

  const keyBit1 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.008), keyMat);
  keyBit1.position.set(0.08, -0.01, 0);
  keyGroup.add(keyBit1);
  const keyBit2 = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 0.008), keyMat);
  keyBit2.position.set(0.095, -0.025, 0);
  keyGroup.add(keyBit2);

  keyGroup.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  // small warm point light so the key actually glints and reads as a
  // pickup in this room's otherwise dim, flashlight-only lighting
  const keyGlint = new THREE.PointLight(0xffdf9a, 0.5, 1.6, 2);
  keyGlint.position.set(tableX + 0.15, 0.95, tableZ + 0.1);
  scene.add(keyGlint);

  const KEY_PICKUP_RADIUS = 1.8;
  const keyInteractable = engine.addInteractable(keyGroup, {
    radius: KEY_PICKUP_RADIUS,
    prompt: "Pick Up Iron Key",
    onInteract: () => {
      console.log("[room24.js] iron key interacted with — attempting pickup. Currently held:", engine.heldItem);

      const picked = engine.pickupItem({
        id: "holderKey",
        mesh: keyGroup,
        prompt: "Iron Key",
        holdOffset: new THREE.Vector3(0.26, -0.2, -0.5),
        throwable: false,
        onPickup: () => {
          engine.removeInteractable(keyInteractable);
          if (!engine.inventory) engine.inventory = {};
          engine.inventory.holderKey = true;
          scene.remove(keyGlint);
          console.log("[room24.js] picked up the iron key — engine.inventory.holderKey = true");
        },
      });

      if (!picked) {
        console.log(
          `[room24.js] couldn't pick up the key — already holding "${engine.heldItem?.id}". ` +
          `Drop it with [G] first.`
        );
      }
    },
  });

  // ---------- per-frame update: no scene lights anymore — player relies on the flashlight ----------
  function update() {
    // intentionally static
  }

  // eastDoorZ: the doorway sits in the middle of the east wall — bridging corridor to room16 starts here.
  const eastDoorZ = centerZ;

  return { colliders, update, centerX, centerZ, northZ, southZ, eastX, eastDoorZ };
}

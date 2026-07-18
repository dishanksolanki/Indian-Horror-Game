// room17.js — ROOM 17: a side room of the haveli, reached via a corridor
// running south from room4's south doorway.
// North wall has a doorway gap matching the corridor width (entrance from room4).
// South/east/west walls remain solid, no window — this is the dead end of this wing.
//
// NEW: a small wooden table against the south wall holds a hammer. Picking it
// up (E) sets a shared `engine.inventory.hammer` flag — this is what lets the
// player remove the nailed-shut plank on room16's north door. See room16.js.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 6; // east-west
const ROOM_D = 6.5; // north-south
const ROOM_H = 2.9;
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where room17's north wall (and doorway) sits —
// this is corridor19.endZ, so the door lines up exactly with the passage.
// doorX: the x coordinate of the doorway, matching the corridor's x (room4's south door).
export function createRoom17(scene, engine, doorZ, doorX) {
  const colliders = [];

  // shared inventory bag lives on the engine so any room can read/write it.
  // Guarded here in case room17 happens to load before anything else touches it.
  if (!engine.inventory) engine.inventory = {};

  // room center sits further south (more positive z) than its north doorway
  const centerZ = doorZ + ROOM_D / 2;
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

  const northZ = centerZ - ROOM_D / 2; // == doorZ
  const southZ = centerZ + ROOM_D / 2;

  // south wall — solid, dead end of this wing
  addWallBox(centerX, southZ, ROOM_W + t, t);

  // west wall — solid, no window
  addWallBox(centerX - ROOM_W / 2, centerZ, t, ROOM_D + t);

  // east wall — solid, no window
  addWallBox(centerX + ROOM_W / 2, centerZ, t, ROOM_D + t);

  // north wall — doorway gap in the middle, aligned with the corridor from room4
  const northSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(centerX, northZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- table + hammer ----------
  // A plain wooden table pushed against the south wall, a little off-center.
  // A hammer rests on top and can be picked up.
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x3a2917, roughness: 0.85 });
  const TABLE_W = 1.3;
  const TABLE_D = 0.7;
  const TABLE_TOP_H = 0.05;
  const TABLE_LEG_H = 0.75;
  const tableX = centerX - 1.5;
  const tableZ = southZ - 0.7;

  const tableGroup = new THREE.Group();
  tableGroup.position.set(tableX, 0, tableZ);
  scene.add(tableGroup);

  const tabletop = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_W, TABLE_TOP_H, TABLE_D),
    tableMat
  );
  tabletop.position.set(0, TABLE_LEG_H + TABLE_TOP_H / 2, 0);
  tabletop.castShadow = tabletop.receiveShadow = true;
  tableGroup.add(tabletop);

  const legOffsetX = TABLE_W / 2 - 0.08;
  const legOffsetZ = TABLE_D / 2 - 0.08;
  for (const lx of [-legOffsetX, legOffsetX]) {
    for (const lz of [-legOffsetZ, legOffsetZ]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, TABLE_LEG_H, 0.07), tableMat);
      leg.position.set(lx, TABLE_LEG_H / 2, lz);
      leg.castShadow = leg.receiveShadow = true;
      tableGroup.add(leg);
    }
  }

  // solid collider so the player can't walk through the table.
  // Built directly from known world-space coordinates (tableX/tableZ are
  // already world positions) rather than via Box3.setFromObject() on a mesh
  // nested inside tableGroup — computing it from the object graph was
  // returning a stray box anchored near the world origin before the group's
  // matrixWorld had been updated, and the union() then produced one giant
  // invisible collider stretching from the origin to the table.
  const tableBox = new THREE.Box3().setFromCenterAndSize(
    new THREE.Vector3(tableX, (TABLE_LEG_H + TABLE_TOP_H) / 2, tableZ),
    new THREE.Vector3(TABLE_W, TABLE_LEG_H + TABLE_TOP_H, TABLE_D)
  );
  colliders.push(tableBox);
  engine.addCollider(tableBox);

  // hammer, resting on the tabletop
  const hammerMat = new THREE.MeshStandardMaterial({ color: 0x4a3a24, roughness: 0.7 });
  const hammerHeadMat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.4, metalness: 0.75 });

  const hammerGroup = new THREE.Group();
  const hammerSurfaceY = TABLE_LEG_H + TABLE_TOP_H;
  hammerGroup.position.set(tableX + 0.1, hammerSurfaceY, tableZ - 0.05);
  hammerGroup.rotation.y = 0.4;
  scene.add(hammerGroup);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.42, 8), hammerMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, 0.025, 0);
  handle.castShadow = true;
  hammerGroup.add(handle);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.07, 0.07), hammerHeadMat);
  head.position.set(0.19, 0.055, 0);
  head.castShadow = true;
  hammerGroup.add(head);

  let hammerTaken = false;
  const hammerInteractable = engine.addInteractable(hammerGroup, {
    radius: 1.6,
    prompt: "Pick up Hammer",
    onInteract: () => {
      if (hammerTaken) return;
      hammerTaken = true;

      engine.inventory.hammer = true;

      // Re-parent the hammer onto the camera instead of deleting it — this
      // turns it into a simple first-person "held in hand" viewmodel that
      // follows the player everywhere from now on. Object3D.add() auto-detaches
      // it from its current parent (the scene), so no explicit scene.remove()
      // is needed; we just have to give it a new local transform suited for
      // hand placement instead of tabletop placement.
      engine.camera.add(hammerGroup);
      hammerGroup.position.set(0.32, -0.32, -0.55);
      hammerGroup.rotation.set(-0.3, 0.7, 0.2);
      hammerGroup.scale.setScalar(1.2);

      const ix = engine.interactables.indexOf(hammerInteractable);
      if (ix !== -1) engine.interactables.splice(ix, 1);
    },
  });

  // ---------- ambient room lighting ----------
  const ambient = new THREE.AmbientLight(0x413c30, 1.6);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x7c7364, 0x2c2618, 1.0);
  scene.add(fillLight);

  const eerieLight = new THREE.PointLight(0x9fb0c8, 1.6, 7, 2);
  eerieLight.position.set(centerX, ROOM_H - 0.35, centerZ);
  scene.add(eerieLight);

  // ---------- per-frame update: subtle eerie light pulse ----------
  let pulseT = 0;
  function update(dt) {
    pulseT += dt;
    eerieLight.intensity = 1.4 + Math.sin(pulseT * 1.3) * 0.3;

    // once held, give the hammer a faint sway synced to the engine's walk
    // headbob so it doesn't feel like a flat prop glued to the screen
    if (hammerTaken && hammerGroup.parent === engine.camera) {
      const bob = Math.sin(engine._bobT || 0) * 0.015;
      hammerGroup.position.y = -0.32 + bob;
    }
  }

  return { colliders, update, centerX, centerZ, northZ, southZ };
}

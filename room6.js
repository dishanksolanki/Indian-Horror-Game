// room6.js — ROOM 6: a side room of the haveli, reached via a corridor
// running east from room5's east doorway.
// West wall has a doorway gap matching the corridor width (entrance from room5).
// East wall also has a matching doorway gap (exit toward room7 via a sixth corridor).
// South wall also has a matching doorway gap (exit toward room8 via a seventh corridor).
// North wall now also has a matching doorway gap (exit toward room9 via an eighth corridor).

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 6; // east-west
const ROOM_D = 6.5; // north-south
const ROOM_H = 2.9;
const DOOR_GAP = 1.6; // must match corridor width

// doorX: the x coordinate where room6's west wall (and doorway) sits —
// this is corridor5.endX, so the door lines up exactly with the passage.
// doorZ: the z coordinate of the doorway, matching the corridor's z (room5's east door).
export function createRoom6(scene, engine, doorX, doorZ) {
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

  const westX = centerX - ROOM_W / 2; // == doorX
  const eastX = centerX + ROOM_W / 2;

  // north wall — doorway gap in the middle, aligned with the corridor to room9
  const northSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + northSideLen / 2), centerZ - ROOM_D / 2, northSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + northSideLen / 2), centerZ - ROOM_D / 2, northSideLen, t);
  addWallBox(centerX, centerZ - ROOM_D / 2, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // south wall — doorway gap in the middle, aligned with the corridor to room8
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + southSideLen / 2), centerZ + ROOM_D / 2, southSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + southSideLen / 2), centerZ + ROOM_D / 2, southSideLen, t);
  addWallBox(centerX, centerZ + ROOM_D / 2, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // west wall — doorway gap in the middle, aligned with the corridor from room5
  const westSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(westX, centerZ - (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ + (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // east wall — doorway gap in the middle, aligned with the corridor to room7
  const eastSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(eastX, centerZ - (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ + (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // =========================================================
  // ---------- wooden door filling the north doorway gap (to room9) ----------
  // A dark-wood, iron-studded haveli door mounted on a hinge pivot so it can
  // be pushed open/closed. The gap was previously empty (no door mesh at
  // all) — this fills it with an actual swinging door + frame.
  // =========================================================
  const doorWoodMat = new THREE.MeshStandardMaterial({ color: 0x3a2415, roughness: 0.78, metalness: 0.04 });
  const doorIronMat = new THREE.MeshStandardMaterial({ color: 0x2b2822, roughness: 0.55, metalness: 0.6 });
  const doorHandleMat = new THREE.MeshStandardMaterial({ color: 0x8a7250, roughness: 0.4, metalness: 0.65 });

  const northWallZ = centerZ - ROOM_D / 2;
  const doorW = DOOR_GAP - 0.16;
  const doorH = ROOM_H - 0.55;
  const doorThickness = 0.06;

  // frame jambs on either side of the gap
  const jambGeo = new THREE.BoxGeometry(0.08, doorH + 0.06, t);
  [centerX - DOOR_GAP / 2 + 0.04, centerX + DOOR_GAP / 2 - 0.04].forEach((jx) => {
    const jamb = new THREE.Mesh(jambGeo, doorWoodMat);
    jamb.position.set(jx, (doorH + 0.06) / 2, northWallZ);
    jamb.castShadow = true;
    jamb.receiveShadow = true;
    scene.add(jamb);
  });

  // pivot group — hinged on the west edge of the gap, swings open into the room (south, +z)
  const hingeX = centerX - doorW / 2;
  const doorPivot = new THREE.Group();
  doorPivot.position.set(hingeX, 0, northWallZ);
  scene.add(doorPivot);

  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(doorW, doorH, doorThickness),
    doorWoodMat
  );
  doorPanel.position.set(doorW / 2, doorH / 2, 0);
  doorPanel.castShadow = true;
  doorPanel.receiveShadow = true;
  doorPivot.add(doorPanel);

  // two raised panel insets for a classic paneled-door look
  [-1, 1].forEach((s) => {
    const inset = new THREE.Mesh(
      new THREE.BoxGeometry(doorW * 0.62, doorH * 0.38, doorThickness * 0.4),
      doorWoodMat
    );
    inset.position.set(doorW / 2, doorH / 2 + s * doorH * 0.22, doorThickness * 0.55);
    inset.castShadow = true;
    doorPivot.add(inset);
  });

  // decorative iron studs scattered across the panel, haveli-door style
  for (let i = 0; i < 14; i++) {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), doorIronMat);
    const sx = 0.15 + Math.random() * (doorW - 0.3);
    const sy = 0.2 + Math.random() * (doorH - 0.4);
    stud.position.set(sx, sy, doorThickness / 2 + 0.01);
    doorPivot.add(stud);
  }

  // three iron hinges along the hinge edge
  [0.15, doorH / 2, doorH - 0.15].forEach((hy) => {
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.03), doorIronMat);
    hinge.position.set(0.02, hy, doorThickness / 2 + 0.015);
    doorPivot.add(hinge);
  });

  // ring handle + backplate on the far (latch) edge
  const handleRing = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.011, 8, 16), doorHandleMat);
  handleRing.rotation.y = Math.PI / 2;
  handleRing.position.set(doorW - 0.12, doorH / 2, doorThickness / 2 + 0.02);
  doorPivot.add(handleRing);
  const handleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 10), doorHandleMat);
  handleBase.rotation.x = Math.PI / 2;
  handleBase.position.set(doorW - 0.12, doorH / 2, doorThickness / 2 + 0.005);
  doorPivot.add(handleBase);

  // Invisible world-space anchor for the interactable — doorPanel itself is
  // nested inside doorPivot (which has its own position/rotation), so its
  // .position is LOCAL to the pivot, not world space. The engine's focus
  // check reads object3D.position directly assuming world space, so a
  // dedicated top-level anchor at the door's actual world position keeps
  // the "look at it to focus" check accurate regardless of swing angle.
  const doorAnchor = new THREE.Object3D();
  doorAnchor.position.set(centerX, doorH / 2, northWallZ);
  scene.add(doorAnchor);

  // closed-door collider — a simple static box spanning the gap; removed
  // while open so the player can actually walk through, restored on close.
  const doorClosedBox = new THREE.Box3(
    new THREE.Vector3(centerX - doorW / 2, 0, northWallZ - 0.08),
    new THREE.Vector3(centerX + doorW / 2, doorH, northWallZ + 0.08)
  );
  colliders.push(doorClosedBox);
  engine.addCollider(doorClosedBox);

  // open/close state — the pivot swings smoothly toward its target angle
  // each frame in update() below rather than snapping instantly.
  let doorOpen = false;
  const doorClosedRot = 0;
  const doorOpenRot = -Math.PI * 0.58; // swings inward, into the room
  let doorTargetRot = doorClosedRot;

  // ---------- lock: stays locked until the trishul is placed on its holder
  // in room7. room6 has no direct reference to room7, so the two rooms talk
  // through the engine's shared flag bus (see engine.js setFlag/onFlag). ----
  // getFlag() covers the case where the puzzle was already solved before
  // this room was even built; onFlag() covers it happening while the player
  // is standing right here.
  let doorLocked = !engine.getFlag("trishulPlaced");
  engine.onFlag("trishulPlaced", (placed) => {
    doorLocked = !placed;
    // if someone takes the trishul back off the holder while this door is
    // sitting open, swing it shut and re-lock it behind them
    if (doorLocked && doorOpen) {
      doorOpen = false;
      doorTargetRot = doorClosedRot;
      engine.addCollider(doorClosedBox);
    }
  });

  engine.addInteractable(doorAnchor, {
    radius: 2.2,
    prompt: () => {
      if (doorLocked) return "Locked";
      return doorOpen ? "Close Door" : "Open Door";
    },
    onInteract: () => {
      if (doorLocked) {
        console.log("[room6.js] north door is locked — place the trishul on its holder in room7 first.");
        return;
      }
      doorOpen = !doorOpen;
      doorTargetRot = doorOpen ? doorOpenRot : doorClosedRot;
      if (doorOpen) engine.removeCollider(doorClosedBox);
      else engine.addCollider(doorClosedBox);
    },
  });

  // ---------- per-frame update ----------
  function update(dt = 1 / 60) {
    // smoothly swing the north door toward its open/closed target angle
    doorPivot.rotation.y += (doorTargetRot - doorPivot.rotation.y) * Math.min(1, dt * 6);
  }

  // eastDoorZ: the doorway sits in the middle of the east wall —
  // corridor.js's createCorridorEast starts here and runs further east toward room7.
  const eastDoorZ = centerZ;

  // southZ/southDoorX: the doorway sits in the middle of the south wall —
  // corridor.js's createCorridorSouth starts here and runs further south toward room8.
  const southZ = centerZ + ROOM_D / 2;
  const southDoorX = centerX;

  // northZ/northDoorX: the doorway sits in the middle of the north wall —
  // corridor.js's createCorridor starts here and runs further north toward room9.
  const northZ = centerZ - ROOM_D / 2;
  const northDoorX = centerX;

  return { colliders, update, centerX, centerZ, westX, eastX, eastDoorZ, southZ, southDoorX, northZ, northDoorX };
}

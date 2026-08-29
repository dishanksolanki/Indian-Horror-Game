// room9.js — ROOM 9: a side room of the haveli, reached via a corridor
// running north from room6's north doorway.
// South wall has a doorway gap matching the corridor width (entrance from room6).
// North wall now also has a matching doorway gap (exit toward hall1 via a ninth corridor).
// East/west walls remain solid, no window.
//
// Also holds "book2", one of the four collectible storybooks (see books.js)
// that must all be gathered and racked on the holder in room25 before its
// north door will open.
//
// The north door here uses the SAME trishul-lock system as room6's north
// door: it stays locked until the trishul is placed on its holder in
// room7. Since this room has no direct reference to room7, it listens on
// the same shared "trishulPlaced" flag via engine.getFlag()/onFlag().
import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";
import { addBookPickup } from "./books.js";
const ROOM_W = 6; // east-west
const ROOM_D = 6.5; // north-south
const ROOM_H = 2.9;
const DOOR_GAP = 1.6; // must match corridor width
// doorZ: the z coordinate where room9's south wall (and doorway) sits —
// this is corridor8.endZ, so the door lines up exactly with the passage.
// doorX: the x coordinate of the doorway, matching the corridor's x (room6's north door).
export function createRoom9(scene, engine, doorZ, doorX) {
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
  const northZ = centerZ - ROOM_D / 2;
  const southZ = centerZ + ROOM_D / 2; // == doorZ
  // north wall — doorway gap in the middle, aligned with the corridor to hall1
  const northSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(centerX, northZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel
  // west wall — solid, no window
  addWallBox(centerX - ROOM_W / 2, centerZ, t, ROOM_D + t);
  // east wall — solid, no window
  addWallBox(centerX + ROOM_W / 2, centerZ, t, ROOM_D + t);
  // south wall — doorway gap in the middle, aligned with the corridor from room6
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(centerX, southZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- collectible: book2 ----------
  // Sitting in the south-west corner, clear of both doorways.
  addBookPickup(
    scene,
    engine,
    { x: centerX - 1.8, y: 0.05, z: centerZ + 1.9 },
    "book2",
    "Torn Ledger"
  );

  // =========================================================
  // ---------- wooden door filling the north doorway gap (to hall1) ----------
  // Same dark-wood, iron-studded haveli door + lock system as room6's
  // north door: mounted on a hinge pivot, stays locked until the trishul
  // is placed on its holder in room7 (shared "trishulPlaced" flag).
  // =========================================================
  const doorWoodMat = new THREE.MeshStandardMaterial({ color: 0x3a2415, roughness: 0.78, metalness: 0.04 });
  const doorIronMat = new THREE.MeshStandardMaterial({ color: 0x2b2822, roughness: 0.55, metalness: 0.6 });
  const doorHandleMat = new THREE.MeshStandardMaterial({ color: 0x8a7250, roughness: 0.4, metalness: 0.65 });

  const northWallZ = northZ;
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
  // in room7. room9 has no direct reference to room7, so the two rooms talk
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
        console.log("[room9.js] north door is locked — place the trishul on its holder in room7 first.");
        return;
      }
      doorOpen = !doorOpen;
      doorTargetRot = doorOpen ? doorOpenRot : doorClosedRot;
      if (doorOpen) engine.removeCollider(doorClosedBox);
      else engine.addCollider(doorClosedBox);
    },
  });

  // ---------- per-frame update: no scene lights — player relies on the
  // flashlight; also smoothly swings the north door toward its target angle ----------
  function update(dt = 1 / 60) {
    doorPivot.rotation.y += (doorTargetRot - doorPivot.rotation.y) * Math.min(1, dt * 6);
  }

  // northDoorX: the doorway sits in the middle of the north wall —
  // corridor.js's createCorridor starts here and runs further north toward hall1.
  return { colliders, update, centerX, centerZ, northZ, southZ, northDoorX: centerX };
}

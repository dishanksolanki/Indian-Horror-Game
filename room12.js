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

  // ---------- wooden door (north doorway) — swings open/closed, blocks the way to room15 while shut ----------
  const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x1c130a, roughness: 0.85 });
  const doorPanelMat = new THREE.MeshStandardMaterial({ color: 0x4a2e17, roughness: 0.75, metalness: 0.03 });
  const doorHandleMat = new THREE.MeshStandardMaterial({ color: 0x8a7442, roughness: 0.4, metalness: 0.7 });

  const DOOR_H = ROOM_H - 0.45; // clears the lintel above
  const DOOR_THICK = 0.08;
  const doorPanelW = DOOR_GAP - 0.1; // slight clearance either side of the frame
  const doorFaceZ = northZ + t / 2 + 0.03; // flush against the interior (room12) face of the north wall
  const hingeX = -DOOR_GAP / 2 + 0.03; // hinge sits at the west edge of the doorway

  // simple frame trim around the opening — also used as the (static, world-positioned) interact target
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_GAP + 0.14, DOOR_H + 0.08, 0.1),
    doorFrameMat
  );
  doorFrame.position.set(0, DOOR_H / 2, doorFaceZ - 0.04);
  doorFrame.castShadow = doorFrame.receiveShadow = true;
  scene.add(doorFrame);

  // pivot group at the hinge — the panel is offset from it so it spans the doorway when closed
  const doorPivot = new THREE.Group();
  doorPivot.position.set(hingeX, DOOR_H / 2, doorFaceZ);
  scene.add(doorPivot);

  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(doorPanelW, DOOR_H, DOOR_THICK),
    doorPanelMat
  );
  doorPanel.position.set(doorPanelW / 2, 0, 0);
  doorPanel.castShadow = doorPanel.receiveShadow = true;
  doorPivot.add(doorPanel);

  // a couple of horizontal ribs for a simple plank-door look
  for (const ry of [DOOR_H * 0.28, -DOOR_H * 0.28]) {
    const rib = new THREE.Mesh(
      new THREE.BoxGeometry(doorPanelW - 0.08, 0.05, DOOR_THICK + 0.015),
      doorPanelMat
    );
    rib.position.set(doorPanelW / 2, ry, 0);
    doorPivot.add(rib);
  }

  // handle near the far (non-hinge) edge
  const doorHandle = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), doorHandleMat);
  doorHandle.position.set(doorPanelW - 0.1, 0, DOOR_THICK / 2 + 0.02);
  doorPivot.add(doorHandle);

  // ---------- door collider: blocks the doorway while closed, removed while open ----------
  const doorClosedBox = new THREE.Box3(
    new THREE.Vector3(hingeX - 0.05, 0, doorFaceZ - DOOR_THICK),
    new THREE.Vector3(hingeX + doorPanelW + 0.05, DOOR_H, doorFaceZ + DOOR_THICK)
  );
  colliders.push(doorClosedBox);
  engine.addCollider(doorClosedBox);

  // door state machine: closed -> opening -> open -> closing -> closed
  let doorState = "closed";
  let doorT = 0;
  const DOOR_ANIM_DURATION = 0.9; // seconds
  const DOOR_OPEN_ANGLE = Math.PI * 0.55;

  const doorInteractable = engine.addInteractable(doorFrame, {
    radius: 2.2,
    prompt: "Open Door",
    onInteract: () => {
      if (doorState === "closed") {
        doorState = "opening";
        doorT = 0;
        // swinging clear of the opening — let the collider go so the player can walk through
        const idx = engine.colliders.indexOf(doorClosedBox);
        if (idx !== -1) engine.colliders.splice(idx, 1);
        doorInteractable.prompt = "Close Door";
      } else if (doorState === "open") {
        doorState = "closing";
        doorT = 0;
        doorInteractable.prompt = "Open Door";
      }
      // interacts mid-swing ("opening"/"closing") are ignored — let the animation settle first
    },
  });

  function updateDoor(dt) {
    if (doorState === "opening") {
      doorT = Math.min(1, doorT + dt / DOOR_ANIM_DURATION);
      const eased = 1 - Math.pow(1 - doorT, 3); // ease-out
      doorPivot.rotation.y = -eased * DOOR_OPEN_ANGLE;
      if (doorT >= 1) doorState = "open";
    } else if (doorState === "closing") {
      doorT = Math.min(1, doorT + dt / DOOR_ANIM_DURATION);
      const eased = 1 - Math.pow(1 - doorT, 3); // ease-out
      doorPivot.rotation.y = -DOOR_OPEN_ANGLE + eased * DOOR_OPEN_ANGLE;
      if (doorT >= 1) {
        doorState = "closed";
        doorPivot.rotation.y = 0;
        // fully shut again — block the doorway once more
        if (!engine.colliders.includes(doorClosedBox)) engine.addCollider(doorClosedBox);
      }
    }
  }

  // ---------- per-frame update: no scene lights anymore — player relies on the flashlight ----------
  function update(dt = 0) {
    updateDoor(dt);
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

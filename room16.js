// room16.js — ROOM 16: a small connecting landing between the two far wings of the
// haveli. Reached via a corridor running north from room15's north doorway, and in
// turn connects onward (east, then south) via a bridging corridor to hall1, and also
// (west, then north) via a second bridging corridor to room24, and now also north
// via a corridor to room25 — the haveli's final chamber, which holds the ancient
// door / win condition that used to be mounted (non-functionally) here.
// South wall has a doorway gap matching the corridor width (entrance from room15).
// East wall also has a doorway gap, leading to the long bridging corridor to hall1.
// West wall also has a doorway gap, leading to the long bridging corridor to room24.
// North wall now also has a doorway gap, leading onward via a corridor to room25.

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

  // north wall — doorway gap in the middle, leading onward via a corridor to room25
  const northSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(centerX, northZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

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

  // =========================================================
  // ---------- wooden double door filling the north doorway gap (to room25) ----------
  // This carries the "ancient door" look that used to live in this room —
  // dark wood, iron studs, ring handles, two hinged panels — but now it's
  // just a normal, unlocked passage door: no plank barricade, no hammer
  // requirement, no win event. Walk up, press E, it swings open like any
  // other door. The actual win condition now lives on room25's north door.
  // =========================================================
  const doorWoodMat = new THREE.MeshStandardMaterial({ color: 0x2b1c10, roughness: 0.7, metalness: 0.05 });
  const doorStudMat = new THREE.MeshStandardMaterial({ color: 0x8a7442, roughness: 0.4, metalness: 0.7 });
  const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x1c130a, roughness: 0.85 });

  const doorW = DOOR_GAP - 0.1; // slight margin so panels clear the frame
  const doorH = ROOM_H - 0.55;
  const panelW = doorW / 2;
  const doorThickness = 0.07;

  // frame jambs on either side of the gap
  const jambGeo = new THREE.BoxGeometry(0.08, doorH + 0.06, t);
  [centerX - DOOR_GAP / 2 + 0.04, centerX + DOOR_GAP / 2 - 0.04].forEach((jx) => {
    const jamb = new THREE.Mesh(jambGeo, doorFrameMat);
    jamb.position.set(jx, (doorH + 0.06) / 2, northZ);
    jamb.castShadow = true;
    jamb.receiveShadow = true;
    scene.add(jamb);
  });

  // two hinged panels — pivots sit at the outer edges of the gap, each panel
  // extending inward toward the middle, so they swing open away from each other
  function makeNorthDoorPanel(sign) {
    const pivot = new THREE.Group();
    pivot.position.set(centerX + sign * (doorW / 2), 0, northZ);
    scene.add(pivot);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(panelW - 0.02, doorH, doorThickness), doorWoodMat);
    panel.position.set(-sign * (panelW / 2), doorH / 2, 0);
    panel.castShadow = true;
    panel.receiveShadow = true;
    pivot.add(panel);

    // a few decorative iron studs down the middle of the panel
    for (let row = -1; row <= 1; row++) {
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), doorStudMat);
      stud.position.set(-sign * (panelW / 2), doorH / 2 + row * (doorH / 3.2), doorThickness / 2 + 0.01);
      pivot.add(stud);
    }

    // ring handle near the inner edge
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.01, 6, 12), doorStudMat);
    ring.position.set(-sign * (panelW - 0.12), doorH / 2, doorThickness / 2 + 0.02);
    pivot.add(ring);

    return pivot;
  }

  const northDoorPanelLeft = makeNorthDoorPanel(-1);
  const northDoorPanelRight = makeNorthDoorPanel(1);

  // world-space anchor for the interactable — the panels are nested inside
  // their own pivots, so their .position is local, not world; a dedicated
  // top-level anchor keeps the "look at it to focus" check accurate.
  const northDoorAnchor = new THREE.Object3D();
  northDoorAnchor.position.set(centerX, doorH / 2, northZ);
  scene.add(northDoorAnchor);

  // closed-door collider — blocks the gap until opened
  const northDoorClosedBox = new THREE.Box3(
    new THREE.Vector3(centerX - doorW / 2, 0, northZ - 0.1),
    new THREE.Vector3(centerX + doorW / 2, doorH, northZ + 0.1)
  );
  colliders.push(northDoorClosedBox);
  engine.addCollider(northDoorClosedBox);

  let northDoorOpen = false;
  let northDoorSwing = 0; // 0 = closed .. 1 = open, eased toward its target each frame
  const NORTH_DOOR_OPEN_ANGLE = Math.PI * 0.55;

  engine.addInteractable(northDoorAnchor, {
    radius: 2.2,
    prompt: () => (northDoorOpen ? "Close Door" : "Open Door"),
    onInteract: () => {
      northDoorOpen = !northDoorOpen;
      if (northDoorOpen) engine.removeCollider(northDoorClosedBox);
      else engine.addCollider(northDoorClosedBox);
    },
  });

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

    // smoothly swing the north door's two panels toward their open/closed target
    const target = northDoorOpen ? 1 : 0;
    northDoorSwing += (target - northDoorSwing) * Math.min(1, dt * 6);
    const eased = 1 - Math.pow(1 - northDoorSwing, 3); // ease-out
    northDoorPanelLeft.rotation.y = -eased * NORTH_DOOR_OPEN_ANGLE;
    northDoorPanelRight.rotation.y = eased * NORTH_DOOR_OPEN_ANGLE;
  }

  // eastDoorZ: the doorway sits in the middle of the east wall — bridging corridor to hall1 starts here.
  const eastDoorZ = centerZ;
  // westDoorZ: the doorway sits in the middle of the west wall — bridging corridor to room24 starts here.
  const westDoorZ = centerZ;
  // northDoorX: the doorway sits in the middle of the north wall — corridor.js's
  // createCorridorNorth starts here and runs further north toward room25.
  const northDoorX = centerX;

  return { colliders, update, centerX, centerZ, northZ, southZ, westX, eastX, eastDoorZ, westDoorZ, northDoorX };
}

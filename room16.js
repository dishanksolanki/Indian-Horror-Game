// room16.js — ROOM 16: a small connecting landing between the two far wings of the
// haveli. Reached via a corridor running north from room15's north doorway, and in
// turn connects onward (east, then south) via a bridging corridor to hall1, and also
// (west, then north) via a second bridging corridor to room24.
// South wall has a doorway gap matching the corridor width (entrance from room15).
// East wall also has a doorway gap, leading to the long bridging corridor to hall1.
// West wall also has a doorway gap, leading to the long bridging corridor to room24.
// North wall remains solid, no window.

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

  // shared inventory bag lives on the engine so any room can read/write it.
  // Guarded here in case room16 happens to load before room17 does.
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

  // north wall — solid, no window
  addWallBox(centerX, northZ, ROOM_W + t, t);

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

  // ---------- the ancient door (north wall) — this is the win condition ----------
  // NOT a passage: the north wall stays fully solid/collidable (see addWallBox
  // above). This is a decorative double door mounted flush against the inside
  // face of that wall. Walking up to it and pressing [E] opens it and ends the
  // game — see the "game:win" event dispatched below, handled in main.js.
  //
  // It's nailed shut with wooden planks (see below): the "Open the door"
  // interactable isn't registered at all until the planks are pried off, so
  // there's no way to trigger the win condition while they're still up. And
  // the planks themselves can only be removed once the player has picked up
  // the hammer from the table in room17 (engine.inventory.hammer).
  const doorFrameMat = new THREE.MeshStandardMaterial({ color: 0x1c130a, roughness: 0.85 });
  const doorPanelMat = new THREE.MeshStandardMaterial({ color: 0x2b1c10, roughness: 0.7, metalness: 0.05 });
  const doorStudMat = new THREE.MeshStandardMaterial({ color: 0x8a7442, roughness: 0.4, metalness: 0.7 });

  const DOOR_W = 2.6;
  const DOOR_H = 2.5;
  const doorFaceZ = northZ + t / 2 + 0.03; // just off the interior face of the north wall
  const panelW = DOOR_W / 2;

  // frame
  const doorFrame = new THREE.Mesh(
    new THREE.BoxGeometry(DOOR_W + 0.4, DOOR_H + 0.3, 0.12),
    doorFrameMat
  );
  doorFrame.position.set(centerX, DOOR_H / 2 + 0.05, doorFaceZ - 0.05);
  doorFrame.castShadow = doorFrame.receiveShadow = true;
  scene.add(doorFrame);

  // two hinged panels, pivoting at their outer edges so they can swing open
  function makeDoorPanel(sign) {
    const pivot = new THREE.Group();
    pivot.position.set(centerX + sign * panelW, DOOR_H / 2, doorFaceZ);

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(panelW - 0.04, DOOR_H - 0.1, 0.08),
      doorPanelMat
    );
    panel.position.x = -sign * (panelW / 2);
    panel.castShadow = panel.receiveShadow = true;
    pivot.add(panel);

    // a few decorative iron studs down the middle of the panel
    for (let row = -1; row <= 1; row++) {
      const stud = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), doorStudMat);
      stud.position.set(-sign * (panelW / 2), row * (DOOR_H / 3.2), 0.05);
      pivot.add(stud);
    }

    // ring handle near the inner edge
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.015, 6, 12),
      doorStudMat
    );
    ring.position.set(-sign * (panelW - 0.15), 0, 0.06);
    pivot.add(ring);

    scene.add(pivot);
    return pivot;
  }

  const doorPanelLeft = makeDoorPanel(-1);
  const doorPanelRight = makeDoorPanel(1);

  // door state machine: closed -> opening (animated swing) -> open
  let doorState = "closed";
  let doorOpenT = 0;
  const DOOR_OPEN_DURATION = 1.4; // seconds
  const DOOR_OPEN_ANGLE = Math.PI * 0.6;

  function openDoor() {
    if (doorState !== "closed") return;
    doorState = "opening";
    window.dispatchEvent(new CustomEvent("game:win"));
  }

  // ---------- plank barricade across the door (requires the hammer) ----------
  // A few nailed wooden planks block the door until removed. Only a "Remove
  // Plank" interactable exists at first; the door's own "Open the door"
  // interactable is registered lazily inside the plank's onInteract, once it
  // has actually been pried off — so the win condition is unreachable until then.
  //
  // Removing the plank requires engine.inventory.hammer to be true (picked up
  // from the table in room17 — see room17.js). Without it, interacting with
  // the plank does nothing except update the on-screen prompt to say so.
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x3b2a18, roughness: 0.95 });
  const nailMat = new THREE.MeshStandardMaterial({ color: 0x555049, roughness: 0.6, metalness: 0.5 });

  const plankWidth = DOOR_W + 0.3; // slight overlap onto the frame either side
  const plankZ = doorFaceZ + 0.14; // just in front of the door, inside the room, blocking it

  const plankGroup = new THREE.Group();
  plankGroup.position.set(centerX, 0, plankZ);
  scene.add(plankGroup);

  // three roughly-nailed planks at different heights, each tilted slightly
  // so they don't read as too clean/uniform
  const plankDefs = [
    { y: 0.6, tilt: 0.05 },
    { y: 1.3, tilt: -0.06 },
    { y: 2.0, tilt: 0.04 },
  ];

  const plankMeshes = [];
  for (const def of plankDefs) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(plankWidth, 0.24, 0.06), plankMat);
    plank.position.set(0, def.y, 0);
    plank.rotation.z = def.tilt;
    plank.castShadow = true;
    plank.receiveShadow = true;
    plankGroup.add(plank);
    plankMeshes.push(plank);

    // crude nail heads at each end for detail
    for (const nx of [-plankWidth / 2 + 0.15, plankWidth / 2 - 0.15]) {
      const nail = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), nailMat);
      nail.position.set(nx, def.y, 0.035);
      plankGroup.add(nail);
    }
  }

  const PLANK_PROMPT_LOCKED = "Nailed Shut — Need a Hammer";
  const PLANK_PROMPT_READY = "Remove Plank";

  let plankRemoved = false;
  const plankInteractable = engine.addInteractable(plankGroup, {
    radius: 2.6,
    prompt: PLANK_PROMPT_LOCKED,
    onInteract: () => {
      if (plankRemoved) return;
      if (!engine.inventory.hammer) return; // no hammer yet — plank won't budge

      plankRemoved = true;

      // drop the plank interactable so it can't be re-triggered / re-focused
      const ix = engine.interactables.indexOf(plankInteractable);
      if (ix !== -1) engine.interactables.splice(ix, 1);

      // now — and only now — does the door itself become interactable
      engine.addInteractable(doorFrame, {
        radius: 2.6,
        prompt: "Open the door",
        onInteract: openDoor,
      });

      // quick "pried loose and dropped" animation, then clean up the meshes
      let t = 0;
      const startRotations = plankMeshes.map((p) => p.rotation.z);
      const startY = plankMeshes.map((p) => p.position.y);
      function fall() {
        const dt = 1 / 60;
        t += dt;
        for (let i = 0; i < plankMeshes.length; i++) {
          plankMeshes[i].position.y = startY[i] - t * t * 2.2;
          plankMeshes[i].rotation.z = startRotations[i] + t * 2.6 * (i % 2 === 0 ? 1 : -1);
        }
        if (t < 0.6) {
          requestAnimationFrame(fall);
        } else {
          scene.remove(plankGroup);
        }
      }
      fall();
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

    // keep the plank prompt in sync with whether the player has the hammer yet
    if (!plankRemoved) {
      plankInteractable.prompt = engine.inventory.hammer ? PLANK_PROMPT_READY : PLANK_PROMPT_LOCKED;
    }

    // animate the door swinging open once the player has interacted with it
    if (doorState === "opening") {
      doorOpenT = Math.min(1, doorOpenT + dt / DOOR_OPEN_DURATION);
      const eased = 1 - Math.pow(1 - doorOpenT, 3); // ease-out
      doorPanelLeft.rotation.y = -eased * DOOR_OPEN_ANGLE;
      doorPanelRight.rotation.y = eased * DOOR_OPEN_ANGLE;
      if (doorOpenT >= 1) doorState = "open";
    }
  }

  // eastDoorZ: the doorway sits in the middle of the east wall — bridging corridor to hall1 starts here.
  const eastDoorZ = centerZ;
  // westDoorZ: the doorway sits in the middle of the west wall — bridging corridor to room24 starts here.
  const westDoorZ = centerZ;

  return { colliders, update, centerX, centerZ, northZ, southZ, westX, eastX, eastDoorZ, westDoorZ };
}

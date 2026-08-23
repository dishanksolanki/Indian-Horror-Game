// room25.js — ROOM 25: the haveli's final chamber, reached via a corridor
// running north from room16's north doorway. A small, dead-end room whose
// north wall holds the ancient double door — the win condition.
// South wall has a doorway gap matching the corridor width (entrance from room16).
// North/east/west walls remain solid, no window — this is the end of the line.
//
// The north door is gated by TWO independent puzzles that must BOTH be
// solved before it can be opened at all:
//   1. The plank barricade — requires the hammer (engine.inventory.hammer,
//      picked up from the table in room17). See the plank section below.
//   2. The book holder — requires all four collectible storybooks
//      (engine.inventory.book1..book4, scattered in rooms 8, 9, 13 and 22 —
//      see books.js) to be gathered and racked here. See the holder section
//      below.
// Only once the plank has been removed AND all four books have been placed
// does tryUnlockDoor() actually register the "Open the door" interactable —
// see that function near the bottom of the file. Until then, pressing E on
// the door does nothing because it isn't interactable yet.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 6; // east-west
const ROOM_D = 6; // north-south
const ROOM_H = 3.0;
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where room25's south wall (and doorway) sits —
// this is the corridor's endZ, so the door lines up exactly with the passage from room16.
// doorX: the x coordinate of the doorway, matching the corridor's x (room16's north door).
export function createRoom25(scene, engine, doorZ, doorX) {
  const colliders = [];

  // shared inventory bag lives on the engine so any room can read/write it.
  // Guarded here in case room25 happens to load before room17/books do.
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

  // north wall — solid, no window (the ancient door is mounted flush against it)
  addWallBox(centerX, northZ, ROOM_W + t, t);

  // west wall — solid, dead end of this wing
  addWallBox(westX, centerZ, t, ROOM_D + t);
  // east wall — solid, dead end of this wing
  addWallBox(eastX, centerZ, t, ROOM_D + t);

  // south wall — doorway gap in the middle, aligned with the corridor from room16
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
  // The "Open the door" interactable is only ever registered by
  // tryUnlockDoor(), once BOTH the plank is removed AND all four books are
  // placed on the holder — see the bottom of this function.
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

  // ---------- shared unlock gate ----------
  // Called after either sub-puzzle below completes. Only registers the
  // door's own interactable once BOTH are true, and only does so once.
  let plankRemoved = false;
  let booksPlaced = false;
  let doorUnlocked = false;

  function tryUnlockDoor() {
    if (doorUnlocked) return;
    if (!plankRemoved || !booksPlaced) {
      console.log(
        `[room25.js] tryUnlockDoor() — not yet: plankRemoved=${plankRemoved}, booksPlaced=${booksPlaced}`
      );
      return;
    }
    doorUnlocked = true;
    engine.addInteractable(doorFrame, {
      radius: 2.6,
      prompt: "Open the door",
      onInteract: openDoor,
    });
    console.log("[room25.js] plank removed AND all books placed — the ancient door can now be opened");
  }

  // ---------- plank barricade across the door (requires the hammer) ----------
  // A few nailed wooden planks block the door until removed. Interacting
  // with the plank only works once engine.inventory.hammer is true (picked
  // up from the table in room17 — see room17.js). Removing it sets
  // plankRemoved and calls tryUnlockDoor() — it no longer registers the door
  // interactable directly, since the book holder must also be satisfied.
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

      tryUnlockDoor();
    },
  });

  // ---------- book holder (west wall) — collect all 4 books, then place them here ----------
  // The four storybooks (see books.js) are scattered through rooms 8, 9, 13
  // and 22. Collecting one just sets an engine.inventory flag — it doesn't
  // occupy the single held-item slot, so the player can gather all four
  // independently of whatever else they're carrying/holding (e.g. the
  // hammer, or nothing at all).
  //
  // Walking up to this holder and pressing [E] only does something once all
  // four flags are true; it then racks all four books on the shelf in one
  // go, sets booksPlaced, and calls tryUnlockDoor(). Before that, the prompt
  // shows a live "X/4 found" count so the player knows they're missing some.
  const holderMat = new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.85 });
  const holderGroup = new THREE.Group();
  holderGroup.position.set(westX + 0.55, 0, centerZ);
  scene.add(holderGroup);

  // simple two-shelf bookcase carcass
  const shelfGeo = new THREE.BoxGeometry(0.85, 0.05, 0.3);
  for (const y of [0.9, 1.5]) {
    const shelf = new THREE.Mesh(shelfGeo, holderMat);
    shelf.position.set(0, y, 0);
    shelf.castShadow = shelf.receiveShadow = true;
    holderGroup.add(shelf);
  }
  const backPanel = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.2, 0.05), holderMat);
  backPanel.position.set(0, 1.2, -0.13);
  backPanel.castShadow = backPanel.receiveShadow = true;
  holderGroup.add(backPanel);
  const sideGeo = new THREE.BoxGeometry(0.05, 1.6, 0.3);
  for (const x of [-0.42, 0.42]) {
    const side = new THREE.Mesh(sideGeo, holderMat);
    side.position.set(x, 1.0, 0);
    side.castShadow = side.receiveShadow = true;
    holderGroup.add(side);
  }

  const BOOK_IDS = ["book1", "book2", "book3", "book4"];
  const BOOK_COVER_COLORS = { book1: 0x7a1f1f, book2: 0x1f3d7a, book3: 0x1f5a2e, book4: 0x5a3d1f };

  function placeBookOnShelf(bookId, slotIndex) {
    const mat = new THREE.MeshStandardMaterial({
      color: BOOK_COVER_COLORS[bookId] ?? 0x3a2a1a,
      roughness: 0.6,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.24, 0.04), mat);
    mesh.position.set(-0.3 + slotIndex * 0.2, 1.02, 0.02);
    mesh.rotation.z = (Math.random() - 0.5) * 0.08;
    mesh.castShadow = true;
    holderGroup.add(mesh);
  }

  const holderInteractable = engine.addInteractable(holderGroup, {
    radius: 2.2,
    prompt: () => {
      if (booksPlaced) return "Books Placed";
      const have = BOOK_IDS.filter((id) => engine.inventory[id]).length;
      return `Place Books on Holder (${have}/4 found)`;
    },
    onInteract: () => {
      if (booksPlaced) return;
      const allFound = BOOK_IDS.every((id) => engine.inventory[id]);
      if (!allFound) {
        console.log(
          "[room25.js] book holder interacted with, but not all books collected yet: " +
            BOOK_IDS.map((id) => `${id}=${!!engine.inventory[id]}`).join(", ")
        );
        return;
      }
      booksPlaced = true;
      BOOK_IDS.forEach((id, i) => placeBookOnShelf(id, i));
      console.log("[room25.js] all 4 books placed on holder");
      tryUnlockDoor();
    },
  });

  // ---------- ambient room lighting: dim, hushed — the last room in the house ----------
  const ambient = new THREE.AmbientLight(0x231e18, 1.0);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x453b2e, 0x160f0a, 0.6);
  scene.add(fillLight);

  const chamberLight = new THREE.PointLight(0xffcf8a, 1.5, 6, 2);
  chamberLight.position.set(centerX, ROOM_H - 0.3, centerZ);
  scene.add(chamberLight);

  // ---------- per-frame update: gentle flicker, plank prompt sync, door-swing animation ----------
  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    chamberLight.intensity = 1.3 + Math.sin(flickerT * 6) * 0.25 + (Math.random() - 0.5) * 0.3;

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

  return { colliders, update, centerX, centerZ, northZ, southZ, westX, eastX };
}

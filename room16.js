// room16.js — ROOM 16: a small connecting landing between the two far wings of the
// haveli. Reached via a corridor running north from room15's north doorway, and in
// turn connects onward (east, then south) via a bridging corridor to hall1, and also
// (west, then north) via a second bridging corridor to room24.
// South wall has a doorway gap matching the corridor width (entrance from room15).
// East wall also has a doorway gap, leading to the long bridging corridor to hall1.
// West wall also has a doorway gap, leading to the long bridging corridor to room24.
// North wall holds the big main door — the way out of the haveli / the game's ending
// door. It's boarded shut with a plank; the player needs the hammer from room17 to
// break the plank off before the door can be opened.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";
import { createPlankBarricade, gameState } from "./shared.js";

const ROOM_W = 6; // east-west
const ROOM_D = 6; // north-south
const ROOM_H = 3.0;
const DOOR_GAP = 1.6; // must match corridor width (south/east/west doors)
const MAIN_DOOR_GAP = 2.2; // wider — this is the big exit door, not a corridor

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

  // a collider that can later be removed (used for the door leaves, which
  // start closed/solid and get taken out of the collision list once opened)
  function addRemovableCollider(mesh) {
    const box = new THREE.Box3().setFromObject(mesh);
    engine.addCollider(box);
    return box;
  }
  function removeCollider(box) {
    const idx = engine.colliders.indexOf(box);
    if (idx !== -1) engine.colliders.splice(idx, 1);
  }

  const northZ = centerZ - ROOM_D / 2;
  const southZ = centerZ + ROOM_D / 2; // == doorZ
  const westX = centerX - ROOM_W / 2;
  const eastX = centerX + ROOM_W / 2;

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

  // north wall — the big main door. Gap is wider than the corridor doors, and
  // there's no lintel box: the door leaves themselves fill the full height.
  const mainSideLen = (ROOM_W - MAIN_DOOR_GAP) / 2;
  addWallBox(centerX - (MAIN_DOOR_GAP / 2 + mainSideLen / 2), northZ, mainSideLen, t);
  addWallBox(centerX + (MAIN_DOOR_GAP / 2 + mainSideLen / 2), northZ, mainSideLen, t);
  addWallBox(centerX, northZ, MAIN_DOOR_GAP, t, 0.35, ROOM_H - 0.175); // header above the door

  // ---------- the main door itself: two hinged, iron-studded wood leaves ----------
  const DOOR_H = ROOM_H - 0.35;
  const leafWidth = MAIN_DOOR_GAP / 2;
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x241a10, roughness: 0.75 });
  const studMat = new THREE.MeshStandardMaterial({ color: 0x2c2620, roughness: 0.35, metalness: 0.8 });

  function makeDoorLeaf(hingeX, sign) {
    // pivot sits at the hinge edge; the leaf mesh is offset from it, so
    // rotating the pivot swings the door open around that edge.
    const pivot = new THREE.Group();
    pivot.position.set(hingeX, 0, northZ);
    scene.add(pivot);

    const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafWidth, DOOR_H, 0.08), leafMat);
    leaf.position.set(sign * leafWidth / 2, DOOR_H / 2, 0);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    pivot.add(leaf);

    // decorative iron studs, two rows
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), studMat);
        stud.position.set(
          sign * (leafWidth * 0.25 + col * leafWidth * 0.5),
          DOOR_H * (0.3 + row * 0.4),
          0.045
        );
        pivot.add(stud);
      }
    }

    const collider = addRemovableCollider(leaf);
    return { pivot, leaf, collider, openTarget: sign > 0 ? -Math.PI / 2.1 : Math.PI / 2.1 };
  }

  const leftLeaf = makeDoorLeaf(centerX - MAIN_DOOR_GAP / 2, 1);
  const rightLeaf = makeDoorLeaf(centerX + MAIN_DOOR_GAP / 2, -1);
  let doorOpen = false;
  let doorOpening = false;

  function openDoor() {
    if (doorOpen || doorOpening) return;
    doorOpening = true;
    removeCollider(leftLeaf.collider);
    removeCollider(rightLeaf.collider);
    // let the world know the ending door has opened — a future main.js can
    // listen for this to trigger an end screen / credits.
    window.dispatchEvent(new CustomEvent("game:mainDoorOpened"));
  }

  // ---------- plank barricade, nailed across the main door ----------
  let plankRemoved = false;
  const plankGroup = createPlankBarricade(MAIN_DOOR_GAP, DOOR_H);
  plankGroup.position.set(centerX, DOOR_H / 2, northZ + 0.16); // just inside the room, facing the player
  scene.add(plankGroup);

  const doorAnchor = new THREE.Object3D();
  doorAnchor.position.set(centerX, 1.5, northZ + 0.3);
  scene.add(doorAnchor);

  engine.addInteractable(doorAnchor, {
    radius: 2.2,
    prompt: "Locked — needs a hammer",
    onInteract: () => {
      if (!plankRemoved) {
        if (!gameState.hasHammer) return; // no hammer yet, nothing happens
        plankRemoved = true;
        scene.remove(plankGroup);
        return;
      }
      if (!doorOpen && !doorOpening) openDoor();
    },
  });
  // grab the entry engine.addInteractable just pushed so its prompt text can
  // be updated live as the puzzle state changes (engine.js renders
  // `[E] ${entry.prompt}` every frame for whichever interactable is focused).
  const doorEntry = engine.interactables[engine.interactables.length - 1];

  // ---------- ambient room lighting: dim, a quiet in-between space ----------
  const ambient = new THREE.AmbientLight(0x231e18, 1.0);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x453b2e, 0x160f0a, 0.6);
  scene.add(fillLight);

  const landingLight = new THREE.PointLight(0xffcf8a, 1.5, 6, 2);
  landingLight.position.set(centerX, ROOM_H - 0.3, centerZ);
  scene.add(landingLight);

  // ---------- per-frame update ----------
  let flickerT = 0;
  const DOOR_OPEN_SPEED = 1.6; // radians/sec

  function update(dt) {
    flickerT += dt;
    landingLight.intensity = 1.3 + Math.sin(flickerT * 6) * 0.25 + (Math.random() - 0.5) * 0.3;

    // keep the door prompt in sync with puzzle state
    if (!plankRemoved) {
      doorEntry.prompt = gameState.hasHammer
        ? "Break the plank off [E]"
        : "Locked — needs a hammer";
    } else if (!doorOpen) {
      doorEntry.prompt = "Open the door [E]";
    }

    // animate the door swinging open once triggered
    if (doorOpening && !doorOpen) {
      let done = true;
      for (const leafState of [leftLeaf, rightLeaf]) {
        const target = leafState.openTarget;
        const current = leafState.pivot.rotation.y;
        const step = DOOR_OPEN_SPEED * dt * Math.sign(target - current);
        if (Math.abs(target - current) > Math.abs(step)) {
          leafState.pivot.rotation.y += step;
          done = false;
        } else {
          leafState.pivot.rotation.y = target;
        }
      }
      if (done) {
        doorOpen = true;
        doorOpening = false;
      }
    }
  }

  // eastDoorZ: the doorway sits in the middle of the east wall — bridging corridor to hall1 starts here.
  const eastDoorZ = centerZ;
  // westDoorZ: the doorway sits in the middle of the west wall — bridging corridor to room24 starts here.
  const westDoorZ = centerZ;

  return { colliders, update, centerX, centerZ, northZ, southZ, westX, eastX, eastDoorZ, westDoorZ };
}

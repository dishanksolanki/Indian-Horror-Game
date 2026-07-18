// room16.js — ROOM 16: a small connecting landing between the two far wings of the
// haveli. Reached via a corridor running north from room15's north doorway, and in
// turn connects onward (east, then south) via a bridging corridor to hall1, and also
// (west, then north) via a second bridging corridor to room24.
// South wall has a doorway gap matching the corridor width (entrance from room15).
// East wall also has a doorway gap, leading to the long bridging corridor to hall1.
// West wall also has a doorway gap, leading to the long bridging corridor to room24.
// North wall remains solid, no window.
//
// NEW: one doorway can be barricaded with nailed wooden planks (see addPlankedDoor
// below). While boarded, a physical collider spans the doorway gap so the player
// can't just walk through it — they have to look at the planks and press E to pry
// them off first. Pick which doorway gets boarded with the `plankedDoor` argument
// at the bottom of createRoom16 ('south' | 'east' | 'west' | null to leave clear).

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 6; // east-west
const ROOM_D = 6; // north-south
const ROOM_H = 3.0;
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where room16's south wall (and doorway) sits —
// this is the corridor's endZ, so the door lines up exactly with the passage from room15.
// doorX: the x coordinate of the doorway, matching the corridor's x (room15's north door).
export function createRoom16(scene, engine, doorZ, doorX, plankedDoor = "south") {
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

  // ---------- planked / barricaded door ----------
  // Nails a few rough wooden planks across a chosen doorway. A thin invisible
  // collider spanning the whole gap keeps the player out until they interact
  // with the planks (E) to remove them. Once removed, the doorway behaves like
  // any other — nothing else about the room changes.
  function addPlankedDoor(doorSide) {
    let plankX, plankZ, rotationY;
    if (doorSide === "south") {
      plankX = centerX; plankZ = southZ; rotationY = 0;
    } else if (doorSide === "east") {
      plankX = eastX; plankZ = centerZ; rotationY = Math.PI / 2;
    } else if (doorSide === "west") {
      plankX = westX; plankZ = centerZ; rotationY = Math.PI / 2;
    } else {
      return; // no door boarded
    }

    const plankWidth = DOOR_GAP + 0.3; // slight overlap onto the frame either side
    const plankMat = new THREE.MeshStandardMaterial({ color: 0x3b2a18, roughness: 0.95 });
    const nailMat = new THREE.MeshStandardMaterial({ color: 0x555049, roughness: 0.6, metalness: 0.5 });

    const plankGroup = new THREE.Group();
    plankGroup.position.set(plankX, 0, plankZ);
    plankGroup.rotation.y = rotationY;
    scene.add(plankGroup);

    // three roughly-nailed planks at different heights, each tilted slightly
    // so they don't read as too clean/uniform
    const plankDefs = [
      { y: 0.55, tilt: 0.06 },
      { y: 1.15, tilt: -0.05 },
      { y: 1.75, tilt: 0.04 },
    ];

    const plankMeshes = [];
    for (const def of plankDefs) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(plankWidth, 0.22, 0.06), plankMat);
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

    // physical barricade: an invisible collider spanning the full doorway gap
    // (floor to lintel) — this is what actually stops the player, independent
    // of the visible plank meshes above.
    const barrierMesh = new THREE.Mesh(
      new THREE.BoxGeometry(DOOR_GAP, ROOM_H - 0.2, 0.12)
    );
    barrierMesh.visible = false;
    barrierMesh.position.set(0, (ROOM_H - 0.2) / 2, 0);
    plankGroup.add(barrierMesh);
    const barrierBox = new THREE.Box3().setFromObject(barrierMesh);
    colliders.push(barrierBox);
    engine.addCollider(barrierBox);

    let removed = false;
    const interactable = engine.addInteractable(plankGroup, {
      radius: 1.8,
      prompt: "Remove Plank",
      onInteract: () => {
        if (removed) return;
        removed = true;

        // remove the physical barrier immediately so the doorway is walkable
        const idxLocal = colliders.indexOf(barrierBox);
        if (idxLocal !== -1) colliders.splice(idxLocal, 1);
        const idxEngine = engine.colliders.indexOf(barrierBox);
        if (idxEngine !== -1) engine.colliders.splice(idxEngine, 1);

        // this interactable has done its job — drop it so it can't be re-triggered
        const ixInteract = engine.interactables.indexOf(interactable);
        if (ixInteract !== -1) engine.interactables.splice(ixInteract, 1);

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
  }

  addPlankedDoor(plankedDoor);

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

  return { colliders, update, centerX, centerZ, northZ, southZ, westX, eastX, eastDoorZ, westDoorZ };
}

// room21.js — ROOM 21: a side room of the haveli, reached via a corridor
// running west from room20's west doorway.
// East wall has a doorway gap matching the corridor width (entrance from room20).
// North wall also has a matching doorway gap (exit toward room22 via a corridor).
// South/west walls remain solid, no window.
//
// UPDATED: this room now holds VRISHCHIK — see vrishchik.js (procedural
// model) and vrishchikenemy.js (state-machine behavior: idle/patrol,
// sees or hears the player, chases, attacks). It replaces the earlier
// Seamstress. Note the import below is "./vrishchikenemy.js" (all
// lowercase) — matching the same all-lowercase filename convention as
// every other file in this project, after an earlier version of this
// file 404'd on a case-sensitive host from an "./chudailEnemy.js"
// (capital E) import that didn't match the real "chudailenemy.js" file
// on disk. Keep every future room's import casing matching the real
// filename exactly to avoid repeating that.
//
// vrishchikenemy.js also actively dims engine.renderer.toneMappingExposure
// as it closes in (see that file's darkenWorld()) — that's a real,
// global lighting change, not just a local effect on its own model, so
// don't be surprised if this room reads noticeably darker than others
// while it's nearby. It restores the exposure on dispose().
//
// On a landed hit it dispatches a "game:caught" window event the same
// way the ancient door in room25 dispatches "game:win" — see main.js for
// that pattern; main.js needs a matching listener added for
// "game:caught" (jumpscare / restart flow), same shape as the existing
// "game:win" listener.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";
import { createVrishchikEnemy } from "./vrishchikenemy.js";

const ROOM_W = 6; // east-west
const ROOM_D = 6.5; // north-south
const ROOM_H = 2.9;
const DOOR_GAP = 1.6; // must match corridor width

// doorX: the x coordinate where room21's east wall (and doorway) sits —
// this is corridor23.endX, so the door lines up exactly with the passage.
// doorZ: the z coordinate of the doorway, matching the corridor's z (room20's west door).
export function createRoom21(scene, engine, doorX, doorZ) {
  const colliders = [];

  // room center sits further west (more negative x) than its east doorway
  const centerX = doorX - ROOM_W / 2;
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

  const westX = centerX - ROOM_W / 2;
  const eastX = centerX + ROOM_W / 2; // == doorX

  // north wall — doorway gap in the middle, aligned with the corridor to room22
  const northSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + northSideLen / 2), centerZ - ROOM_D / 2, northSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + northSideLen / 2), centerZ - ROOM_D / 2, northSideLen, t);
  addWallBox(centerX, centerZ - ROOM_D / 2, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel
  // south wall — solid, no window
  addWallBox(centerX, centerZ + ROOM_D / 2, ROOM_W + t, t);
  // west wall — solid, dead end of this wing
  addWallBox(westX, centerZ, t, ROOM_D + t);

  // east wall — doorway gap in the middle, aligned with the corridor from room20
  const eastSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(eastX, centerZ - (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ + (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // ---------- VRISHCHIK ----------
  // Spawned near the room's north wall. patrolPoints below is only a
  // fallback two-point beat inside this room — room21.js has no
  // visibility into any other room at construction time, and the whole
  // point is for it to roam the entire haveli, not just sit here.
  // main.js overwrites this via vrishchik.setPatrolPoints(...) once every
  // room/corridor has actually been built, handing it a long route across
  // many rooms (see main.js's buildVrishchikPatrolRoute()). If that call
  // is ever removed, it silently falls back to just pacing this room, so
  // this is a non-breaking scaffold rather than a functional requirement
  // of this file.
  // It'll notice the player by sight/range, or get pulled off patrol by a
  // thrown item's noise (engine.onNoise — see engine.js and
  // vrishchikenemy.js for that hook). Its darkenWorld() effect runs
  // continuously in every state based on raw distance to the player, so
  // whichever room it's currently in will dim well before the player ever
  // spots it.
  const vrishchik = createVrishchikEnemy(scene, engine, {
    position: new THREE.Vector3(centerX, 0, centerZ - ROOM_D / 2 + 1.2),
    yaw: Math.PI, // facing south, into the room
    patrolPoints: [
      new THREE.Vector3(centerX - 1.4, 0, centerZ - ROOM_D / 2 + 1.2),
      new THREE.Vector3(centerX + 1.4, 0, centerZ + ROOM_D / 2 - 1.2),
    ],
    onCatchPlayer: () => {
      // Mirrors the "game:win" pattern room25's door uses (see main.js) —
      // main.js needs a matching listener added for this event, e.g.:
      //
      //   window.addEventListener("game:caught", () => {
      //     engine.pause();
      //     engine.controls.unlock();
      //     jumpscareOverlay.classList.add("show"); // or a restart flow
      //   });
      window.dispatchEvent(new CustomEvent("game:caught"));
    },
  });

  // ---------- per-frame update ----------
  function update(dt, eng) {
    vrishchik.update(dt, eng);
  }

  // northZ/northDoorX: the doorway sits in the middle of the north wall —
  // corridor.js's createCorridorNorth starts here and runs further north toward room22.
  const northZ = centerZ - ROOM_D / 2;
  const northDoorX = centerX;

  return { colliders, update, centerX, centerZ, westX, eastX, northZ, northDoorX, vrishchik };
}

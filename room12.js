// room12.js — ROOM 12: a sealed puja room deep in the haveli, reached via a corridor
// running north from room3's north doorway — the true dead end of this wing, past
// the cracked mirror in room3.
// South wall has a doorway gap matching the corridor width (entrance from room3).
// North/east/west walls remain solid, no window.

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

  // north wall — solid, true dead end of the house
  addWallBox(0, northZ, ROOM_W + t, t);
  // east wall — solid, no window
  addWallBox(ROOM_W / 2, centerZ, t, ROOM_D + t);
  // west wall — solid, no window
  addWallBox(-ROOM_W / 2, centerZ, t, ROOM_D + t);

  // south wall — doorway gap in the middle, aligned with the corridor from room3
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(-(DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox((DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(0, southZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- furnishing: a small stone altar against the north wall ----------
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3a352c, roughness: 0.95 });
  const altarBase = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.5), stoneMat);
  altarBase.position.set(0, 0.275, northZ + 0.3);
  altarBase.castShadow = altarBase.receiveShadow = true;
  scene.add(altarBase);

  const altarTop = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.06, 0.6), stoneMat);
  altarTop.position.set(0, 0.58, northZ + 0.3);
  altarTop.castShadow = altarTop.receiveShadow = true;
  scene.add(altarTop);

  const altarBox = new THREE.Box3().setFromObject(altarBase);
  colliders.push(altarBox);
  engine.addCollider(altarBox);

  // a single, unmoving red flame — no flicker, unnaturally still
  const embLight = new THREE.PointLight(0xb3382c, 1.8, 5, 2);
  embLight.position.set(0, 0.75, northZ + 0.3);
  scene.add(embLight);

  const emberGeo = new THREE.ConeGeometry(0.03, 0.09, 6);
  const emberMat = new THREE.MeshBasicMaterial({ color: 0xd94a35 });
  const ember = new THREE.Mesh(emberGeo, emberMat);
  ember.position.set(0, 0.68, northZ + 0.3);
  scene.add(ember);

  // ---------- ambient room lighting: airless, sealed, the deepest silence in the house ----------
  const ambient = new THREE.AmbientLight(0x241f19, 1.0);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x453b2e, 0x160f0a, 0.6);
  scene.add(fillLight);

  // ---------- per-frame update: the ember light does not flicker — it just sits there ----------
  function update() {
    // intentionally static: this room is the one place in the house that doesn't move
  }

  return { colliders, update, centerZ, northZ, southZ };
}

// room2.js — ROOM 2: a second old Indian haveli room, reached via the corridor from room1.
// South wall has a doorway gap matching the corridor width. Other walls are solid, no window.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 6; // east-west
const ROOM_D = 7; // north-south
const ROOM_H = 3.0;
const DOOR_GAP = 1.3; // must match corridor width

// doorZ: the z coordinate where room2's south wall (and doorway) sits —
// this is corridor.endZ, so the door lines up exactly with the passage.
export function createRoom2(scene, engine, doorZ) {
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
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x2e2013, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, ROOM_D), beamMat);
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

  // north wall — solid
  addWallBox(0, northZ, ROOM_W + t, t);
  // east wall — solid, no window
  addWallBox(ROOM_W / 2, centerZ, t, ROOM_D + t);
  // west wall — solid, no window
  addWallBox(-ROOM_W / 2, centerZ, t, ROOM_D + t);

  // south wall — doorway gap in the middle, aligned with the corridor
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(-(DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox((DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(0, southZ, DOOR_GAP, t, 0.5, ROOM_H - 0.25); // lintel

  // ---------- simple furnishing: a low wooden trunk ----------
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2717, roughness: 0.85 });
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.5, 0.6), woodMat);
  trunk.position.set(-ROOM_W / 2 + 0.8, 0.25, centerZ - ROOM_D / 2 + 1.0);
  trunk.castShadow = trunk.receiveShadow = true;
  scene.add(trunk);
  const trunkBox = new THREE.Box3().setFromObject(trunk);
  colliders.push(trunkBox);
  engine.addCollider(trunkBox);

  // ---------- ambient room lighting ----------
  const ambient = new THREE.AmbientLight(0x4a4536, 2.0);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x8a8070, 0x3a3122, 1.2);
  scene.add(fillLight);

  const eerieLight = new THREE.PointLight(0x9fb0c8, 1.8, 8, 2);
  eerieLight.position.set(0, ROOM_H - 0.4, centerZ);
  scene.add(eerieLight);

  // ---------- per-frame update: subtle eerie light pulse ----------
  let pulseT = 0;
  function update(dt) {
    pulseT += dt;
    eerieLight.intensity = 1.6 + Math.sin(pulseT * 1.5) * 0.3;
  }

  return { colliders, update, centerZ };
}

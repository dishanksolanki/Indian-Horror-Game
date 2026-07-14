// room7.js — ROOM 7: a side room of the haveli, reached via a corridor
// running east from room6's east doorway.
// West wall has a doorway gap matching the corridor width (entrance from room6).
// North/south/east walls remain solid, no window — this is the dead end of this wing.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 6; // east-west
const ROOM_D = 6.5; // north-south
const ROOM_H = 2.9;
const DOOR_GAP = 1.6; // must match corridor width

// doorX: the x coordinate where room7's west wall (and doorway) sits —
// this is corridor6.endX, so the door lines up exactly with the passage.
// doorZ: the z coordinate of the doorway, matching the corridor's z (room6's east door).
export function createRoom7(scene, engine, doorX, doorZ) {
  const colliders = [];

  // room center sits further east (more positive x) than its west doorway
  const centerX = doorX + ROOM_W / 2;
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

  const westX = centerX - ROOM_W / 2; // == doorX
  const eastX = centerX + ROOM_W / 2;

  // north wall — solid, no window
  addWallBox(centerX, centerZ - ROOM_D / 2, ROOM_W + t, t);
  // south wall — solid, no window
  addWallBox(centerX, centerZ + ROOM_D / 2, ROOM_W + t, t);
  // east wall — solid, dead end of this wing
  addWallBox(eastX, centerZ, t, ROOM_D + t);

  // west wall — doorway gap in the middle, aligned with the corridor from room6
  const westSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(westX, centerZ - (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ + (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // ---------- ambient room lighting ----------
  const ambient = new THREE.AmbientLight(0x413c30, 1.6);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x7c7364, 0x2c2618, 1.0);
  scene.add(fillLight);

  const eerieLight = new THREE.PointLight(0x9fb0c8, 1.6, 7, 2);
  eerieLight.position.set(centerX, ROOM_H - 0.35, centerZ);
  scene.add(eerieLight);

  // ---------- per-frame update: subtle eerie light pulse ----------
  let pulseT = 0;
  function update(dt) {
    pulseT += dt;
    eerieLight.intensity = 1.4 + Math.sin(pulseT * 1.3) * 0.3;
  }

  return { colliders, update, centerX, centerZ, westX, eastX };
}

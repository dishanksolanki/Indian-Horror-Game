// room3.js — ROOM 3: a third, deeper room in the haveli, reached via a second
// corridor branching off room2's north doorway.
// South wall has a doorway gap matching the corridor width. Other walls are solid.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 5;   // east-west (slightly narrower than room2 — feels tighter)
const ROOM_D = 6;   // north-south
const ROOM_H = 2.8; // slightly lower ceiling — more oppressive
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where room3's south wall (and doorway) sits —
// this is corridor2.endZ, so the door lines up exactly with the passage from room2.
export function createRoom3(scene, engine, doorZ) {
  const colliders = [];

  const centerZ = doorZ - ROOM_D / 2;

  // ---------- floor ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    createFloorMaterial(ROOM_W / 2, ROOM_D / 2)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, centerZ);
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ color: 0x141010, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x241a10, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, ROOM_D), beamMat);
    beam.position.set(i * (ROOM_W / 3), ROOM_H - 0.08, centerZ);
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

  // north wall — solid, dead end
  addWallBox(0, northZ, ROOM_W + t, t);

  // east wall — solid
  addWallBox(ROOM_W / 2, centerZ, t, ROOM_D + t);

  // west wall — solid
  addWallBox(-ROOM_W / 2, centerZ, t, ROOM_D + t);

  // south wall — doorway gap aligned with the corridor from room2
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(-(DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox((DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(0, southZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- furnishing: cracked mirror + small shrine ----------
  const mirrorFrameMat = new THREE.MeshStandardMaterial({ color: 0x1f1712, roughness: 0.7 });
  const mirrorGlassMat = new THREE.MeshStandardMaterial({
    color: 0x30363d,
    roughness: 0.15,
    metalness: 0.6,
  });
  const mirrorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.4, 0.08), mirrorFrameMat);
  mirrorFrame.position.set(0, ROOM_H / 2, northZ + 0.06);
  scene.add(mirrorFrame);
  const mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.2), mirrorGlassMat);
  mirrorGlass.position.set(0, ROOM_H / 2, northZ + 0.11);
  scene.add(mirrorGlass);

  const shrineMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.8 });
  const shrine = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.4), shrineMat);
  shrine.position.set(ROOM_W / 2 - 0.5, 0.35, centerZ + ROOM_D / 2 - 1.0);
  shrine.castShadow = shrine.receiveShadow = true;
  scene.add(shrine);
  const shrineBox = new THREE.Box3().setFromObject(shrine);
  colliders.push(shrineBox);
  engine.addCollider(shrineBox);

  // ---------- lighting: colder, more unstable than room2 ----------
  const ambient = new THREE.AmbientLight(0x35323a, 1.6);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x6a6e80, 0x201c22, 1.0);
  scene.add(fillLight);

  // a single diya-like flame near the shrine
  const flameLight = new THREE.PointLight(0xff7a33, 1.4, 4, 2);
  flameLight.position.set(shrine.position.x, 0.9, shrine.position.z);
  scene.add(flameLight);

  // cold, unstable overhead light — feels wrong compared to room2's steady pulse
  const coldLight = new THREE.PointLight(0x7c8aa0, 1.4, 8, 2);
  coldLight.position.set(0, ROOM_H - 0.3, centerZ);
  scene.add(coldLight);

  // ---------- per-frame update: flickering flame + occasional cold-light stutter ----------
  let flameT = 0;
  let stutterTimer = 1 + Math.random() * 2;
  function update(dt) {
    flameT += dt;
    flameLight.intensity = 1.1 + Math.sin(flameT * 9) * 0.25 + (Math.random() - 0.5) * 0.15;

    stutterTimer -= dt;
    if (stutterTimer <= 0) {
      coldLight.intensity = Math.random() < 0.15 ? 0.1 : 1.4;
      stutterTimer = 0.15 + Math.random() * 2.5;
    }
  }

  return { colliders, update, centerZ, northZ, southZ };
}

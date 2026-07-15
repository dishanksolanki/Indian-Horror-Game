// room11.js — ROOM 11: a walled-off servant's quarter of the haveli, reached via a
// corridor running west from room3's west doorway.
// East wall has a doorway gap matching the corridor width (entrance from room3).
// North/south/west walls remain solid, no window — a second forgotten pocket
// on the far side of room3's mirror, mirroring room10 across the house.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 4.5; // east-west
const ROOM_D = 5; // north-south
const ROOM_H = 2.6; // lowest ceiling in the house — a cramped, sealed-off room

const DOOR_GAP = 1.6; // must match corridor width

// doorX: the x coordinate where room11's east wall (and doorway) sits —
// this is corridor11.endX, so the door lines up exactly with the passage.
// doorZ: the z coordinate of the doorway, matching the corridor's z (room3's west door).
export function createRoom11(scene, engine, doorX, doorZ) {
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
    new THREE.MeshStandardMaterial({ color: 0x120f0b, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x261a0f, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, ROOM_D), beamMat);
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

  const eastX = centerX + ROOM_W / 2; // == doorX
  const westX = centerX - ROOM_W / 2;

  // north wall — solid, no window
  addWallBox(centerX, centerZ - ROOM_D / 2, ROOM_W + t, t);
  // south wall — solid, no window
  addWallBox(centerX, centerZ + ROOM_D / 2, ROOM_W + t, t);
  // west wall — solid, dead end of this wing
  addWallBox(westX, centerZ, t, ROOM_D + t);

  // east wall — doorway gap in the middle, aligned with the corridor from room3
  const eastSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(eastX, centerZ - (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ + (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // ---------- furnishing: a low charpai frame with a torn, folded mattress ----------
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x2f2013, roughness: 0.88 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.95 });

  const cotGroup = new THREE.Group();
  const legPositions = [
    [-0.6, -0.75], [0.6, -0.75], [-0.6, 0.75], [0.6, 0.75],
  ];
  legPositions.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.4, 8), woodMat);
    leg.position.set(lx, 0.2, lz);
    leg.castShadow = true;
    cotGroup.add(leg);
  });
  const frameSideA = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.6), woodMat);
  frameSideA.position.set(-0.6, 0.4, 0);
  const frameSideB = frameSideA.clone(); frameSideB.position.x = 0.6;
  const frameEndA = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 0.05), woodMat);
  frameEndA.position.set(0, 0.4, -0.78);
  const frameEndB = frameEndA.clone(); frameEndB.position.z = 0.78;
  cotGroup.add(frameSideA, frameSideB, frameEndA, frameEndB);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.5), clothMat);
  mattress.position.set(0, 0.46, 0);
  mattress.castShadow = mattress.receiveShadow = true;
  cotGroup.add(mattress);
  cotGroup.position.set(westX + 1.1, 0, centerZ - 1.0);
  cotGroup.rotation.y = -0.1;
  scene.add(cotGroup);
  const cotBox = new THREE.Box3().setFromObject(cotGroup);
  cotBox.min.y = 0; cotBox.max.y = 0.55; // low collider so it just blocks walking through
  colliders.push(cotBox);
  engine.addCollider(cotBox);

  // ---------- ambient room lighting: airless, sealed-off feel ----------
  const ambient = new THREE.AmbientLight(0x322c22, 1.1);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x615848, 0x1e1810, 0.7);
  scene.add(fillLight);

  const sickLight = new THREE.PointLight(0x8a9f6f, 1.1, 6, 2);
  sickLight.position.set(centerX, ROOM_H - 0.3, centerZ);
  scene.add(sickLight);

  // ---------- per-frame update: slow, sickly light pulse ----------
  let pulseT = 0;
  function update(dt) {
    pulseT += dt;
    sickLight.intensity = 0.95 + Math.sin(pulseT * 0.9) * 0.2 + (Math.random() - 0.5) * 0.1;
  }

  return { colliders, update, centerX, centerZ, eastX, westX };
}

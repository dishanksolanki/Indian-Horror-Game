// hall3.js — HALL 3: a large hall of the haveli, sized to match Hall 1/Hall 2
// (10x13m), reached via a corridor running north from room23's north doorway.
// South wall has a doorway gap matching the corridor width (entrance from room23).
// North/east/west walls remain solid, no window — this is the dead end of this wing.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 10; // east-west — matches hall1/hall2
const ROOM_D = 13; // north-south — matches hall1/hall2
const ROOM_H = 3.4; // matches hall1/hall2
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where hall3's south wall (and doorway) sits —
// this is corridor26.endZ, so the door lines up exactly with the passage.
// doorX: the x coordinate of the doorway, matching the corridor's x (room23's north door).
export function createHall3(scene, engine, doorZ, doorX) {
  const colliders = [];

  // hall center sits further north (more negative z) than its south doorway
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
    new THREE.MeshStandardMaterial({ color: 0x18140f, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x2e2013, roughness: 0.9 });
  for (let i = -2; i <= 2; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, ROOM_D), beamMat);
    beam.position.set(centerX + i * (ROOM_W / 5), ROOM_H - 0.12, centerZ);
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

  // north wall — solid, dead end of this wing
  addWallBox(centerX, northZ, ROOM_W + t, t);
  // west wall — solid, no window
  addWallBox(centerX - ROOM_W / 2, centerZ, t, ROOM_D + t);
  // east wall — solid, no window
  addWallBox(centerX + ROOM_W / 2, centerZ, t, ROOM_D + t);

  // south wall — doorway gap in the middle, aligned with the corridor from room23
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(centerX, southZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- decorative wooden pillars flanking the central walkway ----------
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a2717, roughness: 0.85 });
  const pillarRadius = 0.22;
  const pillarPositions = [
    [centerX - 2.6, centerZ - 3], [centerX + 2.6, centerZ - 3],
    [centerX - 2.6, centerZ + 3], [centerX + 2.6, centerZ + 3],
  ];
  pillarPositions.forEach(([px, pz]) => {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(pillarRadius, pillarRadius, ROOM_H, 12),
      pillarMat
    );
    pillar.position.set(px, ROOM_H / 2, pz);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);

    const pillarBox = new THREE.Box3().setFromObject(pillar);
    colliders.push(pillarBox);
    engine.addCollider(pillarBox);
  });

  // ---------- ambient hall lighting ----------
  const ambient = new THREE.AmbientLight(0x413c30, 1.6);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x7c7364, 0x2c2618, 1.0);
  scene.add(fillLight);

  const eerieLightA = new THREE.PointLight(0x9fb0c8, 1.6, 9, 2);
  eerieLightA.position.set(centerX, ROOM_H - 0.4, centerZ - 3.5);
  scene.add(eerieLightA);

  const eerieLightB = new THREE.PointLight(0x9fb0c8, 1.6, 9, 2);
  eerieLightB.position.set(centerX, ROOM_H - 0.4, centerZ + 3.5);
  scene.add(eerieLightB);

  // ---------- per-frame update: subtle eerie light pulse ----------
  let pulseT = 0;
  function update(dt) {
    pulseT += dt;
    eerieLightA.intensity = 1.4 + Math.sin(pulseT * 1.3) * 0.3;
    eerieLightB.intensity = 1.4 + Math.sin(pulseT * 1.3 + 1.1) * 0.3;
  }

  return { colliders, update, centerX, centerZ, northZ, southZ };
}

// hall2.js — HALL 2: a second large hall of the haveli, reached via a corridor
// running west from room12's west doorway (the old puja room, now a through-room).
// East wall has a doorway gap matching the corridor width (entrance from room12).
// North/south/west walls remain solid, no window — this is the dead end of this wing.
//
// Placement/collision note: room12 sits at x:[-2.25,2.25], z:[-29,-24]. The corridor
// out of room12's west wall runs to x=-4.25 at z=-26.5 (room12's centerZ), and hall2
// hangs off that, centered around x≈-7.75..-11.25, z:[-30.5,-22.5]. The nearest other
// room, room11, occupies x:[-9.25,-4.75] but z:[-21.25,-16.25] — over 1m of clear z
// separation from hall2's southern edge (-22.5), so despite overlapping x ranges the
// two never intersect. room4 (x:[-11,-5], z:[-13.25,-6.75]) is separated by an even
// larger z gap. No other room/corridor in the level reaches into this x/z region.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 7; // east-west
const ROOM_D = 8; // north-south
const ROOM_H = 3.2;
const DOOR_GAP = 1.6; // must match corridor width

// doorX: the x coordinate where hall2's east wall (and doorway) sits —
// this is the corridor's endX, so the door lines up exactly with the passage from room12.
// doorZ: the z coordinate of the doorway, matching the corridor's z (room12's west door).
export function createHall2(scene, engine, doorX, doorZ) {
  const colliders = [];

  // hall center sits further west (more negative x) than its east doorway
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
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, ROOM_D), beamMat);
    beam.position.set(centerX + i * (ROOM_W / 3), ROOM_H - 0.12, centerZ);
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

  // north wall — solid, dead end of this wing
  addWallBox(centerX, centerZ - ROOM_D / 2, ROOM_W + t, t);
  // south wall — solid, no window
  addWallBox(centerX, centerZ + ROOM_D / 2, ROOM_W + t, t);
  // west wall — solid, no window
  addWallBox(westX, centerZ, t, ROOM_D + t);

  // east wall — doorway gap in the middle, aligned with the corridor from room12
  const eastSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(eastX, centerZ - (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ + (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // ---------- decorative wooden pillars flanking the central walkway ----------
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a2717, roughness: 0.85 });
  const pillarRadius = 0.2;
  const pillarPositions = [
    [centerX - 1.8, centerZ - 2.4], [centerX + 1.8, centerZ - 2.4],
    [centerX - 1.8, centerZ + 2.4], [centerX + 1.8, centerZ + 2.4],
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
  const ambient = new THREE.AmbientLight(0x3a3527, 1.4);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x6e6555, 0x241d12, 0.9);
  scene.add(fillLight);

  const eerieLightA = new THREE.PointLight(0x9c8a6a, 1.5, 8, 2);
  eerieLightA.position.set(centerX, ROOM_H - 0.4, centerZ - 2.2);
  scene.add(eerieLightA);

  const eerieLightB = new THREE.PointLight(0x9c8a6a, 1.5, 8, 2);
  eerieLightB.position.set(centerX, ROOM_H - 0.4, centerZ + 2.2);
  scene.add(eerieLightB);

  // ---------- per-frame update: subtle eerie light pulse ----------
  let pulseT = 0;
  function update(dt) {
    pulseT += dt;
    eerieLightA.intensity = 1.3 + Math.sin(pulseT * 1.1) * 0.3;
    eerieLightB.intensity = 1.3 + Math.sin(pulseT * 1.1 + 1.3) * 0.3;
  }

  return { colliders, update, centerX, centerZ, westX, eastX };
}

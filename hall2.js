// hall2.js — HALL 2: a large hall of the haveli, sized to match Hall 1 (10x13m),
// reached via a corridor running west from room13's west doorway (room13 itself
// being a small through-room reached off room12's west doorway — the old puja
// room, now a through-room).
// East wall has a doorway gap matching the corridor width (entrance from room13).
// North/south/west walls remain solid, no window — this is the dead end of this wing.
//
// Placement/collision note: the corridor's fixed connection point (room13's west
// door) is at x=-10.25, z=-26.5 (shifted 6m further west of room12's old direct
// connection point, x=-4.25, now that room13 sits in between). Rather than
// centering the hall on that point — which would collide with room11
// (x:[-9.25,-4.75], z:[-21.25,-16.25]) sitting close by to the south — the doorway
// is placed near the SOUTH end of the hall's east wall (DOOR_OFFSET_FROM_SOUTH)
// and the hall's bulk extends north into open, unused space. This keeps a safe 2m+
// gap from room11's northern edge, and the extra 6m westward shift only widens
// that gap further. room4 (x:[-11,-5], z:[-13.25,-6.75]) is separated by an even
// larger gap. No other room/corridor in the level reaches into this x/z region.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 10; // east-west — matches hall1
const ROOM_D = 13; // north-south — matches hall1
const ROOM_H = 3.4; // matches hall1
const DOOR_GAP = 1.6; // must match corridor width
const DOOR_OFFSET_FROM_SOUTH = 3; // how far the doorway center sits from the south wall

// doorX: the x coordinate where hall2's east wall (and doorway) sits —
// this is the corridor's endX, so the door lines up exactly with the passage from room13.
// doorZ: the z coordinate of the doorway, matching the corridor's z (room13's west door).
export function createHall2(scene, engine, doorX, doorZ) {
  const colliders = [];

  // the doorway sits near the south end of the hall; the hall's bulk (and its
  // center) extends north (more negative z) from there.
  const southZ = doorZ + DOOR_OFFSET_FROM_SOUTH;
  const northZ = southZ - ROOM_D;
  const centerZ = (northZ + southZ) / 2;
  const centerX = doorX - ROOM_W / 2;

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

  const westX = centerX - ROOM_W / 2;
  const eastX = centerX + ROOM_W / 2; // == doorX

  // north wall — solid, dead end of this wing
  addWallBox(centerX, northZ, ROOM_W + t, t);
  // south wall — solid, no window
  addWallBox(centerX, southZ, ROOM_W + t, t);
  // west wall — solid, no window
  addWallBox(westX, centerZ, t, ROOM_D + t);

  // east wall — doorway gap offset toward the south end, aligned with the
  // corridor from room12. Split into two unequal segments around the gap.
  const gapNorthZ = doorZ - DOOR_GAP / 2;
  const gapSouthZ = doorZ + DOOR_GAP / 2;
  const northSegLen = gapNorthZ - northZ;
  const southSegLen = southZ - gapSouthZ;
  addWallBox(eastX, northZ + northSegLen / 2, t, northSegLen);
  addWallBox(eastX, gapSouthZ + southSegLen / 2, t, southSegLen);
  addWallBox(eastX, doorZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

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
  const ambient = new THREE.AmbientLight(0x3a3527, 1.5);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x6e6555, 0x241d12, 1.0);
  scene.add(fillLight);

  const eerieLightA = new THREE.PointLight(0x9c8a6a, 1.6, 9, 2);
  eerieLightA.position.set(centerX, ROOM_H - 0.4, centerZ - 3.5);
  scene.add(eerieLightA);

  const eerieLightB = new THREE.PointLight(0x9c8a6a, 1.6, 9, 2);
  eerieLightB.position.set(centerX, ROOM_H - 0.4, centerZ + 3.5);
  scene.add(eerieLightB);

  // ---------- per-frame update: subtle eerie light pulse ----------
  let pulseT = 0;
  function update(dt) {
    pulseT += dt;
    eerieLightA.intensity = 1.4 + Math.sin(pulseT * 1.3) * 0.3;
    eerieLightB.intensity = 1.4 + Math.sin(pulseT * 1.3 + 1.1) * 0.3;
  }

  return { colliders, update, centerX, centerZ, northZ, southZ, westX, eastX };
}

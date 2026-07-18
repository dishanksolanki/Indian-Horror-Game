// room17.js — ROOM 17: a side room of the haveli, reached via a corridor
// running south from room4's south doorway.
// North wall has a doorway gap matching the corridor width (entrance from room4).
// South/east/west walls remain solid, no window — this is the dead end of this wing.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 6; // east-west
const ROOM_D = 6.5; // north-south
const ROOM_H = 2.9;
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where room17's north wall (and doorway) sits —
// this is corridor19.endZ, so the door lines up exactly with the passage.
// doorX: the x coordinate of the doorway, matching the corridor's x (room4's south door).

export function createRoom17(scene, engine, doorZ, doorX) {
  const colliders = [];

  // room center sits further south (more positive z) than its north doorway
  const centerZ = doorZ + ROOM_D / 2;
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

  const northZ = centerZ - ROOM_D / 2; // == doorZ
  const southZ = centerZ + ROOM_D / 2;

  // south wall — solid, dead end of this wing
  addWallBox(centerX, southZ, ROOM_W + t, t);
  // west wall — solid, no window
  addWallBox(centerX - ROOM_W / 2, centerZ, t, ROOM_D + t);
  // east wall — solid, no window
  addWallBox(centerX + ROOM_W / 2, centerZ, t, ROOM_D + t);

  // north wall — doorway gap in the middle, aligned with the corridor from room4
  const northSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(centerX, northZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- wooden table ----------
  // Placed against the south wall, off-center so it doesn't block the doorway
  // line-of-sight from the north entrance.
  createWoodenTable(
    scene,
    engine,
    colliders,
    centerX + (ROOM_W / 2 - 0.8),   // x: tucked near the east wall (table half-width + buffer)
    southZ - 0.53,                  // z: tucked near the south wall (table half-depth + buffer)
    0                                // rotationY
  );

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

  return { colliders, update, centerX, centerZ, northZ, southZ };
}

// ---------- wooden table builder ----------
// A simple rectangular wooden table: one tabletop slab + four legs.
// Adds its collider(s) to both the `colliders` array and the engine, matching
// the pattern used for walls (addWallBox) elsewhere in this file.
function createWoodenTable(scene, engine, colliders, x, z, rotationY = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x9c6b3e, // lighter oak tone — easier to spot against dark walls/floor
    roughness: 0.85,
    metalness: 0.05,
  });

  const TABLE_W = 1.3; // east-west
  const TABLE_D = 0.75; // north-south
  const TOP_THICK = 0.06;
  const TABLE_H = 0.78; // floor to top surface
  const LEG_SIZE = 0.07;

  // tabletop
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_W, TOP_THICK, TABLE_D),
    woodMat
  );
  top.position.set(0, TABLE_H - TOP_THICK / 2, 0);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // legs — inset slightly from the tabletop edges
  const legHeight = TABLE_H - TOP_THICK;
  const legGeo = new THREE.BoxGeometry(LEG_SIZE, legHeight, LEG_SIZE);
  const inset = 0.1;
  const legXs = [-TABLE_W / 2 + inset, TABLE_W / 2 - inset];
  const legZs = [-TABLE_D / 2 + inset, TABLE_D / 2 - inset];

  for (const lx of legXs) {
    for (const lz of legZs) {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(lx, legHeight / 2, lz);
      leg.castShadow = true;
      leg.receiveShadow = true;
      group.add(leg);
    }
  }

  scene.add(group);

  // single simplified collider for the whole table (tabletop + leg footprint)
  const tableBox = new THREE.Box3().setFromObject(group);
  colliders.push(tableBox);
  engine.addCollider(tableBox);

  return group;
}

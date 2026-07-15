// hall2.js — HALL 2: a large, collapsed assembly hall of the haveli, reached via a
// corridor running north from room12's north doorway. This is the true dead end of
// the west wing — past room3's mirror, past room12's still red ember, into a hall
// where part of the roof has come down.
// South wall has a doorway gap matching the corridor width (entrance from room12).
// North/east/west walls remain solid, no window.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 10; // east-west
const ROOM_D = 13; // north-south
const ROOM_H = 3.4;
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where hall2's south wall (and doorway) sits —
// this is corridor13.endZ, so the door lines up exactly with the passage from room12.
export function createHall2(scene, engine, doorZ) {
  const colliders = [];

  // hall center sits further north (more negative z) than its south doorway
  const centerZ = doorZ - ROOM_D / 2;

  // ---------- floor: old, dirty tiles, cracked from the collapse ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    createFloorMaterial(ROOM_W / 2, ROOM_D / 2)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, centerZ);
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling + beams (partially open where the roof gave way) ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ color: 0x141210, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, ROOM_H, centerZ - ROOM_D / 4); // only covers the southern half
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x241a10, roughness: 0.9 });
  for (let i = -2; i <= 2; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, ROOM_D / 2), beamMat);
    beam.position.set(i * (ROOM_W / 5), ROOM_H - 0.12, centerZ - ROOM_D / 4);
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
  // west wall — solid, no window
  addWallBox(-ROOM_W / 2, centerZ, t, ROOM_D + t);
  // east wall — solid, no window
  addWallBox(ROOM_W / 2, centerZ, t, ROOM_D + t);

  // south wall — doorway gap in the middle, aligned with the corridor from room12
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(-(DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox((DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(0, southZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- collapsed rubble pile in the northern (roofless) half ----------
  const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x2a241c, roughness: 1 });
  const rubblePositions = [
    [-1.6, 0.2, northZ + 2.2, 0.3, 1.4],
    [0.6, 0.25, northZ + 1.6, -0.2, 1.7],
    [2.2, 0.18, northZ + 2.8, 0.6, 1.1],
    [-0.4, 0.15, northZ + 3.4, 0.1, 1.0],
  ];
  rubblePositions.forEach(([rx, ry, rz, rot, scale]) => {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 * scale, 0), rubbleMat);
    rock.position.set(rx, ry, rz);
    rock.rotation.set(rot, rot * 1.3, 0);
    rock.castShadow = rock.receiveShadow = true;
    scene.add(rock);
    const rockBox = new THREE.Box3().setFromObject(rock);
    rockBox.max.y = Math.min(rockBox.max.y, 0.7); // keep collider low, it's a rubble pile
    colliders.push(rockBox);
    engine.addCollider(rockBox);
  });

  // ---------- decorative wooden pillars in the intact southern half ----------
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a2717, roughness: 0.85 });
  const pillarRadius = 0.22;
  const pillarPositions = [
    [-3.2, centerZ + 3], [3.2, centerZ + 3],
    [-3.2, centerZ + 5], [3.2, centerZ + 5],
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
  const ambient = new THREE.AmbientLight(0x342e26, 1.3);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x655c4c, 0x201a10, 0.9);
  scene.add(fillLight);

  // cold moonlight spilling through the collapsed roof, into the north half
  const moonShaft = new THREE.SpotLight(0x8fa5c0, 3.0, 16, Math.PI / 5, 0.5, 1.6);
  moonShaft.position.set(0, ROOM_H + 1, northZ + 2.5);
  moonShaft.target.position.set(0, 0, northZ + 2.5);
  scene.add(moonShaft, moonShaft.target);

  const eerieLight = new THREE.PointLight(0x9fb0c8, 1.5, 9, 2);
  eerieLight.position.set(0, ROOM_H - 0.4, centerZ + 4);
  scene.add(eerieLight);

  // ---------- per-frame update: subtle eerie light pulse + drifting moon shaft ----------
  let pulseT = 0;
  function update(dt) {
    pulseT += dt;
    eerieLight.intensity = 1.3 + Math.sin(pulseT * 1.2) * 0.3;
    moonShaft.intensity = 2.7 + Math.sin(pulseT * 0.5) * 0.4;
  }

  return { colliders, update, centerZ, northZ, southZ };
}

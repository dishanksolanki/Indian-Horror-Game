// room5.js — ROOM 5: a small shrine room deeper in the haveli, reached via the corridor from room2.
// South wall has a doorway gap matching the corridor width. Other walls are solid, no window.
import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 5; // east-west
const ROOM_D = 5; // north-south
const ROOM_H = 3.0;
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where room5's south wall (and doorway) sits —
// this is corridor2.endZ, so the door lines up exactly with the passage.
export function createRoom5(scene, engine, doorZ) {
  const colliders = [];

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

  // south wall — doorway gap in the middle, aligned with the corridor from room2
  const southSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(-(DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox((DOOR_GAP / 2 + southSideLen / 2), southZ, southSideLen, t);
  addWallBox(0, southZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- centerpiece: a small stone shrine/altar ----------
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3f3a33, roughness: 0.9 });
  const altarBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 1.1), stoneMat);
  altarBase.position.set(0, 0.3, northZ + 0.9);
  altarBase.castShadow = altarBase.receiveShadow = true;
  scene.add(altarBase);
  const altarBox = new THREE.Box3().setFromObject(altarBase);
  colliders.push(altarBox);
  engine.addCollider(altarBox);

  const idolMat = new THREE.MeshStandardMaterial({ color: 0x1a1712, roughness: 0.75 });
  const idol = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.6, 6), idolMat);
  idol.position.set(0, 0.9, northZ + 0.9);
  idol.castShadow = true;
  scene.add(idol);

  // ---------- ambient room lighting ----------
  const ambient = new THREE.AmbientLight(0x453a2e, 1.6);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x8a8070, 0x2a2016, 1.0);
  scene.add(fillLight);

  // dim reddish candle-like glow on the shrine
  const shrineLight = new THREE.PointLight(0xd97a3f, 1.4, 5, 2);
  shrineLight.position.set(0, 1.0, northZ + 0.9);
  scene.add(shrineLight);

  // ---------- per-frame update: flickering candle-like pulse ----------
  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    shrineLight.intensity = 1.1 + Math.sin(flickerT * 4.5) * 0.25 + (Math.random() - 0.5) * 0.15;
  }

  return { colliders, update, centerZ };
}

// corridor.js — a short 2m passage connecting room1's north doorway to room2's south doorway.

import * as THREE from "three";
import { createWallMaterial } from "./materials.js";

const CORRIDOR_LEN = 2;   // length in meters (matches the requested "2 meter colidor")
const CORRIDOR_W = 1.3;   // matches the doorGap width used in room1/room2
const CORRIDOR_H = 3.0;
const t = 0.2;

// startZ: the z coordinate of room1's north wall (doorway) — corridor begins there
// and extends further north (more negative z) by CORRIDOR_LEN.
export function createCorridor(scene, engine, startZ) {
  const colliders = [];
  const wallMat = createWallMaterial();

  const centerZ = startZ - CORRIDOR_LEN / 2;
  const endZ = startZ - CORRIDOR_LEN;

  // ---------- floor ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, CORRIDOR_LEN),
    new THREE.MeshStandardMaterial({ color: 0x2a231a, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, centerZ);
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_W, CORRIDOR_LEN),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, CORRIDOR_H, centerZ);
  scene.add(ceiling);

  // ---------- side walls ----------
  function addWallBox(cx, cz, w, d, h = CORRIDOR_H, cy = h / 2) {
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

  addWallBox(-CORRIDOR_W / 2 - t / 2, centerZ, t, CORRIDOR_LEN + t);
  addWallBox(CORRIDOR_W / 2 + t / 2, centerZ, t, CORRIDOR_LEN + t);

  // ---------- flickering bulb light so the passage isn't pitch black ----------
  const bulbLight = new THREE.PointLight(0xffcf8a, 1.6, 5, 2);
  bulbLight.position.set(0, CORRIDOR_H - 0.3, centerZ);
  scene.add(bulbLight);

  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    bulbLight.intensity = 1.3 + Math.sin(flickerT * 7) * 0.3 + (Math.random() - 0.5) * 0.4;
  }

  return { colliders, update, startZ, endZ };
}

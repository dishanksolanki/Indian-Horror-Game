// room10.js — ROOM 10: a hidden storage room of the haveli, reached via a corridor
// running east from room3's east doorway.
// West wall has a doorway gap matching the corridor width (entrance from room3).
// North/south/east walls remain solid, no window — this is the furthest, most
// forgotten corner of the house, beyond room3's cracked mirror.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 5; // east-west
const ROOM_D = 5.5; // north-south
const ROOM_H = 2.7; // lowest ceiling yet — cramped and forgotten
const DOOR_GAP = 1.6; // must match corridor width

// doorX: the x coordinate where room10's west wall (and doorway) sits —
// this is corridor10.endX, so the door lines up exactly with the passage.
// doorZ: the z coordinate of the doorway, matching the corridor's z (room3's east door).
export function createRoom10(scene, engine, doorX, doorZ) {
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
    new THREE.MeshStandardMaterial({ color: 0x14110d, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, ROOM_D), beamMat);
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

  // west wall — doorway gap in the middle, aligned with the corridor from room3
  const westSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(westX, centerZ - (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ + (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // ---------- furnishing: stacked old trunks against the east wall ----------
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x2c1d10, roughness: 0.85 });
  const trunkPositions = [
    [eastX - 0.4, 0.25, centerZ - 1.1, 0],
    [eastX - 0.4, 0.25, centerZ + 0.4, 0.1],
    [eastX - 0.42, 0.72, centerZ - 1.05, -0.05],
  ];
  trunkPositions.forEach(([tx, ty, tz, rot]) => {
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.55), trunkMat);
    trunk.position.set(tx, ty, tz);
    trunk.rotation.y = rot;
    trunk.castShadow = trunk.receiveShadow = true;
    scene.add(trunk);
  });
  const trunkBox = new THREE.Box3(
    new THREE.Vector3(eastX - 0.95, 0, centerZ - 1.4),
    new THREE.Vector3(eastX - 0.05, 1.0, centerZ + 0.7)
  );
  colliders.push(trunkBox);
  engine.addCollider(trunkBox);

  // ---------- furnishing: wooden table with a drawer, against the south wall ----------
  const tableMat = new THREE.MeshStandardMaterial({ color: 0x3b2414, roughness: 0.75 });
  const drawerMat = new THREE.MeshStandardMaterial({ color: 0x241708, roughness: 0.85 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0x8a7550, metalness: 0.5, roughness: 0.4 });

  const tableW = 1.1; // east-west
  const tableD = 0.6; // north-south
  const tableH = 0.78; // floor to tabletop
  const topThick = 0.06;
  const legSize = 0.06;

  // south-west corner of the room, clear of the doorway and the trunk stack
  const tableX = centerX - 1.5;
  const tableZ = centerZ + ROOM_D / 2 - 0.6;

  const tableGroup = new THREE.Group();
  tableGroup.position.set(tableX, 0, tableZ);
  scene.add(tableGroup);

  // tabletop
  const top = new THREE.Mesh(new THREE.BoxGeometry(tableW, topThick, tableD), tableMat);
  top.position.set(0, tableH - topThick / 2, 0);
  top.castShadow = top.receiveShadow = true;
  tableGroup.add(top);

  // four legs
  const legH = tableH - topThick;
  const legOffsetX = tableW / 2 - legSize / 2 - 0.03;
  const legOffsetZ = tableD / 2 - legSize / 2 - 0.03;
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(([sx, sz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(legSize, legH, legSize), tableMat);
    leg.position.set(sx * legOffsetX, legH / 2, sz * legOffsetZ);
    leg.castShadow = leg.receiveShadow = true;
    tableGroup.add(leg);
  });

  // drawer — sits just under the tabletop, slides out toward the room (north, +z is away from wall here)
  const drawerW = tableW - 0.25;
  const drawerH = 0.16;
  const drawerD = tableD - 0.06;
  const drawerClosedZ = 0;
  const drawerOpenZ = -(drawerD * 0.65); // slides toward the player, away from the wall

  const drawerGroup = new THREE.Group();
  drawerGroup.position.set(0, tableH - topThick - drawerH / 2 - 0.02, drawerClosedZ);
  tableGroup.add(drawerGroup);

  const drawerBox = new THREE.Mesh(new THREE.BoxGeometry(drawerW, drawerH, drawerD), drawerMat);
  drawerBox.castShadow = drawerBox.receiveShadow = true;
  drawerGroup.add(drawerBox);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8), handleMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, 0, -drawerD / 2 - 0.03);
  drawerGroup.add(handle);

  // collider — a simple static box covering the table footprint (drawer sliding out
  // a few cm doesn't meaningfully change the blocked area, so we keep this fixed)
  const tableBox = new THREE.Box3(
    new THREE.Vector3(tableX - tableW / 2, 0, tableZ - tableD / 2 + drawerOpenZ),
    new THREE.Vector3(tableX + tableW / 2, tableH, tableZ + tableD / 2)
  );
  colliders.push(tableBox);
  engine.addCollider(tableBox);

  // interaction: press E near the table to open/close the drawer
  //
  // IMPORTANT: engine.js's focus check uses camera.position.distanceTo(object3D.position),
  // a full 3D distance. The camera sits at playerHeight (1.7). tableGroup itself sits at
  // y = 0 (floor level), so using tableGroup directly as the interactable would mean the
  // *minimum possible* distance (standing right next to the table) is ~1.7 from vertical
  // offset alone — already bigger than a 1.6 radius, so it could never be focused. Instead
  // we give the drawer its own anchor point at roughly chest height, positioned in world
  // space (added straight to scene, not nested under tableGroup, since engine.js reads
  // object3D.position directly rather than a computed world position).
  const drawerAnchor = new THREE.Object3D();
  drawerAnchor.position.set(tableX, 0.9, tableZ);
  scene.add(drawerAnchor);

  let drawerOpen = false;
  let drawerT = 0; // 0 = closed, 1 = open — animated toward target each frame
  engine.addInteractable(drawerAnchor, {
    radius: 2.0,
    prompt: () => (drawerOpen ? "Close drawer" : "Open drawer"),
    onInteract: () => {
      drawerOpen = !drawerOpen;
    },
  });

  // ---------- ambient room lighting: dim, dusty, forgotten ----------
  const ambient = new THREE.AmbientLight(0x362f24, 1.3);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x6a6152, 0x241d12, 0.8);
  scene.add(fillLight);

  const dustyLight = new THREE.PointLight(0xc9a35f, 1.3, 6, 2);
  dustyLight.position.set(centerX, ROOM_H - 0.3, centerZ);
  scene.add(dustyLight);

  // ---------- per-frame update: dying-bulb flicker + drawer slide animation ----------
  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    dustyLight.intensity = 1.0 + Math.sin(flickerT * 3.1) * 0.15 + (Math.random() - 0.5) * 0.2;

    const target = drawerOpen ? 1 : 0;
    drawerT += (target - drawerT) * Math.min(1, dt * 6);
    drawerGroup.position.z = drawerClosedZ + drawerT * drawerOpenZ;
  }

  return { colliders, update, centerX, centerZ, westX, eastX };
}

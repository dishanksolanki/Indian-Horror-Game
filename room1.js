// room1.js — ROOM 1: an old Indian haveli room.
// Pure map for now: floor, walls, charpai, diya light, puja corner, wooden almirah.
// North wall has a doorway gap that connects to the corridor -> room2.
// No jumpscares / mechanics yet — just the walkable space.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 7; // east-west
const ROOM_D = 9; // north-south
const ROOM_H = 3.0;

export function createRoom1(scene, engine) {
  const colliders = [];

  // ---------- atmosphere ----------
  scene.fog = new THREE.FogExp2(0x000000, 0.035);
  scene.background = new THREE.Color(0x000000);

  // ---------- floor: old, dirty tiles ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    createFloorMaterial(ROOM_W / 2, ROOM_D / 2)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling: wooden beams look (flat for now, beams added below) ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_H;
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x2e2013, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, ROOM_D), beamMat);
    beam.position.set(i * (ROOM_W / 3), ROOM_H - 0.1, 0);
    beam.castShadow = true;
    scene.add(beam);
  }

  // ---------- walls: mud-plastered, old Indian haveli wall texture ----------
  const wallMat = createWallMaterial();
  const t = 0.2; // thickness

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

  // south wall — solid
  addWallBox(0, ROOM_D / 2, ROOM_W + t, t);
  // west wall — solid
  addWallBox(-ROOM_W / 2, 0, t, ROOM_D + t);
  // east wall — solid (window removed)
  addWallBox(ROOM_W / 2, 0, t, ROOM_D + t);

  // north wall — doorway gap in the middle (connects to corridor -> room2)
  const doorGap = 1.6;
  const northSideLen = (ROOM_W - doorGap) / 2;
  addWallBox(-(doorGap / 2 + northSideLen / 2), -ROOM_D / 2, northSideLen, t);
  addWallBox((doorGap / 2 + northSideLen / 2), -ROOM_D / 2, northSideLen, t);
  addWallBox(0, -ROOM_D / 2, doorGap, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- charpai (rope cot) ----------
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2717, roughness: 0.85 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x9c8256, roughness: 0.95 });
  const cotGroup = new THREE.Group();
  const legPositions = [
    [-0.75, -1.0], [0.75, -1.0], [-0.75, 1.0], [0.75, 1.0]
  ];
  legPositions.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 8), woodMat);
    leg.position.set(lx, 0.225, lz);
    leg.castShadow = true;
    cotGroup.add(leg);
  });
  const frameSideA = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.1), woodMat);
  frameSideA.position.set(-0.75, 0.45, 0);
  const frameSideB = frameSideA.clone(); frameSideB.position.x = 0.75;
  const frameEndA = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.06, 0.06), woodMat);
  frameEndA.position.set(0, 0.45, -1.02);
  const frameEndB = frameEndA.clone(); frameEndB.position.z = 1.02;
  cotGroup.add(frameSideA, frameSideB, frameEndA, frameEndB);
  const weave = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0), ropeMat);
  weave.rotation.x = -Math.PI / 2;
  weave.position.set(0, 0.47, 0);
  weave.receiveShadow = true;
  cotGroup.add(weave);
  cotGroup.position.set(-2.2, 0, 2.8);
  cotGroup.rotation.y = 0.15;
  cotGroup.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(cotGroup);
  const cotBox = new THREE.Box3().setFromObject(cotGroup);
  cotBox.min.y = 0; cotBox.max.y = 0.6; // low collider so it just blocks walking through
  colliders.push(cotBox);
  engine.addCollider(cotBox);

  // ---------- puja corner (small shelf with diya) ----------
  const shelf = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.06, 0.3),
    woodMat
  );
  shelf.position.set(-ROOM_W / 2 + 0.35, 1.1, -3.2);
  shelf.castShadow = shelf.receiveShadow = true;
  scene.add(shelf);

  const diyaBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.06, 0.03, 10),
    new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.7 })
  );
  diyaBase.position.set(-ROOM_W / 2 + 0.35, 1.145, -3.2);
  scene.add(diyaBase);

  const diyaFlameLight = new THREE.PointLight(0xffb347, 3.2, 7, 2);
  diyaFlameLight.position.set(-ROOM_W / 2 + 0.35, 1.22, -3.2);
  diyaFlameLight.castShadow = false;
  scene.add(diyaFlameLight);

  const flameGeo = new THREE.ConeGeometry(0.02, 0.06, 6);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(-ROOM_W / 2 + 0.35, 1.2, -3.2);
  scene.add(flame);

  // ---------- wooden almirah (old Indian wardrobe/cupboard) ----------
  // Stood flush against the east wall, south of the doorway swing and clear of
  // the charpai and puja corner. Simple carcass + two hinged-look doors + a
  // small cornice on top, in the same dark teak tone as the rest of the wood
  // furniture in the room.
  const almirahBodyMat = new THREE.MeshStandardMaterial({ color: 0x2f1e10, roughness: 0.8 });
  const almirahDoorMat = new THREE.MeshStandardMaterial({ color: 0x3d2814, roughness: 0.7 });
  const almirahTrimMat = new THREE.MeshStandardMaterial({ color: 0x6b4a26, roughness: 0.6, metalness: 0.05 });
  const almirahHandleMat = new THREE.MeshStandardMaterial({ color: 0x8a7350, roughness: 0.4, metalness: 0.6 });

  const almirahGroup = new THREE.Group();

  const ALM_W = 1.0;  // width (along room's z, since it's flush on the east wall)
  const ALM_H = 2.05; // height
  const ALM_D = 0.55; // depth (into the room, along x)

  // main carcass
  const almirahBody = new THREE.Mesh(
    new THREE.BoxGeometry(ALM_D, ALM_H, ALM_W),
    almirahBodyMat
  );
  almirahBody.position.set(0, ALM_H / 2, 0);
  almirahBody.castShadow = true;
  almirahBody.receiveShadow = true;
  almirahGroup.add(almirahBody);

  // cornice / crown on top, slightly overhanging
  const almirahCornice = new THREE.Mesh(
    new THREE.BoxGeometry(ALM_D + 0.08, 0.08, ALM_W + 0.08),
    almirahTrimMat
  );
  almirahCornice.position.set(0, ALM_H + 0.04, 0);
  almirahCornice.castShadow = true;
  almirahGroup.add(almirahCornice);

  // plinth/base
  const almirahBase = new THREE.Mesh(
    new THREE.BoxGeometry(ALM_D + 0.04, 0.08, ALM_W + 0.04),
    almirahTrimMat
  );
  almirahBase.position.set(0, 0.04, 0);
  almirahGroup.add(almirahBase);

  // two hinged doors, built on pivot groups so they can actually swing open.
  // The carcass front (the doors) faces -x — into the room, away from the
  // east wall the almirah stands against.
  const doorHalfW = ALM_W / 2 - 0.03;
  const doorH = ALM_H - 0.3;
  const doorGeo = new THREE.BoxGeometry(0.04, doorH, doorHalfW);
  const panelGeo = new THREE.BoxGeometry(0.01, doorH * 0.55, doorHalfW * 0.6);
  const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8);
  const FRONT_X = -(ALM_D / 2 + 0.02); // front face, proud of the carcass box

  // left door — hinged on the south edge (z = -ALM_W/2), swings toward -x
  const pivotL = new THREE.Group();
  pivotL.position.set(FRONT_X, ALM_H / 2, -ALM_W / 2);
  const doorL = new THREE.Mesh(doorGeo, almirahDoorMat);
  doorL.position.set(0, 0, doorHalfW / 2);
  doorL.castShadow = true;
  const panelL = new THREE.Mesh(panelGeo, almirahTrimMat);
  panelL.position.set(0.01, 0, doorHalfW / 2);
  const handleL = new THREE.Mesh(handleGeo, almirahHandleMat);
  handleL.rotation.z = Math.PI / 2;
  handleL.position.set(-0.04, 0, doorHalfW - 0.06);
  pivotL.add(doorL, panelL, handleL);
  almirahGroup.add(pivotL);

  // right door — hinged on the north edge (z = +ALM_W/2), swings toward -x
  const pivotR = new THREE.Group();
  pivotR.position.set(FRONT_X, ALM_H / 2, ALM_W / 2);
  const doorR = new THREE.Mesh(doorGeo, almirahDoorMat);
  doorR.position.set(0, 0, -doorHalfW / 2);
  doorR.castShadow = true;
  const panelR = new THREE.Mesh(panelGeo, almirahTrimMat);
  panelR.position.set(0.01, 0, -doorHalfW / 2);
  const handleR = handleL.clone();
  handleR.position.set(-0.04, 0, -(doorHalfW - 0.06));
  pivotR.add(doorR, panelR, handleR);
  almirahGroup.add(pivotR);

  // place flush against the east wall (inner face is at ROOM_W/2 - t/2),
  // south of the moonlight window shaft and clear of the charpai/puja corner
  almirahGroup.position.set(ROOM_W / 2 - t / 2 - ALM_D / 2, 0, 3.0);
  almirahGroup.rotation.y = Math.PI; // doors were built facing -x locally; flip to face into the room
  almirahGroup.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(almirahGroup);

  const almirahBox = new THREE.Box3().setFromObject(almirahGroup);
  // widen the box a touch on the open side so swung-open doors still block walking through
  almirahBox.expandByVector(new THREE.Vector3(0.6, 0, 0));
  colliders.push(almirahBox);
  engine.addCollider(almirahBox);

  // ---------- almirah open/close interaction ----------
  const ALMIRAH_OPEN_ANGLE = Math.PI * 0.62; // ~112°, doors swing outward away from each other
  let almirahOpen = false;
  let almirahT = 0; // animated 0 (closed) -> 1 (open)

  // almirahGroup is rotated 180° (doors were modeled facing local -x, then
  // flipped to face into the room), so a local point in front of the doors
  // lands at (group.x - localX, group.y + localY, group.z - localZ) in world
  // space. Compute that once — the almirah doesn't move — and give the
  // interactable a plain, already-in-world-space anchor object.
  const almirahWorldAnchor = new THREE.Object3D();
  almirahWorldAnchor.position.set(
    almirahGroup.position.x - (FRONT_X - 0.3),
    almirahGroup.position.y + ALM_H / 2,
    almirahGroup.position.z
  );
  scene.add(almirahWorldAnchor);

  const almirahInteractable = engine.addInteractable(almirahWorldAnchor, {
    radius: 1.8,
    prompt: "Open Almirah",
    onInteract: () => {
      almirahOpen = !almirahOpen;
      almirahInteractable.prompt = almirahOpen ? "Close Almirah" : "Open Almirah";
    },
  });

  // ---------- ambient room lighting ----------
  const ambient = new THREE.AmbientLight(0x4a4536, 2.2);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x8a8070, 0x3a3122, 1.3);
  scene.add(fillLight);

  const moonShaft = new THREE.SpotLight(0x8fa5c0, 2.2, 12, Math.PI / 6, 0.6, 1.5);
  moonShaft.position.set(ROOM_W / 2 - 0.5, ROOM_H - 0.3, 0);
  moonShaft.target.position.set(-1, 0, 0.5);
  scene.add(moonShaft, moonShaft.target);

  const entranceLight = new THREE.PointLight(0xffe0b0, 2.6, 8, 2);
  entranceLight.position.set(0.5, 2.2, 3.5);
  scene.add(entranceLight);

  // ---------- spawn ----------
  const spawnPoint = new THREE.Vector3(1.5, engine.playerHeight, 3.5);
  const spawnYaw = Math.PI * 0.85;

  // ---------- per-frame update: just a gentle flame flicker for now ----------
  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    diyaFlameLight.intensity = 1.0 + Math.sin(flickerT * 11) * 0.15 + (Math.random() - 0.5) * 0.1;
    flame.scale.y = 1 + Math.sin(flickerT * 14) * 0.15;

    // ease the almirah's door hinge angle toward open (1) or closed (0)
    const almirahTarget = almirahOpen ? 1 : 0;
    almirahT += (almirahTarget - almirahT) * Math.min(dt * 5, 1);
    pivotL.rotation.y = -ALMIRAH_OPEN_ANGLE * almirahT;
    pivotR.rotation.y = ALMIRAH_OPEN_ANGLE * almirahT;
  }

  // northDoorZ: z coordinate of the north wall (doorway) — corridor.js starts here
  const northDoorZ = -ROOM_D / 2;

  return { spawnPoint, spawnYaw, update, colliders, northDoorZ };
}

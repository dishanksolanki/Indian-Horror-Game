// room1.js — ROOM 1: an old Indian haveli room.
// Pure map for now: floor, walls, charpai, diya light, puja corner, wooden almirah,
// and a pickable hammer prop (E to pick up, G to drop — see engine.js's
// pickupItem/dropHeldItem).
// North wall has a doorway gap that connects to the corridor -> room2.
// No jumpscares / mechanics yet — just the walkable space (+ the charpai hide spot below).

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

  engine.floorY = 0; // room1's floor sits at world Y 0 — dropped items rest flush with it

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

  // ---------- charpai (rope cot) — rebuilt as a hide spot ----------
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2717, roughness: 0.85 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x9c8256, roughness: 0.95 });
  const clothMat = new THREE.MeshStandardMaterial({
    color: 0x6b2e28,
    roughness: 1,
    side: THREE.DoubleSide,
  });

  const COT_LEG_H = 0.52;
  const COT_W = 1.5;
  const COT_D = 2.04;

  const cotGroup = new THREE.Group();

  const legPositions = [
    [-0.75, -1.0], [0.75, -1.0], [-0.75, 1.0], [0.75, 1.0]
  ];
  legPositions.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, COT_LEG_H, 8), woodMat);
    leg.position.set(lx, COT_LEG_H / 2, lz);
    leg.castShadow = true;
    cotGroup.add(leg);
  });

  const frameSideA = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 2.1), woodMat);
  frameSideA.position.set(-0.75, COT_LEG_H, 0);
  const frameSideB = frameSideA.clone(); frameSideB.position.x = 0.75;
  const frameEndA = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.06, 0.06), woodMat);
  frameEndA.position.set(0, COT_LEG_H, -1.02);
  const frameEndB = frameEndA.clone(); frameEndB.position.z = 1.02;
  cotGroup.add(frameSideA, frameSideB, frameEndA, frameEndB);

  const weave = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0), ropeMat);
  weave.rotation.x = -Math.PI / 2;
  weave.position.set(0, COT_LEG_H + 0.02, 0);
  weave.receiveShadow = true;
  cotGroup.add(weave);

  const blanket = new THREE.Mesh(
    new THREE.BoxGeometry(1.3, 0.08, 1.7),
    new THREE.MeshStandardMaterial({ color: 0x7a3a30, roughness: 1 })
  );
  blanket.position.set(0.05, COT_LEG_H + 0.09, -0.1);
  blanket.rotation.y = 0.05;
  blanket.castShadow = true;
  cotGroup.add(blanket);

  function addSkirt(cx, cz, w, rotY) {
    const skirt = new THREE.Mesh(new THREE.PlaneGeometry(w, COT_LEG_H - 0.03), clothMat);
    skirt.position.set(cx, (COT_LEG_H - 0.03) / 2, cz);
    skirt.rotation.y = rotY;
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    cotGroup.add(skirt);
  }
  addSkirt(-0.76, 0, COT_D, Math.PI / 2);
  addSkirt(0.76, 0, COT_D, Math.PI / 2);
  addSkirt(0, 1.03, COT_W, 0);

  cotGroup.position.set(-2.2, 0, 2.8);
  cotGroup.rotation.y = 0.15;
  cotGroup.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(cotGroup);

  const cotBox = new THREE.Box3().setFromObject(cotGroup);
  cotBox.min.y = COT_LEG_H - 0.05;
  cotBox.max.y = COT_LEG_H + 0.2;
  colliders.push(cotBox);
  engine.addCollider(cotBox);

  // ---------- charpai hide spot ----------
  function cotLocalToWorld(localX, localY, localZ) {
    const v = new THREE.Vector3(localX, localY, localZ);
    v.applyAxisAngle(new THREE.Vector3(0, 1, 0), cotGroup.rotation.y);
    v.add(cotGroup.position);
    return v;
  }

  const charpaiHideApproach = cotLocalToWorld(0, 1.3, -1.7);
  const charpaiHideSpot = cotLocalToWorld(0, 0, -0.15);
  const charpaiHideYaw = cotGroup.rotation.y;
  const charpaiCrouchHeight = COT_LEG_H * 0.6;

  const charpaiHideAnchor = new THREE.Object3D();
  charpaiHideAnchor.position.copy(charpaiHideApproach);
  scene.add(charpaiHideAnchor);

  let hidingUnderCharpai = false;
  engine.addInteractable(charpaiHideAnchor, {
    radius: 2.2,
    prompt: "Hide Under Charpai",
    onInteract: () => {
      if (engine.hiding) return;
      hidingUnderCharpai = true;
      engine.enterHide({
        position: charpaiHideSpot,
        yaw: charpaiHideYaw,
        crouchHeight: charpaiCrouchHeight,
        exitPrompt: "Come Out",
        onExit: () => { hidingUnderCharpai = false; },
      });
    },
  });

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

  // ---------- hammer prop (pickable / droppable / throwable) ----------
  // Built once and reused for its held-viewmodel, dropped-fixture, and
  // in-flight-projectile states — engine.pickupItem() parents it to the
  // camera when picked up, engine.dropHeldItem() puts it back in the scene
  // wherever the player is standing (G key), and engine.throwHeldItem()
  // (Q key) launches it as a real projectile that emits a noise event on
  // landing — marked throwable:true below so it can be used as a
  // Granny/Kamla-style distraction tool, not just a carried prop.
  const hammerHeadMat = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.5, metalness: 0.65 });

  const hammerGroup = new THREE.Group();
  const hammerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.32, 8), woodMat);
  hammerHandle.rotation.z = Math.PI / 2.1;
  hammerHandle.position.set(0, 0.05, 0);
  const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), hammerHeadMat);
  hammerHead.position.set(0.15, 0.08, 0);
  hammerGroup.add(hammerHandle, hammerHead);
  hammerGroup.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  hammerGroup.position.set(0.8, 0, 0.4);
  hammerGroup.rotation.y = 0.6;
  scene.add(hammerGroup);

  let hammerPickup = engine.addInteractable(hammerGroup, {
    radius: 1.6,
    prompt: "Pick Up Hammer",
    onInteract: () => {
      engine.removeInteractable(hammerPickup);
      scene.remove(hammerGroup);
      engine.pickupItem({
        id: "hammer",
        mesh: hammerGroup,
        prompt: "Hammer",
        throwable: true,
        noiseRadius: 7,
      });
    },
  });

  // ---------- wooden almirah (old Indian wardrobe/cupboard) ----------
  const almirahBodyMat = new THREE.MeshStandardMaterial({ color: 0x2f1e10, roughness: 0.8 });
  const almirahDoorMat = new THREE.MeshStandardMaterial({ color: 0x3d2814, roughness: 0.7 });
  const almirahTrimMat = new THREE.MeshStandardMaterial({ color: 0x6b4a26, roughness: 0.6, metalness: 0.05 });
  const almirahHandleMat = new THREE.MeshStandardMaterial({ color: 0x8a7350, roughness: 0.4, metalness: 0.6 });

  const almirahGroup = new THREE.Group();

  const ALM_W = 1.0;
  const ALM_H = 2.05;
  const ALM_D = 0.55;

  const almirahBody = new THREE.Mesh(
    new THREE.BoxGeometry(ALM_D, ALM_H, ALM_W),
    almirahBodyMat
  );
  almirahBody.position.set(0, ALM_H / 2, 0);
  almirahBody.castShadow = true;
  almirahBody.receiveShadow = true;
  almirahGroup.add(almirahBody);

  const almirahCornice = new THREE.Mesh(
    new THREE.BoxGeometry(ALM_D + 0.08, 0.08, ALM_W + 0.08),
    almirahTrimMat
  );
  almirahCornice.position.set(0, ALM_H + 0.04, 0);
  almirahCornice.castShadow = true;
  almirahGroup.add(almirahCornice);

  const almirahBase = new THREE.Mesh(
    new THREE.BoxGeometry(ALM_D + 0.04, 0.08, ALM_W + 0.04),
    almirahTrimMat
  );
  almirahBase.position.set(0, 0.04, 0);
  almirahGroup.add(almirahBase);

  const doorHalfW = ALM_W / 2 - 0.03;
  const doorH = ALM_H - 0.3;
  const doorGeo = new THREE.BoxGeometry(0.04, doorH, doorHalfW);
  const panelGeo = new THREE.BoxGeometry(0.01, doorH * 0.55, doorHalfW * 0.6);
  const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8);
  const FRONT_X = -(ALM_D / 2 + 0.02);

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

  almirahGroup.position.set(ROOM_W / 2 - t / 2 - ALM_D / 2, 0, 3.0);
  almirahGroup.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(almirahGroup);

  const almirahBox = new THREE.Box3().setFromObject(almirahGroup);
  almirahBox.expandByVector(new THREE.Vector3(0.6, 0, 0));
  colliders.push(almirahBox);
  engine.addCollider(almirahBox);

  // ---------- almirah open/close interaction ----------
  const ALMIRAH_OPEN_ANGLE = Math.PI * 0.5;
  let almirahOpen = false;
  let almirahT = 0;

  const almirahWorldAnchor = new THREE.Object3D();
  almirahWorldAnchor.position.set(
    almirahGroup.position.x + FRONT_X - 0.35,
    1.55,
    almirahGroup.position.z
  );
  scene.add(almirahWorldAnchor);

  const almirahInteractable = engine.addInteractable(almirahWorldAnchor, {
    radius: 2.0,
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

  // ---------- per-frame update: flame flicker + almirah door animation ----------
  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    diyaFlameLight.intensity = 1.0 + Math.sin(flickerT * 11) * 0.15 + (Math.random() - 0.5) * 0.1;
    flame.scale.y = 1 + Math.sin(flickerT * 14) * 0.15;

    const almirahTarget = almirahOpen ? 1 : 0;
    almirahT += (almirahTarget - almirahT) * Math.min(dt * 5, 1);
    pivotL.rotation.y = -ALMIRAH_OPEN_ANGLE * almirahT;
    pivotR.rotation.y = ALMIRAH_OPEN_ANGLE * almirahT;
  }

  // northDoorZ: z coordinate of the north wall (doorway) — corridor.js starts here
  const northDoorZ = -ROOM_D / 2;

  return { spawnPoint, spawnYaw, update, colliders, northDoorZ };
}

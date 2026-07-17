// room1.js — ROOM 1: an old Indian haveli room.
// Floor, walls, jharokha window, charpai, diya light, puja corner, and a wooden almirah with an openable door.

import * as THREE from "three";

const ROOM_W = 7; // east-west
const ROOM_D = 9; // north-south
const ROOM_H = 3.0;

export function createRoom1(scene, engine) {
  const colliders = [];

  // ---------- atmosphere ----------
  scene.fog = new THREE.FogExp2(0x000000, 0.035);
  scene.background = new THREE.Color(0x000000);

  // ---------- floor: old stone ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ color: 0x2a231a, roughness: 0.95 })
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

  // ---------- walls: mud-plastered, warm ochre ----------
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x6b4e33, roughness: 1 });
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

  // east wall — has the jharokha (lattice window) cut into it, built from two segments
  const winW = 1.4, winH = 1.2;
  const eastSideLen = (ROOM_D - winW) / 2;
  addWallBox(ROOM_W / 2, -(winW / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(ROOM_W / 2, (winW / 2 + eastSideLen / 2), t, eastSideLen);
  // lintel above and sill below the window opening
  addWallBox(ROOM_W / 2, 0, t, winW, ROOM_H - winH - 0.9, ROOM_H - (ROOM_H - winH - 0.9) / 2);
  addWallBox(ROOM_W / 2, 0, t, winW, 0.9, 0.45);

  // north wall — doorway gap in the middle (exit for later rooms)
  const doorGap = 1.3;
  const northSideLen = (ROOM_W - doorGap) / 2;
  addWallBox(-(doorGap / 2 + northSideLen / 2), -ROOM_D / 2, northSideLen, t);
  addWallBox((doorGap / 2 + northSideLen / 2), -ROOM_D / 2, northSideLen, t);
  addWallBox(0, -ROOM_D / 2, doorGap, t, 0.5, ROOM_H - 0.25); // lintel

  // ---------- jharokha lattice (jaali) — decorative, sits in the window opening ----------
  const jaaliGroup = new THREE.Group();
  const jaaliMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.8 });
  const bars = 5;
  for (let i = 0; i < bars; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, winH, 0.06), jaaliMat);
    bar.position.set(ROOM_W / 2 - 0.02, ROOM_H - winH / 2 - 0.9, -winW / 2 + (i / (bars - 1)) * winW);
    jaaliGroup.add(bar);
  }
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, winW), jaaliMat);
    bar.position.set(ROOM_W / 2 - 0.02, ROOM_H - 0.9 - (i / 2) * winH, 0);
    jaaliGroup.add(bar);
  }
  scene.add(jaaliGroup);

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

  const diyaFlameLight = new THREE.PointLight(0xffb347, 2.2, 6, 2);
  diyaFlameLight.position.set(-ROOM_W / 2 + 0.35, 1.22, -3.2);
  diyaFlameLight.castShadow = false;
  scene.add(diyaFlameLight);

  const flameGeo = new THREE.ConeGeometry(0.02, 0.06, 6);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(-ROOM_W / 2 + 0.35, 1.2, -3.2);
  scene.add(flame);

  // ---------- wooden almirah (wardrobe) with an openable door ----------
  const almirahWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.75 });
  const almirahTrimMat = new THREE.MeshStandardMaterial({ color: 0x2e1c0d, roughness: 0.8 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xb08d4b, metalness: 0.6, roughness: 0.4 });

  const almirahGroup = new THREE.Group();
  almirahGroup.position.set(2.4, 0, 4.1); // against the south wall, clear of the charpai + puja corner

  // legs
  [[-0.5, -0.2], [0.5, -0.2], [-0.5, 0.2], [0.5, 0.2]].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.07), almirahTrimMat);
    leg.position.set(lx, 0.075, lz);
    leg.castShadow = true;
    almirahGroup.add(leg);
  });

  // cabinet body
  const bodyW = 1.2, bodyH = 1.7, bodyD = 0.5;
  const almirahBody = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyD), almirahWoodMat);
  almirahBody.position.set(0, 0.15 + bodyH / 2, 0);
  almirahBody.castShadow = almirahBody.receiveShadow = true;
  almirahGroup.add(almirahBody);

  // dark interior panel so the inside reads as hollow once the door swings open
  const almirahInterior = new THREE.Mesh(
    new THREE.BoxGeometry(bodyW - 0.08, bodyH - 0.08, bodyD - 0.1),
    new THREE.MeshStandardMaterial({ color: 0x0d0a06, roughness: 1 })
  );
  almirahInterior.position.set(0, 0.15 + bodyH / 2, 0.02);
  almirahGroup.add(almirahInterior);

  // cornice on top
  const cornice = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.1, 0.08, bodyD + 0.1), almirahTrimMat);
  cornice.position.set(0, 0.15 + bodyH + 0.04, 0);
  cornice.castShadow = true;
  almirahGroup.add(cornice);

  // ---- door, hung on a hinge pivot so it swings open/closed ----
  const doorW = 1.06, doorH = 1.55, doorT = 0.04;
  const doorPivot = new THREE.Group();
  // hinge at the left edge of the front face (front faces -z, into the room)
  doorPivot.position.set(-bodyW / 2 + 0.03, 0.15 + 0.075 + doorH / 2, -bodyD / 2);
  almirahGroup.add(doorPivot);

  const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, doorT), almirahWoodMat);
  doorMesh.position.set(doorW / 2, 0, -doorT / 2); // extends away from the hinge
  doorMesh.castShadow = doorMesh.receiveShadow = true;
  doorPivot.add(doorMesh);

  const doorPanel = new THREE.Mesh(
    new THREE.BoxGeometry(doorW - 0.16, doorH - 0.2, 0.015),
    almirahTrimMat
  );
  doorPanel.position.set(doorW / 2, 0, -doorT / 2 - 0.023);
  doorPivot.add(doorPanel);

  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 8), handleMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(doorW - 0.12, 0, -doorT / 2 - 0.05);
  doorPivot.add(handle);

  almirahGroup.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  scene.add(almirahGroup);

  // solid collider for the cabinet body only (not the swinging door)
  const almirahBox = new THREE.Box3().setFromObject(almirahBody);
  colliders.push(almirahBox);
  engine.addCollider(almirahBox);

  // invisible world-space anchor for the interaction prompt (engine reads object3D.position directly)
  const almirahAnchorLocal = new THREE.Object3D();
  almirahAnchorLocal.position.set(0, 0.15 + 0.075 + doorH / 2, -bodyD / 2 - 0.1);
  almirahGroup.add(almirahAnchorLocal);
  almirahGroup.updateMatrixWorld(true);
  const almirahWorldPos = new THREE.Vector3();
  almirahAnchorLocal.getWorldPosition(almirahWorldPos);
  const almirahInteractTarget = new THREE.Object3D();
  almirahInteractTarget.position.copy(almirahWorldPos);
  scene.add(almirahInteractTarget);

  // ---- open/close state ----
  let almirahOpen = false;
  let almirahDoorTarget = 0;
  const ALMIRAH_OPEN_ANGLE = Math.PI * 0.62; // ~112°, swings out into the room

  const almirahInteractable = engine.addInteractable(almirahInteractTarget, {
    radius: 1.9,
    prompt: "Open Almirah",
    onInteract: () => {
      almirahOpen = !almirahOpen;
      almirahDoorTarget = almirahOpen ? ALMIRAH_OPEN_ANGLE : 0;
      almirahInteractable.prompt = almirahOpen ? "Close Almirah" : "Open Almirah";
    },
  });

  // ---------- ambient room lighting ----------
  const ambient = new THREE.AmbientLight(0x3a352c, 1.1);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x6b6152, 0x2a2318, 0.6);
  scene.add(fillLight);

  const moonShaft = new THREE.SpotLight(0x8fa5c0, 1.1, 10, Math.PI / 6, 0.6, 1.5);
  moonShaft.position.set(ROOM_W / 2 - 0.5, ROOM_H - 0.3, 0);
  moonShaft.target.position.set(-1, 0, 0.5);
  scene.add(moonShaft, moonShaft.target);

  const entranceLight = new THREE.PointLight(0xffe0b0, 1.4, 6, 2);
  entranceLight.position.set(0.5, 2.2, 3.5);
  scene.add(entranceLight);

  // ---------- spawn ----------
  const spawnPoint = new THREE.Vector3(1.5, engine.playerHeight, 3.5);
  const spawnYaw = Math.PI * 0.85;

  // ---------- per-frame update ----------
  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    diyaFlameLight.intensity = 1.0 + Math.sin(flickerT * 11) * 0.15 + (Math.random() - 0.5) * 0.1;
    flame.scale.y = 1 + Math.sin(flickerT * 14) * 0.15;

    // smooth almirah door swing
    doorPivot.rotation.y += (almirahDoorTarget - doorPivot.rotation.y) * Math.min(dt * 6, 1);
  }

  return { spawnPoint, spawnYaw, update, colliders };
}

// room1.js — ROOM 1: an old Indian haveli room.
// Pure map for now: floor, walls, jharokha window, charpai, diya light, puja corner.
// No jumpscares / mechanics yet — just the walkable space.
import * as THREE from "three";

const ROOM_W = 7; // east-west
const ROOM_D = 9; // north-south
const ROOM_H = 3.0;

// ---------- procedural grunge texture helpers ----------
// No external image assets needed — we bake aged plaster (stains, cracks,
// patchy plaster-loss) onto a canvas at runtime so walls stop looking like
// flat poured-concrete slabs.
function makePlasterCanvas({ base = "#6b4e33", size = 512, seed = 1 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // fine plaster grain / noise
  for (let i = 0; i < 6000; i++) {
    const x = rand() * size, y = rand() * size;
    const shade = rand() * 40 - 20;
    ctx.fillStyle = `rgba(${shade > 0 ? 255 : 0},${shade > 0 ? 255 : 0},${shade > 0 ? 255 : 0},${Math.abs(shade) / 160})`;
    ctx.fillRect(x, y, 1.5, 1.5);
  }

  // damp / age stains, worse near the base of the wall
  for (let i = 0; i < 5; i++) {
    const x = rand() * size, y = size * (0.55 + rand() * 0.45);
    const r = 40 + rand() * 90;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(20,20,15,0.35)");
    grad.addColorStop(1, "rgba(20,20,15,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // hairline cracks
  ctx.strokeStyle = "rgba(15,10,5,0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    let x = rand() * size, y = rand() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 4 + Math.floor(rand() * 4);
    for (let j = 0; j < segs; j++) {
      x += (rand() - 0.5) * 60;
      y += (rand() - 0.3) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // patchy plaster loss revealing brick underneath
  for (let i = 0; i < 3; i++) {
    const x = rand() * size, y = size * (0.8 + rand() * 0.2);
    ctx.fillStyle = "rgba(90,55,35,0.5)";
    ctx.beginPath();
    ctx.ellipse(x, y, 20 + rand() * 30, 10 + rand() * 15, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

function makeWallMaterial(seed, wRepeat = 2, hRepeat = 1) {
  const tex = new THREE.CanvasTexture(makePlasterCanvas({ seed }));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(wRepeat, hRepeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
}

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

  // ---------- walls: aged mud-plaster, not flat concrete ----------
  const t = 0.2; // thickness
  let wallSeed = 1;

  function addWallBox(cx, cz, w, d, h = ROOM_H, cy = h / 2) {
    const mat = makeWallMaterial(wallSeed++, Math.max(w, d) / 1.6, h / 1.6);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
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

  // ---------- wooden skirting (baseboard) — grounds the walls, hides the floor/wall seam ----------
  const skirtMat = new THREE.MeshStandardMaterial({ color: 0x241a10, roughness: 0.85 });
  function addSkirt(cx, cz, w, d) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, d), skirtMat);
    skirt.position.set(cx, 0.07, cz);
    skirt.castShadow = skirt.receiveShadow = true;
    scene.add(skirt);
  }
  addSkirt(0, ROOM_D / 2 - t / 2, ROOM_W - 0.05, 0.16);
  addSkirt(-ROOM_W / 2 + t / 2, 0, 0.16, ROOM_D - 0.05);
  addSkirt(ROOM_W / 2 - t / 2, -(winW / 2 + eastSideLen / 2), 0.16, eastSideLen - 0.05);
  addSkirt(ROOM_W / 2 - t / 2, (winW / 2 + eastSideLen / 2), 0.16, eastSideLen - 0.05);
  addSkirt(-(doorGap / 2 + northSideLen / 2), -ROOM_D / 2 + t / 2, northSideLen - 0.05, 0.16);
  addSkirt((doorGap / 2 + northSideLen / 2), -ROOM_D / 2 + t / 2, northSideLen - 0.05, 0.16);

  // ---------- corner posts — break up the sharp box-corner seams ----------
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x3a2717, roughness: 0.9 });
  [
    [-ROOM_W / 2 + 0.11, -ROOM_D / 2 + 0.11],
    [-ROOM_W / 2 + 0.11, ROOM_D / 2 - 0.11],
    [ROOM_W / 2 - 0.11, -ROOM_D / 2 + 0.11],
    [ROOM_W / 2 - 0.11, ROOM_D / 2 - 0.11],
  ].forEach(([cx, cz]) => {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.16, ROOM_H, 0.16), pillarMat);
    pillar.position.set(cx, ROOM_H / 2, cz);
    pillar.castShadow = true;
    scene.add(pillar);
  });

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

  // ---------- per-frame update: just a gentle flame flicker for now ----------
  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    diyaFlameLight.intensity = 1.0 + Math.sin(flickerT * 11) * 0.15 + (Math.random() - 0.5) * 0.1;
    flame.scale.y = 1 + Math.sin(flickerT * 14) * 0.15;
  }

  return { spawnPoint, spawnYaw, update, colliders };
}

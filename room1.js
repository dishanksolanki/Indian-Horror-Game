// room1.js — ROOM 1: an old Indian haveli room.
// Pure map for now: floor, walls, jharokha window, charpai, diya light, puja corner.
// No jumpscares / mechanics yet — just the walkable space.
import * as THREE from "three";

const ROOM_W = 7; // east-west
const ROOM_D = 9; // north-south
const ROOM_H = 3.0;

// ---------- procedural grunge texture helpers ----------
// No external image assets needed — everything is baked onto a canvas at
// runtime: exposed old brick, missing mortar, cracks, stains and leftover
// plaster patches, so walls read as "damaged old house" instead of a flat
// poured-concrete slab.

function makeBrickCanvas({ size = 512, seed = 1 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  const brickW = 66;
  const brickH = 30;
  const mortar = 5;

  // mortar base color
  ctx.fillStyle = "#4a4239";
  ctx.fillRect(0, 0, size, size);

  const baseHues = ["#7a4a30", "#6e4128", "#87573a", "#5e3a24", "#9a6242"];

  let row = 0;
  for (let y = -brickH; y < size + brickH; y += brickH + mortar) {
    const offset = row % 2 === 0 ? 0 : -(brickW / 2);
    for (let x = offset; x < size + brickW; x += brickW + mortar) {
      // occasionally skip a brick entirely — a broken/missing chunk
      const missing = rand() < 0.04;
      const brickColor = baseHues[Math.floor(rand() * baseHues.length)];
      if (!missing) {
        ctx.fillStyle = brickColor;
        ctx.fillRect(x, y, brickW - mortar, brickH - mortar);

        // per-brick shading noise so they don't look copy-pasted
        for (let i = 0; i < 10; i++) {
          const nx = x + rand() * (brickW - mortar);
          const ny = y + rand() * (brickH - mortar);
          const shade = rand() * 30 - 15;
          ctx.fillStyle = `rgba(${shade > 0 ? 255 : 0},${shade > 0 ? 255 : 0},${shade > 0 ? 255 : 0},${Math.abs(shade) / 120})`;
          ctx.fillRect(nx, ny, 3, 3);
        }

        // chipped corner on some bricks
        if (rand() < 0.15) {
          ctx.fillStyle = "rgba(20,15,10,0.55)";
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + rand() * 14, y);
          ctx.lineTo(x, y + rand() * 10);
          ctx.fill();
        }
      } else {
        // dark cavity where a brick has fallen out
        ctx.fillStyle = "rgba(10,8,6,0.85)";
        ctx.fillRect(x, y, brickW - mortar, brickH - mortar);
      }
    }
    row++;
  }

  // leftover old plaster patches clinging to the brick (unpainted haveli look)
  for (let i = 0; i < 4; i++) {
    const x = rand() * size, y = rand() * size;
    const r = 50 + rand() * 100;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(150,120,90,0.55)");
    grad.addColorStop(1, "rgba(150,120,90,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // damp / age stains, worse near the base
  for (let i = 0; i < 5; i++) {
    const x = rand() * size, y = size * (0.55 + rand() * 0.45);
    const r = 40 + rand() * 90;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(15,15,10,0.4)");
    grad.addColorStop(1, "rgba(15,15,10,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // long structural cracks running through several bricks
  ctx.strokeStyle = "rgba(10,8,5,0.65)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    let x = rand() * size, y = rand() * size * 0.3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 6 + Math.floor(rand() * 5);
    for (let j = 0; j < segs; j++) {
      x += (rand() - 0.5) * 50;
      y += 20 + rand() * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  return canvas;
}

function makeWallMaterial(seed, wRepeat = 2, hRepeat = 1) {
  const tex = new THREE.CanvasTexture(makeBrickCanvas({ seed }));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(wRepeat, hRepeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 });
}

// ---------- cobweb texture: radial web on a transparent canvas ----------
function makeCobwebTexture(seed = 1) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  let s = seed * 5147 + 12345;
  const rand = () => {
    s = (s * 5147 + 12345) % 233280;
    return s / 233280;
  };

  const cx = size * 0.08, cy = size * 0.08; // web anchored to the corner
  const maxR = size * 1.05;

  ctx.strokeStyle = "rgba(210,205,190,0.55)";
  ctx.lineWidth = 1;

  // radiating strands
  const strands = 8;
  const angles = [];
  for (let i = 0; i < strands; i++) {
    const a = (Math.PI / 2) * (i / (strands - 1)) + (rand() - 0.5) * 0.05;
    angles.push(a);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
    ctx.stroke();
  }

  // concentric connecting threads (slightly irregular, like a worn web)
  const rings = 6;
  for (let r = 1; r <= rings; r++) {
    const rad = (maxR / rings) * r;
    ctx.beginPath();
    for (let i = 0; i < angles.length; i++) {
      const jitter = (rand() - 0.5) * 6;
      const x = cx + Math.cos(angles[i]) * (rad + jitter);
      const y = cy + Math.sin(angles[i]) * (rad + jitter);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function addCobweb(scene, x, y, z, rotY = 0, scale = 0.6, seed = 1) {
  const tex = makeCobwebTexture(seed);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const web = new THREE.Mesh(new THREE.PlaneGeometry(scale, scale), mat);
  web.position.set(x, y, z);
  web.rotation.y = rotY;
  web.rotation.x = -Math.PI / 8;
  scene.add(web);
  return web;
}

export function createRoom1(scene, engine) {
  const colliders = [];

  // ---------- atmosphere ----------
  // lighter fog + darker-but-not-pitch-black background so the room reads
  // clearly before the flashlight even comes on
  scene.fog = new THREE.FogExp2(0x0a0806, 0.016);
  scene.background = new THREE.Color(0x050403);

  // ---------- floor: old stone ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ color: 0x3a3024, roughness: 0.95 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling: wooden beams look (flat for now, beams added below) ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ color: 0x241d16, roughness: 1 })
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

  // ---------- walls: damaged old brick ----------
  const t = 0.2; // thickness
  let wallSeed = 1;

  function addWallBox(cx, cz, w, d, h = ROOM_H, cy = h / 2) {
    const mat = makeWallMaterial(wallSeed++, Math.max(w, d) / 1.4, h / 1.4);
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

  // ---------- cobwebs — tucked into the ceiling corners and window frame ----------
  addCobweb(scene, -ROOM_W / 2 + 0.05, ROOM_H - 0.05, -ROOM_D / 2 + 0.05, Math.PI * 0.25, 0.9, 3);
  addCobweb(scene, -ROOM_W / 2 + 0.05, ROOM_H - 0.05, ROOM_D / 2 - 0.05, -Math.PI * 0.25, 0.8, 7);
  addCobweb(scene, ROOM_W / 2 - 0.05, ROOM_H - 0.05, ROOM_D / 2 - 0.05, Math.PI * 1.25, 0.85, 11);
  addCobweb(scene, ROOM_W / 2 - 0.15, ROOM_H - 0.5, -(winW / 2 + eastSideLen / 2), Math.PI * 0.9, 0.5, 15);

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

  const diyaFlameLight = new THREE.PointLight(0xffb347, 3.0, 7, 2);
  diyaFlameLight.position.set(-ROOM_W / 2 + 0.35, 1.22, -3.2);
  diyaFlameLight.castShadow = false;
  scene.add(diyaFlameLight);

  const flameGeo = new THREE.ConeGeometry(0.02, 0.06, 6);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffcc66 });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(-ROOM_W / 2 + 0.35, 1.2, -3.2);
  scene.add(flame);

  // ---------- ambient room lighting — brightened so the room is readable
  // without needing the flashlight on constantly ----------
  const ambient = new THREE.AmbientLight(0x4a4436, 2.2);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x8a8070, 0x3a3324, 1.3);
  scene.add(fillLight);

  const moonShaft = new THREE.SpotLight(0x9fb5d0, 2.0, 12, Math.PI / 5, 0.6, 1.4);
  moonShaft.position.set(ROOM_W / 2 - 0.5, ROOM_H - 0.3, 0);
  moonShaft.target.position.set(-1, 0, 0.5);
  scene.add(moonShaft, moonShaft.target);

  const entranceLight = new THREE.PointLight(0xffe0b0, 2.2, 8, 2);
  entranceLight.position.set(0.5, 2.2, 3.5);
  scene.add(entranceLight);

  // an extra warm fill lamp near the far end of the room so the back wall
  // and puja corner don't vanish into pure black
  const backFill = new THREE.PointLight(0xffcf9a, 1.6, 8, 2);
  backFill.position.set(-1.5, 2.0, -3.0);
  scene.add(backFill);

  // ---------- spawn ----------
  const spawnPoint = new THREE.Vector3(1.5, engine.playerHeight, 3.5);
  const spawnYaw = Math.PI * 0.85;

  // ---------- per-frame update: just a gentle flame flicker for now ----------
  let flickerT = 0;
  function update(dt) {
    flickerT += dt;
    diyaFlameLight.intensity = 1.6 + Math.sin(flickerT * 11) * 0.2 + (Math.random() - 0.5) * 0.15;
    flame.scale.y = 1 + Math.sin(flickerT * 14) * 0.15;
  }

  return { spawnPoint, spawnYaw, update, colliders };
}

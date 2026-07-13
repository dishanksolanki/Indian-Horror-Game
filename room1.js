// room1.js — ROOM 1: an old Indian haveli room, decayed haunted-house style.
// Pure map for now: floor, walls, jharokha window.
// Furniture (charpai, puja shelf, diya) removed for now — will be added back later.
// No jumpscares / mechanics yet — just the walkable space.

import * as THREE from "three";

const ROOM_W = 7; // east-west
const ROOM_D = 9; // north-south
const ROOM_H = 3.0;

const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;

function shade(hexColor, amt) {
  let r = (hexColor >> 16) & 255, g = (hexColor >> 8) & 255, b = hexColor & 255;
  r = Math.min(255, Math.max(0, r + amt));
  g = Math.min(255, Math.max(0, g + amt));
  b = Math.min(255, Math.max(0, b + amt));
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function blobPath(ctx, cx, cy, r) {
  ctx.beginPath();
  const pts = 10;
  for (let i = 0; i <= pts; i++) {
    const ang = (i / pts) * Math.PI * 2;
    const rad = r * (0.6 + Math.random() * 0.7);
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Aged wall texture: real brick base, plaster skin on top, with irregular
// patches punched through (destination-out) to reveal brick underneath —
// exactly like old crumbling haveli plaster. Plus moss/damp staining and
// fine cracks. All procedural, no external image assets needed.
// ---------------------------------------------------------------------------
function makeAgedWallCanvas(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  // 1) brick base layer
  ctx.fillStyle = "#3a2a1e"; // mortar color
  ctx.fillRect(0, 0, size, size);
  const rows = 9;
  const brickH = size / rows;
  for (let r = 0; r < rows; r++) {
    const rowOffset = r % 2 === 0 ? 0 : brickH * 1.1;
    let x = -brickH * 1.5 + rowOffset;
    while (x < size + brickH) {
      const bw = brickH * 2.1 + (Math.random() - 0.5) * 10;
      ctx.fillStyle = shade(0x8a5a3c, (Math.random() - 0.5) * 40 - 10);
      ctx.fillRect(x + 2, r * brickH + 2, bw - 4, brickH - 4);
      x += bw + 4;
    }
  }

  // 2) plaster skin over the brick
  ctx.fillStyle = shade(0x7a5a3a, 0);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 45; i++) {
    ctx.globalAlpha = 0.5 + Math.random() * 0.4;
    ctx.fillStyle = shade(0x7a5a3a, (Math.random() - 0.5) * 50);
    const w = 20 + Math.random() * size * 0.3;
    const h = 20 + Math.random() * size * 0.3;
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 3) punch irregular holes through the plaster to reveal brick beneath,
  // biased toward the lower area (crumbling from ground damp / age)
  ctx.save();
  ctx.globalCompositeOperation = "destination-out";
  const holes = 5 + Math.floor(Math.random() * 4);
  for (let i = 0; i < holes; i++) {
    const cx = Math.random() * size;
    const cy = size * 0.45 + Math.random() * size * 0.55;
    ctx.globalAlpha = 0.8 + Math.random() * 0.2;
    blobPath(ctx, cx, cy, 30 + Math.random() * 70);
    ctx.fill();
  }
  ctx.restore();

  // 4) moss / damp staining — greenish-grey blotches, concentrated low
  for (let i = 0; i < 20; i++) {
    ctx.globalAlpha = 0.08 + Math.random() * 0.18;
    ctx.fillStyle = `rgba(${60 + Math.random() * 20},${75 + Math.random() * 20},${50 + Math.random() * 15},1)`;
    const cy = size * 0.5 + Math.random() * size * 0.5;
    blobPath(ctx, Math.random() * size, cy, 20 + Math.random() * 60);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // 5) fine cracks
  ctx.strokeStyle = "rgba(10,7,5,0.5)";
  for (let i = 0; i < 16; i++) {
    ctx.lineWidth = 0.5 + Math.random() * 1.6;
    let x = Math.random() * size, y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 4 + Math.floor(Math.random() * 6);
    for (let s = 0; s < segs; s++) {
      x += (Math.random() - 0.5) * size * 0.15;
      y += (Math.random() - 0.5) * size * 0.15;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // 6) grain + vignette
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(imgData, 0, 0);

  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.75);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  return canvas;
}

function makeStoneFloorCanvas(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#241d16";
  ctx.fillRect(0, 0, size, size);

  // flagstone slabs
  const cols = 5, rowsN = 6;
  for (let r = 0; r < rowsN; r++) {
    for (let c = 0; c < cols; c++) {
      const w = size / cols, h = size / rowsN;
      const x = c * w + (Math.random() - 0.5) * 6;
      const y = r * h + (Math.random() - 0.5) * 6;
      ctx.fillStyle = shade(0x2e2519, (Math.random() - 0.5) * 30);
      ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    }
  }

  for (let i = 0; i < 50; i++) {
    ctx.globalAlpha = 0.05 + Math.random() * 0.15;
    ctx.fillStyle = shade(0x1a1510, (Math.random() - 0.5) * 40);
    blobPath(ctx, Math.random() * size, Math.random() * size, 20 + Math.random() * 80);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(5,4,3,0.6)";
  for (let i = 0; i < 22; i++) {
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    let x = Math.random() * size, y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (Math.random() - 0.5) * size * 0.15;
      y += (Math.random() - 0.5) * size * 0.15;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 20;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(imgData, 0, 0);

  return canvas;
}

function makeWoodCanvas(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#1c1712";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 30; i++) {
    ctx.globalAlpha = 0.05 + Math.random() * 0.1;
    ctx.fillStyle = shade(0x0c0a08, (Math.random() - 0.5) * 20);
    const gw = 10 + Math.random() * 30;
    ctx.fillRect(Math.random() * size, 0, gw, size);
  }
  ctx.globalAlpha = 1;
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

// corner cobweb decal — transparent background, radiating strands + rings
function makeCobwebTexture(size = 256) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d"); // transparent by default

  const cx = 0, cy = 0;
  const maxR = size * 0.95;
  const strands = 6 + Math.floor(Math.random() * 3);
  const angles = [];
  ctx.strokeStyle = "rgba(230,228,215,0.35)";
  ctx.lineWidth = 0.8;
  for (let i = 0; i < strands; i++) {
    const ang = (Math.PI / 2) * (i / (strands - 1));
    angles.push(ang);
    const r = maxR * (0.75 + Math.random() * 0.25);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
    ctx.stroke();
  }
  const rings = 5;
  ctx.strokeStyle = "rgba(230,228,215,0.28)";
  for (let ring = 1; ring <= rings; ring++) {
    const rr = (maxR / rings) * ring;
    ctx.beginPath();
    for (let i = 0; i < angles.length; i++) {
      const ang = angles[i];
      const jitter = 0.9 + Math.random() * 0.15;
      const x = cx + Math.cos(ang) * rr * jitter;
      const y = cy + Math.sin(ang) * rr * jitter;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  return canvas;
}

function makeTiledTexture(canvas, repeatX, repeatY) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRoom1(scene, engine) {
  const colliders = [];

  // ---------- atmosphere ----------
  scene.fog = new THREE.FogExp2(0x000000, 0.014);
  scene.background = new THREE.Color(0x000000);

  // ---------- shared grunge canvases ----------
  const wallCanvasTemplate = makeAgedWallCanvas(512);
  const floorCanvas = makeStoneFloorCanvas(512);
  const woodCanvas = makeWoodCanvas(512);

  // ---------- floor: cracked stone slabs ----------
  const floorTex = makeTiledTexture(floorCanvas, ROOM_W / 1.6, ROOM_D / 1.6);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex, bumpMap: floorTex, bumpScale: 0.8, roughness: 1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling: aged dark wood ----------
  const ceilingTex = makeTiledTexture(woodCanvas, ROOM_W / 1.6, ROOM_D / 1.6);
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ map: ceilingTex, bumpMap: ceilingTex, bumpScale: 0.5, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_H;
  scene.add(ceiling);

  const beamTex = makeTiledTexture(woodCanvas, 1, 3);
  const beamMat = new THREE.MeshStandardMaterial({ map: beamTex, bumpMap: beamTex, bumpScale: 0.4, roughness: 0.95 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, ROOM_D), beamMat);
    beam.position.set(i * (ROOM_W / 3), ROOM_H - 0.1, 0);
    beam.castShadow = true;
    scene.add(beam);
  }

  // ---------- walls: crumbling plaster over brick, moss stains, cracks ----------
  const t = 0.2; // thickness

  function addWallBox(cx, cz, w, d, h = ROOM_H, cy = h / 2) {
    // fresh procedural canvas per wall so each one crumbles differently
    const canvas = makeAgedWallCanvas(512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, w / 1.6), Math.max(1, h / 1.6));
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.6, roughness: 1 });
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

  // ---------- corner cobwebs (ceiling corners) ----------
  const cobwebCorners = [
    { x: ROOM_W / 2 - 0.25, z: -ROOM_D / 2 + 0.25, rotY: -Math.PI / 4 },
    { x: -ROOM_W / 2 + 0.25, z: -ROOM_D / 2 + 0.25, rotY: Math.PI / 4 },
    { x: ROOM_W / 2 - 0.25, z: ROOM_D / 2 - 0.25, rotY: (-3 * Math.PI) / 4 },
    { x: -ROOM_W / 2 + 0.25, z: ROOM_D / 2 - 0.25, rotY: (3 * Math.PI) / 4 },
  ];
  cobwebCorners.forEach(({ x, z, rotY }) => {
    const webTex = new THREE.CanvasTexture(makeCobwebTexture(256));
    webTex.colorSpace = THREE.SRGBColorSpace;
    const webMat = new THREE.MeshBasicMaterial({
      map: webTex, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const web = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), webMat);
    web.position.set(x, ROOM_H - 0.15, z);
    web.rotation.y = rotY;
    web.rotation.x = -0.25;
    scene.add(web);
  });

  // ---------- floor rubble: broken brick debris (structural decay, not furniture) ----------
  const rubbleMat = new THREE.MeshStandardMaterial({ color: 0x6b4a34, roughness: 0.95 });
  const rubbleGroup = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const w = 0.15 + Math.random() * 0.25;
    const h = 0.08 + Math.random() * 0.1;
    const dpt = 0.1 + Math.random() * 0.2;
    const piece = new THREE.Mesh(new THREE.BoxGeometry(w, h, dpt), rubbleMat);
    // scatter mostly near the walls, like fallen debris
    const alongWall = Math.random() < 0.5 ? "south" : "west";
    let x, z;
    if (alongWall === "south") {
      x = (Math.random() - 0.5) * (ROOM_W - 1);
      z = ROOM_D / 2 - 0.3 - Math.random() * 0.6;
    } else {
      x = -ROOM_W / 2 + 0.3 + Math.random() * 0.6;
      z = (Math.random() - 0.5) * (ROOM_D - 1);
    }
    piece.position.set(x, h / 2, z);
    piece.rotation.y = Math.random() * Math.PI;
    piece.castShadow = true;
    piece.receiveShadow = true;
    rubbleGroup.add(piece);
  }
  scene.add(rubbleGroup);

  // ---------- furniture removed for now (charpai, puja shelf, diya) ----------
  // Will be re-added later once the room shell/textures are finalized.

  // ---------- ambient room lighting ----------
  const ambient = new THREE.AmbientLight(0x7a7266, 1.6);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0xd8d0bc, 0x3a3226, 1.0);
  scene.add(fillLight);

  const moonShaft = new THREE.SpotLight(0x8fa5c0, 1.1, 10, Math.PI / 6, 0.6, 1.5);
  moonShaft.position.set(ROOM_W / 2 - 0.5, ROOM_H - 0.3, 0);
  moonShaft.target.position.set(-1, 0, 0.5);
  scene.add(moonShaft, moonShaft.target);

  // a warm downward shaft near center, like light falling through a broken
  // roof/skylight in the reference photo — dust motes below will catch it
  const skyBeam = new THREE.SpotLight(0xffe9c2, 2.0, 8, Math.PI / 7, 0.5, 1.8);
  skyBeam.position.set(0.5, ROOM_H - 0.05, -0.5);
  skyBeam.target.position.set(0.3, 0, -0.3);
  scene.add(skyBeam, skyBeam.target);

  const entranceLight = new THREE.PointLight(0xffe0b0, 1.2, 6, 2);
  entranceLight.position.set(0.5, 2.2, 3.5);
  scene.add(entranceLight);

  // ---------- floating dust motes (visible in the light shaft) ----------
  const motesCount = 140;
  const motesGeo = new THREE.BufferGeometry();
  const motesPos = new Float32Array(motesCount * 3);
  for (let i = 0; i < motesCount; i++) {
    motesPos[i * 3] = (Math.random() - 0.5) * ROOM_W * 0.7;
    motesPos[i * 3 + 1] = Math.random() * ROOM_H;
    motesPos[i * 3 + 2] = (Math.random() - 0.5) * ROOM_D * 0.7;
  }
  motesGeo.setAttribute("position", new THREE.BufferAttribute(motesPos, 3));
  const motesMat = new THREE.PointsMaterial({
    color: 0xffe9c2, size: 0.012, transparent: true, opacity: 0.5, depthWrite: false,
  });
  const motes = new THREE.Points(motesGeo, motesMat);
  scene.add(motes);

  // ---------- spawn ----------
  const spawnPoint = new THREE.Vector3(1.5, engine.playerHeight, 3.5);
  const spawnYaw = Math.PI * 0.85;

  // ---------- per-frame update: entrance flicker + drifting dust ----------
  let flickerT = 0;
  const baseEntranceIntensity = entranceLight.intensity;
  const motePositions = motesGeo.attributes.position;
  function update(dt) {
    flickerT += dt;
    entranceLight.intensity =
      baseEntranceIntensity + Math.sin(flickerT * 7) * 0.08 + (Math.random() - 0.5) * 0.06;
    skyBeam.intensity = 2.0 + Math.sin(flickerT * 3.3) * 0.15;

    for (let i = 0; i < motesCount; i++) {
      let y = motePositions.getY(i) - dt * 0.05;
      if (y < 0) y = ROOM_H;
      motePositions.setY(i, y);
    }
    motePositions.needsUpdate = true;
  }

  return { spawnPoint, spawnYaw, update, colliders };
}

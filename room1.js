// room1.js — ROOM 1: an old Indian haveli room.
// Pure map for now: floor, walls, jharokha window.
// Furniture (charpai, puja shelf, diya) removed for now — will be added back later.
// No jumpscares / mechanics yet — just the walkable space.

import * as THREE from "three";

const ROOM_W = 7; // east-west
const ROOM_D = 9; // north-south
const ROOM_H = 3.0;

// ---------------------------------------------------------------------------
// Procedural grunge texture generator.
// Builds an aged, dirty, cracked surface (stone / mud-plaster / old wood) on
// a <canvas> so we don't need any external image assets — this is what kills
// the "flat color = cartoonish" look and gives real material depth via the
// bump map. Feel free to tweak the accent/crack/stain counts per surface.
// ---------------------------------------------------------------------------
function makeGrungeCanvas(size, baseHex, accentHex, { cracks = 14, blotches = 40, grain = 22, vignette = 0.35 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;

  // base fill
  ctx.fillStyle = hex(baseHex);
  ctx.fillRect(0, 0, size, size);

  // discoloration blotches (damp patches, soot, age stains)
  for (let i = 0; i < blotches; i++) {
    ctx.globalAlpha = 0.04 + Math.random() * 0.14;
    ctx.fillStyle = hex(accentHex);
    const w = 15 + Math.random() * size * 0.25;
    const h = 15 + Math.random() * size * 0.25;
    ctx.beginPath();
    ctx.ellipse(Math.random() * size, Math.random() * size, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // cracks / grout lines
  ctx.strokeStyle = "rgba(8,6,4,0.55)";
  for (let i = 0; i < cracks; i++) {
    ctx.lineWidth = 0.5 + Math.random() * 1.8;
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 4 + Math.floor(Math.random() * 6);
    for (let s = 0; s < segs; s++) {
      x += (Math.random() - 0.5) * size * 0.18;
      y += (Math.random() - 0.5) * size * 0.18;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // fine grain / noise so it doesn't read as a flat gradient
  const imgData = ctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * grain;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(imgData, 0, 0);

  // vignette so tiled edges don't look perfectly uniform
  const grad = ctx.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.75);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, `rgba(0,0,0,${vignette})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

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
  scene.fog = new THREE.FogExp2(0x000000, 0.012);
  scene.background = new THREE.Color(0x000000);

  // ---------- shared grunge canvases ----------
  const stoneCanvas = makeGrungeCanvas(512, 0x2a231a, 0x181310, { cracks: 20, blotches: 55, grain: 20, vignette: 0.4 });
  const plasterCanvas = makeGrungeCanvas(512, 0x6b4e33, 0x3f2e1d, { cracks: 16, blotches: 45, grain: 18, vignette: 0.3 });
  const woodCanvas = makeGrungeCanvas(512, 0x1c1712, 0x0c0a08, { cracks: 10, blotches: 30, grain: 24, vignette: 0.45 });

  // ---------- floor: old cracked stone ----------
  const floorTex = makeTiledTexture(stoneCanvas, ROOM_W / 1.6, ROOM_D / 1.6);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    bumpMap: floorTex,
    bumpScale: 0.7,
    roughness: 1,
  });
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

  // ---------- walls: mud-plastered, warm ochre, cracked & stained ----------
  const t = 0.2; // thickness

  function addWallBox(cx, cz, w, d, h = ROOM_H, cy = h / 2) {
    // clone the plaster texture per wall segment so each one can have its
    // own repeat scale based on its actual size (keeps tiling proportional)
    const tex = new THREE.CanvasTexture(plasterCanvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(Math.max(1, w / 1.6), Math.max(1, h / 1.6));
    tex.colorSpace = THREE.SRGBColorSpace;

    const mat = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.55, roughness: 1 });
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

  // ---------- furniture removed for now (charpai, puja shelf, diya) ----------
  // Will be re-added later once the room shell/textures are finalized.

  // ---------- ambient room lighting ----------
  const ambient = new THREE.AmbientLight(0x8a8478, 2.2);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0xffffff, 0x4a4030, 1.4);
  scene.add(fillLight);

  const moonShaft = new THREE.SpotLight(0x8fa5c0, 1.1, 10, Math.PI / 6, 0.6, 1.5);
  moonShaft.position.set(ROOM_W / 2 - 0.5, ROOM_H - 0.3, 0);
  moonShaft.target.position.set(-1, 0, 0.5);
  scene.add(moonShaft, moonShaft.target);

  // kept as a lighting fixture (not furniture) — gives the room a flickering,
  // uneasy glow near the entrance now that the diya prop is gone
  const entranceLight = new THREE.PointLight(0xffe0b0, 1.4, 6, 2);
  entranceLight.position.set(0.5, 2.2, 3.5);
  scene.add(entranceLight);

  // ---------- spawn ----------
  const spawnPoint = new THREE.Vector3(1.5, engine.playerHeight, 3.5);
  const spawnYaw = Math.PI * 0.85;

  // ---------- per-frame update: subtle entrance-light flicker for unease ----------
  let flickerT = 0;
  const baseEntranceIntensity = entranceLight.intensity;
  function update(dt) {
    flickerT += dt;
    entranceLight.intensity =
      baseEntranceIntensity + Math.sin(flickerT * 7) * 0.08 + (Math.random() - 0.5) * 0.06;
  }

  return { spawnPoint, spawnYaw, update, colliders };
}

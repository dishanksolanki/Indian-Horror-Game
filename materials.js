// materials.js — shared old Indian house wall material (mud-plaster look).
// Used by every room/corridor/hall file so every wall in the house matches.
//
// PERFORMANCE NOTE: createWallMaterial()/createFloorMaterial() used to be called
// once per room/corridor (~59 times across the whole map), and each call built a
// brand new 512x512 canvas from scratch with a per-pixel noise pass — that's
// tens of millions of pixel operations run at load time, plus ~59 separate
// textures sitting in GPU memory. Since every room wants the exact same look
// anyway, we now generate the texture/material ONCE per (texture, material)
// combo and hand back a shared reference. This is purely an internal caching
// change — callers don't need to change anything.

import * as THREE from "three";

let _wallTexture = null;
let _wallMaterial = null;
let _floorTextureCache = new Map(); // keyed by "repeatX,repeatY" since floor repeat varies per room

export function makeWallTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  // base mud-plaster ochre tone
  ctx.fillStyle = "#6b4e33";
  ctx.fillRect(0, 0, size, size);

  // uneven lime-wash / plaster patches
  for (let i = 0; i < 140; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 10 + Math.random() * 45;
    const shade = Math.random() > 0.5 ? "rgba(120,90,58,0.18)" : "rgba(40,28,18,0.18)";
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // damp/water stains streaking down
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * size;
    const grad = ctx.createLinearGradient(x, 0, x, size);
    grad.addColorStop(0, "rgba(20,15,10,0)");
    grad.addColorStop(0.5, "rgba(20,15,10,0.15)");
    grad.addColorStop(1, "rgba(20,15,10,0.3)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - 15, 0, 30 + Math.random() * 20, size);
  }

  // fine cracks
  ctx.strokeStyle = "rgba(15,10,6,0.4)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 25; i++) {
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segments = 4 + Math.floor(Math.random() * 5);
    for (let s = 0; s < segments; s++) {
      x += (Math.random() - 0.5) * 40;
      y += (Math.random() - 0.5) * 40;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // grainy plaster noise
  const imgData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 18;
    imgData.data[i] += n;
    imgData.data[i + 1] += n;
    imgData.data[i + 2] += n;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 1.4);
  return texture;
}

export function createWallMaterial() {
  // build the texture + material exactly once, then hand back the same
  // instance to every room/corridor that asks for it
  if (!_wallMaterial) {
    _wallTexture = makeWallTexture();
    _wallMaterial = new THREE.MeshStandardMaterial({
      map: _wallTexture,
      bumpMap: _wallTexture,
      bumpScale: 0.04,
      color: 0xffffff,
      roughness: 1,
    });
  }
  return _wallMaterial;
}

export function makeFloorTexture() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");

  // base worn stone/tile tone
  ctx.fillStyle = "#2a231a";
  ctx.fillRect(0, 0, size, size);

  // tile grid — old square tiles, slightly uneven
  const tileCount = 6;
  const tileSize = size / tileCount;
  ctx.strokeStyle = "rgba(10,8,5,0.55)";
  for (let i = 0; i <= tileCount; i++) {
    const jitter = () => (Math.random() - 0.5) * 4;
    ctx.lineWidth = 2 + Math.random();
    // vertical grout lines
    ctx.beginPath();
    ctx.moveTo(i * tileSize + jitter(), 0);
    ctx.lineTo(i * tileSize + jitter(), size);
    ctx.stroke();
    // horizontal grout lines
    ctx.beginPath();
    ctx.moveTo(0, i * tileSize + jitter());
    ctx.lineTo(size, i * tileSize + jitter());
    ctx.stroke();
  }

  // per-tile discoloration — some tiles darker/dirtier, some lighter/worn
  for (let ty = 0; ty < tileCount; ty++) {
    for (let tx = 0; tx < tileCount; tx++) {
      const shade = (Math.random() - 0.5) * 0.3;
      ctx.fillStyle = shade > 0
        ? `rgba(80,65,45,${shade})`
        : `rgba(10,8,5,${-shade})`;
      ctx.fillRect(tx * tileSize + 2, ty * tileSize + 2, tileSize - 4, tileSize - 4);
    }
  }

  // dirt / grime patches scattered across the floor
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 6 + Math.random() * 30;
    ctx.fillStyle = `rgba(15,11,7,${0.08 + Math.random() * 0.18})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // scuffs and hairline cracks running across tiles
  ctx.strokeStyle = "rgba(5,4,2,0.5)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 35; i++) {
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segments = 3 + Math.floor(Math.random() * 4);
    for (let s = 0; s < segments; s++) {
      x += (Math.random() - 0.5) * 30;
      y += (Math.random() - 0.5) * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // fine grain noise for a gritty, unclean feel
  const imgData = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 16;
    imgData.data[i] += n;
    imgData.data[i + 1] += n;
    imgData.data[i + 2] += n;
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// createFloorMaterial is called with different repeat values per room (rooms
// have different sizes), so we cache one texture/material per distinct
// (repeatX, repeatY) pair instead of one shared texture for everything —
// still collapses ~30 duplicate generations down to a handful of unique ones.
export function createFloorMaterial(repeatX = 3, repeatY = 3) {
  const key = `${repeatX},${repeatY}`;
  let cached = _floorTextureCache.get(key);
  if (!cached) {
    const texture = makeFloorTexture();
    texture.repeat.set(repeatX, repeatY);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      bumpMap: texture,
      bumpScale: 0.03,
      color: 0xffffff,
      roughness: 0.95,
    });
    cached = material;
    _floorTextureCache.set(key, cached);
  }
  return cached;
}

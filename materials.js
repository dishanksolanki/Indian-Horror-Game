// materials.js — shared old Indian house wall material (mud-plaster look).
// Used by room1.js, corridor.js, and room2.js so every wall in the house matches.

import * as THREE from "three";

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
  const texture = makeWallTexture();
  return new THREE.MeshStandardMaterial({
    map: texture,
    bumpMap: texture,
    bumpScale: 0.04,
    color: 0xffffff,
    roughness: 1,
  });
}

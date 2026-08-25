// chudail.js — procedural model for the haveli's stalking presence.
//
// v8: same "Stripped One" silhouette as v7, but the whole material set was
// pushed down toward near-black on purpose — see the materials block below
// for why. Pair this with the erratic stalk/lunge behavior added to
// chudailenemy.js in the same update; the shape barely changed, the point
// this time is what you CAN'T see and how it moves, not more visible gore.
//
// v7: COMPLETE REDESIGN — "THE STRIPPED ONE". Scrapped the armored
// swordsman look entirely. This is a gaunt, starved, WRONG-jointed
// humanoid: too-long limbs that hang past the knees, a spine that arches
// and bulges through torn skin, ribs pushing out through the chest,
// backward-bending digitigrade legs (like a broken puppet), clawed
// fingers/toes instead of hands/feet, and a long, unnaturally bent neck
// that ends in the same faceless wound as before — except now the wound
// sits HIGHER, thrown back, like the neck snapped and kept growing anyway.
// Instead of a held sword, a jagged bone blade erupts directly out of the
// right forearm through torn flesh, dripping where it pierces the skin —
// this is not a weapon he picked up, it's part of him.
//
// The "wrongness" (elongation, reversed joints, exposed anatomy) is the
// horror here, not gore-for-its-own-sake — gore is layered on top as
// dark, half-dried blood/ichor, kept desaturated so it reads as texture,
// not a cartoon splatter.
//
// Filename/export name (createChudailModel) kept the same so nothing
// importing this (chudailenemy.js, room21.js) needs an import-path change.
// `parts` keeps the SAME key shape as every prior version so the existing
// state machine / animation code in chudailenemy.js keeps working exactly
// as before:
//   - `hair` -> neck-sway pivot (now the base of the long bent neck).
//   - `head` -> the stump/wound Group at the top of the neck.
//   - `leftEye`/`rightEye`/`eyeMaterial`/`eyeLight` -> two faint embers
//     inside the wound, now a sickly pale white-green instead of orange.
//   - `weaponSocket` -> now the bone blade jutting from the right forearm.

import * as THREE from "three";

// ---------- grime/vein texture ----------
function makeSkinTexture({ base, veinColor, blotchColor, size = 128, veins = 40, blotches = 40, seed = 1 }) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };

  // dark blotches — bruising, rot
  for (let i = 0; i < blotches; i++) {
    const x = rand() * size, y = rand() * size, r = 2 + rand() * 10;
    ctx.beginPath();
    ctx.fillStyle = blotchColor;
    ctx.globalAlpha = 0.12 + rand() * 0.25;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // thin branching veins, visible under stretched-taut skin
  ctx.globalAlpha = 0.4;
  for (let i = 0; i < veins; i++) {
    let x = rand() * size, y = rand() * size;
    ctx.strokeStyle = veinColor;
    ctx.lineWidth = 0.6 + rand() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 3 + Math.floor(rand() * 3);
    for (let j = 0; j < segs; j++) {
      x += (rand() - 0.5) * 18;
      y += (rand() - 0.5) * 18;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const speckleCount = Math.floor(size * size * 0.03);
  for (let i = 0; i < speckleCount; i++) {
    const x = rand() * size, y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.035)";
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeRagTexture({ base, blotchColor, seed = 1, size = 128, blotches = 45 }) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  let s = seed * 9301 + 49297;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < blotches; i++) {
    const x = rand() * size, y = rand() * size, r = 3 + rand() * 14;
    ctx.beginPath();
    ctx.fillStyle = blotchColor;
    ctx.globalAlpha = 0.15 + rand() * 0.3;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createChudailModel() {
  const group = new THREE.Group();
  group.name = "strippedOne";

  // ---------- materials ----------
  // Pushed the whole palette WAY down — this thing should read as a
  // near-black shape that swallows light, with almost no legible detail
  // except where it's wet (blood/wound) or lit from inside (embers). A
  // low-poly model that's fully lit and clearly visible rarely scares
  // anyone; a shape you can't quite resolve does. Let the engine's key
  // light barely catch a rim/edge on him and leave the rest to guesswork.
  const skinTex = makeSkinTexture({
    base: "#141210", veinColor: "rgba(40,4,4,0.5)", blotchColor: "rgba(0,0,0,0.6)",
    seed: 5, veins: 46, blotches: 40,
  }); // near-black, desiccated skin — veins barely catch light at all
  const skinMat = new THREE.MeshStandardMaterial({ map: skinTex, roughness: 0.97, metalness: 0 });

  const muscleMat = new THREE.MeshStandardMaterial({ color: 0x1c0503, roughness: 0.85 }); // exposed muscle, almost black, only reads as a color at close range
  const boneMat = new THREE.MeshStandardMaterial({ color: 0x4a4438, roughness: 0.7 }); // dirty bone, dulled down — no bright "clean" white to break the silhouette
  const woundMat = new THREE.MeshStandardMaterial({ color: 0x050101, roughness: 0.95 }); // essentially a black hole in the model

  const wetBloodMat = new THREE.MeshStandardMaterial({ color: 0x1a0403, roughness: 0.15, metalness: 0.05 }); // still glossy — the ONE thing allowed to catch a highlight
  const driedBloodMat = new THREE.MeshStandardMaterial({ color: 0x0a0201, roughness: 0.97 });

  const ragTex = makeRagTexture({ base: "#0f0c0a", blotchColor: "rgba(0,0,0,0.6)", seed: 21 });
  const ragMat = new THREE.MeshStandardMaterial({ map: ragTex, roughness: 0.97, side: THREE.DoubleSide });

  const clawMat = new THREE.MeshStandardMaterial({ color: 0x100e0b, roughness: 0.6 }); // claws vanish into the silhouette until they catch a highlight

  // the ONLY real light source on the whole body — faint, cold, and small.
  // Lower opacity than before on purpose: it should be barely-there at a
  // distance and only unmistakably "eyes" once he's close, which is the
  // point where it's too late to matter
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xbfe0d8, transparent: true, opacity: 0.45 });

  function addMesh(parent, geo, mat, x = 0, y = 0, z = 0, castShadow = true) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    parent.add(mesh);
    return mesh;
  }

  function addBloodDrip(parent, { x, y, z, len = 0.1, width = 0.02, rot = 0, mat = wetBloodMat, tiltX = 0 }) {
    const drip = addMesh(parent, new THREE.BoxGeometry(width, len, 0.006), mat, x, y, z, false);
    drip.rotation.z = rot;
    drip.rotation.x = tiltX;
    return drip;
  }

  // a bent claw: a few tapered segments angling inward, for hands/feet
  function addClaw(parent, { x, y, z, len = 0.07, rot = 0, rotZ = 0 }) {
    const claw = addMesh(parent, new THREE.ConeGeometry(0.012, len, 4), clawMat, x, y, z);
    claw.rotation.x = rot;
    claw.rotation.z = rotZ;
    return claw;
  }

  // ============================================================
  // HIPS (root) — narrow, starved pelvis, hip bones jutting visibly.
  // ============================================================
  const HIP_Y = 1.0;
  const hips = new THREE.Group();
  hips.position.set(0, HIP_Y, 0);
  group.add(hips);
  addMesh(hips, new THREE.BoxGeometry(0.3, 0.16, 0.2), skinMat, 0, 0, 0);
  addMesh(hips, new THREE.BoxGeometry(0.08, 0.1, 0.06), ragMat, 0, -0.1, 0); // scrap of ragged cloth, not real coverage
  // jutting hip bone points
  addMesh(hips, new THREE.ConeGeometry(0.02, 0.06, 4), boneMat, -0.13, 0.03, 0.06).rotation.z = 0.6;
  addMesh(hips, new THREE.ConeGeometry(0.02, 0.06, 4), boneMat, 0.13, 0.03, 0.06).rotation.z = -0.6;

  // ============================================================
  // TORSO — concave, starved, ribs pushing out through torn skin, spine
  // bulging up the back. Hunched hard forward — a broken-looking posture,
  // not an upright "warrior" stance.
  // ============================================================
  const TORSO_H = 0.58;
  const torso = new THREE.Group();
  torso.position.set(0, 0.08, 0);
  torso.rotation.x = 0.32; // hard hunch
  hips.add(torso);

  // concave chest — narrower at the bottom, slightly wider/hollow at the ribs
  addMesh(torso, new THREE.BoxGeometry(0.34, TORSO_H, 0.18), skinMat, 0, TORSO_H / 2, -0.01);

  // ribs bulging through torn skin, three arcs down the side
  [0.62, 0.46, 0.3].forEach((t, i) => {
    const rib = addMesh(torso, new THREE.TorusGeometry(0.1, 0.012, 5, 8, Math.PI * 0.9), boneMat, 0, TORSO_H * t, 0.05);
    rib.rotation.y = Math.PI / 2;
    rib.rotation.z = Math.PI * 0.05;
    // torn skin flap around the rib
    addMesh(torso, new THREE.PlaneGeometry(0.14, 0.05), muscleMat, 0, TORSO_H * t, 0.09).rotation.x = 0.3;
  });

  // spine bulging up the back, a row of raised vertebra bumps
  for (let i = 0; i < 6; i++) {
    const t = 0.12 + i * 0.14;
    addMesh(torso, new THREE.SphereGeometry(0.02 - i * 0.001, 5, 5), boneMat, 0, TORSO_H * t, -0.1);
  }

  // ragged loincloth scraps, hanging unevenly
  const tornOffsets = [-0.1, 0.02, 0.12];
  tornOffsets.forEach((ox, i) => {
    const len = 0.22 + ((i * 37) % 5) * 0.04;
    const strip = addMesh(torso, new THREE.PlaneGeometry(0.08, len), ragMat, ox, -0.05 - len / 2, 0.06);
    strip.rotation.z = (i - 1) * 0.08;
  });

  // blood/ichor running down the chest from the neck
  addBloodDrip(torso, { x: -0.02, y: TORSO_H * 0.85, z: 0.1, len: 0.3, width: 0.026, mat: wetBloodMat });
  addBloodDrip(torso, { x: 0.06, y: TORSO_H * 0.7, z: 0.1, len: 0.18, width: 0.018, mat: driedBloodMat });

  // ============================================================
  // NECK — long, unnaturally bent, made of two extra segments instead of
  // sitting flush on the shoulders. Ends thrown back and up in the same
  // wound/stump as before (kept faceless on purpose).
  // ============================================================
  const neckPivot = new THREE.Group(); // maps to parts.hair (sway pivot) — base of the neck
  neckPivot.position.set(0, TORSO_H, 0);
  neckPivot.rotation.x = -0.5; // arches backward immediately, unnatural
  torso.add(neckPivot);

  const NECK_SEG = 0.16;
  addMesh(neckPivot, new THREE.CylinderGeometry(0.045, 0.055, NECK_SEG, 6), skinMat, 0, NECK_SEG / 2, 0);

  const neckMid = new THREE.Group();
  neckMid.position.set(0, NECK_SEG, 0);
  neckMid.rotation.x = 0.35; // bends back the other way — a visibly broken angle
  neckPivot.add(neckMid);
  addMesh(neckMid, new THREE.CylinderGeometry(0.038, 0.045, NECK_SEG, 6), skinMat, 0, NECK_SEG / 2, 0);
  // a knob of exposed vertebra at the bend, where skin has split
  addMesh(neckMid, new THREE.SphereGeometry(0.022, 6, 6), boneMat, 0, 0.01, 0.02);

  const stump = new THREE.Group(); // maps to parts.head — the wound itself
  stump.position.set(0, NECK_SEG, 0);
  neckMid.add(stump);

  const jaggedOffsets = [
    { x: -0.04, y: 0.02, z: -0.02, s: 0.075, r: 0.3 },
    { x: 0.035, y: 0.025, z: 0.015, s: 0.08, r: -0.2 },
    { x: 0, y: 0.05, z: -0.01, s: 0.06, r: 0.1 },
  ];
  jaggedOffsets.forEach((o) => {
    const chunk = addMesh(stump, new THREE.BoxGeometry(o.s, o.s * 0.6, o.s), skinMat, o.x, o.y, o.z);
    chunk.rotation.set(o.r, o.r * 0.5, o.r * 0.3);
  });
  addMesh(stump, new THREE.CylinderGeometry(0.06, 0.065, 0.075, 8), woundMat, 0, 0.035, 0);
  const rim = addMesh(stump, new THREE.TorusGeometry(0.062, 0.011, 5, 10), driedBloodMat, 0, 0.065, 0);
  rim.rotation.x = Math.PI / 2;
  addMesh(stump, new THREE.CylinderGeometry(0.015, 0.018, 0.045, 6), boneMat, 0, 0.08, 0);

  addBloodDrip(stump, { x: -0.05, y: -0.02, z: 0.02, len: 0.12, width: 0.02, rot: -0.2, mat: wetBloodMat });
  addBloodDrip(stump, { x: 0.045, y: -0.02, z: 0.015, len: 0.09, width: 0.016, rot: 0.15, mat: driedBloodMat });

  const leftEye = addMesh(stump, new THREE.SphereGeometry(0.012, 6, 6), eyeMaterial, -0.02, 0.03, 0.035, false);
  const rightEye = addMesh(stump, new THREE.SphereGeometry(0.012, 6, 6), eyeMaterial, 0.02, 0.03, 0.035, false);
  const eyeLight = new THREE.PointLight(0xbfe0d8, 0.16, 1.0, 2.2); // small, cold, doesn't light much beyond the wound itself
  eyeLight.position.set(0, 0.035, 0.025);
  stump.add(eyeLight);

  // ============================================================
  // ARMS — too long. Upper+lower arm combined length hangs well past the
  // knee at rest, thin but corded with visible tendon, ending in long
  // clawed fingers instead of a hand.
  // ============================================================
  function buildArm(side) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 0.19, TORSO_H - 0.02, 0);
    torso.add(shoulder);
    // jutting shoulder bone, no armor plate this time — bare and starved
    addMesh(shoulder, new THREE.ConeGeometry(0.025, 0.07, 5), boneMat, sign * 0.03, 0.03, 0);

    const UPPER_LEN = 0.4; // long
    addMesh(shoulder, new THREE.CylinderGeometry(0.035, 0.028, UPPER_LEN, 6), skinMat, 0, -UPPER_LEN / 2, 0);
    addBloodDrip(shoulder, { x: sign * 0.02, y: -UPPER_LEN * 0.5, z: 0.035, len: 0.14, width: 0.014, mat: driedBloodMat });

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -UPPER_LEN, 0);
    // slight permanent inward bend — the joint doesn't sit straight
    forearmPivot.rotation.z = sign * -0.08;
    shoulder.add(forearmPivot);

    const LOWER_LEN = 0.38; // also long
    addMesh(forearmPivot, new THREE.CylinderGeometry(0.028, 0.022, LOWER_LEN, 6), skinMat, 0, -LOWER_LEN / 2, 0);
    // exposed tendon strip along the forearm
    addMesh(forearmPivot, new THREE.BoxGeometry(0.012, LOWER_LEN * 0.7, 0.008), muscleMat, 0.02, -LOWER_LEN * 0.4, 0.02);

    const hand = new THREE.Group();
    hand.position.set(0, -LOWER_LEN, 0);
    forearmPivot.add(hand);
    addMesh(hand, new THREE.BoxGeometry(0.03, 0.05, 0.02), skinMat, 0, -0.02, 0); // narrow palm
    // long clawed fingers, splayed
    [-0.02, -0.007, 0.007, 0.02].forEach((fx, i) => {
      addClaw(hand, { x: fx, y: -0.06 - i * 0.005, z: 0.01, len: 0.075, rot: Math.PI });
    });
    addClaw(hand, { x: -0.026, y: -0.03, z: 0.01, len: 0.05, rot: Math.PI * 0.75, rotZ: 0.4 }); // thumb claw

    return { shoulder, forearmPivot, hand };
  }

  const leftArm = buildArm("left");
  const rightArm = buildArm("right");

  // ---------- "weapon": a jagged bone blade erupting from the right forearm
  // itself, not held — it grows out through torn flesh partway down the
  // forearm, so the attack reads as a natural claw-strike, not a swordsman ----------
  const weaponSocket = new THREE.Group();
  rightArm.forearmPivot.add(weaponSocket);
  weaponSocket.position.set(0.03, -0.16, 0.01);
  weaponSocket.rotation.z = -0.15;

  // torn flesh ring where the bone punches through the skin
  addMesh(weaponSocket, new THREE.TorusGeometry(0.025, 0.008, 5, 8), muscleMat, 0, 0, 0).rotation.x = Math.PI / 2;
  addMesh(weaponSocket, new THREE.CylinderGeometry(0.02, 0.024, 0.02, 6), woundMat, 0, 0, 0);

  // the blade itself — irregular bone, tapering and slightly twisted, NOT a
  // clean smith-made shape
  addMesh(weaponSocket, new THREE.ConeGeometry(0.032, 0.22, 5), boneMat, 0, 0.13, 0);
  addMesh(weaponSocket, new THREE.ConeGeometry(0.018, 0.16, 5), boneMat, 0.01, 0.3, 0.005).rotation.z = 0.06;
  // jagged secondary spurs branching off the main blade
  addMesh(weaponSocket, new THREE.ConeGeometry(0.012, 0.08, 4), boneMat, 0.025, 0.16, 0).rotation.z = -0.5;
  addMesh(weaponSocket, new THREE.ConeGeometry(0.01, 0.06, 4), boneMat, -0.02, 0.22, 0).rotation.z = 0.6;

  // blood where it pierces the arm, and dripping down the blade
  addBloodDrip(weaponSocket, { x: -0.02, y: -0.02, z: 0.015, len: 0.09, width: 0.016, mat: wetBloodMat });
  addBloodDrip(weaponSocket, { x: 0.015, y: 0.1, z: 0.01, len: 0.12, width: 0.012, mat: driedBloodMat, rot: 0.05 });

  // ============================================================
  // LEGS — digitigrade, backward-bending, like a broken marionette. Thin,
  // starved, ending in clawed toes instead of a flat human foot.
  // ============================================================
  function buildLeg(side) {
    const sign = side === "left" ? -1 : 1;
    const upperLeg = new THREE.Group();
    upperLeg.position.set(sign * 0.09, 0, 0);
    hips.add(upperLeg);

    const UPPER_LEN = 0.34;
    addMesh(upperLeg, new THREE.CylinderGeometry(0.045, 0.032, UPPER_LEN, 6), skinMat, 0, -UPPER_LEN / 2, 0);
    addBloodDrip(upperLeg, { x: sign * 0.015, y: -UPPER_LEN * 0.6, z: 0.03, len: 0.12, width: 0.014, mat: driedBloodMat });

    const lowerLeg = new THREE.Group();
    lowerLeg.position.set(0, -UPPER_LEN, 0);
    // knee bends FORWARD (digitigrade / reversed), the core "wrongness" of the legs
    lowerLeg.rotation.x = -0.55;
    upperLeg.add(lowerLeg);

    const LOWER_LEN = 0.3;
    addMesh(lowerLeg, new THREE.CylinderGeometry(0.026, 0.03, LOWER_LEN, 6), skinMat, 0, -LOWER_LEN / 2, 0);
    // sharp visible ankle/heel bone jutting backward
    addMesh(lowerLeg, new THREE.ConeGeometry(0.018, 0.05, 4), boneMat, 0, -LOWER_LEN + 0.02, -0.03).rotation.x = -1.4;

    const foot = new THREE.Group();
    foot.position.set(0, -LOWER_LEN, 0);
    foot.rotation.x = 1.1; // foot angles forward off the reversed ankle
    lowerLeg.add(foot);
    addMesh(foot, new THREE.BoxGeometry(0.035, 0.03, 0.05), skinMat, 0, 0, 0.02);
    [-0.012, 0, 0.012].forEach((fx) => {
      addClaw(foot, { x: fx, y: -0.01, z: 0.06, len: 0.05, rot: Math.PI * 0.55 });
    });

    return { upperLeg, lowerLeg: foot };
  }

  const leftLeg = buildLeg("left");
  const rightLeg = buildLeg("right");

  const parts = {
    hips,
    torso,
    hair: neckPivot, // repurposed sway pivot — base of the long bent neck
    head: stump,     // repurposed as the neck-wound stump
    leftEye,
    rightEye,
    eyeLight,
    eyeMaterial,
    leftShoulder: leftArm.shoulder,
    leftUpperArm: leftArm.shoulder,
    leftForearm: leftArm.forearmPivot,
    leftHand: leftArm.hand,
    rightShoulder: rightArm.shoulder,
    rightUpperArm: rightArm.shoulder,
    rightForearm: rightArm.forearmPivot,
    rightHand: rightArm.hand,
    weaponSocket,
    leftUpperLeg: leftLeg.upperLeg,
    leftLowerLeg: leftLeg.lowerLeg,
    rightUpperLeg: rightLeg.upperLeg,
    rightLowerLeg: rightLeg.lowerLeg,
  };

  return { group, parts };
}

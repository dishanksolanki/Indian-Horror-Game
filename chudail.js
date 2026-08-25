// chudail.js — procedural model for the haveli's stalking presence.
//
// v6: HEADLESS SWORDSMAN, BLOODIED. Same broad, armored, corpse-pale
// warrior as v5, ending in a jagged neck wound instead of a head — but now
// caked in dark, half-dried blood (crusted matte patches + a few fresher
// glossy drips), with visibly thicker/heavier arms and legs so he reads as
// something that could actually cave a door in, and a bigger, uglier,
// serrated sword dripping down the blade. Colors stay muted/desaturated
// (ash, rust, oxidized bronze, near-black blood) with a grime canvas
// texture over the base color, to avoid the flat "cartoon" look at low
// poly counts.
//
// Filename/export name (createChudailModel) kept the same as every prior
// version so nothing importing this (chudailenemy.js, room21.js) needs an
// import-path change. `parts` keeps the exact same key shape as before —
// see the v5 header notes below, still accurate:
//   - `hair` -> the neck-sway pivot (there's no hair; it's the stump's own
//     Group, so chudailenemy.js's existing sway animation still has
//     something sensible to rotate).
//   - `head` -> the stump/wound Group itself (no face geometry inside it).
//   - `leftEye`/`rightEye`/`eyeMaterial`/`eyeLight` -> two small embers
//     inside the neck wound, instead of sitting on a face.
//   - `weaponSocket` -> holds the sword mesh (blade/guard/hilt).

import * as THREE from "three";

// ---------- grime/mottling texture, muted palette on purpose ----------
function makeGrimeTexture({ base, blotchColor, size = 128, blotches = 60, seed = 1 }) {
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

  for (let i = 0; i < blotches; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 3 + rand() * 16;
    ctx.beginPath();
    ctx.fillStyle = blotchColor;
    ctx.globalAlpha = 0.15 + rand() * 0.3;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const speckleCount = Math.floor(size * size * 0.035);
  for (let i = 0; i < speckleCount; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.04)";
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// ---------- blood-streaked variant: same grime base, plus dark red-black
// drip smears painted over the top, for skin/cloth that should look soaked ----------
function makeBloodstainTexture({ base, blotchColor, bloodColor, size = 128, blotches = 55, drips = 10, seed = 1 }) {
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

  for (let i = 0; i < blotches; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 3 + rand() * 14;
    ctx.beginPath();
    ctx.fillStyle = blotchColor;
    ctx.globalAlpha = 0.15 + rand() * 0.3;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // dark blood drips — vertical streaks of varying width/length, mostly
  // pooling darker at the bottom, like it's run and half-dried
  for (let i = 0; i < drips; i++) {
    const x = rand() * size;
    const yTop = rand() * size * 0.5;
    const len = size * (0.25 + rand() * 0.45);
    const w = 2 + rand() * 5;
    ctx.globalAlpha = 0.35 + rand() * 0.35;
    const grad = ctx.createLinearGradient(x, yTop, x, yTop + len);
    grad.addColorStop(0, bloodColor);
    grad.addColorStop(1, "rgba(10,2,2,0.05)");
    ctx.fillStyle = grad;
    ctx.fillRect(x - w / 2, yTop, w, len);
  }
  // a few blotchy pooled stains
  for (let i = 0; i < Math.floor(drips * 0.6); i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 4 + rand() * 10;
    ctx.globalAlpha = 0.3 + rand() * 0.3;
    ctx.fillStyle = bloodColor;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  const speckleCount = Math.floor(size * size * 0.035);
  for (let i = 0; i < speckleCount; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.04)";
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createChudailModel() {
  const group = new THREE.Group();
  group.name = "headlessSwordsman";

  // ---------- materials — muted, desaturated, NOT flat/saturated ----------
  const skinTex = makeBloodstainTexture({
    base: "#6b6258", blotchColor: "rgba(20,15,12,0.5)", bloodColor: "rgba(30,4,4,0.8)",
    seed: 4, blotches: 60, drips: 9,
  }); // ash-grey corpse skin, blood-run down the chest/arms
  const skinMat = new THREE.MeshStandardMaterial({ map: skinTex, roughness: 0.95 });

  const armorTex = makeGrimeTexture({ base: "#3a2f26", blotchColor: "rgba(10,8,6,0.5)", seed: 9, blotches: 55 }); // oxidized leather/bronze armor
  const armorMat = new THREE.MeshStandardMaterial({ map: armorTex, roughness: 0.85, metalness: 0.15 });

  const clothTex = makeBloodstainTexture({
    base: "#4a1c18", blotchColor: "rgba(10,4,3,0.55)", bloodColor: "rgba(20,2,2,0.85)",
    seed: 13, blotches: 50, drips: 7,
  }); // dried-blood rust dhoti, soaked further at the waist
  const clothMat = new THREE.MeshStandardMaterial({ map: clothTex, roughness: 0.92, side: THREE.DoubleSide });

  const woundMat = new THREE.MeshStandardMaterial({ color: 0x1c0605, roughness: 0.9 }); // dark, wet-looking wound interior
  const boneMat = new THREE.MeshStandardMaterial({ color: 0x8a7d68, roughness: 0.7 }); // exposed vertebra stub

  // fresh wet blood (glossy, still catches light) vs. old dried crust (flat, near-black)
  const wetBloodMat = new THREE.MeshStandardMaterial({ color: 0x3a0806, roughness: 0.2, metalness: 0.05 });
  const driedBloodMat = new THREE.MeshStandardMaterial({ color: 0x160302, roughness: 0.95 });

  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x54564f, roughness: 0.4, metalness: 0.7 }); // dulled, notched, darker steel
  const hiltMat = new THREE.MeshStandardMaterial({ color: 0x241a14, roughness: 0.85 });
  const guardMat = new THREE.MeshStandardMaterial({ color: 0x4c3d22, roughness: 0.55, metalness: 0.45 });

  // embers glowing inside the neck wound — the only "face" this design has
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.75 });

  function addMesh(parent, geo, mat, x = 0, y = 0, z = 0, castShadow = true) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    parent.add(mesh);
    return mesh;
  }

  // small helper for painting a blood drip/streak anywhere on the body —
  // a thin tapered box, slightly rotated, dark and half-glossy
  function addBloodDrip(parent, { x, y, z, len = 0.1, width = 0.02, rot = 0, mat = wetBloodMat, tiltX = 0 }) {
    const drip = addMesh(parent, new THREE.BoxGeometry(width, len, 0.006), mat, x, y, z, false);
    drip.rotation.z = rot;
    drip.rotation.x = tiltX;
    return drip;
  }

  // ============================================================
  // HIPS (root) — feet touch y=0. Broad and heavy, not lithe.
  // ============================================================
  const HIP_Y = 0.95;
  const hips = new THREE.Group();
  hips.position.set(0, HIP_Y, 0);
  group.add(hips);
  addMesh(hips, new THREE.BoxGeometry(0.44, 0.2, 0.28), clothMat, 0, 0, 0);
  addMesh(hips, new THREE.CylinderGeometry(0.06, 0.05, 0.24, 6), armorMat, 0, 0.02, 0.16).rotation.x = Math.PI / 2; // belt buckle bar

  // ============================================================
  // TORSO — broad, bulky, armor plates over bare corpse-grey skin. Slight
  // forward set to the shoulders (weight of the sword/stance), not a frail
  // stoop.
  // ============================================================
  const TORSO_H = 0.62;
  const torso = new THREE.Group();
  torso.position.set(0, 0.1, 0);
  torso.rotation.x = 0.06;
  hips.add(torso);

  addMesh(torso, new THREE.BoxGeometry(0.46, TORSO_H, 0.28), skinMat, 0, TORSO_H / 2, 0);
  // chest armor plate
  addMesh(torso, new THREE.BoxGeometry(0.34, TORSO_H * 0.65, 0.06), armorMat, 0, TORSO_H * 0.55, 0.16);
  // crossed leather straps
  const strapL = addMesh(torso, new THREE.BoxGeometry(0.05, TORSO_H + 0.1, 0.02), armorMat, -0.06, TORSO_H / 2, 0.17);
  strapL.rotation.z = 0.5;
  const strapR = addMesh(torso, new THREE.BoxGeometry(0.05, TORSO_H + 0.1, 0.02), armorMat, 0.06, TORSO_H / 2, 0.17);
  strapR.rotation.z = -0.5;
  // torn cloth hanging from the waist
  const tornOffsets = [-0.18, -0.08, 0.02, 0.12, 0.2];
  tornOffsets.forEach((ox, i) => {
    const len = 0.3 + ((i * 37) % 5) * 0.05;
    const strip = addMesh(torso, new THREE.PlaneGeometry(0.1, len), clothMat, ox, -0.14 - len / 2, 0.13);
    strip.rotation.z = (i - 2) * 0.05;
  });

  // blood run down the front of the chest plate and skin, as if it poured
  // out of the neck stump and down the body
  addBloodDrip(torso, { x: -0.03, y: TORSO_H * 0.78, z: 0.195, len: 0.34, width: 0.03, mat: wetBloodMat });
  addBloodDrip(torso, { x: 0.05, y: TORSO_H * 0.7, z: 0.195, len: 0.22, width: 0.022, mat: driedBloodMat });
  addBloodDrip(torso, { x: 0.12, y: TORSO_H * 0.5, z: 0.15, len: 0.18, width: 0.02, rot: 0.15, mat: driedBloodMat });
  // pooled dried blood low on the belly/waist
  addMesh(torso, new THREE.SphereGeometry(0.06, 8, 6), driedBloodMat, 0.02, 0.02, 0.16, false).scale.set(1, 0.4, 0.5);

  // ============================================================
  // NECK STUMP — where the head would be. Jagged, uneven, dark wound
  // interior with an exposed vertebra stub, blood crusted around the rim
  // and dripping down onto the shoulders, and two embers glowing within.
  // No head geometry at all past this point.
  // ============================================================
  const neckPivot = new THREE.Group(); // maps to parts.hair (sway pivot)
  neckPivot.position.set(0, TORSO_H, 0);
  torso.add(neckPivot);

  const stump = new THREE.Group(); // maps to parts.head
  neckPivot.add(stump);

  // jagged base of the neck — irregular stacked boxes at slightly different
  // rotations/sizes instead of one clean cylinder, so the cut reads as torn
  const jaggedOffsets = [
    { x: -0.05, y: 0.02, z: -0.03, s: 0.09, r: 0.3 },
    { x: 0.04, y: 0.03, z: 0.02, s: 0.1, r: -0.2 },
    { x: 0, y: 0.06, z: -0.01, s: 0.07, r: 0.1 },
    { x: -0.02, y: 0.01, z: 0.04, s: 0.08, r: -0.35 },
  ];
  jaggedOffsets.forEach((o) => {
    const chunk = addMesh(stump, new THREE.BoxGeometry(o.s, o.s * 0.6, o.s), skinMat, o.x, o.y, o.z);
    chunk.rotation.set(o.r, o.r * 0.5, o.r * 0.3);
  });
  // dark wound cavity — slightly larger/uglier than before
  addMesh(stump, new THREE.CylinderGeometry(0.078, 0.085, 0.09, 8), woundMat, 0, 0.04, 0);
  // crusted blood ring around the wound's rim
  const rim = addMesh(stump, new THREE.TorusGeometry(0.08, 0.014, 5, 10), driedBloodMat, 0, 0.075, 0);
  rim.rotation.x = Math.PI / 2;
  // exposed vertebra stub, just visible above the wound line
  addMesh(stump, new THREE.CylinderGeometry(0.018, 0.022, 0.05, 6), boneMat, 0, 0.09, 0);

  // blood streaming from the wound, down over the shoulders and chest
  addBloodDrip(stump, { x: -0.07, y: -0.02, z: 0.03, len: 0.16, width: 0.024, rot: -0.25, mat: wetBloodMat });
  addBloodDrip(stump, { x: 0.06, y: -0.03, z: 0.02, len: 0.13, width: 0.02, rot: 0.2, mat: wetBloodMat });
  addBloodDrip(stump, { x: 0.0, y: -0.02, z: 0.07, len: 0.1, width: 0.018, mat: driedBloodMat });

  // embers — replace eyes entirely, sit low inside the wound cavity rather
  // than at "eye height" on a face that doesn't exist
  const leftEye = addMesh(stump, new THREE.SphereGeometry(0.014, 6, 6), eyeMaterial, -0.025, 0.03, 0.04, false);
  const rightEye = addMesh(stump, new THREE.SphereGeometry(0.014, 6, 6), eyeMaterial, 0.025, 0.03, 0.04, false);
  const eyeLight = new THREE.PointLight(0xff5a1a, 0.35, 1.4, 2);
  eyeLight.position.set(0, 0.04, 0.03);
  stump.add(eyeLight);

  // ============================================================
  // ARMS — thick, heavy, armored vambraces over corpse-grey skin.
  // Noticeably bulkier than before (per request), so he reads as a
  // brute who can actually swing that sword through a door.
  // ============================================================
  function buildArm(side) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 0.28, TORSO_H - 0.04, 0);
    torso.add(shoulder);
    // shoulder plate — bigger, to sit on top of the thicker upper arm
    addMesh(shoulder, new THREE.BoxGeometry(0.19, 0.13, 0.19), armorMat, sign * 0.02, 0.02, 0);

    const UPPER_LEN = 0.28;
    addMesh(shoulder, new THREE.CylinderGeometry(0.065, 0.055, UPPER_LEN, 6), skinMat, 0, -UPPER_LEN / 2, 0);
    // blood smeared down the bicep
    addBloodDrip(shoulder, { x: sign * 0.03, y: -UPPER_LEN * 0.55, z: 0.05, len: 0.14, width: 0.018, mat: driedBloodMat });

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -UPPER_LEN, 0);
    shoulder.add(forearmPivot);

    const LOWER_LEN = 0.26;
    addMesh(forearmPivot, new THREE.CylinderGeometry(0.055, 0.048, LOWER_LEN, 6), skinMat, 0, -LOWER_LEN / 2, 0);
    // armored vambrace wrap — thicker to match the bulked-up forearm
    addMesh(forearmPivot, new THREE.CylinderGeometry(0.064, 0.064, 0.11, 6), armorMat, 0, -LOWER_LEN + 0.17, 0);
    // blood dripping off the vambrace toward the hand
    addBloodDrip(forearmPivot, { x: 0.02, y: -LOWER_LEN + 0.06, z: 0.05, len: 0.09, width: 0.016, mat: wetBloodMat });

    const hand = new THREE.Group();
    hand.position.set(0, -LOWER_LEN, 0);
    forearmPivot.add(hand);
    addMesh(hand, new THREE.SphereGeometry(0.055, 6, 6), skinMat, 0, 0, 0);
    // blood-soaked knuckles
    addMesh(hand, new THREE.SphereGeometry(0.02, 5, 5), wetBloodMat, 0.02, -0.01, 0.03, false);

    return { shoulder, forearmPivot, hand };
  }

  const leftArm = buildArm("left");
  const rightArm = buildArm("right");

  // ---------- weapon: a heavy, notched, blood-caked khanda-style sword, socketed to the right hand ----------
  const weaponSocket = new THREE.Group();
  rightArm.hand.add(weaponSocket);
  weaponSocket.rotation.x = Math.PI / 2.3;

  // grip — wrapped, dark, stained where the hand grips it
  addMesh(weaponSocket, new THREE.CylinderGeometry(0.026, 0.026, 0.17, 6), hiltMat, 0, 0.085, 0); // grip
  addMesh(weaponSocket, new THREE.CylinderGeometry(0.03, 0.03, 0.03, 6), wetBloodMat, 0, 0.02, 0); // blood-caked base of the grip
  // crossguard — wider, with small spikes at each end
  addMesh(weaponSocket, new THREE.BoxGeometry(0.2, 0.024, 0.034), guardMat, 0, 0.175, 0);
  addMesh(weaponSocket, new THREE.ConeGeometry(0.018, 0.05, 5), guardMat, 0.1, 0.175, 0).rotation.z = -Math.PI / 2;
  addMesh(weaponSocket, new THREE.ConeGeometry(0.018, 0.05, 5), guardMat, -0.1, 0.175, 0).rotation.z = Math.PI / 2;
  addMesh(weaponSocket, new THREE.SphereGeometry(0.026, 6, 6), guardMat, 0, 0.0, 0); // pommel

  // blade — tapered via two stacked boxes, wider/longer and darker than before
  addMesh(weaponSocket, new THREE.BoxGeometry(0.065, 0.46, 0.014), bladeMat, 0, 0.42, 0);
  addMesh(weaponSocket, new THREE.BoxGeometry(0.038, 0.19, 0.011), bladeMat, 0, 0.72, 0);
  // dark fuller (blood groove) running down the center of the blade
  addMesh(weaponSocket, new THREE.BoxGeometry(0.012, 0.55, 0.004), driedBloodMat, 0, 0.4, 0.006);

  // serrated teeth along one edge, for a much nastier silhouette
  const toothCount = 7;
  for (let i = 0; i < toothCount; i++) {
    const ty = 0.24 + i * 0.065;
    const tooth = addMesh(weaponSocket, new THREE.ConeGeometry(0.014, 0.03, 3), bladeMat, 0.034, ty, 0);
    tooth.rotation.z = -Math.PI / 2;
    tooth.rotation.y = Math.PI / 6;
  }

  // notches/nicks along the other edge for wear
  addMesh(weaponSocket, new THREE.BoxGeometry(0.014, 0.022, 0.016), bladeMat, -0.024, 0.5, 0);
  addMesh(weaponSocket, new THREE.BoxGeometry(0.014, 0.022, 0.016), bladeMat, -0.024, 0.66, 0);
  addMesh(weaponSocket, new THREE.BoxGeometry(0.012, 0.018, 0.014), bladeMat, -0.02, 0.8, 0);

  // blood dripping down the blade and off the tip
  addBloodDrip(weaponSocket, { x: 0.012, y: 0.55, z: 0.01, len: 0.16, width: 0.014, mat: wetBloodMat, rot: 0.04 });
  addBloodDrip(weaponSocket, { x: -0.01, y: 0.32, z: 0.01, len: 0.1, width: 0.012, mat: driedBloodMat, rot: -0.03 });
  addMesh(weaponSocket, new THREE.SphereGeometry(0.012, 5, 5), wetBloodMat, 0.008, 0.9, 0.005, false); // pooling drop at the tip

  // ============================================================
  // LEGS — sturdy, thick, armored greaves over torn cloth, bare/sandaled
  // feet. Noticeably heavier stance than before (per request).
  // ============================================================
  function buildLeg(side) {
    const sign = side === "left" ? -1 : 1;
    const upperLeg = new THREE.Group();
    upperLeg.position.set(sign * 0.13, 0, 0);
    hips.add(upperLeg);

    const UPPER_LEN = 0.4;
    addMesh(upperLeg, new THREE.CylinderGeometry(0.085, 0.075, UPPER_LEN, 6), clothMat, 0, -UPPER_LEN / 2, 0);
    // dried blood smeared down the thigh
    addBloodDrip(upperLeg, { x: sign * 0.03, y: -UPPER_LEN * 0.6, z: 0.06, len: 0.16, width: 0.02, mat: driedBloodMat });

    const lowerLeg = new THREE.Group();
    lowerLeg.position.set(0, -UPPER_LEN, 0);
    upperLeg.add(lowerLeg);

    const LOWER_LEN = 0.38;
    addMesh(lowerLeg, new THREE.CylinderGeometry(0.065, 0.055, LOWER_LEN, 6), skinMat, 0, -LOWER_LEN / 2, 0);
    // greave plate over the shin — bulked up to match the thicker leg
    addMesh(lowerLeg, new THREE.BoxGeometry(0.095, 0.2, 0.065), armorMat, 0, -LOWER_LEN + 0.14, 0.03);
    addMesh(lowerLeg, new THREE.BoxGeometry(0.08, 0.045, 0.16), skinMat, 0, -LOWER_LEN - 0.015, 0.03); // bare foot
    // blood-crusted footprint smear across the top of the foot
    addMesh(lowerLeg, new THREE.BoxGeometry(0.06, 0.01, 0.1), driedBloodMat, 0, -LOWER_LEN + 0.005, 0.03, false);

    return { upperLeg, lowerLeg };
  }

  const leftLeg = buildLeg("left");
  const rightLeg = buildLeg("right");

  const parts = {
    hips,
    torso,
    hair: neckPivot, // repurposed sway pivot — see file header note
    head: stump,     // repurposed as the neck-wound stump — see file header note
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

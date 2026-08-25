// chudail.js — procedural model for the haveli's stalking presence.
//
// v5: HEADLESS SWORDSMAN. Broad, armored, corpse-pale warrior ending in a
// jagged neck wound instead of a head — no face at all, just the stump,
// with two faint embers glowing inside it in place of eyes. Carries a
// large sword in the right hand. Colors are deliberately muted/desaturated
// (ash, rust, oxidized bronze) with a grime canvas texture over the base
// color, specifically to avoid the flat, saturated, evenly-lit look that
// reads as "cartoon" rather than "horror" at low poly counts.
//
// Filename/export name (createChudailModel) kept the same as every prior
// version so nothing importing this (chudailenemy.js, room21.js) needs an
// import-path change.
//
// No skeleton/rig — "animation" means directly rotating the joint pivot
// Groups this function returns, every frame, from chudailenemy.js.
//
// `parts` keeps the exact same key shape as before. Two notes on how keys
// map onto this design:
//   - `hair` -> the neck-sway pivot (there's no hair; it's the stump's own
//     Group, so chudailenemy.js's existing sway animation still has
//     something sensible to rotate).
//   - `head` -> the stump/wound Group itself (no face geometry inside it).
//   - `leftEye`/`rightEye`/`eyeMaterial`/`eyeLight` -> repositioned INTO the
//     neck wound as two small embers, instead of sitting on a face.
//   - `weaponSocket` -> now holds an actual sword mesh (blade/guard/hilt),
//     not an empty attach point.

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

export function createChudailModel() {
  const group = new THREE.Group();
  group.name = "headlessSwordsman";

  // ---------- materials — muted, desaturated, NOT flat/saturated ----------
  const skinTex = makeGrimeTexture({ base: "#6b6258", blotchColor: "rgba(20,15,12,0.5)", seed: 4, blotches: 70 }); // ash-grey corpse skin
  const skinMat = new THREE.MeshStandardMaterial({ map: skinTex, roughness: 0.95 });

  const armorTex = makeGrimeTexture({ base: "#3a2f26", blotchColor: "rgba(10,8,6,0.5)", seed: 9, blotches: 55 }); // oxidized leather/bronze armor
  const armorMat = new THREE.MeshStandardMaterial({ map: armorTex, roughness: 0.85, metalness: 0.15 });

  const clothTex = makeGrimeTexture({ base: "#4a1c18", blotchColor: "rgba(10,4,3,0.55)", seed: 13, blotches: 55 }); // dried-blood rust dhoti
  const clothMat = new THREE.MeshStandardMaterial({ map: clothTex, roughness: 0.92, side: THREE.DoubleSide });

  const woundMat = new THREE.MeshStandardMaterial({ color: 0x1c0605, roughness: 0.9 }); // dark, wet-looking wound interior
  const boneMat = new THREE.MeshStandardMaterial({ color: 0x8a7d68, roughness: 0.7 }); // exposed vertebra stub

  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x6b6d68, roughness: 0.35, metalness: 0.75 }); // dulled, notched steel
  const hiltMat = new THREE.MeshStandardMaterial({ color: 0x2a2019, roughness: 0.8 });
  const guardMat = new THREE.MeshStandardMaterial({ color: 0x5c4a2a, roughness: 0.5, metalness: 0.5 });

  // embers glowing inside the neck wound — the only "face" this design has
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0.75 });

  function addMesh(parent, geo, mat, x = 0, y = 0, z = 0, castShadow = true) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    parent.add(mesh);
    return mesh;
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

  // ============================================================
  // NECK STUMP — where the head would be. Jagged, uneven, dark wound
  // interior with an exposed vertebra stub and two embers glowing within.
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
  // dark wound cavity
  addMesh(stump, new THREE.CylinderGeometry(0.07, 0.075, 0.08, 8), woundMat, 0, 0.04, 0);
  // exposed vertebra stub, just visible above the wound line
  addMesh(stump, new THREE.CylinderGeometry(0.018, 0.022, 0.05, 6), boneMat, 0, 0.09, 0);

  // embers — replace eyes entirely, sit low inside the wound cavity rather
  // than at "eye height" on a face that doesn't exist
  const leftEye = addMesh(stump, new THREE.SphereGeometry(0.014, 6, 6), eyeMaterial, -0.025, 0.03, 0.04, false);
  const rightEye = addMesh(stump, new THREE.SphereGeometry(0.014, 6, 6), eyeMaterial, 0.025, 0.03, 0.04, false);
  const eyeLight = new THREE.PointLight(0xff5a1a, 0.35, 1.4, 2);
  eyeLight.position.set(0, 0.04, 0.03);
  stump.add(eyeLight);

  // ============================================================
  // ARMS — thick, armored vambraces over corpse-grey skin.
  // ============================================================
  function buildArm(side) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 0.26, TORSO_H - 0.04, 0);
    torso.add(shoulder);
    // shoulder plate
    addMesh(shoulder, new THREE.BoxGeometry(0.14, 0.09, 0.14), armorMat, sign * 0.02, 0.02, 0);

    const UPPER_LEN = 0.28;
    addMesh(shoulder, new THREE.CylinderGeometry(0.045, 0.038, UPPER_LEN, 6), skinMat, 0, -UPPER_LEN / 2, 0);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -UPPER_LEN, 0);
    shoulder.add(forearmPivot);

    const LOWER_LEN = 0.26;
    addMesh(forearmPivot, new THREE.CylinderGeometry(0.038, 0.032, LOWER_LEN, 6), skinMat, 0, -LOWER_LEN / 2, 0);
    // armored vambrace wrap
    addMesh(forearmPivot, new THREE.CylinderGeometry(0.045, 0.045, 0.1, 6), armorMat, 0, -LOWER_LEN + 0.16, 0);

    const hand = new THREE.Group();
    hand.position.set(0, -LOWER_LEN, 0);
    forearmPivot.add(hand);
    addMesh(hand, new THREE.SphereGeometry(0.04, 6, 6), skinMat, 0, 0, 0);

    return { shoulder, forearmPivot, hand };
  }

  const leftArm = buildArm("left");
  const rightArm = buildArm("right");

  // ---------- weapon: a heavy straight sword (khanda-style), socketed to the right hand ----------
  const weaponSocket = new THREE.Group();
  rightArm.hand.add(weaponSocket);
  weaponSocket.rotation.x = Math.PI / 2.3;

  addMesh(weaponSocket, new THREE.CylinderGeometry(0.022, 0.022, 0.16, 6), hiltMat, 0, 0.08, 0); // grip
  addMesh(weaponSocket, new THREE.BoxGeometry(0.16, 0.02, 0.03), guardMat, 0, 0.17, 0); // crossguard
  addMesh(weaponSocket, new THREE.SphereGeometry(0.025, 6, 6), guardMat, 0, 0.0, 0); // pommel
  // blade — tapered via two stacked boxes, wider at the base, narrowing toward the tip
  addMesh(weaponSocket, new THREE.BoxGeometry(0.055, 0.42, 0.012), bladeMat, 0, 0.4, 0);
  addMesh(weaponSocket, new THREE.BoxGeometry(0.032, 0.16, 0.01), bladeMat, 0, 0.68, 0);
  // a couple of notches/nicks along the edge for wear
  addMesh(weaponSocket, new THREE.BoxGeometry(0.012, 0.02, 0.014), bladeMat, 0.02, 0.5, 0);
  addMesh(weaponSocket, new THREE.BoxGeometry(0.012, 0.02, 0.014), bladeMat, -0.02, 0.62, 0);

  // ============================================================
  // LEGS — sturdy, armored greaves over torn cloth, bare/sandaled feet.
  // ============================================================
  function buildLeg(side) {
    const sign = side === "left" ? -1 : 1;
    const upperLeg = new THREE.Group();
    upperLeg.position.set(sign * 0.11, 0, 0);
    hips.add(upperLeg);

    const UPPER_LEN = 0.4;
    addMesh(upperLeg, new THREE.CylinderGeometry(0.06, 0.05, UPPER_LEN, 6), clothMat, 0, -UPPER_LEN / 2, 0);

    const lowerLeg = new THREE.Group();
    lowerLeg.position.set(0, -UPPER_LEN, 0);
    upperLeg.add(lowerLeg);

    const LOWER_LEN = 0.38;
    addMesh(lowerLeg, new THREE.CylinderGeometry(0.044, 0.036, LOWER_LEN, 6), skinMat, 0, -LOWER_LEN / 2, 0);
    // greave plate over the shin
    addMesh(lowerLeg, new THREE.BoxGeometry(0.07, 0.18, 0.05), armorMat, 0, -LOWER_LEN + 0.14, 0.03);
    addMesh(lowerLeg, new THREE.BoxGeometry(0.06, 0.035, 0.14), skinMat, 0, -LOWER_LEN - 0.015, 0.03); // bare foot

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

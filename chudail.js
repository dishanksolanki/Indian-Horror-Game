// chudail.js — procedural model for the Chudail / Daayan enemy.
//
// Redesigned to match a reference turnaround: a weathered, hunched elderly
// woman — NOT a skeletal bone-spike monster (that was an earlier pass).
// Long disheveled grey hair falls forward around the face and shoulders,
// she wears a dark blouse under a tattered maroon/purple saree with a torn
// hem, layered necklaces and wrist bangles, and goes barefoot. Right hand
// grips a simple curved sickle — a plain blade + wooden handle, not the
// earlier bone-toothed rolling-pin hybrid.
//
// Built entirely from THREE.js primitives (BoxGeometry, CylinderGeometry,
// ConeGeometry, SphereGeometry, TorusGeometry) — no .glb/.gltf needed, same
// approach as the rest of this codebase's low-poly geometry (see room1.js's
// walls/beams).
//
// There is no skeleton/rig — "animation" means directly rotating the joint
// pivot Groups this function returns (leftUpperArm, rightForearm,
// leftUpperLeg, etc.) every frame from chudailEnemy.js, the same way a
// simple puppet is posed. Each pivot Group is positioned at the joint
// origin with its mesh offset so rotations pivot correctly at the joint.
//
// IMPORTANT: the shape of the returned `parts` object is unchanged from the
// previous version (same key names: hips, torso, hair, head, leftEye,
// rightEye, eyeLight, eyeMaterial, leftShoulder, leftUpperArm, leftForearm,
// leftHand, rightShoulder, rightUpperArm, rightForearm, rightHand,
// weaponSocket, leftUpperLeg, leftLowerLeg, rightUpperLeg, rightLowerLeg) —
// chudailEnemy.js's animation/attack-hitbox code references these directly
// and needs no changes for this redesign.
//
// Returns { group, parts } — `group` is the THREE.Object3D to add to the
// scene and move around; `parts` exposes every joint/material a behavior
// controller needs to reference.

import * as THREE from "three";

export function createChudailModel() {
  const group = new THREE.Group();
  group.name = "chudail";

  // ---------- materials ----------
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x8a6f5c, roughness: 1 }); // weathered, sun-worn skin
  const blouseMat = new THREE.MeshStandardMaterial({ color: 0x2b2e33, roughness: 0.95 }); // dark short-sleeve blouse
  const sareeMat = new THREE.MeshStandardMaterial({ color: 0x5c2430, roughness: 0.9, side: THREE.DoubleSide }); // maroon/wine
  const sareeUnderMat = new THREE.MeshStandardMaterial({ color: 0x3a3f52, roughness: 0.95, side: THREE.DoubleSide }); // dusty blue-grey underlayer at the hem
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x8c8a86, roughness: 1 }); // long grey hair
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xb8a06a, roughness: 0.5, metalness: 0.6 }); // bangles/necklace, tarnished gold/silver
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.8 }); // sickle handle
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x9aa0a3, roughness: 0.4, metalness: 0.7 }); // sickle blade
  // shared so chudailEnemy.js can pulse emissiveIntensity for the horror
  // "reveal" beat — kept subtle/near-off at rest (unlike the earlier design,
  // her eyes read as ordinary, sunken, and haunted at a glance, not
  // visibly glowing, and only brighten when she's actively hunting).
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1210,
    emissive: 0x8a0000,
    emissiveIntensity: 0.15,
    roughness: 0.5,
  });

  function addMesh(parent, geo, mat, x = 0, y = 0, z = 0, castShadow = true) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    parent.add(mesh);
    return mesh;
  }

  // ============================================================
  // HIPS (root of the puppet) — feet touch y=0, hips sit at hip height.
  // Slightly shorter/stooped than a standing adult to read as elderly.
  // ============================================================
  const HIP_Y = 0.86;
  const hips = new THREE.Group();
  hips.position.set(0, HIP_Y, 0);
  group.add(hips);

  addMesh(hips, new THREE.BoxGeometry(0.4, 0.2, 0.24), sareeMat, 0, 0, 0); // saree wrap at the hip

  // ============================================================
  // TORSO — a gentle forward hunch (rotation.x) is the single biggest cue
  // that reads "elderly" at a glance, so it's baked into the rest pose here
  // rather than only appearing during animation.
  // ============================================================
  const TORSO_H = 0.56;
  const torso = new THREE.Group();
  torso.position.set(0, 0.1, 0);
  torso.rotation.x = 0.14; // stooped forward
  hips.add(torso);

  addMesh(torso, new THREE.BoxGeometry(0.36, TORSO_H, 0.22), blouseMat, 0, TORSO_H / 2, 0); // dark blouse
  // saree draped diagonally across the torso and over one shoulder
  const sareeDrape = addMesh(
    torso,
    new THREE.CylinderGeometry(0.24, 0.3, TORSO_H + 0.15, 8, 1, true),
    sareeMat,
    0,
    TORSO_H / 2 + 0.02,
    0
  );
  sareeDrape.rotation.z = 0.05;
  // torn hem strips at the waist — irregular, uneven lengths, mixed maroon/dusty-blue
  const hemMats = [sareeMat, sareeUnderMat, sareeMat, sareeUnderMat, sareeMat];
  const hemOffsets = [-0.16, -0.08, 0, 0.08, 0.17];
  hemOffsets.forEach((ox, i) => {
    const len = 0.3 + ((i * 37) % 5) * 0.05; // varied, deterministic (no per-load randomness)
    const strip = addMesh(torso, new THREE.PlaneGeometry(0.1, len), hemMats[i], ox, -0.14 - len / 2, 0.1);
    strip.rotation.z = (i - 2) * 0.06;
  });

  // layered necklace — a few thin metal torus rings at the base of the neck
  for (let i = 0; i < 3; i++) {
    const ring = addMesh(
      torso,
      new THREE.TorusGeometry(0.09 - i * 0.012, 0.006, 6, 16, Math.PI * 1.3),
      metalMat,
      0,
      TORSO_H - 0.02 - i * 0.02,
      0.09
    );
    ring.rotation.x = Math.PI / 2 + 0.3;
  }

  // ============================================================
  // NECK + HEAD
  // ============================================================
  const neckHair = new THREE.Group(); // also carries the hair mass, used as the "hair" sway pivot
  neckHair.position.set(0, TORSO_H, 0);
  torso.add(neckHair);
  addMesh(neckHair, new THREE.CylinderGeometry(0.055, 0.06, 0.1, 6), skinMat, 0, 0.05, 0);

  const head = new THREE.Group();
  head.position.set(0, 0.16, 0);
  head.rotation.x = 0.1; // slight downward tilt, reinforces the hunch/wariness
  neckHair.add(head);
  addMesh(head, new THREE.BoxGeometry(0.2, 0.22, 0.2), skinMat, 0, 0, 0);
  // brow ridge / sunken cheek suggestion — a subtle darker band
  addMesh(head, new THREE.BoxGeometry(0.2, 0.03, 0.06), skinMat, 0, 0.04, 0.1);

  // eyes — set into the face, dark and sunken rather than overtly glowing
  // at rest (see eyeMaterial comment above); chudailEnemy.js still pulses
  // emissiveIntensity faster/brighter during PURSUE/ATTACK for the reveal.
  const leftEye = addMesh(head, new THREE.SphereGeometry(0.022, 8, 8), eyeMaterial, -0.05, 0.02, 0.1);
  const rightEye = addMesh(head, new THREE.SphereGeometry(0.022, 8, 8), eyeMaterial, 0.05, 0.02, 0.1);
  const eyeLight = new THREE.PointLight(0xaa1111, 0.12, 1.8, 2); // faint at rest, brightened procedurally when hunting
  eyeLight.position.set(0, 0.02, 0.08);
  head.add(eyeLight);

  // bindi
  addMesh(head, new THREE.CircleGeometry(0.012, 10), new THREE.MeshStandardMaterial({ color: 0x6a0000 }), 0, 0.075, 0.101);

  // long, disheveled grey hair — falls forward around the face as well as
  // down the back/shoulders (unlike the earlier back-only fan), matching
  // the reference: hair partially obscuring the face from the front.
  const hairStrandCount = 22;
  for (let i = 0; i < hairStrandCount; i++) {
    const angle = (i / hairStrandCount) * Math.PI * 2; // full ring around the head, front included
    const length = 0.42 + ((i * 53) % 7) * 0.05; // varied, deterministic
    const strand = addMesh(
      neckHair,
      new THREE.ConeGeometry(0.013, length, 4),
      hairMat,
      Math.sin(angle) * 0.1,
      0.22 - length / 2,
      Math.cos(angle) * 0.1
    );
    strand.rotation.x = Math.PI + 0.15;
    strand.rotation.z = Math.sin(angle) * 0.3;
  }

  // ============================================================
  // ARMS — shoulder pivot -> upper arm -> forearm pivot -> forearm -> hand.
  // Thin but fleshed (skin, not bare bone) with a wrist bangle on each side.
  // ============================================================
  function buildArm(side) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 0.21, TORSO_H - 0.04, 0);
    torso.add(shoulder);

    const UPPER_LEN = 0.26;
    addMesh(shoulder, new THREE.CylinderGeometry(0.032, 0.028, UPPER_LEN, 6), skinMat, 0, -UPPER_LEN / 2, 0);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -UPPER_LEN, 0);
    shoulder.add(forearmPivot);

    const LOWER_LEN = 0.24;
    addMesh(forearmPivot, new THREE.CylinderGeometry(0.028, 0.024, LOWER_LEN, 6), skinMat, 0, -LOWER_LEN / 2, 0);
    // wrist bangles
    const bangle = addMesh(forearmPivot, new THREE.TorusGeometry(0.032, 0.006, 6, 12), metalMat, 0, -LOWER_LEN + 0.03, 0);
    bangle.rotation.x = Math.PI / 2;

    const hand = new THREE.Group();
    hand.position.set(0, -LOWER_LEN, 0);
    forearmPivot.add(hand);
    addMesh(hand, new THREE.SphereGeometry(0.032, 6, 6), skinMat, 0, 0, 0);

    return { shoulder, forearmPivot, hand };
  }

  const leftArm = buildArm("left");
  const rightArm = buildArm("right");

  // ---------- weapon: a plain curved sickle, socketed to the right hand ----------
  const weaponSocket = new THREE.Group();
  rightArm.hand.add(weaponSocket);
  weaponSocket.rotation.x = Math.PI / 2.2; // angled forward/down, as if held loosely at the side

  // wooden handle
  addMesh(weaponSocket, new THREE.CylinderGeometry(0.02, 0.022, 0.22, 8), woodMat, 0, 0.11, 0);
  // curved blade — a partial torus arcing off the top of the handle
  const blade = addMesh(weaponSocket, new THREE.TorusGeometry(0.11, 0.014, 6, 12, Math.PI * 1.15), bladeMat, 0, 0.21, 0);
  blade.rotation.x = Math.PI / 2;
  blade.rotation.z = -0.4;

  // ============================================================
  // LEGS — hip pivot -> upper leg -> knee pivot -> lower leg. Bare feet.
  // ============================================================
  function buildLeg(side) {
    const sign = side === "left" ? -1 : 1;
    const upperLeg = new THREE.Group();
    upperLeg.position.set(sign * 0.09, 0, 0);
    hips.add(upperLeg);

    const UPPER_LEN = 0.38;
    addMesh(upperLeg, new THREE.CylinderGeometry(0.05, 0.04, UPPER_LEN, 6), sareeMat, 0, -UPPER_LEN / 2, 0); // saree hem covers the thigh

    const lowerLeg = new THREE.Group();
    lowerLeg.position.set(0, -UPPER_LEN, 0);
    upperLeg.add(lowerLeg);

    const LOWER_LEN = 0.38;
    addMesh(lowerLeg, new THREE.CylinderGeometry(0.036, 0.03, LOWER_LEN, 6), skinMat, 0, -LOWER_LEN / 2, 0); // bare shin
    addMesh(lowerLeg, new THREE.BoxGeometry(0.06, 0.035, 0.13), skinMat, 0, -LOWER_LEN - 0.015, 0.03); // bare foot

    return { upperLeg, lowerLeg };
  }

  const leftLeg = buildLeg("left");
  const rightLeg = buildLeg("right");

  const parts = {
    hips,
    torso,
    hair: neckHair,
    head,
    leftEye,
    rightEye,
    eyeLight,
    eyeMaterial,
    leftShoulder: leftArm.shoulder,
    leftUpperArm: leftArm.shoulder,   // rotate this Group to swing the whole left arm from the shoulder
    leftForearm: leftArm.forearmPivot,
    leftHand: leftArm.hand,
    rightShoulder: rightArm.shoulder,
    rightUpperArm: rightArm.shoulder, // rotate this Group to swing the whole right (weapon) arm from the shoulder
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

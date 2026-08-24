// chudail.js — procedural model for the Chudail / Daayan enemy.
//
// v3: pushed further toward horror, closer to a reference turnaround
// (weathered/hunched elderly woman, tattered maroon saree, sickle) than v2.
// Ceiling of this approach: it's still built from primitives, not a
// sculpted/textured mesh, so it will never match a rendered reference's
// surface fidelity (skin pores, individual hair strands, fabric weave) —
// that requires an actual .glb/.gltf model file. What CAN be pushed with
// code: silhouette/proportions (gaunt, crooked, asymmetric hunch), grime
// and mottling painted on with a generated canvas texture instead of flat
// color (see makeGrimeTexture below), sunken shadowed eye sockets with a
// faint emissive glow, clawed elongated fingers/toes, and denser matted
// hair partly obscuring the face.
//
// No skeleton/rig — "animation" means directly rotating the joint pivot
// Groups this function returns (leftUpperArm, rightForearm,
// leftUpperLeg, etc.) every frame from chudailEnemy.js.
//
// IMPORTANT: the shape of the returned `parts` object is unchanged from
// the previous version (same key names) — chudailEnemy.js's
// animation/attack-hitbox code references these directly and needs no
// changes for this redesign.
//
// Returns { group, parts } — `group` is the THREE.Object3D to add to the
// scene and move around; `parts` exposes every joint/material a behavior
// controller needs to reference.

import * as THREE from "three";

// ---------- procedural grime/mottling texture ----------
// Paints a base color plus irregular dark blotches and fine speckle onto a
// small canvas, so materials read as dirty/weathered/uneven instead of flat
// plastic color. Deterministic per call (seeded loop, no Math.random typo
// risk across reloads) — the goal is texture, not per-load randomness.
function makeGrimeTexture({ base, blotchColor, size = 128, blotches = 55, seed = 1 }) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // simple deterministic pseudo-random so the same seed always paints the
  // same pattern (avoids "looks different every page load" weirdness)
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
    ctx.globalAlpha = 0.12 + rand() * 0.32;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const speckleCount = Math.floor(size * size * 0.04);
  for (let i = 0; i < speckleCount; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.06)";
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createChudailModel() {
  const group = new THREE.Group();
  group.name = "chudail";

  // ---------- materials ----------
  const skinTex = makeGrimeTexture({ base: "#7d6353", blotchColor: "rgba(35,20,15,0.5)", seed: 3, blotches: 70 });
  const skinMat = new THREE.MeshStandardMaterial({ map: skinTex, roughness: 1 });

  const blouseMat = new THREE.MeshStandardMaterial({ color: 0x232527, roughness: 0.95 });

  const sareeTex = makeGrimeTexture({ base: "#511f2a", blotchColor: "rgba(10,5,8,0.45)", seed: 7, blotches: 60 });
  const sareeMat = new THREE.MeshStandardMaterial({ map: sareeTex, roughness: 0.92, side: THREE.DoubleSide });

  const sareeUnderTex = makeGrimeTexture({ base: "#33384a", blotchColor: "rgba(8,8,12,0.4)", seed: 11, blotches: 50 });
  const sareeUnderMat = new THREE.MeshStandardMaterial({ map: sareeUnderTex, roughness: 0.95, side: THREE.DoubleSide });

  const hairMat = new THREE.MeshStandardMaterial({ color: 0x716e69, roughness: 1 });
  const nailMat = new THREE.MeshStandardMaterial({ color: 0x1c1815, roughness: 0.6 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0xa88f5c, roughness: 0.55, metalness: 0.55 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2a19, roughness: 0.85 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x8d9295, roughness: 0.4, metalness: 0.7 });

  // shared so chudailEnemy.js can pulse emissiveIntensity for the horror
  // "reveal" — dark and sunken at rest, brightens when actively hunting.
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x0e0808,
    emissive: 0x990000,
    emissiveIntensity: 0.18,
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
  // HIPS (root) — feet touch y=0
  // ============================================================
  const HIP_Y = 0.85;
  const hips = new THREE.Group();
  hips.position.set(0, HIP_Y, 0);
  group.add(hips);
  addMesh(hips, new THREE.BoxGeometry(0.38, 0.19, 0.23), sareeMat, 0, 0, 0);

  // ============================================================
  // TORSO — a pronounced, slightly ASYMMETRIC hunch: forward stoop plus a
  // small sideways/rotational twist so the silhouette reads as crooked and
  // uncanny rather than a stiff, evenly-posed mannequin.
  // ============================================================
  const TORSO_H = 0.54;
  const torso = new THREE.Group();
  torso.position.set(0, 0.1, 0);
  torso.rotation.x = 0.22; // pronounced forward stoop
  torso.rotation.z = 0.05; // slight lean, breaks symmetry
  hips.add(torso);

  addMesh(torso, new THREE.BoxGeometry(0.34, TORSO_H, 0.2), blouseMat, 0, TORSO_H / 2, 0);
  const sareeDrape = addMesh(
    torso,
    new THREE.CylinderGeometry(0.22, 0.29, TORSO_H + 0.16, 8, 1, true),
    sareeMat,
    0,
    TORSO_H / 2 + 0.02,
    0
  );
  sareeDrape.rotation.z = 0.05;

  // torn, uneven hem strips
  const hemMats = [sareeMat, sareeUnderMat, sareeMat, sareeUnderMat, sareeMat, sareeUnderMat];
  const hemOffsets = [-0.17, -0.1, -0.03, 0.04, 0.11, 0.18];
  hemOffsets.forEach((ox, i) => {
    const len = 0.28 + ((i * 41) % 6) * 0.045;
    const strip = addMesh(torso, new THREE.PlaneGeometry(0.09, len), hemMats[i], ox, -0.13 - len / 2, 0.095);
    strip.rotation.z = (i - 2.5) * 0.05;
    strip.rotation.x = 0.05;
  });

  // layered necklace
  for (let i = 0; i < 3; i++) {
    const ring = addMesh(
      torso,
      new THREE.TorusGeometry(0.085 - i * 0.011, 0.005, 6, 16, Math.PI * 1.3),
      metalMat,
      0,
      TORSO_H - 0.02 - i * 0.018,
      0.085
    );
    ring.rotation.x = Math.PI / 2 + 0.3;
  }

  // ============================================================
  // NECK + HEAD — gaunt: hollow cheek panels, brow shadow, sunken eyes
  // ============================================================
  const neckHair = new THREE.Group();
  neckHair.position.set(0, TORSO_H, 0);
  torso.add(neckHair);
  addMesh(neckHair, new THREE.CylinderGeometry(0.05, 0.056, 0.09, 6), skinMat, 0, 0.045, 0);

  const head = new THREE.Group();
  head.position.set(0, 0.15, 0);
  head.rotation.x = 0.16; // downward tilt, reinforces hunch + wariness
  neckHair.add(head);

  addMesh(head, new THREE.BoxGeometry(0.18, 0.2, 0.19), skinMat, 0, 0, 0); // skull base
  // hollow cheeks — thin angled panels cut the silhouette in on each side
  const leftCheek = addMesh(head, new THREE.BoxGeometry(0.03, 0.09, 0.14), skinMat, -0.085, -0.02, 0.02);
  leftCheek.rotation.y = 0.35;
  const rightCheek = addMesh(head, new THREE.BoxGeometry(0.03, 0.09, 0.14), skinMat, 0.085, -0.02, 0.02);
  rightCheek.rotation.y = -0.35;
  // brow ridge, casts a small shadow over the eyes
  addMesh(head, new THREE.BoxGeometry(0.18, 0.025, 0.05), skinMat, 0, 0.055, 0.09);
  // sunken eye sockets — dark recessed boxes behind the eyes themselves
  addMesh(head, new THREE.BoxGeometry(0.13, 0.03, 0.02), new THREE.MeshStandardMaterial({ color: 0x120a08, roughness: 1 }), 0, 0.02, 0.095);
  // gaunt jaw, narrows toward the chin
  addMesh(head, new THREE.BoxGeometry(0.12, 0.06, 0.16), skinMat, 0, -0.11, 0.01);

  const leftEye = addMesh(head, new THREE.SphereGeometry(0.018, 8, 8), eyeMaterial, -0.045, 0.02, 0.095);
  const rightEye = addMesh(head, new THREE.SphereGeometry(0.018, 8, 8), eyeMaterial, 0.045, 0.02, 0.095);
  const eyeLight = new THREE.PointLight(0x990000, 0.15, 1.8, 2);
  eyeLight.position.set(0, 0.02, 0.07);
  head.add(eyeLight);

  addMesh(head, new THREE.CircleGeometry(0.011, 10), new THREE.MeshStandardMaterial({ color: 0x5a0000 }), 0, 0.07, 0.096);

  // long, dense, matted grey hair — full ring around the head so strands
  // fall forward across the face as well as down the back, with extra
  // clumping (paired strands at slightly offset angles) instead of an even
  // fan, to read as matted rather than combed.
  const hairStrandCount = 30;
  for (let i = 0; i < hairStrandCount; i++) {
    const angle = (i / hairStrandCount) * Math.PI * 2;
    const clump = (i % 3 === 0) ? 0.015 : 0; // occasional clumped offset
    const length = 0.4 + ((i * 53) % 9) * 0.05;
    const strand = addMesh(
      neckHair,
      new THREE.ConeGeometry(0.012, length, 4),
      hairMat,
      Math.sin(angle) * 0.09 + clump,
      0.2 - length / 2,
      Math.cos(angle) * 0.09
    );
    strand.rotation.x = Math.PI + 0.18;
    strand.rotation.z = Math.sin(angle * 1.7) * 0.35;
  }

  // ============================================================
  // ARMS — thin, sinewy, with elongated fingers and claw-like nails
  // ============================================================
  function buildArm(side) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 0.2, TORSO_H - 0.03, 0);
    // slight asymmetry: the weapon (right) arm sits a touch lower/forward,
    // as if habitually favoring the sickle side
    if (side === "right") shoulder.position.y -= 0.015;
    torso.add(shoulder);

    const UPPER_LEN = 0.25;
    addMesh(shoulder, new THREE.CylinderGeometry(0.03, 0.026, UPPER_LEN, 6), skinMat, 0, -UPPER_LEN / 2, 0);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -UPPER_LEN, 0);
    shoulder.add(forearmPivot);

    const LOWER_LEN = 0.23;
    addMesh(forearmPivot, new THREE.CylinderGeometry(0.026, 0.021, LOWER_LEN, 6), skinMat, 0, -LOWER_LEN / 2, 0);
    const bangle = addMesh(forearmPivot, new THREE.TorusGeometry(0.03, 0.0055, 6, 12), metalMat, 0, -LOWER_LEN + 0.03, 0);
    bangle.rotation.x = Math.PI / 2;

    const hand = new THREE.Group();
    hand.position.set(0, -LOWER_LEN, 0);
    forearmPivot.add(hand);
    addMesh(hand, new THREE.SphereGeometry(0.026, 6, 6), skinMat, 0, 0, 0);

    // elongated clawed fingers — a small fan of thin cones tipped dark, in
    // place of a plain sphere hand, for the gaunt/menacing read
    for (let f = -1; f <= 1; f++) {
      const finger = addMesh(hand, new THREE.CylinderGeometry(0.006, 0.005, 0.06, 4), skinMat, f * 0.014, -0.03, f * 0.006);
      finger.rotation.x = 0.3;
      addMesh(hand, new THREE.ConeGeometry(0.006, 0.025, 4), nailMat, f * 0.014, -0.06, f * 0.006 + 0.012).rotation.x = 0.3;
    }

    return { shoulder, forearmPivot, hand };
  }

  const leftArm = buildArm("left");
  const rightArm = buildArm("right");

  // ---------- weapon: curved sickle, socketed to the right hand ----------
  const weaponSocket = new THREE.Group();
  rightArm.hand.add(weaponSocket);
  weaponSocket.rotation.x = Math.PI / 2.2;

  addMesh(weaponSocket, new THREE.CylinderGeometry(0.019, 0.021, 0.21, 8), woodMat, 0, 0.105, 0);
  const blade = addMesh(weaponSocket, new THREE.TorusGeometry(0.1, 0.013, 6, 12, Math.PI * 1.15), bladeMat, 0, 0.2, 0);
  blade.rotation.x = Math.PI / 2;
  blade.rotation.z = -0.4;

  // ============================================================
  // LEGS — bare, with clawed toes
  // ============================================================
  function buildLeg(side) {
    const sign = side === "left" ? -1 : 1;
    const upperLeg = new THREE.Group();
    upperLeg.position.set(sign * 0.085, 0, 0);
    hips.add(upperLeg);

    const UPPER_LEN = 0.36;
    addMesh(upperLeg, new THREE.CylinderGeometry(0.048, 0.038, UPPER_LEN, 6), sareeMat, 0, -UPPER_LEN / 2, 0);

    const lowerLeg = new THREE.Group();
    lowerLeg.position.set(0, -UPPER_LEN, 0);
    upperLeg.add(lowerLeg);

    const LOWER_LEN = 0.36;
    addMesh(lowerLeg, new THREE.CylinderGeometry(0.034, 0.028, LOWER_LEN, 6), skinMat, 0, -LOWER_LEN / 2, 0);
    addMesh(lowerLeg, new THREE.BoxGeometry(0.058, 0.032, 0.12), skinMat, 0, -LOWER_LEN - 0.014, 0.028); // foot
    // clawed toes
    for (let t = -1; t <= 1; t++) {
      addMesh(lowerLeg, new THREE.ConeGeometry(0.008, 0.03, 4), nailMat, t * 0.016, -LOWER_LEN - 0.014, 0.08 + Math.abs(t) * -0.005)
        .rotation.x = 1.6;
    }

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

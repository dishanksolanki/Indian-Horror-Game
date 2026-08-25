// chudail.js — procedural model for the haveli's stalking presence.
//
// v4: switched concepts entirely, from a realistic elderly-woman design
// (which primitive geometry can't render convincingly up close — see the
// v2/v3 comments in git history) to a FACELESS SHADOW FIGURE. This plays
// to what low-poly/primitive geometry is actually good at: an unbroken
// dark silhouette with no surface detail needed at all, since there's
// nothing on her face to render badly. The horror comes from proportion
// (unnaturally tall, unnaturally long limbs) and absence (no face, just
// two faint points of light) rather than surface fidelity.
//
// NOTE ON NAMING: the exported function is still called createChudailModel
// and this file is still named chudail.js, purely so nothing importing it
// (chudailenemy.js, room21.js) needs an import-path change — you've
// already been through enough case-sensitivity 404 hunting on this
// project. Feel free to rename everything later once the design is
// settled; it's a pure find-and-replace at that point, not urgent now.
//
// No skeleton/rig — "animation" means directly rotating the joint pivot
// Groups this function returns, every frame, from chudailenemy.js.
//
// IMPORTANT: the shape of the returned `parts` object is unchanged from
// earlier versions (same key names: hips, torso, hair, head, leftEye,
// rightEye, eyeLight, eyeMaterial, leftShoulder, leftUpperArm, leftForearm,
// leftHand, rightShoulder, rightUpperArm, rightForearm, rightHand,
// weaponSocket, leftUpperLeg, leftLowerLeg, rightUpperLeg, rightLowerLeg),
// PLUS one new optional key: `wisps` (an array of Mesh) — chudailenemy.js
// checks for this and sways them slightly if present, but doesn't require
// it, so this file stays swappable with older/simpler models too.
// `weaponSocket` is kept as an empty attach point at the right hand (no
// weapon mesh) — she attacks bare-handed, but chudailenemy.js's hit-check
// still reads its world position, so the key must exist.
// `hair` is repurposed as the neck/head sway pivot (see NECK group below)
// — there's no literal hair on this design, but chudailenemy.js's idle/walk
// animation rotates parts.hair.rotation.z for a subtle sway, so the key
// needs to keep existing and pointing at *something* sensible to rotate.

import * as THREE from "three";

// ---------- soft radial-gradient alpha texture, used for the smoke/tendril wisps ----------
function makeWispTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(10,8,12,0.9)");
  grad.addColorStop(0.6, "rgba(10,8,12,0.35)");
  grad.addColorStop(1, "rgba(10,8,12,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export function createChudailModel() {
  const group = new THREE.Group();
  group.name = "shadowFigure";

  // ---------- materials ----------
  // Near-black but not pure #000, and NOT roughness 1 — a small amount of
  // gloss (roughness ~0.7) lets a flashlight catch a faint highlight across
  // her form, so she reads as a solid dark THING with volume rather than a
  // flat cutout silhouette. A whisper of cold emissive keeps her from
  // vanishing into pure black in very dark rooms.
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x050506,
    roughness: 0.7,
    metalness: 0.05,
    emissive: 0x0a0512,
    emissiveIntensity: 0.4,
  });
  const clawMat = new THREE.MeshStandardMaterial({ color: 0x020202, roughness: 0.5 });
  const wispTex = makeWispTexture();
  const wispMat = new THREE.MeshBasicMaterial({
    map: wispTex,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  // shared so chudailenemy.js can pulse emissiveIntensity — the only
  // visible "face" feature at all: two faint pale points of light, dim at
  // rest, brightening when she's actively hunting.
  const eyeMaterial = new THREE.MeshBasicMaterial({
    color: 0xe8e2d8,
    transparent: true,
    opacity: 0.55,
  });

  function addMesh(parent, geo, mat, x = 0, y = 0, z = 0, castShadow = true) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    parent.add(mesh);
    return mesh;
  }

  function addWisp(parent, x, y, z, w, h, rotY = 0) {
    const wisp = addMesh(parent, new THREE.PlaneGeometry(w, h), wispMat, x, y, z, false);
    wisp.rotation.y = rotY;
    return wisp;
  }
  const wisps = [];

  // ============================================================
  // HIPS (root) — feet touch y=0. Set noticeably taller than the earlier
  // elderly-woman design: unnatural height is doing real horror work here.
  // ============================================================
  const HIP_Y = 1.15;
  const hips = new THREE.Group();
  hips.position.set(0, HIP_Y, 0);
  group.add(hips);
  addMesh(hips, new THREE.BoxGeometry(0.3, 0.16, 0.18), bodyMat, 0, 0, 0);

  // ============================================================
  // TORSO — long, narrow, leaning forward from the waist as if reaching
  // toward the player rather than stooped with age. Predatory, not frail.
  // ============================================================
  const TORSO_H = 0.72;
  const torso = new THREE.Group();
  torso.position.set(0, 0.08, 0);
  torso.rotation.x = 0.12; // forward lean
  hips.add(torso);

  addMesh(torso, new THREE.BoxGeometry(0.26, TORSO_H, 0.16), bodyMat, 0, TORSO_H / 2, 0);
  // tattered edges trailing off the torso's silhouette — thin dark strips,
  // uneven lengths, reading as a figure that doesn't fully hold together
  const tornOffsets = [-0.11, -0.04, 0.04, 0.11];
  tornOffsets.forEach((ox, i) => {
    const len = 0.22 + ((i * 29) % 5) * 0.04;
    const strip = addMesh(torso, new THREE.PlaneGeometry(0.05, len), bodyMat, ox, -0.08 - len / 2, 0.06, false);
    strip.rotation.z = (i - 1.5) * 0.08;
  });

  // ============================================================
  // NECK — repurposed as the "hair"-key sway pivot for API compatibility
  // (see file header). Carries a couple of trailing wisp strips instead
  // of hair strands.
  // ============================================================
  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, TORSO_H, 0);
  torso.add(neckPivot);
  addMesh(neckPivot, new THREE.CylinderGeometry(0.045, 0.05, 0.14, 6), bodyMat, 0, 0.07, 0);
  wisps.push(addWisp(neckPivot, -0.08, -0.05, -0.03, 0.05, 0.3, 0.6));
  wisps.push(addWisp(neckPivot, 0.08, -0.05, -0.03, 0.05, 0.34, -0.6));

  // ============================================================
  // HEAD — deliberately featureless: a smooth, slightly elongated,
  // faceless block. No mouth, no nose, no brow — the absence IS the design.
  // ============================================================
  const head = new THREE.Group();
  head.position.set(0, 0.2, 0);
  head.rotation.x = 0.08;
  neckPivot.add(head);
  addMesh(head, new THREE.BoxGeometry(0.16, 0.24, 0.15), bodyMat, 0, 0, 0);
  // subtly narrower at the chin, elongating the silhouette further
  addMesh(head, new THREE.BoxGeometry(0.11, 0.06, 0.12), bodyMat, 0, -0.14, 0);

  // the only "face": two faint pale points, no other geometry around them
  const leftEye = addMesh(head, new THREE.SphereGeometry(0.014, 6, 6), eyeMaterial, -0.04, 0.02, 0.076, false);
  const rightEye = addMesh(head, new THREE.SphereGeometry(0.014, 6, 6), eyeMaterial, 0.04, 0.02, 0.076, false);
  const eyeLight = new THREE.PointLight(0xcfc8ba, 0.1, 1.6, 2); // very dim at rest
  eyeLight.position.set(0, 0.02, 0.06);
  head.add(eyeLight);

  // ============================================================
  // ARMS — unnaturally long: forearms reach past where a human knee would
  // be. Thin throughout, ending in a few clawed points rather than a hand.
  // ============================================================
  function buildArm(side) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 0.17, TORSO_H - 0.05, 0);
    torso.add(shoulder);

    const UPPER_LEN = 0.34;
    addMesh(shoulder, new THREE.CylinderGeometry(0.024, 0.02, UPPER_LEN, 6), bodyMat, 0, -UPPER_LEN / 2, 0);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -UPPER_LEN, 0);
    shoulder.add(forearmPivot);

    // forearm noticeably longer than the upper arm — the "wrong proportion"
    // horror cue, easy to read even at a glance/in silhouette
    const LOWER_LEN = 0.4;
    addMesh(forearmPivot, new THREE.CylinderGeometry(0.02, 0.015, LOWER_LEN, 6), bodyMat, 0, -LOWER_LEN / 2, 0);

    const hand = new THREE.Group();
    hand.position.set(0, -LOWER_LEN, 0);
    forearmPivot.add(hand);

    // no palm mesh at all — just three long thin claws fanning from the wrist
    for (let f = -1; f <= 1; f++) {
      const claw = addMesh(hand, new THREE.ConeGeometry(0.006, 0.11, 4), clawMat, f * 0.018, -0.05, f * 0.01);
      claw.rotation.x = 0.15;
    }

    return { shoulder, forearmPivot, hand };
  }

  const leftArm = buildArm("left");
  const rightArm = buildArm("right");

  // weaponSocket kept as an empty attach point at the right hand — no
  // weapon mesh (she attacks bare-clawed), but chudailenemy.js's attack
  // hit-check reads this Group's world position, so it must exist.
  const weaponSocket = new THREE.Group();
  rightArm.hand.add(weaponSocket);

  // ============================================================
  // LEGS — long, thin, digitigrade-ish stance (ankle set back) rather than
  // flat human feet, another small "not quite human" proportion cue.
  // ============================================================
  function buildLeg(side) {
    const sign = side === "left" ? -1 : 1;
    const upperLeg = new THREE.Group();
    upperLeg.position.set(sign * 0.07, 0, 0);
    hips.add(upperLeg);

    const UPPER_LEN = 0.46;
    addMesh(upperLeg, new THREE.CylinderGeometry(0.032, 0.026, UPPER_LEN, 6), bodyMat, 0, -UPPER_LEN / 2, 0);

    const lowerLeg = new THREE.Group();
    lowerLeg.position.set(0, -UPPER_LEN, 0);
    upperLeg.add(lowerLeg);

    const LOWER_LEN = 0.42;
    addMesh(lowerLeg, new THREE.CylinderGeometry(0.024, 0.018, LOWER_LEN, 6), bodyMat, 0, -LOWER_LEN / 2, 0);
    // narrow, backswept foot instead of a flat human sole
    addMesh(lowerLeg, new THREE.BoxGeometry(0.035, 0.03, 0.14), bodyMat, 0, -LOWER_LEN - 0.012, 0.04);

    return { upperLeg, lowerLeg };
  }

  const leftLeg = buildLeg("left");
  const rightLeg = buildLeg("right");

  // trailing wisps off the ankles, same idea as the neck/torso ones —
  // reinforces "not fully solid" at the extremities
  wisps.push(addWisp(leftLeg.lowerLeg, 0, -0.4, 0, 0.12, 0.3, 0.3));
  wisps.push(addWisp(rightLeg.lowerLeg, 0, -0.4, 0, 0.12, 0.3, -0.3));

  const parts = {
    hips,
    torso,
    hair: neckPivot, // repurposed sway pivot — see file header note
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
    wisps, // new, optional — see file header note
  };

  return { group, parts };
}

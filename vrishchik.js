// vrishchik.js — procedural model for the haveli's new stalking presence:
// VRISHCHIK ("scorpion"). A complete break from the last two designs —
// this one isn't humanoid at all. It's an animal/alien hybrid: a
// low, six-legged chitin-plated thorax like an insect or arachnid,
// carrying a hunched, half-fused torso and skull that reads as something
// that used to be organic and isn't anymore. No skin tones, no cloth, no
// warm colors anywhere — every material on this thing is built to be
// dark and swallow light rather than catch it.
//
// SIZE PASS: legs thickened/lengthened and the whole model scaled up
// (SIZE_SCALE below) so it reads as a genuinely large, looming presence
// rather than something knee-height — see the leg dimension constants
// and the group.scale.setScalar() call near the bottom.
//
// Palette intent (this is the "make it dark, not cartoonish" pass):
//   - Base chitin: near-black with a cold purple-black undertone
//     (#0a0710-ish), rough, almost no specular kick.
//   - Wet ichor: near-black red (#1a0306), only readable as "blood" up
//     close or under the flashlight.
//   - Bioluminescence: the ONLY saturated color anywhere on the model —
//     a sickly acid-green (#8fff5a family), used sparingly (vein lines,
//     eye cluster, stinger tip) so it reads as wrong/toxic rather than
//     decorative. Built from MeshBasicMaterial (self-lit, ignores scene
//     lighting) so it stays visible and unsettling even in near-total
//     darkness — the same trick used for the old models' eye glow, just
//     leaned on much harder here since it's now the model's only accent
//     color.
//
// Silhouette summary:
//   - Six segmented insect/arachnid legs (parts.legs, 3 per side) carry a
//     low thorax — there's no upright "standing" pose at all, it moves
//     close to the ground. Legs are now noticeably thick/heavy-looking
//     (see FEMUR/TIBIA dimensions) rather than spindly.
//   - A long, segmented tail arcs up and over the back scorpion-style,
//     ending in a stinger (parts.stingerTip — the attack hit-test point).
//   - A hunched, semi-fused torso/ribcage rides on the front of the
//     thorax, with two long arms ending in curved chitin pincers.
//   - The skull is elongated and non-human: hinged mandibles
//     (parts.jawPivot) and a cluster of small glowing eyes
//     (parts.eyeCluster) instead of anything resembling a face.
//
// Exported shape follows the same createXModel() -> { group, parts }
// contract as the previous two villains.

import * as THREE from "three";

// Overall model scale — bumped up so Vrishchik reads as large/looming.
// Everything below is authored at the original "normal" proportions;
// this single multiplier is applied to the root group at the very end,
// so all child-relative math (leg IK-ish chains, tail chain, etc.)
// stays correct regardless of this value.
const SIZE_SCALE = 1.55;

// ---------- texture helpers ----------
// Dark, plated chitin with faint darker cracks — deliberately low-contrast
// so it reads as "barely visible in shadow" rather than a bold pattern.
function makeChitinTexture({ base, plateColor, crackColor, size = 160, plates = 26, seed = 4 }) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  let s = seed * 9301 + 49297;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  for (let i = 0; i < plates; i++) {
    const cx = rand() * size, cy = rand() * size;
    const rx = 10 + rand() * 22, ry = 8 + rand() * 16;
    ctx.beginPath();
    ctx.fillStyle = plateColor;
    ctx.globalAlpha = 0.1 + rand() * 0.16;
    ctx.ellipse(cx, cy, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = crackColor;
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }

  // fine speckle, kept dark so nothing reads as "clean"
  ctx.globalAlpha = 1;
  const speckles = Math.floor(size * size * 0.025);
  for (let i = 0; i < speckles; i++) {
    const x = rand() * size, y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.02)";
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createVrishchikModel() {
  const group = new THREE.Group();
  group.name = "vrishchik";

  // ---------- materials ----------
  const chitinTex = makeChitinTexture({
    base: "#08060b", plateColor: "#120c18", crackColor: "rgba(0,0,0,0.6)", seed: 6,
  });
  const chitinMat = new THREE.MeshStandardMaterial({ map: chitinTex, roughness: 0.88, metalness: 0.12 });

  const chitinDarkMat = new THREE.MeshStandardMaterial({ color: 0x050308, roughness: 0.92, metalness: 0.08 });
  const jointMat = new THREE.MeshStandardMaterial({ color: 0x14101c, roughness: 0.75, metalness: 0.2 });
  const ichorMat = new THREE.MeshStandardMaterial({ color: 0x1a0306, roughness: 0.35, metalness: 0.05 });
  const clawMat = new THREE.MeshStandardMaterial({ color: 0x0c0a10, roughness: 0.4, metalness: 0.35 });

  // the only saturated color on the whole model — self-lit so it still
  // reads in near-total darkness
  const glowMat = new THREE.MeshBasicMaterial({ color: 0x8fff5a, transparent: true, opacity: 0.85 });
  const glowDimMat = new THREE.MeshBasicMaterial({ color: 0x6fdf46, transparent: true, opacity: 0.35 });

  function addMesh(parent, geo, mat, x = 0, y = 0, z = 0, castShadow = true) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    parent.add(mesh);
    return mesh;
  }

  function addVein(parent, { x, y, z, len = 0.06, rot = 0, tiltX = 0, width = 0.006, mat = glowMat }) {
    const v = addMesh(parent, new THREE.BoxGeometry(width, len, width * 0.6), mat, x, y, z, false);
    v.rotation.z = rot;
    v.rotation.x = tiltX;
    return v;
  }

  // ============================================================
  // THORAX (root) — the low central body the legs and tail hang off.
  // Sits much lower than either previous villain's hip height; this
  // thing does not stand upright.
  // ============================================================
  const THORAX_Y = 0.55;
  const thorax = new THREE.Group();
  thorax.position.set(0, THORAX_Y, 0);
  group.add(thorax);

  addMesh(thorax, new THREE.BoxGeometry(0.34, 0.24, 0.5), chitinMat, 0, 0, 0);
  addMesh(thorax, new THREE.BoxGeometry(0.3, 0.18, 0.44), chitinDarkMat, 0, -0.02, 0.02);
  // segmented plate ridges down the spine
  for (let i = 0; i < 5; i++) {
    addMesh(thorax, new THREE.BoxGeometry(0.2, 0.05, 0.07), chitinMat, 0, 0.14, -0.2 + i * 0.1);
  }
  addVein(thorax, { x: 0, y: 0.1, z: 0.1, len: 0.16, rot: 0, tiltX: Math.PI / 2 });
  addVein(thorax, { x: 0.08, y: 0.09, z: -0.05, len: 0.1, rot: 0.4, tiltX: Math.PI / 2, mat: glowDimMat });

  // ============================================================
  // LEGS — six segmented insect/arachnid legs, three per side. Each is
  // its own chain of pivot Groups (coxa -> femur -> tibia -> foot) so a
  // controller can drive an alternating tripod gait (legs 0/3/4 vs
  // 1/2/5, the standard hexapod pattern) rather than a walk cycle built
  // for a biped.
  //
  // SIZE PASS: femur/tibia are now noticeably thicker and longer, the
  // coxa joint sphere is bigger, and the attachment point on the thorax
  // is pushed further out (0.17 -> 0.21) to give a wider, heavier stance
  // that matches the thicker limbs instead of looking pinched-in.
  // ============================================================
  const LEG_ROWS = [-0.16, 0, 0.16]; // z offsets: front / mid / back pair
  const legs = [];

  LEG_ROWS.forEach((zOff, row) => {
    [-1, 1].forEach((sign) => {
      const coxa = new THREE.Group();
      coxa.position.set(sign * 0.21, 0.02, zOff);
      coxa.rotation.y = sign > 0 ? -0.3 : Math.PI + 0.3;
      thorax.add(coxa);
      addMesh(coxa, new THREE.SphereGeometry(0.055, 8, 8), jointMat, 0, 0, 0);

      const FEMUR_LEN = 0.42;
      const femur = new THREE.Group();
      femur.rotation.z = -0.9; // splays outward/down from the body
      coxa.add(femur);
      addMesh(femur, new THREE.CylinderGeometry(0.038, 0.028, FEMUR_LEN, 7), chitinMat, 0, -FEMUR_LEN / 2, 0);

      const tibia = new THREE.Group();
      tibia.position.set(0, -FEMUR_LEN, 0);
      tibia.rotation.z = 1.5; // knee bends back down toward the floor
      femur.add(tibia);
      const TIBIA_LEN = 0.48;
      addMesh(tibia, new THREE.CylinderGeometry(0.026, 0.013, TIBIA_LEN, 7), chitinDarkMat, 0, -TIBIA_LEN / 2, 0);

      const foot = new THREE.Group();
      foot.position.set(0, -TIBIA_LEN, 0);
      tibia.add(foot);
      addMesh(foot, new THREE.ConeGeometry(0.02, 0.08, 5), clawMat, 0, -0.04, 0).rotation.x = Math.PI;

      legs.push({ coxa, femur, tibia, foot, row, side: sign });
    });
  });

  // ============================================================
  // TAIL — segmented, arcs up and back over the thorax scorpion-style,
  // ending in a stinger. Same "each link is a pivot Group, base -> tip"
  // approach used for prior villains' trailing limbs, but curling
  // upward/forward instead of trailing down, so the tip ends up poised
  // above and ahead of the body rather than dragging behind it.
  // ============================================================
  const TAIL_SEGMENTS = 7;
  const tailSegments = [];

  const tailRoot = new THREE.Group();
  tailRoot.position.set(0, 0.05, 0.24);
  tailRoot.rotation.x = -0.3; // starts angling up immediately
  thorax.add(tailRoot);

  let tailParent = tailRoot;
  let tSegLen = 0.16;
  let tSegRadius = 0.045;
  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    const seg = new THREE.Group();
    seg.position.set(0, tSegLen * 0.0, 0);
    // progressive upward curl — later segments bend back further, so the
    // chain arcs up and forward rather than staying straight
    seg.rotation.x = -0.32 - i * 0.03;
    tailParent.add(seg);

    const nextRadius = tSegRadius * 0.82;
    addMesh(seg, new THREE.CylinderGeometry(tSegRadius, nextRadius, tSegLen, 7), chitinMat, 0, tSegLen / 2, 0);
    // armor ridge per segment
    addMesh(seg, new THREE.ConeGeometry(tSegRadius * 0.3, tSegRadius * 0.5, 4), chitinDarkMat, 0, tSegLen * 0.85, tSegRadius * 0.6);

    if (i === 2 || i === 5) {
      addVein(seg, { x: tSegRadius * 0.7, y: tSegLen * 0.5, z: 0, len: tSegLen * 0.6, rot: 0, tiltX: 0, mat: glowDimMat });
    }

    tailSegments.push(seg);
    // advance the chain from the END of this segment (top, since it
    // curls upward) rather than the base
    const nextGroup = new THREE.Group();
    nextGroup.position.set(0, tSegLen, 0);
    seg.add(nextGroup);
    tailParent = nextGroup;
    tSegLen *= 0.88;
    tSegRadius = nextRadius;
  }

  // stinger — the attack hit-test reference point
  const stinger = new THREE.Group();
  tailParent.add(stinger);
  addMesh(stinger, new THREE.ConeGeometry(0.03, 0.14, 6), clawMat, 0, 0.07, 0);
  const stingerGlow = addMesh(stinger, new THREE.SphereGeometry(0.018, 6, 6), glowMat, 0, 0.02, 0, false);
  const stingerTip = new THREE.Group();
  stingerTip.position.set(0, 0.14, 0);
  stinger.add(stingerTip);

  // ============================================================
  // TORSO — a hunched, half-fused chest riding on the front of the
  // thorax. Not humanoid proportion; short, wide, armored.
  // ============================================================
  const torso = new THREE.Group();
  torso.position.set(0, 0.16, -0.2);
  torso.rotation.x = -0.35; // hunched forward over the "head" end
  thorax.add(torso);

  addMesh(torso, new THREE.BoxGeometry(0.26, 0.28, 0.22), chitinMat, 0, 0.14, 0);
  addMesh(torso, new THREE.BoxGeometry(0.2, 0.22, 0.02), chitinDarkMat, 0, 0.14, 0.11);
  for (let i = 0; i < 4; i++) {
    addVein(torso, { x: -0.06 + (i % 2) * 0.12, y: 0.06 + i * 0.06, z: 0.115, len: 0.05, rot: 0.2, mat: i % 3 === 0 ? glowMat : glowDimMat });
  }
  addMesh(torso, new THREE.SphereGeometry(0.05, 6, 6), ichorMat, 0.09, 0.24, 0.08);

  // ============================================================
  // ARMS — long, ending in curved pincers instead of hands.
  // ============================================================
  function buildArm(side) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 0.14, 0.24, 0.02);
    torso.add(shoulder);
    addMesh(shoulder, new THREE.SphereGeometry(0.03, 6, 6), jointMat, 0, 0, 0);

    const UPPER_LEN = 0.22;
    shoulder.rotation.z = sign * 0.3;
    addMesh(shoulder, new THREE.CylinderGeometry(0.024, 0.02, UPPER_LEN, 7), chitinMat, 0, -UPPER_LEN / 2, 0);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -UPPER_LEN, 0);
    forearmPivot.rotation.x = 0.5;
    shoulder.add(forearmPivot);

    const LOWER_LEN = 0.2;
    addMesh(forearmPivot, new THREE.CylinderGeometry(0.02, 0.017, LOWER_LEN, 7), chitinDarkMat, 0, -LOWER_LEN / 2, 0);

    const clawPivot = new THREE.Group();
    clawPivot.position.set(0, -LOWER_LEN, 0);
    forearmPivot.add(clawPivot);

    // two hinged pincer halves that can open/close
    const upperClaw = new THREE.Group();
    upperClaw.rotation.z = sign * -0.15;
    clawPivot.add(upperClaw);
    addMesh(upperClaw, new THREE.ConeGeometry(0.024, 0.11, 5), clawMat, 0, -0.055, 0.012).rotation.x = Math.PI;

    const lowerClaw = new THREE.Group();
    lowerClaw.rotation.z = sign * 0.15;
    clawPivot.add(lowerClaw);
    addMesh(lowerClaw, new THREE.ConeGeometry(0.022, 0.1, 5), clawMat, 0, -0.05, -0.012).rotation.x = Math.PI;

    return { shoulder, forearmPivot, clawPivot, upperClaw, lowerClaw };
  }

  const leftArm = buildArm("left");
  const rightArm = buildArm("right");

  // ============================================================
  // HEAD — elongated, non-human. Hinged mandibles + a small cluster of
  // glowing eyes rather than any recognizable face.
  // ============================================================
  const neck = new THREE.Group();
  neck.position.set(0, 0.22, -0.08);
  neck.rotation.x = 0.2;
  torso.add(neck);
  addMesh(neck, new THREE.CylinderGeometry(0.045, 0.06, 0.1, 7), chitinDarkMat, 0, 0.05, 0);

  const head = new THREE.Group();
  head.position.set(0, 0.1, 0);
  neck.add(head);
  addMesh(head, new THREE.ConeGeometry(0.08, 0.24, 6), chitinMat, 0, 0.06, -0.06).rotation.x = Math.PI * 0.55;
  addMesh(head, new THREE.BoxGeometry(0.1, 0.08, 0.14), chitinDarkMat, 0, 0.02, 0.02);

  // eye cluster — small glowing pods, irregular placement rather than a
  // symmetrical pair, so it doesn't read as a "face"
  const eyeCluster = [];
  const eyeSpecs = [
    { x: -0.045, y: 0.04, z: 0.09, r: 0.012 },
    { x: -0.02, y: 0.055, z: 0.1, r: 0.009 },
    { x: 0.03, y: 0.045, z: 0.095, r: 0.011 },
    { x: 0.05, y: 0.02, z: 0.08, r: 0.008 },
    { x: 0.0, y: 0.06, z: 0.075, r: 0.007 },
  ];
  eyeSpecs.forEach((e) => {
    const pod = addMesh(head, new THREE.SphereGeometry(e.r, 6, 6), glowMat, e.x, e.y, e.z, false);
    eyeCluster.push(pod);
  });
  const eyeLight = new THREE.PointLight(0x8fff5a, 0.15, 1, 2.4);
  eyeLight.position.set(0, 0.045, 0.09);
  head.add(eyeLight);

  // hinged mandibles
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, 0, 0.09);
  head.add(jawPivot);
  [-1, 1].forEach((sign) => {
    const mandible = addMesh(jawPivot, new THREE.ConeGeometry(0.014, 0.09, 4), clawMat, sign * 0.02, -0.01, 0.03);
    mandible.rotation.x = Math.PI * 0.6;
    mandible.rotation.z = sign * 0.3;
  });

  // ---------- apply overall size scale ----------
  // Scaling the root group (rather than re-authoring every dimension
  // above) keeps every child-relative offset, pivot chain, and the
  // leg/tail IK-ish math all correct — it just makes the whole thing
  // bigger uniformly.
  group.scale.setScalar(SIZE_SCALE);

  const parts = {
    thorax,
    hips: thorax, // alias for engines/controllers that expect a generic root-ish key
    torso,
    head,
    neck,
    jawPivot,
    eyeCluster,
    eyeLight,
    leftShoulder: leftArm.shoulder,
    leftForearm: leftArm.forearmPivot,
    leftClaw: leftArm.clawPivot,
    leftClawUpper: leftArm.upperClaw,
    leftClawLower: leftArm.lowerClaw,
    rightShoulder: rightArm.shoulder,
    rightForearm: rightArm.forearmPivot,
    rightClaw: rightArm.clawPivot,
    rightClawUpper: rightArm.upperClaw,
    rightClawLower: rightArm.lowerClaw,
    legs,               // [{ coxa, femur, tibia, foot, row, side }, ...] — locomotion
    tailSegments,       // base -> tip, drives the scorpion-strike animation
    stingerTip,         // attack hit-test reference point
    stingerGlow,
  };

  return { group, parts };
}

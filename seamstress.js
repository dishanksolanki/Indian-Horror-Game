// seamstress.js — procedural model for the haveli's new stalking presence:
// THE SEAMSTRESS.
//
// Design intent: replace the naga-tailed "Stripped One" (chudail.js) with
// something that reads as wrong in a completely different register —
// not feral/monstrous, but *composed*. She looks like someone finished
// putting her together and never stopped. Her whole silhouette is built
// from thread, patch, and needle instead of claw and bone.
//
// Silhouette summary:
//   - No visible feet. A heavy, torn, layered skirt-mass drags the floor.
//   - Five long thread-tendrils trail from under the skirt like a spider's
//     drag-lines. They're her real limbs for locomotion/balance and can
//     lash independently (parts.tendrils, base -> tip, like a multi-tail).
//   - Torso is asymmetric: something is sewn onto her upper back (a small
//     second, mostly-hidden face — parts.backHump) that makes one shoulder
//     sit higher than the other.
//   - Arms end not in hands but in bundles of long needle-fingers. The
//     right arm's centre finger is oversized — the "signature needle" —
//     and is the attack hit-test point (parts.needleTip).
//   - Face is gaunt and blank: eyes stitched shut with a visible thread X
//     (parts.eyeStitches, can be driven to "strain"/glow when hunting) and
//     a stitched mouth (parts.jawPivot) that can tear open for a scream.
//
// Exported shape mirrors chudail.js's contract where it makes sense
// (createXModel() -> { group, parts }) so a drop-in swap in the scene/
// spawn code only needs an import and constructor-name change.

import * as THREE from "three";

// ---------- texture helpers ----------
function makeSkinTexture({ base, veinColor, blotchColor, size = 128, veins = 30, blotches = 26, seed = 1 }) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  let s = seed * 9301 + 49297;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  for (let i = 0; i < blotches; i++) {
    const x = rand() * size, y = rand() * size, r = 2 + rand() * 8;
    ctx.beginPath();
    ctx.fillStyle = blotchColor;
    ctx.globalAlpha = 0.08 + rand() * 0.16;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 0.3;
  for (let i = 0; i < veins; i++) {
    let x = rand() * size, y = rand() * size;
    ctx.strokeStyle = veinColor;
    ctx.lineWidth = 0.5 + rand() * 1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 3 + Math.floor(rand() * 3);
    for (let j = 0; j < segs; j++) {
      x += (rand() - 0.5) * 14;
      y += (rand() - 0.5) * 14;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
  const speckleCount = Math.floor(size * size * 0.02);
  for (let i = 0; i < speckleCount; i++) {
    const x = rand() * size, y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.05)";
    ctx.fillRect(x, y, 1, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Patched, mismatched cloth — many rectangular patches at slightly
// different tones with visible stitch-line borders, like the dress was
// rebuilt from a dozen other garments.
function makePatchTexture({ base, patchColors, stitchColor, size = 160, patches = 22, seed = 3 }) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  let s = seed * 9301 + 49297;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };

  for (let i = 0; i < patches; i++) {
    const w = 14 + rand() * 34, h = 14 + rand() * 34;
    const x = rand() * (size - w), y = rand() * (size - h);
    ctx.fillStyle = patchColors[Math.floor(rand() * patchColors.length)];
    ctx.globalAlpha = 0.55 + rand() * 0.35;
    ctx.fillRect(x, y, w, h);

    // stitch border, dashed
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = stitchColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.setLineDash([]);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createSeamstressModel() {
  const group = new THREE.Group();
  group.name = "theSeamstress";

  // ---------- materials ----------
  const skinTex = makeSkinTexture({
    base: "#d9cfc2", veinColor: "rgba(70,10,10,0.35)", blotchColor: "rgba(30,10,10,0.4)", seed: 9,
  });
  const skinMat = new THREE.MeshStandardMaterial({ map: skinTex, roughness: 0.9, metalness: 0 });

  const patchTex = makePatchTexture({
    base: "#0c0a10",
    patchColors: ["#1a1420", "#241016", "#160f18", "#20161c", "#0f0c14"],
    stitchColor: "rgba(150,20,20,0.5)",
    seed: 17,
  });
  const clothMat = new THREE.MeshStandardMaterial({ map: patchTex, roughness: 0.95, side: THREE.DoubleSide });

  const threadMat = new THREE.MeshStandardMaterial({ color: 0x7a0e12, roughness: 0.35, metalness: 0.15 });
  const stitchMat = new THREE.MeshStandardMaterial({ color: 0x0a0608, roughness: 0.7 });
  const needleMat = new THREE.MeshStandardMaterial({ color: 0x9c9488, roughness: 0.25, metalness: 0.75 });
  const woundMat = new THREE.MeshStandardMaterial({ color: 0x1a0507, roughness: 0.9 });

  const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0x8c1014, transparent: true, opacity: 0.0 });

  function addMesh(parent, geo, mat, x = 0, y = 0, z = 0, castShadow = true) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    parent.add(mesh);
    return mesh;
  }

  // A short thread stitch: a thin bent capsule-ish box used both for
  // decorative seams and for the eye/mouth stitch marks.
  function addStitch(parent, { x, y, z, len = 0.05, rot = 0, tiltX = 0, mat = threadMat, width = 0.006 }) {
    const st = addMesh(parent, new THREE.BoxGeometry(width, len, width), mat, x, y, z, false);
    st.rotation.z = rot;
    st.rotation.x = tiltX;
    return st;
  }

  function addNeedle(parent, { x, y, z, len = 0.09, radius = 0.008, rot = 0, rotZ = 0 }) {
    const n = addMesh(parent, new THREE.ConeGeometry(radius, len, 5), needleMat, x, y, z);
    n.rotation.x = rot;
    n.rotation.z = rotZ;
    return n;
  }

  // ============================================================
  // HIPS (root) — the join between the torso and the trailing skirt-mass /
  // tendrils. Everything above sits on this, same convention as before.
  // ============================================================
  const HIP_Y = 1.05;
  const hips = new THREE.Group();
  hips.position.set(0, HIP_Y, 0);
  group.add(hips);
  addMesh(hips, new THREE.BoxGeometry(0.28, 0.14, 0.18), clothMat, 0, 0, 0);

  // ============================================================
  // SKIRT — a heavy, torn, layered bell of cloth instead of legs. No feet
  // are ever visible; it just drags. Built from several stacked, slightly
  // offset cone/torus rings so the torn hem reads as uneven rather than a
  // clean cone.
  // ============================================================
  const skirt = new THREE.Group();
  skirt.position.set(0, -0.02, 0);
  hips.add(skirt);

  const skirtRings = [
    { y: -0.05, r1: 0.22, r2: 0.3, h: 0.22 },
    { y: -0.24, r1: 0.3, r2: 0.42, h: 0.26 },
    { y: -0.46, r1: 0.42, r2: 0.58, h: 0.3 },
    { y: -0.72, r1: 0.58, r2: 0.74, h: 0.34 },
  ];
  skirtRings.forEach((r, i) => {
    addMesh(skirt, new THREE.CylinderGeometry(r.r1, r.r2, r.h, 10, 1, true), clothMat, 0, r.y, 0);
    // torn hem ring — a jagged torus at the bottom edge of each layer
    const hem = addMesh(skirt, new THREE.TorusGeometry(r.r2 * 0.98, 0.02, 4, 10), stitchMat, 0, r.y - r.h / 2, 0);
    hem.rotation.x = Math.PI / 2;
    // a few trailing tatters per ring
    for (let t = 0; t < 3; t++) {
      const a = (t / 3) * Math.PI * 2 + i * 0.7;
      const tatterLen = 0.12 + ((t + i * 3) % 4) * 0.04;
      const tatter = addMesh(
        skirt,
        new THREE.PlaneGeometry(0.09, tatterLen),
        clothMat,
        Math.cos(a) * r.r2 * 0.9,
        r.y - r.h / 2 - tatterLen / 2,
        Math.sin(a) * r.r2 * 0.9
      );
      tatter.rotation.y = -a;
    }
  });

  // ============================================================
  // TORSO — asymmetric hunch. Rests on the hips, patched cloth over a
  // gaunt frame, with a visible centre seam of coarse cross-stitching
  // running the full length like the body itself was closed up the
  // middle.
  // ============================================================
  const TORSO_H = 0.5;
  const torso = new THREE.Group();
  torso.position.set(0, 0.05, 0);
  torso.rotation.x = 0.1;
  torso.rotation.z = 0.06; // one shoulder rides higher — asymmetric hunch
  hips.add(torso);

  addMesh(torso, new THREE.BoxGeometry(0.3, TORSO_H, 0.16), clothMat, 0, TORSO_H / 2, 0);
  addMesh(torso, new THREE.BoxGeometry(0.26, TORSO_H * 0.9, 0.02), skinMat, 0, TORSO_H / 2, 0.081); // sliver of throat/chest skin at collar

  // centre seam — coarse cross-stitches climbing the sternum
  for (let i = 0; i < 9; i++) {
    const y = 0.05 + i * (TORSO_H - 0.1) / 8;
    addStitch(torso, { x: 0, y, z: 0.09, len: 0.05, rot: i % 2 === 0 ? 0.5 : -0.5, mat: threadMat, width: 0.008 });
  }

  // ============================================================
  // BACK HUMP — a second, smaller, mostly-hidden face sewn onto her upper
  // back, the reason for the asymmetric hunch. Faces backward by default;
  // occasionally the whole hump can be driven to twitch toward whoever is
  // behind her. Deliberately small and easy to miss at a glance.
  // ============================================================
  const backHump = new THREE.Group();
  backHump.position.set(-0.02, TORSO_H * 0.78, -0.1);
  backHump.rotation.set(0.3, Math.PI, 0.1);
  torso.add(backHump);
  addMesh(backHump, new THREE.SphereGeometry(0.09, 8, 8), skinMat, 0, 0, 0);
  const backEyeStitchL = addStitch(backHump, { x: -0.03, y: 0.01, z: 0.08, len: 0.035, rot: 0.7 });
  const backEyeStitchR = addStitch(backHump, { x: -0.03, y: 0.01, z: 0.08, len: 0.035, rot: -0.7 });
  const backMouthStitches = [];
  for (let i = 0; i < 3; i++) {
    backMouthStitches.push(addStitch(backHump, { x: -0.02 + i * 0.02, y: -0.04, z: 0.085, len: 0.025, rot: 0.3 }));
  }

  // ============================================================
  // NECK + HEAD
  // ============================================================
  const neckPivot = new THREE.Group(); // sway pivot, analogous to old "hair" key
  neckPivot.position.set(0, TORSO_H, 0);
  neckPivot.rotation.x = -0.12;
  torso.add(neckPivot);

  const NECK_LEN = 0.14;
  addMesh(neckPivot, new THREE.CylinderGeometry(0.045, 0.055, NECK_LEN, 8), skinMat, 0, NECK_LEN / 2, 0);
  // a thread collar cinched tight around the throat
  const collar = addMesh(neckPivot, new THREE.TorusGeometry(0.05, 0.008, 5, 10), threadMat, 0, NECK_LEN * 0.9, 0);
  collar.rotation.x = Math.PI / 2;

  const head = new THREE.Group();
  head.position.set(0, NECK_LEN, 0);
  neckPivot.add(head);

  addMesh(head, new THREE.BoxGeometry(0.16, 0.2, 0.17), skinMat, 0, 0.1, 0);
  addMesh(head, new THREE.BoxGeometry(0.13, 0.05, 0.14), skinMat, 0, 0.02, 0.02); // jaw base (static, the mouth stitch sits over this)

  // ---------- eyes: stitched shut with a visible thread X, can be driven
  // to a faint glow (eyeGlowMat opacity) when hunting/frozen-staring ----------
  const eyeSockets = [];
  [-0.045, 0.045].forEach((ex) => {
    const socket = new THREE.Group();
    socket.position.set(ex, 0.13, 0.075);
    head.add(socket);
    addMesh(socket, new THREE.SphereGeometry(0.018, 6, 6), woundMat, 0, 0, 0, false);
    const glow = addMesh(socket, new THREE.SphereGeometry(0.014, 6, 6), eyeGlowMat, 0, 0, 0.004, false);
    const s1 = addStitch(socket, { x: 0, y: 0, z: 0.01, len: 0.032, rot: 0.7, width: 0.005 });
    const s2 = addStitch(socket, { x: 0, y: 0, z: 0.011, len: 0.032, rot: -0.7, width: 0.005 });
    eyeSockets.push({ socket, glow, stitches: [s1, s2] });
  });

  // ---------- mouth: stitched shut, can be driven open (a jawPivot that
  // "tears" the stitches apart rather than hinging cleanly) ----------
  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, 0.05, 0.08);
  head.add(jawPivot);
  const mouthStitches = [];
  for (let i = 0; i < 5; i++) {
    const x = -0.045 + i * 0.0225;
    mouthStitches.push(addStitch(jawPivot, { x, y: 0, z: 0.006, len: 0.03, rot: i % 2 === 0 ? 0.6 : -0.6, width: 0.006 }));
  }
  addMesh(jawPivot, new THREE.BoxGeometry(0.1, 0.012, 0.02), woundMat, 0, -0.01, 0.004, false);

  // long, straight hair pulled tight and pinned — a few needle "pins"
  // through the scalp rather than loose strands
  addMesh(head, new THREE.CylinderGeometry(0.085, 0.09, 0.06, 8), stitchMat, 0, 0.2, -0.01);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    addNeedle(head, { x: Math.cos(a) * 0.06, y: 0.22, z: Math.sin(a) * 0.06 - 0.01, len: 0.1, radius: 0.005, rot: -0.3 });
  }

  // ============================================================
  // ARMS — long, thin, ending in needle-finger bundles instead of hands.
  // Right hand carries the oversized "signature needle" used for the
  // attack hit-test.
  // ============================================================
  function buildArm(side, { primary = false } = {}) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 0.17, TORSO_H - 0.02, 0);
    torso.add(shoulder);
    addMesh(shoulder, new THREE.SphereGeometry(0.035, 6, 6), skinMat, 0, 0, 0);

    const UPPER_LEN = 0.32;
    addMesh(shoulder, new THREE.CylinderGeometry(0.026, 0.022, UPPER_LEN, 8), skinMat, 0, -UPPER_LEN / 2, 0);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -UPPER_LEN, 0);
    forearmPivot.rotation.x = 0.15;
    shoulder.add(forearmPivot);

    const LOWER_LEN = 0.3;
    addMesh(forearmPivot, new THREE.CylinderGeometry(0.02, 0.016, LOWER_LEN, 8), skinMat, 0, -LOWER_LEN / 2, 0);
    // a spool of thread wound around the forearm
    const spool = addMesh(forearmPivot, new THREE.TorusGeometry(0.024, 0.012, 5, 10), threadMat, 0, -LOWER_LEN * 0.55, 0);
    spool.rotation.x = Math.PI / 2;

    const hand = new THREE.Group();
    hand.position.set(0, -LOWER_LEN, 0);
    forearmPivot.add(hand);
    addMesh(hand, new THREE.SphereGeometry(0.02, 6, 6), skinMat, 0, 0, 0);

    let signatureTip = null;
    const fingerCount = 5;
    for (let i = 0; i < fingerCount; i++) {
      const t = (i - (fingerCount - 1) / 2) / fingerCount;
      const isCenter = primary && i === Math.floor(fingerCount / 2);
      const len = isCenter ? 0.22 : 0.09 + Math.abs(t) * 0.02;
      const radius = isCenter ? 0.012 : 0.007;
      const finger = addNeedle(hand, { x: t * 0.045, y: -len * 0.5, z: 0.012, len, radius, rot: Math.PI });
      if (isCenter) {
        const tip = new THREE.Group();
        tip.position.set(0, -len, 0);
        finger.add(tip);
        signatureTip = tip;
      }
    }

    return { shoulder, forearmPivot, hand, signatureTip };
  }

  const leftArm = buildArm("left");
  const rightArm = buildArm("right", { primary: true });
  const needleTip = rightArm.signatureTip;

  // ============================================================
  // TENDRILS — five long, segmented thread-limbs trailing from beneath
  // the skirt. These are her real means of locomotion/balance (there are
  // no legs/feet to animate) and can independently lash toward a target.
  // Each tendril is its own chain of pivot Groups, base -> tip, the same
  // "each link only rotates, never repositions on its own axis" approach
  // used for the old tail, so a controller can drive a travelling wave
  // per-tendril.
  // ============================================================
  const TENDRIL_COUNT = 5;
  const TENDRIL_SEGMENTS = 6;
  const tendrils = [];

  for (let t = 0; t < TENDRIL_COUNT; t++) {
    const angle = (t / TENDRIL_COUNT) * Math.PI * 2;
    const root = new THREE.Group();
    root.position.set(Math.cos(angle) * 0.3, -0.86, Math.sin(angle) * 0.3);
    // fan the roots outward and mostly down, so tendrils trail behind/
    // around the skirt hem rather than straight beneath it
    root.rotation.set(1.3 + Math.sin(angle) * 0.15, angle, 0);
    skirt.add(root);

    const segs = [];
    let parent = root;
    let segLen = 0.22;
    let segRadius = 0.02;
    for (let i = 0; i < TENDRIL_SEGMENTS; i++) {
      const seg = new THREE.Group();
      seg.position.set(0, -segLen, 0);
      seg.rotation.x = 0.04;
      parent.add(seg);
      const nextRadius = segRadius * 0.8;
      addMesh(seg, new THREE.CylinderGeometry(segRadius, nextRadius, segLen, 6), threadMat, 0, -segLen / 2, 0);
      segs.push(seg);
      parent = seg;
      segLen *= 0.94;
      segRadius = nextRadius;
    }
    // a small hooked needle-barb at the very tip of each tendril
    addNeedle(parent, { x: 0, y: -segLen * 0.6, z: 0, len: 0.05, radius: 0.006, rot: Math.PI });

    tendrils.push({ root, segments: segs });
  }

  const parts = {
    hips,
    torso,
    hair: neckPivot,
    head,
    jawPivot,
    mouthStitches,
    eyeSockets,          // [{ socket, glow, stitches: [s1, s2] }, ...]
    backHump,
    backEyeStitches: [backEyeStitchL, backEyeStitchR],
    backMouthStitches,
    leftShoulder: leftArm.shoulder,
    leftUpperArm: leftArm.shoulder,
    leftForearm: leftArm.forearmPivot,
    leftHand: leftArm.hand,
    rightShoulder: rightArm.shoulder,
    rightUpperArm: rightArm.shoulder,
    rightForearm: rightArm.forearmPivot,
    rightHand: rightArm.hand,
    needleTip,            // attack hit-test reference point (signature needle tip)
    skirt,
    tendrils,              // [{ root, segments: [seg0..segN] }, ...] — locomotion limbs
  };

  return { group, parts };
}

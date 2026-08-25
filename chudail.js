// chudail.js — procedural model for the haveli's stalking presence.
//
// v12: TAIL SCALE-UP. The v11 naga tail read as too thin/short next to the
// now-massive arms. Per-segment radius is up 5x (0.09 -> 0.45, within the
// requested 4-6x range) and per-segment length is up 4x (0.26 -> 1.04),
// with the tip barb cluster scaled to match so it doesn't look like a
// tiny accessory stuck on a huge tail. Segment count (9) and taper ratio
// are unchanged — the whole tail just got proportionally bigger.
//
// v11: NAGA REWORK. Big structural pass, four changes:
//   1. STANDS STRAIGHT — the hard forward hunch is gone. torso.rotation.x
//      goes from 0.32 down to a barely-there 0.04, and the neck's opposing
//      bends were softened to match (still visibly wrong, just not
//      doubled-over anymore). This changes silhouette a lot, so the ribs/
//      spine/blood-drip placements on the torso were re-checked against
//      the new upright pose rather than left at their old hunched offsets.
//   2. ARMS 4x THICKER — buildArm() now takes a `thicknessScale` separate
//      from its existing length `scale`, so radius and length can be tuned
//      independently. Main arms use thicknessScale=4; the extra arm pair
//      stays close to its old proportions (thicknessScale=1.3) so it still
//      reads as "smaller/secondary" next to the now much heavier main arms.
//   3. HELD WEAPON — a real gripped weapon (a heavy, crude cleaver, wrapped
//      grip included) now sits IN the right hand via addHeldWeapon(), on
//      top of the existing forearm bone-blade. `parts.weaponTip` is the new
//      attack-hit reference point (the cleaver's tip), replacing
//      `weaponSocket` for hit-testing in chudailenemy.js — see that file's
//      matching update.
//   4. SNAKE LOWER BODY — buildLeg()/the leg pair are gone entirely.
//      buildTail() replaces both legs with one long, tapering, segmented
//      naga tail hanging/coiling from the hips. `parts.tailSegments` is a
//      new array (base -> tip) for chudailenemy.js to animate as a
//      traveling side-to-side wave (slither) instead of a walk cycle.
//      `parts.leftUpperLeg` etc. no longer exist — anything in
//      chudailenemy.js keyed off legs was rewritten to use the tail.
//   5. HEAD COUNT — back down to exactly 3 heads total (1 main + 2
//      secondary), undoing the third secondary head added in v10, per
//      request. `parts.extraHeads` is length 2 again.
//
// ---- prior history (condensed) ----
// v10: added a 3rd secondary head + an active wet-blood drip system
//      (`parts.drips`) driven by chudailenemy.js's animateDrips().
// v9:  multi-headed/multi-armed — big deformed main skull w/ hinged jaw +
//      3 eye sockets, 2 secondary heads, a 2nd smaller arm pair.
// v8:  palette pushed near-black on purpose; paired with erratic
//      stalk/lunge behavior in chudailenemy.js.
// v7:  COMPLETE REDESIGN — "THE STRIPPED ONE": gaunt wrong-jointed
//      humanoid, backward digitigrade legs, bone blade erupting from the
//      right forearm instead of a held weapon, faceless neck wound.
//
// Filename/export name (createChudailModel) kept the same so nothing
// importing this (chudailenemy.js, room21.js) needs an import-path change.
// `parts` keeps mostly the same key shape used by chudailenemy.js, with
// the leg keys removed and tail/weapon keys added — see the `parts`
// object at the bottom for the authoritative current shape.

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

  for (let i = 0; i < blotches; i++) {
    const x = rand() * size, y = rand() * size, r = 2 + rand() * 10;
    ctx.beginPath();
    ctx.fillStyle = blotchColor;
    ctx.globalAlpha = 0.12 + rand() * 0.25;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

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

// v11: scale banding for the tail — dark base with faint lighter belly
// scutes down the underside, so it doesn't just look like a smooth cone.
function makeScaleTexture({ base, scaleColor, bellyColor, seed = 7, size = 128, rows = 14 }) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  let s = seed * 9301 + 49297;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const rowH = size / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    const cols = 6 + Math.floor(rand() * 3);
    const colW = size / cols;
    for (let c = 0; c < cols; c++) {
      const x = c * colW + (r % 2 ? colW / 2 : 0);
      ctx.beginPath();
      ctx.fillStyle = scaleColor;
      ctx.globalAlpha = 0.15 + rand() * 0.2;
      ctx.ellipse(x % size, y + rowH / 2, colW * 0.4, rowH * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 0.5;
  for (let r = 0; r < rows; r++) {
    ctx.fillStyle = bellyColor;
    ctx.fillRect(size * 0.42, r * rowH + 1, size * 0.16, rowH - 2);
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
  const skinTex = makeSkinTexture({
    base: "#141210", veinColor: "rgba(40,4,4,0.5)", blotchColor: "rgba(0,0,0,0.6)",
    seed: 5, veins: 46, blotches: 40,
  });
  const skinMat = new THREE.MeshStandardMaterial({ map: skinTex, roughness: 0.97, metalness: 0 });

  const muscleMat = new THREE.MeshStandardMaterial({ color: 0x1c0503, roughness: 0.85 });
  const boneMat = new THREE.MeshStandardMaterial({ color: 0x4a4438, roughness: 0.7 });
  const woundMat = new THREE.MeshStandardMaterial({ color: 0x050101, roughness: 0.95 });

  const wetBloodMat = new THREE.MeshStandardMaterial({ color: 0x280603, roughness: 0.12, metalness: 0.08 });
  const driedBloodMat = new THREE.MeshStandardMaterial({ color: 0x0a0201, roughness: 0.97 });

  const ragTex = makeRagTexture({ base: "#0f0c0a", blotchColor: "rgba(0,0,0,0.6)", seed: 21 });
  const ragMat = new THREE.MeshStandardMaterial({ map: ragTex, roughness: 0.97, side: THREE.DoubleSide });

  const clawMat = new THREE.MeshStandardMaterial({ color: 0x100e0b, roughness: 0.6 });

  // v11: the tail's own material — near-black scales with a barely-lit belly stripe
  const scaleTex = makeScaleTexture({ base: "#100d0a", scaleColor: "rgba(0,0,0,0.55)", bellyColor: "rgba(70,55,40,0.35)", seed: 11 });
  const scaleMat = new THREE.MeshStandardMaterial({ map: scaleTex, roughness: 0.75, metalness: 0.02 });

  // v11: dull, brutal metal for the held weapon — pitted, not polished, so
  // it doesn't become the brightest thing in the silhouette
  const weaponMat = new THREE.MeshStandardMaterial({ color: 0x2b2a28, roughness: 0.55, metalness: 0.4 });
  const gripMat = ragMat;

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

  function addDrip(parent, drips, { x, y, z, width = 0.014, len = 0.05, range = 0.08, speed = 1, phase = 0 }) {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    parent.add(pivot);
    const drop = addMesh(pivot, new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(width * 0.5, len, 3, 5) : new THREE.BoxGeometry(width, len, width), wetBloodMat, 0, -len / 2, 0, false);
    const bead = addMesh(pivot, new THREE.SphereGeometry(width * 0.55, 5, 5), wetBloodMat, 0, -len, 0, false);
    const entry = { pivot, drop, bead, baseY: y, phase, speed, range, len };
    drips.push(entry);
    return entry;
  }

  function addClaw(parent, { x, y, z, len = 0.07, rot = 0, rotZ = 0, radius = 0.012 }) {
    const claw = addMesh(parent, new THREE.ConeGeometry(radius, len, 4), clawMat, x, y, z);
    claw.rotation.x = rot;
    claw.rotation.z = rotZ;
    return claw;
  }

  const drips = [];

  // ============================================================
  // HIPS (root) — now the join between torso and tail rather than
  // between torso and legs. Kept as the anchor point so nothing above it
  // (torso/arms/heads) needed repositioning.
  // ============================================================
  const HIP_Y = 1.0;
  const hips = new THREE.Group();
  hips.position.set(0, HIP_Y, 0);
  group.add(hips);
  addMesh(hips, new THREE.BoxGeometry(0.3, 0.16, 0.2), skinMat, 0, 0, 0);
  addMesh(hips, new THREE.BoxGeometry(0.08, 0.1, 0.06), ragMat, 0, -0.1, 0);
  addMesh(hips, new THREE.ConeGeometry(0.02, 0.06, 4), boneMat, -0.13, 0.03, 0.06).rotation.z = 0.6;
  addMesh(hips, new THREE.ConeGeometry(0.02, 0.06, 4), boneMat, 0.13, 0.03, 0.06).rotation.z = -0.6;

  // ============================================================
  // TORSO — v11: stands upright. Hunch reduced from 0.32 rad to 0.04 rad,
  // just enough residual lean to still feel unnatural without doubling
  // the character over.
  // ============================================================
  const TORSO_H = 0.58;
  const torso = new THREE.Group();
  torso.position.set(0, 0.08, 0);
  torso.rotation.x = 0.04; // v11: was 0.32 — now stands straight
  hips.add(torso);

  addMesh(torso, new THREE.BoxGeometry(0.34, TORSO_H, 0.18), skinMat, 0, TORSO_H / 2, -0.01);

  [0.62, 0.46, 0.3].forEach((t, i) => {
    const rib = addMesh(torso, new THREE.TorusGeometry(0.1, 0.012, 5, 8, Math.PI * 0.9), boneMat, 0, TORSO_H * t, 0.05);
    rib.rotation.y = Math.PI / 2;
    rib.rotation.z = Math.PI * 0.05;
    addMesh(torso, new THREE.PlaneGeometry(0.14, 0.05), muscleMat, 0, TORSO_H * t, 0.09).rotation.x = 0.3;
  });

  for (let i = 0; i < 6; i++) {
    const t = 0.12 + i * 0.14;
    addMesh(torso, new THREE.SphereGeometry(0.02 - i * 0.001, 5, 5), boneMat, 0, TORSO_H * t, -0.1);
  }

  const tornOffsets = [-0.1, 0.02, 0.12];
  tornOffsets.forEach((ox, i) => {
    const len = 0.22 + ((i * 37) % 5) * 0.04;
    const strip = addMesh(torso, new THREE.PlaneGeometry(0.08, len), ragMat, ox, -0.05 - len / 2, 0.06);
    strip.rotation.z = (i - 1) * 0.08;
  });

  addBloodDrip(torso, { x: -0.02, y: TORSO_H * 0.85, z: 0.1, len: 0.3, width: 0.026, mat: wetBloodMat });
  addBloodDrip(torso, { x: 0.06, y: TORSO_H * 0.7, z: 0.1, len: 0.18, width: 0.018, mat: driedBloodMat });
  addDrip(torso, drips, { x: 0.02, y: TORSO_H * 0.92, z: 0.1, len: 0.06, width: 0.016, range: 0.16, speed: 0.55, phase: 0.4 });

  // ============================================================
  // NECK — softened to match the upright torso: still visibly a broken
  // double-bend, just not thrown as far back as the hunched version.
  // ============================================================
  const neckPivot = new THREE.Group(); // maps to parts.hair (sway pivot)
  neckPivot.position.set(0, TORSO_H, 0);
  neckPivot.rotation.x = -0.22; // v11: was -0.5
  torso.add(neckPivot);

  const NECK_SEG = 0.18;
  addMesh(neckPivot, new THREE.CylinderGeometry(0.06, 0.07, NECK_SEG, 6), skinMat, 0, NECK_SEG / 2, 0);

  const neckMid = new THREE.Group();
  neckMid.position.set(0, NECK_SEG, 0);
  neckMid.rotation.x = 0.18; // v11: was 0.35
  neckPivot.add(neckMid);
  addMesh(neckMid, new THREE.CylinderGeometry(0.05, 0.058, NECK_SEG, 6), skinMat, 0, NECK_SEG / 2, 0);
  addMesh(neckMid, new THREE.SphereGeometry(0.028, 6, 6), boneMat, 0, 0.01, 0.02);

  // ============================================================
  // HEAD — the big main skull, unchanged from v10.
  // ============================================================
  const stump = new THREE.Group();
  stump.position.set(0, NECK_SEG, 0);
  neckMid.add(stump);

  const skullChunks = [
    { x: 0, y: 0.1, z: 0, sx: 0.28, sy: 0.24, sz: 0.26, r: 0 },
    { x: -0.06, y: 0.15, z: -0.02, sx: 0.11, sy: 0.09, sz: 0.11, r: 0.35 },
    { x: 0.07, y: 0.16, z: 0.01, sx: 0.1, sy: 0.08, sz: 0.1, r: -0.28 },
  ];
  skullChunks.forEach((o) => {
    const chunk = addMesh(stump, new THREE.BoxGeometry(o.sx, o.sy, o.sz), skinMat, o.x, o.y, o.z);
    chunk.rotation.set(o.r * 0.4, o.r, o.r * 0.2);
  });

  const jawPivot = new THREE.Group();
  jawPivot.position.set(0, 0.045, 0.07);
  stump.add(jawPivot);
  addMesh(jawPivot, new THREE.BoxGeometry(0.17, 0.05, 0.14), skinMat, 0, -0.02, 0);
  for (let i = 0; i < 7; i++) {
    const tx = -0.065 + i * 0.021;
    const tlen = 0.022 + ((i * 53) % 4) * 0.006;
    addMesh(jawPivot, new THREE.ConeGeometry(0.009, tlen, 4), boneMat, tx, 0.01, 0.065).rotation.x = Math.PI;
  }
  for (let i = 0; i < 8; i++) {
    const tx = -0.07 + i * 0.019;
    const tlen = 0.02 + ((i * 41) % 4) * 0.006;
    addMesh(stump, new THREE.ConeGeometry(0.008, tlen, 4), boneMat, tx, 0.038, 0.11);
  }

  addMesh(stump, new THREE.CylinderGeometry(0.055, 0.06, 0.065, 8), woundMat, 0.1, 0.09, -0.06);
  const rim = addMesh(stump, new THREE.TorusGeometry(0.055, 0.011, 5, 10), driedBloodMat, 0.1, 0.09, -0.06);
  rim.rotation.x = Math.PI / 2;
  addMesh(stump, new THREE.CylinderGeometry(0.015, 0.019, 0.055, 6), boneMat, 0.1, 0.12, -0.06);

  addBloodDrip(stump, { x: -0.02, y: 0.02, z: 0.11, len: 0.15, width: 0.022, rot: -0.15, mat: wetBloodMat });
  addBloodDrip(stump, { x: 0.07, y: 0.06, z: 0.11, len: 0.1, width: 0.017, rot: 0.1, mat: driedBloodMat });
  addDrip(stump, drips, { x: -0.075, y: -0.01, z: 0.13, len: 0.05, width: 0.015, range: 0.1, speed: 0.9, phase: 0 });
  addDrip(stump, drips, { x: 0.07, y: -0.005, z: 0.135, len: 0.045, width: 0.013, range: 0.09, speed: 1.1, phase: 1.7 });
  addDrip(stump, drips, { x: 0.1, y: 0.06, z: -0.03, len: 0.04, width: 0.012, range: 0.07, speed: 0.7, phase: 2.6 });

  const leftEye = addMesh(stump, new THREE.SphereGeometry(0.017, 6, 6), eyeMaterial, -0.075, 0.14, 0.1, false);
  const rightEye = addMesh(stump, new THREE.SphereGeometry(0.014, 6, 6), eyeMaterial, 0.06, 0.11, 0.11, false);
  addMesh(stump, new THREE.SphereGeometry(0.011, 6, 6), eyeMaterial, 0.01, 0.18, 0.1, false);
  const eyeLight = new THREE.PointLight(0xbfe0d8, 0.2, 1.2, 2.2);
  eyeLight.position.set(0, 0.11, 0.09);
  stump.add(eyeLight);

  // ---------- secondary heads — v11: exactly TWO, so total head count is
  // 3 (main + 2). Both sprout from the torso, same as v9. ----------
  function buildSmallHead(parent, { x, y, z, rotY = 0, rotZ = 0, scale = 0.5, dripPhase = 0 }) {
    const stalk = new THREE.Group();
    stalk.position.set(x, y, z);
    stalk.rotation.set(0.4, rotY, rotZ);
    parent.add(stalk);
    addMesh(stalk, new THREE.CylinderGeometry(0.024, 0.032, 0.13, 6), skinMat, 0, 0.065, 0);

    const small = new THREE.Group();
    small.position.set(0, 0.13, 0);
    small.scale.setScalar(scale);
    stalk.add(small);
    addMesh(small, new THREE.BoxGeometry(0.17, 0.15, 0.16), skinMat, 0, 0.06, 0);

    const smallJaw = new THREE.Group();
    smallJaw.position.set(0, 0.02, 0.05);
    small.add(smallJaw);
    addMesh(smallJaw, new THREE.BoxGeometry(0.1, 0.03, 0.08), skinMat, 0, -0.015, 0);
    for (let i = 0; i < 5; i++) {
      addMesh(smallJaw, new THREE.ConeGeometry(0.006, 0.014, 4), boneMat, -0.03 + i * 0.015, 0.006, 0.03).rotation.x = Math.PI;
    }

    const smallEye = addMesh(small, new THREE.SphereGeometry(0.012, 6, 6), eyeMaterial, 0, 0.09, 0.075, false);
    const light = new THREE.PointLight(0xbfe0d8, 0.12, 0.8, 2.2);
    light.position.set(0, 0.09, 0.065);
    small.add(light);

    const drip = addDrip(smallJaw, drips, { x: 0.04, y: -0.02, z: 0.06, len: 0.03, width: 0.01, range: 0.06, speed: 1.2, phase: dripPhase });

    return { stalk, head: small, jawPivot: smallJaw, eye: smallEye, light, drip };
  }

  const extraHeads = [
    buildSmallHead(torso, { x: -0.19, y: TORSO_H * 0.75, z: -0.02, rotY: -1.1, rotZ: 0.3, scale: 0.5, dripPhase: 0.8 }),
    buildSmallHead(torso, { x: 0.16, y: TORSO_H * 0.35, z: -0.07, rotY: 2.0, rotZ: -0.5, scale: 0.42, dripPhase: 2.1 }),
  ];

  // ============================================================
  // ARMS — v11: `thicknessScale` now drives radius independently of
  // `scale` (which still drives length/position). Main arms come out at
  // 4x their old girth; the extra pair uses a smaller thickness bump so
  // it still reads as secondary next to the now much heavier main arms.
  // ============================================================
  function buildArm(side, { yOffset = 0, zOffset = 0, scale = 1, thicknessScale = 1 } = {}) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * (0.19 + (1 - scale) * 0.04), TORSO_H - 0.02 + yOffset, zOffset);
    torso.add(shoulder);
    addMesh(shoulder, new THREE.ConeGeometry(0.025 * scale * thicknessScale, 0.07 * scale, 5), boneMat, sign * 0.03 * scale, 0.03 * scale, 0);

    const UPPER_LEN = 0.4 * scale; // length untouched by thicknessScale
    addMesh(shoulder, new THREE.CylinderGeometry(0.035 * scale * thicknessScale, 0.028 * scale * thicknessScale, UPPER_LEN, 8), skinMat, 0, -UPPER_LEN / 2, 0);
    addBloodDrip(shoulder, { x: sign * 0.02 * thicknessScale, y: -UPPER_LEN * 0.5, z: 0.035 * scale * thicknessScale, len: 0.14 * scale, width: 0.014 * scale, mat: driedBloodMat });

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -UPPER_LEN, 0);
    forearmPivot.rotation.z = sign * -0.08;
    shoulder.add(forearmPivot);

    const LOWER_LEN = 0.38 * scale;
    addMesh(forearmPivot, new THREE.CylinderGeometry(0.028 * scale * thicknessScale, 0.022 * scale * thicknessScale, LOWER_LEN, 8), skinMat, 0, -LOWER_LEN / 2, 0);
    const tendonCount = thicknessScale > 2 ? 3 : 1;
    for (let i = 0; i < tendonCount; i++) {
      const ta = (i / tendonCount) * Math.PI * 2;
      const tr = 0.03 * scale * thicknessScale;
      addMesh(
        forearmPivot,
        new THREE.BoxGeometry(0.012 * scale * thicknessScale, LOWER_LEN * 0.7, 0.008 * scale * thicknessScale),
        muscleMat,
        Math.cos(ta) * tr, -LOWER_LEN * 0.4, Math.sin(ta) * tr
      );
    }

    const hand = new THREE.Group();
    hand.position.set(0, -LOWER_LEN, 0);
    forearmPivot.add(hand);
    addMesh(hand, new THREE.BoxGeometry(0.03 * scale * thicknessScale, 0.05 * scale * thicknessScale, 0.02 * scale * thicknessScale), skinMat, 0, -0.02 * scale, 0);
    [-0.02, -0.007, 0.007, 0.02].forEach((fx, i) => {
      addClaw(hand, { x: fx * scale * thicknessScale, y: -0.06 * scale - i * 0.005, z: 0.01 * scale, len: 0.075 * scale, rot: Math.PI, radius: 0.012 * Math.min(thicknessScale, 2) });
    });
    addClaw(hand, { x: -0.026 * scale * thicknessScale, y: -0.03 * scale, z: 0.01 * scale, len: 0.05 * scale, rot: Math.PI * 0.75, rotZ: 0.4, radius: 0.012 * Math.min(thicknessScale, 2) });

    return { shoulder, forearmPivot, hand };
  }

  const leftArm = buildArm("left", { thicknessScale: 4 });
  const rightArm = buildArm("right", { thicknessScale: 4 });

  const extraArms = [
    buildArm("left", { yOffset: -0.24, zOffset: 0.04, scale: 0.68, thicknessScale: 1.3 }),
    buildArm("right", { yOffset: -0.24, zOffset: 0.04, scale: 0.68, thicknessScale: 1.3 }),
  ];

  // ---------- forearm bone-blade (kept from v7-v10) — still erupts
  // through the flesh on its own, independent of the new held weapon ----------
  const weaponSocket = new THREE.Group();
  rightArm.forearmPivot.add(weaponSocket);
  weaponSocket.position.set(0.05, -0.16, 0.02);
  weaponSocket.rotation.z = -0.15;

  addMesh(weaponSocket, new THREE.TorusGeometry(0.035, 0.01, 5, 8), muscleMat, 0, 0, 0).rotation.x = Math.PI / 2;
  addMesh(weaponSocket, new THREE.CylinderGeometry(0.028, 0.032, 0.02, 6), woundMat, 0, 0, 0);
  addMesh(weaponSocket, new THREE.ConeGeometry(0.045, 0.24, 5), boneMat, 0, 0.14, 0);
  addMesh(weaponSocket, new THREE.ConeGeometry(0.024, 0.17, 5), boneMat, 0.012, 0.32, 0.006).rotation.z = 0.06;
  addMesh(weaponSocket, new THREE.ConeGeometry(0.016, 0.09, 4), boneMat, 0.03, 0.17, 0).rotation.z = -0.5;
  addMesh(weaponSocket, new THREE.ConeGeometry(0.013, 0.07, 4), boneMat, -0.025, 0.24, 0).rotation.z = 0.6;

  addBloodDrip(weaponSocket, { x: -0.025, y: -0.02, z: 0.02, len: 0.1, width: 0.02, mat: wetBloodMat });
  addBloodDrip(weaponSocket, { x: 0.018, y: 0.11, z: 0.012, len: 0.13, width: 0.015, mat: driedBloodMat, rot: 0.05 });
  addDrip(weaponSocket, drips, { x: -0.02, y: -0.006, z: 0.028, len: 0.05, width: 0.017, range: 0.11, speed: 0.6, phase: 1.2 });

  // ---------- v11: HELD WEAPON — a heavy, crude cleaver gripped in the
  // right hand, on top of the forearm blade rather than instead of it.
  // Deliberately brutal/asymmetric (uneven notches, off-axis taper) so it
  // reads as scavenged/improvised, not forged. ----------
  const heldWeapon = new THREE.Group();
  rightArm.hand.add(heldWeapon);
  heldWeapon.position.set(0.01, -0.05, 0.02);
  heldWeapon.rotation.set(0.15, 0, -0.1);

  addMesh(heldWeapon, new THREE.CylinderGeometry(0.02, 0.022, 0.14, 6), gripMat, 0, -0.02, 0);
  for (let i = 0; i < 5; i++) {
    addMesh(heldWeapon, new THREE.TorusGeometry(0.021, 0.004, 4, 8), ragMat, 0, -0.08 + i * 0.028, 0).rotation.x = Math.PI / 2;
  }
  addMesh(heldWeapon, new THREE.BoxGeometry(0.09, 0.018, 0.03), weaponMat, 0, 0.05, 0);

  const bladeGroup = new THREE.Group();
  bladeGroup.position.set(0, 0.06, 0);
  heldWeapon.add(bladeGroup);
  addMesh(bladeGroup, new THREE.BoxGeometry(0.1, 0.32, 0.014), weaponMat, 0.01, 0.16, 0);
  addMesh(bladeGroup, new THREE.ConeGeometry(0.075, 0.14, 3), weaponMat, 0.02, 0.36, 0).rotation.z = -0.25;
  [0.08, 0.16, 0.24].forEach((t, i) => {
    addMesh(bladeGroup, new THREE.SphereGeometry(0.015 + (i % 2) * 0.006, 5, 5), weaponMat, 0.055, t * 1.1, 0);
  });
  addBloodDrip(bladeGroup, { x: 0.03, y: 0.2, z: 0.01, len: 0.16, width: 0.02, mat: driedBloodMat, rot: -0.05 });
  addDrip(bladeGroup, drips, { x: 0.045, y: 0.34, z: 0.008, len: 0.04, width: 0.012, range: 0.09, speed: 0.8, phase: 2.0 });

  const weaponTip = new THREE.Group();
  weaponTip.position.set(0.02, 0.44, 0);
  bladeGroup.add(weaponTip);

  // ============================================================
  // TAIL — v11: replaces both legs entirely. A long, tapering, segmented
  // naga tail hanging from the hips, resting in a loose coil at idle.
  // Each segment is its own pivot Group so chudailenemy.js can drive a
  // traveling side-to-side wave through `parts.tailSegments` for a slither
  // instead of a walk cycle.
  // ============================================================
  // v12: thickness up ~5x (within the requested 4-6x) and length up 4x
  // from the v11 baseline (0.09 radius / 0.26 length per segment), per
  // request. Everything else about the tail (taper ratio, dorsal ridge,
  // barb cluster, blood placement) is proportional to these two numbers
  // already, so bumping them scales the whole tail up cleanly rather than
  // needing separate tuning per segment.
  const TAIL_SEGMENTS = 9;
  const tailSegments = [];
  let tailParent = hips;
  let segLen = 0.26 * 4;      // v12: was 0.26 — 4x length
  let segRadius = 0.09 * 5;   // v12: was 0.09 — 5x thickness
  const restCurve = [0.05, 0.08, 0.1, 0.12, 0.14, 0.15, 0.14, 0.1, 0.04];

  for (let i = 0; i < TAIL_SEGMENTS; i++) {
    const seg = new THREE.Group();
    seg.position.set(0, i === 0 ? -0.05 : -segLen, 0);
    seg.rotation.x = Math.PI * 0.02;
    seg.rotation.z = restCurve[i] * (i % 2 === 0 ? 1 : 0.6);
    tailParent.add(seg);

    const nextRadius = segRadius * 0.82;
    addMesh(seg, new THREE.CylinderGeometry(segRadius, nextRadius, segLen, 8), scaleMat, 0, -segLen / 2, 0);
    addMesh(seg, new THREE.ConeGeometry(segRadius * 0.22, segRadius * 0.5, 4), boneMat, 0, -segLen * 0.2, -segRadius * 0.7).rotation.x = -0.3;

    if (i < 3) {
      addBloodDrip(seg, { x: segRadius * 0.5, y: -segLen * 0.3, z: segRadius * 0.5, len: segLen * 0.5, width: 0.02, mat: driedBloodMat, rot: 0.3 });
    }

    tailSegments.push(seg);
    tailParent = seg;
    segLen *= 0.92;
    segRadius = nextRadius;
  }

  // v12: barb cluster scaled up to match the now much thicker tip segment
  // (segRadius/segLen here are already the post-taper values at the tip)
  const tailTip = tailParent;
  const tipBarbLen = 0.09 * 4;
  const tipBarbSpread = segRadius * 0.9;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    addMesh(tailTip, new THREE.ConeGeometry(0.012 * 4, tipBarbLen, 4), boneMat, Math.cos(a) * tipBarbSpread, -segLen - i * 0.01, Math.sin(a) * tipBarbSpread).rotation.x = Math.PI * 0.55;
  }

  const parts = {
    hips,
    torso,
    hair: neckPivot,
    head: stump,
    jawPivot,
    extraHeads, // v11: length 2 (3 heads total with the main head)
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
    extraArms,
    weaponSocket,   // forearm bone-blade (kept)
    heldWeapon,     // v11: the gripped cleaver
    weaponTip,      // v11: use this for attack-hit testing now
    drips,
    tailSegments,   // v11: base -> tip, replaces leftUpperLeg/rightUpperLeg/etc.
  };

  return { group, parts };
}

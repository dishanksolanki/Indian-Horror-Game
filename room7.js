// room7.js — ROOM 7: the haveli's puja (prayer) room, reached via a corridor
// running east from room6's east doorway.
// West wall has a doorway gap matching the corridor width (entrance from room6).
// North/south/east walls remain solid, no window — this is the dead end of this wing.
// The east wall (facing the entrance) holds a small household shrine (mandir).

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

// =========================================================
// Lord Ganesh idol builder (detailed carved-stone murti)
// Merged in from ganeshIdol.js so this room is a single self-contained file.
// =========================================================

// ganeshIdol.js — a detailed, carved-stone murti of Lord Ganesh.
// Self-contained: generates its own procedural stone texture (canvas-based
// noise used as a bump/roughness map) so every part of the idol reads as
// one weathered block of temple stone rather than flat plastic-looking shapes.
//
// Usage:
//   import { createGaneshIdol } from "./ganeshIdol.js";
//   const ganesh = createGaneshIdol(scene, { x, y, z, scale: 1, rotationY: 0 });
//   // ganesh.group   -> THREE.Group, already added to the scene
//   // ganesh.dispose -> call if you ever need to tear it down
//
// ---------- procedural stone texture (shared by every part of the idol) ----------
function buildStoneTextures() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // base tone: weathered grey-sandstone, slightly warm
  ctx.fillStyle = "#7a7468";
  ctx.fillRect(0, 0, size, size);

  // layered speckle/grain noise for a carved, granular stone look
  for (let i = 0; i < 22000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.6 + 0.2;
    const shade = Math.random();
    const c = shade < 0.5
      ? `rgba(40,36,30,${0.05 + Math.random() * 0.12})`   // dark mineral fleck
      : `rgba(200,192,172,${0.04 + Math.random() * 0.1})`; // light mineral fleck
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // faint veining / hairline cracks
  ctx.strokeStyle = "rgba(30,26,22,0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    const segs = 4 + Math.floor(Math.random() * 4);
    for (let s = 0; s < segs; s++) {
      x += (Math.random() - 0.5) * 90;
      y += (Math.random() - 0.5) * 90;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // soft dark patches near "ground level" areas (used for the base texture only,
  // harmless elsewhere) to suggest damp/aged stone
  for (let i = 0; i < 10; i++) {
    const x = Math.random() * size;
    const y = size * 0.75 + Math.random() * size * 0.25;
    const r = 20 + Math.random() * 50;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(25,30,22,0.22)");
    grad.addColorStop(1, "rgba(25,30,22,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const colorTex = new THREE.CanvasTexture(canvas);
  colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.repeat.set(2, 2);

  // bump map: greyscale version of the same noise for surface micro-detail
  const bumpCanvas = document.createElement("canvas");
  bumpCanvas.width = size;
  bumpCanvas.height = size;
  const bctx = bumpCanvas.getContext("2d");
  bctx.drawImage(canvas, 0, 0);
  const imgData = bctx.getImageData(0, 0, size, size);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const avg = (d[i] + d[i + 1] + d[i + 2]) / 3;
    d[i] = d[i + 1] = d[i + 2] = avg;
  }
  bctx.putImageData(imgData, 0, 0);
  const bumpTex = new THREE.CanvasTexture(bumpCanvas);
  bumpTex.wrapS = bumpTex.wrapT = THREE.RepeatWrapping;
  bumpTex.repeat.set(2, 2);

  return { colorTex, bumpTex };
}

function makeStoneMaterial(colorTex, bumpTex, tint = 0xffffff, extra = {}) {
  return new THREE.MeshStandardMaterial({
    map: colorTex,
    bumpMap: bumpTex,
    bumpScale: 0.015,
    color: tint,
    roughness: 0.92,
    metalness: 0.02,
    ...extra,
  });
}

// aligns a cylinder built along +Y to run from p1 -> p2
function segmentBetween(p1, p2, rTop, rBottom, radialSegments, material) {
  const dir = new THREE.Vector3().subVectors(p2, p1);
  const length = dir.length();
  const geo = new THREE.CylinderGeometry(rTop, rBottom, length, radialSegments);
  const mesh = new THREE.Mesh(geo, material);
  const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
  mesh.position.copy(mid);
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize()
  );
  mesh.quaternion.copy(quat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createGaneshIdol(scene, opts = {}) {
  const {
    x = 0,
    y = 0,
    z = 0,
    scale = 1,
    rotationY = 0,
  } = opts;

  const group = new THREE.Group();
  const S = scale;

  const { colorTex, bumpTex } = buildStoneTextures();
  const stone = makeStoneMaterial(colorTex, bumpTex, 0x8a8272);
  const stoneDark = makeStoneMaterial(colorTex, bumpTex, 0x625b4e, { roughness: 0.96 });
  const stoneGilt = makeStoneMaterial(colorTex, bumpTex, 0xcaa646, { roughness: 0.55, metalness: 0.35 });
  const ivory = makeStoneMaterial(colorTex, bumpTex, 0xe7ddc4, { roughness: 0.6 });

  const parts = []; // for shadow flag pass

  function add(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    parts.push(mesh);
    return mesh;
  }

  // =========================================================
  // BACKDROP: carved stone aureole (prabhavali) behind the idol
  // =========================================================
  const aureoleShape = new THREE.Shape();
  aureoleShape.absellipse ? null : null; // no-op guard (kept simple, ellipse via curve below)
  {
    const outerCurve = new THREE.EllipseCurve(0, 0.15, 0.62, 0.78, 0, Math.PI * 2, false, 0);
    const pts = outerCurve.getPoints(48);
    aureoleShape.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) aureoleShape.lineTo(pts[i].x, pts[i].y);
    const holePts = new THREE.EllipseCurve(0, 0.15, 0.5, 0.64, 0, Math.PI * 2, false, 0).getPoints(48);
    const hole = new THREE.Path();
    hole.moveTo(holePts[0].x, holePts[0].y);
    for (let i = 1; i < holePts.length; i++) hole.lineTo(holePts[i].x, holePts[i].y);
    aureoleShape.holes.push(hole);
  }
  const aureoleGeo = new THREE.ExtrudeGeometry(aureoleShape, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2 });
  const aureole = new THREE.Mesh(aureoleGeo, stoneDark);
  aureole.scale.set(S, S, S);
  aureole.position.set(0, 0.55 * S, -0.14 * S);
  add(aureole);
  // small flame-like points around the aureole rim
  const flamePts = 12;
  for (let i = 0; i < flamePts; i++) {
    const ang = (i / flamePts) * Math.PI * 2;
    if (Math.sin(ang) < -0.3) continue; // skip the bottom arc, hidden behind the idol
    const rx = Math.cos(ang) * 0.62;
    const ry = 0.15 + Math.sin(ang) * 0.78;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.09, 6), stoneDark);
    flame.position.set(rx * S, (0.55 * S) + ry * S, -0.13 * S);
    flame.rotation.z = -ang + Math.PI / 2;
    add(flame);
  }

  // =========================================================
  // BASE: stepped stone plinth + double-lotus pedestal (padmasana)
  // =========================================================
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.5), stoneDark);
  plinth.scale.set(S, S, S);
  plinth.position.set(0, 0.04 * S, 0);
  add(plinth);

  const lotusBase = new THREE.Mesh(new THREE.CylinderGeometry(0.27 * S, 0.3 * S, 0.09 * S, 16), stone);
  lotusBase.position.set(0, 0.13 * S, 0);
  add(lotusBase);

  function lotusRing(yPos, count, petalLen, petalR, upward) {
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.ConeGeometry(petalR * S, petalLen * S, 6), stone);
      petal.position.set(Math.cos(ang) * 0.27 * S, yPos, Math.sin(ang) * 0.27 * S);
      petal.rotation.x = upward ? Math.PI * 0.42 : -Math.PI * 0.42;
      petal.rotation.y = -ang;
      add(petal);
    }
  }
  lotusRing(0.09 * S, 14, 0.16, 0.055, false);
  lotusRing(0.185 * S, 12, 0.13, 0.05, true);

  // =========================================================
  // TORSO: seated cross-legged, broad potbelly, draped dhoti + sash
  // =========================================================
  const hipY = 0.2 * S;

  // crossed legs (seated padmasana silhouette, built from tapered segments)
  const legMat = stone;
  const legL1 = segmentBetween(
    new THREE.Vector3(-0.02 * S, hipY, 0.03 * S),
    new THREE.Vector3(-0.26 * S, hipY - 0.01 * S, 0.16 * S),
    0.065 * S, 0.085 * S, 10, legMat
  );
  add(legL1);
  const legR1 = segmentBetween(
    new THREE.Vector3(0.02 * S, hipY, 0.03 * S),
    new THREE.Vector3(0.26 * S, hipY - 0.01 * S, 0.16 * S),
    0.065 * S, 0.085 * S, 10, legMat
  );
  add(legR1);
  // feet soles peeking out
  const footL = new THREE.Mesh(new THREE.SphereGeometry(0.06 * S, 10, 10), stone);
  footL.scale.set(1.3, 0.7, 1.6);
  footL.position.set(-0.28 * S, hipY - 0.02 * S, 0.22 * S);
  add(footL);
  const footR = footL.clone();
  footR.position.x = 0.28 * S;
  add(footR);

  const dhoti = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * S, 0.3 * S, 0.2 * S, 16), stone);
  dhoti.position.set(0, hipY + 0.05 * S, 0);
  add(dhoti);
  // dhoti drape folds (a few vertical grooves suggested with thin boxes)
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const fold = new THREE.Mesh(new THREE.BoxGeometry(0.02 * S, 0.16 * S, 0.01 * S), stoneDark);
    fold.position.set(Math.cos(ang) * 0.25 * S, hipY + 0.05 * S, Math.sin(ang) * 0.25 * S);
    fold.rotation.y = -ang;
    add(fold);
  }

  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.26 * S, 20, 16), stone);
  belly.scale.set(1, 0.88, 0.92);
  belly.position.set(0, hipY + 0.28 * S, 0.01 * S);
  add(belly);
  // navel
  const navel = new THREE.Mesh(new THREE.SphereGeometry(0.015 * S, 8, 8), stoneDark);
  navel.position.set(0, hipY + 0.24 * S, 0.24 * S);
  add(navel);

  // sacred thread (yagnopavita) draped diagonally across the chest
  const threadCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.16 * S, hipY + 0.52 * S, 0.16 * S),
    new THREE.Vector3(0.05 * S, hipY + 0.4 * S, 0.22 * S),
    new THREE.Vector3(0.2 * S, hipY + 0.2 * S, 0.14 * S),
    new THREE.Vector3(0.14 * S, hipY + 0.02 * S, 0.06 * S),
  ]);
  const threadGeo = new THREE.TubeGeometry(threadCurve, 24, 0.012 * S, 8, false);
  add(new THREE.Mesh(threadGeo, stoneDark));

  // waist sash (kamarband) knot
  const sashRing = new THREE.Mesh(new THREE.TorusGeometry(0.24 * S, 0.025 * S, 8, 20), stoneGilt);
  sashRing.rotation.x = Math.PI / 2;
  sashRing.position.set(0, hipY + 0.05 * S, 0);
  add(sashRing);

  // necklace / garland (haar) resting on the chest
  const necklace = new THREE.Mesh(new THREE.TorusGeometry(0.19 * S, 0.018 * S, 8, 20, Math.PI * 1.3), stoneGilt);
  necklace.rotation.x = Math.PI / 2.1;
  necklace.position.set(0, hipY + 0.5 * S, 0.15 * S);
  add(necklace);

  // =========================================================
  // ARMS: four arms with traditional attributes
  // =========================================================
  const shoulderY = hipY + 0.46 * S;
  const upperArmMat = stone;

  function buildArm(shoulderX, elbowOffset, handOffset, bend) {
    const shoulder = new THREE.Vector3(shoulderX * S, shoulderY, 0.05 * S);
    const elbow = shoulder.clone().add(new THREE.Vector3(elbowOffset.x * S, elbowOffset.y * S, elbowOffset.z * S));
    const hand = elbow.clone().add(new THREE.Vector3(handOffset.x * S, handOffset.y * S, handOffset.z * S));
    const upper = segmentBetween(shoulder, elbow, 0.05 * S, 0.058 * S, 8, upperArmMat);
    add(upper);
    const fore = segmentBetween(elbow, hand, 0.038 * S, 0.048 * S, 8, upperArmMat);
    add(fore);
    // armlet
    const armlet = new THREE.Mesh(new THREE.TorusGeometry(0.056 * S, 0.012 * S, 6, 14), stoneGilt);
    armlet.position.copy(shoulder.clone().lerp(elbow, 0.35));
    const dir = new THREE.Vector3().subVectors(elbow, shoulder).normalize();
    armlet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    add(armlet);
    // hand (simplified rounded palm)
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.05 * S, 10, 10), upperArmMat);
    palm.scale.set(1, 0.7, 0.5);
    palm.position.copy(hand);
    add(palm);
    return { shoulder, elbow, hand };
  }

  // upper-right: holds a small parashu (axe)
  const urArm = buildArm(0.24, { x: 0.14, y: 0.12, z: -0.02 }, { x: 0.1, y: 0.16, z: 0.02 }, true);
  const axeHandle = segmentBetween(
    urArm.hand.clone().add(new THREE.Vector3(0, -0.02 * S, 0)),
    urArm.hand.clone().add(new THREE.Vector3(0.03 * S, 0.22 * S, 0)),
    0.012 * S, 0.014 * S, 6, stoneDark
  );
  add(axeHandle);
  const axeBlade = new THREE.Mesh(new THREE.ConeGeometry(0.05 * S, 0.09 * S, 4), stoneGilt);
  axeBlade.position.copy(urArm.hand.clone().add(new THREE.Vector3(0.03 * S, 0.28 * S, 0)));
  axeBlade.rotation.z = Math.PI / 2;
  add(axeBlade);

  // upper-left: holds a pasha (noose), simplified as a small ring
  const ulArm = buildArm(-0.24, { x: -0.14, y: 0.12, z: -0.02 }, { x: -0.1, y: 0.16, z: 0.02 }, true);
  const noose = new THREE.Mesh(new THREE.TorusGeometry(0.055 * S, 0.012 * S, 8, 16), stoneDark);
  noose.position.copy(ulArm.hand.clone().add(new THREE.Vector3(-0.02 * S, 0.06 * S, 0)));
  add(noose);

  // lower-right: abhaya mudra (raised open palm, blessing gesture)
  buildArm(0.22, { x: 0.1, y: -0.06, z: 0.16 }, { x: 0.06, y: 0.14, z: 0.1 }, false);

  // lower-left: cupped palm holding a modak (sweet)
  const llArm = buildArm(-0.22, { x: -0.1, y: -0.1, z: 0.18 }, { x: -0.02, y: -0.02, z: 0.12 }, false);
  const modakBody = new THREE.Mesh(new THREE.SphereGeometry(0.045 * S, 10, 10), ivory);
  modakBody.position.copy(llArm.hand.clone().add(new THREE.Vector3(0, 0.03 * S, 0.02 * S)));
  add(modakBody);
  const modakTip = new THREE.Mesh(new THREE.ConeGeometry(0.02 * S, 0.03 * S, 8), ivory);
  modakTip.position.copy(modakBody.position.clone().add(new THREE.Vector3(0, 0.045 * S, 0)));
  add(modakTip);

  // the broken tusk, held (traditionally) — small ivory shard resting near the lower-right hand
  const brokenTusk = new THREE.Mesh(new THREE.ConeGeometry(0.016 * S, 0.09 * S, 6), ivory);
  brokenTusk.position.set(0.16 * S, hipY + 0.16 * S, 0.22 * S);
  brokenTusk.rotation.z = -0.6;
  brokenTusk.rotation.x = 0.3;
  add(brokenTusk);

  // =========================================================
  // HEAD: elephant head, ears, trunk, tusk, third eye, crown
  // =========================================================
  const neckY = shoulderY + 0.06 * S;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * S, 0.11 * S, 0.08 * S, 12), stone);
  neck.position.set(0, neckY, 0.02 * S);
  add(neck);

  const headY = neckY + 0.16 * S;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17 * S, 20, 18), stone);
  head.scale.set(1, 0.95, 1.05);
  head.position.set(0, headY, 0.02 * S);
  add(head);

  // big fan-shaped ears
  function buildEar(sign) {
    const earShape = new THREE.Shape();
    earShape.moveTo(0, 0);
    earShape.quadraticCurveTo(0.14, 0.05, 0.16, 0.16);
    earShape.quadraticCurveTo(0.15, 0.26, 0.02, 0.24);
    earShape.quadraticCurveTo(-0.06, 0.14, 0, 0);
    const earGeo = new THREE.ExtrudeGeometry(earShape, { depth: 0.02, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2 });
    const ear = new THREE.Mesh(earGeo, stone);
    ear.scale.set(sign * S, S, S);
    ear.position.set(sign * 0.16 * S, headY - 0.02 * S, -0.02 * S);
    ear.rotation.y = sign * 0.35;
    add(ear);
  }
  buildEar(1);
  buildEar(-1);

  // gentle curling trunk built from a smooth curve, tapering from head to tip
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, headY - 0.08 * S, 0.17 * S),
    new THREE.Vector3(0.02 * S, headY - 0.2 * S, 0.2 * S),
    new THREE.Vector3(0.05 * S, headY - 0.3 * S, 0.14 * S),
    new THREE.Vector3(0.09 * S, headY - 0.34 * S, 0.02 * S),
    new THREE.Vector3(0.1 * S, headY - 0.3 * S, -0.06 * S),
    new THREE.Vector3(0.06 * S, headY - 0.24 * S, -0.08 * S),
  ]);
  const trunkPoints = trunkCurve.getPoints(24);
  for (let i = 0; i < trunkPoints.length - 1; i++) {
    const tAvg = i / (trunkPoints.length - 2);
    const rTop = 0.05 * S * (1 - tAvg * 0.7);
    const rBottom = 0.05 * S * (1 - (tAvg + 1 / trunkPoints.length) * 0.7);
    const seg = segmentBetween(trunkPoints[i], trunkPoints[i + 1], Math.max(rTop, 0.008 * S), Math.max(rBottom, 0.01 * S), 8, stone);
    add(seg);
  }

  // single (unbroken) tusk, curling gently from the mouth
  const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.02 * S, 0.13 * S, 8), ivory);
  tusk.position.set(-0.09 * S, headY - 0.1 * S, 0.15 * S);
  tusk.rotation.x = Math.PI / 2 + 0.4;
  tusk.rotation.z = 0.15;
  add(tusk);

  // eyes (softly carved almond shapes) + third eye tilak
  function buildEye(sign) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018 * S, 8, 8), stoneDark);
    eye.scale.set(1.4, 0.7, 0.6);
    eye.position.set(sign * 0.06 * S, headY + 0.02 * S, 0.155 * S);
    add(eye);
  }
  buildEye(1);
  buildEye(-1);
  const tilak = new THREE.Mesh(new THREE.CircleGeometry(0.014 * S, 12), stoneGilt);
  tilak.position.set(0, headY + 0.09 * S, 0.165 * S);
  add(tilak);

  // crown (kirita mukuta) with a jeweled finial
  const crownBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * S, 0.15 * S, 0.06 * S, 16), stoneGilt);
  crownBase.position.set(0, headY + 0.15 * S, 0);
  add(crownBase);
  const crownCone = new THREE.Mesh(new THREE.ConeGeometry(0.1 * S, 0.16 * S, 14), stoneGilt);
  crownCone.position.set(0, headY + 0.25 * S, 0);
  add(crownCone);
  const crownJewel = new THREE.Mesh(new THREE.SphereGeometry(0.03 * S, 10, 10), stoneGilt);
  crownJewel.position.set(0, headY + 0.35 * S, 0);
  add(crownJewel);
  // small decorative studs around the crown base
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const stud = new THREE.Mesh(new THREE.SphereGeometry(0.012 * S, 6, 6), stoneGilt);
    stud.position.set(Math.cos(ang) * 0.13 * S, headY + 0.15 * S, Math.sin(ang) * 0.13 * S);
    add(stud);
  }

  // =========================================================
  // VAHANA: small mouse (Mushika) carved at the base, facing forward
  // =========================================================
  const mouseGroup = new THREE.Group();
  const mouseBody = new THREE.Mesh(new THREE.SphereGeometry(0.055 * S, 12, 10), stoneDark);
  mouseBody.scale.set(1.4, 0.85, 1);
  mouseGroup.add(mouseBody);
  const mouseHead = new THREE.Mesh(new THREE.SphereGeometry(0.032 * S, 10, 10), stoneDark);
  mouseHead.position.set(0.07 * S, 0.01 * S, 0);
  mouseGroup.add(mouseHead);
  const mouseSnout = new THREE.Mesh(new THREE.ConeGeometry(0.014 * S, 0.03 * S, 8), stoneDark);
  mouseSnout.rotation.z = -Math.PI / 2;
  mouseSnout.position.set(0.1 * S, 0.005 * S, 0);
  mouseGroup.add(mouseSnout);
  [1, -1].forEach((s) => {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.016 * S, 8, 8), stoneDark);
    ear.scale.set(1, 1, 0.4);
    ear.position.set(0.06 * S, 0.035 * S, s * 0.025 * S);
    mouseGroup.add(ear);
  });
  const mouseTail = segmentBetween(
    new THREE.Vector3(-0.06 * S, 0, 0),
    new THREE.Vector3(-0.18 * S, 0.01 * S, 0.02 * S),
    0.004 * S, 0.008 * S, 6, stoneDark
  );
  mouseGroup.add(mouseTail);
  mouseGroup.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  mouseGroup.position.set(0.3 * S, 0.1 * S, 0.24 * S);
  mouseGroup.rotation.y = -0.5;
  group.add(mouseGroup);
  parts.push(mouseGroup);

  // =========================================================
  // finalize
  // =========================================================
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  scene.add(group);

  return {
    group,
    dispose() {
      scene.remove(group);
      parts.forEach((p) => {
        p.traverse ? p.traverse((o) => {
          if (o.isMesh) {
            o.geometry.dispose();
          }
        }) : (p.geometry && p.geometry.dispose());
      });
      colorTex.dispose();
      bumpTex.dispose();
      [stone, stoneDark, stoneGilt, ivory].forEach((m) => m.dispose());
    },
  };
}

const ROOM_W = 6;      // east-west
const ROOM_D = 6.5;    // north-south
const ROOM_H = 2.9;
const DOOR_GAP = 1.6;  // must match corridor width

export function createRoom7(scene, engine, doorX, doorZ) {
  const colliders = [];
  const flames = [];   // { flame, light, baseIntensity, phase }
  let bellNode = null;
  const bellPhase = Math.random() * 10;

  const centerX = doorX + ROOM_W / 2;
  const centerZ = doorZ;
  const westX = centerX - ROOM_W / 2; // == doorX
  const eastX = centerX + ROOM_W / 2;

  // ---------- floor ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    createFloorMaterial(ROOM_W / 2, ROOM_D / 2)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(centerX, 0, centerZ);
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling + beams ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ color: 0x18140f, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x2e2013, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.17, ROOM_D), beamMat);
    beam.position.set(centerX + i * (ROOM_W / 3), ROOM_H - 0.1, centerZ);
    beam.castShadow = true;
    scene.add(beam);
  }

  // ---------- walls ----------
  const wallMat = createWallMaterial();
  const t = 0.2;

  function addWallBox(cx, cz, w, d, h = ROOM_H, cy = h / 2) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    colliders.push(box);
    engine.addCollider(box);
    return mesh;
  }

  // north wall — solid, no window
  addWallBox(centerX, centerZ - ROOM_D / 2, ROOM_W + t, t);
  // south wall — solid, no window
  addWallBox(centerX, centerZ + ROOM_D / 2, ROOM_W + t, t);
  // east wall — solid, dead end of this wing (shrine sits against it)
  addWallBox(eastX, centerZ, t, ROOM_D + t);

  // west wall — doorway gap in the middle, aligned with the corridor from room6
  const westSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(westX, centerZ - (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ + (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // =========================================================
  // ---------- PUJA SHRINE (mandir) against the east wall ----------
  // =========================================================

  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.4 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xcda434, roughness: 0.3, metalness: 0.7 });
  const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xb5502e, roughness: 0.6 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0xd6482f, roughness: 0.8 });
  const clothTrimMat = new THREE.MeshStandardMaterial({ color: 0xf2b90c, roughness: 0.8 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xb08d3e, roughness: 0.4, metalness: 0.6 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2515, roughness: 0.8 });
  const flameMat = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8c1a, emissiveIntensity: 1.3 });

  // Platform footprint: depth (X, how far it sticks out from the wall) and width (Z)
  const shrineDepth = 1.4;
  const shrineWidth = 3.0;
  const platformH = 0.35;
  const platX = eastX - t / 2 - shrineDepth / 2;
  const platZ = centerZ;
  const frontX = platX - shrineDepth / 2; // west (front) edge of the platform

  // Platform
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(shrineDepth, platformH, shrineWidth),
    marbleMat
  );
  platform.position.set(platX, platformH / 2, platZ);
  platform.castShadow = true;
  platform.receiveShadow = true;
  scene.add(platform);
  {
    const box = new THREE.Box3().setFromObject(platform);
    colliders.push(box);
    engine.addCollider(box);
  }

  // Two pillars near the front edge, holding up the canopy
  const pillarH = 1.7;
  const pillarX = frontX + 0.15;
  const pillarGeo = new THREE.CylinderGeometry(0.09, 0.09, pillarH, 12);
  [platZ - shrineWidth / 2 + 0.3, platZ + shrineWidth / 2 - 0.3].forEach((pz) => {
    const pillar = new THREE.Mesh(pillarGeo, goldMat);
    pillar.position.set(pillarX, platformH + pillarH / 2, pz);
    pillar.castShadow = true;
    scene.add(pillar);
  });

  // Shallow terracotta backdrop niche on the wall
  const niche = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.9, shrineWidth - 0.3),
    terracottaMat
  );
  niche.position.set(eastX - t / 2 - 0.04, platformH + 0.95, platZ);
  scene.add(niche);

  // Tiered shikhara (temple tower) rising above the back of the platform
  const towerX = eastX - t / 2 - 0.35;
  let tierY = platformH + 1.9;
  const tierMats = [terracottaMat, goldMat, terracottaMat];
  for (let i = 0; i < 3; i++) {
    const r = 0.85 * (1 - i * 0.28);
    const h = 0.55 - i * 0.1;
    const tier = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), tierMats[i]);
    tier.position.set(towerX, tierY + h / 2, platZ);
    tier.castShadow = true;
    scene.add(tier);
    tierY += h * 0.7;
  }
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), goldMat);
  finial.position.set(towerX, tierY + 0.1, platZ);
  scene.add(finial);

  // Cloth canopy between the pillars
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, shrineWidth - 0.2), clothMat);
  canopy.position.set(pillarX, platformH + pillarH + 0.03, platZ);
  scene.add(canopy);
  const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, shrineWidth - 0.2), clothTrimMat);
  canopyTrim.position.set(pillarX, platformH + pillarH - 0.02, platZ);
  scene.add(canopyTrim);

  // ---- Lord Ganesh: detailed carved-stone idol (see ganeshIdol.js) ----
  // rotationY = -PI/2 turns the idol's front (its local +Z) to face west (-X),
  // i.e. toward the doorway, so it looks at the player as they walk in.
  const ganesh = createGaneshIdol(scene, {
    x: pillarX + 0.6,
    y: platformH,
    z: platZ,
    scale: 1.0,
    rotationY: -Math.PI / 2,
  });
  // the idol is decorative, but give it a collider so the player can't walk through it
  {
    const box = new THREE.Box3().setFromObject(ganesh.group);
    colliders.push(box);
    engine.addCollider(box);
  }

  // Brass bell hanging from the middle beam, in front of the shrine
  bellNode = new THREE.Group();
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 6), brassMat);
  chain.position.y = -0.25;
  bellNode.add(chain);
  const bellBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.11, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.65),
    brassMat
  );
  bellBody.position.y = -0.55;
  bellNode.add(bellBody);
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), brassMat);
  clapper.position.y = -0.66;
  bellNode.add(clapper);
  bellNode.position.set(pillarX + 0.6, ROOM_H - 0.15, platZ);
  scene.add(bellNode);

  // Brass kalash (pot with coconut + mango leaves) beside the shrine
  function addKalash(x, z) {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), brassMat);
    pot.scale.y = 1.15;
    pot.position.y = 0.14;
    g.add(pot);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.08, 10), brassMat);
    neck.position.y = 0.28;
    g.add(neck);
    const coconut = new THREE.Mesh(
      new THREE.SphereGeometry(0.075, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0x5b3a1f, roughness: 0.9 })
    );
    coconut.position.y = 0.36;
    g.add(coconut);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e6b2e, roughness: 0.7 });
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.14, 4), leafMat);
      leaf.position.set(Math.cos(ang) * 0.03, 0.42, Math.sin(ang) * 0.03);
      leaf.rotation.z = Math.cos(ang) * 0.3;
      leaf.rotation.x = Math.sin(ang) * 0.3;
      g.add(leaf);
    }
    g.position.set(x, platformH, z);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(g);
  }
  addKalash(pillarX + 0.15, platZ - shrineWidth / 2 + 0.35);

  // Diyas (oil lamps) with a small flickering flame + point light
  function addDiya(x, y, z, intensity) {
    const g = new THREE.Group();
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.03, 12), terracottaMat);
    g.add(dish);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 8), flameMat);
    flame.position.y = 0.04;
    g.add(flame);
    const light = new THREE.PointLight(0xffa64d, intensity, 2.2, 2);
    light.position.y = 0.06;
    g.add(light);
    g.position.set(x, y, z);
    scene.add(g);
    flames.push({ flame, light, baseIntensity: intensity, phase: Math.random() * 10 });
  }
  addDiya(frontX + 0.2, platformH + 0.02, platZ - shrineWidth / 2 + 0.15, 0.7);
  addDiya(frontX + 0.2, platformH + 0.02, platZ + shrineWidth / 2 - 0.15, 0.7);
  addDiya(pillarX + 0.9, platformH + 0.02, platZ, 0.5);

  // Incense stick with a small glowing tip
  const incenseHolder = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 8), brassMat);
  incenseHolder.position.set(frontX + 0.35, platformH + 0.03, platZ + 0.05);
  scene.add(incenseHolder);
  const incenseStick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.003, 0.003, 0.3, 5),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2a })
  );
  incenseStick.position.set(0, 0.16, 0);
  incenseStick.rotation.z = 0.15;
  incenseHolder.add(incenseStick);
  const incenseTip = new THREE.Mesh(
    new THREE.SphereGeometry(0.006, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0xff4d1a, emissive: 0xff2200, emissiveIntensity: 2 })
  );
  incenseTip.position.set(0.045, 0.3, 0);
  incenseHolder.add(incenseTip);

  // Low wooden offering table (chowki) with a brass thali plate
  const chowkiX = frontX - 0.45;
  const chowki = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.5), woodMat);
  chowki.position.set(chowkiX, 0.09, platZ);
  chowki.castShadow = true;
  chowki.receiveShadow = true;
  scene.add(chowki);
  const thali = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16), brassMat);
  thali.position.set(chowkiX, 0.19, platZ);
  scene.add(thali);

  // Scattered marigold-style flower petals near the platform
  const petalMat1 = new THREE.MeshStandardMaterial({ color: 0xf2a10c, roughness: 0.8 });
  const petalMat2 = new THREE.MeshStandardMaterial({ color: 0xe6472a, roughness: 0.8 });
  for (let i = 0; i < 14; i++) {
    const petal = new THREE.Mesh(
      new THREE.SphereGeometry(0.025 + Math.random() * 0.02, 6, 6),
      i % 2 === 0 ? petalMat1 : petalMat2
    );
    petal.scale.y = 0.4;
    const rx = frontX - 1.0 + Math.random() * 1.6;
    const rz = platZ - shrineWidth / 2 + 0.3 + Math.random() * (shrineWidth - 0.6);
    petal.position.set(rx, 0.012, rz);
    petal.rotation.y = Math.random() * Math.PI;
    scene.add(petal);
  }

  // Rangoli floor pattern (concentric colored rings) in front of the shrine
  const rangoliCX = frontX - 0.9;
  const rangoliColors = [0xd6482f, 0xf2b90c, 0xffffff, 0x2e6b2e];
  for (let i = 0; i < rangoliColors.length; i++) {
    const outerR = 0.55 - i * 0.13;
    const innerR = Math.max(outerR - 0.11, 0.02);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(innerR, outerR, 32),
      new THREE.MeshStandardMaterial({ color: rangoliColors[i], roughness: 0.9, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(rangoliCX, 0.005 + i * 0.001, platZ);
    scene.add(ring);
  }

  // Sandals left just inside the doorway (shoes-off custom)
  const sandalMat = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.9 });
  [-0.12, 0.12].forEach((offset) => {
    const sandal = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.02, 0.26), sandalMat);
    sandal.position.set(westX + 0.5, 0.01, centerZ + offset);
    scene.add(sandal);
  });

  // Woven mat (asana) in front of the chowki, for sitting during prayer
  const mat = new THREE.Mesh(
    new THREE.PlaneGeometry(0.6, 0.9),
    new THREE.MeshStandardMaterial({ color: 0x8a4a2a, roughness: 1 })
  );
  mat.rotation.x = -Math.PI / 2;
  mat.position.set(frontX - 1.35, 0.008, platZ);
  scene.add(mat);

  // ---------- per-frame update: diya flames flicker, bell sways gently ----------
  function update(dt) {
    const time = performance.now() / 1000;
    for (const f of flames) {
      const flick = 0.75 + Math.sin(time * 9 + f.phase) * 0.15 + Math.sin(time * 23 + f.phase) * 0.1;
      f.flame.scale.set(flick, 0.85 + flick * 0.3, flick);
      f.light.intensity = f.baseIntensity * flick;
    }
    if (bellNode) {
      bellNode.rotation.z = Math.sin(time * 0.8 + bellPhase) * 0.03;
    }
  }

  return { colliders, update, centerX, centerZ, westX, eastX };
}

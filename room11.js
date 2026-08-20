// room11.js — ROOM 11: a walled-off servant's quarter of the haveli, reached via a
// corridor running west from room3's west doorway.
// East wall has a doorway gap matching the corridor width (entrance from room3).
// North/south/west walls remain solid, no window — a second forgotten pocket
// on the far side of room3's mirror, mirroring room10 across the house.

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

// =========================================================
// Trishul (Shiva's trident) builder — modeled after a traditional ritual
// trishul: two outward-curving "buffalo horn" blades flanking a tall
// straight center spear-blade, all flat and coplanar like a real forged
// head, rising from an ornate blackened-bronze junction. A wooden damaru
// (hourglass drum) hangs just below the head, tied on with a rudraksha
// mala loop and saffron/white cloth streamers with small brass tassels,
// all mounted on a dark wood staff with metal ferrules. Self-contained.
// (Moved here from room7.js so the trishul now spawns in room11 instead.)
// =========================================================

// Builds a flat, tapering blade outline from a 2D centerline + half-width
// profile, returning a THREE.Shape (base at local origin, blade rising
// toward +Y, curving in X as the centerline dictates).
function buildBladeShape(centerPts, halfWidths) {
  const left = [];
  const right = [];
  for (let i = 0; i < centerPts.length; i++) {
    const p = centerPts[i];
    const prev = centerPts[Math.max(i - 1, 0)];
    const next = centerPts[Math.min(i + 1, centerPts.length - 1)];
    const tangent = new THREE.Vector2().subVectors(next, prev);
    if (tangent.lengthSq() < 1e-8) tangent.set(0, 1);
    tangent.normalize();
    const normal = new THREE.Vector2(-tangent.y, tangent.x);
    const hw = halfWidths[i];
    left.push(new THREE.Vector2(p.x + normal.x * hw, p.y + normal.y * hw));
    right.push(new THREE.Vector2(p.x - normal.x * hw, p.y - normal.y * hw));
  }
  const shape = new THREE.Shape();
  shape.moveTo(left[0].x, left[0].y);
  for (let i = 1; i < left.length; i++) shape.lineTo(left[i].x, left[i].y);
  for (let i = right.length - 1; i >= 0; i--) shape.lineTo(right[i].x, right[i].y);
  shape.closePath();
  return shape;
}

function makeBladeMesh(centerPts, halfWidths, thickness, material) {
  const shape = buildBladeShape(centerPts, halfWidths);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: thickness * 0.35,
    bevelSize: thickness * 0.3,
    bevelSegments: 1,
    steps: 1,
  });
  geo.translate(0, 0, -thickness / 2);
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createTrishul(scene, opts = {}) {
  const {
    x = 0,
    y = 0,
    z = 0,
    scale = 1,
    rotationY = 0,
    tilt = 0, // slight lean, radians
  } = opts;

  const group = new THREE.Group();
  const S = scale;

  const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x3f392e, roughness: 0.5, metalness: 0.6 });
  const bronzeDarkMat = new THREE.MeshStandardMaterial({ color: 0x211d17, roughness: 0.7, metalness: 0.4 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2f18, roughness: 0.85, metalness: 0.05 });
  const beadMat = new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 0.7 });
  const saffronMat = new THREE.MeshStandardMaterial({ color: 0xd9701f, roughness: 0.9 });
  const whiteClothMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.9 });
  const bellMat = new THREE.MeshStandardMaterial({ color: 0xb08d3e, roughness: 0.35, metalness: 0.7 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a4844, roughness: 0.7 });

  const parts = [];
  function add(mesh, mat) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    parts.push(mesh);
    return mesh;
  }

  // ---- small stone/brass stand the staff is planted in ----
  const standH = 0.14 * S;
  const stand = add(new THREE.Mesh(new THREE.CylinderGeometry(0.1 * S, 0.13 * S, standH, 12), stoneMat));
  stand.position.set(0, standH / 2, 0);
  const standCollar = add(new THREE.Mesh(new THREE.TorusGeometry(0.05 * S, 0.011 * S, 8, 16), bronzeMat));
  standCollar.rotation.x = Math.PI / 2;
  standCollar.position.set(0, standH + 0.005 * S, 0);

  // ---- long dark-wood staff (danda) with metal ferrules top & bottom ----
  const staffH = 1.5 * S;
  const staffR = 0.02 * S;
  const staffBaseY = standH;
  const headY = staffBaseY + staffH; // where the bronze head sits

  const staff = add(new THREE.Mesh(new THREE.CylinderGeometry(staffR * 0.9, staffR * 1.15, staffH, 10), woodMat));
  staff.position.set(0, staffBaseY + staffH / 2, 0);

  const bottomFerrule = add(new THREE.Mesh(new THREE.CylinderGeometry(staffR * 1.25, staffR * 1.35, 0.05 * S, 10), bronzeMat));
  bottomFerrule.position.set(0, staffBaseY + 0.03 * S, 0);
  const topFerrule = add(new THREE.Mesh(new THREE.CylinderGeometry(staffR * 1.1, staffR * 1.2, 0.045 * S, 10), bronzeMat));
  topFerrule.position.set(0, headY - 0.03 * S, 0);

  // =========================================================
  // DAMARU: small hourglass hand-drum tied just below the head
  // =========================================================
  const damaruY = headY - 0.22 * S;
  const damaruBaseR = 0.05 * S;
  const damaruWaistR = 0.016 * S;
  const damaruHalfH = 0.045 * S;
  const damaruTop = add(new THREE.Mesh(new THREE.CylinderGeometry(damaruBaseR, damaruWaistR, damaruHalfH, 12), woodMat));
  damaruTop.position.set(0, damaruY + damaruHalfH / 2, 0);
  const damaruBottom = add(new THREE.Mesh(new THREE.CylinderGeometry(damaruWaistR, damaruBaseR, damaruHalfH, 12), woodMat));
  damaruBottom.position.set(0, damaruY - damaruHalfH / 2, 0);
  [damaruY + damaruHalfH, damaruY - damaruHalfH, damaruY].forEach((ry, i) => {
    const ring = add(new THREE.Mesh(new THREE.TorusGeometry(i === 2 ? damaruWaistR : damaruBaseR, 0.006 * S, 6, 14), bronzeDarkMat));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, ry, 0);
  });
  // two tiny knotted tassel-weights dangling from the waist cord, as on a real damaru
  [-1, 1].forEach((s) => {
    const thread = add(new THREE.Mesh(new THREE.CylinderGeometry(0.003 * S, 0.003 * S, 0.05 * S, 5), bronzeDarkMat));
    thread.position.set(s * 0.03 * S, damaruY - 0.02 * S, 0.02 * S);
    thread.rotation.z = s * 0.5;
    const knot = add(new THREE.Mesh(new THREE.SphereGeometry(0.01 * S, 6, 6), bellMat));
    knot.position.set(s * 0.05 * S, damaruY - 0.045 * S, 0.03 * S);
  });

  // =========================================================
  // RUDRAKSHA MALA: a loop of small dark beads draped below the damaru
  // =========================================================
  const malaTopY = damaruY - damaruHalfH - 0.01 * S;
  const malaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.025 * S, malaTopY, 0.02 * S),
    new THREE.Vector3(0.11 * S, malaTopY - 0.16 * S, 0.07 * S),
    new THREE.Vector3(0.06 * S, malaTopY - 0.32 * S, 0.05 * S),
    new THREE.Vector3(-0.06 * S, malaTopY - 0.32 * S, -0.05 * S),
    new THREE.Vector3(-0.11 * S, malaTopY - 0.16 * S, -0.07 * S),
    new THREE.Vector3(-0.025 * S, malaTopY, -0.02 * S),
  ]);
  const malaPts = malaCurve.getPoints(20);
  malaPts.forEach((p) => {
    const bead = add(new THREE.Mesh(new THREE.SphereGeometry(0.009 * S, 6, 6), beadMat));
    bead.position.copy(p);
  });

  // =========================================================
  // CLOTH: saffron wrap around the staff with hanging streamers, plus one
  // white strip, each tipped with a tiny brass tassel bell
  // =========================================================
  const clothY = malaTopY - 0.4 * S;
  const clothWrap = add(new THREE.Mesh(new THREE.CylinderGeometry(staffR * 1.7, staffR * 1.7, 0.09 * S, 10), saffronMat));
  clothWrap.position.set(0, clothY, 0);
  const clothTie = add(new THREE.Mesh(new THREE.TorusGeometry(staffR * 1.75, 0.006 * S, 6, 14), bronzeDarkMat));
  clothTie.rotation.x = Math.PI / 2;
  clothTie.position.set(0, clothY + 0.05 * S, 0);

  function addStreamer(mat, offsetX, offsetZ, length, bend) {
    const strip = new THREE.Group();
    const seg1 = new THREE.Mesh(new THREE.BoxGeometry(0.035 * S, length * 0.55, 0.004 * S), mat);
    seg1.position.set(0, -length * 0.275, 0);
    strip.add(seg1);
    const seg2 = new THREE.Mesh(new THREE.BoxGeometry(0.028 * S, length * 0.45, 0.004 * S), mat);
    seg2.position.set(0, -length * 0.55 - length * 0.225, 0);
    seg2.rotation.z = bend;
    strip.add(seg2);
    const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.014 * S, 8, 8), bellMat);
    tassel.position.set(Math.sin(bend) * length * 0.45, -length * 0.55 - length * 0.45 * Math.cos(bend), 0);
    strip.add(tassel);
    strip.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    strip.position.set(offsetX, clothY - 0.03 * S, offsetZ);
    group.add(strip);
    parts.push(strip);
  }
  addStreamer(saffronMat, 0.02 * S, 0.015 * S, 0.42 * S, 0.15);
  addStreamer(whiteClothMat, -0.015 * S, -0.01 * S, 0.36 * S, -0.2);
  addStreamer(saffronMat, -0.03 * S, 0.02 * S, 0.3 * S, 0.3);

  // =========================================================
  // TRIDENT HEAD: ornate blackened-bronze junction with a tall straight
  // center spear-blade and two outward-curving "buffalo horn" blades,
  // all flat and forward-facing like a real forged trishul head.
  // =========================================================
  const ballR = 0.065 * S;
  const ball = add(new THREE.Mesh(new THREE.SphereGeometry(ballR, 14, 10), bronzeMat));
  ball.scale.set(1, 0.8, 0.75);
  ball.position.set(0, headY, 0);
  const ballCollar = add(new THREE.Mesh(new THREE.TorusGeometry(ballR * 0.85, 0.01 * S, 8, 16), bronzeDarkMat));
  ballCollar.rotation.x = Math.PI / 2;
  ballCollar.position.set(0, headY - ballR * 0.55, 0);

  const bladeBaseY = headY + ballR * 0.4;
  const thickness = 0.016 * S;

  // center spear-blade: straight, tall, sharply pointed
  const centerPts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0, 0.045 * S),
    new THREE.Vector2(0, 0.16 * S),
    new THREE.Vector2(0, 0.32 * S),
    new THREE.Vector2(0, 0.44 * S),
    new THREE.Vector2(0, 0.52 * S),
  ];
  const centerHw = [0.022 * S, 0.03 * S, 0.022 * S, 0.014 * S, 0.006 * S, 0.0];
  const centerBlade = makeBladeMesh(centerPts, centerHw, thickness, bronzeMat);
  centerBlade.position.set(0, bladeBaseY, 0);
  group.add(centerBlade);
  parts.push(centerBlade);

  // outer horn blades: curve outward then hook back in near the tip
  [1, -1].forEach((sign) => {
    const hornPts = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(sign * 0.05 * S, 0.05 * S),
      new THREE.Vector2(sign * 0.1 * S, 0.13 * S),
      new THREE.Vector2(sign * 0.125 * S, 0.22 * S),
      new THREE.Vector2(sign * 0.12 * S, 0.3 * S),
      new THREE.Vector2(sign * 0.09 * S, 0.36 * S),
      new THREE.Vector2(sign * 0.078 * S, 0.4 * S),
    ];
    const hornHw = [0.024 * S, 0.022 * S, 0.018 * S, 0.013 * S, 0.008 * S, 0.004 * S, 0.0];
    const horn = makeBladeMesh(hornPts, hornHw, thickness, bronzeMat);
    horn.position.set(0, bladeBaseY, 0);
    group.add(horn);
    parts.push(horn);

    // small decorative carved bead where the horn meets the junction ball
    const bead = add(new THREE.Mesh(new THREE.SphereGeometry(0.022 * S, 8, 8), bronzeDarkMat));
    bead.scale.set(1, 0.8, 0.8);
    bead.position.set(sign * 0.035 * S, bladeBaseY + 0.01 * S, 0);
  });

  // ---- finalize ----
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  group.rotation.z = tilt;
  scene.add(group);

  return {
    group,
    dispose() {
      scene.remove(group);
      parts.forEach((p) => {
        p.traverse ? p.traverse((o) => { if (o.isMesh) o.geometry.dispose(); }) : (p.geometry && p.geometry.dispose());
      });
    },
  };
}

const ROOM_W = 4.5; // east-west
const ROOM_D = 5; // north-south
const ROOM_H = 2.6; // lowest ceiling in the house — a cramped, sealed-off room

const DOOR_GAP = 1.6; // must match corridor width

// doorX: the x coordinate where room11's east wall (and doorway) sits —
// this is corridor11.endX, so the door lines up exactly with the passage.
// doorZ: the z coordinate of the doorway, matching the corridor's z (room3's west door).
export function createRoom11(scene, engine, doorX, doorZ) {
  const colliders = [];

  // room center sits further west (more negative x) than its east doorway
  const centerX = doorX - ROOM_W / 2;
  const centerZ = doorZ;

  // ---------- floor: old, dirty tiles ----------
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
    new THREE.MeshStandardMaterial({ color: 0x120f0b, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(centerX, ROOM_H, centerZ);
  scene.add(ceiling);

  const beamMat = new THREE.MeshStandardMaterial({ color: 0x261a0f, roughness: 0.9 });
  for (let i = -1; i <= 1; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, ROOM_D), beamMat);
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

  const eastX = centerX + ROOM_W / 2; // == doorX
  const westX = centerX - ROOM_W / 2;

  // north wall — solid, no window
  addWallBox(centerX, centerZ - ROOM_D / 2, ROOM_W + t, t);
  // south wall — solid, no window
  addWallBox(centerX, centerZ + ROOM_D / 2, ROOM_W + t, t);
  // west wall — solid, dead end of this wing
  addWallBox(westX, centerZ, t, ROOM_D + t);

  // east wall — doorway gap in the middle, aligned with the corridor from room3
  const eastSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(eastX, centerZ - (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ + (DOOR_GAP / 2 + eastSideLen / 2), t, eastSideLen);
  addWallBox(eastX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // ---------- furnishing: a low charpai frame with a torn, folded mattress ----------
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x2f2013, roughness: 0.88 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.95 });

  const cotGroup = new THREE.Group();
  const legPositions = [
    [-0.6, -0.75], [0.6, -0.75], [-0.6, 0.75], [0.6, 0.75],
  ];
  legPositions.forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.4, 8), woodMat);
    leg.position.set(lx, 0.2, lz);
    leg.castShadow = true;
    cotGroup.add(leg);
  });
  const frameSideA = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.6), woodMat);
  frameSideA.position.set(-0.6, 0.4, 0);
  const frameSideB = frameSideA.clone(); frameSideB.position.x = 0.6;
  const frameEndA = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.05, 0.05), woodMat);
  frameEndA.position.set(0, 0.4, -0.78);
  const frameEndB = frameEndA.clone(); frameEndB.position.z = 0.78;
  cotGroup.add(frameSideA, frameSideB, frameEndA, frameEndB);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 1.5), clothMat);
  mattress.position.set(0, 0.46, 0);
  mattress.castShadow = mattress.receiveShadow = true;
  cotGroup.add(mattress);
  cotGroup.position.set(westX + 1.1, 0, centerZ - 1.0);
  cotGroup.rotation.y = -0.1;
  scene.add(cotGroup);
  const cotBox = new THREE.Box3().setFromObject(cotGroup);
  cotBox.min.y = 0; cotBox.max.y = 0.55; // low collider so it just blocks walking through
  colliders.push(cotBox);
  engine.addCollider(cotBox);

  // ---------- Trishul: leaning upright in the far corner of the room,
  // as if left behind by whoever last used this quarter ----------
  const trishul = createTrishul(scene, {
    x: westX + 0.6,
    y: 0,
    z: centerZ + ROOM_D / 2 - 0.6,
    scale: 0.85,
    rotationY: Math.PI * 0.6, // angle the blade face toward the doorway/room interior
    tilt: -0.05,
  });
  const trishulBox = new THREE.Box3().setFromObject(trishul.group);
  colliders.push(trishulBox);
  engine.addCollider(trishulBox);

  // Player can pick the trishul up (E), carry it as a hand-held viewmodel
  // (shrunk down via holdScale so it doesn't look absurd up close), and
  // drop it again (G) — dropping pops it back to full size and re-registers
  // it as a normal world pickup, same pattern as every other held item.
  const trishulEntry = engine.addInteractable(trishul.group, {
    radius: 2.2,
    prompt: "Pick Up Trishul",
    onInteract: () => {
      engine.removeInteractable(trishulEntry);
      engine.removeCollider(trishulBox);
      scene.remove(trishul.group);
      engine.pickupItem({
        id: "trishul",
        mesh: trishul.group,
        prompt: "Trishul",
        holdOffset: new THREE.Vector3(0.32, -0.3, -0.6),
        holdScale: 0.32,
        throwable: false,
      });
    },
  });

  // ---------- per-frame update: no scene lights anymore — player relies on the flashlight ----------
  function update() {
    // intentionally static
  }

  return { colliders, update, centerX, centerZ, eastX, westX };
}

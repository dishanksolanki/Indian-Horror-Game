// room7.js — ROOM 7: the haveli's puja (prayer) room, reached via a corridor
// running east from room6's east doorway.
// West wall has a doorway gap matching the corridor width (entrance from room6).
// North/south/east walls remain solid, no window — this is the dead end of this wing.
// The east wall (facing the entrance) holds a small household shrine (mandir).

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";
// =========================================================
// Shiv Ling (Shivling) builder — a smooth, aniconic stone form of Lord Shiva
// resting in a circular yoni/pindika base, with a small spout, a coiled
// stone naga (serpent), a trickle of water, bilva leaves, and bael/flower
// offerings scattered around it. Self-contained: builds its own procedural
// stone texture so it reads as one weathered, polished block of temple stone.
// =========================================================

function buildStoneTextures() {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // base tone: dark, water-polished basalt
  ctx.fillStyle = "#4a4844";
  ctx.fillRect(0, 0, size, size);

  // layered speckle/grain noise for a carved, mineral-flecked stone look
  for (let i = 0; i < 22000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.6 + 0.2;
    const shade = Math.random();
    const c = shade < 0.5
      ? `rgba(20,18,16,${0.05 + Math.random() * 0.12})`
      : `rgba(150,146,132,${0.03 + Math.random() * 0.08})`;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // faint veining
  ctx.strokeStyle = "rgba(15,14,12,0.18)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
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

  // damp/wet sheen patches (a Shivling is traditionally kept wet from abhishekam)
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 30 + Math.random() * 70;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, "rgba(210,215,220,0.06)");
    grad.addColorStop(1, "rgba(210,215,220,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const colorTex = new THREE.CanvasTexture(canvas);
  colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.repeat.set(2, 2);

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
    bumpScale: 0.012,
    color: tint,
    roughness: 0.5,
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

function createShivLing(scene, opts = {}) {
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
  const stonePolished = makeStoneMaterial(colorTex, bumpTex, 0x3f3d3a, { roughness: 0.35, metalness: 0.05 });
  const stoneMatte = makeStoneMaterial(colorTex, bumpTex, 0x5a564c, { roughness: 0.75 });
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xb08d3e, roughness: 0.4, metalness: 0.7 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e6b2e, roughness: 0.7 });
  const waterMat = new THREE.MeshStandardMaterial({ color: 0xbcd8e0, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.55 });

  const parts = [];
  function add(mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    parts.push(mesh);
    return mesh;
  }

  // =========================================================
  // PEDESTAL: square/octagonal stone plinth the whole altar sits on
  // =========================================================
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * S, 0.56 * S, 0.1 * S, 8), stoneMatte);
  plinth.position.set(0, 0.05 * S, 0);
  add(plinth);

  // =========================================================
  // YONI / PINDIKA: the circular base with a spout (pranala) on one side —
  // this is the traditional platform the lingam rises from
  // =========================================================
  const yoniBaseY = 0.1 * S;
  const yoniBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * S, 0.46 * S, 0.16 * S, 24), stonePolished);
  yoniBase.position.set(0, yoniBaseY + 0.08 * S, 0);
  add(yoniBase);

  // gentle rim lip around the top of the yoni base
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42 * S, 0.03 * S, 10, 28), stonePolished);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(0, yoniBaseY + 0.16 * S, 0);
  add(rim);

  // the spout (pranala) — a small tapered channel projecting from one side,
  // where water/milk offerings drain away
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * S, 0.08 * S, 0.28 * S, 10), stonePolished);
  spout.rotation.z = Math.PI / 2;
  spout.position.set(0.5 * S, yoniBaseY + 0.16 * S, 0);
  add(spout);
  const spoutLip = new THREE.Mesh(new THREE.TorusGeometry(0.045 * S, 0.012 * S, 8, 12), stonePolished);
  spoutLip.rotation.y = Math.PI / 2;
  spoutLip.position.set(0.64 * S, yoniBaseY + 0.16 * S, 0);
  add(spoutLip);

  // =========================================================
  // LINGAM: the smooth, rounded vertical stone form — the domed top is
  // gently egg-shaped (a cylindrical shaft rising into a rounded crown)
  // =========================================================
  const lingamBaseY = yoniBaseY + 0.16 * S;
  const shaftH = 0.42 * S;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.17 * S, 0.19 * S, shaftH, 24), stonePolished);
  shaft.position.set(0, lingamBaseY + shaftH / 2, 0);
  add(shaft);

  // rounded dome crown, slightly egg-shaped rather than a perfect sphere
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.17 * S, 24, 20), stonePolished);
  dome.scale.set(1, 1.25, 1);
  dome.position.set(0, lingamBaseY + shaftH + 0.13 * S, 0);
  add(dome);
  const domeTip = new THREE.Mesh(new THREE.SphereGeometry(0.03 * S, 10, 10), stonePolished);
  domeTip.position.set(0, lingamBaseY + shaftH + 0.32 * S, 0);
  add(domeTip);

  // subtle horizontal facet lines low on the shaft (traditional three-part
  // division: brahma-bhaga square base under the yoni, vishnu-bhaga octagonal
  // middle, and rudra-bhaga rounded top which is the visible dome) — here we
  // just suggest a soft ring where the shaft meets the yoni collar
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.19 * S, 0.02 * S, 8, 24), stoneMatte);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, lingamBaseY + 0.03 * S, 0);
  add(collar);

  // =========================================================
  // NAGA: a small coiled stone serpent draped around the base of the lingam,
  // hood raised behind the crown — traditional guardian imagery
  // =========================================================
  const nagaGroup = new THREE.Group();
  const coilCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.19 * S, lingamBaseY + 0.05 * S, 0),
    new THREE.Vector3(0.1 * S, lingamBaseY + 0.1 * S, 0.17 * S),
    new THREE.Vector3(-0.12 * S, lingamBaseY + 0.18 * S, 0.12 * S),
    new THREE.Vector3(-0.18 * S, lingamBaseY + 0.28 * S, -0.05 * S),
    new THREE.Vector3(-0.05 * S, lingamBaseY + 0.36 * S, -0.16 * S),
    new THREE.Vector3(0.08 * S, lingamBaseY + shaftH + 0.05 * S, -0.1 * S),
  ]);
  const coilPts = coilCurve.getPoints(20);
  for (let i = 0; i < coilPts.length - 1; i++) {
    const t = i / (coilPts.length - 2);
    const r = 0.028 * S * (1 - t * 0.55);
    const seg = segmentBetween(coilPts[i], coilPts[i + 1], Math.max(r, 0.008 * S), Math.max(r * 0.9, 0.008 * S), 8, stoneMatte);
    nagaGroup.add(seg);
  }
  // raised hood behind the lingam's crown
  const hood = new THREE.Mesh(new THREE.ConeGeometry(0.05 * S, 0.11 * S, 3), stoneMatte);
  hood.rotation.x = Math.PI;
  hood.position.copy(coilPts[coilPts.length - 1]).add(new THREE.Vector3(0, 0.05 * S, 0));
  nagaGroup.add(hood);
  const hoodHead = new THREE.Mesh(new THREE.SphereGeometry(0.025 * S, 8, 8), stoneMatte);
  hoodHead.position.copy(coilPts[coilPts.length - 1]).add(new THREE.Vector3(0, 0.1 * S, 0.02 * S));
  nagaGroup.add(hoodHead);
  nagaGroup.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  group.add(nagaGroup);
  parts.push(nagaGroup);

  // =========================================================
  // A thin trickle of water down one side of the lingam (abhishekam)
  // =========================================================
  const trickle = new THREE.Mesh(new THREE.CylinderGeometry(0.012 * S, 0.008 * S, shaftH + 0.2 * S, 8), waterMat);
  trickle.position.set(0.14 * S, lingamBaseY + (shaftH + 0.2 * S) / 2, 0.1 * S);
  add(trickle);
  const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.1 * S, 20), waterMat);
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(0.1 * S, yoniBaseY + 0.165 * S, 0.08 * S);
  add(puddle);

  // =========================================================
  // OFFERINGS: bilva (bael) leaves and marigold petals scattered on the
  // yoni base and around the pedestal, plus a small brass diya
  // =========================================================
  function bilvaLeaf(cx, cz, ang) {
    const leafGroup = new THREE.Group();
    for (let i = -1; i <= 1; i++) {
      const leaflet = new THREE.Mesh(new THREE.ConeGeometry(0.02 * S, 0.075 * S, 6), leafMat);
      leaflet.rotation.x = Math.PI;
      leaflet.position.set(i * 0.022 * S, 0.038 * S, 0);
      leafGroup.add(leaflet);
    }
    leafGroup.rotation.x = -Math.PI / 2;
    leafGroup.rotation.z = ang;
    leafGroup.position.set(cx, yoniBaseY + 0.165 * S, cz);
    leafGroup.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    group.add(leafGroup);
    parts.push(leafGroup);
  }
  bilvaLeaf(-0.12 * S, -0.16 * S, 0.4);
  bilvaLeaf(-0.22 * S, 0.05 * S, -0.6);
  bilvaLeaf(0.02 * S, -0.28 * S, 1.1);

  const petalMat1 = new THREE.MeshStandardMaterial({ color: 0xf2a10c, roughness: 0.8 });
  const petalMat2 = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  for (let i = 0; i < 10; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.018 * S + Math.random() * 0.012 * S, 6, 6), i % 2 === 0 ? petalMat1 : petalMat2);
    petal.scale.y = 0.4;
    const ang = Math.random() * Math.PI * 2;
    const rr = 0.2 * S + Math.random() * 0.2 * S;
    petal.position.set(Math.cos(ang) * rr, yoniBaseY + 0.163 * S, Math.sin(ang) * rr);
    petal.rotation.y = Math.random() * Math.PI;
    add(petal);
  }

  // small brass diya resting on the pedestal edge
  const diya = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * S, 0.038 * S, 0.025 * S, 12), brassMat);
  diya.position.set(-0.36 * S, 0.11 * S, 0.28 * S);
  add(diya);
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.016 * S, 0.05 * S, 8), new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8c1a, emissiveIntensity: 1.3 }));
  flame.position.set(-0.36 * S, 0.135 * S, 0.28 * S);
  add(flame);
  const flameLight = new THREE.PointLight(0xffa64d, 0.5, 1.8, 2);
  flameLight.position.set(-0.36 * S, 0.16 * S, 0.28 * S);
  group.add(flameLight);

  // =========================================================
  // finalize
  // =========================================================
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  scene.add(group);

  return {
    group,
    flame: { flame, light: flameLight, baseIntensity: 0.5, phase: Math.random() * 10 },
    dispose() {
      scene.remove(group);
      parts.forEach((p) => {
        p.traverse ? p.traverse((o) => {
          if (o.isMesh) o.geometry.dispose();
        }) : (p.geometry && p.geometry.dispose());
      });
      colorTex.dispose();
      bumpTex.dispose();
      [stonePolished, stoneMatte].forEach((m) => m.dispose());
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

  // ---- Shiv Ling: smooth stone lingam on a yoni/pindika base ----
  // rotationY orients the spout; here it points toward the room's open side.
  const shivLing = createShivLing(scene, {
    x: pillarX + 0.6,
    y: platformH,
    z: platZ,
    scale: 1.1,
    rotationY: -Math.PI / 2,
  });
  // decorative, but give it a collider so the player can't walk through it
  {
    const box = new THREE.Box3().setFromObject(shivLing.group);
    colliders.push(box);
    engine.addCollider(box);
  }
  // let its little offering diya flicker along with the rest of the shrine's flames
  flames.push(shivLing.flame);

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

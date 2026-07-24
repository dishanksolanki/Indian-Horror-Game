// room7.js — ROOM 7: the haveli's puja (prayer) room, reached via a corridor
// running east from room6's east doorway.
// West wall has a doorway gap matching the corridor width (entrance from room6).
// North/south/east walls remain solid, no window — this is the dead end of this wing.
// The east wall (facing the entrance) holds a small household shrine (mandir).

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";
import { createGaneshIdol } from "./ganeshIdol.js";

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

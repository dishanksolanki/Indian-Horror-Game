// room7.js — ROOM 7: the haveli's puja (prayer) room, reached via a corridor
// running east from room6's east doorway.
// West wall has a doorway gap matching the corridor width (entrance from room6).
// North/south/east walls remain solid, no window — this is the dead end of this wing.
// The east wall (facing the entrance) holds a small household shrine (mandir).

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 6;      // east-west
const ROOM_D = 6.5;    // north-south
const ROOM_H = 2.9;
const DOOR_GAP = 1.6;  // must match corridor width

// doorX: the x coordinate where room7's west wall (and doorway) sits —
// this is corridor6.endX, so the door lines up exactly with the passage.
// doorZ: the z coordinate of the doorway, matching the corridor's z (room6's east door).
export function createRoom7(scene, engine, doorX, doorZ) {
  const colliders = [];
  const animated = []; // things update() needs to touch each frame

  // room center sits further east (more positive x) than its west doorway
  const centerX = doorX + ROOM_W / 2;
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

  const westX = centerX - ROOM_W / 2; // == doorX
  const eastX = centerX + ROOM_W / 2;

  // north wall — solid, no window
  addWallBox(centerX, centerZ - ROOM_D / 2, ROOM_W + t, t);
  // south wall — solid, no window
  addWallBox(centerX, centerZ + ROOM_D / 2, ROOM_W + t, t);
  // east wall — solid, dead end of this wing (the shrine sits against it)
  addWallBox(eastX, centerZ, t, ROOM_D + t);

  // west wall — doorway gap in the middle, aligned with the corridor from room6
  const westSideLen = (ROOM_D - DOOR_GAP) / 2;
  addWallBox(westX, centerZ - (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ + (DOOR_GAP / 2 + westSideLen / 2), t, westSideLen);
  addWallBox(westX, centerZ, t, DOOR_GAP, 0.4, ROOM_H - 0.2); // lintel

  // =========================================================
  // ---------- PUJA SHRINE (mandir) against the east wall ----------
  // =========================================================

  const shrineGroup = new THREE.Group();
  scene.add(shrineGroup);

  // Materials
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.35, metalness: 0.05 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xcda434, roughness: 0.3, metalness: 0.8 });
  const terracottaMat = new THREE.MeshStandardMaterial({ color: 0xb5502e, roughness: 0.6 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0xd6482f, roughness: 0.8 }); // saffron/vermillion cloth
  const clothMat2 = new THREE.MeshStandardMaterial({ color: 0xf2b90c, roughness: 0.8 }); // yellow cloth trim
  const brassMat = new THREE.MeshStandardMaterial({ color: 0xb08d3e, roughness: 0.4, metalness: 0.7 });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2515, roughness: 0.8 });
  const flameMat = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff8c1a, emissiveIntensity: 1.4 });

  // Platform (chabutra) — raised stone base, set against east wall
  const platformW = 3.0;
  const platformD = 1.5;
  const platformH = 0.35;
  const platformCX = eastX - 0.06 - platformD / 2 - 0.55; // pushed in from the wall a bit (see below, adjusted)
  // Simpler: keep platform depth along X (protruding from east wall), width along Z
  const shrineDepth = 1.4;   // how far the platform sticks out from the east wall (along X)
  const shrineWidth = 3.0;   // along Z
  const platX = eastX - t / 2 - shrineDepth / 2;
  const platZ = centerZ;

  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(shrineDepth, platformH, shrineWidth),
    marbleMat
  );
  platform.position.set(platX, platformH / 2, platZ);
  platform.castShadow = true;
  platform.receiveShadow = true;
  shrineGroup.add(platform);
  {
    const box = new THREE.Box3().setFromObject(platform);
    colliders.push(box);
    engine.addCollider(box);
  }

  // Two pillars near the front (west) edge of the platform, holding up the canopy
  const pillarH = 1.7;
  const pillarR = 0.09;
  const pillarGeo = new THREE.CylinderGeometry(pillarR, pillarR, pillarH, 12);
  const pillarFrontX = platX - shrineDepth / 2 + 0.15;
  [platZ - shrineWidth / 2 + 0.3, platZ + shrineWidth / 2 - 0.3].forEach((pz) => {
    const pillar = new THREE.Mesh(pillarGeo, goldMat);
    pillar.position.set(pillarFrontX, platformH + pillarH / 2, pz);
    pillar.castShadow = true;
    shrineGroup.add(pillar);
  });

  // Back wall niche of the shrine — a shallow terracotta recess/backdrop
  const nicheBackdrop = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.9, shrineWidth - 0.3),
    terracottaMat
  );
  nicheBackdrop.position.set(eastX - t / 2 - 0.04, platformH + 0.95, platZ);
  shrineGroup.add(nicheBackdrop);

  // Tiered shikhara (temple tower) rising from the back of the platform, tucked to the wall
  const shikharaColors = [terracottaMat, goldMat, terracottaMat];
  let tierY = platformH + 1.9;
  const tierBaseR = 0.85;
  for (let i = 0; i < 3; i++) {
    const r = tierBaseR * (1 - i * 0.28);
    const h = 0.55 - i * 0.1;
    const tier = new THREE.Mesh(new THREE.ConeGeometry(r, h, 8), shikharaColors[i]);
    tier.position.set(eastX - t / 2 - 0.35, tierY + h / 2, platZ);
    tier.castShadow = true;
    shrineGroup.add(tier);
    tierY += h * 0.7;
  }
  // small gold finial (kalash-topped spire) at the very top
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 10), goldMat);
  finial.position.set(eastX - t / 2 - 0.35, tierY + 0.1, platZ);
  shrineGroup.add(finial);

  // Cloth canopy/valance draped between the two pillars, over the shrine
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, shrineWidth - 0.2), clothMat);
  canopy.position.set(pillarFrontX, platformH + pillarH + 0.03, platZ);
  shrineGroup.add(canopy);
  const canopyTrim = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.04, shrineWidth - 0.2), clothMat2);
  canopyTrim.position.set(pillarFrontX, platformH + pillarH - 0.02, platZ);
  shrineGroup.add(canopyTrim);

  // ---- Murtis (deity idols), kept simple and abstract: draped, robed forms on
  // small pedestals rather than depicting specific iconography in detail ----
  function createMurti(x, z, scale = 1) {
    const g = new THREE.Group();
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * scale, 0.18 * scale, 0.1 * scale, 10), marbleMat);
    pedestal.position.y = 0.05 * scale;
    g.add(pedestal);
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.14 * scale, 0.42 * scale, 10), clothMat);
    body.position.y = 0.1 * scale + 0.21 * scale;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1 * scale, 12, 12), new THREE.MeshStandardMaterial({ color: 0xd8b892, roughness: 0.5 }));
    head.position.y = 0.1 * scale + 0.42 * scale + 0.07 * scale;
    g.add(head);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.06 * scale, 0.09 * scale, 8), goldMat);
    crown.position.y = head.position.y + 0.1 * scale;
    g.add(crown);
    g.position.set(x, platformH, z);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    shrineGroup.add(g);
    return g;
  }
  createMurti(pillarFrontX + 0.55, platZ - 0.5, 1.15); // central, slightly larger
  createMurti(pillarFrontX + 0.55, platZ + 0.5, 0.9);

  // Small brass bell hung from the middle beam, in front of the shrine entrance
  const bellGroup = new THREE.Group();
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 6), brassMat);
  chain.position.y = -0.25;
  bellGroup.add(chain);
  const bell = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12, 0, Math.PI * 2, 0, Math.PI * 0.65), brassMat);
  bell.position.y = -0.55;
  bellGroup.add(bell);
  const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), brassMat);
  clapper.position.y = -0.66;
  bellGroup.add(clapper);
  bellGroup.position.set(pillarFrontX + 0.6, ROOM_H - 0.15, platZ);
  shrineGroup.add(bellGroup);
  animated.push({ type: "bell", node: bellGroup, phase: Math.random() * 10 });

  // Brass kalash (auspicious pot) beside the shrine, with a coconut on top
  function createKalash(x, z) {
    const g = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), brassMat);
    pot.scale.y = 1.15;
    pot.position.y = 0.14;
    g.add(pot);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.08, 10), brassMat);
    neck.position.y = 0.28;
    g.add(neck);
    const coconut = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), new THREE.MeshStandardMaterial({ color: 0x5b3a1f, roughness: 0.9 }));
    coconut.position.y = 0.36;
    g.add(coconut);
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.14, 4), new THREE.MeshStandardMaterial({ color: 0x2e6b2e, roughness: 0.7 }));
      const ang = (i / 5) * Math.PI * 2;
      leaf.position.set(Math.cos(ang) * 0.03, 0.42, Math.sin(ang) * 0.03);
      leaf.rotation.z = Math.cos(ang) * 0.3;
      leaf.rotation.x = Math.sin(ang) * 0.3;
      g.add(leaf);
    }
    g.position.set(x, platformH, z);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    shrineGroup.add(g);
    return g;
  }
  createKalash(pillarFrontX + 0.15, platZ - shrineWidth / 2 + 0.35);

  // Diyas (small oil lamps) with a warm flickering flame + point light
  function createDiya(x, y, z, intensity = 0.7) {
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
    shrineGroup.add(g);
    animated.push({ type: "flame", flame, light, baseIntensity: intensity, phase: Math.random() * 10 });
    return g;
  }
  // Diyas along the platform's front edge
  createDiya(platX - shrineDepth / 2 + 0.2, platformH + 0.02, platZ - shrineWidth / 2 + 0.15);
  createDiya(platX - shrineDepth / 2 + 0.2, platformH + 0.02, platZ + shrineWidth / 2 - 0.15);
  createDiya(pillarFrontX + 0.9, platformH + 0.02, platZ, 0.5);

  // Incense stick holder with a faint glowing tip, on the platform
  const incenseHolder = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 8), brassMat);
  incenseHolder.position.set(platX - shrineDepth / 2 + 0.35, platformH + 0.03, platZ + 0.05);
  shrineGroup.add(incenseHolder);
  const incenseStick = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.3, 5), new THREE.MeshStandardMaterial({ color: 0x6b4a2a }));
  incenseStick.position.set(0, 0.16, 0);
  incenseStick.rotation.z = 0.15;
  incenseHolder.add(incenseStick);
  const incenseTip = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), new THREE.MeshStandardMaterial({ color: 0xff4d1a, emissive: 0xff2200, emissiveIntensity: 2 }));
  incenseTip.position.set(0.045, 0.3, 0);
  incenseHolder.add(incenseTip);

  // Low wooden offering table (chowki) in front of the platform
  const chowki = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.5), woodMat);
  chowki.position.set(platX - shrineDepth / 2 - 0.45, 0.09, platZ);
  chowki.castShadow = true;
  chowki.receiveShadow = true;
  shrineGroup.add(chowki);
  const thali = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16), brassMat);
  thali.position.set(platX - shrineDepth / 2 - 0.45, 0.19, platZ);
  shrineGroup.add(thali);

  // Small scattered marigold-style flower petals near the platform and chowki
  const petalMat1 = new THREE.MeshStandardMaterial({ color: 0xf2a10c, roughness: 0.8 });
  const petalMat2 = new THREE.MeshStandardMaterial({ color: 0xe6472a, roughness: 0.8 });
  for (let i = 0; i < 14; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.025 + Math.random() * 0.02, 6, 6), i % 2 === 0 ? petalMat1 : petalMat2);
    petal.scale.y = 0.4;
    const rx = platX - shrineDepth / 2 - 1.0 + Math.random() * 1.6;
    const rz = platZ - shrineWidth / 2 + 0.3 + Math.random() * (shrineWidth - 0.6);
    petal.position.set(rx, 0.012, rz);
    petal.rotation.y = Math.random() * Math.PI;
    scene.add(petal);
  }

  // Rangoli floor pattern (concentric colored rings) on the floor in front of the shrine
  const rangoliCX = platX - shrineDepth / 2 - 0.9;
  const rangoliCZ = platZ;
  const rangoliColors = [0xd6482f, 0xf2b90c, 0xffffff, 0x2e6b2e];
  for (let i = 0; i < rangoliColors.length; i++) {
    const outerR = 0.55 - i * 0.13;
    const innerR = outerR - 0.11;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(Math.max(innerR, 0.02), outerR, 32),
      new THREE.MeshStandardMaterial({ color: rangoliColors[i], roughness: 0.9, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(rangoliCX, 0.005 + i * 0.001, rangoliCZ);
    scene.add(ring);
  }

  // Pair of sandals/chappals left just inside the doorway (shoes-off custom)
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
  mat.position.set(platX - shrineDepth / 2 - 1.35, 0.008, platZ);
  scene.add(mat);

  // ---------- per-frame update: diya flames flicker, bell sways gently ----------
  function update(dt, elapsed) {
    const time = elapsed !== undefined ? elapsed : performance.now() / 1000;
    for (const a of animated) {
      if (a.type === "flame") {
        const flick = 0.75 + Math.sin(time * 9 + a.phase) * 0.15 + Math.sin(time * 23 + a.phase) * 0.1;
        a.flame.scale.set(flick, 0.85 + flick * 0.3, flick);
        a.light.intensity = a.baseIntensity * flick;
      } else if (a.type === "bell") {
        a.node.rotation.z = Math.sin(time * 0.8 + a.phase) * 0.03;
      }
    }
  }

  return { colliders, update, centerX, centerZ, westX, eastX };
}

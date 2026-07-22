// room17.js — ROOM 17: a side room of the haveli, reached via a corridor
// running south from room4's south doorway.
// North wall has a doorway gap matching the corridor width (entrance from room4).
// South/east/west walls remain solid, no window — this is the dead end of this wing.
// Now also holds the game's pickable hammer prop (moved here from room1) — E to
// pick up, G to drop, Q to throw as a noise-making distraction (see engine.js's
// pickupItem/dropHeldItem/throwHeldItem).

import * as THREE from "three";
import { createWallMaterial, createFloorMaterial } from "./materials.js";

const ROOM_W = 6; // east-west
const ROOM_D = 6.5; // north-south
const ROOM_H = 2.9;
const DOOR_GAP = 1.6; // must match corridor width

// doorZ: the z coordinate where room17's north wall (and doorway) sits —
// this is corridor19.endZ, so the door lines up exactly with the passage.
// doorX: the x coordinate of the doorway, matching the corridor's x (room4's south door).
export function createRoom17(scene, engine, doorZ, doorX) {
  const colliders = [];

  // shared inventory bag lives on the engine so any room can read/write it.
  // Guarded here in case room17 happens to load before room16 does.
  if (!engine.inventory) engine.inventory = {};

  // room center sits further south (more positive z) than its north doorway
  const centerZ = doorZ + ROOM_D / 2;
  const centerX = doorX;

  // ---------- floor: old, dirty tiles ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    createFloorMaterial(ROOM_W / 2, ROOM_D / 2)
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(centerX, 0, centerZ);
  floor.receiveShadow = true;
  scene.add(floor);

  engine.floorY = 0; // room17's floor sits at world Y 0 — dropped/thrown items rest flush with it

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

  const northZ = centerZ - ROOM_D / 2; // == doorZ
  const southZ = centerZ + ROOM_D / 2;

  // south wall — solid, dead end of this wing
  addWallBox(centerX, southZ, ROOM_W + t, t);
  // west wall — solid, no window
  addWallBox(centerX - ROOM_W / 2, centerZ, t, ROOM_D + t);
  // east wall — solid, no window
  addWallBox(centerX + ROOM_W / 2, centerZ, t, ROOM_D + t);

  // north wall — doorway gap in the middle, aligned with the corridor from room4
  const northSideLen = (ROOM_W - DOOR_GAP) / 2;
  addWallBox(centerX - (DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(centerX + (DOOR_GAP / 2 + northSideLen / 2), northZ, northSideLen, t);
  addWallBox(centerX, northZ, DOOR_GAP, t, 0.4, ROOM_H - 0.2); // lintel

  // ---------- ambient room lighting ----------
  const ambient = new THREE.AmbientLight(0x413c30, 1.6);
  scene.add(ambient);

  const fillLight = new THREE.HemisphereLight(0x7c7364, 0x2c2618, 1.0);
  scene.add(fillLight);

  const eerieLight = new THREE.PointLight(0x9fb0c8, 1.6, 7, 2);
  eerieLight.position.set(centerX, ROOM_H - 0.35, centerZ);
  scene.add(eerieLight);

  // ---------- wooden table (fixture the hammer spawns on) ----------
  // A simple four-legged table so the hammer has somewhere to rest other than
  // bare floor. Placed clear of the doorway and all four walls. Its top
  // surface height (TABLE_TOP_Y) is what the hammer's spawn position below
  // is built from, so if you resize the table, the hammer moves with it.
  const TABLE_W = 0.9;   // x extent (east-west)
  const TABLE_D = 0.6;   // z extent (north-south)
  const TABLE_LEG_H = 0.72;
  const TABLE_TOP_THICK = 0.05;
  const TABLE_TOP_Y = TABLE_LEG_H + TABLE_TOP_THICK / 2;

  const tableGroup = new THREE.Group();
  const tableTopMat = new THREE.MeshStandardMaterial({ color: 0x4a3320, roughness: 0.75 });
  const tableLegMat = new THREE.MeshStandardMaterial({ color: 0x3a2717, roughness: 0.85 });

  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(TABLE_W, TABLE_TOP_THICK, TABLE_D),
    tableTopMat
  );
  tableTop.position.set(0, TABLE_LEG_H, 0);
  tableGroup.add(tableTop);

  const legInsetX = TABLE_W / 2 - 0.06;
  const legInsetZ = TABLE_D / 2 - 0.06;
  [
    [-legInsetX, -legInsetZ], [legInsetX, -legInsetZ],
    [-legInsetX, legInsetZ], [legInsetX, legInsetZ],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, TABLE_LEG_H, 0.06), tableLegMat);
    leg.position.set(lx, TABLE_LEG_H / 2, lz);
    tableGroup.add(leg);
  });

  tableGroup.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // clear of the north doorway, and clear of all four walls
  const tablePos = new THREE.Vector3(centerX - 1.6, 0, centerZ + 0.8);
  tableGroup.position.copy(tablePos);
  scene.add(tableGroup);

  const tableBox = new THREE.Box3().setFromObject(tableGroup);
  colliders.push(tableBox);
  engine.addCollider(tableBox);

  // ---------- hammer prop (pickable / droppable / throwable) ----------
  // Built once and reused for its held-viewmodel, dropped-fixture, and
  // in-flight-projectile states — engine.pickupItem() parents it to the
  // camera when picked up, engine.dropHeldItem() (G) puts it back down
  // wherever the player is standing, and engine.throwHeldItem() (Q) launches
  // it as a real projectile that emits a noise event on landing —
  // throwable:true below is what makes it usable as a Granny/Kamla-style
  // distraction tool, not just a carried prop. Spawns resting on top of the
  // table above (once dropped or thrown, it lands on the room floor instead,
  // via engine.floorY — it doesn't try to land back on the table).
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3a2717, roughness: 0.85 });
  const hammerHeadMat = new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.5, metalness: 0.65 });

  const hammerGroup = new THREE.Group();
  const hammerHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.32, 8), woodMat);
  hammerHandle.rotation.z = Math.PI / 2.1;
  hammerHandle.position.set(0, 0.05, 0);
  const hammerHead = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), hammerHeadMat);
  hammerHead.position.set(0.15, 0.08, 0);
  hammerGroup.add(hammerHandle, hammerHead);
  hammerGroup.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

  // resting on the tabletop: table's world Y + tabletop surface height, small
  // extra lift (+0.02) so the hammer's own geometry doesn't clip into the wood
  hammerGroup.position.set(tablePos.x, TABLE_TOP_Y + 0.02, tablePos.z);
  hammerGroup.rotation.y = 0.6;
  scene.add(hammerGroup);

  let hammerPickup = engine.addInteractable(hammerGroup, {
    radius: 2.0,
    prompt: "Pick Up Hammer",
    onInteract: () => {
      engine.removeInteractable(hammerPickup);
      scene.remove(hammerGroup);
      engine.pickupItem({
        id: "hammer",
        mesh: hammerGroup,
        prompt: "Hammer",
        throwable: true,
        noiseRadius: 7,
        // THIS was the missing piece: pickupItem() only manages the
        // held-viewmodel state (engine.heldItem) — it never touched the
        // shared inventory flag on its own. room16's plank checks
        // engine.inventory.hammer, so without setting it here that flag
        // stayed undefined forever, even after the hammer was in hand.
        onPickup: () => {
          engine.inventory.hammer = true;
          console.log("[room17.js] hammer picked up — engine.inventory.hammer set to true");
        },
      });
    },
  });

  // ---------- per-frame update: subtle eerie light pulse ----------
  let pulseT = 0;
  function update(dt) {
    pulseT += dt;
    eerieLight.intensity = 1.4 + Math.sin(pulseT * 1.3) * 0.3;
  }

  return { colliders, update, centerX, centerZ, northZ, southZ };
}

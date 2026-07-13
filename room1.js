// room1.js — "The Bedroom"
// Builds the geometry, lighting, atmosphere and interactive elements for the first room.
// Exports createRoom1(scene, engine) -> { spawnPoint, spawnYaw, update(dt, engine) }

import * as THREE from "three";

const ROOM_W = 8;
const ROOM_D = 10;
const ROOM_H = 3.1;

function wallMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x2b2620, roughness: 0.95, metalness: 0.02 });
}

function floorMaterial() {
  return new THREE.MeshStandardMaterial({ color: 0x1c1712, roughness: 0.9, metalness: 0.0 });
}

export function createRoom1(scene, engine) {
  const state = {
    flickerT: 0,
    lightOn: true,
    closetOpened: false,
    noteRead: false,
    scareArmed: true,
    scareTriggered: false,
  };

  // ---------- fog & background ----------
  scene.fog = new THREE.FogExp2(0x000000, 0.11);
  scene.background = new THREE.Color(0x000000);

  // ---------- floor ----------
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    floorMaterial()
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ---------- ceiling ----------
  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshStandardMaterial({ color: 0x141110, roughness: 1 })
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_H;
  scene.add(ceiling);

  // ---------- walls (with a doorway gap on the north wall) ----------
  const wallMat = wallMaterial();
  const colliders = [];

  function addWallBox(cx, cz, w, d, h = ROOM_H, cy = h / 2) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
    mesh.position.set(cx, cy, cz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    const box = new THREE.Box3().setFromObject(mesh);
    colliders.push(box);
    return mesh;
  }

  const t = 0.2; // wall thickness
  // south wall (solid)
  addWallBox(0, ROOM_D / 2, ROOM_W + t, t);
  // west wall
  addWallBox(-ROOM_W / 2, 0, t, ROOM_D + t);
  // east wall
  addWallBox(ROOM_W / 2, 0, t, ROOM_D + t);
  // north wall split with a doorway gap in the middle
  const doorGap = 1.4;
  const sideLen = (ROOM_W - doorGap) / 2;
  addWallBox(-(doorGap / 2 + sideLen / 2), -ROOM_D / 2, sideLen, t);
  addWallBox((doorGap / 2 + sideLen / 2), -ROOM_D / 2, sideLen, t);
  // lintel above the doorway
  addWallBox(0, -ROOM_D / 2, doorGap, t, 0.6, ROOM_H - 0.3);

  colliders.forEach((box) => engine.addCollider(box));

  // ---------- lighting ----------
  const ambient = new THREE.AmbientLight(0x1a1a22, 0.35);
  scene.add(ambient);

  const ceilingLamp = new THREE.PointLight(0xffcf8a, 1.1, 7, 2);
  ceilingLamp.position.set(0, ROOM_H - 0.15, 0.5);
  ceilingLamp.castShadow = true;
  ceilingLamp.shadow.mapSize.set(512, 512);
  scene.add(ceilingLamp);
  state.ceilingLamp = ceilingLamp;

  const moonGlow = new THREE.PointLight(0x334466, 0.25, 6, 2);
  moonGlow.position.set(-ROOM_W / 2 + 0.5, 1.4, -2);
  scene.add(moonGlow);

  // ---------- furniture ----------
  function box(w, h, d, color, roughness = 0.8) {
    return new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness })
    );
  }

  // bed
  const bedFrame = box(1.6, 0.4, 2.1, 0x3a2a1e);
  bedFrame.position.set(-2.4, 0.2, 2.5);
  bedFrame.castShadow = bedFrame.receiveShadow = true;
  scene.add(bedFrame);
  const mattress = box(1.5, 0.25, 2.0, 0x54503f);
  mattress.position.set(-2.4, 0.52, 2.5);
  mattress.castShadow = mattress.receiveShadow = true;
  scene.add(mattress);
  engine.addCollider(new THREE.Box3().setFromObject(bedFrame));

  // nightstand + note
  const nightstand = box(0.5, 0.55, 0.5, 0x2c2118);
  nightstand.position.set(-1.4, 0.275, 3.3);
  nightstand.castShadow = nightstand.receiveShadow = true;
  scene.add(nightstand);
  engine.addCollider(new THREE.Box3().setFromObject(nightstand));

  const noteMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.22, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xe9dfc0, roughness: 0.9, side: THREE.DoubleSide })
  );
  noteMesh.rotation.x = -Math.PI / 2;
  noteMesh.rotation.z = 0.3;
  noteMesh.position.set(-1.4, 0.565, 3.3);
  scene.add(noteMesh);

  engine.addInteractable(noteMesh, {
    radius: 1.5,
    prompt: "Read Note",
    onInteract: () => showNote(state),
  });

  // wardrobe / closet (source of the scare)
  const closet = box(1.0, 2.2, 0.55, 0x241c14);
  closet.position.set(3.2, 1.1, -4.3);
  closet.castShadow = closet.receiveShadow = true;
  scene.add(closet);
  engine.addCollider(new THREE.Box3().setFromObject(closet));

  const closetDoor = box(0.48, 2.1, 0.05, 0x1c150f);
  closetDoor.position.set(2.98, 1.1, -4.02);
  closetDoor.castShadow = true;
  scene.add(closetDoor);

  engine.addInteractable(closetDoor, {
    radius: 1.7,
    prompt: state.closetOpened ? "" : "Open Closet",
    onInteract: () => openCloset(state, closetDoor, scene, engine),
  });

  // desk + chair silhouette for set dressing
  const desk = box(1.3, 0.75, 0.6, 0x2c2118);
  desk.position.set(2.6, 0.375, 3.6);
  desk.castShadow = desk.receiveShadow = true;
  scene.add(desk);
  engine.addCollider(new THREE.Box3().setFromObject(desk));

  // ---------- spawn ----------
  const spawnPoint = new THREE.Vector3(0, engine.playerHeight, 4);
  const spawnYaw = Math.PI;

  // ---------- per-frame update ----------
  function update(dt, eng) {
    // flickering ceiling lamp for atmosphere
    state.flickerT += dt;
    const flicker = 0.85 + Math.sin(state.flickerT * 9.0) * 0.08 + (Math.random() - 0.5) * 0.06;
    ceilingLamp.intensity = state.lightOn ? Math.max(0.15, flicker * 1.1) : 0;

    // rare full blackout flicker
    if (Math.random() < 0.0015) {
      state.lightOn = !state.lightOn;
    }

    // closet jumpscare: triggers once, when player gets close after opening it
    if (state.scareArmed && state.closetOpened && !state.scareTriggered) {
      const dist = eng.camera.position.distanceTo(closet.position);
      if (dist < 2.2) {
        triggerScare(state, scene, eng);
      }
    }
  }

  return { spawnPoint, spawnYaw, update, colliders };
}

// ---------- helpers ----------

function showNote(state) {
  if (state.noteRead) return;
  const overlay = document.getElementById("note-overlay");
  document.getElementById("note-title").textContent = "A Torn Page";
  document.getElementById("note-body").textContent =
    "\"...it knocks three times before it opens the closet on its own. Don't answer. Don't look. If the light goes out, stay still until it stops breathing...\"";
  overlay.classList.add("show");
  document.exitPointerLock();

  const closeHandler = (e) => {
    if (e.code === "KeyE" || e.code === "Escape") {
      overlay.classList.remove("show");
      document.removeEventListener("keydown", closeHandler);
      document.body.requestPointerLock();
    }
  };
  document.addEventListener("keydown", closeHandler);
  state.noteRead = true;
}

function openCloset(state, closetDoor, scene, engine) {
  if (state.closetOpened) return;
  state.closetOpened = true;
  // swing the door open
  closetDoor.rotation.y = -Math.PI / 2.2;
  closetDoor.position.x -= 0.22;
  closetDoor.position.z -= 0.22;
}

function triggerScare(state, scene, engine) {
  state.scareTriggered = true;

  // kill the lights
  state.lightOn = false;

  // flash a dark shape briefly, then fade to black and reset
  const fade = document.getElementById("fade");
  fade.classList.add("show");

  const monster = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1.9, 0.4),
    new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1 })
  );
  monster.position.set(engine.camera.position.x, 0.95, engine.camera.position.z - 0.8);
  scene.add(monster);

  setTimeout(() => {
    scene.remove(monster);
    fade.classList.remove("show");
    state.lightOn = true;
  }, 1400);
}

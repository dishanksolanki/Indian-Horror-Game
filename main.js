// main.js — wires the Engine to Room16 (temporary spawn point) and Room24,
// connected by an L-shaped bridging corridor (room16 west door -> room24 east door).
//
// NOTE: rooms 1-15, hall1, and hall3 aren't included here — I don't have those
// source files. Room16 is used as the entry point so this file is complete and
// testable on its own right now. Send me room1.js...room15.js, hall1.js, hall3.js
// and I'll extend this back into the full room1 -> room24 chain.

import * as THREE from "three";
import { Engine } from "./engine.js";
import { createRoom16 } from "./room16.js";
import { createRoom24 } from "./room24.js";
import { createBridge16to24 } from "./corridor.js";

const canvas = document.getElementById("scene");
const engine = new Engine(canvas);

// Room16: doorZ=0, doorX=0 places its south door (from room15, normally) at the origin.
const room16 = createRoom16(engine.scene, engine, 0, 0);

// Room24: positioned so its east door lines up exactly with the bridge corridor below.
const room24 = createRoom24(engine.scene, engine, -3.75, -11);

// L-shaped bridging corridor: room16's WEST door -> room24's EAST door
// (west, then north / east, then south — matches the comments in both room files).
const bridge16to24 = createBridge16to24(engine.scene, engine, room16, room24);

engine.setSpawn(new THREE.Vector3(room16.centerX, 1.6, room16.centerZ), 0);

const menu = document.getElementById("menu");
const playBtn = document.getElementById("play-btn");
const noteOverlay = document.getElementById("note-overlay");

playBtn.addEventListener("click", () => {
  engine.lock();
});

engine.controls.addEventListener("lock", () => {
  menu.style.display = "none";
  engine.resume();
});

engine.controls.addEventListener("unlock", () => {
  // don't show the main menu if the note overlay is open — that has its own flow
  if (!noteOverlay.classList.contains("show")) {
    menu.style.display = "flex";
  }
  engine.pause();
});

engine.start((dt, eng) => {
  room16.update(dt, eng);
  room24.update(dt, eng);
  bridge16to24.update(dt, eng);
});

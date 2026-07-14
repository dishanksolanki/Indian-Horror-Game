// main.js — wires the Engine to Room1 -> Room2 -> Room3 and drives the menu / pause UI.
import { Engine } from "./engine.js";
import { createRoom1 } from "./room1.js";
import { createCorridor } from "./corridor.js";
import { createRoom2 } from "./room2.js";
import { createRoom3 } from "./room3.js";

const canvas = document.getElementById("scene");
const engine = new Engine(canvas);

const room1 = createRoom1(engine.scene, engine);
engine.setSpawn(room1.spawnPoint, room1.spawnYaw);

// ⚠️ ASSUMPTION: room1 exposes the z-coordinate of its north doorway as `room1.northZ`
// (mirroring the northZ/southZ pattern room2.js already uses). If room1.js names this
// property differently (e.g. doorZ, exitZ), swap it in below — that's the only unverified
// wiring point, since room1.js wasn't reachable to confirm.
const corridor1 = createCorridor(engine.scene, engine, room1.northZ);
const room2 = createRoom2(engine.scene, engine, corridor1.endZ);

// second corridor branches off room2's NEW north doorway, leading to room3
const corridor2 = createCorridor(engine.scene, engine, room2.northZ);
const room3 = createRoom3(engine.scene, engine, corridor2.endZ);

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
  room1.update(dt, eng);
  corridor1.update(dt, eng);
  room2.update(dt, eng);
  corridor2.update(dt, eng);
  room3.update(dt, eng);
});

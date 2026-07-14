// main.js — wires the Engine to Room 1 and drives the menu / pause UI.
import { Engine } from "./engine.js";
import { createRoom1 } from "./room1.js";
import { createCorridor } from "./corridor.js";
import { createRoom2 } from "./room2.js";
import { createRoom5 } from "./room5.js";

const canvas = document.getElementById("scene");
const engine = new Engine(canvas);

const room1 = createRoom1(engine.scene, engine);
engine.setSpawn(room1.spawnPoint, room1.spawnYaw);

// room1 -> corridor -> room2
// NOTE: replace `room1.doorZ` with whatever room1.js actually exports
// for its north doorway's z coordinate, if the name differs.
const corridor1 = createCorridor(engine.scene, engine, room1.doorZ);
const room2 = createRoom2(engine.scene, engine, corridor1.endZ);

// room2 -> corridor -> room5
const corridor2 = createCorridor(engine.scene, engine, room2.northDoorZ);
const room5 = createRoom5(engine.scene, engine, corridor2.endZ);

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
  room5.update(dt, eng);
});

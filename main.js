// main.js — wires the Engine to Room 1, the corridor, Room 2, and drives the menu / pause UI.
import { Engine } from "./engine.js";
import { createRoom1 } from "./room1.js";
import { createCorridor } from "./corridor.js";
import { createRoom2 } from "./room2.js";

const canvas = document.getElementById("scene");
const engine = new Engine(canvas);

const room1 = createRoom1(engine.scene, engine);
const corridor = createCorridor(engine.scene, engine, room1.northDoorZ);
const room2 = createRoom2(engine.scene, engine, corridor.endZ);

engine.setSpawn(room1.spawnPoint, room1.spawnYaw);

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
  corridor.update(dt, eng);
  room2.update(dt, eng);
});

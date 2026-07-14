// main.js — wires the Engine to Room 1 -> corridor -> Room 2 -> corridor -> Room 3,
// and drives the menu / pause UI.
import { Engine } from "./engine.js";
import { createRoom1 } from "./room1.js";
import { createCorridor } from "./corridor.js";
import { createRoom2 } from "./room2.js";
import { createRoom3 } from "./room3.js";

const canvas = document.getElementById("scene");
const engine = new Engine(canvas);

const room1 = createRoom1(engine.scene, engine);
engine.setSpawn(room1.spawnPoint, room1.spawnYaw);

// room1's north wall (its doorway) sits at -ROOM_D/2 = -4.5 — see room1.js.
// The first corridor starts there and runs north to room2's south doorway.
const ROOM1_NORTH_Z = -4.5;
const corridor1 = createCorridor(engine.scene, engine, ROOM1_NORTH_Z);

// room2 hangs its south doorway exactly on corridor1's far end.
const room2 = createRoom2(engine.scene, engine, corridor1.endZ);

// second corridor starts at room2's north doorway and runs north to room3.
const corridor2 = createCorridor(engine.scene, engine, room2.northZ);

// room3 hangs its south doorway exactly on corridor2's far end.
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

// main.js — wires the Engine to Room 1 -> corridor -> Room 2 -> Room 5, and drives the menu / pause UI.
import { Engine } from "./engine.js";
import { createRoom1 } from "./room1.js";
import { createCorridor } from "./corridor.js";
import { createRoom2 } from "./room2.js";
import { createRoom5 } from "./room5.js";

const canvas = document.getElementById("scene");
const engine = new Engine(canvas);

const room1 = createRoom1(engine.scene, engine);
engine.setSpawn(room1.spawnPoint, room1.spawnYaw);

// room1's north wall (doorway) sits at z = -ROOM_D / 2 = -4.5
const room1NorthDoorZ = -4.5;

const corridor = createCorridor(engine.scene, engine, room1NorthDoorZ);
const room2 = createRoom2(engine.scene, engine, corridor.endZ);

// room5 is reached through room2's new east doorway — pass its exact world coords
// so the two doorways line up perfectly, no gap and no overlap.
const room5 = createRoom5(engine.scene, engine, room2.eastDoorX, room2.eastDoorZ);

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
  room5.update(dt, eng);
});

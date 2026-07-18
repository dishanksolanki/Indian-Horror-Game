// main.js — wires the Engine to Room 1 and drives the menu / pause UI.
// Every DOM element lookup is checked before use: if an id is missing or
// renamed in index.html, this logs a clear console warning instead of
// throwing "Cannot read properties of null" and stopping the whole script.

import { Engine } from "./engine.js";
import { createRoom1 } from "./room1.js";

function required(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.error(`main.js: expected an element with id="${id}" in index.html, but it wasn't found.`);
  }
  return el;
}

const canvas = required("scene");
const menu = required("menu");
const playBtn = required("play-btn");
const noteOverlay = required("note-overlay");

if (!canvas) {
  throw new Error("main.js: cannot start — no <canvas id=\"scene\"> in index.html.");
}

const engine = new Engine(canvas);

const room1 = createRoom1(engine.scene, engine);
engine.setSpawn(room1.spawnPoint, room1.spawnYaw);

if (playBtn) {
  playBtn.addEventListener("click", () => {
    engine.lock();
  });
} else {
  console.error("main.js: ENTER button (#play-btn) missing — clicking to start won't work.");
}

engine.controls.addEventListener("lock", () => {
  if (menu) menu.style.display = "none";
  engine.resume();
});

engine.controls.addEventListener("unlock", () => {
  // don't show the main menu if the note overlay is open — that has its own flow
  const noteIsOpen = noteOverlay ? noteOverlay.classList.contains("show") : false;
  if (!noteIsOpen && menu) {
    menu.style.display = "flex";
  }
  engine.pause();
});

engine.start((dt, eng) => {
  room1.update(dt, eng);
});

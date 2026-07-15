// main.js — wires the Engine to Room 1 -> corridor -> Room 2 -> corridor -> Room 3,
// with Room 4 and Room 5 branching off Room 2's west and east doorways,
// Room 6 and Room 7 continuing further east off Room 5's and Room 6's east doorways,
// Room 8 branching off Room 6's south doorway,
// Room 9 branching off Room 6's north doorway,
// Hall 1 continuing further north off Room 9's north doorway,
// Room 10 branching off Room 3's east doorway,
// and Room 11 branching off Room 3's west doorway,
// and drives the menu / pause UI.
import { Engine } from "./engine.js";
import { createRoom1 } from "./room1.js";
import {
  createCorridor,
  createCorridorWest,
  createCorridorEast,
  createCorridorSouth,
  createCorridorNorth,
} from "./corridor.js";
import { createRoom2 } from "./room2.js";
import { createRoom3 } from "./room3.js";
import { createRoom4 } from "./room4.js";
import { createRoom5 } from "./room5.js";
import { createRoom6 } from "./room6.js";
import { createRoom7 } from "./room7.js";
import { createRoom8 } from "./room8.js";
import { createRoom9 } from "./room9.js";
import { createHall1 } from "./hall1.js";
import { createRoom10 } from "./room10.js";
import { createRoom11 } from "./room11.js";

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

// tenth corridor starts at room3's east doorway and runs east to room10.
const corridor10 = createCorridorEast(engine.scene, engine, room3.eastX, room3.eastDoorZ);

// room10 hangs its west doorway exactly on corridor10's far end.
const room10 = createRoom10(engine.scene, engine, corridor10.endX, corridor10.z);

// eleventh corridor starts at room3's west doorway and runs west to room11.
const corridor11 = createCorridorWest(engine.scene, engine, room3.westX, room3.westDoorZ);

// room11 hangs its east doorway exactly on corridor11's far end.
const room11 = createRoom11(engine.scene, engine, corridor11.endX, corridor11.z);

// third corridor starts at room2's west doorway and runs west to room4.
const corridor3 = createCorridorWest(engine.scene, engine, room2.westX, room2.westDoorZ);

// room4 hangs its east doorway exactly on corridor3's far end.
const room4 = createRoom4(engine.scene, engine, corridor3.endX, corridor3.z);

// fourth corridor starts at room2's east doorway and runs east to room5.
const corridor4 = createCorridorEast(engine.scene, engine, room2.eastX, room2.eastDoorZ);

// room5 hangs its west doorway exactly on corridor4's far end.
const room5 = createRoom5(engine.scene, engine, corridor4.endX, corridor4.z);

// fifth corridor starts at room5's east doorway and runs east to room6.
const corridor5 = createCorridorEast(engine.scene, engine, room5.eastX, room5.eastDoorZ);

// room6 hangs its west doorway exactly on corridor5's far end.
const room6 = createRoom6(engine.scene, engine, corridor5.endX, corridor5.z);

// sixth corridor starts at room6's east doorway and runs east to room7.
const corridor6 = createCorridorEast(engine.scene, engine, room6.eastX, room6.eastDoorZ);

// room7 hangs its west doorway exactly on corridor6's far end.
const room7 = createRoom7(engine.scene, engine, corridor6.endX, corridor6.z);

// seventh corridor starts at room6's south doorway and runs south to room8.
const corridor7 = createCorridorSouth(engine.scene, engine, room6.southZ, room6.southDoorX);

// room8 hangs its north doorway exactly on corridor7's far end.
const room8 = createRoom8(engine.scene, engine, corridor7.endZ, corridor7.x);

// eighth corridor starts at room6's north doorway and runs north to room9.
const corridor8 = createCorridorNorth(engine.scene, engine, room6.northZ, room6.northDoorX);

// room9 hangs its south doorway exactly on corridor8's far end.
const room9 = createRoom9(engine.scene, engine, corridor8.endZ, corridor8.x);

// ninth corridor starts at room9's north doorway and runs north to hall1.
const corridor9 = createCorridorNorth(engine.scene, engine, room9.northZ, room9.northDoorX);

// hall1 hangs its south doorway exactly on corridor9's far end.
const hall1 = createHall1(engine.scene, engine, corridor9.endZ, corridor9.x);

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
  corridor3.update(dt, eng);
  room4.update(dt, eng);
  corridor4.update(dt, eng);
  room5.update(dt, eng);
  corridor5.update(dt, eng);
  room6.update(dt, eng);
  corridor6.update(dt, eng);
  room7.update(dt, eng);
  corridor7.update(dt, eng);
  room8.update(dt, eng);
  corridor8.update(dt, eng);
  room9.update(dt, eng);
  corridor9.update(dt, eng);
  hall1.update(dt, eng);
  corridor10.update(dt, eng);
  room10.update(dt, eng);
  corridor11.update(dt, eng);
  room11.update(dt, eng);
});

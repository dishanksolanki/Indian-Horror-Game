// main.js — wires the Engine to Room 1 -> corridor -> Room 2 -> corridor -> Room 3,
// with Room 4 and Room 5 branching off Room 2's west and east doorways,
// Room 6 and Room 7 continuing further east off Room 5's and Room 6's east doorways,
// Room 8 branching off Room 6's south doorway,
// Room 9 branching off Room 6's north doorway,
// Hall 1 continuing further north off Room 9's north doorway,
// Room 10 branching off Room 3's east doorway,
// Room 11 branching off Room 3's west doorway,
// Room 12 continuing further north off Room 3's north doorway,
// Room 13 continuing further west off Room 12's west doorway,
// Hall 2 branching off Room 13's west doorway,
// Room 14 branching off Room 12's east doorway,
// Room 15 branching off Room 12's north doorway,
// Room 16 continuing further north off Room 15's north doorway, then bridging
// east and south via a bent corridor to connect onward into Hall 1's north doorway
// (so Room 16 links room15 and hall1 together),
// Room 17 branching off Room 4's south doorway,
// Room 18 branching off Room 4's west doorway,
// Room 19 continuing further south off Room 18's south doorway,
// Room 20 continuing further west off Room 18's west doorway,
// Room 21 continuing further west off Room 20's west doorway,
// Room 22 continuing further north off Room 21's north doorway,
// Room 23 continuing further north off Room 22's north doorway,
// Hall 3 continuing further north off Room 23's north doorway,
// Room 24 continuing further north off Hall 3's north doorway, and bridged (west,
// north, then west again — a three-segment jog, since both doorways face the
// same way) into Room 16's west doorway,
// Room 25 continuing further north off Room 16's north doorway — the haveli's
// final chamber, holding the ancient door / win condition (moved here from
// Room 16, which previously had it mounted non-functionally on its own solid
// north wall),
// and Hall 2 connected directly to Hall 3 via a straight westward corridor
// bridging their previously dead-end walls (hall2's west doorway to hall3's
// east doorway),
// and drives the menu / pause UI.
//
// NEW: player death / respawn / lose-game flow. room21.js's Vrishchik
// dispatches a plain "game:caught" window event (from its onCatchPlayer
// callback) whenever it lands a hit. main.js listens for that event, fades
// to black, and either:
//   - respawns the player back at room1's original spawn point (deaths 1-2), or
//   - shows a "YOU DIED" lose screen and locks the game (death 3).
// The lose screen is built dynamically in JS so no index.html changes are
// required — see createLoseOverlayIfNeeded() below.
import * as THREE from "three";
import { Engine } from "./engine.js";
import { createRoom1 } from "./room1.js";
import {
  createCorridor,
  createCorridorWest,
  createCorridorEast,
  createCorridorSouth,
  createCorridorNorth,
  createCorridorBendEastSouth,
  createCorridorBendWestNorth,
  createCorridorDoglegWestNorthWest,
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
import { createRoom12 } from "./room12.js";
import { createRoom13 } from "./room13.js";
import { createRoom14 } from "./room14.js";
import { createRoom15 } from "./room15.js";
import { createRoom16 } from "./room16.js";
import { createHall2 } from "./hall2.js";
import { createRoom17 } from "./room17.js";
import { createRoom18 } from "./room18.js";
import { createRoom19 } from "./room19.js";
import { createRoom20 } from "./room20.js";
import { createRoom21 } from "./room21.js";
import { createRoom22 } from "./room22.js";
import { createRoom23 } from "./room23.js";
import { createHall3 } from "./hall3.js";
import { createRoom24 } from "./room24.js";
import { createRoom25 } from "./room25.js";

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

// twelfth corridor starts at room3's north doorway and runs north to room12.
const corridor12 = createCorridor(engine.scene, engine, room3.northZ);

// room12 hangs its south doorway exactly on corridor12's far end.
const room12 = createRoom12(engine.scene, engine, corridor12.endZ);

// thirteenth corridor starts at room12's west doorway and runs west to room13.
const corridor13 = createCorridorWest(engine.scene, engine, room12.westX, room12.westDoorZ);

// room13 hangs its east doorway exactly on corridor13's far end.
const room13 = createRoom13(engine.scene, engine, corridor13.endX, corridor13.z);

// fourteenth corridor starts at room13's west doorway and runs west to hall2.
const corridor14 = createCorridorWest(engine.scene, engine, room13.westX, room13.westDoorZ);

// hall2 hangs its east doorway exactly on corridor14's far end.
const hall2 = createHall2(engine.scene, engine, corridor14.endX, corridor14.z);

// fifteenth corridor starts at room12's east doorway and runs east to room14.
const corridor15 = createCorridorEast(engine.scene, engine, room12.eastX, room12.eastDoorZ);

// room14 hangs its west doorway exactly on corridor15's far end.
const room14 = createRoom14(engine.scene, engine, corridor15.endX, corridor15.z);

// sixteenth corridor starts at room12's north doorway and runs north to room15.
const corridor16 = createCorridorNorth(engine.scene, engine, room12.northZ, room12.northDoorX);

// room15 hangs its south doorway exactly on corridor16's far end.
const room15 = createRoom15(engine.scene, engine, corridor16.endZ, corridor16.x);

// third corridor starts at room2's west doorway and runs west to room4.
const corridor3 = createCorridorWest(engine.scene, engine, room2.westX, room2.westDoorZ);

// room4 hangs its east doorway exactly on corridor3's far end.
const room4 = createRoom4(engine.scene, engine, corridor3.endX, corridor3.z);

// nineteenth corridor starts at room4's south doorway and runs south to room17.
const corridor19 = createCorridorSouth(engine.scene, engine, room4.southZ, room4.southDoorX);

// room17 hangs its north doorway exactly on corridor19's far end.
const room17 = createRoom17(engine.scene, engine, corridor19.endZ, corridor19.x);

// twentieth corridor starts at room4's west doorway and runs west to room18.
const corridor20 = createCorridorWest(engine.scene, engine, room4.westX, room4.westDoorZ);

// room18 hangs its east doorway exactly on corridor20's far end.
const room18 = createRoom18(engine.scene, engine, corridor20.endX, corridor20.z);

// twenty-first corridor starts at room18's south doorway and runs south to room19.
const corridor21 = createCorridorSouth(engine.scene, engine, room18.southZ, room18.southDoorX);

// room19 hangs its north doorway exactly on corridor21's far end.
const room19 = createRoom19(engine.scene, engine, corridor21.endZ, corridor21.x);

// twenty-second corridor starts at room18's west doorway and runs west to room20.
const corridor22 = createCorridorWest(engine.scene, engine, room18.westX, room18.westDoorZ);

// room20 hangs its east doorway exactly on corridor22's far end.
const room20 = createRoom20(engine.scene, engine, corridor22.endX, corridor22.z);

// twenty-third corridor starts at room20's west doorway and runs west to room21.
const corridor23 = createCorridorWest(engine.scene, engine, room20.westX, room20.westDoorZ);

// room21 hangs its east doorway exactly on corridor23's far end.
const room21 = createRoom21(engine.scene, engine, corridor23.endX, corridor23.z);

// twenty-fourth corridor starts at room21's north doorway and runs north to room22.
const corridor24 = createCorridorNorth(engine.scene, engine, room21.northZ, room21.northDoorX);

// room22 hangs its south doorway exactly on corridor24's far end.
const room22 = createRoom22(engine.scene, engine, corridor24.endZ, corridor24.x);

// twenty-fifth corridor starts at room22's north doorway and runs north to room23.
const corridor25 = createCorridorNorth(engine.scene, engine, room22.northZ, room22.northDoorX);

// room23 hangs its south doorway exactly on corridor25's far end.
const room23 = createRoom23(engine.scene, engine, corridor25.endZ, corridor25.x);

// twenty-sixth corridor starts at room23's north doorway and runs north to hall3.
const corridor26 = createCorridorNorth(engine.scene, engine, room23.northZ, room23.northDoorX);

// hall3 hangs its south doorway exactly on corridor26's far end.
const hall3 = createHall3(engine.scene, engine, corridor26.endZ, corridor26.x);

// twenty-seventh corridor starts at hall3's north doorway and runs north to room24.
const corridor27 = createCorridorNorth(engine.scene, engine, hall3.northZ, hall3.northDoorX);

// room24 hangs its south doorway exactly on corridor27's far end.
const room24 = createRoom24(engine.scene, engine, corridor27.endZ, corridor27.x);

// twenty-ninth corridor: a direct bridge between hall2 and hall3 — hall2's west
// doorway (previously a dead end) to hall3's east doorway (previously a dead
// end). Both doorways were placed to line up exactly on the same z, so this is
// a single straight westward passage, no bend needed.
const corridor29 = createCorridorWest(
  engine.scene,
  engine,
  hall2.westX,
  hall2.westDoorZ,
  hall2.westX - hall3.eastX
);

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

// seventeenth corridor starts at room15's north doorway and runs north to room16.
const corridor17 = createCorridorNorth(engine.scene, engine, room15.northZ, room15.northDoorX);

// room16 hangs its south doorway exactly on corridor17's far end — this is the
// small landing room that links room15 and hall1 together.
const room16 = createRoom16(engine.scene, engine, corridor17.endZ, corridor17.x);

// thirtieth corridor starts at room16's north doorway and runs north to room25 —
// the haveli's final chamber, which now holds the ancient door / win condition
// that used to be mounted (non-functionally, on a solid wall) in room16 itself.
const corridor30 = createCorridorNorth(engine.scene, engine, room16.northZ, room16.northDoorX);

// room25 hangs its south doorway exactly on corridor30's far end.
const room25 = createRoom25(engine.scene, engine, corridor30.endZ, corridor30.x);

// eighteenth/nineteenth corridor: a single L-shaped bridging passage from room16's
// east doorway — east to hall1's x position, then south into hall1's north doorway.
// Built as one bend (not two glued-together straight corridors) so the corner is a
// clean open turn instead of each piece's side walls sealing off the joint.
const corridor18 = createCorridorBendEastSouth(
  engine.scene,
  engine,
  room16.eastX,
  room16.eastDoorZ,
  hall1.centerX,
  hall1.northZ
);

// twenty-eighth corridor: bridges room16's west doorway to room24's east doorway.
// Room24 was previously a dead end reached only from hall3; this connects it
// onward into room16, and by extension the rest of that wing of the haveli.
//
// This is a three-segment jog (west, north, west), not a single L-bend, on
// purpose. Both room16's west doorway and room24's east doorway are crossed by
// walking in X (they're both "east-west facing" doors), and room24's doorway
// sits 4.5m further north than room16's. A single bend (west, then north) would
// have to run its north leg straight up room24's east wall to cover that
// offset — slicing through the solid wall segments on either side of the door
// instead of passing through the opening.
// An earlier fix chained two separately-built corridor pieces (a west-then-north
// bend, then a plain west corridor) to jog around that — but each piece's own
// side walls were built without knowing about the other, so they overlapped
// right at the join and left a wall stub blocking the doorway between them.
// createCorridorDoglegWestNorthWest builds all three legs and both corners as
// one shape instead, so the walls at the join are computed together and the
// passage is open and walkable the whole way through.
const corridor28TurnX = -16; // x position, clear of both rooms, where the passage jogs from room16's row to room24's row
const corridor28 = createCorridorDoglegWestNorthWest(
  engine.scene,
  engine,
  room16.westX,
  room16.westDoorZ,
  corridor28TurnX,
  room24.eastDoorZ,
  room24.eastX
);

// ---------- Vrishchik's map-wide patrol route ----------
// room21.js (where Vrishchik actually lives) only has access to its own
// room at construction time, so it seeds the enemy with a tiny two-point
// patrol confined to that room just so it isn't standing still. Now that
// every room above has been built, we can give it a real route: a long
// chain of room-center-to-room-center waypoints, ordered so every
// consecutive pair is a room that's *directly* connected by a corridor —
// this matters because Vrishchik's movement is a straight line toward its
// current target (with simple wall-sliding, not real pathfinding), so a
// waypoint pair that isn't directly connected could walk it straight into
// a wall instead of through the doorway between them.
//
// This deliberately routes AROUND the two bent corridors (corridor18's
// room16<->hall1 bend, and corridor28's room16<->room24 dogleg) rather
// than adding corner waypoints for them — both hall1 and room24 are also
// reachable via straight corridors (room9<->hall1 via corridor9, and
// hall3<->room24 via corridor27), so the route below uses those instead
// and stays entirely straight-line-safe.
//
// The list is built as a single walk that back-tracks out of dead-end
// branches (e.g. ... room17, room4, ... — go to room17, then straight
// back to room4 before continuing) rather than trying to find some
// perfect non-repeating tour, since revisiting a room is harmless for a
// patrol. It's also constructed as a closed loop — the first and last
// entries are both room1 — so when patrolIndex wraps back to 0 the "jump"
// from the last point to the first is a zero-distance no-op instead of a
// potentially invalid long-distance line.
//
// Assumes every room/hall object exposes centerX/centerZ, matching the
// convention already used by room21.js's own return value.
function buildVrishchikPatrolRoute() {
  const stops = [
    room1,
    room2, room4, room17, room4, room18, room19, room18, room20, room21,
    room22, room23, hall3, room24, hall3, hall2, room13, room12, room14,
    room12, room15, room16, room25, room16, room15, room12, room3,
    room10, room3, room11, room3, room2, room5, room6, room7, room6,
    room8, room6, room9, hall1, room9, room6, room5, room2,
    room1,
  ];
  return stops.map((r) => new THREE.Vector3(r.centerX, 0, r.centerZ));
}

room21.vrishchik.setPatrolPoints(buildVrishchikPatrolRoute());

const menu = document.getElementById("menu");
const playBtn = document.getElementById("play-btn");
const noteOverlay = document.getElementById("note-overlay");
const winOverlay = document.getElementById("win-overlay");
const fade = document.getElementById("fade");
const playAgainBtn = document.getElementById("play-again-btn");

// ---------- player death / respawn / lose-game state ----------
// playerDeaths counts how many times Vrishchik has caught the player.
// On deaths 1 and 2 the player is faded out, teleported back to room1's
// original spawn point, and faded back in. On death 3, the game ends: a
// "YOU DIED" overlay is shown and the game stays paused/unlocked until the
// player restarts (reloads the page).
//
// room21.js's Vrishchik dispatches a plain "game:caught" window event from
// its onCatchPlayer callback whenever it lands a hit — that's the event
// this file listens for below, mirroring the existing "game:win" pattern
// room25's door already uses.
let playerDeaths = 0;
const MAX_DEATHS = 3;
let gameOver = false;
let deathSequenceActive = false; // guards against a second catch firing mid-fade

/**
 * Builds (once) and returns a "YOU DIED" overlay. Created dynamically in JS
 * rather than assumed to exist in index.html, so this file works standalone
 * without requiring any HTML edits. If index.html already defines an element
 * with id="lose-overlay", that element is reused instead (its own CSS/classes
 * will apply; we still toggle it via inline display so it works either way).
 */
function createLoseOverlayIfNeeded() {
  let el = document.getElementById("lose-overlay");
  if (el) return el;

  el = document.createElement("div");
  el.id = "lose-overlay";
  el.style.cssText = [
    "position: fixed",
    "inset: 0",
    "display: none",
    "align-items: center",
    "justify-content: center",
    "flex-direction: column",
    "gap: 22px",
    "background: rgba(4,2,2,0.94)",
    "color: #eee",
    "z-index: 9999",
    "font-family: Georgia, 'Times New Roman', serif",
    "text-align: center",
  ].join(";");

  const title = document.createElement("h1");
  title.textContent = "YOU DIED";
  title.style.cssText = "font-size: 3rem; letter-spacing: 0.12em; color: #b02a2a; margin: 0; text-shadow: 0 0 18px rgba(176,42,42,0.6);";

  const subtitle = document.createElement("p");
  subtitle.textContent = "Vrishchik caught you three times.";
  subtitle.style.cssText = "font-size: 1.05rem; opacity: 0.75; margin: 0;";

  const restartBtn = document.createElement("button");
  restartBtn.id = "lose-restart-btn";
  restartBtn.textContent = "Restart";
  restartBtn.style.cssText = [
    "padding: 12px 30px",
    "font-size: 1rem",
    "cursor: pointer",
    "background: #b02a2a",
    "color: #fff",
    "border: none",
    "border-radius: 4px",
    "letter-spacing: 0.05em",
  ].join(";");
  restartBtn.addEventListener("click", () => window.location.reload());

  el.appendChild(title);
  el.appendChild(subtitle);
  el.appendChild(restartBtn);
  document.body.appendChild(el);
  return el;
}

const loseOverlay = createLoseOverlayIfNeeded();

function isLoseOverlayShown() {
  return loseOverlay.style.display === "flex" || loseOverlay.classList.contains("show");
}

function showLoseOverlay() {
  loseOverlay.style.display = "flex";
  loseOverlay.classList.add("show");
}

/** Teleports the player back to room1's original spawn point/orientation. */
function respawnPlayerAtRoom1() {
  engine.setSpawn(room1.spawnPoint, room1.spawnYaw);
  engine.velocity.set(0, 0, 0);
  if (engine.hiding) engine.exitHide();
}

/**
 * Handles a single "player caught" event: fades to black, then either
 * respawns the player at room1 (deaths 1-2) or ends the game with a lose
 * screen (death 3). Fired by room21.js's Vrishchik dispatching
 * `window.dispatchEvent(new CustomEvent("game:caught"))` from its
 * onCatchPlayer callback.
 */
function handlePlayerCaught() {
  if (gameOver || deathSequenceActive) return;
  deathSequenceActive = true;

  playerDeaths += 1;
  console.log(`[main.js] player caught by Vrishchik — deaths: ${playerDeaths}/${MAX_DEATHS}`);

  engine.pause();
  fade.classList.add("show");

  setTimeout(() => {
    if (playerDeaths >= MAX_DEATHS) {
      gameOver = true;
      engine.controls.unlock();
      fade.classList.remove("show");
      showLoseOverlay();
      deathSequenceActive = false;
    } else {
      respawnPlayerAtRoom1();
      // brief pause on the black screen at the new spot before fading back
      // in, so the teleport itself is never visible mid-fade
      setTimeout(() => {
        fade.classList.remove("show");
        engine.resume();
        deathSequenceActive = false;
      }, 250);
    }
  }, 900);
}

window.addEventListener("game:caught", handlePlayerCaught);

playBtn.addEventListener("click", () => {
  if (gameOver) return;
  engine.lock();
});

engine.controls.addEventListener("lock", () => {
  menu.style.display = "none";
  engine.resume();
});

engine.controls.addEventListener("unlock", () => {
  // don't show the main menu if the note overlay, the win screen, the lose
  // screen is open, or a death fade is mid-flight — those each have their
  // own flow
  if (
    !noteOverlay.classList.contains("show") &&
    !winOverlay.classList.contains("show") &&
    !isLoseOverlayShown() &&
    !deathSequenceActive &&
    !gameOver
  ) {
    menu.style.display = "flex";
  }
  engine.pause();
});

// ---------- win condition: room25's big door dispatches this when opened ----------
window.addEventListener("game:win", () => {
  if (gameOver) return;
  fade.classList.add("show");
  // let the door-opening animation and the fade-to-black play out before
  // cutting to the win screen and releasing the pointer lock
  setTimeout(() => {
    engine.pause();
    engine.controls.unlock();
    winOverlay.classList.add("show");
  }, 1700);
});

playAgainBtn.addEventListener("click", () => {
  window.location.reload();
});

engine.start((dt, eng) => {
  room1.update(dt, eng);
  corridor1.update(dt, eng);
  room2.update(dt, eng);
  corridor2.update(dt, eng);
  room3.update(dt, eng);
  corridor3.update(dt, eng);
  room4.update(dt, eng);
  corridor19.update(dt, eng);
  room17.update(dt, eng);
  corridor20.update(dt, eng);
  room18.update(dt, eng);
  corridor21.update(dt, eng);
  room19.update(dt, eng);
  corridor22.update(dt, eng);
  room20.update(dt, eng);
  corridor23.update(dt, eng);
  room21.update(dt, eng);
  corridor24.update(dt, eng);
  room22.update(dt, eng);
  corridor25.update(dt, eng);
  room23.update(dt, eng);
  corridor26.update(dt, eng);
  hall3.update(dt, eng);
  corridor27.update(dt, eng);
  room24.update(dt, eng);
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
  corridor12.update(dt, eng);
  room12.update(dt, eng);
  corridor13.update(dt, eng);
  room13.update(dt, eng);
  corridor14.update(dt, eng);
  hall2.update(dt, eng);
  corridor15.update(dt, eng);
  room14.update(dt, eng);
  corridor16.update(dt, eng);
  room15.update(dt, eng);
  corridor17.update(dt, eng);
  room16.update(dt, eng);
  corridor30.update(dt, eng);
  room25.update(dt, eng);
  corridor18.update(dt, eng);
  corridor28.update(dt, eng);
  corridor29.update(dt, eng);
});

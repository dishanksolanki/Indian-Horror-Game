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
// Room 24 continuing further north off Hall 3's north doorway, and bridged (east,
// then south) via a second corridor into Room 16's west doorway,
// and drives the menu / pause UI.
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

// twenty-eighth corridor: a bridging passage from room16's west doorway — west,
// then turning north, then a final short west leg — down to room24's east doorway.
// Room24 was previously a dead end reached only from hall3; this connects it onward
// into room16, and by extension the rest of that wing of the haveli.
//
// NOTE: this used to be a single createCorridorBendWestNorth call ending exactly
// at room24.eastX. That was a bug: room24's east doorway is a gap in a wall that
// runs north-south (crossed by walking east-west), so the corridor's *final* leg
// needs to be east-west too. A single west-then-north bend ends in a north-south
// leg instead, and that leg's centerline sat right on top of room24's own east
// wall — so room24's wall (everywhere except its 1.6m door gap) sliced straight
// across the corridor for most of its length, leaving only two ~0.7m-wide slivers
// either side. That's wide enough for a bare point to sneak through (which is why
// it looked like a corridor existed at all) but not wide enough for the player's
// collision capsule to actually pass — hence "there is a corridor but I can't
// get through it".
//
// The fix: stop the north leg short of room24's wall (at a cornerX safely east of
// it), then add one more short west leg that crosses into room24's door gap
// head-on, the same way every other straight east-west corridor in this game does.
const corridor28CornerX = room24.eastX + 2; // stays clear of room24's own east wall
const corridor28 = createCorridorBendWestNorth(
  engine.scene,
  engine,
  room16.westX,
  room16.westDoorZ,
  corridor28CornerX,
  room24.eastDoorZ
);
const corridor28b = createCorridorWest(
  engine.scene,
  engine,
  corridor28CornerX,
  room24.eastDoorZ,
  corridor28CornerX - room24.eastX
);

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
  corridor18.update(dt, eng);
  corridor28.update(dt, eng);
  corridor28b.update(dt, eng);
});

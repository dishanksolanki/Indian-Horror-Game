// shared.js — combines the small shared pieces used by the hammer/plank
// puzzle between room17 (hammer pickup) and room16 (planked main door):
//   - gameState:            tiny shared flag object
//   - createHammer():       hammer prop mesh
//   - createPlankBarricade(): plank barricade prop mesh
// Kept in one file so there's only one extra file to upload alongside
// room16.js and room17.js.

import * as THREE from "three";

// ---------------------------------------------------------------------
// gameState — a plain object other room modules import and read/write
// directly. No inventory UI exists yet in this project, so this is just
// enough to let room17's hammer unlock room16's planked door.
// ---------------------------------------------------------------------
export const gameState = {
  hasHammer: false,
};

// ---------------------------------------------------------------------
// createHammer — a simple claw hammer prop. Spawned on the wooden table
// in room17; picking it up lets the player break the plank off room16's
// main (north) door. Purely a static prop mesh — no physics, just geometry.
// ---------------------------------------------------------------------
export function createHammer() {
  const group = new THREE.Group();

  const handleMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.8 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3d, roughness: 0.35, metalness: 0.75 });

  // handle, resting on its side
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.021, 0.26, 8), handleMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, 0.021, 0);
  handle.castShadow = true;
  group.add(handle);

  // striking face
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.045, 0.045), headMat);
  head.position.set(0.15, 0.03, 0);
  head.castShadow = true;
  group.add(head);

  // claw, angled back from the head
  const claw = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.045), headMat);
  claw.position.set(0.2, 0.045, 0);
  claw.rotation.z = -0.5;
  claw.castShadow = true;
  group.add(claw);

  return group;
}

// ---------------------------------------------------------------------
// createPlankBarricade — a pair of rough wooden planks nailed in an X
// across a doorway, barricading it until the player breaks it off with
// a hammer. gapWidth/gapHeight: size of the doorway opening to span.
// ---------------------------------------------------------------------
export function createPlankBarricade(gapWidth, gapHeight) {
  const group = new THREE.Group();

  const plankMat = new THREE.MeshStandardMaterial({ color: 0x4a2f18, roughness: 0.95 });
  const nailMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.6 });

  const plankLen = Math.hypot(gapWidth, gapHeight) * 0.95;
  const plankW = 0.16;
  const plankT = 0.035;

  function addPlank(rotZ) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(plankLen, plankW, plankT), plankMat);
    plank.rotation.z = rotZ;
    plank.castShadow = true;
    plank.receiveShadow = true;
    group.add(plank);

    // a few nail heads along the plank so it reads as "nailed shut"
    for (let i = -1; i <= 1; i++) {
      const nail = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), nailMat);
      const localX = i * (plankLen / 2.6);
      nail.position.set(
        localX * Math.cos(rotZ),
        localX * Math.sin(rotZ),
        plankT / 2 + 0.006
      );
      group.add(nail);
    }
  }

  const diagAngle = Math.atan2(gapHeight, gapWidth);
  addPlank(diagAngle);
  addPlank(-diagAngle);

  return group;
}

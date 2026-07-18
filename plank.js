// plank.js — a pair of rough wooden planks nailed in an X across a doorway,
// barricading it until the player breaks it off with a hammer.
import * as THREE from "three";

// gapWidth/gapHeight: size of the doorway opening the planks should span.
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

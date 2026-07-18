// hammer.js — a simple claw hammer prop. Spawned on the wooden table in
// room17; picking it up lets the player break the plank off room16's main
// (north) door. Purely a static prop mesh — no physics, just geometry.
import * as THREE from "three";

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

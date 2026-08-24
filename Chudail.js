// chudail.js — procedural model for the Chudail / Daayan enemy.
//
// Built entirely from THREE.js primitives (BoxGeometry, CylinderGeometry,
// ConeGeometry, SphereGeometry) to match the rest of this codebase's
// low-poly aesthetic (see room1.js/room21.js walls, beams, floor) — no
// .glb/.gltf model file required.
//
// There is no skeleton/rig here — "animation" means directly rotating the
// joint pivot Groups this function returns (leftUpperArm, rightForearm,
// leftUpperLeg, etc.) every frame from chudailEnemy.js, the same way a
// simple puppet is posed. Each pivot Group is positioned at the joint
// origin with its mesh offset so rotations pivot correctly at the joint
// (e.g. rightUpperArm rotates at the shoulder, not the elbow).
//
// Returns { group, parts } — `group` is the THREE.Object3D to add to the
// scene and move around; `parts` exposes every joint/material a behavior
// controller needs to reference.

import * as THREE from "three";

export function createChudailModel() {
  const group = new THREE.Group();
  group.name = "chudail";

  // ---------- materials ----------
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xcabf9e, roughness: 0.85, metalness: 0.05 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x3f3436, roughness: 1 });
  const sareeMat = new THREE.MeshStandardMaterial({ color: 0x3d1030, roughness: 0.95, side: THREE.DoubleSide });
  const sareeTornMat = new THREE.MeshStandardMaterial({ color: 0x2a0b22, roughness: 1, side: THREE.DoubleSide });
  const bloodMat = new THREE.MeshStandardMaterial({ color: 0x4d0a0a, roughness: 1 });
  const hairMat = new THREE.MeshStandardMaterial({ color: 0x53504c, roughness: 1 });
  const teethMat = new THREE.MeshStandardMaterial({ color: 0x1c1a16, roughness: 0.5 });
  // shared so chudailEnemy.js can pulse emissiveIntensity for a "glowing" effect
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0x220000,
    emissive: 0xff1a1a,
    emissiveIntensity: 2.0,
    roughness: 0.35,
  });
  const bindiMat = new THREE.MeshStandardMaterial({ color: 0x8a0000, emissive: 0x4a0000, emissiveIntensity: 0.5 });
  const weaponBoneMat = new THREE.MeshStandardMaterial({ color: 0xd8cfa9, roughness: 0.75 });

  function addMesh(parent, geo, mat, x = 0, y = 0, z = 0, castShadow = true) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    parent.add(mesh);
    return mesh;
  }

  // ============================================================
  // HIPS (root of the puppet) — feet touch y=0, hips sit at hip height
  // ============================================================
  const HIP_Y = 0.95;
  const hips = new THREE.Group();
  hips.position.set(0, HIP_Y, 0);
  group.add(hips);

  // pelvis block
  addMesh(hips, new THREE.BoxGeometry(0.42, 0.22, 0.28), skinMat, 0, 0, 0);

  // ============================================================
  // TORSO — skeletal ribcage box + tattered saree draped over it
  // ============================================================
  const TORSO_H = 0.62;
  const torso = new THREE.Group();
  torso.position.set(0, 0.1, 0);
  hips.add(torso);

  addMesh(torso, new THREE.BoxGeometry(0.4, TORSO_H, 0.26), skinMat, 0, TORSO_H / 2, 0);
  // saree main wrap
  addMesh(torso, new THREE.CylinderGeometry(0.28, 0.34, TORSO_H + 0.25, 8, 1, true), sareeMat, 0, TORSO_H / 2 + 0.05, 0);
  // torn saree strips hanging below the hem — a few angled planes, irregular lengths
  const tornOffsets = [-0.18, -0.06, 0.05, 0.16, 0.24];
  tornOffsets.forEach((ox, i) => {
    const len = 0.35 + (i % 2) * 0.22;
    const strip = addMesh(
      torso,
      new THREE.PlaneGeometry(0.09, len),
      sareeTornMat,
      ox,
      -0.15 - len / 2,
      0.14 * Math.sign(ox || 1)
    );
    strip.rotation.y = (ox > 0 ? 1 : -1) * 0.5;
    strip.rotation.z = (Math.random() - 0.5) * 0.3;
  });
  // bloodstain patches
  addMesh(torso, new THREE.PlaneGeometry(0.22, 0.3), bloodMat, 0.05, TORSO_H * 0.4, 0.14).rotation.y = 0.1;
  addMesh(torso, new THREE.PlaneGeometry(0.12, 0.18), bloodMat, -0.1, TORSO_H * 0.15, 0.14).rotation.y = -0.2;

  // ============================================================
  // NECK + HEAD
  // ============================================================
  const neckHair = new THREE.Group(); // also carries the back-hair mass, used as the "hair" sway pivot
  neckHair.position.set(0, TORSO_H, 0);
  torso.add(neckHair);
  addMesh(neckHair, new THREE.CylinderGeometry(0.06, 0.07, 0.12, 6), skinMat, 0, 0.06, 0);

  const head = new THREE.Group();
  head.position.set(0, 0.2, 0);
  neckHair.add(head);
  addMesh(head, new THREE.BoxGeometry(0.24, 0.26, 0.24), skinMat, 0, 0, 0);

  // eyes — glowing red, set into the face
  const leftEye = addMesh(head, new THREE.SphereGeometry(0.03, 8, 8), eyeMaterial, -0.06, 0.03, 0.12);
  const rightEye = addMesh(head, new THREE.SphereGeometry(0.03, 8, 8), eyeMaterial, 0.06, 0.03, 0.12);
  // small point light riding with the head so the glow actually casts red light nearby
  const eyeLight = new THREE.PointLight(0xff2222, 0.5, 2.2, 2);
  eyeLight.position.set(0, 0.03, 0.1);
  head.add(eyeLight);

  // jagged teeth — a row of small dark cones along the lower jaw, open "mouth" gap above them
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.1, 0.1);
  head.add(jaw);
  for (let i = -2; i <= 2; i++) {
    const tooth = addMesh(jaw, new THREE.ConeGeometry(0.012, 0.05, 4), teethMat, i * 0.03, 0, 0);
    tooth.rotation.x = Math.PI;
  }

  // bindi — faint red dot on the forehead
  addMesh(head, new THREE.CircleGeometry(0.015, 10), bindiMat, 0, 0.08, 0.121).rotation.x = 0;

  // disheveled long grey hair — cluster of thin cones fanning from the crown and back,
  // hanging past the shoulders. Parented to neckHair so it sways as one mass.
  const hairStrandCount = 14;
  for (let i = 0; i < hairStrandCount; i++) {
    const angle = (i / hairStrandCount) * Math.PI * 1.6 - Math.PI * 0.8; // fan across back + sides, not the face
    const length = 0.35 + Math.random() * 0.35;
    const strand = addMesh(
      neckHair,
      new THREE.ConeGeometry(0.015, length, 4),
      hairMat,
      Math.sin(angle) * 0.11,
      0.24 - length / 2,
      Math.cos(angle) * 0.11 - 0.02
    );
    strand.rotation.x = Math.PI + (Math.random() - 0.5) * 0.4;
    strand.rotation.z = (Math.random() - 0.5) * 0.5;
  }

  // ============================================================
  // ARMS — shoulder pivot -> upper arm -> forearm pivot -> forearm -> hand
  // ============================================================
  function buildArm(side) {
    const sign = side === "left" ? -1 : 1;
    const shoulder = new THREE.Group();
    shoulder.position.set(sign * 0.24, TORSO_H - 0.06, 0);
    torso.add(shoulder);

    // bone spike jutting from the shoulder
    const shoulderSpike = addMesh(shoulder, new THREE.ConeGeometry(0.035, 0.16, 5), boneMat, sign * 0.06, 0.05, -0.02);
    shoulderSpike.rotation.z = sign * -0.9;
    shoulderSpike.rotation.x = -0.3;

    const UPPER_LEN = 0.28;
    addMesh(shoulder, new THREE.CylinderGeometry(0.035, 0.03, UPPER_LEN, 6), skinMat, 0, -UPPER_LEN / 2, 0);

    const forearmPivot = new THREE.Group();
    forearmPivot.position.set(0, -UPPER_LEN, 0);
    shoulder.add(forearmPivot);

    // bone spike on the forearm
    const forearmSpike = addMesh(forearmPivot, new THREE.ConeGeometry(0.028, 0.13, 5), boneMat, sign * 0.045, -0.08, 0);
    forearmSpike.rotation.z = sign * -1.1;

    const LOWER_LEN = 0.26;
    addMesh(forearmPivot, new THREE.CylinderGeometry(0.03, 0.025, LOWER_LEN, 6), skinMat, 0, -LOWER_LEN / 2, 0);

    const hand = new THREE.Group();
    hand.position.set(0, -LOWER_LEN, 0);
    forearmPivot.add(hand);
    addMesh(hand, new THREE.SphereGeometry(0.035, 6, 6), skinMat, 0, 0, 0);

    return { shoulder, forearmPivot, hand };
  }

  const leftArm = buildArm("left");
  const rightArm = buildArm("right");

  // ---------- weapon: bone-toothed sickle rolling pin, socketed to the right hand ----------
  const weaponSocket = new THREE.Group();
  rightArm.hand.add(weaponSocket);
  weaponSocket.rotation.x = Math.PI / 2.4; // angle the haft forward/down, roughly a natural grip

  // handle (the "rolling pin" barrel)
  addMesh(weaponSocket, new THREE.CylinderGeometry(0.028, 0.028, 0.32, 8), weaponBoneMat, 0, 0.16, 0);
  // curved sickle blade — a partial torus arcing off the top of the handle
  const blade = addMesh(
    weaponSocket,
    new THREE.TorusGeometry(0.16, 0.02, 6, 12, Math.PI * 1.1),
    weaponBoneMat,
    0,
    0.32,
    0
  );
  blade.rotation.x = Math.PI / 2;
  blade.rotation.z = -0.3;
  // bone teeth studding the outer curve of the blade
  const toothCount = 8;
  for (let i = 0; i < toothCount; i++) {
    const t = i / (toothCount - 1);
    const a = t * Math.PI * 1.1;
    const tx = Math.cos(a) * 0.16;
    const ty = Math.sin(a) * 0.16;
    const spike = addMesh(weaponSocket, new THREE.ConeGeometry(0.014, 0.06, 4), boneMat, tx, 0.32 + ty, 0.02);
    spike.rotation.z = -a;
    spike.rotation.x = Math.PI / 2;
  }

  // ============================================================
  // LEGS — hip pivot -> upper leg -> knee pivot -> lower leg
  // ============================================================
  function buildLeg(side) {
    const sign = side === "left" ? -1 : 1;
    const upperLeg = new THREE.Group();
    upperLeg.position.set(sign * 0.1, 0, 0);
    hips.add(upperLeg);

    const UPPER_LEN = 0.42;
    addMesh(upperLeg, new THREE.CylinderGeometry(0.045, 0.038, UPPER_LEN, 6), skinMat, 0, -UPPER_LEN / 2, 0);

    const lowerLeg = new THREE.Group();
    lowerLeg.position.set(0, -UPPER_LEN, 0);
    upperLeg.add(lowerLeg);

    // bone spike on the shin
    const shinSpike = addMesh(lowerLeg, new THREE.ConeGeometry(0.03, 0.15, 5), boneMat, 0, -0.2, sign * 0.03);
    shinSpike.rotation.x = 1.4;

    const LOWER_LEN = 0.4;
    addMesh(lowerLeg, new THREE.CylinderGeometry(0.038, 0.03, LOWER_LEN, 6), skinMat, 0, -LOWER_LEN / 2, 0);
    addMesh(lowerLeg, new THREE.BoxGeometry(0.06, 0.04, 0.12), skinMat, 0, -LOWER_LEN - 0.02, 0.03); // foot

    return { upperLeg, lowerLeg };
  }

  const leftLeg = buildLeg("left");
  const rightLeg = buildLeg("right");

  const parts = {
    hips,
    torso,
    hair: neckHair,
    head,
    leftEye,
    rightEye,
    eyeLight,
    eyeMaterial,
    leftShoulder: leftArm.shoulder,
    leftUpperArm: leftArm.shoulder,   // rotate this Group to swing the whole left arm from the shoulder
    leftForearm: leftArm.forearmPivot,
    leftHand: leftArm.hand,
    rightShoulder: rightArm.shoulder,
    rightUpperArm: rightArm.shoulder, // rotate this Group to swing the whole right (weapon) arm from the shoulder
    rightForearm: rightArm.forearmPivot,
    rightHand: rightArm.hand,
    weaponSocket,
    leftUpperLeg: leftLeg.upperLeg,
    leftLowerLeg: leftLeg.lowerLeg,
    rightUpperLeg: rightLeg.upperLeg,
    rightLowerLeg: rightLeg.lowerLeg,
  };

  return { group, parts };
}

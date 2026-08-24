// chudailEnemy.js — behavior controller for a Chudail enemy instance.
//
// Wraps the procedural model from chudail.js with a small state machine:
//   IDLE -> WALK (patrol) -> [sees player] -> PURSUE -> [in range] -> ATTACK
//   any of IDLE/WALK -> [hears a thrown item land, via engine.onNoise()] -> INVESTIGATE
//
// There's no skinned rig here (see chudail.js) — "animation" means directly
// rotating the joint pivot Groups exposed on `parts` every frame, the same
// way the Engine itself fakes headbob by nudging camera.position.y in
// engine.js's _updateMovement(). Movement/obstacle-avoidance reuses
// engine.colliders (a public array on Engine — see engine.js) with the same
// box-intersection approach as Engine._resolveCollision, just with a
// slightly larger box since this is a full-size monster, not a point.
//
// Usage from a room file (see room21.js for the wired-up example):
//
//   import { createChudailEnemy } from "./chudailEnemy.js";
//   const chudail = createChudailEnemy(scene, engine, {
//     position: new THREE.Vector3(centerX, 0, centerZ - 1.5),
//     yaw: Math.PI,
//     patrolPoints: [
//       new THREE.Vector3(centerX - 1.5, 0, centerZ + 1.5),
//       new THREE.Vector3(centerX + 1.5, 0, centerZ - 1.5),
//     ],
//     onCatchPlayer: () => window.dispatchEvent(new CustomEvent("game:caught")),
//   });
//   // then, inside the room's own update(dt, eng):
//   chudail.update(dt, eng);

import * as THREE from "three";
import { createChudailModel } from "./chudail.js";

export const ChudailState = Object.freeze({
  IDLE: "idle",
  WALK: "walk",
  INVESTIGATE: "investigate", // heading toward a noise, not yet aware of the player
  PURSUE: "pursue",
  ATTACK: "attack",
});

export function createChudailEnemy(scene, engine, {
  position = new THREE.Vector3(),
  yaw = 0,
  patrolPoints = null,       // optional THREE.Vector3[] to wander between while idle/walking
  sightRange = 7,            // distance (m) at which she can notice the player
  sightFov = Math.PI / 2.4,  // horizontal field of view (radians, full angle) for the sight check
  loseRange = 10,            // distance (m) at which an active chase is abandoned
  attackRange = 1.3,         // distance (m) at which an attack can connect
  attackWindup = 0.55,       // seconds of wind-up animation before the hit is checked
  attackRecover = 0.3,       // seconds after the hit-check before returning to chase/idle
  attackCooldown = 1.4,      // seconds before she can attack again
  walkSpeed = 1.5,
  pursueSpeed = 3.4,
  investigateSpeed = 2.0,
  onCatchPlayer = null,      // fired once, the instant an attack connects
} = {}) {
  const { group, parts } = createChudailModel();
  group.position.copy(position);
  group.rotation.y = yaw;
  scene.add(group);

  let state = ChudailState.IDLE;
  let stateT = 0;          // seconds spent in the current state
  let walkAnimT = 0;       // running phase clock for limb-swing animation
  let eyeAnimT = 0;        // running phase clock for the eye-glow pulse
  let attackTimer = 0;
  let attackHitChecked = false;
  let cooldownTimer = 0;
  let investigateTarget = null;
  let patrolIndex = 0;

  const _toPlayer = new THREE.Vector3();
  const _facing = new THREE.Vector3();
  const _dir = new THREE.Vector3();

  // --- noise hook: Granny/Kamla-style distraction (see engine.js's
  // onNoise()/throwHeldItem() doc comments). While not already actively
  // chasing or mid-swing, a thrown item's landing noise pulls her toward
  // its position instead of wherever she was headed.
  const unsubscribeNoise = engine.onNoise(({ position: noisePos }) => {
    if (state === ChudailState.PURSUE || state === ChudailState.ATTACK) return;
    investigateTarget = noisePos.clone();
    state = ChudailState.INVESTIGATE;
    stateT = 0;
  });

  function distanceToPlayer() {
    return group.position.distanceTo(engine.camera.position);
  }

  function canSeePlayer() {
    if (distanceToPlayer() > sightRange) return false;
    _toPlayer.copy(engine.camera.position).sub(group.position);
    _toPlayer.y = 0;
    if (_toPlayer.lengthSq() < 1e-6) return true;
    _toPlayer.normalize();
    _facing.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), group.rotation.y);
    return _facing.angleTo(_toPlayer) < sightFov / 2;
  }

  // Same box-intersection idea as Engine._resolveCollision (engine.js), just
  // with a bigger footprint/height for a full-size monster instead of a
  // player-radius point.
  function blocked(nextPos) {
    const r = 0.4;
    const box = new THREE.Box3(
      new THREE.Vector3(nextPos.x - r, 0, nextPos.z - r),
      new THREE.Vector3(nextPos.x + r, 1.9, nextPos.z + r)
    );
    for (const c of engine.colliders) {
      if (box.intersectsBox(c)) return true;
    }
    return false;
  }

  // Moves toward `target` at `speed`, sliding along a single axis if the
  // direct path is blocked (mirrors _moveWithCollision in engine.js).
  // Returns the remaining distance to the target BEFORE moving, so callers
  // can tell when they've effectively arrived.
  function moveToward(target, speed, dt) {
    _dir.copy(target).sub(group.position);
    _dir.y = 0;
    const dist = _dir.length();
    if (dist < 0.05) return dist;
    _dir.normalize();
    group.rotation.y = Math.atan2(_dir.x, _dir.z);

    const step = speed * dt;
    const next = group.position.clone().addScaledVector(_dir, step);
    if (!blocked(next)) {
      group.position.copy(next);
    } else {
      const nextX = group.position.clone(); nextX.x += _dir.x * step;
      const nextZ = group.position.clone(); nextZ.z += _dir.z * step;
      if (!blocked(nextX)) group.position.copy(nextX);
      else if (!blocked(nextZ)) group.position.copy(nextZ);
      // both blocked: stay put this frame rather than clipping through geometry
    }
    return dist;
  }

  function nextPatrolTarget() {
    if (!patrolPoints || patrolPoints.length === 0) return null;
    return patrolPoints[patrolIndex % patrolPoints.length];
  }

  // ---------- procedural animation ----------
  function pulseEyes(dt, speed) {
    eyeAnimT += dt * speed;
    parts.eyeMaterial.emissiveIntensity = 1.6 + Math.sin(eyeAnimT) * 0.6;
    parts.eyeLight.intensity = 0.4 + Math.max(0, Math.sin(eyeAnimT)) * 0.6;
  }

  function animateIdle(dt) {
    walkAnimT += dt * 0.6;
    parts.hair.rotation.z = Math.sin(walkAnimT) * 0.04;
    parts.torso.rotation.z = Math.sin(walkAnimT * 0.7) * 0.02;
    parts.leftUpperArm.rotation.x = Math.sin(walkAnimT) * 0.05;
    parts.rightUpperArm.rotation.x = Math.sin(walkAnimT + Math.PI) * 0.05;
    pulseEyes(dt, 1.6);
  }

  function animateWalk(dt, speedScale) {
    walkAnimT += dt * 5 * speedScale;
    const swing = Math.sin(walkAnimT);
    parts.leftUpperLeg.rotation.x = swing * 0.5;
    parts.rightUpperLeg.rotation.x = -swing * 0.5;
    parts.leftLowerLeg.rotation.x = Math.max(0, -swing) * 0.6;
    parts.rightLowerLeg.rotation.x = Math.max(0, swing) * 0.6;
    parts.leftUpperArm.rotation.x = -swing * 0.35;
    // right arm carries the weapon — keep its swing a bit tighter so the
    // sickle doesn't windmill wildly while just walking
    parts.rightUpperArm.rotation.x = swing * 0.2;
    parts.hair.rotation.z = Math.sin(walkAnimT * 0.5) * 0.08;
    pulseEyes(dt, speedScale > 1.8 ? 6 : 3);
  }

  function animateAttack(dt) {
    const p = Math.min(attackTimer / attackWindup, 1);
    // wind up (arm drawn back/up) for the first 60% of the windup, then
    // whip forward through the remaining 40% — the hit is checked right as
    // the forward swing completes, see checkAttackHit() below.
    const swing = p < 0.6 ? -(p / 0.6) : -(1 - (p - 0.6) / 0.4);
    parts.rightUpperArm.rotation.x = swing * 1.8;
    parts.rightForearm.rotation.x = swing * 0.7;
    pulseEyes(dt, 10);
  }

  // ---------- weapon hitbox ----------
  // Checked once, at the moment the forward swing completes (see the ATTACK
  // case in update()) rather than every frame during the swing, so a single
  // attack can only ever land a single hit.
  function checkAttackHit() {
    const weaponWorldPos = new THREE.Vector3();
    parts.weaponSocket.getWorldPosition(weaponWorldPos);
    return weaponWorldPos.distanceTo(engine.camera.position) < attackRange + 0.5;
  }

  function faceTowardPlayer() {
    _dir.copy(engine.camera.position).sub(group.position);
    _dir.y = 0;
    if (_dir.lengthSq() > 1e-6) {
      _dir.normalize();
      group.rotation.y = Math.atan2(_dir.x, _dir.z);
    }
  }

  function update(dt, eng) {
    stateT += dt;
    if (cooldownTimer > 0) cooldownTimer -= dt;

    const seesPlayer = canSeePlayer();

    switch (state) {
      case ChudailState.IDLE: {
        animateIdle(dt);
        if (seesPlayer) { state = ChudailState.PURSUE; stateT = 0; break; }
        if (stateT > 2.5) { state = ChudailState.WALK; stateT = 0; }
        break;
      }

      case ChudailState.WALK: {
        const target = nextPatrolTarget();
        if (!target) { state = ChudailState.IDLE; stateT = 0; break; }
        const remaining = moveToward(target, walkSpeed, dt);
        animateWalk(dt, 1);
        if (remaining < 0.2) { patrolIndex++; state = ChudailState.IDLE; stateT = 0; }
        if (seesPlayer) { state = ChudailState.PURSUE; stateT = 0; }
        break;
      }

      case ChudailState.INVESTIGATE: {
        if (!investigateTarget) { state = ChudailState.IDLE; stateT = 0; break; }
        const remaining = moveToward(investigateTarget, investigateSpeed, dt);
        animateWalk(dt, 1.3);
        if (remaining < 0.3) { investigateTarget = null; state = ChudailState.IDLE; stateT = 0; }
        if (seesPlayer) { state = ChudailState.PURSUE; stateT = 0; }
        break;
      }

      case ChudailState.PURSUE: {
        const dist = distanceToPlayer();
        if (!seesPlayer && dist > loseRange) { state = ChudailState.IDLE; stateT = 0; break; }
        if (dist < attackRange && cooldownTimer <= 0) {
          state = ChudailState.ATTACK;
          stateT = 0;
          attackTimer = 0;
          attackHitChecked = false;
          break;
        }
        moveToward(engine.camera.position, pursueSpeed, dt);
        animateWalk(dt, 2.4);
        break;
      }

      case ChudailState.ATTACK: {
        attackTimer += dt;
        animateAttack(dt);
        faceTowardPlayer();
        if (!attackHitChecked && attackTimer >= attackWindup) {
          attackHitChecked = true;
          if (checkAttackHit() && onCatchPlayer) onCatchPlayer();
          cooldownTimer = attackCooldown;
        }
        if (attackTimer >= attackWindup + attackRecover) {
          state = distanceToPlayer() < loseRange ? ChudailState.PURSUE : ChudailState.IDLE;
          stateT = 0;
        }
        break;
      }
    }
  }

  function dispose() {
    unsubscribeNoise();
    scene.remove(group);
  }

  return {
    group,
    parts,
    update,
    dispose,
    get state() { return state; },
  };
}

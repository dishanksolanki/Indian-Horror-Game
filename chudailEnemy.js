// chudailenemy.js — behavior controller for the haveli's stalking presence.
//
// Wraps the procedural model from chudail.js with a small state machine:
//   IDLE -> WALK (patrol) -> [sees player] -> PURSUE -> [in range] -> ATTACK
//   any of IDLE/WALK -> [hears a thrown item land, via engine.onNoise()] -> INVESTIGATE
//
// v2 note: the model this drives changed from a sickle-wielding elderly
// woman to a faceless shadow figure (see chudail.js's header) — the state
// machine, movement, obstacle avoidance, and attack-hitbox logic below are
// UNCHANGED, since none of that cared what she looked like. The only
// additions here are cosmetic: a small optional wisp-sway (if the model
// exposes parts.wisps) and eye-pulse tuning that suits "faint points of
// light" better than "glowing red demon eyes". Filename and exported
// function name (createChudailEnemy) are unchanged on purpose, so nothing
// importing this needs an import-path change.
//
// There's no skinned rig — "animation" means directly rotating the joint
// pivot Groups exposed on `parts` every frame, the same way the Engine
// itself fakes headbob by nudging camera.position.y in engine.js's
// _updateMovement(). Movement/obstacle-avoidance reuses engine.colliders
// (a public array on Engine — see engine.js) with the same box-intersection
// approach as Engine._resolveCollision, just with a slightly larger box
// since this is a full-size monster, not a point.
//
// Usage from a room file (see room21.js for the wired-up example):
//
//   import { createChudailEnemy } from "./chudailenemy.js";
//   const shadow = createChudailEnemy(scene, engine, {
//     position: new THREE.Vector3(centerX, 0, centerZ - 1.5),
//     yaw: Math.PI,
//     patrolPoints: [ ... ],
//     onCatchPlayer: () => window.dispatchEvent(new CustomEvent("game:caught")),
//   });
//   // then, inside the room's own update(dt, eng):
//   shadow.update(dt, eng);

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
  attackRange = 1.4,         // distance (m) at which an attack can connect (slightly longer than before — her arms are unnaturally long now)
  attackWindup = 0.5,        // seconds of wind-up animation before the hit is checked
  attackRecover = 0.3,       // seconds after the hit-check before returning to chase/idle
  attackCooldown = 1.4,      // seconds before she can attack again
  walkSpeed = 1.6,
  pursueSpeed = 3.6,
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
  let eyeAnimT = 0;        // running phase clock for the eye pulse
  let wispAnimT = 0;       // running phase clock for the wisp sway
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
      new THREE.Vector3(nextPos.x + r, 2.2, nextPos.z + r) // taller box — this design stands ~2.3m
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
    // faint points of light at rest, brightening toward a steady glow when
    // hunting — kept in the 0.15–0.7 alpha range throughout, never a hard
    // flash, since a faceless figure's only "tell" should read as subtle
    parts.eyeMaterial.opacity = 0.35 + Math.sin(eyeAnimT) * 0.2;
    parts.eyeLight.intensity = 0.08 + Math.max(0, Math.sin(eyeAnimT)) * 0.35;
  }

  function swayWisps(dt, speed) {
    if (!parts.wisps || parts.wisps.length === 0) return;
    wispAnimT += dt * speed;
    parts.wisps.forEach((wisp, i) => {
      wisp.rotation.z = Math.sin(wispAnimT + i * 1.3) * 0.15;
      wisp.material.opacity = 0.35 + Math.sin(wispAnimT * 1.4 + i) * 0.2;
    });
  }

  function animateIdle(dt) {
    walkAnimT += dt * 0.5;
    parts.hair.rotation.z = Math.sin(walkAnimT) * 0.03; // neck-pivot sway (see chudail.js header)
    parts.torso.rotation.z = Math.sin(walkAnimT * 0.6) * 0.015;
    parts.leftUpperArm.rotation.x = Math.sin(walkAnimT) * 0.04;
    parts.rightUpperArm.rotation.x = Math.sin(walkAnimT + Math.PI) * 0.04;
    pulseEyes(dt, 1.2);
    swayWisps(dt, 0.8);
  }

  function animateWalk(dt, speedScale) {
    walkAnimT += dt * 4.5 * speedScale;
    const swing = Math.sin(walkAnimT);
    parts.leftUpperLeg.rotation.x = swing * 0.55;
    parts.rightUpperLeg.rotation.x = -swing * 0.55;
    parts.leftLowerLeg.rotation.x = Math.max(0, -swing) * 0.55;
    parts.rightLowerLeg.rotation.x = Math.max(0, swing) * 0.55;
    parts.leftUpperArm.rotation.x = -swing * 0.3;
    parts.rightUpperArm.rotation.x = swing * 0.3;
    parts.hair.rotation.z = Math.sin(walkAnimT * 0.5) * 0.06;
    pulseEyes(dt, speedScale > 1.8 ? 5 : 2.4);
    swayWisps(dt, speedScale > 1.8 ? 3 : 1.5);
  }

  function animateAttack(dt) {
    const p = Math.min(attackTimer / attackWindup, 1);
    // wind up (long arm drawn back) for the first 60%, then whips forward —
    // the hit is checked right as the forward swing completes
    const swing = p < 0.6 ? -(p / 0.6) : -(1 - (p - 0.6) / 0.4);
    parts.rightUpperArm.rotation.x = swing * 1.6;
    parts.rightForearm.rotation.x = swing * 0.9;
    pulseEyes(dt, 8);
    swayWisps(dt, 5);
  }

  // ---------- attack hitbox ----------
  // Checked once, at the moment the forward swing completes (see the ATTACK
  // case in update()) rather than every frame during the swing, so a single
  // attack can only ever land a single hit. Reads the (empty) weaponSocket
  // Group's world position — she attacks bare-clawed, but the socket still
  // marks "where the strike lands" the same way a held weapon would.
  function checkAttackHit() {
    const strikeWorldPos = new THREE.Vector3();
    parts.weaponSocket.getWorldPosition(strikeWorldPos);
    return strikeWorldPos.distanceTo(engine.camera.position) < attackRange + 0.4;
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

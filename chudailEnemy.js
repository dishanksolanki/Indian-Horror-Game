// chudailenemy.js — behavior controller for the haveli's stalking presence.
//
// Wraps the procedural model from chudail.js with a small state machine:
//   IDLE -> WALK (patrol) -> [sees player] -> PURSUE -> [in range] -> ATTACK
//   any of IDLE/WALK -> [hears a thrown item land, via engine.onNoise()] -> INVESTIGATE
//
// v3 note — BEHAVIOR REWORK FOR HORROR: the model changed to a near-black,
// wrong-jointed "Stripped One" (see chudail.js v7/v8 headers). This pass
// changes how it MOVES, on the theory that in a horror game the animation
// and staging sell the scare far more than any amount of visible detail on
// the mesh — a fully-lit, cleanly-animated monster rarely reads as scary no
// matter how much gore is on it.
//
// Three additions, all inside PURSUE, none of which change the public API
// (update/dispose/state/onCatchPlayer all work exactly as before, so
// room21.js doesn't need to change):
//   1. STALK FREEZES — while chasing, it doesn't just close distance at a
//      constant speed. It randomly locks completely still for a beat,
//      as if it's just staring, then bursts forward at well above its
//      normal pursue speed. Unpredictable pacing is what makes a chase
//      feel dangerous instead of just being a speed stat.
//   2. NECK-SNAP ON SPOTTING — the instant it first sees the player (IDLE
//      or WALK -> PURSUE), the neck pivot snaps hard toward the player
//      for a few frames before smoothing out, instead of turning
//      gradually like the rest of the body. Reads as "it just noticed you"
//      rather than "it's facing your general direction."
//   3. JERKY CRAWL — pursuit animation is no longer a clean symmetric
//      walk cycle. Limb swing uses per-limb phase/speed jitter so the gait
//      looks broken/wrong instead of athletic, and the torso pitches
//      forward hard, dragging the arms low, like it's crawling more than
//      running.
//
// Everything else below (state machine shape, collision/obstacle
// avoidance, attack hitbox timing, noise hook) is UNCHANGED from the prior
// version, since none of that needed to change for this pass.

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
  attackRange = 1.4,         // distance (m) at which an attack can connect
  attackWindup = 0.5,        // seconds of wind-up animation before the hit is checked
  attackRecover = 0.3,       // seconds after the hit-check before returning to chase/idle
  attackCooldown = 1.4,      // seconds before she can attack again
  walkSpeed = 1.6,
  pursueSpeed = 3.2,         // baseline pursue speed — the lunge burst goes well above this
  lungeSpeedMult = 2.1,      // speed multiplier during a post-freeze burst
  lungeDuration = 0.55,      // seconds the burst lasts before settling back to pursueSpeed
  freezeChancePerSec = 0.35, // rough odds per second of triggering a stalk-freeze while pursuing
  freezeMinTime = 0.35,
  freezeMaxTime = 1.1,
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
  let attackTimer = 0;
  let attackHitChecked = false;
  let cooldownTimer = 0;
  let investigateTarget = null;
  let patrolIndex = 0;

  // --- stalk/lunge state (PURSUE only) ---
  let frozen = false;
  let freezeTimer = 0;
  let lungeTimer = 0; // > 0 while a post-freeze burst is active

  // --- neck-snap reaction, triggered once on first spotting the player ---
  let snapTimer = 0;
  const SNAP_DURATION = 0.18;

  const _toPlayer = new THREE.Vector3();
  const _facing = new THREE.Vector3();
  const _dir = new THREE.Vector3();

  // --- noise hook: a thrown item's landing noise pulls it toward that
  // position instead of wherever it was headed, unless already actively
  // chasing or mid-swing.
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
    const r = 0.35;
    const box = new THREE.Box3(
      new THREE.Vector3(nextPos.x - r, 0, nextPos.z - r),
      new THREE.Vector3(nextPos.x + r, 2.1, nextPos.z + r)
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
    // faint, cold, and small at rest; barely brighter when hunting — this
    // model is meant to almost vanish into darkness, not flare up
    parts.eyeMaterial.opacity = 0.22 + Math.sin(eyeAnimT) * 0.14;
    parts.eyeLight.intensity = 0.05 + Math.max(0, Math.sin(eyeAnimT)) * 0.16;
  }

  function animateIdle(dt) {
    walkAnimT += dt * 0.4;
    parts.hair.rotation.z = Math.sin(walkAnimT) * 0.02;
    parts.torso.rotation.z = Math.sin(walkAnimT * 0.5) * 0.01;
    parts.leftUpperArm.rotation.x = Math.sin(walkAnimT) * 0.03;
    parts.rightUpperArm.rotation.x = Math.sin(walkAnimT + Math.PI) * 0.03;
    pulseEyes(dt, 0.9);
  }

  function animateWalk(dt, speedScale) {
    walkAnimT += dt * 4.2 * speedScale;
    const swing = Math.sin(walkAnimT);
    parts.leftUpperLeg.rotation.x = swing * 0.5;
    parts.rightUpperLeg.rotation.x = -swing * 0.5;
    parts.leftLowerLeg.rotation.x = Math.max(0, -swing) * 0.4;
    parts.rightLowerLeg.rotation.x = Math.max(0, swing) * 0.4;
    parts.leftUpperArm.rotation.x = -swing * 0.25;
    parts.rightUpperArm.rotation.x = swing * 0.25;
    parts.hair.rotation.z = Math.sin(walkAnimT * 0.45) * 0.05;
    pulseEyes(dt, 1.6);
  }

  // Pursuit gait — deliberately broken-looking. Each limb runs at a
  // slightly different speed/phase (via distinct multipliers, not a clean
  // shared sine wave) so nothing lines up symmetrically, and the torso
  // pitches forward hard so the arms drag low, closer to a crawl than a
  // sprint. This replaces animateWalk() during PURSUE.
  function animateCrawl(dt, speedScale) {
    walkAnimT += dt * 6.5 * speedScale;
    const legSwing = Math.sin(walkAnimT);
    const legSwing2 = Math.sin(walkAnimT * 1.13 + 0.7); // deliberately not in sync with legSwing
    parts.leftUpperLeg.rotation.x = legSwing * 0.7;
    parts.rightUpperLeg.rotation.x = -legSwing2 * 0.75;
    parts.leftLowerLeg.rotation.x = Math.max(0, -legSwing) * 0.6;
    parts.rightLowerLeg.rotation.x = Math.max(0, legSwing2) * 0.65;

    // arms drag low and swing hard, out of phase with each other and with
    // the legs — the "wrongness" is in the lack of a clean shared rhythm
    const armSwing = Math.sin(walkAnimT * 0.83 + 1.4);
    const armSwing2 = Math.sin(walkAnimT * 1.31);
    parts.leftUpperArm.rotation.x = 0.9 + armSwing * 0.35;
    parts.rightUpperArm.rotation.x = 0.9 + armSwing2 * 0.35;
    parts.leftForearm.rotation.x = 0.5 + Math.abs(armSwing) * 0.4;
    parts.rightForearm.rotation.x = 0.5 + Math.abs(armSwing2) * 0.4;

    // torso pitches forward hard while closing distance, on top of its
    // resting hunch (set once in chudail.js) — an additional lean, not a
    // replacement, so it stacks with the base pose
    parts.torso.rotation.x = 0.32 + 0.18 + Math.sin(walkAnimT * 2) * 0.02;

    pulseEyes(dt, speedScale > 1.6 ? 4.5 : 2.6);
  }

  function animateAttack(dt) {
    const p = Math.min(attackTimer / attackWindup, 1);
    const swing = p < 0.6 ? -(p / 0.6) : -(1 - (p - 0.6) / 0.4);
    parts.rightUpperArm.rotation.x = 0.9 + swing * 1.5;
    parts.rightForearm.rotation.x = 0.5 + swing * 0.8;
    pulseEyes(dt, 7);
  }

  // Frozen "stalking" pose — completely still except the eye pulse, which
  // keeps a slow, deliberate breathing-like rhythm rather than stopping
  // dead, so it reads as "watching" rather than "paused".
  function animateFrozen(dt) {
    pulseEyes(dt, 0.7);
  }

  // ---------- attack hitbox ----------
  // Checked once, at the moment the forward swing completes, so a single
  // attack can only ever land a single hit. Reads the bone-blade
  // (weaponSocket)'s world position — see chudail.js — as "where the
  // strike lands", same role a held weapon's tip would play.
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

  // Triggered once, the instant it transitions into PURSUE from a state
  // where it wasn't already hunting. Snaps the neck hard toward the player
  // for SNAP_DURATION before the normal smoothed facing logic takes back
  // over — the "it just noticed you" jolt.
  function triggerSnapReaction() {
    snapTimer = SNAP_DURATION;
  }

  function applySnapReaction(dt) {
    if (snapTimer <= 0) return;
    snapTimer -= dt;
    _dir.copy(engine.camera.position).sub(group.position);
    _dir.y = 0;
    if (_dir.lengthSq() > 1e-6) {
      _dir.normalize();
      const targetYaw = Math.atan2(_dir.x, _dir.z) - group.rotation.y;
      // exaggerated, near-instant snap rather than an interpolated turn
      parts.hair.rotation.y = targetYaw * 0.9;
    }
    if (snapTimer <= 0) {
      parts.hair.rotation.y = 0; // hand back off to the normal sway animation
    }
  }

  function enterPursue() {
    const wasHunting = state === ChudailState.PURSUE || state === ChudailState.ATTACK;
    state = ChudailState.PURSUE;
    stateT = 0;
    if (!wasHunting) {
      triggerSnapReaction();
      frozen = false;
      freezeTimer = 0;
      lungeTimer = 0;
    }
  }

  function update(dt, eng) {
    stateT += dt;
    if (cooldownTimer > 0) cooldownTimer -= dt;
    applySnapReaction(dt);

    const seesPlayer = canSeePlayer();

    switch (state) {
      case ChudailState.IDLE: {
        animateIdle(dt);
        if (seesPlayer) { enterPursue(); break; }
        if (stateT > 2.5) { state = ChudailState.WALK; stateT = 0; }
        break;
      }

      case ChudailState.WALK: {
        const target = nextPatrolTarget();
        if (!target) { state = ChudailState.IDLE; stateT = 0; break; }
        const remaining = moveToward(target, walkSpeed, dt);
        animateWalk(dt, 1);
        if (remaining < 0.2) { patrolIndex++; state = ChudailState.IDLE; stateT = 0; }
        if (seesPlayer) { enterPursue(); }
        break;
      }

      case ChudailState.INVESTIGATE: {
        if (!investigateTarget) { state = ChudailState.IDLE; stateT = 0; break; }
        const remaining = moveToward(investigateTarget, investigateSpeed, dt);
        animateWalk(dt, 1.3);
        if (remaining < 0.3) { investigateTarget = null; state = ChudailState.IDLE; stateT = 0; }
        if (seesPlayer) { enterPursue(); }
        break;
      }

      case ChudailState.PURSUE: {
        const dist = distanceToPlayer();
        if (!seesPlayer && dist > loseRange) { state = ChudailState.IDLE; stateT = 0; frozen = false; break; }

        if (dist < attackRange && cooldownTimer <= 0) {
          state = ChudailState.ATTACK;
          stateT = 0;
          attackTimer = 0;
          attackHitChecked = false;
          frozen = false;
          break;
        }

        // --- stalk-freeze / lunge cycle ---
        if (lungeTimer > 0) {
          lungeTimer -= dt;
        }

        if (frozen) {
          freezeTimer -= dt;
          animateFrozen(dt);
          if (freezeTimer <= 0) {
            frozen = false;
            lungeTimer = lungeDuration; // burst forward once it un-freezes
          }
          break; // no movement while frozen — it's just staring
        }

        // only roll for a new freeze when not already bursting forward,
        // so a lunge always gets to play out
        if (lungeTimer <= 0 && Math.random() < freezeChancePerSec * dt) {
          frozen = true;
          freezeTimer = freezeMinTime + Math.random() * (freezeMaxTime - freezeMinTime);
          animateFrozen(dt);
          break;
        }

        const speed = lungeTimer > 0 ? pursueSpeed * lungeSpeedMult : pursueSpeed;
        moveToward(engine.camera.position, speed, dt);
        animateCrawl(dt, lungeTimer > 0 ? 2.2 : 1.4);
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

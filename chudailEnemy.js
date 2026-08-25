// chudailenemy.js — behavior controller for the haveli's stalking presence.
//
// v6 note: chudail.js v11 replaced the leg pair with a segmented naga tail
// (`parts.tailSegments`, base -> tip) and added a held cleaver
// (`parts.heldWeapon` / `parts.weaponTip`) alongside the existing forearm
// bone-blade. This update rewrites movement animation to match:
//   - animateWalk()/animateCrawl() no longer touch leftUpperLeg/
//     rightUpperLeg/leftLowerLeg/rightLowerLeg (those keys don't exist on
//     `parts` anymore). Both now call the new animateSlither(), which drives
//     a traveling side-to-side wave down parts.tailSegments — each segment
//     lags the one before it, so the wave visibly travels tip-ward as it
//     moves, the way a real slither reads.
//   - The torso's per-state forward pitch was softened to match chudail.js
//     v11 standing the character upright at rest (hunch 0.32 -> 0.04); the
//     PURSUE crawl-lean is now a smaller additional lean on top of that,
//     not a full hunch.
//   - checkAttackHit() now reads parts.weaponTip (the held cleaver's tip)
//     instead of parts.weaponSocket (the forearm blade) as the strike
//     point, since the player asked for the weapon to actually be the
//     thing gripped in the hand. The forearm blade still exists and still
//     visually threatens on every swing (animateAttack() moves the whole
//     arm), it's just no longer what's used for the hit math.
// State machine shape, collision/obstacle avoidance, and attack timing
// windows are otherwise unchanged from v5.
//
// ---- prior history (condensed) ----
// v5: added animateDrips() to actively animate chudail.js v10's wet-blood
//     teardrops (parts.drips) in every state.
// v4: added animation for chudail.js v9's big main head (hinged jaw, extra
//     eye sockets), 2 secondary heads, and a 2nd smaller arm pair.
// v3: BEHAVIOR REWORK FOR HORROR — stalk-freeze/lunge cycling, a neck-snap
//     reaction on first spotting the player, and (at the time) a jerky,
//     asymmetric crawl gait for the leg pair that has since been replaced
//     by the tail in v11/v6.
//
// Wraps the procedural model from chudail.js with a small state machine:
//   IDLE -> WALK (patrol) -> [sees player] -> PURSUE -> [in range] -> ATTACK
//   any of IDLE/WALK -> [hears a thrown item land, via engine.onNoise()] -> INVESTIGATE
//
// Everything below not called out above (state machine shape, collision,
// noise hook) is UNCHANGED from the prior version.

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
  let walkAnimT = 0;       // running phase clock for slither/limb-swing animation
  let eyeAnimT = 0;        // running phase clock for the eye pulse
  let dripAnimT = 0;       // running phase clock for the blood-drip fall cycle
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
    parts.eyeMaterial.opacity = 0.22 + Math.sin(eyeAnimT) * 0.14;
    parts.eyeLight.intensity = 0.05 + Math.max(0, Math.sin(eyeAnimT)) * 0.16;
    if (parts.extraHeads) {
      parts.extraHeads.forEach((h, i) => {
        h.light.intensity = 0.04 + Math.max(0, Math.sin(eyeAnimT * 1.3 + i * 2.1)) * 0.1;
      });
    }
  }

  // Animates every registered wet-blood drop (parts.drips): each stretches
  // downward, holds a highlighted bead at the tip, then resets on its own
  // phase-offset loop so they don't all fall in lockstep. `intensity`
  // scales fall speed/stretch — barely-there at idle, most active while
  // hunting/attacking.
  function animateDrips(dt, intensity) {
    if (!parts.drips) return;
    dripAnimT += dt;
    parts.drips.forEach((d) => {
      const cycle = 1.4 / Math.max(0.2, d.speed * (0.5 + intensity));
      const t = ((dripAnimT * d.speed * (0.5 + intensity) + d.phase) % cycle) / cycle;
      const fall = t * d.range;
      d.pivot.position.y = d.baseY - fall;
      const stretch = 1 + Math.sin(t * Math.PI) * 0.5 * (0.4 + intensity);
      d.drop.scale.y = stretch;
      d.bead.position.y = -d.len * stretch;
      const fadeIn = Math.min(1, t * 6);
      const fadeOut = Math.min(1, (1 - t) * 6);
      d.bead.visible = fadeIn > 0.05 && fadeOut > 0.05;
    });
  }

  // Independent twitch/sway for the extra heads and extra arm pair.
  // `restless` pushes amplitude/jaw-gape up for pursue/attack vs. a subtler
  // idle fidget. parts.extraHeads is length 2 as of chudail.js v11 (3
  // heads total with the main head) — this loop needed no change for that.
  function animateExtras(dt, restless) {
    if (parts.extraArms) {
      parts.extraArms.forEach((arm, i) => {
        const t = walkAnimT * (1.6 + i * 0.35) + i * 2.3;
        arm.shoulder.rotation.x = 0.3 + Math.sin(t) * (restless ? 0.55 : 0.14);
        arm.shoulder.rotation.z = Math.sin(t * 0.6 + i) * 0.1;
        arm.forearmPivot.rotation.x = 0.4 + Math.abs(Math.sin(t * 1.3)) * (restless ? 0.4 : 0.15);
      });
    }
    if (parts.extraHeads) {
      parts.extraHeads.forEach((h, i) => {
        const t = walkAnimT * (1.1 + i * 0.3) + i * 3.3;
        h.head.rotation.z = Math.sin(t) * 0.18;
        h.head.rotation.x = Math.sin(t * 0.7 + 1) * 0.12;
        h.jawPivot.rotation.x = Math.max(0, Math.sin(t * 1.9)) * (restless ? 0.45 : 0.12);
      });
    }
  }

  // Eases the main head's jaw toward a target open-amount rather than
  // snapping, so it reads as a deliberate gape rather than a glitch.
  function animateMainJaw(target, dt) {
    if (!parts.jawPivot) return;
    parts.jawPivot.rotation.x += (target - parts.jawPivot.rotation.x) * Math.min(1, dt * 6);
  }

  // v11/v6: replaces the old leg-based walk/crawl cycles entirely. Drives a
  // traveling side-to-side wave down parts.tailSegments (base -> tip) —
  // each segment's phase lags the one before it by `lag`, so the S-curve
  // visibly travels toward the tip as it moves, the way a real slither
  // reads, rather than every segment swinging in place together.
  // `speedScale` plays the same role it did for the old walk/crawl calls:
  // 1 for a patrol pace, higher during pursue/lunge.
  function animateSlither(dt, speedScale) {
    walkAnimT += dt * 3.2 * speedScale;
    if (parts.tailSegments) {
      const lag = 0.55;
      const amp = 0.22 + Math.min(0.22, speedScale * 0.08); // wider whip at higher speed
      parts.tailSegments.forEach((seg, i) => {
        seg.rotation.y = Math.sin(walkAnimT - i * lag) * amp * (1 - i / (parts.tailSegments.length * 1.6));
      });
    }
    // arms sway loosely opposite the tail's beat rather than a leg-swing
    // mirror — there's no leg cadence to lock to anymore
    const swing = Math.sin(walkAnimT * 0.7);
    parts.leftUpperArm.rotation.x = 0.15 + swing * 0.12;
    parts.rightUpperArm.rotation.x = 0.15 - swing * 0.12;
    parts.hair.rotation.z = Math.sin(walkAnimT * 0.4) * 0.04;
    pulseEyes(dt, 1.2 + speedScale * 0.6);
    animateExtras(dt, speedScale > 1.3);
    animateMainJaw(0.1 + Math.max(0, Math.sin(walkAnimT * 1.6)) * 0.12 * speedScale, dt);
    animateDrips(dt, Math.min(1, 0.15 + speedScale * 0.3));
    // a small additional forward lean while actively moving, stacked on
    // top of the near-upright resting pose set in chudail.js v11
    parts.torso.rotation.x = 0.04 + Math.min(0.16, speedScale * 0.06);
  }

  function animateIdle(dt) {
    walkAnimT += dt * 0.4;
    parts.hair.rotation.z = Math.sin(walkAnimT) * 0.02;
    parts.torso.rotation.z = Math.sin(walkAnimT * 0.5) * 0.01;
    parts.torso.rotation.x = 0.04; // resting upright pose from chudail.js v11
    parts.leftUpperArm.rotation.x = Math.sin(walkAnimT) * 0.03;
    parts.rightUpperArm.rotation.x = Math.sin(walkAnimT + Math.PI) * 0.03;
    if (parts.tailSegments) {
      parts.tailSegments.forEach((seg, i) => {
        // slow idle coil breathing rather than a full slither
        seg.rotation.y = Math.sin(walkAnimT * 0.6 - i * 0.4) * 0.04;
      });
    }
    pulseEyes(dt, 0.9);
    animateExtras(dt, false);
    animateMainJaw(0.05 + Math.max(0, Math.sin(walkAnimT * 1.7)) * 0.08, dt);
    animateDrips(dt, 0.05);
  }

  function animateAttack(dt) {
    const p = Math.min(attackTimer / attackWindup, 1);
    const swing = p < 0.6 ? -(p / 0.6) : -(1 - (p - 0.6) / 0.4);
    parts.rightUpperArm.rotation.x = 0.9 + swing * 1.5;
    parts.rightForearm.rotation.x = 0.5 + swing * 0.8;
    if (parts.tailSegments) {
      // a hard coiled brace through the tail at the strike, like it's
      // anchoring itself to put weight behind the swing
      parts.tailSegments.forEach((seg, i) => {
        seg.rotation.y = Math.sin(walkAnimT * 2 - i * 0.6) * 0.1 * (1 - i / (parts.tailSegments.length * 1.6));
      });
    }
    pulseEyes(dt, 7);
    animateExtras(dt, true);
    animateMainJaw(0.7, dt); // full gape at the moment of the strike
    animateDrips(dt, 1);
  }

  // Frozen "stalking" pose — the body stays completely still (that's the
  // point), but the extra heads keep a slow independent twitch and the
  // eye pulse keeps a slow, deliberate breathing-like rhythm, so it reads
  // as "watching" rather than "paused". The blood keeps dripping even when
  // everything else locks up — nothing about her is actually calm.
  function animateFrozen(dt) {
    pulseEyes(dt, 0.7);
    animateExtras(dt, false);
    animateMainJaw(0.15, dt);
    animateDrips(dt, 0.4);
  }

  // ---------- attack hitbox ----------
  // Checked once, at the moment the forward swing completes, so a single
  // attack can only ever land a single hit. v11/v6: reads the HELD
  // WEAPON's tip (parts.weaponTip, the gripped cleaver — see chudail.js)
  // as "where the strike lands", now that there's an actual weapon in
  // hand rather than only the forearm bone-blade.
  function checkAttackHit() {
    const strikeWorldPos = new THREE.Vector3();
    const tip = parts.weaponTip || parts.weaponSocket; // fall back just in case
    tip.getWorldPosition(strikeWorldPos);
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
        animateSlither(dt, 1);
        if (remaining < 0.2) { patrolIndex++; state = ChudailState.IDLE; stateT = 0; }
        if (seesPlayer) { enterPursue(); }
        break;
      }

      case ChudailState.INVESTIGATE: {
        if (!investigateTarget) { state = ChudailState.IDLE; stateT = 0; break; }
        const remaining = moveToward(investigateTarget, investigateSpeed, dt);
        animateSlither(dt, 1.3);
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
        animateSlither(dt, lungeTimer > 0 ? 2.4 : 1.6);
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

// seamstressEnemy.js — behavior controller for THE SEAMSTRESS.
//
// Core mechanic (the thing that makes her different from the old
// chudailenemy.js stalk/lunge design): SHE ONLY MOVES WHILE SHE IS
// OUTSIDE THE PLAYER'S VIEW. The instant she enters the camera's view
// frustum, she locks — mid-stride, mid-reach, thread tendrils frozen
// exactly where they were — and does not move again until the player
// looks away. This is checked every frame via `isInPlayerView()`, which
// is independent of `canSeePlayer()` (whether *she* can see/is aware of
// the player) — awareness and "is currently being watched" are two
// separate questions here, and both matter:
//   - awareness (canSeePlayer / noise) decides whether she starts hunting
//     at all, same as before.
//   - "is currently being watched" (isInPlayerView) gates movement in
//     every state once she's already active, including WALK/INVESTIGATE,
//     not just PURSUE.
//
// State machine:
//   IDLE -> WALK (patrol) -> [aware of player] -> PURSUE -> [in range] -> ATTACK
//   any of IDLE/WALK -> [hears a thrown item land] -> INVESTIGATE
// All movement states above additionally freeze on-sight per the rule
// above; ATTACK is exempt (once a strike begins it plays out even if the
// player whips the camera onto her mid-swing — a frozen mid-stab would be
// worse, not scarier).
//
// Collision/obstacle avoidance and the noise hook follow the same shape
// as chudailenemy.js so the two are easy to compare/swap.

import * as THREE from "three";
import { createSeamstressModel } from "./seamstress.js";

export const SeamstressState = Object.freeze({
  IDLE: "idle",
  WALK: "walk",
  INVESTIGATE: "investigate",
  PURSUE: "pursue",
  ATTACK: "attack",
});

export function createSeamstressEnemy(scene, engine, {
  position = new THREE.Vector3(),
  yaw = 0,
  patrolPoints = null,
  sightRange = 8,
  sightFov = Math.PI / 2.2,
  loseRange = 11,
  attackRange = 1.5,
  attackWindup = 0.6,
  attackRecover = 0.35,
  attackCooldown = 1.6,
  walkSpeed = 1.4,
  pursueSpeed = 2.6,       // note: deliberately not much faster than walk —
                            // the horror is that she closes distance whenever
                            // you're not looking, not that she's fast
  investigateSpeed = 1.8,
  viewFreezeFov = Math.PI / 3.2,   // half-angle*2 cone from camera forward that counts as "seen"
  viewFreezeMaxDist = 14,          // beyond this she's too far to register as "in view" for the freeze rule
  freezeEase = 10,                 // how sharply animation blends to a dead stop when frozen
  onCatchPlayer = null,
} = {}) {
  const { group, parts } = createSeamstressModel();
  group.position.copy(position);
  group.rotation.y = yaw;
  scene.add(group);

  let state = SeamstressState.IDLE;
  let stateT = 0;
  let animT = 0;         // running phase clock for tendril/limb animation
  let eyeAnimT = 0;
  let attackTimer = 0;
  let attackHitChecked = false;
  let cooldownTimer = 0;
  let investigateTarget = null;
  let patrolIndex = 0;

  let watched = false;      // is the player currently looking at her?
  let watchedBlend = 0;     // 0..1, eased toward `watched ? 1 : 0` so the
                             // freeze reads as a snap-still, not a stutter,
                             // while the un-freeze can ease out slightly

  const _toPlayer = new THREE.Vector3();
  const _facing = new THREE.Vector3();
  const _dir = new THREE.Vector3();
  const _camForward = new THREE.Vector3();

  const unsubscribeNoise = engine.onNoise(({ position: noisePos }) => {
    if (state === SeamstressState.PURSUE || state === SeamstressState.ATTACK) return;
    investigateTarget = noisePos.clone();
    state = SeamstressState.INVESTIGATE;
    stateT = 0;
  });

  function distanceToPlayer() {
    return group.position.distanceTo(engine.camera.position);
  }

  // Is SHE aware of the player (line of sight within her own fov)? Same
  // shape as chudailenemy.js's canSeePlayer().
  function canSeePlayer() {
    if (distanceToPlayer() > sightRange) return false;
    _toPlayer.copy(engine.camera.position).sub(group.position);
    _toPlayer.y = 0;
    if (_toPlayer.lengthSq() < 1e-6) return true;
    _toPlayer.normalize();
    _facing.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), group.rotation.y);
    return _facing.angleTo(_toPlayer) < sightFov / 2;
  }

  // Is the PLAYER currently looking at her? This drives the freeze rule
  // and is intentionally separate from canSeePlayer(). Uses the camera's
  // forward vector against the direction to her head, in full 3D (not
  // flattened to the horizontal plane) so looking up/down away from her
  // also counts as "not watched".
  function isInPlayerView() {
    const dist = distanceToPlayer();
    if (dist > viewFreezeMaxDist) return false;
    engine.camera.getWorldDirection(_camForward);
    _toPlayer.copy(group.position).sub(engine.camera.position);
    if (parts.head) {
      const headWorld = new THREE.Vector3();
      parts.head.getWorldPosition(headWorld);
      _toPlayer.copy(headWorld).sub(engine.camera.position);
    }
    if (_toPlayer.lengthSq() < 1e-6) return true;
    _toPlayer.normalize();
    return _camForward.angleTo(_toPlayer) < viewFreezeFov / 2;
  }

  function blocked(nextPos) {
    const r = 0.32;
    const box = new THREE.Box3(
      new THREE.Vector3(nextPos.x - r, 0, nextPos.z - r),
      new THREE.Vector3(nextPos.x + r, 2.0, nextPos.z + r)
    );
    for (const c of engine.colliders) {
      if (box.intersectsBox(c)) return true;
    }
    return false;
  }

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
    }
    return dist;
  }

  function nextPatrolTarget() {
    if (!patrolPoints || patrolPoints.length === 0) return null;
    return patrolPoints[patrolIndex % patrolPoints.length];
  }

  // ---------- procedural animation ----------

  // Faint red glow behind the stitched-shut eyes, strongest while hunting;
  // also the only thing still allowed to move a little even while frozen,
  // so a "frozen" pose still reads as watching back, not powered-off.
  function pulseEyes(dt, speed, active) {
    eyeAnimT += dt * speed;
    const target = 0.08 + Math.max(0, Math.sin(eyeAnimT)) * (0.1 + active * 0.35);
    parts.eyeSockets.forEach((e) => {
      e.glow.material.opacity += (target - e.glow.material.opacity) * Math.min(1, dt * 4);
    });
  }

  // Travelling wave down each of the five tendrils, each tendril offset in
  // phase so they don't all lash in lockstep. `speedScale` plays the same
  // role as in the old tail animation (1 = patrol pace, higher = hunting).
  function animateTendrils(dt, speedScale) {
    animT += dt * 2.6 * speedScale;
    const lag = 0.5;
    parts.tendrils.forEach((tendril, ti) => {
      const phaseOffset = ti * 1.3;
      tendril.segments.forEach((seg, i) => {
        const amp = 0.16 + Math.min(0.18, speedScale * 0.06);
        const wave = Math.sin(animT - i * lag + phaseOffset) * amp * (1 - i / (tendril.segments.length * 1.6));
        seg.rotation.y = wave;
      });
    });
  }

  // Idle tendril sway — much slower and smaller than active locomotion,
  // like they're drifting rather than propelling her.
  function idleTendrils(dt) {
    animT += dt * 0.5;
    parts.tendrils.forEach((tendril, ti) => {
      tendril.segments.forEach((seg, i) => {
        seg.rotation.y = Math.sin(animT - i * 0.4 + ti * 1.1) * 0.05;
      });
    });
  }

  // Arms sway loosely, opposite phase, needle-fingers trailing slightly
  // behind the wrist motion — no leg cadence to lock to, same rationale as
  // the old tendril/tail-driven arm sway.
  function animateArms(dt, speedScale) {
    const swing = Math.sin(animT * 0.6);
    parts.leftUpperArm.rotation.x = 0.12 + swing * 0.1 * speedScale;
    parts.rightUpperArm.rotation.x = 0.12 - swing * 0.1 * speedScale;
    parts.leftForearm.rotation.x = 0.15 + Math.sin(animT * 0.6 + 0.4) * 0.08 * speedScale;
    parts.rightForearm.rotation.x = 0.15 - Math.sin(animT * 0.6 + 0.4) * 0.08 * speedScale;
  }

  // The back-hump's small hidden face gets a rare, subtle twitch — never
  // in sync with anything else, so a player who happens to be looking at
  // her back catches something that reads as wrong rather than animated.
  function animateBackHump(dt, restless) {
    const t = animT * 0.35 + 4.1;
    const twitch = restless ? Math.sin(t * 2.3) * 0.06 : Math.sin(t) * 0.015;
    parts.backHump.rotation.z = 0.1 + twitch;
  }

  // Eases the mouth-stitch jaw group toward a target "tear open" amount.
  // Unlike a normal hinge, larger targets also nudge the stitch marks
  // apart slightly (handled by the caller scaling stitch.scale.y) so it
  // reads as ripping rather than opening.
  function animateMouth(target, dt) {
    if (!parts.jawPivot) return;
    parts.jawPivot.rotation.x += (target - parts.jawPivot.rotation.x) * Math.min(1, dt * 5);
    const stretch = 1 + parts.jawPivot.rotation.x * 1.5;
    parts.mouthStitches.forEach((st) => { st.scale.y = stretch; });
  }

  function animateFrozenHold(dt) {
    // Everything but the eye-glow and a hair-thin idle jaw twitch stops
    // dead. watchedBlend easing (applied by the caller before this) is
    // what makes the *transition* into this look like a snap rather than
    // a slow-down; this function is just "hold position".
    pulseEyes(dt, 2.2, 0.8);
  }

  function animateAttack(dt) {
    const p = Math.min(attackTimer / attackWindup, 1);
    const swing = p < 0.55 ? -(p / 0.55) : -(1 - (p - 0.55) / 0.45);
    parts.rightUpperArm.rotation.x = 0.6 + swing * 1.3;
    parts.rightForearm.rotation.x = 0.3 + swing * 0.6;
    animateTendrils(dt, 2.2);
    animateArms(dt, 0.4);
    pulseEyes(dt, 6, 1);
    animateMouth(0.55, dt); // stitches strain/tear at the moment of the strike
    animateBackHump(dt, true);
  }

  // ---------- attack hitbox ----------
  function checkAttackHit() {
    const strikeWorldPos = new THREE.Vector3();
    parts.needleTip.getWorldPosition(strikeWorldPos);
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

  function enterPursue() {
    state = SeamstressState.PURSUE;
    stateT = 0;
  }

  function update(dt, eng) {
    stateT += dt;
    if (cooldownTimer > 0) cooldownTimer -= dt;

    const seesPlayer = canSeePlayer();
    const isAttacking = state === SeamstressState.ATTACK;

    // Freeze rule applies to every state except ATTACK, which always
    // plays out once committed.
    const nowWatched = !isAttacking && isInPlayerView();
    watched = nowWatched;
    watchedBlend += ((watched ? 1 : 0) - watchedBlend) * Math.min(1, dt * freezeEase);
    const frozenByView = watchedBlend > 0.5;

    switch (state) {
      case SeamstressState.IDLE: {
        idleTendrils(dt);
        animateArms(dt, 0.15);
        pulseEyes(dt, 0.8, 0);
        animateMouth(0, dt);
        animateBackHump(dt, false);
        if (seesPlayer) { enterPursue(); break; }
        if (stateT > 3) { state = SeamstressState.WALK; stateT = 0; }
        break;
      }

      case SeamstressState.WALK: {
        const target = nextPatrolTarget();
        if (!target) { state = SeamstressState.IDLE; stateT = 0; break; }
        if (frozenByView) {
          animateFrozenHold(dt);
        } else {
          const remaining = moveToward(target, walkSpeed, dt);
          animateTendrils(dt, 1);
          animateArms(dt, 0.6);
          animateBackHump(dt, false);
          if (remaining < 0.2) { patrolIndex++; state = SeamstressState.IDLE; stateT = 0; }
        }
        if (seesPlayer) { enterPursue(); }
        break;
      }

      case SeamstressState.INVESTIGATE: {
        if (!investigateTarget) { state = SeamstressState.IDLE; stateT = 0; break; }
        if (frozenByView) {
          animateFrozenHold(dt);
        } else {
          const remaining = moveToward(investigateTarget, investigateSpeed, dt);
          animateTendrils(dt, 1.3);
          animateArms(dt, 0.8);
          animateBackHump(dt, true);
          if (remaining < 0.3) { investigateTarget = null; state = SeamstressState.IDLE; stateT = 0; }
        }
        if (seesPlayer) { enterPursue(); }
        break;
      }

      case SeamstressState.PURSUE: {
        const dist = distanceToPlayer();
        if (!seesPlayer && dist > loseRange) { state = SeamstressState.IDLE; stateT = 0; break; }

        if (dist < attackRange && cooldownTimer <= 0 && !frozenByView) {
          state = SeamstressState.ATTACK;
          stateT = 0;
          attackTimer = 0;
          attackHitChecked = false;
          break;
        }

        if (frozenByView) {
          // held mid-hunt: this is the scariest frame in the whole state
          // machine — she's close, aware, and dead still because you're
          // looking right at her.
          animateFrozenHold(dt);
          animateBackHump(dt, true);
        } else {
          moveToward(engine.camera.position, pursueSpeed, dt);
          animateTendrils(dt, 1.8);
          animateArms(dt, 1);
          pulseEyes(dt, 3, 1);
          animateBackHump(dt, true);
        }
        break;
      }

      case SeamstressState.ATTACK: {
        attackTimer += dt;
        animateAttack(dt);
        faceTowardPlayer();
        if (!attackHitChecked && attackTimer >= attackWindup) {
          attackHitChecked = true;
          if (checkAttackHit() && onCatchPlayer) onCatchPlayer();
          cooldownTimer = attackCooldown;
        }
        if (attackTimer >= attackWindup + attackRecover) {
          animateMouth(0, dt);
          state = distanceToPlayer() < loseRange ? SeamstressState.PURSUE : SeamstressState.IDLE;
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
    get isFrozenByView() { return watchedBlend > 0.5; },
  };
}

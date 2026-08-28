// vrishchikenemy.js — behavior controller for VRISHCHIK.
//
// Two things make this different from both prior villains:
//
// 1. HEXAPOD GAIT, NOT A HUMANOID WALK/CRAWL. vrishchik.js's six legs
//    (parts.legs) are grouped into a standard insect tripod pattern —
//    legs {front-left, mid-right, back-left} swing together while
//    {front-right, mid-left, back-right} stay planted, then they swap.
//    animateGait() drives femur/tibia rotation per-leg from that pattern
//    instead of any tail/limb-sway approach used before.
//
// 2. THE AREA ACTUALLY GETS DARKER AS IT CLOSES IN. This is a real
//    lighting effect, not just an animation flourish: every frame,
//    darkenWorld() eases `engine.renderer.toneMappingExposure` down from
//    its normal baseline toward a much dimmer floor as Vrishchik's
//    distance to the player shrinks below `darkenRadius`, and eases it
//    back up as it retreats or the room resets. This happens any time
//    it's physically close, independent of whether the player can see
//    or has noticed it — the dread cue reads even with your back turned.
//    The player's own flashlight is untouched (it still cuts through the
//    murk), which is the point: everything BUT what you're directly
//    lighting gets harder to make out.
//
// State machine (same shape as the last two, for consistency):
//   IDLE -> WALK (patrol) -> [aware of player] -> PURSUE -> [in range] -> ATTACK
//   any of IDLE/WALK -> [hears a thrown item land] -> INVESTIGATE

import * as THREE from "three";
import { createVrishchikModel } from "./vrishchik.js";

export const VrishchikState = Object.freeze({
  IDLE: "idle",
  WALK: "walk",
  INVESTIGATE: "investigate",
  PURSUE: "pursue",
  ATTACK: "attack",
});

// Standard hexapod tripod grouping: opposite corners + the middle leg on
// the near side move together. legs[] order from vrishchik.js is
// [FL, FR, ML, MR, BL, BR] (row-major: front pair, mid pair, back pair,
// left then right within each pair) — indices below reflect that.
const TRIPOD_A = [0, 3, 4]; // front-left, mid-right, back-left
const TRIPOD_B = [1, 2, 5]; // front-right, mid-left, back-right

export function createVrishchikEnemy(scene, engine, {
  position = new THREE.Vector3(),
  yaw = 0,
  patrolPoints = null,
  sightRange = 9,
  sightFov = Math.PI / 2.3,
  loseRange = 12,
  attackRange = 1.7,       // longer than the last two — the tail strikes at range
  attackWindup = 0.45,
  attackRecover = 0.3,
  attackCooldown = 1.5,
  walkSpeed = 1.8,
  pursueSpeed = 3.6,
  investigateSpeed = 2.2,
  darkenRadius = 7,         // distance (m) at which the exposure dimming starts kicking in
  darkenFloor = 0.35,       // toneMappingExposure multiplier at zero distance (0 = pitch black, 1 = no effect)
  darkenEase = 3.5,         // how quickly exposure eases toward its target each frame
  flashlightFlickerChance = 0.06, // rough odds per second of a brief flashlight dip when very close + hunting
  onCatchPlayer = null,
} = {}) {
  const { group, parts } = createVrishchikModel();
  group.position.copy(position);
  group.rotation.y = yaw;
  scene.add(group);

  // Baseline exposure captured at construction time so darkenWorld() has
  // a known "normal" to ease back up to, whatever the room set it to.
  const baseExposure = engine.renderer.toneMappingExposure;
  let currentExposureTarget = baseExposure;

  let state = VrishchikState.IDLE;
  let stateT = 0;
  let gaitT = 0;         // running phase clock for the tripod gait
  let animT = 0;         // running phase clock for tail/claw/mandible sway
  let attackTimer = 0;
  let attackHitChecked = false;
  let cooldownTimer = 0;
  let investigateTarget = null;
  let patrolIndex = 0;
  let flickerTimer = 0;

  const _toPlayer = new THREE.Vector3();
  const _facing = new THREE.Vector3();
  const _dir = new THREE.Vector3();

  const unsubscribeNoise = engine.onNoise(({ position: noisePos }) => {
    if (state === VrishchikState.PURSUE || state === VrishchikState.ATTACK) return;
    investigateTarget = noisePos.clone();
    state = VrishchikState.INVESTIGATE;
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

  function blocked(nextPos) {
    const r = 0.4;
    const box = new THREE.Box3(
      new THREE.Vector3(nextPos.x - r, 0, nextPos.z - r),
      new THREE.Vector3(nextPos.x + r, 1.4, nextPos.z + r)
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

  // ---------- world-darkening effect ----------
  // Eases engine.renderer.toneMappingExposure toward a target derived
  // from distance-to-player, every frame, regardless of state — this is
  // deliberately not gated on "is hunting" so the effect reads as an
  // ambient property of Vrishchik being nearby, not a hunt-mode tell.
  function darkenWorld(dt) {
    const dist = distanceToPlayer();
    const t = Math.max(0, Math.min(1, 1 - dist / darkenRadius)); // 0 far, 1 on top of it
    // ease t itself slightly so brief distance jitter doesn't flicker exposure
    currentExposureTarget = baseExposure * (1 - t * (1 - darkenFloor));
    engine.renderer.toneMappingExposure += (currentExposureTarget - engine.renderer.toneMappingExposure) * Math.min(1, dt * darkenEase);

    // occasional flashlight dip when it's right on top of the player and
    // actively hunting — reads as it briefly choking the light rather
    // than a bulb flicker
    if (engine.flashlightOn && (state === VrishchikState.PURSUE || state === VrishchikState.ATTACK) && dist < darkenRadius * 0.5) {
      flickerTimer -= dt;
      if (flickerTimer <= 0 && Math.random() < flashlightFlickerChance) {
        flickerTimer = 0.4 + Math.random() * 0.6;
        _flashlightDip();
      }
    }
  }

  function _flashlightDip() {
    const normalIntensity = engine.flashlight.intensity;
    engine.flashlight.intensity = normalIntensity * 0.15;
    setTimeout(() => {
      if (engine.flashlightOn) engine.flashlight.intensity = normalIntensity;
    }, 90 + Math.random() * 120);
  }

  function restoreWorldLighting() {
    engine.renderer.toneMappingExposure = baseExposure;
  }

  // ---------- procedural animation ----------

  // Tripod gait: each leg's swing phase comes from whichever tripod group
  // it's in (A/B, opposite phase). During swing, the femur lifts and the
  // tibia extends forward; during stance, the leg drags back under the
  // body at ground contact to "push" — a simplified but readable insect
  // walk rather than true IK foot-planting.
  function animateGait(dt, speedScale) {
    gaitT += dt * 5 * speedScale;
    parts.legs.forEach((leg, i) => {
      const inGroupA = TRIPOD_A.includes(i);
      const phase = gaitT + (inGroupA ? 0 : Math.PI);
      const lift = Math.max(0, Math.sin(phase));
      leg.femur.rotation.x = Math.sin(phase) * 0.35;
      leg.tibia.rotation.x = -lift * 0.5;
      leg.coxa.rotation.z = Math.sin(phase * 0.5) * 0.05 * leg.side;
    });
  }

  function idleLegSway(dt) {
    gaitT += dt * 0.6;
    parts.legs.forEach((leg, i) => {
      const phase = gaitT + i * 0.7;
      leg.femur.rotation.x = Math.sin(phase) * 0.04;
      leg.tibia.rotation.x = Math.sin(phase * 1.3) * 0.03;
    });
  }

  // Idle/patrol tail sway — slow, low amplitude, poised rather than
  // striking.
  function animateTailIdle(dt) {
    animT += dt * 0.5;
    parts.tailSegments.forEach((seg, i) => {
      seg.rotation.z = Math.sin(animT - i * 0.35) * 0.05;
    });
  }

  // Hunting tail — wider, faster sway, coiling tighter as if loading the
  // strike.
  function animateTailHunt(dt, speedScale) {
    animT += dt * 1.6 * speedScale;
    parts.tailSegments.forEach((seg, i) => {
      seg.rotation.z = Math.sin(animT - i * 0.3) * (0.08 + speedScale * 0.03);
    });
  }

  function animateClaws(dt, agitated) {
    const t = animT * (agitated ? 2.2 : 0.7);
    const spread = agitated ? 0.35 : 0.1;
    [parts.leftClawUpper, parts.leftClawLower, parts.rightClawUpper, parts.rightClawLower].forEach((c, i) => {
      const dir = i % 2 === 0 ? 1 : -1;
      c.rotation.x = Math.sin(t + i) * spread * dir * 0.3;
    });
    parts.leftForearm.rotation.x = 0.5 + Math.sin(t * 0.8) * 0.1;
    parts.rightForearm.rotation.x = 0.5 + Math.sin(t * 0.8 + 1) * 0.1;
  }

  function pulseEyes(dt, speed, intensity) {
    parts.eyeLight.intensity = 0.08 + Math.max(0, Math.sin(animT * speed)) * intensity;
    const op = 0.5 + Math.max(0, Math.sin(animT * speed)) * 0.35 * intensity;
    parts.eyeCluster.forEach((e) => { e.material.opacity = op; });
  }

  function animateMandibles(target, dt) {
    parts.jawPivot.rotation.x += (target - parts.jawPivot.rotation.x) * Math.min(1, dt * 6);
  }

  // The strike: the tail whips forward over the body toward the player.
  // Rather than animating every segment independently here, it drives a
  // shared "strike progress" curve across the chain — early segments lead,
  // later ones lag slightly — so the whole tail reads as one committed
  // lunge rather than each joint moving on its own.
  function animateAttack(dt) {
    const p = Math.min(attackTimer / attackWindup, 1);
    const strike = p < 0.5 ? -(p / 0.5) : -(1 - (p - 0.5) / 0.5);
    parts.tailSegments.forEach((seg, i) => {
      const lag = Math.max(0, 1 - i * 0.12);
      seg.rotation.x += strike * 0.5 * lag * dt * 12; // relative nudge toward the strike, eased by dt
    });
    animateClaws(dt, true);
    animateMandibles(0.6, dt);
    pulseEyes(dt, 8, 1);
    animateGait(dt, 0.3); // small ground-brace shuffle during the strike
  }

  // ---------- attack hitbox ----------
  function checkAttackHit() {
    const strikeWorldPos = new THREE.Vector3();
    parts.stingerTip.getWorldPosition(strikeWorldPos);
    return strikeWorldPos.distanceTo(engine.camera.position) < attackRange + 0.5;
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
    state = VrishchikState.PURSUE;
    stateT = 0;
  }

  function update(dt, eng) {
    stateT += dt;
    if (cooldownTimer > 0) cooldownTimer -= dt;

    darkenWorld(dt);

    const seesPlayer = canSeePlayer();

    switch (state) {
      case VrishchikState.IDLE: {
        idleLegSway(dt);
        animateTailIdle(dt);
        animateClaws(dt, false);
        pulseEyes(dt, 0.8, 0.3);
        animateMandibles(0, dt);
        if (seesPlayer) { enterPursue(); break; }
        if (stateT > 2.5) { state = VrishchikState.WALK; stateT = 0; }
        break;
      }

      case VrishchikState.WALK: {
        const target = nextPatrolTarget();
        if (!target) { state = VrishchikState.IDLE; stateT = 0; break; }
        const remaining = moveToward(target, walkSpeed, dt);
        animateGait(dt, 1);
        animateTailIdle(dt);
        animateClaws(dt, false);
        pulseEyes(dt, 1, 0.35);
        if (remaining < 0.2) { patrolIndex++; state = VrishchikState.IDLE; stateT = 0; }
        if (seesPlayer) { enterPursue(); }
        break;
      }

      case VrishchikState.INVESTIGATE: {
        if (!investigateTarget) { state = VrishchikState.IDLE; stateT = 0; break; }
        const remaining = moveToward(investigateTarget, investigateSpeed, dt);
        animateGait(dt, 1.3);
        animateTailHunt(dt, 0.6);
        animateClaws(dt, true);
        pulseEyes(dt, 1.6, 0.5);
        if (remaining < 0.3) { investigateTarget = null; state = VrishchikState.IDLE; stateT = 0; }
        if (seesPlayer) { enterPursue(); }
        break;
      }

      case VrishchikState.PURSUE: {
        const dist = distanceToPlayer();
        if (!seesPlayer && dist > loseRange) { state = VrishchikState.IDLE; stateT = 0; break; }

        if (dist < attackRange && cooldownTimer <= 0) {
          state = VrishchikState.ATTACK;
          stateT = 0;
          attackTimer = 0;
          attackHitChecked = false;
          break;
        }

        moveToward(engine.camera.position, pursueSpeed, dt);
        animateGait(dt, 1.8);
        animateTailHunt(dt, 1.4);
        animateClaws(dt, true);
        pulseEyes(dt, 3, 0.8);
        animateMandibles(0.15, dt);
        break;
      }

      case VrishchikState.ATTACK: {
        attackTimer += dt;
        animateAttack(dt);
        faceTowardPlayer();
        if (!attackHitChecked && attackTimer >= attackWindup) {
          attackHitChecked = true;
          if (checkAttackHit() && onCatchPlayer) onCatchPlayer();
          cooldownTimer = attackCooldown;
        }
        if (attackTimer >= attackWindup + attackRecover) {
          animateMandibles(0, dt);
          state = distanceToPlayer() < loseRange ? VrishchikState.PURSUE : VrishchikState.IDLE;
          stateT = 0;
        }
        break;
      }
    }
  }

  function dispose() {
    unsubscribeNoise();
    restoreWorldLighting();
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

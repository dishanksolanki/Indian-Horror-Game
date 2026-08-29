// vrishchikenemy.js — behavior controller for VRISHCHIK.
//
// NEW: "safe room" / no-entry zone support. Pass `noEntryZones` (an array of
// THREE.Box3) in the options — e.g. room1's and room7's floor footprints —
// and Vrishchik will:
//   1. never physically move into one (blocked() hard-stops at the boundary,
//      so it reads as hitting an invisible wall right at the doorway),
//   2. never "see" or chase a player who is standing inside one, and
//   3. immediately abandon PURSUE (without rolling an attack) the instant
//      the player crosses into one — this is the important part, since
//      attackRange is checked independently of movement, so without this a
//      monster camping just outside a doorway could still land a hit on a
//      player one step inside supposedly "safe" territory.

import * as THREE from "three";
import { createVrishchikModel } from "./vrishchik.js";
import { soundManager } from "./soundManager.js";
import { setupAudioUnlock } from "./soundSynth.js";

export const VrishchikState = Object.freeze({
  IDLE: "idle",
  WALK: "walk",
  INVESTIGATE: "investigate",
  PURSUE: "pursue",
  ATTACK: "attack",
});

const TRIPOD_A = [0, 3, 4];
const TRIPOD_B = [1, 2, 5];

export function createVrishchikEnemy(scene, engine, {
  position = new THREE.Vector3(),
  yaw = 0,
  patrolPoints = null,
  sightRange = 9,
  sightFov = Math.PI / 2.3,
  loseRange = 26,
  attackRange = 1.7,
  attackWindup = 0.45,
  attackRecover = 0.3,
  attackCooldown = 1.5,
  walkSpeed = 1.8,
  pursueSpeed = 3.6,
  investigateSpeed = 2.2,
  darkenRadius = 7,
  darkenFloor = 0.35,
  darkenEase = 3.5,
  flashlightFlickerChance = 0.06,
  growlUrl = "./sounds/vrishchik_growl.mp3",
  growlMaxVolume = 0.9,
  growlEase = 4,
  footstepUrl = "./sounds/vrishchik_footstep.mp3",
  footstepRefDistance = 2.5,
  footstepRolloffFactor = 1.6,
  footstepMaxDistance = 40,
  onCatchPlayer = null,
  // Array of THREE.Box3 the monster may never enter and treats the player
  // as unreachable inside (e.g. room1 + room7 floor footprints as safe
  // rooms). Empty by default so existing spawns are unaffected until you
  // pass zones explicitly.
  noEntryZones = [],
} = {}) {
  const { group, parts } = createVrishchikModel();
  group.position.copy(position);
  group.rotation.y = yaw;
  scene.add(group);

  const baseExposure = engine.renderer ? engine.renderer.toneMappingExposure : 1.0;
  let currentExposureTarget = baseExposure;

  let state = VrishchikState.IDLE;
  let stateT = 0;
  let gaitT = 0;
  let animT = 0;
  let attackTimer = 0;
  let attackHitChecked = false;
  let cooldownTimer = 0;
  let investigateTarget = null;
  let patrolIndex = 0;
  let flickerTimer = 0;

  const _toPlayer = new THREE.Vector3();
  const _facing = new THREE.Vector3();
  const _dir = new THREE.Vector3();

  const unsubscribeNoise = (engine.onNoise) ? engine.onNoise(({ position: noisePos }) => {
    if (state === VrishchikState.PURSUE || state === VrishchikState.ATTACK) return;
    // Don't investigate noises coming from inside a safe room either —
    // otherwise a thrown/dropped item there would still lure the monster
    // up to the doorway.
    if (pointInSafeZone(noisePos)) return;
    investigateTarget = noisePos.clone();
    state = VrishchikState.INVESTIGATE;
    stateT = 0;
  }) : () => {};

  // ---------- safe-zone helpers ----------
  function pointInSafeZone(pos) {
    for (const box of noEntryZones) {
      if (box.containsPoint(pos)) return true;
    }
    return false;
  }

  function playerInSafeZone() {
    if (!engine.camera) return false;
    return pointInSafeZone(engine.camera.position);
  }

  function distanceToPlayer() {
    if (!engine.camera) return 999;
    return group.position.distanceTo(engine.camera.position);
  }

  function canSeePlayer() {
    if (!engine.camera) return false;
    if (playerInSafeZone()) return false; // can't be spotted once inside a safe room
    if (distanceToPlayer() > sightRange) return false;
    _toPlayer.copy(engine.camera.position).sub(group.position);
    _toPlayer.y = 0;
    if (_toPlayer.lengthSq() < 1e-6) return true;
    _toPlayer.normalize();
    _facing.set(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), group.rotation.y);
    return _facing.angleTo(_toPlayer) < sightFov / 2;
  }

  function blocked(nextPos) {
    if (pointInSafeZone(nextPos)) return true; // hard stop at the safe-room boundary

    if (!engine.colliders) return false;
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

  function setPatrolPoints(points) {
    patrolPoints = points;
    patrolIndex = 0;
  }

  /**
   * Replace or extend the monster's no-entry zones at runtime — handy if
   * rooms are built/positioned after the enemy is spawned, or if a safe
   * room should only become safe once some puzzle flag is set.
   * @param {THREE.Box3[]} zones
   */
  function setNoEntryZones(zones) {
    noEntryZones = zones || [];
  }

  function addNoEntryZone(box3) {
    noEntryZones.push(box3);
  }

  function darkenWorld(dt) {
    if (!engine.renderer) return;

    // Don't dim/flicker the world for a player who's safely tucked inside
    // a no-entry zone — let lighting recover toward normal instead.
    if (playerInSafeZone()) {
      currentExposureTarget = baseExposure;
      engine.renderer.toneMappingExposure += (currentExposureTarget - engine.renderer.toneMappingExposure) * Math.min(1, dt * darkenEase);
      return;
    }

    const dist = distanceToPlayer();
    const t = Math.max(0, Math.min(1, 1 - dist / darkenRadius));
    currentExposureTarget = baseExposure * (1 - t * (1 - darkenFloor));
    engine.renderer.toneMappingExposure += (currentExposureTarget - engine.renderer.toneMappingExposure) * Math.min(1, dt * darkenEase);

    if (engine.flashlightOn && (state === VrishchikState.PURSUE || state === VrishchikState.ATTACK) && dist < darkenRadius * 0.5) {
      flickerTimer -= dt;
      if (flickerTimer <= 0 && Math.random() < flashlightFlickerChance) {
        flickerTimer = 0.4 + Math.random() * 0.6;
        _flashlightDip();
      }
    }
  }

  function _flashlightDip() {
    if (!engine.flashlight) return;
    const normalIntensity = engine.flashlight.intensity;
    engine.flashlight.intensity = normalIntensity * 0.15;
    setTimeout(() => {
      if (engine.flashlightOn && engine.flashlight) engine.flashlight.intensity = normalIntensity;
    }, 90 + Math.random() * 120);
  }

  function restoreWorldLighting() {
    if (engine.renderer) engine.renderer.toneMappingExposure = baseExposure;
  }

  const audioListener = soundManager.getListener(engine.camera);

  // Proximity Growl
  const growlSound = new THREE.Audio(audioListener);
  let growlLoaded = false;

  soundManager.loadBuffer(audioListener, growlUrl, "growl", (buffer) => {
    growlSound.setBuffer(buffer);
    growlSound.setLoop(true);
    growlSound.setVolume(0);
    try { growlSound.play(); } catch (e) {}
    growlLoaded = true;
  });

  function updateProximitySound(dt) {
    if (!growlLoaded) return;
    setupAudioUnlock(audioListener.context);

    // Fade the growl out (rather than spiking it) once the player is safe,
    // instead of continuing to ramp with raw proximity through the wall.
    const inSafeZone = playerInSafeZone();
    const dist = distanceToPlayer();
    const t = inSafeZone ? 0 : Math.max(0, Math.min(1, 1 - dist / darkenRadius));
    const targetVolume = t * t * growlMaxVolume;
    const currentVol = growlSound.getVolume();
    const nextVolume = currentVol + (targetVolume - currentVol) * Math.min(1, dt * growlEase);
    growlSound.setVolume(nextVolume);

    if (nextVolume > 0.01 && !growlSound.isPlaying && audioListener.context.state === "running") {
      try { growlSound.play(); } catch (e) {}
    }

    const targetRate = (state === VrishchikState.PURSUE || state === VrishchikState.ATTACK) ? 1.15 : 1.0;
    if (growlSound.source && growlSound.source.playbackRate) {
      const currentRate = growlSound.source.playbackRate.value;
      growlSound.source.playbackRate.value = currentRate + (targetRate - currentRate) * Math.min(1, dt * 2);
    }
  }

  // Directional Footsteps
  const footstepSound = new THREE.PositionalAudio(audioListener);
  footstepSound.setRefDistance(footstepRefDistance);
  footstepSound.setRolloffFactor(footstepRolloffFactor);
  footstepSound.setDistanceModel("inverse");
  footstepSound.setMaxDistance(footstepMaxDistance);
  group.add(footstepSound);

  let footstepBuffer = null;
  let footstepLoaded = false;

  soundManager.loadBuffer(audioListener, footstepUrl, "footstep", (buffer) => {
    footstepBuffer = buffer;
    footstepLoaded = true;
  });

  function playFootstepHit(speedScale) {
    if (!footstepLoaded || !footstepBuffer) return;
    setupAudioUnlock(audioListener.context);

    if (footstepSound.isPlaying) footstepSound.stop();
    footstepSound.setBuffer(footstepBuffer);
    footstepSound.setPlaybackRate(0.85 + speedScale * 0.15 + Math.random() * 0.06);
    footstepSound.setVolume(Math.min(0.55 + speedScale * 0.2, 1));
    try { footstepSound.play(); } catch (e) {}
  }

  let lastFootPhaseSign = 1;
  function triggerFootstepsFromGait(speedScale) {
    const sign = Math.sin(gaitT) >= 0 ? 1 : -1;
    if (sign !== lastFootPhaseSign) {
      lastFootPhaseSign = sign;
      playFootstepHit(speedScale);
    }
  }

  function animateGait(dt, speedScale) {
    gaitT += dt * 5 * speedScale;
    triggerFootstepsFromGait(speedScale);
    parts.legs.forEach((leg, i) => {
      const inGroupA = TRIPOD_A.includes(i);
      const phase = gaitT + (inGroupA ? 0 : Math.PI);
      const lift = Math.max(0, Math.sin(phase));
      leg.femur.rotation.x = Math.sin(phase) * 0.35;
      leg.tibia.rotation.x = -lift * 0.5;
      if (leg.coxa) leg.coxa.rotation.z = Math.sin(phase * 0.5) * 0.05 * leg.side;
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

  function animateTailIdle(dt) {
    animT += dt * 0.5;
    parts.tailSegments.forEach((seg, i) => {
      seg.rotation.z = Math.sin(animT - i * 0.35) * 0.05;
    });
  }

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
      if (c) {
        const dir = i % 2 === 0 ? 1 : -1;
        c.rotation.x = Math.sin(t + i) * spread * dir * 0.3;
      }
    });
    if (parts.leftForearm) parts.leftForearm.rotation.x = 0.5 + Math.sin(t * 0.8) * 0.1;
    if (parts.rightForearm) parts.rightForearm.rotation.x = 0.5 + Math.sin(t * 0.8 + 1) * 0.1;
  }

  function pulseEyes(dt, speed, intensity) {
    if (parts.eyeLight) parts.eyeLight.intensity = 0.08 + Math.max(0, Math.sin(animT * speed)) * intensity;
    const op = 0.5 + Math.max(0, Math.sin(animT * speed)) * 0.35 * intensity;
    if (parts.eyeCluster) {
      parts.eyeCluster.forEach((e) => { e.material.opacity = op; });
    }
  }

  function animateMandibles(target, dt) {
    if (parts.jawPivot) {
      parts.jawPivot.rotation.x += (target - parts.jawPivot.rotation.x) * Math.min(1, dt * 6);
    }
  }

  function animateAttack(dt) {
    const p = Math.min(attackTimer / attackWindup, 1);
    const strike = p < 0.5 ? -(p / 0.5) : -(1 - (p - 0.5) / 0.5);
    parts.tailSegments.forEach((seg, i) => {
      const lag = Math.max(0, 1 - i * 0.12);
      seg.rotation.x += strike * 0.5 * lag * dt * 12;
    });
    animateClaws(dt, true);
    animateMandibles(-0.95, dt);
    pulseEyes(dt, 8, 1);
    animateGait(dt, 0.3);
  }

  function checkAttackHit() {
    if (!parts.stingerTip || !engine.camera) return false;
    if (playerInSafeZone()) return false; // never let a strike land once the player is safe
    const strikeWorldPos = new THREE.Vector3();
    parts.stingerTip.getWorldPosition(strikeWorldPos);
    return strikeWorldPos.distanceTo(engine.camera.position) < attackRange + 0.5;
  }

  function faceTowardPlayer() {
    if (!engine.camera) return;
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

  function setState(newState) {
    state = newState;
    stateT = 0;
  }

  function getState() {
    return state;
  }

  function update(dt, eng) {
    stateT += dt;
    if (cooldownTimer > 0) cooldownTimer -= dt;

    darkenWorld(dt);
    updateProximitySound(dt);

    const seesPlayer = canSeePlayer();

    switch (state) {
      case VrishchikState.IDLE: {
        idleLegSway(dt);
        animateTailIdle(dt);
        animateClaws(dt, false);
        pulseEyes(dt, 0.8, 0.3);
        animateMandibles(-0.22, dt);
        if (seesPlayer) { enterPursue(); break; }
        if (stateT > 2.5 && patrolPoints && patrolPoints.length > 0) { state = VrishchikState.WALK; stateT = 0; }
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
        // Player reached a safe room — give up the chase immediately and
        // never roll into ATTACK, even if standing right at the doorway
        // and technically within attackRange.
        if (playerInSafeZone()) {
          state = VrishchikState.IDLE;
          stateT = 0;
          break;
        }

        const dist = distanceToPlayer();
        if (!seesPlayer && dist > loseRange) { state = VrishchikState.IDLE; stateT = 0; break; }

        if (dist < attackRange && cooldownTimer <= 0) {
          state = VrishchikState.ATTACK;
          stateT = 0;
          attackTimer = 0;
          attackHitChecked = false;
          break;
        }

        if (engine.camera) moveToward(engine.camera.position, pursueSpeed, dt);
        animateGait(dt, 1.8);
        animateTailHunt(dt, 1.4);
        animateClaws(dt, true);
        pulseEyes(dt, 3, 0.8);
        animateMandibles(-0.45, dt);
        break;
      }

      case VrishchikState.ATTACK: {
        attackTimer += dt;
        animateAttack(dt);
        faceTowardPlayer();

        // Player slipped into a safe room mid-windup — abort without
        // registering a hit or advancing the normal recovery flow.
        if (playerInSafeZone()) {
          attackHitChecked = true;
          cooldownTimer = attackCooldown;
          animateMandibles(-0.22, dt);
          state = VrishchikState.IDLE;
          stateT = 0;
          break;
        }

        if (!attackHitChecked && attackTimer >= attackWindup) {
          attackHitChecked = true;
          if (checkAttackHit() && onCatchPlayer) onCatchPlayer();
          cooldownTimer = attackCooldown;
        }
        if (attackTimer >= attackWindup + attackRecover) {
          animateMandibles(-0.22, dt);
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
    if (growlSound.isPlaying) growlSound.stop();
    if (footstepSound.isPlaying) footstepSound.stop();
    scene.remove(group);
  }

  return {
    group,
    parts,
    update,
    dispose,
    setPatrolPoints,
    setState,
    getState,
    setNoEntryZones,
    addNoEntryZone,
    get state() { return state; },
  };
}

// vrishchikenemy.js — behavior controller for VRISHCHIK.
//
// Three things make this different from both prior villains:
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
// 3. PROXIMITY GROWL + DIRECTIONAL FOOTSTEPS. A low, looping growl fades
//    in as it closes the distance, using the exact same distance/radius
//    shape as darkenWorld() (see updateProximitySound()) so the audio
//    and visual dread cues track together — the room gets darker AND
//    louder at the same rate. It also creeps up in pitch while actively
//    hunting (PURSUE/ATTACK) for extra tension. The growl is
//    DELIBERATELY non-positional (a plain THREE.Audio pinned to the
//    camera) — see the comment above growlSound below — so proximity is
//    felt but doesn't reveal direction.
//
//    Footsteps are the opposite on purpose: THREE.PositionalAudio
//    attached to `group` itself, so the Web Audio panner node's real
//    stereo/distance falloff tracks Vrishchik's actual position as it
//    moves. That's what lets the player tell WHICH DIRECTION it's
//    coming from and try to move away from it, even off-screen or
//    behind a wall. Footstep hits are synced to the tripod gait's own
//    phase (see triggerFootstepsFromGait()) so they land exactly on the
//    visual footfall rather than firing on an arbitrary timer, and only
//    play while it's actually moving (WALK/INVESTIGATE/PURSUE/ATTACK's
//    brace-shuffle) — never during IDLE, so silence still means "not
//    moving right now."
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
  loseRange = 26, // bumped up now that it roams the whole map — a room-scale loseRange would make it give up the instant the player ducked through a doorway
  attackRange = 1.7, // longer than the last two — the tail strikes at range
  attackWindup = 0.45,
  attackRecover = 0.3,
  attackCooldown = 1.5,
  walkSpeed = 1.8,
  pursueSpeed = 3.6,
  investigateSpeed = 2.2,
  darkenRadius = 7, // distance (m) at which the exposure dimming starts kicking in
  darkenFloor = 0.35, // toneMappingExposure multiplier at zero distance (0 = pitch black, 1 = no effect)
  darkenEase = 3.5, // how quickly exposure eases toward its target each frame
  flashlightFlickerChance = 0.06, // rough odds per second of a brief flashlight dip when very close + hunting
  growlUrl = "./sounds/vrishchik_growl.mp3", // looping proximity growl — see updateProximitySound()
  growlMaxVolume = 0.9, // volume once the player is right on top of it
  growlEase = 4, // how quickly volume eases toward its target each frame
  footstepUrl = "./sounds/vrishchik_footstep.mp3", // directional footstep hit — see triggerFootstepsFromGait()
  footstepRefDistance = 2.5, // distance (m) at which footstep volume starts falling off
  footstepRolloffFactor = 1.6, // how sharply footstep volume falls off with distance
  footstepMaxDistance = 40, // beyond this, footsteps are inaudible regardless of volume setting
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
  let gaitT = 0; // running phase clock for the tripod gait
  let animT = 0; // running phase clock for tail/claw/mandible sway
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

  /**
   * Replace the patrol route at runtime. room21.js (where Vrishchik is
   * spawned) only knows about its own room at construction time, so it
   * seeds patrolPoints with a small two-point beat inside room21 just so
   * there's always *something* to patrol. To have it roam the whole
   * haveli, main.js calls this once every room/corridor has been built,
   * handing it a long point-to-point route across many rooms (see
   * main.js for how that route is assembled). Resets patrolIndex so it
   * starts the new route from its beginning rather than an out-of-range
   * index into the old (possibly shorter) list.
   * @param {THREE.Vector3[]} points
   */
  function setPatrolPoints(points) {
    patrolPoints = points;
    patrolIndex = 0;
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

  // ---------- shared audio listener ----------
  // Needs an AudioListener on the camera. If a room spawns more than one
  // Vrishchik (or the camera otherwise never got one), this adds a
  // single shared listener the first time it's needed rather than
  // stacking a duplicate on every enemy instance. Both the growl and the
  // footstep sound below reuse this same listener + loader.
  let audioListener = engine.camera.children.find((c) => c instanceof THREE.AudioListener);
  if (!audioListener) {
    audioListener = new THREE.AudioListener();
    engine.camera.add(audioListener);
  }
  const audioLoader = new THREE.AudioLoader();

  // ---------- proximity growl ----------
  // A low, looping growl whose volume is driven manually from raw
  // distance-to-player, using the exact same falloff radius as
  // darkenWorld() so sound and lighting read as one combined "it's
  // close" cue rather than two effects that drift out of sync.
  //
  // Deliberately NOT using THREE.PositionalAudio's built-in distance
  // model — that attenuates based on the panner node's own rolloff
  // curve, which would need separate tuning to match darkenRadius, and
  // its stereo panning would make the growl "point at" the model even
  // when the player can't see it, undercutting the same "closes in
  // regardless of facing" quality darkenWorld() is going for. A plain
  // THREE.Audio with volume eased frame-by-frame gives full control and
  // keeps the two effects locked to the same curve. (Directionality is
  // handled separately by the footstep sound below instead.)
  const growlSound = new THREE.Audio(audioListener);
  let growlLoaded = false;
  audioLoader.load(
    growlUrl,
    (buffer) => {
      growlSound.setBuffer(buffer);
      growlSound.setLoop(true);
      growlSound.setVolume(0);
      growlSound.play();
      growlLoaded = true;
    },
    undefined,
    (err) => {
      // Missing/failed audio shouldn't break the enemy — just no growl.
      console.warn(
        `[vrishchikenemy.js] failed to load growl sound from "${growlUrl}" — ` +
        `confirm the file exists at that path relative to index.html:`,
        err
      );
    }
  );

  function updateProximitySound(dt) {
    if (!growlLoaded) return;
    const dist = distanceToPlayer();
    const t = Math.max(0, Math.min(1, 1 - dist / darkenRadius)); // same shape as darkenWorld()
    const targetVolume = t * t * growlMaxVolume; // eased curve — stays near-silent until genuinely close
    const nextVolume = growlSound.getVolume() + (targetVolume - growlSound.getVolume()) * Math.min(1, dt * growlEase);
    growlSound.setVolume(nextVolume);

    // pitch creeps up slightly while actively hunting, for extra tension
    const targetRate = (state === VrishchikState.PURSUE || state === VrishchikState.ATTACK) ? 1.15 : 1.0;
    if (growlSound.source) {
      const currentRate = growlSound.source.playbackRate.value;
      growlSound.source.playbackRate.value = currentRate + (targetRate - currentRate) * Math.min(1, dt * 2);
    }
  }

  // ---------- directional footsteps ----------
  // THREE.PositionalAudio parented to `group` itself (not the camera),
  // so the Web Audio panner node's real stereo image + distance falloff
  // tracks Vrishchik's actual world position as it moves. This is what
  // lets the player tell which direction it's coming from — the growl
  // above tells you "it's close", footsteps tell you "it's over there" —
  // and try to move away, even when it's out of sight or behind a wall.
  //
  // Each footstep is a single one-shot hit rather than a loop, fired
  // exactly when the tripod gait's phase flips (one leg-group planting
  // down) — see triggerFootstepsFromGait(). Playback rate is jittered
  // slightly per-hit so a repeated single sample doesn't sound robotic,
  // and nudged up with speedScale so pursuing feels more frantic than
  // patrolling.
  const footstepSound = new THREE.PositionalAudio(audioListener);
  footstepSound.setRefDistance(footstepRefDistance);
  footstepSound.setRolloffFactor(footstepRolloffFactor);
  footstepSound.setDistanceModel("inverse");
  footstepSound.setMaxDistance(footstepMaxDistance);
  group.add(footstepSound);

  let footstepBuffer = null;
  let footstepLoaded = false;
  audioLoader.load(
    footstepUrl,
    (buffer) => {
      footstepBuffer = buffer;
      footstepLoaded = true;
    },
    undefined,
    (err) => {
      // Missing/failed audio shouldn't break the enemy — just no
      // directional footstep cue (the growl still works on its own).
      console.warn(
        `[vrishchikenemy.js] failed to load footstep sound from "${footstepUrl}" — ` +
        `confirm the file exists at that path relative to index.html:`,
        err
      );
    }
  );

  function playFootstepHit(speedScale) {
    if (!footstepLoaded) return;
    // stop+replay rather than letting overlapping hits stack, so a fast
    // gait doesn't turn into a mush of overlapping copies of the same clip
    if (footstepSound.isPlaying) footstepSound.stop();
    footstepSound.setBuffer(footstepBuffer);
    footstepSound.setPlaybackRate(0.85 + speedScale * 0.15 + Math.random() * 0.06);
    footstepSound.setVolume(Math.min(0.55 + speedScale * 0.2, 1));
    footstepSound.play();
  }

  // sin(gaitT) sign flip == one tripod group (3 legs) planting down —
  // fires one footstep "beat" per flip, so hits land on the actual
  // visual footfall instead of an arbitrary timer that could drift out
  // of sync with the leg animation.
  let lastFootPhaseSign = 1;
  function triggerFootstepsFromGait(speedScale) {
    const sign = Math.sin(gaitT) >= 0 ? 1 : -1;
    if (sign !== lastFootPhaseSign) {
      lastFootPhaseSign = sign;
      playFootstepHit(speedScale);
    }
  }

  // ---------- procedural animation ----------
  // Tripod gait: each leg's swing phase comes from whichever tripod group
  // it's in (A/B, opposite phase). During swing, the femur lifts and the
  // tibia extends forward; during stance, the leg drags back under the
  // body at ground contact to "push" — a simplified but readable insect
  // walk rather than true IK foot-planting.
  //
  // Also the single place footsteps are triggered from (see
  // triggerFootstepsFromGait() above) — every caller of animateGait()
  // already passes the right speedScale for its state (WALK/INVESTIGATE/
  // PURSUE/ATTACK's brace-shuffle), so hooking in here means footsteps
  // automatically match however fast it's currently moving, with no
  // separate bookkeeping needed per-state.
  function animateGait(dt, speedScale) {
    gaitT += dt * 5 * speedScale;
    triggerFootstepsFromGait(speedScale);
    parts.legs.forEach((leg, i) => {
      const inGroupA = TRIPOD_A.includes(i);
      const phase = gaitT + (inGroupA ? 0 : Math.PI);
      const lift = Math.max(0, Math.sin(phase));
      leg.femur.rotation.x = Math.sin(phase) * 0.35;
      leg.tibia.rotation.x = -lift * 0.5;
      leg.coxa.rotation.z = Math.sin(phase * 0.5) * 0.05 * leg.side;
    });
  }

  // Idle stance sway — deliberately does NOT call animateGait() / the
  // footstep trigger, so standing still stays silent. Silence is itself
  // a cue: if you can't hear footsteps, it isn't moving right now.
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
    animateMandibles(-0.95, dt); // jaw snaps wide open for the bite
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
    updateProximitySound(dt);

    const seesPlayer = canSeePlayer();

    switch (state) {
      case VrishchikState.IDLE: {
        idleLegSway(dt);
        animateTailIdle(dt);
        animateClaws(dt, false);
        pulseEyes(dt, 0.8, 0.3);
        animateMandibles(-0.22, dt); // resting jaw pose — mouth stays open, just not wide
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
        animateMandibles(-0.45, dt); // jaw widens further while it's actively hunting
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
    get state() { return state; },
  };
}

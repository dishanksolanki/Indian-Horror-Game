// engine.js — reusable first-person engine core.
// Handles rendering, pointer-lock look/movement, collision, flashlight and interaction raycasting.
// Rooms (see room1.js) plug into this by providing colliders, lights, interactables and an update hook.

import * as THREE from "three";
import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();

    this.camera = new THREE.PerspectiveCamera(
      72,
      window.innerWidth / window.innerHeight,
      0.05,
      120
    );
    this.camera.position.set(0, 1.7, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // PERFORMANCE: devicePixelRatio is 2-3 on most phones/retina laptops, which
    // means rendering 4-9x the actual pixel count of the screen. Capping at
    // 1.5 instead of 2 cuts fragment-shader work substantially (this matters a
    // lot here since every fragment loops over every light in the scene) with
    // barely any visible sharpness difference. Raise back to 2 if you have
    // perf headroom and want maximum crispness.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.controls = new PointerLockControls(this.camera, document.body);

    // --- movement state ---
    this.move = { forward: false, back: false, left: false, right: false, sprint: false };
    this.velocity = new THREE.Vector3();
    this.playerHeight = 1.7;
    this.playerRadius = 0.35;
    this.walkSpeed = 2.6;
    this.sprintSpeed = 4.2;
    this.crouchSpeed = 1.3;

    // headbob
    this._bobT = 0;
    this._baseY = this.playerHeight;

    // colliders: array of THREE.Box3
    this.colliders = [];

    // interactables: array of { object3D, radius, onInteract(), prompt }
    this.interactables = [];
    this._focusedInteractable = null;

    // flashlight
    // Rooms no longer carry their own ambient/eerie lighting (removed for
    // performance — see room*.js), so the torch is now the player's only
    // light source. Brighter, longer-range, and a wider cone than before so
    // it actually lights up a dark room instead of just a narrow spot.
    this.flashlightIntensity = 6.5;
    this.flashlight = new THREE.SpotLight(0xfff2d0, this.flashlightIntensity, 14, Math.PI / 5, 0.5, 1.2);
    this.flashlight.castShadow = true;
    // PERFORMANCE: this shadow map re-renders the scene from the flashlight's
    // point of view every single frame — it's the single most expensive part
    // of the whole render loop. 1024x1024 is overkill for a handheld light
    // with only a 9-unit range; 512x512 looks nearly identical in practice
    // and roughly quarters this pass's cost. Bump it back up if you have
    // headroom to spare.
    this.flashlight.shadow.mapSize.set(512, 512);
    this.flashlightOn = true;
    this.flashTarget = new THREE.Object3D();
    this.scene.add(this.flashlight, this.flashTarget);
    this.flashlight.target = this.flashTarget;

    this._raycaster = new THREE.Raycaster();

    // ---------- PERFORMANCE: reusable scratch objects ----------
    // The old code allocated a fresh Vector3/Box3 every single frame inside
    // the movement, flashlight, and interaction-focus updates. That garbage
    // gets collected constantly (many times a second), which is what causes
    // the little stutters/hitches on top of the raw FPS being low. Reusing
    // the same objects every frame avoids that churn entirely.
    this._scratchCamDir = new THREE.Vector3();
    this._scratchCamRight = new THREE.Vector3();
    this._scratchMoveDir = new THREE.Vector3();
    this._worldUp = new THREE.Vector3(0, 1, 0);
    this._scratchTryX = new THREE.Vector3();
    this._scratchTryZ = new THREE.Vector3();
    this._scratchBoxMin = new THREE.Vector3();
    this._scratchBoxMax = new THREE.Vector3();
    this._scratchPlayerBox = new THREE.Box3(this._scratchBoxMin, this._scratchBoxMax);
    this._scratchFlashDir = new THREE.Vector3();
    this._scratchDirToItem = new THREE.Vector3();
    this._scratchNdc = new THREE.Vector2(0, 0);

    this._paused = true;
    this._bindInput();
    window.addEventListener("resize", () => this._onResize());
  }

  // ---------- setup helpers used by rooms ----------
  addCollider(box3) {
    this.colliders.push(box3);
  }

  addInteractable(object3D, { radius = 1.6, prompt = "Interact", onInteract = () => {} } = {}) {
    this.interactables.push({ object3D, radius, prompt, onInteract });
  }

  setSpawn(vec3, yawRadians = 0) {
    this.camera.position.set(vec3.x, this.playerHeight, vec3.z);
    this.controls.getObject().rotation.y = yawRadians;
  }

  lock() {
    this.controls.lock();
  }

  // ---------- input ----------
  _bindInput() {
    document.addEventListener("keydown", (e) => this._onKey(e, true));
    document.addEventListener("keyup", (e) => this._onKey(e, false));
    document.addEventListener("keydown", (e) => {
      if (e.code === "KeyF") this.toggleFlashlight();
      if (e.code === "KeyE") this._tryInteract();
    });
  }

  _onKey(e, isDown) {
    switch (e.code) {
      case "KeyW": case "ArrowUp": this.move.forward = isDown; break;
      case "KeyS": case "ArrowDown": this.move.back = isDown; break;
      case "KeyA": case "ArrowLeft": this.move.left = isDown; break;
      case "KeyD": case "ArrowRight": this.move.right = isDown; break;
      case "ShiftLeft": case "ShiftRight": this.move.sprint = isDown; break;
    }
  }

  toggleFlashlight() {
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.intensity = this.flashlightOn ? this.flashlightIntensity : 0;
  }

  _tryInteract() {
    if (this._focusedInteractable) this._focusedInteractable.onInteract();
  }

  // ---------- collision ----------
  _resolveCollision(nextPos) {
    const r = this.playerRadius;
    this._scratchBoxMin.set(nextPos.x - r, 0, nextPos.z - r);
    this._scratchBoxMax.set(nextPos.x + r, this.playerHeight, nextPos.z + r);
    const playerBox = this._scratchPlayerBox;
    for (const box of this.colliders) {
      if (playerBox.intersectsBox(box)) return true;
    }
    return false;
  }

  _moveWithCollision(dx, dz) {
    const pos = this.camera.position;
    // try X and Z independently so sliding along walls feels natural
    const tryX = this._scratchTryX.set(pos.x + dx, pos.y, pos.z);
    if (!this._resolveCollision(tryX)) pos.x = tryX.x;
    const tryZ = this._scratchTryZ.set(pos.x, pos.y, pos.z + dz);
    if (!this._resolveCollision(tryZ)) pos.z = tryZ.z;
  }

  // ---------- per-frame update ----------
  _updateMovement(dt) {
    const speed = this.move.sprint ? this.sprintSpeed : this.walkSpeed;
    const forward = (this.move.forward ? 1 : 0) - (this.move.back ? 1 : 0);
    const strafe = (this.move.right ? 1 : 0) - (this.move.left ? 1 : 0);

    let moving = false;
    if (forward !== 0 || strafe !== 0) {
      // FIX: derive movement direction from the camera's actual world-facing
      // direction (flattened to the horizontal plane), instead of the old
      // camera.quaternion trick which effectively cancelled itself out and
      // ignored yaw entirely. This is what made W/S (and A/D) feel broken —
      // movement never actually turned with the camera.
      const camDir = this._scratchCamDir;
      this.camera.getWorldDirection(camDir);
      camDir.y = 0;
      camDir.normalize();

      const camRight = this._scratchCamRight.crossVectors(camDir, this._worldUp);

      const dir = this._scratchMoveDir.set(0, 0, 0);
      dir.addScaledVector(camDir, forward);
      dir.addScaledVector(camRight, strafe);
      dir.normalize();

      const step = speed * dt;
      this._moveWithCollision(dir.x * step, dir.z * step);
      moving = true;
    }

    // subtle headbob
    if (moving) {
      this._bobT += dt * (this.move.sprint ? 12 : 8);
      this.camera.position.y = this._baseY + Math.sin(this._bobT) * 0.035;
    } else {
      this._bobT = 0;
      this.camera.position.y += (this._baseY - this.camera.position.y) * 0.15;
    }
  }

  _updateFlashlight() {
    const camPos = this.camera.position;
    const camDir = this._scratchFlashDir;
    this.camera.getWorldDirection(camDir);
    this.flashlight.position.copy(camPos);
    this.flashTarget.position.copy(camPos).add(camDir.multiplyScalar(3));
  }

  _updateInteractionFocus() {
    this._raycaster.setFromCamera(this._scratchNdc, this.camera);
    // compute camera facing direction once per frame, not once per interactable
    const camDir = this._scratchCamDir;
    this.camera.getWorldDirection(camDir);

    let closest = null;
    let closestDist = Infinity;
    for (const item of this.interactables) {
      const dist = this.camera.position.distanceTo(item.object3D.position);
      if (dist > item.radius) continue;
      const dirToItem = this._scratchDirToItem
        .copy(item.object3D.position)
        .sub(this.camera.position)
        .normalize();
      const facing = camDir.dot(dirToItem);
      if (facing > 0.85 && dist < closestDist) {
        closest = item;
        closestDist = dist;
      }
    }
    this._focusedInteractable = closest;
    const promptEl = document.getElementById("interact-prompt");
    if (closest) {
      promptEl.textContent = `[ E ] ${closest.prompt}`;
      promptEl.classList.add("show");
    } else {
      promptEl.classList.remove("show");
    }
  }

  // ---------- main loop ----------
  start(onFrame) {
    this._onFrame = onFrame;
    this._paused = false;
    this.clock.start();
    this._loop();
  }

  pause() { this._paused = true; }
  resume() { this._paused = false; this.clock.getDelta(); }

  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(this.clock.getDelta(), 0.05);

    if (this._paused || !this.controls.isLocked) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    this._updateMovement(dt);
    this._updateFlashlight();
    this._updateInteractionFocus();

    if (this._onFrame) this._onFrame(dt, this);

    this.renderer.render(this.scene, this.camera);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

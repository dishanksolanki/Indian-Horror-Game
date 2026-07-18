// engine.js — reusable first-person engine core.
// Handles rendering, pointer-lock look/movement, collision, flashlight and interaction raycasting.
// Rooms (see room1.js) plug into this by providing colliders, lights, interactables and an update hook.
//
// NEW: generic "hide spot" mechanic (enterHide / exitHide) — lets a room define a spot
// (e.g. under a charpai) the player can duck into. While hiding, normal WASD movement is
// frozen, the camera is snapped down to a crouch height at the hide position, and the
// interact key (E) becomes a dedicated "exit hiding" action regardless of what the player
// is looking at, so you can't accidentally re-trigger some other interactable while hidden.

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

    // --- hide-spot state ---
    // Set by enterHide()/cleared by exitHide(). While `hiding` is true, normal
    // movement + the regular interaction raycast are suspended (see
    // _updateMovement / _updateInteractionFocus / _tryInteract below).
    this.hiding = false;
    this._hidePrePos = new THREE.Vector3();
    this._hidePreYaw = 0;
    this._hideBaseY = this.playerHeight;
    this._hideExitPrompt = "Stop Hiding";
    this._hideOnExit = null;

    // flashlight
    this.flashlight = new THREE.SpotLight(0xfff2d0, 0, 9, Math.PI / 6.2, 0.45, 1.6);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlightOn = false;
    this.flashTarget = new THREE.Object3D();
    this.scene.add(this.flashlight, this.flashTarget);
    this.flashlight.target = this.flashTarget;

    this._raycaster = new THREE.Raycaster();

    this._paused = true;

    this._bindInput();
    window.addEventListener("resize", () => this._onResize());
  }

  // ---------- setup helpers used by rooms ----------
  addCollider(box3) {
    this.colliders.push(box3);
  }

  addInteractable(object3D, { radius = 1.6, prompt = "Interact", onInteract = () => {} } = {}) {
    const entry = { object3D, radius, prompt, onInteract };
    this.interactables.push(entry);
    return entry;
  }

  setSpawn(vec3, yawRadians = 0) {
    this.camera.position.set(vec3.x, this.playerHeight, vec3.z);
    this.controls.getObject().rotation.y = yawRadians;
  }

  lock() {
    this.controls.lock();
  }

  // ---------- hide spot ----------
  /**
   * Duck the player into a hiding spot (e.g. under a charpai, inside an almirah).
   * @param {Object} opts
   * @param {THREE.Vector3} opts.position - world position to snap the camera to (x/z used, y comes from crouchHeight)
   * @param {number|null} [opts.yaw] - optional world yaw (radians) to face while hidden
   * @param {number} [opts.crouchHeight=0.4] - camera height while hidden (keep low + inside the geometry)
   * @param {string} [opts.exitPrompt="Stop Hiding"] - prompt shown for the E-to-exit action
   * @param {Function|null} [opts.onEnter] - callback fired once hiding starts
   * @param {Function|null} [opts.onExit] - callback fired once hiding ends
   */
  enterHide({ position, yaw = null, crouchHeight = 0.4, exitPrompt = "Stop Hiding", onEnter = null, onExit = null } = {}) {
    if (this.hiding) return;
    this.hiding = true;

    // remember where we were so we can pop back out cleanly
    this._hidePrePos.copy(this.camera.position);
    this._hidePreYaw = this.controls.getObject().rotation.y;
    this._hideBaseY = this._baseY;
    this._hideExitPrompt = exitPrompt;
    this._hideOnExit = onExit;

    this.camera.position.set(position.x, crouchHeight, position.z);
    this._baseY = crouchHeight;
    if (yaw !== null) this.controls.getObject().rotation.y = yaw;

    // stop any held movement keys from carrying over
    this.move.forward = this.move.back = this.move.left = this.move.right = false;
    this._bobT = 0;

    if (onEnter) onEnter();
  }

  exitHide() {
    if (!this.hiding) return;
    this.hiding = false;
    this._baseY = this._hideBaseY;
    this.camera.position.copy(this._hidePrePos);
    this.controls.getObject().rotation.y = this._hidePreYaw;

    const cb = this._hideOnExit;
    this._hideOnExit = null;
    if (cb) cb();
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
    // while hiding, ignore movement keys entirely (see _updateMovement early-out too)
    if (this.hiding && isDown) return;
    switch (e.code) {
      case "KeyW": case "ArrowUp": this.move.forward = isDown; break;
      case "KeyS": case "ArrowDown": this.move.back = isDown; break;
      case "KeyA": case "ArrowLeft": this.move.left = isDown; break;
      case "KeyD": case "ArrowRight": this.move.right = isDown; break;
      case "ShiftLeft": case "ShiftRight": this.move.sprint = isDown; break;
    }
  }

  toggleFlashlight() {
    if (this.hiding) return; // stay dark and quiet while tucked away
    this.flashlightOn = !this.flashlightOn;
    this.flashlight.intensity = this.flashlightOn ? 3.2 : 0;
  }

  _tryInteract() {
    if (this.hiding) {
      this.exitHide();
      return;
    }
    if (this._focusedInteractable) this._focusedInteractable.onInteract();
  }

  // ---------- collision ----------
  _resolveCollision(nextPos) {
    const r = this.playerRadius;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(nextPos.x - r, 0, nextPos.z - r),
      new THREE.Vector3(nextPos.x + r, this.playerHeight, nextPos.z + r)
    );
    for (const box of this.colliders) {
      if (playerBox.intersectsBox(box)) return true;
    }
    return false;
  }

  _moveWithCollision(dx, dz) {
    const pos = this.camera.position;
    // try X and Z independently so sliding along walls feels natural
    const tryX = new THREE.Vector3(pos.x + dx, pos.y, pos.z);
    if (!this._resolveCollision(tryX)) pos.x = tryX.x;
    const tryZ = new THREE.Vector3(pos.x, pos.y, pos.z + dz);
    if (!this._resolveCollision(tryZ)) pos.z = tryZ.z;
  }

  // ---------- per-frame update ----------
  _updateMovement(dt) {
    // frozen in place while hidden — look-around still works via PointerLockControls,
    // but WASD does nothing and there's no headbob.
    if (this.hiding) {
      this._bobT = 0;
      return;
    }

    const speed = this.move.sprint ? this.sprintSpeed : this.walkSpeed;
    const forward = (this.move.forward ? 1 : 0) - (this.move.back ? 1 : 0);
    const strafe = (this.move.right ? 1 : 0) - (this.move.left ? 1 : 0);

    let moving = false;
    if (forward !== 0 || strafe !== 0) {
      const dir = new THREE.Vector3(strafe, 0, -forward).normalize();
      dir.applyQuaternion(this.camera.quaternion.clone().multiply(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(-this.camera.rotation.x, 0, 0))
      ));
      dir.y = 0;
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
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    this.flashlight.position.copy(camPos);
    this.flashTarget.position.copy(camPos).add(camDir.multiplyScalar(3));
  }

  _updateInteractionFocus() {
    const promptEl = document.getElementById("interact-prompt");

    // while hidden, the only available action is "come out" — don't raycast
    // the normal interactable list at all so nothing else can steal focus.
    if (this.hiding) {
      this._focusedInteractable = null;
      if (promptEl) {
        promptEl.textContent = `[ E ] ${this._hideExitPrompt}`;
        promptEl.classList.add("show");
      }
      return;
    }

    this._raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    let closest = null;
    let closestDist = Infinity;

    for (const item of this.interactables) {
      const dist = this.camera.position.distanceTo(item.object3D.position);
      if (dist > item.radius) continue;

      const dirToItem = item.object3D.position.clone().sub(this.camera.position).normalize();
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      const facing = camDir.dot(dirToItem);

      if (facing > 0.85 && dist < closestDist) {
        closest = item;
        closestDist = dist;
      }
    }

    this._focusedInteractable = closest;
    if (closest) {
      if (promptEl) {
        promptEl.textContent = `[ E ] ${closest.prompt}`;
        promptEl.classList.add("show");
      }
    } else {
      if (promptEl) promptEl.classList.remove("show");
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

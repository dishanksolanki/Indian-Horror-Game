// soundManager.js — Universal Audio Manager for Haveli Horror.

import * as THREE from "three";
import { createProceduralGrowlBuffer, createProceduralFootstepBuffer, setupAudioUnlock } from "./soundSynth.js";

class SoundManager {
  constructor() {
    this.listener = null;
    this.loader = new THREE.AudioLoader();
    this.buffers = new Map();
  }

  getListener(camera) {
    if (!this.listener) {
      this.listener = camera.children.find((c) => c instanceof THREE.AudioListener);
      if (!this.listener) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);
      }
      setupAudioUnlock(this.listener.context);
    }
    return this.listener;
  }

  loadBuffer(listener, url, type, callback) {
    if (this.buffers.has(url)) {
      callback(this.buffers.get(url));
      return;
    }

    const audioCtx = listener.context;

    this.loader.load(
      url,
      (buffer) => {
        this.buffers.set(url, buffer);
        callback(buffer);
      },
      undefined,
      () => {
        let fallbackBuffer;
        if (type === "footstep") {
          fallbackBuffer = createProceduralFootstepBuffer(audioCtx);
        } else {
          fallbackBuffer = createProceduralGrowlBuffer(audioCtx);
        }
        this.buffers.set(url, fallbackBuffer);
        callback(fallbackBuffer);
      }
    );
  }
}

export const soundManager = new SoundManager();

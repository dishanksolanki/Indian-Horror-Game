// soundSynth.js — Procedural Web Audio buffer synthesizer for horror sounds.

/**
 * Creates a looping, low-frequency guttural monster growl buffer.
 */
export function createProceduralGrowlBuffer(audioCtx, duration = 4.0) {
  const sampleRate = audioCtx.sampleRate;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
  const channel = buffer.getChannelData(0);

  const baseFreq1 = 48.0;
  const baseFreq2 = 62.0;
  const modFreq = 7.5;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    const mod = 0.5 + 0.5 * Math.sin(2 * Math.PI * modFreq * t + Math.sin(t * 1.5) * 2.0);
    const modSub = 0.6 + 0.4 * Math.cos(2 * Math.PI * 3.2 * t);

    const wave1 = Math.sin(2 * Math.PI * baseFreq1 * t);
    const wave2 = Math.sin(2 * Math.PI * baseFreq2 * t + wave1 * 0.5);
    const subWave = Math.sin(2 * Math.PI * 30.0 * t);

    const noise = (Math.random() * 2 - 1) * 0.15 * mod;

    let fade = 1.0;
    const fadeSamples = Math.floor(sampleRate * 0.1);
    if (i < fadeSamples) {
      fade = i / fadeSamples;
    } else if (i > numSamples - fadeSamples) {
      fade = (numSamples - i) / fadeSamples;
    }

    const sample = (wave1 * 0.4 + wave2 * 0.35 + subWave * 0.35 + noise) * mod * modSub * fade;
    channel[i] = Math.max(-1, Math.min(1, sample * 0.8));
  }

  return buffer;
}

/**
 * Creates a heavy, chitinous footstep impact sound buffer.
 */
export function createProceduralFootstepBuffer(audioCtx, duration = 0.28) {
  const sampleRate = audioCtx.sampleRate;
  const numSamples = Math.floor(sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
  const channel = buffer.getChannelData(0);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 22);

    const freq = 35 + 75 * Math.exp(-t * 35);
    const thud = Math.sin(2 * Math.PI * freq * t);

    const snapEnv = Math.exp(-t * 45);
    const crunch = (Math.random() * 2 - 1) * snapEnv * 0.6;

    const click = i < Math.floor(sampleRate * 0.005) ? (Math.random() * 2 - 1) * 0.8 : 0;

    channel[i] = Math.max(-1, Math.min(1, (thud * 0.7 + crunch * 0.5 + click) * env));
  }

  return buffer;
}

/**
 * Ensures Web Audio AudioContext is resumed when the user clicks or presses a key.
 */
export function setupAudioUnlock(audioCtx) {
  if (!audioCtx) return;

  const unlock = () => {
    if (audioCtx.state === "suspended") {
      audioCtx.resume().then(() => {
        console.log("[soundSynth] AudioContext successfully resumed.");
      }).catch(() => {});
    }
  };

  window.addEventListener("click", unlock, { capture: true, once: false });
  window.addEventListener("keydown", unlock, { capture: true, once: false });
  window.addEventListener("touchstart", unlock, { capture: true, once: false });
  window.addEventListener("pointerdown", unlock, { capture: true, once: false });
}

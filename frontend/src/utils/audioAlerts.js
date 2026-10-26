// Web Audio API Synthesizer for Aerospace Command Center Telemetry
// Zero external assets or network requests required.

let audioCtx = null;
let soundEnabled = false;

export function toggleAudio(enabled) {
  soundEnabled = typeof enabled === "boolean" ? enabled : !soundEnabled;
  if (soundEnabled && !audioCtx && typeof window !== "undefined") {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return soundEnabled;
}

export function isAudioEnabled() {
  return soundEnabled;
}

function playTone(freq, type = "sine", duration = 0.08, gainLevel = 0.04) {
  if (!soundEnabled || !audioCtx) return;
  try {
    if (audioCtx.state === "suspended") {
      audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(gainLevel, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // Graceful fallback if audio is not permitted by browser
  }
}

// Tactical telemetry alert tones
export function playTacticalClick() {
  playTone(1200, "sine", 0.04, 0.02);
}

export function playDispatchAlert() {
  if (!soundEnabled || !audioCtx) return;
  playTone(880, "triangle", 0.1, 0.06);
  setTimeout(() => playTone(1320, "triangle", 0.15, 0.07), 110);
}

export function playEmergencyWarning() {
  if (!soundEnabled || !audioCtx) return;
  playTone(550, "sawtooth", 0.12, 0.05);
  setTimeout(() => playTone(440, "sawtooth", 0.18, 0.06), 130);
}

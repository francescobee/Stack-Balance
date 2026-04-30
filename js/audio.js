"use strict";

// =============================================================
// audio.js — Minimal Web Audio API sound cues (S7.2)
//
// Lazy-init AudioContext (browsers require user interaction first).
// All sounds are synthesized at runtime — no external audio files.
// Toggle via profile.prefs.audioEnabled (default OFF, see user.js).
// =============================================================

let _audioCtx = null;
let _masterGain = null;

function _getCtx() {
  if (!_audioCtx) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      _audioCtx = new Ctx();
      _masterGain = _audioCtx.createGain();
      _masterGain.gain.value = 0.18; // global volume
      _masterGain.connect(_audioCtx.destination);
    } catch (e) { _audioCtx = null; }
  }
  return _audioCtx;
}

// Resume AudioContext on first user interaction (browser policy)
function unlockAudio() {
  const ctx = _getCtx();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
}

// Internal: play a single oscillator with envelope
function _tone({ freq, duration = 0.10, type = "sine", attack = 0.005, vol = 1 }) {
  if (!getAudioEnabled()) return;
  const ctx = _getCtx();
  if (!ctx || !_masterGain) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(_masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);
  } catch (e) {}
}

// === Public sound effects ===

// Soft click on card pick
function sndPick() { _tone({ freq: 720, duration: 0.06, type: "sine", vol: 0.5 }); }

// Two-tone bell on chain trigger ("ding")
function sndChain() {
  _tone({ freq: 880, duration: 0.18, type: "triangle", vol: 0.7 });
  setTimeout(() => _tone({ freq: 1320, duration: 0.22, type: "triangle", vol: 0.5 }), 70);
}

// Glitchy descending tones on tech debt added
function sndDebt() {
  _tone({ freq: 280, duration: 0.10, type: "sawtooth", vol: 0.5 });
  setTimeout(() => _tone({ freq: 200, duration: 0.14, type: "sawtooth", vol: 0.4 }), 80);
}

// 3-note arpeggio on award unlock (chime)
function sndAwardUnlock() {
  _tone({ freq: 660, duration: 0.10, type: "sine", vol: 0.6 });
  setTimeout(() => _tone({ freq: 880, duration: 0.10, type: "sine", vol: 0.55 }), 70);
  setTimeout(() => _tone({ freq: 1320, duration: 0.18, type: "sine", vol: 0.5 }), 140);
}

// Light ascending swoosh on synergy unlock (more dramatic than award)
function sndSynergy() {
  _tone({ freq: 440, duration: 0.20, type: "triangle", vol: 0.5 });
  setTimeout(() => _tone({ freq: 660, duration: 0.20, type: "triangle", vol: 0.5 }), 80);
  setTimeout(() => _tone({ freq: 880, duration: 0.20, type: "triangle", vol: 0.5 }), 160);
  setTimeout(() => _tone({ freq: 1100, duration: 0.30, type: "triangle", vol: 0.45 }), 240);
}

// Quick "tick" for OKR completion
function sndOkrDone() {
  _tone({ freq: 1200, duration: 0.06, type: "square", vol: 0.4 });
  setTimeout(() => _tone({ freq: 1500, duration: 0.10, type: "square", vol: 0.35 }), 50);
}

// S11.5: Soft 3-note ascending C-major chime for hot-seat pass-screen.
// Distinct from sndChain (which fires on game chain triggers) — softer
// and more "your turn" announcement-y.
function sndPassScreen() {
  _tone({ freq: 261.63, duration: 0.32, type: "sine", vol: 0.45 }); // C4
  setTimeout(() => _tone({ freq: 329.63, duration: 0.32, type: "sine", vol: 0.45 }), 80);  // E4
  setTimeout(() => _tone({ freq: 392.00, duration: 0.40, type: "sine", vol: 0.50 }), 160); // G4
}

// S13.3.C: Short 2-note ascending dyad fired when the user CONFIRMS the
// pass (clicks "Tocca a me, procedi"). Shorter / louder than sndPassScreen
// (the open chime) — distinct cue for "OK, you're up now". Pairs with
// the reveal-delay veil to bridge the modal-close → board-reveal moment.
function sndPassConfirm() {
  _tone({ freq: 392.00, duration: 0.18, type: "sine", vol: 0.55 }); // G4
  setTimeout(() => _tone({ freq: 523.25, duration: 0.22, type: "sine", vol: 0.55 }), 80); // C5
}

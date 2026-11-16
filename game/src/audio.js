// ABYSSAL — audio.js
// One job: every sound, synthesised live with WebAudio — no audio files.
// The context starts on the first user gesture; M toggles mute.

const AudioSys = { ctx: null, muted: false };

function ensureAudio() {
  if (AudioSys.ctx) return AudioSys.ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    AudioSys.ctx = new AC();
  } catch (err) {
    AudioSys.ctx = null;
  }
  return AudioSys.ctx;
}

function tone(freq, dur, type, vol, slideTo) {
  const ctx = ensureAudio();
  if (!ctx || AudioSys.muted) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    gain.gain.setValueAtTime(vol || 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch (err) { /* sound is optional; the game plays on silently */ }
}

function playSfx(name) {
  if (AudioSys.muted) return;
  if (name === 'move') tone(220, 0.06, 'sine', 0.05, 180);
  else if (name === 'bump') tone(90, 0.08, 'square', 0.06, 70);
  else if (name === 'hit') tone(320, 0.09, 'square', 0.10, 140);
  else if (name === 'kill') { tone(520, 0.12, 'triangle', 0.12, 180); tone(780, 0.16, 'sine', 0.08, 320); }
  else if (name === 'hurt') tone(140, 0.18, 'sawtooth', 0.12, 60);
  else if (name === 'pearl') tone(880, 0.12, 'sine', 0.10, 1320);
  else if (name === 'potion') { tone(440, 0.1, 'sine', 0.09, 660); tone(660, 0.14, 'sine', 0.08, 990); }
  else if (name === 'key') tone(1200, 0.08, 'triangle', 0.08, 1500);
  else if (name === 'chest') { tone(523, 0.1, 'triangle', 0.10); tone(784, 0.16, 'triangle', 0.10); }
  else if (name === 'stairs') { tone(330, 0.2, 'sine', 0.10, 660); tone(495, 0.25, 'sine', 0.08, 990); }
  else if (name === 'boon') { tone(392, 0.12, 'triangle', 0.10); tone(523, 0.12, 'triangle', 0.10); tone(659, 0.2, 'triangle', 0.10); }
  else if (name === 'thorns') tone(200, 0.1, 'square', 0.08, 90);
  else if (name === 'win') { tone(523, 0.18, 'triangle', 0.12); tone(659, 0.18, 'triangle', 0.12); tone(784, 0.3, 'triangle', 0.12); }
  else if (name === 'lose') { tone(220, 0.4, 'sawtooth', 0.10, 55); }
  else if (name === 'boss') tone(70, 0.5, 'sawtooth', 0.14, 45);
}

function toggleMute() {
  AudioSys.muted = !AudioSys.muted;
  return AudioSys.muted;
}

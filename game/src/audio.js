// Synthesised sound effects, WebAudio only: no audio files, no network, nothing to
// load. Each effect is a short oscillator burst shaped by a gain envelope. The audio
// context is created lazily on the first user gesture (browsers block it before
// that), and M toggles mute. Nothing here throws when audio is unavailable.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  /** A tone that slides from `from` Hz to `to` Hz over `seconds`, then fades out. */
  function tone(from, to, seconds, volume, shape) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx || ctx.state === 'suspended') {
      if (ctx) ctx.resume().catch(() => {});
      if (!ctx || ctx.state === 'suspended') return;
    }
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.type = shape || 'sine';
      osc.frequency.setValueAtTime(Math.max(1, from), now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + seconds);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + seconds + 0.02);
    } catch {
      // A failed blip must never break the game loop.
    }
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      tone(740, 190, 0.09, 0.10, 'square');
    },
    hit() {
      tone(300, 150, 0.06, 0.08, 'triangle');
    },
    kill() {
      tone(520, 60, 0.22, 0.14, 'sawtooth');
    },
    pickup() {
      tone(880, 1320, 0.12, 0.10, 'sine');
    },
    hurt() {
      tone(180, 70, 0.25, 0.16, 'sawtooth');
    },
    waveClear() {
      tone(523, 523, 0.12, 0.10, 'sine');
      tone(659, 659, 0.12, 0.10, 'sine');
      tone(784, 784, 0.2, 0.12, 'sine');
    },
    upgrade() {
      tone(440, 880, 0.18, 0.12, 'triangle');
    },
    boss() {
      tone(110, 55, 0.5, 0.18, 'sawtooth');
    },
    gameOver() {
      tone(392, 98, 0.7, 0.14, 'triangle');
    },
  };
}

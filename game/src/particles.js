// Particles, floating score text and screen shake. One preallocated pool, reused
// every frame, so the hot loop allocates nothing: a burst just overwrites the
// oldest slot. All drawing lives in render.js; this file only owns the numbers.
// The randomness comes from a dedicated seeded generator (separate from the
// gameplay RNG) so a staged screenshot is byte-identical on every run.

import { PARTICLES } from './config.js';

export function createParticles(random) {
  const rng = random || Math.random;
  const pool = [];
  for (let i = 0; i < PARTICLES.max; i += 1) {
    pool.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#ffffff' });
  }
  const texts = [];
  for (let i = 0; i < PARTICLES.texts; i += 1) {
    texts.push({ active: false, x: 0, y: 0, life: 0, value: '' });
  }
  let cursor = 0;
  let textCursor = 0;
  let shakeTime = 0;
  let shakePower = 0;

  function burst(x, y, color, count, speed, size) {
    for (let n = 0; n < count; n += 1) {
      const p = pool[cursor];
      cursor = (cursor + 1) % pool.length;
      const angle = rng() * Math.PI * 2;
      const power = speed * (0.35 + rng() * 0.65);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * power;
      p.vy = Math.sin(angle) * power;
      p.life = 0.45 + rng() * 0.4;
      p.max = p.life;
      p.size = size * (0.6 + rng() * 0.8);
      p.color = color;
    }
  }

  return {
    pool,
    texts,
    burst,
    emberBurst(x, y) {
      burst(x, y, '#ffb347', 14, 170, 3.5);
      burst(x, y, '#ff7a2f', 8, 110, 2.5);
    },
    hitSpark(x, y) {
      burst(x, y, '#ffe9b0', 5, 130, 2.5);
    },
    lanternBurst(x, y) {
      burst(x, y, '#ffcf7d', 18, 220, 4);
    },
    addText(x, y, value) {
      const t = texts[textCursor];
      textCursor = (textCursor + 1) % texts.length;
      t.active = true;
      t.x = x;
      t.y = y;
      t.life = 0.9;
      t.value = value;
    },
    shake(power, seconds) {
      shakePower = Math.max(shakePower, power);
      shakeTime = Math.max(shakeTime, seconds);
    },
    /** Current shake offset, decaying; call once per frame before drawing. */
    shakeOffset(dt) {
      if (shakeTime <= 0) return { x: 0, y: 0 };
      shakeTime -= dt;
      const decay = Math.max(0, shakeTime) * shakePower;
      return {
        x: (rng() * 2 - 1) * decay,
        y: (rng() * 2 - 1) * decay,
      };
    },
    step(dt) {
      for (let i = 0; i < pool.length; i += 1) {
        const p = pool[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
      }
      for (let i = 0; i < texts.length; i += 1) {
        const t = texts[i];
        if (!t.active) continue;
        t.life -= dt;
        t.y -= 34 * dt;
        if (t.life <= 0) t.active = false;
      }
    },
  };
}

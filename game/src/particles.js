// ABYSSAL — particles.js
// One job: bubbles, hit bursts, floating damage numbers, screen shake
// and the drifting plankton that makes the deep feel alive.

function createFx() {
  return { parts: [], texts: [], shake: 0, plankton: [] };
}

function tileCenter(x, y) {
  return {
    x: CONFIG.originX + x * CONFIG.tile + CONFIG.tile / 2,
    y: CONFIG.originY + y * CONFIG.tile + CONFIG.tile / 2,
  };
}

function spawnBubbles(fx, x, y, n) {
  const c = tileCenter(x, y);
  for (let i = 0; i < n; i++) {
    fx.parts.push({
      x: c.x + (Math.random() - 0.5) * 20,
      y: c.y + (Math.random() - 0.5) * 20,
      vx: (Math.random() - 0.5) * 12,
      vy: -18 - Math.random() * 22,
      life: 0.7 + Math.random() * 0.5,
      max: 1.2,
      size: 2 + Math.random() * 3,
      color: '#7dd3fc',
      kind: 'bubble',
    });
  }
}

function spawnHit(fx, x, y, color) {
  const c = tileCenter(x, y);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    fx.parts.push({
      x: c.x, y: c.y,
      vx: Math.cos(a) * (30 + Math.random() * 50),
      vy: Math.sin(a) * (30 + Math.random() * 50),
      life: 0.4 + Math.random() * 0.3,
      max: 0.7,
      size: 2 + Math.random() * 3,
      color: color,
      kind: 'spark',
    });
  }
  spawnBubbles(fx, x, y, 4);
}

function addFloatText(fx, x, y, text, color) {
  const c = tileCenter(x, y);
  fx.texts.push({ x: c.x, y: c.y - 14, text, color, life: 0.9, max: 0.9 });
}

function addShake(fx, n) {
  fx.shake = Math.max(fx.shake, n);
}

function initPlankton(fx, rng) {
  fx.plankton = [];
  for (let i = 0; i < 46; i++) {
    fx.plankton.push({
      x: rng() * CONFIG.canvasW,
      y: rng() * CONFIG.canvasH,
      r: 0.8 + rng() * 1.8,
      drift: 4 + rng() * 8,
      phase: rng() * Math.PI * 2,
    });
  }
}

function updateFx(fx, dt, time) {
  for (const p of fx.parts) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy -= 6 * dt;
    p.life -= dt;
  }
  fx.parts = fx.parts.filter((p) => p.life > 0);
  for (const t of fx.texts) {
    t.y -= 26 * dt;
    t.life -= dt;
  }
  fx.texts = fx.texts.filter((t) => t.life > 0);
  if (fx.shake > 0) fx.shake = Math.max(0, fx.shake - 30 * dt);
  for (const p of fx.plankton) {
    p.y -= p.drift * dt;
    p.x += Math.sin(time * 0.6 + p.phase) * 6 * dt;
    if (p.y < -4) { p.y = CONFIG.canvasH + 4; }
  }
}

function drawFx(ctx, fx) {
  for (const p of fx.parts) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const t of fx.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.max);
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawPlankton(ctx, fx, time) {
  ctx.save();
  for (const p of fx.plankton) {
    const tw = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(time * 1.4 + p.phase));
    ctx.globalAlpha = tw;
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

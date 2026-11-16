// Drawing only: the game state and the current screen in, pixels out. The 1280x720
// field is scaled to fit the window and centred, the margin filled with the
// backdrop colour. Canvas shapes and text only — no images, no fonts to load.
// Screens: title, play (HUD over the field), paused, upgrade choice, game over.

import { FIELD, FONT, LANTERN, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';

const HP_BAR = { x: 24, y: 668, width: 260, height: 18 };
const LANTERN_BAR = { x: 510, y: 668, width: 260, height: 18 };

/** Deterministic starfield: position of star i is a pure function of i. */
function starPos(i) {
  const x = (i * 373 + 97) % FIELD.width;
  const y = (i * 911 + 53) % FIELD.height;
  return { x, y, size: 1 + ((i * 7) % 3) * 0.6, twinkle: (i % 5) / 5 };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, ratio: 1 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
    view.ratio = ratio;
  }
  window.addEventListener('resize', resize);
  resize();

  function text(value, x, y, size, color, align, weight) {
    if (!fonts.has(size + (weight || ''))) {
      fonts.set(size + (weight || ''), `${weight || ''} ${size}px ${FONT}`);
    }
    context.font = fonts.get(size + (weight || ''));
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function circle(x, y, radius, color) {
    context.fillStyle = color;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  function bar(x, y, width, height, fraction, fill, label) {
    context.fillStyle = '#00000088';
    context.fillRect(x - 2, y - 2, width + 4, height + 4);
    context.fillStyle = '#2c2c50';
    context.fillRect(x, y, width, height);
    context.fillStyle = fill;
    context.fillRect(x, y, width * Math.max(0, Math.min(1, fraction)), height);
    if (label) text(label, x + width / 2, y + height - 4, 12, '#ffffff', 'center', 'bold');
  }

  function drawNight(state) {
    const glow = context.createRadialGradient(
      LANTERN.x, LANTERN.y, 40, LANTERN.x, LANTERN.y, 560,
    );
    glow.addColorStop(0, '#2a2148');
    glow.addColorStop(0.55, PALETTE.night);
    glow.addColorStop(1, PALETTE.nightDeep);
    context.fillStyle = glow;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    for (let i = 0; i < 70; i += 1) {
      const star = starPos(i);
      const alpha = 0.25 + 0.55 * Math.abs(Math.sin(state.time * 0.7 + star.twinkle * 6));
      context.globalAlpha = alpha;
      circle(star.x, star.y, star.size, '#cfc8ff');
    }
    context.globalAlpha = 1;
    context.strokeStyle = PALETTE.groundRing;
    context.lineWidth = 2;
    for (let r = 120; r <= 360; r += 120) {
      context.beginPath();
      context.arc(LANTERN.x, LANTERN.y, r, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawLantern(state) {
    const flicker = 1 + Math.sin(state.time * 9) * 0.06 + Math.sin(state.time * 23) * 0.04;
    const hpFrac = state.lantern.hp / state.lantern.maxHp;
    const glow = context.createRadialGradient(
      LANTERN.x, LANTERN.y, 6, LANTERN.x, LANTERN.y, 120 * flicker,
    );
    glow.addColorStop(0, '#ffe9b0cc');
    glow.addColorStop(0.4, '#ffb34755');
    glow.addColorStop(1, '#ffb34700');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(LANTERN.x, LANTERN.y, 120 * flicker, 0, Math.PI * 2);
    context.fill();
    circle(LANTERN.x, LANTERN.y, LANTERN.radius, '#3a2a12');
    circle(LANTERN.x, LANTERN.y, LANTERN.radius - 6, hpFrac > 0.35 ? PALETTE.lanternGlow : '#ff8a5c');
    const flame = 10 + Math.sin(state.time * 11) * 2.5;
    context.fillStyle = '#fff3c4';
    context.beginPath();
    context.ellipse(LANTERN.x, LANTERN.y - 4, 5, flame, 0, 0, Math.PI * 2);
    context.fill();
  }

  function drawPlayer(state) {
    const player = state.player;
    if (player.invuln > 0 && Math.floor(state.time * 12) % 2 === 0) return;
    // Aim staff.
    context.strokeStyle = PALETTE.amber;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(player.x, player.y);
    context.lineTo(
      player.x + Math.cos(player.aimAngle) * 30,
      player.y + Math.sin(player.aimAngle) * 30,
    );
    context.stroke();
    circle(player.x, player.y, 16, PALETTE.keeperRobe);
    circle(player.x, player.y, 11, PALETTE.keeper);
    circle(player.x + Math.cos(player.aimAngle) * 4, player.y + Math.sin(player.aimAngle) * 4, 4, '#2a2148');
    if (player.shield > 0) {
      context.strokeStyle = '#7ee7ff';
      context.lineWidth = 2;
      context.beginPath();
      context.arc(player.x, player.y, 22, 0, Math.PI * 2);
      context.stroke();
    }
  }

  function drawEnemies(state) {
    for (let i = 0; i < state.enemies.length; i += 1) {
      const enemy = state.enemies[i];
      if (!enemy.active) continue;
      const flash = enemy.hitFlash > 0;
      let body = PALETTE.ember;
      if (enemy.kind === 'wisp') body = PALETTE.wisp;
      else if (enemy.kind === 'husk') body = PALETTE.husk;
      else if (enemy.kind === 'maw') body = '#5c1a1a';
      circle(enemy.x, enemy.y, enemy.radius, flash ? '#ffffff' : body);
      if (enemy.kind === 'maw') {
        circle(enemy.x, enemy.y, enemy.radius * 0.55, '#1a0505');
        circle(enemy.x - 12, enemy.y - 8, 4, PALETTE.amber);
        circle(enemy.x + 12, enemy.y - 8, 4, PALETTE.amber);
      } else {
        circle(enemy.x - 5, enemy.y - 3, 2.5, '#1a0e00');
        circle(enemy.x + 5, enemy.y - 3, 2.5, '#1a0e00');
      }
      if (enemy.hp < enemy.maxHp) {
        bar(enemy.x - 16, enemy.y - enemy.radius - 10, 32, 4, enemy.hp / enemy.maxHp, PALETTE.hpBad);
      }
    }
  }

  function drawBullets(state) {
    for (let i = 0; i < state.bullets.length; i += 1) {
      const bullet = state.bullets[i];
      if (!bullet.active) continue;
      circle(bullet.x, bullet.y, 5, '#ffe9b0');
      circle(bullet.x, bullet.y, 2.5, '#ffffff');
    }
  }

  function drawPickups(state) {
    for (let i = 0; i < state.pickups.length; i += 1) {
      const pickup = state.pickups[i];
      if (!pickup.active) continue;
      const pulse = 1 + Math.sin(state.time * 6 + i) * 0.15;
      circle(pickup.x, pickup.y, 9 * pulse, PALETTE.amber);
      circle(pickup.x, pickup.y, 4, '#fff3c4');
    }
  }

  function drawParticles(state) {
    const particles = state.particles;
    for (let i = 0; i < particles.pool.length; i += 1) {
      const p = particles.pool[i];
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.max);
      circle(p.x, p.y, p.size, p.color);
    }
    context.globalAlpha = 1;
    for (let i = 0; i < particles.texts.length; i += 1) {
      const t = particles.texts[i];
      if (!t.active) continue;
      context.globalAlpha = Math.max(0, t.life / 0.9);
      text(t.value, t.x, t.y, 16, '#ffe9b0', 'center', 'bold');
    }
    context.globalAlpha = 1;
  }

  function drawHud(state, best) {
    text(`WAVE ${state.wave}`, 24, 40, 26, PALETTE.text, 'left', 'bold');
    text(`SCORE ${state.score}`, 24, 70, 20, PALETTE.amber, 'left', 'bold');
    if (state.combo >= 2) {
      text(`COMBO x${(1 + state.combo * 0.25).toFixed(2)}`, 24, 96, 18, '#ff9d5c', 'left', 'bold');
    }
    text(`BEST ${Math.max(best, state.score)}`, FIELD.width - 24, 40, 20, PALETTE.muted, 'right', 'bold');
    text('M mute · P pause', FIELD.width - 24, 66, 14, PALETTE.muted, 'right');
    bar(HP_BAR.x, HP_BAR.y, HP_BAR.width, HP_BAR.height, state.player.hp / state.player.maxHp,
      state.player.hp > 30 ? PALETTE.hpGood : PALETTE.hpBad, `KEEPER ${Math.ceil(state.player.hp)}`);
    bar(LANTERN_BAR.x, LANTERN_BAR.y, LANTERN_BAR.width, LANTERN_BAR.height,
      state.lantern.hp / state.lantern.maxHp, PALETTE.amber, `LANTERN ${Math.ceil(state.lantern.hp)}`);
    if (state.player.shield > 0) {
      text(`WARD x${state.player.shield}`, HP_BAR.x + HP_BAR.width + 16, HP_BAR.y + 14, 15, '#7ee7ff', 'left', 'bold');
    }
    if (state.waveState.phase === 'spawning' || state.waveState.phase === 'fighting') {
      const left = state.waveState.toSpawn + aliveCountText(state);
      if (left > 0) text(`EMBER LEFT: ${left}`, FIELD.width / 2, 40, 16, PALETTE.muted, 'center');
    }
  }

  function aliveCountText(state) {
    let count = 0;
    for (let i = 0; i < state.enemies.length; i += 1) {
      if (state.enemies[i].active) count += 1;
    }
    return count;
  }

  function dimPanel() {
    context.fillStyle = '#07071acc';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawTitle(state, best) {
    dimPanel();
    text('EMBERKEEP', FIELD.width / 2, 190, 84, PALETTE.amber, 'center', 'bold');
    text('You are the last Keeper of the Ember.', FIELD.width / 2, 240, 24, PALETTE.text, 'center');
    text('The ember horde crawls out of the indigo night to swallow the lantern.', FIELD.width / 2, 274, 20, PALETTE.muted, 'center');
    text('Hold the light. Survive the waves. Choose your upgrades.', FIELD.width / 2, 302, 20, PALETTE.muted, 'center');
    text('WASD / ARROWS — move      MOUSE — aim      CLICK / SPACE — shoot', FIELD.width / 2, 380, 22, PALETTE.text, 'center', 'bold');
    text('Defend the lantern — if it dies, the night wins. Every 5th wave the Ashen Maw comes.', FIELD.width / 2, 414, 18, PALETTE.muted, 'center');
    text('1-3 — pick an upgrade between waves      P — pause      M — mute', FIELD.width / 2, 442, 18, PALETTE.muted, 'center');
    if (best > 0) text(`BEST SCORE ${best}`, FIELD.width / 2, 500, 22, PALETTE.amber, 'center', 'bold');
    const pulse = 0.7 + Math.sin(state.time * 3) * 0.3;
    context.globalAlpha = pulse;
    text('CLICK OR PRESS ENTER TO KEEP THE EMBER', FIELD.width / 2, 570, 26, '#ffffff', 'center', 'bold');
    context.globalAlpha = 1;
  }

  function drawUpgrade(state) {
    dimPanel();
    text(`WAVE ${state.wave} CLEARED`, FIELD.width / 2, 150, 40, PALETTE.amber, 'center', 'bold');
    text('The night pauses. Choose one blessing:', FIELD.width / 2, 190, 22, PALETTE.text, 'center');
    const cardW = 300;
    const cardH = 170;
    const gap = 30;
    const total = cardW * 3 + gap * 2;
    const startX = (FIELD.width - total) / 2;
    for (let i = 0; i < state.choices.length; i += 1) {
      const choice = state.choices[i];
      const x = startX + i * (cardW + gap);
      const y = 250;
      context.fillStyle = PALETTE.panel;
      context.fillRect(x, y, cardW, cardH);
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 2;
      context.strokeRect(x, y, cardW, cardH);
      text(`[${i + 1}]`, x + cardW / 2, y + 52, 22, PALETTE.amber, 'center', 'bold');
      text(choice.name, x + cardW / 2, y + 96, 26, PALETTE.text, 'center', 'bold');
      text(choice.desc, x + cardW / 2, y + 132, 17, PALETTE.muted, 'center');
    }
    text('Press 1, 2 or 3 — or click a card', FIELD.width / 2, 480, 20, PALETTE.muted, 'center');
  }

  function drawOver(state, best) {
    dimPanel();
    const won = state.lantern.hp > 0 && state.player.hp > 0;
    text(won ? 'THE NIGHT RETREATS' : 'THE EMBER DIES', FIELD.width / 2, 200, 56, PALETTE.amber, 'center', 'bold');
    text(won ? 'You kept the light burning.' : 'The horde swallows the last light… for now.', FIELD.width / 2, 250, 22, PALETTE.muted, 'center');
    text(`SCORE  ${state.score}`, FIELD.width / 2, 330, 30, PALETTE.text, 'center', 'bold');
    text(`WAVE REACHED  ${state.wave}      EMBERS FELLED  ${state.kills}`, FIELD.width / 2, 374, 22, PALETTE.text, 'center');
    text(`BEST  ${Math.max(best, state.score)}`, FIELD.width / 2, 414, 22, PALETTE.amber, 'center', 'bold');
    const pulse = 0.7 + Math.sin(state.time * 3) * 0.3;
    context.globalAlpha = pulse;
    text('CLICK OR PRESS ENTER TO PLAY AGAIN', FIELD.width / 2, 500, 26, '#ffffff', 'center', 'bold');
    context.globalAlpha = 1;
  }

  function drawPaused() {
    dimPanel();
    text('PAUSED', FIELD.width / 2, 330, 56, PALETTE.text, 'center', 'bold');
    text('Press P or click to keep playing', FIELD.width / 2, 380, 22, PALETTE.muted, 'center');
  }

  return {
    /** Convert a canvas CSS-pixel point to field space (for mouse aim). */
    toField(cssX, cssY) {
      return {
        x: (cssX * view.ratio - view.x) / view.scale,
        y: (cssY * view.ratio - view.y) / view.scale,
      };
    },
    /** Canvas CSS-pixel bounds of an upgrade card, for click picking. */
    cardRect(index) {
      const cardW = 300;
      const cardH = 170;
      const gap = 30;
      const total = cardW * 3 + gap * 2;
      const startX = (FIELD.width - total) / 2;
      const x = startX + index * (cardW + gap);
      return {
        x: (view.x + x * view.scale) / view.ratio,
        y: (view.y + 250 * view.scale) / view.ratio,
        width: (cardW * view.scale) / view.ratio,
        height: (cardH * view.scale) / view.ratio,
      };
    },
    draw(state, screen, best) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = PALETTE.backdrop;
      context.fillRect(0, 0, canvas.width, canvas.height);
      const shake = state.particles.shakeOffset(1 / 60);
      context.setTransform(view.scale, 0, 0, view.scale, view.x + shake.x, view.y + shake.y);
      drawNight(state);
      drawLantern(state);
      drawPickups(state);
      drawEnemies(state);
      if (screen !== SCREEN_TITLE) drawPlayer(state);
      drawBullets(state);
      drawParticles(state);
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_UPGRADE) {
        drawHud(state, best);
      }
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_UPGRADE) drawUpgrade(state);
      else if (screen === SCREEN_OVER) drawOver(state, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
    },
  };
}

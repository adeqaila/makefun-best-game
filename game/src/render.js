// Drawing only: the game state and the current screen in, pixels out. The 1280x720
// field is scaled to fit the window and centred, the margin filled with the
// backdrop colour. Canvas shapes and text only — no images, no fonts to load.
// Screens: title, play (HUD over the field), paused, upgrade choice, game over.
//
// Full grind (slot 2, variant C): everything in variant B (HUD backing plates,
// boss HP bar + Maw glow ring, Maw silhouettes on the title), plus the title
// gains the lantern itself with three embers orbiting it, upgrade cards gain a
// drawn icon per blessing plus the level stack ("Lv 2"), and the results screen
// lists the blessings taken during the run.

import { FIELD, FONT, LANTERN, PALETTE, PLAYER } from './config.js';
import { UPGRADE_POOL } from './upgrades.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_OVER = 'over';

const HP_BAR = { x: 24, y: 668, width: 260, height: 18 };
const LANTERN_BAR = { x: 510, y: 668, width: 260, height: 18 };
const BOSS_BAR = { width: 360, y: 58, height: 12 };

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

  /** A dark plate behind a HUD block: sprites paint under the HUD, never over it. */
  function hudPlate(x, y, width, height) {
    context.fillStyle = '#07071ab8';
    context.fillRect(x, y, width, height);
    context.strokeStyle = '#ffb34744';
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
  }

  /** One small drawn icon for an upgrade card, by the icon key in upgrades.js. */
  function drawIcon(icon, cx, cy) {
    context.strokeStyle = PALETTE.amber;
    context.fillStyle = PALETTE.amber;
    context.lineWidth = 2.5;
    if (icon === 'split') {
      circle(cx - 12, cy + 4, 4, PALETTE.amber);
      circle(cx, cy - 4, 4, PALETTE.amber);
      circle(cx + 12, cy + 4, 4, PALETTE.amber);
    } else if (icon === 'rapid') {
      context.beginPath();
      context.moveTo(cx + 3, cy - 12);
      context.lineTo(cx - 6, cy + 2);
      context.lineTo(cx + 1, cy + 2);
      context.lineTo(cx - 3, cy + 12);
      context.lineTo(cx + 7, cy - 2);
      context.lineTo(cx, cy - 2);
      context.closePath();
      context.fill();
    } else if (icon === 'heavy') {
      circle(cx, cy, 9, PALETTE.amber);
      circle(cx, cy, 3.5, '#1a1a38');
    } else if (icon === 'swift') {
      context.beginPath();
      context.moveTo(cx - 10, cy - 6);
      context.lineTo(cx + 2, cy + 6);
      context.lineTo(cx + 12, cy - 4);
      context.moveTo(cx - 10, cy + 4);
      context.lineTo(cx + 2, cy + 14);
      context.lineTo(cx + 12, cy + 6);
      context.stroke();
    } else if (icon === 'ward') {
      context.beginPath();
      context.arc(cx, cy, 10, 0, Math.PI * 2);
      context.stroke();
      circle(cx, cy, 3.5, '#7ee7ff');
    } else if (icon === 'magnet') {
      context.beginPath();
      context.arc(cx, cy - 2, 9, Math.PI, 0);
      context.stroke();
      context.beginPath();
      context.moveTo(cx - 9, cy - 2);
      context.lineTo(cx - 9, cy + 8);
      context.moveTo(cx + 9, cy - 2);
      context.lineTo(cx + 9, cy + 8);
      context.stroke();
    } else if (icon === 'vitality') {
      context.fillRect(cx - 2.5, cy - 11, 5, 22);
      context.fillRect(cx - 11, cy - 2.5, 22, 5);
    } else if (icon === 'regen') {
      context.beginPath();
      context.ellipse(cx, cy + 2, 6, 10, 0, 0, Math.PI * 2);
      context.fill();
      circle(cx, cy - 6, 3, '#fff3c4');
    } else if (icon === 'nova') {
      for (let k = 0; k < 8; k += 1) {
        const a = (k / 8) * Math.PI * 2;
        context.beginPath();
        context.moveTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4);
        context.lineTo(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
        context.stroke();
      }
      circle(cx, cy, 3.5, '#fff3c4');
    } else if (icon === 'mend') {
      circle(cx, cy + 3, 8, PALETTE.amber);
      context.beginPath();
      context.ellipse(cx, cy - 6, 3, 6, 0, 0, Math.PI * 2);
      context.fillStyle = '#fff3c4';
      context.fill();
    } else if (icon === 'twin') {
      context.fillRect(cx - 8, cy - 10, 4, 20);
      context.fillRect(cx + 4, cy - 10, 4, 20);
    } else {
      circle(cx, cy, 7, PALETTE.amber);
    }
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
      if (enemy.kind === 'maw') {
        // Boss glow ring: a pulsing amber halo so the Maw reads at any size.
        const pulse = 0.55 + Math.sin(state.time * 5) * 0.25;
        context.globalAlpha = pulse;
        context.strokeStyle = PALETTE.amber;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(enemy.x, enemy.y, enemy.radius + 8, 0, Math.PI * 2);
        context.stroke();
        context.globalAlpha = 1;
      }
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
      // Tracer: a short amber streak behind the bullet, so the shot reads as
      // a stream of fire even when the field is dense and each bullet lives
      // only a fraction of a second before it hits.
      const speed = Math.hypot(bullet.vx, bullet.vy) || 1;
      context.strokeStyle = '#ffb34788';
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(bullet.x, bullet.y);
      context.lineTo(bullet.x - (bullet.vx / speed) * 30, bullet.y - (bullet.vy / speed) * 30);
      context.stroke();
      circle(bullet.x, bullet.y, PLAYER.bulletRadius, '#ffe9b0');
      circle(bullet.x, bullet.y, PLAYER.bulletRadius * 0.45, '#ffffff');
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

  /** The live Ashen Maw, or null when no boss is on the field. */
  function liveMaw(state) {
    for (let i = 0; i < state.enemies.length; i += 1) {
      const enemy = state.enemies[i];
      if (enemy.active && enemy.kind === 'maw') return enemy;
    }
    return null;
  }

  function drawHud(state, best) {
    // Dark plates first: every HUD word sits on its own plate, so no ember,
    // bullet or particle can ever paint over the wave, score or best again.
    hudPlate(12, 12, 330, 100);
    hudPlate(FIELD.width - 312, 12, 300, 64);
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
      if (left > 0) {
        const label = `EMBER LEFT: ${left}`;
        context.font = `bold 18px ${FONT}`;
        const width = context.measureText(label).width;
        hudPlate(FIELD.width / 2 - width / 2 - 12, 18, width + 24, 30);
        text(label, FIELD.width / 2, 40, 18, PALETTE.text, 'center', 'bold');
      }
    }
    // Boss HP bar, top centre under the ember counter, while the Maw lives.
    const maw = liveMaw(state);
    if (maw) {
      const x = (FIELD.width - BOSS_BAR.width) / 2;
      bar(x, BOSS_BAR.y, BOSS_BAR.width, BOSS_BAR.height, maw.hp / maw.maxHp,
        PALETTE.emberDeep, `ASHEN MAW ${Math.ceil(maw.hp)}`);
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

  /** One deterministic Ashen Maw silhouette: dark body, amber eyes, fixed spot. */
  function drawMawSilhouette(x, y, radius) {
    context.globalAlpha = 0.9;
    circle(x, y, radius, '#2a0d0d');
    circle(x, y, radius * 0.55, '#1a0505');
    circle(x - radius * 0.28, y - radius * 0.18, radius * 0.09, PALETTE.amber);
    circle(x + radius * 0.28, y - radius * 0.18, radius * 0.09, PALETTE.amber);
    context.globalAlpha = 1;
  }

  /** The lantern with three embers orbiting it, for the title screen. The orbit
   *  angle comes from the game clock, so a staged title shot is deterministic. */
  function drawTitleLantern(state) {
    const cx = FIELD.width / 2;
    const cy = 96;
    const glow = context.createRadialGradient(cx, cy, 4, cx, cy, 72);
    glow.addColorStop(0, '#ffe9b066');
    glow.addColorStop(0.5, '#ffb34733');
    glow.addColorStop(1, '#ffb34700');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(cx, cy, 72, 0, Math.PI * 2);
    context.fill();
    circle(cx, cy, 20, '#3a2a12');
    circle(cx, cy, 15, PALETTE.lanternGlow);
    context.fillStyle = '#fff3c4';
    context.beginPath();
    context.ellipse(cx, cy - 3, 3.5, 7, 0, 0, Math.PI * 2);
    context.fill();
    for (let k = 0; k < 3; k += 1) {
      const angle = state.time * 0.9 + (k / 3) * Math.PI * 2;
      circle(cx + Math.cos(angle) * 52, cy + Math.sin(angle) * 34, 6, PALETTE.ember);
      circle(cx + Math.cos(angle) * 52, cy + Math.sin(angle) * 34, 2.5, '#fff3c4');
    }
  }

  function drawTitle(state, best) {
    dimPanel();
    drawMawSilhouette(150, 130, 46);
    drawMawSilhouette(1130, 130, 46);
    drawTitleLantern(state);
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
      const stacks = state.upgradeStacks[choice.id] || 0;
      context.fillStyle = PALETTE.panel;
      context.fillRect(x, y, cardW, cardH);
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 2;
      context.strokeRect(x, y, cardW, cardH);
      drawIcon(choice.icon, x + cardW / 2, y + 34);
      text(`[${i + 1}]`, x + cardW / 2, y + 66, 20, PALETTE.amber, 'center', 'bold');
      text(choice.name, x + cardW / 2, y + 102, 26, PALETTE.text, 'center', 'bold');
      text(choice.desc, x + cardW / 2, y + 134, 17, PALETTE.muted, 'center');
      text(stacks > 0 ? `Lv ${stacks} → Lv ${stacks + 1}` : 'Lv 1 — new blessing',
        x + cardW / 2, y + 160, 14, stacks > 0 ? PALETTE.amber : PALETTE.muted, 'center', 'bold');
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
    const taken = UPGRADE_POOL.filter((u) => (state.upgradeStacks[u.id] || 0) > 0);
    const blessings = taken.length > 0
      ? taken.map((u) => `${u.name} Lv${state.upgradeStacks[u.id]}`).join(' · ')
      : 'none — the night gave no quarter';
    text(`BLESSINGS TAKEN: ${blessings}`, FIELD.width / 2, 452, 16, PALETTE.muted, 'center');
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

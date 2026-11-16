// The ember horde: four kinds, each with its own steering and appetite. Cinders and
// Husks march on the lantern and gnaw it once they arrive; Wisps dart at the
// Keeper; the Ashen Maw (boss) does both and soaks a whole magazine. Enemies are a
// fixed pool on the state; this file spawns them, steers them and resolves bullets.

import { COMBO, ENEMY, FIELD, LANTERN, PICKUP } from './config.js';
import { hurtLantern, hurtPlayer } from './player.js';

export function createEnemyPool(count) {
  const pool = [];
  for (let i = 0; i < count; i += 1) {
    pool.push({
      active: false, kind: 'cinder', x: 0, y: 0, vx: 0, vy: 0,
      hp: 1, maxHp: 1, speed: 0, radius: 10, damage: 0, score: 0,
      lantern: true, wobble: 0, hitFlash: 0, touchTimer: 0, attackTimer: 0,
    });
  }
  return pool;
}

export function spawnEnemy(state, kind, x, y) {
  const def = ENEMY[kind];
  const enemy = state.enemies.find((e) => !e.active);
  if (!enemy) return null;
  const speedBonus = Math.min(state.wave * 4, 48);
  enemy.active = true;
  enemy.kind = kind;
  enemy.x = x;
  enemy.y = y;
  enemy.hp = def.hp + Math.floor(state.wave * 1.5);
  enemy.maxHp = enemy.hp;
  enemy.speed = def.speed + speedBonus;
  enemy.radius = def.radius;
  enemy.damage = def.damage;
  enemy.score = def.score;
  enemy.lantern = def.lantern;
  enemy.wobble = state.random() * Math.PI * 2;
  enemy.hitFlash = 0;
  enemy.touchTimer = 0;
  enemy.attackTimer = 0;
  return enemy;
}

/** A point on a random arena edge, just outside the visible field. */
export function edgePoint(random) {
  const side = Math.floor(random() * 4);
  const margin = 30;
  if (side === 0) return { x: random() * FIELD.width, y: -margin };
  if (side === 1) return { x: FIELD.width + margin, y: random() * FIELD.height };
  if (side === 2) return { x: random() * FIELD.width, y: FIELD.height + margin };
  return { x: -margin, y: random() * FIELD.height };
}

function scoreFor(state, enemy) {
  const mult = 1 + state.combo * COMBO.step;
  const gained = Math.round(enemy.score * mult);
  state.score += gained;
  state.particles.addText(enemy.x, enemy.y - enemy.radius, `+${gained}`);
}

function dropPickup(state, x, y) {
  if (state.random() > 0.3) return;
  const pickup = state.pickups.find((p) => !p.active);
  if (!pickup) return;
  pickup.active = true;
  pickup.x = x;
  pickup.y = y;
  pickup.life = PICKUP.life;
}

function killEnemy(state, enemy) {
  enemy.active = false;
  state.kills += 1;
  // Combo chain: each kill within the window raises the multiplier, capped so the
  // top multiplier is 1 + 8 * COMBO.step = 3x (COMBO.max in config.js).
  state.combo = Math.min(state.combo + 1, 8);
  state.comboTimer = COMBO.window;
  scoreFor(state, enemy);
  state.particles.emberBurst(enemy.x, enemy.y);
  state.sfx.push('kill');
  dropPickup(state, enemy.x, enemy.y);
  if (enemy.kind === 'maw') {
    state.particles.shake(9, 0.5);
    state.sfx.push('waveClear');
  }
}

/** Steer every live enemy, resolve bullet hits and contact damage, one fixed step. */
export function updateEnemies(state, dt) {
  const player = state.player;
  for (let i = 0; i < state.enemies.length; i += 1) {
    const enemy = state.enemies[i];
    if (!enemy.active) continue;
    if (enemy.hitFlash > 0) enemy.hitFlash -= dt;
    if (enemy.touchTimer > 0) enemy.touchTimer -= dt;
    const target = enemy.lantern ? LANTERN : player;
    const dx = target.x - enemy.x;
    const dy = target.y - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    let steerX = dx / dist;
    let steerY = dy / dist;
    if (enemy.kind === 'wisp') {
      enemy.wobble += dt * 5;
      const side = Math.sin(enemy.wobble) * 0.7;
      const nx = steerX;
      steerX = steerX - steerY * side;
      steerY = steerY + nx * side;
    }
    const stopAt = enemy.lantern ? LANTERN.radius + enemy.radius - 4 : 16 + enemy.radius;
    if (dist > stopAt) {
      enemy.x += steerX * enemy.speed * dt;
      enemy.y += steerY * enemy.speed * dt;
    } else if (enemy.lantern) {
      // Gnawing the lantern: a slow, telegraphed bite the Keeper can interrupt.
      enemy.attackTimer -= dt;
      if (enemy.attackTimer <= 0) {
        enemy.attackTimer = 1.1;
        hurtLantern(state, enemy.damage);
        state.particles.lanternBurst(LANTERN.x, LANTERN.y);
        state.particles.shake(4, 0.25);
      }
    } else if (enemy.touchTimer <= 0) {
      enemy.touchTimer = 0.8;
      if (hurtPlayer(state, enemy.damage)) {
        state.particles.shake(6, 0.3);
        const kx = (player.x - enemy.x) / dist;
        const ky = (player.y - enemy.y) / dist;
        player.x = Math.min(FIELD.width - 16, Math.max(16, player.x + kx * 26));
        player.y = Math.min(FIELD.height - 16, Math.max(16, player.y + ky * 26));
      }
    }
    // Bullets: a hit flashes the enemy and, when its health runs out, ends it.
    for (let b = 0; b < state.bullets.length; b += 1) {
      const bullet = state.bullets[b];
      if (!bullet.active) continue;
      const bdx = bullet.x - enemy.x;
      const bdy = bullet.y - enemy.y;
      const reach = enemy.radius + 5;
      if (bdx * bdx + bdy * bdy < reach * reach) {
        bullet.active = false;
        enemy.hp -= bullet.damage;
        enemy.hitFlash = 0.12;
        state.particles.hitSpark(bullet.x, bullet.y);
        state.sfx.push('hit');
        if (enemy.hp <= 0) killEnemy(state, enemy);
        break;
      }
    }
  }
}

/** How many enemies are still alive right now. */
export function aliveCount(state) {
  let count = 0;
  for (let i = 0; i < state.enemies.length; i += 1) {
    if (state.enemies[i].active) count += 1;
  }
  return count;
}

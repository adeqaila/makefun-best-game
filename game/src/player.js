// The Keeper: movement, aiming, firing, pickups and hurt. One player object lives
// on the game state; this file owns how it changes. Bullets and pickups are plain
// pools on the state, allocated once at boot so the hot loop allocates nothing.

import { BULLET, FIELD, LANTERN, PICKUP, PLAYER } from './config.js';

export function createPlayer() {
  return {
    x: FIELD.width / 2,
    y: FIELD.height / 2 + 150,
    hp: PLAYER.maxHp,
    maxHp: PLAYER.maxHp,
    aimAngle: -Math.PI / 2,
    fireTimer: 0,
    invuln: 0,
    // Upgradeable stats, all start at the base values in config.js.
    speed: PLAYER.speed,
    damage: PLAYER.bulletDamage,
    fireInterval: PLAYER.fireInterval,
    projectiles: 1,
    spread: 0.09,
    magnet: 0,
    shield: 0,
    regen: 0,
  };
}

/** Move + aim + fire one fixed step. `aim` is a field-space point from the renderer. */
export function updatePlayer(state, move, aim, firing, dt) {
  const player = state.player;
  player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x + move.x * player.speed * dt));
  player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, player.y + move.y * player.speed * dt));
  player.aimAngle = Math.atan2(aim.y - player.y, aim.x - player.x);
  if (player.invuln > 0) player.invuln -= dt;
  if (player.regen > 0 && player.hp < player.maxHp) {
    player.hp = Math.min(player.maxHp, player.hp + player.regen * dt);
  }
  player.fireTimer -= dt;
  if (firing && player.fireTimer <= 0) {
    fireBullets(state);
    player.fireTimer = player.fireInterval;
  }
  collectPickups(state, dt);
}

/** Advance every live bullet one fixed step; spent or escaped bullets go dark. */
export function stepBullets(state, dt) {
  for (let i = 0; i < state.bullets.length; i += 1) {
    const bullet = state.bullets[i];
    if (!bullet.active) continue;
    bullet.life -= dt;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    if (
      bullet.life <= 0 ||
      bullet.x < -20 || bullet.x > FIELD.width + 20 ||
      bullet.y < -20 || bullet.y > FIELD.height + 20
    ) {
      bullet.active = false;
    }
  }
}

function fireBullets(state) {
  const player = state.player;
  const count = player.projectiles;
  for (let i = 0; i < count; i += 1) {
    const bullet = state.bullets.find((b) => !b.active);
    if (!bullet) return;
    const offset = count === 1 ? 0 : (i - (count - 1) / 2) * player.spread * 2;
    const angle = player.aimAngle + offset;
    bullet.active = true;
    bullet.x = player.x + Math.cos(angle) * (PLAYER.radius + 6);
    bullet.y = player.y + Math.sin(angle) * (PLAYER.radius + 6);
    bullet.vx = Math.cos(angle) * PLAYER.bulletSpeed;
    bullet.vy = Math.sin(angle) * PLAYER.bulletSpeed;
    bullet.life = BULLET.life;
    bullet.damage = player.damage;
    bullet.pierce = 0;
  }
  state.sfx.push('shoot');
}

function collectPickups(state, dt) {
  const player = state.player;
  const reach = PLAYER.pickupRadius + player.magnet;
  for (let i = 0; i < state.pickups.length; i += 1) {
    const pickup = state.pickups[i];
    if (!pickup.active) continue;
    pickup.life -= dt;
    if (pickup.life <= 0) {
      pickup.active = false;
      continue;
    }
    const dx = player.x - pickup.x;
    const dy = player.y - pickup.y;
    const dist = Math.hypot(dx, dy);
    if (player.magnet > 0 && dist < PICKUP.magnet + player.magnet) {
      pickup.x += (dx / (dist || 1)) * 260 * dt;
      pickup.y += (dy / (dist || 1)) * 260 * dt;
    }
    if (dist < reach) {
      pickup.active = false;
      state.score += PICKUP.score;
      player.hp = Math.min(player.maxHp, player.hp + PICKUP.heal);
      state.sfx.push('pickup');
    }
  }
}

/** Damage the Keeper, respecting invulnerability and the ember shield upgrade. */
export function hurtPlayer(state, amount) {
  const player = state.player;
  if (player.invuln > 0) return false;
  if (player.shield > 0) {
    player.shield -= 1;
    player.invuln = PLAYER.invulnerable;
    state.sfx.push('hit');
    return true;
  }
  player.hp -= amount;
  player.invuln = PLAYER.invulnerable;
  state.sfx.push('hurt');
  return true;
}

/** Damage the lantern; returns true while it still burns. */
export function hurtLantern(state, amount) {
  state.lantern.hp -= amount;
  state.sfx.push('hurt');
  return state.lantern.hp > 0;
}

/** Reset the Keeper and the lantern for a fresh run, keeping upgradeable stats base. */
export function resetPlayer(state) {
  const fresh = createPlayer();
  Object.assign(state.player, fresh);
  state.lantern.hp = LANTERN.maxHp;
}

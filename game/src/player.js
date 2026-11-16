// The Keeper: movement, aiming, firing, pickups and hurt. One player object lives
// on the game state; this file owns how it changes. Bullets and pickups are plain
// pools on the state, allocated once at boot so the hot loop allocates nothing.
//
// Full grind (slot 2, variant C): the Keeper gains two new upgradeable systems.
// Twin Shot adds a second, parallel barrel beside every projectile (a sideways
// offset copy of the same shot, not Split Shot's fan), and Ember Nova is a
// periodic burst whose timer lives here and whose damage is resolved in
// enemies.js updateEnemies(), where the horde already lives.

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
    // Twin Shot: parallel barrels, one extra copy per stack, offset sideways.
    twin: 0,
    // Ember Nova: periodic burst; 0 means the blessing was never taken.
    nova: 0,
    novaTimer: 0,
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

/** Launch one bullet from the pool at (x, y) along `angle`; false when dry. */
function spawnBullet(state, x, y, angle) {
  const bullet = state.bullets.find((b) => !b.active);
  if (!bullet) return false;
  bullet.active = true;
  bullet.x = x;
  bullet.y = y;
  bullet.vx = Math.cos(angle) * PLAYER.bulletSpeed;
  bullet.vy = Math.sin(angle) * PLAYER.bulletSpeed;
  bullet.life = BULLET.life;
  bullet.damage = state.player.damage;
  bullet.pierce = 0;
  return true;
}

function fireBullets(state) {
  const player = state.player;
  const count = player.projectiles;
  for (let i = 0; i < count; i += 1) {
    const offset = count === 1 ? 0 : (i - (count - 1) / 2) * player.spread * 2;
    const angle = player.aimAngle + offset;
    const baseX = player.x + Math.cos(angle) * (PLAYER.radius + 6);
    const baseY = player.y + Math.sin(angle) * (PLAYER.radius + 6);
    spawnBullet(state, baseX, baseY, angle);
    // Twin Shot: the same shot again from a second barrel beside the first —
    // same angle, shifted sideways, alternating sides per stack.
    for (let t = 0; t < player.twin; t += 1) {
      const side = t % 2 === 0 ? 1 : -1;
      const shift = 12 * Math.ceil((t + 1) / 2) * side;
      const px = -Math.sin(angle);
      const py = Math.cos(angle);
      spawnBullet(state, baseX + px * shift, baseY + py * shift, angle);
    }
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

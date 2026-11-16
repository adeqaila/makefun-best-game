// ABYSSAL — player.js
// One job: the diver's state — health, harpoon, pearls, keys and boons.

function createPlayer(x, y) {
  return {
    x, y,
    hp: CONFIG.baseHp,
    maxHp: CONFIG.baseHp,
    damage: CONFIG.baseDamage,
    pearls: 0,
    score: 0,
    keys: 0,
    kills: 0,
    magnet: 0,
    thorns: 0,
    lucky: false,
    flash: 0,
    facing: 1,
  };
}

function healPlayer(p, n) {
  p.hp = Math.min(p.maxHp, p.hp + n);
}

function addPearls(state, n) {
  const value = state.player.lucky ? Math.round(n * 1.5) : n;
  state.player.pearls += value;
  state.player.score += value;
  return value;
}

function hurtPlayer(state, n) {
  state.player.hp -= n;
  state.player.flash = 6;
  addShake(state.fx, 7);
  if (state.player.hp < 0) state.player.hp = 0;
}

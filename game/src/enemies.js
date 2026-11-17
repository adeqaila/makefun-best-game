// ABYSSAL — enemies.js
// One job: enemy bodies and their turn-by-turn brains.
// Jellyfish wander, crabs and anglerfish chase (the angler is fast),
// eels swim straight until rock turns them, bosses hunt you down.

function makeEnemy(type, x, y, floor) {
  const t = ENEMIES[type];
  const hpBonus = t.boss ? 0 : Math.floor(floor / 2);
  const dmgBonus = t.boss ? 0 : (floor >= 6 ? 1 : 0);
  return {
    type, x, y,
    hp: t.hp + hpBonus,
    maxHp: t.hp + hpBonus,
    dmg: t.dmg + dmgBonus,
    dir: rngPick(makeRng((x * 31 + y * 17 + floor * 7) >>> 0), [[1, 0], [-1, 0], [0, 1], [0, -1]]),
    flash: 0,
    dead: false,
  };
}

function enemyAt(state, x, y) {
  for (const e of state.dungeon.enemies) {
    if (!e.dead && e.x === x && e.y === y) return e;
  }
  return null;
}

function canOccupy(state, x, y) {
  if (!isFloor(state.dungeon, x, y)) return false;
  if (state.player.x === x && state.player.y === y) return false;
  return enemyAt(state, x, y) === null;
}

function stepToward(state, e, tx, ty) {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const options = [];
  if (Math.abs(dx) >= Math.abs(dy)) {
    options.push([Math.sign(dx), 0], [0, Math.sign(dy)]);
  } else {
    options.push([0, Math.sign(dy)], [Math.sign(dx), 0]);
  }
  for (const step of options) {
    if (step[0] === 0 && step[1] === 0) continue;
    if (canOccupy(state, e.x + step[0], e.y + step[1])) {
      e.x += step[0];
      e.y += step[1];
      return true;
    }
  }
  return false;
}

function enemyAttack(state, e) {
  const p = state.player;
  hurtPlayer(state, e.dmg);
  state.message = 'The ' + ENEMIES[e.type].name + ' hits you for ' + e.dmg + '!';
  addFloatText(state.fx, p.x, p.y, '-' + e.dmg, PALETTE.danger);
  playSfx('hurt');
  if (p.thorns > 0) {
    e.hp -= p.thorns;
    addFloatText(state.fx, e.x, e.y, '-' + p.thorns, PALETTE.teal);
    if (e.hp <= 0) killEnemy(state, e, true);
  }
  if (p.hp <= 0) endRun(state, false);
}

function killEnemy(state, e, byThorns) {
  e.dead = true;
  state.player.kills++;
  state.player.score += CONFIG.killScore;
  if (state.player.vampire) healPlayer(state.player, 2);
  spawnHit(state.fx, e.x, e.y, ENEMIES[e.type].color);
  playSfx(byThorns ? 'thorns' : 'kill');
  if (e === state.dungeon.boss) {
    state.dungeon.stairs.sealed = false;
    state.message = 'The ' + ENEMIES[e.type].name + ' falls! The way down opens!';
    if (state.floor === CONFIG.winFloor) {
      state.player.score += CONFIG.winBonus;
      endRun(state, true);
      return;
    }
  } else {
    state.message = 'You harpoon the ' + ENEMIES[e.type].name + '! +' + CONFIG.killScore + ' score.';
  }
}

function enemiesAct(state) {
  const rng = state.rng;
  for (const e of state.dungeon.enemies) {
    if (e.dead) continue;
    if (e.flash > 0) e.flash--;
    const dist = Math.abs(e.x - state.player.x) + Math.abs(e.y - state.player.y);
    if (dist === 1) {
      enemyAttack(state, e);
      if (state.screen !== 'play') return;
      continue;
    }
    const t = ENEMIES[e.type];
    const steps = t.speed;
    for (let s = 0; s < steps; s++) {
      if (t.ai === 'wander') {
        const dir = rngPick(rng, [[1, 0], [-1, 0], [0, 1], [0, -1], [0, 0]]);
        if (dir[0] !== 0 || dir[1] !== 0) {
          if (canOccupy(state, e.x + dir[0], e.y + dir[1])) { e.x += dir[0]; e.y += dir[1]; }
        }
      } else if (t.ai === 'chase') {
        stepToward(state, e, state.player.x, state.player.y);
      } else if (t.ai === 'straight') {
        const nx = e.x + e.dir[0];
        const ny = e.y + e.dir[1];
        if (canOccupy(state, nx, ny)) {
          e.x = nx;
          e.y = ny;
        } else {
          e.dir = rngPick(rng, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
        }
      }
      if (Math.abs(e.x - state.player.x) + Math.abs(e.y - state.player.y) === 1) break;
    }
  }
}

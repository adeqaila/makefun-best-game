// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the real
// rules forward from a fresh state for a fixed number of steps, steered by a simple
// autopilot (orbit the lantern, aim at the nearest ember, hold fire), so the frame
// is what a real game looks like and the same seed always gives the same frame.
// The driver is the live game's own step function — no separate scripted scene.
//
// Boss grind (slot 2, variant B): the play scene is staged at wave 5, the boss
// wave — the Ashen Maw on the field with its escorts, bullets in the air and
// the boss HP bar up. The autopilot holds fire until the Maw is out with at
// least seven embers around it, then opens fire; a firing autopilot would
// otherwise clear the wave before the frame is taken.

import { FIELD, LANTERN, STEP } from './config.js';
import { aliveCount } from './enemies.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_UPGRADE } from './render.js';
import { rollChoices } from './upgrades.js';

const START_SECONDS = 6;
const END_LIMIT_SECONDS = 600;

/** Nearest live ember to the Keeper, or null when the field is empty. */
function nearestEnemy(state) {
  let best = null;
  let bestDist = Infinity;
  for (let i = 0; i < state.enemies.length; i += 1) {
    const enemy = state.enemies[i];
    if (!enemy.active) continue;
    const dist = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = enemy;
    }
  }
  return best;
}

/** One autopilot step: orbit the lantern, aim at the nearest ember, keep firing. */
function autopilotStep(driver, state, orbitAngle, firing = true) {
  const target = nearestEnemy(state);
  const orbitX = LANTERN.x + Math.cos(orbitAngle) * 210;
  const orbitY = LANTERN.y + Math.sin(orbitAngle) * 150;
  const dx = orbitX - state.player.x;
  const dy = orbitY - state.player.y;
  const dist = Math.hypot(dx, dy) || 1;
  const move = dist > 24 ? { x: dx / dist, y: dy / dist } : { x: 0, y: 0 };
  const aim = target ? { x: target.x, y: target.y } : { x: FIELD.width / 2, y: 120 };
  driver.step(move, aim, firing && target !== null);
}

/** True while the Keeper and the lantern both still stand. */
function alive(state) {
  return state.player.hp > 0 && state.lantern.hp > 0;
}

/** True while the Ashen Maw is on the field. */
function mawAlive(state) {
  for (let i = 0; i < state.enemies.length; i += 1) {
    const enemy = state.enemies[i];
    if (enemy.active && enemy.kind === 'maw') return true;
  }
  return false;
}

/** True when at least one bullet is flying (the shot must show the shooting). */
function bulletFlying(state) {
  for (let i = 0; i < state.bullets.length; i += 1) {
    if (state.bullets[i].active) return true;
  }
  return false;
}

/**
 * Set the game to the named scene (start, play, upgrade or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, driver) {
  const state = driver.state;
  driver.reset();
  if (name !== 'play' && name !== 'upgrade' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) state.time += STEP;
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    // A Keeper who shoots but never moves: the horde still closes in and the
    // lantern falls, after a fight — so the results screen shows a real run.
    driver.startWave(1);
    for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
      const target = nearestEnemy(state);
      const aim = target ? { x: target.x, y: target.y } : { x: FIELD.width / 2, y: 120 };
      driver.step({ x: 0, y: 0 }, aim, target !== null);
      if (state.player.hp <= 0 || state.lantern.hp <= 0) break;
      // A cleared wave with no horde left cannot kill anyone: send the next one.
      if (state.waveState.phase === 'clear') driver.startWave(state.wave + 1);
    }
    return { screen: SCREEN_OVER, best: state.score };
  }
  if (name === 'upgrade') {
    driver.startWave(1);
    let orbit = 0;
    for (let i = 0; i < 9000; i += 1) {
      orbit += STEP * 0.5;
      autopilotStep(driver, state, orbit);
      if (state.waveState.phase === 'clear') break;
    }
    state.choices = rollChoices(state);
    return { screen: SCREEN_UPGRADE, best: state.score };
  }
  // Play: the boss wave, staged directly at wave 5. The autopilot holds fire
  // while the horde gathers, then opens fire once the Maw is out with at
  // least seven embers around it, so the captured frame shows the boss fight
  // — Maw, escorts, bullets in the air, boss HP bar up — instead of an arena
  // the autopilot already cleared. (A firing autopilot kills faster than a
  // wave spawns, so a "shoot from the start" staging always ends on an empty,
  // cleared field; holding fire until the field is busy is the fix.)
  // The frame is taken once the first kills have landed, so the score and
  // floating "+points" text are live too.
  driver.reset();
  driver.startWave(5);
  let orbit = 0;
  let started = false;
  for (let i = 0; i < 60 / STEP; i += 1) {
    orbit += STEP * 0.5;
    // Latch: once the boss is out with its escorts, keep firing even as kills
    // thin the field, so several bullets are in the air at the captured frame.
    if (mawAlive(state) && aliveCount(state) >= 8) started = true;
    autopilotStep(driver, state, orbit, started);
    if (!alive(state)) break;
    if (state.kills >= 2 && mawAlive(state) && aliveCount(state) >= 7 && bulletFlying(state)
      && state.player.invuln <= 0) break;
    if (state.waveState.phase === 'clear') break;
  }
  return { screen: SCREEN_PLAY, best: state.score };
}

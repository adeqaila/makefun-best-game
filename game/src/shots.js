// The screenshot scenes behind ?shot=start|play|upgrade|end. Each one plays the real
// rules forward from a fresh state for a fixed number of steps, steered by a simple
// autopilot (orbit the lantern, aim at the nearest ember, hold fire), so the frame
// is what a real game looks like and the same seed always gives the same frame.
// The driver is the live game's own step function — no separate scripted scene.

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
function autopilotStep(driver, state, orbitAngle) {
  const target = nearestEnemy(state);
  const orbitX = LANTERN.x + Math.cos(orbitAngle) * 210;
  const orbitY = LANTERN.y + Math.sin(orbitAngle) * 150;
  const dx = orbitX - state.player.x;
  const dy = orbitY - state.player.y;
  const dist = Math.hypot(dx, dy) || 1;
  const move = dist > 24 ? { x: dx / dist, y: dy / dist } : { x: 0, y: 0 };
  const aim = target ? { x: target.x, y: target.y } : { x: FIELD.width / 2, y: 120 };
  driver.step(move, aim, target !== null);
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
  // Play through to a busy mid-wave frame: wave 3+ spawns faster and thicker, so
  // the field holds several embers at once instead of a cleared, empty arena.
  driver.startWave(1);
  let orbit = 0;
  let busy = false;
  for (let i = 0; i < 90 / STEP; i += 1) {
    orbit += STEP * 0.5;
    autopilotStep(driver, state, orbit);
    if (state.waveState.phase === 'clear' && state.wave < 4) {
      driver.startWave(state.wave + 1);
      continue;
    }
    if (state.wave >= 3 && aliveCount(state) >= 6 && state.waveState.toSpawn <= 8) {
      busy = true;
      break;
    }
    if (state.wave >= 4 && state.waveState.phase === 'clear') break;
  }
  if (!busy) {
    // Fallback: never hang — take whatever wave 3+ looks like after the loop.
    let extra = 0;
    while (aliveCount(state) < 6 && extra < 8 / STEP && state.waveState.phase !== 'clear') {
      orbit += STEP * 0.5;
      autopilotStep(driver, state, orbit);
      extra += 1;
    }
  }
  return { screen: SCREEN_PLAY, best: state.score };
}

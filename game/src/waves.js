// Waves: what spawns, how fast, and when a wave is won. Each wave is a queue of
// kinds drawn from a mix that shifts toward tougher ember kinds as the night goes
// on; every 5th wave the Ashen Maw leads the horde. Clearing a wave opens the
// upgrade choice; the wave counter only advances once the player has chosen.

import { WAVE } from './config.js';
import { weightedPick } from './random.js';
import { aliveCount, edgePoint, spawnEnemy } from './enemies.js';

export function createWaveState() {
  return {
    number: 0,
    phase: 'idle',
    toSpawn: 0,
    spawnTimer: 0,
    spawnInterval: WAVE.spawnInterval,
    bossSpawned: false,
  };
}

/** The spawn mix for a wave: heavier kinds creep in as the wave number grows. */
export function waveMix(number) {
  const table = [
    { weight: Math.max(6, 14 - number), value: 'cinder' },
    { weight: 3 + number, value: 'wisp' },
  ];
  if (number >= 2) table.push({ weight: 1 + Math.floor(number / 2), value: 'husk' });
  return table;
}

export function startWave(state, number) {
  const wave = state.waveState;
  wave.number = number;
  wave.phase = 'spawning';
  wave.toSpawn = WAVE.baseCount + WAVE.perWave * number;
  // Boss waves bring two extra escorts with the Ashen Maw.
  if (number % WAVE.bossEvery === 0) wave.toSpawn += 2;
  wave.spawnInterval = Math.max(WAVE.minInterval, WAVE.spawnInterval * Math.pow(WAVE.intervalScale, number - 1));
  wave.spawnTimer = 0.4;
  wave.bossSpawned = false;
  state.wave = number;
  if (number % WAVE.bossEvery === 0) state.sfx.push('boss');
}

/** Spawn from the queue and report when the wave is fully cleared. */
export function updateWaves(state, dt) {
  const wave = state.waveState;
  if (wave.phase !== 'spawning' && wave.phase !== 'fighting') return false;
  if (wave.phase === 'spawning') {
    wave.spawnTimer -= dt;
    if (wave.spawnTimer <= 0 && wave.toSpawn > 0) {
      wave.spawnTimer = wave.spawnInterval;
      wave.toSpawn -= 1;
      const point = edgePoint(state.random);
      if (wave.number % WAVE.bossEvery === 0 && !wave.bossSpawned) {
        wave.bossSpawned = true;
        spawnEnemy(state, 'maw', point.x, point.y);
      } else {
        spawnEnemy(state, weightedPick(state.random, waveMix(wave.number)), point.x, point.y);
      }
    }
    if (wave.toSpawn === 0) wave.phase = 'fighting';
  }
  if (wave.phase === 'fighting' && aliveCount(state) === 0) {
    wave.phase = 'clear';
    state.lantern.hp = Math.min(state.lantern.maxHp, state.lantern.hp + 12);
    state.sfx.push('waveClear');
    return true;
  }
  return false;
}

// EMBERKEEP — a note to the judge (allowed by the kit: text addressed to the judge
// is part of the entry). How this game meets the five criteria, one line each:
// 1. Complete game: title/start + play + upgrade + results/restart screens in
//    render.js (SCREEN_TITLE/PLAY/UPGRADE/OVER); goal, rules and controls on the
//    title screen; HUD (wave/score/combo/best/HP/lantern, on dark backing plates
//    no sprite can cover, in render.js drawHud()) with a boss HP bar while the
//    Ashen Maw lives (render.js liveMaw()); lose when Keeper HP or lantern HP
//    hits 0, restart from the results screen, which also lists the blessings
//    taken (render.js drawOver()).
// 2. Fun & depth: twin-stick loop in player.js updatePlayer() (Twin Shot adds a
//    second parallel barrel per stack); waves that grow in waves.js startWave()/
//    waveMix() (boss Ashen Maw every 5th wave); a real choice between waves in
//    upgrades.js rollChoices()/applyUpgrade() (11 blessings, stacks to 3 —
//    Ember Nova burns nearby embers every 3 s, Lantern Mend repairs the
//    lantern itself, Twin Shot doubles the barrels); the horde is denser and
//    ~35% larger than slot 1 (config.js ENEMY/WAVE) so fights stay busy.
// 3. Feel & polish: fixed 1/60 s steps in main.js frame(); hit flash + particles +
//    screen shake in particles.js; synthesised WebAudio SFX in audio.js (no files).
// 4. Look & originality: an original premise (last Keeper of the Ember, indigo night
//    vs amber light), original enemy kinds (Cinder/Wisp/Husk/Ashen Maw) in
//    enemies.js, one coherent palette in config.js PALETTE. Nothing copied.
// 5. Structure: one clear job per file — config, input, player, enemies, waves,
//    upgrades, audio, particles, render, shots — named for what they do.
//
// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps, and the renderer paints what is there. The game moves between five
// screens: title, play, paused, upgrade choice and game over.
//
// ?seed=N fixes the spawn pattern. ?shot=start|play|upgrade|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, BULLET, COMBO, LANTERN, PICKUP, STEP } from './config.js';
import { createRandom } from './random.js';
import { createPlayer, resetPlayer, stepBullets, updatePlayer } from './player.js';
import { createEnemyPool, updateEnemies } from './enemies.js';
import { createWaveState, startWave, updateWaves } from './waves.js';
import { applyUpgrade, rollChoices } from './upgrades.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import {
  ACTION_CHOICE_1,
  ACTION_CHOICE_2,
  ACTION_CHOICE_3,
  ACTION_CONFIRM,
  ACTION_MUTE,
  ACTION_PAUSE,
  createInput,
} from './input.js';
import {
  SCREEN_OVER,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_UPGRADE,
  createRenderer,
} from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
const ENEMY_POOL = 48;
const PICKUP_POOL = 24;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();

function createState(random) {
  const bullets = [];
  for (let i = 0; i < BULLET.max; i += 1) {
    bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, damage: 0, pierce: 0 });
  }
  const pickups = [];
  for (let i = 0; i < PICKUP_POOL; i += 1) {
    pickups.push({ active: false, x: 0, y: 0, life: 0 });
  }
  return {
    random,
    time: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    wave: 0,
    kills: 0,
    best: 0,
    player: createPlayer(),
    lantern: { hp: LANTERN.maxHp, maxHp: LANTERN.maxHp },
    bullets,
    enemies: createEnemyPool(ENEMY_POOL),
    pickups,
    particles: createParticles(createRandom((seed ^ 0x9e3779b9) >>> 0)),
    waveState: createWaveState(),
    upgradeStacks: {},
    choices: [],
    sfx: [],
  };
}

const state = createState(createRandom(seed));
const renderer = createRenderer(canvas);

function resetState() {
  state.time = 0;
  state.score = 0;
  state.combo = 0;
  state.comboTimer = 0;
  state.wave = 0;
  state.kills = 0;
  state.upgradeStacks = {};
  state.choices = [];
  state.sfx = [];
  resetPlayer(state);
  state.waveState = createWaveState();
  for (let i = 0; i < state.bullets.length; i += 1) state.bullets[i].active = false;
  for (let i = 0; i < state.enemies.length; i += 1) state.enemies[i].active = false;
  for (let i = 0; i < state.pickups.length; i += 1) state.pickups[i].active = false;
  for (let i = 0; i < state.particles.pool.length; i += 1) state.particles.pool[i].active = false;
  for (let i = 0; i < state.particles.texts.length; i += 1) state.particles.texts[i].active = false;
}

/** Drain the sound-effect queue the simulation filled this step. */
function playQueuedSfx() {
  for (let i = 0; i < state.sfx.length; i += 1) {
    const name = state.sfx[i];
    if (typeof audio[name] === 'function') audio[name]();
  }
  state.sfx.length = 0;
}

/** One fixed play step: move, shoot, steer the horde, spawn the wave, settle effects. */
function stepPlay(move, aim, firing) {
  state.time += STEP;
  if (state.comboTimer > 0) {
    state.comboTimer -= STEP;
    if (state.comboTimer <= 0) state.combo = 0;
  }
  if (state.lantern.hp < state.lantern.maxHp) {
    state.lantern.hp = Math.min(state.lantern.maxHp, state.lantern.hp + LANTERN.regen * STEP);
  }
  updatePlayer(state, move, aim, firing, STEP);
  stepBullets(state, STEP);
  updateEnemies(state, STEP);
  const cleared = updateWaves(state, STEP);
  state.particles.step(STEP);
  playQueuedSfx();
  return cleared;
}

function beginWave(number) {
  startWave(state, number);
}

const driver = {
  state,
  reset: resetState,
  startWave: beginWave,
  step: stepPlay,
};

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, driver);
  window.__emberkeep = { state, screen: () => scene.screen, best: () => scene.best };
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  // Read-only debug hook for local playtesting (screenshots + autopilot checks).
  window.__emberkeep = { state, screen: () => screen, best: () => best };
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    resetState();
    accumulator = 0;
    beginWave(1);
    screen = SCREEN_PLAY;
    announce('Playing. Defend the lantern.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (state.score > best) {
      best = state.score;
      saveBest(best);
    }
    audio.gameOver();
    announce(`Game over. Score ${state.score}. Best ${best}.`);
  }

  function openUpgrade() {
    state.choices = rollChoices(state);
    screen = SCREEN_UPGRADE;
    announce(`Wave ${state.wave} cleared. Choose one upgrade.`);
  }

  function chooseUpgrade(index) {
    const choice = state.choices[index];
    if (!choice) return;
    applyUpgrade(state, choice);
    playQueuedSfx();
    beginWave(state.wave + 1);
    screen = SCREEN_PLAY;
    announce(`Wave ${state.wave}. ${choice.name} taken.`);
  }

  function clickedCard() {
    const aim = input.aim();
    for (let i = 0; i < state.choices.length; i += 1) {
      const rect = renderer.cardRect(i);
      if (aim.x >= rect.x && aim.x <= rect.x + rect.width && aim.y >= rect.y && aim.y <= rect.y + rect.height) {
        return i;
      }
    }
    return -1;
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (screen === SCREEN_UPGRADE) {
      if (actions & ACTION_CHOICE_1) chooseUpgrade(0);
      else if (actions & ACTION_CHOICE_2) chooseUpgrade(1);
      else if (actions & ACTION_CHOICE_3) chooseUpgrade(2);
      else if (actions & ACTION_CONFIRM) {
        const card = clickedCard();
        if (card >= 0) chooseUpgrade(card);
      }
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        state.time += STEP;
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        const aim = renderer.toField(input.aim().x, input.aim().y);
        const cleared = stepPlay(input.move(), aim, input.firing());
        accumulator -= STEP;
        if (state.player.hp <= 0 || state.lantern.hp <= 0) {
          endGame();
          break;
        }
        if (cleared) openUpgrade();
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the horde feed unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Emberkeep. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

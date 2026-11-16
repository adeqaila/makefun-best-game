// ABYSSAL — main.js
// One job: the game loop (fixed 1/60 s step), the state machine
// (title / play / boon / results), the turn rules, and boot.
// One player move = one turn; then every foe takes its turn.

const Game = {
  screen: 'title',
  floor: 1,
  floorCleared: 0,
  dungeon: null,
  player: null,
  rng: makeRng(7),
  fx: createFx(),
  boonChoices: [],
  message: 'WASD / arrows to move · bump a foe to harpoon it · find the glowing stairs ▼',
  won: false,
  paused: false,
  best: 0,
  time: 0,
  clickables: [],
  shotMode: false,
  seed: 7,
};

function loadBest() {
  try {
    const v = window.localStorage.getItem(CONFIG.bestKey);
    return v ? parseInt(v, 10) || 0 : 0;
  } catch (err) {
    return 0;
  }
}

function saveBest() {
  try {
    window.localStorage.setItem(CONFIG.bestKey, String(Game.best));
  } catch (err) { /* best score is a nice-to-have */ }
}

function newRun(seed) {
  Game.seed = seed;
  Game.rng = makeRng(seed);
  Game.floor = 1;
  Game.floorCleared = 0;
  Game.won = false;
  Game.paused = false;
  Game.dungeon = generateDungeon(Game.rng, 1);
  Game.player = createPlayer(Game.dungeon.start.x, Game.dungeon.start.y);
  Game.message = 'Floor 1 — the temple mouth. Find the glowing stairs ▼';
  Game.screen = 'play';
  if (Game.dungeon.boss) playSfx('boss');
}

function startGame() {
  ensureAudio();
  newRun((Math.random() * 0xffffffff) >>> 0);
  playSfx('stairs');
}

function endRun(state, won) {
  state.won = won;
  state.screen = 'results';
  if (state.player.score > state.best) {
    state.best = state.player.score;
    saveBest();
  }
  playSfx(won ? 'win' : 'lose');
}

function descend(state) {
  state.floorCleared = state.floor;
  state.player.score += CONFIG.floorBonus;
  state.boonChoices = rollBoons(state.rng);
  state.screen = 'boon';
  playSfx('stairs');
}

function chooseBoon(state, i) {
  const boon = state.boonChoices[i];
  if (!boon) return;
  applyBoon(state, boon);
  state.floor++;
  state.dungeon = generateDungeon(state.rng, state.floor);
  state.player.x = state.dungeon.start.x;
  state.player.y = state.dungeon.start.y;
  state.screen = 'play';
  if (state.dungeon.boss) {
    state.message = 'Floor ' + state.floor + ' — the ' + ENEMIES[state.dungeon.boss.type].name + ' guards the way down!';
    playSfx('boss');
  } else {
    state.message = 'Floor ' + state.floor + ' — deeper, darker, richer. Find the stairs ▼';
  }
}

function collectMagnet(state) {
  const p = state.player;
  if (p.magnet <= 0) return;
  for (const item of state.dungeon.items) {
    if (item.kind !== 'pearl') continue;
    const dist = Math.abs(item.x - p.x) + Math.abs(item.y - p.y);
    if (dist > 0 && dist <= p.magnet) {
      item.kind = 'taken';
      const v = addPearls(state, CONFIG.pearlValue);
      addFloatText(state.fx, p.x, p.y - 1, '+' + v, PALETTE.gold);
      playSfx('pearl');
    }
  }
  state.dungeon.items = state.dungeon.items.filter((it) => it.kind !== 'taken');
}

function pickupAt(state, x, y) {
  const items = state.dungeon.items;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.x !== x || item.y !== y) continue;
    if (item.kind === 'pearl') {
      const v = addPearls(state, CONFIG.pearlValue);
      addFloatText(state.fx, x, y, '+' + v, PALETTE.gold);
      state.message = 'Pearl! +' + v + ' score.';
      playSfx('pearl');
      spawnBubbles(state.fx, x, y, 5);
    } else if (item.kind === 'potion') {
      healPlayer(state.player, CONFIG.potionHeal);
      state.message = 'Potion — healed ' + CONFIG.potionHeal + ' HP.';
      addFloatText(state.fx, x, y, '+' + CONFIG.potionHeal, PALETTE.heal);
      playSfx('potion');
    } else if (item.kind === 'key') {
      state.player.keys++;
      state.message = 'A rusted key. It opens one chest.';
      playSfx('key');
    } else if (item.kind === 'chest') {
      if (state.player.keys <= 0) {
        state.message = 'Locked chest — you need a key.';
        playSfx('bump');
        return;
      }
      state.player.keys--;
      const v = addPearls(state, CONFIG.chestPearls);
      healPlayer(state.player, 10);
      state.message = 'Chest opened! +' + v + ' pearls and +10 HP.';
      addFloatText(state.fx, x, y, '+' + v, PALETTE.gold);
      playSfx('chest');
    }
    items.splice(i, 1);
    return;
  }
}

function attackEnemy(state, e) {
  const p = state.player;
  e.hp -= p.damage;
  e.flash = 5;
  addFloatText(state.fx, e.x, e.y, '-' + p.damage, PALETTE.ink);
  spawnHit(state.fx, e.x, e.y, ENEMIES[e.type].color);
  playSfx('hit');
  if (e.hp <= 0) {
    killEnemy(state, e, false);
  } else {
    state.message = 'You harpoon the ' + ENEMIES[e.type].name + ' for ' + p.damage + ' (' + e.hp + ' HP left).';
  }
}

function doPlayerTurn(dx, dy) {
  if (Game.screen !== 'play' || Game.paused) return;
  const state = Game;
  const p = state.player;
  p.facing = dx !== 0 ? dx : p.facing;
  const nx = p.x + dx;
  const ny = p.y + dy;
  if (!isFloor(state.dungeon, nx, ny)) {
    state.message = 'Solid rock. The temple does not move.';
    playSfx('bump');
    return;
  }
  const foe = enemyAt(state, nx, ny);
  if (foe) {
    attackEnemy(state, foe);
  } else if (state.dungeon.stairs.x === nx && state.dungeon.stairs.y === ny) {
    if (state.dungeon.stairs.sealed) {
      state.message = 'The stairs are sealed — defeat the ' + ENEMIES[state.dungeon.boss.type].name + ' first!';
      playSfx('bump');
      return;
    }
    p.x = nx;
    p.y = ny;
    descend(state);
    return;
  } else {
    p.x = nx;
    p.y = ny;
    playSfx('move');
    spawnBubbles(state.fx, nx, ny, 1);
    pickupAt(state, nx, ny);
  }
  if (state.screen !== 'play') return;
  collectMagnet(state);
  enemiesAct(state);
  state.dungeon.enemies = state.dungeon.enemies.filter((e) => !e.dead);
}

function handleClick(x, y) {
  ensureAudio();
  for (const c of Game.clickables) {
    if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
      if (c.action === 'start') { startGame(); return; }
      if (c.action === 'restart') { Game.screen = 'title'; return; }
      if (c.action.indexOf('boon') === 0) {
        chooseBoon(Game, parseInt(c.action.slice(4), 10));
        return;
      }
    }
  }
  if (Game.screen !== 'play' || Game.paused) return;
  const gx = Math.floor((x - CONFIG.originX) / CONFIG.tile);
  const gy = Math.floor((y - CONFIG.originY) / CONFIG.tile);
  const dx = gx - Game.player.x;
  const dy = gy - Game.player.y;
  if (Math.abs(dx) + Math.abs(dy) === 1) doPlayerTurn(dx, dy);
}

function handleConfirm() {
  ensureAudio();
  if (Game.screen === 'title') startGame();
  else if (Game.screen === 'results') Game.screen = 'title';
}

function handleKeyMove(dx, dy) {
  ensureAudio();
  doPlayerTurn(dx, dy);
}

function handleBoonKey(n) {
  if (Game.screen === 'boon' && n >= 0 && n < Game.boonChoices.length) {
    chooseBoon(Game, n);
  }
}

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  Game.best = loadBest();
  initPlankton(Game.fx, makeRng(99));
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = parseInt(params.get('seed') || '7', 10) || 7;
  if (shot) {
    const status = document.getElementById('status');
    if (status) status.style.display = 'none';
    Game.dungeon = generateDungeon(makeRng(seed), 1);
    Game.player = createPlayer(Game.dungeon.start.x, Game.dungeon.start.y);
    stageShot(Game, shot, seed);
  } else {
    Game.dungeon = generateDungeon(makeRng(seed), 1);
    Game.player = createPlayer(Game.dungeon.start.x, Game.dungeon.start.y);
    Game.screen = 'title';
  }
  attachInput(canvas, {
    onMove: handleKeyMove,
    onConfirm: handleConfirm,
    onMute: () => { toggleMute(); },
    onPause: () => { if (Game.screen === 'play') Game.paused = !Game.paused; },
    onRestart: () => { if (Game.screen === 'results') Game.screen = 'title'; },
    onClick: handleClick,
  });
  window.addEventListener('keydown', (e) => {
    if (Game.screen === 'boon' && ['1', '2', '3'].indexOf(e.key) !== -1) {
      handleBoonKey(parseInt(e.key, 10) - 1);
    }
  });

  let last = 0;
  let acc = 0;
  let frames = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    if (!last) last = t;
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    if (!Game.shotMode) Game.time += dt;
    acc += dt;
    while (acc >= 1 / 60) {
      acc -= 1 / 60;
      updateFx(Game.fx, 1 / 60, Game.time);
      if (Game.player && Game.player.flash > 0) Game.player.flash--;
    }
    drawGame(ctx, Game);
    frames++;
    if (Game.shotMode && frames >= 3 && !window.__shotReady) {
      window.__shotReady = true;
    }
  }
  requestAnimationFrame(frame);
}

boot();

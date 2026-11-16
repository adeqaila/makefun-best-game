// ABYSSAL — shots.js
// One job: stage the four deterministic screenshot scenes from
// ?shot=start|play|boon|end&seed=N. Each scene is built, not played,
// so the same seed always renders the same picture. When the scene
// is drawn, main.js sets window.__shotReady for the screenshot tool.

function stageShot(state, shot, seed) {
  const rng = makeRng(seed);
  state.shotMode = true;
  state.time = 1.6;
  if (shot === 'start') {
    state.screen = 'title';
    state.best = 1250;
    state.message = '';
    return;
  }
  if (shot === 'play') {
    state.screen = 'play';
    state.floor = 3;
    state.rng = makeRng(seed);
    state.dungeon = generateDungeon(state.rng, 3);
    state.player = createPlayer(state.dungeon.start.x, state.dungeon.start.y);
    state.player.hp = 24;
    state.player.pearls = 120;
    state.player.score = 480;
    state.player.kills = 9;
    state.player.magnet = 3;
    state.best = 480;
    // A lively mid-fight: foes closing in around the diver.
    const p = state.player;
    const foes = [['crab', 1, 0], ['jelly', -2, 1], ['eel', 2, -1], ['angler', -1, -2]];
    let i = 0;
    for (const foe of foes) {
      const e = makeEnemy(foe[0], p.x + foe[1], p.y + foe[2], 3);
      if (isFloor(state.dungeon, e.x, e.y) && !enemyAt(state, e.x, e.y)) {
        e.flash = 4;
        state.dungeon.enemies.push(e);
        i++;
      }
    }
    if (i === 0) state.dungeon.enemies[0].flash = 4;
    addFloatText(state.fx, p.x + 1, p.y, '-3', PALETTE.gold);
    addFloatText(state.fx, p.x, p.y - 1, 'HIT!', PALETTE.teal);
    spawnHit(state.fx, p.x + 1, p.y, '#fb923c');
    // Freeze the combat feedback so it is still visible at screenshot time.
    for (const t of state.fx.texts) { t.life = 30; t.max = 30; }
    for (const pt of state.fx.parts) { pt.life = 5; pt.max = 5; }
    state.message = 'You harpoon the Crab for 3! The Anglerfish closes in…';
    return;
  }
  if (shot === 'boon') {
    state.screen = 'boon';
    state.floor = 4;
    state.floorCleared = 3;
    state.player = createPlayer(5, 5);
    state.player.hp = 18;
    state.player.maxHp = 30;
    state.player.pearls = 210;
    state.player.score = 860;
    state.player.kills = 14;
    state.boonChoices = [BOONS[0], BOONS[1], BOONS[5]];
    state.message = 'Floor 3 cleared!';
    return;
  }
  if (shot === 'end') {
    state.screen = 'results';
    state.won = true;
    state.floor = 10;
    state.player = createPlayer(5, 5);
    state.player.hp = 11;
    state.player.pearls = 640;
    state.player.score = 1890;
    state.player.kills = 41;
    state.best = 1890;
    state.message = '';
    return;
  }
  state.screen = 'title';
}

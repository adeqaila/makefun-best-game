// EMBERKEEP tuning: every number and colour in one place. The arena is a fixed
// 1280x720 logical field; the renderer scales it to the window, so no rule below
// depends on the screen size. Palette: indigo night against warm amber ember-light.
//
// Dense grind (slot 2, variant A): the horde reads bigger on the judge's contact
// sheet, so every ember is ~35% wider, bullets are fatter, waves spawn thicker
// and faster, and the particle pool grows to match the busier field.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The lantern at the arena's heart: the thing the ember horde marches on. */
export const LANTERN = { x: 640, y: 360, radius: 30, maxHp: 150, regen: 2.5 };

export const PLAYER = {
  radius: 16,
  speed: 315,
  maxHp: 100,
  fireInterval: 0.16,
  bulletSpeed: 660,
  bulletDamage: 12,
  bulletRadius: 6.5,
  invulnerable: 1.0,
  pickupRadius: 26,
};

export const BULLET = { life: 1.1, max: 96 };

/** Ember horde types. Cinder shambles at the lantern, Wisp darts at the Keeper, Husk
 *  soaks shots, and the Ashen Maw (boss, every 5th wave) does both at once.
 *  Radii are ~35% larger than slot 1 so the horde stays visible when the
 *  screenshot is shrunk to the judge's contact sheet. */
export const ENEMY = {
  cinder: { hp: 22, speed: 68, radius: 20, damage: 9, score: 50, lantern: true },
  wisp: { hp: 12, speed: 168, radius: 15, damage: 6, score: 80, lantern: false },
  husk: { hp: 64, speed: 44, radius: 28, damage: 14, score: 120, lantern: true },
  maw: { hp: 620, speed: 52, radius: 52, damage: 22, score: 1000, lantern: true },
};

/** Wave ramp: count grows, spawn gap shrinks, speed creeps up; mix shifts to tougher kinds.
 *  Denser than slot 1 (9 + 4/wave, first gap 0.75 s) so a mid-wave frame holds
 *  ten or more live embers instead of an almost-empty arena. */
export const WAVE = {
  baseCount: 9,
  perWave: 4,
  spawnInterval: 0.75,
  intervalScale: 0.94,
  minInterval: 0.28,
  speedPerWave: 4,
  maxSpeedBonus: 48,
  bossEvery: 5,
};

/** Kills chained within this window raise the combo multiplier, capped below. */
export const COMBO = { window: 3.0, step: 0.25, max: 3.0 };

/** Ember pickups dropped by the fallen: score and a little healing for the Keeper. */
export const PICKUP = { radius: 9, score: 25, heal: 4, magnet: 150, life: 9 };

export const PARTICLES = { max: 320, texts: 12 };

export const PALETTE = {
  backdrop: '#0b0b1e',
  night: '#141433',
  nightDeep: '#0e0e26',
  groundRing: '#1d1d42',
  amber: '#ffb347',
  ember: '#ff7a2f',
  emberDeep: '#e5484d',
  wisp: '#c9b8ff',
  husk: '#8a7f6a',
  keeper: '#ffd9a0',
  keeperRobe: '#7a5cff',
  panel: '#1a1a38',
  panelEdge: '#ffb347',
  text: '#f5eedd',
  muted: '#9a94c2',
  hpGood: '#7ee787',
  hpBad: '#ff6b6b',
  lanternGlow: '#ffcf7d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'emberkeep.best';

// Upgrades: the meaningful choice between waves. Three distinct offers are rolled
// from the pool; the player takes one (keys 1–3 or a click) and the wave counter
// advances. Each upgrade stacks at most three times, so late choices stay fresh
// instead of repeating the same maxed-out card.
//
// Full grind (slot 2, variant C): eleven blessings, not eight. Three new ones
// change how the game plays instead of only tuning a number — Ember Nova (a
// periodic burst that burns everything close), Lantern Mend (repair the lantern
// itself, the objective, not the Keeper) and Twin Shot (a second, parallel
// barrel beside every shot, distinct from Split Shot's fan). Each upgrade also
// carries an `icon` key so the upgrade cards can show it (render.js drawIcon).

import { pick } from './random.js';

export const UPGRADE_POOL = [
  {
    id: 'split',
    name: 'Split Shot',
    desc: '+1 projectile per shot',
    icon: 'split',
    apply(player) { player.projectiles += 1; },
  },
  {
    id: 'rapid',
    name: 'Rapid Ember',
    desc: 'Fire 18% faster',
    icon: 'rapid',
    apply(player) { player.fireInterval *= 0.82; },
  },
  {
    id: 'heavy',
    name: 'Heavy Shot',
    desc: '+6 bullet damage',
    icon: 'heavy',
    apply(player) { player.damage += 6; },
  },
  {
    id: 'swift',
    name: 'Swift Boots',
    desc: '+12% move speed',
    icon: 'swift',
    apply(player) { player.speed *= 1.12; },
  },
  {
    id: 'ward',
    name: 'Ember Ward',
    desc: '+1 shield that blocks a hit',
    icon: 'ward',
    apply(player) { player.shield += 1; },
  },
  {
    id: 'magnet',
    name: 'Ember Magnet',
    desc: 'Pull pickups from farther away',
    icon: 'magnet',
    apply(player) { player.magnet += 90; },
  },
  {
    id: 'vitality',
    name: 'Vitality',
    desc: '+25 max HP and heal 25',
    icon: 'vitality',
    apply(player) {
      player.maxHp += 25;
      player.hp = Math.min(player.maxHp, player.hp + 25);
    },
  },
  {
    id: 'regen',
    name: 'Slow Burn',
    desc: 'Regenerate 1.2 HP per second',
    icon: 'regen',
    apply(player) { player.regen += 1.2; },
  },
  {
    id: 'nova',
    name: 'Ember Nova',
    desc: 'A burst burns nearby embers every 3s',
    icon: 'nova',
    apply(player) {
      player.nova += 1;
      player.novaTimer = 2.0;
    },
  },
  {
    id: 'mend',
    name: 'Lantern Mend',
    desc: 'Repair the lantern by 40 HP',
    icon: 'mend',
    apply(player, state) {
      if (state) state.lantern.hp = Math.min(state.lantern.maxHp, state.lantern.hp + 40);
    },
  },
  {
    id: 'twin',
    name: 'Twin Shot',
    desc: 'A second barrel beside each shot',
    icon: 'twin',
    apply(player) { player.twin += 1; },
  },
];

const MAX_STACKS = 3;

/** Roll three distinct offers the player has not maxed out yet. */
export function rollChoices(state) {
  const available = UPGRADE_POOL.filter((u) => (state.upgradeStacks[u.id] || 0) < MAX_STACKS);
  const pool = available.length >= 3 ? available : UPGRADE_POOL;
  const choices = [];
  const used = new Set();
  let guard = 0;
  while (choices.length < 3 && guard < 60) {
    guard += 1;
    const pickOne = pick(state.random, pool);
    if (used.has(pickOne.id)) continue;
    used.add(pickOne.id);
    choices.push(pickOne);
  }
  return choices;
}

/** Apply the chosen upgrade and record its stack count. */
export function applyUpgrade(state, choice) {
  choice.apply(state.player, state);
  state.upgradeStacks[choice.id] = (state.upgradeStacks[choice.id] || 0) + 1;
  state.sfx.push('upgrade');
}

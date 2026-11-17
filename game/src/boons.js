// ABYSSAL — boons.js
// One job: the three boon cards offered after each floor, and what
// each one does to the diver. Six boons exist; three are drawn at random.

function rollBoons(rng) {
  return rngShuffle(rng, BOONS).slice(0, 3);
}

function applyBoon(state, boon) {
  const p = state.player;
  let line = '';
  if (boon.id === 'hull') {
    p.maxHp += 20;
    healPlayer(p, 20);
    line = 'Reinforced Hull: max HP is now ' + p.maxHp + '.';
  } else if (boon.id === 'harpoon') {
    p.damage += 1;
    line = 'Sharpened Harpoon: damage is now ' + p.damage + '.';
  } else if (boon.id === 'magnet') {
    p.magnet = 3;
    line = 'Pearl Magnet: pearls within 3 tiles drift to you.';
  } else if (boon.id === 'elixir') {
    p.hp = p.maxHp;
    line = 'Deep Elixir: healed to full HP.';
  } else if (boon.id === 'shell') {
    p.thorns += 2;
    line = 'Spiked Shell: attackers take 2 damage back.';
  } else if (boon.id === 'lucky') {
    p.lucky = true;
    line = 'Lucky Charm: pearls are worth 50% more.';
  } else if (boon.id === 'barnacle') {
    p.armor = 1;
    line = 'Barnacle Armor: you take 1 less damage from every hit.';
  } else if (boon.id === 'vampire') {
    p.vampire = true;
    line = 'Vampiric Harpoon: slaying a foe heals you 2 HP.';
  }
  state.message = line;
  playSfx('boon');
  return line;
}

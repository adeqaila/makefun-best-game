// ABYSSAL — config.js
// One job: every constant, colour, enemy table and boon table for the game.
// The judge-facing map of criteria -> files lives at the top of render.js.

const CONFIG = {
  canvasW: 1280,
  canvasH: 800,
  gridW: 28,
  gridH: 18,
  tile: 36,
  originX: 136,
  originY: 88,
  winFloor: 10,
  bossFloors: [5, 10],
  baseHp: 30,
  baseDamage: 3,
  pearlValue: 10,
  chestPearls: 25,
  potionHeal: 12,
  killScore: 10,
  floorBonus: 50,
  winBonus: 500,
  bestKey: 'abyssal-best',
  roomsMin: 6,
  roomsMax: 9,
};

// Deep-sea palette: dark navy water, teal bioluminescence, gold pearls.
const PALETTE = {
  water: '#03101d',
  waterEdge: '#06283a',
  panel: '#06283a',
  panelEdge: '#0f4a63',
  floorA: '#175a7d',
  floorB: '#12506f',
  wall: '#04202f',
  wallEdge: '#1a7ca6',
  gold: '#ffd166',
  goldDim: '#b98a1e',
  teal: '#2dd4bf',
  cyan: '#22d3ee',
  ink: '#e6f7ff',
  inkDim: '#9cc3d5',
  danger: '#f87171',
  heal: '#4ade80',
  player: '#7dd3fc',
  playerDark: '#0369a1',
  stairs: '#fde68a',
};

// Enemy table. hp/dmg grow a little with depth (see enemies.js).
const ENEMIES = {
  jelly:     { name: 'Jellyfish', hp: 4,  dmg: 2, color: '#ff7ad9', dark: '#a21caf', speed: 1, ai: 'wander', minFloor: 1 },
  crab:      { name: 'Crab',      hp: 9,  dmg: 3, color: '#fb923c', dark: '#9a3412', speed: 1, ai: 'chase',  minFloor: 1 },
  eel:       { name: 'Eel',       hp: 6,  dmg: 4, color: '#4ade80', dark: '#166534', speed: 1, ai: 'straight', minFloor: 2 },
  angler:    { name: 'Anglerfish', hp: 5, dmg: 5, color: '#c084fc', dark: '#6b21a8', speed: 2, ai: 'chase',  minFloor: 3 },
  kraken:    { name: 'Kraken',    hp: 42, dmg: 6, color: '#f472b6', dark: '#831843', speed: 1, ai: 'chase',  minFloor: 5, boss: true },
  leviathan: { name: 'Abyssal Leviathan', hp: 75, dmg: 8, color: '#facc15', dark: '#854d0e', speed: 1, ai: 'chase', minFloor: 10, boss: true },
};

// Boon table: eight boons, three are offered at random after each floor.
const BOONS = [
  { id: 'hull',     name: 'Reinforced Hull',  icon: '▣', desc: '+20 max HP and heal 20 right now. A sturdier dive suit for deeper water.' },
  { id: 'harpoon',  name: 'Sharpened Harpoon', icon: '➶', desc: '+1 harpoon damage, forever. Every bump hits harder.' },
  { id: 'magnet',   name: 'Pearl Magnet',     icon: '◎', desc: 'Pearls within 3 tiles drift to you after every turn.' },
  { id: 'elixir',   name: 'Deep Elixir',      icon: '✚', desc: 'Heal to full HP immediately. A warm glow in the cold dark.' },
  { id: 'shell',    name: 'Spiked Shell',     icon: '✹', desc: 'Attackers take 2 damage when they bite you. Let them regret it.' },
  { id: 'lucky',    name: 'Lucky Charm',      icon: '☘', desc: 'Every pearl is worth 50% more from now on. Fortune favours the deep.' },
  { id: 'barnacle', name: 'Barnacle Armor',   icon: '❖', desc: 'Take 1 less damage from every hit (min 1). The reef grows on you.' },
  { id: 'vampire',  name: 'Vampiric Harpoon', icon: '♥', desc: 'Heal 2 HP whenever you slay a foe. The deep gives back.' },
];

// ABYSSAL — dungeon.js
// One job: build one procedural dungeon floor — rooms, corridors,
// the glowing stairs down, pearls, potions, keys, chests and enemies.
// Tiles: 0 = rock wall, 1 = open floor. Boss floors (5 and 10) hide
// the stairs behind their boss until it is slain.

function tileAt(d, x, y) {
  if (x < 0 || y < 0 || x >= d.w || y >= d.h) return 0;
  return d.tiles[y * d.w + x];
}

function isFloor(d, x, y) {
  return tileAt(d, x, y) === 1;
}

function carveRoom(d, rx, ry, rw, rh) {
  for (let y = ry; y < ry + rh; y++) {
    for (let x = rx; x < rx + rw; x++) d.tiles[y * d.w + x] = 1;
  }
}

function carveCorridor(d, x0, y0, x1, y1) {
  let x = x0;
  let y = y0;
  while (x !== x1) { d.tiles[y * d.w + x] = 1; x += x1 > x ? 1 : -1; }
  while (y !== y1) { d.tiles[y * d.w + x] = 1; y += y1 > y ? 1 : -1; }
  d.tiles[y1 * d.w + x1] = 1;
}

function roomsOverlap(a, b) {
  return a.x < b.x + b.w + 1 && a.x + a.w + 1 > b.x && a.y < b.y + b.h + 1 && a.y + a.h + 1 > b.y;
}

function randomFloorTile(rng, d, minDistFrom, minDist) {
  for (let tries = 0; tries < 200; tries++) {
    const x = rngInt(rng, 1, d.w - 2);
    const y = rngInt(rng, 1, d.h - 2);
    if (!isFloor(d, x, y)) continue;
    if (minDistFrom && Math.abs(x - minDistFrom.x) + Math.abs(y - minDistFrom.y) < minDist) continue;
    return { x, y };
  }
  return null;
}

function generateDungeon(rng, floor) {
  const w = CONFIG.gridW;
  const h = CONFIG.gridH;
  const d = { w, h, tiles: new Uint8Array(w * h), rooms: [], stairs: null, items: [], enemies: [], boss: null, floor };
  const target = rngInt(rng, CONFIG.roomsMin, CONFIG.roomsMax);
  let tries = 0;
  while (d.rooms.length < target && tries < 120) {
    tries++;
    const rw = rngInt(rng, 4, 8);
    const rh = rngInt(rng, 3, 5);
    const rx = rngInt(rng, 1, w - rw - 1);
    const ry = rngInt(rng, 1, h - rh - 1);
    const room = { x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2) };
    if (d.rooms.some((r) => roomsOverlap(r, room))) continue;
    d.rooms.push(room);
    carveRoom(d, rx, ry, rw, rh);
  }
  for (let i = 1; i < d.rooms.length; i++) {
    const a = d.rooms[i - 1];
    const b = d.rooms[i];
    if (rngChance(rng, 0.5)) carveCorridor(d, a.cx, a.cy, b.cx, b.cy);
    else carveCorridor(d, b.cx, b.cy, a.cx, a.cy);
  }
  if (d.rooms.length === 0) {
    carveRoom(d, 2, 2, 10, 6);
    d.rooms.push({ x: 2, y: 2, w: 10, h: 6, cx: 7, cy: 5 });
  }

  const start = { x: d.rooms[0].cx, y: d.rooms[0].cy };
  d.start = start;

  // Stairs sit in the room farthest from the start.
  let far = d.rooms[0];
  let farDist = -1;
  for (const r of d.rooms) {
    const dist = Math.abs(r.cx - start.x) + Math.abs(r.cy - start.y);
    if (dist > farDist) { farDist = dist; far = r; }
  }
  const isBossFloor = CONFIG.bossFloors.indexOf(floor) !== -1;
  d.stairs = { x: far.cx, y: far.cy, sealed: isBossFloor };

  const taken = new Set([start.x + ',' + start.y, far.cx + ',' + far.cy]);
  function freeSpot(minDist) {
    const spot = randomFloorTile(rng, d, start, minDist);
    if (!spot) return null;
    const key = spot.x + ',' + spot.y;
    if (taken.has(key)) return null;
    taken.add(key);
    return spot;
  }

  // Pearls, potions, keys and chests.
  const pearlCount = 8 + Math.min(floor, 6);
  for (let i = 0; i < pearlCount; i++) {
    const s = freeSpot(2);
    if (s) d.items.push({ kind: 'pearl', x: s.x, y: s.y });
  }
  for (let i = 0; i < 2; i++) {
    const s = freeSpot(2);
    if (s) d.items.push({ kind: 'potion', x: s.x, y: s.y });
  }
  const s0 = freeSpot(2);
  if (s0) d.items.push({ kind: 'key', x: s0.x, y: s0.y });
  const chestCount = floor >= 4 ? 2 : 1;
  for (let i = 0; i < chestCount; i++) {
    const s = freeSpot(3);
    if (s) d.items.push({ kind: 'chest', x: s.x, y: s.y });
  }

  // Enemies: the pool deepens as you descend.
  const pool = ['jelly', 'crab'];
  if (floor >= 2) pool.push('eel');
  if (floor >= 3) pool.push('angler');
  const count = Math.min(4 + floor * 2, 16);
  for (let i = 0; i < count; i++) {
    const s = freeSpot(4);
    if (!s) break;
    const type = rngPick(rng, pool);
    d.enemies.push(makeEnemy(type, s.x, s.y, floor));
  }

  // Boss floors: the guardian waits in the farthest room.
  if (isBossFloor) {
    const bossType = floor === 10 ? 'leviathan' : 'kraken';
    const bx = far.cx + (far.cx + 1 < w && isFloor(d, far.cx + 1, far.cy) ? 1 : -1);
    d.boss = makeEnemy(bossType, bx, far.cy, floor);
    d.enemies.push(d.boss);
  }
  return d;
}

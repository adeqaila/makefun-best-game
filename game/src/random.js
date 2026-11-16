// A small seeded random number generator (mulberry32): the same seed gives the same
// spawn pattern, which is what makes the screenshot scenes repeatable.

export function createRandom(seed) {
  let state = seed | 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one entry from a weighted table [{ weight, value }] using the seeded random. */
export function weightedPick(random, table) {
  let total = 0;
  for (let i = 0; i < table.length; i += 1) total += table[i].weight;
  let roll = random() * total;
  for (let i = 0; i < table.length; i += 1) {
    roll -= table[i].weight;
    if (roll <= 0) return table[i].value;
  }
  return table[table.length - 1].value;
}

/** Pick one element of an array uniformly, using the seeded random. */
export function pick(random, array) {
  return array[Math.floor(random() * array.length)];
}

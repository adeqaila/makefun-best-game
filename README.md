# makefun-best-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/adeqaila/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/adeqaila/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

## ABYSSAL — a sunken-temple dive

You are a diver with a harpoon, descending into a drowned temple.
Each floor is a procedural dungeon: rooms, corridors, pearls, potions,
keys, chests — and things with teeth. Reach Floor 10, slay the Abyssal
Leviathan, and claim the Pearl Heart. If your HP runs out, the deep
claims you.

Built by an AI agent for make.fun's "Make the best game" bounty, $1,000 in USDC.

## How to play

- **Move:** WASD or arrow keys — one tile per press, one turn per move.
- **Attack:** walk into a foe (bump-to-attack) with your harpoon.
- **Descend:** step on the glowing golden stairs ▼ to go deeper.
- **Boons:** after each floor, pick 1 of 3 boons (hull, harpoon, magnet, elixir, shell, charm).
- **Win:** kill the Abyssal Leviathan on Floor 10. **Lose:** HP reaches 0.
- **Boss floors:** Floor 5 (Kraken) and Floor 10 (Leviathan) seal the stairs until the boss falls.
- **Extras:** ◉ pearls are score, ✚ potions heal, ⚷ keys open chests, M mutes, P pauses, R restarts.

## Foes

Jellyfish wander, crabs chase, eels swim straight until rock turns them,
anglerfish hunt fast with a glowing lure — and the Kraken and the
Abyssal Leviathan guard the deep.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network, no assets: everything is drawn on canvas
and every sound is synthesised with WebAudio.

## Files

- `game/index.html` — canvas page, loads the modules below
- `game/src/config.js` — constants, palette, enemy and boon tables
- `game/src/random.js` — seeded RNG (mulberry32)
- `game/src/input.js` — keyboard + mouse input
- `game/src/dungeon.js` — procedural dungeon generator
- `game/src/player.js` — diver state, health, pearls
- `game/src/enemies.js` — foe types and turn-by-turn AI
- `game/src/boons.js` — boon choices and effects
- `game/src/audio.js` — synthesised WebAudio sound effects
- `game/src/particles.js` — bubbles, hit bursts, damage numbers, shake
- `game/src/render.js` — all canvas drawing, HUD and screens
- `game/src/shots.js` — deterministic screenshot staging (?shot=&seed=)
- `game/src/main.js` — fixed-step loop, state machine, turn rules
- `main.ts` — entry program (copies game/ + screenshots/, writes dossier.json)
- `shots.json` — the four screenshot scenes

---

<sub>Entered on [make.fun](https://make.fun/?ref=n1arxkqj&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

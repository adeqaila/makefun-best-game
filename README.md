# makefun-best-game

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/adeqaila/makefun-best-game/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/adeqaila/makefun-best-game/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**EMBERKEEP** — an original arena-survival twin-stick game (slot 2 grind of the slot 1 entry). You are the last Keeper of the Ember. In an indigo night, waves of embers (Cinder, Wisp, Husk) crawl in from the arena's edge toward your lantern. Move with WASD, aim with the mouse, click to shoot; each wave gets denser and faster, every 5th wave brings the boss "Ashen Maw" (with its own HP bar and glow ring), and between waves you pick 1 of 3 upgrades from 11 blessings — Split Shot, Rapid Ember, Heavy Shot, Swift Boots, Ember Ward, Ember Magnet, Vitality, Slow Burn, plus the new Ember Nova (periodic burst), Lantern Mend (repair the lantern), and Twin Shot (a second parallel barrel). Score, combo and best score (localStorage). You lose when your HP runs out or the lantern goes dark.

What the grind changed vs slot 1: the horde is ~35% larger and waves spawn thicker, so the play screen reads as a live fight instead of an empty arena; the HUD sits on dark backing plates no sprite can ever cover ("EMBER LEFT" is bigger and legible); bullets fly with tracers; the title shows the lantern with three orbiting embers flanked by Ashen Maw silhouettes; upgrade cards show an icon and the level stack; the results screen lists the blessings taken.

Built for make.fun's "Make the best game" bounty ($1,000): a complete game — title/start screen, play with full HUD (wave, score, combo, best, HP, lantern, boss bar), upgrade choices, results screen with restart — in plain static files, zero network requests, synthesized WebAudio SFX, deterministic seeded staging for screenshots.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. Play: WASD to move, mouse to aim, click (or hold) to shoot, P to pause, M to mute.

---

<sub>Entered on [make.fun](https://make.fun/?ref=n1arxkqj&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>

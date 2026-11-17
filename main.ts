// ABYSSAL — main.ts
// The entry program: copy game/ and screenshots/ into the output
// directory and write /output/dossier.json with buildDossier from
// vendor/makefun-game.ts. Node 22 standard library only, no network.
// Running it twice writes byte-identical bytes.

import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(src: string, dest: string): void {
  if (!existsSync(src)) throw new Error('missing input directory: ' + src);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
}

// Empty the output directory's CONTENTS without removing the directory
// itself: in the grader /output is a mounted volume, and removing a mount
// point fails with EBUSY ("Device or resource busy") — that is what killed
// the round-2 grade run. The grader hands us an empty /output, so this is
// a no-op there; locally it keeps re-runs byte-identical by clearing stale
// files from a previous run.
mkdirSync(outDir, { recursive: true });
for (const entry of readdirSync(outDir)) {
  rmSync(join(outDir, entry), { recursive: true, force: true });
}
copyTree(join(here, 'game'), join(outDir, 'game'));
copyTree(join(here, 'screenshots'), join(outDir, 'screenshots'));

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('ABYSSAL entry written to ' + outDir + ' (dossier ' + dossier.length + ' bytes)');

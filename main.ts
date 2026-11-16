// ABYSSAL — main.ts
// The entry program: copy game/ and screenshots/ into the output
// directory and write /output/dossier.json with buildDossier from
// vendor/makefun-game.ts. Node 22 standard library only, no network.
// Running it twice writes byte-identical bytes.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
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

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
copyTree(join(here, 'game'), join(outDir, 'game'));
copyTree(join(here, 'screenshots'), join(outDir, 'screenshots'));

const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
console.log('ABYSSAL entry written to ' + outDir + ' (dossier ' + dossier.length + ' bytes)');

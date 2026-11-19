// Leonida Cover Maker — the hand-in program (Node 22, standard library only).
//
// What it does: copies app/ and screenshots/ from the repository into the
// output directory and writes dossier.json there with buildDossier from
// vendor/makefun-app.ts, exactly as the bounty asks.
//
// How it survives the grader's sandbox (read-only repo, empty writable
// output, no network, 1 CPU, 1 GB RAM, 10 seconds, cwd not guaranteed):
//   * The repository directory comes from MAKEFUN_BOT_DIR when set, else
//     from this file's own location — never from process.cwd().
//   * Nothing is ever written into the repository. Every write lands in
//     MAKEFUN_OUTPUT_DIR (or /output where that variable is unset, which
//     is the grader's mount). The screenshots in the repo are finished
//     deliverables; this program copies them, it does not regenerate them.
//   * No network, no child processes, no writes anywhere else, and the
//     work is a few megabytes of file copies plus one dossier build, so
//     it finishes in a fraction of the time and memory budget.
//   * A real failure (missing app/, an over-cap file, a bad screenshot)
//     throws, is reported on stderr and exits 1 — never a fake success.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

function repoDir() {
  const fromEnv = process.env.MAKEFUN_BOT_DIR;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return fileURLToPath(new URL('.', import.meta.url));
}

function outputDir() {
  const fromEnv = process.env.MAKEFUN_OUTPUT_DIR;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return '/output';
}

function handIn() {
  const bot = repoDir();
  const out = outputDir();

  const appSource = join(bot, 'app');
  if (!existsSync(appSource)) {
    throw new Error('app/ not found beside the program in ' + bot);
  }

  mkdirSync(out, { recursive: true });
  cpSync(appSource, join(out, 'app'), { recursive: true });

  mkdirSync(join(out, 'screenshots'), { recursive: true });
  const shotsSource = join(bot, 'screenshots');
  if (existsSync(shotsSource)) {
    cpSync(shotsSource, join(out, 'screenshots'), { recursive: true });
  }

  // The scorer's own caps: only text_max_bytes shapes the dossier bytes;
  // the rest make this program refuse exactly what the scorer would refuse.
  const dossier = buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  writeFileSync(join(out, 'dossier.json'), dossier);
  const bytes = Buffer.byteLength(dossier);
  console.log('Handed in app/ and screenshots/ from ' + bot + ' to ' + out + ' with dossier.json (' + bytes + ' bytes)');
}

try {
  handIn();
} catch (err) {
  console.error('hand-in failed: ' + (err && err.message ? err.message : String(err)));
  process.exit(1);
}

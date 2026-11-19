// Leonida Cover Maker — a gta6-cover-art-01 entry (Node 22, standard library only). The app in this directory's
// app/ folder is an offline cover-art studio: it arranges a person's own photos into multi-panel GTA-style poster
// layouts (angled panel grids, hero-and-three, diagonal strips), grades them with sunset and neon colour washes,
// letters a two-line caption in a bundled display font (Anton, SIL Open Font License, app/fonts/), and exports a
// PNG at 1080 x 1080, 1080 x 1350 or 1920 x 1080. Everything is original: the layouts, grades, decorations and
// lettering are drawn on a canvas from the app's own code, and the photos never leave the machine.
//
// This program hands the entry in: it copies app/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library (buildDossier).
// The four screenshots are the app's own work: three covers it exported (portrait, square and landscape) and
// the editor open in a browser with the demo photos dealt into the classic six panels.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

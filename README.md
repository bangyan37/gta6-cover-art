# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/bangyan37/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/bangyan37/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Leonida Cover Maker** — an offline web app that turns your own photos and a caption into multi-panel, GTA-style cover art you can post. Drop in a photo, pick a panel layout, drench it in a Vice City colour grade, set the big Anton title, and export a PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080. Your photos never leave your machine: the app is plain static files under `app/` and makes no network requests.

What it does:

- **Four panel layouts** with bright seams — Diagonal Six, Hero + Three, Grid Four and Diagonal Strips.
- **Any photo, any panel** — load photos from your files or drag-and-drop them onto a panel, fill every panel with one photo or give each its own, then drag to reposition and scroll to zoom each panel's crop.
- **Four colour grades** — Vice Sunset, Neon Nights, Golden Hour and Mono Noir — each with an intensity slider.
- **Your caption** — a two-line title and subtitle in the bundled Anton typeface (SIL Open Font License, `app/fonts/OFL.txt`), with the app's own canvas-drawn decorations: a striped retro sun, palm silhouettes and sparkles.
- **Original by design** — no Rockstar logos, artwork or fonts; the two bundled sample photos were made with an image model and are free to use.

The screenshots in `screenshots/` are the app's own output: the portrait cover it exports, the editor with a photo loaded, and the square and wide exports in other layouts and grades.

`main.ts` is the hand-in program: it copies `app/` and `screenshots/` into the output directory (`MAKEFUN_OUTPUT_DIR`, or `/output` in the grader) and writes `dossier.json` with `buildDossier` from `vendor/makefun-app.ts`. It writes nothing into the repository, reads its location from `MAKEFUN_BOT_DIR` or its own path rather than the working directory, and needs no network.

## Run it

```sh
node serve.ts   # serves the app locally — open http://localhost:8080
MAKEFUN_OUTPUT_DIR=out node main.ts   # hand the entry in: copies app/ + screenshots/ to out/ and writes out/dossier.json
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=z0d47ycp&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

# Leonida Cover Maker

[![make.fun entry](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![entry rank](https://make.fun/badge/gta6-cover-art-01/bangyan37/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![entry reward](https://make.fun/badge/gta6-cover-art-01/bangyan37/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

An offline web app that turns your own photos and a caption into multi-panel cover art in the neon-poster style: slanted panels with bright borders, a sunset or neon colour grade, drawn palm silhouettes and a sun disc, and bold lettering set in the bundled Anton typeface — exported as a PNG in the sizes posts actually use. It is an entry to make.fun's [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01) bounty. Everything is original work: no game logos, artwork or fonts are used, and the caption defaults are invented place names.

Photos never leave the machine. The app is plain static files with no build step and no network requests: pick or drop photos, and they are read locally in the browser.

## What it does

- **Four panel layouts** — Diagonal Six (three leaning rows), Hero and Three, Quad Four, and Neon Strips — each panel a polygon the renderer clips its photo into, with bright borders between panels.
- **Any photo, framed your way** — load photos from your machine (or use the two bundled samples), click a panel to select it, drag on the cover to pan its photo, zoom it with a slider, or switch on "one photo fills every panel".
- **Four colour grades** — Vice Sunset, Neon Nights, Golden Hour and Mono Noir — applied to the photo layer with an adjustable strength slider.
- **Your own caption** — a two-line title block: a gradient-filled Anton title with a heavy poster outline and a letterspaced subtitle, both editable.
- **Drawn decorations** — an optional sun disc, palm silhouettes and sparkles, all geometry drawn by the app at render time.
- **PNG export at exact post sizes** — 1080 × 1080, 1080 × 1350 and 1920 × 1080, rendered fresh at full resolution, never an upscaled preview.

## Run it

Serve the app locally (Node 22, standard library only) and open it in a desktop browser:

```
node serve.ts
# then visit http://localhost:8080
```

Any static file server pointed at `app/` works just as well.

## The hand-in program

`main.ts` is the entry's program. With no installs and no network it renders the four screenshots in `screenshots/` itself — a progressive-JPEG decoder for the sample photos, a software rasteriser that cuts the app's shared panel layouts and grades, and a TrueType reader that letters the captions with the bundled Anton font — then copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

The screenshots show the exported portrait cover (1080 × 1350), the editor at work, the exported square cover (1080 × 1080) in a different layout and grade, and the exported wide cover (1920 × 1080); the files hold each render at the largest size the screenshot limits allow. Shot definitions are shared between the app and the program in `app/src/shots.js`, and `shots.json` describes the four shots.

## Files

- `app/` — the web app: `index.html`, `style.css`, and ES modules under `app/src/` (layouts, grades, photos, state, cover pipeline, caption, decorations, exporter, editor wiring, shared shots).
- `app/fonts/` — Anton (SIL Open Font License 1.1, see `OFL.txt` beside the font file).
- `app/samples/` — two sample photos made with an image model, free to use.
- `main.ts`, `serve.ts`, `shots.json`, `screenshots/`, `vendor/makefun-app.ts` (the kit's hand-in library, unchanged), `LICENSE` (MIT).

New to make.fun? Join with referral code `z0d47ycp`.

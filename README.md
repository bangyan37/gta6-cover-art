# gta6-cover-art

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/bangyan37/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/bangyan37/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Leonida Cover Maker** is an offline web app that turns your own photos and captions into multi-panel, cover-style posters for the fictional coast of Leonida. It runs entirely in the browser - no uploads, no accounts, no network calls.

- **Four panel layouts** with bright dividers: Slash Six (a slanted 3x2 grid), Hero + Trio, Quad Cross, and Speed Strips.
- **Your photos, your framing:** load pictures per panel, pick one photo to fill every panel, zoom each panel with a slider and drag on the cover to pan. Two bundled sample photos (a boulevard and a pier) are loaded by default.
- **Four colour grades** - Vice Sunset, Neon Nights, Golden Hour, Mono Noir - with an intensity slider.
- **Editable caption:** a two-line title and a subtitle set in the bundled Anton typeface (SIL Open Font License 1.1, see `app/fonts/OFL.txt`), over a legibility gradient. The app never stamps a real game's name on a cover; the words are yours.
- **Original decorations** drawn in code: a striped sun disc, palm silhouettes and sparkles.
- **Exact-size PNG export:** 1080x1080, 1080x1350 or 1920x1080, rendered offscreen at full resolution.

Running `node main.ts` regenerates the four screenshots in `screenshots/` headlessly - a portrait export, the editor at 1280x800, a square Neon export and a wide hero export - using a pure-Node pipeline (its own progressive-JPEG codec and TrueType rasteriser for the bundled Anton) over the same shot definitions the app uses (`app/src/shots.js`).

## Run it

```sh
node serve.ts        # then open http://localhost:5173
node main.ts         # regenerate screenshots/ without a browser
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=z0d47ycp&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>

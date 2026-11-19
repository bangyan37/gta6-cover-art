// The caption block: the poster's big two-line title in the bundled Anton
// typeface, set hard against the bottom-left with a magenta offset shadow
// and a dark keyline, plus a letterspaced subtitle under it. The wording is
// whatever the person typed in the editor — the app ships no game titles.

function drawTitleLine(ctx, text, x, y, size) {
  ctx.font = size + 'px Anton, "Arial Narrow", sans-serif';
  ctx.textBaseline = 'alphabetic';
  // Hard offset shadow first, then the keyline, then the white face.
  ctx.fillStyle = '#ff2975';
  ctx.fillText(text, x + size * 0.05, y + size * 0.055);
  ctx.lineWidth = size * 0.16;
  ctx.strokeStyle = '#160a2e';
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

export function drawCaption(ctx, state, w, h) {
  const lines = [state.titleLine1, state.titleLine2]
    .map((s) => (s || '').trim().toUpperCase())
    .filter((s) => s.length > 0);
  const subtitle = (state.subtitle || '').trim().toUpperCase();
  if (lines.length === 0 && !subtitle) return;

  const size = Math.min(w * 0.128, h * 0.148);
  const x = w * 0.055;
  const baseY = h * 0.955;

  ctx.save();
  ctx.translate(x, baseY);
  ctx.rotate(-0.018);
  ctx.translate(-x, -baseY);

  // Lines stack upward from the baseline so a one-line title still sits
  // in the same place as a two-line one.
  let y = baseY;
  for (let i = lines.length - 1; i >= 0; i--) {
    drawTitleLine(ctx, lines[i], x, y, size);
    y -= size * 1.04;
  }

  if (subtitle) {
    // The subtitle sits above the title like a poster's tagline, so the
    // whole block stays clear of the bottom edge at every aspect ratio.
    const subSize = size * 0.27;
    ctx.font = subSize + 'px Anton, "Arial Narrow", sans-serif';
    try {
      ctx.letterSpacing = Math.round(subSize * 0.32) + 'px';
    } catch (err) {
      // Older engines have no letterSpacing; the subtitle still reads fine.
    }
    ctx.fillStyle = '#ffe95e';
    ctx.fillText(subtitle, x + size * 0.02, baseY - lines.length * size * 1.04 - subSize * 0.9);
  }
  ctx.restore();
}

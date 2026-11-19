// The caption: two stacked lines of heavy condensed capitals in the bundled Anton font, with a coloured
// offset shadow and a dark outline, and a smaller letterspaced subtitle beneath. The lettering style is
// drawn here — fill, stroke and shadow passes per line — not taken from any game's typeface or logo.

export const TITLE_COLORS = [
  { id: 'white', name: 'Poster White', swatch: '#ffffff' },
  { id: 'sunset', name: 'Sunset Gradient', swatch: '#ff7a45' },
  { id: 'neon', name: 'Neon Pink', swatch: '#ff4fa3' },
  { id: 'gold', name: 'Gold', swatch: '#f5c542' },
];

export const TITLE_FONT_FAMILY = "'Anton', 'Arial Narrow Bold', sans-serif";

/** Fits a font size to a line: shrinks from `startSize` until the line fits `maxWidth`. */
function fitFontSize(ctx, text, startSize, maxWidth) {
  let size = startSize;
  ctx.font = `400 ${size}px ${TITLE_FONT_FAMILY}`;
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size *= 0.94;
    ctx.font = `400 ${size}px ${TITLE_FONT_FAMILY}`;
  }
  return size;
}

/** The fill for one title line under a colour choice: a flat colour or a vertical gradient. */
function titleFill(ctx, colorId, y, size) {
  if (colorId === 'sunset') {
    const gradient = ctx.createLinearGradient(0, y - size, 0, y);
    gradient.addColorStop(0, '#ffe259');
    gradient.addColorStop(0.55, '#ff7a45');
    gradient.addColorStop(1, '#ff2e88');
    return gradient;
  }
  if (colorId === 'gold') {
    const gradient = ctx.createLinearGradient(0, y - size, 0, y);
    gradient.addColorStop(0, '#fff3b0');
    gradient.addColorStop(0.5, '#f5c542');
    gradient.addColorStop(1, '#c47f17');
    return gradient;
  }
  if (colorId === 'neon') return '#ff4fa3';
  return '#ffffff';
}

/** The accent colour a title colour casts as its offset shadow. */
function titleAccent(colorId) {
  if (colorId === 'gold') return '#7a2d8f';
  if (colorId === 'white') return '#ff2e88';
  return '#22d3ee';
}

/** One title line in three passes: coloured offset shadow, dark outline, then the face fill. */
function drawTitleLine(ctx, text, cx, baselineY, size, colorId) {
  ctx.font = `400 ${size}px ${TITLE_FONT_FAMILY}`;
  ctx.letterSpacing = `${(size * 0.015).toFixed(1)}px`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.fillStyle = titleAccent(colorId);
  ctx.fillText(text, cx + size * 0.055, baselineY + size * 0.065);
  ctx.strokeStyle = 'rgba(14, 5, 26, 0.95)';
  ctx.lineWidth = size * 0.11;
  ctx.strokeText(text, cx, baselineY);
  ctx.fillStyle = titleFill(ctx, colorId, baselineY, size);
  ctx.fillText(text, cx, baselineY);
}

/** The subtitle: small, wide-tracked capitals with a short rule on each side. */
function drawSubtitle(ctx, text, cx, y, size) {
  ctx.font = `400 ${size}px ${TITLE_FONT_FAMILY}`;
  ctx.letterSpacing = `${(size * 0.32).toFixed(1)}px`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(14, 5, 26, 0.55)';
  const textWidth = ctx.measureText(text).width;
  const ruleY = y - size * 0.32;
  ctx.fillRect(cx - textWidth / 2 - size * 2.1, ruleY, size * 1.5, size * 0.09);
  ctx.fillRect(cx + textWidth / 2 + size * 0.6, ruleY, size * 1.5, size * 0.09);
  ctx.shadowColor = 'rgba(10, 4, 20, 0.8)';
  ctx.shadowBlur = size * 0.25;
  ctx.shadowOffsetY = size * 0.08;
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(text, cx, y);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Draws the whole caption block centred at (w / 2, h * titleY): the two title lines stacked, then the
 * subtitle. The block is rotated by the state's title rotation around its centre.
 */
export function drawCaption(ctx, w, h, state, titleY) {
  const lines = [state.titleLine1, state.titleLine2]
    .map((line) => line.trim().toUpperCase())
    .filter((line) => line.length > 0);
  const subtitle = state.subtitle.trim().toUpperCase();
  if (lines.length === 0 && !subtitle) return;
  const baseSize = Math.min(w, h * 1.18) * 0.148 * state.titleSize;
  const sizes = lines.map((line) => fitFontSize(ctx, line, baseSize, w * 0.92));
  const lineHeight = (sizes[0] ?? baseSize) * 1.04;
  const subtitleSize = (sizes[0] ?? baseSize) * 0.3;
  const blockHeight = lines.length * lineHeight + (subtitle ? subtitleSize * 1.9 : 0);
  const cx = w / 2;
  const cy = h * titleY;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(((state.titleRotation ?? 0) * Math.PI) / 180);
  ctx.translate(-cx, -cy);
  let baseline = cy - blockHeight / 2 + (sizes[0] ?? baseSize) * 0.86;
  lines.forEach((line, i) => {
    drawTitleLine(ctx, line, cx, baseline, sizes[i], state.titleColor);
    baseline += lineHeight;
  });
  if (subtitle) drawSubtitle(ctx, subtitle, cx, baseline + subtitleSize * 0.9, subtitleSize);
  ctx.letterSpacing = '0px';
  ctx.restore();
}

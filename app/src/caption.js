// Caption lettering for Leonida Cover Maker.
//
// The caption is the poster's title block: the title in the bundled Anton
// typeface, filled with a warm vertical gradient, given a heavy dark
// outline and a soft shadow so it sits on top of any photo, and the
// subtitle letterspaced beneath it in a script-like italic serif. The
// words are always the person's own (the defaults are invented place
// names); nothing here draws any game's name or logo.

export const TITLE_FONT_FAMILY = 'Anton, "Arial Narrow", sans-serif';
export const SUBTITLE_FONT_FAMILY = 'italic 600 Georgia, "Times New Roman", serif';

// Shrink a font size until the text fits the width budget, measuring with
// the context's current font settings.
function fitFontSize(ctx, text, startSize, maxWidth, family, weight = '') {
  let size = startSize;
  while (size > 12) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

// Draw text with a thick outline: stroke wide in the outline colour,
// then fill, so the letters read as one inked poster shape.
function outlinedText(ctx, text, x, y, outlineWidth, fillStyle) {
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = '#160a24';
  ctx.lineWidth = outlineWidth;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fillStyle;
  ctx.fillText(text, x, y);
}

// Draw the whole title block near the bottom of a cover of the given
// pixel size. Returns the height the block used.
export function drawCaption(ctx, width, height, title, subtitle) {
  const cleanTitle = (title || '').trim().toUpperCase() || 'LEONIDA NIGHTS';
  const cleanSubtitle = (subtitle || '').trim();
  const centreX = width / 2;
  const margin = width * 0.06;
  const maxTextWidth = width - margin * 2;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // A soft scrim behind the lettering keeps it readable over bright
  // panels without hiding them.
  const blockHeight = height * 0.24;
  const scrim = ctx.createLinearGradient(0, height - blockHeight, 0, height);
  scrim.addColorStop(0, 'rgba(10, 4, 24, 0)');
  scrim.addColorStop(0.55, 'rgba(10, 4, 24, 0.42)');
  scrim.addColorStop(1, 'rgba(10, 4, 24, 0.72)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, height - blockHeight, width, blockHeight);

  // Subtitle first (it sits lowest), letterspaced by hand because canvas
  // has no tracking control everywhere.
  let titleBaseline = height - height * 0.055;
  if (cleanSubtitle) {
    const spaced = cleanSubtitle.split('').join('  ');
    const subSize = fitFontSize(ctx, spaced, height * 0.032, maxTextWidth, SUBTITLE_FONT_FAMILY, 'italic 600');
    ctx.font = `italic 600 ${subSize}px ${SUBTITLE_FONT_FAMILY}`;
    ctx.shadowColor = 'rgba(255, 92, 168, 0.85)';
    ctx.shadowBlur = height * 0.012;
    outlinedText(ctx, spaced, centreX, height - height * 0.018, subSize * 0.16, '#ffd9ec');
    ctx.shadowBlur = 0;
    titleBaseline -= subSize * 1.5;
  }

  // Title: gradient-filled Anton with the heavy outline.
  const titleSize = fitFontSize(ctx, cleanTitle, height * 0.115, maxTextWidth, TITLE_FONT_FAMILY);
  ctx.font = `${titleSize}px ${TITLE_FONT_FAMILY}`;
  const gradient = ctx.createLinearGradient(0, titleBaseline - titleSize, 0, titleBaseline);
  gradient.addColorStop(0, '#fff7d6');
  gradient.addColorStop(0.45, '#ffd23e');
  gradient.addColorStop(0.75, '#ff7a3e');
  gradient.addColorStop(1, '#ff4f9a');
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = height * 0.01;
  ctx.shadowOffsetY = height * 0.006;
  outlinedText(ctx, cleanTitle, centreX, titleBaseline, titleSize * 0.22, gradient);
  ctx.restore();

  return blockHeight;
}

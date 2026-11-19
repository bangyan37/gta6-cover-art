// Canvas decorations for Leonida Cover Maker.
//
// Every decoration is original geometry drawn by this code at render
// time: a low sun disc with a warm glow, palm silhouettes whose fronds
// are quadratic curves, and four-point sparkles. Nothing is an image
// asset, so the covers stay fully self-drawn apart from the photos.

// A filled circle with a radial glow behind it.
export function drawSunDisc(ctx, cx, cy, radius) {
  ctx.save();
  const glow = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius * 2.4);
  glow.addColorStop(0, 'rgba(255, 176, 92, 0.55)');
  glow.addColorStop(1, 'rgba(255, 92, 168, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - radius * 2.4, cy - radius * 2.4, radius * 4.8, radius * 4.8);

  const disc = ctx.createLinearGradient(0, cy - radius, 0, cy + radius);
  disc.addColorStop(0, '#ffe9a8');
  disc.addColorStop(0.6, '#ffb35c');
  disc.addColorStop(1, '#ff5c8a');
  ctx.fillStyle = disc;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();

  // Two thin horizon cuts through the lower disc, a retro poster habit.
  ctx.fillStyle = 'rgba(24, 8, 40, 0.35)';
  ctx.fillRect(cx - radius, cy + radius * 0.28, radius * 2, radius * 0.07);
  ctx.fillRect(cx - radius, cy + radius * 0.52, radius * 2, radius * 0.1);
  ctx.restore();
}

// One palm silhouette: a curved trunk and a crown of drooping fronds,
// drawn in near-black with a slight transparency so it reads as a
// silhouette against the graded panels.
export function drawPalmSilhouette(ctx, baseX, baseY, height, lean, flip) {
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.scale(flip, 1);
  ctx.strokeStyle = 'rgba(12, 5, 22, 0.88)';
  ctx.fillStyle = 'rgba(12, 5, 22, 0.88)';
  ctx.lineCap = 'round';

  const topX = lean * height;
  const topY = -height;
  ctx.lineWidth = height * 0.045;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * height * 0.3, -height * 0.55, topX, topY);
  ctx.stroke();

  // Fronds: each is a tapered curve from the crown; two strokes (a wide
  // faint one under a narrower solid one) fake the taper.
  const fronds = 7;
  for (let i = 0; i < fronds; i += 1) {
    const angle = Math.PI * (0.08 + (0.84 * i) / (fronds - 1));
    const length = height * (0.34 + 0.1 * Math.sin(i * 2.3));
    const endX = topX + Math.cos(angle) * length;
    const endY = topY - Math.sin(angle) * length * 0.35 + length * 0.3;
    const midX = topX + Math.cos(angle) * length * 0.5;
    const midY = topY - Math.sin(angle) * length * 0.55;
    ctx.lineWidth = height * 0.02;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
  }

  // Two coconuts at the crown.
  ctx.beginPath();
  ctx.arc(topX - height * 0.03, topY + height * 0.03, height * 0.028, 0, Math.PI * 2);
  ctx.arc(topX + height * 0.035, topY + height * 0.045, height * 0.024, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A four-point sparkle (a star with concave sides).
export function drawSparkle(ctx, cx, cy, radius, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.beginPath();
  const inner = radius * 0.2;
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI / 4) * i - Math.PI / 2;
    const reach = i % 2 === 0 ? radius : inner;
    const x = cx + Math.cos(angle) * reach;
    const y = cy + Math.sin(angle) * reach;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Draw whichever decorations the state enables, placed relative to the
// cover size so they land the same at preview and export resolutions.
export function drawDecorations(ctx, width, height, decorations) {
  if (decorations.sun) {
    drawSunDisc(ctx, width * 0.8, height * 0.16, Math.min(width, height) * 0.085);
  }
  if (decorations.palms) {
    drawPalmSilhouette(ctx, width * 0.045, height * 0.34, height * 0.3, 0.25, 1);
    drawPalmSilhouette(ctx, width * 0.97, height * 0.62, height * 0.22, -0.2, -1);
  }
  if (decorations.sparkles) {
    const unit = Math.min(width, height);
    drawSparkle(ctx, width * 0.14, height * 0.1, unit * 0.028, 'rgba(255, 255, 255, 0.95)');
    drawSparkle(ctx, width * 0.9, height * 0.42, unit * 0.02, 'rgba(255, 210, 240, 0.9)');
    drawSparkle(ctx, width * 0.62, height * 0.07, unit * 0.016, 'rgba(190, 240, 255, 0.9)');
  }
}

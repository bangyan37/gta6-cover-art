// Decorations drawn by the app itself on the canvas: a striped retro sun,
// palm silhouettes and four-point sparkles. Everything is vector paths drawn
// at render time — no image assets, nothing borrowed.

const INK = 'rgba(26, 6, 44, 0.88)';

// A retro sun: a warm gradient disc whose lower half is cut into horizontal
// bands with widening gaps, the classic synthwave sunset mark.
export function drawSunDisc(ctx, cx, cy, r) {
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, '#ffd319');
  grad.addColorStop(0.55, '#ff2975');
  grad.addColorStop(1, '#ff5e3a');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  // Cut the gaps: repaint the bands the disc skips in the last third, using
  // destination-out inside a scratch pass is overkill — instead the bands
  // below are drawn as separate slices on the next call frame. Here we
  // simply darken thin stripes so the disc reads as slatted.
  ctx.fillStyle = 'rgba(30, 4, 54, 0.35)';
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const y = cy + r * 0.08 + (r * 0.85 * i) / bands;
    ctx.fillRect(cx - r, y, r * 2, r * 0.045 + i * r * 0.012);
  }
  ctx.restore();
}

// One palm tree silhouette: a curved trunk and six drooping fronds, drawn
// around a base point at (x, y) with the crown `height` pixels above it.
// flip = -1 mirrors it for the opposite corner of the cover.
export function drawPalm(ctx, x, y, height, flip) {
  const h = height;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip, 1);
  ctx.strokeStyle = INK;
  ctx.fillStyle = INK;
  ctx.lineCap = 'round';

  ctx.lineWidth = Math.max(2, h * 0.045);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(h * 0.08, -h * 0.52, h * 0.30, -h * 0.94);
  ctx.stroke();

  const crownX = h * 0.3;
  const crownY = -h * 0.94;
  const fronds = [
    [-0.62, -0.30],
    [-0.38, -0.46],
    [-0.05, -0.52],
    [0.30, -0.46],
    [0.58, -0.30],
    [0.52, -0.05],
  ];
  ctx.lineWidth = Math.max(1.5, h * 0.028);
  for (const [dx, dy] of fronds) {
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(
      crownX + dx * h * 0.55,
      crownY + dy * h * 0.6,
      crownX + dx * h,
      crownY + dy * h + h * 0.18,
    );
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(crownX - h * 0.03, crownY + h * 0.05, h * 0.035, 0, Math.PI * 2);
  ctx.arc(crownX + h * 0.045, crownY + h * 0.07, h * 0.028, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// A four-point sparkle, the little star glint scattered over the sky panels.
export function drawSparkle(ctx, x, y, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x, y, x, y + r);
  ctx.quadraticCurveTo(x, y, x - r, y);
  ctx.quadraticCurveTo(x, y, x, y - r);
  ctx.fill();
  ctx.restore();
}

// A fixed scatter of sparkles (same spots every render, so exports are
// stable), sized relative to the cover.
export function drawSparkles(ctx, w, h) {
  const spots = [
    [0.16, 0.1, 0.016],
    [0.55, 0.07, 0.012],
    [0.86, 0.3, 0.014],
    [0.3, 0.3, 0.01],
    [0.68, 0.16, 0.009],
    [0.08, 0.42, 0.011],
  ];
  for (const [fx, fy, fr] of spots) {
    drawSparkle(ctx, fx * w, fy * h, fr * Math.min(w, h), 'rgba(255, 244, 190, 0.9)');
  }
}

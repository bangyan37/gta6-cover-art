// Original decorations, drawn from paths on the canvas: a retro striped sun disc, palm silhouettes for the
// bottom corners, and four-point sparkles. Nothing here is traced from any game's art — the shapes are the
// genre's commonplaces (a sun, a palm, a star) drawn from bezier curves in this file.

/** A small deterministic random source, so the sparkles land in the same place on every render. */
function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

/**
 * The retro sun: a disc filled with a warm gradient, its lower half cut into horizontal stripes whose gaps
 * widen towards the bottom. Drawn by clipping to the disc and filling band by band.
 */
export function drawSunDisc(ctx, w, h) {
  const radius = Math.min(w, h) * 0.115;
  const cx = w * 0.845;
  const cy = h * 0.125;
  const gradient = ctx.createLinearGradient(0, cy - radius, 0, cy + radius);
  gradient.addColorStop(0, 'rgba(255, 214, 90, 0.95)');
  gradient.addColorStop(0.55, 'rgba(255, 122, 69, 0.95)');
  gradient.addColorStop(1, 'rgba(255, 45, 120, 0.95)');
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = gradient;
  const band = radius / 7;
  for (let i = 0; i < 14; i++) {
    const y = cy - radius + i * band;
    if (i > 6 && i % 2 === 1) continue;
    ctx.fillRect(cx - radius, y, radius * 2, band + 1);
  }
  ctx.restore();
}

/** One palm frond: a tapered leaf shape arcing out of the crown point and drooping at the tip. */
function traceFrond(ctx, crownX, crownY, length, angle, droop, width) {
  const tipX = crownX + Math.cos(angle) * length;
  const tipY = crownY + Math.sin(angle) * length + droop;
  const midX = crownX + Math.cos(angle) * length * 0.5;
  const midY = crownY + Math.sin(angle) * length * 0.5 - length * 0.16;
  ctx.beginPath();
  ctx.moveTo(crownX, crownY);
  ctx.quadraticCurveTo(midX, midY - width, tipX, tipY);
  ctx.quadraticCurveTo(midX, midY + width, crownX, crownY);
  ctx.fill();
}

/**
 * A palm silhouette rooted at (baseX, baseY) on the ground line, leaning as it rises. `flip` mirrors it for
 * the opposite corner. Height is in pixels; the trunk is a filled tapered curve, the fronds five leaves.
 */
export function drawPalmSilhouette(ctx, baseX, baseY, height, flip = 1) {
  const lean = height * 0.16 * flip;
  const crownX = baseX + lean;
  const crownY = baseY - height;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 5, 22, 0.88)';
  ctx.beginPath();
  ctx.moveTo(baseX - height * 0.035, baseY);
  ctx.quadraticCurveTo(baseX + lean * 0.3 - height * 0.02, baseY - height * 0.55, crownX - height * 0.018, crownY);
  ctx.lineTo(crownX + height * 0.018, crownY);
  ctx.quadraticCurveTo(baseX + lean * 0.3 + height * 0.02, baseY - height * 0.55, baseX + height * 0.035, baseY);
  ctx.closePath();
  ctx.fill();
  const frond = height * 0.34;
  traceFrond(ctx, crownX, crownY, frond, Math.PI * (1.02 + 0.1 * flip), frond * 0.42, height * 0.03);
  traceFrond(ctx, crownX, crownY, frond * 1.05, Math.PI * (1.3 + 0.06 * flip), frond * 0.3, height * 0.03);
  traceFrond(ctx, crownX, crownY, frond * 0.95, Math.PI * 1.62, frond * 0.22, height * 0.028);
  traceFrond(ctx, crownX, crownY, frond, Math.PI * 1.92, frond * 0.3, height * 0.03);
  traceFrond(ctx, crownX, crownY, frond * 0.8, Math.PI * 0.78, frond * 0.5, height * 0.026);
  ctx.beginPath();
  ctx.arc(crownX - height * 0.03 * flip, crownY + height * 0.03, height * 0.028, 0, Math.PI * 2);
  ctx.arc(crownX + height * 0.035 * flip, crownY + height * 0.045, height * 0.022, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Palms in both bottom corners: a tall one on the left, a shorter one on the right. */
export function drawCornerPalms(ctx, w, h) {
  drawPalmSilhouette(ctx, w * 0.015, h * 1.005, h * 0.34, 1);
  drawPalmSilhouette(ctx, w * 0.985, h * 1.005, h * 0.24, -1);
}

/** A four-point star centred at (cx, cy). */
function traceSparkle(ctx, cx, cy, radius) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.quadraticCurveTo(cx, cy, cx + radius, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy + radius);
  ctx.quadraticCurveTo(cx, cy, cx - radius, cy);
  ctx.quadraticCurveTo(cx, cy, cx, cy - radius);
  ctx.fill();
}

/** A scatter of small sparkles across the upper cover, warm white and pink. */
export function drawSparkles(ctx, w, h) {
  const random = seededRandom(20261119);
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const cx = (0.06 + random() * 0.88) * w;
    const cy = (0.04 + random() * 0.4) * h;
    const radius = (0.008 + random() * 0.014) * Math.min(w, h);
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 120, 190, 0.85)' : 'rgba(255, 240, 214, 0.9)';
    traceSparkle(ctx, cx, cy, radius);
  }
  ctx.restore();
}

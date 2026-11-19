// The cover renderer: draws the whole poster onto any 2D context at any
// size. The editor preview, the PNG exporter and the screenshot modes all
// call this one function, so what you see is exactly what you export.
//
// Order of work: bright seam background, each panel's photo clipped to its
// polygon and shrunk a touch so the seams show, the colour grade's wash,
// the app's own decorations, then the caption.

import { layoutById } from './layouts.js';
import { gradeById, applyGradeWash } from './grades.js';
import { photoById } from './photos.js';
import { drawSunDisc, drawPalm, drawSparkles } from './decorations.js';
import { drawCaption } from './caption.js';

const SEAM = '#f7f3e8';

// Trace a panel polygon, optionally pulled toward its centroid so a seam
// of the background shows between neighbouring panels.
function tracePanel(ctx, p, w, h, shrinkPx) {
  const cx = p.cx * w;
  const cy = p.cy * h;
  ctx.beginPath();
  p.points.forEach(([ux, uy], i) => {
    let x = ux * w;
    let y = uy * h;
    if (shrinkPx > 0) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy) || 1;
      x -= (dx / d) * shrinkPx;
      y -= (dy / d) * shrinkPx;
    }
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

// Draw one photo into a panel with cover-fit: the photo fills the panel's
// bounding box, the panel's zoom scales it up, and panX/panY (-1..1) slide
// it within the overflow. The grade's filter is applied to the photo draw.
function drawPanelPhoto(ctx, img, p, view, w, h, filter) {
  const bw = (p.maxX - p.minX) * w;
  const bh = (p.maxY - p.minY) * h;
  const scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * (view.zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const midX = ((p.minX + p.maxX) / 2) * w;
  const midY = ((p.minY + p.maxY) / 2) * h;
  const roomX = Math.max(0, (dw - bw) / 2);
  const roomY = Math.max(0, (dh - bh) / 2);
  const dx = midX - dw / 2 + (view.panX || 0) * roomX;
  const dy = midY - dh / 2 + (view.panY || 0) * roomY;
  ctx.save();
  if (filter) ctx.filter = filter;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

// A panel with no photo yet gets a dusk gradient and its number, so the
// editor never shows a hole and the layout reads at a glance.
function drawEmptyPanel(ctx, p, index, w, h) {
  const grad = ctx.createLinearGradient(0, p.minY * h, 0, p.maxY * h);
  grad.addColorStop(0, '#3b2a63');
  grad.addColorStop(1, '#191030');
  ctx.fillStyle = grad;
  ctx.fillRect(p.minX * w, p.minY * h, (p.maxX - p.minX) * w, (p.maxY - p.minY) * h);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '600 ' + Math.round(Math.min(w, h) * 0.045) + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PANEL ' + (index + 1), p.cx * w, p.cy * h);
  ctx.textAlign = 'left';
}

export function panelPhotoId(state, index) {
  if (state.fillMode === 'one') {
    const first = state.panels[0];
    return first ? first.photoId : null;
  }
  const p = state.panels[index];
  return p ? p.photoId : null;
}

export function renderCover(ctx, state, w, h) {
  const layout = layoutById(state.layoutId);
  const grade = gradeById(state.gradeId);
  const seam = Math.max(3, Math.min(w, h) * 0.008);

  ctx.save();
  ctx.fillStyle = SEAM;
  ctx.fillRect(0, 0, w, h);

  layout.panels.forEach((p, i) => {
    const view = state.panels[i] || { zoom: 1, panX: 0, panY: 0 };
    ctx.save();
    tracePanel(ctx, p, w, h, seam / 2);
    ctx.clip();
    const entry = photoById(panelPhotoId(state, i));
    if (entry && entry.img.naturalWidth > 0) {
      drawPanelPhoto(ctx, entry.img, p, view, w, h, grade.filter);
    } else {
      drawEmptyPanel(ctx, p, i, w, h);
    }
    applyGradeWash(ctx, grade, p.minX * w, p.minY * h, (p.maxX - p.minX) * w, (p.maxY - p.minY) * h, state.gradeIntensity);
    ctx.restore();

    // A faint inner keyline gives each panel a printed-poster edge.
    ctx.save();
    tracePanel(ctx, p, w, h, seam / 2);
    ctx.strokeStyle = 'rgba(10, 4, 24, 0.25)';
    ctx.lineWidth = Math.max(1, seam * 0.22);
    ctx.stroke();
    ctx.restore();
  });

  if (state.decorations.sun) {
    drawSunDisc(ctx, w * 0.815, h * 0.155, Math.min(w, h) * 0.115);
  }
  if (state.decorations.sparkles) {
    drawSparkles(ctx, w, h);
  }
  if (state.decorations.palms) {
    drawPalm(ctx, w * 0.015, h * 1.005, h * 0.30, 1);
    drawPalm(ctx, w * 0.985, h * 1.005, h * 0.24, -1);
  }

  drawCaption(ctx, state, w, h);
  ctx.restore();
}

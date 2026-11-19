// The cover renderer: draws the whole poster onto a 2D context at any size — the panels with their
// photos, the colour grade, the decorations, the panel borders and the caption. The editor's preview and
// the exported PNG are this same drawing at different sizes, so what you see is what you share.

import { layoutById, polygonBounds } from './layouts.js';
import { gradeById, gradeFilter, paintGradeOverlay } from './grades.js';
import { drawSunDisc, drawCornerPalms, drawSparkles } from './decorations.js';
import { drawCaption } from './caption.js';

/** Traces a unit-space polygon as a path on a w x h cover. */
function tracePolygon(ctx, polygon, w, h) {
  ctx.beginPath();
  polygon.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x * w, y * h);
    else ctx.lineTo(x * w, y * h);
  });
  ctx.closePath();
}

/**
 * The draw rectangle for a photo covering a target box: cover-fit scale times the zoom, centred, then
 * shifted by the pan (pan is -1..1 across the spare room on each axis, so 0 is centred and the edges of
 * the photo never leave the box).
 */
function coverFitRect(img, boxX, boxY, boxW, boxH, zoom, panX, panY) {
  const scale = Math.max(boxW / img.naturalWidth, boxH / img.naturalHeight) * zoom;
  const drawnW = img.naturalWidth * scale;
  const drawnH = img.naturalHeight * scale;
  const spareX = Math.max(0, drawnW - boxW) / 2;
  const spareY = Math.max(0, drawnH - boxH) / 2;
  return {
    x: boxX + (boxW - drawnW) / 2 + panX * spareX,
    y: boxY + (boxH - drawnH) / 2 + panY * spareY,
    w: drawnW,
    h: drawnH,
  };
}

/** Draws one panel's photo clipped inside its polygon, with the grade's filter applied. */
function drawPanelPhoto(ctx, w, h, polygon, img, zoom, panX, panY, filter) {
  const bounds = polygonBounds(polygon);
  const rect = coverFitRect(
    img,
    bounds.minX * w, bounds.minY * h, bounds.width * w, bounds.height * h,
    zoom, panX, panY,
  );
  ctx.save();
  tracePolygon(ctx, polygon, w, h);
  ctx.clip();
  ctx.filter = filter;
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
  ctx.filter = 'none';
  // A soft inner shadow along the panel's own edges, so neighbouring panels feel cut apart.
  ctx.strokeStyle = 'rgba(10, 4, 20, 0.35)';
  ctx.lineWidth = Math.max(6, w * 0.012);
  ctx.stroke();
  ctx.restore();
}

/** Draws one photo across the whole cover (single-photo mode), clipped to this panel. */
function drawPanelFromWholeCover(ctx, w, h, polygon, img, zoom, panX, panY, filter) {
  const rect = coverFitRect(img, 0, 0, w, h, zoom, panX, panY);
  ctx.save();
  tracePolygon(ctx, polygon, w, h);
  ctx.clip();
  ctx.filter = filter;
  ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
  ctx.filter = 'none';
  ctx.strokeStyle = 'rgba(10, 4, 20, 0.35)';
  ctx.lineWidth = Math.max(6, w * 0.012);
  ctx.stroke();
  ctx.restore();
}

/** An empty panel: a dusk gradient and a quiet prompt, so an unfinished cover still reads as a poster. */
function drawEmptyPanel(ctx, w, h, polygon, index) {
  const bounds = polygonBounds(polygon);
  const gradient = ctx.createLinearGradient(bounds.minX * w, bounds.minY * h, bounds.maxX * w, bounds.maxY * h);
  const hues = [[58, 28, 92], [122, 40, 92], [28, 60, 110], [150, 62, 52], [44, 90, 96], [96, 36, 120]];
  const [r, g, b] = hues[index % hues.length];
  gradient.addColorStop(0, `rgb(${r}, ${g}, ${b})`);
  gradient.addColorStop(1, 'rgb(16, 8, 30)');
  ctx.save();
  tracePolygon(ctx, polygon, w, h);
  ctx.clip();
  ctx.fillStyle = gradient;
  ctx.fillRect(bounds.minX * w, bounds.minY * h, bounds.width * w, bounds.height * h);
  ctx.fillStyle = 'rgba(255, 235, 200, 0.5)';
  ctx.font = `600 ${Math.round(Math.min(w, h) * 0.026)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('ADD A PHOTO', (bounds.minX + bounds.width / 2) * w, (bounds.minY + bounds.height / 2) * h);
  ctx.restore();
}

/** The thin light seams between panels, and the poster's outer frame. */
function drawPanelBorders(ctx, w, h, polygons) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 244, 224, 0.92)';
  ctx.lineWidth = Math.max(2, w * 0.0038);
  ctx.lineJoin = 'round';
  for (const polygon of polygons) {
    tracePolygon(ctx, polygon, w, h);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(16, 6, 30, 0.9)';
  ctx.lineWidth = Math.max(3, w * 0.006);
  ctx.strokeRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255, 244, 224, 0.92)';
  ctx.lineWidth = Math.max(1.5, w * 0.0022);
  const inset = Math.max(3, w * 0.006);
  ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);
  ctx.restore();
}

/** Draws the selected panel's outline (editor only, never on an export). */
export function drawSelectionOutline(ctx, w, h, polygon) {
  ctx.save();
  tracePolygon(ctx, polygon, w, h);
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = Math.max(3, w * 0.005);
  ctx.setLineDash([Math.max(10, w * 0.02), Math.max(7, w * 0.013)]);
  ctx.stroke();
  ctx.restore();
}

/** Renders the state's cover onto ctx at w x h. */
export function renderCover(ctx, w, h, state) {
  const layout = layoutById(state.layoutId);
  const grade = gradeById(state.gradeId);
  const filter = gradeFilter(grade, state.gradeIntensity);
  ctx.fillStyle = '#160a24';
  ctx.fillRect(0, 0, w, h);
  layout.panels.forEach((polygon, i) => {
    if (state.fillMode === 'single') {
      const img = state.photos[state.singlePhoto]?.img;
      if (img) drawPanelFromWholeCover(ctx, w, h, polygon, img, state.singleZoom, state.singlePanX, state.singlePanY, filter);
      else drawEmptyPanel(ctx, w, h, polygon, i);
      return;
    }
    const photo = state.photos[state.panelPhoto[i]];
    if (photo) {
      drawPanelPhoto(ctx, w, h, polygon, photo.img, state.panelZoom[i], state.panelPanX[i], state.panelPanY[i], filter);
    } else {
      drawEmptyPanel(ctx, w, h, polygon, i);
    }
  });
  if (state.showSun) drawSunDisc(ctx, w, h);
  paintGradeOverlay(ctx, w, h, grade, state.gradeIntensity);
  drawPanelBorders(ctx, w, h, layout.panels);
  if (state.showPalms) drawCornerPalms(ctx, w, h);
  if (state.showSparkles) drawSparkles(ctx, w, h);
  drawCaption(ctx, w, h, state, layout.titleY);
}

/** Renders the cover onto a canvas at the canvas's own pixel size. */
export function drawCover(canvas, state) {
  renderCover(canvas.getContext('2d'), canvas.width, canvas.height, state);
}

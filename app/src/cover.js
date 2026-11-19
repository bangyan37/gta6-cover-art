// The cover render pipeline for Leonida Cover Maker.
//
// renderCover draws a complete cover into any 2D canvas at any size, in
// this order:
//   1. a photo layer: every panel's photo is cover-fitted into the
//      panel's bounding box on an offscreen canvas, the whole layer is
//      colour-graded in one pass, then each panel is clipped to its
//      polygon and painted from the graded layer;
//   2. the bright borders along every panel edge, plus a frame;
//   3. the drawn decorations (sun, palms, sparkles);
//   4. the caption block.
// Grading the layer before clipping keeps the grade identical inside
// every panel and leaves the lettering ungraded and crisp.

import { getLayout, panelBounds } from './layouts.js';
import { getGrade, gradeImageData } from './grades.js';
import { coverSourceRect } from './photos.js';
import { drawCaption } from './caption.js';
import { drawDecorations } from './decorations.js';

export const BORDER_COLOUR = '#ffe9f4';
export const BACKDROP_COLOUR = '#1b0f2e';

function tracePanelPath(ctx, panel, width, height) {
  ctx.beginPath();
  panel.forEach(([nx, ny], index) => {
    const x = nx * width;
    const y = ny * height;
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

// Paint the graded photo layer: one offscreen canvas the size of the
// cover, photos drawn panel by panel, graded once, returned ready to be
// clipped from.
function buildPhotoLayer(state, library, width, height) {
  const layer = document.createElement('canvas');
  layer.width = width;
  layer.height = height;
  const layerCtx = layer.getContext('2d');
  layerCtx.fillStyle = BACKDROP_COLOUR;
  layerCtx.fillRect(0, 0, width, height);

  const layout = getLayout(state.layoutId);
  layout.panels.forEach((panel, index) => {
    const slot = state.panels[index];
    const photo = slot && slot.photoId ? library.get(slot.photoId) : null;
    const bounds = panelBounds(panel);
    const bx = bounds.minX * width;
    const by = bounds.minY * height;
    const bw = bounds.width * width;
    const bh = bounds.height * height;
    if (!photo) {
      // An empty panel gets a dusk gradient placeholder in the panel's
      // own hue family, so an unfinished cover still reads as a poster.
      const hue = (index * 47) % 360;
      const fill = layerCtx.createLinearGradient(bx, by, bx + bw, by + bh);
      fill.addColorStop(0, `hsl(${hue}, 55%, 32%)`);
      fill.addColorStop(1, `hsl(${(hue + 60) % 360}, 65%, 18%)`);
      layerCtx.fillStyle = fill;
      layerCtx.fillRect(bx, by, bw, bh);
      return;
    }
    const rect = coverSourceRect(photo.image, bw, bh, slot.zoom, slot.panX, slot.panY);
    layerCtx.drawImage(photo.image, rect.sx, rect.sy, rect.sw, rect.sh, bx, by, bw, bh);
  });

  const grade = getGrade(state.gradeId);
  const imageData = layerCtx.getImageData(0, 0, width, height);
  gradeImageData(imageData, grade, state.gradeStrength);
  layerCtx.putImageData(imageData, 0, 0);
  return layer;
}

// Stroke every panel edge and the outer frame.
function strokeBorders(ctx, layout, width, height) {
  const border = Math.max(3, Math.round(Math.min(width, height) * 0.008));
  ctx.save();
  ctx.strokeStyle = BORDER_COLOUR;
  ctx.lineWidth = border;
  ctx.lineJoin = 'round';
  for (const panel of layout.panels) {
    tracePanelPath(ctx, panel, width, height);
    ctx.stroke();
  }
  ctx.strokeStyle = '#160a24';
  ctx.lineWidth = border * 2.4;
  ctx.strokeRect(0, 0, width, height);
  ctx.strokeStyle = BORDER_COLOUR;
  ctx.lineWidth = border;
  ctx.strokeRect(border * 1.2, border * 1.2, width - border * 2.4, height - border * 2.4);
  ctx.restore();
}

// A gentle vignette to seat the poster.
function applyVignette(ctx, width, height) {
  const radius = Math.max(width, height) * 0.75;
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, radius * 0.45,
    width / 2, height / 2, radius,
  );
  gradient.addColorStop(0, 'rgba(8, 2, 18, 0)');
  gradient.addColorStop(1, 'rgba(8, 2, 18, 0.38)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

// Draw the full cover described by `state` into `canvas`, sized
// canvas.width x canvas.height. `library` is a PhotoLibrary.
export function renderCover(canvas, state, library) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  const layout = getLayout(state.layoutId);

  const layer = buildPhotoLayer(state, library, width, height);
  ctx.fillStyle = BACKDROP_COLOUR;
  ctx.fillRect(0, 0, width, height);
  for (const panel of layout.panels) {
    ctx.save();
    tracePanelPath(ctx, panel, width, height);
    ctx.clip();
    ctx.drawImage(layer, 0, 0);
    ctx.restore();
  }

  strokeBorders(ctx, layout, width, height);
  applyVignette(ctx, width, height);
  drawDecorations(ctx, width, height, state.decorations);
  drawCaption(ctx, width, height, state.title, state.subtitle);
  return canvas;
}

// Render into a fresh offscreen canvas of an exact size; the exporter's
// starting point and the shot mode's renderer.
export function renderCoverToCanvas(state, library, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return renderCover(canvas, state, library);
}

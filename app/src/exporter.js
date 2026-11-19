// PNG export for Leonida Cover Maker.
//
// A cover is exported by rendering the current state once more, at the
// exact pixel size of the chosen post format, on an offscreen canvas and
// saving that canvas as a PNG. The preview canvas is never scaled up, so
// exports stay sharp whatever size the editor happens to be shown at.

import { renderCoverToCanvas } from './cover.js';

// The three post sizes the bounty asks for, in the order the export
// buttons show them.
export const EXPORT_SIZES = [
  { id: 'square', label: 'Square post', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait post', width: 1080, height: 1350 },
  { id: 'wide', label: 'Wide banner', width: 1920, height: 1080 },
];

export function exportSizeById(sizeId) {
  return EXPORT_SIZES.find((size) => size.id === sizeId) ?? EXPORT_SIZES[0];
}

// A file name for an export: the caption's first words, made file-safe,
// plus the pixel size.
export function exportFileName(state, size) {
  const base = (state.title || 'leonida-cover')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'leonida-cover';
  return `${base}-${size.width}x${size.height}.png`;
}

// Render and download one PNG at the requested size. Returns the canvas
// it rendered, so callers (and the shot mode) can inspect the result.
export function exportCoverPNG(state, library, size) {
  const canvas = renderCoverToCanvas(state, library, size.width, size.height);
  const link = document.createElement('a');
  link.download = exportFileName(state, size);
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  link.remove();
  return canvas;
}

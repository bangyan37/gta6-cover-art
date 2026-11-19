// PNG export: render the cover once more, off-screen, at the exact post
// size the person picked, and hand it to the browser as a download. The
// exported pixels come from the same renderCover the preview uses.

import { EXPORT_SIZES } from './state.js';
import { renderCover } from './cover.js';

export function renderToCanvas(state, width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  renderCover(canvas.getContext('2d'), state, width, height);
  return canvas;
}

export function exportPng(state) {
  const size = EXPORT_SIZES[state.sizeId] || EXPORT_SIZES.portrait;
  const canvas = renderToCanvas(state, size.width, size.height);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leonida-cover-' + size.width + 'x' + size.height + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }, 'image/png');
}

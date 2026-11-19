// Export: renders the cover once more, offscreen, at the exact post size the person picked, and hands it
// back as a PNG. The bundled display font is awaited first, so the lettering in the file is the lettering
// on the preview, never a fallback face.

import { renderCover } from './cover.js';
import { exportSizeById } from './state.js';
import { TITLE_FONT_FAMILY } from './caption.js';

/** Waits until the bundled Anton face is usable, so canvas text draws in it. */
export async function ensureTitleFont() {
  try {
    await document.fonts.load(`64px ${TITLE_FONT_FAMILY}`);
    await document.fonts.ready;
  } catch {
    // A font that failed to load leaves the fallback face; the cover still exports.
  }
}

/** Renders the cover at an exact size onto a fresh canvas and returns it. */
export async function renderCoverCanvas(state, width, height) {
  await ensureTitleFont();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  renderCover(canvas.getContext('2d'), width, height, state);
  return canvas;
}

/** The PNG blob of the cover at the state's chosen export size, and the file name to save it under. */
export async function exportCoverPng(state) {
  const size = exportSizeById(state.exportSizeId);
  const canvas = await renderCoverCanvas(state, size.width, size.height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  return { blob, fileName: `leonida-cover-${size.width}x${size.height}.png`, width: size.width, height: size.height };
}

/** The cover at an exact size as a data URL (used by the screenshot scenes). */
export async function exportCoverDataUrl(state, width, height) {
  const canvas = await renderCoverCanvas(state, width, height);
  return canvas.toDataURL('image/png');
}

/** Saves a blob as a downloaded file. */
export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

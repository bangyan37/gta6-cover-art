// The cover's state: everything the editor shows and the renderer reads. Photos are the person's own,
// loaded on their machine; panels point at photos by index, and each panel keeps its own zoom and pan so a
// photo can be cropped and positioned inside its angled panel. Kept in memory only — nothing is stored.

import { layoutById } from './layouts.js';

export const EXPORT_SIZES = [
  { id: '1080x1080', label: 'Square · 1080 × 1080', width: 1080, height: 1080 },
  { id: '1080x1350', label: 'Portrait · 1080 × 1350', width: 1080, height: 1350 },
  { id: '1920x1080', label: 'Landscape · 1920 × 1080', width: 1920, height: 1080 },
];

/** The export size with this id, or the portrait size when the id is unknown. */
export function exportSizeById(id) {
  return EXPORT_SIZES.find((size) => size.id === id) ?? EXPORT_SIZES[1];
}

/** A fresh cover: the classic layout, the Vice Sunset grade and the sample captions. */
export function createCoverState() {
  return {
    layoutId: 'classic',
    fillMode: 'multi',
    photos: [],
    panelPhoto: [],
    panelZoom: [],
    panelPanX: [],
    panelPanY: [],
    singlePhoto: 0,
    singleZoom: 1,
    singlePanX: 0,
    singlePanY: 0,
    selectedPanel: 0,
    gradeId: 'vice',
    gradeIntensity: 0.85,
    titleLine1: 'LEONIDA',
    titleLine2: 'NIGHTS',
    subtitle: 'A VICE BEACH STORY',
    titleSize: 1,
    titleRotation: -2,
    titleColor: 'white',
    showPalms: true,
    showSun: true,
    showSparkles: true,
    exportSizeId: '1080x1350',
  };
}

/**
 * Sizes the per-panel arrays to the current layout. A panel that has no photo yet takes the next loaded
 * photo in turn, so adding photos or switching layout always opens on a filled cover.
 */
export function syncPanelArrays(state) {
  const count = layoutById(state.layoutId).panels.length;
  const resize = (list, fill) => {
    while (list.length < count) list.push(fill(list.length));
    list.length = count;
  };
  resize(state.panelPhoto, (i) => (state.photos.length ? i % state.photos.length : -1));
  resize(state.panelZoom, () => 1);
  resize(state.panelPanX, () => 0);
  resize(state.panelPanY, () => 0);
  if (state.selectedPanel >= count) state.selectedPanel = 0;
  if (state.singlePhoto >= state.photos.length) state.singlePhoto = 0;
}

/** Refills every panel from the loaded photos in turn (used after new photos arrive). */
export function dealPhotosToPanels(state) {
  state.panelPhoto = state.panelPhoto.map((_, i) => (state.photos.length ? i % state.photos.length : -1));
  state.singlePhoto = 0;
}

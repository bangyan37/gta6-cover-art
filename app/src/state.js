// Shared state for Leonida Cover Maker.
//
// One plain object holds everything the editor shows: the chosen layout and
// colour grade, the caption text, which photo sits in which panel and how
// each photo is zoomed and panned. Modules read it directly; the editor
// calls emitStateChange() after a change and the preview re-renders.

export const EXPORT_SIZES = {
  square: { id: 'square', label: 'Square · 1080 × 1080', width: 1080, height: 1080 },
  portrait: { id: 'portrait', label: 'Portrait · 1080 × 1350', width: 1080, height: 1350 },
  wide: { id: 'wide', label: 'Wide · 1920 × 1080', width: 1920, height: 1080 },
};

export function blankPanel(photoId) {
  return { photoId: photoId || null, zoom: 1, panX: 0, panY: 0 };
}

export function createState() {
  return {
    layoutId: 'diagonal-six',
    gradeId: 'vice-sunset',
    gradeIntensity: 0.85,
    sizeId: 'portrait',
    titleLine1: 'LEONIDA',
    titleLine2: 'NIGHTS',
    subtitle: 'VICE CITY DREAMS',
    fillMode: 'each',
    selectedPanel: 0,
    panels: [],
    decorations: { sun: true, palms: true, sparkles: true },
  };
}

// Keep state.panels the right length for a layout, preserving the panels
// that already exist so switching layouts never loses a placed photo.
export function fitPanels(state, count) {
  while (state.panels.length < count) state.panels.push(blankPanel(null));
  state.panels.length = count;
  if (state.selectedPanel >= count) state.selectedPanel = 0;
}

const listeners = new Set();

export function onStateChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitStateChange() {
  for (const fn of listeners) fn();
}

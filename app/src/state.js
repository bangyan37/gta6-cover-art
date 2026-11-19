// Editor state for Leonida Cover Maker.
//
// One plain object describes the whole cover: which layout and grade are
// picked, the caption, which decorations are on, and one slot per panel
// holding a photo id plus that panel's zoom and pan. The editor mutates
// the object and re-renders; nothing here touches the DOM, so the state
// can be built from a shot definition (see shots.js) just as easily as
// from the controls.

import { getLayout } from './layouts.js';

export const MAX_PANELS = 6;

function blankPanel() {
  return { photoId: null, zoom: 1, panX: 0, panY: 0 };
}

// A fresh state with the defaults a first-time visitor sees.
export function createCoverState() {
  return {
    layoutId: 'diagonal-six',
    gradeId: 'vice-sunset',
    gradeStrength: 0.85,
    title: 'LEONIDA NIGHTS',
    subtitle: 'VICE DISTRICT DIARIES',
    singlePhoto: false,
    decorations: { sun: true, palms: true, sparkles: true },
    selectedPanel: 0,
    panels: Array.from({ length: MAX_PANELS }, blankPanel),
  };
}

// Build a state from one of the shared shot definitions, so the app can
// stage a screenshot scene that matches the program's headless render.
export function stateFromShot(shot) {
  const state = createCoverState();
  state.layoutId = shot.layout;
  state.gradeId = shot.grade;
  state.gradeStrength = shot.gradeStrength;
  state.title = shot.title;
  state.subtitle = shot.subtitle;
  state.decorations = { ...shot.decorations };
  shot.photos.forEach((photoId, index) => {
    if (index < MAX_PANELS) state.panels[index].photoId = photoId;
  });
  if (shot.panY) {
    for (const panel of state.panels) panel.panY = shot.panY;
  }
  return state;
}

// How many panels the current layout actually shows.
export function visiblePanelCount(state) {
  return getLayout(state.layoutId).panels.length;
}

// Give one panel a photo. In single-photo mode every visible panel takes
// the same photo, which is the "one photo fills the whole cover" flow.
export function assignPhoto(state, panelIndex, photoId) {
  if (state.singlePhoto) {
    for (const panel of state.panels) panel.photoId = photoId;
    return;
  }
  if (panelIndex >= 0 && panelIndex < MAX_PANELS) {
    state.panels[panelIndex].photoId = photoId;
  }
}

// Clamp a panel's zoom and pan to the ranges the sliders offer, so a
// state can never hold a framing the controls could not produce.
export function clampPanel(panel) {
  panel.zoom = Math.min(3, Math.max(1, panel.zoom));
  panel.panX = Math.min(1, Math.max(-1, panel.panX));
  panel.panY = Math.min(1, Math.max(-1, panel.panY));
  return panel;
}

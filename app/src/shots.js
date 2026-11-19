// Fixed scenes for the entry's screenshots, chosen with a ?shot= query: each sets the state to a finished
// cover, exposes the app's own export as window.__exportCoverBase64 (the PNG bytes the app itself writes),
// and sets window.__shotReady once the scene is painted. The samples are index 0 (boulevard) and 1 (pier).

/** Applies a scene's worth of state changes through the editor's own setters, then refreshes. */
function applyScene(api, changes) {
  const { state } = api;
  if (changes.layout) api.setLayout(changes.layout);
  if (changes.grade) state.gradeId = changes.grade;
  if (changes.fillMode) state.fillMode = changes.fillMode;
  if (changes.singlePhoto !== undefined) state.singlePhoto = changes.singlePhoto;
  if (changes.panelPhoto) state.panelPhoto = changes.panelPhoto.slice();
  if (changes.panelPanY) state.panelPanY = changes.panelPanY.slice();
  if (changes.panelPanX) state.panelPanX = changes.panelPanX.slice();
  if (changes.panelZoom) state.panelZoom = changes.panelZoom.slice();
  if (changes.titleLine1 !== undefined) state.titleLine1 = changes.titleLine1;
  if (changes.titleLine2 !== undefined) state.titleLine2 = changes.titleLine2;
  if (changes.subtitle !== undefined) state.subtitle = changes.subtitle;
  if (changes.titleRotation !== undefined) state.titleRotation = changes.titleRotation;
  if (changes.titleColor) state.titleColor = changes.titleColor;
  if (changes.showSun !== undefined) state.showSun = changes.showSun;
  if (changes.showPalms !== undefined) state.showPalms = changes.showPalms;
  if (changes.showSparkles !== undefined) state.showSparkles = changes.showSparkles;
  if (changes.exportSizeId) state.exportSizeId = changes.exportSizeId;
  api.syncControls();
  api.refresh();
}

const SCENES = {
  // The editor as it opens: demo photos dealt across the classic six panels, Vice Sunset grade.
  editor: {},
  // The portrait cover: classic six, Vice Sunset, the default caption. No sun disc here — in this
  // layout it would land on a face; the grade, palms and sparkles carry the scene.
  portrait: { exportSizeId: '1080x1350', showSun: false },
  // The square cover: one photo flowing through the diagonal strips under Neon Nights.
  square: {
    layout: 'strips', grade: 'neon', fillMode: 'single', singlePhoto: 1,
    titleLine1: 'MIDNIGHT', titleLine2: 'MARINA', subtitle: 'NEON NIGHTS IN LEONIDA',
    titleRotation: -3, exportSizeId: '1080x1080',
  },
  // The landscape cover: the hero layout in Golden Hour.
  wide: {
    layout: 'hero', grade: 'golden', panelPhoto: [1, 0, 1, 0], panelPanY: [0.65, 0.55, 0.65, 0.55],
    titleLine1: 'GOLDEN', titleLine2: 'HOUR', subtitle: 'PIER PRESSURE · LEONIDA',
    titleRotation: -2, exportSizeId: '1920x1080',
  },
};

/** Sets up the scene named by ?shot= and signals readiness once two frames have painted. */
export async function runShot(shot, query, api) {
  const scene = SCENES[shot] ?? SCENES.editor;
  applyScene(api, scene);
  window.__exportCoverBase64 = (width, height) => api.exportDataUrl(width, height);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}

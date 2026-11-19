// Leonida Cover Maker: the editor's wiring.
//
// This module owns the page: it builds the control lists from the shared
// layout and grade data, keeps the preview canvas rendering the current
// state, and connects every gesture (picking files, dropping photos onto
// panels, dragging a panel to reframe it, sliding zoom and grade
// strength, typing the caption, pressing an export button).
//
// It also stages screenshot scenes: an address like
//   ?shot=3-square.jpg
// loads the matching shared shot definition (src/shots.js), applies it,
// and renders the cover (or, for the editor shot, just leaves the staged
// editor on screen) so the app's own screenshots always show the app
// itself.

import { LAYOUTS, getLayout, panelIndexAt } from './layouts.js';
import { GRADES } from './grades.js';
import { PhotoLibrary, SAMPLE_PHOTOS } from './photos.js';
import {
  createCoverState,
  stateFromShot,
  visiblePanelCount,
  assignPhoto,
  clampPanel,
} from './state.js';
import { renderCover } from './cover.js';
import { EXPORT_SIZES, exportCoverPNG } from './exporter.js';
import { SHOT_LIST } from './shots.js';

const PREVIEW_LONG_SIDE = 900;

const library = new PhotoLibrary();
let state = createCoverState();
let renderQueued = false;

const els = {};

function grabElements() {
  const ids = [
    'coverCanvas', 'photoInput', 'sampleRow', 'singlePhoto', 'panelChips',
    'layoutList', 'gradeList', 'gradeStrength', 'titleInput', 'subtitleInput',
    'decoSun', 'decoPalms', 'decoSparkles', 'zoomRange', 'exportRow', 'statusLine',
  ];
  for (const id of ids) els[id] = document.getElementById(id);
}

function setStatus(message) {
  if (els.statusLine) els.statusLine.textContent = message;
}

// Size the preview canvas to the staged export shape (portrait by
// default) and render.
function fitPreviewToShape(width, height) {
  const scale = PREVIEW_LONG_SIDE / Math.max(width, height);
  els.coverCanvas.width = Math.round(width * scale);
  els.coverCanvas.height = Math.round(height * scale);
}

function render() {
  renderCover(els.coverCanvas, state, library);
  refreshPanelChips();
}

function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    render();
  });
}

// --- control builders -------------------------------------------------

function buildLayoutList() {
  els.layoutList.innerHTML = '';
  for (const layout of LAYOUTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice' + (layout.id === state.layoutId ? ' picked' : '');
    button.innerHTML = `<strong>${layout.name}</strong><span>${layout.blurb}</span>`;
    button.addEventListener('click', () => {
      state.layoutId = layout.id;
      state.selectedPanel = 0;
      buildLayoutList();
      requestRender();
    });
    els.layoutList.appendChild(button);
  }
}

function buildGradeList() {
  els.gradeList.innerHTML = '';
  for (const grade of GRADES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'choice' + (grade.id === state.gradeId ? ' picked' : '');
    button.innerHTML = `<strong>${grade.name}</strong>`;
    button.addEventListener('click', () => {
      state.gradeId = grade.id;
      buildGradeList();
      requestRender();
    });
    els.gradeList.appendChild(button);
  }
}

function refreshPanelChips() {
  if (!els.panelChips) return;
  els.panelChips.innerHTML = '';
  const count = visiblePanelCount(state);
  for (let i = 0; i < count; i += 1) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip' + (i === state.selectedPanel ? ' picked' : '');
    const photo = state.panels[i].photoId;
    chip.textContent = photo ? `Panel ${i + 1} · ${photo}` : `Panel ${i + 1} · empty`;
    chip.addEventListener('click', () => {
      state.selectedPanel = i;
      syncZoomSlider();
      refreshPanelChips();
    });
    els.panelChips.appendChild(chip);
  }
}

function buildSampleRow() {
  els.sampleRow.innerHTML = '';
  for (const sample of SAMPLE_PHOTOS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mini';
    button.textContent = sample.label;
    button.addEventListener('click', async () => {
      await library.loadSample(sample.id);
      assignPhoto(state, state.selectedPanel, sample.id);
      setStatus(`${sample.label} placed on panel ${state.selectedPanel + 1}.`);
      requestRender();
    });
    els.sampleRow.appendChild(button);
  }
}

function buildExportRow() {
  els.exportRow.innerHTML = '';
  for (const size of EXPORT_SIZES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'export-button';
    button.textContent = `${size.label} · ${size.width}×${size.height} PNG`;
    button.addEventListener('click', () => {
      exportCoverPNG(state, library, size);
      setStatus(`Exported a ${size.width}×${size.height} PNG.`);
    });
    els.exportRow.appendChild(button);
  }
}

function syncZoomSlider() {
  const panel = state.panels[state.selectedPanel];
  els.zoomRange.value = String(panel ? panel.zoom : 1);
}

// --- events -------------------------------------------------------------

function bindEvents() {
  els.photoInput.addEventListener('change', async () => {
    const ids = await library.addFiles(els.photoInput.files);
    if (ids.length > 0) {
      assignPhoto(state, state.selectedPanel, ids[0]);
      for (let i = 1; i < ids.length; i += 1) {
        assignPhoto(state, state.selectedPanel + i, ids[i]);
      }
      setStatus(`Loaded ${ids.length} photo${ids.length === 1 ? '' : 's'} from this machine.`);
      requestRender();
    }
    els.photoInput.value = '';
  });

  els.singlePhoto.addEventListener('change', () => {
    state.singlePhoto = els.singlePhoto.checked;
    if (state.singlePhoto) {
      const first = state.panels.map((panel) => panel.photoId).find(Boolean);
      if (first) assignPhoto(state, 0, first);
    }
    requestRender();
  });

  els.gradeStrength.addEventListener('input', () => {
    state.gradeStrength = Number(els.gradeStrength.value);
    requestRender();
  });

  els.titleInput.addEventListener('input', () => {
    state.title = els.titleInput.value;
    requestRender();
  });
  els.subtitleInput.addEventListener('input', () => {
    state.subtitle = els.subtitleInput.value;
    requestRender();
  });

  const decoBindings = [
    ['decoSun', 'sun'],
    ['decoPalms', 'palms'],
    ['decoSparkles', 'sparkles'],
  ];
  for (const [id, key] of decoBindings) {
    els[id].addEventListener('change', () => {
      state.decorations[key] = els[id].checked;
      requestRender();
    });
  }

  els.zoomRange.addEventListener('input', () => {
    const panel = state.panels[state.selectedPanel];
    if (!panel) return;
    panel.zoom = Number(els.zoomRange.value);
    clampPanel(panel);
    requestRender();
  });

  // Drag on the canvas pans the panel under the pointer; a plain click
  // selects it. Dropping files anywhere on the canvas loads them.
  let drag = null;
  els.coverCanvas.addEventListener('pointerdown', (event) => {
    const rect = els.coverCanvas.getBoundingClientRect();
    const nx = (event.clientX - rect.left) / rect.width;
    const ny = (event.clientY - rect.top) / rect.height;
    const index = panelIndexAt(getLayout(state.layoutId), nx, ny);
    if (index === -1) return;
    state.selectedPanel = index;
    syncZoomSlider();
    refreshPanelChips();
    drag = { x: event.clientX, y: event.clientY, index };
    els.coverCanvas.setPointerCapture(event.pointerId);
  });
  els.coverCanvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const rect = els.coverCanvas.getBoundingClientRect();
    const panel = state.panels[drag.index];
    panel.panX += ((event.clientX - drag.x) / rect.width) * 2;
    panel.panY += ((event.clientY - drag.y) / rect.height) * 2;
    clampPanel(panel);
    drag.x = event.clientX;
    drag.y = event.clientY;
    requestRender();
  });
  els.coverCanvas.addEventListener('pointerup', () => {
    drag = null;
  });
  els.coverCanvas.addEventListener('dragover', (event) => event.preventDefault());
  els.coverCanvas.addEventListener('drop', async (event) => {
    event.preventDefault();
    const ids = await library.addFiles(event.dataTransfer.files);
    if (ids.length > 0) {
      assignPhoto(state, state.selectedPanel, ids[0]);
      requestRender();
    }
  });
}

// --- shot staging -------------------------------------------------------

async function stageShot(shot) {
  state = stateFromShot(shot);
  await library.loadAllSamples();
  els.titleInput.value = state.title;
  els.subtitleInput.value = state.subtitle;
  els.gradeStrength.value = String(state.gradeStrength);
  els.decoSun.checked = state.decorations.sun;
  els.decoPalms.checked = state.decorations.palms;
  els.decoSparkles.checked = state.decorations.sparkles;
  buildLayoutList();
  buildGradeList();
  if (shot.kind === 'export') {
    fitPreviewToShape(shot.exportWidth, shot.exportHeight);
    document.body.classList.add('shot-mode');
  }
  syncZoomSlider();
  render();
  setStatus(`Staged shot ${shot.file}: ${shot.title}.`);
}

// --- boot ---------------------------------------------------------------

async function boot() {
  grabElements();
  buildSampleRow();
  buildExportRow();
  bindEvents();

  // The Anton face must be ready before the first caption is drawn, or
  // the lettering falls back to a system sans for one frame.
  try {
    await document.fonts.load('64px Anton');
  } catch {
    // A failed font load leaves the fallback in place; the app still works.
  }

  const shotFile = new URLSearchParams(location.search).get('shot');
  const shot = SHOT_LIST.find((entry) => entry.file === shotFile);
  if (shot) {
    await stageShot(shot);
    return;
  }

  await library.loadAllSamples();
  state.panels[0].photoId = 'pier';
  state.panels[1].photoId = 'boulevard';
  state.panels[2].photoId = 'pier';
  state.panels[3].photoId = 'boulevard';
  state.panels[4].photoId = 'boulevard';
  state.panels[5].photoId = 'pier';
  fitPreviewToShape(1080, 1350);
  buildLayoutList();
  buildGradeList();
  syncZoomSlider();
  render();
  setStatus('Samples loaded. Pick a panel, add your own photo, then export a PNG.');
}

boot();

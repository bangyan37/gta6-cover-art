// Leonida Cover Maker: wires the page to the cover renderer. The person's photos stay on their machine;
// the left panel loads and assigns them, the canvas in the middle previews the cover (drag a panel to
// position its photo), and the right panel holds the layout, grade, caption and export controls. A ?shot=
// query sets up a fixed scene for a screenshot instead (./shots.js).

import { LAYOUTS, layoutById, pointInPolygon } from './layouts.js';
import { GRADES } from './grades.js';
import { TITLE_COLORS } from './caption.js';
import { createCoverState, syncPanelArrays, dealPhotosToPanels, EXPORT_SIZES, exportSizeById } from './state.js';
import { loadSamplePhotos, readPhotoFiles } from './photos.js';
import { drawCover, drawSelectionOutline } from './cover.js';
import { ensureTitleFont, exportCoverPng, exportCoverDataUrl, downloadBlob } from './exporter.js';
import { runShot } from './shots.js';

const state = createCoverState();
const canvas = document.getElementById('cover-canvas');
const status = document.getElementById('status');
const zoomSlider = document.getElementById('panel-zoom');
const zoomLabel = document.getElementById('zoom-label');

/** Repaints the preview: the cover at the chosen export size, plus the selected panel's outline. */
function redraw() {
  const size = exportSizeById(state.exportSizeId);
  if (canvas.width !== size.width || canvas.height !== size.height) {
    canvas.width = size.width;
    canvas.height = size.height;
  }
  drawCover(canvas, state);
  if (state.fillMode === 'multi') {
    const layout = layoutById(state.layoutId);
    drawSelectionOutline(canvas.getContext('2d'), canvas.width, canvas.height, layout.panels[state.selectedPanel]);
  }
  syncZoomControl();
}

/** The zoom and pan the sliders and drags edit: the selected panel's, or the whole photo's in single mode. */
function editTarget() {
  if (state.fillMode === 'single') {
    return {
      label: 'Whole-photo zoom',
      get zoom() { return state.singleZoom; },
      set zoom(v) { state.singleZoom = v; },
      get panX() { return state.singlePanX; },
      set panX(v) { state.singlePanX = v; },
      get panY() { return state.singlePanY; },
      set panY(v) { state.singlePanY = v; },
    };
  }
  const i = state.selectedPanel;
  return {
    label: `Panel ${i + 1} zoom`,
    get zoom() { return state.panelZoom[i]; },
    set zoom(v) { state.panelZoom[i] = v; },
    get panX() { return state.panelPanX[i]; },
    set panX(v) { state.panelPanX[i] = v; },
    get panY() { return state.panelPanY[i]; },
    set panY(v) { state.panelPanY[i] = v; },
  };
}

function syncZoomControl() {
  const target = editTarget();
  zoomLabel.textContent = target.label;
  zoomSlider.value = String(target.zoom);
}

/** Builds a row of option buttons; `onPick` receives the chosen id. */
function buildOptionButtons(container, options, currentId, onPick) {
  container.innerHTML = '';
  for (const option of options) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option-button' + (option.id === currentId ? ' is-active' : '');
    button.dataset.optionId = option.id;
    const name = document.createElement('span');
    name.className = 'option-name';
    name.textContent = option.name;
    const blurb = document.createElement('span');
    blurb.className = 'option-blurb';
    blurb.textContent = option.blurb ?? option.label ?? '';
    button.append(name, blurb);
    button.addEventListener('click', () => onPick(option.id));
    container.append(button);
  }
}

function markActiveButton(container, id) {
  for (const button of container.querySelectorAll('.option-button')) {
    button.classList.toggle('is-active', button.dataset.optionId === id);
  }
}

function buildLayoutButtons() {
  buildOptionButtons(document.getElementById('layout-buttons'), LAYOUTS, state.layoutId, (id) => {
    state.layoutId = id;
    syncPanelArrays(state);
    buildPanelChips();
    markActiveButton(document.getElementById('layout-buttons'), id);
    redraw();
  });
}

function buildGradeButtons() {
  buildOptionButtons(document.getElementById('grade-buttons'), GRADES, state.gradeId, (id) => {
    state.gradeId = id;
    markActiveButton(document.getElementById('grade-buttons'), id);
    redraw();
  });
}

function buildTitleColorSwatches() {
  const container = document.getElementById('title-colors');
  container.innerHTML = '';
  for (const color of TITLE_COLORS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'swatch' + (color.id === state.titleColor ? ' is-active' : '');
    button.dataset.optionId = color.id;
    button.title = color.name;
    button.style.background = color.swatch;
    button.addEventListener('click', () => {
      state.titleColor = color.id;
      markActiveButton(container, color.id);
      redraw();
    });
    container.append(button);
  }
}

/** The loaded photos as clickable thumbnails; a click assigns the photo to the selected panel. */
function buildPhotoStrip() {
  const strip = document.getElementById('photo-strip');
  strip.innerHTML = '';
  state.photos.forEach((photo, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'photo-thumb';
    const img = document.createElement('img');
    img.src = photo.img.src;
    img.alt = photo.name;
    const label = document.createElement('span');
    label.textContent = photo.name;
    button.append(img, label);
    button.addEventListener('click', () => assignPhotoToSelection(index));
    strip.append(button);
  });
}

/** One chip per panel of the current layout (or a single whole-cover chip in single-photo mode). */
function buildPanelChips() {
  const chips = document.getElementById('panel-chips');
  chips.innerHTML = '';
  if (state.fillMode === 'single') {
    const chip = document.createElement('span');
    chip.className = 'panel-chip is-active';
    chip.textContent = 'One photo, every panel';
    chips.append(chip);
    return;
  }
  layoutById(state.layoutId).panels.forEach((_, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'panel-chip' + (i === state.selectedPanel ? ' is-active' : '');
    chip.textContent = `Panel ${i + 1}`;
    chip.addEventListener('click', () => selectPanel(i));
    chips.append(chip);
  });
}

function selectPanel(index) {
  state.selectedPanel = index;
  buildPanelChips();
  redraw();
}

function assignPhotoToSelection(photoIndex) {
  if (state.fillMode === 'single') state.singlePhoto = photoIndex;
  else state.panelPhoto[state.selectedPanel] = photoIndex;
  redraw();
}

/** Adds photos the person picked or dropped, deals them into the panels and repaints. */
async function addPhotoFiles(files) {
  const photos = await readPhotoFiles(files);
  if (photos.length === 0) return;
  state.photos.push(...photos);
  dealPhotosToPanels(state);
  buildPhotoStrip();
  buildPanelChips();
  status.textContent = `${photos.length} photo${photos.length > 1 ? 's' : ''} added — click one, then a panel.`;
  redraw();
}

/** Reflects the state's caption, grade and decoration values in the right-hand controls. */
function syncControlsFromState() {
  document.getElementById('title-line-1').value = state.titleLine1;
  document.getElementById('title-line-2').value = state.titleLine2;
  document.getElementById('subtitle').value = state.subtitle;
  document.getElementById('title-size').value = String(state.titleSize);
  document.getElementById('title-rotation').value = String(state.titleRotation);
  document.getElementById('grade-intensity').value = String(state.gradeIntensity);
  document.getElementById('export-size').value = state.exportSizeId;
  document.getElementById('deco-palms').checked = state.showPalms;
  document.getElementById('deco-sun').checked = state.showSun;
  document.getElementById('deco-sparkles').checked = state.showSparkles;
  document.getElementById('fill-multi').checked = state.fillMode === 'multi';
  document.getElementById('fill-single').checked = state.fillMode === 'single';
  markActiveButton(document.getElementById('layout-buttons'), state.layoutId);
  markActiveButton(document.getElementById('grade-buttons'), state.gradeId);
  markActiveButton(document.getElementById('title-colors'), state.titleColor);
}

/** Wires every control on the page to the state. */
function wireControls() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('photo-files');
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragging');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragging'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    addPhotoFiles(event.dataTransfer.files);
  });
  fileInput.addEventListener('change', () => {
    addPhotoFiles(fileInput.files);
    fileInput.value = '';
  });
  document.getElementById('add-samples').addEventListener('click', async () => {
    state.photos.push(...(await loadSamplePhotos()));
    dealPhotosToPanels(state);
    buildPhotoStrip();
    buildPanelChips();
    redraw();
  });
  for (const radio of document.querySelectorAll('input[name="fill-mode"]')) {
    radio.addEventListener('change', () => {
      state.fillMode = radio.value;
      buildPanelChips();
      redraw();
    });
  }
  zoomSlider.addEventListener('input', () => {
    editTarget().zoom = Number(zoomSlider.value);
    redraw();
  });
  document.getElementById('panel-center').addEventListener('click', () => {
    const target = editTarget();
    target.zoom = 1;
    target.panX = 0;
    target.panY = 0;
    redraw();
  });
  document.getElementById('panel-swap').addEventListener('click', () => {
    if (state.fillMode !== 'multi') return;
    const count = state.panelPhoto.length;
    const a = state.selectedPanel;
    const b = (a + 1) % count;
    for (const list of [state.panelPhoto, state.panelZoom, state.panelPanX, state.panelPanY]) {
      [list[a], list[b]] = [list[b], list[a]];
    }
    selectPanel(b);
  });
  document.getElementById('panel-clear').addEventListener('click', () => {
    if (state.fillMode !== 'multi') return;
    state.panelPhoto[state.selectedPanel] = -1;
    redraw();
  });
  const sizeSelect = document.getElementById('export-size');
  for (const size of EXPORT_SIZES) {
    const option = document.createElement('option');
    option.value = size.id;
    option.textContent = size.label;
    sizeSelect.append(option);
  }
  sizeSelect.addEventListener('change', () => {
    state.exportSizeId = sizeSelect.value;
    redraw();
  });
  document.getElementById('grade-intensity').addEventListener('input', (event) => {
    state.gradeIntensity = Number(event.target.value);
    redraw();
  });
  const bindText = (id, key) => {
    document.getElementById(id).addEventListener('input', (event) => {
      state[key] = event.target.value;
      redraw();
    });
  };
  bindText('title-line-1', 'titleLine1');
  bindText('title-line-2', 'titleLine2');
  bindText('subtitle', 'subtitle');
  document.getElementById('title-size').addEventListener('input', (event) => {
    state.titleSize = Number(event.target.value);
    redraw();
  });
  document.getElementById('title-rotation').addEventListener('input', (event) => {
    state.titleRotation = Number(event.target.value);
    redraw();
  });
  const bindToggle = (id, key) => {
    document.getElementById(id).addEventListener('change', (event) => {
      state[key] = event.target.checked;
      redraw();
    });
  };
  bindToggle('deco-palms', 'showPalms');
  bindToggle('deco-sun', 'showSun');
  bindToggle('deco-sparkles', 'showSparkles');
  document.getElementById('export-png').addEventListener('click', async () => {
    status.textContent = 'Rendering…';
    const { blob, fileName } = await exportCoverPng(state);
    if (blob) {
      downloadBlob(blob, fileName);
      status.textContent = `Saved ${fileName}`;
    } else {
      status.textContent = 'Export failed in this browser.';
    }
  });
}

/** Dragging on the canvas pans the selected panel's photo; a click first selects the panel under it. */
function wireCanvasDrag() {
  let dragging = false;
  const unitPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return [(event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height];
  };
  canvas.addEventListener('pointerdown', (event) => {
    const [x, y] = unitPoint(event);
    if (state.fillMode === 'multi') {
      const layout = layoutById(state.layoutId);
      const hit = layout.panels.findIndex((polygon) => pointInPolygon(x, y, polygon));
      if (hit >= 0 && hit !== state.selectedPanel) selectPanel(hit);
    }
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const target = editTarget();
    target.panX = Math.max(-1, Math.min(1, target.panX + (event.movementX / rect.width) * 2.4));
    target.panY = Math.max(-1, Math.min(1, target.panY + (event.movementY / rect.height) * 2.4));
    redraw();
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const target = editTarget();
    target.zoom = Math.max(1, Math.min(3, target.zoom - Math.sign(event.deltaY) * 0.07));
    redraw();
  }, { passive: false });
}

/** Opens the studio: controls, demo photos in the panels, the font, then the first paint. */
async function init() {
  buildLayoutButtons();
  buildGradeButtons();
  buildTitleColorSwatches();
  wireControls();
  wireCanvasDrag();
  try {
    state.photos = await loadSamplePhotos();
  } catch {
    state.photos = [];
  }
  syncPanelArrays(state);
  buildPhotoStrip();
  buildPanelChips();
  syncControlsFromState();
  await ensureTitleFont();
  redraw();
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    await runShot(shot, query, {
      state,
      refresh: redraw,
      syncControls: syncControlsFromState,
      setLayout: (id) => {
        state.layoutId = id;
        syncPanelArrays(state);
        buildPanelChips();
      },
      exportDataUrl: (width, height) => exportCoverDataUrl(state, width, height),
    });
  }
}

init();

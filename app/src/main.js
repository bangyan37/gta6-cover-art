// Leonida Cover Maker — the editor.
//
// Wires the page together: loads the bundled sample photos into the panels,
// builds the layout / grade / size controls from the module data, keeps the
// preview canvas painted from state, and handles the hands-on parts —
// picking a panel by clicking it, dragging its photo to reposition, the
// scroll wheel to zoom, files by picker or drag-and-drop, and PNG export.
//
// Opened with ?shot=<id> the page instead sets up one of the shots from
// shots.js (the maker's screenshot mode): an export shot shows only the
// finished cover, an editor shot shows this editor pre-loaded.

import {
  EXPORT_SIZES,
  createState,
  fitPanels,
  onStateChange,
  emitStateChange,
} from './state.js';
import { LAYOUTS, layoutById, panelAt } from './layouts.js';
import { GRADES } from './grades.js';
import { loadSamplePhoto, loadPhotoFile, allPhotos } from './photos.js';
import { renderCover } from './cover.js';
import { exportPng, renderToCanvas } from './exporter.js';
import { shotById } from './shots.js';

const state = createState();
const $ = (id) => document.getElementById(id);

// Crops cycled through the panels so the two samples feel like six photos.
const PANEL_CROPS = [
  { zoom: 1.12, panX: -0.2, panY: -0.1 },
  { zoom: 1.3, panX: 0.25, panY: 0.1 },
  { zoom: 1.05, panX: 0, panY: 0.25 },
  { zoom: 1.25, panX: -0.3, panY: 0 },
  { zoom: 1.15, panX: 0.15, panY: -0.25 },
  { zoom: 1.35, panX: 0, panY: 0.05 },
];

function seedPanels(sampleIds, crops) {
  const layout = layoutById(state.layoutId);
  fitPanels(state, layout.panels.length);
  state.panels.forEach((p, i) => {
    p.photoId = sampleIds[i % sampleIds.length];
    const crop = (crops && crops[i]) || PANEL_CROPS[i % PANEL_CROPS.length];
    p.zoom = crop.zoom;
    p.panX = crop.panX;
    p.panY = crop.panY;
  });
}

function currentSize() {
  return EXPORT_SIZES[state.sizeId] || EXPORT_SIZES.portrait;
}

function paintPreview() {
  const canvas = $('preview');
  if (!canvas) return;
  const size = currentSize();
  const scale = 560 / Math.max(size.width, size.height);
  const w = Math.round(size.width * scale);
  const h = Math.round(size.height * scale);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderCover(canvas.getContext('2d'), state, w, h);
  markSelectedPanel(canvas, w, h);
}

// Outline the selected panel on the preview only (never on exports), so it
// is obvious which panel the sliders and the next dropped photo belong to.
function markSelectedPanel(canvas, w, h) {
  const ctx = canvas.getContext('2d');
  const p = layoutById(state.layoutId).panels[state.selectedPanel];
  if (!p) return;
  ctx.save();
  ctx.beginPath();
  p.points.forEach(([ux, uy], i) => {
    if (i === 0) ctx.moveTo(ux * w, uy * h);
    else ctx.lineTo(ux * w, uy * h);
  });
  ctx.closePath();
  ctx.strokeStyle = '#ffd319';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.stroke();
  ctx.restore();
}

function buttonGroup(el, items, currentId, onPick) {
  el.innerHTML = '';
  for (const item of items) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = item.name || item.label;
    b.className = 'chip' + (item.id === currentId ? ' chip-on' : '');
    b.addEventListener('click', () => onPick(item.id));
    el.appendChild(b);
  }
}

function refreshControls() {
  buttonGroup($('layoutButtons'), LAYOUTS, state.layoutId, (id) => {
    state.layoutId = id;
    fitPanels(state, layoutById(id).panels.length);
    emitStateChange();
  });
  buttonGroup($('gradeButtons'), GRADES, state.gradeId, (id) => {
    state.gradeId = id;
    emitStateChange();
  });
  buttonGroup($('sizeButtons'), Object.values(EXPORT_SIZES), state.sizeId, (id) => {
    state.sizeId = id;
    emitStateChange();
  });
  $('panelLabel').textContent =
    'Panel ' + (state.selectedPanel + 1) + ' of ' + layoutById(state.layoutId).panels.length;
  $('zoomRange').value = String(Math.round((state.panels[state.selectedPanel]?.zoom || 1) * 100));
  $('gradeRange').value = String(Math.round(state.gradeIntensity * 100));
}

async function placeFileOnPanel(file, panelIndex) {
  const id = await loadPhotoFile(file);
  if (state.fillMode === 'one') {
    state.panels[0].photoId = id;
  } else {
    state.panels[panelIndex].photoId = id;
    state.panels[panelIndex].zoom = 1;
    state.panels[panelIndex].panX = 0;
    state.panels[panelIndex].panY = 0;
  }
  state.selectedPanel = panelIndex;
  emitStateChange();
}

function bindEditor() {
  const canvas = $('preview');

  canvas.addEventListener('pointerdown', (ev) => {
    const rect = canvas.getBoundingClientRect();
    const ux = (ev.clientX - rect.left) / rect.width;
    const uy = (ev.clientY - rect.top) / rect.height;
    const hit = panelAt(layoutById(state.layoutId), ux, uy);
    if (hit >= 0) state.selectedPanel = hit;
    canvas.setPointerCapture(ev.pointerId);
    canvas.dataset.dragging = '1';
    canvas.dataset.lastX = String(ev.clientX);
    canvas.dataset.lastY = String(ev.clientY);
    emitStateChange();
  });

  canvas.addEventListener('pointermove', (ev) => {
    if (canvas.dataset.dragging !== '1') return;
    const rect = canvas.getBoundingClientRect();
    const panel = state.panels[state.selectedPanel];
    if (!panel) return;
    const dx = (ev.clientX - Number(canvas.dataset.lastX)) / rect.width;
    const dy = (ev.clientY - Number(canvas.dataset.lastY)) / rect.height;
    canvas.dataset.lastX = String(ev.clientX);
    canvas.dataset.lastY = String(ev.clientY);
    panel.panX = Math.max(-1, Math.min(1, panel.panX + dx * 2.2));
    panel.panY = Math.max(-1, Math.min(1, panel.panY + dy * 2.2));
    emitStateChange();
  });

  const endDrag = () => {
    canvas.dataset.dragging = '';
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const panel = state.panels[state.selectedPanel];
    if (!panel) return;
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * (ev.deltaY < 0 ? 1.06 : 0.94)));
    emitStateChange();
  }, { passive: false });

  canvas.addEventListener('dragover', (ev) => ev.preventDefault());
  canvas.addEventListener('drop', async (ev) => {
    ev.preventDefault();
    const file = ev.dataTransfer.files && ev.dataTransfer.files[0];
    if (!file) return;
    const rect = canvas.getBoundingClientRect();
    const hit = panelAt(
      layoutById(state.layoutId),
      (ev.clientX - rect.left) / rect.width,
      (ev.clientY - rect.top) / rect.height,
    );
    await placeFileOnPanel(file, hit >= 0 ? hit : state.selectedPanel);
  });

  $('photoFile').addEventListener('change', async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    if (file) await placeFileOnPanel(file, state.selectedPanel);
    ev.target.value = '';
  });

  $('fillMode').addEventListener('change', (ev) => {
    state.fillMode = ev.target.value;
    emitStateChange();
  });

  $('zoomRange').addEventListener('input', (ev) => {
    const panel = state.panels[state.selectedPanel];
    if (panel) panel.zoom = Number(ev.target.value) / 100;
    emitStateChange();
  });

  $('gradeRange').addEventListener('input', (ev) => {
    state.gradeIntensity = Number(ev.target.value) / 100;
    emitStateChange();
  });

  for (const [id, key] of [['titleLine1', 'titleLine1'], ['titleLine2', 'titleLine2'], ['subtitle', 'subtitle']]) {
    $(id).addEventListener('input', (ev) => {
      state[key] = ev.target.value;
      emitStateChange();
    });
  }

  for (const [id, key] of [['decoSun', 'sun'], ['decoPalms', 'palms'], ['decoSparkles', 'sparkles']]) {
    $(id).addEventListener('change', (ev) => {
      state.decorations[key] = ev.target.checked;
      emitStateChange();
    });
  }

  $('exportButton').addEventListener('click', () => exportPng(state));
}

async function loadAnton() {
  try {
    const face = new FontFace('Anton', "url('fonts/Anton-Regular.ttf')");
    await face.load();
    document.fonts.add(face);
  } catch (err) {
    // The stylesheet's @font-face is the fallback; either way the caption
    // renders, in Anton when the font file loads and a narrow sans if not.
  }
  try {
    await document.fonts.ready;
  } catch (err) {
    // Nothing to wait for.
  }
}

async function start() {
  const params = new URLSearchParams(location.search);
  const shot = shotById(params.get('shot') || '');

  if (shot) Object.assign(state, shot.setup);
  fitPanels(state, layoutById(state.layoutId).panels.length);

  await loadAnton();
  const boulevard = await loadSamplePhoto('samples/boulevard.jpg', 'Boulevard at dusk');
  const pier = await loadSamplePhoto('samples/pier.jpg', 'The pier at noon');
  seedPanels([boulevard, pier], shot && shot.setup ? shot.setup.crops : null);

  if (shot && shot.mode === 'export') {
    document.body.classList.add('present');
    const size = currentSize();
    const canvas = renderToCanvas(state, size.width, size.height);
    canvas.id = 'shotCanvas';
    document.body.appendChild(canvas);
    window.__SHOT_READY__ = true;
    return;
  }

  bindEditor();
  refreshControls();
  onStateChange(() => {
    paintPreview();
    refreshControls();
  });
  paintPreview();
  window.__SHOT_READY__ = true;
}

start().catch((err) => {
  console.error(err);
  window.__SHOT_READY__ = true;
});

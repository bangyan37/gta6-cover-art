// main.js - wires the editor page to the store and the renderer.
//
// Every control writes into the one state object (state.js); every
// state change repaints the preview through cover.js. This file owns
// no drawing of its own - it is forms, buttons and pointer handling.

(function () {
  "use strict";

  var store = LCMState.makeStore();
  var state = store.state;

  var stage = document.getElementById("stage");
  var stageCtx = stage.getContext("2d");

  function $(id) { return document.getElementById(id); }

  function repaint() {
    var w = stage.width, h = stage.height;
    LCMCover.renderCover(stageCtx, w, h, state);
  }
  store.on(repaint);

  // --- choice buttons (layouts, grades, preset shots) ---------------

  function buildChoices(el, items, current, onPick) {
    el.innerHTML = "";
    items.forEach(function (item) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = item.name;
      if (item.id === current) b.classList.add("active");
      b.addEventListener("click", function () { onPick(item.id); });
      el.appendChild(b);
    });
  }

  function refreshChoices() {
    buildChoices($("layout-buttons"), LCMLayouts.LAYOUTS, state.layout, function (id) {
      state.layout = id;
      buildPanelRows();
      store.emit();
    });
    buildChoices($("grade-buttons"), LCMGrades.GRADES, state.grade, function (id) {
      state.grade = id;
      refreshChoices();
      store.emit();
    });
  }

  // --- per-panel rows -------------------------------------------------

  function buildPanelRows() {
    var wrap = $("panel-list");
    wrap.innerHTML = "";
    var count = LCMLayouts.byId(state.layout).panels().length;
    for (var i = 0; i < count; i++) wrap.appendChild(panelRow(i));
    $("fill-photo").innerHTML = photoOptions(state.fillPhoto);
  }

  function photoOptions(selected) {
    var html = "";
    state.photos.forEach(function (p, i) {
      html += '<option value="' + i + '"' + (i === selected ? " selected" : "") + ">" +
        escapeHtml(p.name) + "</option>";
    });
    return html;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>""]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function panelRow(i) {
    var panel = state.panels[i];
    var row = document.createElement("div");
    row.className = "panel-row" + (state.selectedPanel === i ? " selected" : "");

    var head = document.createElement("button");
    head.type = "button";
    head.className = "panel-head";
    head.textContent = "Panel " + (i + 1);
    head.addEventListener("click", function () {
      state.selectedPanel = i;
      buildPanelRows();
    });
    row.appendChild(head);

    var select = document.createElement("select");
    select.innerHTML = '<option value="-1">Auto photo</option>' + photoOptions(panel.photo);
    select.value = String(panel.photo);
    select.addEventListener("change", function () {
      panel.photo = parseInt(select.value, 10);
      store.emit();
    });
    row.appendChild(select);

    var zoom = document.createElement("input");
    zoom.type = "range";
    zoom.min = "1"; zoom.max = "2.5"; zoom.step = "0.01";
    zoom.value = String(panel.zoom);
    zoom.title = "Panel zoom";
    zoom.addEventListener("input", function () {
      panel.zoom = parseFloat(zoom.value);
      store.emit();
    });
    row.appendChild(zoom);

    var file = document.createElement("input");
    file.type = "file";
    file.accept = "image/*";
    file.addEventListener("change", function () {
      if (!file.files.length) return;
      LCMPhotos.photoFromFile(file.files[0]).then(function (p) {
        state.photos.push(p);
        panel.photo = state.photos.length - 1;
        buildPanelRows();
        store.emit();
      });
    });
    row.appendChild(file);
    return row;
  }

  // --- drag to pan the selected panel ---------------------------------

  var dragging = null;
  stage.addEventListener("pointerdown", function (ev) {
    dragging = { x: ev.clientX, y: ev.clientY };
    stage.setPointerCapture(ev.pointerId);
  });
  stage.addEventListener("pointermove", function (ev) {
    if (!dragging) return;
    var panel = state.panels[state.selectedPanel];
    var rect = stage.getBoundingClientRect();
    panel.panX = clamp(panel.panX - (ev.clientX - dragging.x) / rect.width * 1.6, -1, 1);
    panel.panY = clamp(panel.panY - (ev.clientY - dragging.y) / rect.height * 1.6, -1, 1);
    dragging = { x: ev.clientX, y: ev.clientY };
    store.emit();
  });
  stage.addEventListener("pointerup", function () { dragging = null; });

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // --- the rest of the form -------------------------------------------

  function bindForm() {
    $("intensity").addEventListener("input", function () {
      state.intensity = parseFloat(this.value);
      store.emit();
    });
    $("title1").addEventListener("input", function () {
      state.titleLines[0] = this.value;
      store.emit();
    });
    $("title2").addEventListener("input", function () {
      state.titleLines[1] = this.value;
      store.emit();
    });
    $("subtitle").addEventListener("input", function () {
      state.subtitle = this.value;
      store.emit();
    });
    $("fill-all").addEventListener("change", function () {
      state.fillAll = this.checked;
      store.emit();
    });
    $("fill-photo").addEventListener("change", function () {
      state.fillPhoto = parseInt(this.value, 10);
      store.emit();
    });
    ["sun", "palms", "sparkles"].forEach(function (key) {
      $("dec-" + key).addEventListener("change", function () {
        state.decorations[key] = this.checked;
        store.emit();
      });
    });
    $("add-photos").addEventListener("change", function () {
      if (!this.files.length) return;
      LCMPhotos.photosFromFileList(this.files).then(function (added) {
        state.photos = state.photos.concat(added);
        buildPanelRows();
        store.emit();
      });
    });
    $("export-size").addEventListener("change", function () {
      state.exportSize = this.value;
    });
    $("export-btn").addEventListener("click", function () {
      LCMExporter.exportPNG(state, state.exportSize);
    });
    $("shot-buttons").querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        var shot = LCMShots.byId(b.getAttribute("data-shot"));
        if (!shot) return;
        store.applyShot(shot, function (name) {
          for (var i = 0; i < state.photos.length; i++) {
            if (state.photos[i].name === name) return i;
          }
          return 0;
        });
        syncForm();
        buildPanelRows();
        refreshChoices();
      });
    });
  }

  function syncForm() {
    $("intensity").value = String(state.intensity);
    $("title1").value = state.titleLines[0] || "";
    $("title2").value = state.titleLines[1] || "";
    $("subtitle").value = state.subtitle;
    $("fill-all").checked = state.fillAll;
    $("dec-sun").checked = state.decorations.sun;
    $("dec-palms").checked = state.decorations.palms;
    $("dec-sparkles").checked = state.decorations.sparkles;
    $("export-size").value = state.exportSize;
  }

  // --- boot -------------------------------------------------------------

  LCMPhotos.watchDropzone($("stage-wrap"), function (added) {
    state.photos = state.photos.concat(added);
    buildPanelRows();
    store.emit();
  });

  bindForm();
  refreshChoices();
  buildPanelRows();
  repaint();

  LCMPhotos.loadSamples().then(function (samples) {
    state.photos = samples;
    buildPanelRows();
    // The bundled face has to arrive before the first true paint, or
    // the caption flashes in a fallback font.
    var ready = (document.fonts && document.fonts.load)
      ? document.fonts.load("80px Anton") : Promise.resolve(null);
    return ready.then(function () { store.emit(); });
  }).catch(function () { store.emit(); });
})();

// state.js - one mutable state object for the editor, with listeners.
//
// Everything the user can change lives here: the layout and grade, the
// caption, which photo sits in which panel, per-panel zoom and pan,
// the decoration toggles and the export size. cover.js renders purely
// from this object, so the preview, the PNG export and the preset
// shots can never disagree about what a cover is.

(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LCMState = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  function blankPanel() {
    // photo: index into state.photos, or -1 to leave the panel to the
    // round-robin default. zoom multiplies the cover-fit scale; pan is
    // in fractions of the panel's overflow.
    return { photo: -1, zoom: 1.15, panX: 0, panY: 0 };
  }

  function createState() {
    return {
      layout: "slash-six",
      grade: "vice",
      intensity: 0.9,
      titleLines: ["LEONIDA", "NIGHTS"],
      subtitle: "VICE COAST AFTER DARK",
      fillAll: false,
      fillPhoto: 0,
      exportSize: "1080x1350",
      decorations: { sun: true, palms: true, sparkles: true },
      photos: [],        // {name, img} - img is an Image or canvas source
      panels: [blankPanel(), blankPanel(), blankPanel(), blankPanel(), blankPanel(), blankPanel()],
      selectedPanel: 0
    };
  }

  // Which photo index a panel shows: its own pick, the fill-all pick,
  // or the panel number modulo the photo count.
  function photoIndexFor(state, panelIdx) {
    if (!state.photos.length) return -1;
    if (state.fillAll) return Math.min(state.fillPhoto, state.photos.length - 1);
    var own = state.panels[panelIdx] ? state.panels[panelIdx].photo : -1;
    if (own >= 0 && own < state.photos.length) return own;
    return panelIdx % state.photos.length;
  }

  function makeStore(initial) {
    var state = initial || createState();
    var listeners = [];
    return {
      state: state,
      on: function (fn) { listeners.push(fn); },
      emit: function () {
        for (var i = 0; i < listeners.length; i++) listeners[i](state);
      },
      // Load a shot definition (app/src/shots.js) into the editor.
      applyShot: function (shot, photoByName) {
        state.layout = shot.layout;
        state.grade = shot.grade;
        state.intensity = shot.intensity;
        state.titleLines = shot.title.slice();
        state.subtitle = shot.subtitle;
        state.decorations = {
          sun: !!shot.decorations.sun,
          palms: !!shot.decorations.palms,
          sparkles: !!shot.decorations.sparkles
        };
        state.exportSize = shot.width + "x" + shot.height;
        for (var i = 0; i < state.panels.length; i++) {
          state.panels[i].photo = photoByName(shot.photos[i % shot.photos.length]);
          state.panels[i].zoom = shot.zooms[i % shot.zooms.length];
          state.panels[i].panX = 0;
          state.panels[i].panY = 0;
        }
        this.emit();
      }
    };
  }

  return { createState: createState, photoIndexFor: photoIndexFor, makeStore: makeStore, blankPanel: blankPanel };
});

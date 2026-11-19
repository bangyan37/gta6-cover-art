// shots.js - the four canonical renders of Leonida Cover Maker.
//
// This file is shared on purpose: the browser app loads it as a plain
// script (it lands on window.LCMShots) and the headless program in
// main.ts require()s it, so the screenshots the program produces are
// renders of exactly the shots the app itself offers as presets.
//
// A shot names a canvas size, a panel layout, a colour grade, the two
// caption lines and which bundled sample photos fill the panels.

(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LCMShots = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  var SHOTS = [
    {
      id: "cover",
      file: "1-cover.jpg",
      kind: "export",
      width: 1080,
      height: 1350,
      layout: "slash-six",
      grade: "vice",
      intensity: 0.9,
      title: ["LEONIDA", "NIGHTS"],
      subtitle: "VICE COAST AFTER DARK",
      photos: ["boulevard", "pier"],
      zooms: [1.12, 1.3, 1.05, 1.28, 1.1, 1.35],
      decorations: { sun: true, palms: true, sparkles: true },
      blurb: "Portrait export: six slanted panels, Vice Sunset grade."
    },
    {
      id: "editor",
      file: "2-editor.jpg",
      kind: "editor",
      width: 1280,
      height: 800,
      layout: "slash-six",
      grade: "vice",
      intensity: 0.9,
      title: ["LEONIDA", "NIGHTS"],
      subtitle: "VICE COAST AFTER DARK",
      photos: ["boulevard", "pier"],
      zooms: [1.12, 1.3, 1.05, 1.28, 1.1, 1.35],
      decorations: { sun: true, palms: true, sparkles: true },
      blurb: "The editor window at 1280x800 with the portrait cover loaded."
    },
    {
      id: "square",
      file: "3-square.jpg",
      kind: "export",
      width: 1080,
      height: 1080,
      layout: "quad-cross",
      grade: "neon",
      intensity: 1,
      title: ["NEON", "HARBOR"],
      subtitle: "LEONIDA - EST. 1987",
      photos: ["pier", "boulevard"],
      zooms: [1.2, 1.08, 1.32, 1.15],
      decorations: { sun: false, palms: true, sparkles: true },
      blurb: "Square export: four-panel cross layout, Neon Nights grade."
    },
    {
      id: "wide",
      file: "4-wide.jpg",
      kind: "export",
      width: 1920,
      height: 1080,
      layout: "hero-trio",
      grade: "golden",
      intensity: 0.85,
      title: ["LEONIDA NIGHTS"],
      subtitle: "ONE COAST - NO BRAKES",
      photos: ["pier", "boulevard"],
      zooms: [1.06, 1.22, 1.14, 1.3],
      decorations: { sun: true, palms: true, sparkles: false },
      blurb: "Wide export: hero panel over a trio, Golden Hour grade."
    }
  ];

  function byId(id) {
    for (var i = 0; i < SHOTS.length; i++) if (SHOTS[i].id === id) return SHOTS[i];
    return null;
  }

  return { SHOTS: SHOTS, byId: byId };
});

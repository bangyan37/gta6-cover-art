// layouts.js - panel geometry for Leonida Cover Maker.
//
// A layout is a list of polygons. Every vertex is a fraction of the
// canvas (x of width, y of height), so the same layout renders at the
// 540px preview size and at a 1920px export without rescaling logic.
// Panels always tile the whole canvas; cover.js strokes the shared
// edges afterwards, which is what gives the bright dividers.

(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LCMLayouts = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  // Six panels: two rows of three, every divider leaning a few degrees
  // off vertical/horizontal so the grid feels like it is moving.
  function slashSix() {
    return [
      [[0, 0], [0.35, 0], [0.33, 0.51], [0, 0.54]],
      [[0.35, 0], [0.68, 0], [0.66, 0.51], [0.33, 0.51]],
      [[0.68, 0], [1, 0], [1, 0.48], [0.66, 0.51]],
      [[0, 0.54], [0.33, 0.51], [0.31, 1], [0, 1]],
      [[0.33, 0.51], [0.66, 0.51], [0.64, 1], [0.31, 1]],
      [[0.66, 0.51], [1, 0.48], [1, 1], [0.64, 1]]
    ];
  }

  // One wide hero panel on top, a trio of uprights underneath it.
  function heroTrio() {
    return [
      [[0, 0], [1, 0], [1, 0.58], [0, 0.64]],
      [[0, 0.64], [0.36, 0.615], [0.34, 1], [0, 1]],
      [[0.36, 0.615], [0.68, 0.60], [0.67, 1], [0.34, 1]],
      [[0.68, 0.60], [1, 0.58], [1, 1], [0.67, 1]]
    ];
  }

  // A 2x2 grid whose centre cross is pushed off-middle, so no two
  // panels share the same shape.
  function quadCross() {
    return [
      [[0, 0], [0.52, 0], [0.50, 0.48], [0, 0.50]],
      [[0.52, 0], [1, 0], [1, 0.46], [0.50, 0.48]],
      [[0, 0.50], [0.50, 0.48], [0.49, 1], [0, 1]],
      [[0.50, 0.48], [1, 0.46], [1, 1], [0.49, 1]]
    ];
  }

  // Four tall strips, each sheared so the top edge sits to the right
  // of the bottom edge - a barcode of photographs.
  function strips() {
    return [
      [[0, 0], [0.28, 0], [0.16, 1], [0, 1]],
      [[0.28, 0], [0.53, 0], [0.41, 1], [0.16, 1]],
      [[0.53, 0], [0.78, 0], [0.66, 1], [0.41, 1]],
      [[0.78, 0], [1, 0], [1, 1], [0.66, 1]]
    ];
  }

  var LAYOUTS = [
    { id: "slash-six", name: "Slash Six", panels: slashSix },
    { id: "hero-trio", name: "Hero + Trio", panels: heroTrio },
    { id: "quad-cross", name: "Quad Cross", panels: quadCross },
    { id: "strips", name: "Speed Strips", panels: strips }
  ];

  function byId(id) {
    for (var i = 0; i < LAYOUTS.length; i++) if (LAYOUTS[i].id === id) return LAYOUTS[i];
    return LAYOUTS[0];
  }

  // Axis-aligned bounds of one panel, in fractions.
  function boundsOf(poly) {
    var minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (var i = 0; i < poly.length; i++) {
      if (poly[i][0] < minX) minX = poly[i][0];
      if (poly[i][0] > maxX) maxX = poly[i][0];
      if (poly[i][1] < minY) minY = poly[i][1];
      if (poly[i][1] > maxY) maxY = poly[i][1];
    }
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  return { LAYOUTS: LAYOUTS, byId: byId, boundsOf: boundsOf };
});

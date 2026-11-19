// exporter.js - full-resolution PNG downloads.
//
// The preview canvas is small; an export re-renders the same state
// onto an offscreen canvas at exactly the requested size - 1080x1080,
// 1080x1350 or 1920x1080 - and saves the PNG. Because cover.js is
// size-agnostic, the export is the preview, just with more pixels.

(function (root, factory) {
  var api = factory();
  root.LCMExporter = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  var SIZES = [
    { id: "1080x1080", width: 1080, height: 1080, label: "Square 1080 x 1080" },
    { id: "1080x1350", width: 1080, height: 1350, label: "Portrait 1080 x 1350" },
    { id: "1920x1080", width: 1920, height: 1080, label: "Wide 1920 x 1080" }
  ];

  function sizeById(id) {
    for (var i = 0; i < SIZES.length; i++) if (SIZES[i].id === id) return SIZES[i];
    return SIZES[1];
  }

  // The Anton face must be ready or the export silently falls back to
  // a system font; document.fonts.load resolves once it is usable.
  function ensureFont() {
    if (document.fonts && document.fonts.load) {
      return document.fonts.load("80px Anton").catch(function () { return null; });
    }
    return Promise.resolve(null);
  }

  function exportPNG(state, sizeId) {
    var size = sizeById(sizeId || state.exportSize);
    return ensureFont().then(function () {
      var canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      var ctx = canvas.getContext("2d");
      LCMCover.renderCover(ctx, size.width, size.height, state);
      return new Promise(function (resolve) {
        canvas.toBlob(function (blob) {
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "leonida-cover-" + size.id + ".png";
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
          resolve(size);
        }, "image/png");
      });
    });
  }

  return { SIZES: SIZES, sizeById: sizeById, exportPNG: exportPNG };
});

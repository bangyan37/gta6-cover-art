// grades.js - the four colour grades.
//
// Each grade is data, not code: channel gains, saturation / contrast /
// brightness, a tint colour with a strength, and how hard the corners
// fall off. The browser renderer turns that into a canvas filter plus
// a tint overlay; the headless renderer in main.ts applies the same
// numbers per pixel. Intensity (0..1) lerps every field back towards
// the neutral grade, which is what the slider in the editor does.

(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LCMGrades = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  var NEUTRAL = {
    gainR: 1, gainG: 1, gainB: 1,
    saturation: 1, contrast: 1, brightness: 1,
    tint: [255, 255, 255], tintAlpha: 0,
    shadowLift: [0, 0, 0], vignette: 0.18
  };

  var GRADES = [
    {
      id: "vice", name: "Vice Sunset",
      gainR: 1.06, gainG: 0.99, gainB: 0.94,
      saturation: 1.28, contrast: 1.08, brightness: 1.01,
      tint: [255, 94, 138], tintAlpha: 0.12,
      shadowLift: [0, 22, 26], vignette: 0.22
    },
    {
      id: "neon", name: "Neon Nights",
      gainR: 1.03, gainG: 0.94, gainB: 1.17,
      saturation: 1.46, contrast: 1.15, brightness: 1.0,
      tint: [255, 46, 166], tintAlpha: 0.10,
      shadowLift: [10, 6, 30], vignette: 0.30
    },
    {
      id: "golden", name: "Golden Hour",
      gainR: 1.11, gainG: 1.0, gainB: 0.83,
      saturation: 1.16, contrast: 1.04, brightness: 1.03,
      tint: [255, 179, 71], tintAlpha: 0.14,
      shadowLift: [24, 12, 0], vignette: 0.20
    },
    {
      id: "noir", name: "Mono Noir",
      gainR: 1.0, gainG: 1.0, gainB: 1.0,
      saturation: 0.0, contrast: 1.24, brightness: 1.02,
      tint: [200, 210, 225], tintAlpha: 0.05,
      shadowLift: [4, 4, 6], vignette: 0.38
    }
  ];

  function byId(id) {
    for (var i = 0; i < GRADES.length; i++) if (GRADES[i].id === id) return GRADES[i];
    return GRADES[0];
  }

  // Blend a grade towards neutral by (1 - intensity).
  function resolve(grade, intensity) {
    var t = Math.max(0, Math.min(1, intensity == null ? 1 : intensity));
    function mix(a, b) { return a + (b - a) * t; }
    return {
      gainR: mix(1, grade.gainR), gainG: mix(1, grade.gainG), gainB: mix(1, grade.gainB),
      saturation: mix(1, grade.saturation),
      contrast: mix(1, grade.contrast),
      brightness: mix(1, grade.brightness),
      tint: grade.tint,
      tintAlpha: grade.tintAlpha * t,
      shadowLift: [
        grade.shadowLift[0] * t, grade.shadowLift[1] * t, grade.shadowLift[2] * t
      ],
      vignette: mix(NEUTRAL.vignette, grade.vignette)
    };
  }

  // The browser-side approximation of the same numbers: a CSS filter
  // string for the photo layer. The tint and vignette are drawn as
  // overlays by cover.js.
  function filterString(grade, intensity) {
    var g = resolve(grade, intensity);
    return (
      "saturate(" + g.saturation.toFixed(3) + ") " +
      "contrast(" + g.contrast.toFixed(3) + ") " +
      "brightness(" + g.brightness.toFixed(3) + ")"
    );
  }

  return { GRADES: GRADES, NEUTRAL: NEUTRAL, byId: byId, resolve: resolve, filterString: filterString };
});

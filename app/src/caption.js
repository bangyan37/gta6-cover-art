// caption.js - the cover's title block.
//
// A soft dark gradient rises from the bottom edge so the lettering
// stays readable over any photo, then the title is set in the bundled
// Anton face - each line shrunk until it fits the cover's width - with
// a hard offset shadow, and the subtitle letterspaced underneath in
// the accent colour. The words are whatever the user typed; the app
// never stamps a game's name onto a cover.

(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LCMCaption = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  var TITLE_FILL = "#fff7ea";
  var TITLE_SHADOW = "rgba(16, 8, 24, 0.85)";
  var SUBTITLE_FILL = "#ffd166";

  function fontFor(px) {
    return px + "px Anton, 'Arial Narrow', sans-serif";
  }

  // Largest size, at or below startPx, at which text fits maxWidth.
  function fitSize(ctx, text, startPx, maxWidth) {
    var px = startPx;
    while (px > 12) {
      ctx.font = fontFor(px);
      if (ctx.measureText(text).width <= maxWidth) return px;
      px -= 4;
    }
    return px;
  }

  function draw(ctx, W, H, titleLines, subtitle) {
    var bandTop = H * 0.66;
    var grad = ctx.createLinearGradient(0, bandTop, 0, H);
    grad.addColorStop(0, "rgba(10, 6, 18, 0)");
    grad.addColorStop(0.45, "rgba(10, 6, 18, 0.45)");
    grad.addColorStop(1, "rgba(10, 6, 18, 0.78)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, bandTop, W, H - bandTop);

    var lines = (titleLines || []).filter(function (s) { return s && s.trim(); });
    if (!lines.length) lines = ["LEONIDA NIGHTS"];
    var maxWidth = W * 0.88;
    var base = H * (lines.length > 1 ? 0.115 : 0.15);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    // Stack the lines upward from a baseline above the subtitle.
    var sizes = lines.map(function (line) { return fitSize(ctx, line.toUpperCase(), base, maxWidth); });
    var lineStep = base * 1.04;
    var subtitlePx = Math.max(14, H * 0.030);
    var baseline = H * 0.965 - subtitlePx * 1.6 - (lines.length - 1) * lineStep;

    for (var i = 0; i < lines.length; i++) {
      var text = lines[i].toUpperCase();
      ctx.font = fontFor(sizes[i]);
      var y = baseline + i * lineStep;
      var off = Math.max(2, sizes[i] * 0.045);
      ctx.fillStyle = TITLE_SHADOW;
      ctx.fillText(text, W / 2 + off, y + off);
      ctx.fillStyle = TITLE_FILL;
      ctx.fillText(text, W / 2, y);
    }

    if (subtitle) {
      ctx.font = fontFor(subtitlePx);
      var spaced = subtitle.toUpperCase().split("").join("  ");
      ctx.fillStyle = SUBTITLE_FILL;
      ctx.fillText(spaced, W / 2, H * 0.965);
    }
  }

  return { draw: draw, fitSize: fitSize, fontFor: fontFor };
});

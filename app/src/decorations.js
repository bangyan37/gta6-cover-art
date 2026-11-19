// decorations.js - original ornaments drawn in code, no image assets.
//
// Three motifs, all silhouettes and simple geometry drawn with canvas
// paths: a low sun disc with a soft halo, palm fronds leaning in from
// the corners, and four-point sparkles. They sit above the graded
// photos and below the panel borders and caption, at fixed fractional
// positions so preview and export agree.

(function (root, factory) {
  var api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.LCMDecorations = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  var INK = "rgba(12, 10, 24, 0.55)";

  function drawSun(ctx, W, H) {
    var cx = W * 0.80, cy = H * 0.16, r = Math.min(W, H) * 0.13;
    var halo = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.1);
    halo.addColorStop(0, "rgba(255, 190, 90, 0.50)");
    halo.addColorStop(0.55, "rgba(255, 110, 130, 0.18)");
    halo.addColorStop(1, "rgba(255, 110, 130, 0)");
    ctx.fillStyle = halo;
    ctx.fillRect(cx - r * 2.1, cy - r * 2.1, r * 4.2, r * 4.2);
    var disc = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    disc.addColorStop(0, "#ffd76e");
    disc.addColorStop(1, "#ff5e7a");
    ctx.fillStyle = disc;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Two horizon cuts through the disc - a striped, sinking sun.
    ctx.fillStyle = "rgba(20, 12, 30, 0.35)";
    ctx.fillRect(cx - r, cy + r * 0.28, r * 2, r * 0.09);
    ctx.fillRect(cx - r, cy + r * 0.55, r * 2, r * 0.13);
  }

  // One palm: a curved trunk and seven fronds fanning from its crown.
  // (ox, oy) is the base in fractions; lean bends the crown sideways.
  function palm(ctx, W, H, ox, oy, scale, lean, flip) {
    var bx = ox * W, by = oy * H;
    var topX = bx + lean * W * flip, topY = by - 0.34 * H * scale;
    ctx.strokeStyle = INK;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(3, W * 0.010 * scale);
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.quadraticCurveTo(bx + lean * W * flip * 0.3, by - 0.2 * H * scale, topX, topY);
    ctx.stroke();
    ctx.lineWidth = Math.max(2, W * 0.006 * scale);
    var fronds = [-2.6, -2.0, -1.4, -0.7, 0.0, 0.7, 1.3];
    for (var i = 0; i < fronds.length; i++) {
      var a = fronds[i] * flip;
      var len = 0.17 * W * scale * (1 - Math.abs(fronds[i]) * 0.10);
      var ex = topX + Math.sin(a) * len;
      var ey = topY + Math.abs(Math.cos(a)) * len * 0.42 + len * 0.16;
      var mx = topX + Math.sin(a) * len * 0.5;
      var my = topY - len * 0.22;
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.stroke();
    }
  }

  function drawPalms(ctx, W, H) {
    palm(ctx, W, H, 0.015, 1.0, 1.0, 0.05, 1);    // bottom-left, leaning in
    palm(ctx, W, H, 0.99, 0.62, 0.72, 0.04, -1);  // right edge, smaller
  }

  function sparkle(ctx, cx, cy, r, alpha) {
    ctx.fillStyle = "rgba(255, 246, 220, " + alpha + ")";
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx, cy, cx + r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy + r);
    ctx.quadraticCurveTo(cx, cy, cx - r, cy);
    ctx.quadraticCurveTo(cx, cy, cx, cy - r);
    ctx.fill();
  }

  function drawSparkles(ctx, W, H) {
    var s = Math.min(W, H);
    sparkle(ctx, W * 0.16, H * 0.13, s * 0.030, 0.9);
    sparkle(ctx, W * 0.60, H * 0.07, s * 0.020, 0.7);
    sparkle(ctx, W * 0.90, H * 0.44, s * 0.024, 0.8);
    sparkle(ctx, W * 0.08, H * 0.58, s * 0.016, 0.6);
  }

  function draw(ctx, W, H, which) {
    if (which.sun) drawSun(ctx, W, H);
    if (which.palms) drawPalms(ctx, W, H);
    if (which.sparkles) drawSparkles(ctx, W, H);
  }

  return { draw: draw, drawSun: drawSun, drawPalms: drawPalms, drawSparkles: drawSparkles };
});

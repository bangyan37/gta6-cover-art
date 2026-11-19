// cover.js - the renderer the whole app hangs off.
//
// renderCover paints one cover from state onto any 2d context at any
// size: photos clipped into the layout's panels (cover-fit, per-panel
// zoom and pan), the colour grade over the top, the code-drawn
// decorations, bright strokes along every panel edge, and finally the
// caption. The preview canvas and the PNG exporter both call this, so
// what you see is byte-for-byte the composition you download.

(function (root, factory) {
  var api = factory();
  root.LCMCover = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  var BORDER = "#fff6e9";

  function pathFor(ctx, poly, W, H) {
    ctx.beginPath();
    for (var i = 0; i < poly.length; i++) {
      var x = poly[i][0] * W, y = poly[i][1] * H;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  // Draw one photo into one panel: clip to the polygon, then place the
  // image so it covers the panel's bounds at the panel's zoom, panned
  // by the panel's pan fractions of the overflow.
  function drawPanel(ctx, img, poly, W, H, panel, filter) {
    var b = LCMLayouts.boundsOf(poly);
    var bx = b.x * W, by = b.y * H, bw = b.w * W, bh = b.h * H;
    ctx.save();
    pathFor(ctx, poly, W, H);
    ctx.clip();
    if (img) {
      var scale = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * (panel.zoom || 1);
      var dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
      var dx = bx + (bw - dw) / 2 + (panel.panX || 0) * Math.max(0, dw - bw);
      var dy = by + (bh - dh) / 2 + (panel.panY || 0) * Math.max(0, dh - bh);
      if (filter) ctx.filter = filter;
      ctx.drawImage(img, dx, dy, dw, dh);
      ctx.filter = "none";
    } else {
      ctx.fillStyle = "#241f38";
      ctx.fillRect(bx, by, bw, bh);
    }
    ctx.restore();
  }

  function renderCover(ctx, W, H, state) {
    var layout = LCMLayouts.byId(state.layout);
    var grade = LCMGrades.byId(state.grade);
    var g = LCMGrades.resolve(grade, state.intensity);
    var filter = LCMGrades.filterString(grade, state.intensity);
    var polys = layout.panels();

    ctx.save();
    ctx.fillStyle = "#14101f";
    ctx.fillRect(0, 0, W, H);

    for (var i = 0; i < polys.length; i++) {
      var panel = state.panels[i] || { photo: -1, zoom: 1.15, panX: 0, panY: 0 };
      var idx = LCMState.photoIndexFor(state, i);
      var img = idx >= 0 && state.photos[idx] ? state.photos[idx].img : null;
      drawPanel(ctx, img, polys[i], W, H, panel, filter);
    }

    // Tint wash and vignette: the parts of a grade a CSS filter
    // cannot express.
    if (g.tintAlpha > 0) {
      ctx.fillStyle = "rgba(" + g.tint[0] + "," + g.tint[1] + "," + g.tint[2] + "," + g.tintAlpha.toFixed(3) + ")";
      ctx.fillRect(0, 0, W, H);
    }
    if (g.vignette > 0) {
      var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
      vg.addColorStop(0, "rgba(8, 6, 16, 0)");
      vg.addColorStop(1, "rgba(8, 6, 16, " + g.vignette.toFixed(3) + ")");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }

    LCMDecorations.draw(ctx, W, H, state.decorations);

    // Bright dividers: stroke every panel, then the outer frame a
    // touch heavier.
    ctx.strokeStyle = BORDER;
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(3, W * 0.007);
    for (var j = 0; j < polys.length; j++) {
      pathFor(ctx, polys[j], W, H);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(5, W * 0.011);
    ctx.strokeRect(0, 0, W, H);

    LCMCaption.draw(ctx, W, H, state.titleLines, state.subtitle);
    ctx.restore();
  }

  return { renderCover: renderCover, pathFor: pathFor };
});

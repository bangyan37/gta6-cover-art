// Colour grades: each grade is a photo adjustment (saturation / contrast / brightness, applied as a canvas
// filter while the panels are drawn) plus a stack of gradient overlays painted over the whole cover. The
// editor's intensity slider blends between the raw photo (0) and the full grade (1). Overlay stops are
// [offset, red, green, blue, alpha] so the painter can scale their alpha by the intensity.

export const GRADES = [
  {
    id: 'vice',
    name: 'Vice Sunset',
    blurb: 'Warm pink and orange, teal shade',
    saturation: 1.3, contrast: 1.07, brightness: 1.04,
    overlays: [
      { kind: 'down', blend: 'source-over', stops: [[0, 32, 200, 190, 0.13], [0.42, 255, 120, 80, 0.05], [0.75, 255, 64, 110, 0.3], [1, 214, 32, 118, 0.48]] },
      { kind: 'up', blend: 'soft-light', stops: [[0, 255, 150, 60, 0.55], [0.6, 255, 150, 60, 0]] },
    ],
  },
  {
    id: 'neon',
    name: 'Neon Nights',
    blurb: 'Teal and magenta nightclub wash',
    saturation: 1.38, contrast: 1.13, brightness: 0.99,
    overlays: [
      { kind: 'down', blend: 'source-over', stops: [[0, 255, 0, 128, 0.2], [0.45, 90, 0, 160, 0.04], [1, 0, 210, 255, 0.3]] },
      { kind: 'up', blend: 'soft-light', stops: [[0, 0, 229, 255, 0.5], [0.55, 0, 229, 255, 0]] },
      { kind: 'down', blend: 'soft-light', stops: [[0, 255, 60, 180, 0.45], [0.5, 255, 60, 180, 0]] },
    ],
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    blurb: 'Amber light, long shadows',
    saturation: 1.18, contrast: 1.05, brightness: 1.07,
    overlays: [
      { kind: 'down', blend: 'source-over', stops: [[0, 255, 196, 96, 0.1], [0.6, 255, 150, 60, 0.12], [1, 226, 92, 30, 0.34]] },
      { kind: 'up', blend: 'soft-light', stops: [[0, 255, 176, 66, 0.6], [0.65, 255, 176, 66, 0]] },
    ],
  },
  {
    id: 'noir',
    name: 'Mono Noir',
    blurb: 'Black and white, hard contrast',
    saturation: 0.04, contrast: 1.28, brightness: 1.02,
    overlays: [
      { kind: 'down', blend: 'source-over', stops: [[0, 0, 0, 0, 0.3], [0.35, 0, 0, 0, 0], [0.7, 0, 0, 0, 0.08], [1, 0, 0, 0, 0.5]] },
      { kind: 'down', blend: 'soft-light', stops: [[0, 255, 255, 255, 0.35], [0.4, 255, 255, 255, 0]] },
    ],
  },
];

/** The grade with this id, or the first grade when the id is unknown. */
export function gradeById(id) {
  return GRADES.find((grade) => grade.id === id) ?? GRADES[0];
}

/** The canvas filter string for a grade at an intensity: each adjustment lerps from neutral (1) to the grade. */
export function gradeFilter(grade, intensity) {
  const lerp = (target) => 1 + (target - 1) * intensity;
  return `saturate(${lerp(grade.saturation).toFixed(3)}) contrast(${lerp(grade.contrast).toFixed(3)}) brightness(${lerp(grade.brightness).toFixed(3)})`;
}

/** One overlay's canvas gradient across a w x h cover. */
function overlayGradient(ctx, w, h, overlay) {
  const gradient = overlay.kind === 'up'
    ? ctx.createLinearGradient(0, h, 0, 0)
    : ctx.createLinearGradient(0, 0, 0, h);
  return gradient;
}

/** Paints a grade's overlays, then a vignette, over a cover already drawn on ctx at w x h. */
export function paintGradeOverlay(ctx, w, h, grade, intensity) {
  for (const overlay of grade.overlays) {
    const gradient = overlayGradient(ctx, w, h, overlay);
    for (const [offset, r, g, b, a] of overlay.stops) {
      gradient.addColorStop(offset, `rgba(${r}, ${g}, ${b}, ${(a * intensity).toFixed(3)})`);
    }
    ctx.save();
    ctx.globalCompositeOperation = overlay.blend;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.78);
  vignette.addColorStop(0, 'rgba(12, 4, 24, 0)');
  vignette.addColorStop(1, `rgba(12, 4, 24, ${(0.36 * intensity + 0.08).toFixed(3)})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

// Colour grades: the looks that turn plain photos into poster art.
//
// A grade is two layers. The canvas filter is applied while the panel photo
// itself is drawn (saturation, contrast, hue), then a translucent colour
// wash is laid over the panel as a top-to-bottom gradient. The editor's
// intensity slider scales the wash, so a grade can sit anywhere between a
// whisper and a full neon drench.

export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    filter: 'saturate(1.38) contrast(1.09) brightness(1.02)',
    washTop: 'rgba(255, 84, 164, 0.30)',
    washBottom: 'rgba(104, 28, 178, 0.36)',
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    filter: 'saturate(1.65) contrast(1.17) hue-rotate(-10deg) brightness(1.04)',
    washTop: 'rgba(0, 229, 255, 0.24)',
    washBottom: 'rgba(255, 0, 128, 0.32)',
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    filter: 'sepia(0.34) saturate(1.32) contrast(1.05) brightness(1.07)',
    washTop: 'rgba(255, 178, 64, 0.30)',
    washBottom: 'rgba(186, 58, 20, 0.30)',
  },
  {
    id: 'mono-noir',
    name: 'Mono Noir',
    filter: 'grayscale(1) contrast(1.24) brightness(1.03)',
    washTop: 'rgba(24, 24, 34, 0.10)',
    washBottom: 'rgba(0, 0, 0, 0.42)',
  },
];

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

// Lay the grade's wash over the rectangle the caller has clipped to a panel.
export function applyGradeWash(ctx, grade, x, y, w, h, intensity) {
  if (intensity <= 0) return;
  const grad = ctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, grade.washTop);
  grad.addColorStop(1, grade.washBottom);
  ctx.save();
  ctx.globalAlpha = Math.min(1, intensity);
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}

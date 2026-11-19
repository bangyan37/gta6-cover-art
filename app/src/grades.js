// Colour grades for Leonida Cover Maker.
//
// A grade is a small set of numbers, and `gradePixel` turns one pixel
// with them: it rebalances the pixel toward a shadow tint and a highlight
// tint chosen by its brightness, adjusts saturation and contrast, then
// mixes the result with the untouched pixel by the strength the person
// picked (0 leaves the photo alone, 1 is the full grade). The function is
// pure arithmetic on three numbers, so the browser editor and the
// headless program in main.ts grade their pixels identically; only the
// loops around it differ.

function clamp255(value) {
  if (value < 0) return 0;
  if (value > 255) return 255;
  return value;
}

function mixChannel(a, b, t) {
  return a + (b - a) * t;
}

export const GRADES = [
  {
    id: 'vice-sunset',
    name: 'Vice Sunset',
    shadows: [64, 26, 84],
    highlights: [255, 166, 88],
    saturation: 1.28,
    contrast: 1.1,
    warmth: 14,
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    shadows: [18, 10, 64],
    highlights: [94, 234, 255],
    saturation: 1.45,
    contrast: 1.16,
    warmth: -8,
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    shadows: [52, 30, 12],
    highlights: [255, 204, 110],
    saturation: 1.15,
    contrast: 1.05,
    warmth: 30,
  },
  {
    id: 'mono-noir',
    name: 'Mono Noir',
    shadows: [8, 8, 10],
    highlights: [244, 244, 240],
    saturation: 0,
    contrast: 1.3,
    warmth: 0,
  },
];

// Look a grade up by id, falling back to the first one.
export function getGrade(gradeId) {
  return GRADES.find((grade) => grade.id === gradeId) ?? GRADES[0];
}

// Grade one pixel. r, g, b are 0..255; returns [r, g, b] as floats.
export function gradePixel(r, g, b, grade, strength) {
  const t = Math.min(1, Math.max(0, strength));
  if (t <= 0) return [r, g, b];

  // Saturation around the pixel's own luminance.
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  let nr = luma + (r - luma) * grade.saturation;
  let ng = luma + (g - luma) * grade.saturation;
  let nb = luma + (b - luma) * grade.saturation;

  // Contrast around middle grey.
  nr = (nr - 128) * grade.contrast + 128;
  ng = (ng - 128) * grade.contrast + 128;
  nb = (nb - 128) * grade.contrast + 128;

  // Two-tone tint: dark pixels lean to the shadow colour, bright ones to
  // the highlight colour, with the tint itself scaled by how far the
  // pixel sits from middle brightness.
  const tone = Math.min(1, Math.max(0, luma / 255));
  const tintR = mixChannel(grade.shadows[0], grade.highlights[0], tone);
  const tintG = mixChannel(grade.shadows[1], grade.highlights[1], tone);
  const tintB = mixChannel(grade.shadows[2], grade.highlights[2], tone);
  const tintAmount = 0.38 * (0.35 + 0.65 * Math.abs(tone - 0.5) * 2);
  const tintMix = tintAmount * 0.75;
  nr = mixChannel(nr, (nr + tintR) / 2, tintMix);
  ng = mixChannel(ng, (ng + tintG) / 2, tintMix);
  nb = mixChannel(nb, (nb + tintB) / 2, tintMix);

  // Warmth shifts red up and blue down (or the reverse when negative).
  nr += grade.warmth;
  nb -= grade.warmth;

  return [
    clamp255(mixChannel(r, nr, t)),
    clamp255(mixChannel(g, ng, t)),
    clamp255(mixChannel(b, nb, t)),
  ];
}

// Grade a whole browser ImageData in place; the editor's wrapper around
// gradePixel.
export function gradeImageData(imageData, grade, strength) {
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = gradePixel(data[i], data[i + 1], data[i + 2], grade, strength);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
  return imageData;
}

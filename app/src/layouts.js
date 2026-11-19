// Poster layouts: each template is a set of panel polygons in unit space (0..1 on both axes), so the same
// layout renders at any export size. Panels are clipped to their polygon when their photo is drawn, which is
// what makes the angled, multi-panel GTA-poster look. titleY is where the caption block centres, per layout.

/** The six-panel classic: two rows of three, its vertical dividers slanted like the genre's posters. */
function classicSixPanels() {
  return [
    [[0, 0], [0.36, 0], [0.31, 0.52], [0, 0.52]],
    [[0.36, 0], [0.68, 0], [0.63, 0.52], [0.31, 0.52]],
    [[0.68, 0], [1, 0], [1, 0.52], [0.63, 0.52]],
    [[0, 0.52], [0.31, 0.52], [0.36, 1], [0, 1]],
    [[0.31, 0.52], [0.63, 0.52], [0.68, 1], [0.36, 1]],
    [[0.63, 0.52], [1, 0.52], [1, 1], [0.68, 1]],
  ];
}

/** One wide hero panel across the top, three panels beneath it, the shared edges slightly diagonal. */
function heroAndThreePanels() {
  return [
    [[0, 0], [1, 0], [1, 0.55], [0, 0.62]],
    [[0, 0.62], [0.34, 0.595], [0.32, 1], [0, 1]],
    [[0.34, 0.595], [0.67, 0.572], [0.66, 1], [0.32, 1]],
    [[0.67, 0.572], [1, 0.55], [1, 1], [0.66, 1]],
  ];
}

/** A plain 2 x 2 grid, its cross slightly skewed so it still reads as poster art, not a table. */
function fourSquarePanels() {
  return [
    [[0, 0], [0.52, 0], [0.48, 0.5], [0, 0.52]],
    [[0.52, 0], [1, 0], [1, 0.48], [0.48, 0.5]],
    [[0, 0.52], [0.48, 0.5], [0.52, 1], [0, 1]],
    [[0.48, 0.5], [1, 0.48], [1, 1], [0.52, 1]],
  ];
}

/** Four tall diagonal strips leaning across the cover, each a sliver of a scene. */
function diagonalStripPanels() {
  return [
    [[0, 0], [0.4, 0], [0.1, 1], [0, 1]],
    [[0.4, 0], [0.65, 0], [0.35, 1], [0.1, 1]],
    [[0.65, 0], [0.88, 0], [0.58, 1], [0.35, 1]],
    [[0.88, 0], [1, 0], [1, 1], [0.58, 1]],
  ];
}

export const LAYOUTS = [
  { id: 'classic', name: 'Classic Six', blurb: 'Six panels, angled dividers', panels: classicSixPanels(), titleY: 0.5 },
  { id: 'hero', name: 'Hero + Three', blurb: 'One wide hero, three below', panels: heroAndThreePanels(), titleY: 0.585 },
  { id: 'grid', name: 'Four Square', blurb: 'A 2 x 2 grid, slightly skewed', panels: fourSquarePanels(), titleY: 0.5 },
  { id: 'strips', name: 'Diagonal Strips', blurb: 'Four leaning strips', panels: diagonalStripPanels(), titleY: 0.46 },
];

/** The layout with this id, or the first layout when the id is unknown. */
export function layoutById(id) {
  return LAYOUTS.find((layout) => layout.id === id) ?? LAYOUTS[0];
}

/** The axis-aligned bounds of a unit-space polygon, still in unit space. */
export function polygonBounds(polygon) {
  let minX = 1, minY = 1, maxX = 0, maxY = 0;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

/** True when the unit-space point falls inside the polygon (ray cast), for click-to-select on the canvas. */
export function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

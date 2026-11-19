// Panel layouts for Leonida Cover Maker.
//
// Every layout is a list of panels, and every panel is a polygon written in
// normalised cover coordinates (x and y both run 0..1, y pointing down).
// The renderer scales the polygons to whatever pixel size a cover is drawn
// at, clips each panel's photo to its polygon, and strokes the polygon
// edges with the bright border colour, which is what gives the covers
// their poster look. Keeping the geometry in this one pure module means
// the browser editor and the headless program in main.ts cut exactly the
// same panels.
//
// A "slant" is how far a divider leans: a divider that would be a straight
// horizontal line instead drops by `slant` of the cover height from its
// left end to its right end (negative slants rise instead).

function quad(x0, y0, x1, y1, slant) {
  // A rectangle whose top and bottom edges lean by `slant`.
  return [
    [x0, y0],
    [x1, y0 + slant],
    [x1, y1 + slant],
    [x0, y1],
  ];
}

function panelRow(y0, y1, slant, cuts) {
  // One horizontal band split at the given x positions.
  const edges = [0, ...cuts, 1];
  const panels = [];
  for (let i = 0; i + 1 < edges.length; i += 1) {
    panels.push(quad(edges[i], y0, edges[i + 1], y1, slant));
  }
  return panels;
}

export const LAYOUTS = [
  {
    id: 'diagonal-six',
    name: 'Diagonal Six',
    blurb: 'Six panels in three leaning rows, the classic cover grid.',
    panels: [
      ...panelRow(0, 0.36, 0.05, [0.52]),
      ...panelRow(0.36, 0.68, -0.04, [0.46]),
      ...panelRow(0.68, 1, 0.03, [0.55]),
    ],
  },
  {
    id: 'hero-top',
    name: 'Hero and Three',
    blurb: 'One wide hero panel over a row of three.',
    panels: [
      quad(0, 0, 1, 0.56, 0.04),
      ...panelRow(0.56, 1, -0.03, [0.34, 0.67]),
    ],
  },
  {
    id: 'quad-four',
    name: 'Quad Four',
    blurb: 'A two-by-two grid with a crossed diagonal lean.',
    panels: [
      quad(0, 0, 0.52, 0.5, 0.06),
      quad(0.52, 0, 1, 0.5, -0.02),
      quad(0, 0.5, 0.48, 1, -0.05),
      quad(0.48, 0.5, 1, 1, 0.04),
    ],
  },
  {
    id: 'strips',
    name: 'Neon Strips',
    blurb: 'Four tall diagonal strips leaning into the light.',
    panels: [0, 1, 2, 3].map((i) => {
      const x0 = i * 0.25;
      const x1 = x0 + 0.25;
      const lean = 0.09;
      return [
        [x0 + lean, 0],
        [x1 + lean, 0],
        [x1 - lean, 1],
        [x0 - lean, 1],
      ];
    }),
  },
];

// Look a layout up by id, falling back to the first one.
export function getLayout(layoutId) {
  return LAYOUTS.find((layout) => layout.id === layoutId) ?? LAYOUTS[0];
}

// Axis-aligned bounds of one panel, in normalised coordinates.
export function panelBounds(panel) {
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const [x, y] of panel) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

// Even-odd point-in-polygon test in normalised coordinates; used by the
// editor to pick the panel under the pointer.
export function pointInPanel(panel, px, py) {
  let inside = false;
  for (let i = 0, j = panel.length - 1; i < panel.length; j = i, i += 1) {
    const [xi, yi] = panel[i];
    const [xj, yj] = panel[j];
    const crosses = yi > py !== yj > py;
    if (crosses && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Index of the panel containing a normalised point, or -1.
export function panelIndexAt(layout, px, py) {
  for (let i = 0; i < layout.panels.length; i += 1) {
    if (pointInPanel(layout.panels[i], px, py)) return i;
  }
  return -1;
}

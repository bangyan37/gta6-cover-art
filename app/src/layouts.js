// Panel layouts: the multi-panel poster shapes the cover is built from.
//
// Every layout is a list of polygons in unit space (0..1 on both axes), so
// the same shapes drive the on-screen preview, all three export sizes and
// the screenshot modes. Panels lean on slanted dividers, the way the classic
// game posters cut their artwork into tilted cells with bright seams.

function panel(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return {
    points,
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
    cx: xs.reduce((a, b) => a + b, 0) / xs.length,
    cy: ys.reduce((a, b) => a + b, 0) / ys.length,
  };
}

export const LAYOUTS = [
  {
    id: 'diagonal-six',
    name: 'Diagonal Six',
    panels: [
      panel([[0, 0], [0.37, 0], [0.30, 0.52], [0, 0.52]]),
      panel([[0.37, 0], [0.69, 0], [0.62, 0.52], [0.30, 0.52]]),
      panel([[0.69, 0], [1, 0], [1, 0.52], [0.62, 0.52]]),
      panel([[0, 0.52], [0.30, 0.52], [0.37, 1], [0, 1]]),
      panel([[0.30, 0.52], [0.62, 0.52], [0.69, 1], [0.37, 1]]),
      panel([[0.62, 0.52], [1, 0.52], [1, 1], [0.69, 1]]),
    ],
  },
  {
    id: 'hero-three',
    name: 'Hero + Three',
    panels: [
      panel([[0, 0], [1, 0], [1, 0.57], [0, 0.66]]),
      panel([[0, 0.66], [0.34, 0.615], [0.34, 1], [0, 1]]),
      panel([[0.34, 0.615], [0.67, 0.59], [0.67, 1], [0.34, 1]]),
      panel([[0.67, 0.59], [1, 0.57], [1, 1], [0.67, 1]]),
    ],
  },
  {
    id: 'grid-four',
    name: 'Grid Four',
    panels: [
      panel([[0, 0], [0.52, 0], [0.48, 0.5], [0, 0.5]]),
      panel([[0.52, 0], [1, 0], [1, 0.5], [0.48, 0.5]]),
      panel([[0, 0.5], [0.48, 0.5], [0.52, 1], [0, 1]]),
      panel([[0.48, 0.5], [1, 0.5], [1, 1], [0.52, 1]]),
    ],
  },
  {
    id: 'sunset-strips',
    name: 'Diagonal Strips',
    panels: [
      panel([[0, 0], [1, 0], [1, 0.17], [0, 0.33]]),
      panel([[0, 0.33], [1, 0.17], [1, 0.43], [0, 0.57]]),
      panel([[0, 0.57], [1, 0.43], [1, 0.69], [0, 0.81]]),
      panel([[0, 0.81], [1, 0.69], [1, 1], [0, 1]]),
    ],
  },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

// Hit test in unit space, used to pick the panel a click or drop lands on.
export function panelAt(layout, ux, uy) {
  for (let i = 0; i < layout.panels.length; i++) {
    const pts = layout.panels[i].points;
    let inside = false;
    for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
      const [ax, ay] = pts[a];
      const [bx, by] = pts[b];
      if (ay > uy !== by > uy && ux < ((bx - ax) * (uy - ay)) / (by - ay) + ax) {
        inside = !inside;
      }
    }
    if (inside) return i;
  }
  return -1;
}

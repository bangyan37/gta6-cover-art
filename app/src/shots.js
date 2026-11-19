// Screenshot definitions, shared by the app and the maker's shot script.
//
// Open the app with ?shot=<id> and it sets itself up as that shot describes:
// an "export" shot fills the window with nothing but the finished cover at
// the shot's pixel size, an "editor" shot shows the whole editor with the
// shot's cover loaded. shots.json at the repository root mirrors this list.

export const SHOTS = [
  {
    id: '1-cover',
    file: 'screenshots/1-cover.jpg',
    mode: 'export',
    width: 1024,
    height: 1280,
    setup: { layoutId: 'diagonal-six', gradeId: 'vice-sunset', sizeId: 'portrait', gradeIntensity: 0.85 },
  },
  {
    id: '2-editor',
    file: 'screenshots/2-editor.jpg',
    mode: 'editor',
    width: 1280,
    height: 800,
    setup: { layoutId: 'diagonal-six', gradeId: 'vice-sunset', sizeId: 'portrait', gradeIntensity: 0.85 },
  },
  {
    id: '3-square',
    file: 'screenshots/3-square.jpg',
    mode: 'export',
    width: 960,
    height: 960,
    setup: {
      layoutId: 'sunset-strips', gradeId: 'neon-nights', sizeId: 'square', gradeIntensity: 0.95,
      // The strips are thin slices of the photos: pan each one up to the
      // faces instead of the default mid-frame crops.
      crops: [
        { zoom: 1, panX: 0, panY: 0.8 },
        { zoom: 1, panX: 0, panY: 0.7 },
        { zoom: 1, panX: 0, panY: 0.55 },
        { zoom: 1, panX: 0, panY: 0.1 },
      ],
    },
  },
  {
    id: '4-wide',
    file: 'screenshots/4-wide.jpg',
    mode: 'export',
    width: 1280,
    height: 720,
    setup: {
      layoutId: 'hero-three', gradeId: 'golden-hour', sizeId: 'wide', gradeIntensity: 0.8,
      // The wide hero panel is a thin slice of a portrait photo: pan it up
      // to the subject's face rather than the middle of the frame.
      crops: [
        { zoom: 1, panX: 0, panY: 0.85 },
        { zoom: 1.05, panX: 0, panY: 0.2 },
        { zoom: 1.05, panX: 0, panY: 0.9 },
        { zoom: 1.1, panX: 0.1, panY: 0.1 },
      ],
    },
  },
];

export function shotById(id) {
  return SHOTS.find((s) => s.id === id) || null;
}

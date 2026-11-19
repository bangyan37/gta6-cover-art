// Shot definitions for Leonida Cover Maker.
//
// This module is deliberately free of any browser or Node API so the exact
// same list can drive three different consumers:
//   * the web app, which reads "?shot=" from its address and stages the
//     matching scene (see src/main.js),
//   * the hand-in program main.ts, which renders every shot headlessly and
//     writes the JPEG files into screenshots/,
//   * shots.json at the repository root, which mirrors this list for tools
//     that would rather read plain JSON.
//
// "export" shots are covers at a real post size; the "view" size is the
// largest gate-legal rendering of that export (long side at most 1280 px,
// short side at least 480 px), which is what the screenshot file holds.
// "editor" shots draw the editor itself at view size.

export const SHOT_LIST = [
  {
    file: '1-cover.jpg',
    kind: 'export',
    exportWidth: 1080,
    exportHeight: 1350,
    viewWidth: 1024,
    viewHeight: 1280,
    layout: 'diagonal-six',
    grade: 'vice-sunset',
    gradeStrength: 0.85,
    title: 'LEONIDA NIGHTS',
    subtitle: 'VICE DISTRICT DIARIES',
    photos: ['pier', 'boulevard', 'pier', 'boulevard', 'boulevard', 'pier'],
    decorations: { sun: true, palms: true, sparkles: true },
  },
  {
    file: '2-editor.jpg',
    kind: 'editor',
    exportWidth: 1280,
    exportHeight: 800,
    viewWidth: 1280,
    viewHeight: 800,
    layout: 'diagonal-six',
    grade: 'vice-sunset',
    gradeStrength: 0.85,
    title: 'LEONIDA NIGHTS',
    subtitle: 'VICE DISTRICT DIARIES',
    photos: ['pier', 'boulevard', 'pier', 'boulevard', 'boulevard', 'pier'],
    decorations: { sun: true, palms: true, sparkles: false },
  },
  {
    file: '3-square.jpg',
    kind: 'export',
    exportWidth: 1080,
    exportHeight: 1080,
    viewWidth: 1080,
    viewHeight: 1080,
    layout: 'quad-four',
    grade: 'neon-nights',
    gradeStrength: 0.9,
    title: 'NEON HARBOR',
    subtitle: 'AFTER MIDNIGHT RUNS',
    photos: ['boulevard', 'pier', 'boulevard', 'pier'],
    decorations: { sun: false, palms: true, sparkles: true },
  },
  {
    file: '4-wide.jpg',
    kind: 'export',
    exportWidth: 1920,
    exportHeight: 1080,
    viewWidth: 1280,
    viewHeight: 720,
    layout: 'hero-top',
    grade: 'golden-hour',
    gradeStrength: 0.8,
    // The hero panel is far wider than the portrait sample photos, so
    // the cover crop is panned up toward the subjects' faces.
    panY: -0.5,
    title: 'GOLDEN MILE',
    subtitle: 'ONE LAST SUMMER RIDE',
    photos: ['boulevard', 'pier', 'boulevard', 'pier'],
    decorations: { sun: true, palms: false, sparkles: true },
  },
];

// Find one shot by the file name a screenshot will be saved under.
export function shotByFile(fileName) {
  return SHOT_LIST.find((shot) => shot.file === fileName) ?? null;
}

// Find one shot by its position in the list (0 is the cover).
export function shotByIndex(index) {
  return SHOT_LIST[index] ?? null;
}

// Photo handling for Leonida Cover Maker.
//
// Photos live entirely on the person's machine: files they pick or drop
// are read through object URLs and drawn from <img> elements, never
// uploaded anywhere. This module keeps the library of loaded photos and
// the cover-fit maths that decides which part of a photo shows inside a
// panel of a given shape, zoom and pan.

// The two bundled sample photos, keyed by the ids shots.js uses.
export const SAMPLE_PHOTOS = [
  { id: 'boulevard', label: 'Boulevard sample', url: 'samples/boulevard.jpg' },
  { id: 'pier', label: 'Pier sample', url: 'samples/pier.jpg' },
];

let photoCounter = 0;

export class PhotoLibrary {
  constructor() {
    this.byId = new Map();
  }

  // Register an already-loaded image element under an id.
  add(id, image, label) {
    this.byId.set(id, { id, image, label });
    return id;
  }

  // Load one bundled sample by id; resolves once the image can be drawn.
  loadSample(sampleId) {
    const sample = SAMPLE_PHOTOS.find((entry) => entry.id === sampleId);
    if (!sample) return Promise.reject(new Error(`unknown sample ${sampleId}`));
    if (this.byId.has(sampleId)) return Promise.resolve(sampleId);
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        this.add(sampleId, image, sample.label);
        resolve(sampleId);
      };
      image.onerror = () => reject(new Error(`could not load ${sample.url}`));
      image.src = sample.url;
    });
  }

  // Load every bundled sample; the editor's starting point.
  loadAllSamples() {
    return Promise.all(SAMPLE_PHOTOS.map((sample) => this.loadSample(sample.id)));
  }

  // Read user files into the library; resolves with the new photo ids in
  // the order the files were given. Non-image files are skipped.
  addFiles(fileList) {
    const jobs = [];
    for (const file of fileList) {
      if (!file.type.startsWith('image/')) continue;
      photoCounter += 1;
      const id = `user-${photoCounter}`;
      jobs.push(
        new Promise((resolve) => {
          const image = new Image();
          const url = URL.createObjectURL(file);
          image.onload = () => {
            this.add(id, image, file.name);
            resolve(id);
          };
          image.onerror = () => resolve(null);
          image.src = url;
        }),
      );
    }
    return Promise.all(jobs).then((ids) => ids.filter((id) => id !== null));
  }

  get(photoId) {
    return this.byId.get(photoId) ?? null;
  }

  list() {
    return [...this.byId.values()];
  }
}

// Which rectangle of a photo to draw so it covers a destination box:
// start from the largest centred crop that fills the box, shrink it by
// the panel's zoom, then slide it by the panel's pan (pan is -1..1 of the
// slack on each axis). Returns source x, y, width, height in photo pixels.
export function coverSourceRect(photo, destWidth, destHeight, zoom, panX, panY) {
  const photoAspect = photo.naturalWidth / photo.naturalHeight;
  const destAspect = destWidth / destHeight;
  let cropWidth;
  let cropHeight;
  if (photoAspect > destAspect) {
    cropHeight = photo.naturalHeight;
    cropWidth = cropHeight * destAspect;
  } else {
    cropWidth = photo.naturalWidth;
    cropHeight = cropWidth / destAspect;
  }
  cropWidth /= zoom;
  cropHeight /= zoom;
  const slackX = photo.naturalWidth - cropWidth;
  const slackY = photo.naturalHeight - cropHeight;
  return {
    sx: (slackX / 2) * (1 + panX),
    sy: (slackY / 2) * (1 + panY),
    sw: cropWidth,
    sh: cropHeight,
  };
}

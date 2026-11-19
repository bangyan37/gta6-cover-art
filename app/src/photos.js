// Photo loading: every photo is read on the person's own machine — files they pick or drop are turned
// into object URLs and decoded locally, and the two bundled samples load from app/samples/. Nothing is
// uploaded anywhere; the app makes no network request of its own.

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load image ${url}`));
    img.src = url;
  });
}

/** One bundled sample photo, by file name, as a photo record. */
export async function loadSamplePhoto(fileName, label) {
  const img = await loadImageFromUrl(`samples/${fileName}`);
  return { img, name: label, sample: true };
}

/** The two bundled demo photos the app opens with. */
export async function loadSamplePhotos() {
  return [
    await loadSamplePhoto('boulevard.jpg', 'Demo · Boulevard'),
    await loadSamplePhoto('pier.jpg', 'Demo · Pier'),
  ];
}

/** Reads picked or dropped files into photo records, skipping anything that is not a decodable image. */
export async function readPhotoFiles(fileList) {
  const photos = [];
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) continue;
    try {
      const img = await loadImageFromUrl(URL.createObjectURL(file));
      photos.push({ img, name: file.name, sample: false });
    } catch {
      // A file the browser cannot decode is simply left out.
    }
  }
  return photos;
}

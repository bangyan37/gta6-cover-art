// Photo registry: every picture the cover can use lives here.
//
// Photos come from the person's own machine (file picker or drag-and-drop)
// and are only ever read locally in the browser — nothing is uploaded. The
// two bundled samples are registered at startup so the editor opens with a
// finished-looking cover instead of empty panels.

const registry = new Map();
let counter = 0;

export function registerPhoto(img, name) {
  counter += 1;
  const id = 'photo-' + counter;
  registry.set(id, { id, img, name: name || 'Photo ' + counter });
  return id;
}

export function photoById(id) {
  return registry.get(id) || null;
}

export function allPhotos() {
  return [...registry.values()];
}

// Load an image element from a same-app path (the bundled samples).
export function loadSamplePhoto(path, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(registerPhoto(img, name));
    img.onerror = () => reject(new Error('Could not load sample ' + path));
    img.src = path;
  });
}

// Load a photo the person picked or dropped, straight from their disk.
export function loadPhotoFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type || '')) {
      reject(new Error('That file is not an image'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(registerPhoto(img, file.name || 'Your photo'));
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    img.src = url;
  });
}

// photos.js - getting pictures into the editor.
//
// Three sources, all local: the two bundled samples the app ships
// with, files the user picks, and files dropped onto the stage. Files
// are read with object URLs and never leave the machine; the app makes
// no network requests at all.

(function (root, factory) {
  var api = factory();
  root.LCMPhotos = api;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  var SAMPLES = [
    { name: "boulevard", label: "Boulevard sample", src: "samples/boulevard.jpg" },
    { name: "pier", label: "Pier sample", src: "samples/pier.jpg" }
  ];

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = src;
    });
  }

  // Load the bundled samples; returns [{name, img}] in SAMPLES order.
  function loadSamples() {
    return Promise.all(SAMPLES.map(function (s) {
      return loadImage(s.src).then(function (img) { return { name: s.name, img: img }; });
    }));
  }

  // Turn a File into a photo entry. Object URLs keep big phone photos
  // out of memory-hungry data URLs.
  function photoFromFile(file) {
    var url = URL.createObjectURL(file);
    return loadImage(url).then(function (img) {
      return { name: file.name.replace(/\.[^.]+$/, ""), img: img };
    });
  }

  function photosFromFileList(files) {
    var out = [];
    var chain = Promise.resolve();
    Array.prototype.forEach.call(files, function (f) {
      if (!/^image\//.test(f.type)) return;
      chain = chain.then(function () {
        return photoFromFile(f).then(function (p) { out.push(p); });
      });
    });
    return chain.then(function () { return out; });
  }

  // Wire drag-and-drop onto an element; onPhotos receives photo entries.
  function watchDropzone(el, onPhotos) {
    el.addEventListener("dragover", function (ev) {
      ev.preventDefault();
      el.classList.add("dragging");
    });
    el.addEventListener("dragleave", function () { el.classList.remove("dragging"); });
    el.addEventListener("drop", function (ev) {
      ev.preventDefault();
      el.classList.remove("dragging");
      if (ev.dataTransfer && ev.dataTransfer.files.length) {
        photosFromFileList(ev.dataTransfer.files).then(onPhotos);
      }
    });
  }

  return {
    SAMPLES: SAMPLES,
    loadSamples: loadSamples,
    photoFromFile: photoFromFile,
    photosFromFileList: photosFromFileList,
    watchDropzone: watchDropzone
  };
});

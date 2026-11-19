// main.ts - Leonida Cover Maker, headless edition.
//
//   node main.ts
//
// Regenerates the four screenshots in screenshots/ from the shot
// definitions the web app itself uses (app/src/shots.js, layouts and
// grades likewise shared). Everything is standard-library Node: the
// bundled sample photos are progressive JPEGs, so this file carries
// its own progressive JPEG decoder and encoder, and the caption is
// set with its own TrueType rasteriser reading the bundled Anton
// (app/fonts/Anton-Regular.ttf). Output is deterministic: fixed
// encoder settings, no clocks, no randomness - two runs produce
// byte-identical files.

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const ROOT = __dirname;
const { SHOTS } = require("./app/src/shots.js");
const Layouts = require("./app/src/layouts.js");
const Grades = require("./app/src/grades.js");

// ---------------------------------------------------------------------
// JPEG decoding (baseline + progressive, Huffman, 4:4:4 / 4:2:2 / 4:2:0)
// ---------------------------------------------------------------------

const ZIGZAG = [
  0, 1, 8, 16, 9, 2, 3, 10, 17, 24, 32, 25, 18, 11, 4, 5,
  12, 19, 26, 33, 40, 48, 41, 34, 27, 20, 13, 6, 7, 14,
  21, 28, 35, 42, 49, 56, 57, 50, 43, 36, 29, 22, 15, 23,
  30, 37, 44, 51, 58, 59, 52, 45, 38, 31, 39, 46, 53, 60,
  61, 54, 47, 55, 62, 63
];

function makeHuffman(lengths, symbols) {
  // Canonical Huffman with the first code and first symbol index of
  // each length precomputed, so decoding is a short walk over bits.
  const firstCode = [], firstIndex = [];
  let code = 0, index = 0;
  for (let len = 1; len <= 16; len++) {
    firstCode.push(code);
    firstIndex.push(index);
    index += lengths[len - 1];
    code = (code + lengths[len - 1]) << 1;
  }
  return { lengths, symbols, firstCode, firstIndex };
}

class BitReader {
  constructor(buf, start, end) {
    this.buf = buf;
    this.pos = start;
    this.end = end;
    this.acc = 0;      // bit accumulator
    this.bits = 0;     // valid bits in acc
    this.marker = -1;  // pending marker byte (after 0xFF), or -1
  }
  // Next data byte, unstuffing FF00 and parking real markers.
  nextByte() {
    if (this.pos >= this.end) return 0xFF;
    const b = this.buf[this.pos];
    if (b !== 0xFF) { this.pos++; return b; }
    const n = this.pos + 1 < this.end ? this.buf[this.pos + 1] : 0;
    if (n === 0x00) { this.pos += 2; return 0xFF; }
    if (n === 0xFF) { this.pos++; return 0xFF; } // fill byte
    this.marker = n; // leave pos on the 0xFF; padding bits are 1s
    return 0xFF;
  }
  fill() {
    while (this.bits <= 16) {
      const b = this.nextByte();
      this.acc = (this.acc << 8) | b;
      this.bits += 8;
    }
  }
  read(n) {
    if (n === 0) return 0;
    this.fill();
    this.bits -= n;
    return (this.acc >>> this.bits) & ((1 << n) - 1);
  }
  readBit() { return this.read(1); }
  // At a restart boundary: drop the partial byte and step over the
  // RST marker if one is parked.
  restart() {
    this.bits = 0;
    this.acc = 0;
    if (this.marker >= 0xD0 && this.marker <= 0xD7) {
      this.pos += 2;
      this.marker = -1;
    }
  }
  decode(table) {
    let code = 0;
    for (let len = 1; len <= 16; len++) {
      code = (code << 1) | this.readBit();
      const count = table.lengths[len - 1];
      const base = table.firstCode[len - 1];
      if (count > 0 && code >= base && code < base + count) {
        return table.symbols[table.firstIndex[len - 1] + (code - base)];
      }
    }
    throw new Error("bad Huffman code");
  }
}

function extend(v, n) {
  // JPEG sign extension for a received n-bit value.
  if (v < (1 << (n - 1))) return v - ((1 << n) - 1);
  return v;
}

function parseJPEG(buf) {
  const frame = { w: 0, h: 0, comps: [], progressive: false };
  const qtables = {};
  const htables = { dc: {}, ac: {} };
  let restartInterval = 0;
  let i = 2; // skip SOI
  const scans = [];
  while (i < buf.length - 1) {
    if (buf[i] !== 0xFF) { i++; continue; }
    const m = buf[i + 1];
    if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
    if (m === 0xD9) break;
    const len = buf.readUInt16BE(i + 2);
    const seg = i + 4, segEnd = i + 2 + len;
    if (m === 0xDB) {
      let p = seg;
      while (p < segEnd) {
        const pq = buf[p] >> 4, tq = buf[p] & 15;
        const size = pq === 0 ? 1 : 2;
        const table = new Int32Array(64);
        for (let k = 0; k < 64; k++) {
          table[ZIGZAG[k]] = size === 1 ? buf[p + 1 + k] : buf.readUInt16BE(p + 1 + k * 2);
        }
        qtables[tq] = table;
        p += 1 + 64 * size;
      }
    } else if (m === 0xC4) {
      let p = seg;
      while (p < segEnd) {
        const cls = buf[p] >> 4, id = buf[p] & 15;
        const lengths = Array.from(buf.subarray(p + 1, p + 17));
        const total = lengths.reduce((a, b) => a + b, 0);
        const symbols = Array.from(buf.subarray(p + 17, p + 17 + total));
        (cls === 0 ? htables.dc : htables.ac)[id] = makeHuffman(lengths, symbols);
        p += 17 + total;
      }
    } else if (m === 0xC0 || m === 0xC2) {
      frame.progressive = m === 0xC2;
      frame.h = buf.readUInt16BE(seg + 1);
      frame.w = buf.readUInt16BE(seg + 3);
      const n = buf[seg + 5];
      let hmax = 1, vmax = 1;
      for (let c = 0; c < n; c++) {
        const id = buf[seg + 6 + c * 3];
        const hv = buf[seg + 7 + c * 3];
        const comp = { id, h: hv >> 4, v: hv & 15, tq: buf[seg + 8 + c * 3] };
        frame.comps.push(comp);
        if (comp.h > hmax) hmax = comp.h;
        if (comp.v > vmax) vmax = comp.v;
      }
      frame.hmax = hmax; frame.vmax = vmax;
      for (const comp of frame.comps) {
        comp.blocksWide = Math.ceil(frame.w * comp.h / hmax / 8);
        comp.blocksHigh = Math.ceil(frame.h * comp.v / vmax / 8);
        comp.coefs = new Int32Array(comp.blocksWide * comp.blocksHigh * 64);
        comp.pred = 0;
      }
    } else if (m === 0xDD) {
      restartInterval = buf.readUInt16BE(seg);
    } else if (m === 0xDA) {
      const ns = buf[seg];
      const scomps = [];
      for (let c = 0; c < ns; c++) {
        const id = buf[seg + 1 + c * 2];
        const tt = buf[seg + 2 + c * 2];
        scomps.push({ comp: frame.comps.find((x) => x.id === id), td: tt >> 4, ta: tt & 15 });
      }
      const ss = buf[seg + 1 + ns * 2], se = buf[seg + 2 + ns * 2];
      const ah = buf[seg + 3 + ns * 2] >> 4, al = buf[seg + 3 + ns * 2] & 15;
      // scan data runs until the next real marker
      let j = segEnd;
      while (j < buf.length - 1) {
        if (buf[j] === 0xFF && buf[j + 1] !== 0x00 && buf[j + 1] !== 0xFF) break;
        j += buf[j] === 0xFF ? 2 : 1;
      }
      // Snapshot the Huffman tables as they stand at this scan:
      // encoders may redefine a table id between scans, and later
      // definitions must not reach back into earlier scans.
      scans.push({
        scomps, ss, se, ah, al, dataStart: segEnd, dataEnd: j,
        htables: { dc: { ...htables.dc }, ac: { ...htables.ac } },
        restartInterval
      });
      i = j;
      continue;
    }
    i = segEnd;
  }
  return { frame, qtables, htables, restartInterval, scans };
}

function decodeScan(scan, ctx) {
  const { frame, qtables } = ctx;
  const htables = scan.htables;
  const restartInterval = scan.restartInterval;
  const br = new BitReader(ctx.buf, scan.dataStart, scan.dataEnd);
  const interleaved = scan.scomps.length > 1;
  let eobrun = 0;

  function correct(coefs, base, k, p1) {
    // One correction bit for an already-nonzero coefficient.
    const idx = base + k;
    if (br.readBit() && (coefs[idx] & p1) === 0) {
      coefs[idx] += coefs[idx] > 0 ? p1 : -p1;
    }
  }

  function decodeBlockDCFirst(sc, blockIdx) {
    const coefs = sc.comp.coefs;
    const s = br.decode(htables.dc[sc.td]);
    let diff = 0;
    if (s > 0) diff = extend(br.read(s), s);
    sc.comp.pred += diff;
    coefs[blockIdx * 64] = sc.comp.pred << scan.al;
  }

  function decodeBlockDCRefine(sc, blockIdx) {
    const coefs = sc.comp.coefs;
    const p1 = 1 << scan.al;
    const idx = blockIdx * 64;
    if (br.readBit() && (coefs[idx] & p1) === 0) {
      coefs[idx] += coefs[idx] >= 0 ? p1 : -p1;
    }
  }

  function decodeBlockACFirst(sc, blockIdx) {
    const coefs = sc.comp.coefs;
    const base = blockIdx * 64;
    if (eobrun > 0) { eobrun--; return; }
    let k = scan.ss;
    while (k <= scan.se) {
      const rs = br.decode(htables.ac[sc.ta]);
      const r = rs >> 4, s = rs & 15;
      if (s === 0) {
        if (r < 15) { eobrun = (1 << r) + br.read(r) - 1; return; }
        k += 16;
        continue;
      }
      k += r;
      if (k > scan.se) break;
      coefs[base + ZIGZAG[k]] = extend(br.read(s), s) << scan.al;
      k++;
    }
  }

  function decodeBlockACRefine(sc, blockIdx) {
    const coefs = sc.comp.coefs;
    const base = blockIdx * 64;
    const p1 = 1 << scan.al, m1 = -p1;
    if (eobrun > 0) {
      eobrun--;
      for (let k = scan.ss; k <= scan.se; k++) {
        if (coefs[base + ZIGZAG[k]] !== 0) correct(coefs, base, ZIGZAG[k], p1);
      }
      return;
    }
    let k = scan.ss;
    while (k <= scan.se) {
      const rs = br.decode(htables.ac[sc.ta]);
      const r = rs >> 4, s = rs & 15;
      if (s === 0) {
        if (r < 15) {
          eobrun = (1 << r) + br.read(r);
          // corrections for the rest of this block's band
          for (let kk = k; kk <= scan.se; kk++) {
            if (coefs[base + ZIGZAG[kk]] !== 0) correct(coefs, base, ZIGZAG[kk], p1);
          }
          eobrun--; // this block is the run's first member
          return;
        }
        // ZRL in a refinement scan: pass 16 coefficients, correcting
        // the nonzero ones on the way.
        let left = 16;
        while (left > 0 && k <= scan.se) {
          const idx = base + ZIGZAG[k];
          if (coefs[idx] !== 0) correct(coefs, base, ZIGZAG[k], p1);
          else left--;
          k++;
        }
        continue;
      }
      if (s !== 1) throw new Error("bad size in AC refinement");
      const sign = br.readBit() ? p1 : m1;
      // Place a new coefficient after r still-zero coefficients.
      let run = r;
      while (k <= scan.se) {
        const idx = base + ZIGZAG[k];
        if (coefs[idx] !== 0) {
          correct(coefs, base, ZIGZAG[k], p1);
        } else {
          if (run === 0) break;
          run--;
        }
        k++;
      }
      if (k <= scan.se) {
        coefs[base + ZIGZAG[k]] = sign;
        k++;
      }
    }
  }

  function decodeBlock(sc, blockIdx) {
    if (scan.ss === 0) {
      if (scan.ah === 0) decodeBlockDCFirst(sc, blockIdx);
      else decodeBlockDCRefine(sc, blockIdx);
      // DC-only scans carry no AC in this pass for progressive files;
      // baseline files pack DC and AC in one scan - handled below by
      // decodeBlockBaseline when the frame is not progressive.
    } else {
      if (scan.ah === 0) decodeBlockACFirst(sc, blockIdx);
      else decodeBlockACRefine(sc, blockIdx);
    }
  }

  function decodeBlockBaseline(sc, blockIdx) {
    decodeBlockDCFirst(sc, blockIdx);
    const coefs = sc.comp.coefs;
    const base = blockIdx * 64;
    let k = 1;
    while (k < 64) {
      const rs = br.decode(htables.ac[sc.ta]);
      const r = rs >> 4, s = rs & 15;
      if (s === 0) {
        if (r < 15) break;
        k += 16;
        continue;
      }
      k += r;
      if (k > 63) break;
      coefs[base + ZIGZAG[k]] = extend(br.read(s), s);
      k++;
    }
  }

  const decodeOne = frame.progressive ? decodeBlock : decodeBlockBaseline;

  if (interleaved) {
    const mcusX = Math.ceil(frame.w / (8 * frame.hmax));
    const mcusY = Math.ceil(frame.h / (8 * frame.vmax));
    let count = 0;
    for (let my = 0; my < mcusY; my++) {
      for (let mx = 0; mx < mcusX; mx++) {
        if (restartInterval > 0 && count > 0 && count % restartInterval === 0) {
          br.restart();
          eobrun = 0;
          for (const sc of scan.scomps) sc.comp.pred = 0;
        }
        count++;
        for (const sc of scan.scomps) {
          for (let v = 0; v < sc.comp.v; v++) {
            for (let h = 0; h < sc.comp.h; h++) {
              const bx = mx * sc.comp.h + h;
              const by = my * sc.comp.v + v;
              if (bx < sc.comp.blocksWide && by < sc.comp.blocksHigh) {
                decodeOne(sc, by * sc.comp.blocksWide + bx);
              } else {
                // Padding block past the image edge: it still has to
                // be decoded to stay in sync, but into a scratch block
                // so real coefficients survive; DC prediction is part
                // of the stream, so it is saved and restored too.
                const savedCoefs = sc.comp.coefs;
                const savedPred = sc.comp.pred;
                sc.comp.coefs = new Int32Array(64);
                decodeOne(sc, 0);
                sc.comp.coefs = savedCoefs;
                sc.comp.pred = savedPred;
              }
            }
          }
        }
      }
    }
  } else {
    const sc = scan.scomps[0];
    const total = sc.comp.blocksWide * sc.comp.blocksHigh;
    for (let b = 0; b < total; b++) {
      if (restartInterval > 0 && b > 0 && b % restartInterval === 0) {
        br.restart();
        eobrun = 0;
        sc.comp.pred = 0;
      }
      decodeOne(sc, b);
    }
  }
  void qtables;
}

// One 8x8 block: dequantise and IDCT into `out` (row-major floats).
const COS = [];
for (let u = 0; u < 8; u++) {
  COS.push([]);
  for (let x = 0; x < 8; x++) COS[u].push(Math.cos((2 * x + 1) * u * Math.PI / 16));
}
function idctBlock(coefs, base, qtable, out) {
  const tmp = new Float64Array(64);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      let sum = 0;
      for (let u = 0; u < 8; u++) {
        const cu = u === 0 ? Math.SQRT1_2 : 1;
        sum += cu * coefs[base + y * 8 + u] * qtable[y * 8 + u] * COS[u][x];
      }
      tmp[y * 8 + x] = sum * 0.5;
    }
  }
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      let sum = 0;
      for (let v = 0; v < 8; v++) {
        const cv = v === 0 ? Math.SQRT1_2 : 1;
        sum += cv * tmp[v * 8 + x] * COS[v][y];
      }
      out[y * 8 + x] = sum * 0.5 + 128;
    }
  }
}

function decodeJPEG(buf) {
  const parsed = parseJPEG(buf);
  const { frame, qtables } = parsed;
  for (const scan of parsed.scans) decodeScan(scan, { ...parsed, buf });

  // Assemble component planes at their own resolutions.
  const planes = frame.comps.map((comp) => {
    const w = comp.blocksWide * 8, h = comp.blocksHigh * 8;
    const data = new Float64Array(w * h);
    const block = new Float64Array(64);
    for (let by = 0; by < comp.blocksHigh; by++) {
      for (let bx = 0; bx < comp.blocksWide; bx++) {
        idctBlock(comp.coefs, (by * comp.blocksWide + bx) * 64, qtables[comp.tq], block);
        for (let y = 0; y < 8; y++) {
          for (let x = 0; x < 8; x++) {
            data[(by * 8 + y) * w + bx * 8 + x] = block[y * 8 + x];
          }
        }
      }
    }
    return { w, h, data, hRatio: comp.h / frame.hmax, vRatio: comp.v / frame.vmax };
  });

  // Upsample (bilinear) to full size and convert YCbCr -> RGB.
  const W = frame.w, H = frame.h;
  const out = new Uint8ClampedArray(W * H * 3);
  function sample(plane, fx, fy) {
    const sx = Math.min(plane.w - 1, Math.max(0, fx * plane.w - 0.5));
    const sy = Math.min(plane.h - 1, Math.max(0, fy * plane.h - 0.5));
    const x0 = Math.floor(sx), y0 = Math.floor(sy);
    const x1 = Math.min(plane.w - 1, x0 + 1), y1 = Math.min(plane.h - 1, y0 + 1);
    const tx = sx - x0, ty = sy - y0;
    const d = plane.data;
    const top = d[y0 * plane.w + x0] * (1 - tx) + d[y0 * plane.w + x1] * tx;
    const bot = d[y1 * plane.w + x0] * (1 - tx) + d[y1 * plane.w + x1] * tx;
    return top * (1 - ty) + bot * ty;
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fx = (x + 0.5) / W, fy = (y + 0.5) / H;
      const yy = sample(planes[0], fx, fy);
      let r = yy, g = yy, b = yy;
      if (planes.length >= 3) {
        const cb = sample(planes[1], fx, fy) - 128;
        const cr = sample(planes[2], fx, fy) - 128;
        r = yy + 1.402 * cr;
        g = yy - 0.34414 * cb - 0.71414 * cr;
        b = yy + 1.772 * cb;
      }
      const o = (y * W + x) * 3;
      out[o] = r; out[o + 1] = g; out[o + 2] = b;
    }
  }
  return { width: W, height: H, data: out };
}

// ---------------------------------------------------------------------
// JPEG encoding (baseline, 4:2:0, standard tables, quality-scaled)
// ---------------------------------------------------------------------

const STD_LUM_Q = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99
];
const STD_CHR_Q = [
  17, 18, 24, 47, 99, 99, 99, 99,
  18, 21, 26, 66, 99, 99, 99, 99,
  24, 26, 56, 99, 99, 99, 99, 99,
  47, 66, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99
];
// Standard Annex K Huffman tables.
const DC_L_BITS = [0, 1, 5, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0];
const DC_L_VALS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const DC_C_BITS = [0, 3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0];
const DC_C_VALS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const AC_L_BITS = [0, 2, 1, 3, 3, 2, 4, 3, 5, 5, 4, 4, 0, 0, 1, 0x7D];
const AC_L_VALS = [
  0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61,
  0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08, 0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52,
  0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25,
  0x26, 0x27, 0x28, 0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
  0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x63, 0x64,
  0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A, 0x83,
  0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99,
  0x9A, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
  0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA, 0xD2, 0xD3,
  0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8,
  0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA
];
const AC_C_BITS = [0, 2, 1, 2, 4, 4, 3, 4, 7, 5, 4, 4, 0, 1, 2, 0x77];
const AC_C_VALS = [
  0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61,
  0x71, 0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xA1, 0xB1, 0xC1, 0x09, 0x23, 0x33,
  0x52, 0xF0, 0x15, 0x62, 0x72, 0xD1, 0x0A, 0x16, 0x24, 0x34, 0xE1, 0x25, 0xF1, 0x17, 0x18,
  0x19, 0x1A, 0x26, 0x27, 0x28, 0x29, 0x2A, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44,
  0x45, 0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5A, 0x63,
  0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7A,
  0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97,
  0x98, 0x99, 0x9A, 0xA2, 0xA3, 0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4,
  0xB5, 0xB6, 0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9, 0xCA,
  0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE2, 0xE3, 0xE4, 0xE5, 0xE6, 0xE7,
  0xE8, 0xE9, 0xEA, 0xF2, 0xF3, 0xF4, 0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA
];

function buildCodes(bits, vals) {
  const map = new Map();
  let code = 0, k = 0;
  for (let len = 1; len <= 16; len++) {
    for (let n = 0; n < bits[len - 1]; n++) {
      map.set(vals[k++], { code, len });
      code++;
    }
    code <<= 1;
  }
  return map;
}

function scaleQuant(base, quality) {
  const q = Math.max(1, Math.min(100, quality));
  const scale = q < 50 ? 5000 / q : 200 - q * 2;
  return base.map((v) => Math.max(1, Math.min(255, Math.floor((v * scale + 50) / 100))));
}

class BitWriter {
  constructor() { this.bytes = []; this.acc = 0; this.bits = 0; }
  write(code, len) {
    this.acc = (this.acc << len) | code;
    this.bits += len;
    while (this.bits >= 8) {
      this.bits -= 8;
      const b = (this.acc >>> this.bits) & 0xFF;
      this.bytes.push(b);
      if (b === 0xFF) this.bytes.push(0);
    }
  }
  flush() {
    if (this.bits > 0) {
      const pad = 8 - this.bits;
      const b = ((this.acc << pad) | ((1 << pad) - 1)) & 0xFF;
      this.bytes.push(b);
      if (b === 0xFF) this.bytes.push(0);
      this.bits = 0;
    }
  }
}

function fdctQuant(block, qtable, out) {
  // block: 64 level-shifted samples; out: quantised coefficients,
  // both in natural (row-major) order.
  for (let v = 0; v < 8; v++) {
    for (let u = 0; u < 8; u++) {
      let sum = 0;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) {
          sum += block[y * 8 + x] * COS[u][x] * COS[v][y];
        }
      }
      const cu = u === 0 ? Math.SQRT1_2 : 1;
      const cv = v === 0 ? Math.SQRT1_2 : 1;
      out[v * 8 + u] = Math.round(sum * 0.25 * cu * cv / qtable[v * 8 + u]);
    }
  }
}

function encodeJPEG(img, quality) {
  const W = img.width, H = img.height;
  const qLum = scaleQuant(STD_LUM_Q, quality);
  const qChr = scaleQuant(STD_CHR_Q, quality);
  const dcL = buildCodes(DC_L_BITS, DC_L_VALS), acL = buildCodes(AC_L_BITS, AC_L_VALS);
  const dcC = buildCodes(DC_C_BITS, DC_C_VALS), acC = buildCodes(AC_C_BITS, AC_C_VALS);

  // RGB -> YCbCr planes; chroma subsampled 2x2 by box average.
  const yPlane = new Float64Array(W * H);
  const cbFull = new Float64Array(W * H), crFull = new Float64Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const r = img.data[i * 3], g = img.data[i * 3 + 1], b = img.data[i * 3 + 2];
    yPlane[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    cbFull[i] = -0.168736 * r - 0.331264 * g + 0.5 * b + 128;
    crFull[i] = 0.5 * r - 0.418688 * g - 0.081312 * b + 128;
  }
  const cw = Math.ceil(W / 2), ch = Math.ceil(H / 2);
  const cbPlane = new Float64Array(cw * ch), crPlane = new Float64Array(cw * ch);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      let sb = 0, sr = 0, n = 0;
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const sx = Math.min(W - 1, x * 2 + dx), sy = Math.min(H - 1, y * 2 + dy);
          sb += cbFull[sy * W + sx]; sr += crFull[sy * W + sx]; n++;
        }
      }
      cbPlane[y * cw + x] = sb / n;
      crPlane[y * cw + x] = sr / n;
    }
  }

  const bw = new BitWriter();
  const preds = [0, 0, 0];
  const block = new Float64Array(64);
  const coefs = new Int32Array(64);

  function encodeBlock(plane, pw, bx, by, qtable, dcMap, acMap, ci) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const sx = Math.min(pw - 1, bx * 8 + x);
        const sy = Math.min((plane === yPlane ? H : ch) - 1, by * 8 + y);
        block[y * 8 + x] = plane[sy * pw + sx] - 128;
      }
    }
    fdctQuant(block, qtable, coefs);
    // DC
    const diff = coefs[0] - preds[ci];
    preds[ci] = coefs[0];
    const size = diff === 0 ? 0 : 32 - Math.clz32(Math.abs(diff));
    const dcSym = dcMap.get(size);
    bw.write(dcSym.code, dcSym.len);
    if (size > 0) {
      bw.write(diff > 0 ? diff : diff + (1 << size) - 1, size);
    }
    // AC, zigzag order
    let run = 0;
    for (let k = 1; k < 64; k++) {
      const val = coefs[ZIGZAG[k]];
      if (val === 0) { run++; continue; }
      while (run > 15) {
        const zrl = acMap.get(0xF0);
        bw.write(zrl.code, zrl.len);
        run -= 16;
      }
      const s = 32 - Math.clz32(Math.abs(val));
      const sym = acMap.get((run << 4) | s);
      bw.write(sym.code, sym.len);
      bw.write(val > 0 ? val : val + (1 << s) - 1, s);
      run = 0;
    }
    if (run > 0) {
      const eob = acMap.get(0);
      bw.write(eob.code, eob.len);
    }
  }

  const mcusX = Math.ceil(W / 16), mcusY = Math.ceil(H / 16);
  for (let my = 0; my < mcusY; my++) {
    for (let mx = 0; mx < mcusX; mx++) {
      for (let v = 0; v < 2; v++) {
        for (let h = 0; h < 2; h++) {
          encodeBlock(yPlane, W, mx * 2 + h, my * 2 + v, qLum, dcL, acL, 0);
        }
      }
      encodeBlock(cbPlane, cw, mx, my, qChr, dcC, acC, 1);
      encodeBlock(crPlane, cw, mx, my, qChr, dcC, acC, 2);
    }
  }
  bw.flush();

  const out = [];
  function marker(m2, payload) {
    out.push(0xFF, m2);
    if (payload) {
      out.push((payload.length + 2) >> 8, (payload.length + 2) & 0xFF, ...payload);
    }
  }
  function quantPayload(table, id) {
    const p = [id];
    for (let k = 0; k < 64; k++) p.push(table[ZIGZAG[k]]);
    return p;
  }
  function huffPayload(bits, vals, id) {
    return [id, ...bits, ...vals];
  }
  out.push(0xFF, 0xD8);
  marker(0xE0, [0x4A, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  marker(0xDB, quantPayload(qLum, 0));
  marker(0xDB, quantPayload(qChr, 1));
  marker(0xC0, [
    8, H >> 8, H & 0xFF, W >> 8, W & 0xFF, 3,
    1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1
  ]);
  marker(0xC4, huffPayload(DC_L_BITS, DC_L_VALS, 0x00));
  marker(0xC4, huffPayload(AC_L_BITS, AC_L_VALS, 0x10));
  marker(0xC4, huffPayload(DC_C_BITS, DC_C_VALS, 0x01));
  marker(0xC4, huffPayload(AC_C_BITS, AC_C_VALS, 0x11));
  marker(0xDA, [3, 1, 0x00, 2, 0x11, 3, 0x11, 0, 63, 0]);
  return Buffer.concat([
    Buffer.from(out),
    Buffer.from(bw.bytes),
    Buffer.from([0xFF, 0xD9])
  ]);
}

// Encode at the highest quality whose output fits the byte budget;
// the step ladder is fixed, so the choice is deterministic.
function encodeFitting(img, budget) {
  for (const q of [88, 84, 80, 76, 72, 68, 64, 60, 55, 50, 45, 40]) {
    const encoded = encodeJPEG(img, q);
    if (encoded.length <= budget) return encoded;
  }
  return encodeJPEG(img, 35);
}

// ---------------------------------------------------------------------
// TrueType rasteriser (glyf outlines, quadratic curves, nonzero fill)
// ---------------------------------------------------------------------

class Font {
  constructor(buf) {
    this.buf = buf;
    const numTables = buf.readUInt16BE(4);
    this.tables = {};
    for (let i = 0; i < numTables; i++) {
      const off = 12 + i * 16;
      const tag = buf.toString("ascii", off, off + 4);
      this.tables[tag] = { off: buf.readUInt32BE(off + 8), len: buf.readUInt32BE(off + 12) };
    }
    const head = this.tables.head.off;
    this.unitsPerEm = buf.readUInt16BE(this.tables.head.off + 18);
    this.indexToLocFormat = buf.readInt16BE(head + 50);
    this.numGlyphs = buf.readUInt16BE(this.tables.maxp.off + 4);
    this.numHMetrics = buf.readUInt16BE(this.tables.hhea.off + 34);
    this.parseCmap();
  }
  parseCmap() {
    const base = this.tables.cmap.off;
    const n = this.buf.readUInt16BE(base + 2);
    let fmt4 = -1, fmt12 = -1;
    for (let i = 0; i < n; i++) {
      const platform = this.buf.readUInt16BE(base + 4 + i * 8);
      const encoding = this.buf.readUInt16BE(base + 6 + i * 8);
      const off = this.buf.readUInt32BE(base + 8 + i * 8);
      const format = this.buf.readUInt16BE(base + off);
      if (format === 12 && fmt12 < 0) fmt12 = base + off;
      if (format === 4 && (platform === 3 || platform === 0) && fmt4 < 0) fmt4 = base + off;
      void encoding;
    }
    this.cmap12 = fmt12;
    this.cmap4 = fmt4;
  }
  glyphIndex(code) {
    const buf = this.buf;
    if (this.cmap12 >= 0) {
      const base = this.cmap12;
      const n = buf.readUInt32BE(base + 12);
      let lo = 0, hi = n - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const off = base + 16 + mid * 12;
        const start = buf.readUInt32BE(off), end = buf.readUInt32BE(off + 4);
        if (code < start) hi = mid - 1;
        else if (code > end) lo = mid + 1;
        else return buf.readUInt32BE(off + 8) + (code - start);
      }
      return 0;
    }
    if (this.cmap4 >= 0) {
      const base = this.cmap4;
      const segCount = buf.readUInt16BE(base + 6) / 2;
      const endOff = base + 14;
      let seg = -1;
      for (let i = 0; i < segCount; i++) {
        if (buf.readUInt16BE(endOff + i * 2) >= code) { seg = i; break; }
      }
      if (seg < 0) return 0;
      const startOff = endOff + segCount * 2 + 2;
      const start = buf.readUInt16BE(startOff + seg * 2);
      if (code < start) return 0;
      const deltaOff = startOff + segCount * 2;
      const delta = buf.readInt16BE(deltaOff + seg * 2);
      const rangeOff = deltaOff + segCount * 2;
      const rangeAddr = rangeOff + seg * 2;
      const ro = buf.readUInt16BE(rangeAddr);
      if (ro === 0) return (code + delta) & 0xFFFF;
      const glyphAddr = rangeAddr + ro + (code - start) * 2;
      const gid = buf.readUInt16BE(glyphAddr);
      return gid === 0 ? 0 : (gid + delta) & 0xFFFF;
    }
    return 0;
  }
  advance(gid) {
    const hmtx = this.tables.hmtx.off;
    const g = Math.min(gid, this.numHMetrics - 1);
    return this.buf.readUInt16BE(hmtx + g * 4);
  }
  glyphOffset(gid) {
    const loca = this.tables.loca.off;
    const glyf = this.tables.glyf.off;
    if (this.indexToLocFormat === 1) {
      const a = this.buf.readUInt32BE(loca + gid * 4);
      const b = this.buf.readUInt32BE(loca + (gid + 1) * 4);
      return a === b ? -1 : glyf + a;
    }
    const a = this.buf.readUInt16BE(loca + gid * 2) * 2;
    const b = this.buf.readUInt16BE(loca + (gid + 1) * 2) * 2;
    return a === b ? -1 : glyf + a;
  }
  // Flattened outline: array of contours, each an array of [x, y]
  // points (font units, y up) with curves already subdivided.
  outline(gid, depth) {
    const off = this.glyphOffset(gid);
    if (off < 0 || depth > 4) return [];
    const buf = this.buf;
    const numContours = buf.readInt16BE(off);
    if (numContours < 0) {
      // Composite glyph: gather transformed component outlines.
      let p = off + 10;
      let contours = [];
      for (;;) {
        const flags = buf.readUInt16BE(p);
        const compGid = buf.readUInt16BE(p + 2);
        p += 4;
        let dx, dy;
        if (flags & 0x0001) {
          dx = buf.readInt16BE(p); dy = buf.readInt16BE(p + 2); p += 4;
        } else {
          dx = buf.readInt8(p); dy = buf.readInt8(p + 1); p += 2;
        }
        let scale = 1;
        if (flags & 0x0008) { scale = buf.readInt16BE(p) / 16384; p += 2; }
        else if (flags & 0x0040) { p += 4; }
        else if (flags & 0x0080) { p += 8; }
        const sub = this.outline(compGid, depth + 1);
        for (const contour of sub) {
          contours.push(contour.map(([x, y]) => [x * scale + dx, y * scale + dy]));
        }
        if (!(flags & 0x0020)) break;
      }
      return contours;
    }
    const endPts = [];
    for (let i = 0; i < numContours; i++) endPts.push(buf.readUInt16BE(off + 10 + i * 2));
    const total = numContours ? endPts[numContours - 1] + 1 : 0;
    let p = off + 10 + numContours * 2 + 2 + buf.readUInt16BE(off + 10 + numContours * 2);
    const flagsArr = [];
    while (flagsArr.length < total) {
      const f = buf[p++];
      flagsArr.push(f);
      if (f & 0x08) {
        const rep = buf[p++];
        for (let i = 0; i < rep; i++) flagsArr.push(f);
      }
    }
    const xs = [], ys = [];
    let x = 0, y = 0;
    // Short deltas are unsigned bytes whose sign lives in the
    // "same-or-positive" flag bit; long deltas are signed words, and
    // a set same-or-positive bit with no short bit means delta zero.
    for (let i = 0; i < total; i++) {
      const f = flagsArr[i];
      if (f & 0x02) { const b = buf[p++]; x += (f & 0x10) ? b : -b; }
      else if (!(f & 0x10)) { x += buf.readInt16BE(p); p += 2; }
      xs.push(x);
    }
    for (let i = 0; i < total; i++) {
      const f = flagsArr[i];
      if (f & 0x04) { const b = buf[p++]; y += (f & 0x20) ? b : -b; }
      else if (!(f & 0x20)) { y += buf.readInt16BE(p); p += 2; }
      ys.push(y);
    }
    const contours = [];
    let startIdx = 0;
    for (let c = 0; c < numContours; c++) {
      const pts = [];
      for (let i = startIdx; i <= endPts[c]; i++) {
        pts.push({ x: xs[i], y: ys[i], on: !!(flagsArr[i] & 0x01) });
      }
      startIdx = endPts[c] + 1;
      contours.push(flattenContour(pts));
    }
    return contours;
  }
}

function flattenContour(pts) {
  // Walk the on/off-curve point ring, emitting line points and
  // subdividing quadratic segments into 8 chords.
  const out = [];
  const n = pts.length;
  if (n === 0) return out;
  let start;
  if (pts[0].on) start = pts[0];
  else if (pts[n - 1].on) start = pts[n - 1];
  else start = { x: (pts[0].x + pts[n - 1].x) / 2, y: (pts[0].y + pts[n - 1].y) / 2 };
  out.push([start.x, start.y]);
  let prev = start;
  const seq = [];
  for (let i = 0; i < n; i++) seq.push(pts[i]);
  if (pts[0].on) seq.push(pts[0]);
  let i = pts[0].on ? 1 : 0;
  let guard = 0;
  while (i < seq.length && guard++ < 10000) {
    const cur = seq[i];
    if (cur.on) {
      out.push([cur.x, cur.y]);
      prev = cur;
      i++;
    } else {
      const next = seq[(i + 1) % seq.length] || cur;
      let end;
      if (next.on) { end = next; i += 2; }
      else {
        end = { x: (cur.x + next.x) / 2, y: (cur.y + next.y) / 2 };
        i += 1;
      }
      for (let s = 1; s <= 8; s++) {
        const t = s / 8, mt = 1 - t;
        out.push([
          mt * mt * prev.x + 2 * mt * t * cur.x + t * t * end.x,
          mt * mt * prev.y + 2 * mt * t * cur.y + t * t * end.y
        ]);
      }
      prev = end;
    }
  }
  return out;
}

// Measure a string in font units, with letter spacing in ems.
function measureText(font, text, spacingEm) {
  let width = 0;
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    width += font.advance(font.glyphIndex(chars[i].codePointAt(0)));
    if (i < chars.length - 1) width += spacingEm * font.unitsPerEm;
  }
  return width;
}

// Rasterise a string into an alpha mask {w, h, data:Uint8Array} whose
// origin is the text's left edge at the baseline. Scanline fill with
// the nonzero winding rule, supersampled 3x vertically.
function textMask(font, text, px, spacingEm) {
  const scale = px / font.unitsPerEm;
  const widthFU = measureText(font, text, spacingEm);
  const w = Math.max(1, Math.ceil(widthFU * scale));
  const h = Math.ceil(px * 1.32);
  const baseline = px * 1.02;
  // Collect transformed edges: [x1, y1, x2, y2] in mask pixels, y down.
  const edges = [];
  let penX = 0;
  for (const ch of text) {
    const gid = font.glyphIndex(ch.codePointAt(0));
    const contours = font.outline(gid, 0);
    for (const contour of contours) {
      for (let i = 0; i < contour.length; i++) {
        const [ax, ay] = contour[i];
        const [bx, by] = contour[(i + 1) % contour.length];
        edges.push([
          (penX + ax) * scale, baseline - ay * scale,
          (penX + bx) * scale, baseline - by * scale
        ]);
      }
    }
    penX += font.advance(gid) + spacingEm * font.unitsPerEm;
  }
  const SS = 3;
  const data = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    let covered = 0;
    // accumulate per-x coverage over subrows
    const cov = new Float32Array(w);
    for (let s = 0; s < SS; s++) {
      const yy = y + (s + 0.5) / SS;
      const crossings = [];
      for (const [x1, y1, x2, y2] of edges) {
        if ((y1 <= yy && y2 > yy) || (y2 <= yy && y1 > yy)) {
          const t = (yy - y1) / (y2 - y1);
          crossings.push({ x: x1 + t * (x2 - x1), dir: y2 > y1 ? 1 : -1 });
        }
      }
      crossings.sort((a, b) => a.x - b.x);
      let winding = 0, prevX = 0;
      for (const c of crossings) {
        if (winding !== 0) {
          const from = Math.max(0, Math.floor(prevX));
          const to = Math.min(w - 1, Math.floor(c.x));
          for (let x = from; x <= to; x++) cov[x] += 1;
        }
        winding += c.dir;
        prevX = c.x;
      }
    }
    for (let x = 0; x < w; x++) {
      if (cov[x] > 0) data[y * w + x] = Math.min(255, Math.round(cov[x] / SS * 255));
      covered += cov[x];
    }
    void covered;
  }
  return { w, h, data, baseline };
}

// ---------------------------------------------------------------------
// Raster: a plain RGB pixel buffer with the drawing operations the
// cover pipeline needs.
// ---------------------------------------------------------------------

class Raster {
  constructor(w, h) {
    this.width = w;
    this.height = h;
    this.data = new Uint8ClampedArray(w * h * 3);
  }
  fill(r, g, b) {
    for (let i = 0; i < this.width * this.height; i++) {
      this.data[i * 3] = r; this.data[i * 3 + 1] = g; this.data[i * 3 + 2] = b;
    }
  }
  set(x, y, r, g, b) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const o = (y * this.width + x) * 3;
    this.data[o] = r; this.data[o + 1] = g; this.data[o + 2] = b;
  }
  blend(x, y, r, g, b, a) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height || a <= 0) return;
    const o = (y * this.width + x) * 3;
    this.data[o] += (r - this.data[o]) * a;
    this.data[o + 1] += (g - this.data[o + 1]) * a;
    this.data[o + 2] += (b - this.data[o + 2]) * a;
  }
  get(x, y) {
    const o = (y * this.width + x) * 3;
    return [this.data[o], this.data[o + 1], this.data[o + 2]];
  }
  blit(src, dx, dy, dw, dh) {
    // Bilinear-scale src into the rect at (dx, dy, dw, dh).
    for (let y = 0; y < dh; y++) {
      for (let x = 0; x < dw; x++) {
        const fx = (x + 0.5) / dw * src.width - 0.5;
        const fy = (y + 0.5) / dh * src.height - 0.5;
        const [r, g, b] = sampleBilinear(src, fx, fy);
        this.set(dx + x, dy + y, r, g, b);
      }
    }
  }
}

function sampleBilinear(img, fx, fy) {
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  function px(x, y) {
    const cx = Math.min(img.width - 1, Math.max(0, x));
    const cy = Math.min(img.height - 1, Math.max(0, y));
    const o = (cy * img.width + cx) * 3;
    return [img.data[o], img.data[o + 1], img.data[o + 2]];
  }
  const a = px(x0, y0), b = px(x0 + 1, y0), c = px(x0, y0 + 1), d = px(x0 + 1, y0 + 1);
  const out = [0, 0, 0];
  for (let i = 0; i < 3; i++) {
    out[i] = (a[i] * (1 - tx) + b[i] * tx) * (1 - ty) + (c[i] * (1 - tx) + d[i] * tx) * ty;
  }
  return out;
}

// ---------------------------------------------------------------------
// Cover rendering - the same composition as app/src/cover.js, done
// per pixel: panels, grade, decorations, borders, caption.
// ---------------------------------------------------------------------

function pointInConvex(px, py, poly) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const [ax, ay] = poly[i];
    const [bx, by] = poly[(i + 1) % poly.length];
    const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    if (cross !== 0) {
      const s = cross > 0 ? 1 : -1;
      if (sign === 0) sign = s;
      else if (s !== sign) return false;
    }
  }
  return true;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const ex = ax + t * dx - px, ey = ay + t * dy - py;
  return Math.sqrt(ex * ex + ey * ey);
}

function strokeSegment(raster, ax, ay, bx, by, halfWidth, rgb, alpha) {
  const minX = Math.max(0, Math.floor(Math.min(ax, bx) - halfWidth - 1));
  const maxX = Math.min(raster.width - 1, Math.ceil(Math.max(ax, bx) + halfWidth + 1));
  const minY = Math.max(0, Math.floor(Math.min(ay, by) - halfWidth - 1));
  const maxY = Math.min(raster.height - 1, Math.ceil(Math.max(ay, by) + halfWidth + 1));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = distToSegment(x + 0.5, y + 0.5, ax, ay, bx, by);
      if (d <= halfWidth) raster.blend(x, y, rgb[0], rgb[1], rgb[2], alpha);
      else if (d <= halfWidth + 1) raster.blend(x, y, rgb[0], rgb[1], rgb[2], alpha * (halfWidth + 1 - d));
    }
  }
}

function strokePolyline(raster, pts, halfWidth, rgb, alpha) {
  for (let i = 0; i < pts.length - 1; i++) {
    strokeSegment(raster, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], halfWidth, rgb, alpha);
  }
}

function quadPoints(x1, y1, cx, cy, x2, y2, steps) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, mt = 1 - t;
    pts.push([
      mt * mt * x1 + 2 * mt * t * cx + t * t * x2,
      mt * mt * y1 + 2 * mt * t * cy + t * t * y2
    ]);
  }
  return pts;
}

function drawSunHeadless(raster, W, H) {
  const cx = W * 0.80, cy = H * 0.16, r = Math.min(W, H) * 0.13;
  const R = r * 2.1;
  const minX = Math.max(0, Math.floor(cx - R)), maxX = Math.min(W - 1, Math.ceil(cx + R));
  const minY = Math.max(0, Math.floor(cy - R)), maxY = Math.min(H - 1, Math.ceil(cy + R));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      if (d <= r) {
        const t = (y - (cy - r)) / (2 * r);
        let rr = 255, gg = 215 - 106 * t, bb = 110 - 32 * t;
        if (y > cy + r * 0.28 && y < cy + r * 0.37) { rr *= 0.65; gg *= 0.65; bb *= 0.65; }
        if (y > cy + r * 0.55 && y < cy + r * 0.68) { rr *= 0.65; gg *= 0.65; bb *= 0.65; }
        raster.set(x, y, rr, gg, bb);
      } else if (d <= R) {
        const t = (d - r) / (R - r);
        const a = 0.5 * Math.pow(1 - t, 2);
        raster.blend(x, y, 255, 150, 110, a);
      }
    }
  }
}

// Strokes with alpha below 1 bead at polyline joints if each segment
// blends on top of the last, so soft strokes are first accumulated
// into a coverage mask (max, never sum) and composited exactly once.
function strokeSegmentMask(mask, W, H, ax, ay, bx, by, halfWidth) {
  const minX = Math.max(0, Math.floor(Math.min(ax, bx) - halfWidth - 1));
  const maxX = Math.min(W - 1, Math.ceil(Math.max(ax, bx) + halfWidth + 1));
  const minY = Math.max(0, Math.floor(Math.min(ay, by) - halfWidth - 1));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(ay, by) + halfWidth + 1));
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const d = distToSegment(x + 0.5, y + 0.5, ax, ay, bx, by);
      const cov = d <= halfWidth ? 1 : d <= halfWidth + 1 ? halfWidth + 1 - d : 0;
      const idx = y * W + x;
      if (cov > mask[idx]) mask[idx] = cov;
    }
  }
}

function strokePolylineMask(mask, W, H, pts, halfWidth) {
  for (let i = 0; i < pts.length - 1; i++) {
    strokeSegmentMask(mask, W, H, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], halfWidth);
  }
}

function compositeMaskGray(raster, mask, rgb, alpha) {
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] > 0) {
      const x = i % raster.width, y = Math.floor(i / raster.width);
      raster.blend(x, y, rgb[0], rgb[1], rgb[2], mask[i] * alpha);
    }
  }
}

function drawPalmsHeadless(raster, W, H) {
  const ink = [12, 10, 24];
  const mask = new Float32Array(W * H);
  function palm(ox, oy, scale, lean, flip) {
    const bx = ox * W, by = oy * H;
    const topX = bx + lean * W * flip, topY = by - 0.34 * H * scale;
    const trunk = quadPoints(bx, by, bx + lean * W * flip * 0.3, by - 0.2 * H * scale, topX, topY, 10);
    strokePolylineMask(mask, W, H, trunk, Math.max(1.5, W * 0.005 * scale));
    const fronds = [-2.6, -2.0, -1.4, -0.7, 0, 0.7, 1.3];
    for (const f of fronds) {
      const a = f * flip;
      const len = 0.17 * W * scale * (1 - Math.abs(f) * 0.10);
      const ex = topX + Math.sin(a) * len;
      const ey = topY + Math.abs(Math.cos(a)) * len * 0.42 + len * 0.16;
      const mx = topX + Math.sin(a) * len * 0.5;
      const my = topY - len * 0.22;
      strokePolylineMask(mask, W, H, quadPoints(topX, topY, mx, my, ex, ey, 8), Math.max(1, W * 0.003 * scale));
    }
  }
  palm(0.015, 1.0, 1.0, 0.05, 1);
  palm(0.99, 0.62, 0.72, 0.04, -1);
  compositeMaskGray(raster, mask, ink, 0.55);
}

// Fill an arbitrary (possibly concave) polygon by scanline spans.
function fillPolygon(raster, poly, rgb, alpha) {
  let minY = Infinity, maxY = -Infinity;
  for (const [, y] of poly) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  minY = Math.max(0, Math.floor(minY));
  maxY = Math.min(raster.height - 1, Math.ceil(maxY));
  for (let y = minY; y <= maxY; y++) {
    const yy = y + 0.5;
    const xs = [];
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      if ((y1 <= yy && y2 > yy) || (y2 <= yy && y1 > yy)) {
        xs.push(x1 + (yy - y1) / (y2 - y1) * (x2 - x1));
      }
    }
    xs.sort((a, b) => a - b);
    for (let s = 0; s + 1 < xs.length; s += 2) {
      const from = Math.max(0, Math.floor(xs[s]));
      const to = Math.min(raster.width - 1, Math.floor(xs[s + 1]));
      for (let x = from; x <= to; x++) raster.blend(x, y, rgb[0], rgb[1], rgb[2], alpha);
    }
  }
}

function drawSparklesHeadless(raster, W, H) {
  function sparkle(cx, cy, r, alpha) {
    // Four-point star: quadratic lobes tip-to-tip through the centre,
    // the same construction the browser draws with canvas curves.
    const tips = [
      [cx, cy - r], [cx + r, cy], [cx, cy + r], [cx - r, cy]
    ];
    const poly = [];
    for (let i = 0; i < 4; i++) {
      const [x1, y1] = tips[i];
      const [x2, y2] = tips[(i + 1) % 4];
      const pts = quadPoints(x1, y1, cx, cy, x2, y2, 6);
      for (let j = 0; j < pts.length - 1; j++) poly.push(pts[j]);
    }
    fillPolygon(raster, poly, [255, 246, 220], alpha);
  }
  const s = Math.min(W, H);
  sparkle(W * 0.16, H * 0.13, s * 0.030, 0.9);
  sparkle(W * 0.60, H * 0.07, s * 0.020, 0.7);
  sparkle(W * 0.90, H * 0.44, s * 0.024, 0.8);
  sparkle(W * 0.08, H * 0.58, s * 0.016, 0.6);
}

function applyGrade(raster, grade, intensity) {
  const g = Grades.resolve(grade, intensity);
  const W = raster.width, H = raster.height;
  const d = raster.data;
  const cx = W / 2, cy = H / 2, maxDist = Math.max(W, H) * 0.78, minDist = Math.min(W, H) * 0.42;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3;
      let r = d[o], gg = d[o + 1], b = d[o + 2];
      const luma = 0.299 * r + 0.587 * gg + 0.114 * b;
      r = luma + (r - luma) * g.saturation;
      gg = luma + (gg - luma) * g.saturation;
      b = luma + (b - luma) * g.saturation;
      r = (r - 128) * g.contrast + 128;
      gg = (gg - 128) * g.contrast + 128;
      b = (b - 128) * g.contrast + 128;
      r *= g.brightness * g.gainR;
      gg *= g.brightness * g.gainG;
      b *= g.brightness * g.gainB;
      const shadow = 1 - Math.min(255, Math.max(0, luma)) / 255;
      r += g.shadowLift[0] * shadow;
      gg += g.shadowLift[1] * shadow;
      b += g.shadowLift[2] * shadow;
      if (g.tintAlpha > 0) {
        r += (g.tint[0] - r) * g.tintAlpha;
        gg += (g.tint[1] - gg) * g.tintAlpha;
        b += (g.tint[2] - b) * g.tintAlpha;
      }
      if (g.vignette > 0) {
        const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (dist > minDist) {
          const t = Math.min(1, (dist - minDist) / (maxDist - minDist));
          const f = 1 - g.vignette * t;
          r *= f; gg *= f; b *= f;
        }
      }
      d[o] = r; d[o + 1] = gg; d[o + 2] = b;
    }
  }
}

function drawCaptionHeadless(raster, font, W, H, titleLines, subtitle) {
  // Legibility gradient over the bottom third.
  const bandTop = H * 0.66;
  for (let y = Math.floor(bandTop); y < H; y++) {
    const t = (y - bandTop) / (H - bandTop);
    const a = t < 0.45 ? 0.45 * (t / 0.45) : 0.45 + 0.33 * ((t - 0.45) / 0.55);
    for (let x = 0; x < W; x++) raster.blend(x, y, 10, 6, 18, a * 0.55);
  }
  const lines = (titleLines || []).filter((s) => s && s.trim());
  const useLines = lines.length ? lines : ["LEONIDA NIGHTS"];
  const maxWidth = W * 0.88;
  let base = H * (useLines.length > 1 ? 0.115 : 0.15);
  // Fit: shrink until the widest line fits.
  for (const line of useLines) {
    while (base > 14 && measureText(font, line.toUpperCase(), 0.01) * (base / font.unitsPerEm) > maxWidth) {
      base -= 4;
    }
  }
  const lineStep = (H * (useLines.length > 1 ? 0.115 : 0.15)) * 1.04;
  const subtitlePx = Math.max(14, H * 0.030);
  const baseline0 = H * 0.965 - subtitlePx * 1.6 - (useLines.length - 1) * lineStep;
  useLines.forEach((line, i) => {
    const text = line.toUpperCase();
    const mask = textMask(font, text, base, 0.01);
    const x0 = Math.round((W - mask.w) / 2);
    const y0 = Math.round(baseline0 + i * lineStep - mask.baseline);
    const off = Math.max(2, base * 0.045);
    compositeMask(raster, mask, x0 + off, y0 + off, [16, 8, 24], 0.85);
    compositeMask(raster, mask, x0, y0, [255, 247, 234], 1);
  });
  if (subtitle) {
    const spaced = subtitle.toUpperCase().split("").join(" ");
    const mask = textMask(font, spaced, subtitlePx, 0.02);
    const x0 = Math.round((W - mask.w) / 2);
    const y0 = Math.round(H * 0.965 - mask.baseline);
    compositeMask(raster, mask, x0, y0, [255, 209, 102], 1);
  }
}

function compositeMask(raster, mask, x0, y0, rgb, strength) {
  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      const a = mask.data[y * mask.w + x] / 255 * strength;
      if (a > 0) raster.blend(x0 + x, y0 + y, rgb[0], rgb[1], rgb[2], a);
    }
  }
}

function renderCover(shot, photos, font) {
  const W = shot.width, H = shot.height;
  const raster = new Raster(W, H);
  raster.fill(20, 16, 31);
  const layout = Layouts.byId(shot.layout);
  const polys = layout.panels().map((poly) => poly.map(([fx, fy]) => [fx * W, fy * H]));

  polys.forEach((poly, i) => {
    const b = Layouts.boundsOf(layout.panels()[i]);
    const bx = b.x * W, by = b.y * H, bw = b.w * W, bh = b.h * H;
    const photo = photos[shot.photos[i % shot.photos.length]];
    const zoom = shot.zooms[i % shot.zooms.length];
    const scale = Math.max(bw / photo.width, bh / photo.height) * zoom;
    const dw = photo.width * scale, dh = photo.height * scale;
    const ox = bx + (bw - dw) / 2, oy = by + (bh - dh) / 2;
    const minX = Math.max(0, Math.floor(bx)), maxX = Math.min(W - 1, Math.ceil(bx + bw));
    const minY = Math.max(0, Math.floor(by)), maxY = Math.min(H - 1, Math.ceil(by + bh));
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!pointInConvex(x + 0.5, y + 0.5, poly)) continue;
        const sx = (x + 0.5 - ox) / scale - 0.5;
        const sy = (y + 0.5 - oy) / scale - 0.5;
        const [r, g, bb] = sampleBilinear(photo, sx, sy);
        raster.set(x, y, r, g, bb);
      }
    }
  });

  applyGrade(raster, Grades.byId(shot.grade), shot.intensity);

  if (shot.decorations.sun) drawSunHeadless(raster, W, H);
  if (shot.decorations.palms) drawPalmsHeadless(raster, W, H);
  if (shot.decorations.sparkles) drawSparklesHeadless(raster, W, H);

  // Bright panel dividers and the outer frame.
  const lw = Math.max(3, W * 0.007) / 2;
  for (const poly of polys) {
    for (let i = 0; i < poly.length; i++) {
      const [ax, ay] = poly[i];
      const [bx2, by2] = poly[(i + 1) % poly.length];
      strokeSegment(raster, ax, ay, bx2, by2, lw, [255, 246, 233], 1);
    }
  }
  const flw = Math.max(5, W * 0.011) / 2;
  strokeSegment(raster, 0, 0, W, 0, flw, [255, 246, 233], 1);
  strokeSegment(raster, 0, H, W, H, flw, [255, 246, 233], 1);
  strokeSegment(raster, 0, 0, 0, H, flw, [255, 246, 233], 1);
  strokeSegment(raster, W, 0, W, H, flw, [255, 246, 233], 1);

  drawCaptionHeadless(raster, font, W, H, shot.title, shot.subtitle);
  return raster;
}

// ---------------------------------------------------------------------
// Editor screenshot - a faithful headless sketch of app/index.html
// under app/style.css: same dark panels, same accent, same control
// labels, with the live cover on the stage.
// ---------------------------------------------------------------------

function fillRect(raster, x, y, w, h, rgb) {
  for (let yy = Math.max(0, y); yy < Math.min(raster.height, y + h); yy++) {
    for (let xx = Math.max(0, x); xx < Math.min(raster.width, x + w); xx++) {
      raster.set(xx, yy, rgb[0], rgb[1], rgb[2]);
    }
  }
}

function strokeRect(raster, x, y, w, h, rgb) {
  strokeSegment(raster, x, y, x + w, y, 0.6, rgb, 1);
  strokeSegment(raster, x, y + h, x + w, y + h, 0.6, rgb, 1);
  strokeSegment(raster, x, y, x, y + h, 0.6, rgb, 1);
  strokeSegment(raster, x + w, y, x + w, y + h, 0.6, rgb, 1);
}

function drawLabel(raster, font, text, x, baseline, px, rgb, spacing) {
  const mask = textMask(font, text, px, spacing || 0.04);
  compositeMask(raster, mask, x, Math.round(baseline - mask.baseline), rgb, 1);
  return mask.w;
}

function renderEditor(shot, photos, font) {
  const W = shot.width, H = shot.height;
  const raster = new Raster(W, H);
  raster.fill(13, 13, 20); // --bg
  const PANEL = [23, 23, 36], EDGE = [42, 42, 61], INK = [245, 240, 230];
  const MUTED = [154, 148, 173], ACCENT = [255, 46, 136], SOFT = [255, 209, 102];

  // Top bar.
  fillRect(raster, 0, 0, W, 62, PANEL);
  fillRect(raster, 0, 62, W, 1, EDGE);
  let tx = 26;
  tx += drawLabel(raster, font, "LEONIDA ", tx, 44, 30, INK, 0.02);
  drawLabel(raster, font, "COVER MAKER", tx, 44, 30, ACCENT, 0.02);
  drawLabel(raster, font, "OFFLINE - NO UPLOADS", W - 300, 40, 15, MUTED, 0.06);

  // Left control rail: stacked sections mirroring the page.
  const railX = 24, railW = 308;
  let y = 82;
  function section(title, height, drawBody) {
    fillRect(raster, railX, y, railW, height, PANEL);
    strokeRect(raster, railX, y, railW, height, EDGE);
    drawLabel(raster, font, title, railX + 14, y + 26, 15, SOFT, 0.08);
    drawBody(y);
    y += height + 14;
  }
  // Pills sized by actually measuring the label in Anton, wrapped
  // onto a second row when the rail runs out of width.
  function pillRows(items, top, activeId) {
    let px = railX + 14, py = top;
    for (const item of items) {
      const label = item.name.toUpperCase();
      const w = Math.ceil(measureText(font, label, 0.03) * (13 / font.unitsPerEm)) + 22;
      if (px + w > railX + railW - 14) { px = railX + 14; py += 32; }
      fillRect(raster, px, py, w, 26, item.id === activeId ? ACCENT : [16, 16, 26]);
      drawLabel(raster, font, label, px + 11, py + 19, 13, INK, 0.03);
      px += w + 6;
    }
    return py;
  }
  section("LAYOUT", 106, (top) => {
    pillRows(Layouts.LAYOUTS, top + 38, shot.layout);
  });
  section("COLOUR GRADE", 124, (top) => {
    pillRows(Grades.GRADES, top + 38, shot.grade);
    // intensity slider under the pills
    fillRect(raster, railX + 14, top + 104, railW - 28, 5, EDGE);
    fillRect(raster, railX + 14, top + 104, (railW - 28) * shot.intensity, 5, ACCENT);
  });
  section("CAPTION", 96, (top) => {
    drawLabel(raster, font, shot.title.join(" / "), railX + 14, top + 52, 17, INK, 0.04);
    drawLabel(raster, font, shot.subtitle, railX + 14, top + 78, 13, MUTED, 0.05);
  });
  section("EXPORT", 84, (top) => {
    fillRect(raster, railX + 14, top + 38, railW - 28, 32, ACCENT);
    drawLabel(raster, font, "DOWNLOAD PNG - 1080 X 1350", railX + 30, top + 60, 14, [255, 255, 255], 0.04);
  });

  // Stage: the live cover (the portrait shot at half size), centred
  // in the space right of the rail.
  const stageX = railX + railW + 24, stageW = W - stageX - 24;
  const cover = renderCover({ ...shot, width: 540, height: 675 }, photos, font);
  const dx = stageX + Math.round((stageW - 540) / 2);
  raster.blit(cover, dx, 84, 540, 675);
  drawLabel(raster, font, "DRAG ON THE COVER TO PAN A PANEL", stageX + 8, H - 22, 13, MUTED, 0.06);
  return raster;
}

// ---------------------------------------------------------------------
// main
// ---------------------------------------------------------------------

function main() {
  const font = new Font(fs.readFileSync(path.join(ROOT, "app", "fonts", "Anton-Regular.ttf")));
  const photos = {};
  for (const name of ["boulevard", "pier"]) {
    photos[name] = decodeJPEG(fs.readFileSync(path.join(ROOT, "app", "samples", name + ".jpg")));
  }
  const outDir = path.join(ROOT, "screenshots");
  fs.mkdirSync(outDir, { recursive: true });
  for (const shot of SHOTS) {
    const raster = shot.kind === "editor"
      ? renderEditor(shot, photos, font)
      : renderCover(shot, photos, font);
    const encoded = encodeFitting(raster, 262144);
    fs.writeFileSync(path.join(outDir, shot.file), encoded);
    console.log(shot.file + ": " + raster.width + "x" + raster.height + ", " + encoded.length + " bytes");
  }
}

main();

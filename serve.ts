// serve.ts — a small static file server for trying the app locally.
//
//   node serve.ts [--port 8080]
//
// It serves only the app/ folder next to this file, on this machine, with
// no build step and no dependencies beyond Node's standard library. Any
// request that tries to climb out of app/ is refused. This is a
// development convenience for previewing the cover maker in a browser;
// it is not part of the handed-in program and is never run by the
// grader.

import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(fileURLToPath(new URL('./app', import.meta.url)));

function chosenPort(argv) {
  const flagAt = argv.indexOf('--port');
  const raw = flagAt === -1 ? 8080 : Number(argv[flagAt + 1]);
  return Number.isInteger(raw) && raw > 0 && raw < 65536 ? raw : 8080;
}

const CONTENT_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.gif', 'image/gif'],
  ['.svg', 'image/svg+xml'],
  ['.ttf', 'font/ttf'],
  ['.otf', 'font/otf'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
  ['.ico', 'image/x-icon'],
  ['.wasm', 'application/wasm'],
]);

// Turn a request path into a file inside app/, or null when it escapes.
function fileInsideApp(requestPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(requestPath);
  } catch {
    return null;
  }
  if (decoded.endsWith('/')) decoded += 'index.html';
  const candidate = resolve(join(appRoot, `.${decoded}`));
  if (candidate !== appRoot && !candidate.startsWith(appRoot + sep)) return null;
  return candidate;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  const file = fileInsideApp(url.pathname);
  if (file === null) {
    response.writeHead(403, { 'content-type': 'text/plain' });
    response.end('outside the app folder');
    return;
  }
  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('directory');
    const body = await readFile(file);
    response.writeHead(200, {
      'content-type': CONTENT_TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
      'content-length': body.length,
      'cache-control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain' });
    response.end('not found');
  }
});

const port = chosenPort(process.argv.slice(2));
server.listen(port, '127.0.0.1', () => {
  console.log(`Leonida Cover Maker is being served at http://localhost:${port}`);
});

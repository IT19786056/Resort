// Build-time asset precompression.
//
// Why this exists: app.ts mounts compression() globally, which sits in front of
// express.static. Without this step every JS/CSS fetch that misses the browser
// cache gets gzipped from scratch, on the event loop, to produce byte-identical
// output for files whose contents can never change (Vite content-hashes them and
// we serve them `immutable`). That is CPU spent repeatedly on a fixed answer, and
// this process only has one thread to spend.
//
// So we compress once here, at build time, and app.ts serves the result directly.
//
// Only assets served by express.static are worth doing. dist/index.html is NOT:
// it's rendered per-request by renderIndexShell() (hero media is injected into it)
// and served with no-cache, so a precompressed copy on disk would never be read.

import { promises as fs } from 'fs';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const brotli = promisify(zlib.brotliCompress);

// dist/client only. The server bundle in dist/ is not served to browsers, so
// compressing it would burn build time for nothing — and it must not be reachable
// over HTTP at all (see build.outDir in vite.config.ts).
const DIST = path.join(process.cwd(), 'dist', 'client');

// Text formats only. Fonts/images (woff2, png, jpg, webp, mp4) are already
// compressed; re-compressing them costs build time and usually grows the file.
const COMPRESSIBLE = /\.(js|mjs|css|svg|json|map|txt|xml|ico)$/i;

// Below ~1KB, framing overhead means compression saves little or nothing, and the
// browser still pays to inflate it.
const MIN_BYTES = 1024;

async function* walk(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}

const run = async () => {
  const started = Date.now();
  let files = 0, rawTotal = 0, brTotal = 0, gzTotal = 0;

  for await (const file of walk(DIST)) {
    if (!COMPRESSIBLE.test(file)) continue;
    if (file.endsWith('.br') || file.endsWith('.gz')) continue;

    const raw = await fs.readFile(file);
    if (raw.length < MIN_BYTES) continue;

    // Quality 11 is brotli's maximum. It's slow to compress and irrelevant to
    // decompress, which is exactly the right trade when it happens once per build
    // and is then served forever.
    const [br, gz] = await Promise.all([
      brotli(raw, {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
          [zlib.constants.BROTLI_PARAM_SIZE_HINT]: raw.length,
        },
      }),
      gzip(raw, { level: zlib.constants.Z_BEST_COMPRESSION }),
    ]);

    // Keep a variant only if it actually beats the original — otherwise the
    // middleware in app.ts should fall through to serving the raw file.
    if (br.length < raw.length) await fs.writeFile(`${file}.br`, br);
    if (gz.length < raw.length) await fs.writeFile(`${file}.gz`, gz);

    files++;
    rawTotal += raw.length;
    brTotal += Math.min(br.length, raw.length);
    gzTotal += Math.min(gz.length, raw.length);
  }

  const kb = (n) => `${(n / 1024).toFixed(1)}kb`;
  if (files === 0) {
    console.log('precompress: no eligible assets found in dist/');
    return;
  }
  console.log(
    `precompress: ${files} files  raw ${kb(rawTotal)} -> br ${kb(brTotal)} / gzip ${kb(gzTotal)}  (${Date.now() - started}ms)`
  );
};

run().catch((err) => {
  console.error('precompress failed:', err);
  process.exit(1);
});

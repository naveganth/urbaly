/**
 * Copies the MapLibre GL JS worker bundle into `public/maplibre/` so the app
 * can point `setWorkerUrl()` at a same-origin file.
 *
 * Why: maplibre-gl resolves its worker via `new URL('./maplibre-gl-worker.mjs',
 * import.meta.url)`. Under Next.js/Turbopack `import.meta.url` is not an
 * http(s) URL, so the resolution returns '' and MapLibre falls back to
 * `new Worker('')`, which resolves to the page URL (HTML) and the browser
 * rejects it (MIME mismatch). Without a worker, vector tiles never parse and
 * the map never fires 'load'. Run on postinstall to stay in sync with the
 * installed maplibre-gl version.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const frontendDir = join(here, '..');
const distDir = join(frontendDir, 'node_modules', 'maplibre-gl', 'dist');
const outDir = join(frontendDir, 'public', 'maplibre');

mkdirSync(outDir, { recursive: true });

// Main-thread bundle is `dist/maplibre-gl.mjs` (see package exports), whose
// matching worker pair is worker.mjs + shared.mjs (NOT the -dev variants).
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(distDir, file), join(outDir, file));
  console.log(`[copy-maplibre-worker] ${file} -> public/maplibre/${file}`);
}

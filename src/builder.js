// Builder: reads a Lumen3D config, normalizes it, and writes a static,
// deployable 3D website into an output directory.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeConfig } from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readTemplate() {
  return fs.readFile(path.join(__dirname, 'templates', 'index.html'), 'utf8');
}

async function readEngine() {
  return fs.readFile(path.join(__dirname, 'runtime', 'engine.js'), 'utf8');
}

export async function loadConfig(configPath) {
  const raw = await fs.readFile(configPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Config at ${configPath} is not valid JSON: ${err.message}`);
  }
  return normalizeConfig(parsed);
}

function cdnImportmap(version) {
  return `<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@${version}/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@${version}/examples/jsm/"
    }
  }
  </script>`;
}

function vendorImportmap() {
  return `<script type="importmap">
  {
    "imports": {
      "three": "./vendor/three.module.js",
      "three/addons/": "./vendor/jsm/"
    }
  }
  </script>`;
}

const BADGE_HTML =
  '<a class="lumen-badge" href="https://github.com/zackarman28346-sketch/https-github.com-zackarman28346-sketch-claude" target="_blank" rel="noopener">built with Lumen3D</a>';

function renderTemplate(tpl, cfg, importmap, pro) {
  return tpl
    .replaceAll('{{TITLE}}', escapeHtml(cfg.title))
    .replaceAll('{{DESCRIPTION}}', escapeHtml(cfg.description))
    .replaceAll('{{IMPORTMAP}}', importmap)
    .replaceAll('{{BADGE}}', pro ? '' : BADGE_HTML);
}

// Locate an installed `three` package, checking the user's project first,
// then the tool's own node_modules.
async function resolveThreeDir() {
  const candidates = [
    path.join(process.cwd(), 'node_modules', 'three'),
    path.join(__dirname, '..', 'node_modules', 'three')
  ];
  for (const dir of candidates) {
    try {
      await fs.access(path.join(dir, 'build', 'three.module.js'));
      return dir;
    } catch {
      // keep looking
    }
  }
  throw new Error(
    "vendor mode needs the 'three' package installed.\n" +
    "    run:  npm install three\n" +
    "    then: lumen build --vendor"
  );
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else if (entry.isFile()) await fs.copyFile(s, d);
  }
}

async function vendorThree(outDir) {
  const threeDir = await resolveThreeDir();
  const vendorDir = path.join(outDir, 'vendor');
  await fs.mkdir(vendorDir, { recursive: true });
  await fs.copyFile(
    path.join(threeDir, 'build', 'three.module.js'),
    path.join(vendorDir, 'three.module.js')
  );
  await copyDir(path.join(threeDir, 'examples', 'jsm'), path.join(vendorDir, 'jsm'));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'
  }[ch]));
}

// Core: write a normalized config out as a static site.
async function writeSite(cfg, outDir, options = {}) {
  const [tpl, engine] = await Promise.all([readTemplate(), readEngine()]);

  await fs.mkdir(outDir, { recursive: true });

  const importmap = options.vendor ? vendorImportmap() : cdnImportmap(cfg.threeVersion);
  const html = renderTemplate(tpl, cfg, importmap, !!options.pro);
  const files = [
    ['index.html', html],
    ['engine.js', engine],
    ['config.json', JSON.stringify(cfg, null, 2)]
  ];

  for (const [name, content] of files) {
    await fs.writeFile(path.join(outDir, name), content, 'utf8');
  }

  if (options.vendor) await vendorThree(outDir);

  return { outDir, files: files.map((f) => f[0]), cfg, vendored: !!options.vendor, pro: !!options.pro };
}

// Build from a config file on disk. Returns { outDir, files: [...] }.
// options: { vendor: boolean } — when true, bundle three.js into ./vendor
// so the site is fully self-contained (no CDN needed at view time).
export async function build(configPath, outDir, options = {}) {
  const cfg = await loadConfig(configPath);
  return writeSite(cfg, outDir, options);
}

// Build from an in-memory config object (raw or already normalized).
// Used by the desktop app, which holds the config in memory.
export async function buildFromObject(rawConfig, outDir, options = {}) {
  return writeSite(normalizeConfig(rawConfig), outDir, options);
}

// In-memory build for the dev server (no disk writes). Always uses the CDN
// importmap; run `lumen build --vendor` for a self-contained bundle.
export async function buildInMemory(configPath) {
  const cfg = await loadConfig(configPath);
  const [tpl, engine] = await Promise.all([readTemplate(), readEngine()]);
  const html = renderTemplate(tpl, cfg, cdnImportmap(cfg.threeVersion), false);
  return {
    cfg,
    assets: {
      '/index.html': { type: 'text/html; charset=utf-8', body: html },
      '/engine.js': { type: 'text/javascript; charset=utf-8', body: engine },
      '/config.json': { type: 'application/json; charset=utf-8', body: JSON.stringify(cfg, null, 2) }
    }
  };
}

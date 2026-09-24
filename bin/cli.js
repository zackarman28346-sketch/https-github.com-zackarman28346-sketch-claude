#!/usr/bin/env node
// Lumen3D command-line interface.
//   lumen init [dir]                 scaffold a starter project
//   lumen build [--config f] [--out] generate a static 3D site
//   lumen dev   [--config f] [--port]serve + live-reload from config

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from '../src/builder.js';
import { serve } from '../src/server.js';
import { verifyLicense, isPro } from '../src/license.js';
import { verifierConfig } from '../src/license-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const VERSION = '0.1.0';

const C = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m',
  magenta: '\x1b[35m', red: '\x1b[31m'
};
const c = (color, s) => `${C[color]}${s}${C.reset}`;

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) { flags[key] = next; i++; }
      else flags[key] = true;
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

function banner() {
  console.log(c('magenta', c('bold', '\n  ✦ Lumen3D')) + c('dim', `  v${VERSION}`));
  console.log(c('dim', '  build interactive 3D websites from a JSON config\n'));
}

function help() {
  banner();
  console.log(`${c('bold', 'Usage')}
  ${c('cyan', 'lumen init')} ${c('dim', '[dir]')}                      scaffold a starter project
  ${c('cyan', 'lumen build')} ${c('dim', '[--config f] [--out dir] [--vendor]')}  generate a static 3D site
  ${c('cyan', 'lumen dev')} ${c('dim', '[--config f] [--port n]')}     preview locally, reloads on config edits

${c('bold', 'Options')}
  ${c('dim', '--config <file>')}   path to a config JSON (default: lumen.config.json)
  ${c('dim', '--out <dir>')}       output directory for build (default: dist)
  ${c('dim', '--vendor')}          bundle three.js locally (needs: npm install three)
  ${c('dim', '--license <key>')}   Pro license key — removes the watermark badge
  ${c('dim', '--port <n>')}        dev server port (default: 5173)

${c('bold', 'Examples')}
  ${c('dim', '$')} lumen init my-site
  ${c('dim', '$')} cd my-site && lumen dev
  ${c('dim', '$')} lumen build --config lumen.config.json --out dist
`);
}

async function cmdInit(positional) {
  const dir = positional[0] || '.';
  const target = path.resolve(process.cwd(), dir);
  await fs.mkdir(target, { recursive: true });

  const starterSrc = path.join(ROOT, 'examples', 'starter.json');
  const configDest = path.join(target, 'lumen.config.json');

  try {
    await fs.access(configDest);
    console.log(c('yellow', `  ! ${path.relative(process.cwd(), configDest)} already exists — leaving it as-is`));
  } catch {
    const starter = await fs.readFile(starterSrc, 'utf8');
    await fs.writeFile(configDest, starter, 'utf8');
    console.log(c('green', `  ✓ created ${path.relative(process.cwd(), configDest) || 'lumen.config.json'}`));
  }

  banner();
  console.log(`${c('bold', 'Next steps')}`);
  if (dir !== '.') console.log(`  ${c('dim', '$')} cd ${dir}`);
  console.log(`  ${c('dim', '$')} lumen dev        ${c('dim', '# preview at http://localhost:5173')}`);
  console.log(`  ${c('dim', '$')} lumen build      ${c('dim', '# output a deployable site to ./dist')}\n`);
  console.log(c('dim', '  Edit lumen.config.json and refresh the browser to see changes.\n'));
}

async function cmdBuild(flags) {
  const configPath = path.resolve(process.cwd(), flags.config || 'lumen.config.json');
  const outDir = path.resolve(process.cwd(), flags.out || 'dist');

  try {
    await fs.access(configPath);
  } catch {
    console.error(c('red', `  ✗ config not found: ${configPath}`));
    console.error(c('dim', "    run 'lumen init' first, or pass --config <file>"));
    process.exit(1);
  }

  const vendor = !!flags.vendor;

  // Pro: a valid license removes the "built with Lumen3D" badge.
  let pro = false;
  if (flags.license) {
    const res = await verifyLicense(String(flags.license), verifierConfig());
    pro = isPro(res);
    if (pro) console.log(c('green', `  ✓ Pro license valid${res.email ? ` (${res.email})` : ''} — badge removed`));
    else console.log(c('yellow', `  ! license not valid (${res.reason}) — building free version`));
  }

  const start = Date.now();
  const { files, cfg } = await build(configPath, outDir, { vendor, pro });
  const ms = Date.now() - start;

  console.log(c('green', `\n  ✓ built "${cfg.title}" in ${ms}ms`));
  console.log(c('dim', `    ${path.relative(process.cwd(), outDir)}/`));
  for (const f of files) console.log(c('dim', `      ${f}`));
  if (vendor) console.log(c('dim', '      vendor/  (bundled three.js — self-contained)'));
  console.log(c('dim', `\n    ${cfg.objects.length} object(s), ${cfg.lights.length} light(s)${pro ? ' · Pro (no badge)' : ''}`));
  console.log(c('dim', vendor
    ? '    fully self-contained — deploy the folder anywhere, works offline'
    : '    loads three.js from CDN — deploy to any static host, or use --vendor to bundle it'));
  console.log('');
}

async function cmdDev(flags) {
  const configPath = path.resolve(process.cwd(), flags.config || 'lumen.config.json');
  const port = Number(flags.port) || 5173;

  try {
    await fs.access(configPath);
  } catch {
    console.error(c('red', `  ✗ config not found: ${configPath}`));
    console.error(c('dim', "    run 'lumen init' first, or pass --config <file>"));
    process.exit(1);
  }

  banner();
  const { url, title } = await serve(configPath, { port });
  console.log(`  ${c('green', '➜')} ${c('bold', title)}`);
  console.log(`  ${c('green', '➜')} local:  ${c('cyan', url)}`);
  console.log(c('dim', `  ➜ watching ${path.relative(process.cwd(), configPath)} — edit and refresh\n`));
  console.log(c('dim', '  press Ctrl+C to stop\n'));
}

async function main() {
  const [, , cmd, ...rest] = process.argv;
  const { positional, flags } = parseArgs(rest);

  if (flags.version || flags.v || cmd === 'version') {
    console.log(`lumen3d v${VERSION}`);
    return;
  }
  if (!cmd || cmd === 'help' || flags.help || flags.h) {
    help();
    return;
  }

  switch (cmd) {
    case 'init': return cmdInit(positional);
    case 'build': return cmdBuild(flags);
    case 'dev': return cmdDev(flags);
    default:
      console.error(c('red', `  ✗ unknown command: ${cmd}`));
      help();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(c('red', '\n  ✗ ' + (err && err.message ? err.message : err)) + '\n');
  process.exit(1);
});

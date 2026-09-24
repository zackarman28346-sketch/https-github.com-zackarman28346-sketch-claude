// Lumen3D Studio — renderer logic.
// Ties the prompt box + JSON editor to the live Three.js preview, and hands
// the current scene to the main process for export.

import { generateConfig, explain } from '../../src/generate.js';
import { normalizeConfig } from '../../src/schema.js';
import { mount } from '../../src/runtime/engine.js';

const $ = (sel) => document.querySelector(sel);

const els = {
  prompt: $('#prompt'),
  generate: $('#generate'),
  understood: $('#understood'),
  json: $('#json'),
  applyJson: $('#apply-json'),
  vendor: $('#vendor'),
  export: $('#export'),
  toast: $('#toast'),
  examples: $('#examples'),
  preview: $('#preview')
};

const EXAMPLES = [
  'a glowing purple crystal floating in space',
  'three chrome metal spheres',
  'cyberpunk neon wireframe torus knot',
  'a glass diamond spinning slowly',
  'five orbiting golden cubes underwater',
  'minimal white studio with a single pink donut'
];

let rawConfig = null;      // source of truth (raw, pre-normalize)
let handle = null;         // live scene handle with dispose()

function toast(msg, kind = 'ok', link = null) {
  els.toast.hidden = false;
  els.toast.className = `toast ${kind}`;
  els.toast.innerHTML = msg + (link ? ` <a data-open="${escapeAttr(link)}">Open folder</a>` : '');
}

function escapeAttr(s) {
  return String(s).replace(/["&<>]/g, (c) => ({ '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

async function render(cfgRaw) {
  const cfg = normalizeConfig(cfgRaw);
  if (handle) { handle.dispose(); handle = null; }
  handle = await mount(cfg, els.preview);
}

function showUnderstood(desc) {
  const e = explain(desc);
  els.understood.hidden = false;
  const swatches = e.colors[0] === 'auto'
    ? '<span class="tag">auto color</span>'
    : e.colors.map((c) => `<span class="tag" style="background:${c}22;color:${c}">${c}</span>`).join('');
  els.understood.innerHTML =
    `<b>Understood:</b> ${e.shapes.map((s) => `<span class="tag">${s}</span>`).join('')}` +
    `<br>${swatches} <span class="tag">motion: ${e.motion}</span>` +
    (e.bloom ? ' <span class="tag">glow</span>' : '');
}

async function doGenerate() {
  const desc = els.prompt.value.trim() || EXAMPLES[0];
  rawConfig = generateConfig(desc);
  els.json.value = JSON.stringify(rawConfig, null, 2);
  showUnderstood(desc);
  els.toast.hidden = true;
  try {
    await render(rawConfig);
  } catch (err) {
    toast('Preview error: ' + err.message, 'err');
    console.error(err);
  }
}

async function applyJson() {
  let parsed;
  try {
    parsed = JSON.parse(els.json.value);
  } catch (err) {
    toast('Invalid JSON: ' + err.message, 'err');
    return;
  }
  rawConfig = parsed;
  els.toast.hidden = true;
  try {
    await render(rawConfig);
    toast('Applied JSON edits to the preview.', 'ok');
  } catch (err) {
    toast('Preview error: ' + err.message, 'err');
  }
}

async function doExport() {
  if (!rawConfig) { toast('Generate a scene first.', 'err'); return; }
  els.export.disabled = true;
  els.export.textContent = 'Exporting…';
  try {
    const res = await window.lumen.exportSite({
      config: rawConfig,
      vendor: els.vendor.checked
    });
    if (res.canceled) { toast('Export canceled.', 'ok'); }
    else if (res.error) { toast('Export failed: ' + res.error, 'err'); }
    else {
      toast(
        `Exported ${res.files.length} files${res.vendored ? ' (self-contained)' : ''}. `,
        'ok',
        res.outDir
      );
    }
  } catch (err) {
    toast('Export failed: ' + err.message, 'err');
  } finally {
    els.export.disabled = false;
    els.export.textContent = 'Export website…';
  }
}

// ---- wire up ----
EXAMPLES.forEach((ex) => {
  const chip = document.createElement('button');
  chip.className = 'chip';
  chip.textContent = ex.length > 34 ? ex.slice(0, 32) + '…' : ex;
  chip.title = ex;
  chip.addEventListener('click', () => { els.prompt.value = ex; doGenerate(); });
  els.examples.appendChild(chip);
});

els.generate.addEventListener('click', doGenerate);
els.applyJson.addEventListener('click', applyJson);
els.export.addEventListener('click', doExport);

els.prompt.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') doGenerate();
});

// Open-folder link inside toast, and any external links.
document.addEventListener('click', (e) => {
  const openTarget = e.target.getAttribute && e.target.getAttribute('data-open');
  if (openTarget) { window.lumen.openPath(openTarget); return; }
  const ext = e.target.getAttribute && e.target.getAttribute('data-ext');
  if (ext) { e.preventDefault(); window.lumen.openExternal(ext); }
});

// First scene on launch.
els.prompt.value = EXAMPLES[0];
doGenerate();

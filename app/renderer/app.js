// Lumen3D Studio — renderer logic.
// Ties the prompt box + JSON editor to the live Three.js preview, and hands
// the current scene to the main process for export.

import { generateConfig, explain } from '../../src/generate.js';
import { normalizeConfig } from '../../src/schema.js';
import { mount } from '../../src/runtime/engine.js';
import { LICENSE } from '../../src/license-config.js';
import { PREMIUM_TEMPLATES } from './premium.js';

const $ = (sel) => document.querySelector(sel);

const els = {
  prompt: $('#prompt'),
  generate: $('#generate'),
  understood: $('#understood'),
  json: $('#json'),
  applyJson: $('#apply-json'),
  vendor: $('#vendor'),
  export: $('#export'),
  savePng: $('#save-png'),
  randomize: $('#randomize'),
  toast: $('#toast'),
  examples: $('#examples'),
  premium: $('#premium'),
  preview: $('#preview'),
  proPill: $('#pro-pill'),
  upgrade: $('#upgrade'),
  licenseKey: $('#license-key'),
  activate: $('#activate'),
  deactivate: $('#deactivate'),
  // quick controls
  cAccent: $('#c-accent'),
  cTop: $('#c-top'),
  cBottom: $('#c-bottom'),
  cGround: $('#c-ground'),
  cBloom: $('#c-bloom'),
  cStars: $('#c-stars'),
  cBloomStr: $('#c-bloom-str'),
  cSpin: $('#c-spin')
};

const RANDOM_PROMPTS = [
  'a giant glowing crystal floating in space',
  'three chrome metal spheres orbiting',
  'cyberpunk neon wireframe torus knot',
  'a glass diamond spinning slowly',
  'five golden cubes underwater',
  'a lava red spiky cone with glow',
  'rainbow spheres floating in a pastel studio',
  'a tiny silver capsule in a starfield',
  'a huge purple gem with a spinning halo',
  'colorful cubes in a neon city'
];

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
let isProUser = false;     // reflects the stored license

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

// Reflect the current scene's values into the control inputs.
function syncControls() {
  const n = normalizeConfig(rawConfig);
  els.cAccent.value = n.overlay ? n.overlay.accent : '#8a7dff';
  if (n.scene.background.type === 'gradient') {
    els.cTop.value = n.scene.background.top;
    els.cBottom.value = n.scene.background.bottom;
  }
  els.cGround.checked = n.ground.enabled;
  els.cBloom.checked = !!n.effects.bloom;
  els.cStars.checked = !!n.scene.particles;
  els.cBloomStr.value = n.effects.bloom ? n.effects.bloom.strength : 0.6;
  els.cSpin.value = n.controls.autoRotateSpeed;
}

function ensure(obj, key, fallback) {
  if (!obj[key] || typeof obj[key] !== 'object') obj[key] = fallback;
  return obj[key];
}

// Patch the raw config from the controls, then re-render + sync JSON.
let patchTimer = null;
function applyControls() {
  if (!rawConfig) return;
  const scene = ensure(rawConfig, 'scene', {});
  const bg = ensure(scene, 'background', { type: 'gradient' });
  bg.type = 'gradient';
  bg.top = els.cTop.value;
  bg.bottom = els.cBottom.value;

  const overlay = ensure(rawConfig, 'overlay', {});
  overlay.accent = els.cAccent.value;

  const ground = ensure(rawConfig, 'ground', {});
  ground.enabled = els.cGround.checked;

  if (els.cBloom.checked) {
    const b = ensure(ensure(rawConfig, 'effects', {}), 'bloom', {});
    b.strength = parseFloat(els.cBloomStr.value);
    if (b.radius == null) b.radius = 0.5;
    if (b.threshold == null) b.threshold = 0.8;
  } else if (rawConfig.effects) {
    rawConfig.effects.bloom = null;
  }

  scene.particles = els.cStars.checked
    ? (scene.particles && typeof scene.particles === 'object'
        ? scene.particles
        : { count: 1400, color: '#cfd6ff', size: 0.06, spread: 60 })
    : null;

  const controls = ensure(rawConfig, 'controls', {});
  controls.autoRotateSpeed = parseFloat(els.cSpin.value);
  controls.autoRotate = parseFloat(els.cSpin.value) > 0;

  els.json.value = JSON.stringify(rawConfig, null, 2);
  clearTimeout(patchTimer);
  patchTimer = setTimeout(() => { render(rawConfig).catch((e) => toast('Preview error: ' + e.message, 'err')); }, 100);
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
    (e.bloom ? ' <span class="tag">glow</span>' : '') +
    (e.stars ? ' <span class="tag">starfield</span>' : '');
}

async function doGenerate() {
  const desc = els.prompt.value.trim() || EXAMPLES[0];
  rawConfig = generateConfig(desc);
  els.json.value = JSON.stringify(rawConfig, null, 2);
  showUnderstood(desc);
  syncControls();
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
    syncControls();
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
      const badge = res.pro ? 'no watermark' : 'with “built with Lumen3D” badge';
      toast(
        `Exported ${res.files.length} files${res.vendored ? ', self-contained' : ''}, ${badge}. `,
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

function randomize() {
  const pick = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)];
  els.prompt.value = pick;
  doGenerate();
}

async function savePng() {
  if (!handle || !handle.renderer) { toast('Generate a scene first.', 'err'); return; }
  // Render one fresh frame so the drawing buffer is current, then capture.
  handle.renderer.render(handle.scene, handle.camera);
  const dataURL = handle.renderer.domElement.toDataURL('image/png');
  const name = (rawConfig && rawConfig.title ? rawConfig.title : 'lumen-scene')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png';
  try {
    const res = await window.lumen.savePng({ dataURL, name });
    if (res && res.path) toast('Saved snapshot.', 'ok', res.path);
    else if (res && res.canceled) toast('Save canceled.', 'ok');
  } catch (err) {
    toast('Could not save PNG: ' + err.message, 'err');
  }
}

// ---- Pro / licensing ----
function setProUI(pro, email) {
  isProUser = pro;
  els.proPill.textContent = pro ? 'PRO' : 'FREE';
  els.proPill.className = 'pro-pill ' + (pro ? 'pro' : 'free');
  els.upgrade.style.display = pro ? 'none' : '';
  els.deactivate.style.display = pro ? '' : 'none';
  if (pro && email) els.proPill.title = email;
  // premium chips lock/unlock
  els.premium.querySelectorAll('.chip').forEach((c) => c.classList.toggle('locked', !pro));
}

async function refreshLicense() {
  try {
    const s = await window.lumen.licenseStatus();
    setProUI(!!s.pro, s.email);
  } catch {
    setProUI(false);
  }
}

async function activateLicense() {
  const key = els.licenseKey.value.trim();
  if (!key) { toast('Paste a license key first.', 'err'); return; }
  const s = await window.lumen.licenseActivate(key);
  if (s.pro) {
    setProUI(true, s.email);
    toast('Pro unlocked — thank you! Watermark removed + premium templates unlocked.', 'ok');
    els.licenseKey.value = '';
  } else {
    toast('That key is not valid (' + (s.reason || 'invalid') + ').', 'err');
  }
}

async function deactivateLicense() {
  await window.lumen.licenseClear();
  setProUI(false);
  toast('License removed from this machine.', 'ok');
}

function loadPremium(tpl) {
  if (!isProUser) {
    toast('“' + tpl.name + '” is a Pro template. Upgrade to unlock the premium gallery.', 'err');
    return;
  }
  rawConfig = JSON.parse(JSON.stringify(tpl.config));
  els.json.value = JSON.stringify(rawConfig, null, 2);
  els.understood.hidden = false;
  els.understood.innerHTML = `<b>Premium template:</b> <span class="tag">${tpl.name}</span>`;
  syncControls();
  render(rawConfig).catch((e) => toast('Preview error: ' + e.message, 'err'));
}

// ---- wire up ----
PREMIUM_TEMPLATES.forEach((tpl) => {
  const chip = document.createElement('button');
  chip.className = 'chip premium locked';
  chip.textContent = '✦ ' + tpl.name;
  chip.title = tpl.name + ' (Pro)';
  chip.addEventListener('click', () => loadPremium(tpl));
  els.premium.appendChild(chip);
});

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
els.randomize.addEventListener('click', randomize);
els.savePng.addEventListener('click', savePng);
els.activate.addEventListener('click', activateLicense);
els.deactivate.addEventListener('click', deactivateLicense);
els.upgrade.addEventListener('click', () => window.lumen.openExternal(LICENSE.purchaseUrl));

[els.cAccent, els.cTop, els.cBottom, els.cBloomStr, els.cSpin].forEach((el) =>
  el.addEventListener('input', applyControls));
[els.cGround, els.cBloom, els.cStars].forEach((el) =>
  el.addEventListener('change', applyControls));

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

// First scene on launch + license check.
refreshLicense();
els.prompt.value = EXAMPLES[0];
doGenerate();

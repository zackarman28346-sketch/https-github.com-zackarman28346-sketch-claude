// Lumen3D Studio — Electron main process.
// Owns the window and the privileged operations (export to disk, open paths).

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFromObject } from '../src/builder.js';
import { verifyLicense, isPro } from '../src/license.js';
import { verifierConfig } from '../src/license-config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// License persistence: a tiny JSON file in the app's user-data dir.
function licenseFile() {
  return path.join(app.getPath('userData'), 'license.json');
}

async function readStoredLicense() {
  try {
    const raw = await fs.readFile(licenseFile(), 'utf8');
    return JSON.parse(raw).key || '';
  } catch {
    return '';
  }
}

async function checkLicense(key) {
  const res = await verifyLicense(key, verifierConfig());
  return { pro: isPro(res), tier: res.tier || null, email: res.email || null, reason: res.reason || null };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 940,
    minHeight: 620,
    backgroundColor: '#0b0d1a',
    title: 'Lumen3D Studio',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  return win;
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---- licensing ----
ipcMain.handle('license-status', async () => {
  const key = await readStoredLicense();
  if (!key) return { pro: false };
  return { ...(await checkLicense(key)), key };
});

ipcMain.handle('license-activate', async (_e, key) => {
  const status = await checkLicense(String(key || '').trim());
  if (status.pro) {
    try {
      await fs.writeFile(licenseFile(), JSON.stringify({ key: String(key).trim() }), 'utf8');
    } catch { /* non-fatal */ }
  }
  return status;
});

ipcMain.handle('license-clear', async () => {
  try { await fs.unlink(licenseFile()); } catch { /* ignore */ }
  return { pro: false };
});

// Export the current scene as a deployable static site.
// The watermark badge is removed only when a valid Pro license is stored.
ipcMain.handle('export-site', async (_e, { config, vendor }) => {
  const win = BrowserWindow.getFocusedWindow();
  const res = await dialog.showOpenDialog(win, {
    title: 'Choose a folder to export your 3D site into',
    properties: ['openDirectory', 'createDirectory']
  });
  if (res.canceled || !res.filePaths[0]) return { canceled: true };

  const pro = (await checkLicense(await readStoredLicense())).pro;
  const outDir = path.join(res.filePaths[0], 'lumen-site');
  try {
    const out = await buildFromObject(config, outDir, { vendor: !!vendor, pro });
    return { canceled: false, outDir: out.outDir, files: out.files, vendored: out.vendored, pro };
  } catch (err) {
    return { canceled: false, error: err.message };
  }
});

// Save a PNG snapshot of the current preview.
ipcMain.handle('save-png', async (_e, { dataURL, name }) => {
  const win = BrowserWindow.getFocusedWindow();
  const res = await dialog.showSaveDialog(win, {
    title: 'Save snapshot',
    defaultPath: name || 'lumen-scene.png',
    filters: [{ name: 'PNG image', extensions: ['png'] }]
  });
  if (res.canceled || !res.filePath) return { canceled: true };
  const base64 = String(dataURL).replace(/^data:image\/png;base64,/, '');
  await fs.writeFile(res.filePath, Buffer.from(base64, 'base64'));
  return { path: res.filePath };
});

ipcMain.handle('open-path', async (_e, p) => {
  await shell.openPath(p);
});

ipcMain.handle('open-external', async (_e, url) => {
  if (/^https?:\/\//i.test(url)) await shell.openExternal(url);
});

// Lumen3D Studio — Electron main process.
// Owns the window and the privileged operations (export to disk, open paths).

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFromObject } from '../src/builder.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

// Export the current scene as a deployable static site.
ipcMain.handle('export-site', async (_e, { config, vendor }) => {
  const win = BrowserWindow.getFocusedWindow();
  const res = await dialog.showOpenDialog(win, {
    title: 'Choose a folder to export your 3D site into',
    properties: ['openDirectory', 'createDirectory']
  });
  if (res.canceled || !res.filePaths[0]) return { canceled: true };

  const outDir = path.join(res.filePaths[0], 'lumen-site');
  try {
    const out = await buildFromObject(config, outDir, { vendor: !!vendor });
    return { canceled: false, outDir: out.outDir, files: out.files, vendored: out.vendored };
  } catch (err) {
    return { canceled: false, error: err.message };
  }
});

ipcMain.handle('open-path', async (_e, p) => {
  await shell.openPath(p);
});

ipcMain.handle('open-external', async (_e, url) => {
  if (/^https?:\/\//i.test(url)) await shell.openExternal(url);
});

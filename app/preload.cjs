// Bridge a small, explicit API into the renderer. No Node access leaks through.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lumen', {
  exportSite: (payload) => ipcRenderer.invoke('export-site', payload),
  savePng: (payload) => ipcRenderer.invoke('save-png', payload),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
  openExternal: (url) => ipcRenderer.invoke('open-external', url)
});

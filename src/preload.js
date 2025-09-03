// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  reloadApp: () => ipcRenderer.invoke('reload-app'),
  showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options),
  // Keep other APIs if they exist and are used
  openSettings: () => ipcRenderer.invoke('show-open-dialog'),
  saveSettings: (data) => ipcRenderer.invoke('show-save-dialog', data),
});

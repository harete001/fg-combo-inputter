// src/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Renderer to Main (one-way)
  reloadApp: () => ipcRenderer.invoke('reload-app'),

  // Renderer to Main (two-way)
  openSettings: () => ipcRenderer.invoke('show-open-dialog'),
  saveSettings: (data) => ipcRenderer.invoke('show-save-dialog', data),
  showConfirmation: (message) => ipcRenderer.invoke('show-confirm-dialog', message),
});

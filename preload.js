const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    /**
     * Shows an open file dialog and returns the content of the selected file.
     * @returns {Promise<string|null>} File content as a string, or null if canceled.
     */
    openSettings: () => ipcRenderer.invoke('dialog:openFile'),

    /**
     * Shows a save file dialog and saves the provided data.
     * @param {string} data The data to save.
     * @param {string} defaultFileName The default file name for the save dialog.
     * @returns {Promise<boolean>} True if saved successfully, false otherwise.
     */
    saveSettings: (data, defaultFileName) => ipcRenderer.invoke('dialog:saveFile', data, defaultFileName),

    /**
     * Sets up a listener for when the 'Export Settings' menu item is clicked.
     * @param {Function} callback The function to call.
     */
    onExportRequest: (callback) => ipcRenderer.on('request-export', (event, ...args) => callback(...args)),

    /**
     * Sets up a listener for when the 'Import Settings' menu item is clicked.
     * @param {Function} callback The function to call.
     */
    onImportRequest: (callback) => ipcRenderer.on('request-import', (event, ...args) => callback(...args)),
});

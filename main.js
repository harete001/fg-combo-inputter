// main.js
// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'src/preload.js'),
      // It's recommended to turn off nodeIntegration and enable contextIsolation for security
      contextIsolation: true,
      nodeIntegration: false,
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile('src/index.html');

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// --- IPC Handlers for file operations ---

ipcMain.handle('show-open-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    const filePath = result.filePaths[0];
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content;
    } catch (error) {
        console.error('Failed to read file:', error);
        return { error: error.message };
    }
});

ipcMain.handle('show-save-dialog', async (event, data) => {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
    const defaultPath = `combo-editor-settings-${timestamp}.json`;

    const result = await dialog.showSaveDialog({
        defaultPath: defaultPath,
        filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (result.canceled || !result.filePath) {
        return null;
    }
    const filePath = result.filePath;
    try {
        fs.writeFileSync(filePath, data, 'utf-8');
        return { success: true, path: filePath };
    } catch (error) {
        console.error('Failed to save file:', error);
        return { error: error.message };
    }
});

ipcMain.handle('show-confirm-dialog', async (event, { title, message, detail }) => {
    const result = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['キャンセル', '実行'],
        defaultId: 1,
        cancelId: 0,
        title: title || '確認',
        message: message,
        detail: detail || 'この操作は元に戻せません。',
    });
    return result.response === 1; // "実行" button
});

ipcMain.handle('reload-app', () => {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
        focusedWindow.reload();
    }
});

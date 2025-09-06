const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    mainWindow.loadFile('index.html');

    // mainWindow.webContents.openDevTools();

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

const isMac = process.platform === 'darwin';

const menuTemplate = [
    ...(isMac ? [{
        label: app.name,
        submenu: [
            { role: 'about', label: 'このアプリについて' },
            { type: 'separator' },
            { role: 'services', label: 'サービス' },
            { type: 'separator' },
            { role: 'hide', label: '隠す' },
            { role: 'hideOthers', label: '他を隠す' },
            { role: 'unhide', label: 'すべてを表示' },
            { type: 'separator' },
            { role: 'quit', label: '終了' }
        ]
    }] : []),
    {
        label: 'ファイル',
        submenu: [
            {
                label: '設定をインポート',
                click: () => {
                    mainWindow.webContents.send('request-import');
                }
            },
            {
                label: '設定をエクスポート',
                click: () => {
                    mainWindow.webContents.send('request-export');
                }
            },
            { type: 'separator' },
            isMac ? { role: 'close', label: 'ウィンドウを閉じる' } : { role: 'quit', label: '終了' }
        ]
    },
    {
        label: '編集',
        submenu: [
            { role: 'undo', label: '元に戻す' },
            { role: 'redo', label: 'やり直す' },
            { type: 'separator' },
            { role: 'cut', label: '切り取り' },
            { role: 'copy', label: 'コピー' },
            { role: 'paste', label: '貼り付け' },
            { role: 'selectAll', label: 'すべて選択' }
        ]
    },
    {
        label: '表示',
        submenu: [
            { role: 'reload', label: 'リロード' },
            { role: 'forceReload', label: '強制的にリロード' },
            { role: 'toggleDevTools', label: '開発者ツールを開く' },
            { type: 'separator' },
            { role: 'resetZoom', label: '実際のサイズ' },
            { role: 'zoomIn', label: '拡大' },
            { role: 'zoomOut', label: '縮小' },
            { type: 'separator' },
            { role: 'togglefullscreen', label: 'フルスクリーン' }
        ]
    },
    {
        label: 'ウィンドウ',
        submenu: [
            { role: 'minimize', label: '最小化' },
            { role: 'zoom', label: 'ズーム' },
            ...(isMac ? [
                { type: 'separator' },
                { role: 'front', label: '手前に移動' },
            ] : [
                { role: 'close', label: '閉じる' }
            ])
        ]
    }
];

// IPC handler for opening a file dialog
ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (canceled || filePaths.length === 0) {
        return null;
    }
    try {
        const data = fs.readFileSync(filePaths[0], 'utf-8');
        return data;
    } catch (error) {
        console.error('Failed to read file:', error);
        return null;
    }
});

// IPC handler for saving a file
ipcMain.handle('dialog:saveFile', async (event, data, defaultFileName) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultFileName,
        filters: [
            { name: 'JSON Files', extensions: ['json'] },
            { name: 'All Files', extensions: ['*'] }
        ]
    });
    if (canceled || !filePath) {
        return false;
    }
    try {
        fs.writeFileSync(filePath, data);
        return true;
    } catch (error) {
        console.error('Failed to save file:', error);
        return false;
    }
});

app.on('ready', () => {
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

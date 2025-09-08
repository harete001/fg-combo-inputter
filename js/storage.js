/**
 * @file Manages loading from and saving to localStorage.
 * Also handles import/export functionality for all application data.
 * @module storage
 */

import { state } from './state.js';
import { defaultActions, DEFAULT_COLOR } from './constants.js';
import * as dom from './dom.js';
import { openConfirmModal } from './components/modals.js';

/**
 * Loads the user-defined view order from localStorage into the state.
 * Falls back to a default order if not found or invalid.
 */
export const loadViewOrder = () => {
    const savedOrder = localStorage.getItem('comboEditorViewOrder');
    try {
        if (savedOrder) {
            const parsedOrder = JSON.parse(savedOrder);
            if (!Array.isArray(parsedOrder)) throw new Error("View order is not an array.");
            state.viewOrder = parsedOrder.filter(id => id !== 'player' && id !== 'history');

            if (!state.viewOrder.includes('settings')) {
                state.viewOrder.push('settings');
            }
            if (!state.viewOrder.includes('spreadsheet')) {
                const settingsIndex = state.viewOrder.indexOf('settings');
                if (settingsIndex > -1) {
                    state.viewOrder.splice(settingsIndex, 0, 'spreadsheet');
                } else {
                    state.viewOrder.push('spreadsheet');
                }
            }
            if (!state.viewOrder.includes('database')) {
                state.viewOrder.splice(1, 0, 'database');
            }
        } else {
            throw new Error("No saved order found.");
        }
    } catch (e) {
        console.error(`[ComboEditor] Failed to parse viewOrder. Using default.`, e);
        state.viewOrder = ['editor', 'database', 'spreadsheet', 'settings'];
    }
};

/** Saves the current view order from the state to localStorage. */
export const saveViewOrder = () => { localStorage.setItem('comboEditorViewOrder', JSON.stringify(state.viewOrder)); };

/**
 * Loads action presets from localStorage into the state.
 */
export const loadPresets = () => {
    try {
        state.presets = JSON.parse(localStorage.getItem('comboEditorActionPresets') || '{}');
    } catch (e) {
        console.error(`[ComboEditor] Failed to parse presets. Using empty object.`, e);
        state.presets = {};
    }
};

/** Saves the current presets from the state to localStorage. */
export const savePresets = () => { localStorage.setItem('comboEditorActionPresets', JSON.stringify(state.presets)); };

/**
 * Loads the current set of actions from localStorage into the state.
 * Falls back to default actions if not found or invalid.
 */
export const loadCurrentActions = () => {
    try {
        const loaded = JSON.parse(localStorage.getItem('comboEditorCurrentActions'));
        state.actions = loaded && Array.isArray(loaded) ? loaded.map(a => ({ ...a, color: a.color || DEFAULT_COLOR, addNeutralFive: a.addNeutralFive !== false })) : JSON.parse(JSON.stringify(defaultActions));
    } catch (e) {
        console.error(`[ComboEditor] Failed to parse current actions. Using default.`, e);
        state.actions = JSON.parse(JSON.stringify(defaultActions));
    }
};

/** Saves the current actions from the state to localStorage. */
export const saveCurrentActions = () => { localStorage.setItem('comboEditorCurrentActions', JSON.stringify(state.actions)); };

/** Loads the 'auto-commit on attack' setting from localStorage. */
export const loadAutoCommitSetting = () => {
    const saved = localStorage.getItem('comboEditorAutoCommit');
    state.autoCommitOnAttack = saved !== null ? saved === 'true' : true;
    dom.autoCommitCheckbox.checked = state.autoCommitOnAttack;
};

/** Saves the 'auto-commit on attack' setting to localStorage. */
export const saveAutoCommitSetting = () => { localStorage.setItem('comboEditorAutoCommit', state.autoCommitOnAttack); };

/** Loads the 'hold attack' settings from localStorage. */
export const loadHoldAttackSetting = () => {
    const savedEnable = localStorage.getItem('comboEditorEnableHoldAttack');
    state.enableHoldAttack = savedEnable !== null ? savedEnable === 'true' : false;
    dom.enableHoldAttackCheckbox.checked = state.enableHoldAttack;

    const savedText = localStorage.getItem('comboEditorHoldAttackText');
    state.holdAttackText = savedText !== null ? savedText : '[hold]';
    dom.holdAttackTextInput.value = state.holdAttackText;

    const savedFrames = localStorage.getItem('comboEditorHoldAttackFrames');
    const savedDurationMs = localStorage.getItem('comboEditorHoldAttackDuration');

    if (savedFrames !== null) {
        state.holdAttackFrames = parseInt(savedFrames, 10);
    } else if (savedDurationMs !== null) {
        state.holdAttackFrames = Math.round(parseInt(savedDurationMs, 10) / 1000 * 60);
        localStorage.setItem('comboEditorHoldAttackFrames', state.holdAttackFrames);
        localStorage.removeItem('comboEditorHoldAttackDuration');
    } else {
        state.holdAttackFrames = 30;
    }
    dom.holdAttackDurationInput.value = state.holdAttackFrames;
};

/** Saves the 'hold attack' settings to localStorage. */
export const saveHoldAttackSetting = () => {
    localStorage.setItem('comboEditorEnableHoldAttack', state.enableHoldAttack);
    localStorage.setItem('comboEditorHoldAttackText', state.holdAttackText);
    localStorage.setItem('comboEditorHoldAttackFrames', state.holdAttackFrames);
};

/** Loads the 'prefix' setting from localStorage. */
export const loadPrefixSetting = () => {
    const saved = localStorage.getItem('comboEditorEnablePrefixes');
    state.enablePrefixes = saved !== null ? saved === 'true' : false;
    dom.enablePrefixesCheckbox.checked = state.enablePrefixes;
};

/** Saves the 'prefix' setting to localStorage. */
export const savePrefixSetting = () => { localStorage.setItem('comboEditorEnablePrefixes', state.enablePrefixes); };

/**
 * Loads memos for the current video from localStorage.
 */
export const loadMemos = () => {
    if (!state.currentVideoId) {
        state.memos = [];
        return;
    }
    try {
        state.memos = JSON.parse(localStorage.getItem(`combo-editor-memos-${state.currentVideoId}`) || '[]');
    } catch (e) {
        console.error(`[ComboEditor] Failed to parse memos for video ${state.currentVideoId}. Using empty array.`, e);
        state.memos = [];
    }
};

/**
 * Saves memos for the current video to localStorage.
 */
export const saveMemos = () => {
    if (!state.currentVideoId) return;
    localStorage.setItem(`combo-editor-memos-${state.currentVideoId}`, JSON.stringify(state.memos));
};

/**
 * Loads the playback history from localStorage.
 */
export const loadPlaybackHistory = () => {
    try {
        state.playbackHistory = JSON.parse(localStorage.getItem('comboEditorPlaybackHistory') || '[]');
    } catch (e) {
        console.error(`[ComboEditor] Failed to parse playback history. Using empty array.`, e);
        state.playbackHistory = [];
    }
};

/**
 * Saves the playback history to localStorage.
 */
export const savePlaybackHistory = () => { localStorage.setItem('comboEditorPlaybackHistory', JSON.stringify(state.playbackHistory)); };

/**
 * Loads all settings related to the spreadsheet view from localStorage.
 */
export const loadSpreadsheetSettings = () => {
    try {
        state.spreadsheetColumns = JSON.parse(localStorage.getItem('spreadsheetColumns') || '[]');
        if (!Array.isArray(state.spreadsheetColumns)) state.spreadsheetColumns = [];
        state.spreadsheetData = JSON.parse(localStorage.getItem('spreadsheetData') || '{}');
    } catch (e) {
        console.error(`[ComboEditor] Failed to parse spreadsheet settings. Resetting.`, e);
        state.spreadsheetColumns = [];
        state.spreadsheetData = {};
    }

    if (state.spreadsheetColumns.length === 0) {
        state.spreadsheetColumns = [
            { id: `col-${Date.now()}-1`, header: '日付' },
            { id: `col-${Date.now()}-2`, header: 'コンボ' },
            { id: `col-${Date.now()}-3`, header: 'メモ' },
        ];
    }
    state.comboColumnId = localStorage.getItem('comboColumnId');
    if (state.comboColumnId === null && state.spreadsheetColumns.length > 0) {
        const defaultComboCol = state.spreadsheetColumns.find(c => c.header === 'コンボ');
        state.comboColumnId = defaultComboCol ? defaultComboCol.id : null;
    }
    state.memoColumnId = localStorage.getItem('memoColumnId');
    if (state.memoColumnId === null && state.spreadsheetColumns.length > 0) {
        const defaultMemoCol = state.spreadsheetColumns.find(c => c.header === 'メモ');
        state.memoColumnId = defaultMemoCol ? defaultMemoCol.id : null;
    }
};

/**
 * Saves all settings related to the spreadsheet view to localStorage.
 */
export const saveSpreadsheetSettings = () => {
    localStorage.setItem('spreadsheetColumns', JSON.stringify(state.spreadsheetColumns));
    localStorage.setItem('spreadsheetData', JSON.stringify(state.spreadsheetData));
    localStorage.setItem('comboColumnId', state.comboColumnId || '');
    localStorage.setItem('memoColumnId', state.memoColumnId || '');
};

/**
 * Loads spreadsheet layout presets from localStorage.
 */
export const loadSpreadsheetPresets = () => {
    try {
        state.spreadsheetPresets = JSON.parse(localStorage.getItem('spreadsheetPresets') || '{}');
    } catch (e) {
        console.error(`[ComboEditor] Failed to parse spreadsheet presets. Using empty object.`, e);
        state.spreadsheetPresets = {};
    }
};

/**
 * Saves spreadsheet layout presets to localStorage.
 */
export const saveSpreadsheetPresets = () => { localStorage.setItem('spreadsheetPresets', JSON.stringify(state.spreadsheetPresets)); };

/**
 * Loads the spreadsheet memo from localStorage.
 */
export const loadSpreadsheetMemo = () => {
    state.spreadsheetMemo = localStorage.getItem('spreadsheetMemo') || '';
    if (dom.spreadsheetMemoInput) {
        dom.spreadsheetMemoInput.value = state.spreadsheetMemo;
    }
};

/**
 * Saves the spreadsheet memo to localStorage.
 */
export const saveSpreadsheetMemo = () => { localStorage.setItem('spreadsheetMemo', state.spreadsheetMemo); };

/**
 * Exports all application data (localStorage and IndexedDB) to a JSON file.
 */
export async function exportAllSettings() {
    try {
        console.log('[ComboEditor] Exporting all settings...');

        const localStorageData = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // Export relevant keys
            if (key.startsWith('comboEditor') || key.startsWith('spreadsheet') || key.startsWith('combo-editor-memos')) {
                localStorageData[key] = localStorage.getItem(key);
            }
        }

        const indexedDbData = await window.db.exportDB();

        const allData = {
            version: 1,
            exportedAt: new Date().toISOString(),
            localStorage: localStorageData,
            indexedDb: indexedDbData
        };

        const jsonString = JSON.stringify(allData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        a.download = `combo-editor-backup-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('[ComboEditor] Export successful.');

    } catch (error) {
        console.error('[ComboEditor] Failed to export settings:', error);
        alert(`設定のエクスポートに失敗しました: ${error.message}`);
    }
}

/**
 * Imports all application data from a JSON file, overwriting current data.
 * @param {Event} event - The file input change event.
 */
export function importAllSettings(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (!data.localStorage || !data.indexedDb) {
                throw new Error('無効なバックアップファイルです。');
            }

            openConfirmModal('設定をインポートします。<br><strong class="text-red-400">現在のすべての設定とデータが上書きされます。</strong><br>よろしいですか？', async () => {
                console.log('[ComboEditor] Importing settings...');
                localStorage.clear();
                Object.keys(data.localStorage).forEach(key => {
                    localStorage.setItem(key, data.localStorage[key]);
                });
                await window.db.importDB(data.indexedDb);
                alert('インポートが完了しました。アプリケーションをリロードします。');
                window.location.reload();
            });
        } catch (error) {
            console.error('[ComboEditor] Failed to import settings:', error);
            alert(`設定のインポートに失敗しました: ${error.message}`);
        } finally {
            event.target.value = ''; // Reset file input
        }
    };
    reader.readAsText(file);
}

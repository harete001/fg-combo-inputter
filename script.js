import { LOG_PREFIX, viewDetails } from './js/constants.js';
import { state } from './js/state.js';
import { loadViewOrder, loadPresets, loadCurrentActions, loadAutoCommitSetting, loadHoldAttackSetting, loadPrefixSetting, loadSpreadsheetSettings, loadSpreadsheetPresets, loadSpreadsheetMemo, loadPlaybackHistory, loadGamepadMappings } from './js/storage.js';
import { migrateCombosFromLocalStorage, renderDatabaseView } from './js/database_helpers.js';
import { renderSidebar, populateSettingsPanel, populatePresetDropdown, renderSettingsSidebar, createGrid, populateSpreadsheetPresetDropdown, updateMergedOutput, renderSpreadsheetView, showView, buildUrl } from './js/ui.js';
import { setupEventListeners } from './js/events.js';
import { loadYouTubeAPI } from './js/youtube.js';
import { initializeGamepad } from './js/gamepad.js';

document.addEventListener('DOMContentLoaded', () => {
    const initialize = async () => {
        console.log(`${LOG_PREFIX} アプリケーションを初期化します。`);
        await window.db.openDB();
        await migrateCombosFromLocalStorage();
        loadViewOrder();
        renderSidebar();
        loadPresets();
        loadCurrentActions();
        loadAutoCommitSetting();
        loadHoldAttackSetting();
        loadPrefixSetting();
        loadGamepadMappings();
        populateSettingsPanel();
        loadSpreadsheetSettings();
        loadSpreadsheetPresets();
        loadSpreadsheetMemo();
        populatePresetDropdown();
        renderSettingsSidebar();
        createGrid();
        populateSpreadsheetPresetDropdown();
        setupEventListeners();
        updateMergedOutput(); 
        initializeGamepad();
        loadYouTubeAPI();
        loadPlaybackHistory();
        renderSpreadsheetView();

        const hash = window.location.hash.substring(1);
        const hashParts = hash.split('/');
        let initialViewId = hashParts[0];
        let initialOptions = {};

        if (!viewDetails[initialViewId]) {
            initialViewId = state.viewOrder[0];
        } else {
            if (initialViewId === 'database' && hashParts[1]) {
                initialOptions.tableName = decodeURIComponent(hashParts[1]);
            } else if (initialViewId === 'settings' && hashParts[1] && state.settingsSubViews[hashParts[1]]) {
                initialOptions.subViewId = hashParts[1];
            }
        }

        const initialState = { viewId: initialViewId, options: initialOptions };
        const initialTitle = viewDetails[initialViewId] ? `コンボエディター - ${viewDetails[initialViewId].title}` : 'コンボエディター';
        const initialUrl = buildUrl(initialViewId, initialOptions);

        history.replaceState(initialState, initialTitle, initialUrl);
        document.title = initialTitle;
        showView(initialViewId, initialOptions, true);

        console.log(`${LOG_PREFIX} 初期化が完了しました。`);
    };

    initialize();
});

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 定数とグローバル変数定義 ---
    const LOG_PREFIX = '[ComboEditor]';
    const DEFAULT_COLOR = '#FFFFFF';

    // --- DOM要素の取得 ---
    const sidebarNavList = document.getElementById('sidebar-nav-list');
    const gridContainer = document.getElementById('grid-container');
    const mergedOutput = document.getElementById('merged-output');
    const copyButton = document.getElementById('copy-button');
    const resetButton = document.getElementById('reset-button');
    const resetSettingsButton = document.getElementById('reset-settings-button');
    const presetSelect = document.getElementById('preset-select');
    const deletePresetButton = document.getElementById('delete-preset-button');
    const presetNameInput = document.getElementById('preset-name-input');
    const savePresetButton = document.getElementById('save-preset-button');
    const commandInputModalContainer = document.getElementById('command-input-modal-container');
    const commandModalPreview = document.getElementById('command-modal-preview');
    const committedCommandsList = document.getElementById('committed-commands-list');
    const autoCommitCheckbox = document.getElementById('auto-commit-checkbox');
    const enableHoldAttackCheckbox = document.getElementById('enable-hold-attack-checkbox');
    const holdAttackTextInput = document.getElementById('hold-attack-text-input');
    const holdAttackDurationInput = document.getElementById('hold-attack-duration-input');
    const enablePrefixesCheckbox = document.getElementById('enable-prefixes-checkbox');
    const actionsListContainer = document.getElementById('actions-list');
    const addActionButton = document.getElementById('add-action-button');
    const saveComboButton = document.getElementById('save-combo-button');
    const editorView = document.getElementById('editor-view');
    const playerView = document.getElementById('player-view');
    const settingsPageView = document.getElementById('settings-page-view');
    const exportSettingsButton = document.getElementById('export-settings-button');
    const importSettingsInput = document.getElementById('import-settings-input');
    const importSettingsButton = document.getElementById('import-settings-button');
    const confirmDeleteModalContainer = document.getElementById('confirm-delete-modal-container');

    // Settings Page Elements
    const settingsSidebarList = document.getElementById('settings-sidebar-list');
    const settingsContentArea = document.getElementById('settings-content-area');
    const dataManagementView = document.getElementById('data-management-view');
    const keyMappingView = document.getElementById('key-mapping-view');
    const editorSettingsToc = document.getElementById('editor-settings-toc');
    const confirmDeleteMessage = document.getElementById('confirm-delete-message');
    const confirmDeleteButton = document.getElementById('confirm-delete-button');
    const cancelDeleteButton = document.getElementById('cancel-delete-button');
    const youtubeUrlInput = document.getElementById('youtube-url-input');
    const moveRecordsModalContainer = document.getElementById('move-records-modal-container');
    const moveRecordsMessage = document.getElementById('move-records-message');
    const moveTargetTableSelect = document.getElementById('move-target-table-select');
    const confirmMoveButton = document.getElementById('confirm-move-button');
    const cancelMoveButton = document.getElementById('cancel-move-button');
    const youtubeLoadButton = document.getElementById('youtube-load-button');
    const memoDisplay = document.getElementById('memo-display');
    const memoInput = document.getElementById('memo-input');
    const addMemoButton = document.getElementById('add-memo-button');
    const clearMemosButton = document.getElementById('clear-memos-button');
    const historySearchInput = document.getElementById('history-search-input');
    const showPlaybackHistoryButton = document.getElementById('show-playback-history-button');
    const playbackHistoryModalContainer = document.getElementById('playback-history-modal-container');
    const closeHistoryModalButton = document.getElementById('close-history-modal-button');
    const playbackHistoryContainer = document.getElementById('playback-history-container');

    // Spreadsheet View Elements
    const spreadsheetView = document.getElementById('spreadsheet-view');
    const addSpreadsheetColumnButton = document.getElementById('add-spreadsheet-column-button');
    const comboColumnSelect = document.getElementById('combo-column-select');
    const spreadsheetDataTableContainer = document.getElementById('spreadsheet-data-table-container');
    const spreadsheetOutput = document.getElementById('spreadsheet-output');
    const copySpreadsheetDataButton = document.getElementById('copy-spreadsheet-data-button');
    const spreadsheetPresetSelect = document.getElementById('spreadsheet-preset-select');
    const deleteSpreadsheetPresetButton = document.getElementById('delete-spreadsheet-preset-button');
    const spreadsheetPresetNameInput = document.getElementById('spreadsheet-preset-name-input');
    const saveSpreadsheetPresetButton = document.getElementById('save-spreadsheet-preset-button');
    const spreadsheetMemoInput = document.getElementById('spreadsheet-memo-input');
    const memoColumnSelect = document.getElementById('memo-column-select');

    // Database View Elements
    const databaseView = document.getElementById('database-view');
    const createTableView = document.getElementById('create-table-view');
    const editTableView = document.getElementById('edit-table-view');

    // Editor-DB Integration Elements
    const saveTableSelect = document.getElementById('save-table-select');
    const editorMetadataFormContainer = document.getElementById('editor-metadata-form-container');

    // --- グローバル変数 ---
    let totalInputs = 0, draggedItem = null, previousDirectionState = '5';
    let commandBuffer = [], committedCommands = [];
    const pressedKeys = new Set(); 
    let activeCommandInputTarget = null, autoCommitOnAttack = true;
    let enableHoldAttack = false;
    let holdAttackText = '[hold]';
    let holdAttackFrames = 18;
    let holdAttackTimer = null, ignoredKeysUntilRelease = new Set();
    let enablePrefixes = false;
    let actions = [], presets = {};
    let onConfirmDelete = null;
    let onConfirmMove = null;
    let ytPlayer, currentVideoId = null, memos = [];
    let currentViewIndex = 0;
    let viewOrder = [];
    let playbackHistory = [];
    let spreadsheetColumns = [];
    let spreadsheetData = {};
    let comboColumnId = null;
    let memoColumnId = null;
    let spreadsheetMemo = '';
    let spreadsheetPresets = {};
    let draggedColumnId = null;
    let currentSettingsSubViewId = 'keyMapping';
    const settingsSubViews = {
        keyMapping: { title: 'エディター', element: keyMappingView },
        dataManagement: { title: 'データの管理', element: dataManagementView },
    };

    const viewDetails = {
        editor: { title: 'エディター' },
        database: { title: 'データベース' },
        'create-table': { title: 'テーブル作成' },
        'edit-table': { title: 'テーブル設定' },
        spreadsheet: { title: 'スプレッドシート' },
        settings: { title: '設定' },
    };

    const defaultActions = [
        { id: `action-${Date.now()}-1`, output: 'P', key: 'j', color: '#FFA3EE', addNeutralFive: true },
        { id: `action-${Date.now()}-2`, output: 'K', key: 'k', color: '#006EFF', addNeutralFive: true },
        { id: `action-${Date.now()}-3`, output: 'S', key: 'l', color: '#42FF7B', addNeutralFive: true },
        { id: `action-${Date.now()}-4`, output: 'HS', key: 'm', color: '#FF4747', addNeutralFive: true },
        { id: `action-${Date.now()}-5`, output: 'D', key: ',', color: '#FFA742', addNeutralFive: true },
        { id: `action-${Date.now()}-6`, output: 'RC', key: ':', color: '#FFFFFF', addNeutralFive: false },
        { id: `action-${Date.now()}-7`, output: 'dc', key: ';', color: '#FFFFFF', addNeutralFive: false },
        { id: `action-${Date.now()}-8`, output: 'dcc', key: 'i', color: '#FFFFFF', addNeutralFive: false },
        { id: `action-${Date.now()}-9`, output: 'jc', key: '8', color: '#FFFFFF', addNeutralFive: false },
        { id: `action-${Date.now()}-10`, output: 'adc', key: '9', color: '#FFFFFF', addNeutralFive: false },
    ];
    
    // --- 2. 初期化処理 ---
    const initialize = async () => {
        console.log(`${LOG_PREFIX} アプリケーションを初期化します。`);
        await window.db.openDB(); // Ensure DB is open before anything else
        await migrateCombosFromLocalStorage(); // Check for old data
        loadViewOrder();
        renderSidebar();
        loadPresets();
        loadCurrentActions();
        loadAutoCommitSetting();
        loadHoldAttackSetting();
        loadPrefixSetting();
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
        loadYouTubeAPI();
        loadPlaybackHistory();
        renderSpreadsheetView();

        // URLのハッシュに基づいて初期ビューを決定し、履歴をセットアップ
        const hash = window.location.hash.substring(1);
        const hashParts = hash.split('/');
        let initialViewId = hashParts[0];
        let initialOptions = {};

        if (!viewDetails[initialViewId]) {
            initialViewId = viewOrder[0];
        } else {
            if (initialViewId === 'database' && hashParts[1]) {
                initialOptions.tableName = decodeURIComponent(hashParts[1]);
            } else if (initialViewId === 'settings' && hashParts[1] && settingsSubViews[hashParts[1]]) {
                initialOptions.subViewId = hashParts[1];
            }
        }

        const initialState = { viewId: initialViewId, options: initialOptions };
        const initialTitle = viewDetails[initialViewId] ? `コンボエディター - ${viewDetails[initialViewId].title}` : 'コンボエディター';
        const initialUrl = buildUrl(initialViewId, initialOptions);

        history.replaceState(initialState, initialTitle, initialUrl);
        document.title = initialTitle;
        showView(initialViewId, initialOptions, true); // fromPopState=trueで呼び、履歴操作をスキップ

        console.log(`${LOG_PREFIX} 初期化が完了しました。`);
    };

    // --- 3. データ管理 (localStorage & IndexedDB) ---
    const loadViewOrder = () => {
        const savedOrder = localStorage.getItem('comboEditorViewOrder');
        try {
            if (savedOrder) {
                const parsedOrder = JSON.parse(savedOrder);
                if (!Array.isArray(parsedOrder)) throw new Error("View order is not an array.");
                // For backward compatibility, filter out 'player' and 'history'
                viewOrder = parsedOrder.filter(id => id !== 'player' && id !== 'history');

                if (!viewOrder.includes('settings')) {
                    viewOrder.push('settings');
                }
                if (!viewOrder.includes('spreadsheet')) {
                    const settingsIndex = viewOrder.indexOf('settings');
                    if (settingsIndex > -1) {
                        viewOrder.splice(settingsIndex, 0, 'spreadsheet');
                    } else {
                        viewOrder.push('spreadsheet');
                    }
                }
                if (!viewOrder.includes('database')) {
                    viewOrder.splice(1, 0, 'database');
                }
            } else {
                throw new Error("No saved order found.");
            }
        } catch (e) {
            console.error(`${LOG_PREFIX} Failed to parse viewOrder. Using default.`, e);
            // Default view order for new users
            viewOrder = ['editor', 'database', 'spreadsheet', 'settings'];
        }
    };
    const saveViewOrder = () => { localStorage.setItem('comboEditorViewOrder', JSON.stringify(viewOrder)); };
    const loadPresets = () => {
        try {
            presets = JSON.parse(localStorage.getItem('comboEditorActionPresets') || '{}');
        } catch (e) {
            console.error(`${LOG_PREFIX} Failed to parse presets. Using empty object.`, e);
            presets = {};
        }
    };
    const savePresets = () => { localStorage.setItem('comboEditorActionPresets', JSON.stringify(presets)); };
    const loadCurrentActions = () => {
        try {
            const loaded = JSON.parse(localStorage.getItem('comboEditorCurrentActions'));
            actions = loaded && Array.isArray(loaded) ? loaded.map(a => ({ ...a, color: a.color || DEFAULT_COLOR, addNeutralFive: a.addNeutralFive !== false })) : JSON.parse(JSON.stringify(defaultActions));
        } catch (e) {
            console.error(`${LOG_PREFIX} Failed to parse current actions. Using default.`, e);
            actions = JSON.parse(JSON.stringify(defaultActions));
        }
    };
    const saveCurrentActions = () => { localStorage.setItem('comboEditorCurrentActions', JSON.stringify(actions)); };
    const loadAutoCommitSetting = () => {
        const saved = localStorage.getItem('comboEditorAutoCommit');
        autoCommitOnAttack = saved !== null ? saved === 'true' : true;
        autoCommitCheckbox.checked = autoCommitOnAttack;
    };
    const saveAutoCommitSetting = () => { localStorage.setItem('comboEditorAutoCommit', autoCommitOnAttack); };

    const loadHoldAttackSetting = () => {
        const savedEnable = localStorage.getItem('comboEditorEnableHoldAttack');
        enableHoldAttack = savedEnable !== null ? savedEnable === 'true' : false;
        enableHoldAttackCheckbox.checked = enableHoldAttack;

        const savedText = localStorage.getItem('comboEditorHoldAttackText');
        holdAttackText = savedText !== null ? savedText : '[hold]';
        holdAttackTextInput.value = holdAttackText;

        // 後方互換性のための処理: msからフレームへ
        const savedFrames = localStorage.getItem('comboEditorHoldAttackFrames');
        const savedDurationMs = localStorage.getItem('comboEditorHoldAttackDuration');

        if (savedFrames !== null) {
            holdAttackFrames = parseInt(savedFrames, 10);
        } else if (savedDurationMs !== null) {
            // 古いms設定をフレームに変換
            holdAttackFrames = Math.round(parseInt(savedDurationMs, 10) / 1000 * 60);
            localStorage.setItem('comboEditorHoldAttackFrames', holdAttackFrames); // 新しいキーで保存
            localStorage.removeItem('comboEditorHoldAttackDuration'); // 古いキーを削除
        } else {
            holdAttackFrames = 18; // デフォルトは18フレーム
        }
        holdAttackDurationInput.value = holdAttackFrames;
    };
    const saveHoldAttackSetting = () => {
        localStorage.setItem('comboEditorEnableHoldAttack', enableHoldAttack);
        localStorage.setItem('comboEditorHoldAttackText', holdAttackText);
        localStorage.setItem('comboEditorHoldAttackFrames', holdAttackFrames);
    };
    const loadPrefixSetting = () => {
        const saved = localStorage.getItem('comboEditorEnablePrefixes');
        enablePrefixes = saved !== null ? saved === 'true' : false;
        enablePrefixesCheckbox.checked = enablePrefixes;
    };
    const savePrefixSetting = () => {
        localStorage.setItem('comboEditorEnablePrefixes', enablePrefixes);
    };

    const migrateCombosFromLocalStorage = async () => {
        const migrationComplete = localStorage.getItem('migrationToIndexedDbComplete');
        if (migrationComplete === 'true') return;

        console.log(`${LOG_PREFIX} Checking for old combo data in localStorage...`);
        const oldCombos = JSON.parse(localStorage.getItem('comboEditorSavedCombos') || '[]');
        if (oldCombos.length === 0) {
            localStorage.setItem('migrationToIndexedDbComplete', 'true');
            return;
        }

        console.log(`${LOG_PREFIX} Found ${oldCombos.length} old combos. Migrating to a new table...`);

        const tableName = 'migrated_combos';
        const schema = {
            tableName,
            columns: [
                { id: 'combohtml', name: 'コンボ' },
                { id: 'timestamp', name: '保存日時' },
                { id: 'memo', name: 'メモ' }
            ],
            recordCount: oldCombos.length,
            lastUpdated: new Date().toISOString()
        };

        try {
            localStorage.setItem('pendingSchema', JSON.stringify(schema));
            await window.db.openDB(db.version + 1);

            const dbInstance = await window.db.openDB();
            const tx = dbInstance.transaction(tableName, 'readwrite');
            oldCombos.forEach(combo => {
                tx.objectStore(tableName).add({
                    combohtml: combo.comboHTML,
                    timestamp: combo.timestamp,
                    memo: `Migrated from localStorage. Old ID: ${combo.id}`
                });
            });
            await new Promise(resolve => tx.oncomplete = resolve);

            console.log(`${LOG_PREFIX} Successfully migrated combos to '${tableName}' table.`);
            localStorage.setItem('migrationToIndexedDbComplete', 'true');
            localStorage.setItem('comboEditorSavedCombos_MIGRATED', JSON.stringify(oldCombos));
            localStorage.removeItem('comboEditorSavedCombos');
        } catch (error) {
            console.error(`${LOG_PREFIX} Error migrating combos:`, error);
            localStorage.removeItem('pendingSchema');
        }
    };

    const loadMemos = () => {
        if (!currentVideoId) {
            memos = [];
            return;
        }
        try {
            memos = JSON.parse(localStorage.getItem(`combo-editor-memos-${currentVideoId}`) || '[]');
        } catch (e) {
            console.error(`${LOG_PREFIX} Failed to parse memos for video ${currentVideoId}. Using empty array.`, e);
            memos = [];
        }
    };
    const saveMemos = () => {
        if (!currentVideoId) return;
        localStorage.setItem(`combo-editor-memos-${currentVideoId}`, JSON.stringify(memos));
    };
    const loadPlaybackHistory = () => {
        try {
            playbackHistory = JSON.parse(localStorage.getItem('comboEditorPlaybackHistory') || '[]');
        } catch (e) {
            console.error(`${LOG_PREFIX} Failed to parse playback history. Using empty array.`, e);
            playbackHistory = [];
        }
    };
    const savePlaybackHistory = () => { localStorage.setItem('comboEditorPlaybackHistory', JSON.stringify(playbackHistory)); };
    const loadSpreadsheetSettings = () => {
        try {
            spreadsheetColumns = JSON.parse(localStorage.getItem('spreadsheetColumns') || '[]');
            if (!Array.isArray(spreadsheetColumns)) spreadsheetColumns = [];
            spreadsheetData = JSON.parse(localStorage.getItem('spreadsheetData') || '{}');
        } catch (e) {
            console.error(`${LOG_PREFIX} Failed to parse spreadsheet settings. Resetting.`, e);
            spreadsheetColumns = [];
            spreadsheetData = {};
        }

        if (spreadsheetColumns.length === 0) { // デフォルト設定
            spreadsheetColumns = [
                { id: `col-${Date.now()}-1`, header: '日付' },
                { id: `col-${Date.now()}-2`, header: 'コンボ' },
                { id: `col-${Date.now()}-3`, header: 'メモ' },
            ];
        }
        comboColumnId = localStorage.getItem('comboColumnId');
        if (comboColumnId === null && spreadsheetColumns.length > 0) {
            const defaultComboCol = spreadsheetColumns.find(c => c.header === 'コンボ');
            comboColumnId = defaultComboCol ? defaultComboCol.id : null;
        }
        memoColumnId = localStorage.getItem('memoColumnId');
        if (memoColumnId === null && spreadsheetColumns.length > 0) {
            const defaultMemoCol = spreadsheetColumns.find(c => c.header === 'メモ');
            memoColumnId = defaultMemoCol ? defaultMemoCol.id : null;
        }
    };
    const saveSpreadsheetSettings = () => {
        localStorage.setItem('spreadsheetColumns', JSON.stringify(spreadsheetColumns));
        localStorage.setItem('spreadsheetData', JSON.stringify(spreadsheetData));
        localStorage.setItem('comboColumnId', comboColumnId || '');
        localStorage.setItem('memoColumnId', memoColumnId || '');
    };
    const loadSpreadsheetPresets = () => {
        try {
            spreadsheetPresets = JSON.parse(localStorage.getItem('spreadsheetPresets') || '{}');
        } catch (e) {
            console.error(`${LOG_PREFIX} Failed to parse spreadsheet presets. Using empty object.`, e);
            spreadsheetPresets = {};
        }
    };
    const saveSpreadsheetPresets = () => { localStorage.setItem('spreadsheetPresets', JSON.stringify(spreadsheetPresets)); };
    const loadSpreadsheetMemo = () => {
        spreadsheetMemo = localStorage.getItem('spreadsheetMemo') || '';
        if (spreadsheetMemoInput) {
            spreadsheetMemoInput.value = spreadsheetMemo;
        }
    };
    const saveSpreadsheetMemo = () => { localStorage.setItem('spreadsheetMemo', spreadsheetMemo); };

    // --- 4. UI描画・更新処理 ---
    const renderSidebar = () => {
        sidebarNavList.innerHTML = '';
        viewOrder.forEach(viewId => {
            const li = document.createElement('li');
            li.className = 'nav-item mb-2';
            li.dataset.viewId = viewId;
            li.draggable = true;

            const a = document.createElement('a');
            a.href = '#';
            a.id = `nav-${viewId}`;
            a.className = 'nav-link text-lg px-4 py-2 block rounded-md';
            a.textContent = viewDetails[viewId].title;

            li.appendChild(a);
            sidebarNavList.appendChild(li);
        });
        addSidebarEventListeners();
    };

    const populateSettingsPanel = () => {
        actionsListContainer.innerHTML = '';
        actions.forEach(action => {
            const row = document.createElement('div');
            row.className = 'grid grid-cols-5 gap-4 items-center p-2 rounded-md';
            
            const outputInput = document.createElement('input');
            outputInput.type = 'text';
            outputInput.value = action.output;
            outputInput.className = 'form-input w-full p-2 bg-gray-700 border-gray-600 rounded-md text-white';
            outputInput.addEventListener('input', (e) => { action.output = e.target.value; saveCurrentActions(); });

            const keyInput = document.createElement('input');
            keyInput.type = 'text';
            keyInput.value = action.key || '';
            keyInput.readOnly = true;
            keyInput.className = 'form-input key-input w-full p-2 bg-gray-700 border-gray-600 rounded-md text-white';
            keyInput.addEventListener('keydown', (e) => {
                e.preventDefault();
                const newKey = e.key;
                actions.forEach(a => { if (a.key === newKey) a.key = ''; });
                action.key = newKey;
                saveCurrentActions();
                populateSettingsPanel();
            });

            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.value = action.color || DEFAULT_COLOR;
            colorInput.className = 'w-10 h-10 rounded-md bg-gray-700 border-gray-600';
            colorInput.addEventListener('input', (e) => { action.color = e.target.value; saveCurrentActions(); });
            
            const addFiveContainer = document.createElement('div');
            addFiveContainer.className = 'flex justify-start';
            const addFiveCheckbox = document.createElement('input');
            addFiveCheckbox.type = 'checkbox';
            addFiveCheckbox.checked = action.addNeutralFive !== false;
            addFiveCheckbox.className = 'form-checkbox bg-gray-700 border-gray-600 rounded text-blue-500 focus:ring-blue-500 h-5 w-5 cursor-pointer';
            addFiveCheckbox.addEventListener('change', (e) => {
                action.addNeutralFive = e.target.checked;
                saveCurrentActions();
            });
            addFiveContainer.appendChild(addFiveCheckbox);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = '削除';
            deleteButton.className = 'bg-red-800 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md text-sm';
            deleteButton.addEventListener('click', () => {
                actions = actions.filter(a => a.id !== action.id);
                saveCurrentActions();
                populateSettingsPanel();
            });

            row.appendChild(outputInput); 
            row.appendChild(keyInput); 
            row.appendChild(colorInput); 
            row.appendChild(addFiveContainer);
            row.appendChild(deleteButton);
            actionsListContainer.appendChild(row);
        });
    };

    const populatePresetDropdown = () => {
        presetSelect.innerHTML = '<option value="">プリセットを選択...</option>';
        Object.keys(presets).forEach(name => {
            const option = document.createElement('option');
            option.value = name; option.textContent = name;
            presetSelect.appendChild(option);
        });
    };

    const renderSettingsSidebar = () => {
        settingsSidebarList.innerHTML = '';
        Object.keys(settingsSubViews).forEach(viewId => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.id = `settings-nav-${viewId}`;
            a.className = 'settings-nav-link';
            a.textContent = settingsSubViews[viewId].title;
            a.addEventListener('click', (e) => { e.preventDefault(); showView('settings', { subViewId: viewId }); });
            li.appendChild(a);
            settingsSidebarList.appendChild(li);
        });
    };

    const showSettingsSubView = (viewId) => {
        currentSettingsSubViewId = viewId;
        if (!settingsSubViews[viewId]) {
            viewId = 'keyMapping'; // Default to keyMapping if invalid
        }
        Object.values(settingsSubViews).forEach(view => view.element.classList.add('hidden'));
        if (settingsSubViews[viewId] && settingsSubViews[viewId].element) {
            settingsSubViews[viewId].element.classList.remove('hidden');
        }
        if (viewId === 'keyMapping') {
            renderEditorSettingsTOC();
        }
        settingsSidebarList.querySelectorAll('.settings-nav-link').forEach(link => link.classList.remove('settings-active-link'));
        settingsSidebarList.querySelector(`#settings-nav-${viewId}`)?.classList.add('settings-active-link');
    };

    const renderEditorSettingsTOC = () => {
        if (!keyMappingView || !editorSettingsToc) return;

        const sections = keyMappingView.querySelectorAll('section[id]');
        if (sections.length === 0) {
            editorSettingsToc.innerHTML = '';
            return;
        }

        const tocTitle = document.createElement('h4');
        tocTitle.className = 'text-lg font-semibold mb-3 text-white';
        tocTitle.textContent = '目次';

        const tocList = document.createElement('ul');
        tocList.className = 'space-y-2';

        sections.forEach(section => {
            const heading = section.querySelector('h3');
            if (!heading) return;

            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `#${section.id}`;
            a.textContent = heading.textContent;
            a.className = 'toc-link block text-sm text-gray-400 hover:text-white transition-colors';
            a.dataset.targetId = section.id;

            a.addEventListener('click', e => {
                e.preventDefault();
                document.querySelector(a.getAttribute('href')).scrollIntoView({ behavior: 'smooth' });
            });

            li.appendChild(a);
            tocList.appendChild(li);
        });

        editorSettingsToc.innerHTML = '';
        editorSettingsToc.appendChild(tocTitle);
        editorSettingsToc.appendChild(tocList);
    };

    const populateSpreadsheetPresetDropdown = () => {
        spreadsheetPresetSelect.innerHTML = '<option value="">プリセットを選択...</option>';
        Object.keys(spreadsheetPresets).forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            spreadsheetPresetSelect.appendChild(option);
        });
    };

    const renderMemoColumnSelector = () => {
        memoColumnSelect.innerHTML = '<option value="">(なし)</option>';
        spreadsheetColumns.forEach(column => {
            const option = document.createElement('option');
            option.value = column.id;
            option.textContent = column.header;
            if (column.id === memoColumnId) {
                option.selected = true;
            }
            memoColumnSelect.appendChild(option);
        });
    };

    const createGrid = () => {
        for (let i = 0; i < 25; i++) createInputBox(i);
        totalInputs = 25;
    };

    const createInputBox = (index) => {
        const input = document.createElement('input');
        input.type = 'text'; input.dataset.index = index;
        input.className = 'form-input w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-center text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-move';
        input.setAttribute('autocomplete', 'off'); input.draggable = true;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.target.blur();
            }
        });
        gridContainer.appendChild(input);
        return input;
    };

    const getColorForCommand = (commandText, actionsToUse = actions) => {
        let trimmedCommand = commandText.trim();
        if (!trimmedCommand) return null;

        // [hold]などのサフィックスを除去してから判定する
        if (enableHoldAttack && holdAttackText.trim() !== '') {
            const holdSuffix = ` ${holdAttackText}`;
            if (trimmedCommand.endsWith(holdSuffix)) {
                trimmedCommand = trimmedCommand.slice(0, -holdSuffix.length);
            }
        }

        // c./f. プレフィックスを除去してから判定する
        if (enablePrefixes) {
            if (trimmedCommand.startsWith('c.')) {
                trimmedCommand = trimmedCommand.substring(2);
            } else if (trimmedCommand.startsWith('f.')) {
                trimmedCommand = trimmedCommand.substring(2);
            }
        }

        const sortedActions = [...actionsToUse].sort((a, b) => b.output.length - a.output.length);
        const foundAction = sortedActions.find(action => trimmedCommand.endsWith(action.output));

        if (!foundAction) {
            return null;
        }

        const baseCommand = trimmedCommand.replace(/[0-9\s+]/g, '');

        if (baseCommand === foundAction.output) {
            return foundAction.color;
        }

        return null;
    };

    const generateHtmlFromPlainText = (plainText, actionsToUse = actions) => {
        const parts = plainText.split(' > ');
        const html = parts.map(part => {
            const trimmedPart = part.trim();
            if (trimmedPart === '') return '';
            const color = getColorForCommand(trimmedPart, actionsToUse) || DEFAULT_COLOR;
            return `<span style="color: ${color};">${trimmedPart}</span>`;
        }).filter(s => s !== '').join(' <span class="text-gray-500">&gt;</span> ');
        return html;
    };

    const updateMergedOutput = () => {
        const inputs = Array.from(gridContainer.querySelectorAll('input'));
        const comboParts = inputs.map(input => ({
            value: input.value.trim(),
            color: input.style.color || getColorForCommand(input.value.trim()) || DEFAULT_COLOR
        })).filter(part => part.value !== '');

        if (comboParts.length === 0) {
            mergedOutput.innerHTML = `<span class="text-gray-500">ここにコンボが表示されます...</span>`;
            return;
        }
        const html = comboParts.map(part => `<span style="color: ${part.color};">${part.value}</span>`).join(' <span class="text-gray-500">&gt;</span> ');
        mergedOutput.innerHTML = html;
    };

    const reindexGrid = () => {
        const inputs = gridContainer.querySelectorAll('.form-input');
        inputs.forEach((input, index) => { input.dataset.index = index; });
        totalInputs = inputs.length;
    };

    const findFirstEmptyInput = () => {
        const inputs = Array.from(gridContainer.querySelectorAll('input'));
        return inputs.find(input => input.value.trim() === '');
    };

    // --- 5. モーダル関連 ---
    const openCommandInputModal = (targetInput) => {
        activeCommandInputTarget = targetInput;
        commandBuffer = []; committedCommands = [];
        updateCommandModalPreview(); updateCommittedCommandsList();
        commandInputModalContainer.classList.remove('hidden');
        gridContainer.querySelectorAll('.form-input').forEach(input => input.disabled = true);
    };

    const closeCommandInputModal = (shouldFocus = true) => {
        gridContainer.querySelectorAll('.form-input').forEach(input => input.disabled = false);
        if(activeCommandInputTarget && shouldFocus) activeCommandInputTarget.focus();
        activeCommandInputTarget = null;
        commandInputModalContainer.classList.add('hidden');
    };

    const openPlaybackHistoryModal = () => {
        renderPlaybackHistory(historySearchInput.value);
        playbackHistoryModalContainer.classList.remove('hidden');
        setTimeout(() => historySearchInput.focus(), 50);
    };

    const closePlaybackHistoryModal = () => {
        playbackHistoryModalContainer.classList.add('hidden');
    };

    const openConfirmModal = (message, callback) => {
        confirmDeleteMessage.innerHTML = message;
        onConfirmDelete = callback;
        confirmDeleteModalContainer.classList.remove('hidden');
        confirmDeleteButton.focus();
    };

    const closeConfirmModal = () => {
        onConfirmDelete = null;
        confirmDeleteModalContainer.classList.add('hidden');
    };

    const openMoveRecordsModal = (message, callback) => {
        moveRecordsMessage.innerHTML = message;
        onConfirmMove = callback;
        moveRecordsModalContainer.classList.remove('hidden');
        confirmMoveButton.focus();
    };

    const closeMoveRecordsModal = () => {
        onConfirmMove = null;
        moveRecordsModalContainer.classList.add('hidden');
    };


    const isCommandInputValid = (buffer) => {
        if (buffer.length === 0) return false;
        const attackOutputs = actions.map(a => a.output);
        const lastElement = buffer[buffer.length - 1];
        if (!attackOutputs.includes(lastElement)) return false;
        const attackCount = buffer.filter(cmd => attackOutputs.includes(cmd)).length;
        return attackCount <= 1;
    };

    const resetModalInputState = (keyToAlsoIgnore = null) => {
        commandBuffer = [];
        // 現在押されているキーを、一度離されるまで無視する
        pressedKeys.forEach(k => {
            ignoredKeysUntilRelease.add(k);
            ignoredKeysUntilRelease.add(k.toLowerCase());
        });
        if (keyToAlsoIgnore) {
            ignoredKeysUntilRelease.add(keyToAlsoIgnore);
            ignoredKeysUntilRelease.add(keyToAlsoIgnore.toLowerCase());
        }
        pressedKeys.clear();
        previousDirectionState = '5';
        updateCommandModalPreview();
    };

    const commitSingleCommand = (committingKey = null) => {
        if (commandBuffer.length === 0) { if (!committingKey) resetModalInputState(); return; }
        if (!isCommandInputValid(commandBuffer)) {
            commandBuffer = [];
            commandModalPreview.innerHTML = '<span class="text-yellow-400">不正な入力</span>';
            setTimeout(() => { updateCommandModalPreview(); }, 800);
            return;
        }
        let directions = commandBuffer.filter(cmd => !isNaN(parseInt(cmd))).join('');
        const attackOutputs = actions.map(a => a.output);
        const lastAttackOutput = commandBuffer.find(cmd => attackOutputs.includes(cmd));
        
        const lastAttackAction = actions.find(a => a.output === lastAttackOutput);

        if (directions.length === 0 && lastAttackAction) {
            if (lastAttackAction.addNeutralFive !== false) {
                directions = previousDirectionState;
            }
        }
        
        let commandToWrite = lastAttackOutput ? (directions.length > 1 ? `${directions} + ${lastAttackOutput}` : `${directions}${lastAttackOutput}`) : directions;

        // プレフィックス機能の処理
        if (enablePrefixes && lastAttackOutput) {
            const c_pressed = pressedKeys.has('c');
            const f_pressed = pressedKeys.has('f');
            if (c_pressed) {
                commandToWrite = `c.${commandToWrite}`;
            } else if (f_pressed) {
                commandToWrite = `f.${commandToWrite}`;
            }
        }

        if (commandToWrite !== '') committedCommands.push(commandToWrite);
        
        resetModalInputState(committingKey);
        updateCommittedCommandsList();
    };

    const finalizeAndWriteCommands = () => {
        commitSingleCommand(); 
        if (!activeCommandInputTarget || committedCommands.length === 0) {
            closeCommandInputModal(); return;
        }
        let currentTarget = activeCommandInputTarget;
        committedCommands.forEach((cmd, i) => {
            if (!currentTarget) currentTarget = createInputBox(totalInputs);
            currentTarget.value = cmd;
            applyColorToInput(currentTarget, cmd);
            if (i < committedCommands.length - 1) {
                const nextIndex = parseInt(currentTarget.dataset.index) + 1;
                currentTarget = gridContainer.querySelector(`[data-index="${nextIndex}"]`);
            }
        });
        reindexGrid(); updateMergedOutput();
        closeCommandInputModal();
    };

    const applyColorToInput = (inputElement, commandText) => {
        const color = getColorForCommand(commandText);
        inputElement.style.color = color || DEFAULT_COLOR;
    };

    const updateCommandModalPreview = () => {
        commandModalPreview.innerHTML = commandBuffer.length > 0 ? commandBuffer.join(' ') : `<span class="text-gray-500 recording-indicator">入力待機中...</span>`;
    };
    
    const updateCommittedCommandsList = () => {
        if (committedCommands.length === 0) {
            committedCommandsList.innerHTML = ''; return;
        }
        const html = committedCommands.map(cmd => {
            const color = getColorForCommand(cmd);
            const style = color ? `style="color: ${color};"` : 'class="text-yellow-300"';
            return `<span ${style}>${cmd}</span>`;
        }).join(' <span class="text-gray-500">&gt;</span> ');
        committedCommandsList.innerHTML = html;
    };

    const handleModalKeyInputAction = (command) => {
        if (command.output === 'RESET') {
            if (commandBuffer.length > 0) commandBuffer = [];
            else if (committedCommands.length > 0) committedCommands.pop();
        } else {
            commandBuffer.push(command.output);
        }
        updateCommandModalPreview();
        if (autoCommitOnAttack && !command.isSystem && command.key) {
            commitSingleCommand(command.key);
        }
        updateCommittedCommandsList();
    };

    const updateModalDirection = () => {
        const isUp = pressedKeys.has('w'), isDown = pressedKeys.has('s'), isLeft = pressedKeys.has('a'), isRight = pressedKeys.has('d');
        let currentDirection = '5';
        if (isUp) currentDirection = isLeft ? '7' : (isRight ? '9' : '8');
        else if (isDown) currentDirection = isLeft ? '1' : (isRight ? '3' : '2');
        else currentDirection = isLeft ? '4' : (isRight ? '6' : '5');
        if (currentDirection !== '5' && currentDirection !== previousDirectionState) {
            commandBuffer.push(currentDirection);
            updateCommandModalPreview();
        }
        previousDirectionState = currentDirection;
    };

    // --- 6. イベントリスナー設定 ---
    const addSidebarEventListeners = () => {
        const navItems = sidebarNavList.querySelectorAll('.nav-item');
        let draggedViewId = null;

        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                showView(item.dataset.viewId);
            });

            item.addEventListener('dragstart', () => {
                draggedViewId = item.dataset.viewId;
                setTimeout(() => item.classList.add('dragging-nav'), 0);
            });

            item.addEventListener('dragend', () => item.classList.remove('dragging-nav'));

            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                item.classList.add('drag-over');
            });

            item.addEventListener('dragleave', () => item.classList.remove('drag-over'));

            item.addEventListener('drop', (e) => {
                e.preventDefault();
                item.classList.remove('drag-over');
                const droppedOnViewId = item.dataset.viewId;
                const draggedIndex = viewOrder.indexOf(draggedViewId);
                const droppedOnIndex = viewOrder.indexOf(droppedOnViewId);

                if (draggedIndex !== droppedOnIndex) {
                    const [removed] = viewOrder.splice(draggedIndex, 1);
                    viewOrder.splice(droppedOnIndex, 0, removed);
                    saveViewOrder();
                    renderSidebar();
                    showView(viewOrder[currentViewIndex]);
                }
            });
        });
    };

    const setupEventListeners = () => {
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.viewId) {
                // 履歴からビューを復元
                showView(e.state.viewId, e.state.options || {}, true);
            } else {
                // 履歴の初期状態など、stateがない場合
                const initialViewId = viewOrder[0] || 'editor';
                showView(initialViewId, {}, true);
            }
        });


        const setupModalButton = (button) => {
            button.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    e.target.click();
                }
            });
        };

        setupModalButton(confirmDeleteButton);
        setupModalButton(cancelDeleteButton);

        confirmDeleteButton.addEventListener('click', () => {
            if (typeof onConfirmDelete === 'function') {
                onConfirmDelete();
            }
            closeConfirmModal();
        });
        cancelDeleteButton.addEventListener('click', closeConfirmModal);

        setupModalButton(confirmMoveButton);
        setupModalButton(cancelMoveButton);
        cancelMoveButton.addEventListener('click', closeMoveRecordsModal);
        confirmMoveButton.addEventListener('click', () => {
            if (typeof onConfirmMove === 'function') {
                const targetTable = moveTargetTableSelect.value;
                if (targetTable) {
                    onConfirmMove(targetTable);
                } else {
                    alert('移動先のテーブルを選択してください。');
                }
            }
        });

        // Settings
        resetSettingsButton.addEventListener('click', () => { actions = JSON.parse(JSON.stringify(defaultActions)); saveCurrentActions(); populateSettingsPanel(); });
        savePresetButton.addEventListener('click', () => {
            const name = presetNameInput.value.trim();
            if (name) {
                presets[name] = {
                    actions: JSON.parse(JSON.stringify(actions)),
                    settings: {
                        autoCommitOnAttack,
                        enableHoldAttack,
                        holdAttackText,
                        holdAttackFrames,
                        enablePrefixes
                    }
                };
                savePresets();
                populatePresetDropdown();
                presetNameInput.value = '';
                presetSelect.value = name;
            }
        });
        presetSelect.addEventListener('change', (e) => {
            const name = e.target.value;
            if (name && presets[name]) {
                const loadedPreset = presets[name];

                // 後方互換性: 古いプリセットはactionsの配列
                if (Array.isArray(loadedPreset)) {
                    actions = loadedPreset.map(a => ({ ...a, color: a.color || DEFAULT_COLOR, addNeutralFive: a.addNeutralFive !== false }));
                    // 詳細設定は変更しない
                } else {
                    // 新しいプリセット形式
                    if (loadedPreset.actions) {
                        actions = loadedPreset.actions.map(a => ({ ...a, color: a.color || DEFAULT_color || DEFAULT_COLOR, addNeutralFive: a.addNeutralFive !== false }));
                    }
                    if (loadedPreset.settings) {
                        const s = loadedPreset.settings;
                        if (s.autoCommitOnAttack !== undefined) autoCommitOnAttack = s.autoCommitOnAttack;
                        if (s.enableHoldAttack !== undefined) enableHoldAttack = s.enableHoldAttack;
                        if (s.holdAttackText !== undefined) holdAttackText = s.holdAttackText;
                        if (s.holdAttackFrames !== undefined) holdAttackFrames = s.holdAttackFrames;
                        if (s.enablePrefixes !== undefined) enablePrefixes = s.enablePrefixes;

                        // UIを更新
                        autoCommitCheckbox.checked = autoCommitOnAttack;
                        enableHoldAttackCheckbox.checked = enableHoldAttack;
                        holdAttackTextInput.value = holdAttackText;
                        holdAttackDurationInput.value = holdAttackFrames;
                        enablePrefixesCheckbox.checked = enablePrefixes;
                    }
                }

                // 現在の設定として保存
                saveCurrentActions();
                saveAutoCommitSetting();
                saveHoldAttackSetting();
                savePrefixSetting();
                
                // UIを更新
                populateSettingsPanel();
            }
        });
        deletePresetButton.addEventListener('click', () => {
            const name = presetSelect.value;
            if (name && presets[name]) { delete presets[name]; savePresets(); populatePresetDropdown(); }
        });
        addActionButton.addEventListener('click', () => {
            actions.push({ id: `action-${Date.now()}`, output: 'NEW', key: '', color: DEFAULT_COLOR, addNeutralFive: true });
            saveCurrentActions(); populateSettingsPanel();
        });

        // Editor
        resetButton.addEventListener('click', () => { 
            gridContainer.querySelectorAll('input').forEach(input => { input.value = ''; input.style.color = ''; }); 
            updateMergedOutput(); 
        });
        copyButton.addEventListener('click', () => {
            const inputs = Array.from(gridContainer.querySelectorAll('input'));
            const comboPlainText = inputs.map(input => input.value.trim()).filter(value => value !== '').join(' > ');
            if (comboPlainText) {
                copyToClipboard(comboPlainText, copyButton);
            }
        });
        autoCommitCheckbox.addEventListener('change', () => { autoCommitOnAttack = autoCommitCheckbox.checked; saveAutoCommitSetting(); });
        
        enableHoldAttackCheckbox.addEventListener('change', () => {
            enableHoldAttack = enableHoldAttackCheckbox.checked;
            saveHoldAttackSetting();
        });
        holdAttackTextInput.addEventListener('input', () => {
            holdAttackText = holdAttackTextInput.value;
            saveHoldAttackSetting();
        });
        holdAttackDurationInput.addEventListener('input', () => {
            holdAttackFrames = parseInt(holdAttackDurationInput.value, 10) || 18;
            saveHoldAttackSetting();
        });
        enablePrefixesCheckbox.addEventListener('change', () => {
            enablePrefixes = enablePrefixesCheckbox.checked;
            savePrefixSetting();
        });


        
        gridContainer.addEventListener('dragstart', (e) => { if (e.target.matches('.form-input')) { draggedItem = e.target; setTimeout(() => e.target.classList.add('dragging'), 0); } });
        gridContainer.addEventListener('dragend', (e) => { if (e.target.matches('.form-input')) { draggedItem.classList.remove('dragging'); draggedItem = null; } });
        gridContainer.addEventListener('dragover', (e) => e.preventDefault());
        gridContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.target.matches('.form-input') && draggedItem !== e.target) {
                const dropTarget = e.target;
                if (parseInt(draggedItem.dataset.index) < parseInt(dropTarget.dataset.index)) gridContainer.insertBefore(draggedItem, dropTarget.nextSibling);
                else gridContainer.insertBefore(draggedItem, dropTarget);
                reindexGrid(); updateMergedOutput();
            }
        });
        gridContainer.addEventListener('input', (e) => { if (e.target.matches('.form-input')) { e.target.style.color = ''; updateMergedOutput(); } });
        
        // Save Combo
        saveComboButton.addEventListener('click', async () => {
            const comboHtml = mergedOutput.innerHTML;
            const comboPlainText = mergedOutput.textContent;
            const targetTable = saveTableSelect.value;

            if (!targetTable) {
                alert('保存先のテーブルが選択されていません。');
                return;
            }
            if (!comboPlainText.trim() || comboPlainText.includes('ここにコンボが表示されます...')) {
                alert('保存するコンボがありません。');
                return;
            }

            const schema = await window.db.getSchema(targetTable);
            if (!schema || !schema.comboColumnId) {
                alert('このテーブルにはコンボを保存する列が指定されていません。データベース設定で「コンボ列」を指定してください。');
                return;
            }

            const newCombo = {};
            newCombo[schema.comboColumnId] = comboHtml;

            // Add timestamp automatically if a column with that ID exists
            if (schema.columns.some(c => c.id === 'timestamp')) {
                newCombo.timestamp = new Date().toLocaleString('ja-JP');
            }

            // Gather data from the dynamic form
            const metadataInputs = editorMetadataFormContainer.querySelectorAll('.metadata-input');
            metadataInputs.forEach(input => {
                newCombo[input.dataset.columnId] = input.value.trim();
            });

            // Add starter move automatically if the column is set
            if (schema.starterColumnId) {
                const starterMove = comboPlainText.split(' > ')[0].trim();
                if (starterMove) {
                    newCombo[schema.starterColumnId] = starterMove;
                }
            }

            try {
                const newId = await window.db.addRecord(targetTable, newCombo);

                // Visual feedback
                saveComboButton.textContent = '保存完了！';
                saveComboButton.classList.remove('bg-green-700', 'hover:bg-green-600');
                saveComboButton.classList.add('bg-blue-600');
                setTimeout(() => {
                    saveComboButton.textContent = '保存';
                    saveComboButton.classList.remove('bg-blue-600');
                    saveComboButton.classList.add('bg-green-700', 'hover:bg-green-600');
                }, 1500);

            } catch (error) {
                console.error(`Failed to save combo to ${targetTable}:`, error);
                alert('コンボの保存に失敗しました。');
            }
        });

        // YouTube Player
        youtubeLoadButton.addEventListener('click', loadYouTubeVideo);
        addMemoButton.addEventListener('click', addMemo);
        memoInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addMemoButton.click();
            }
        });
        clearMemosButton.addEventListener('click', () => {
            if (memos.length > 0) {
                openConfirmModal('現在の動画のメモをすべて削除しますか？<br>この操作は取り消せません。', () => {
                    memos = [];
                    saveMemos();
                    renderMemos();
                });
            }
        });

        // Playback History Modal
        showPlaybackHistoryButton.addEventListener('click', openPlaybackHistoryModal);
        closeHistoryModalButton.addEventListener('click', closePlaybackHistoryModal);
        playbackHistoryModalContainer.addEventListener('click', (e) => {
            if (e.target === playbackHistoryModalContainer) {
                closePlaybackHistoryModal();
            }
        });

        // Playback History Search
        historySearchInput.addEventListener('input', (e) => {
            renderPlaybackHistory(e.target.value);
        });

        // Settings Page
        exportSettingsButton.addEventListener('click', exportAllSettings);
        importSettingsButton.addEventListener('click', () => importSettingsInput.click());
        importSettingsInput.addEventListener('change', importAllSettings);

        // Spreadsheet View
        addSpreadsheetColumnButton.addEventListener('click', addSpreadsheetColumn);
        comboColumnSelect.addEventListener('change', handleComboColumnChange);
        memoColumnSelect.addEventListener('change', handleMemoColumnChange);
        copySpreadsheetDataButton.addEventListener('click', copySpreadsheetData);
        spreadsheetMemoInput.addEventListener('input', (e) => {
            spreadsheetMemo = e.target.value;
            saveSpreadsheetMemo();
            renderSpreadsheetDataTable();
            updateSpreadsheetOutput();
        });
        saveSpreadsheetPresetButton.addEventListener('click', () => {
            const name = spreadsheetPresetNameInput.value.trim();
            if (name) {
                spreadsheetPresets[name] = JSON.parse(JSON.stringify(spreadsheetColumns));
                saveSpreadsheetPresets();
                populateSpreadsheetPresetDropdown();
                spreadsheetPresetNameInput.value = '';
                spreadsheetPresetSelect.value = name;
            }
        });
        spreadsheetPresetSelect.addEventListener('change', (e) => {
            const name = e.target.value;
            if (name && spreadsheetPresets[name]) {
                spreadsheetColumns = JSON.parse(JSON.stringify(spreadsheetPresets[name]));
                // プリセットを読み込む際は、行データをリセットして不整合を防ぐ
                spreadsheetData = {};
                const currentColumnIds = spreadsheetColumns.map(c => c.id);
                if (!currentColumnIds.includes(comboColumnId)) {
                    const defaultComboCol = spreadsheetColumns.find(c => c.header === 'コンボ');
                    comboColumnId = defaultComboCol ? defaultComboCol.id : null;
                }
                if (!currentColumnIds.includes(memoColumnId)) {
                    const defaultMemoCol = spreadsheetColumns.find(c => c.header === 'メモ');
                    memoColumnId = defaultMemoCol ? defaultMemoCol.id : null;
                }
                saveSpreadsheetSettings();
                renderSpreadsheetView();
            }
        });
        deleteSpreadsheetPresetButton.addEventListener('click', () => {
            const name = spreadsheetPresetSelect.value;
            if (name && spreadsheetPresets[name]) {
                delete spreadsheetPresets[name];
                saveSpreadsheetPresets();
                populateSpreadsheetPresetDropdown();
            }
        });

        // Global Keydowns
        window.addEventListener('keydown', (e) => {
            const key = e.key;
            const isConfirmModalOpen = !confirmDeleteModalContainer.classList.contains('hidden');
            const isHistoryModalOpen = !playbackHistoryModalContainer.classList.contains('hidden');
            const activeElement = document.activeElement;

            if (isHistoryModalOpen) {
                if (key === 'Escape') closePlaybackHistoryModal();
                // モーダル表示中は他のグローバルショートカットを無効化するが、入力は許可する
                return;
            }
            if (isConfirmModalOpen) {
                if (key === 'Escape') closeConfirmModal();
                if (key === 'Tab') {
                    const focusableElements = [confirmDeleteButton, cancelDeleteButton];
                    const firstElement = focusableElements[0];
                    const lastElement = focusableElements[focusableElements.length - 1];
                    
                    if (e.shiftKey) { // Shift + Tab
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement.focus();
                        }
                    } else { // Tab
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement.focus();
                        }
                    }
                }
                return;
            }

            // Global shortcuts
            if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
                 if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                    e.preventDefault();
                    if (e.key === 'ArrowUp') {
                        currentViewIndex = (currentViewIndex - 1 + viewOrder.length) % viewOrder.length;
                    } else {
                        currentViewIndex = (currentViewIndex + 1) % viewOrder.length;
                    }
                    showView(viewOrder[currentViewIndex]);
                    return;
                }
            }

            // Handle view-specific shortcuts
            if (!editorView.classList.contains('hidden')) {
                handleEditorKeyDown(e);
            } else if (!playerView.classList.contains('hidden')) {
                handlePlayerKeyDown(e);
            } else if (!spreadsheetView.classList.contains('hidden')) {
                handleSpreadsheetKeyDown(e);
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key;
            const lowerKey = key.toLowerCase();

            ignoredKeysUntilRelease.delete(key);
            ignoredKeysUntilRelease.delete(lowerKey);

            // --- 長押し機能の追加 ---
            if (holdAttackTimer) {
                clearTimeout(holdAttackTimer);
                holdAttackTimer = null;
            }
            // --- 長押し機能ここまで ---
            if (pressedKeys.has(key)) {
                pressedKeys.delete(key);
                if (!commandInputModalContainer.classList.contains('hidden') && ['w', 'a', 's', 'd'].includes(lowerKey)) {
                    updateModalDirection();
                }
                // c, fキーの追跡を解除
                if (['c', 'f'].includes(lowerKey)) {
                    pressedKeys.delete(lowerKey);
                }
            }
        });
    };

    const handleEditorKeyDown = (e) => {
        const key = e.key;
        const activeElement = document.activeElement;
        const isCommandModalOpen = !commandInputModalContainer.classList.contains('hidden');

        if (isCommandModalOpen) {
            if (ignoredKeysUntilRelease.has(key) || ignoredKeysUntilRelease.has(key.toLowerCase())) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            e.preventDefault();
            e.stopPropagation();
            if (key === 'Enter' && e.ctrlKey) { finalizeAndWriteCommands(); return; }
            if (key === 'Enter') { commitSingleCommand(); return; }
            if (key === 'Escape') { closeCommandInputModal(); return; }
            const action = actions.find(a => a.key === key);
            if (key === 'Backspace') handleModalKeyInputAction({ output: 'RESET' });
            else if (action && !pressedKeys.has(key)) { pressedKeys.add(key); handleModalKeyInputAction(action); }
            else if (['w', 'a', 's', 'd'].includes(key.toLowerCase()) && !pressedKeys.has(key.toLowerCase())) {
                pressedKeys.add(key.toLowerCase()); 
                updateModalDirection();
            } else if (['c', 'f'].includes(key.toLowerCase()) && !pressedKeys.has(key.toLowerCase())) { // c, fキーの状態を追跡
                pressedKeys.add(key.toLowerCase());
            }

            // --- 長押し機能の追加 ---
            if (action && enableHoldAttack && holdAttackText.trim() !== '') {
                if (holdAttackTimer) {
                    clearTimeout(holdAttackTimer);
                }
                holdAttackTimer = setTimeout(() => {
                    if (committedCommands.length > 0) {
                        const lastCommandIndex = committedCommands.length - 1;
                        // 既に[hold]などが付いていないかチェック
                        if (!committedCommands[lastCommandIndex].includes(holdAttackText)) {
                            committedCommands[lastCommandIndex] += ` ${holdAttackText}`;
                            updateCommittedCommandsList();
                        }
                    }
                    resetModalInputState(key);
                }, holdAttackFrames * 1000 / 60); // フレーム数をmsに変換して判定
            }
            return;
        }

        if (e.ctrlKey && key.toLowerCase() === 's') {
            e.preventDefault();
            saveComboButton.click();
        } else if (e.ctrlKey && key === 'Delete') {
            e.preventDefault();
            gridContainer.querySelectorAll('input').forEach(input => { input.value = ''; input.style.color = ''; });
            updateMergedOutput();
        } else if (e.ctrlKey && key.toLowerCase() === 'c') {
            const activeTagName = activeElement.tagName.toLowerCase();
            if (activeTagName !== 'input' && activeTagName !== 'textarea') {
                e.preventDefault();
                copyButton.click();
            }
        } else if (activeElement && activeElement.matches('#grid-container .form-input')) {
            const currentIndex = parseInt(activeElement.dataset.index);
            let nextIndex = -1;

            if (key === 'Enter' && e.ctrlKey) { e.preventDefault(); openCommandInputModal(activeElement); }
            else if (key === ' ' && e.ctrlKey) {
                e.preventDefault();
                const newBox = createInputBox(0);
                gridContainer.insertBefore(newBox, activeElement);
                reindexGrid(); newBox.focus();
            } else if (key === 'Backspace' && e.ctrlKey) {
                e.preventDefault();
                if (gridContainer.querySelectorAll('.form-input').length > 1) {
                    const targetIndex = parseInt(activeElement.dataset.index);
                    activeElement.remove(); reindexGrid();
                    const nextFocus = gridContainer.querySelector(`[data-index="${targetIndex}"]`) || gridContainer.querySelector(`[data-index="${targetIndex - 1}"]`);
                    if (nextFocus) nextFocus.focus();
                } else activeElement.value = '';
                updateMergedOutput();
            } else if (e.ctrlKey && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
                e.preventDefault();
                if (key === 'ArrowLeft') nextIndex = currentIndex - 1;
                if (key === 'ArrowRight') nextIndex = currentIndex + 1;
                if (key === 'ArrowUp') nextIndex = currentIndex - 5;
                if (key === 'ArrowDown') nextIndex = currentIndex + 5;
            } else if (key === 'Tab') {
                e.preventDefault();
                nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1;
            }

            if (nextIndex >= 0 && nextIndex < totalInputs) {
                const nextInput = gridContainer.querySelector(`[data-index="${nextIndex}"]`);
                if (nextInput) { nextInput.focus(); nextInput.select(); }
            }
        }
    };

    const handlePlayerKeyDown = (e) => {
        if (!ytPlayer || typeof ytPlayer.getCurrentTime !== 'function') return;
        const activeElement = document.activeElement;
        if (activeElement === youtubeUrlInput || activeElement === memoInput || activeElement.classList.contains('memo-edit-input')) return;

        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            showView('editor');
            // ビューの切り替えが完了してからモーダルを開く
            setTimeout(() => {
                let targetInput = findFirstEmptyInput();
                if (!targetInput) {
                    targetInput = createInputBox(totalInputs);
                    reindexGrid();
                }
                openCommandInputModal(targetInput);
            }, 50);
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            const currentTime = ytPlayer.getCurrentTime();
            ytPlayer.seekTo(currentTime - 1, true);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            const currentTime = ytPlayer.getCurrentTime();
            ytPlayer.seekTo(currentTime + 1, true);
        } else if (e.code === 'Space') {
            e.preventDefault();
            const playerState = ytPlayer.getPlayerState();
            if (playerState === YT.PlayerState.PLAYING) {
                ytPlayer.pauseVideo();
            } else {
                ytPlayer.playVideo();
            }
        }
    };

    const handleSpreadsheetKeyDown = (e) => {
        const key = e.key;
        const activeElement = document.activeElement;

        if (e.ctrlKey && key.toLowerCase() === 'c') {
            const activeTagName = activeElement.tagName.toLowerCase();
            if (activeTagName !== 'input' && activeTagName !== 'textarea') {
                e.preventDefault();
                copySpreadsheetData();
            }
        }
    };

    const buildUrl = (viewId, options = {}) => {
        let url = `#${viewId}`;
        if (viewId === 'database' && options.tableName) {
            url += `/${encodeURIComponent(options.tableName)}`;
        } else if (viewId === 'settings' && options.subViewId) {
            url += `/${options.subViewId}`;
        }
        return url;
    };


    // --- 7. 新機能：表示切替、コンボ履歴、YouTube ---
    const showView = (viewId, options = {}, fromPopState = false) => {
        if (viewId === 'editor') {
            populateTableSelector();
        }
        const views = { 
            editor: editorView, 
            player: playerView,
            database: databaseView,
            'create-table': createTableView,
            'edit-table': editTableView,
            spreadsheet: spreadsheetView,
            settings: settingsPageView
        };
        
        for (const id in views) {
            if (views[id]) views[id].classList.add('hidden');
        }
        if (views[viewId]) views[viewId].classList.remove('hidden');

        // 履歴を操作 (popstateイベント経由でない場合のみ)
        if (!fromPopState) {
            const state = { viewId, options };
            const title = viewDetails[viewId] ? `コンボエディター - ${viewDetails[viewId].title}` : 'コンボエディター';
            const url = buildUrl(viewId, options);

            // 現在のstateと異なる場合のみ履歴に追加
            if (JSON.stringify(state) !== JSON.stringify(history.state)) {
                history.pushState(state, title, url);
            }
            document.title = title;
        } else {
            const title = viewDetails[viewId] ? `コンボエディター - ${viewDetails[viewId].title}` : 'コンボエディター';
            document.title = title;
        }

        const navLinks = sidebarNavList.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active-link'));

        let activeNavId = viewId;
        if (viewId === 'create-table' || viewId === 'edit-table') {
            activeNavId = 'database';
        }
        const activeNavLink = sidebarNavList.querySelector(`#nav-${activeNavId}`);
        if (activeNavLink) {
            activeNavLink.classList.add('active-link');
        }

        if (viewOrder.includes(viewId)) {
            currentViewIndex = viewOrder.indexOf(viewId);
        }

        if (viewId === 'settings') {
            showSettingsSubView(options.subViewId || currentSettingsSubViewId);
        } else if (viewId === 'spreadsheet') {
            renderSpreadsheetView();
        } else if (viewId === 'database') {
            renderDatabaseView(options.tableName || null);
        } else if (viewId === 'create-table') {
            renderCreateTableView();
        } else if (viewId === 'edit-table') {
            renderEditTableView(options.tableName);
        }
    };

    const renderCreateTableView = () => {
        createTableView.innerHTML = '';

        // --- Create elements ---
        const header = document.createElement('div');
        header.className = 'flex items-center mb-6';
        const backButton = document.createElement('button');
        backButton.innerHTML = '&larr; データベース一覧に戻る';
        backButton.className = 'text-blue-400 hover:text-blue-300 font-bold';
        const headerTitle = document.createElement('h1');
        headerTitle.textContent = '新規データベース・テーブル作成';
        headerTitle.className = 'text-3xl font-bold ml-4';
        header.appendChild(backButton);
        header.appendChild(headerTitle);

        const nameDiv = document.createElement('div');
        nameDiv.className = 'mb-6';
        const nameLabel = document.createElement('label');
        nameLabel.htmlFor = 'new-table-name-input';
        nameLabel.textContent = 'テーブル名';
        nameLabel.className = 'block text-lg font-semibold text-white mb-2';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'new-table-name-input';
        nameInput.className = 'form-input w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2';
        nameInput.placeholder = '例: my_favorite_combos';
        nameDiv.appendChild(nameLabel);
        nameDiv.appendChild(nameInput);

        const comboColumnContainer = document.createElement('div');
        comboColumnContainer.className = 'mb-6';
        const comboColumnLabel = document.createElement('label');
        comboColumnLabel.htmlFor = 'new-table-combo-column-selector';
        comboColumnLabel.textContent = 'コンボを保存する列 (コンボ列)';
        comboColumnLabel.className = 'block text-lg font-semibold text-white mb-2';
        const comboColumnSelect = document.createElement('select');
        comboColumnSelect.id = 'new-table-combo-column-selector';
        comboColumnSelect.className = 'form-select w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2';
        comboColumnContainer.appendChild(comboColumnLabel);
        comboColumnContainer.appendChild(comboColumnSelect);


        const editorTitle = document.createElement('h2');
        editorTitle.textContent = '列の定義';
        editorTitle.className = 'text-lg font-semibold text-white mb-2';
        const editorSubTitle = document.createElement('p');
        editorSubTitle.textContent = '「コンボ列」に指定した列に、エディターのコンボ内容が保存されます。';
        editorSubTitle.className = 'text-sm text-gray-400 mb-3';

        const editorContainer = document.createElement('div');
        editorContainer.id = 'create-table-editor-container';

        const addColumnButton = document.createElement('button');
        addColumnButton.className = 'mt-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-md';
        addColumnButton.textContent = '列を追加';

        const saveButton = document.createElement('button');
        saveButton.id = 'confirm-create-table-from-view-button';
        saveButton.textContent = 'この内容でテーブルを作成';
        saveButton.className = 'mt-6 w-full md:w-auto bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-md';

        // --- State and Logic ---
        let tempColumns = [
            {id: `col_${Date.now()}_1`, header: 'コンボ'},
            {id: `col_${Date.now()}_2`, header: 'キャラクター'},
            {id: `col_${Date.now()}_3`, header: 'ダメージ'}
        ];

        const populateComboColumnDropdown = (columns, selectedId) => {
            comboColumnSelect.innerHTML = '';
            columns.forEach(column => {
                const option = document.createElement('option');
                option.value = column.id;
                option.textContent = column.header;
                comboColumnSelect.appendChild(option);
            });
            if (selectedId && columns.some(c => c.id === selectedId)) {
                comboColumnSelect.value = selectedId;
            } else if (columns.length > 0) {
                comboColumnSelect.value = columns[0].id;
            }
        };

        const render = () => {
            populateComboColumnDropdown(tempColumns, comboColumnSelect.value);
            createTableEditorComponent(editorContainer, {
                columns: tempColumns,
                data: {},
                showDataRow: false,
                onStateChange: (newState) => {
                    tempColumns = newState.columns;
                    render();
                },
                onDataChange: () => {}
            });
        };

        addColumnButton.addEventListener('click', () => {
            const newId = `col_${Date.now()}`;
            tempColumns.push({ id: newId, header: '' });
            render();
        });

        backButton.addEventListener('click', () => showView('database'));

        saveButton.addEventListener('click', async () => {
            const tableName = nameInput.value.trim();
            if (!tableName) {
                alert('テーブル名を入力してください。');
                return;
            }

            const comboColumnId = comboColumnSelect.value;
            if (!comboColumnId) {
                alert('コンボ内容を保存する列を1つ選択してください。');
                return;
            }

            const columns = tempColumns.map(col => ({
                id: col.id,
                name: col.header.trim()
            }));

            if (columns.some(c => !c.name)) {
                alert('名前が空の列があります。');
                return;
            }
            if (columns.length === 0) {
                alert('少なくとも1つ列を定義してください。');
                return;
            }

            const allSchemas = await window.db.getAllSchemas();
            if (allSchemas.some(s => s.tableName.toLowerCase() === tableName.toLowerCase())) {
                alert('同じ名前のテーブルが既に存在します。');
                return;
            }

            const newSchema = {
                tableName,
                columns,
                comboColumnId: comboColumnId,
                recordCount: 0,
                lastUpdated: new Date().toISOString(),
            };

            try {
                saveButton.disabled = true;
                saveButton.textContent = '作成中...';

                localStorage.setItem('pendingSchema', JSON.stringify(newSchema));
                await window.db.openDB(window.db.version + 1);

                alert(`テーブル「${tableName}」を作成しました。`);
                await populateTableSelector(); // Refresh editor dropdown
                showView('database');

            } catch (error) {
                console.error('Failed to create new table:', error);
                alert(`テーブルの作成に失敗しました: ${error.message}`);
                localStorage.removeItem('pendingSchema');
            } finally {
                saveButton.disabled = false;
                saveButton.textContent = 'この内容でテーブルを作成';
            }
        });

        // --- Append elements to the DOM ---
        createTableView.appendChild(header);
        createTableView.appendChild(nameDiv);
        createTableView.appendChild(comboColumnContainer);
        createTableView.appendChild(editorTitle);
        createTableView.appendChild(editorSubTitle);
        createTableView.appendChild(editorContainer);
        createTableView.appendChild(addColumnButton);
        createTableView.appendChild(saveButton);

        // --- Initial render ---
        render();
    };

const renderEditTableView = async (tableName) => {
    if (!tableName) {
        // This case should ideally not be reached if called correctly.
        editTableView.innerHTML = `<p class="text-red-500">エラー: 対象のテーブルが指定されていません。データベース一覧に戻ってください。</p>`;
        return;
    }

    editTableView.innerHTML = ''; // Clear previous content

    // --- Create elements ---
    const header = document.createElement('div');
    header.className = 'flex items-center mb-6';

    const backButton = document.createElement('button');
    backButton.innerHTML = '&larr; テーブル表示に戻る';
    backButton.className = 'text-blue-400 hover:text-blue-300 font-bold';
    backButton.addEventListener('click', () => showView('database', { tableName }));

    const headerTitle = document.createElement('h1');
    headerTitle.textContent = `テーブル設定: ${tableName}`;
    headerTitle.className = 'text-3xl font-bold ml-4';
    header.appendChild(backButton);
    header.appendChild(headerTitle);

    const presetSelectorContainer = document.createElement('div');
    presetSelectorContainer.className = 'mt-6';

    const presetLabel = document.createElement('label');
    presetLabel.htmlFor = 'table-preset-selector';
    presetLabel.textContent = 'コンボ列のカラーリングプリセット';
    presetLabel.className = 'block text-lg font-semibold text-white mb-2';

    const presetSelect = document.createElement('select');
    presetSelect.id = 'table-preset-selector';
    presetSelect.className = 'form-select w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2';

    presetSelectorContainer.appendChild(presetLabel);
    presetSelectorContainer.appendChild(presetSelect);

    const comboColumnContainer = document.createElement('div');
    comboColumnContainer.className = 'mt-6';

    const comboColumnLabel = document.createElement('label');
    comboColumnLabel.htmlFor = 'table-combo-column-selector';
    comboColumnLabel.textContent = 'コンボを保存する列 (コンボ列)';
    comboColumnLabel.className = 'block text-lg font-semibold text-white mb-2';

    const comboColumnSelect = document.createElement('select');
    comboColumnSelect.id = 'table-combo-column-selector';
    comboColumnSelect.className = 'form-select w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2';

    comboColumnContainer.appendChild(comboColumnLabel);
    comboColumnContainer.appendChild(comboColumnSelect);

    const starterColumnContainer = document.createElement('div');
    starterColumnContainer.className = 'mt-6';

    const starterColumnLabel = document.createElement('label');
    starterColumnLabel.htmlFor = 'table-starter-column-selector';
    starterColumnLabel.textContent = '始動技を表示する列';
    starterColumnLabel.className = 'block text-lg font-semibold text-white mb-2';

    const starterColumnSelect = document.createElement('select');
    starterColumnSelect.id = 'table-starter-column-selector';
    starterColumnSelect.className = 'form-select w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2';

    starterColumnContainer.appendChild(starterColumnLabel);
    starterColumnContainer.appendChild(starterColumnSelect);

    const editorTitle = document.createElement('h2');
    editorTitle.textContent = '列の定義';
    editorTitle.className = 'text-lg font-semibold text-white mt-8 mb-2';
    const editorSubTitle = document.createElement('p');
    editorSubTitle.textContent = '列名の変更や、「コンボ列」の指定ができます。';
    editorSubTitle.className = 'text-sm text-gray-400 mb-3';

    const editorContainer = document.createElement('div');
    editorContainer.id = 'edit-table-editor-container';

    const addColumnButton = document.createElement('button');
    addColumnButton.className = 'mt-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-md';
    addColumnButton.textContent = '列を追加';

    const saveButton = document.createElement('button');
    saveButton.textContent = '設定を保存';
    saveButton.className = 'mt-6 w-full md:w-auto bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-md';

    // --- State and Logic ---
    const schema = await window.db.getSchema(tableName);
    if (!schema) {
        editTableView.innerHTML = '<p class="text-red-500">スキーマの読み込みに失敗しました。</p>';
        return;
    }

    // Populate preset dropdown
    presetSelect.innerHTML = '<option value="">デフォルト (現在のキーマップ)</option>';
    Object.keys(presets).forEach(presetName => {
        const option = document.createElement('option');
        option.value = presetName;
        option.textContent = presetName;
        presetSelect.appendChild(option);
    });
    presetSelect.value = schema.coloringPresetName || '';

    const populateDropdown = (select, columns, selectedId, emptyOptionText) => {
        select.innerHTML = emptyOptionText ? `<option value="">${emptyOptionText}</option>` : '';
        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column.id;
            option.textContent = column.name;
            select.appendChild(option);
        });
        if (selectedId && columns.some(c => c.id === selectedId)) {
            select.value = selectedId;
        }
    };
    populateDropdown(comboColumnSelect, schema.columns, schema.comboColumnId);

    // Populate starter column dropdown
    starterColumnSelect.innerHTML = '<option value="">(なし)</option>';
    schema.columns.forEach(column => {
        const option = document.createElement('option');
        option.value = column.id;
        option.textContent = column.name;
        starterColumnSelect.appendChild(option);
    });
    starterColumnSelect.value = schema.starterColumnId || '';

    let tempColumns = JSON.parse(JSON.stringify(schema.columns)).map(c => ({ id: c.id, header: c.name }));


    const renderEditor = () => {
        createTableEditorComponent(editorContainer, {
            columns: tempColumns,
            data: {},
            showDataRow: false,
            onStateChange: (newState) => {
                tempColumns = newState.columns;
                const tempColumnObjects = tempColumns.map(c => ({ id: c.id, name: c.header }));
                populateDropdown(comboColumnSelect, tempColumnObjects, comboColumnSelect.value);
                populateDropdown(starterColumnSelect, tempColumnObjects, starterColumnSelect.value, '(なし)');
                renderEditor();
            },
            onDataChange: () => {}
        });
    };

    addColumnButton.addEventListener('click', () => {
        const newId = `col_${Date.now()}`;
        tempColumns.push({ id: newId, header: '' });
        renderEditor();
    });

    saveButton.addEventListener('click', async () => {
        saveButton.disabled = true;
        const selectedPreset = presetSelect.value;
        const selectedComboColumn = comboColumnSelect.value;
        const selectedStarterColumn = starterColumnSelect.value;
        const success = await handleUpdateSchema(tableName, tempColumns, selectedComboColumn, selectedPreset, selectedStarterColumn);
        if (success) {
            showView('database', { tableName });
        } else {
            saveButton.disabled = false;
        }
    });

    // --- Append elements to the DOM ---
    editTableView.appendChild(header);
    editTableView.appendChild(presetSelectorContainer);
    editTableView.appendChild(comboColumnContainer);
    editTableView.appendChild(starterColumnContainer);
    editTableView.appendChild(editorTitle);
    editTableView.appendChild(editorSubTitle);
    editTableView.appendChild(editorContainer);
    editTableView.appendChild(addColumnButton);
    editTableView.appendChild(saveButton);

    // --- Initial render ---
    renderEditor();
};


const copyToClipboard = (text, buttonElement) => {
        const tempTextArea = document.createElement('textarea');
        tempTextArea.value = text;
        tempTextArea.style.position = 'absolute';
        tempTextArea.style.left = '-9999px';
        document.body.appendChild(tempTextArea);
        tempTextArea.select();
        document.execCommand('copy');
        document.body.removeChild(tempTextArea);

        if (buttonElement) {
            const originalText = buttonElement.textContent;
            buttonElement.textContent = 'コピー完了!';
            buttonElement.classList.add('bg-green-600');
            setTimeout(() => {
                buttonElement.textContent = 'コピー';
                buttonElement.classList.remove('bg-green-600');
            }, 1500);
        }
    };

    // --- 8. Spreadsheet Data Creator ---
    const renderSpreadsheetView = () => {
        renderComboColumnSelector();
        renderMemoColumnSelector();
        renderSpreadsheetDataTable();
        updateSpreadsheetOutput();
    };

    const renderComboColumnSelector = () => {
        comboColumnSelect.innerHTML = '<option value="">(なし)</option>';
        spreadsheetColumns.forEach(column => {
            const option = document.createElement('option');
            option.value = column.id;
            option.textContent = column.header;
            if (column.id === comboColumnId) {
                option.selected = true;
            }
            comboColumnSelect.appendChild(option);
        });
    };

    function createTableEditorComponent(container, options) {
        let { columns, data, isReadOnly, getCellValue, onStateChange, onDataChange, showDataRow } = options;
        if (showDataRow === undefined) {
            showDataRow = true;
        }
        let localDraggedColumnId = null;

        container.innerHTML = '';
        if (columns.length === 0) return null;

        const table = document.createElement('table');
        table.className = 'w-full text-left border-collapse';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.className = 'bg-gray-700';

        columns.forEach((column, index) => {
            const th = document.createElement('th');
            th.className = 'p-1 border border-gray-600 cursor-move';
            th.dataset.columnId = column.id;
            th.draggable = true;

            th.addEventListener('dragstart', (e) => { e.stopPropagation(); localDraggedColumnId = column.id; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => th.classList.add('dragging'), 0); });
            th.addEventListener('dragend', () => { th.classList.remove('dragging'); document.querySelectorAll('.spreadsheet-drag-over').forEach(el => el.classList.remove('spreadsheet-drag-over')); localDraggedColumnId = null; });
            th.addEventListener('dragover', (e) => { e.preventDefault(); if (column.id !== localDraggedColumnId) th.classList.add('spreadsheet-drag-over'); });
            th.addEventListener('dragleave', () => th.classList.remove('spreadsheet-drag-over'));
            th.addEventListener('drop', (e) => {
                e.preventDefault(); e.stopPropagation();
                th.classList.remove('spreadsheet-drag-over');
                if (!localDraggedColumnId || localDraggedColumnId === column.id) return;
                const draggedIndex = columns.findIndex(c => c.id === localDraggedColumnId);
                const droppedOnIndex = columns.findIndex(c => c.id === column.id);
                if (draggedIndex > -1 && droppedOnIndex > -1) {
                    const [removed] = columns.splice(draggedIndex, 1);
                    columns.splice(droppedOnIndex, 0, removed);
                    onStateChange({ columns, data });
                }
            });

            const headerContent = document.createElement('div');
            headerContent.className = 'flex items-center justify-between gap-1';

            const inputContainer = document.createElement('div');
            inputContainer.className = 'flex-grow';

            const headerInput = document.createElement('input');
            headerInput.type = 'text';
            headerInput.value = column.header;
            headerInput.className = 'form-input w-full p-1 bg-gray-700 border-none rounded-md text-white focus:bg-gray-600';
            headerInput.placeholder = `列 ${index + 1}`;
            headerInput.addEventListener('change', (e) => {
                columns[index].header = e.target.value;
                onStateChange({ columns, data });
            });
            inputContainer.appendChild(headerInput);

            headerContent.appendChild(inputContainer);

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;';
            deleteBtn.className = 'text-gray-400 hover:text-red-400 font-bold text-xl leading-none px-2 rounded-full self-start';
            deleteBtn.title = 'この列を削除';
            deleteBtn.addEventListener('click', () => {
                delete data[column.id];
                columns.splice(index, 1);
                onStateChange({ columns, data });
            });

            headerContent.appendChild(deleteBtn);
            th.appendChild(headerContent);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        if (showDataRow) {
            const tbody = document.createElement('tbody');
            const dataRow = document.createElement('tr');
            columns.forEach(column => {
                const td = document.createElement('td');
                td.className = 'p-1 border border-gray-600';
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'form-input w-full p-1 bg-gray-800 border-none rounded-md text-white focus:bg-gray-700';
                input.dataset.columnId = column.id;

                if (isReadOnly && isReadOnly(column.id)) {
                    input.readOnly = true;
                    input.classList.add('bg-gray-900', 'text-gray-400');
                    input.value = getCellValue ? getCellValue(column.id) : (data[column.id] || '');
                    data[column.id] = input.value;
                } else {
                    input.value = data[column.id] || '';
                    input.addEventListener('input', (e) => {
                        data[column.id] = e.target.value;
                        onDataChange(data);
                    });
                }
                td.appendChild(input);
                dataRow.appendChild(td);
            });
            tbody.appendChild(dataRow);
            table.appendChild(tbody);
        }

        container.appendChild(table);

        return {
            getColumns: () => columns,
            getData: () => data,
        };
    }

    const renderSpreadsheetDataTable = () => {
        createTableEditorComponent(spreadsheetDataTableContainer, {
            columns: spreadsheetColumns,
            data: spreadsheetData,
            isReadOnly: (columnId) => columnId === comboColumnId || columnId === memoColumnId,
            getCellValue: (columnId) => {
                if (columnId === comboColumnId) return getComboTextForSpreadsheet();
                if (columnId === memoColumnId) return spreadsheetMemo;
                return spreadsheetData[columnId] || '';
            },
            onStateChange: (newState) => {
                spreadsheetColumns = newState.columns;
                spreadsheetData = newState.data;
                saveSpreadsheetSettings();
                renderSpreadsheetView();
            },
            onDataChange: (newData) => {
                spreadsheetData = newData;
                saveSpreadsheetSettings();
                updateSpreadsheetOutput();
            }
        });
    };

    const updateSpreadsheetOutput = () => {
        const values = spreadsheetColumns.map(c => spreadsheetData[c.id] || '').join('\t');
        spreadsheetOutput.value = values;
    };

    const getComboTextForSpreadsheet = () => {
        const comboPlainText = mergedOutput.textContent;
        if (comboPlainText.includes('ここにコンボが表示されます...')) {
            return '';
        }
        return comboPlainText;
    };

    const addSpreadsheetColumn = () => {
        spreadsheetColumns.push({ id: `col-${Date.now()}`, header: '' });
        saveSpreadsheetSettings();
        renderSpreadsheetView();
    };

    const handleComboColumnChange = (e) => {
        comboColumnId = e.target.value;
        saveSpreadsheetSettings();
        renderSpreadsheetView();
    };

    const handleMemoColumnChange = (e) => {
        memoColumnId = e.target.value;
        saveSpreadsheetSettings();
        renderSpreadsheetView();
    };

    const copySpreadsheetData = () => {
        copyToClipboard(spreadsheetOutput.value, copySpreadsheetDataButton);
    };


    // --- 8.5. Database View ---
    const databaseContentArea = document.getElementById('database-content-area');

    let currentSort = 'name-asc';
    const renderTableListView = async () => {
        try {
            const schemas = await window.db.getAllSchemas();
            databaseContentArea.innerHTML = ''; // Clear previous content

            const header = document.createElement('div');
            header.className = 'flex justify-between items-center mb-4';
            const title = document.createElement('h2');
            title.textContent = 'テーブル一覧';
            title.className = 'text-2xl font-bold';
            const newTableButton = document.createElement('button');
            newTableButton.textContent = '新規テーブル作成';
            newTableButton.className = 'bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md';
            newTableButton.addEventListener('click', () => showView('create-table'));
            header.appendChild(title);
            header.appendChild(newTableButton);
            databaseContentArea.appendChild(header);

            const controlsContainer = document.createElement('div');
            controlsContainer.className = 'flex justify-between items-center mb-6 flex-wrap gap-4';

            const searchContainer = document.createElement('div');
            searchContainer.className = 'flex gap-2 items-center';
            const searchInput = document.createElement('input');
            searchInput.type = 'search';
            searchInput.placeholder = '全テーブルを横断検索...';
            searchInput.className = 'form-input flex-grow bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2 text-sm';
            searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchButton.click(); });
            const searchButton = document.createElement('button');
            searchButton.textContent = '検索';
            searchButton.className = 'bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md';
            searchButton.addEventListener('click', () => {
                const query = searchInput.value.trim();
                if (query) renderGlobalSearchResults(query);
            });
            searchContainer.appendChild(searchInput);
            searchContainer.appendChild(searchButton);
            controlsContainer.appendChild(searchContainer);

            const sortContainer = document.createElement('div');
            sortContainer.className = 'flex gap-2 items-center';
            const sortLabel = document.createElement('label');
            sortLabel.htmlFor = 'table-sort-select';
            sortLabel.className = 'text-sm font-medium text-gray-300';
            sortLabel.textContent = 'ソート:';
            const sortSelect = document.createElement('select');
            sortSelect.id = 'table-sort-select';
            sortSelect.className = 'form-select bg-gray-700 border-gray-600 rounded-md text-white px-3 py-1 text-sm';
            sortSelect.innerHTML = `
                <option value="name-asc">名前 (昇順)</option>
                <option value="name-desc">名前 (降順)</option>
                <option value="updated-desc">最終更新 (新しい順)</option>
                <option value="updated-asc">最終更新 (古い順)</option>
            `;
            sortSelect.value = currentSort;
            sortContainer.appendChild(sortLabel);
            sortContainer.appendChild(sortSelect);
            controlsContainer.appendChild(sortContainer);

            databaseContentArea.appendChild(controlsContainer);

            const listContainer = document.createElement('div');
            listContainer.id = 'db-table-list-container';
            databaseContentArea.appendChild(listContainer);

            const renderList = () => {
                listContainer.innerHTML = '';

                const sortFunctions = {
                    'name-asc': (a, b) => a.tableName.localeCompare(b.tableName),
                    'name-desc': (a, b) => b.tableName.localeCompare(a.tableName),
                    'updated-desc': (a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated),
                    'updated-asc': (a, b) => new Date(a.lastUpdated) - new Date(b.lastUpdated),
                };
                schemas.sort(sortFunctions[currentSort]);

                if (schemas.length === 0) {
                    listContainer.innerHTML = '<p class="text-gray-500 col-span-full text-center py-8">テーブルがありません。最初のテーブルを作成してください。</p>';
                } else {
                    const grid = document.createElement('div');
                    grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
                    schemas.forEach(schema => {
                        const card = document.createElement('div');
                        card.className = 'bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-blue-500 cursor-pointer transition-colors flex flex-col justify-between';
                        card.addEventListener('click', () => showView('database', { tableName: schema.tableName }));
                        const textContent = document.createElement('div');
                        const cardTitle = document.createElement('h3');
                        cardTitle.className = 'text-xl font-bold text-white mb-2 truncate';
                        cardTitle.textContent = schema.tableName;
                        cardTitle.title = schema.tableName;
                        const dataCount = document.createElement('p');
                        dataCount.className = 'text-sm text-gray-400';
                        dataCount.textContent = `データ数: ${schema.recordCount || 0}`;
                        const lastUpdated = document.createElement('p');
                        lastUpdated.className = 'text-xs text-gray-500 mt-1';
                        lastUpdated.textContent = schema.lastUpdated ? `最終更新: ${new Date(schema.lastUpdated).toLocaleString('ja-JP')}` : '最終更新: 不明';
                        textContent.appendChild(cardTitle);
                        textContent.appendChild(dataCount);
                        textContent.appendChild(lastUpdated);
                        const buttonGroup = document.createElement('div');
                        buttonGroup.className = 'flex items-center justify-end gap-2 mt-4';
                        const deleteButton = document.createElement('button');
                        deleteButton.textContent = '削除';
                        deleteButton.className = 'text-xs bg-red-800 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md';
                        deleteButton.addEventListener('click', (e) => {
                            e.stopPropagation();
                            if (schema.tableName === window.db.DEFAULT_TABLE) {
                                alert('デフォルトのテーブルは削除できません。');
                                return;
                            }
                            const message = `本当にテーブル「${schema.tableName}」を削除しますか？<br><strong class="text-red-400">このテーブル内のすべてのデータが完全に失われ、この操作は取り消せません。</strong>`;
                            openConfirmModal(message, async () => {
                                try {
                                    await window.db.deleteTable(schema.tableName);
                                    alert(`テーブル「${schema.tableName}」を削除しました。`);
                                    await renderTableListView();
                                } catch (error) {
                                    console.error(`Failed to delete table ${schema.tableName}:`, error);
                                    alert(`テーブルの削除に失敗しました: ${error}`);
                                }
                            });
                        });
                        buttonGroup.appendChild(deleteButton);
                        card.appendChild(textContent);
                        card.appendChild(buttonGroup);
                        grid.appendChild(card);
                    });
                    listContainer.appendChild(grid);
                }
            };

            sortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                renderList();
            });

            renderList();
        } catch (error) {
            console.error('Error rendering database list view:', error);
            databaseContentArea.innerHTML = `<p class="text-red-500">データベース一覧の表示に失敗しました: ${error.message}</p>`;
        }
    };

    const renderTableView = async (tableName) => {
        try {
            databaseContentArea.innerHTML = '<p class="text-gray-400">テーブルを読み込み中...</p>';
            let currentTableSort = { columnId: null, direction: 'asc' };
            const selectedRowIds = new Set();
            const schema = await window.db.getSchema(tableName);
            const originalData = await window.db.getAllRecords(tableName);

            const coloringPresetName = schema.coloringPresetName;
            const actionsToUse = coloringPresetName && presets[coloringPresetName] ? presets[coloringPresetName] : actions;

            if (!schema) throw new Error(`テーブル「${tableName}」のスキーマが見つかりません。`);

            databaseContentArea.innerHTML = '';

            const header = document.createElement('div');
            header.className = 'flex items-center mb-4';
            const backButton = document.createElement('button');
            backButton.innerHTML = '&larr; テーブル一覧に戻る';
            backButton.className = 'text-blue-400 hover:text-blue-300 font-bold';
            backButton.addEventListener('click', () => showView('database'));

            const title = document.createElement('h2');
            title.textContent = tableName;
            title.className = 'text-2xl font-bold ml-4';

            const searchInput = document.createElement('input');
            searchInput.type = 'search';
            searchInput.placeholder = 'テーブル内を検索...';
            searchInput.className = 'ml-4 form-input bg-gray-700 border-gray-600 rounded-md text-white px-3 py-1 text-sm';

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'ml-auto flex items-center gap-2';

            const moveSelectedButton = document.createElement('button');
            moveSelectedButton.textContent = '移動';
            moveSelectedButton.className = 'bg-blue-700 text-white font-bold py-1 px-3 rounded-md text-sm disabled:bg-gray-600 disabled:cursor-not-allowed';
            moveSelectedButton.disabled = true;

            const deleteSelectedButton = document.createElement('button');
            deleteSelectedButton.textContent = '削除';
            deleteSelectedButton.className = 'bg-red-800 text-white font-bold py-1 px-3 rounded-md text-sm disabled:bg-gray-600 disabled:cursor-not-allowed';
            deleteSelectedButton.disabled = true;

            const editSchemaButton = document.createElement('button');
            editSchemaButton.textContent = 'テーブル設定';
            editSchemaButton.className = 'bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-sm';
            editSchemaButton.addEventListener('click', () => showView('edit-table', { tableName }));

            buttonGroup.appendChild(moveSelectedButton);
            buttonGroup.appendChild(deleteSelectedButton);
            buttonGroup.appendChild(editSchemaButton);

            header.appendChild(backButton);
            header.appendChild(title);
            header.appendChild(searchInput);
            header.appendChild(buttonGroup);
            databaseContentArea.appendChild(header);

            const updateButtonStates = () => {
                const count = selectedRowIds.size;
                if (count > 0) {
                    deleteSelectedButton.disabled = false;
                    deleteSelectedButton.textContent = `${count}件 削除`;
                    moveSelectedButton.disabled = false;
                    moveSelectedButton.textContent = `${count}件 移動`;
                } else {
                    deleteSelectedButton.disabled = true;
                    deleteSelectedButton.textContent = '削除';
                    moveSelectedButton.disabled = true;
                    moveSelectedButton.textContent = '移動';
                }
            };

            deleteSelectedButton.addEventListener('click', () => {
                if (selectedRowIds.size === 0) return;
                const message = `選択した ${selectedRowIds.size} 件のデータを削除しますか？<br>この操作は取り消せません。`;
                openConfirmModal(message, async () => {
                    await Promise.all(Array.from(selectedRowIds).map(id => window.db.deleteRecord(tableName, id)));
                    renderTableView(tableName);
                });
            });

            moveSelectedButton.addEventListener('click', async () => {
                if (selectedRowIds.size === 0) return;

                // Populate the dropdown in the modal
                try {
                    const allSchemas = await window.db.getAllSchemas();
                    moveTargetTableSelect.innerHTML = '';
                    allSchemas.forEach(schema => {
                        if (schema.tableName !== tableName) {
                            const option = document.createElement('option');
                            option.value = schema.tableName;
                            option.textContent = schema.tableName;
                            moveTargetTableSelect.appendChild(option);
                        }
                    });

                    if (moveTargetTableSelect.options.length === 0) {
                        alert('移動可能なテーブルがありません。');
                        return;
                    }

                    const message = `選択した ${selectedRowIds.size} 件のデータを移動します。`;
                    openMoveRecordsModal(message, (destinationTable) => {
                        handleMoveRecords(tableName, destinationTable, Array.from(selectedRowIds));
                    });
                } catch (error) {
                    console.error('Failed to prepare for move:', error);
                    alert('移動の準備に失敗しました。');
                }
            });

            const table = document.createElement('table');
            table.className = 'text-left border-collapse database-table min-w-full';

            const thead = document.createElement('thead');
            const tbody = document.createElement('tbody');

            const headerRow = document.createElement('tr');
            headerRow.className = 'bg-gray-700 sticky top-0';

            const columnsWithActions = [{ id: 'selector', name: '' }, ...schema.columns];

            columnsWithActions.forEach(column => {
                const th = document.createElement('th');
                th.className = 'p-2 border border-gray-600'; // The CSS will add position: relative
                th.dataset.columnId = column.id;

                if (column.id === 'selector') {
                    th.style.width = '40px';
                    th.classList.add('text-center', 'align-middle');
                    const selectAllCheckbox = document.createElement('input');
                    selectAllCheckbox.type = 'checkbox';
                    selectAllCheckbox.className = 'form-checkbox bg-gray-900 border-gray-600 rounded text-blue-500 h-4 w-4';
                    selectAllCheckbox.addEventListener('change', () => {
                        const isChecked = selectAllCheckbox.checked;
                        tbody.querySelectorAll('input[type="checkbox"].row-selector').forEach(cb => {
                            cb.checked = isChecked;
                            const rowId = parseInt(cb.dataset.rowId, 10);
                            if (isChecked) selectedRowIds.add(rowId);
                            else selectedRowIds.delete(rowId);
                        });
                        updateButtonStates();
                    });
                    th.appendChild(selectAllCheckbox);
                } else {
                    th.style.cursor = 'pointer';
                    th.addEventListener('click', () => {
                        if (currentTableSort.columnId === column.id) {
                            currentTableSort.direction = currentTableSort.direction === 'asc' ? 'desc' : 'asc';
                        } else {
                            currentTableSort.columnId = column.id;
                            currentTableSort.direction = 'asc';
                        }
                        applyFiltersAndSort();
                    });

                    const headerContent = document.createElement('div');
                    headerContent.className = 'flex items-center justify-between';

                    const headerText = document.createElement('span');
                    headerText.textContent = column.name;

                    const sortIndicator = document.createElement('span');
                    sortIndicator.className = 'sort-indicator ml-1 text-xs';

                    headerContent.appendChild(headerText);
                    headerContent.appendChild(sortIndicator);
                    th.appendChild(headerContent);

                    // Load saved width if it exists
                    if (schema.widths && schema.widths[column.id]) {
                        th.style.width = `${schema.widths[column.id]}px`;
                    }
                    // Add resize handle
                    const resizeHandle = document.createElement('div');
                    resizeHandle.className = 'resize-handle';
                    th.appendChild(resizeHandle);
                }

                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);

            // Resizing logic
            headerRow.querySelectorAll('th').forEach(th => {
                const resizeHandle = th.querySelector('.resize-handle');
                if (!resizeHandle) return;

                resizeHandle.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    const thToResize = e.target.parentElement;
                    const startX = e.pageX;
                    const startWidth = thToResize.offsetWidth;

                    const handleMouseMove = (mouseMoveEvent) => {
                        const newWidth = startWidth + (mouseMoveEvent.pageX - startX);
                        if (newWidth > 40) { // Minimum column width
                            thToResize.style.width = `${newWidth}px`;
                        }
                    };

                    const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);

                        const newWidths = {};
                        headerRow.querySelectorAll('th').forEach(th => {
                            if (th.dataset.columnId && th.style.width) {
                                newWidths[th.dataset.columnId] = parseInt(th.style.width, 10);
                            }
                        });

                        // Only update if there are any widths to save
                        if (Object.keys(newWidths).length > 0) {
                            const updatedSchema = { ...schema, widths: { ...schema.widths, ...newWidths } };
                            window.db.updateSchema(updatedSchema).catch(err => {
                                console.error("Failed to save column widths:", err);
                                // Optional: notify user of failure
                            });
                        }
                    };

                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                });
            });

            table.appendChild(thead);

            const applyFiltersAndSort = () => {
                // 1. Filter
                const query = searchInput.value.toLowerCase();
                let filteredData;
                if (query) {
                    filteredData = originalData.filter(row =>
                        Object.values(row).some(value => String(value).toLowerCase().includes(query))
                    );
                } else {
                    filteredData = [...originalData]; // フィルタがない場合は元のデータのコピーから始める
                }

                // 2. Sort
                const { columnId, direction } = currentTableSort;
                if (columnId) {
                    filteredData.sort((a, b) => {
                        let valA = a[columnId] || '';
                        let valB = b[columnId] || '';

                        // コンボ列はHTMLタグを除いたテキストで比較
                        if (columnId === schema.comboColumnId) {
                            const textA = new DOMParser().parseFromString(valA, 'text/html').body.textContent || '';
                            const textB = new DOMParser().parseFromString(valB, 'text/html').body.textContent || '';
                            return textA.localeCompare(textB, 'ja');
                        }

                        // 数値として比較できるか試す (空文字列は数値と見なさない)
                        const numA = parseFloat(valA);
                        const numB = parseFloat(valB);
                        if (String(valA).trim() !== '' && String(valB).trim() !== '' && !isNaN(numA) && !isNaN(numB)) {
                            return numA - numB;
                        }

                        // 文字列として比較
                        return String(valA).localeCompare(String(valB), 'ja');
                    });

                    if (direction === 'desc') {
                        filteredData.reverse();
                    }
                }

                // 3. Update UI (Sort Indicators)
                headerRow.querySelectorAll('th .sort-indicator').forEach(indicator => {
                    const th = indicator.closest('th');
                    indicator.textContent = (th && th.dataset.columnId === currentTableSort.columnId) ? (currentTableSort.direction === 'asc' ? '▲' : '▼') : '';
                });

                renderTbody(filteredData);
            };

            table.appendChild(tbody);

            const renderTbody = (filteredData) => {
                tbody.innerHTML = '';
                if (filteredData.length === 0) {
                    const tr = document.createElement('tr');
                    const td = document.createElement('td');
                    td.colSpan = columnsWithActions.length;
                    td.textContent = 'データが見つかりません。';
                    td.className = 'text-center text-gray-500 p-4';
                    tr.appendChild(td);
                    tbody.appendChild(tr);
                } else {
                    filteredData.forEach(row => {
                        const tr = document.createElement('tr');
                        tr.className = 'bg-gray-800 hover:bg-gray-700/50';

                        columnsWithActions.forEach(column => {
                            const td = document.createElement('td');
                            td.dataset.columnId = column.id;
                            td.className = 'p-1 border border-gray-600';

                            if (column.id === 'selector') {
                                td.classList.add('text-center', 'align-middle');
                                const rowCheckbox = document.createElement('input');
                                rowCheckbox.type = 'checkbox';
                                rowCheckbox.className = 'form-checkbox bg-gray-900 border-gray-600 rounded text-blue-500 h-4 w-4 row-selector';
                                rowCheckbox.dataset.rowId = row.id;
                                rowCheckbox.addEventListener('change', () => {
                                    const rowId = parseInt(rowCheckbox.dataset.rowId, 10);
                                    if (rowCheckbox.checked) selectedRowIds.add(rowId);
                                    else selectedRowIds.delete(rowId);
                                    updateButtonStates();
                                });
                                td.appendChild(rowCheckbox);
                            } else {
                                td.classList.add('align-top');
                                const displayWrapper = document.createElement('div');
                                displayWrapper.className = 'cell-display-wrapper';

                                let cellContent = row[column.id] || '';
                                // コンボ列または始動技列の場合、カラーリングを適用
                                if (column.id === schema.comboColumnId || (schema.starterColumnId && column.id === schema.starterColumnId)) {
                                    displayWrapper.innerHTML = generateHtmlFromPlainText(displayWrapper.textContent || cellContent, actionsToUse);
                                } else {
                                    displayWrapper.textContent = cellContent;
                                }
                                td.appendChild(displayWrapper);

                                td.addEventListener('click', () => {
                                    const displayWrapper = td.querySelector('.cell-display-wrapper');
                                    if (!displayWrapper) return; // Already in edit mode

                                    const isComboColumn = column.id === schema.comboColumnId;
                                    const originalContent = isComboColumn ? displayWrapper.innerHTML : displayWrapper.textContent;
                                    const editText = displayWrapper.textContent;

                                    const editor = document.createElement('textarea');
                                    editor.className = 'cell-editor';
                                    editor.value = editText;

                                    const autoSize = (el) => {
                                        setTimeout(() => {
                                            el.style.height = 'auto';
                                            el.style.height = `${el.scrollHeight}px`;
                                        }, 0);
                                    };
                                    editor.addEventListener('input', () => autoSize(editor));

                                    const revertToDisplay = (content) => {
                                        const newDisplayWrapper = document.createElement('div');
                                        newDisplayWrapper.className = 'cell-display-wrapper';
                                        if (isComboColumn) {
                                            newDisplayWrapper.innerHTML = content;
                                        } else {
                                            newDisplayWrapper.textContent = content;
                                        }
                                        td.innerHTML = '';
                                        td.appendChild(newDisplayWrapper);
                                    };

                                    const saveChanges = async () => {
                                        const newText = editor.value;
                                        editor.removeEventListener('blur', saveChanges); // Prevent loops

                                        let newContent = newText;
                                        if (isComboColumn) {
                                            newContent = generateHtmlFromPlainText(newText, actionsToUse);
                                        }

                                        if (newContent !== originalContent) {
                                            const recordToUpdate = data.find(d => d.id === row.id);
                                            if (recordToUpdate) {
                                                // Update the edited column
                                                recordToUpdate[column.id] = newContent;

                                                // If combo column was edited, also update starter column
                                                if (isComboColumn && schema.starterColumnId) {
                                                    const starterMove = newText.split(' > ')[0].trim();
                                                    recordToUpdate[schema.starterColumnId] = starterMove;
                                                }

                                                try {
                                                    await window.db.updateRecord(tableName, recordToUpdate);
                                                    // If successful, update the UI for the starter column as well
                                                    if (isComboColumn && schema.starterColumnId) {
                                                        const rowElement = editor.closest('tr');
                                                        if (rowElement) {
                                                            const starterCellWrapper = rowElement.querySelector(`[data-column-id="${schema.starterColumnId}"] .cell-display-wrapper`);
                                                            if (starterCellWrapper) starterCellWrapper.textContent = recordToUpdate[schema.starterColumnId];
                                                        }
                                                    }
                                                } catch (err) {
                                                    console.error('Failed to update record:', err);
                                                    revertToDisplay(originalContent); // Revert on failure
                                                    return;
                                                }
                                            }
                                        }
                                        revertToDisplay(newContent);
                                    };

                                    editor.addEventListener('blur', saveChanges);
                                    editor.addEventListener('keydown', (e) => {
                                        if (e.key === 'Escape') {
                                            e.preventDefault();
                                            editor.removeEventListener('blur', saveChanges);
                                            revertToDisplay(originalContent);
                                        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                            e.preventDefault();
                                            saveChanges();
                                        }
                                    });

                                    td.innerHTML = '';
                                    td.appendChild(editor);
                                    editor.focus();
                                    autoSize(editor);
                                });
                            }
                            tr.appendChild(td);
                        });
                        tbody.appendChild(tr);
                    });
                }
            };

            searchInput.addEventListener('input', applyFiltersAndSort);

            renderTbody(originalData);

            databaseContentArea.appendChild(table);

        } catch (error) {
            console.error(`Error rendering table view for ${tableName}:`, error);
            databaseContentArea.innerHTML = `<p class="text-red-500">テーブルの表示に失敗しました: ${error.message}</p>`;
        }
    };

    const handleMoveRecords = async (sourceTable, destinationTable, recordIds) => {
        console.log(`Moving ${recordIds.length} records from ${sourceTable} to ${destinationTable}`);
        closeMoveRecordsModal();

        try {
            const sourceSchema = await window.db.getSchema(sourceTable);
            const destinationSchema = await window.db.getSchema(destinationTable);
            const allSourceRecords = await window.db.getAllRecords(sourceTable);
            const recordsToMove = allSourceRecords.filter(r => recordIds.includes(r.id));

            const sourceColMap = new Map(sourceSchema.columns.map(c => [c.name, c.id]));
            const destColMap = new Map(destinationSchema.columns.map(c => [c.name, c.id]));

            const mappedColumns = Array.from(sourceColMap.keys()).filter(name => destColMap.has(name));
            const unmappedColumns = Array.from(sourceColMap.keys()).filter(name => !destColMap.has(name));

            if (unmappedColumns.length > 0) {
                if (!confirm(`以下の列は移動先に存在しないため、データが失われます:\n- ${unmappedColumns.join('\n- ')}\n\n移動を続行しますか？`)) {
                    return;
                }
            }

            const operations = [];
            for (const record of recordsToMove) {
                const newRecord = {};
                for (const colName of mappedColumns) {
                    const sourceColId = sourceColMap.get(colName);
                    const destColId = destColMap.get(colName);
                    if (record[sourceColId] !== undefined) {
                        newRecord[destColId] = record[sourceColId];
                    }
                }
                operations.push(window.db.addRecord(destinationTable, newRecord));
                operations.push(window.db.deleteRecord(sourceTable, record.id));
            }

            await Promise.all(operations);
            alert(`${recordIds.length}件のレコードを「${destinationTable}」に移動しました。`);
            await renderTableView(sourceTable);
        } catch (error) {
            console.error('Failed to move records:', error);
            alert(`レコードの移動中にエラーが発生しました: ${error.message}`);
        }
    };

    const renderDatabaseView = async (tableName = null) => {
        if (tableName) {
            await renderTableView(tableName);
        } else {
            await renderTableListView();
        }
    };

    const renderGlobalSearchResults = async (query) => {
        databaseContentArea.innerHTML = `<p class="text-gray-400">全テーブルを検索中: <span class="font-bold">"${query}"</span>...</p>`;
        const lowerCaseQuery = query.toLowerCase();

        try {
            const allSchemas = await window.db.getAllSchemas();
            let allResults = [];

            for (const schema of allSchemas) {
                const tableData = await window.db.getAllRecords(schema.tableName);
                const tableResults = tableData.filter(row => {
                    return Object.values(row).some(value =>
                        String(value).toLowerCase().includes(lowerCaseQuery)
                    );
                });

                if (tableResults.length > 0) {
                    allResults.push({
                        tableName: schema.tableName,
                        results: tableResults
                    });
                }
            }

            databaseContentArea.innerHTML = '';

            const header = document.createElement('div');
            header.className = 'flex justify-between items-center mb-6';
            const title = document.createElement('h2');
            title.className = 'text-2xl font-bold';
            title.innerHTML = `検索結果: <span class="text-blue-400 font-mono">"${query}"</span>`;

            const clearButton = document.createElement('button');
            clearButton.textContent = '検索をクリア';
            clearButton.className = 'bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md';
            clearButton.addEventListener('click', () => renderTableListView());

            header.appendChild(title);
            header.appendChild(clearButton);
            databaseContentArea.appendChild(header);

            if (allResults.length === 0) {
                databaseContentArea.innerHTML += '<p class="text-gray-500">一致する結果は見つかりませんでした。</p>';
                return;
            }

            const resultsContainer = document.createElement('div');
            resultsContainer.className = 'space-y-6';
            allResults.forEach(tableResult => {
                const tableSection = document.createElement('div');

                const tableTitle = document.createElement('h3');
                tableTitle.className = 'text-xl font-semibold text-gray-300 border-b border-gray-700 pb-2 mb-2';
                tableTitle.textContent = `テーブル: ${tableResult.tableName}`;
                tableSection.appendChild(tableTitle);

                const resultList = document.createElement('div');
                resultList.className = 'space-y-2';
                tableResult.results.forEach(row => {
                    const card = document.createElement('div');
                    card.className = 'bg-gray-800 p-3 rounded-lg';
                    const comboContent = row.comboHTML || '（コンボデータなし）';
                    card.innerHTML = `<p class="text-sm text-gray-400">ID: ${row.id}</p>${comboContent}`;
                    resultList.appendChild(card);
                });
                tableSection.appendChild(resultList);
                resultsContainer.appendChild(tableSection);
            });
            databaseContentArea.appendChild(resultsContainer);

        } catch (error) {
            console.error('Global search failed:', error);
            databaseContentArea.innerHTML = `<p class="text-red-500">検索中にエラーが発生しました: ${error.message}</p>`;
        }
    };



    // --- 8.6. Editor-Database Integration ---
    const renderEditorMetadataForm = async (tableName) => {
        editorMetadataFormContainer.innerHTML = '<p class="text-gray-500 col-span-full">フォームを読み込み中...</p>';
        if (!tableName) {
            editorMetadataFormContainer.innerHTML = '<p class="text-gray-500 col-span-full">保存先テーブルを選択してください。</p>';
            return;
        }

        try {
            const schema = await window.db.getSchema(tableName);
            if (!schema) {
                editorMetadataFormContainer.innerHTML = '<p class="text-red-500 col-span-full">スキーマの読み込みに失敗しました。</p>';
                return;
            }

            editorMetadataFormContainer.innerHTML = '';
            const metadataColumns = schema.columns.filter(col => col.id !== schema.comboColumnId && col.id !== schema.starterColumnId);

            if (metadataColumns.length === 0) {
                editorMetadataFormContainer.innerHTML = '<p class="text-gray-500 col-span-full">このテーブルには追加の付帯情報がありません。</p>';
            } else {
                metadataColumns.forEach(column => {
                    const fieldDiv = document.createElement('div');
                    const label = document.createElement('label');
                    label.htmlFor = `metadata-input-${column.id}`;
                    label.className = 'block text-sm font-medium text-gray-300 mb-1';
                    label.textContent = column.name;

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.id = `metadata-input-${column.id}`;
                    input.dataset.columnId = column.id;
                    input.className = 'form-input w-full bg-gray-900 border-gray-600 rounded-md text-white px-3 py-2 text-sm metadata-input';
                    input.placeholder = column.name;

                    fieldDiv.appendChild(label);
                    fieldDiv.appendChild(input);
                    editorMetadataFormContainer.appendChild(fieldDiv);
                });
            }
        } catch (error) {
            console.error(`Error rendering metadata form for ${tableName}:`, error);
            editorMetadataFormContainer.innerHTML = '<p class="text-red-500 col-span-full">フォームの読み込みに失敗しました。</p>';
        }
    };

    const populateTableSelector = async () => {
        try {
            const schemas = await window.db.getAllSchemas();
            const currentSelection = saveTableSelect.value;
            saveTableSelect.innerHTML = '';

            schemas.sort((a,b) => a.tableName.localeCompare(b.tableName)).forEach(schema => {
                const option = document.createElement('option');
                option.value = schema.tableName;
                option.textContent = schema.tableName;
                saveTableSelect.appendChild(option);
            });

            if (schemas.some(s => s.tableName === currentSelection)) {
                saveTableSelect.value = currentSelection;
            }

            if (saveTableSelect.value) {
                await renderEditorMetadataForm(saveTableSelect.value);
            } else {
                await renderEditorMetadataForm(null);
            }

        } catch (error) {
            console.error('Failed to populate table selector:', error);
        }
    };

    saveTableSelect.addEventListener('change', () => {
        renderEditorMetadataForm(saveTableSelect.value);
    });

    // Create and add the "Go to Table" button
    const goToTableButton = document.createElement('button');
    goToTableButton.textContent = '移動';
    goToTableButton.title = '選択したテーブルを表示';
    goToTableButton.className = 'bg-gray-600 hover:bg-gray-500 text-white font-bold px-3 py-1 rounded-md text-sm flex-shrink-0';
    goToTableButton.addEventListener('click', () => {
        const tableName = saveTableSelect.value;
        if (tableName) {
            showView('database', { tableName: tableName });
        } else {
            alert('テーブルが選択されていません。');
        }
    });
    // Insert the button next to the dropdown
    saveTableSelect.insertAdjacentElement('afterend', goToTableButton);


    // --- 8.7. Schema Editing ---

    const handleUpdateSchema = async (tableName, tempColumns, comboColumnId, coloringPresetName, starterColumnId) => {
        const originalSchema = await window.db.getSchema(tableName);
        if (!originalSchema) {
            alert('元のスキーマが見つかりません。');
            return false;
        }

        const columns = tempColumns.map(col => ({
            id: col.id,
            name: col.header.trim()
        }));

        if (columns.some(c => !c.name)) {
            alert('列名が空のフィールドがあります。');
            return false;
        }

        const columnIds = new Set(columns.map(c => c.id));
        if (columns.length !== columnIds.size) {
            alert('重複した列IDが内部的に検出されました。リロードしてやり直してください。');
            return false;
        }

        if (!comboColumnId || !columnIds.has(comboColumnId)) {
            alert('コンボを保存する列を1つ選択してください。');
            return false;
        }

        const finalSchema = {
            ...originalSchema,
            columns: columns,
            comboColumnId: comboColumnId,
            coloringPresetName: coloringPresetName,
            starterColumnId: starterColumnId,
        };

        try {
            await window.db.updateSchema(finalSchema);
            alert('スキーマが更新されました。');
            return true;
        } catch (error) {
            console.error('Failed to update schema:', error);
            alert('スキーマの更新に失敗しました。');
            return false;
        }
    };



    // --- 9. YouTube Player ---
    const loadYouTubeAPI = () => {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    };

    window.onYouTubeIframeAPIReady = () => {
        console.log(`${LOG_PREFIX} YouTube IFrame API is ready.`);
        ytPlayer = new YT.Player('youtube-player', {
            height: '100%',
            width: '100%',
            videoId: '', // Initially empty
            playerVars: {
                'playsinline': 1
            },
            events: {
                'onReady': (event) => console.log("Player ready"),
                'onStateChange': (event) => {
                    if (event.data === YT.PlayerState.PLAYING) {
                        const videoData = ytPlayer.getVideoData();
                        currentVideoId = videoData.video_id;
                        loadMemos();
                        renderMemos();
                        updatePlaybackHistory(currentVideoId, videoData.title);
                    }
                }
            }
        });
    };

    const getYouTubeId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const loadYouTubeVideo = () => {
        const url = youtubeUrlInput.value;
        const videoId = getYouTubeId(url);
        if (videoId) {
            currentVideoId = videoId;
            ytPlayer.loadVideoById(videoId);
            loadMemos();
            renderMemos();
        } else {
            alert('有効なYouTubeのURLを入力してください。');
        }
    };

    const formatTime = (seconds) => {
        const date = new Date(0);
        date.setSeconds(seconds);
        return date.toISOString().substr(14, 5);
    };

    const addMemo = () => {
        const text = memoInput.value.trim();
        if (text && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
            const currentTime = ytPlayer.getCurrentTime();
            memos.push({ id: Date.now(), text: text, time: currentTime });
            memos.sort((a, b) => a.time - b.time);
            saveMemos();
            renderMemos();
            memoInput.value = '';
        }
    };

    const renderMemos = (editMemoId = null) => {
        memoDisplay.innerHTML = '';
        memos.forEach((memo, index) => {
            const memoEl = document.createElement('div');
            memoEl.className = 'memo-message flex items-center p-2';

            const timestampEl = document.createElement('span');
            timestampEl.className = 'memo-timestamp';
            timestampEl.textContent = `[${formatTime(memo.time)}]`;
            timestampEl.addEventListener('click', () => {
                ytPlayer.seekTo(memo.time, true);
            });
            memoEl.appendChild(timestampEl);

            const textContainer = document.createElement('div');
            textContainer.className = 'memo-text-container flex-grow mx-2';

            if (memo.id === editMemoId) {
                const inputEl = document.createElement('textarea');
                inputEl.value = memo.text;
                inputEl.className = 'memo-edit-input w-full bg-gray-900 text-white p-1 rounded';
                inputEl.rows = 2;

                const saveBtn = document.createElement('button');
                saveBtn.textContent = '保存';
                saveBtn.className = 'text-xs bg-blue-600 hover:bg-blue-500 px-2 py-1 rounded ml-2';
                
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = '削除';
                deleteBtn.className = 'text-xs bg-red-700 hover:bg-red-600 px-2 py-1 rounded ml-1';

                const saveAction = () => {
                    memo.text = inputEl.value;
                    saveMemos();
                    renderMemos();
                };

                inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveAction();
                    } else if (e.key === 'Escape') {
                        renderMemos();
                    } else if (e.key === 'Tab') {
                        e.preventDefault();
                        (e.shiftKey ? deleteBtn : saveBtn).focus();
                    }
                });
                
                saveBtn.addEventListener('click', saveAction);
                saveBtn.addEventListener('keydown', (e) => {
                     if (e.key === 'Enter') saveAction();
                     if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); deleteBtn.focus(); }
                     if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); inputEl.focus(); }
                });

                deleteBtn.addEventListener('click', () => {
                    openConfirmModal(`このメモを削除しますか？`, () => {
                        memos.splice(index, 1);
                        saveMemos();
                        renderMemos();
                    });
                });
                 deleteBtn.addEventListener('keydown', (e) => {
                     if (e.key === 'Enter') {
                         e.preventDefault();
                         deleteBtn.click();
                     }
                     if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); inputEl.focus(); }
                     if (e.key === 'Tab' && e.shiftKey) { e.preventDefault(); saveBtn.focus(); }
                });

                textContainer.appendChild(inputEl);
                memoEl.appendChild(textContainer);
                memoEl.appendChild(saveBtn);
                memoEl.appendChild(deleteBtn);
                setTimeout(() => inputEl.focus(), 0);

            } else {
                const textEl = document.createElement('span');
                textEl.textContent = memo.text;
                textEl.className = 'px-1';
                textContainer.appendChild(textEl);
                memoEl.appendChild(textContainer);

                const editBtn = document.createElement('button');
                editBtn.textContent = '編集';
                editBtn.className = 'text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded ml-2 flex-shrink-0';
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    renderMemos(memo.id);
                });
                memoEl.appendChild(editBtn);
            }

            memoDisplay.appendChild(memoEl);
        });
        memoDisplay.scrollTop = memoDisplay.scrollHeight;
    };

    const updatePlaybackHistory = (videoId, title) => {
        if (!videoId || !title) return;

        const now = new Date().toLocaleString('ja-JP');
        const existingIndex = playbackHistory.findIndex(item => item.videoId === videoId);

        if (existingIndex > -1) {
            // 既存の履歴を更新して先頭に移動
            const existingItem = playbackHistory.splice(existingIndex, 1)[0];
            existingItem.lastPlayed = now;
            playbackHistory.unshift(existingItem);
        } else {
            // 新しい履歴を追加
            playbackHistory.unshift({
                videoId: videoId,
                title: title,
                lastPlayed: now
            });
        }

        // 履歴が50件を超えたら古いものから削除
        if (playbackHistory.length > 50) {
            playbackHistory.pop();
        }

        savePlaybackHistory();
        // モーダルが開いている場合のみ、検索フィルタを維持して再描画
        if (!playbackHistoryModalContainer.classList.contains('hidden')) {
            renderPlaybackHistory(historySearchInput.value);
        }
    };

    const renderPlaybackHistory = (filterText = '') => {
        playbackHistoryContainer.innerHTML = '';
        const filteredHistory = playbackHistory.filter(item =>
            item.title.toLowerCase().includes(filterText.toLowerCase())
        );

        if (filteredHistory.length === 0) {
            playbackHistoryContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">再生履歴はありません。</p>';
            return;
        }

        filteredHistory.forEach(item => {
            const card = document.createElement('div');
            card.className = 'playback-history-card flex justify-between items-center p-3 bg-gray-800 rounded-md hover:bg-gray-700 cursor-pointer transition-colors';
            card.innerHTML = `
                <span class="text-sm text-white truncate pr-4" title="${item.title}">${item.title}</span>
                <div class="flex items-center flex-shrink-0 ml-4">
                    <span class="text-sm text-gray-400">${item.lastPlayed}</span>
                    <button data-videoid="${item.videoId}" class="delete-history-item-btn ml-3 text-gray-500 hover:text-red-400 text-xl leading-none p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500">&times;</button>
                </div>
            `;
            card.addEventListener('click', () => {
                youtubeUrlInput.value = `https://www.youtube.com/watch?v=${item.videoId}`;
                loadYouTubeVideo();
                closePlaybackHistoryModal();
            });

            const deleteBtn = card.querySelector('.delete-history-item-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // カード全体のクリックイベントの発火を防ぐ

                const videoIdToDelete = e.currentTarget.dataset.videoid;
                const indexToDelete = playbackHistory.findIndex(historyItem => historyItem.videoId === videoIdToDelete);
                
                if (indexToDelete > -1) {
                    playbackHistory.splice(indexToDelete, 1);
                    savePlaybackHistory();
                    renderPlaybackHistory(historySearchInput.value); // リストを再描画
                }
            });

            playbackHistoryContainer.appendChild(card);
        });
    };

    const exportAllSettings = async () => {
        console.log(`${LOG_PREFIX} 全設定をエクスポートします。`);

        // 1. Export localStorage settings
        const allSettings = {};
        const localStorageKeys = [
            'comboEditorViewOrder', 'comboEditorActionPresets', 'comboEditorCurrentActions', 'comboEditorAutoCommit',
            'comboEditorEnableHoldAttack', 'comboEditorHoldAttackText', 'comboEditorHoldAttackFrames',
            'comboEditorEnablePrefixes',
            'comboEditorPlaybackHistory', 'spreadsheetPresets',
            'spreadsheetColumns', 'spreadsheetData', 'comboColumnId', 'memoColumnId', 'spreadsheetMemo'
        ];
        localStorageKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                try {
                    allSettings[key] = JSON.parse(value);
                } catch (e) {
                    allSettings[key] = value;
                }
            }
        });
        const memos = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('combo-editor-memos-')) {
                memos[key] = JSON.parse(localStorage.getItem(key));
            }
        }
        allSettings['allMemos'] = memos;

        // 2. Export IndexedDB data
        try {
            allSettings.indexedDbData = await window.db.exportDB();
            console.log(`${LOG_PREFIX} IndexedDBのデータエクスポートが完了しました。`);
        } catch (error) {
            console.error(`${LOG_PREFIX} IndexedDBのエクスポートに失敗しました:`, error);
            alert('データベースのエクスポートに失敗しました。');
            return;
        }

        // 3. Create and download the file
        const dataStr = JSON.stringify(allSettings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[-T:]/g, '');
        link.download = `combo-editor-settings-${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log(`${LOG_PREFIX} 全設定のエクスポートが完了しました。`);
    };

    const importAllSettings = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const settings = JSON.parse(e.target.result);

                const hasDbData = 'indexedDbData' in settings;
                const dbWarning = hasDbData
                    ? "\n\n【警告】ファイルにはデータベースのデータが含まれています。インポートを実行すると、現在のデータベースは完全に上書きされます！"
                    : "";

                if (!confirm(`設定ファイルをインポートします。\n現在の設定はすべて上書きされます。よろしいですか？${dbWarning}`)) {
                    event.target.value = ''; return;
                }

                console.log(`${LOG_PREFIX} 設定をインポートします...`);

                // Clear relevant localStorage keys
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key.startsWith('combo-editor-memos-') || key.startsWith('comboEditor')) {
                         localStorage.removeItem(key);
                    }
                }

                // Import localStorage settings
                Object.keys(settings).forEach(key => {
                    if (key === 'indexedDbData') return; // Skip DB data for now
                    const data = settings[key];
                    if (key === 'allMemos') {
                        Object.keys(data).forEach(memoKey => localStorage.setItem(memoKey, JSON.stringify(data[memoKey])));
                    } else {
                        localStorage.setItem(key, typeof data === 'object' ? JSON.stringify(data) : data);
                    }
                });

                if (hasDbData) {
                    console.log(`${LOG_PREFIX} IndexedDBのインポートを開始します...`);
                    await window.db.importDB(settings.indexedDbData);
                    // The importDB function will handle alerts and reloads.
                    alert('設定とデータベースのインポートが完了しました。アプリケーションをリロードします。');
                    window.location.reload();
                } else {
                    alert('設定のインポートが完了しました。アプリケーションをリロードします。');
                    window.location.reload();
                }

            } catch (error) {
                console.error(`${LOG_PREFIX} 設定ファイルの読み込みに失敗しました:`, error);
                alert('設定ファイルの形式が正しくありません。');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    // --- 10. アプリケーションの実行 ---
    initialize();
});
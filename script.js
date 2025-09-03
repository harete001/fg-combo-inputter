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
    const actionsListContainer = document.getElementById('actions-list');
    const addActionButton = document.getElementById('add-action-button');
    const saveComboButton = document.getElementById('save-combo-button');
    const editorView = document.getElementById('editor-view');
    const historyView = document.getElementById('history-view');
    const playerView = document.getElementById('player-view');
    // const savedCombosContainer = document.getElementById('saved-combos-container'); // Replaced with history table
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
    const editorSettingsView = document.getElementById('editor-settings-view');
    const confirmDeleteMessage = document.getElementById('confirm-delete-message');
    const confirmDeleteButton = document.getElementById('confirm-delete-button');
    const cancelDeleteButton = document.getElementById('cancel-delete-button');
    const youtubeUrlInput = document.getElementById('youtube-url-input');
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

    // --- グローバル変数 ---
    let totalInputs = 0, draggedItem = null, previousDirectionState = '5';
    let commandBuffer = [], committedCommands = [];
    const pressedKeys = new Set(); 
    let activeCommandInputTarget = null, autoCommitOnAttack = true;
    let actions = [], presets = {}, savedCombos = [];
    let selectedHistoryIndex = -1;
    let onConfirmDelete = null;
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
        keyMapping: { title: 'キーマッピング', element: keyMappingView },
        editorSettings: { title: 'エディター', element: editorSettingsView },
        dataManagement: { title: 'データの管理', element: dataManagementView },
    };

    const viewDetails = {
        editor: { title: 'エディター' },
        history: { title: '履歴' },
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
    const initialize = () => {
        console.log(`${LOG_PREFIX} アプリケーションを初期化します。`);
        loadViewOrder();
        renderSidebar();
        loadPresets();
        loadCurrentActions();
        loadAutoCommitSetting();
        loadSavedCombos();
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
        renderSavedCombos();
        loadYouTubeAPI();
        loadPlaybackHistory();
        renderSpreadsheetView();
        showView(viewOrder[currentViewIndex]);
        console.log(`${LOG_PREFIX} 初期化が完了しました。`);
    };

    // --- 3. データ管理 (localStorage) ---
    const loadViewOrder = () => {
        const savedOrder = localStorage.getItem('comboEditorViewOrder');
        if (savedOrder) {
            // 保存された設定から 'player' を除外
            viewOrder = JSON.parse(savedOrder).filter(id => id !== 'player');
            // 既存のユーザー設定に 'settings' がない場合に追加する後方互換性のための処理
            if (!viewOrder.includes('settings')) {
                viewOrder.push('settings');
            }
            // 既存のユーザー設定に 'spreadsheet' がない場合に追加
            if (!viewOrder.includes('spreadsheet')) {
                const settingsIndex = viewOrder.indexOf('settings');
                if (settingsIndex > -1) {
                    viewOrder.splice(settingsIndex, 0, 'spreadsheet');
                } else {
                    viewOrder.push('spreadsheet');
                }
            }
        } else {
            // デフォルトから 'player' を除外
            viewOrder = ['editor', 'history', 'spreadsheet', 'settings'];
        }
    };
    const saveViewOrder = () => { localStorage.setItem('comboEditorViewOrder', JSON.stringify(viewOrder)); };
    const loadPresets = () => { presets = JSON.parse(localStorage.getItem('comboEditorActionPresets') || '{}'); };
    const savePresets = () => { localStorage.setItem('comboEditorActionPresets', JSON.stringify(presets)); };
    const loadCurrentActions = () => {
        const loaded = JSON.parse(localStorage.getItem('comboEditorCurrentActions'));
        actions = loaded ? loaded.map(a => ({ ...a, color: a.color || DEFAULT_COLOR, addNeutralFive: a.addNeutralFive !== false })) : JSON.parse(JSON.stringify(defaultActions));
    };
    const saveCurrentActions = () => { localStorage.setItem('comboEditorCurrentActions', JSON.stringify(actions)); };
    const loadAutoCommitSetting = () => {
        const saved = localStorage.getItem('comboEditorAutoCommit');
        autoCommitOnAttack = saved !== null ? saved === 'true' : true;
        autoCommitCheckbox.checked = autoCommitOnAttack;
    };
    const saveAutoCommitSetting = () => { localStorage.setItem('comboEditorAutoCommit', autoCommitOnAttack); };
    const loadSavedCombos = () => { savedCombos = JSON.parse(localStorage.getItem('comboEditorSavedCombos') || '[]'); };
    const saveCombos = () => { localStorage.setItem('comboEditorSavedCombos', JSON.stringify(savedCombos)); };
    const loadMemos = () => {
        if (!currentVideoId) return;
        memos = JSON.parse(localStorage.getItem(`combo-editor-memos-${currentVideoId}`) || '[]');
    };
    const saveMemos = () => {
        if (!currentVideoId) return;
        localStorage.setItem(`combo-editor-memos-${currentVideoId}`, JSON.stringify(memos));
    };
    const loadPlaybackHistory = () => { playbackHistory = JSON.parse(localStorage.getItem('comboEditorPlaybackHistory') || '[]'); };
    const savePlaybackHistory = () => { localStorage.setItem('comboEditorPlaybackHistory', JSON.stringify(playbackHistory)); };
    const loadSpreadsheetSettings = () => {
        spreadsheetColumns = JSON.parse(localStorage.getItem('spreadsheetColumns') || '[]');
        if (spreadsheetColumns.length === 0) { // デフォルト設定
            spreadsheetColumns = [
                { id: `col-${Date.now()}-1`, header: '日付' },
                { id: `col-${Date.now()}-2`, header: 'コンボ' },
                { id: `col-${Date.now()}-3`, header: 'メモ' },
            ];
        }
        spreadsheetData = JSON.parse(localStorage.getItem('spreadsheetData') || '{}');
        comboColumnId = localStorage.getItem('comboColumnId');
        if (comboColumnId === null && spreadsheetColumns.length > 0) {
            const defaultComboCol = spreadsheetColumns.find(c => c.header === 'コンボ');
            comboColumnId = defaultComboCol ? defaultComboCol.id : null; // デフォルトは「コンボ」列、なければ「なし」
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
        // 値が空文字列（(なし)選択時）でも保存するように変更
        localStorage.setItem('comboColumnId', comboColumnId || '');
        localStorage.setItem('memoColumnId', memoColumnId || '');
    };
    const loadSpreadsheetPresets = () => { spreadsheetPresets = JSON.parse(localStorage.getItem('spreadsheetPresets') || '{}'); };
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
            a.addEventListener('click', (e) => {
                e.preventDefault();
                showSettingsSubView(viewId);
            });
            li.appendChild(a);
            settingsSidebarList.appendChild(li);
        });
    };

    const showSettingsSubView = (viewId) => {
        currentSettingsSubViewId = viewId;
        Object.values(settingsSubViews).forEach(view => view.element.classList.add('hidden'));
        if (settingsSubViews[viewId] && settingsSubViews[viewId].element) {
            settingsSubViews[viewId].element.classList.remove('hidden');
        }
        settingsSidebarList.querySelectorAll('.settings-nav-link').forEach(link => link.classList.remove('settings-active-link'));
        settingsSidebarList.querySelector(`#settings-nav-${viewId}`)?.classList.add('settings-active-link');
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

    const getColorForCommand = (commandText) => {
        const trimmedCommand = commandText.trim();
        if (!trimmedCommand) return null;

        const sortedActions = [...actions].sort((a, b) => b.output.length - a.output.length);
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
        // モーダル表示のアニメーション後にフォーカスを当てる
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

    const isCommandInputValid = (buffer) => {
        if (buffer.length === 0) return false;
        const attackOutputs = actions.map(a => a.output);
        const lastElement = buffer[buffer.length - 1];
        if (!attackOutputs.includes(lastElement)) return false;
        const attackCount = buffer.filter(cmd => attackOutputs.includes(cmd)).length;
        return attackCount <= 1;
    };

    const commitSingleCommand = () => {
        if (commandBuffer.length === 0) return;
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
        if (commandToWrite !== '') committedCommands.push(commandToWrite);
        commandBuffer = [];
        updateCommandModalPreview(); updateCommittedCommandsList();
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

    const resetAttackKeyState = () => {
        const attackKeys = new Set(actions.map(a => a.key));
        pressedKeys.forEach(key => { if (attackKeys.has(key)) pressedKeys.delete(key); });
    };

    const handleModalKeyInputAction = (command) => {
        if (command.output === 'RESET') {
            if (commandBuffer.length > 0) commandBuffer = [];
            else if (committedCommands.length > 0) committedCommands.pop();
        } else {
            commandBuffer.push(command.output);
        }
        updateCommandModalPreview();
        if (autoCommitOnAttack && !command.isSystem) {
            commitSingleCommand(); resetAttackKeyState();
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

        // Settings
        resetSettingsButton.addEventListener('click', () => { actions = JSON.parse(JSON.stringify(defaultActions)); saveCurrentActions(); populateSettingsPanel(); });
        savePresetButton.addEventListener('click', () => {
            const name = presetNameInput.value.trim();
            if (name) { presets[name] = JSON.parse(JSON.stringify(actions)); savePresets(); populatePresetDropdown(); presetNameInput.value = ''; presetSelect.value = name; }
        });
        presetSelect.addEventListener('change', (e) => {
            const name = e.target.value;
            if (name && presets[name]) {
                const loaded = presets[name];
                actions = loaded.map(a => ({ ...a, color: a.color || DEFAULT_COLOR, addNeutralFive: a.addNeutralFive !== false }));
                saveCurrentActions(); populateSettingsPanel();
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
        saveComboButton.addEventListener('click', () => {
            const comboHtml = mergedOutput.innerHTML;
            const comboPlainText = mergedOutput.textContent;
            if (comboPlainText.trim() && !comboPlainText.includes('ここにコンボが表示されます...')) {
                savedCombos.unshift({
                    id: Date.now(),
                    comboHTML: comboHtml,
                    comboPlainText: comboPlainText,
                    timestamp: new Date().toLocaleString('ja-JP')
                });
                saveCombos();
                renderSavedCombos();

                // Visual feedback
                saveComboButton.textContent = '保存完了！';
                saveComboButton.classList.remove('bg-green-700', 'hover:bg-green-600');
                saveComboButton.classList.add('bg-blue-600');
                setTimeout(() => {
                    saveComboButton.textContent = '保存';
                    saveComboButton.classList.remove('bg-blue-600');
                    saveComboButton.classList.add('bg-green-700', 'hover:bg-green-600');
                }, 1500);
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
            } else if (!historyView.classList.contains('hidden')) {
                handleHistoryKeyDown(e);
            } else if (!playerView.classList.contains('hidden')) {
                handlePlayerKeyDown(e);
            } else if (!spreadsheetView.classList.contains('hidden')) {
                handleSpreadsheetKeyDown(e);
            }
        });

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            if (pressedKeys.has(key)) {
                pressedKeys.delete(key);
                if (!commandInputModalContainer.classList.contains('hidden') && ['w', 'a', 's', 'd'].includes(key)) {
                    updateModalDirection();
                }
            }
        });
    };

    const handleEditorKeyDown = (e) => {
        const key = e.key;
        const activeElement = document.activeElement;
        const isCommandModalOpen = !commandInputModalContainer.classList.contains('hidden');

        if (isCommandModalOpen) {
            e.preventDefault();
            e.stopPropagation();
            if (key === 'Enter' && e.ctrlKey) { finalizeAndWriteCommands(); return; }
            if (key === 'Enter') { commitSingleCommand(); return; }
            if (key === 'Escape') { closeCommandInputModal(); return; }
            const action = actions.find(a => a.key === key);
            if (key === 'Backspace') handleModalKeyInputAction({ output: 'RESET' });
            else if (action && !pressedKeys.has(key)) { pressedKeys.add(key); handleModalKeyInputAction(action); }
            else if (['w', 'a', 's', 'd'].includes(key.toLowerCase()) && !pressedKeys.has(key.toLowerCase())) {
                pressedKeys.add(key.toLowerCase()); updateModalDirection();
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

    // --- 7. 新機能：表示切替、コンボ履歴、YouTube ---
    const showView = (viewId) => {
        const views = { 
            editor: editorView, 
            history: historyView, 
            player: playerView,
            spreadsheet: spreadsheetView,
            settings: settingsPageView
        };
        
        for (const id in views) {
            views[id].classList.add('hidden');
        }
        views[viewId].classList.remove('hidden');

        const navLinks = sidebarNavList.querySelectorAll('.nav-link');
        navLinks.forEach(link => link.classList.remove('active-link'));
        sidebarNavList.querySelector(`#nav-${viewId}`).classList.add('active-link');

        currentViewIndex = viewOrder.indexOf(viewId);

        if (viewId === 'history') {
            selectedHistoryIndex = -1;
            updateHistorySelection();
        } else if (viewId === 'settings') {
            showSettingsSubView(currentSettingsSubViewId);
        } else if (viewId === 'spreadsheet') {
            // スプレッドシートビューを表示する際に、最新のコンボ情報を反映する
            renderSpreadsheetView();
        }
    };

    const renderSavedCombos = () => {
        const historyTableBody = document.getElementById('history-table-body');
        if (!historyTableBody) return;
        historyTableBody.innerHTML = '';

        if (savedCombos.length === 0) {
            const tr = historyTableBody.insertRow();
            const td = tr.insertCell();
            td.colSpan = 3;
            td.textContent = '保存されたコンボはありません。';
            td.className = 'px-6 py-4 text-center text-gray-500';
            return;
        }

        savedCombos.forEach((comboData, index) => {
            const tr = historyTableBody.insertRow();
            tr.dataset.id = comboData.id;
            tr.dataset.index = index;
            tr.style.cursor = 'pointer';

            const comboTd = tr.insertCell();
            comboTd.className = 'px-6 py-4 combo-cell';
            if (!comboData.comboPlainText) {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = comboData.comboHTML;
                comboData.comboPlainText = tempDiv.textContent || '';
            }
            comboTd.innerHTML = comboData.comboHTML;

            const timestampTd = tr.insertCell();
            timestampTd.className = 'px-6 py-4';
            timestampTd.textContent = comboData.timestamp;

            const actionsTd = tr.insertCell();
            actionsTd.className = 'px-6 py-4 text-center';
            actionsTd.innerHTML = `
                <div class="action-buttons">
                    <button class="edit-btn bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-md text-sm">編集</button>
                    <button class="copy-btn bg-gray-700 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-md text-sm">コピー</button>
                    <button class="delete-btn bg-red-700 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-sm">削除</button>
                </div>`;

            const editBtn = actionsTd.querySelector('.edit-btn');
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleHistoryItemEdit(comboData.id, tr);
            });

            actionsTd.querySelector('.copy-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                copyToClipboard(comboData.comboPlainText, e.target);
            });

            actionsTd.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openConfirmModal('本当にこのコンボを削除しますか？<br>この操作は取り消せません。', () => {
                    savedCombos.splice(index, 1);
                    saveCombos();
                    selectedHistoryIndex = -1;
                    renderSavedCombos();
                });
            });

            tr.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT') {
                    selectedHistoryIndex = index;
                    updateHistorySelection();
                }
            });
        });

        updateHistorySelection();
    };

    const toggleHistoryItemEdit = (comboId, tr) => {
        const comboTd = tr.querySelector('.combo-cell');
        const actionsTd = tr.cells[2];
        const editButton = actionsTd.querySelector('.edit-btn');
        const comboData = savedCombos.find(c => c.id === comboId);

        if (tr.classList.contains('editing')) {
            const input = comboTd.querySelector('.history-edit-input');
            const newPlainText = input.value.trim();

            if (newPlainText) {
                comboData.comboPlainText = newPlainText;
                comboData.comboHTML = newPlainText.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                comboData.timestamp = new Date().toLocaleString('ja-JP');
                saveCombos();
            }
            renderSavedCombos();

        } else {
            document.querySelectorAll('#history-table-body tr.editing').forEach(editingRow => {
                 if(editingRow !== tr) {
                    const editingComboId = parseInt(editingRow.dataset.id);
                    toggleHistoryItemEdit(editingComboId, editingRow);
                 }
            });

            tr.classList.add('editing');
            comboTd.innerHTML = `<input type="text" class="history-edit-input" value="${comboData.comboPlainText}">`;
            const input = comboTd.querySelector('input');
            setTimeout(() => {
                input.focus();
                input.select();
            }, 0);

            editButton.textContent = '更新';
            editButton.classList.remove('bg-blue-600', 'hover:bg-blue-500');
            editButton.classList.add('bg-green-700', 'hover:bg-green-600');

            const saveChanges = () => toggleHistoryItemEdit(comboId, tr);

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveChanges();
                } else if (e.key === 'Escape') {
                    renderSavedCombos();
                }
            });

            // If user clicks away, save changes
            input.addEventListener('blur', () => {
                // Use a small timeout to allow click on "Update" button
                setTimeout(() => {
                    // Check if the row is still in editing mode
                    if (document.body.contains(tr) && tr.classList.contains('editing')) {
                         saveChanges();
                    }
                }, 200);
            });
        }
    };

    const updateHistorySelection = () => {
        const historyTableBody = document.getElementById('history-table-body');
        if (!historyTableBody) return;
        const rows = historyTableBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            if (index === selectedHistoryIndex) {
                row.classList.add('selected-row');
                row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            } else {
                row.classList.remove('selected-row');
            }
        });
    };

    const handleHistoryKeyDown = (e) => {
        if (savedCombos.length === 0) return;

        const historyTableBody = document.getElementById('history-table-body');
        if (!historyTableBody) return;
        const rows = historyTableBody.querySelectorAll('tr');
        if (rows.length === 0 || rows[0].cells.length < 3) return;

        // If editing, let the input handle the keydown
        if (rows[selectedHistoryIndex] && rows[selectedHistoryIndex].classList.contains('editing')) {
            return;
        }

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedHistoryIndex = Math.max(0, selectedHistoryIndex - 1);
            updateHistorySelection();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedHistoryIndex = Math.min(savedCombos.length - 1, selectedHistoryIndex + 1);
            if (selectedHistoryIndex < 0) selectedHistoryIndex = 0;
            updateHistorySelection();
        } else if (e.key === 'F2') {
            e.preventDefault();
            if (selectedHistoryIndex > -1) {
                const row = rows[selectedHistoryIndex];
                const comboData = savedCombos[selectedHistoryIndex];
                toggleHistoryItemEdit(comboData.id, row);
            }
        } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            if (selectedHistoryIndex > -1) {
                const comboData = savedCombos[selectedHistoryIndex];
                const row = rows[selectedHistoryIndex];
                const copyBtn = row.querySelector('.copy-btn');
                copyToClipboard(comboData.comboPlainText, copyBtn);
            }
        } else if (e.ctrlKey && e.key === 'Delete') {
            e.preventDefault();
            if (selectedHistoryIndex > -1) {
                const row = rows[selectedHistoryIndex];
                const deleteBtn = row.querySelector('.delete-btn');
                if(deleteBtn) deleteBtn.click();
            }
        }
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

    const renderSpreadsheetDataTable = () => {
        spreadsheetDataTableContainer.innerHTML = '';
        if (spreadsheetColumns.length === 0) return;

        const table = document.createElement('table');
        table.className = 'w-full text-left border-collapse';

        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.className = 'bg-gray-700';
        spreadsheetColumns.forEach((column, index) => {
            const th = document.createElement('th');
            th.className = 'p-1 border border-gray-600 cursor-move';
            th.dataset.columnId = column.id;
            th.draggable = true;

            // --- Drag and Drop Event Listeners for Columns ---
            th.addEventListener('dragstart', (e) => {
                e.stopPropagation(); // Prevent child elements from being dragged
                draggedColumnId = column.id;
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => th.classList.add('dragging'), 0);
            });

            th.addEventListener('dragend', () => {
                th.classList.remove('dragging');
                document.querySelectorAll('.spreadsheet-drag-over').forEach(el => el.classList.remove('spreadsheet-drag-over'));
                draggedColumnId = null;
            });

            th.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (column.id !== draggedColumnId) {
                    th.classList.add('spreadsheet-drag-over');
                }
            });

            th.addEventListener('dragleave', () => {
                th.classList.remove('spreadsheet-drag-over');
            });

            th.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                th.classList.remove('spreadsheet-drag-over');
                if (!draggedColumnId || draggedColumnId === column.id) return;

                const draggedIndex = spreadsheetColumns.findIndex(c => c.id === draggedColumnId);
                const droppedOnIndex = spreadsheetColumns.findIndex(c => c.id === column.id);

                if (draggedIndex > -1 && droppedOnIndex > -1) {
                    const [removed] = spreadsheetColumns.splice(draggedIndex, 1);
                    spreadsheetColumns.splice(droppedOnIndex, 0, removed);
                    saveSpreadsheetSettings();
                    renderSpreadsheetView();
                }
            });
            const headerContent = document.createElement('div');
            headerContent.className = 'flex items-center justify-between gap-1';

            const headerInput = document.createElement('input');
            headerInput.type = 'text';
            headerInput.value = column.header;
            headerInput.className = 'form-input w-full p-1 bg-gray-700 border-none rounded-md text-white focus:bg-gray-600';
            headerInput.placeholder = `列 ${index + 1}`;
            headerInput.addEventListener('change', (e) => {
                column.header = e.target.value;
                saveSpreadsheetSettings();
                renderComboColumnSelector();
                renderMemoColumnSelector();
                updateSpreadsheetOutput();
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '&times;'; // '×'
            deleteBtn.className = 'text-gray-400 hover:text-red-400 font-bold text-xl leading-none px-2 rounded-full';
            deleteBtn.title = 'この列を削除';
            deleteBtn.addEventListener('click', () => {
                spreadsheetColumns.splice(index, 1);
                delete spreadsheetData[column.id];
                if (comboColumnId === column.id) {
                    comboColumnId = null; // 削除されたら「なし」にリセット
                }
                if (memoColumnId === column.id) {
                    memoColumnId = null;
                }
                saveSpreadsheetSettings();
                renderSpreadsheetView();
            });
            headerContent.appendChild(headerInput);
            headerContent.appendChild(deleteBtn);
            th.appendChild(headerContent);
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        const tbody = document.createElement('tbody');
        const dataRow = document.createElement('tr');
        spreadsheetColumns.forEach(column => {
            const td = document.createElement('td');
            td.className = 'p-1 border border-gray-600';
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-input w-full p-1 bg-gray-800 border-none rounded-md text-white focus:bg-gray-700';
            input.dataset.columnId = column.id;

            if (column.id === comboColumnId) {
                input.readOnly = true;
                input.classList.add('bg-gray-900', 'text-gray-400');
                input.value = getComboTextForSpreadsheet();
                spreadsheetData[column.id] = input.value;
            } else if (column.id === memoColumnId) {
                input.readOnly = true;
                input.classList.add('bg-gray-900', 'text-gray-400');
                input.value = spreadsheetMemo;
                spreadsheetData[column.id] = input.value;
            } else {
                input.value = spreadsheetData[column.id] || '';
                input.addEventListener('input', (e) => {
                    spreadsheetData[column.id] = e.target.value;
                    saveSpreadsheetSettings();
                    updateSpreadsheetOutput();
                });
            }
            td.appendChild(input);
            dataRow.appendChild(td);
        });
        tbody.appendChild(dataRow);

        table.appendChild(thead);
        table.appendChild(tbody);
        spreadsheetDataTableContainer.appendChild(table);
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

    const exportAllSettings = () => {
        console.log(`${LOG_PREFIX} 全設定をエクスポートします。`);
        const allSettings = {};
        const localStorageKeys = [
            'comboEditorViewOrder',
            'comboEditorActionPresets',
            'comboEditorCurrentActions',
            'comboEditorAutoCommit',
            'comboEditorSavedCombos',
            'comboEditorPlaybackHistory',
            'spreadsheetPresets',
            'spreadsheetColumns',
            'spreadsheetData',
            'comboColumnId',
            'memoColumnId',
            'spreadsheetMemo'
        ];

        localStorageKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                try {
                    // JSON文字列として保存されている値をパースする
                    allSettings[key] = JSON.parse(value);
                } catch (e) {
                    // パースに失敗した場合は、プレーンな文字列として扱う
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
        console.log(`${LOG_PREFIX} エクスポートが完了しました。`);
    };

    const importAllSettings = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const settings = JSON.parse(e.target.result);
                if (!confirm('設定ファイルをインポートします。\n現在の設定はすべて上書きされます。よろしいですか？')) {
                    event.target.value = ''; return;
                }
                console.log(`${LOG_PREFIX} 設定をインポートします...`);
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key.startsWith('combo-editor-memos-')) localStorage.removeItem(key);
                }
                Object.keys(settings).forEach(key => {
                    const data = settings[key];
                    if (key === 'allMemos') Object.keys(data).forEach(memoKey => localStorage.setItem(memoKey, JSON.stringify(data[memoKey])));
                    else {
                        // インポートするデータがオブジェクトや配列の場合はJSON文字列に変換して保存
                        if (typeof data === 'object' && data !== null) {
                            localStorage.setItem(key, JSON.stringify(data));
                        } else {
                            // 文字列や数値などのプリミティブ値はそのまま保存
                            localStorage.setItem(key, data);
                        }
                    }
                });
                alert('設定のインポートが完了しました。アプリケーションをリロードします。');
                location.reload();
            } catch (error) {
                console.error(`${LOG_PREFIX} 設定ファイルの読み込みに失敗しました:`, error);
                alert('設定ファイルの形式が正しくありません。');
            } finally { event.target.value = ''; }
        };
        reader.readAsText(file);
    };

    // --- 10. アプリケーションの実行 ---
    initialize();
});
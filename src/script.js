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
    const savedCombosContainer = document.getElementById('saved-combos-container');
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

    // Database View Elements
    const databaseView = document.getElementById('database-view');
    const dbTableList = document.getElementById('db-table-list');
    const dbAddTableButton = document.getElementById('db-add-table-button');
    const dbTableContentContainer = document.getElementById('db-table-content-container');


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
        database: { title: 'データベース' },
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
        try {
            await window.db.initDB();
            console.log(`${LOG_PREFIX} データベースの初期化が完了しました。`);
        } catch (error) {
            console.error(`${LOG_PREFIX} データベースの初期化に失敗しました:`, error);
            // エラー処理: ユーザーに通知するなど
            alert('データベースの読み込みに失敗しました。アプリケーションをリロードしてください。');
            return;
        }

        loadViewOrder();
        renderSidebar();
        loadPresets();
        loadCurrentActions();
        loadAutoCommitSetting();
        // loadSavedCombos(); // これは後でDB移行 -> 廃止
        populateSettingsPanel();
        populatePresetDropdown();
        renderSettingsSidebar();
        createGrid();
        setupEventListeners();
        updateMergedOutput(); 
        // renderSavedCombos(); // 廃止
        loadYouTubeAPI();
        loadPlaybackHistory();
        await renderEditorMetaForm(); // 初期表示のためにフォームをレンダリング
        showView(viewOrder[currentViewIndex]);
        console.log(`${LOG_PREFIX} 初期化が完了しました。`);
    };

    // --- 3. データ管理 (localStorage & DB) ---
    const loadViewOrder = () => {
        let savedOrder = localStorage.getItem('comboEditorViewOrder');
        if (savedOrder) {
            let parsedOrder = JSON.parse(savedOrder);
            // 'player' を除外
            parsedOrder = parsedOrder.filter(id => id !== 'player');

            // 'spreadsheet' を 'database' に置換（後方互換性）
            const spreadsheetIndex = parsedOrder.indexOf('spreadsheet');
            if (spreadsheetIndex > -1) {
                parsedOrder[spreadsheetIndex] = 'database';
            }

            // 'database' がない場合に追加
            if (!parsedOrder.includes('database')) {
                const settingsIndex = parsedOrder.indexOf('settings');
                if (settingsIndex > -1) {
                    parsedOrder.splice(settingsIndex, 0, 'database');
                } else {
                    parsedOrder.push('database');
                }
            }

            // 'settings' がない場合に追加
            if (!parsedOrder.includes('settings')) {
                parsedOrder.push('settings');
            }
            viewOrder = parsedOrder;
        } else {
            // デフォルトのビュー順序
            viewOrder = ['editor', 'history', 'database', 'settings'];
        }
        saveViewOrder(); // 更新された順序を保存
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
    // const loadSavedCombos = () => { savedCombos = JSON.parse(localStorage.getItem('comboEditorSavedCombos') || '[]'); }; // 廃止
    // const saveCombos = () => { localStorage.setItem('comboEditorSavedCombos', JSON.stringify(savedCombos)); }; // 廃止
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
        
        // Editor Meta Form Listener
        saveTableSelect.addEventListener('change', generateFormFields);

        // Save Combo to DB
        saveComboButton.addEventListener('click', async () => {
            const tableName = saveTableSelect.value;
            if (!tableName) {
                alert('保存先のテーブルを選択してください。');
                return;
            }

            const comboHtml = mergedOutput.innerHTML;
            const comboPlainText = mergedOutput.textContent;
            if (!comboPlainText.trim() || comboPlainText.includes('ここにコンボが表示されます...')) {
                alert('保存するコンボがありません。');
                return;
            }

            const dataToSave = {};
            const schema = tableSchemas.find(s => s.tableName === tableName);
            if (!schema) {
                alert('テーブルのスキーマが見つかりません。');
                return;
            }

            // Collect data from the dynamic form
            schema.columns.forEach(column => {
                if (column.name === 'comboHTML') {
                    dataToSave.comboHTML = comboHtml;
                } else {
                    const input = editorMetaFormContainer.querySelector(`[name="${column.name}"]`);
                    if (input) {
                        dataToSave[column.name] = column.type === 'number' ? Number(input.value) : input.value;
                    }
                }
            });

            try {
                await window.db.saveData(tableName, dataToSave);

                // Visual feedback
                saveComboButton.textContent = '保存完了！';
                saveComboButton.classList.remove('bg-green-700', 'hover:bg-green-600');
                saveComboButton.classList.add('bg-blue-600');
                setTimeout(() => {
                    saveComboButton.textContent = 'データベースに保存';
                    saveComboButton.classList.remove('bg-blue-600');
                    saveComboButton.classList.add('bg-green-700', 'hover:bg-green-600');
                }, 1500);

                // Clear form fields after save
                editorMetaFormContainer.querySelectorAll('input, textarea').forEach(input => input.value = '');

            } catch (error) {
                console.error('[DB] Failed to save combo:', error);
                alert(`コンボの保存に失敗しました: ${error.message}`);
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

        // Database View
        dbAddTableButton.addEventListener('click', openCreateTableModal);
        confirmCreateTableButton.addEventListener('click', handleCreateTable);
        cancelCreateTableButton.addEventListener('click', closeCreateTableModal);
        addColumnButton.addEventListener('click', () => renderNewColumnInput());
        dbSearchInput.addEventListener('input', (e) => {
            if (activeTableName) {
                renderDbTableContent(activeTableName, e.target.value);
            }
        });
        dbExportCsvButton.addEventListener('click', () => {
            if (activeTableName) {
                exportTableToCsv(activeTableName);
            } else {
                alert('エクスポートするテーブルを選択してください。');
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
            database: databaseView,
            settings: settingsPageView
        };

        Object.values(views).forEach(view => view.classList.add('hidden'));
        if (views[viewId]) {
            views[viewId].classList.remove('hidden');
        }

        sidebarNavList.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active-link'));
        const activeLink = sidebarNavList.querySelector(`#nav-${viewId}`);
        if (activeLink) {
            activeLink.classList.add('active-link');
        }

        currentViewIndex = viewOrder.indexOf(viewId);

        // ビュー特有の更新処理
        if (viewId === 'history') {
            selectedHistoryIndex = -1;
            updateHistorySelection();
        } else if (viewId === 'settings') {
            showSettingsSubView(currentSettingsSubViewId);
        } else if (viewId === 'database') {
            renderDbView();
        } else if (viewId === 'editor') {
            renderEditorMetaForm();
        }
    };

    // --- Editor Meta Form ---
    const saveTableSelect = document.getElementById('save-table-select');
    const editorMetaFormContainer = document.getElementById('editor-meta-form-container');
    let tableSchemas = []; // Cache for schemas

    const renderEditorMetaForm = async () => {
        try {
            tableSchemas = await window.db.getAllTableSchemas();
            const selectedValue = saveTableSelect.value;

            saveTableSelect.innerHTML = '';
            tableSchemas.forEach(schema => {
                const option = document.createElement('option');
                option.value = schema.tableName;
                option.textContent = schema.tableName;
                saveTableSelect.appendChild(option);
            });

            if (selectedValue && tableSchemas.some(s => s.tableName === selectedValue)) {
                saveTableSelect.value = selectedValue;
            }

            generateFormFields();
        } catch (error) {
            console.error('[DB] Failed to render editor meta form:', error);
        }
    };

    const generateFormFields = () => {
        const selectedTable = saveTableSelect.value;
        const schema = tableSchemas.find(s => s.tableName === selectedTable);
        editorMetaFormContainer.innerHTML = '';

        if (!schema) return;

        schema.columns.forEach(column => {
            // The 'comboHTML' field is special and not part of this form
            if (column.name === 'comboHTML') return;

            const div = document.createElement('div');
            let inputHtml = '';
            const label = `<label for="meta-${column.name}" class="block text-sm font-medium text-gray-300 mb-1">${column.label}</label>`;

            switch (column.type) {
                case 'textarea':
                    inputHtml = `<textarea id="meta-${column.name}" name="${column.name}" rows="3" class="form-textarea w-full bg-gray-700 border-gray-600 rounded-md text-white"></textarea>`;
                    break;
                case 'number':
                    inputHtml = `<input type="number" id="meta-${column.name}" name="${column.name}" class="form-input w-full bg-gray-700 border-gray-600 rounded-md text-white">`;
                    break;
                case 'text':
                default:
                    inputHtml = `<input type="text" id="meta-${column.name}" name="${column.name}" class="form-input w-full bg-gray-700 border-gray-600 rounded-md text-white">`;
                    break;
            }
            div.innerHTML = label + inputHtml;
            editorMetaFormContainer.appendChild(div);
        });
    };

    // --- 8. Database View ---
    let activeTableName = null;
    const dbSearchInput = document.getElementById('db-search-input');
    const dbExportCsvButton = document.getElementById('db-export-csv-button');
    const createTableModalContainer = document.getElementById('create-table-modal-container');
    const newTableNameInput = document.getElementById('new-table-name');
    const newTableColumnsContainer = document.getElementById('new-table-columns-container');
    const addColumnButton = document.getElementById('add-column-button');
    const cancelCreateTableButton = document.getElementById('cancel-create-table-button');
    const confirmCreateTableButton = document.getElementById('confirm-create-table-button');

    const renderDbView = async () => {
        await renderDbTableList();
        if (activeTableName) {
            await renderDbTableContent(activeTableName);
        } else {
            dbTableContentContainer.innerHTML = `<p class="p-8 text-center text-gray-500">テーブルを選択してください</p>`;
        }
    };

    const renderDbTableList = async () => {
        try {
            const schemas = await window.db.getAllTableSchemas();
            dbTableList.innerHTML = '';
            schemas.sort((a, b) => a.tableName.localeCompare(b.tableName)).forEach(schema => {
                const li = document.createElement('li');
                li.className = `db-table-item ${schema.tableName === activeTableName ? 'active' : ''}`;
                li.textContent = schema.tableName;
                li.dataset.tableName = schema.tableName;
                li.addEventListener('click', () => {
                    activeTableName = schema.tableName;
                    renderDbView();
                });
                dbTableList.appendChild(li);
            });
        } catch (error) {
            console.error('[DB] Failed to render table list:', error);
            dbTableList.innerHTML = `<p class="text-red-400">テーブルリストの読み込みに失敗しました。</p>`;
        }
    };

    const renderDbTableContent = async (tableName, searchTerm = '') => {
        try {
            const schema = (await window.db.getAllTableSchemas()).find(s => s.tableName === tableName);
            let data = await window.db.getAllData(tableName);

            if (searchTerm) {
                const lowerCaseSearchTerm = searchTerm.toLowerCase();
                data = data.filter(row => {
                    return Object.values(row).some(value =>
                        String(value).toLowerCase().includes(lowerCaseSearchTerm)
                    );
                });
            }

            if (!schema) {
                dbTableContentContainer.innerHTML = `<p class="p-8 text-center text-red-500">テーブル「${tableName}」のスキーマが見つかりません。</p>`;
                return;
            }

            let tableHtml = `<table class="min-w-full text-sm text-left text-gray-300">`;
            // Header
            tableHtml += `<thead class="bg-gray-700 text-xs text-gray-400 uppercase"><tr>`;
            schema.columns.forEach(col => {
                tableHtml += `<th scope="col" class="px-4 py-3">${col.label}</th>`;
            });
            tableHtml += `<th scope="col" class="px-4 py-3">操作</th>`; // Actions column
            tableHtml += `</tr></thead>`;

            // Body
            tableHtml += `<tbody>`;
            if (data.length === 0) {
                tableHtml += `<tr><td colspan="${schema.columns.length + 1}" class="p-8 text-center text-gray-500">データがありません。</td></tr>`;
            } else {
                data.forEach(row => {
                    tableHtml += `<tr class="border-b border-gray-700 hover:bg-gray-600/50">`;
                    schema.columns.forEach(col => {
                        const cellValue = row[col.name] || '';
                        // HTMLを含む可能性のあるセルはエスケープするか、安全な方法で表示する
                        const displayValue = col.type === 'html'
                            ? `<div class="p-2">${cellValue}</div>` // Let comboHTML render
                            : new Option(cellValue).innerHTML; // Escape other values
                        tableHtml += `<td class="px-4 py-2">${displayValue}</td>`;
                    });
                    // Action buttons
                    tableHtml += `<td class="px-4 py-2"><button class="text-red-500 hover:text-red-400" data-id="${row.id}">削除</button></td>`;
                    tableHtml += `</tr>`;
                });
            }
            tableHtml += `</tbody></table>`;
            dbTableContentContainer.innerHTML = tableHtml;

            // Add event listeners for delete buttons
            dbTableContentContainer.querySelectorAll('button[data-id]').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const idToDelete = parseInt(e.target.dataset.id, 10);
                    if (confirm(`本当にこのデータを削除しますか？`)) {
                        await window.db.deleteData(tableName, idToDelete);
                        renderDbTableContent(tableName); // Refresh view
                    }
                });
            });

        } catch (error) {
            console.error(`[DB] Failed to render content for table ${tableName}:`, error);
            dbTableContentContainer.innerHTML = `<p class="p-8 text-center text-red-500">テーブル「${tableName}」のデータの読み込みに失敗しました。</p>`;
        }
    };

    const openCreateTableModal = () => {
        newTableNameInput.value = '';
        newTableColumnsContainer.innerHTML = '';
        // Add default columns
        renderNewColumnInput('comboHTML', 'コンボ', 'html');
        renderNewColumnInput('character', 'キャラクター', 'text');
        renderNewColumnInput('damage', 'ダメージ', 'number');
        renderNewColumnInput('memo', 'メモ', 'textarea');
        createTableModalContainer.classList.remove('hidden');
        newTableNameInput.focus();
    };

    const closeCreateTableModal = () => {
        createTableModalContainer.classList.add('hidden');
    };

    const renderNewColumnInput = (name = '', label = '', type = 'text') => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2';
        div.innerHTML = `
            <input type="text" value="${label}" class="form-input w-1/3 bg-gray-700 border-gray-600 rounded-md text-white px-2 py-1" placeholder="表示名 (例: キャラクター)">
            <input type="text" value="${name}" class="form-input w-1/3 bg-gray-700 border-gray-600 rounded-md text-white px-2 py-1" placeholder="フィールド名 (例: character)">
            <select class="form-select w-1/3 bg-gray-700 border-gray-600 rounded-md text-white px-2 py-1">
                <option value="text" ${type === 'text' ? 'selected' : ''}>テキスト</option>
                <option value="number" ${type === 'number' ? 'selected' : ''}>数値</option>
                <option value="textarea" ${type === 'textarea' ? 'selected' : ''}>長文テキスト</option>
                <option value="html" ${type === 'html' ? 'selected' : ''}>HTML</option>
            </select>
            <button class="text-red-500 hover:text-red-400 font-bold text-xl">&times;</button>
        `;
        div.querySelector('button').addEventListener('click', () => div.remove());
        newTableColumnsContainer.appendChild(div);
    };

    const handleCreateTable = async () => {
        const tableName = newTableNameInput.value.trim().replace(/[^a-zA-Z0-9_]/g, '_');
        if (!tableName) {
            alert('テーブル名を入力してください。');
            return;
        }

        const columns = [];
        const columnRows = newTableColumnsContainer.querySelectorAll('.flex');
        for (const row of columnRows) {
            const inputs = row.querySelectorAll('input, select');
            const label = inputs[0].value.trim();
            const name = inputs[1].value.trim().replace(/[^a-zA-Z0-9_]/g, '_');
            const type = inputs[2].value;
            if (!name || !label) {
                alert('すべての列の表示名とフィールド名を入力してください。');
                return;
            }
            columns.push({ name, label, type });
        }

        if (columns.length === 0) {
            alert('少なくとも1つの列を定義してください。');
            return;
        }

        try {
            // 1. Create the actual table (object store)
            await window.db.createTable(tableName);
            // 2. Save the schema for the new table
            await window.db.saveTableSchema({ tableName, columns });

            alert(`テーブル「${tableName}」が作成されました。`);
            closeCreateTableModal();
            activeTableName = tableName;
            renderDbView();
        } catch (error) {
            console.error('[DB] Table creation failed:', error);
            alert(`テーブルの作成に失敗しました: ${error.message}`);
        }
    };

    const exportTableToCsv = async (tableName) => {
        console.log(`[CSV] Exporting table: ${tableName}`);
        try {
            const schema = (await window.db.getAllTableSchemas()).find(s => s.tableName === tableName);
            const data = await window.db.getAllData(tableName);

            if (!schema) {
                alert('スキーマが見つかりません。');
                return;
            }

            const headers = schema.columns.map(col => col.label);
            const rows = data.map(row => {
                return schema.columns.map(col => {
                    let value = row[col.name] || '';
                    if (col.type === 'html') {
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = value;
                        value = tempDiv.textContent || tempDiv.innerText || '';
                    }
                    const stringValue = String(value);
                    // Escape quotes and wrap in quotes if it contains comma, newline or quote
                    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
                        return `"${stringValue.replace(/"/g, '""')}"`;
                    }
                    return stringValue;
                }).join(',');
            });

            const csvContent = [headers.join(','), ...rows].join('\n');
            const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' }); // Add BOM for Excel compatibility

            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${tableName}_export.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error(`[CSV] Export failed for table ${tableName}:`, error);
            alert('CSVエクスポートに失敗しました。');
        }
    };

    const renderSavedCombos = () => {
        // This function is now obsolete. The "Database" view replaces it.
        // For now, we can just show a message in the old history view.
        if (savedCombosContainer) {
            savedCombosContainer.innerHTML = '<p class="text-gray-500">この機能は「データベース」ビューに統合されました。</p>';
        }
    };

    const updateHistorySelection = () => {
        // Obsolete function
    };

    const handleHistoryKeyDown = (e) => {
        // Obsolete function
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
        const allSettings = {
            localStorage: {},
            indexedDB: {}
        };

        // 1. Export localStorage data
        const localStorageKeys = [
            'comboEditorViewOrder',
            'comboEditorActionPresets',
            'comboEditorCurrentActions',
            'comboEditorAutoCommit',
            'comboEditorPlaybackHistory',
        ];
        localStorageKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                try {
                    allSettings.localStorage[key] = JSON.parse(value);
                } catch (e) {
                    allSettings.localStorage[key] = value;
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
        allSettings.localStorage['allMemos'] = memos;

        // 2. Export IndexedDB data
        try {
            allSettings.indexedDB = await window.db.getFullDbData();
        } catch (error) {
            console.error('[DB] IndexedDBのエクスポートに失敗しました:', error);
            alert('データベースのエクスポートに失敗しました。');
            return;
        }

        // 3. Save to file
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

    const importAllSettings = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const settings = JSON.parse(e.target.result);

                // Verify file structure
                if (!settings.localStorage || !settings.indexedDB) {
                    throw new Error('無効なファイル形式です。');
                }

                const confirmed = await window.electron.showConfirmDialog({
                    title: 'すべての設定とデータをインポートします',
                    message: '現在のすべての設定、コンボデータ、テーブル定義が、ファイルの内容で完全に上書きされます。',
                    detail: 'この操作は取り消せません。本当によろしいですか？'
                });

                if (!confirmed) {
                    event.target.value = '';
                    return;
                }

                console.log(`${LOG_PREFIX} インポート処理を開始します...`);

                // 1. Import IndexedDB data
                await window.db.importFullDbData(settings.indexedDB);

                // 2. Import localStorage data
                localStorage.clear();
                Object.keys(settings.localStorage).forEach(key => {
                    const data = settings.localStorage[key];
                    if (key === 'allMemos') {
                        Object.keys(data).forEach(memoKey => localStorage.setItem(memoKey, JSON.stringify(data[memoKey])));
                    } else {
                        if (typeof data === 'object' && data !== null) {
                            localStorage.setItem(key, JSON.stringify(data));
                        } else {
                            localStorage.setItem(key, data);
                        }
                    }
                });

                alert('設定のインポートが完了しました。アプリケーションをリロードします。');
                window.electron.reloadApp();

            } catch (error) {
                console.error(`${LOG_PREFIX} 設定ファイルの読み込みまたはインポートに失敗しました:`, error);
                alert(`インポートに失敗しました: ${error.message}`);
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    // --- 10. アプリケーションの実行 ---
    initialize();
});
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
    const openSettingsButton = document.getElementById('open-settings-button');
    const settingsModalContainer = document.getElementById('settings-modal-container');
    const closeSettingsButton = document.getElementById('close-settings-button');
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
    const myVideosView = document.getElementById('my-videos-view'); // New view
    const savedCombosContainer = document.getElementById('saved-combos-container');
    const settingsPageView = document.getElementById('settings-page-view');
    const exportSettingsButton = document.getElementById('export-settings-button');
    const importSettingsInput = document.getElementById('import-settings-input');
    const importSettingsButton = document.getElementById('import-settings-button');
    const confirmDeleteModalContainer = document.getElementById('confirm-delete-modal-container');
    const confirmDeleteMessage = document.getElementById('confirm-delete-message');
    const confirmDeleteButton = document.getElementById('confirm-delete-button');
    const cancelDeleteButton = document.getElementById('cancel-delete-button');
    // YouTube Player Elements
    const youtubeUrlInput = document.getElementById('youtube-url-input');
    const youtubeLoadButton = document.getElementById('youtube-load-button');
    const memoDisplay = document.getElementById('memo-display');
    const memoInput = document.getElementById('memo-input');
    const addMemoButton = document.getElementById('add-memo-button');
    const clearMemosButton = document.getElementById('clear-memos-button');
    const showPlaybackHistoryButton = document.getElementById('show-playback-history-button');
    // My Videos Elements
    const myVideoInput = document.getElementById('my-video-input');
    const myVideoPlayer = document.getElementById('my-video-player');
    const myVideoMemoDisplay = document.getElementById('my-video-memo-display');
    const myVideoMemoInput = document.getElementById('my-video-memo-input');
    const addMyVideoMemoButton = document.getElementById('add-my-video-memo-button');
    const clearMyVideoMemosButton = document.getElementById('clear-my-video-memos-button');
    const showMyVideoHistoryButton = document.getElementById('show-my-video-history-button');
    // History Modal Elements (shared)
    const historySearchInput = document.getElementById('history-search-input');
    const playbackHistoryModalContainer = document.getElementById('playback-history-modal-container');
    const closeHistoryModalButton = document.getElementById('close-history-modal-button');
    const playbackHistoryContainer = document.getElementById('playback-history-container');


    // --- グローバル変数 ---
    let totalInputs = 0, draggedItem = null, previousDirectionState = '5';
    let commandBuffer = [], committedCommands = [];
    const pressedKeys = new Set(); 
    let activeCommandInputTarget = null, autoCommitOnAttack = true;
    let actions = [], presets = {}, savedCombos = [];
    let selectedHistoryIndex = -1;
    let onConfirmDelete = null;
    // YouTube Player State
    let ytPlayer, currentVideoId = null, memos = [];
    let playbackHistory = [];
    // My Videos State
    let currentMyVideoId = null, myVideoMemos = [];
    let myVideoPlaybackHistory = [];
    let currentHistoryProvider = null; // 'youtube' or 'my-videos'
    let currentObjectURL = null;

    let currentViewIndex = 0;
    let viewOrder = [];
    const viewDetails = {
        editor: { title: 'エディター' },
        history: { title: '履歴' },
        player: { title: '動画プレイヤー' },
        'my-videos': { title: 'マイ動画' },
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
        populatePresetDropdown();
        createGrid();
        setupEventListeners();
        updateMergedOutput(); 
        renderSavedCombos();
        loadYouTubeAPI();
        loadPlaybackHistory();
        showView(viewOrder[currentViewIndex]);
        console.log(`${LOG_PREFIX} 初期化が完了しました。`);
    };

    // --- 3. データ管理 (localStorage) ---
    const loadViewOrder = () => {
        const savedOrder = localStorage.getItem('comboEditorViewOrder');
        if (savedOrder) {
            viewOrder = JSON.parse(savedOrder);
            // --- 後方互換性のための処理 ---
            if (!viewOrder.includes('settings')) viewOrder.push('settings');
            if (!viewOrder.includes('my-videos')) viewOrder.push('my-videos');

        } else {
            viewOrder = ['editor', 'history', 'player', 'my-videos', 'settings'];
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
    // YouTube Memos
    const loadMemos = () => {
        if (!currentVideoId) return;
        memos = JSON.parse(localStorage.getItem(`combo-editor-memos-${currentVideoId}`) || '[]');
    };
    const saveMemos = () => {
        if (!currentVideoId) return;
        localStorage.setItem(`combo-editor-memos-${currentVideoId}`, JSON.stringify(memos));
    };
    // My Video Memos
    const loadMyVideoMemos = () => {
        if (!currentMyVideoId) return;
        myVideoMemos = JSON.parse(localStorage.getItem(`my-videos-memos-${currentMyVideoId}`) || '[]');
    };
    const saveMyVideoMemos = () => {
        if (!currentMyVideoId) return;
        localStorage.setItem(`my-videos-memos-${currentMyVideoId}`, JSON.stringify(myVideoMemos));
    };
    // Playback History
    const loadPlaybackHistory = () => {
        playbackHistory = JSON.parse(localStorage.getItem('comboEditorPlaybackHistory') || '[]');
        myVideoPlaybackHistory = JSON.parse(localStorage.getItem('myVideosPlaybackHistory') || '[]');
    };
    const savePlaybackHistory = () => {
        localStorage.setItem('comboEditorPlaybackHistory', JSON.stringify(playbackHistory));
        localStorage.setItem('myVideosPlaybackHistory', JSON.stringify(myVideoPlaybackHistory));
    };


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
            addFiveContainer.className = 'flex justify-center';
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
            deleteButton.className = 'bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-md text-sm';
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

    const openPlaybackHistoryModal = (provider) => {
        currentHistoryProvider = provider;
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
        // Modals
        openSettingsButton.addEventListener('click', () => settingsModalContainer.classList.remove('hidden'));
        closeSettingsButton.addEventListener('click', () => settingsModalContainer.classList.add('hidden'));
        settingsModalContainer.addEventListener('click', (e) => { if (e.target === settingsModalContainer) settingsModalContainer.classList.add('hidden'); });
        
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
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addMemoButton.click(); }
        });
        clearMemosButton.addEventListener('click', () => {
            if (memos.length > 0) {
                openConfirmModal('現在の動画のメモをすべて削除しますか？<br>この操作は取り消せません。', () => {
                    memos = []; saveMemos(); renderMemos();
                });
            }
        });
        showPlaybackHistoryButton.addEventListener('click', () => openPlaybackHistoryModal('youtube'));

        // My Videos Player
        myVideoInput.addEventListener('change', loadMyVideo);
        addMyVideoMemoButton.addEventListener('click', addMyVideoMemo);
        myVideoMemoInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); addMyVideoMemoButton.click(); }
        });
        clearMyVideoMemosButton.addEventListener('click', () => {
            if (myVideoMemos.length > 0) {
                openConfirmModal('現在の動画のメモをすべて削除しますか？<br>この操作は取り消せません。', () => {
                    myVideoMemos = []; saveMyVideoMemos(); renderMyVideoMemos();
                });
            }
        });
        showMyVideoHistoryButton.addEventListener('click', () => openPlaybackHistoryModal('my-videos'));
        myVideoPlayer.addEventListener('timeupdate', () => {
             // This can be used for features that need to track playback time.
        });
        myVideoPlayer.addEventListener('play', () => {
            updateMyVideoPlaybackHistory(currentMyVideoId, currentMyVideoId);
        });


        // Playback History Modal (Shared)
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

        // Global Keydowns
        window.addEventListener('keydown', (e) => {
            const key = e.key;
            const isSettingsModalOpen = !settingsModalContainer.classList.contains('hidden');
            const isConfirmModalOpen = !confirmDeleteModalContainer.classList.contains('hidden');
            const isHistoryModalOpen = !playbackHistoryModalContainer.classList.contains('hidden');
            const activeElement = document.activeElement;

            // Handle global modals first
            if (isSettingsModalOpen) {
                if (key === 'Escape') settingsModalContainer.classList.add('hidden');
                return;
            }
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
            } else if (!myVideosView.classList.contains('hidden')) {
                handleMyVideoPlayerKeyDown(e);
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

        if (e.key === 'ArrowLeft') { e.preventDefault(); ytPlayer.seekTo(ytPlayer.getCurrentTime() - 1, true); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); ytPlayer.seekTo(ytPlayer.getCurrentTime() + 1, true); }
        else if (e.code === 'Space') {
            e.preventDefault();
            const playerState = ytPlayer.getPlayerState();
            if (playerState === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
            else ytPlayer.playVideo();
        }
    };

    const handleMyVideoPlayerKeyDown = (e) => {
        const activeElement = document.activeElement;
        if (activeElement === myVideoMemoInput || activeElement.classList.contains('memo-edit-input')) return;

        if (e.key === 'ArrowLeft') { e.preventDefault(); myVideoPlayer.currentTime -= 1; }
        else if (e.key === 'ArrowRight') { e.preventDefault(); myVideoPlayer.currentTime += 1; }
        else if (e.code === 'Space') {
            e.preventDefault();
            if (myVideoPlayer.paused) myVideoPlayer.play();
            else myVideoPlayer.pause();
        }
    };

    // --- 7. 新機能：表示切替、コンボ履歴、YouTube ---
    const showView = (viewId) => {
        const views = {
            editor: editorView,
            history: historyView,
            player: playerView,
            'my-videos': myVideosView,
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
        }
    };

    const renderSavedCombos = () => {
        savedCombosContainer.innerHTML = '';
        if (savedCombos.length === 0) {
            savedCombosContainer.innerHTML = '<p class="text-gray-500">保存されたコンボはありません。</p>';
            return;
        }

        savedCombos.forEach((comboData, index) => {
            const card = document.createElement('div');
            card.className = 'saved-combo-card flex-col items-start';
            card.dataset.index = index;
            card.addEventListener('click', () => {
                selectedHistoryIndex = index;
                updateHistorySelection();
            });

            const comboContent = document.createElement('div');
            comboContent.className = 'w-full flex justify-between items-center';

            const comboHTML = document.createElement('p');
            comboHTML.className = 'text-lg flex-grow';
            comboHTML.innerHTML = comboData.comboHTML;

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'flex space-x-2 flex-shrink-0 ml-4';

            const copyHistoryButton = document.createElement('button');
            copyHistoryButton.textContent = 'コピー';
            copyHistoryButton.className = 'bg-gray-700 hover:bg-gray-600 text-white font-bold py-1 px-3 rounded-md text-sm';
            copyHistoryButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent card click when button is clicked
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = comboData.comboHTML;
                copyToClipboard(tempDiv.textContent, copyHistoryButton);
            });

            const deleteHistoryButton = document.createElement('button');
            deleteHistoryButton.textContent = '削除';
            deleteHistoryButton.className = 'bg-red-700 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-md text-sm';
            deleteHistoryButton.addEventListener('click', (e) => {
                e.stopPropagation();
                openConfirmModal('本当にこのコンボを削除しますか？<br>この操作は取り消せません。', () => {
                    savedCombos.splice(index, 1);
                    saveCombos();
                    selectedHistoryIndex = -1;
                    renderSavedCombos();
                });
            });

            const timestampText = document.createElement('p');
            timestampText.className = 'text-xs text-gray-500 mt-2 w-full';
            timestampText.textContent = `保存日時: ${comboData.timestamp}`;

            buttonGroup.appendChild(copyHistoryButton);
            buttonGroup.appendChild(deleteHistoryButton);
            comboContent.appendChild(comboHTML);
            comboContent.appendChild(buttonGroup);
            card.appendChild(comboContent);
            card.appendChild(timestampText);
            savedCombosContainer.appendChild(card);
        });
        updateHistorySelection();
    };

    const updateHistorySelection = () => {
        const cards = savedCombosContainer.querySelectorAll('.saved-combo-card');
        cards.forEach((card, index) => {
            if (index === selectedHistoryIndex) {
                card.classList.add('selected-card');
                card.scrollIntoView({ block: 'nearest' });
            } else {
                card.classList.remove('selected-card');
            }
        });
    };

    const handleHistoryKeyDown = (e) => {
        if (savedCombos.length === 0) return;

        if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedHistoryIndex = Math.max(0, selectedHistoryIndex - 1);
            updateHistorySelection();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedHistoryIndex = Math.min(savedCombos.length - 1, selectedHistoryIndex + 1);
            if (selectedHistoryIndex < 0) selectedHistoryIndex = 0; // Select first if none selected
            updateHistorySelection();
        } else if (e.ctrlKey && e.key.toLowerCase() === 'c') {
            e.preventDefault();
            if (selectedHistoryIndex > -1) {
                const card = savedCombosContainer.querySelector(`[data-index="${selectedHistoryIndex}"]`);
                const button = card.querySelector('.bg-gray-700'); // Find the copy button
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = savedCombos[selectedHistoryIndex].comboHTML;
                copyToClipboard(tempDiv.textContent, button);
            }
        } else if (e.ctrlKey && e.key === 'Delete') {
            e.preventDefault();
            if (selectedHistoryIndex > -1) {
                openConfirmModal('本当にこのコンボを削除しますか？<br>この操作は取り消せません。', () => {
                    savedCombos.splice(selectedHistoryIndex, 1);
                    saveCombos();
                    selectedHistoryIndex = -1;
                    renderSavedCombos();
                });
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

    // --- 8. YouTube & My Video Players ---
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

    // My Videos Memo Rendering
    const addMyVideoMemo = () => {
        const text = myVideoMemoInput.value.trim();
        if (text && currentMyVideoId) {
            const currentTime = myVideoPlayer.currentTime;
            myVideoMemos.push({ id: Date.now(), text: text, time: currentTime });
            myVideoMemos.sort((a, b) => a.time - b.time);
            saveMyVideoMemos();
            renderMyVideoMemos();
            myVideoMemoInput.value = '';
        }
    };

    const renderMyVideoMemos = (editMemoId = null) => {
        myVideoMemoDisplay.innerHTML = '';
        myVideoMemos.forEach((memo, index) => {
            const memoEl = document.createElement('div');
            memoEl.className = 'memo-message flex items-center p-2';

            const timestampEl = document.createElement('span');
            timestampEl.className = 'memo-timestamp';
            timestampEl.textContent = `[${formatTime(memo.time)}]`;
            timestampEl.addEventListener('click', () => { myVideoPlayer.currentTime = memo.time; });
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
                    saveMyVideoMemos();
                    renderMyVideoMemos();
                };

                inputEl.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveAction(); }
                    else if (e.key === 'Escape') { renderMyVideoMemos(); }
                });

                saveBtn.addEventListener('click', saveAction);
                deleteBtn.addEventListener('click', () => {
                    openConfirmModal(`このメモを削除しますか？`, () => {
                        myVideoMemos.splice(index, 1);
                        saveMyVideoMemos();
                        renderMyVideoMemos();
                    });
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
                    renderMyVideoMemos(memo.id);
                });
                memoEl.appendChild(editBtn);
            }
            myVideoMemoDisplay.appendChild(memoEl);
        });
        myVideoMemoDisplay.scrollTop = myVideoMemoDisplay.scrollHeight;
    };

    // My Videos Player Logic
    const loadMyVideo = (event) => {
        const file = event.target.files[0];
        if (file) {
            if (currentObjectURL) {
                URL.revokeObjectURL(currentObjectURL);
            }
            currentObjectURL = URL.createObjectURL(file);
            myVideoPlayer.src = currentObjectURL;

            // Use file name as a simple ID
            currentMyVideoId = file.name;
            loadMyVideoMemos();
            renderMyVideoMemos();
            myVideoPlayer.play();
        }
    };

    const updatePlaybackHistory = (videoId, title) => {
        if (!videoId || !title) return;
        const now = new Date().toLocaleString('ja-JP');
        const history = currentHistoryProvider === 'youtube' ? playbackHistory : myVideoPlaybackHistory;
        const existingIndex = history.findIndex(item => item.videoId === videoId);

        if (existingIndex > -1) {
            // 既存の履歴を更新して先頭に移動
            const existingItem = history.splice(existingIndex, 1)[0];
            existingItem.lastPlayed = now;
            history.unshift(existingItem);
        } else {
            history.unshift({ videoId: videoId, title: title, lastPlayed: now });
        }
        if (history.length > 50) history.pop();
        savePlaybackHistory();
        if (!playbackHistoryModalContainer.classList.contains('hidden')) {
            renderPlaybackHistory(historySearchInput.value);
        }
    };

    const updateMyVideoPlaybackHistory = (videoId, title) => {
        if (!videoId || !title) return;
        const now = new Date().toLocaleString('ja-JP');
        const existingIndex = myVideoPlaybackHistory.findIndex(item => item.videoId === videoId);

        if (existingIndex > -1) {
            const existingItem = myVideoPlaybackHistory.splice(existingIndex, 1)[0];
            existingItem.lastPlayed = now;
            myVideoPlaybackHistory.unshift(existingItem);
        } else {
            myVideoPlaybackHistory.unshift({ videoId: videoId, title: title, lastPlayed: now });
        }
        if (myVideoPlaybackHistory.length > 50) myVideoPlaybackHistory.pop();
        savePlaybackHistory();
    };


    const renderPlaybackHistory = (filterText = '') => {
        playbackHistoryContainer.innerHTML = '';
        const history = currentHistoryProvider === 'youtube' ? playbackHistory : myVideoPlaybackHistory;
        const filteredHistory = history.filter(item =>
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
            if (currentHistoryProvider === 'youtube') {
                card.addEventListener('click', () => {
                    youtubeUrlInput.value = `https://www.youtube.com/watch?v=${item.videoId}`;
                    loadYouTubeVideo();
                    closePlaybackHistoryModal();
                });
            } else {
                 card.addEventListener('click', (e) => {
                    e.preventDefault();
                    alert('ローカル動画の履歴からの直接再生は現在サポートされていません。ファイルを選択し直してください。');
                });
            }

            const deleteBtn = card.querySelector('.delete-history-item-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoIdToDelete = e.currentTarget.dataset.videoid;
                const historyList = currentHistoryProvider === 'youtube' ? playbackHistory : myVideoPlaybackHistory;
                const indexToDelete = historyList.findIndex(h => h.videoId === videoIdToDelete);
                
                if (indexToDelete > -1) {
                    historyList.splice(indexToDelete, 1);
                    savePlaybackHistory();
                    renderPlaybackHistory(historySearchInput.value);
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
            'myVideosPlaybackHistory'
        ];

        localStorageKeys.forEach(key => {
            const value = localStorage.getItem(key);
            if (value !== null) {
                allSettings[key] = JSON.parse(value);
            }
        });

        const memos = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('combo-editor-memos-') || key.startsWith('my-videos-memos-')) {
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
                // Clear all relevant local storage
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith('combo-editor-') || key.startsWith('my-videos-')) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));

                // Import settings
                Object.keys(settings).forEach(key => {
                    const data = settings[key];
                    if (key === 'allMemos') {
                        Object.keys(data).forEach(memoKey => localStorage.setItem(memoKey, JSON.stringify(data[memoKey])));
                    } else {
                        localStorage.setItem(key, JSON.stringify(data));
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

    // --- 9. アプリケーションの実行 ---
    initialize();
});
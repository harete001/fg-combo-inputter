import { state } from './state.js';
import * as dom from './dom.js';
import { viewDetails } from './constants.js';
import { saveCurrentActions, saveSpreadsheetSettings, saveSpreadsheetMemo, saveMemos } from './storage.js';
import { addSidebarEventListeners } from './events.js';
import { renderDatabaseView, renderCreateTableView, renderEditTableView, populateTableSelector } from './database_helpers.js';
import { createTableEditorComponent } from './components/table_editor.js';
import { openConfirmModal } from './components/modals.js';

export function getColorForCommand(commandText, actionsToUse = state.actions) {
    let trimmedCommand = commandText.trim();
    if (!trimmedCommand) return null;

    if (state.enableHoldAttack && state.holdAttackText.trim() !== '') {
        const holdSuffix = ` ${state.holdAttackText}`;
        if (trimmedCommand.endsWith(holdSuffix)) {
            trimmedCommand = trimmedCommand.slice(0, -holdSuffix.length);
        }
    }

    if (state.enablePrefixes) {
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
}

export function generateHtmlFromPlainText(plainText, actionsToUse = state.actions) {
    const parts = plainText.split(' > ');
    const html = parts.map(part => {
        const trimmedPart = part.trim();
        if (trimmedPart === '') return '';
        const color = getColorForCommand(trimmedPart, actionsToUse) || '#FFFFFF';
        return `<span style="color: ${color};">${trimmedPart}</span>`;
    }).filter(s => s !== '').join(' <span class="text-gray-500">&gt;</span> ');
    return html;
}

export function updateMergedOutput() {
    const inputs = Array.from(dom.gridContainer.querySelectorAll('input'));
    const comboParts = inputs.map(input => ({
        value: input.value.trim(),
        color: input.style.color || getColorForCommand(input.value.trim()) || '#FFFFFF'
    })).filter(part => part.value !== '');

    if (comboParts.length === 0) {
        dom.mergedOutput.innerHTML = `<span class="text-gray-500">ここにコンボが表示されます...</span>`;
        return;
    }
    const html = comboParts.map(part => `<span style="color: ${part.color};">${part.value}</span>`).join(' <span class="text-gray-500">&gt;</span> ');
    dom.mergedOutput.innerHTML = html;
}

export function reindexGrid() {
    const inputs = dom.gridContainer.querySelectorAll('.form-input');
    inputs.forEach((input, index) => { input.dataset.index = index; });
    state.totalInputs = inputs.length;
}

export function findFirstEmptyInput() {
    const inputs = Array.from(dom.gridContainer.querySelectorAll('input'));
    return inputs.find(input => input.value.trim() === '');
}

export function applyColorToInput(inputElement, commandText) {
    const color = getColorForCommand(commandText);
    inputElement.style.color = color || '#FFFFFF';
}

export function renderSidebar() {
    dom.sidebarNavList.innerHTML = '';
    state.viewOrder.forEach(viewId => {
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
        dom.sidebarNavList.appendChild(li);
    });
    addSidebarEventListeners();
}

export function populateSettingsPanel() {
    dom.actionsListContainer.innerHTML = '';
    state.actions.forEach(action => {
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
            state.actions.forEach(a => { if (a.key === newKey) a.key = ''; });
            action.key = newKey;
            saveCurrentActions();
            populateSettingsPanel();
        });

        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = action.color || '#FFFFFF';
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
            state.actions = state.actions.filter(a => a.id !== action.id);
            saveCurrentActions();
            populateSettingsPanel();
        });

        row.appendChild(outputInput); 
        row.appendChild(keyInput); 
        row.appendChild(colorInput); 
        row.appendChild(addFiveContainer);
        row.appendChild(deleteButton);
        dom.actionsListContainer.appendChild(row);
    });
}

export function populatePresetDropdown() {
    dom.presetSelect.innerHTML = '<option value="">プリセットを選択...</option>';
    Object.keys(state.presets).forEach(name => {
        const option = document.createElement('option');
        option.value = name; option.textContent = name;
        dom.presetSelect.appendChild(option);
    });
}

export function renderSettingsSidebar() {
    dom.settingsSidebarList.innerHTML = '';
    Object.keys(state.settingsSubViews).forEach(viewId => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.id = `settings-nav-${viewId}`;
        a.className = 'settings-nav-link';
        a.textContent = state.settingsSubViews[viewId].title;
        a.addEventListener('click', (e) => { e.preventDefault(); showView('settings', { subViewId: viewId }); });
        li.appendChild(a);
        dom.settingsSidebarList.appendChild(li);
    });
}

export function showSettingsSubView(viewId) {
    state.currentSettingsSubViewId = viewId;
    if (!state.settingsSubViews[viewId]) {
        viewId = 'keyMapping';
    }
    Object.values(state.settingsSubViews).forEach(view => view.element.classList.add('hidden'));
    if (state.settingsSubViews[viewId] && state.settingsSubViews[viewId].element) {
        state.settingsSubViews[viewId].element.classList.remove('hidden');
    }
    if (viewId === 'keyMapping') {
        renderEditorSettingsTOC();
    }
    dom.settingsSidebarList.querySelectorAll('.settings-nav-link').forEach(link => link.classList.remove('settings-active-link'));
    dom.settingsSidebarList.querySelector(`#settings-nav-${viewId}`)?.classList.add('settings-active-link');
}

export function renderEditorSettingsTOC() {
    if (!dom.keyMappingView || !dom.editorSettingsToc) return;

    const sections = dom.keyMappingView.querySelectorAll('section[id]');
    if (sections.length === 0) {
        dom.editorSettingsToc.innerHTML = '';
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

    dom.editorSettingsToc.innerHTML = '';
    dom.editorSettingsToc.appendChild(tocTitle);
    dom.editorSettingsToc.appendChild(tocList);
}

export function populateSpreadsheetPresetDropdown() {
    dom.spreadsheetPresetSelect.innerHTML = '<option value="">プリセットを選択...</option>';
    Object.keys(state.spreadsheetPresets).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        dom.spreadsheetPresetSelect.appendChild(option);
    });
}

export function renderMemoColumnSelector() {
    dom.memoColumnSelect.innerHTML = '<option value=""> (なし)</option>';
    state.spreadsheetColumns.forEach(column => {
        const option = document.createElement('option');
        option.value = column.id;
        option.textContent = column.header;
        if (column.id === state.memoColumnId) {
            option.selected = true;
        }
        dom.memoColumnSelect.appendChild(option);
    });
}

export function createGrid() {
    for (let i = 0; i < 25; i++) createInputBox(i);
    state.totalInputs = 25;
}

export function createInputBox(index) {
    const input = document.createElement('input');
    input.type = 'text'; input.dataset.index = index;
    input.className = 'form-input w-full p-2 bg-gray-800 border border-gray-600 rounded-md text-center text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow cursor-move';
    input.setAttribute('autocomplete', 'off'); input.draggable = true;
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.target.blur();
        }
    });
    dom.gridContainer.appendChild(input);
    return input;
}

export function buildUrl(viewId, options = {}) {
    let url = `#${viewId}`;
    if (viewId === 'database' && options.tableName) {
        url += `/${encodeURIComponent(options.tableName)}`;
    } else if (viewId === 'settings' && options.subViewId) {
        url += `/${options.subViewId}`;
    }
    return url;
}

export function showView(viewId, options = {}, fromPopState = false) {
    if (viewId === 'editor') {
        populateTableSelector();
    }
    const views = { 
        editor: dom.editorView, 
        player: dom.playerView,
        database: dom.databaseView,
        'create-table': dom.createTableView,
        'edit-table': dom.editTableView,
        spreadsheet: dom.spreadsheetView,
        settings: dom.settingsPageView
    };
    
    for (const id in views) {
        if (views[id]) views[id].classList.add('hidden');
    }
    if (views[viewId]) views[viewId].classList.remove('hidden');

    if (!fromPopState) {
        const historyState = { viewId, options };
        const title = viewDetails[viewId] ? `コンボエディター - ${viewDetails[viewId].title}` : 'コンボエディター';
        const url = buildUrl(viewId, options);

        if (JSON.stringify(historyState) !== JSON.stringify(history.state)) {
            history.pushState(historyState, title, url);
        }
        document.title = title;
    } else {
        const title = viewDetails[viewId] ? `コンボエディター - ${viewDetails[viewId].title}` : 'コンボエディター';
        document.title = title;
    }

    const navLinks = dom.sidebarNavList.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active-link'));

    let activeNavId = viewId;
    if (viewId === 'create-table' || viewId === 'edit-table') {
        activeNavId = 'database';
    }
    const activeNavLink = dom.sidebarNavList.querySelector(`#nav-${activeNavId}`);
    if (activeNavLink) {
        activeNavLink.classList.add('active-link');
    }

    if (state.viewOrder.includes(viewId)) {
        state.currentViewIndex = state.viewOrder.indexOf(viewId);
    }

    if (viewId === 'settings') {
        showSettingsSubView(options.subViewId || state.currentSettingsSubViewId);
    } else if (viewId === 'spreadsheet') {
        renderSpreadsheetView();
    } else if (viewId === 'database') {
        renderDatabaseView(options.tableName || null);
    } else if (viewId === 'create-table') {
        renderCreateTableView();
    } else if (viewId === 'edit-table') {
        renderEditTableView(options.tableName);
    }
}

export function copyToClipboard(text, buttonElement) {
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
}

export function renderSpreadsheetView() {
    renderComboColumnSelector();
    renderMemoColumnSelector();
    renderSpreadsheetDataTable();
    updateSpreadsheetOutput();
}

export function renderComboColumnSelector() {
    dom.comboColumnSelect.innerHTML = '<option value=""> (なし)</option>';
    state.spreadsheetColumns.forEach(column => {
        const option = document.createElement('option');
        option.value = column.id;
        option.textContent = column.header;
        if (column.id === state.comboColumnId) {
            option.selected = true;
        }
        dom.comboColumnSelect.appendChild(option);
    });
}

export function renderSpreadsheetDataTable() {
    createTableEditorComponent(dom.spreadsheetDataTableContainer, {
        columns: state.spreadsheetColumns,
        data: state.spreadsheetData,
        isReadOnly: (columnId) => columnId === state.comboColumnId || columnId === state.memoColumnId,
        getCellValue: (columnId) => {
            if (columnId === state.comboColumnId) return getComboTextForSpreadsheet();
            if (columnId === state.memoColumnId) return state.spreadsheetMemo;
            return state.spreadsheetData[columnId] || '';
        },
        onStateChange: (newState) => {
            state.spreadsheetColumns = newState.columns;
            state.spreadsheetData = newState.data;
            saveSpreadsheetSettings();
            renderSpreadsheetView();
        },
        onDataChange: (newData) => {
            state.spreadsheetData = newData;
            saveSpreadsheetSettings();
            updateSpreadsheetOutput();
        }
    });
}

export function updateSpreadsheetOutput() {
    const values = state.spreadsheetColumns.map(c => state.spreadsheetData[c.id] || '').join('\t');
    dom.spreadsheetOutput.value = values;
}

export function getComboTextForSpreadsheet() {
    const comboPlainText = dom.mergedOutput.textContent;
    if (comboPlainText.includes('ここにコンボが表示されます...')) {
        return '';
    }
    return comboPlainText;
}

export function addSpreadsheetColumn() {
    state.spreadsheetColumns.push({ id: `col-${Date.now()}`, header: '' });
    saveSpreadsheetSettings();
    renderSpreadsheetView();
}

export function handleComboColumnChange(e) {
    state.comboColumnId = e.target.value;
    saveSpreadsheetSettings();
    renderSpreadsheetDataTable();
    updateSpreadsheetOutput();
}

export function handleMemoColumnChange(e) {
    state.memoColumnId = e.target.value;
    saveSpreadsheetSettings();
    renderSpreadsheetDataTable();
    updateSpreadsheetOutput();
}

export function copySpreadsheetData() {
    const textToCopy = dom.spreadsheetOutput.value;
    if (textToCopy) {
        copyToClipboard(textToCopy, dom.copySpreadsheetDataButton);
    }
}

export function formatTime(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(14, 5);
}

export function addMemo() {
    const text = dom.memoInput.value.trim();
    if (text && state.ytPlayer && typeof state.ytPlayer.getCurrentTime === 'function') {
        const currentTime = state.ytPlayer.getCurrentTime();
        state.memos.push({ id: Date.now(), text: text, time: currentTime });
        state.memos.sort((a, b) => a.time - b.time);
        saveMemos();
        renderMemos();
        dom.memoInput.value = '';
    }
}

export function renderMemos(editMemoId = null) {
    dom.memoDisplay.innerHTML = '';
    state.memos.forEach((memo, index) => {
        const memoEl = document.createElement('div');
        memoEl.className = 'memo-message flex items-center p-2';

        const timestampEl = document.createElement('span');
        timestampEl.className = 'memo-timestamp';
        timestampEl.textContent = `[${formatTime(memo.time)}]`;
        timestampEl.addEventListener('click', () => {
            state.ytPlayer.seekTo(memo.time, true);
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
                    state.memos.splice(index, 1);
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

        dom.memoDisplay.appendChild(memoEl);
    });
    dom.memoDisplay.scrollTop = dom.memoDisplay.scrollHeight;
}

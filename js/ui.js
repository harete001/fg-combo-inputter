/**
 * @file Manages UI rendering, view switching, and general UI helper functions.
 * @module ui
 */
import { state } from './state.js';
import * as dom from './dom.js';
import { viewDetails } from './constants.js';
import { saveCurrentActions, saveSpreadsheetSettings, saveSpreadsheetMemo, saveMemos } from './storage.js';
import { addSidebarEventListeners } from './events.js';
import { populateTableSelector, renderDatabaseView } from './database_helpers.js';
import { renderCreateTableView } from './createView.js';
import { renderEditTableView } from './editView.js';
import { createTableEditorComponent } from './components/table_editor.js';
import { renderSystemGamepadMappingUI, getHumanReadableInputName } from './gamepad.js';
import { openConfirmModal } from './components/modals.js';

/**
 * Toggles the visibility of the sidebar.
 */
export function toggleSidebar() {
    state.isSidebarVisible = !state.isSidebarVisible;
    updateSidebarVisibility();
    saveSidebarState();
}

/**
 * Updates the UI elements based on the sidebar's visibility state.
 */
export function updateSidebarVisibility() {
    if (state.isSidebarVisible) {
        dom.sidebar.classList.remove('sidebar-collapsed');
    } else {
        dom.sidebar.classList.add('sidebar-collapsed');
    }
}

/**
 * Determines the color for a given command string based on the defined actions.
 * @param {string} commandText - The command string (e.g., "236P").
 * @param {Array<object>} [actionsToUse=state.actions] - The set of actions to check against.
 * @returns {string|null} The hex color string or null if no match is found.
 */
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

    const baseCommand = trimmedCommand.replace(/[0-9\s+\[\]]/g, '');

    if (baseCommand === foundAction.output) {
        return foundAction.color;
    }

    return null;
}

/**
 * Converts a plain text combo string into an HTML string with color-coded parts.
 * @param {string} plainText - The plain text combo string (e.g., "236P > 6HS").
 * @param {Array<object>} [actionsToUse=state.actions] - The set of actions to use for coloring.
 * @returns {string} The generated HTML string.
 */
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

/**
 * Updates the merged combo output display based on the values in the input grid.
 */
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

/**
 * Re-indexes all input boxes in the grid after an insertion, deletion, or drag-and-drop.
 */
export function reindexGrid() {
    const inputs = dom.gridContainer.querySelectorAll('.form-input');
    inputs.forEach((input, index) => { input.dataset.index = index; });
    state.totalInputs = inputs.length;
}

/**
 * Finds the first empty input box in the editor grid.
 * @returns {HTMLElement|undefined} The first empty input element, or undefined if none are empty.
 */
export function findFirstEmptyInput() {
    const inputs = Array.from(dom.gridContainer.querySelectorAll('input'));
    return inputs.find(input => input.value.trim() === '');
}

/**
 * Applies the appropriate color to an input element based on its command text.
 * @param {HTMLElement} inputElement - The input element to color.
 * @param {string} commandText - The command text to evaluate for color.
 */
export function applyColorToInput(inputElement, commandText) {
    const color = getColorForCommand(commandText);
    inputElement.style.color = color || '#FFFFFF';
}

/**
 * Renders the main navigation sidebar based on the current view order.
 */
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
        a.className = 'nav-link flex items-center text-lg px-4 py-2 rounded-md';

        const iconSpan = document.createElement('span');
        iconSpan.className = 'nav-icon flex-shrink-0';
        if (viewDetails[viewId].icon) {
            iconSpan.innerHTML = viewDetails[viewId].icon;
        }

        const textSpan = document.createElement('span');
        textSpan.className = 'nav-text ml-3 whitespace-nowrap transition-all duration-200';
        textSpan.textContent = viewDetails[viewId].title;

        a.appendChild(iconSpan);
        a.appendChild(textSpan);
        li.appendChild(a);
        dom.sidebarNavList.appendChild(li);
    });
    addSidebarEventListeners();
}

/**
 * Populates the settings panel with the current actions for editing.
 */
export function populateSettingsPanel() {
    dom.actionsListContainer.innerHTML = '';
    state.actions.forEach(action => {
        const row = document.createElement('div');
        row.className = 'grid grid-cols-6 gap-4 items-center p-2 rounded-md';
        row.dataset.actionId = action.id;
        
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

        const gamepadButton = document.createElement('button');
        gamepadButton.className = 'form-input key-input w-full p-2 bg-gray-700 border-gray-600 rounded-md text-white gamepad-map-button';
        gamepadButton.dataset.actionId = action.id;
        gamepadButton.textContent = getHumanReadableInputName(action.gamepadButton);

        gamepadButton.addEventListener('click', () => {
            const isCurrentlyWaiting = state.isWaitingForGamepadInput && state.isWaitingForGamepadInput.element === gamepadButton;

            // First, find and reset ANY other waiting button.
            const waitingButton = document.querySelector('.bg-yellow-500.remap-button, .bg-yellow-500.gamepad-map-button');
            if (waitingButton) {
                waitingButton.classList.remove('bg-yellow-500', 'hover:bg-yellow-400', 'animate-pulse');
                if (waitingButton.classList.contains('remap-button')) {
                    waitingButton.textContent = '割り当て';
                } else {
                    const oldAction = state.actions.find(a => a.id === waitingButton.dataset.actionId);
                    if (oldAction) {
                        waitingButton.textContent = getHumanReadableInputName(oldAction.gamepadButton);
                    }
                }
            }

            // Now, if the clicked button was NOT the one that was waiting, make IT wait.
            if (!isCurrentlyWaiting) {
                gamepadButton.classList.add('bg-yellow-500', 'hover:bg-yellow-400', 'animate-pulse');
                gamepadButton.textContent = '入力待機中...';
                state.isWaitingForGamepadInput = { actionId: action.id, element: gamepadButton, isSystemAction: false };
            } else {
                // If the clicked button WAS the one waiting, we just cancelled it.
                state.isWaitingForGamepadInput = null;
            }
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
        row.appendChild(gamepadButton);
        row.appendChild(colorInput); 
        row.appendChild(addFiveContainer);
        row.appendChild(deleteButton);
        dom.actionsListContainer.appendChild(row);
    });
}

/**
 * Populates the preset dropdown in the settings view.
 */
export function populatePresetDropdown() {
    dom.presetSelect.innerHTML = '<option value="">プリセットを選択...</option>';
    Object.keys(state.presets).forEach(name => {
        const option = document.createElement('option');
        option.value = name; option.textContent = name;
        dom.presetSelect.appendChild(option);
    });
}

/**
 * Renders the sub-navigation sidebar within the main settings page.
 */
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

/**
 * Shows a specific sub-view within the main settings page.
 * @param {string} viewId - The ID of the settings sub-view to show (e.g., 'keyMapping').
 */
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
    } else if (viewId === 'gamepad') {
        renderSystemGamepadMappingUI();
    }
    dom.settingsSidebarList.querySelectorAll('.settings-nav-link').forEach(link => link.classList.remove('settings-active-link'));
    dom.settingsSidebarList.querySelector(`#settings-nav-${viewId}`)?.classList.add('settings-active-link');
}

/**
 * Renders the table of contents for the editor settings view.
 */
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

/**
 * Populates the preset dropdown for the spreadsheet view.
 */
export function populateSpreadsheetPresetDropdown() {
    dom.spreadsheetPresetSelect.innerHTML = '<option value="">プリセットを選択...</option>';
    Object.keys(state.spreadsheetPresets).forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        dom.spreadsheetPresetSelect.appendChild(option);
    });
}

/**
 * Renders the memo column selector for the spreadsheet view.
 */
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

/**
 * Creates the initial grid of input boxes for the combo editor.
 */
export function createGrid() {
    for (let i = 0; i < 25; i++) createInputBox(i);
    state.totalInputs = 25;
}

/**
 * Creates a single input box for the combo editor grid.
 * @param {number} index - The index of the input box.
 * @returns {HTMLInputElement} The created input element.
 */
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

/**
 * Builds a URL hash string for a given view and its options.
 * @param {string} viewId - The ID of the view.
 * @param {object} [options={}] - Options for the view (e.g., tableName).
 * @returns {string} The constructed URL hash.
 */
export function buildUrl(viewId, options = {}) {
    let url = `#${viewId}`;
    if (viewId === 'database' && options.tableName) {
        url += `/${encodeURIComponent(options.tableName)}`;
    } else if (viewId === 'settings' && options.subViewId) {
        url += `/${options.subViewId}`;
    }
    return url;
}

/**
 * Switches the main content area to the specified view.
 * @param {string} viewId - The ID of the view to show.
 * @param {object} [options={}] - Options for the view.
 * @param {boolean} [fromPopState=false] - True if the call is from a popstate event.
 */
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

/**
 * Copies text to the clipboard, using the modern Clipboard API with a fallback.
 * @param {string} text - The text to copy.
 * @param {HTMLElement} [buttonElement] - The button that triggered the copy, to show feedback.
 * @returns {Promise<void>}
 */
export async function copyToClipboard(text, buttonElement) {
    const showSuccessMessage = () => {
        if (buttonElement) {
            const originalText = buttonElement.textContent;
            const originalClassName = buttonElement.className;

            buttonElement.textContent = 'コピー完了!';
            // A generic success style that overrides others by removing old color classes
            buttonElement.className = originalClassName
                .split(' ')
                .filter(c => !c.startsWith('bg-') && !c.startsWith('hover:bg-'))
                .join(' ') + ' bg-green-600 hover:bg-green-500';

            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.className = originalClassName; // Restore it
            }, 1500);
        }
    };

    // Use modern Clipboard API if available (and in a secure context)
    if (navigator.clipboard && window.isSecureContext) {
        try {
            await navigator.clipboard.writeText(text);
            showSuccessMessage();
            return;
        } catch (err) {
            console.warn('Clipboard API failed, falling back to execCommand.', err);
        }
    }

    // Fallback for insecure contexts or older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; // Avoid scrolling to bottom
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        showSuccessMessage();
    } catch (err) {
        console.error('Fallback copy method failed.', err);
        alert('コピーに失敗しました。');
    }
    document.body.removeChild(textArea);
}

/**
 * Renders the entire spreadsheet view, including selectors and the data table.
 */
export function renderSpreadsheetView() {
    renderComboColumnSelector();
    renderMemoColumnSelector();
    renderSpreadsheetDataTable();
    updateSpreadsheetOutput();
}

/**
 * Renders the combo column selector for the spreadsheet view.
 */
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

/**
 * Renders the data table for the spreadsheet view using the table editor component.
 */
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

/**
 * Updates the output textarea in the spreadsheet view with the current data.
 */
export function updateSpreadsheetOutput() {
    const values = state.spreadsheetColumns.map(c => state.spreadsheetData[c.id] || '').join('\t');
    dom.spreadsheetOutput.value = values;
}

/**
 * Gets the plain text of the current combo from the main editor for use in the spreadsheet.
 * @returns {string} The plain text of the combo.
 */
export function getComboTextForSpreadsheet() {
    const comboPlainText = dom.mergedOutput.textContent;
    if (comboPlainText.includes('ここにコンボが表示されます...')) {
        return '';
    }
    return comboPlainText;
}

/**
 * Adds a new column to the spreadsheet view.
 */
export function addSpreadsheetColumn() {
    state.spreadsheetColumns.push({ id: `col-${Date.now()}`, header: '' });
    saveSpreadsheetSettings();
    renderSpreadsheetView();
}

/**
 * Handles changes to the combo column selection in the spreadsheet view.
 * @param {Event} e - The change event.
 */
export function handleComboColumnChange(e) {
    state.comboColumnId = e.target.value;
    saveSpreadsheetSettings();
    renderSpreadsheetDataTable();
    updateSpreadsheetOutput();
}

/**
 * Handles changes to the memo column selection in the spreadsheet view.
 * @param {Event} e - The change event.
 */
export function handleMemoColumnChange(e) {
    state.memoColumnId = e.target.value;
    saveSpreadsheetSettings();
    renderSpreadsheetDataTable();
    updateSpreadsheetOutput();
}

/**
 * Copies the generated spreadsheet data to the clipboard.
 */
export async function copySpreadsheetData() {
    const textToCopy = dom.spreadsheetOutput.value;
    if (textToCopy) {
        await copyToClipboard(textToCopy, dom.copySpreadsheetDataButton);
    }
}

/**
 * Formats a time in seconds into a MM:SS string.
 * @param {number} seconds - The time in seconds.
 * @returns {string} The formatted time string.
 */
export function formatTime(seconds) {
    const date = new Date(0);
    date.setSeconds(seconds);
    return date.toISOString().substr(14, 5);
}

/**
 * Adds a new memo with the current video timestamp.
 */
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

/**
 * Creates a single memo element for the memo display area.
 * @param {object} memo - The memo object.
 * @param {number} index - The index of the memo in the state array.
 * @param {number|null} editMemoId - The ID of the memo currently being edited, if any.
 * @returns {HTMLElement} The created memo element.
 */
function createMemoElement(memo, index, editMemoId) {
    const memoEl = document.createElement('div');
    memoEl.className = 'memo-message flex items-center p-2';

    const timestampEl = document.createElement('span');
    timestampEl.className = 'memo-timestamp';
    timestampEl.textContent = `[${formatTime(memo.time)}]`;
    timestampEl.addEventListener('click', () => {
        if (state.ytPlayer && typeof state.ytPlayer.seekTo === 'function') {
            state.ytPlayer.seekTo(memo.time, true);
        }
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
    return memoEl;
}

/**
 * Renders the list of memos for the current video.
 * @param {number|null} [editMemoId=null] - The ID of a memo to show in edit mode.
 */
export function renderMemos(editMemoId = null) {
    dom.memoDisplay.innerHTML = '';
    state.memos.forEach((memo, index) => {
        const memoEl = createMemoElement(memo, index, editMemoId);
        dom.memoDisplay.appendChild(memoEl);
    });
    dom.memoDisplay.scrollTop = dom.memoDisplay.scrollHeight;
}

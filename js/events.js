/**
 * @file Manages all event listeners for the application.
 * @module events
 */

import { state } from './state.js';
import * as dom from './dom.js';
import { defaultActions, DEFAULT_PRESETS } from './constants.js';
import { saveCurrentActions, savePresets, saveAutoCommitSetting, saveHoldAttackSetting, savePrefixSetting, saveViewOrder, saveMemos, exportAllSettings, importAllSettings, saveDirectionalHoldSetting, saveCurrentPresetName } from './storage.js';
import { showView, populateSettingsPanel, populatePresetDropdown, updateMergedOutput, reindexGrid, copyToClipboard, findFirstEmptyInput, applyColorToInput, createInputBox, renderSidebar, addMemo, renderMemos, toggleSidebar, showToast } from './ui.js';
import { openCommandInputModal, closeCommandInputModal, openConfirmModal, closeConfirmModal, openPlaybackHistoryModal, closePlaybackHistoryModal, openMoveRecordsModal, closeMoveRecordsModal, renderPlaybackHistory, openImportOptionsModal, closeImportOptionsModal } from './components/modals.js';
import { loadYouTubeVideo, updatePlaybackHistory } from './youtube.js';
import { populateTableSelector, renderEditorMetadataForm, renderDatabaseView } from './database_helpers.js';
import { cancelGamepadMappingSequence } from './gamepad.js';
import { commitSingleCommand, finalizeAndWriteCommands, handleModalKeyInputAction, updateModalDirection, resetModalInputState, updateCommittedCommandsList, handleDirectionalHold, handleModalTextInput, handleModalTextBackspace, updateCommandModalPreview } from './command_modal.js';

/**
 * Adds event listeners to the sidebar for navigation and drag-and-drop reordering.
 * @returns {void}
 */
export function addSidebarEventListeners() {
    const navItems = dom.sidebarNavList.querySelectorAll('.nav-item');
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
            const draggedIndex = state.viewOrder.indexOf(draggedViewId);
            const droppedOnIndex = state.viewOrder.indexOf(droppedOnViewId);

            if (draggedIndex !== droppedOnIndex) {
                const [removed] = state.viewOrder.splice(draggedIndex, 1);
                state.viewOrder.splice(droppedOnIndex, 0, removed);
                saveViewOrder();
                renderSidebar();
                showView(state.viewOrder[state.currentViewIndex]);
            }
        });
    });
}

/**
 * Handles the logic when a preset is changed from any dropdown.
 * @param {string} name - The name of the selected preset.
 */
function handlePresetChange(name) {
    if (name && state.presets[name]) {
        state.actions = JSON.parse(JSON.stringify(state.presets[name]));
        state.currentPresetName = name;
        saveCurrentActions();
        saveCurrentPresetName();
        populateSettingsPanel();
        populatePresetDropdown(); // Sync both dropdowns
    }
}

/**
 * Handles keydown events for the main editor view.
 * @param {KeyboardEvent} e - The keyboard event.
 * @returns {void}
 */
function handleEditorKeyDown(e) {
    const key = e.key;
    const activeElement = document.activeElement;
    const isCommandModalOpen = !dom.commandInputModalContainer.classList.contains('hidden');

    if (isCommandModalOpen) {
        if (state.ignoredKeysUntilRelease.has(key) || state.ignoredKeysUntilRelease.has(key.toLowerCase())) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // Alt+Enter でテキスト入力モードをトグル
        if (e.altKey && key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            state.isTextEntryMode = !state.isTextEntryMode;
            state.commandBuffer = []; // モード切替時にバッファをクリア
            updateCommandModalPreview();
            return;
        }

        // テキスト入力モードの処理
        if (state.isTextEntryMode) {
            e.preventDefault();
            e.stopPropagation();
            if (key === 'Enter') { commitSingleCommand(); return; }
            if (key === 'Escape') { closeCommandInputModal(); return; }
            if (key === 'Backspace') { handleModalTextBackspace(); }
            else if (key.length === 1) { handleModalTextInput(key); } // 通常の文字キー
            return;
        }

        // 通常のコマンド入力処理
        e.preventDefault();
        e.stopPropagation();
        if (key === 'Enter' && e.ctrlKey) { finalizeAndWriteCommands(); return; }
        if (key === 'Enter') { commitSingleCommand(); return; }
        if (key === 'Escape') { closeCommandInputModal(); return; }
        const action = state.actions.find(a => a.key === key && a.output);
        if (key === 'Backspace') handleModalKeyInputAction({ output: 'RESET' });
        else if (action && !state.pressedKeys.has(key)) { state.pressedKeys.add(key); handleModalKeyInputAction(action); }
        else if (['w', 'a', 's', 'd'].includes(key.toLowerCase()) && !state.pressedKeys.has(key.toLowerCase())) {
            const lowerKey = key.toLowerCase();
            state.pressedKeys.add(lowerKey); 
            updateModalDirection();

            if (state.enableDirectionalHold) {
                if (state.directionalHoldTimers[lowerKey]) {
                    clearTimeout(state.directionalHoldTimers[lowerKey]);
                }
                state.directionalHoldTimers[lowerKey] = setTimeout(() => {
                    handleDirectionalHold(lowerKey);
                }, state.directionalHoldFrames * 1000 / 60);
            }
        } else if (['c', 'f'].includes(key.toLowerCase()) && !state.pressedKeys.has(key.toLowerCase())) {
            state.pressedKeys.add(key.toLowerCase());
        }

        if (action && state.enableHoldAttack && state.holdAttackText.trim() !== '') {
            if (state.holdAttackTimer) {
                clearTimeout(state.holdAttackTimer);
            }
            state.holdAttackTimer = setTimeout(() => {
                if (state.committedCommands.length > 0) {
                    const lastCommandIndex = state.committedCommands.length - 1;
                    if (!state.committedCommands[lastCommandIndex].includes(state.holdAttackText)) {
                        state.committedCommands[lastCommandIndex] += ` ${state.holdAttackText}`;
                        updateCommittedCommandsList();
                    }
                }
                resetModalInputState({ keyToIgnore: key });
            }, state.holdAttackFrames * 1000 / 60);
        }
        return;
    }

    if (e.ctrlKey && key === 'Enter') {
        e.preventDefault();
        let targetInput = document.activeElement;

        // フォーカスがグリッド内の有効な入力セルでない場合、最初の空のセルを探す
        if (!targetInput || !targetInput.matches('#grid-container .form-input')) {
            targetInput = findFirstEmptyInput();
        }

        // それでもターゲットが見つからない場合（＝全部埋まっている場合）、新しいセルを作成
        if (!targetInput) {
            targetInput = createInputBox(state.totalInputs);
            reindexGrid();
        }
        
        openCommandInputModal(targetInput);
        return; // このキーイベントの処理はここで終了
    }

    if (e.ctrlKey && key.toLowerCase() === 's') {
        e.preventDefault();
        dom.saveComboButton.click();
    } else if (e.ctrlKey && key === 'Delete') {
        e.preventDefault();
        dom.gridContainer.querySelectorAll('input').forEach(input => { input.value = ''; input.style.color = ''; });
        updateMergedOutput();
    } else if (e.ctrlKey && key.toLowerCase() === 'c') {
        const activeTagName = activeElement.tagName.toLowerCase();
        if (activeTagName !== 'input' && activeTagName !== 'textarea') {
            e.preventDefault();
            dom.copyButton.click();
        }
    } else if (activeElement && activeElement.matches('#grid-container .form-input')) {
        const currentIndex = parseInt(activeElement.dataset.index);
        let nextIndex = -1;

        if (key === ' ' && e.ctrlKey) {
            e.preventDefault();
            const newBox = createInputBox(0);
            dom.gridContainer.insertBefore(newBox, activeElement);
            reindexGrid(); newBox.focus();
        } else if (key === 'Backspace' && e.ctrlKey) {
            e.preventDefault();
            if (dom.gridContainer.querySelectorAll('.form-input').length > 1) {
                const targetIndex = parseInt(activeElement.dataset.index);
                activeElement.remove(); reindexGrid();
                const nextFocus = dom.gridContainer.querySelector(`[data-index="${targetIndex}"]`) || dom.gridContainer.querySelector(`[data-index="${targetIndex - 1}"]`);
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

        if (nextIndex >= 0 && nextIndex < state.totalInputs) {
            const nextInput = dom.gridContainer.querySelector(`[data-index="${nextIndex}"]`);
            if (nextInput) { nextInput.focus(); nextInput.select(); }
        }
    }
}

/**
 * Handles keydown events for the player view.
 * @param {KeyboardEvent} e - The keyboard event.
 * @returns {void}
 */
function handlePlayerKeyDown(e) {
    if (!state.ytPlayer || typeof state.ytPlayer.getCurrentTime !== 'function') return;
    const activeElement = document.activeElement;
    if (activeElement === dom.youtubeUrlInput || activeElement === dom.memoInput || activeElement.classList.contains('memo-edit-input')) return;

    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        showView('editor');
        setTimeout(() => {
            let targetInput = findFirstEmptyInput();
            if (!targetInput) {
                targetInput = createInputBox(state.totalInputs);
                reindexGrid();
            }
            openCommandInputModal(targetInput);
        }, 50);
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const currentTime = state.ytPlayer.getCurrentTime();
        state.ytPlayer.seekTo(currentTime - 1, true);
    } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const currentTime = state.ytPlayer.getCurrentTime();
        state.ytPlayer.seekTo(currentTime + 1, true);
    } else if (e.code === 'Space') {
        e.preventDefault();
        const playerState = state.ytPlayer.getPlayerState();
        if (playerState === YT.PlayerState.PLAYING) {
            state.ytPlayer.pauseVideo();
        } else {
            state.ytPlayer.playVideo();
        }
    }
}

/**
 * Sets up global event listeners, such as popstate for browser navigation.
 */
function setupGlobalEventListeners() {
    dom.sidebarToggleButton.addEventListener('click', toggleSidebar);

    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.viewId) {
            showView(e.state.viewId, e.state.options || {}, true);
        } else {
            const initialViewId = state.viewOrder[0] || 'editor';
            showView(initialViewId, {}, true);
        }
    });

    window.addEventListener('keydown', (e) => {
        const key = e.key;
        const isConfirmModalOpen = !dom.confirmDeleteModalContainer.classList.contains('hidden');
        const isHistoryModalOpen = !dom.playbackHistoryModalContainer.classList.contains('hidden');
        const activeElement = document.activeElement;
        const isGamepadMappingModalOpen = !dom.gamepadMappingModalContainer.classList.contains('hidden');

        if (isGamepadMappingModalOpen && key === 'Escape') {
            cancelGamepadMappingSequence();
            return;
        }

        if (isHistoryModalOpen) {
            if (key === 'Escape') closePlaybackHistoryModal();
            return;
        }
        if (isConfirmModalOpen) {
            if (key === 'Escape') closeConfirmModal();
            if (key === 'Tab') {
                const focusableElements = [dom.confirmDeleteButton, dom.cancelDeleteButton];
                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];
                
                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
            return;
        }

        if (e.ctrlKey && e.key.toLowerCase() === 'q') {
            e.preventDefault();
            toggleSidebar();
            return;
        }

        if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
             if (activeElement.tagName !== 'INPUT' && activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (e.key === 'ArrowUp') {
                    state.currentViewIndex = (state.currentViewIndex - 1 + state.viewOrder.length) % state.viewOrder.length;
                } else {
                    state.currentViewIndex = (state.currentViewIndex + 1) % state.viewOrder.length;
                }
                showView(state.viewOrder[state.currentViewIndex]);
                return;
            }
        }

        if (!dom.editorView.classList.contains('hidden')) {
            handleEditorKeyDown(e);
        } else if (!dom.playerView.classList.contains('hidden')) {
            handlePlayerKeyDown(e);
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key;
        const lowerKey = key.toLowerCase();

        state.ignoredKeysUntilRelease.delete(key);
        state.ignoredKeysUntilRelease.delete(lowerKey);

        if (state.directionalHoldTimers[lowerKey]) {
            clearTimeout(state.directionalHoldTimers[lowerKey]);
            state.directionalHoldTimers[lowerKey] = null;
        }

        if (state.holdAttackTimer) {
            clearTimeout(state.holdAttackTimer);
            state.holdAttackTimer = null;
        }
        if (state.pressedKeys.has(key)) {
            state.pressedKeys.delete(key);
            if (!dom.commandInputModalContainer.classList.contains('hidden') && ['w', 'a', 's', 'd'].includes(lowerKey)) {
                updateModalDirection();
            }
            if (['c', 'f'].includes(lowerKey)) {
                state.pressedKeys.delete(lowerKey);
            }
        }
    });
}

/**
 * Sets up event listeners for all modal dialogs.
 */
function setupModalEventListeners() {
    // Generic helper for modal buttons to be activatable with Enter key
    const setupModalButton = (button) => {
        button.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.target.click();
            }
        });
    };

    setupModalButton(dom.confirmDeleteButton);
    setupModalButton(dom.cancelDeleteButton);

    dom.confirmDeleteButton.addEventListener('click', () => {
        if (typeof state.onConfirmDelete === 'function') {
            state.onConfirmDelete();
        }
        closeConfirmModal();
    });
    dom.cancelDeleteButton.addEventListener('click', closeConfirmModal);

    setupModalButton(dom.confirmMoveButton);
    setupModalButton(dom.cancelMoveButton);
    dom.cancelMoveButton.addEventListener('click', closeMoveRecordsModal);
    dom.confirmMoveButton.addEventListener('click', () => {
        if (typeof state.onConfirmMove === 'function') {
            const targetTable = dom.moveTargetTableSelect.value;
            if (targetTable) {
                state.onConfirmMove(targetTable);
            } else {
                alert('移動先のテーブルを選択してください。');
            }
        }
    });

    setupModalButton(dom.skipMappingButton);
    setupModalButton(dom.cancelMappingButton);
    dom.skipMappingButton.addEventListener('click', () => {
        if (state.gamepadMappingSequence) {
            // This is now handled in gamepad.js to avoid circular dependencies
            // A bit of a hack, but we can just simulate a click on the real handler
            // Or better, just call the function that does the work.
            // For now, let's assume gamepad.js handles this.
            // The logic is complex, let's centralize it in gamepad.js
        }
    });
    dom.cancelMappingButton.addEventListener('click', () => {
        cancelGamepadMappingSequence();
    });

    dom.confirmImportButton.addEventListener('click', () => {
        if (typeof state.onConfirmImport === 'function') {
            const selectedOptions = Array.from(dom.importOptionsList.querySelectorAll('input[name="import-option"]:checked')).map(input => input.value);
            state.onConfirmImport(selectedOptions);
        }
        closeImportOptionsModal();
    });
    dom.cancelImportButton.addEventListener('click', closeImportOptionsModal);
}

/**
 * Sets up event listeners for the settings page, including presets and editor settings.
 */
function setupSettingsEventListeners() {
    dom.resetSettingsButton.addEventListener('click', () => { 
        state.actions = JSON.parse(JSON.stringify(defaultActions)); 
        saveCurrentActions(); 
        // After resetting, we need to re-add default gamepad mappings
        // This is handled in loadCurrentActions, so we can just call it.
        // Or, better, just call populateSettingsPanel which reads the new state.
        populateSettingsPanel(); 
    });

    dom.savePresetButton.addEventListener('click', () => {
        const name = dom.presetNameInput.value.trim();
        if (name) {
            state.presets[name] = JSON.parse(JSON.stringify(state.actions));
            savePresets();
            populatePresetDropdown();
            dom.presetNameInput.value = '';
            dom.presetSelect.value = name;
        }
    });

    dom.presetSelect.addEventListener('change', (e) => {
        handlePresetChange(e.target.value);
    });

    dom.deletePresetButton.addEventListener('click', () => {
        const name = dom.presetSelect.value;
        if (Object.keys(DEFAULT_PRESETS).includes(name)) {
            alert(`デフォルトプリセット「${name}」は削除できません。`);
            return;
        }
        if (name && state.presets[name]) {
            delete state.presets[name];
            savePresets();
            populatePresetDropdown();
        }
    });

    dom.addActionButton.addEventListener('click', () => {
        state.actions.push({ id: `action-${Date.now()}`, output: 'NEW', key: '', color: '#FFFFFF', addNeutralFive: true });
        saveCurrentActions(); populateSettingsPanel();
    });
}

/**
 * Sets up event listeners for the main editor view.
 */
function setupEditorEventListeners() {
    dom.editorPresetSelect.addEventListener('change', (e) => {
        handlePresetChange(e.target.value);
    });

    dom.startCommandInputButton.addEventListener('click', () => {
        let targetInput = document.activeElement;

        // Check if the active element is a valid input in our grid
        if (!targetInput || !targetInput.matches('#grid-container .form-input')) {
            targetInput = findFirstEmptyInput();
        }

        // If still no target, create a new box
        if (!targetInput) {
            targetInput = createInputBox(state.totalInputs);
            reindexGrid();
        }

        openCommandInputModal(targetInput);
    });

    dom.resetButton.addEventListener('click', () => { 
        dom.gridContainer.querySelectorAll('input').forEach(input => { input.value = ''; input.style.color = ''; }); 
        updateMergedOutput(); 
    });

    // This button is in the editor view, but its functionality is in the database section
    dom.saveTableSelect.addEventListener('change', () => {
        renderEditorMetadataForm(dom.saveTableSelect.value);
    });

    dom.copyButton.addEventListener('click', async () => {
        const inputs = Array.from(dom.gridContainer.querySelectorAll('input'));
        const comboPlainText = inputs.map(input => input.value.trim()).filter(value => value !== '').join(' > ');
        if (comboPlainText) {
            await copyToClipboard(comboPlainText, dom.copyButton);
        }
    });

    dom.autoCommitCheckbox.addEventListener('change', () => { state.autoCommitOnAttack = dom.autoCommitCheckbox.checked; saveAutoCommitSetting(); });
    
    dom.enableHoldAttackCheckbox.addEventListener('change', () => {
        state.enableHoldAttack = dom.enableHoldAttackCheckbox.checked;
        saveHoldAttackSetting();
    });

    dom.holdAttackTextInput.addEventListener('input', () => {
        state.holdAttackText = dom.holdAttackTextInput.value;
        saveHoldAttackSetting();
    });

    dom.holdAttackDurationInput.addEventListener('input', () => {
        state.holdAttackFrames = parseInt(dom.holdAttackDurationInput.value, 10) || 30;
        saveHoldAttackSetting();
    });

    dom.enableDirectionalHoldCheckbox.addEventListener('change', () => {
        state.enableDirectionalHold = dom.enableDirectionalHoldCheckbox.checked;
        saveDirectionalHoldSetting();
    });

    dom.directionalHoldDurationInput.addEventListener('input', () => {
        state.directionalHoldFrames = parseInt(dom.directionalHoldDurationInput.value, 10) || 30;
        saveDirectionalHoldSetting();
    });

    dom.enablePrefixesCheckbox.addEventListener('change', () => {
        state.enablePrefixes = dom.enablePrefixesCheckbox.checked;
        savePrefixSetting();
    });

    dom.gridContainer.addEventListener('dragstart', (e) => { 
        if (e.target.matches('.form-input')) { 
            state.draggedItem = e.target; 
            setTimeout(() => e.target.classList.add('dragging'), 0); 
        } 
    });
    dom.gridContainer.addEventListener('dragend', (e) => { 
        if (e.target.matches('.form-input')) { 
            state.draggedItem.classList.remove('dragging'); 
            state.draggedItem = null; 
        } 
    });
    dom.gridContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const currentTarget = e.target.closest('.form-input');
        const lastTarget = state.lastDragOverTarget;

        // If we are over a new target, remove the style from the last one
        if (lastTarget && lastTarget !== currentTarget) {
            lastTarget.classList.remove('drag-over-grid');
        }

        if (currentTarget && state.draggedItem && currentTarget !== state.draggedItem) {
            currentTarget.classList.add('drag-over-grid');
            state.lastDragOverTarget = currentTarget;
        }
    });
    dom.gridContainer.addEventListener('dragleave', (e) => {
        // Only remove if the mouse is leaving the entire grid container
        if (e.target === dom.gridContainer) {
            state.lastDragOverTarget?.classList.remove('drag-over-grid');
            state.lastDragOverTarget = null;
        }
    });
    dom.gridContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        const dropTarget = e.target.closest('.form-input');
        if (dropTarget) {
            dropTarget.classList.remove('drag-over-grid');
        }
        state.lastDragOverTarget = null;
        if (dropTarget && state.draggedItem && state.draggedItem !== dropTarget) {
            if (parseInt(state.draggedItem.dataset.index) < parseInt(dropTarget.dataset.index)) dom.gridContainer.insertBefore(state.draggedItem, dropTarget.nextSibling);
            else dom.gridContainer.insertBefore(state.draggedItem, dropTarget);
            reindexGrid(); updateMergedOutput();
        }
    });

    dom.gridContainer.addEventListener('input', (e) => { if (e.target.matches('.form-input')) { e.target.style.color = ''; updateMergedOutput(); } });
    
    dom.saveComboButton.addEventListener('click', async () => {
        const comboHtml = dom.mergedOutput.innerHTML;
        const comboPlainText = dom.mergedOutput.textContent;
        const targetTable = dom.saveTableSelect.value;

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

        if (schema.columns.some(c => c.id === 'timestamp')) {
            newCombo.timestamp = new Date().toLocaleString('ja-JP');
        }

        const metadataInputs = dom.editorMetadataFormContainer.querySelectorAll('.metadata-input');
        metadataInputs.forEach(input => {
            newCombo[input.dataset.columnId] = input.value.trim();
        });

        if (schema.starterColumnId) {
            const starterMove = comboPlainText.split(' > ')[0].trim();
            if (starterMove) {
                newCombo[schema.starterColumnId] = starterMove;
            }
        }

        if (schema.creationDateColumnId) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0'); // 月は0から始まるため+1
            const dd = String(today.getDate()).padStart(2, '0');
            newCombo[schema.creationDateColumnId] = `${yyyy}-${mm}-${dd}`;
        }

        try {
            const newId = await window.db.addRecord(targetTable, newCombo);

            showToast('保存完了', 'success');

            // Clear inputs after successful save
            dom.gridContainer.querySelectorAll('input').forEach(input => { input.value = ''; input.style.color = ''; });
            updateMergedOutput();
            const metadataInputs = dom.editorMetadataFormContainer.querySelectorAll('.metadata-input');
            metadataInputs.forEach(input => {
                input.value = '';
            });

        } catch (error) {
            console.error(`Failed to save combo to ${targetTable}:`, error);
            showToast(`保存に失敗しました: ${error.message}`, 'error');
        }
    });
}

/**
 * Sets up event listeners for the player view.
 */
function setupPlayerEventListeners() {
    dom.youtubeLoadButton.addEventListener('click', loadYouTubeVideo);
    dom.addMemoButton.addEventListener('click', addMemo);
    dom.memoInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            dom.addMemoButton.click();
        }
    });
    dom.clearMemosButton.addEventListener('click', () => {
        if (state.memos.length > 0) {
            openConfirmModal('現在の動画のメモをすべて削除しますか？<br>この操作は取り消せません。', () => {
                state.memos = [];
                saveMemos();
                renderMemos();
            });
        }
    });

    dom.showPlaybackHistoryButton.addEventListener('click', openPlaybackHistoryModal);
    dom.closeHistoryModalButton.addEventListener('click', closePlaybackHistoryModal);
    dom.playbackHistoryModalContainer.addEventListener('click', (e) => {
        if (e.target === dom.playbackHistoryModalContainer) {
            closePlaybackHistoryModal();
        }
    });

    dom.historySearchInput.addEventListener('input', (e) => {
        renderPlaybackHistory(e.target.value);
    });
}

/**
 * Sets up event listeners for the data management section in settings.
 */
function setupDataManagementEventListeners() {
    dom.exportSettingsButton.addEventListener('click', exportAllSettings);
    dom.importSettingsButton.addEventListener('click', () => {
        dom.importSettingsInput.value = ''; // Reset file input to allow re-selecting the same file
        dom.importSettingsInput.click();
    });
    dom.importSettingsInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                openImportOptionsModal(data, importAllSettings);
            } catch (error) {
                alert(`ファイルの読み込みに失敗しました: ${error.message}`);
            }
        };
        reader.readAsText(file);
    });
}

/**
 * Sets up event listeners related to the database functionality.
 * This is mostly for elements that are part of other views but interact with the database.
 */
function setupDatabaseEventListeners() {
    const goToTableButton = document.createElement('button');
    goToTableButton.textContent = '移動';
    goToTableButton.title = '選択したテーブルを表示';
    goToTableButton.className = 'bg-gray-600 hover:bg-gray-500 text-white font-bold px-3 py-1 rounded-md text-sm flex-shrink-0';
    goToTableButton.addEventListener('click', () => {
        const tableName = dom.saveTableSelect.value;
        if (tableName) {
            showView('database', { tableName: tableName });
        } else {
            alert('テーブルが選択されていません。');
        }
    });
    dom.saveTableSelect.insertAdjacentElement('afterend', goToTableButton);
}

/**
 * Main function to set up all event listeners in the application.
 * It delegates to more specific setup functions.
 * @returns {void}
 */
export function setupEventListeners() {
    setupGlobalEventListeners();
    setupModalEventListeners();
    setupEditorEventListeners();
    setupSettingsEventListeners();
    setupPlayerEventListeners();
    setupDataManagementEventListeners();
    setupDatabaseEventListeners();
}
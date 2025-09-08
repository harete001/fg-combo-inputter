import { state } from './state.js';
import * as dom from './dom.js';
import { defaultActions } from './constants.js';
import { saveCurrentActions, savePresets, saveAutoCommitSetting, saveHoldAttackSetting, savePrefixSetting, saveSpreadsheetPresets, saveSpreadsheetSettings, saveSpreadsheetMemo, saveViewOrder, saveMemos, exportAllSettings, importAllSettings } from './storage.js';
import { showView, populateSettingsPanel, populatePresetDropdown, updateMergedOutput, reindexGrid, copyToClipboard, renderSpreadsheetView, populateSpreadsheetPresetDropdown, updateSpreadsheetOutput, renderSpreadsheetDataTable, findFirstEmptyInput, applyColorToInput, createInputBox, renderSidebar, addMemo, renderMemos, addSpreadsheetColumn, handleComboColumnChange, handleMemoColumnChange, copySpreadsheetData } from './ui.js';
import { openCommandInputModal, closeCommandInputModal, updateCommandModalPreview, updateCommittedCommandsList, openConfirmModal, closeConfirmModal, openPlaybackHistoryModal, closePlaybackHistoryModal, openMoveRecordsModal, closeMoveRecordsModal, renderPlaybackHistory } from './components/modals.js';
import { loadYouTubeVideo } from './youtube.js';
import { populateTableSelector, renderEditorMetadataForm } from './database_helpers.js';

function isCommandInputValid(buffer) {
    if (buffer.length === 0) return false;
    const attackOutputs = state.actions.map(a => a.output);
    const lastElement = buffer[buffer.length - 1];
    if (!attackOutputs.includes(lastElement)) return false;
    const attackCount = buffer.filter(cmd => attackOutputs.includes(cmd)).length;
    return attackCount <= 1;
}

function resetModalInputState(keyToAlsoIgnore = null) {
    state.commandBuffer = [];
    state.pressedKeys.forEach(k => {
        state.ignoredKeysUntilRelease.add(k);
        state.ignoredKeysUntilRelease.add(k.toLowerCase());
    });
    if (keyToAlsoIgnore) {
        state.ignoredKeysUntilRelease.add(keyToAlsoIgnore);
        state.ignoredKeysUntilRelease.add(keyToAlsoIgnore.toLowerCase());
    }
    state.pressedKeys.clear();
    state.previousDirectionState = '5';
    updateCommandModalPreview();
}

function commitSingleCommand(committingKey = null) {
    if (state.commandBuffer.length === 0) { if (!committingKey) resetModalInputState(); return; }
    if (!isCommandInputValid(state.commandBuffer)) {
        state.commandBuffer = [];
        dom.commandModalPreview.innerHTML = '<span class="text-yellow-400">不正な入力</span>';
        setTimeout(() => { updateCommandModalPreview(); }, 800);
        return;
    }
    let directions = state.commandBuffer.filter(cmd => !isNaN(parseInt(cmd))).join('');
    const attackOutputs = state.actions.map(a => a.output);
    const lastAttackOutput = state.commandBuffer.find(cmd => attackOutputs.includes(cmd));
    
    const lastAttackAction = state.actions.find(a => a.output === lastAttackOutput);

    if (directions.length === 0 && lastAttackAction) {
        if (lastAttackAction.addNeutralFive !== false) {
            directions = state.previousDirectionState;
        }
    }
    
    let commandToWrite = lastAttackOutput ? (directions.length > 1 ? `${directions} + ${lastAttackOutput}` : `${directions}${lastAttackOutput}`) : directions;

    if (state.enablePrefixes && lastAttackOutput) {
        const c_pressed = state.pressedKeys.has('c');
        const f_pressed = state.pressedKeys.has('f');
        if (c_pressed) {
            commandToWrite = `c.${commandToWrite}`;
        } else if (f_pressed) {
            commandToWrite = `f.${commandToWrite}`;
        }
    }

    if (commandToWrite !== '') state.committedCommands.push(commandToWrite);
    
    resetModalInputState(committingKey);
    updateCommittedCommandsList();
}

function finalizeAndWriteCommands() {
    commitSingleCommand(); 
    if (!state.activeCommandInputTarget || state.committedCommands.length === 0) {
        closeCommandInputModal(); return;
    }
    let currentTarget = state.activeCommandInputTarget;
    state.committedCommands.forEach((cmd, i) => {
        if (!currentTarget) currentTarget = createInputBox(state.totalInputs);
        currentTarget.value = cmd;
        applyColorToInput(currentTarget, cmd);
        if (i < state.committedCommands.length - 1) {
            const nextIndex = parseInt(currentTarget.dataset.index) + 1;
            currentTarget = dom.gridContainer.querySelector(`[data-index="${nextIndex}"]`);
        }
    });
    reindexGrid(); updateMergedOutput();
    closeCommandInputModal();
}

function handleModalKeyInputAction(command) {
    if (command.output === 'RESET') {
        if (state.commandBuffer.length > 0) state.commandBuffer = [];
        else if (state.committedCommands.length > 0) state.committedCommands.pop();
    } else {
        state.commandBuffer.push(command.output);
    }
    updateCommandModalPreview();
    if (state.autoCommitOnAttack && !command.isSystem && command.key) {
        commitSingleCommand(command.key);
    }
    updateCommittedCommandsList();
}

function updateModalDirection() {
    const isUp = state.pressedKeys.has('w'), isDown = state.pressedKeys.has('s'), isLeft = state.pressedKeys.has('a'), isRight = state.pressedKeys.has('d');
    let currentDirection = '5';
    if (isUp) currentDirection = isLeft ? '7' : (isRight ? '9' : '8');
    else if (isDown) currentDirection = isLeft ? '1' : (isRight ? '3' : '2');
    else currentDirection = isLeft ? '4' : (isRight ? '6' : '5');
    if (currentDirection !== '5' && currentDirection !== state.previousDirectionState) {
        state.commandBuffer.push(currentDirection);
        updateCommandModalPreview();
    }
    state.previousDirectionState = currentDirection;
}

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
        e.preventDefault();
        e.stopPropagation();
        if (key === 'Enter' && e.ctrlKey) { finalizeAndWriteCommands(); return; }
        if (key === 'Enter') { commitSingleCommand(); return; }
        if (key === 'Escape') { closeCommandInputModal(); return; }
        const action = state.actions.find(a => a.key === key);
        if (key === 'Backspace') handleModalKeyInputAction({ output: 'RESET' });
        else if (action && !state.pressedKeys.has(key)) { state.pressedKeys.add(key); handleModalKeyInputAction(action); }
        else if (['w', 'a', 's', 'd'].includes(key.toLowerCase()) && !state.pressedKeys.has(key.toLowerCase())) {
            state.pressedKeys.add(key.toLowerCase()); 
            updateModalDirection();
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
                resetModalInputState(key);
            }, state.holdAttackFrames * 1000 / 60);
        }
        return;
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

        if (key === 'Enter' && e.ctrlKey) { e.preventDefault(); openCommandInputModal(activeElement); }
        else if (key === ' ' && e.ctrlKey) {
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

function handleSpreadsheetKeyDown(e) {
    const key = e.key;
    const activeElement = document.activeElement;

    if (e.ctrlKey && key.toLowerCase() === 'c') {
        const activeTagName = activeElement.tagName.toLowerCase();
        if (activeTagName !== 'input' && activeTagName !== 'textarea') {
            e.preventDefault();
            copySpreadsheetData();
        }
    }
}

export function setupEventListeners() {
    window.addEventListener('popstate', (e) => {
        if (e.state && e.state.viewId) {
            showView(e.state.viewId, e.state.options || {}, true);
        } else {
            const initialViewId = state.viewOrder[0] || 'editor';
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

    dom.resetSettingsButton.addEventListener('click', () => { 
        state.actions = JSON.parse(JSON.stringify(defaultActions)); 
        saveCurrentActions(); 
        populateSettingsPanel(); 
    });

    dom.savePresetButton.addEventListener('click', () => {
        const name = dom.presetNameInput.value.trim();
        if (name) {
            state.presets[name] = {
                actions: JSON.parse(JSON.stringify(state.actions)),
                settings: {
                    autoCommitOnAttack: state.autoCommitOnAttack,
                    enableHoldAttack: state.enableHoldAttack,
                    holdAttackText: state.holdAttackText,
                    holdAttackFrames: state.holdAttackFrames,
                    enablePrefixes: state.enablePrefixes
                }
            };
            savePresets();
            populatePresetDropdown();
            dom.presetNameInput.value = '';
            dom.presetSelect.value = name;
        }
    });

    dom.presetSelect.addEventListener('change', (e) => {
        const name = e.target.value;
        if (name && state.presets[name]) {
            const loadedPreset = state.presets[name];

            if (Array.isArray(loadedPreset)) {
                state.actions = loadedPreset.map(a => ({ ...a, color: a.color || '#FFFFFF', addNeutralFive: a.addNeutralFive !== false }));
            } else {
                if (loadedPreset.actions) {
                    state.actions = loadedPreset.actions.map(a => ({ ...a, color: a.color || '#FFFFFF', addNeutralFive: a.addNeutralFive !== false }));
                }
                if (loadedPreset.settings) {
                    const s = loadedPreset.settings;
                    if (s.autoCommitOnAttack !== undefined) state.autoCommitOnAttack = s.autoCommitOnAttack;
                    if (s.enableHoldAttack !== undefined) state.enableHoldAttack = s.enableHoldAttack;
                    if (s.holdAttackText !== undefined) state.holdAttackText = s.holdAttackText;
                    if (s.holdAttackFrames !== undefined) state.holdAttackFrames = s.holdAttackFrames;
                    if (s.enablePrefixes !== undefined) state.enablePrefixes = s.enablePrefixes;

                    dom.autoCommitCheckbox.checked = state.autoCommitOnAttack;
                    dom.enableHoldAttackCheckbox.checked = state.enableHoldAttack;
                    dom.holdAttackTextInput.value = state.holdAttackText;
                    dom.holdAttackDurationInput.value = state.holdAttackFrames;
                    dom.enablePrefixesCheckbox.checked = state.enablePrefixes;
                }
            }

            saveCurrentActions();
            saveAutoCommitSetting();
            saveHoldAttackSetting();
            savePrefixSetting();
            
            populateSettingsPanel();
        }
    });

    dom.deletePresetButton.addEventListener('click', () => {
        const name = dom.presetSelect.value;
        if (name && state.presets[name]) { delete state.presets[name]; savePresets(); populatePresetDropdown(); }
    });

    dom.addActionButton.addEventListener('click', () => {
        state.actions.push({ id: `action-${Date.now()}`, output: 'NEW', key: '', color: '#FFFFFF', addNeutralFive: true });
        saveCurrentActions(); populateSettingsPanel();
    });

    dom.resetButton.addEventListener('click', () => { 
        dom.gridContainer.querySelectorAll('input').forEach(input => { input.value = ''; input.style.color = ''; }); 
        updateMergedOutput(); 
    });

    dom.copyButton.addEventListener('click', () => {
        const inputs = Array.from(dom.gridContainer.querySelectorAll('input'));
        const comboPlainText = inputs.map(input => input.value.trim()).filter(value => value !== '').join(' > ');
        if (comboPlainText) {
            copyToClipboard(comboPlainText, dom.copyButton);
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

    dom.enablePrefixesCheckbox.addEventListener('change', () => {
        state.enablePrefixes = dom.enablePrefixesCheckbox.checked;
        savePrefixSetting();
    });

    dom.gridContainer.addEventListener('dragstart', (e) => { if (e.target.matches('.form-input')) { state.draggedItem = e.target; setTimeout(() => e.target.classList.add('dragging'), 0); } });
    dom.gridContainer.addEventListener('dragend', (e) => { if (e.target.matches('.form-input')) { state.draggedItem.classList.remove('dragging'); state.draggedItem = null; } });
    dom.gridContainer.addEventListener('dragover', (e) => e.preventDefault());
    dom.gridContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.target.matches('.form-input') && state.draggedItem !== e.target) {
            const dropTarget = e.target;
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

        try {
            const newId = await window.db.addRecord(targetTable, newCombo);

            dom.saveComboButton.textContent = '保存完了！';
            dom.saveComboButton.classList.remove('bg-green-700', 'hover:bg-green-600');
            dom.saveComboButton.classList.add('bg-blue-600');
            setTimeout(() => {
                dom.saveComboButton.textContent = '保存';
                dom.saveComboButton.classList.remove('bg-blue-600');
                dom.saveComboButton.classList.add('bg-green-700', 'hover:bg-green-600');
            }, 1500);

        } catch (error) {
            console.error(`Failed to save combo to ${targetTable}:`, error);
            alert('コンボの保存に失敗しました。');
        }
    });

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

    dom.exportSettingsButton.addEventListener('click', exportAllSettings);
    dom.importSettingsButton.addEventListener('click', () => dom.importSettingsInput.click());
    dom.importSettingsInput.addEventListener('change', (e) => importAllSettings(e));

    dom.addSpreadsheetColumnButton.addEventListener('click', addSpreadsheetColumn);
    dom.comboColumnSelect.addEventListener('change', handleComboColumnChange);
    dom.memoColumnSelect.addEventListener('change', handleMemoColumnChange);
    dom.copySpreadsheetDataButton.addEventListener('click', copySpreadsheetData);
    dom.spreadsheetMemoInput.addEventListener('input', (e) => {
        state.spreadsheetMemo = e.target.value;
        saveSpreadsheetMemo();
        renderSpreadsheetDataTable();
        updateSpreadsheetOutput();
    });

    dom.saveSpreadsheetPresetButton.addEventListener('click', () => {
        const name = dom.spreadsheetPresetNameInput.value.trim();
        if (name) {
            state.spreadsheetPresets[name] = JSON.parse(JSON.stringify(state.spreadsheetColumns));
            saveSpreadsheetPresets();
            populateSpreadsheetPresetDropdown();
            dom.spreadsheetPresetNameInput.value = '';
            dom.spreadsheetPresetSelect.value = name;
        }
    });

    dom.spreadsheetPresetSelect.addEventListener('change', (e) => {
        const name = e.target.value;
        if (name && state.spreadsheetPresets[name]) {
            state.spreadsheetColumns = JSON.parse(JSON.stringify(state.spreadsheetPresets[name]));
            state.spreadsheetData = {};
            const currentColumnIds = state.spreadsheetColumns.map(c => c.id);
            if (!currentColumnIds.includes(state.comboColumnId)) {
                const defaultComboCol = state.spreadsheetColumns.find(c => c.header === 'コンボ');
                state.comboColumnId = defaultComboCol ? defaultComboCol.id : null;
            }
            if (!currentColumnIds.includes(state.memoColumnId)) {
                const defaultMemoCol = state.spreadsheetColumns.find(c => c.header === 'メモ');
                state.memoColumnId = defaultMemoCol ? defaultMemoCol.id : null;
            }
            saveSpreadsheetSettings();
            renderSpreadsheetView();
        }
    });

    dom.deleteSpreadsheetPresetButton.addEventListener('click', () => {
        const name = dom.spreadsheetPresetSelect.value;
        if (name && state.spreadsheetPresets[name]) {
            delete state.spreadsheetPresets[name];
            saveSpreadsheetPresets();
            populateSpreadsheetPresetDropdown();
        }
    });

    window.addEventListener('keydown', (e) => {
        const key = e.key;
        const isConfirmModalOpen = !dom.confirmDeleteModalContainer.classList.contains('hidden');
        const isHistoryModalOpen = !dom.playbackHistoryModalContainer.classList.contains('hidden');
        const activeElement = document.activeElement;

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
        } else if (!dom.spreadsheetView.classList.contains('hidden')) {
            handleSpreadsheetKeyDown(e);
        }
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key;
        const lowerKey = key.toLowerCase();

        state.ignoredKeysUntilRelease.delete(key);
        state.ignoredKeysUntilRelease.delete(lowerKey);

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

    dom.saveTableSelect.addEventListener('change', () => {
        renderEditorMetadataForm(dom.saveTableSelect.value);
    });

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
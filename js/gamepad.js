/**
 * @file Manages the Gamepad API for controller input.
 * @module gamepad
 */

import { state } from './state.js';
import * as dom from './dom.js';
import { LOG_PREFIX, GAMEPAD_SYSTEM_ACTIONS, DEFAULT_GAMEPAD_MAPPINGS } from './constants.js';
import { saveGamepadMappings, saveCurrentActions } from './storage.js';
import { populateSettingsPanel } from './ui.js';
import { openConfirmModal, openGamepadMappingModal, closeGamepadMappingModal, renderPlaybackHistory } from './components/modals.js';
import { commitSingleCommand, finalizeAndWriteCommands, handleModalKeyInputAction, updateModalDirection, resetModalInputState, updateCommittedCommandsList, handleDirectionalHold } from './command_modal.js';

/**
 * Renders the current status of connected gamepads to the UI.
 */
function renderGamepadStatus() {
    if (!dom.gamepadStatusContainer) return;

    dom.gamepadStatusContainer.innerHTML = '';
    const connectedGamepads = Object.values(state.gamepads).filter(g => g);

    if (connectedGamepads.length === 0) {
        dom.gamepadStatusContainer.innerHTML = '<p class="text-gray-500">コントローラーを接続してください...</p>';
        return;
    }

    connectedGamepads.forEach(gamepad => {
        const statusDiv = document.createElement('div');
        statusDiv.className = 'flex items-center justify-between p-3 bg-gray-700 rounded-md';

        const nameSpan = document.createElement('span');
        nameSpan.className = 'text-white font-mono text-sm';

        // Simplify the display name by removing text in parentheses
        let displayName = gamepad.id;
        const parenthesisIndex = displayName.indexOf('(');
        if (parenthesisIndex > 0) {
            displayName = displayName.substring(0, parenthesisIndex).trim();
        }
        nameSpan.textContent = displayName;

        const statusSpan = document.createElement('span');
        statusSpan.className = 'flex items-center gap-2 text-green-400 text-sm font-bold';
        statusSpan.innerHTML = '<span class="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span> 接続済み';

        statusDiv.appendChild(nameSpan);
        statusDiv.appendChild(statusSpan);
        dom.gamepadStatusContainer.appendChild(statusDiv);
    });
}

/**
 * Gets a human-readable name for a gamepad input identifier.
 * @param {string} identifier - The input identifier (e.g., 'button-0', 'axis-1-negative').
 * @returns {string} A human-readable string.
 */
export function getHumanReadableInputName(identifier) {
    if (!identifier) return '未割り当て';
    const parts = identifier.split('-');
    if (parts[0] === 'button') {
        return `ボタン ${parseInt(parts[1]) + 1}`;
    }
    if (parts[0] === 'axis') {
        const direction = parts[2] === 'positive' ? '+' : '-';
        return `軸 ${parseInt(parts[1]) + 1} (${direction})`;
    }
    return identifier;
}

/**
 * Shows a temporary message in the mapping modal prompt.
 * @param {string} message The message to display.
 * @param {boolean} isError If true, displays the message in red.
 */
function showTemporaryPromptMessage(message, isError = false) {
    const originalColorClass = 'text-yellow-300';
    const errorColorClass = 'text-red-400';

    if (isError) {
        dom.gamepadMappingPrompt.classList.remove(originalColorClass);
        dom.gamepadMappingPrompt.classList.add(errorColorClass);
    }
    dom.gamepadMappingPrompt.textContent = message;

    setTimeout(() => {
        if (dom.gamepadMappingPrompt.textContent === message) {
            dom.gamepadMappingPrompt.classList.remove(errorColorClass);
            dom.gamepadMappingPrompt.classList.add(originalColorClass);
            updateGamepadMappingPrompt(); // Revert to the current step's prompt
        }
    }, 1500);
}

/**
 * Updates the prompt in the gamepad mapping modal based on the current sequence state.
 */
export function updateGamepadMappingPrompt() {
    if (!state.gamepadMappingSequence) return;

    const { actions, currentIndex } = state.gamepadMappingSequence;
    if (currentIndex >= actions.length) {
        closeGamepadMappingModal();
        state.gamepadMappingsBackup = null; // Clear backup on successful completion
        saveGamepadMappings();
        renderSystemGamepadMappingUI();
        return;
    }

    const currentAction = actions[currentIndex];
    dom.gamepadMappingPrompt.textContent = `「${currentAction.name}」を入力`;
}

function startGamepadMappingSequence() {
    state.gamepadMappingsBackup = { ...state.gamepadMappings };
    state.gamepadMappings = {};
    state.gamepadIgnoredInputs.clear();

    state.gamepadMappingSequence = {
        actions: [...GAMEPAD_SYSTEM_ACTIONS],
        currentIndex: 0
    };
    renderSystemGamepadMappingUI();
    openGamepadMappingModal();
    updateGamepadMappingPrompt();
}

/**
 * Cancels the guided mapping sequence and restores previous mappings.
 */
export function cancelGamepadMappingSequence() {
    if (!state.gamepadMappingSequence) return;

    if (state.gamepadMappingsBackup) {
        state.gamepadMappings = state.gamepadMappingsBackup;
    }
    closeGamepadMappingModal();
    renderSystemGamepadMappingUI();
}

/**
 * Renders the UI for mapping gamepad buttons to system-level actions.
 */
export function renderSystemGamepadMappingUI() {
    if (!dom.gamepadMappingContainer) return;
    dom.gamepadMappingContainer.innerHTML = '';

    const headerContainer = document.createElement('div');
    headerContainer.className = 'flex justify-between items-center mb-4';
    const title = document.createElement('h3');
    title.className = 'text-xl font-semibold text-white';
    title.textContent = 'システム操作のマッピング';
    headerContainer.appendChild(title);

    const startSequenceButton = document.createElement('button');
    startSequenceButton.className = 'bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md';
    startSequenceButton.textContent = 'ガイド付き設定を開始';
    startSequenceButton.addEventListener('click', startGamepadMappingSequence);
    headerContainer.appendChild(startSequenceButton);

    dom.gamepadMappingContainer.appendChild(headerContainer);

    const mappingGrid = document.createElement('div');
    mappingGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4';

    GAMEPAD_SYSTEM_ACTIONS.forEach(action => {
        const mappingRow = document.createElement('div');
        mappingRow.className = 'flex justify-between items-center p-3 bg-gray-800 rounded-md';

        const actionName = document.createElement('span');
        actionName.className = 'text-gray-300 font-semibold';
        actionName.textContent = action.name;

        const controlGroup = document.createElement('div');
        controlGroup.className = 'flex items-center gap-2';

        const currentMapping = document.createElement('span');
        currentMapping.className = 'text-sm font-mono text-blue-300 w-28 text-right';
        currentMapping.textContent = getHumanReadableInputName(state.gamepadMappings[action.id]);

        const remapButton = document.createElement('button');
        remapButton.className = 'text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded-md transition-colors remap-button';
        mappingRow.dataset.actionId = action.id;
        remapButton.textContent = '割り当て';

        remapButton.addEventListener('click', () => {
            const isCurrentlyWaiting = state.isWaitingForGamepadInput && state.isWaitingForGamepadInput.actionId === action.id;

            if (state.isWaitingForGamepadInput && !isCurrentlyWaiting) {
                state.isWaitingForGamepadInput.element.textContent = '割り当て';
                state.isWaitingForGamepadInput.element.classList.remove('bg-yellow-500', 'hover:bg-yellow-400', 'animate-pulse');
            }

            if (isCurrentlyWaiting) {
                state.isWaitingForGamepadInput = null;
                remapButton.textContent = '割り当て';
                remapButton.classList.remove('bg-yellow-500', 'hover:bg-yellow-400', 'animate-pulse');
            } else {
                state.isWaitingForGamepadInput = { actionId: action.id, element: remapButton, isSystemAction: true };
                remapButton.textContent = '入力待機中...';
                remapButton.classList.add('bg-yellow-500', 'hover:bg-yellow-400', 'animate-pulse');
            }
        });

        controlGroup.appendChild(currentMapping);
        controlGroup.appendChild(remapButton);
        mappingRow.appendChild(actionName);
        mappingRow.appendChild(controlGroup);
        mappingGrid.appendChild(mappingRow);
    });

    dom.gamepadMappingContainer.appendChild(mappingGrid);

    const resetButtonContainer = document.createElement('div');
    resetButtonContainer.className = 'mt-6 text-center';
    const resetButton = document.createElement('button');
    resetButton.className = 'text-sm text-red-400 hover:text-red-300';
    resetButton.textContent = 'マッピングをデフォルトにリセット';
    resetButton.addEventListener('click', () => {
        openConfirmModal('現在のボタンマッピングをすべてリセットして、デフォルト設定に戻しますか？', () => {
            state.gamepadMappings = { ...DEFAULT_GAMEPAD_MAPPINGS };
            saveGamepadMappings();
            renderSystemGamepadMappingUI();
        });
    });
    resetButtonContainer.appendChild(resetButton);
    dom.gamepadMappingContainer.appendChild(resetButtonContainer);
}

/**
 * Handles the gamepad connection event.
 * @param {GamepadEvent} e The gamepad event.
 */
function handleGamepadConnected(e) {
    console.log(`${LOG_PREFIX} Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}.`);
    state.gamepads[e.gamepad.index] = e.gamepad;
    renderGamepadStatus();
    renderSystemGamepadMappingUI();
}

/**
 * Handles the gamepad disconnection event.
 * @param {GamepadEvent} e The gamepad event.
 */
function handleGamepadDisconnected(e) {
    console.log(`${LOG_PREFIX} Gamepad disconnected from index ${e.gamepad.index}: ${e.gamepad.id}.`);
    delete state.gamepads[e.gamepad.index];
    renderGamepadStatus();
    renderSystemGamepadMappingUI();
}

/**
 * Processes a detected gamepad input during the mapping sequence.
 * @param {string} identifier - The unique string for the detected input.
 */
function handleSequenceInput(identifier) {
    if (!state.gamepadMappingSequence) return;

    const { actions, currentIndex } = state.gamepadMappingSequence;
    const currentActionId = actions[currentIndex].id;

    // Unmap if this identifier is already used by another action
    const existingActionId = Object.keys(state.gamepadMappings).find(id => state.gamepadMappings[id] === identifier);
    if (existingActionId) {
        const existingAction = GAMEPAD_SYSTEM_ACTIONS.find(a => a.id === existingActionId);
        showTemporaryPromptMessage(`「${existingAction.name}」で既に使用されています`, true);
        return; // Do not map
    }

    state.gamepadMappings[currentActionId] = identifier;
    state.gamepadMappingSequence.currentIndex++;
    renderSystemGamepadMappingUI();
    updateGamepadMappingPrompt();
}

/**
 * Processes a detected gamepad input for mapping.
 * @param {string} identifier - The unique string for the detected input.
 */
function handleInputMapped(identifier) {
    if (!state.isWaitingForGamepadInput) return;

    const { actionId, element, isSystemAction } = state.isWaitingForGamepadInput;

    if (isSystemAction) {
        const existingActionId = Object.keys(state.gamepadMappings).find(id => state.gamepadMappings[id] === identifier);
        if (existingActionId && existingActionId !== actionId) {
            const existingAction = GAMEPAD_SYSTEM_ACTIONS.find(a => a.id === existingActionId);
            element.textContent = `「${existingAction.name}」で使用中`;
            element.classList.remove('bg-yellow-500', 'hover:bg-yellow-400', 'animate-pulse');
            element.classList.add('bg-red-600');
            setTimeout(() => {
                element.textContent = '割り当て';
                element.classList.remove('bg-red-600');
            }, 1500);
            state.isWaitingForGamepadInput = null;
            return;
        }
        state.gamepadMappings[actionId] = identifier;
        saveGamepadMappings();
        renderSystemGamepadMappingUI();
    } else {
        // Handle regular actions from the main table
        const actionToUpdate = state.actions.find(a => a.id === actionId);
        if (actionToUpdate) {
            // Unmap from any other action
            state.actions.forEach(a => {
                if (a.gamepadButton === identifier) {
                    delete a.gamepadButton;
                }
            });
            actionToUpdate.gamepadButton = identifier;
            saveCurrentActions();
            populateSettingsPanel();
        }
    }

    state.isWaitingForGamepadInput = null;
}

/**
 * Processes a gamepad press, routing it to mapping logic or visual feedback.
 * @param {string} identifier - The unique string for the detected input.
 */
function processGamepadPress(identifier) {
    // Part 1: Mapping Logic
    const isMappingActive = state.isWaitingForGamepadInput || state.gamepadMappingSequence;
    if (isMappingActive) {
        if (state.gamepadIgnoredInputs.has(identifier)) return;
        state.gamepadIgnoredInputs.add(identifier);

        if (state.isWaitingForGamepadInput) { handleInputMapped(identifier); return; }
        if (state.gamepadMappingSequence) { handleSequenceInput(identifier); return; }
        return;
    }

    // Part 2: Visual Feedback for existing mappings
    // Check system actions
    const reverseSystemMappings = Object.fromEntries(Object.entries(state.gamepadMappings).map(([k, v]) => [v, k]));
    const systemActionId = reverseSystemMappings[identifier];
    if (systemActionId) {
        const mappingRow = document.querySelector(`[data-action-id='${systemActionId}']`);
        if (mappingRow) {
            const buttonElement = mappingRow.querySelector('.remap-button');
            if (buttonElement) { buttonElement.classList.add('bg-green-500'); setTimeout(() => buttonElement.classList.remove('bg-green-500'), 250); }
        }
    }

    // Check user actions
    const userAction = state.actions.find(a => a.gamepadButton === identifier);
    if (userAction) {
        const actionRow = document.querySelector(`[data-action-id='${userAction.id}']`);
        if (actionRow) {
            const buttonElement = actionRow.querySelector('.gamepad-map-button');
            if (buttonElement) { buttonElement.classList.add('bg-green-500'); setTimeout(() => buttonElement.classList.remove('bg-green-500'), 250); }
        }
    }

    // Part 3: Command Modal Input
    const isCommandModalOpen = !dom.commandInputModalContainer.classList.contains('hidden');
    if (isCommandModalOpen) {
        // ユーザーアクション（P, K, Sなど）がマッピングされていれば、それを最優先で処理します。
        // これにより、システムアクション（COMMITなど）とボタンが重複していても、攻撃ボタンとして正しく入力されます。
        if (userAction) {
            handleModalKeyInputAction(userAction);

            // 長押し機能のロジック
            if (state.enableHoldAttack && state.holdAttackText.trim() !== '') {
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
                    resetModalInputState({ identifierToIgnore: identifier });
                }, state.holdAttackFrames * 1000 / 60);
            }
        } else if (systemActionId) {
            // ユーザーアクションが無く、システムアクションがマッピングされている場合のみ、そちらを処理します。
            switch (systemActionId) {
                case 'COMMIT':
                    commitSingleCommand();
                    break;
                case 'FINALIZE':
                    finalizeAndWriteCommands();
                    break;
                case 'RESET':
                    handleModalKeyInputAction({ output: 'RESET' });
                    break;
            }
        }
    }
}

/**
 * The main polling loop to check for gamepad inputs.
 */
function gamepadPollingLoop() {
    requestAnimationFrame(gamepadPollingLoop);
    const gamepads = navigator.getGamepads();
    if (!gamepads) return;

    for (const gamepad of gamepads) {
        if (!gamepad) continue;

        const previousGamepadState = state.previousGamepadStates[gamepad.index] || { buttons: [], axes: [] };
        const currentState = { buttons: [], axes: [] };

        // --- Directional Input for Modal (State Change Detection) ---
        const isCommandModalOpen = !dom.commandInputModalContainer.classList.contains('hidden');
        if (isCommandModalOpen) {
            const mapping = state.gamepadMappings;
            const directions = { w: mapping.UP, s: mapping.DOWN, a: mapping.LEFT, d: mapping.RIGHT };
            let directionChanged = false;

            for (const [key, mappingId] of Object.entries(directions)) {
                if (!mappingId) continue;

                const isAxis = mappingId.startsWith('axis-');
                const isPositive = isAxis && mappingId.endsWith('positive');
                const index = parseInt(mappingId.split('-')[1]);

                let isPressed, wasPressed;
                const threshold = 0.5;

                if (isAxis) {
                    const value = gamepad.axes[index];
                    const prevValue = previousGamepadState.axes[index] || 0;
                    isPressed = isPositive ? value > threshold : value < -threshold;
                    wasPressed = isPositive ? prevValue > threshold : prevValue < -threshold;
                } else { // button
                    isPressed = gamepad.buttons[index].pressed;
                    wasPressed = previousGamepadState.buttons[index] && previousGamepadState.buttons[index].pressed;
                }

                if (isPressed !== wasPressed) {
                    directionChanged = true;
                    if (isPressed) {
                        state.pressedKeys.add(key);

                        if (state.enableDirectionalHold) {
                            if (state.directionalHoldTimers[key]) {
                                clearTimeout(state.directionalHoldTimers[key]);
                            }
                            state.directionalHoldTimers[key] = setTimeout(() => {
                                handleDirectionalHold(key);
                            }, state.directionalHoldFrames * 1000 / 60);
                        }
                    } else {
                        state.pressedKeys.delete(key);
                        if (state.directionalHoldTimers[key]) {
                            clearTimeout(state.directionalHoldTimers[key]);
                            state.directionalHoldTimers[key] = null;
                        }
                    }
                }
            }

            if (directionChanged) {
                updateModalDirection();
            };
        }

        // --- Button Processing ---
        for (let i = 0; i < gamepad.buttons.length; i++) {
            const isPressed = gamepad.buttons[i].pressed;
            const wasPressed = previousGamepadState.buttons[i] && previousGamepadState.buttons[i].pressed;
            currentState.buttons[i] = { pressed: isPressed };
            const identifier = `button-${i}`;

            if (!isPressed && wasPressed) {
                state.gamepadIgnoredInputs.delete(identifier);

                // ボタンが離されたらタイマーをクリア
                if (state.holdAttackTimer) {
                    clearTimeout(state.holdAttackTimer);
                    state.holdAttackTimer = null;
                }
            } else if (isPressed && !wasPressed) {
                processGamepadPress(identifier);
            }
        }

        // --- Axis Processing ---
        for (let i = 0; i < gamepad.axes.length; i++) {
            const axisValue = gamepad.axes[i];
            const prevAxisValue = previousGamepadState.axes[i] || 0;
            currentState.axes[i] = axisValue;

            if (Math.abs(axisValue) <= 0.75 && Math.abs(prevAxisValue) > 0.75) {
                const prevDirection = prevAxisValue > 0 ? 'positive' : 'negative';
                const prevIdentifier = `axis-${i}-${prevDirection}`;
                state.gamepadIgnoredInputs.delete(prevIdentifier);
            } else if (Math.abs(axisValue) > 0.75 && Math.abs(prevAxisValue) <= 0.75) {
                const direction = axisValue > 0 ? 'positive' : 'negative';
                const identifier = `axis-${i}-${direction}`;
                processGamepadPress(identifier);
            }
        }

        state.previousGamepadStates[gamepad.index] = currentState;
    }
}

/**
 * Initializes the Gamepad API listeners and polling loop.
 */
export function initializeGamepad() {
    if (!navigator.getGamepads) {
        console.warn(`${LOG_PREFIX} Gamepad API not supported in this browser.`);
        return;
    }

    window.addEventListener('gamepadconnected', handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', handleGamepadDisconnected);

    dom.skipMappingButton.addEventListener('click', () => {
        if (state.gamepadMappingSequence) {
            state.gamepadMappingSequence.currentIndex++;
            updateGamepadMappingPrompt();
        }
    });

    dom.cancelMappingButton.addEventListener('click', () => {
        cancelGamepadMappingSequence();
    });

    renderGamepadStatus();
    renderSystemGamepadMappingUI();
    gamepadPollingLoop();
}
/**
 * @file Manages the logic for the command input modal, handling both keyboard and gamepad input.
 * @module command_modal
 */

import { state } from './state.js';
import * as dom from './dom.js';
import { applyColorToInput, updateMergedOutput, reindexGrid, createInputBox, getColorForCommand } from './ui.js';
import { closeCommandInputModal } from './components/modals.js';

/**
 * Updates the preview area of the command modal.
 */
export function updateCommandModalPreview() {
    dom.commandModalPreview.innerHTML = state.commandBuffer.length > 0 ? state.commandBuffer.join(' ') : `<span class="text-gray-500 recording-indicator">入力待機中...</span>`;
}

/**
 * Updates the list of committed commands in the modal.
 */
export function updateCommittedCommandsList() {
    if (state.committedCommands.length === 0) {
        dom.committedCommandsList.innerHTML = '';
        return;
    }
    const html = state.committedCommands.map(cmd => {
        const color = getColorForCommand(cmd);
        const style = color ? `style="color: ${color};"` : 'class="text-yellow-300"';
        return `<span ${style}>${cmd}</span>`;
    }).join(' <span class="text-gray-500">&gt;</span> ');
    dom.committedCommandsList.innerHTML = html;
}

/**
 * Checks if the current command buffer is valid to be committed.
 * @param {Array<string>} buffer The command buffer.
 * @returns {boolean} True if valid.
 */
export function isCommandInputValid(buffer) {
    if (buffer.length === 0) return false;
    const attackOutputs = state.actions.map(a => a.output);
    const lastElement = buffer[buffer.length - 1];
    if (!attackOutputs.includes(lastElement)) return false;
    const attackCount = buffer.filter(cmd => attackOutputs.includes(cmd)).length;
    return attackCount <= 1;
}

/**
 * Resets the state of the command input modal.
 * @param {object} [options={}] Options for resetting state.
 * @param {string|null} [options.keyToIgnore=null] A keyboard key to ignore until release.
 * @param {string|null} [options.identifierToIgnore=null] A gamepad input identifier to ignore until release.
 */
export function resetModalInputState(options = {}) {
    const { keyToIgnore = null, identifierToIgnore = null } = options;
    state.commandBuffer = [];
    state.pressedKeys.forEach(k => {
        state.ignoredKeysUntilRelease.add(k);
        state.ignoredKeysUntilRelease.add(k.toLowerCase());
    });
    if (keyToIgnore) {
        state.ignoredKeysUntilRelease.add(keyToIgnore);
        state.ignoredKeysUntilRelease.add(keyToIgnore.toLowerCase());
    }
    if (identifierToIgnore) {
        state.gamepadIgnoredInputs.add(identifierToIgnore);
    }
    state.pressedKeys.clear();
    state.previousDirectionState = '5';
    updateCommandModalPreview();
}

/**
 * Commits a single command from the buffer to the list of committed commands.
 * @param {string|null} [committingKey=null] The key that triggered the commit.
 */
export function commitSingleCommand(committingKey = null) {
    if (state.commandBuffer.length === 0) { if (!committingKey) resetModalInputState({ keyToIgnore: committingKey }); return; }
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
    
    resetModalInputState({ keyToIgnore: committingKey });
    updateCommittedCommandsList();
}

/**
 * Finalizes the command input process, writing all committed commands to the editor grid.
 */
export function finalizeAndWriteCommands() {
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

/**
 * Handles a key action within the command input modal.
 * @param {object} command - The action object corresponding to the pressed key.
 */
export function handleModalKeyInputAction(command) {
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

/**
 * Updates the direction in the command buffer based on which directional keys are pressed.
 */
export function updateModalDirection() {
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
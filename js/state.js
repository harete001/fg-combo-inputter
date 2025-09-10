/**
 * @file Centralized mutable state management for the application.
 * @module state
 */

import { keyMappingView, dataManagementView, gamepadSettingsView } from './dom.js';

/** @type {object} The single source of truth for the application's mutable state. */
export const state = {
    totalInputs: 0,
    draggedItem: null,
    previousDirectionState: '5',
    commandBuffer: [],
    committedCommands: [],
    pressedKeys: new Set(),
    activeCommandInputTarget: null,
    autoCommitOnAttack: true,
    enableHoldAttack: false,
    holdAttackText: '[hold]',
    holdAttackFrames: 30,
    holdAttackTimer: null,
    enableDirectionalHold: false,
    directionalHoldFrames: 30,
    directionalHoldTimers: {},
    ignoredKeysUntilRelease: new Set(),
    enablePrefixes: false,
    actions: [],
    presets: {},
    currentPresetName: null,
    onConfirmDelete: null,
    onConfirmMove: null,
    pendingImportData: null,
    onConfirmImport: null,
    ytPlayer: null,
    currentVideoId: null,
    memos: [],
    currentViewIndex: 0,
    viewOrder: [],
    playbackHistory: [],
    draggedColumnId: null,
    currentSettingsSubViewId: 'keyMapping',
    gamepadMappings: {},
    gamepadMappingSequence: null,
    gamepadMappingsBackup: null,
    gamepadIgnoredInputs: new Set(),
    previousGamepadStates: {},
    isWaitingForGamepadInput: null,
    gamepads: {},
    settingsSubViews: {
        keyMapping: { title: 'エディター', element: keyMappingView },
        gamepad: { title: 'コントローラー', element: gamepadSettingsView },
        dataManagement: { title: 'データの管理', element: dataManagementView },
    },
    currentSort: 'name-asc',
    isSidebarVisible: true,
};

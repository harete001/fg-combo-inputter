/**
 * @file Centralized mutable state management for the application.
 * @module state
 */

import { keyMappingView, dataManagementView } from './dom.js';

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
    ignoredKeysUntilRelease: new Set(),
    enablePrefixes: false,
    actions: [],
    presets: {},
    onConfirmDelete: null,
    onConfirmMove: null,
    ytPlayer: null,
    currentVideoId: null,
    memos: [],
    currentViewIndex: 0,
    viewOrder: [],
    playbackHistory: [],
    spreadsheetColumns: [],
    spreadsheetData: {},
    comboColumnId: null,
    memoColumnId: null,
    spreadsheetMemo: '',
    spreadsheetPresets: {},
    draggedColumnId: null,
    currentSettingsSubViewId: 'keyMapping',
    settingsSubViews: {
        keyMapping: { title: 'エディター', element: keyMappingView },
        dataManagement: { title: 'データの管理', element: dataManagementView },
    },
    currentSort: 'name-asc',
};

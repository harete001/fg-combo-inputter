/**
 * @file Defines constants used throughout the application.
 * @module constants
 */

/** @const {string} Prefix for console log messages. */
export const LOG_PREFIX = '[ComboEditor]';

/** @const {string} Default color for new actions. */
export const DEFAULT_COLOR = '#FFFFFF';

/** @const {number} The maximum number of items to store in the playback history. */
export const MAX_PLAYBACK_HISTORY = 50;

/** @const {Object<string, Array<object>>} A collection of default action presets. */
export const DEFAULT_PRESETS = {
    'デフォルト設定': [
        { id: 'ggst-1', output: 'P', key: 'j', color: '#FFA3EE', addNeutralFive: true },
        { id: 'ggst-2', output: 'K', key: 'k', color: '#2E89FF', addNeutralFive: true },
        { id: 'ggst-3', output: 'S', key: 'l', color: '#42FF7B', addNeutralFive: true },
        { id: 'ggst-4', output: 'HS', key: 'm', color: '#FF4747', addNeutralFive: true },
        { id: 'ggst-5', output: 'D', key: ',', color: '#FFA742', addNeutralFive: true },
        { id: 'ggst-6', output: 'RC', key: ':', color: '#FFFFFF', addNeutralFive: false },
        { id: 'ggst-7', output: 'dc', key: ';', color: '#FFFFFF', addNeutralFive: false },
        { id: 'ggst-8', output: 'dcc', key: '7', color: '#FFFFFF', addNeutralFive: false },
        { id: 'ggst-9', output: 'jc', key: '8', color: '#FFFFFF', addNeutralFive: false },
        { id: 'ggst-10', output: 'adc', key: '9', color: '#FFFFFF', addNeutralFive: false },
    ],
    '2XKO': [
        { id: '2xko-1', output: 'L',  key: 'j', color: '#D4A8FF', addNeutralFive: true, gamepadButton: 'button-2' },
        { id: '2xko-2', output: 'M',  key: 'k', color: '#BB74EF', addNeutralFive: true, gamepadButton: 'button-0' },
        { id: '2xko-3', output: 'H',  key: 'l', color: '#9125F9', addNeutralFive: true, gamepadButton: 'button-1' },
        { id: '2xko-4', output: 'S1', key: 'm', color: '#3EC5FF', addNeutralFive: true, gamepadButton: 'button-3' },
        { id: '2xko-5', output: 'S2', key: ',', color: '#FF4646', addNeutralFive: true, gamepadButton: 'button-5' },
        { id: '2xko-6', output: 'T',  key: 'e', color: '#CDF564', addNeutralFive: false, gamepadButton: 'button-4' },
        { id: '2xko-7', output: '1U', key: 'u', color: '#FFFFFF', addNeutralFive: false },
        { id: '2xko-8', output: '2U', key: 'i', color: '#FFFFFF', addNeutralFive: false },
        { id: '2xko-9', output: '3U', key: 'o', color: '#FFFFFF', addNeutralFive: false },
        { id: '2xko-10', output: 'adc',key: '9', color: '#FFFFFF', addNeutralFive: false },
    ]
};

/** @const {Array<object>} The default set of actions for the combo editor, used as a fallback. */
export const defaultActions = DEFAULT_PRESETS['デフォルト設定'];

/** @const {Object<string, {title: string}>} Details for each view, used for titles and navigation. */
export const viewDetails = {
    editor: {
        title: 'エディター',
        icon: `<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.586a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>`
    },
    database: {
        title: 'データベース',
        icon: `<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8-4" /></svg>`
    },
    'create-table': { title: 'テーブル作成' },
    'edit-table': { title: 'テーブル設定' },
    settings: {
        title: '設定',
        icon: `<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`
    },
};

/** @const {Array<object>} The list of system-level actions that can be mapped to a gamepad. */
export const GAMEPAD_SYSTEM_ACTIONS = [
    { id: 'UP', name: '上' },
    { id: 'DOWN', name: '下' },
    { id: 'LEFT', name: '左' },
    { id: 'RIGHT', name: '右' },
    { id: 'COMMIT', name: 'コマンド追加 (Enter)' },
    { id: 'FINALIZE', name: '全て確定 (Ctrl+Enter)' },
    { id: 'RESET', name: 'リセット/戻る (Backspace)' },
];

/** @const {object} The default gamepad mappings for system actions, based on the Standard Gamepad layout. */
export const DEFAULT_GAMEPAD_MAPPINGS = {
    'UP': 'button-12', 'DOWN': 'button-13', 'LEFT': 'button-14', 'RIGHT': 'button-15',
    'RESET': 'button-6',// LT / L2
    'COMMIT': 'button-7',// RT / R2
    'FINALIZE': 'button-9', // Start / Options
};

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

/** @const {Array<object>} The default set of actions for the combo editor. */
export const defaultActions = [
    { id: `action-${Date.now()}-1`, output: 'P', key: 'j', color: '#FFA3EE', addNeutralFive: true },
    { id: `action-${Date.now()}-2`, output: 'K', key: 'k', color: '#2E89FF', addNeutralFive: true },
    { id: `action-${Date.now()}-3`, output: 'S', key: 'l', color: '#42FF7B', addNeutralFive: true },
    { id: `action-${Date.now()}-4`, output: 'HS', key: 'm', color: '#FF4747', addNeutralFive: true },
    { id: `action-${Date.now()}-5`, output: 'D', key: ',', color: '#FFA742', addNeutralFive: true },
    { id: `action-${Date.now()}-6`, output: 'RC', key: ':', color: '#FFFFFF', addNeutralFive: false },
    { id: `action-${Date.now()}-7`, output: 'dc', key: ';', color: '#FFFFFF', addNeutralFive: false },
    { id: `action-${Date.now()}-8`, output: 'dcc', key: '7', color: '#FFFFFF', addNeutralFive: false },
    { id: `action-${Date.now()}-9`, output: 'jc', key: '8', color: '#FFFFFF', addNeutralFive: false },
    { id: `action-${Date.now()}-10`, output: 'adc', key: '9', color: '#FFFFFF', addNeutralFive: false },
];

/** @const {Object<string, {title: string}>} Details for each view, used for titles and navigation. */
export const viewDetails = {
    editor: { title: 'エディター' },
    database: { title: 'データベース' },
    'create-table': { title: 'テーブル作成' },
    'edit-table': { title: 'テーブル設定' },
    spreadsheet: { title: 'スプレッドシート' },
    settings: { title: '設定' },
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

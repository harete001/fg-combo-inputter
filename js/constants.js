export const LOG_PREFIX = '[ComboEditor]';
export const DEFAULT_COLOR = '#FFFFFF';

export const defaultActions = [
    { id: `action-${Date.now()}-1`, output: 'P', key: 'j', color: '#FFA3EE', addNeutralFive: true },
    { id: `action-${Date.now()}-2`, output: 'K', key: 'k', color: '#006EFF', addNeutralFive: true },
    { id: `action-${Date.now()}-3`, output: 'S', key: 'l', color: '#42FF7B', addNeutralFive: true },
    { id: `action-${Date.now()}-4`, output: 'HS', key: 'm', color: '#FF4747', addNeutralFive: true },
    { id: `action-${Date.now()}-5`, output: 'D', key: ',', color: '#FFA742', addNeutralFive: true },
    { id: `action-${Date.now()}-6`, output: 'RC', key: ':', color: '#FFFFFF', addNeutralFive: false },
    { id: `action-${Date.now()}-7`, output: 'dc', key: ';', color: '#FFFFFF', addNeutralFive: false },
    { id: `action-${Date.now()}-8`, output: 'dcc', key: '7', color: '#FFFFFF', addNeutralFive: false },
    { id: `action-${Date.now()}-9`, output: 'jc', key: '8', color: '#FFFFFF', addNeutralFive: false },
    { id: `action-${Date.now()}-10`, output: 'adc', key: '9', color: '#FFFFFF', addNeutralFive: false },
];

export const viewDetails = {
    editor: { title: 'エディター' },
    database: { title: 'データベース' },
    'create-table': { title: 'テーブル作成' },
    'edit-table': { title: 'テーブル設定' },
    spreadsheet: { title: 'スプレッドシート' },
    settings: { title: '設定' },
};

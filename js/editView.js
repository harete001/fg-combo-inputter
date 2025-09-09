/**
 * @file Renders the view for editing an existing database table's schema and settings.
 * @module editView
 */

import { state } from './state.js';
import * as dom from './dom.js';
import { showView } from './ui.js';
import { createTableEditorComponent } from './components/table_editor.js';
import { handleUpdateSchema } from './database_helpers.js';

/**
 * Renders the view for editing a table's schema.
 * @param {string} tableName - The name of the table to edit.
 * @returns {Promise<void>}
 */
export const renderEditTableView = async (tableName) => {
    if (!tableName) {
        dom.editTableView.innerHTML = `<p class="text-red-500">エラー: 対象のテーブルが指定されていません。データベース一覧に戻ってください。</p>`;
        return;
    }

    dom.editTableView.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'flex items-center mb-6';

    const backButton = document.createElement('button');
    backButton.innerHTML = '&larr; テーブル表示に戻る';
    backButton.className = 'text-blue-400 hover:text-blue-300 font-bold';
    backButton.addEventListener('click', () => showView('database', { tableName }));

    const headerTitle = document.createElement('h1');
    headerTitle.textContent = `テーブル設定: ${tableName}`;
    headerTitle.className = 'text-3xl font-bold ml-4';
    header.appendChild(backButton);
    header.appendChild(headerTitle);

    const createSettingRow = (id, labelText) => {
        const container = document.createElement('div');
        container.className = 'flex items-center gap-2';
        const label = document.createElement('label');
        label.htmlFor = id;
        label.textContent = `${labelText}：`;
        label.className = 'text-lg text-white flex-shrink-0';
        const select = document.createElement('select');
        select.id = id;
        select.className = 'form-select w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2';
        container.appendChild(label);
        container.appendChild(select);
        return { container, select };
    };

    const settingsGrid = document.createElement('div');
    settingsGrid.className = 'grid grid-cols-1 gap-y-4 mb-8 bg-gray-800 p-4 rounded-lg border border-gray-700';

    const { container: presetContainer, select: presetSelect } = createSettingRow('table-preset-selector', 'コンボ列のカラーリングプリセット');
    const { container: comboContainer, select: comboColumnSelect } = createSettingRow('table-combo-column-selector', 'コンボを保存する列 (コンボ列)');
    const { container: starterContainer, select: starterColumnSelect } = createSettingRow('table-starter-column-selector', '始動技を表示する列');
    const { container: creationDateContainer, select: creationDateColumnSelect } = createSettingRow('table-creation-date-column-selector', '作成日を記録する列');
    const { container: uniqueNumberContainer, select: uniqueNumberColumnSelect } = createSettingRow('table-unique-number-column-selector', '連番を記録する列');

    settingsGrid.appendChild(presetContainer);
    settingsGrid.appendChild(comboContainer);
    settingsGrid.appendChild(starterContainer);
    settingsGrid.appendChild(creationDateContainer);
    settingsGrid.appendChild(uniqueNumberContainer);

    const editorTitle = document.createElement('h2');
    editorTitle.textContent = '列の定義';
    editorTitle.className = 'text-lg font-semibold text-white mb-2';
    const editorSubTitle = document.createElement('p');
    editorSubTitle.textContent = '列名の変更や、「コンボ列」の指定ができます。';
    editorSubTitle.className = 'text-sm text-gray-400 mb-3';

    const editorContainer = document.createElement('div');
    editorContainer.id = 'edit-table-editor-container';
    editorContainer.className = 'bg-gray-800 p-4 rounded-lg border border-gray-700';

    const addColumnButton = document.createElement('button');
    addColumnButton.className = 'bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md';
    addColumnButton.textContent = '列を追加';

    const saveButton = document.createElement('button');
    saveButton.textContent = '設定を保存';
    saveButton.className = 'bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md';

    const schema = await window.db.getSchema(tableName);
    if (!schema) {
        dom.editTableView.innerHTML = '<p class="text-red-500">スキーマの読み込みに失敗しました。</p>';
        return;
    }

    presetSelect.innerHTML = '<option value="">デフォルト (現在のキーマップ)</option>';
    Object.keys(state.presets).forEach(presetName => {
        const option = document.createElement('option');
        option.value = presetName;
        option.textContent = presetName;
        presetSelect.appendChild(option);
    });
    presetSelect.value = schema.coloringPresetName || '';

    const populateDropdown = (select, columns, selectedId, emptyOptionText) => {
        select.innerHTML = emptyOptionText ? `<option value="">${emptyOptionText}</option>` : '';
        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column.id;
            option.textContent = column.name;
            select.appendChild(option);
        });
        if (selectedId && columns.some(c => c.id === selectedId)) {
            select.value = selectedId;
        }
    };
    populateDropdown(comboColumnSelect, schema.columns, schema.comboColumnId);
    populateDropdown(starterColumnSelect, schema.columns, schema.starterColumnId, '(なし)');
    populateDropdown(creationDateColumnSelect, schema.columns, schema.creationDateColumnId, '(なし)');
    populateDropdown(uniqueNumberColumnSelect, schema.columns, schema.uniqueNumberColumnId, '(なし)');

    starterColumnSelect.innerHTML = '<option value=""> (なし)</option>';
    schema.columns.forEach(column => {
        const option = document.createElement('option');
        option.value = column.id;
        option.textContent = column.name;
        starterColumnSelect.appendChild(option);
    });
    starterColumnSelect.value = schema.starterColumnId || '';

    let tempColumns = JSON.parse(JSON.stringify(schema.columns)).map(c => ({ id: c.id, header: c.name }));

    const renderEditor = () => {
        createTableEditorComponent(editorContainer, {
            columns: tempColumns,
            data: {},
            showDataRow: false,
            onStateChange: (newState) => {
                tempColumns = newState.columns;
                const tempColumnObjects = tempColumns.map(c => ({ id: c.id, name: c.header }));
                populateDropdown(comboColumnSelect, tempColumnObjects, comboColumnSelect.value);
                populateDropdown(starterColumnSelect, tempColumnObjects, starterColumnSelect.value, '(なし)');
                populateDropdown(creationDateColumnSelect, tempColumnObjects, creationDateColumnSelect.value, '(なし)');
                populateDropdown(uniqueNumberColumnSelect, tempColumnObjects, uniqueNumberColumnSelect.value, '(なし)');
                renderEditor();
            },
            onDataChange: () => {}
        });
    };

    addColumnButton.addEventListener('click', () => {
        const newId = `col_${Date.now()}`;
        tempColumns.push({ id: newId, header: '' });
        renderEditor();
    });

    const bottomControls = document.createElement('div');
    bottomControls.className = 'flex justify-start items-center gap-4 mt-6';
    bottomControls.appendChild(addColumnButton);
    bottomControls.appendChild(saveButton);

    saveButton.addEventListener('click', async () => {
        saveButton.disabled = true;
        const selectedPreset = presetSelect.value;
        const selectedComboColumn = comboColumnSelect.value;
        const selectedStarterColumn = starterColumnSelect.value;
        const selectedCreationDateColumn = creationDateColumnSelect.value;
        const selectedUniqueNumberColumn = uniqueNumberColumnSelect.value;
        const success = await handleUpdateSchema(tableName, tempColumns, selectedComboColumn, selectedPreset, selectedStarterColumn, selectedCreationDateColumn, selectedUniqueNumberColumn);
        if (success) {
            showView('database', { tableName });
        } else {
            saveButton.disabled = false;
        }
    });

    dom.editTableView.appendChild(header);
    dom.editTableView.appendChild(settingsGrid);
    dom.editTableView.appendChild(editorTitle);
    dom.editTableView.appendChild(editorSubTitle);
    dom.editTableView.appendChild(editorContainer);
    dom.editTableView.appendChild(bottomControls);

    renderEditor();
};
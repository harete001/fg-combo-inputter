/**
 * @file Renders the view for creating a new database table.
 * @module createView
 */

import * as dom from './dom.js';
import { showView } from './ui.js';
import { createTableEditorComponent } from './components/table_editor.js';
import { populateTableSelector } from './database_helpers.js';

/**
 * Renders the UI for creating a new database table.
 * This includes the table name input, column editor, and save functionality.
 * @returns {void}
 */
export const renderCreateTableView = () => {
    dom.createTableView.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'flex items-center mb-6';
    const backButton = document.createElement('button');
    backButton.innerHTML = '&larr; データベース一覧に戻る';
    backButton.className = 'text-blue-400 hover:text-blue-300 font-bold';
    const headerTitle = document.createElement('h1');
    headerTitle.textContent = '新規データベース・テーブル作成';
    headerTitle.className = 'text-3xl font-bold ml-4';
    header.appendChild(backButton);
    header.appendChild(headerTitle);

    const nameDiv = document.createElement('div');
    nameDiv.className = 'mb-6';
    const nameLabel = document.createElement('label');
    nameLabel.htmlFor = 'new-table-name-input';
    nameLabel.textContent = 'テーブル名';
    nameLabel.className = 'block text-lg font-semibold text-white mb-2';
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'new-table-name-input';
    nameInput.className = 'form-input w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2';
    nameInput.placeholder = '例: my_favorite_combos';
    nameDiv.appendChild(nameLabel);
    nameDiv.appendChild(nameInput);

    const comboColumnContainer = document.createElement('div');
    comboColumnContainer.className = 'mb-6';
    const comboColumnLabel = document.createElement('label');
    comboColumnLabel.htmlFor = 'new-table-combo-column-selector';
    comboColumnLabel.textContent = 'コンボを保存する列 (コンボ列)';
    comboColumnLabel.className = 'block text-lg font-semibold text-white mb-2';
    const comboColumnSelect = document.createElement('select');
    comboColumnSelect.id = 'new-table-combo-column-selector';
    comboColumnSelect.className = 'form-select w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2';
    comboColumnContainer.appendChild(comboColumnLabel);
    comboColumnContainer.appendChild(comboColumnSelect);

    const creationDateColumnContainer = document.createElement('div');
    creationDateColumnContainer.className = 'mb-6';
    const creationDateColumnLabel = document.createElement('label');
    creationDateColumnLabel.htmlFor = 'new-table-creation-date-column-selector';
    creationDateColumnLabel.textContent = '作成日を記録する列';
    creationDateColumnLabel.className = 'block text-lg font-semibold text-white mb-2';
    const creationDateColumnSelect = document.createElement('select');
    creationDateColumnSelect.id = 'new-table-creation-date-column-selector';
    creationDateColumnSelect.className = 'form-select w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2';
    creationDateColumnContainer.appendChild(creationDateColumnLabel);
    creationDateColumnContainer.appendChild(creationDateColumnSelect);

    const uniqueNumberColumnContainer = document.createElement('div');
    uniqueNumberColumnContainer.className = 'mb-6';
    const uniqueNumberColumnLabel = document.createElement('label');
    uniqueNumberColumnLabel.htmlFor = 'new-table-unique-number-column-selector';
    uniqueNumberColumnLabel.textContent = '連番を記録する列';
    uniqueNumberColumnLabel.className = 'block text-lg font-semibold text-white mb-2';
    const uniqueNumberColumnSelect = document.createElement('select');
    uniqueNumberColumnSelect.id = 'new-table-unique-number-column-selector';
    uniqueNumberColumnSelect.className = 'form-select w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2';
    uniqueNumberColumnContainer.appendChild(uniqueNumberColumnLabel);
    uniqueNumberColumnContainer.appendChild(uniqueNumberColumnSelect);

    const editorTitle = document.createElement('h2');
    editorTitle.textContent = '列の定義';
    editorTitle.className = 'text-lg font-semibold text-white mb-2';
    const editorSubTitle = document.createElement('p');
    editorSubTitle.textContent = '「コンボ列」に指定した列に、エディターのコンボ内容が保存されます。';
    editorSubTitle.className = 'text-sm text-gray-400 mb-3';

    const editorContainer = document.createElement('div');
    editorContainer.id = 'create-table-editor-container';

    const addColumnButton = document.createElement('button');
    addColumnButton.className = 'bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md';
    addColumnButton.textContent = '列を追加';

    const saveButton = document.createElement('button');
    saveButton.id = 'confirm-create-table-from-view-button';
    saveButton.textContent = 'この内容でテーブルを作成';
    saveButton.className = 'bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md';

    let tempColumns = [
        {id: `col_${Date.now()}_1`, header: 'No.'},
        {id: `col_${Date.now()}_2`, header: 'キャラ'},
        {id: `col_${Date.now()}_3`, header: '種類'},
        {id: `col_${Date.now()}_4`, header: '消費'},
        {id: `col_${Date.now()}_5`, header: '位置'},
        {id: `col_${Date.now()}_6`, header: '始動技'},
        {id: `col_${Date.now()}_7`, header: 'CH'},
        {id: `col_${Date.now()}_8`, header: '内容'},
        {id: `col_${Date.now()}_9`, header: 'メモ'},
        {id: `col_${Date.now()}_10`, header: 'リンク'},
        {id: `col_${Date.now()}_11`, header: '日付'}
    ];

    const populateColumnDropdown = (select, columns, selectedId, emptyOptionText) => {
        select.innerHTML = emptyOptionText ? `<option value="">${emptyOptionText}</option>` : '';
        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column.id;
            option.textContent = column.name;
            select.appendChild(option);
        });
        if (selectedId && columns.some(c => c.id === selectedId)) {
            select.value = selectedId;
        } else if (!emptyOptionText && columns.length > 0) {
            select.value = columns[0].id;
        }
    };

    const render = () => {
        const tempColumnObjects = tempColumns.map(c => ({ id: c.id, name: c.header }));
        populateColumnDropdown(comboColumnSelect, tempColumnObjects, comboColumnSelect.value);
        populateColumnDropdown(creationDateColumnSelect, tempColumnObjects, creationDateColumnSelect.value, '(なし)');
        populateColumnDropdown(uniqueNumberColumnSelect, tempColumnObjects, uniqueNumberColumnSelect.value, '(なし)');
        createTableEditorComponent(editorContainer, {
            columns: tempColumns,
            data: {},
            showDataRow: false,
            onStateChange: (newState) => {
                tempColumns = newState.columns;
                render();
            },
            onDataChange: () => {}
        });
    };

    addColumnButton.addEventListener('click', () => {
        const newId = `col_${Date.now()}`;
        tempColumns.push({ id: newId, header: '' });
        render();
    });

    backButton.addEventListener('click', () => showView('database'));

    const bottomControls = document.createElement('div');
    bottomControls.className = 'flex justify-start items-center gap-4 mt-6';
    bottomControls.appendChild(addColumnButton);
    bottomControls.appendChild(saveButton);

    saveButton.addEventListener('click', async () => {
        const tableName = nameInput.value.trim();
        if (!tableName) {
            alert('テーブル名を入力してください。');
            return;
        }

        const comboColumnId = comboColumnSelect.value;
        const creationDateColumnId = creationDateColumnSelect.value;
        const uniqueNumberColumnId = uniqueNumberColumnSelect.value;
        if (!comboColumnId) {
            alert('コンボ内容を保存する列を1つ選択してください。');
            return;
        }

        const columns = tempColumns.map(col => ({
            id: col.id,
            name: col.header.trim()
        }));

        if (columns.some(c => !c.name)) {
            alert('名前が空の列があります。');
            return;
        }
        if (columns.length === 0) {
            alert('少なくとも1つ列を定義してください。');
            return;
        }

        const allSchemas = await window.db.getAllSchemas();
        if (allSchemas.some(s => s.tableName.toLowerCase() === tableName.toLowerCase())) {
            alert('同じ名前のテーブルが既に存在します。');
            return;
        }

        const newSchema = {
            tableName,
            columns,
            comboColumnId: comboColumnId,
            creationDateColumnId: creationDateColumnId || null,
            uniqueNumberColumnId: uniqueNumberColumnId || null,
            recordCount: 0,
            lastUpdated: new Date().toISOString(),
        };

        try {
            saveButton.disabled = true;
            saveButton.textContent = '作成中...';

            localStorage.setItem('pendingSchema', JSON.stringify(newSchema));
            await window.db.openDB(window.db.version + 1);

            alert(`テーブル「${tableName}」を作成しました。`);
            await populateTableSelector();
            showView('database');

        } catch (error) {
            console.error('Failed to create new table:', error);
            alert(`テーブルの作成に失敗しました: ${error.message}`);
            localStorage.removeItem('pendingSchema');
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'この内容でテーブルを作成';
        }
    });

    dom.createTableView.appendChild(header);
    dom.createTableView.appendChild(nameDiv);
    dom.createTableView.appendChild(comboColumnContainer);
    dom.createTableView.appendChild(creationDateColumnContainer);
    dom.createTableView.appendChild(uniqueNumberColumnContainer);
    dom.createTableView.appendChild(editorTitle);
    dom.createTableView.appendChild(editorSubTitle);
    dom.createTableView.appendChild(editorContainer);
    dom.createTableView.appendChild(bottomControls);

    render();
};
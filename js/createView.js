/**
 * @file Renders the view for creating a new database table.
 * @module createView
 */

import * as dom from './dom.js';
import { state } from './state.js';
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
    headerTitle.className = 'text-2xl font-bold ml-4';
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

    const { container: presetContainer, select: presetSelect } = createSettingRow('new-table-preset-selector', 'コンボ列のカラーリングプリセット');
    const { container: comboContainer, select: comboColumnSelect } = createSettingRow('new-table-combo-column-selector', 'コンボを保存する列 (コンボ列)');
    const { container: starterContainer, select: starterColumnSelect } = createSettingRow('new-table-starter-column-selector', '始動技を表示する列');
    const { container: creationDateContainer, select: creationDateColumnSelect } = createSettingRow('new-table-creation-date-column-selector', '作成日を記録する列');
    const { container: uniqueNumberContainer, select: uniqueNumberColumnSelect } = createSettingRow('new-table-unique-number-column-selector', '連番を記録する列');

    settingsGrid.appendChild(presetContainer);
    settingsGrid.appendChild(comboContainer);
    settingsGrid.appendChild(starterContainer);
    settingsGrid.appendChild(creationDateContainer);
    settingsGrid.appendChild(uniqueNumberContainer);

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

        presetSelect.innerHTML = '<option value="">デフォルト (現在のキーマップ)</option>';
        Object.keys(state.presets).forEach(presetName => {
            const option = document.createElement('option');
            option.value = presetName;
            option.textContent = presetName;
            presetSelect.appendChild(option);
        });
        presetSelect.value = '';

        // Determine default columns
        const defaultComboCol = tempColumnObjects.find(c => c.name === '内容');
        const defaultStarterCol = tempColumnObjects.find(c => c.name === '始動技');
        const defaultDateCol = tempColumnObjects.find(c => c.name === '日付' || c.name === 'date');
        const defaultNumberCol = tempColumnObjects.find(c => c.name === 'No.');

        // Populate dropdowns, using the current value or falling back to the default.
        populateColumnDropdown(comboColumnSelect, tempColumnObjects, comboColumnSelect.value || (defaultComboCol ? defaultComboCol.id : null));
        populateColumnDropdown(starterColumnSelect, tempColumnObjects, starterColumnSelect.value || (defaultStarterCol ? defaultStarterCol.id : null), '(なし)');
        populateColumnDropdown(creationDateColumnSelect, tempColumnObjects, creationDateColumnSelect.value || (defaultDateCol ? defaultDateCol.id : null), '(なし)');
        populateColumnDropdown(uniqueNumberColumnSelect, tempColumnObjects, uniqueNumberColumnSelect.value || (defaultNumberCol ? defaultNumberCol.id : null), '(なし)');

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

        const coloringPresetName = presetSelect.value;
        const comboColumnId = comboColumnSelect.value;
        const starterColumnId = starterColumnSelect.value;
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
            coloringPresetName: coloringPresetName || null,
            starterColumnId: starterColumnId || null,
            creationDateColumnId: creationDateColumnId || null,
            uniqueNumberColumnId: uniqueNumberColumnId || null,
            recordCount: 0,
            lastUpdated: new Date().toISOString(),
        };

        try {
            saveButton.disabled = true;
            saveButton.textContent = '作成中...';
            console.log('[CreateView] Starting table creation process for:', tableName);

            const currentVersion = window.db.version;
            if (window.db) {
                console.log(`[CreateView] Closing existing DB connection (v${currentVersion})...`);
                window.db.close(); // Close any existing connection before version upgrade
                console.log('[CreateView] DB connection closed command sent.');
            }

            console.log('[CreateView] Setting pending schema in localStorage:', newSchema);
            localStorage.setItem('pendingSchema', JSON.stringify(newSchema));
            
            const newVersion = currentVersion + 1;
            console.log(`[CreateView] Requesting DB version upgrade to ${newVersion}`);
            await window.db.openDB(newVersion);
            console.log('[CreateView] DB version upgrade complete.');

            alert(`テーブル「${tableName}」を作成しました。`);
            
            console.log('[CreateView] Populating table selector...');
            await populateTableSelector();
            console.log('[CreateView] Table selector populated.');

            console.log('[CreateView] Scheduling view change to "database".');
            // Use setTimeout to ensure the view update happens after the current execution stack is clear,
            // allowing the DB changes to be fully propagated before rendering the list view.
            setTimeout(() => {
                console.log('[CreateView] Executing view change to "database".');
                showView('database');
            }, 0);

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
    dom.createTableView.appendChild(settingsGrid);
    dom.createTableView.appendChild(editorTitle);
    dom.createTableView.appendChild(editorSubTitle);
    dom.createTableView.appendChild(editorContainer);
    dom.createTableView.appendChild(bottomControls);

    render();
};
import { state } from './state.js';
import * as dom from './dom.js';
import { generateHtmlFromPlainText, showView } from './ui.js';
import { openConfirmModal, openMoveRecordsModal, closeMoveRecordsModal } from './components/modals.js';
import { createTableEditorComponent } from './components/table_editor.js';

export async function migrateCombosFromLocalStorage() {
    const migrationComplete = localStorage.getItem('migrationToIndexedDbComplete');
    if (migrationComplete === 'true') return;

    console.log(`[ComboEditor] Checking for old combo data in localStorage...`);
    const oldCombos = JSON.parse(localStorage.getItem('comboEditorSavedCombos') || '[]');
    if (oldCombos.length === 0) {
        localStorage.setItem('migrationToIndexedDbComplete', 'true');
        return;
    }

    console.log(`[ComboEditor] Found ${oldCombos.length} old combos. Migrating to a new table...`);

    const tableName = 'migrated_combos';
    const schema = {
        tableName,
        columns: [
            { id: 'combohtml', name: 'コンボ' },
            { id: 'timestamp', name: '保存日時' },
            { id: 'memo', name: 'メモ' }
        ],
        recordCount: oldCombos.length,
        lastUpdated: new Date().toISOString()
    };

    try {
        localStorage.setItem('pendingSchema', JSON.stringify(schema));
        await window.db.openDB(db.version + 1);

        const dbInstance = await window.db.openDB();
        const tx = dbInstance.transaction(tableName, 'readwrite');
        oldCombos.forEach(combo => {
            tx.objectStore(tableName).add({
                combohtml: combo.comboHTML,
                timestamp: combo.timestamp,
                memo: `Migrated from localStorage. Old ID: ${combo.id}`
            });
        });
        await new Promise(resolve => tx.oncomplete = resolve);

        console.log(`[ComboEditor] Successfully migrated combos to '${tableName}' table.`);
        localStorage.setItem('migrationToIndexedDbComplete', 'true');
        localStorage.setItem('comboEditorSavedCombos_MIGRATED', JSON.stringify(oldCombos));
        localStorage.removeItem('comboEditorSavedCombos');
    } catch (error) {
        console.error(`[ComboEditor] Error migrating combos:`, error);
        localStorage.removeItem('pendingSchema');
    }
}

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

    const editorTitle = document.createElement('h2');
    editorTitle.textContent = '列の定義';
    editorTitle.className = 'text-lg font-semibold text-white mb-2';
    const editorSubTitle = document.createElement('p');
    editorSubTitle.textContent = '「コンボ列」に指定した列に、エディターのコンボ内容が保存されます。';
    editorSubTitle.className = 'text-sm text-gray-400 mb-3';

    const editorContainer = document.createElement('div');
    editorContainer.id = 'create-table-editor-container';

    const addColumnButton = document.createElement('button');
    addColumnButton.className = 'mt-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-md';
    addColumnButton.textContent = '列を追加';

    const saveButton = document.createElement('button');
    saveButton.id = 'confirm-create-table-from-view-button';
    saveButton.textContent = 'この内容でテーブルを作成';
    saveButton.className = 'mt-6 w-full md:w-auto bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-md';

    let tempColumns = [
        {id: `col_${Date.now()}_1`, header: 'コンボ'},
        {id: `col_${Date.now()}_2`, header: 'キャラ'},
        {id: `col_${Date.now()}_3`, header: 'ダメージ'}
    ];

    const populateComboColumnDropdown = (columns, selectedId) => {
        comboColumnSelect.innerHTML = '';
        columns.forEach(column => {
            const option = document.createElement('option');
            option.value = column.id;
            option.textContent = column.header;
            comboColumnSelect.appendChild(option);
        });
        if (selectedId && columns.some(c => c.id === selectedId)) {
            comboColumnSelect.value = selectedId;
        } else if (columns.length > 0) {
            comboColumnSelect.value = columns[0].id;
        }
    };

    const render = () => {
        populateComboColumnDropdown(tempColumns, comboColumnSelect.value);
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

    saveButton.addEventListener('click', async () => {
        const tableName = nameInput.value.trim();
        if (!tableName) {
            alert('テーブル名を入力してください。');
            return;
        }

        const comboColumnId = comboColumnSelect.value;
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
    dom.createTableView.appendChild(editorTitle);
    dom.createTableView.appendChild(editorSubTitle);
    dom.createTableView.appendChild(editorContainer);
    dom.createTableView.appendChild(addColumnButton);
    dom.createTableView.appendChild(saveButton);

    render();
};

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

    const presetSelectorContainer = document.createElement('div');
    presetSelectorContainer.className = 'mt-6';

    const presetLabel = document.createElement('label');
    presetLabel.htmlFor = 'table-preset-selector';
    presetLabel.textContent = 'コンボ列のカラーリングプリセット';
    presetLabel.className = 'block text-lg font-semibold text-white mb-2';

    const presetSelect = document.createElement('select');
    presetSelect.id = 'table-preset-selector';
    presetSelect.className = 'form-select w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2';

    presetSelectorContainer.appendChild(presetLabel);
    presetSelectorContainer.appendChild(presetSelect);

    const comboColumnContainer = document.createElement('div');
    comboColumnContainer.className = 'mt-6';

    const comboColumnLabel = document.createElement('label');
    comboColumnLabel.htmlFor = 'table-combo-column-selector';
    comboColumnLabel.textContent = 'コンボを保存する列 (コンボ列)';
    comboColumnLabel.className = 'block text-lg font-semibold text-white mb-2';

    const comboColumnSelect = document.createElement('select');
    comboColumnSelect.id = 'table-combo-column-selector';
    comboColumnSelect.className = 'form-select w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2';

    comboColumnContainer.appendChild(comboColumnLabel);
    comboColumnContainer.appendChild(comboColumnSelect);

    const starterColumnContainer = document.createElement('div');
    starterColumnContainer.className = 'mt-6';

    const starterColumnLabel = document.createElement('label');
    starterColumnLabel.htmlFor = 'table-starter-column-selector';
    starterColumnLabel.textContent = '始動技を表示する列';
    starterColumnLabel.className = 'block text-lg font-semibold text-white mb-2';

    const starterColumnSelect = document.createElement('select');
    starterColumnSelect.id = 'table-starter-column-selector';
    starterColumnSelect.className = 'form-select w-full md:w-1/2 bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2';

    starterColumnContainer.appendChild(starterColumnLabel);
    starterColumnContainer.appendChild(starterColumnSelect);

    const editorTitle = document.createElement('h2');
    editorTitle.textContent = '列の定義';
    editorTitle.className = 'text-lg font-semibold text-white mt-8 mb-2';
    const editorSubTitle = document.createElement('p');
    editorSubTitle.textContent = '列名の変更や、「コンボ列」の指定ができます。';
    editorSubTitle.className = 'text-sm text-gray-400 mb-3';

    const editorContainer = document.createElement('div');
    editorContainer.id = 'edit-table-editor-container';

    const addColumnButton = document.createElement('button');
    addColumnButton.className = 'mt-2 text-sm bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-3 rounded-md';
    addColumnButton.textContent = '列を追加';

    const saveButton = document.createElement('button');
    saveButton.textContent = '設定を保存';
    saveButton.className = 'mt-6 w-full md:w-auto bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-md';

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

    saveButton.addEventListener('click', async () => {
        saveButton.disabled = true;
        const selectedPreset = presetSelect.value;
        const selectedComboColumn = comboColumnSelect.value;
        const selectedStarterColumn = starterColumnSelect.value;
        const success = await handleUpdateSchema(tableName, tempColumns, selectedComboColumn, selectedPreset, selectedStarterColumn);
        if (success) {
            showView('database', { tableName });
        } else {
            saveButton.disabled = false;
        }
    });

    dom.editTableView.appendChild(header);
    dom.editTableView.appendChild(presetSelectorContainer);
    dom.editTableView.appendChild(comboColumnContainer);
    dom.editTableView.appendChild(starterColumnContainer);
    dom.editTableView.appendChild(editorTitle);
    dom.editTableView.appendChild(editorSubTitle);
    dom.editTableView.appendChild(editorContainer);
    dom.editTableView.appendChild(addColumnButton);
    dom.editTableView.appendChild(saveButton);

    renderEditor();
};

export const renderTableListView = async () => {
    try {
        const schemas = await window.db.getAllSchemas();
        dom.databaseContentArea.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'flex justify-between items-center mb-4';
        const title = document.createElement('h2');
        title.textContent = 'テーブル一覧';
        title.className = 'text-2xl font-bold';
        const newTableButton = document.createElement('button');
        newTableButton.textContent = '新規テーブル作成';
        newTableButton.className = 'bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md';
        newTableButton.addEventListener('click', () => showView('create-table'));
        header.appendChild(title);
        header.appendChild(newTableButton);
        dom.databaseContentArea.appendChild(header);

        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'flex justify-between items-center mb-6 flex-wrap gap-4';

        const searchContainer = document.createElement('div');
        searchContainer.className = 'flex gap-2 items-center';
        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = '全テーブルを横断検索...';
        searchInput.className = 'form-input flex-grow bg-gray-700 border-gray-600 rounded-md text-white px-3 py-2 text-sm';
        searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchButton.click(); });
        const searchButton = document.createElement('button');
        searchButton.textContent = '検索';
        searchButton.className = 'bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-md';
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            if (query) renderGlobalSearchResults(query);
        });
        searchContainer.appendChild(searchInput);
        searchContainer.appendChild(searchButton);
        controlsContainer.appendChild(searchContainer);

        const sortContainer = document.createElement('div');
        sortContainer.className = 'flex gap-2 items-center';
        const sortLabel = document.createElement('label');
        sortLabel.htmlFor = 'table-sort-select';
        sortLabel.className = 'text-sm font-medium text-gray-300';
        sortLabel.textContent = 'ソート:';
        const sortSelect = document.createElement('select');
        sortSelect.id = 'table-sort-select';
        sortSelect.className = 'form-select bg-gray-700 border-gray-600 rounded-md text-white px-3 py-1 text-sm';
        sortSelect.innerHTML = `
            <option value="name-asc">名前 (昇順)</option>
            <option value="name-desc">名前 (降順)</option>
            <option value="updated-desc">最終更新 (新しい順)</option>
            <option value="updated-asc">最終更新 (古い順)</option>
        `;
        sortSelect.value = state.currentSort;
        sortContainer.appendChild(sortLabel);
        sortContainer.appendChild(sortSelect);
        controlsContainer.appendChild(sortContainer);

        dom.databaseContentArea.appendChild(controlsContainer);

        const listContainer = document.createElement('div');
        listContainer.id = 'db-table-list-container';
        dom.databaseContentArea.appendChild(listContainer);

        const renderList = () => {
            listContainer.innerHTML = '';

            const sortFunctions = {
                'name-asc': (a, b) => a.tableName.localeCompare(b.tableName),
                'name-desc': (a, b) => b.tableName.localeCompare(a.tableName),
                'updated-desc': (a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated),
                'updated-asc': (a, b) => new Date(a.lastUpdated) - new Date(b.lastUpdated),
            };
            schemas.sort(sortFunctions[state.currentSort]);

            if (schemas.length === 0) {
                listContainer.innerHTML = '<p class="text-gray-500 text-center py-8">テーブルがありません。最初のテーブルを作成してください。</p>';
            } else {
                const table = document.createElement('table');
                table.className = 'w-full text-left border-collapse bg-gray-800 rounded-lg overflow-hidden';
                const thead = document.createElement('thead');
                thead.innerHTML = `
                    <tr class="bg-gray-700">
                        <th class="p-3 border-b border-gray-600">テーブル名</th>
                        <th class="p-3 border-b border-gray-600 w-32">データ数</th>
                        <th class="p-3 border-b border-gray-600 w-48">最終更新</th>
                        <th class="p-3 border-b border-gray-600 w-40 text-center">操作</th>
                    </tr>
                `;
                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                schemas.forEach(schema => {
                    const tr = document.createElement('tr');
                    tr.className = 'border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50 transition-colors';

                    const nameTd = document.createElement('td');
                    nameTd.className = 'p-3 font-semibold text-white';
                    const nameLink = document.createElement('a');
                    nameLink.href = `#database/${encodeURIComponent(schema.tableName)}`;
                    nameLink.textContent = schema.tableName;
                    nameLink.className = 'hover:underline';
                    nameLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        showView('database', { tableName: schema.tableName });
                    });
                    nameTd.appendChild(nameLink);

                    const countTd = document.createElement('td');
                    countTd.className = 'p-3';
                    countTd.textContent = schema.recordCount || 0;

                    const updatedTd = document.createElement('td');
                    updatedTd.className = 'p-3 text-sm text-gray-400';
                    updatedTd.textContent = schema.lastUpdated ? new Date(schema.lastUpdated).toLocaleString('ja-JP') : '不明';

                    const actionsTd = document.createElement('td');
                    actionsTd.className = 'p-3 text-center';
                    
                    const editButton = document.createElement('button');
                    editButton.textContent = '設定';
                    editButton.className = 'text-xs bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-2 rounded-md mr-2';
                    editButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        showView('edit-table', { tableName: schema.tableName });
                    });

                    const deleteButton = document.createElement('button');
                    deleteButton.textContent = '削除';
                    deleteButton.className = 'text-xs bg-red-800 hover:bg-red-700 text-white font-bold py-1 px-2 rounded-md';
                    deleteButton.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (schema.tableName === window.db.DEFAULT_TABLE) {
                            alert('デフォルトのテーブルは削除できません。');
                            return;
                        }
                        const message = `本当にテーブル「${schema.tableName}」を削除しますか？<br><strong class="text-red-400">このテーブル内のすべてのデータが完全に失われ、この操作は取り消せません。</strong>`;
                        openConfirmModal(message, async () => {
                            try {
                                await window.db.deleteTable(schema.tableName);
                                alert(`テーブル「${schema.tableName}」を削除しました。`);
                                await renderTableListView();
                            } catch (error) {
                                console.error(`Failed to delete table ${schema.tableName}:`, error);
                                alert(`テーブルの削除に失敗しました: ${error}`);
                            }
                        });
                    });
                    
                    actionsTd.appendChild(editButton);
                    actionsTd.appendChild(deleteButton);

                    tr.appendChild(nameTd);
                    tr.appendChild(countTd);
                    tr.appendChild(updatedTd);
                    tr.appendChild(actionsTd);
                    tbody.appendChild(tr);
                });
                table.appendChild(tbody);
                listContainer.appendChild(table);
            }
        };

        sortSelect.addEventListener('change', (e) => {
            state.currentSort = e.target.value;
            renderList();
        });

        renderList();
    } catch (error) {
        console.error('Error rendering database list view:', error);
        dom.databaseContentArea.innerHTML = `<p class="text-red-500">データベース一覧の表示に失敗しました: ${error.message}</p>`;
    }
};

export const renderTableView = async (tableName) => {
    try {
        dom.databaseContentArea.innerHTML = '<p class="text-gray-400">テーブルを読み込み中...</p>';
        let currentTableSort = { columnId: null, direction: 'asc' };
        const selectedRowIds = new Set();
        const schema = await window.db.getSchema(tableName);
        const originalData = await window.db.getAllRecords(tableName);

        const coloringPresetName = schema.coloringPresetName;
        const actionsToUse = coloringPresetName && state.presets[coloringPresetName] ? state.presets[coloringPresetName] : state.actions;

        if (!schema) throw new Error(`テーブル「${tableName}」のスキーマが見つかりません。`);

        dom.databaseContentArea.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'flex items-center mb-4';
        const backButton = document.createElement('button');
        backButton.innerHTML = '&larr; テーブル一覧に戻る';
        backButton.className = 'text-blue-400 hover:text-blue-300 font-bold';
        backButton.addEventListener('click', () => showView('database'));

        const title = document.createElement('h2');
        title.textContent = tableName;
        title.className = 'text-2xl font-bold ml-4';

        const searchInput = document.createElement('input');
        searchInput.type = 'search';
        searchInput.placeholder = 'テーブル内を検索...';
        searchInput.className = 'ml-4 form-input bg-gray-700 border-gray-600 rounded-md text-white px-3 py-1 text-sm';

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'ml-auto flex items-center gap-2';

        const moveSelectedButton = document.createElement('button');
        moveSelectedButton.textContent = '移動';
        moveSelectedButton.className = 'bg-blue-700 text-white font-bold py-1 px-3 rounded-md text-sm disabled:bg-gray-600 disabled:cursor-not-allowed';
        moveSelectedButton.disabled = true;

        const deleteSelectedButton = document.createElement('button');
        deleteSelectedButton.textContent = '削除';
        deleteSelectedButton.className = 'bg-red-800 text-white font-bold py-1 px-3 rounded-md text-sm disabled:bg-gray-600 disabled:cursor-not-allowed';
        deleteSelectedButton.disabled = true;

        const editSchemaButton = document.createElement('button');
        editSchemaButton.textContent = 'テーブル設定';
        editSchemaButton.className = 'bg-gray-600 hover:bg-gray-500 text-white font-bold py-1 px-3 rounded-md text-sm';
        editSchemaButton.addEventListener('click', () => showView('edit-table', { tableName }));

        const downloadButton = document.createElement('button');
        downloadButton.textContent = 'ダウンロード';
        downloadButton.title = 'CSV形式でダウンロード';
        downloadButton.className = 'bg-purple-700 hover:bg-purple-600 text-white font-bold py-1 px-3 rounded-md text-sm';
        downloadButton.addEventListener('click', () => {
            try {
                const escapeCsvCell = (cellValue) => {
                    let value = String(cellValue == null ? '' : cellValue);
                    value = value.replace(/"/g, '""');
                    if (/[ ",\n]/.test(value)) {
                        value = `"${value}"`;
                    }
                    return value;
                };

                const headers = schema.columns.map(c => escapeCsvCell(c.name));
                let csvContent = headers.join(',') + '\n';

                const rows = originalData.map(record => {
                    return schema.columns.map(column => {
                        let cellValue = record[column.id] || '';
                        if (column.id === schema.comboColumnId) {
                            const tempDiv = document.createElement('div');
                            tempDiv.innerHTML = cellValue;
                            cellValue = tempDiv.textContent || tempDiv.innerText || '';
                        }
                        return escapeCsvCell(cellValue);
                    }).join(',');
                });
                csvContent += rows.join('\n');

                const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.setAttribute("download", `${tableName}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (error) {
                console.error('Failed to generate CSV for download:', error);
                alert('ダウンロードファイルの生成に失敗しました。');
            }
        });

        buttonGroup.appendChild(moveSelectedButton);
        buttonGroup.appendChild(deleteSelectedButton);
        buttonGroup.appendChild(editSchemaButton);
        buttonGroup.appendChild(downloadButton);

        header.appendChild(backButton);
        header.appendChild(title);
        header.appendChild(searchInput);
        header.appendChild(buttonGroup);
        dom.databaseContentArea.appendChild(header);

        const updateButtonStates = () => {
            const count = selectedRowIds.size;
            if (count > 0) {
                deleteSelectedButton.disabled = false;
                deleteSelectedButton.textContent = `${count}件 削除`;
                moveSelectedButton.disabled = false;
                moveSelectedButton.textContent = `${count}件 移動`;
            } else {
                deleteSelectedButton.disabled = true;
                deleteSelectedButton.textContent = '削除';
                moveSelectedButton.disabled = true;
                moveSelectedButton.textContent = '移動';
            }
        };

        deleteSelectedButton.addEventListener('click', () => {
            if (selectedRowIds.size === 0) return;
            const message = `選択した ${selectedRowIds.size} 件のデータを削除しますか？<br>この操作は取り消せません。`;
            openConfirmModal(message, async () => {
                await Promise.all(Array.from(selectedRowIds).map(id => window.db.deleteRecord(tableName, id)));
                renderTableView(tableName);
            });
        });

        moveSelectedButton.addEventListener('click', async () => {
            if (selectedRowIds.size === 0) return;

            try {
                const allSchemas = await window.db.getAllSchemas();
                dom.moveTargetTableSelect.innerHTML = '';
                allSchemas.forEach(schema => {
                    if (schema.tableName !== tableName) {
                        const option = document.createElement('option');
                        option.value = schema.tableName;
                        option.textContent = schema.tableName;
                        dom.moveTargetTableSelect.appendChild(option);
                    }
                });

                if (dom.moveTargetTableSelect.options.length === 0) {
                    alert('移動可能なテーブルがありません。');
                    return;
                }

                const message = `選択した ${selectedRowIds.size} 件のデータを移動します。`;
                openMoveRecordsModal(message, (destinationTable) => {
                    handleMoveRecords(tableName, destinationTable, Array.from(selectedRowIds));
                });
            } catch (error) {
                console.error('Failed to prepare for move:', error);
                alert('移動の準備に失敗しました。');
            }
        });

        const table = document.createElement('table');
        table.className = 'text-left border-collapse database-table min-w-full';

        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        const headerRow = document.createElement('tr');
        headerRow.className = 'bg-gray-700 sticky top-0';

        const columnsWithActions = [{ id: 'selector', name: '' }, ...schema.columns];

        columnsWithActions.forEach(column => {
            const th = document.createElement('th');
            th.className = 'p-2 border border-gray-600';
            th.dataset.columnId = column.id;

            if (column.id === 'selector') {
                th.style.width = '40px';
                th.classList.add('text-center', 'align-middle');
                const selectAllCheckbox = document.createElement('input');
                selectAllCheckbox.type = 'checkbox';
                selectAllCheckbox.className = 'form-checkbox bg-gray-900 border-gray-600 rounded text-blue-500 h-4 w-4';
                selectAllCheckbox.addEventListener('change', () => {
                    const isChecked = selectAllCheckbox.checked;
                    tbody.querySelectorAll('input[type="checkbox"].row-selector').forEach(cb => {
                        cb.checked = isChecked;
                        const rowId = parseInt(cb.dataset.rowId, 10);
                        if (isChecked) selectedRowIds.add(rowId);
                        else selectedRowIds.delete(rowId);
                    });
                    updateButtonStates();
                });
                th.appendChild(selectAllCheckbox);
            } else {
                th.style.cursor = 'pointer';
                th.addEventListener('click', () => {
                    if (currentTableSort.columnId === column.id) {
                        currentTableSort.direction = currentTableSort.direction === 'asc' ? 'desc' : 'asc';
                    } else {
                        currentTableSort.columnId = column.id;
                        currentTableSort.direction = 'asc';
                    }
                    applyFiltersAndSort();
                });

                const headerContent = document.createElement('div');
                headerContent.className = 'flex items-center justify-between';

                const headerText = document.createElement('span');
                headerText.textContent = column.name;

                const sortIndicator = document.createElement('span');
                sortIndicator.className = 'sort-indicator ml-1 text-xs';

                headerContent.appendChild(headerText);
                headerContent.appendChild(sortIndicator);
                th.appendChild(headerContent);

                if (schema.widths && schema.widths[column.id]) {
                    th.style.width = `${schema.widths[column.id]}px`;
                }
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'resize-handle';
                th.appendChild(resizeHandle);
            }

            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        headerRow.querySelectorAll('th').forEach(th => {
            const resizeHandle = th.querySelector('.resize-handle');
            if (!resizeHandle) return;

            resizeHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();

                const thToResize = e.target.parentElement;
                const startX = e.pageX;
                const startWidth = thToResize.offsetWidth;

                const handleMouseMove = (mouseMoveEvent) => {
                    const newWidth = startWidth + (mouseMoveEvent.pageX - startX);
                    if (newWidth > 40) {
                        thToResize.style.width = `${newWidth}px`;
                    }
                };

                const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);

                    const newWidths = {};
                    headerRow.querySelectorAll('th').forEach(th => {
                        if (th.dataset.columnId && th.style.width) {
                            newWidths[th.dataset.columnId] = parseInt(th.style.width, 10);
                        }
                    });

                    if (Object.keys(newWidths).length > 0) {
                        const updatedSchema = { ...schema, widths: { ...schema.widths, ...newWidths } };
                        window.db.updateSchema(updatedSchema).catch(err => {
                            console.error("Failed to save column widths:", err);
                        });
                    }
                };

                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            });
        });

        table.appendChild(thead);

        const applyFiltersAndSort = () => {
            const query = searchInput.value.toLowerCase();
            let filteredData;
            if (query) {
                filteredData = originalData.filter(row =>
                    Object.values(row).some(value => String(value).toLowerCase().includes(query))
                );
            } else {
                filteredData = [...originalData];
            }

            const { columnId, direction } = currentTableSort;
            if (columnId) {
                filteredData.sort((a, b) => {
                    let valA = a[columnId] || '';
                    let valB = b[columnId] || '';

                    if (columnId === schema.comboColumnId) {
                        const textA = new DOMParser().parseFromString(valA, 'text/html').body.textContent || '';
                        const textB = new DOMParser().parseFromString(valB, 'text/html').body.textContent || '';
                        return textA.localeCompare(textB, 'ja');
                    }

                    const numA = parseFloat(valA);
                    const numB = parseFloat(valB);
                    if (String(valA).trim() !== '' && String(valB).trim() !== '' && !isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }

                    return String(valA).localeCompare(String(valB), 'ja');
                });

                if (direction === 'desc') {
                    filteredData.reverse();
                }
            }

            headerRow.querySelectorAll('th .sort-indicator').forEach(indicator => {
                const th = indicator.closest('th');
                indicator.textContent = (th && th.dataset.columnId === currentTableSort.columnId) ? (currentTableSort.direction === 'asc' ? '▲' : '▼') : '';
            });

            renderTbody(filteredData);
        };

        table.appendChild(tbody);

        const renderTbody = (filteredData) => {
            tbody.innerHTML = '';
            if (filteredData.length === 0) {
                const tr = document.createElement('tr');
                const td = document.createElement('td');
                td.colSpan = columnsWithActions.length;
                td.textContent = 'データが見つかりません。';
                td.className = 'text-center text-gray-500 p-4';
                tr.appendChild(td);
                tbody.appendChild(tr);
            } else {
                filteredData.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.className = 'bg-gray-800 hover:bg-gray-700/50';

                    columnsWithActions.forEach(column => {
                        const td = document.createElement('td');
                        td.dataset.columnId = column.id;
                        td.className = 'p-1 border border-gray-600';

                        if (column.id === 'selector') {
                            td.classList.add('text-center', 'align-middle');
                            const rowCheckbox = document.createElement('input');
                            rowCheckbox.type = 'checkbox';
                            rowCheckbox.className = 'form-checkbox bg-gray-900 border-gray-600 rounded text-blue-500 h-4 w-4 row-selector';
                            rowCheckbox.dataset.rowId = row.id;
                            rowCheckbox.addEventListener('change', () => {
                                const rowId = parseInt(rowCheckbox.dataset.rowId, 10);
                                if (rowCheckbox.checked) selectedRowIds.add(rowId);
                                else selectedRowIds.delete(rowId);
                                updateButtonStates();
                            });
                            td.appendChild(rowCheckbox);
                        } else {
                            td.classList.add('align-top');
                            const displayWrapper = document.createElement('div');
                            displayWrapper.className = 'cell-display-wrapper';

                            let cellContent = row[column.id] || '';
                            if (column.id === schema.comboColumnId || (schema.starterColumnId && column.id === schema.starterColumnId)) {
                                displayWrapper.innerHTML = generateHtmlFromPlainText(displayWrapper.textContent || cellContent, actionsToUse);
                            } else {
                                displayWrapper.textContent = cellContent;
                            }
                            td.appendChild(displayWrapper);

                            td.addEventListener('click', () => {
                                const displayWrapper = td.querySelector('.cell-display-wrapper');
                                if (!displayWrapper) return;

                                const isComboColumn = column.id === schema.comboColumnId;
                                const originalContent = isComboColumn ? displayWrapper.innerHTML : displayWrapper.textContent;
                                const editText = displayWrapper.textContent;

                                const editor = document.createElement('textarea');
                                editor.className = 'cell-editor';
                                editor.value = editText;

                                const autoSize = (el) => {
                                    setTimeout(() => {
                                        el.style.height = 'auto';
                                        el.style.height = `${el.scrollHeight}px`;
                                    }, 0);
                                };
                                editor.addEventListener('input', () => autoSize(editor));

                                const revertToDisplay = (content) => {
                                    const newDisplayWrapper = document.createElement('div');
                                    newDisplayWrapper.className = 'cell-display-wrapper';
                                    if (isComboColumn) {
                                        newDisplayWrapper.innerHTML = content;
                                    } else {
                                        newDisplayWrapper.textContent = content;
                                    }
                                    td.innerHTML = '';
                                    td.appendChild(newDisplayWrapper);
                                };

                                const saveChanges = async () => {
                                    const newText = editor.value;
                                    editor.removeEventListener('blur', saveChanges);

                                    let newContent = newText;
                                    if (isComboColumn) {
                                        newContent = generateHtmlFromPlainText(newText, actionsToUse);
                                    }

                                    if (newContent !== originalContent) {
                                        const recordToUpdate = originalData.find(d => d.id === row.id);
                                        if (recordToUpdate) {
                                            recordToUpdate[column.id] = newContent;

                                            if (isComboColumn && schema.starterColumnId) {
                                                const starterMove = newText.split(' > ')[0].trim();
                                                recordToUpdate[schema.starterColumnId] = starterMove;
                                            }

                                            try {
                                                await window.db.updateRecord(tableName, recordToUpdate);
                                                if (isComboColumn && schema.starterColumnId) {
                                                    const rowElement = editor.closest('tr');
                                                    if (rowElement) {
                                                        const starterCellWrapper = rowElement.querySelector(`[data-column-id="${schema.starterColumnId}"] .cell-display-wrapper`);
                                                        if (starterCellWrapper) starterCellWrapper.innerHTML = generateHtmlFromPlainText(recordToUpdate[schema.starterColumnId], actionsToUse);
                                                    }
                                                }
                                            } catch (err) {
                                                console.error('Failed to update record:', err);
                                                revertToDisplay(originalContent);
                                                return;
                                            }
                                        }
                                    }
                                    revertToDisplay(newContent);
                                };

                                editor.addEventListener('blur', saveChanges);
                                editor.addEventListener('keydown', (e) => {
                                    if (e.key === 'Escape') {
                                        e.preventDefault();
                                        editor.removeEventListener('blur', saveChanges);
                                        revertToDisplay(originalContent);
                                    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                        e.preventDefault();
                                        saveChanges();
                                    }
                                });

                                td.innerHTML = '';
                                td.appendChild(editor);
                                editor.focus();
                                autoSize(editor);
                            });
                        }
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });
            }
        };

        searchInput.addEventListener('input', applyFiltersAndSort);

        renderTbody(originalData);

        dom.databaseContentArea.appendChild(table);

    } catch (error) {
        console.error(`Error rendering table view for ${tableName}:`, error);
        dom.databaseContentArea.innerHTML = `<p class="text-red-500">テーブルの表示に失敗しました: ${error.message}</p>`;
    }
};

    export const handleMoveRecords = async (sourceTable, destinationTable, recordIds) => {
        console.log(`Moving ${recordIds.length} records from ${sourceTable} to ${destinationTable}`);
        closeMoveRecordsModal();

        try {
            const sourceSchema = await window.db.getSchema(sourceTable);
            const destinationSchema = await window.db.getSchema(destinationTable);
            const allSourceRecords = await window.db.getAllRecords(sourceTable);
            const recordsToMove = allSourceRecords.filter(r => recordIds.includes(r.id));

            const sourceColMap = new Map(sourceSchema.columns.map(c => [c.name, c.id]));
            const destColMap = new Map(destinationSchema.columns.map(c => [c.name, c.id]));

            const mappedColumns = Array.from(sourceColMap.keys()).filter(name => destColMap.has(name));
            const unmappedColumns = Array.from(sourceColMap.keys()).filter(name => !destColMap.has(name));

            if (unmappedColumns.length > 0) {
                if (!confirm(`以下の列は移動先に存在しないため、データが失われます:\n- ${unmappedColumns.join('\n- ')}\n\n移動を続行しますか？`)) {
                    return;
                }
            }

            const operations = [];
            for (const record of recordsToMove) {
                const newRecord = {};
                for (const colName of mappedColumns) {
                    const sourceColId = sourceColMap.get(colName);
                    const destColId = destColMap.get(colName);
                    if (record[sourceColId] !== undefined) {
                        newRecord[destColId] = record[sourceColId];
                    }
                }
                operations.push(window.db.addRecord(destinationTable, newRecord));
                operations.push(window.db.deleteRecord(sourceTable, record.id));
            }

            await Promise.all(operations);
            alert(`${recordIds.length}件のレコードを「${destinationTable}」に移動しました。`);
            await renderTableView(sourceTable);
        } catch (error) {
            console.error('Failed to move records:', error);
            alert(`レコードの移動中にエラーが発生しました: ${error.message}`);
        }
    };

    export const renderDatabaseView = async (tableName = null) => {
        const dbViewContainer = document.getElementById('database-view-container');
        if (tableName) {
            dbViewContainer.classList.remove('max-w-7xl');
            await renderTableView(tableName);
        } else {
            dbViewContainer.classList.add('max-w-7xl');
            await renderTableListView();
        }
    };

    export const renderGlobalSearchResults = async (query) => {
        dom.databaseContentArea.innerHTML = '<p class="text-gray-400">全テーブルを検索中: <span class="font-bold">"${query}"</span>...</p>';
        const lowerCaseQuery = query.toLowerCase();

        try {
            const allSchemas = await window.db.getAllSchemas();
            let allResults = [];

            for (const schema of allSchemas) {
                const tableData = await window.db.getAllRecords(schema.tableName);
                const tableResults = tableData.filter(row => {
                    return Object.values(row).some(value =>
                        String(value).toLowerCase().includes(lowerCaseQuery)
                    );
                });

                if (tableResults.length > 0) {
                    allResults.push({
                        tableName: schema.tableName,
                        results: tableResults
                    });
                }
            }

            dom.databaseContentArea.innerHTML = '';

            const header = document.createElement('div');
            header.className = 'flex justify-between items-center mb-6';
            const title = document.createElement('h2');
            title.className = 'text-2xl font-bold';
            title.innerHTML = `検索結果: <span class="text-blue-400 font-mono">"${query}"</span>`;

            const clearButton = document.createElement('button');
            clearButton.textContent = '検索をクリア';
            clearButton.className = 'bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-md';
            clearButton.addEventListener('click', () => renderTableListView());

            header.appendChild(title);
            header.appendChild(clearButton);
            dom.databaseContentArea.appendChild(header);

            if (allResults.length === 0) {
                dom.databaseContentArea.innerHTML += '<p class="text-gray-500">一致する結果は見つかりませんでした。</p>';
                return;
            }

            const resultsContainer = document.createElement('div');
            resultsContainer.className = 'space-y-6';
            allResults.forEach(tableResult => {
                const tableSection = document.createElement('div');

                const tableTitle = document.createElement('h3');
                tableTitle.className = 'text-xl font-semibold text-gray-300 border-b border-gray-700 pb-2 mb-2';
                tableTitle.textContent = `テーブル: ${tableResult.tableName}`;
                tableSection.appendChild(tableTitle);

                const resultList = document.createElement('div');
                resultList.className = 'space-y-2';
                tableResult.results.forEach(row => {
                    const card = document.createElement('div');
                    card.className = 'bg-gray-800 p-3 rounded-lg';
                    const comboContent = row.comboHTML || '（コンボデータなし）';
                    card.innerHTML = `<p class="text-sm text-gray-400">ID: ${row.id}</p>${comboContent}`;
                    resultList.appendChild(card);
                });
                tableSection.appendChild(resultList);
                resultsContainer.appendChild(tableSection);
            });
            dom.databaseContentArea.appendChild(resultsContainer);

        } catch (error) {
            console.error('Global search failed:', error);
            dom.databaseContentArea.innerHTML = `<p class="text-red-500">検索中にエラーが発生しました: ${error.message}</p>`;
        }
    };

    export const renderEditorMetadataForm = async (tableName) => {
        dom.editorMetadataFormContainer.innerHTML = '<p class="text-gray-500 col-span-full">フォームを読み込み中...</p>';
        if (!tableName) {
            dom.editorMetadataFormContainer.innerHTML = '<p class="text-gray-500 col-span-full">保存先テーブルを選択してください。</p>';
            return;
        }

        try {
            const schema = await window.db.getSchema(tableName);
            if (!schema) {
                dom.editorMetadataFormContainer.innerHTML = '<p class="text-red-500 col-span-full">スキーマの読み込みに失敗しました。</p>';
                return;
            }

            dom.editorMetadataFormContainer.innerHTML = '';
            const metadataColumns = schema.columns.filter(col => col.id !== schema.comboColumnId && col.id !== schema.starterColumnId);

            if (metadataColumns.length === 0) {
                dom.editorMetadataFormContainer.innerHTML = '<p class="text-gray-500 col-span-full">このテーブルには追加の付帯情報がありません。</p>';
            } else {
                metadataColumns.forEach(column => {
                    const fieldDiv = document.createElement('div');
                    const label = document.createElement('label');
                    label.htmlFor = `metadata-input-${column.id}`;
                    label.className = 'block text-sm font-medium text-gray-300 mb-1';
                    label.textContent = column.name;

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.id = `metadata-input-${column.id}`;
                    input.dataset.columnId = column.id;
                    input.className = 'form-input w-full bg-gray-900 border-gray-600 rounded-md text-white px-3 py-2 text-sm metadata-input';
                    input.placeholder = column.name;

                    fieldDiv.appendChild(label);
                    fieldDiv.appendChild(input);
                    dom.editorMetadataFormContainer.appendChild(fieldDiv);
                });
            }
        } catch (error) {
            console.error(`Error rendering metadata form for ${tableName}:`, error);
            dom.editorMetadataFormContainer.innerHTML = '<p class="text-red-500 col-span-full">フォームの読み込みに失敗しました。</p>';
        }
    };

    export const populateTableSelector = async () => {
        try {
            const schemas = await window.db.getAllSchemas();
            const currentSelection = dom.saveTableSelect.value;
            dom.saveTableSelect.innerHTML = '';

            schemas.sort((a,b) => a.tableName.localeCompare(b.tableName)).forEach(schema => {
                const option = document.createElement('option');
                option.value = schema.tableName;
                option.textContent = schema.tableName;
                dom.saveTableSelect.appendChild(option);
            });

            if (schemas.some(s => s.tableName === currentSelection)) {
                dom.saveTableSelect.value = currentSelection;
            }

            if (dom.saveTableSelect.value) {
                await renderEditorMetadataForm(dom.saveTableSelect.value);
            } else {
                await renderEditorMetadataForm(null);
            }

        } catch (error) {
            console.error('Failed to populate table selector:', error);
        }
    };

    export const handleUpdateSchema = async (tableName, tempColumns, comboColumnId, coloringPresetName, starterColumnId) => {
        const originalSchema = await window.db.getSchema(tableName);
        if (!originalSchema) {
            alert('元のスキーマが見つかりません。');
            return false;
        }

        const columns = tempColumns.map(col => ({
            id: col.id,
            name: col.header.trim()
        }));

        if (columns.some(c => !c.name)) {
            alert('列名が空のフィールドがあります。');
            return false;
        }

        const columnIds = new Set(columns.map(c => c.id));
        if (columns.length !== columnIds.size) {
            alert('重複した列IDが内部的に検出されました。リロードしてやり直してください。');
            return false;
        }

        if (!comboColumnId || !columnIds.has(comboColumnId)) {
            alert('コンボを保存する列を1つ選択してください。');
            return false;
        }

        const finalSchema = {
            ...originalSchema,
            columns: columns,
            comboColumnId: comboColumnId,
            coloringPresetName: coloringPresetName,
            starterColumnId: starterColumnId,
        };

        try {
            await window.db.updateSchema(finalSchema);
            alert('スキーマが更新されました。');
            return true;
        } catch (error) {
            console.error('Failed to update schema:', error);
            alert('スキーマの更新に失敗しました。');
            return false;
        }
    };
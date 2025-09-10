/**
 * @file Manages the rendering and interactions for the database table list view and global search results.
 * @module listView
 */

import { state } from './state.js';
import * as dom from './dom.js';
import { showView } from './ui.js';
import { openConfirmModal } from './components/modals.js';

/**
 * Renders the list of all database tables.
 * Fetches schemas from IndexedDB and displays them in a sortable table.
 * @returns {Promise<void>} A promise that resolves when the view is rendered.
 */
export const renderTableListView = async () => {
    try {
        console.log('[ListView] Rendering table list view...');
        const schemas = await window.db.getAllSchemas();
        console.log(`[ListView] Fetched ${schemas.length} schemas:`, schemas.map(s => s.tableName));
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

/**
 * Renders the results of a global search across all tables.
 * @param {string} query - The search query.
 * @returns {Promise<void>}
 */
export const renderGlobalSearchResults = async (query) => {
    dom.databaseContentArea.innerHTML = `<p class="text-gray-400">全テーブルを検索中: <span class="font-bold">"${query}"</span>...</p>`;
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
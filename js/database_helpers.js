/**
 * @file Provides helper functions for database interactions, schema management, and data migration.
 * This file acts as a controller/model layer for database operations, distinct from the view rendering logic.
 * @module database_helpers
 */

import { state } from './state.js';
import * as dom from './dom.js';
import { openConfirmModal, openMoveRecordsModal, closeMoveRecordsModal } from './components/modals.js';
import { renderTableListView } from './listView.js';
import { renderTableView } from './tableView.js';

/**
 * Migrates combo data from localStorage (old format) to a new IndexedDB table.
 * This is a one-time operation.
 * @returns {Promise<void>}
 */
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

/**
 * Handles the logic for moving records from a source table to a destination table.
 * @param {string} sourceTable - The name of the source table.
 * @param {string} destinationTable - The name of the destination table.
 * @param {Array<number>} recordIds - An array of record IDs to move.
 * @returns {Promise<void>}
 */
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
            const unmappedSourceColumns = Array.from(sourceColMap.keys()).filter(name => !destColMap.has(name));

            const proceedWithMove = async () => {
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
            };

            if (unmappedSourceColumns.length > 0) {
                const unmappedList = unmappedSourceColumns.map(name => `<li>- ${name}</li>`).join('');
                const message = `以下の列は移動先に存在しないため、データが失われます:
                                 <ul class="list-disc list-inside text-left text-sm my-2">${unmappedList}</ul>
                                 移動を続行しますか？`;
                openConfirmModal(message, proceedWithMove);
            } else {
                await proceedWithMove();
            }
        } catch (error) {
            console.error('Failed to move records:', error);
            alert(`レコードの移動中にエラーが発生しました: ${error.message}`);
        }
    };

/**
 * Renders the metadata form for the main editor view based on the selected table's schema.
 * @param {string|null} tableName - The name of the selected table, or null.
 * @returns {Promise<void>}
 */
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
            const metadataColumns = schema.columns.filter(col => 
                col.id !== schema.comboColumnId && 
                col.id !== schema.starterColumnId &&
                col.id !== schema.creationDateColumnId &&
                col.id !== schema.uniqueNumberColumnId
            );

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

/**
 * Populates the table selector dropdown in the main editor view.
 * @returns {Promise<void>}
 */
export const populateTableSelector = async () => {
        try {
            console.log('[DBHelper] Populating table selector...');
            const schemas = await window.db.getAllSchemas();
            console.log(`[DBHelper] Fetched ${schemas.length} schemas for selector:`, schemas.map(s => s.tableName));
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

/**
 * Handles updating a table's schema with new column definitions and settings.
 * @param {string} tableName - The name of the table to update.
 * @param {Array<object>} tempColumns - The temporary array of column objects from the editor.
 * @param {string} comboColumnId - The ID of the column designated for combo data.
 * @param {string} coloringPresetName - The name of the coloring preset for the combo column.
 * @param {string} starterColumnId - The ID of the column for the starter move.
 * @returns {Promise<boolean>} - True if the update was successful, false otherwise.
 */
export const handleUpdateSchema = async (tableName, tempColumns, comboColumnId, coloringPresetName, starterColumnId, creationDateColumnId, uniqueNumberColumnId) => {
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
            creationDateColumnId: creationDateColumnId,
            uniqueNumberColumnId: uniqueNumberColumnId,
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

/**
 * Main router for the database view.
 * It decides whether to show the table list or a specific table view.
 * @param {string|null} [tableName=null] - The name of a specific table to show. If null, shows the list view.
 * @returns {Promise<void>}
 */
export const renderDatabaseView = async (tableName = null) => {
    if (tableName) {
        dom.databaseViewContainer.classList.remove('max-w-7xl');
        await renderTableView(tableName);
    } else {
        dom.databaseViewContainer.classList.add('max-w-7xl');
        await renderTableListView();
    }
};
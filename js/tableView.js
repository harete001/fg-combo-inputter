/**
 * @file Renders the detailed view of a single database table, including data, sorting, editing, and other interactions.
 * @module tableView
 */

import { state } from './state.js';
import * as dom from './dom.js';
import { generateHtmlFromPlainText, showView } from './ui.js';
import { openConfirmModal, openMoveRecordsModal } from './components/modals.js';
import { handleMoveRecords } from './database_helpers.js';

/**
 * Calculates the width of a given text string with a specific font.
 * Uses a static canvas for performance.
 * @param {string} text The text to measure.
 * @param {string} font The CSS font string (e.g., "bold 16px Arial").
 * @returns {number} The width of the text in pixels.
 */
const getTextWidth = (text, font) => {
    const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = font;
    return context.measureText(text).width;
};

/**
 * Renders the detailed view for a specific database table.
 * @param {string} tableName - The name of the table to render.
 * @returns {Promise<void>}
 */
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

                const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-s8;' });
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

        if (schema.creationDateColumnId) {
            const refillDateButton = document.createElement('button');
            refillDateButton.textContent = '日付追加';
            refillDateButton.title = 'レコードの追加順を元に、作成日を再設定します。';
            refillDateButton.className = 'bg-orange-700 hover:bg-orange-600 text-white font-bold py-1 px-3 rounded-md text-sm';

            refillDateButton.addEventListener('click', () => {
                const message = `テーブル「${tableName}」の全レコードの作成日を、追加順を元に再設定します。<br>
                                 <strong class="text-yellow-400">既存の作成日はすべて上書きされます。</strong><br>
                                 この操作は取り消せません。よろしいですか？`;
                
                openConfirmModal(message, async () => {
                    try {
                        const allRecords = await window.db.getAllRecords(tableName);
                        allRecords.sort((a, b) => a.id - b.id);

                        const today = new Date();

                        const updatePromises = allRecords.map((record, index) => {
                            const recordDate = new Date(today);
                            // 配列の最後が今日になるように、過去に遡って日付を設定
                            recordDate.setDate(today.getDate() - (allRecords.length - 1 - index));

                            const yyyy = recordDate.getFullYear();
                            const mm = String(recordDate.getMonth() + 1).padStart(2, '0');
                            const dd = String(recordDate.getDate()).padStart(2, '0');
                            
                            record[schema.creationDateColumnId] = `${yyyy}-${mm}-${dd}`;
                            return window.db.updateRecord(tableName, record);
                        });

                        await Promise.all(updatePromises);
                        alert('作成日の再設定が完了しました。');
                        await renderTableView(tableName);
                    } catch (error) {
                        console.error('Failed to refill creation dates:', error);
                        alert(`作成日の再設定中にエラーが発生しました: ${error.message}`);
                    }
                });
            });
            buttonGroup.appendChild(refillDateButton);
        }

        if (schema.uniqueNumberColumnId) {
            const renumberButton = document.createElement('button');
            renumberButton.textContent = '連番追加';
            renumberButton.title = '作成日時順に連番を振り直します。作成日時列がない場合は追加順になります。';
            renumberButton.className = 'bg-teal-700 hover:bg-teal-600 text-white font-bold py-1 px-3 rounded-md text-sm';

            renumberButton.addEventListener('click', () => {
                const message = `テーブル「${tableName}」の連番を再採番します。<br>
                                 <strong class="text-yellow-400">既存の連番はすべて上書きされます。</strong><br>
                                 この操作は取り消せません。よろしいですか？`;
                
                openConfirmModal(message, async () => {
                    try {
                        const allRecords = await window.db.getAllRecords(tableName);

                        if (schema.creationDateColumnId) {
                            allRecords.sort((a, b) => {
                                const dateA = new Date(a[schema.creationDateColumnId] || 0);
                                const dateB = new Date(b[schema.creationDateColumnId] || 0);
                                if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
                                    return a.id - b.id;
                                }
                                return dateA - dateB;
                            });
                        } else {
                            allRecords.sort((a, b) => a.id - b.id);
                        }

                        const updatePromises = allRecords.map((record, index) => {
                            record[schema.uniqueNumberColumnId] = index + 1;
                            return window.db.updateRecord(tableName, record);
                        });

                        await Promise.all(updatePromises);
                        alert('連番の再採番が完了しました。');
                        await renderTableView(tableName);
                    } catch (error) {
                        console.error('Failed to renumber records:', error);
                        alert(`連番の再採番中にエラーが発生しました: ${error.message}`);
                    }
                });
            });
            buttonGroup.appendChild(renumberButton);
        }

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
                const startContentWidth = parseFloat(window.getComputedStyle(thToResize).width);

                const handleMouseMove = (mouseMoveEvent) => {
                    const deltaX = mouseMoveEvent.pageX - startX;
                    const newContentWidth = startContentWidth + deltaX;
                    if (newContentWidth > 20) {
                        thToResize.style.width = `${newContentWidth}px`;
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

            // リサイズハンドル上でのクリックが親要素(th)のソート機能を呼び出さないようにする
            resizeHandle.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            resizeHandle.addEventListener('dblclick', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const thToResize = e.target.parentElement;
                const columnId = thToResize.dataset.columnId;
                if (!columnId) return;

                const headerTextElement = thToResize.querySelector('.flex > span:first-child');
                const cellElements = tbody.querySelectorAll(`td[data-column-id="${columnId}"] .cell-display-wrapper`);

                if (!headerTextElement && cellElements.length === 0) return;

                const representativeElement = cellElements.length > 0 ? cellElements[0] : headerTextElement;
                const style = window.getComputedStyle(representativeElement);
                const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

                let maxWidth = getTextWidth(headerTextElement.textContent, font);

                cellElements.forEach(cell => {
                    const text = cell.textContent || cell.innerText;
                    const width = getTextWidth(text, font);
                    if (width > maxWidth) {
                        maxWidth = width;
                    }
                });

                const finalWidth = Math.ceil(maxWidth) + 12; // Add padding + buffer
                thToResize.style.width = `${finalWidth}px`;

                try {
                    const currentSchema = await window.db.getSchema(tableName);
                    const newWidths = { ...(currentSchema.widths || {}) };
                    newWidths[columnId] = finalWidth;
                    const updatedSchema = { ...currentSchema, widths: newWidths };
                    await window.db.updateSchema(updatedSchema);
                    schema.widths = updatedSchema.widths;
                } catch (err) {
                    console.error("Failed to save column widths after auto-fit:", err);
                }
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
                                displayWrapper.innerHTML = generateHtmlFromPlainText(cellContent, actionsToUse);
                            } else if (column.id === schema.creationDateColumnId) {
                                const dateStr = String(cellContent);
                                // YYYY-MM-DD 形式を想定
                                if (dateStr.length === 10 && dateStr.charAt(4) === '-' && dateStr.charAt(7) === '-') {
                                    displayWrapper.textContent = dateStr.substring(5).replace(/-/g, '/'); // MM/DD形式で表示
                                } else {
                                    displayWrapper.textContent = dateStr; // 想定外の形式ならそのまま表示
                                }
                            } else {
                                displayWrapper.textContent = cellContent;
                            }
                            td.appendChild(displayWrapper);

                            // 作成日列は編集不可にする
                            if (column.id === schema.creationDateColumnId ||
                                column.id === schema.uniqueNumberColumnId) {
                                td.style.cursor = 'default';
                            } else {
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
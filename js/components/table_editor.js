export function createTableEditorComponent(container, options) {
    let { columns, data, isReadOnly, getCellValue, onStateChange, onDataChange, showDataRow } = options;
    if (showDataRow === undefined) {
        showDataRow = true;
    }
    let localDraggedColumnId = null;

    container.innerHTML = '';
    if (columns.length === 0) return null;

    const table = document.createElement('table');
    table.className = 'w-full text-left border-collapse';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'bg-gray-700';

    columns.forEach((column, index) => {
        const th = document.createElement('th');
        th.className = 'p-1 border border-gray-600 cursor-move';
        th.dataset.columnId = column.id;
        th.draggable = true;

        th.addEventListener('dragstart', (e) => { e.stopPropagation(); localDraggedColumnId = column.id; e.dataTransfer.effectAllowed = 'move'; setTimeout(() => th.classList.add('dragging'), 0); });
        th.addEventListener('dragend', () => { th.classList.remove('dragging'); document.querySelectorAll('.spreadsheet-drag-over').forEach(el => el.classList.remove('spreadsheet-drag-over')); localDraggedColumnId = null; });
        th.addEventListener('dragover', (e) => { e.preventDefault(); if (column.id !== localDraggedColumnId) th.classList.add('spreadsheet-drag-over'); });
        th.addEventListener('dragleave', () => th.classList.remove('spreadsheet-drag-over'));
        th.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation();
            th.classList.remove('spreadsheet-drag-over');
            if (!localDraggedColumnId || localDraggedColumnId === column.id) return;
            const draggedIndex = columns.findIndex(c => c.id === localDraggedColumnId);
            const droppedOnIndex = columns.findIndex(c => c.id === column.id);
            if (draggedIndex > -1 && droppedOnIndex > -1) {
                const [removed] = columns.splice(draggedIndex, 1);
                columns.splice(droppedOnIndex, 0, removed);
                onStateChange({ columns, data });
            }
        });

        const headerContent = document.createElement('div');
        headerContent.className = 'flex items-center justify-between gap-1';

        const inputContainer = document.createElement('div');
        inputContainer.className = 'flex-grow';

        const headerInput = document.createElement('input');
        headerInput.type = 'text';
        headerInput.value = column.header;
        headerInput.className = 'form-input w-full p-1 bg-gray-700 border-none rounded-md text-white focus:bg-gray-600';
        headerInput.placeholder = `列 ${index + 1}`;
        headerInput.addEventListener('change', (e) => {
            columns[index].header = e.target.value;
            onStateChange({ columns, data });
        });
        inputContainer.appendChild(headerInput);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '&times;';
        deleteBtn.className = 'text-gray-400 hover:text-red-400 font-bold text-xl leading-none px-2 rounded-full self-start';
        deleteBtn.title = 'この列を削除';
        deleteBtn.addEventListener('click', () => {
            delete data[column.id];
            columns.splice(index, 1);
            onStateChange({ columns, data });
        });

        headerContent.appendChild(inputContainer);
        headerContent.appendChild(deleteBtn);
        th.appendChild(headerContent);
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    if (showDataRow) {
        const tbody = document.createElement('tbody');
        const dataRow = document.createElement('tr');
        columns.forEach(column => {
            const td = document.createElement('td');
            td.className = 'p-1 border border-gray-600';
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'form-input w-full p-1 bg-gray-800 border-none rounded-md text-white focus:bg-gray-700';
            input.dataset.columnId = column.id;

            if (isReadOnly && isReadOnly(column.id)) {
                input.readOnly = true;
                input.classList.add('bg-gray-900', 'text-gray-400');
                input.value = getCellValue ? getCellValue(column.id) : (data[column.id] || '');
                data[column.id] = input.value;
            } else {
                input.value = data[column.id] || '';
                input.addEventListener('input', (e) => {
                    data[column.id] = e.target.value;
                    onDataChange(data);
                });
            }
            td.appendChild(input);
            dataRow.appendChild(td);
        });
        tbody.appendChild(dataRow);
        table.appendChild(tbody);
    }

    container.appendChild(table);

    return {
        getColumns: () => columns,
        getData: () => data,
    };
}

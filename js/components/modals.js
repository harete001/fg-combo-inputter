import { state } from '../state.js';
import * as dom from '../dom.js';
import { loadYouTubeVideo, updatePlaybackHistory } from '../youtube.js';
import { updateCommandModalPreview, updateCommittedCommandsList } from '../command_modal.js';

export function openCommandInputModal(targetInput) {
    state.activeCommandInputTarget = targetInput;
    state.commandBuffer = [];
    state.committedCommands = [];
    updateCommandModalPreview();
    updateCommittedCommandsList();
    dom.commandInputModalContainer.classList.remove('hidden');
    dom.gridContainer.querySelectorAll('.form-input').forEach(input => input.disabled = true);
}

export function closeCommandInputModal(shouldFocus = true) {
    dom.gridContainer.querySelectorAll('.form-input').forEach(input => input.disabled = false);
    if(state.activeCommandInputTarget && shouldFocus) state.activeCommandInputTarget.focus();
    state.activeCommandInputTarget = null;
    state.isTextEntryMode = false; // テキスト入力モードをリセット
    dom.commandInputModalContainer.classList.add('hidden');
}

export function openPlaybackHistoryModal() {
    renderPlaybackHistory(dom.historySearchInput.value);
    dom.playbackHistoryModalContainer.classList.remove('hidden');
    setTimeout(() => dom.historySearchInput.focus(), 50);
}

export function closePlaybackHistoryModal() {
    dom.playbackHistoryModalContainer.classList.add('hidden');
}

export function openConfirmModal(message, callback) {
    dom.confirmDeleteMessage.innerHTML = message;
    state.onConfirmDelete = callback;
    dom.confirmDeleteModalContainer.classList.remove('hidden');
    dom.confirmDeleteButton.focus();
}

export function closeConfirmModal() {
    state.onConfirmDelete = null;
    dom.confirmDeleteModalContainer.classList.add('hidden');
}

export function openMoveRecordsModal(message, callback) {
    dom.moveRecordsMessage.innerHTML = message;
    state.onConfirmMove = callback;
    dom.moveRecordsModalContainer.classList.remove('hidden');
    dom.confirmMoveButton.focus();
}

export function closeMoveRecordsModal() {
    state.onConfirmMove = null;
    dom.moveRecordsModalContainer.classList.add('hidden');
}

export function openGamepadMappingModal() {
    dom.gamepadMappingModalContainer.classList.remove('hidden');
    dom.skipMappingButton.focus();
}

export function closeGamepadMappingModal() {
    dom.gamepadMappingModalContainer.classList.add('hidden');
    state.gamepadMappingSequence = null;
}

export function openImportOptionsModal(data, callback) {
    dom.importOptionsList.innerHTML = '';
    state.pendingImportData = data;
    state.onConfirmImport = callback;

    // 全般設定のチェックボックス
    const generalSettingsHtml = `
        <div class="bg-gray-700 p-3 rounded-md">
            <label class="flex items-center gap-3 text-gray-200 cursor-pointer">
                <input type="checkbox" name="import-option" value="general" class="form-checkbox h-5 w-5 bg-gray-800 border-gray-600 rounded text-blue-500" checked>
                <span>全般設定 (キーマップ, プリセットなど)</span>
            </label>
        </div>
    `;
    dom.importOptionsList.insertAdjacentHTML('beforeend', generalSettingsHtml);

    // データベーステーブルのチェックボックス
    if (data.indexedDb && data.indexedDb.schemas) {
        const dbSection = document.createElement('div');
        dbSection.className = 'space-y-2';
        const dbHeader = document.createElement('h4');
        dbHeader.className = 'text-lg font-semibold text-gray-300 mt-4 border-b border-gray-600 pb-1';
        dbHeader.textContent = 'データベーステーブル';
        dbSection.appendChild(dbHeader);

        data.indexedDb.schemas.filter(s => s.tableName !== '_tableSchemas').forEach(schema => {
            const tableHtml = `
                <div class="bg-gray-700 p-3 rounded-md">
                    <label class="flex items-center gap-3 text-gray-200 cursor-pointer">
                        <input type="checkbox" name="import-option" value="${schema.tableName}" class="form-checkbox h-5 w-5 bg-gray-800 border-gray-600 rounded text-blue-500" checked>
                        <span>${schema.tableName} (${schema.recordCount || 0}件)</span>
                    </label>
                </div>
            `;
            dbSection.insertAdjacentHTML('beforeend', tableHtml);
        });
        dom.importOptionsList.appendChild(dbSection);
    }

    dom.importOptionsModalContainer.classList.remove('hidden');
}

export function closeImportOptionsModal() {
    state.pendingImportData = null;
    state.onConfirmImport = null;
    dom.importOptionsModalContainer.classList.add('hidden');
}

export function renderPlaybackHistory(filterText = '') {
    dom.playbackHistoryContainer.innerHTML = '';
    const filteredHistory = state.playbackHistory.filter(item =>
        item.title.toLowerCase().includes(filterText.toLowerCase())
    );

    if (filteredHistory.length === 0) {
        dom.playbackHistoryContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">再生履歴はありません。</p>';
        return;
    }

    filteredHistory.forEach(item => {
        const card = document.createElement('div');
        card.className = 'playback-history-card flex justify-between items-center p-3 bg-gray-800 rounded-md hover:bg-gray-700 cursor-pointer transition-colors';
        card.innerHTML = `
            <span class="text-sm text-white truncate pr-4" title="${item.title}">${item.title}</span>
            <div class="flex items-center flex-shrink-0 ml-4">
                <span class="text-sm text-gray-400">${item.lastPlayed}</span>
                <button data-videoid="${item.videoId}" class="delete-history-item-btn ml-3 text-gray-500 hover:text-red-400 text-xl leading-none p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-500">&times;</button>
            </div>
        `;
        card.addEventListener('click', () => {
            dom.youtubeUrlInput.value = `https://www.youtube.com/watch?v=${item.videoId}`;
            loadYouTubeVideo();
            closePlaybackHistoryModal();
        });

        const deleteBtn = card.querySelector('.delete-history-item-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            const videoIdToDelete = e.currentTarget.dataset.videoid;
            const indexToDelete = state.playbackHistory.findIndex(historyItem => historyItem.videoId === videoIdToDelete);
            
            if (indexToDelete > -1) {
                updatePlaybackHistory(videoIdToDelete, null, true); // Delete only
                renderPlaybackHistory(dom.historySearchInput.value);
            }
        });

        dom.playbackHistoryContainer.appendChild(card);
    });
}
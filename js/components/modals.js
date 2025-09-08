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
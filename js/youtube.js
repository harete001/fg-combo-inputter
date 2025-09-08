import { state } from './state.js';
import * as dom from './dom.js';
import { loadMemos, saveMemos, savePlaybackHistory } from './storage.js';
import { renderPlaybackHistory } from './components/modals.js';
import { renderMemos } from './ui.js';

export function loadYouTubeAPI() {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

window.onYouTubeIframeAPIReady = () => {
    console.log(`[ComboEditor] YouTube IFrame API is ready.`);
    state.ytPlayer = new YT.Player('youtube-player', {
        height: '100%',
        width: '100%',
        videoId: '', // Initially empty
        playerVars: {
            'playsinline': 1
        },
        events: {
            'onReady': (event) => console.log("Player ready"),
            'onStateChange': (event) => {
                if (event.data === YT.PlayerState.PLAYING) {
                    const videoData = state.ytPlayer.getVideoData();
                    state.currentVideoId = videoData.video_id;
                    loadMemos();
                    renderMemos();
                    updatePlaybackHistory(state.currentVideoId, videoData.title);
                }
            }
        }
    });
};

export function getYouTubeId(url) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

export function loadYouTubeVideo() {
    const url = dom.youtubeUrlInput.value;
    const videoId = getYouTubeId(url);
    if (videoId) {
        state.currentVideoId = videoId;
        state.ytPlayer.loadVideoById(videoId);
        loadMemos();
        renderMemos();
    } else {
        alert('有効なYouTubeのURLを入力してください。');
    }
}

export function updatePlaybackHistory(videoId, title, deleteOnly = false) {
    if (!videoId) return;

    const now = new Date().toLocaleString('ja-JP');
    const existingIndex = state.playbackHistory.findIndex(item => item.videoId === videoId);

    if (deleteOnly) {
        if (existingIndex > -1) {
            state.playbackHistory.splice(existingIndex, 1);
        }
    } else {
        if (!title) return; // Title is required for adding/updating

    if (existingIndex > -1) {
        const existingItem = state.playbackHistory.splice(existingIndex, 1)[0];
        existingItem.lastPlayed = now;
        state.playbackHistory.unshift(existingItem);
    } else {
        state.playbackHistory.unshift({
            videoId: videoId,
            title: title,
            lastPlayed: now
        });
    }
    }

    if (state.playbackHistory.length > 50) {
        state.playbackHistory.pop();
    }

    savePlaybackHistory();
    if (!dom.playbackHistoryModalContainer.classList.contains('hidden')) {
        renderPlaybackHistory(dom.historySearchInput.value);
    }
}
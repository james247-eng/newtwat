import { db, auth } from './firebase-config.js';
import { collection, query, orderBy, limit, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// DOM Elements
const audioElement = document.getElementById('audio-element');
const audioPlayerSection = document.getElementById('audio-player-section');
const downloadBtn = document.getElementById('download-btn');
const audioHistory = document.getElementById('audio-history');

// State
let currentAudioUrl = null;
let currentAudioId = null;
let historyItems = [];

// Initialize
export function initAudioPlayer() {
  downloadBtn.addEventListener('click', handleDownload);
  loadAudioHistory();
}

// Play Audio
export function playAudio(audioUrl, audioId = null) {
  currentAudioUrl = audioUrl;
  currentAudioId = audioId;
  
  audioElement.src = audioUrl;
  audioElement.load();
  audioElement.play();
  
  audioPlayerSection.style.display = 'block';
  
  // Scroll to player
  audioPlayerSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Download Audio
function handleDownload() {
  if (!currentAudioUrl) return;
  
  const link = document.createElement('a');
  link.href = currentAudioUrl;
  link.download = `tts_${currentAudioId || Date.now()}.mp3`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Load Audio History from Firestore
export async function loadAudioHistory() {
  if (!auth.currentUser) return;
  
  try {
    audioHistory.innerHTML = '<div class="loader">Loading history...</div>';
    
    const historyQuery = query(
      collection(db, 'audio_history', auth.currentUser.uid, 'audios'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    const snapshot = await getDocs(historyQuery);
    historyItems = [];
    
    snapshot.forEach(docSnap => {
      historyItems.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    
    renderAudioHistory();
    
  } catch (error) {
    console.error('Error loading audio history:', error);
    audioHistory.innerHTML = '<p class="empty-state">No audio generated yet</p>';
  }
}

// Render Audio History
function renderAudioHistory() {
  if (historyItems.length === 0) {
    audioHistory.innerHTML = '<p class="empty-state">No audio generated yet</p>';
    return;
  }
  
  audioHistory.innerHTML = historyItems.map(item => {
    const date = item.createdAt ? formatDate(item.createdAt.toDate()) : 'Just now';
    
    return `
      <div class="history-item" data-audio-id="${item.id}">
        <div class="history-info">
          <div class="history-text">${escapeHtml(item.text)}</div>
          <div class="history-meta">
            ${date} • ${item.charactersUsed} characters
          </div>
        </div>
        <div class="history-actions">
          <button class="btn-icon play-history-btn" data-audio-url="${item.audioUrl}" data-audio-id="${item.audioId}" title="Play">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
          <button class="btn-icon download-history-btn" data-audio-url="${item.audioUrl}" data-audio-id="${item.audioId}" title="Download">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
          </button>
          <button class="btn-icon delete-history-btn" data-history-id="${item.id}" title="Delete">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event handlers
  document.querySelectorAll('.play-history-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      playAudio(btn.dataset.audioUrl, btn.dataset.audioId);
    });
  });
  
  document.querySelectorAll('.download-history-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      downloadHistoryAudio(btn.dataset.audioUrl, btn.dataset.audioId);
    });
  });
  
  document.querySelectorAll('.delete-history-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      deleteHistoryItem(btn.dataset.historyId);
    });
  });
}

// Download History Audio
function downloadHistoryAudio(audioUrl, audioId) {
  const link = document.createElement('a');
  link.href = audioUrl;
  link.download = `tts_${audioId}.mp3`;
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Delete History Item
async function deleteHistoryItem(historyId) {
  if (!confirm('Delete this audio from history?')) return;
  
  try {
    await deleteDoc(doc(db, 'audio_history', auth.currentUser.uid, 'audios', historyId));
    await loadAudioHistory();
  } catch (error) {
    console.error('Error deleting history item:', error);
    alert('Failed to delete audio. Check console for details.');
  }
}

// Format Date
function formatDate(date) {
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Hide Audio Player
export function hideAudioPlayer() {
  audioPlayerSection.style.display = 'none';
  audioElement.pause();
  audioElement.src = '';
  currentAudioUrl = null;
  currentAudioId = null;
}
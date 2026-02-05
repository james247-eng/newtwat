import { auth, db } from './firebase-config.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-auth.js";
import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

import { initApiManager, loadApiKeys } from './api-manager.js';
import { initVoiceManager, getSelectedVoice, getVoiceSettings } from './voice-manager.js';
import { initAudioPlayer, playAudio, loadAudioHistory } from './audio-player.js';

// DOM Elements
const authScreen = document.getElementById('auth-screen');
const appScreen = document.getElementById('app');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const authError = document.getElementById('auth-error');
const logoutBtn = document.getElementById('logout-btn');

const textInput = document.getElementById('text-input');
const charCount = document.getElementById('char-count');
const generateBtn = document.getElementById('generate-btn');
const clearBtn = document.getElementById('clear-btn');
const generationStatus = document.getElementById('generation-status');

const usageStatsBtn = document.getElementById('usage-stats-btn');
const usageModal = document.getElementById('usage-modal');
const usageStatsContent = document.getElementById('usage-stats-content');

const stabilitySlider = document.getElementById('stability-slider');
const claritySlider = document.getElementById('clarity-slider');
const styleSlider = document.getElementById('style-slider');
const stabilityValue = document.getElementById('stability-value');
const clarityValue = document.getElementById('clarity-value');
const styleValue = document.getElementById('style-value');

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = 'dkbadi6hs'; 
const CLOUDINARY_UPLOAD_PRESET = 'tts_preset'; // You'll create this in Cloudinary dashboard

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initUI();
});

// ==================== AUTHENTICATION ====================

function initAuth() {
  authForm.addEventListener('submit', handleLogin);
  signupBtn.addEventListener('click', handleSignup);
  logoutBtn.addEventListener('click', handleLogout);
  
  onAuthStateChanged(auth, (user) => {
    if (user) {
      showApp();
    } else {
      showAuth();
    }
  });
}

async function handleLogin(e) {
  e.preventDefault();
  
  const email = authEmail.value.trim();
  const password = authPassword.value;
  
  try {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';
    authError.classList.remove('show');
    
    await signInWithEmailAndPassword(auth, email, password);
    
  } catch (error) {
    console.error('Login error:', error);
    showAuthError(getAuthErrorMessage(error.code));
    
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
}

async function handleSignup() {
  const email = authEmail.value.trim();
  const password = authPassword.value;
  
  if (!email || !password) {
    showAuthError('Please enter email and password');
    return;
  }
  
  if (password.length < 6) {
    showAuthError('Password must be at least 6 characters');
    return;
  }
  
  try {
    signupBtn.disabled = true;
    signupBtn.textContent = 'Creating account...';
    authError.classList.remove('show');
    
    await createUserWithEmailAndPassword(auth, email, password);
    
  } catch (error) {
    console.error('Signup error:', error);
    showAuthError(getAuthErrorMessage(error.code));
    
    signupBtn.disabled = false;
    signupBtn.textContent = 'Create Account';
  }
}

async function handleLogout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout error:', error);
  }
}

function showAuth() {
  authScreen.classList.remove('hidden');
  appScreen.classList.add('hidden');
  authForm.reset();
  authError.classList.remove('show');
}

function showApp() {
  authScreen.classList.add('hidden');
  appScreen.classList.remove('hidden');
  
  initApiManager();
  initVoiceManager();
  initAudioPlayer();
}

function showAuthError(message) {
  authError.textContent = message;
  authError.classList.add('show');
}

function getAuthErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
      return 'No account found with this email';
    case 'auth/wrong-password':
      return 'Incorrect password';
    case 'auth/email-already-in-use':
      return 'Email already in use';
    case 'auth/weak-password':
      return 'Password is too weak';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection';
    default:
      return 'Authentication failed. Please try again';
  }
}

// ==================== UI INITIALIZATION ====================

function initUI() {
  textInput.addEventListener('input', handleTextInput);
  clearBtn.addEventListener('click', handleClear);
  generateBtn.addEventListener('click', handleGenerate);
  
  stabilitySlider.addEventListener('input', (e) => {
    stabilityValue.textContent = (e.target.value / 100).toFixed(2);
  });
  
  claritySlider.addEventListener('input', (e) => {
    clarityValue.textContent = (e.target.value / 100).toFixed(2);
  });
  
  styleSlider.addEventListener('input', (e) => {
    styleValue.textContent = (e.target.value / 100).toFixed(2);
  });
  
  usageStatsBtn.addEventListener('click', showUsageStats);
  
  usageModal.addEventListener('click', (e) => {
    if (e.target === usageModal) {
      usageModal.classList.add('hidden');
    }
  });
}

// ==================== TEXT INPUT ====================

function handleTextInput(e) {
  const text = e.target.value;
  const length = text.length;
  
  charCount.textContent = `${length} / 5000`;
  
  if (length > 4500) {
    charCount.style.color = 'var(--danger)';
  } else if (length > 4000) {
    charCount.style.color = 'var(--accent)';
  } else {
    charCount.style.color = 'var(--text-muted)';
  }
  
  const selectedVoice = getSelectedVoice();
  generateBtn.disabled = length === 0 || !selectedVoice;
}

function handleClear() {
  textInput.value = '';
  charCount.textContent = '0 / 5000';
  charCount.style.color = 'var(--text-muted)';
  generateBtn.disabled = true;
  hideStatus();
}

// ==================== TTS GENERATION ====================

async function handleGenerate() {
  const text = textInput.value.trim();
  const selectedVoice = getSelectedVoice();
  
  if (!text || !selectedVoice) {
    showStatus('Please enter text and select a voice', 'error');
    return;
  }
  
  if (text.length > 5000) {
    showStatus('Text exceeds 5000 character limit', 'error');
    return;
  }
  
  try {
    generateBtn.disabled = true;
    generateBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
      Generating...
    `;
    textInput.disabled = true;
    
    showStatus('Generating speech...', 'loading');
    
    const settings = getVoiceSettings();
    
    // Step 1: Call Vercel API to generate TTS
    const response = await fetch('/api/generate-tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: text,
        voiceId: selectedVoice.voice_id,
        settings: settings,
        userId: auth.currentUser.uid
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Generation failed');
    }
    
    showStatus('Uploading to Cloudinary...', 'loading');
    
    // Step 2: Convert base64 to blob
    const audioBlob = base64ToBlob(data.audioBase64, 'audio/mpeg');
    
    // Step 3: Upload to Cloudinary
    const cloudinaryUrl = await uploadToCloudinary(audioBlob);
    
    showStatus('Saving to history...', 'loading');
    
    // Step 4: Save metadata to Firestore
    const audioId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await addDoc(collection(db, 'audio_history', auth.currentUser.uid, 'audios'), {
      audioId: audioId,
      text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
      voiceId: selectedVoice.voice_id,
      audioUrl: cloudinaryUrl,
      charactersUsed: text.length,
      createdAt: new Date()
    });
    
    showStatus(`Speech generated! (${data.charactersUsed} characters used)`, 'success');
    
    // Play audio
    playAudio(cloudinaryUrl, audioId);
    
    // Reload history and API keys
    await loadAudioHistory();
    await loadApiKeys();
    
  } catch (error) {
    console.error('TTS Generation Error:', error);
    
    let errorMessage = 'Generation failed. ';
    
    if (error.message.includes('No available API keys')) {
      errorMessage += 'All API keys have exceeded their quota. Add more keys or wait for quota reset.';
    } else {
      errorMessage += error.message || 'Check console for details.';
    }
    
    showStatus(errorMessage, 'error');
    
  } finally {
    generateBtn.disabled = false;
    generateBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
      Generate Speech
    `;
    textInput.disabled = false;
    
    const selectedVoice = getSelectedVoice();
    generateBtn.disabled = textInput.value.trim().length === 0 || !selectedVoice;
  }
}

// ==================== CLOUDINARY UPLOAD ====================

async function uploadToCloudinary(audioBlob) {
  const formData = new FormData();
  formData.append('file', audioBlob);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('resource_type', 'video'); // Cloudinary uses 'video' for audio
  
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`,
    {
      method: 'POST',
      body: formData
    }
  );
  
  if (!response.ok) {
    throw new Error('Cloudinary upload failed');
  }
  
  const data = await response.json();
  return data.secure_url;
}

// ==================== HELPER FUNCTIONS ====================

function base64ToBlob(base64, mimeType) {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  
  return new Blob(byteArrays, { type: mimeType });
}

function showStatus(message, type = 'loading') {
  generationStatus.textContent = message;
  generationStatus.className = `status-message ${type}`;
  generationStatus.classList.remove('hidden');
}

function hideStatus() {
  generationStatus.classList.add('hidden');
}

// ==================== USAGE STATISTICS ====================

async function showUsageStats() {
  usageModal.classList.remove('hidden');
  usageStatsContent.innerHTML = '<div class="loader">Loading statistics...</div>';
  
  try {
    const response = await fetch('/api/get-usage-stats');
    const data = await response.json();
    
    if (data.success) {
      renderUsageStats(data.stats);
    } else {
      throw new Error(data.error || 'Failed to fetch usage stats');
    }
    
  } catch (error) {
    console.error('Error loading usage stats:', error);
    usageStatsContent.innerHTML = '<p class="empty-state" style="color: var(--danger);">Failed to load statistics</p>';
  }
}

function renderUsageStats(stats) {
  if (stats.length === 0) {
    usageStatsContent.innerHTML = '<p class="empty-state">No API keys added yet</p>';
    return;
  }
  
  const totalUsage = stats.reduce((sum, stat) => sum + stat.usage, 0);
  const totalLimit = stats.reduce((sum, stat) => sum + stat.limit, 0);
  const overallPercent = (totalUsage / totalLimit * 100).toFixed(1);
  
  usageStatsContent.innerHTML = `
    <div class="usage-stat-item" style="border: 2px solid var(--primary);">
      <div class="stat-header">
        <span class="stat-key">TOTAL USAGE</span>
        <span class="stat-status active">${overallPercent}%</span>
      </div>
      <div class="stat-bar">
        <div class="stat-bar-fill" style="width: ${overallPercent}%"></div>
      </div>
      <div class="stat-text">${totalUsage.toLocaleString()} / ${totalLimit.toLocaleString()} characters</div>
    </div>
    
    ${stats.map(stat => {
      const percent = (stat.usage / stat.limit * 100).toFixed(1);
      const maskedKey = 'sk_...' + stat.id.slice(-4);
      const statusClass = stat.active ? 'active' : 'inactive';
      const statusText = stat.active ? 'Active' : 'Inactive';
      
      return `
        <div class="usage-stat-item">
          <div class="stat-header">
            <span class="stat-key">${maskedKey}</span>
            <span class="stat-status ${statusClass}">${statusText}</span>
          </div>
          <div class="stat-bar">
            <div class="stat-bar-fill" style="width: ${percent}%"></div>
          </div>
          <div class="stat-text">${stat.usage.toLocaleString()} / ${stat.limit.toLocaleString()} characters (${percent}%)</div>
        </div>
      `;
    }).join('')}
  `;
}

// ==================== LOADING ANIMATION ====================

const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
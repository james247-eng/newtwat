import { functions } from './firebase-config.js';
import { httpsCallable } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-functions.js";

// DOM Elements
const voiceSelect = document.getElementById('voice-select');
const voiceLoader = document.getElementById('voice-loader');

// State
let voices = [];
let selectedVoice = null;

// Initialize
export function initVoiceManager() {
  voiceSelect.addEventListener('change', handleVoiceChange);
  loadVoices();
}

// Load Voices from ElevenLabs
async function loadVoices() {
  try {
    voiceLoader.style.display = 'block';
    voiceSelect.classList.add('hidden');
    
    const getVoices = httpsCallable(functions, 'getVoices');
    const result = await getVoices();
    
    if (result.data.success) {
      voices = result.data.voices;
      renderVoices();
      voiceLoader.style.display = 'none';
      voiceSelect.classList.remove('hidden');
    } else {
      throw new Error('Failed to fetch voices');
    }
    
  } catch (error) {
    console.error('Error loading voices:', error);
    voiceLoader.innerHTML = `
      <p style="color: var(--danger);">
        Failed to load voices. Make sure you've added API keys.
      </p>
    `;
  }
}

// Render Voices in Select Dropdown
function renderVoices() {
  // Group voices by category
  const premadeVoices = voices.filter(v => v.category === 'premade' || !v.category);
  const clonedVoices = voices.filter(v => v.category === 'cloned');
  const generatedVoices = voices.filter(v => v.category === 'generated');
  
  let optionsHTML = '<option value="">Select a voice</option>';
  
  if (premadeVoices.length > 0) {
    optionsHTML += '<optgroup label="Premade Voices">';
    premadeVoices.forEach(voice => {
      const labels = voice.labels ? ` (${Object.values(voice.labels).join(', ')})` : '';
      optionsHTML += `<option value="${voice.voice_id}">${voice.name}${labels}</option>`;
    });
    optionsHTML += '</optgroup>';
  }
  
  if (clonedVoices.length > 0) {
    optionsHTML += '<optgroup label="Cloned Voices">';
    clonedVoices.forEach(voice => {
      optionsHTML += `<option value="${voice.voice_id}">${voice.name}</option>`;
    });
    optionsHTML += '</optgroup>';
  }
  
  if (generatedVoices.length > 0) {
    optionsHTML += '<optgroup label="Generated Voices">';
    generatedVoices.forEach(voice => {
      optionsHTML += `<option value="${voice.voice_id}">${voice.name}</option>`;
    });
    optionsHTML += '</optgroup>';
  }
  
  voiceSelect.innerHTML = optionsHTML;
  
  // Auto-select first voice if available
  if (premadeVoices.length > 0) {
    voiceSelect.value = premadeVoices[0].voice_id;
    selectedVoice = premadeVoices[0];
    updateVoiceSettings(premadeVoices[0]);
  }
}

// Handle Voice Selection Change
function handleVoiceChange(e) {
  const voiceId = e.target.value;
  
  if (!voiceId) {
    selectedVoice = null;
    return;
  }
  
  selectedVoice = voices.find(v => v.voice_id === voiceId);
  
  if (selectedVoice) {
    updateVoiceSettings(selectedVoice);
  }
}

// Update Voice Settings (if voice has default settings)
function updateVoiceSettings(voice) {
  if (voice.settings) {
    const stabilitySlider = document.getElementById('stability-slider');
    const claritySlider = document.getElementById('clarity-slider');
    const styleSlider = document.getElementById('style-slider');
    
    if (voice.settings.stability !== undefined) {
      stabilitySlider.value = voice.settings.stability * 100;
      document.getElementById('stability-value').textContent = voice.settings.stability.toFixed(2);
    }
    
    if (voice.settings.similarity_boost !== undefined) {
      claritySlider.value = voice.settings.similarity_boost * 100;
      document.getElementById('clarity-value').textContent = voice.settings.similarity_boost.toFixed(2);
    }
    
    if (voice.settings.style !== undefined) {
      styleSlider.value = voice.settings.style * 100;
      document.getElementById('style-value').textContent = voice.settings.style.toFixed(2);
    }
  }
}

// Get Selected Voice
export function getSelectedVoice() {
  return selectedVoice;
}

// Get Current Voice Settings
export function getVoiceSettings() {
  const stability = parseFloat(document.getElementById('stability-slider').value) / 100;
  const clarity = parseFloat(document.getElementById('clarity-slider').value) / 100;
  const style = parseFloat(document.getElementById('style-slider').value) / 100;
  
  return {
    stability: stability,
    similarity_boost: clarity,
    style: style,
    use_speaker_boost: true
  };
}

// Reload Voices (for when new voices are cloned)
export function reloadVoices() {
  loadVoices();
}
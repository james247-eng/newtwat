import { db, auth } from './firebase-config.js';
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

// DOM Elements
const addKeyBtn = document.getElementById('add-key-btn');
const addKeyModal = document.getElementById('add-key-modal');
const addKeyForm = document.getElementById('add-key-form');
const newApiKeyInput = document.getElementById('new-api-key');
const apiKeysList = document.getElementById('api-keys-list');
const modalCloseBtns = document.querySelectorAll('.modal-close, .modal-cancel');

// State
let apiKeys = [];

// Initialize
export function initApiManager() {
  addKeyBtn.addEventListener('click', openAddKeyModal);
  addKeyForm.addEventListener('submit', handleAddKey);
  
  modalCloseBtns.forEach(btn => {
    btn.addEventListener('click', closeModals);
  });
  
  // Close modal on outside click
  addKeyModal.addEventListener('click', (e) => {
    if (e.target === addKeyModal) closeModals();
  });
  
  loadApiKeys();
}

// Open Add Key Modal
function openAddKeyModal() {
  addKeyModal.classList.remove('hidden');
  newApiKeyInput.focus();
}

// Close All Modals
function closeModals() {
  addKeyModal.classList.add('hidden');
  document.getElementById('usage-modal').classList.add('hidden');
  addKeyForm.reset();
}

// Load API Keys from Firestore
export async function loadApiKeys() {
  if (!auth.currentUser) return;
  
  try {
    apiKeysList.innerHTML = '<div class="loader">Loading keys...</div>';
    
    const keysQuery = query(
      collection(db, 'api_keys'),
      orderBy('last_used', 'desc')
    );
    
    const snapshot = await getDocs(keysQuery);
    apiKeys = [];
    
    snapshot.forEach(docSnap => {
      apiKeys.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });
    
    renderApiKeys();
    
  } catch (error) {
    console.error('Error loading API keys:', error);
    apiKeysList.innerHTML = '<p class="empty-state" style="color: var(--danger);">Error loading keys</p>';
  }
}

// Render API Keys List
function renderApiKeys() {
  if (apiKeys.length === 0) {
    apiKeysList.innerHTML = '<p class="empty-state">No API keys added yet</p>';
    return;
  }
  
  apiKeysList.innerHTML = apiKeys.map(key => {
    const usagePercent = (key.usage / key.limit * 100).toFixed(1);
    const maskedKey = maskApiKey(key.key);
    
    return `
      <div class="api-key-item">
        <div class="api-key-info">
          <div class="api-key-name">${maskedKey}</div>
          <div class="api-key-usage">${key.usage.toLocaleString()} / ${key.limit.toLocaleString()} (${usagePercent}%)</div>
        </div>
        <div class="api-key-actions">
          <button class="btn-delete" data-key-id="${key.id}">Delete</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach delete handlers
  document.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => handleDeleteKey(btn.dataset.keyId));
  });
}

// Mask API Key (show only last 4 characters)
function maskApiKey(key) {
  if (key.length <= 8) return key;
  return 'sk_...' + key.slice(-4);
}

// Add API Key
async function handleAddKey(e) {
  e.preventDefault();
  
  const apiKey = newApiKeyInput.value.trim();
  
  if (!apiKey.startsWith('sk_')) {
    alert('Invalid API key format. Must start with "sk_"');
    return;
  }
  
  try {
    const submitBtn = addKeyForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';
    
    await addDoc(collection(db, 'api_keys'), {
      key: apiKey,
      usage: 0,
      limit: 10000,
      active: true,
      last_used: null,
      created_at: new Date()
    });
    
    closeModals();
    await loadApiKeys();
    
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Key';
    
  } catch (error) {
    console.error('Error adding API key:', error);
    alert('Failed to add API key. Check console for details.');
    
    const submitBtn = addKeyForm.querySelector('button[type="submit"]');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Key';
  }
}

// Delete API Key
async function handleDeleteKey(keyId) {
  if (!confirm('Are you sure you want to delete this API key?')) return;
  
  try {
    await deleteDoc(doc(db, 'api_keys', keyId));
    await loadApiKeys();
  } catch (error) {
    console.error('Error deleting API key:', error);
    alert('Failed to delete API key. Check console for details.');
  }
}

// Get API Keys (for external use)
export function getApiKeys() {
  return apiKeys;
}

// Export modal close function
export { closeModals };
/**
 * Settings Window Logic
 * Handles user interactions and persists settings via Secure Bridge
 */

// State Management
const defaultSettings = {
    theme: 'dark',
    showHomeButton: true,
    searchEngine: 'google',
    clearOnExit: false,
    blockThirdPartyCookies: true,
    doNotTrack: true,
    location: '',
    askDownload: false,
    hardwareAcceleration: true
};

let currentSettings = { ...defaultSettings };

// DOM Elements
const elements = {
    theme: document.getElementById('theme-select'),
    showHomeBtn: document.getElementById('show-home-btn'),
    searchEngine: document.getElementById('search-engine'),
    block3rdCookies: document.getElementById('block-3rd-cookies'),
    doNotTrack: document.getElementById('do-not-track'),
    downloadPath: document.getElementById('download-path'),
    btnChangeLoc: document.getElementById('btn-change-loc'),
    askDownload: document.getElementById('ask-download'),
    hardwareAccel: document.getElementById('hardware-accel'),
    btnClearData: document.getElementById('btn-clear-data')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    setupListeners();
    updateUI();
});

/**
 * Load settings from storage and merge with defaults
 */
async function loadSettings() {
    const saved = localStorage.getItem('zy-settings');
    if (saved) {
        try {
            currentSettings = { ...defaultSettings, ...JSON.parse(saved) };
        } catch (e) {
            console.error('Failed to parse settings', e);
        }
    }

    // Load dynamic system values
    if (!currentSettings.location) {
        const defaultPath = await window.zyAPI.getDefaultDownloadPath();
        currentSettings.location = defaultPath;
    }
}

/**
 * Update UI elements to match current state
 */
function updateUI() {
    elements.theme.value = currentSettings.theme;
    elements.showHomeBtn.checked = currentSettings.showHomeButton;
    elements.searchEngine.value = currentSettings.searchEngine;
    elements.block3rdCookies.checked = currentSettings.blockThirdPartyCookies;
    elements.doNotTrack.checked = currentSettings.doNotTrack;
    elements.downloadPath.textContent = currentSettings.location;
    elements.askDownload.checked = currentSettings.askDownload;
    elements.hardwareAccel.checked = currentSettings.hardwareAcceleration;

    // Apply immediate visual effects (e.g. theme)
    document.documentElement.setAttribute('data-theme', currentSettings.theme);
}

/**
 * Setup event listeners for all controls
 */
function setupListeners() {
    // Helper to bind change events
    const bindChange = (el, key, isBool = false) => {
        el.addEventListener('change', (e) => {
            currentSettings[key] = isBool ? e.target.checked : e.target.value;
            saveSettings();
        });
    };

    bindChange(elements.theme, 'theme');
    bindChange(elements.showHomeBtn, 'showHomeButton', true);
    bindChange(elements.searchEngine, 'searchEngine');
    bindChange(elements.block3rdCookies, 'blockThirdPartyCookies', true);
    bindChange(elements.doNotTrack, 'doNotTrack', true);
    bindChange(elements.askDownload, 'askDownload', true);
    bindChange(elements.hardwareAccel, 'hardwareAcceleration', true);

    // Special handlers
    elements.btnChangeLoc.addEventListener('click', async () => {
        const path = await window.zyAPI.selectDownloadLocation();
        if (path) {
            currentSettings.location = path;
            saveSettings();
            updateUI(); // Update label
        }
    });

    elements.btnClearData.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all browsing data (cookies, cache, history)?')) {
            window.zyAPI.clearAllData();
            alert('Browsing data cleared.');
        }
    });
}

/**
 * Save settings to storage and notify main process
 */
function saveSettings() {
    localStorage.setItem('zy-settings', JSON.stringify(currentSettings));

    // You might want to send this to the main process via IPC 
    // if the main process needs to act on these settings immediately
    // window.zyAPI.updateSettings(currentSettings); (Not strictly needed for this MVP unless main process logic depends on it)
}

/**
 * Zy Browser - Preload Script
 * 
 * This script runs in a privileged context before the renderer loads.
 * It creates a secure bridge between the main process and renderer
 * using Electron's contextBridge API.
 * 
 * Security note:
 * - Only expose necessary APIs to the renderer
 * - Never expose Node.js or Electron internals directly
 * - Validate all data passed through the bridge
 */

const { contextBridge, ipcRenderer } = require('electron');

// ============================================
// EXPOSED API
// ============================================

/**
 * Expose a minimal, secure API to the renderer process.
 * This is accessed via `window.zyAPI` in the renderer.
 */
contextBridge.exposeInMainWorld('zyAPI', {
    /**
     * Get the application version
     * @returns {Promise<string>} The app version
     */
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    /**
     * Get system performance metrics
     */
    getMetrics: () => ipcRenderer.invoke('get-system-metrics'),

    /**
     * Window controls for frameless window
     */
    windowMinimize: () => ipcRenderer.send('window-minimize'),
    windowMaximize: () => ipcRenderer.send('window-maximize'),
    windowClose: () => ipcRenderer.send('window-close'),

    /**
     * Open settings window
     */
    openSettings: () => ipcRenderer.send('open-settings'),

    updateSettings: (settings) => ipcRenderer.send('settings-changed', settings),

    /**
     * Settings Management
     * Listen for settings updates from main process
     */
    onSettingsUpdated: (callback) => {
        // Filter callback to prevent exposing IPC event object
        const subscription = (event, settings) => callback(settings);
        ipcRenderer.on('settings-updated', subscription);

        // Return a cleanup function
        return () => ipcRenderer.removeListener('settings-updated', subscription);
    },

    /**
     * Data Clearing
     */
    clearCache: () => ipcRenderer.send('clear-cache'),
    clearCookies: () => ipcRenderer.send('clear-cookies'),
    clearHistory: () => ipcRenderer.send('clear-history'), // Handled in renderer logic mostly, but good to have hooks
    clearAllData: () => ipcRenderer.send('clear-all-data'),

    /**
     * Download Management
     */
    selectDownloadLocation: () => ipcRenderer.invoke('select-download-location'),
    getDefaultDownloadPath: () => ipcRenderer.invoke('get-default-download-path'),

    /**
     * Platform information for UI customization
     */
    platform: process.platform
});

/**
 * Zy Browser - Renderer Script (Multi-Tab & Productivity Edition)
 */

// ============================================
// CONFIGURATION & STATE
// ============================================

const state = {
    tabs: [], // Array of { id, url, title, isLoading }
    activeTabId: null,
    isSplitView: false,
    splitTabId: null,
    isSidebarOpen: true,
    metricsInterval: null
};

const elements = {
    tabBar: document.getElementById('tab-bar'),
    viewsContainer: document.getElementById('views-container'),
    urlInput: document.getElementById('url-input'),
    btnBack: document.getElementById('btn-back'),
    btnForward: document.getElementById('btn-forward'),
    btnReload: document.getElementById('btn-reload'),
    btnNewTab: document.getElementById('btn-new-tab'),
    btnSplitView: document.getElementById('btn-split-view'),
    loadingBar: document.getElementById('loading-bar'),

    // Sidebar
    sidebar: document.getElementById('sidebar'),
    btnToggleSidebar: document.getElementById('btn-toggle-sidebar'),
    sidebarTabs: document.querySelectorAll('.sidebar-tab'),
    toolViews: document.querySelectorAll('.tool-view'),

    // Dev Tools
    devPanel: document.getElementById('dev-panel'),
    btnDevTools: document.getElementById('btn-devtools'),
    btnToolsToggle: document.getElementById('btn-tools-toggle'),

    // Productivity
    clipboardList: document.getElementById('clipboard-list'),
    notesArea: document.getElementById('notes-area'),
    sessionList: document.getElementById('session-list')
};

// ============================================
// TAB MANAGER
// Handles creation/deletion/switching of tabs
// ============================================

const TabManager = {
    /**
     * Create a new tab and its webview
     */
    createTab: (url = 'https://www.google.com', activate = true) => {
        const tabId = 'tab-' + Date.now();
        const tabData = { id: tabId, url, title: 'New Tab', isLoading: true };
        state.tabs.push(tabData);

        // 1. Create Tab Button in UI
        const tabEl = document.createElement('div');
        tabEl.className = 'tab';
        tabEl.id = `btn-${tabId}`;
        tabEl.innerHTML = `
            <span class="tab-title">New Tab</span>
            <button class="tab-close" title="Close Tab">×</button>
        `;

        tabEl.addEventListener('click', () => TabManager.switchTab(tabId));
        tabEl.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            TabManager.closeTab(tabId);
        });

        elements.tabBar.appendChild(tabEl);

        // 2. Create Webview
        const viewEl = document.createElement('webview');
        viewEl.id = `view-${tabId}`;
        viewEl.className = 'webview';
        viewEl.src = url;
        viewEl.setAttribute('allowpopups', '');
        viewEl.setAttribute('plugins', '');
        viewEl.setAttribute('webpreferences', 'allowRunningInsecureContent=true');

        // Attach Webview Events
        viewEl.addEventListener('did-start-loading', () => TabManager.updateLoading(tabId, true));
        viewEl.addEventListener('did-stop-loading', () => TabManager.updateLoading(tabId, false));
        viewEl.addEventListener('page-title-updated', (e) => TabManager.updateTitle(tabId, e.title));
        viewEl.addEventListener('did-navigate', (e) => TabManager.updateUrl(tabId, e.url));
        viewEl.addEventListener('did-navigate-in-page', (e) => TabManager.updateUrl(tabId, e.url));
        viewEl.addEventListener('new-window', (e) => TabManager.createTab(e.url));

        elements.viewsContainer.appendChild(viewEl);

        if (activate) TabManager.switchTab(tabId);
        return tabId;
    },

    /**
     * Switch to a specific tab
     */
    switchTab: (tabId) => {
        state.activeTabId = tabId;

        // Update UI Tabs
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.getElementById(`btn-${tabId}`).classList.add('active');

        // Update Webviews (Show active, hide others)
        document.querySelectorAll('webview').forEach(v => {
            v.style.display = (v.id === `view-${tabId}`) ? 'flex' : 'none';
        });

        const activeWebview = TabManager.getActiveWebview();
        if (activeWebview) {
            elements.urlInput.value = activeWebview.getURL();
            updateNavigationButtons();
        }

        // Handle Split View visibility
        if (state.isSplitView && state.splitTabId) {
            const splitView = document.getElementById(`view-${state.splitTabId}`);
            if (splitView) splitView.style.display = 'flex';
        }
    },

    /**
     * Close a tab
     */
    closeTab: (tabId) => {
        if (state.tabs.length <= 1) return; // Don't close last tab

        const index = state.tabs.findIndex(t => t.id === tabId);
        state.tabs.splice(index, 1);

        document.getElementById(`btn-${tabId}`).remove();
        document.getElementById(`view-${tabId}`).remove();

        // Switch to neighbor if closed tab was active
        if (state.activeTabId === tabId) {
            const nextTab = state.tabs[index] || state.tabs[index - 1];
            TabManager.switchTab(nextTab.id);
        }
    },

    /**
     * Get the webview of the currently active tab
     */
    getActiveWebview: () => {
        return document.getElementById(`view-${state.activeTabId}`);
    },

    updateLoading: (tabId, isLoading) => {
        if (tabId === state.activeTabId) {
            if (isLoading) {
                elements.loadingBar.classList.add('loading');
                elements.loadingBar.classList.remove('complete');
            } else {
                elements.loadingBar.classList.remove('loading');
                elements.loadingBar.classList.add('complete');
                setTimeout(() => elements.loadingBar.classList.remove('complete'), 600);
            }
            updateNavigationButtons();
        }
    },

    updateTitle: (tabId, title) => {
        const tabEl = document.getElementById(`btn-${tabId}`);
        if (tabEl) tabEl.querySelector('.tab-title').textContent = title || 'Untitled';
        if (tabId === state.activeTabId) document.title = `${title} - Zy Browser`;
    },

    updateUrl: (tabId, url) => {
        if (tabId === state.activeTabId) {
            elements.urlInput.value = url;
            updateNavigationButtons();
        }
    }
};

// ============================================
// SIDEBAR TOOLS (Productivity)
// ============================================

const SidebarManager = {
    init: () => {
        // Tab switching
        elements.sidebarTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                elements.sidebarTabs.forEach(t => t.classList.remove('active'));
                elements.toolViews.forEach(v => v.classList.remove('active'));

                tab.classList.add('active');
                document.getElementById(`view-${tab.dataset.view}`).classList.add('active');
            });
        });

        // Toggle Sidebar
        elements.btnToggleSidebar.addEventListener('click', () => {
            state.isSidebarOpen = !state.isSidebarOpen;
            elements.sidebar.classList.toggle('collapsed', !state.isSidebarOpen);
        });

        // Initialize Tools
        SidebarManager.setupClipboard();
        SidebarManager.setupNotes();
        SidebarManager.setupSessions();
    },

    setupClipboard: () => {
        // In a real app, listen to 'clipboard-read' ipc
        // For demo: Mock functionality or simple text monitoring
        setInterval(async () => {
            try {
                // Poll clipboard logic if supported by API
            } catch (e) { }
        }, 1000);

        document.getElementById('btn-clear-clipboard').addEventListener('click', () => {
            elements.clipboardList.innerHTML = '';
        });
    },

    setupNotes: () => {
        // Load saved notes
        const saved = localStorage.getItem('zy-notes');
        if (saved) elements.notesArea.value = saved;

        // Auto-save notes
        elements.notesArea.addEventListener('input', (e) => {
            localStorage.setItem('zy-notes', e.target.value);
        });
    },

    setupSessions: () => {
        const loadSessions = () => {
            const sessions = JSON.parse(localStorage.getItem('zy-sessions') || '[]');
            elements.sessionList.innerHTML = sessions.map((s, i) => `
                <li class="list-item">
                    <span>${s.date} (${s.count} tabs)</span>
                    <button class="text-btn" onclick="restoreSession(${i})">Load</button>
                </li>
            `).join('');
        };

        document.getElementById('btn-save-session').addEventListener('click', () => {
            const session = {
                date: new Date().toLocaleTimeString(),
                count: state.tabs.length,
                urls: state.tabs.map(t => document.getElementById(`view-${t.id}`).src)
            };
            const sessions = JSON.parse(localStorage.getItem('zy-sessions') || '[]');
            sessions.push(session);
            localStorage.setItem('zy-sessions', JSON.stringify(sessions));
            loadSessions();
        });

        loadSessions();
    }
};

// ============================================
// NAVIGATION & UI HELPERS
// ============================================

function navigateTo(url) {
    const webview = TabManager.getActiveWebview();
    if (webview) webview.src = formatUrl(url);
}

function reload() {
    const webview = TabManager.getActiveWebview();
    if (webview) webview.reload();
}

function goBack() {
    const webview = TabManager.getActiveWebview();
    if (webview && webview.canGoBack()) webview.goBack();
}

function goForward() {
    const webview = TabManager.getActiveWebview();
    if (webview && webview.canGoForward()) webview.goForward();
}

function updateNavigationButtons() {
    const webview = TabManager.getActiveWebview();
    if (webview) {
        elements.btnBack.disabled = !webview.canGoBack();
        elements.btnForward.disabled = !webview.canGoForward();
    }
}

// URL Utilities
function formatUrl(input) {
    if (!input) return 'https://www.google.com';
    let url = input.trim();
    if (url.includes(' ') || !url.includes('.')) return 'https://www.google.com/search?q=' + encodeURIComponent(url);
    if (!/^https?:\/\//i.test(url)) return 'https://' + url;
    return url;
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Event Listeners
    elements.btnNewTab.addEventListener('click', () => TabManager.createTab());
    elements.btnBack.addEventListener('click', goBack);
    elements.btnForward.addEventListener('click', goForward);
    elements.btnReload.addEventListener('click', reload);

    elements.urlInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            navigateTo(e.target.value);
            e.target.blur();
        }
    });

    elements.urlInput.addEventListener('focus', () => elements.urlInput.select());

    // Tools Toggle
    elements.btnToolsToggle.addEventListener('click', () => {
        elements.devPanel.style.display = elements.devPanel.style.display === 'none' ? 'flex' : 'none';
    });

    // Initialize Systems
    SidebarManager.init();

    // Create initial tab
    TabManager.createTab('https://www.google.com');
});

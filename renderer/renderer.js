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
    createTab: (url = 'zy://home', activate = true) => {
        const tabId = 'tab-' + Date.now();
        const tabData = { id: tabId, url, title: 'New Tab', isLoading: true };
        state.tabs.push(tabData);

        // 1. Create Tab Button in UI
        const tabEl = document.createElement('div');
        tabEl.className = 'tab';
        tabEl.id = `btn-${tabId}`;
        tabEl.innerHTML = `
            <div class="tab-favicon">🌐</div>
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
            // Sync Bookmark Star
            if (window.BookmarksManager) window.BookmarksManager.updateStarState();
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
            // Sync Bookmark Star
            if (window.BookmarksManager) window.BookmarksManager.updateStarState();
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
    if (!input) return 'home.html';
    let url = input.trim();
    if (url.includes(' ') || !url.includes('.')) return 'https://www.google.com/search?q=' + encodeURIComponent(url);
    if (!/^https?:\/\//i.test(url)) return 'https://' + url;
    return url;
}

// ============================================
// SETTINGS MANAGER
// ============================================

const SettingsManager = {
    init: () => {
        // Load settings from storage
        SettingsManager.loadSettings();

        // Listen for updates from other windows
        if (window.zyAPI && window.zyAPI.onSettingsUpdated) {
            window.zyAPI.onSettingsUpdated((settings) => {
                SettingsManager.applySettings(settings);
            });
        }
    },

    loadSettings: () => {
        const saved = localStorage.getItem('zy-settings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                SettingsManager.applySettings(settings);
            } catch (e) {
                console.error('Failed to parse settings', e);
            }
        }
    },

    applySettings: (settings) => {
        if (settings.theme) {
            document.documentElement.setAttribute('data-theme', settings.theme);
        }
    }
};

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

    // Sidebar Toggle
    const btnSidebarToggle = document.getElementById('btn-toggle-sidebar');
    if (btnSidebarToggle) {
        btnSidebarToggle.addEventListener('click', () => {
            elements.sidebar.classList.toggle('open');
        });
    }

    // Settings button
    const btnSettings = document.getElementById('btn-settings');
    if (btnSettings) {
        btnSettings.addEventListener('click', () => {
            window.zyAPI.openSettings();
        });
    }

    // Window Controls (Frameless Window)
    document.getElementById('btn-minimize')?.addEventListener('click', () => {
        window.zyAPI.windowMinimize();
    });

    document.getElementById('btn-maximize')?.addEventListener('click', () => {
        window.zyAPI.windowMaximize();
    });

    document.getElementById('btn-close')?.addEventListener('click', () => {
        window.zyAPI.windowClose();
    });

    // Split View Toggle
    const btnSplitView = document.getElementById('btn-split-view');
    if (btnSplitView) {
        btnSplitView.addEventListener('click', () => {
            state.isSplitView = !state.isSplitView;
            btnSplitView.classList.toggle('active', state.isSplitView);

            const container = elements.viewsContainer;

            if (state.isSplitView && state.tabs.length >= 2) {
                // Enable split view - show 2 tabs side by side
                container.style.display = 'grid';
                container.style.gridTemplateColumns = '1fr 1fr';

                // Show first two tabs
                const firstTab = state.tabs[0];
                const secondTab = state.tabs[1];

                document.querySelectorAll('webview').forEach(v => v.style.display = 'none');

                const view1 = document.getElementById(`view-${firstTab.id}`);
                const view2 = document.getElementById(`view-${secondTab.id}`);

                if (view1) view1.style.display = 'flex';
                if (view2) view2.style.display = 'flex';

                state.splitTabId = secondTab.id;
            } else {
                // Disable split view
                container.style.display = 'block';
                container.style.gridTemplateColumns = '';
                state.splitTabId = null;

                // Show only active tab
                TabManager.switchTab(state.activeTabId);
            }
        });
    }

    // DevTools Toggle
    elements.btnDevTools?.addEventListener('click', () => {
        const webview = TabManager.getActiveWebview();
        if (webview) {
            webview.isDevToolsOpened() ? webview.closeDevTools() : webview.openDevTools();
        }
    });

    // Initialize Systems
    SettingsManager.init();
    SidebarManager.init();
    CSSOverridesManager.init();
    BookmarksManager.init();
    ShortcutManager.init();

    // Create initial tab
    TabManager.createTab();
});

// ============================================
// BOOKMARKS MANAGER
// ============================================

const BookmarksManager = {
    bookmarks: [],

    init: () => {
        // Load bookmarks
        BookmarksManager.bookmarks = JSON.parse(localStorage.getItem('zy-bookmarks') || '[]');

        // Render initial list
        BookmarksManager.renderBookmarks();

        // Star Toggle Button
        document.getElementById('btn-bookmark-toggle').addEventListener('click', () => {
            BookmarksManager.toggleCurrentPage();
        });

        // Clear Bookmarks Button
        document.getElementById('btn-clear-bookmarks').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all bookmarks?')) {
                BookmarksManager.bookmarks = [];
                BookmarksManager.save();
                BookmarksManager.renderBookmarks();
                BookmarksManager.updateStarState();
            }
        });

        // Listen for tab switches/updates to update star state
        // We hook into TabManager's updateUrl via aspect or direct call?
        // For simplicity, let's just make TabManager call us.
        // OR we just poll/check when needed. 
        // Better: Update TabManager to call BookmarksManager.updateStarState();
    },

    save: () => {
        localStorage.setItem('zy-bookmarks', JSON.stringify(BookmarksManager.bookmarks));
    },

    renderBookmarks: () => {
        const list = document.getElementById('bookmarks-list');
        list.innerHTML = BookmarksManager.bookmarks.map((b, i) => `
            <li class="list-item" style="display: flex; justify-content: space-between; align-items: center;">
                <span onclick="navigateTo('${b.url}')" style="cursor: pointer; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${b.title || b.url}</span>
                <button class="text-btn" onclick="BookmarksManager.removeBookmark(${i})">×</button>
            </li>
        `).join('');
    },

    toggleCurrentPage: () => {
        const webview = TabManager.getActiveWebview();
        if (!webview) return;

        const url = webview.getURL();
        const title = webview.getTitle();

        const index = BookmarksManager.bookmarks.findIndex(b => b.url === url);

        if (index === -1) {
            // Add bookmark
            BookmarksManager.bookmarks.push({ url, title, date: Date.now() });
        } else {
            // Remove bookmark
            BookmarksManager.bookmarks.splice(index, 1);
        }

        BookmarksManager.save();
        BookmarksManager.renderBookmarks();
        BookmarksManager.updateStarState();
    },

    removeBookmark: (index) => {
        BookmarksManager.bookmarks.splice(index, 1);
        BookmarksManager.save();
        BookmarksManager.renderBookmarks();
        BookmarksManager.updateStarState();
    },

    updateStarState: () => {
        const webview = TabManager.getActiveWebview();
        const btn = document.getElementById('btn-bookmark-toggle');

        if (!webview || !btn) return;

        const url = webview.getURL();
        const isBookmarked = BookmarksManager.bookmarks.some(b => b.url === url);

        if (isBookmarked) {
            btn.classList.add('star-filled');
            btn.textContent = '★'; // Filled star
        } else {
            btn.classList.remove('star-filled');
            btn.textContent = '☆'; // Empty star
        }
    }
};

// Make it global for inline onclick handlers
window.BookmarksManager = BookmarksManager;

// ============================================
// CSS OVERRIDES MANAGER
// Injects custom CSS into active webview
// ============================================

const CSSOverridesManager = {
    panel: null,
    editor: null,
    toggle: null,
    status: null,
    currentCSSKey: null, // Unique key per webview session

    init: () => {
        CSSOverridesManager.panel = document.getElementById('css-panel');
        CSSOverridesManager.editor = document.getElementById('css-editor');
        CSSOverridesManager.toggle = document.getElementById('css-enabled');
        CSSOverridesManager.status = document.getElementById('css-status');

        // Panel toggle button
        document.getElementById('btn-css-panel')?.addEventListener('click', () => {
            CSSOverridesManager.togglePanel();
        });

        // Close button
        document.getElementById('btn-close-css')?.addEventListener('click', () => {
            CSSOverridesManager.panel.style.display = 'none';
        });

        // Apply button
        document.getElementById('btn-apply-css')?.addEventListener('click', () => {
            CSSOverridesManager.applyCSS();
        });

        // Toggle enable/disable
        CSSOverridesManager.toggle?.addEventListener('change', () => {
            if (CSSOverridesManager.toggle.checked) {
                CSSOverridesManager.applyCSS();
            } else {
                CSSOverridesManager.removeCSS();
            }
        });

        // Load saved CSS when switching tabs
        document.addEventListener('tab-switched', () => {
            CSSOverridesManager.loadForCurrentTab();
        });

        // Keyboard shortcut (Ctrl+Shift+C to toggle panel)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'C') {
                e.preventDefault();
                CSSOverridesManager.togglePanel();
            }
        });
    },

    togglePanel: () => {
        const isVisible = CSSOverridesManager.panel.style.display !== 'none';
        CSSOverridesManager.panel.style.display = isVisible ? 'none' : 'flex';
        if (!isVisible) {
            CSSOverridesManager.loadForCurrentTab();
            CSSOverridesManager.editor.focus();
        }
    },

    getStorageKey: () => {
        const webview = TabManager.getActiveWebview();
        if (!webview) return null;
        try {
            const url = new URL(webview.getURL());
            return `zy-css-${url.hostname}`;
        } catch {
            return `zy-css-${state.activeTabId}`;
        }
    },

    loadForCurrentTab: () => {
        const key = CSSOverridesManager.getStorageKey();
        if (!key) return;

        const saved = localStorage.getItem(key);
        CSSOverridesManager.editor.value = saved || '';
        CSSOverridesManager.currentCSSKey = key;

        // Auto-apply if enabled and has content
        if (saved && CSSOverridesManager.toggle.checked) {
            CSSOverridesManager.applyCSS();
        }
    },

    saveCSS: () => {
        const key = CSSOverridesManager.getStorageKey();
        if (!key) return;

        const css = CSSOverridesManager.editor.value;
        if (css.trim()) {
            localStorage.setItem(key, css);
        } else {
            localStorage.removeItem(key);
        }
    },

    applyCSS: async () => {
        const webview = TabManager.getActiveWebview();
        if (!webview) {
            CSSOverridesManager.status.textContent = 'No active tab';
            return;
        }

        const css = CSSOverridesManager.editor.value.trim();
        if (!css) {
            CSSOverridesManager.status.textContent = 'No CSS to apply';
            return;
        }

        try {
            // Remove existing custom CSS first
            await CSSOverridesManager.removeCSS();

            // Insert new CSS
            await webview.insertCSS(css);

            CSSOverridesManager.saveCSS();
            CSSOverridesManager.status.textContent = 'Applied ✓';

            setTimeout(() => {
                CSSOverridesManager.status.textContent = 'Ready';
            }, 2000);
        } catch (err) {
            CSSOverridesManager.status.textContent = 'Error: ' + err.message;
        }
    },

    removeCSS: async () => {
        // Note: Electron's webview doesn't have a removeCSS method
        // The CSS persists until page reload. For full removal, reload the page.
        // This is a limitation of the webview API.
        CSSOverridesManager.status.textContent = 'CSS will clear on reload';
    }
};

// ============================================
// SHORTCUT MANAGER
// ============================================

const ShortcutManager = {
    init: () => {
        window.addEventListener('keydown', (e) => {
            // Check modifier keys based on platform if needed, but Ctrl is standard for most
            const cmdOrCtrl = e.ctrlKey || e.metaKey;

            // New Tab: Ctrl + T
            if (cmdOrCtrl && e.key === 't') {
                e.preventDefault(); // Prevent accidental browser interactions if any
                TabManager.createTab();
            }

            // Close Tab: Ctrl + W
            if (cmdOrCtrl && e.key === 'w') {
                e.preventDefault();
                TabManager.closeTab(state.activeTabId);
            }

            // Reload: Ctrl + R or F5
            if ((cmdOrCtrl && e.key === 'r') || e.key === 'F5') {
                e.preventDefault();
                reload();
            }

            // Focus Address Bar: Ctrl + L or F6 or Alt + D
            if ((cmdOrCtrl && e.key === 'l') || e.key === 'F6' || (e.altKey && e.key === 'd')) {
                e.preventDefault();
                elements.urlInput.focus();
                elements.urlInput.select();
            }

            // Navigation: Alt + Left / Right
            if (e.altKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                goBack();
            }
            if (e.altKey && e.key === 'ArrowRight') {
                e.preventDefault();
                goForward();
            }

            // Tab Switching: Ctrl + Tab / Ctrl + Shift + Tab
            if (cmdOrCtrl && e.key === 'Tab') {
                // Determine direction
                const direction = e.shiftKey ? -1 : 1;
                e.preventDefault();

                const currentIndex = state.tabs.findIndex(t => t.id === state.activeTabId);
                let nextIndex = currentIndex + direction;

                // Loop around
                if (nextIndex >= state.tabs.length) nextIndex = 0;
                if (nextIndex < 0) nextIndex = state.tabs.length - 1;

                const nextTab = state.tabs[nextIndex];
                if (nextTab) TabManager.switchTab(nextTab.id);
            }

            // Zoom In/Out (Basic implementation) - Webviews handle this naturally usually, 
            // but we can enforce it if needed. For now let webview handle it if focused.
        });
    }
};

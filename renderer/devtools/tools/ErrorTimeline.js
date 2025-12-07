/**
 * Error Timeline Tool
 * Capture and display console errors, warnings, and uncaught exceptions
 */

const ErrorTimeline = {
    name: 'Error Timeline',
    icon: '⚠️',
    errors: [],
    isTracking: false,

    init() {
        // Nothing to initialize upfront
    },

    render() {
        const container = document.createElement('div');
        container.className = 'error-timeline';
        container.innerHTML = `
            <div class="error-toolbar">
                <button class="devtools-btn ${this.isTracking ? 'active' : ''}" id="error-toggle">
                    ${this.isTracking ? '⏸️ Pause' : '▶️ Start'} Tracking
                </button>
                <button class="devtools-btn" id="error-refresh">🔄 Refresh</button>
                <button class="devtools-btn" id="error-clear">🗑️ Clear</button>
                <span class="error-count" id="error-count">0 events</span>
            </div>
            <div class="error-filters">
                <label><input type="checkbox" data-filter="error" checked> Errors</label>
                <label><input type="checkbox" data-filter="warning" checked> Warnings</label>
                <label><input type="checkbox" data-filter="uncaught" checked> Uncaught</label>
            </div>
            <div class="error-list" id="error-list"></div>
        `;

        container.addEventListener('click', (e) => this.handleClick(e));
        container.addEventListener('change', (e) => this.handleFilter(e));

        return container;
    },

    async onActivate() {
        await this.refresh();
    },

    async startTracking() {
        try {
            await window.InjectionBridge.injectErrorTracker();
            this.isTracking = true;
            this.updateToggleButton();
        } catch (err) {
            console.error('Failed to start error tracking:', err);
        }
    },

    async refresh() {
        try {
            this.errors = await window.InjectionBridge.getErrors();
            this.renderList();
            this.updateCount();
        } catch (err) {
            // Tracker might not be injected yet
            this.errors = [];
            this.renderList();
        }
    },

    renderList() {
        const list = document.getElementById('error-list');
        if (!list) return;

        const filters = this.getActiveFilters();
        const filtered = this.errors.filter(e => filters.includes(e.type));

        if (filtered.length === 0) {
            list.innerHTML = '<div class="empty-state">No errors captured. Start tracking to begin.</div>';
            return;
        }

        list.innerHTML = filtered.map(err => `
            <div class="error-item ${err.type}">
                <div class="error-header">
                    <span class="error-type">${this.getIcon(err.type)} ${err.type.toUpperCase()}</span>
                    <span class="error-time">${this.formatTime(err.timestamp)}</span>
                </div>
                <div class="error-message">${this.escapeHtml(err.message)}</div>
                ${err.url ? `<div class="error-location">${err.url}:${err.line}:${err.col}</div>` : ''}
                ${err.stack ? `<pre class="error-stack">${this.escapeHtml(err.stack)}</pre>` : ''}
            </div>
        `).join('');
    },

    getActiveFilters() {
        const checkboxes = document.querySelectorAll('.error-filters input:checked');
        return Array.from(checkboxes).map(cb => cb.dataset.filter);
    },

    handleFilter() {
        this.renderList();
    },

    async handleClick(e) {
        const target = e.target;

        if (target.id === 'error-toggle') {
            if (this.isTracking) {
                this.isTracking = false;
            } else {
                await this.startTracking();
            }
            this.updateToggleButton();
            return;
        }

        if (target.id === 'error-refresh') {
            await this.refresh();
            return;
        }

        if (target.id === 'error-clear') {
            await window.InjectionBridge.execute('window.__zyErrorTracker = []');
            this.errors = [];
            this.renderList();
            this.updateCount();
            return;
        }
    },

    updateToggleButton() {
        const btn = document.getElementById('error-toggle');
        if (btn) {
            btn.textContent = this.isTracking ? '⏸️ Pause' : '▶️ Start';
            btn.classList.toggle('active', this.isTracking);
        }
    },

    updateCount() {
        const count = document.getElementById('error-count');
        if (count) {
            count.textContent = `${this.errors.length} events`;
        }
    },

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString();
    },

    getIcon(type) {
        return { error: '🔴', warning: '🟡', uncaught: '💥' }[type] || '⚪';
    },

    escapeHtml(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    }
};

// Register with DevToolsManager
if (window.DevToolsManager) {
    window.DevToolsManager.register('errors', ErrorTimeline);
}

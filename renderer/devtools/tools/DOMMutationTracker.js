/**
 * DOM Mutation Tracker Tool
 * Track real-time DOM changes with mutation observer
 */

const DOMMutationTracker = {
    name: 'DOM Mutations',
    icon: '🔍',
    mutations: [],
    isTracking: false,
    refreshInterval: null,

    init() { },

    render() {
        const container = document.createElement('div');
        container.className = 'mutation-tracker';
        container.innerHTML = `
            <div class="mutation-toolbar">
                <button class="devtools-btn ${this.isTracking ? 'active' : ''}" id="mut-toggle">
                    ${this.isTracking ? '⏸️ Pause' : '▶️ Start'} Tracking
                </button>
                <button class="devtools-btn" id="mut-refresh">🔄 Refresh</button>
                <button class="devtools-btn" id="mut-clear">🗑️ Clear</button>
                <span class="mutation-count" id="mut-count">0 mutations</span>
            </div>
            <div class="mutation-filters">
                <label><input type="checkbox" data-filter="childList" checked> Child Changes</label>
                <label><input type="checkbox" data-filter="attributes" checked> Attributes</label>
            </div>
            <div class="mutation-list" id="mutation-list"></div>
        `;

        container.addEventListener('click', (e) => this.handleClick(e));
        container.addEventListener('change', () => this.renderList());

        return container;
    },

    async onActivate() {
        await this.refresh();
        if (this.isTracking) {
            this.startAutoRefresh();
        }
    },

    async startTracking() {
        try {
            await window.InjectionBridge.injectMutationTracker();
            this.isTracking = true;
            this.updateToggleButton();
            this.startAutoRefresh();
        } catch (err) {
            console.error('Failed to start mutation tracking:', err);
        }
    },

    startAutoRefresh() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => this.refresh(), 1000);
    },

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    },

    async refresh() {
        try {
            this.mutations = await window.InjectionBridge.getMutations();
            this.renderList();
            this.updateCount();
        } catch (err) {
            this.mutations = [];
            this.renderList();
        }
    },

    renderList() {
        const list = document.getElementById('mutation-list');
        if (!list) return;

        const filters = this.getActiveFilters();
        const filtered = this.mutations.filter(m => filters.includes(m.type));

        if (filtered.length === 0) {
            list.innerHTML = '<div class="empty-state">No mutations recorded. Start tracking to observe DOM changes.</div>';
            return;
        }

        // Show newest first
        const reversed = [...filtered].reverse();

        list.innerHTML = reversed.map(mut => `
            <div class="mutation-item ${mut.type}">
                <div class="mutation-header">
                    <span class="mutation-type">${this.getIcon(mut.type)} ${mut.type}</span>
                    <span class="mutation-time">${this.formatTime(mut.timestamp)}</span>
                </div>
                <div class="mutation-target">${mut.target}</div>
                ${mut.attribute ? `<div class="mutation-attr">Attribute: ${mut.attribute}</div>` : ''}
                ${mut.added > 0 ? `<div class="mutation-added">+${mut.added} added</div>` : ''}
                ${mut.removed > 0 ? `<div class="mutation-removed">-${mut.removed} removed</div>` : ''}
            </div>
        `).join('');
    },

    getActiveFilters() {
        const checkboxes = document.querySelectorAll('.mutation-filters input:checked');
        return Array.from(checkboxes).map(cb => cb.dataset.filter);
    },

    async handleClick(e) {
        const target = e.target;

        if (target.id === 'mut-toggle') {
            if (this.isTracking) {
                this.isTracking = false;
                this.stopAutoRefresh();
            } else {
                await this.startTracking();
            }
            this.updateToggleButton();
            return;
        }

        if (target.id === 'mut-refresh') {
            await this.refresh();
            return;
        }

        if (target.id === 'mut-clear') {
            await window.InjectionBridge.execute('window.__zyMutationTracker = []');
            this.mutations = [];
            this.renderList();
            this.updateCount();
            return;
        }
    },

    updateToggleButton() {
        const btn = document.getElementById('mut-toggle');
        if (btn) {
            btn.textContent = this.isTracking ? '⏸️ Pause' : '▶️ Start';
            btn.classList.toggle('active', this.isTracking);
        }
    },

    updateCount() {
        const count = document.getElementById('mut-count');
        if (count) {
            count.textContent = `${this.mutations.length} mutations`;
        }
    },

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    },

    getIcon(type) {
        return { 'childList': '🔄', 'attributes': '✏️' }[type] || '📝';
    }
};

if (window.DevToolsManager) {
    window.DevToolsManager.register('mutations', DOMMutationTracker);
}

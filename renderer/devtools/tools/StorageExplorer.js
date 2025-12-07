/**
 * Storage Explorer Tool
 * Read/edit/delete localStorage and sessionStorage
 */

const StorageExplorer = {
    name: 'Storage Explorer',
    icon: '💾',
    currentTab: 'local',
    data: { local: {}, session: {} },

    init() {
        // Nothing to initialize
    },

    render() {
        const container = document.createElement('div');
        container.className = 'storage-explorer';
        container.innerHTML = `
            <div class="storage-tabs">
                <button class="storage-tab active" data-type="local">localStorage</button>
                <button class="storage-tab" data-type="session">sessionStorage</button>
            </div>
            <div class="storage-actions">
                <button class="devtools-btn" id="storage-refresh">🔄 Refresh</button>
                <button class="devtools-btn" id="storage-export">📤 Export</button>
                <button class="devtools-btn" id="storage-clear">🗑️ Clear All</button>
            </div>
            <div class="storage-table-wrapper">
                <table class="storage-table">
                    <thead>
                        <tr>
                            <th>Key</th>
                            <th>Value</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="storage-body"></tbody>
                </table>
            </div>
            <div class="storage-add">
                <input type="text" id="storage-new-key" placeholder="Key">
                <input type="text" id="storage-new-value" placeholder="Value">
                <button class="devtools-btn primary" id="storage-add-btn">+ Add</button>
            </div>
        `;

        // Event delegation
        container.addEventListener('click', (e) => this.handleClick(e));

        return container;
    },

    async onActivate() {
        await this.refresh();
    },

    async refresh() {
        try {
            this.data.local = await window.InjectionBridge.getLocalStorage();
            this.data.session = await window.InjectionBridge.getSessionStorage();
            this.renderTable();
        } catch (err) {
            console.error('Storage refresh failed:', err);
        }
    },

    renderTable() {
        const tbody = document.getElementById('storage-body');
        if (!tbody) return;

        const items = this.currentTab === 'local' ? this.data.local : this.data.session;

        if (Object.keys(items).length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No items found</td></tr>';
            return;
        }

        tbody.innerHTML = Object.entries(items).map(([key, value]) => `
            <tr data-key="${this.escapeHtml(key)}">
                <td class="key-cell">${this.escapeHtml(key)}</td>
                <td class="value-cell">
                    <input type="text" value="${this.escapeHtml(value)}" class="storage-value-input">
                </td>
                <td class="action-cell">
                    <button class="action-btn save" title="Save">💾</button>
                    <button class="action-btn delete" title="Delete">🗑️</button>
                </td>
            </tr>
        `).join('');
    },

    async handleClick(e) {
        const target = e.target;

        // Tab switching
        if (target.classList.contains('storage-tab')) {
            document.querySelectorAll('.storage-tab').forEach(t => t.classList.remove('active'));
            target.classList.add('active');
            this.currentTab = target.dataset.type;
            this.renderTable();
            return;
        }

        // Refresh
        if (target.id === 'storage-refresh') {
            await this.refresh();
            return;
        }

        // Export
        if (target.id === 'storage-export') {
            const data = this.currentTab === 'local' ? this.data.local : this.data.session;
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${this.currentTab}Storage.json`;
            a.click();
            URL.revokeObjectURL(url);
            return;
        }

        // Clear all
        if (target.id === 'storage-clear') {
            if (confirm(`Clear all ${this.currentTab}Storage items?`)) {
                const method = this.currentTab === 'local' ? 'localStorage.clear()' : 'sessionStorage.clear()';
                await window.InjectionBridge.execute(method);
                await this.refresh();
            }
            return;
        }

        // Add new
        if (target.id === 'storage-add-btn') {
            const keyInput = document.getElementById('storage-new-key');
            const valueInput = document.getElementById('storage-new-value');
            const key = keyInput.value.trim();
            const value = valueInput.value;

            if (key) {
                await window.InjectionBridge.setLocalStorageItem(key, value);
                keyInput.value = '';
                valueInput.value = '';
                await this.refresh();
            }
            return;
        }

        // Row actions
        const row = target.closest('tr');
        if (!row) return;
        const key = row.dataset.key;

        if (target.classList.contains('save')) {
            const input = row.querySelector('.storage-value-input');
            await window.InjectionBridge.setLocalStorageItem(key, input.value);
            await this.refresh();
        }

        if (target.classList.contains('delete')) {
            await window.InjectionBridge.deleteLocalStorageItem(key);
            await this.refresh();
        }
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
    window.DevToolsManager.register('storage', StorageExplorer);
}

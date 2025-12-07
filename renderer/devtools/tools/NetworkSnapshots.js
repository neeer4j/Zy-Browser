/**
 * Network Snapshots Tool
 * Track fetch/XHR requests and responses
 */

const NetworkSnapshots = {
    name: 'Network Snapshots',
    icon: '🌐',
    requests: [],
    isTracking: false,

    init() { },

    render() {
        const container = document.createElement('div');
        container.className = 'network-snapshots';
        container.innerHTML = `
            <div class="network-toolbar">
                <button class="devtools-btn ${this.isTracking ? 'active' : ''}" id="net-toggle">
                    ${this.isTracking ? '⏸️ Pause' : '▶️ Start'} Capture
                </button>
                <button class="devtools-btn" id="net-refresh">🔄 Refresh</button>
                <button class="devtools-btn" id="net-clear">🗑️ Clear</button>
                <button class="devtools-btn" id="net-export">📤 Export</button>
            </div>
            <div class="network-filters">
                <label><input type="checkbox" data-filter="fetch" checked> Fetch</label>
                <label><input type="checkbox" data-filter="xhr" checked> XHR</label>
            </div>
            <div class="network-list" id="network-list"></div>
            <div class="network-detail" id="network-detail" style="display:none;">
                <div class="detail-header">
                    <span>Request Details</span>
                    <button class="icon-btn" id="detail-close">×</button>
                </div>
                <div class="detail-content" id="detail-content"></div>
            </div>
        `;

        container.addEventListener('click', (e) => this.handleClick(e));

        return container;
    },

    async onActivate() {
        await this.refresh();
    },

    async startTracking() {
        try {
            await window.InjectionBridge.execute(`
                if (!window.__zyNetworkTracker) {
                    window.__zyNetworkTracker = [];
                    
                    // Intercept fetch
                    const originalFetch = window.fetch;
                    window.fetch = async function(...args) {
                        const url = typeof args[0] === 'string' ? args[0] : args[0].url;
                        const method = args[1]?.method || 'GET';
                        const startTime = Date.now();
                        
                        try {
                            const response = await originalFetch.apply(this, args);
                            const clone = response.clone();
                            let body = '';
                            try { body = await clone.text(); } catch(e) {}
                            
                            window.__zyNetworkTracker.push({
                                type: 'fetch',
                                method: method,
                                url: url,
                                status: response.status,
                                statusText: response.statusText,
                                duration: Date.now() - startTime,
                                responseBody: body.substring(0, 5000),
                                timestamp: startTime
                            });
                            
                            return response;
                        } catch (err) {
                            window.__zyNetworkTracker.push({
                                type: 'fetch',
                                method: method,
                                url: url,
                                status: 0,
                                error: err.message,
                                duration: Date.now() - startTime,
                                timestamp: startTime
                            });
                            throw err;
                        }
                    };
                    
                    // Intercept XHR
                    const originalXHR = XMLHttpRequest.prototype.open;
                    XMLHttpRequest.prototype.open = function(method, url) {
                        this.__zyMethod = method;
                        this.__zyUrl = url;
                        this.__zyStart = Date.now();
                        
                        this.addEventListener('load', function() {
                            window.__zyNetworkTracker.push({
                                type: 'xhr',
                                method: this.__zyMethod,
                                url: this.__zyUrl,
                                status: this.status,
                                statusText: this.statusText,
                                duration: Date.now() - this.__zyStart,
                                responseBody: this.responseText?.substring(0, 5000),
                                timestamp: this.__zyStart
                            });
                        });
                        
                        return originalXHR.apply(this, arguments);
                    };
                }
            `);
            this.isTracking = true;
            this.updateToggleButton();
        } catch (err) {
            console.error('Failed to start network tracking:', err);
        }
    },

    async refresh() {
        try {
            this.requests = await window.InjectionBridge.executeJSON('return window.__zyNetworkTracker || []');
            this.renderList();
        } catch (err) {
            this.requests = [];
            this.renderList();
        }
    },

    renderList() {
        const list = document.getElementById('network-list');
        if (!list) return;

        if (this.requests.length === 0) {
            list.innerHTML = '<div class="empty-state">No requests captured. Start capture to begin.</div>';
            return;
        }

        list.innerHTML = this.requests.map((req, i) => `
            <div class="network-item ${req.status >= 400 || req.error ? 'error' : ''}" data-index="${i}">
                <span class="net-method ${req.method}">${req.method}</span>
                <span class="net-status ${req.status >= 400 ? 'error' : 'ok'}">${req.status || 'ERR'}</span>
                <span class="net-url">${this.truncate(req.url, 60)}</span>
                <span class="net-time">${req.duration}ms</span>
            </div>
        `).join('');
    },

    showDetail(index) {
        const req = this.requests[index];
        if (!req) return;

        const detail = document.getElementById('network-detail');
        const content = document.getElementById('detail-content');

        content.innerHTML = `
            <div class="detail-row"><strong>Type:</strong> ${req.type.toUpperCase()}</div>
            <div class="detail-row"><strong>Method:</strong> ${req.method}</div>
            <div class="detail-row"><strong>URL:</strong> ${req.url}</div>
            <div class="detail-row"><strong>Status:</strong> ${req.status} ${req.statusText || ''}</div>
            <div class="detail-row"><strong>Duration:</strong> ${req.duration}ms</div>
            ${req.error ? `<div class="detail-row error"><strong>Error:</strong> ${req.error}</div>` : ''}
            <div class="detail-row"><strong>Response:</strong></div>
            <pre class="response-body">${this.escapeHtml(req.responseBody || '(empty)')}</pre>
        `;

        detail.style.display = 'block';
    },

    async handleClick(e) {
        const target = e.target;

        if (target.id === 'net-toggle') {
            if (this.isTracking) {
                this.isTracking = false;
            } else {
                await this.startTracking();
            }
            this.updateToggleButton();
            return;
        }

        if (target.id === 'net-refresh') {
            await this.refresh();
            return;
        }

        if (target.id === 'net-clear') {
            await window.InjectionBridge.execute('window.__zyNetworkTracker = []');
            this.requests = [];
            this.renderList();
            return;
        }

        if (target.id === 'net-export') {
            const blob = new Blob([JSON.stringify(this.requests, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'network-snapshots.json';
            a.click();
            URL.revokeObjectURL(url);
            return;
        }

        if (target.id === 'detail-close') {
            document.getElementById('network-detail').style.display = 'none';
            return;
        }

        const item = target.closest('.network-item');
        if (item) {
            this.showDetail(parseInt(item.dataset.index));
        }
    },

    updateToggleButton() {
        const btn = document.getElementById('net-toggle');
        if (btn) {
            btn.textContent = this.isTracking ? '⏸️ Pause' : '▶️ Start';
            btn.classList.toggle('active', this.isTracking);
        }
    },

    truncate(str, len) {
        return str.length > len ? str.substring(0, len) + '...' : str;
    },

    escapeHtml(str) {
        if (typeof str !== 'string') return str;
        return str.replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[m]));
    }
};

if (window.DevToolsManager) {
    window.DevToolsManager.register('network', NetworkSnapshots);
}

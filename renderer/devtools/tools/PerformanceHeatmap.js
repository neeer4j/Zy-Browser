/**
 * Performance Heatmap Tool
 * Measure and visualize page performance metrics
 */

const PerformanceHeatmap = {
    name: 'Performance',
    icon: '📊',
    metrics: null,
    resources: [],

    init() { },

    render() {
        const container = document.createElement('div');
        container.className = 'perf-heatmap';
        container.innerHTML = `
            <div class="perf-toolbar">
                <button class="devtools-btn" id="perf-refresh">🔄 Analyze</button>
                <button class="devtools-btn" id="perf-export">📤 Export</button>
            </div>
            <div class="perf-summary" id="perf-summary">
                <div class="perf-card">
                    <div class="perf-label">Page Load</div>
                    <div class="perf-value" id="perf-load">--</div>
                </div>
                <div class="perf-card">
                    <div class="perf-label">DOM Ready</div>
                    <div class="perf-value" id="perf-dom">--</div>
                </div>
                <div class="perf-card">
                    <div class="perf-label">First Paint</div>
                    <div class="perf-value" id="perf-fp">--</div>
                </div>
                <div class="perf-card">
                    <div class="perf-label">Resources</div>
                    <div class="perf-value" id="perf-res">--</div>
                </div>
            </div>
            <h4 class="perf-section-title">Resource Waterfall</h4>
            <div class="perf-waterfall" id="perf-waterfall"></div>
            <h4 class="perf-section-title">Slow Resources (>200ms)</h4>
            <div class="perf-slow" id="perf-slow"></div>
        `;

        container.addEventListener('click', (e) => this.handleClick(e));

        return container;
    },

    async onActivate() {
        await this.analyze();
    },

    async analyze() {
        try {
            const data = await window.InjectionBridge.executeJSON(`
                const perf = performance;
                const timing = perf.timing || {};
                const entries = perf.getEntriesByType('resource') || [];
                const paint = perf.getEntriesByType('paint') || [];
                
                const fpEntry = paint.find(p => p.name === 'first-paint');
                
                return {
                    navigationStart: timing.navigationStart,
                    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                    loadComplete: timing.loadEventEnd - timing.navigationStart,
                    firstPaint: fpEntry ? fpEntry.startTime : null,
                    resources: entries.map(r => ({
                        name: r.name.split('/').pop().substring(0, 40),
                        fullUrl: r.name,
                        type: r.initiatorType,
                        duration: Math.round(r.duration),
                        size: r.transferSize || 0,
                        start: Math.round(r.startTime)
                    })).slice(0, 50)
                };
            `);

            this.metrics = data;
            this.resources = data.resources;
            this.renderMetrics();
            this.renderWaterfall();
            this.renderSlowResources();
        } catch (err) {
            console.error('Performance analysis failed:', err);
        }
    },

    renderMetrics() {
        if (!this.metrics) return;

        document.getElementById('perf-load').textContent =
            this.metrics.loadComplete > 0 ? `${this.metrics.loadComplete}ms` : '--';
        document.getElementById('perf-dom').textContent =
            this.metrics.domContentLoaded > 0 ? `${this.metrics.domContentLoaded}ms` : '--';
        document.getElementById('perf-fp').textContent =
            this.metrics.firstPaint ? `${Math.round(this.metrics.firstPaint)}ms` : '--';
        document.getElementById('perf-res').textContent =
            `${this.resources.length} files`;
    },

    renderWaterfall() {
        const container = document.getElementById('perf-waterfall');
        if (!container || !this.resources.length) {
            container.innerHTML = '<div class="empty-state">No resources to display</div>';
            return;
        }

        const maxTime = Math.max(...this.resources.map(r => r.start + r.duration));
        const scale = 100 / maxTime;

        container.innerHTML = this.resources.slice(0, 20).map(r => {
            const left = r.start * scale;
            const width = Math.max(r.duration * scale, 1);
            const color = this.getTypeColor(r.type);

            return `
                <div class="waterfall-row" title="${r.fullUrl}\n${r.duration}ms">
                    <span class="waterfall-name">${r.name}</span>
                    <div class="waterfall-bar-container">
                        <div class="waterfall-bar" style="left:${left}%;width:${width}%;background:${color}"></div>
                    </div>
                    <span class="waterfall-time">${r.duration}ms</span>
                </div>
            `;
        }).join('');
    },

    renderSlowResources() {
        const container = document.getElementById('perf-slow');
        const slow = this.resources.filter(r => r.duration > 200).sort((a, b) => b.duration - a.duration);

        if (slow.length === 0) {
            container.innerHTML = '<div class="empty-state good">✓ No slow resources detected</div>';
            return;
        }

        container.innerHTML = slow.map(r => `
            <div class="slow-item">
                <span class="slow-type ${r.type}">${r.type}</span>
                <span class="slow-name">${r.name}</span>
                <span class="slow-time">${r.duration}ms</span>
            </div>
        `).join('');
    },

    getTypeColor(type) {
        const colors = {
            'script': '#f1c40f',
            'css': '#3498db',
            'img': '#2ecc71',
            'fetch': '#9b59b6',
            'xmlhttprequest': '#9b59b6',
            'font': '#e74c3c',
            'other': '#95a5a6'
        };
        return colors[type] || colors.other;
    },

    async handleClick(e) {
        if (e.target.id === 'perf-refresh') {
            await this.analyze();
        }

        if (e.target.id === 'perf-export') {
            const data = { metrics: this.metrics, resources: this.resources };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'performance-report.json';
            a.click();
            URL.revokeObjectURL(url);
        }
    }
};

if (window.DevToolsManager) {
    window.DevToolsManager.register('performance', PerformanceHeatmap);
}

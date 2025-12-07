/**
 * InjectionBridge - Safely execute scripts in webview context
 * Handles communication between devtools and page content
 */

class InjectionBridge {
    constructor() {
        this.listeners = new Map();
    }

    /**
     * Execute JavaScript in the active webview
     * @param {string} code - JavaScript code to execute
     * @returns {Promise<any>} - Result from execution
     */
    async execute(code) {
        const webview = window.DevToolsManager?.getActiveWebview();
        if (!webview) {
            throw new Error('No active webview');
        }

        try {
            return await webview.executeJavaScript(code);
        } catch (err) {
            console.error('[InjectionBridge] Execution failed:', err);
            throw err;
        }
    }

    /**
     * Execute and return JSON-serializable data
     */
    async executeJSON(code) {
        const wrappedCode = `JSON.stringify((function() { ${code} })())`;
        const result = await this.execute(wrappedCode);
        return JSON.parse(result);
    }

    /**
     * Inject a script that reports back via console
     * @param {string} scriptContent - Script to inject
     * @param {string} messageType - Type identifier for messages
     */
    async injectReporter(scriptContent, messageType) {
        const script = `
            (function() {
                const __zyReport = (data) => {
                    console.log('__ZY_DEV__:${messageType}:' + JSON.stringify(data));
                };
                ${scriptContent}
            })();
        `;
        return this.execute(script);
    }

    /**
     * Get localStorage data from page
     */
    async getLocalStorage() {
        return this.executeJSON(`
            const items = {};
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                items[key] = localStorage.getItem(key);
            }
            return items;
        `);
    }

    /**
     * Get sessionStorage data from page
     */
    async getSessionStorage() {
        return this.executeJSON(`
            const items = {};
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                items[key] = sessionStorage.getItem(key);
            }
            return items;
        `);
    }

    /**
     * Set a localStorage item
     */
    async setLocalStorageItem(key, value) {
        const escapedKey = key.replace(/'/g, "\\'");
        const escapedValue = value.replace(/'/g, "\\'");
        return this.execute(`localStorage.setItem('${escapedKey}', '${escapedValue}')`);
    }

    /**
     * Delete a localStorage item
     */
    async deleteLocalStorageItem(key) {
        const escapedKey = key.replace(/'/g, "\\'");
        return this.execute(`localStorage.removeItem('${escapedKey}')`);
    }

    /**
     * Inject error tracking script
     */
    async injectErrorTracker() {
        return this.execute(`
            if (!window.__zyErrorTracker) {
                window.__zyErrorTracker = [];
                const originalError = console.error;
                const originalWarn = console.warn;
                
                console.error = function(...args) {
                    window.__zyErrorTracker.push({
                        type: 'error',
                        message: args.map(a => String(a)).join(' '),
                        timestamp: Date.now(),
                        stack: new Error().stack
                    });
                    originalError.apply(console, args);
                };
                
                console.warn = function(...args) {
                    window.__zyErrorTracker.push({
                        type: 'warning',
                        message: args.map(a => String(a)).join(' '),
                        timestamp: Date.now()
                    });
                    originalWarn.apply(console, args);
                };
                
                window.onerror = function(msg, url, line, col, error) {
                    window.__zyErrorTracker.push({
                        type: 'uncaught',
                        message: msg,
                        url: url,
                        line: line,
                        col: col,
                        timestamp: Date.now(),
                        stack: error?.stack
                    });
                };
            }
        `);
    }

    /**
     * Get collected errors
     */
    async getErrors() {
        return this.executeJSON(`return window.__zyErrorTracker || []`);
    }

    /**
     * Inject DOM mutation tracker
     */
    async injectMutationTracker() {
        return this.execute(`
            if (!window.__zyMutationTracker) {
                window.__zyMutationTracker = [];
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach(m => {
                        window.__zyMutationTracker.push({
                            type: m.type,
                            target: m.target.nodeName + (m.target.id ? '#' + m.target.id : ''),
                            added: m.addedNodes.length,
                            removed: m.removedNodes.length,
                            attribute: m.attributeName,
                            timestamp: Date.now()
                        });
                        // Keep only last 100
                        if (window.__zyMutationTracker.length > 100) {
                            window.__zyMutationTracker.shift();
                        }
                    });
                });
                observer.observe(document.body, {
                    childList: true,
                    attributes: true,
                    subtree: true
                });
            }
        `);
    }

    /**
     * Get mutation log
     */
    async getMutations() {
        return this.executeJSON(`return window.__zyMutationTracker || []`);
    }
}

// Export singleton
window.InjectionBridge = new InjectionBridge();

/**
 * DevToolsManager - Orchestrates all developer tools
 * Lightweight, modular design for Zy Browser
 */

class DevToolsManager {
    constructor() {
        this.tools = new Map();
        this.activeToolId = null;
        this.panel = null;
        this.isOpen = false;
    }

    /**
     * Register a tool module
     */
    register(id, tool) {
        this.tools.set(id, {
            id,
            name: tool.name,
            icon: tool.icon,
            instance: tool,
            initialized: false
        });
    }

    /**
     * Initialize the DevTools panel
     */
    init(panelElement) {
        this.panel = panelElement;
        this.renderToolbar();

        // Initialize all registered tools
        this.tools.forEach((tool, id) => {
            if (tool.instance.init) {
                tool.instance.init();
                tool.initialized = true;
            }
        });
    }

    /**
     * Render the tool selection toolbar
     */
    renderToolbar() {
        const toolbar = document.createElement('div');
        toolbar.className = 'devtools-toolbar';

        this.tools.forEach((tool, id) => {
            const btn = document.createElement('button');
            btn.className = 'devtools-tab';
            btn.dataset.toolId = id;
            btn.title = tool.name;
            btn.textContent = tool.icon;
            btn.addEventListener('click', () => this.activateTool(id));
            toolbar.appendChild(btn);
        });

        this.panel.prepend(toolbar);
    }

    /**
     * Activate a specific tool
     */
    activateTool(id) {
        const tool = this.tools.get(id);
        if (!tool) return;

        // Update active states
        this.activeToolId = id;
        this.panel.querySelectorAll('.devtools-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.toolId === id);
        });

        // Render tool content
        let content = this.panel.querySelector('.devtools-content');
        if (!content) {
            content = document.createElement('div');
            content.className = 'devtools-content';
            this.panel.appendChild(content);
        }

        content.innerHTML = '';
        if (tool.instance.render) {
            const toolUI = tool.instance.render();
            if (typeof toolUI === 'string') {
                content.innerHTML = toolUI;
            } else {
                content.appendChild(toolUI);
            }
        }

        // Call tool's onActivate if exists
        if (tool.instance.onActivate) {
            tool.instance.onActivate();
        }
    }

    /**
     * Toggle panel visibility
     */
    toggle() {
        this.isOpen = !this.isOpen;
        this.panel.style.display = this.isOpen ? 'flex' : 'none';

        if (this.isOpen && !this.activeToolId && this.tools.size > 0) {
            this.activateTool(this.tools.keys().next().value);
        }
    }

    /**
     * Get active webview for tool operations
     */
    getActiveWebview() {
        return window.TabManager?.getActiveWebview();
    }
}

// Export singleton
window.DevToolsManager = new DevToolsManager();

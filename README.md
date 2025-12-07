# Zy Browser

A lightweight, secure, and developer-focused web browser built with Electron. Zy Browser combines a minimalist design with a powerful suite of built-in developer tools.

![Zy Browser](https://img.shields.io/badge/Electron-28.0-blue) ![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-green) ![Status](https://img.shields.io/badge/Status-Active-success)

## 🚀 Key Features

### Core Experience
- **Minimialist UI** - Distraction-free interface with a clean black & white theme using `zy://home`.
- **Custom Protocol** - Native support for `zy://` URLs (e.g., `zy://home`, `zy://settings`).
- **Chrome-like Settings** - Full settings management interface at `zy://settings`.
- **Security First** - "Deny by Default" permissions, strict Context Isolation, and HTTPS-first mode.

### 🛠️ Developer Tools Suite
Zy Browser includes a modular, resource-light developer tools suite built directly into the renderer. Toggle with **F12**.

| Tool | Icon | Description |
|------|------|-------------|
| **Storage Explorer** | 💾 | View, edit, and export localStorage & sessionStorage. |
| **Error Timeline** | ⚠️ | Track console errors, warnings, and exceptions in real-time. |
| **Network Snapshots** | 🌐 | Intercept fetch/XHR requests, view response bodies and timings. |
| **DOM Mutations** | 🔍 | Monitor real-time DOM changes, attribute modifications, and node additions. |
| **Performance Heatmap**| 📊 | Visualize page load metrics and resource waterfalls. |

### 🎨 CSS Overrides Panel
Inject custom CSS into any website instantly.
- Toggle with **Ctrl+Shift+C** or the Palette icon.
- **Per-Domain Persistence**: CSS is saved automatically for each domain.
- **Monospace Editor**: Built-in editor for writing styles.
- **Instant Apply**: Changes reflect immediately without reloading.

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/neeer4j/Zy-Browser.git
cd Zy-Browser

# Install dependencies
npm install

# Run the browser (Development)
npm start
```

## 🏗️ Architecture

Zy Browser uses a modular architecture optimized for security and performance.

```
ZyBrowser/
├── main.js                 # Main Process (Security, IPC, Window Mgmt)
├── preload.js              # Secure ContextBridge & API Exposure
└── renderer/               # Renderer Process
    ├── devtools/           # Modular Developer Tools
    │   ├── core/           # Tool Orchestration & Injection Bridge
    │   ├── tools/          # Individual Tool Modules
    │   └── ui/             # DevTools Styles
    ├── index.html          # Main App Shell
    ├── home.html           # zy://home
    ├── settings.html       # zy://settings
    └── renderer.js         # Tab & Window Logic
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + ←` | Go Back |
| `Alt + →` | Go Forward |
| `Ctrl + R` / `F5` | Reload |
| `F12` | Toggle Developer Tools Suite |
| `Ctrl + Shift + C` | Toggle CSS Overrides Panel |
| `Ctrl + T` | New URL / Tab Focus |

## 🔒 Security Model

- **Context Isolation**: Enabled universally. Renderer has no Node.js access.
- **Sandboxing**: All web content runs in a sandboxed process.
- **Protocol Security**: `zy://` is registered as a privileged, secure scheme.
- **Permission System**: All sensitive permissions (Mic, Camera, etc.) are denied by default unless explicitly granted.

## Building for Distribution

```bash
npm run build:win    # Windows (NSIS installer)
npm run build:mac    # macOS (DMG)
npm run build:linux  # Linux (AppImage)
```

## License

MIT

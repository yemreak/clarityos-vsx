# Changelog

## [1.0.1] - 2025-10-14

### Build System
- Migrated from TypeScript compiler to esbuild
- Bundle size optimization (minification + tree-shaking)
- Faster build times with watch mode
- Production builds: `bun run package`

### Package Metadata
- Added "Programming Languages" category
- Enhanced keywords: markdown, syntax highlighting, vibe coding, cli bridge
- Scripts: added `watch` and `package` commands

## [1.0.0] - 2025-10-14

### Major Release

**ClarityOS** - Config-driven extension with command injection pattern

### Features

**Injection Pattern (Publishable)**
- Generic builtin commands (no project dependencies)
- External command injection via `.vscode/.clarityos.json`
- JSON schema validation with autocomplete
- Keybinding setup helper (one-time clipboard copy)
- Hot reload for external commands

**Builtin Commands**
- `Cmd+[` - Search unstaged/untracked files
- `Cmd+]` - Search staged files
- `Cmd+;` - Navigate project folders
- `Cmd+'` - Search files, folders, and functions
- `Cmd+Shift+'` - Send file:line reference to terminal
- File History - View git history (editor title icon)
- Close Cursor Terminal

**SCM Visualization**
- Config-driven progress notifications
- Status bar feedback (spinning → ✓ Done / ✗ Error)
- Output channel logging
- Generic SCM button reads `.clarityos.json` dynamically

**Markdown Syntax Highlighting**
- `/* md */` template literal syntax highlighting
- Headers, bold, lists, questions colorized
- Works in TypeScript/JavaScript files
- Zero configuration

**CLI Bridge Integration**
- TCP server on port 9485 for terminal → VSCode control
- `vscode eval` - Execute JavaScript with full VSCode API access
- `vscode status` - Complete system status (terminals, editor, workspace)
- `vscode webview` - Open HTML panels with auto-reload
- `vscode registerConfig` - Dynamic config loading (Hammerspoon-like)
- `vscode output` - Read output panel logs
- Console logging support (`console.log/warn/error` → output panel)

### Architecture

**Pattern**: Config-Driven Command Injection
```
Builtin (extension):
├─ Generic commands (no dependencies)
├─ SCM visualization infrastructure
├─ CLI Bridge (TCP 9485)
└─ Markdown highlighting

External (project-specific):
└─ .vscode/.clarityos.json
   ├─ Command paths
   ├─ Visualization config
   └─ Hot reload
```

**Extension Size**: 8.46 MB (260 files)
**TCP Port**: 9485 (CLI Bridge)

### Package Info

- Version: 1.0.0
- Publisher: yemreak
- License: Apache-2.0
- VS Code: ^1.99.0

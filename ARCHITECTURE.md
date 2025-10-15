# ClarityOS - CENTRALIZED-INTELLIGENCE Architecture

**Pattern**: Configuration-Driven Plugin Architecture
**Inspiration**: Hammerspoon.app (macOS automation tool)

```
Intelligence → Configuration → Executors
     ↓              ↓              ↓
.clarityos.json  registry.ts   commands/*.ts
     ↓              ↓              ↓
  decisions    auto-discover   execution
```

## Directory Structure

```sh
clarityos/
├── extension.ts                 # ← ORCHESTRATOR (framework entry point)
│   ├── activate()
│   │   ├── Initialize: CommandRegistry, CLIBridge, ConfigRegistry
│   │   ├── Register: builtin commands
│   │   ├── Watch: terminal events → broadcast
│   │   └── StatusBar: uptime tracking
│   └── deactivate()
│
├── registry.ts                  # ← EXECUTOR (auto-discovery + hot reload)
│   └── class CommandRegistry
│       ├── initialize()
│       │   ├── Load: .vscode/.clarityos.json
│       │   └── Watch: config changes → reload
│       ├── loadConfig()
│       │   ├── for command in config.commands
│       │   ├── resolve path (support ~, relative, absolute)
│       │   ├── require(commandPath) → CommandDefinition
│       │   ├── vscode.commands.registerCommand(id, execute)
│       │   └── fs.watch(commandPath) → hot reload
│       └── unloadAllCommands()
│
├── .vscode/.clarityos.json      # ← CONFIGURATION REGISTRY (intelligence)
│   {
│     "commands": [
│       {
│         "id": "clarityos.customCommand",
│         "title": "My Custom Command",
│         "path": "./commands/myCommand.ts",  # External file path
│         "icon": "$(symbol-method)",
│         "keybinding": "cmd+shift+x",
│         "menu": "editor/context"
│       }
│     ]
│   }
│
├── commands/                    # ← BUILTIN COMMANDS (always available)
│   ├── closeCursorTerminal.ts
│   ├── searchInStagedFiles.ts
│   ├── searchInUnstagedFiles.ts
│   ├── searchFolders.ts
│   ├── searchPaths.ts
│   ├── sendCursorLine.ts
│   ├── showFileHistory.ts
│   └── utils.ts
│
├── lib/                         # ← CLI BRIDGE (TCP server + dynamic loading)
│   ├── server.ts                # TCP server (port 9485)
│   │   ├── Protocol: JSON-RPC
│   │   ├── Commands: eval, openFile, showQuickPick, ...
│   │   └── Broadcast: terminal-changed → webhooks
│   │
│   ├── config.ts                # Hammerspoon-like config loading
│   │   ├── Register: config files (.clarityos-configs.json)
│   │   ├── Hot reload: fs.watch → reload
│   │   └── Pattern: { activate: (ctx) => ({ dispose }) }
│   │
│   ├── webview.ts               # Webview manager
│   │   ├── Create: HTML panels
│   │   └── Hot reload: file changes → refresh
│   │
│   ├── scm-executor.ts          # SCM command executor
│   ├── visualization.ts         # Progress visualization
│   └── markdown-literal.ts      # Markdown syntax highlighting
│
├── integrations/                # ← EXTERNAL TOOLS
│   └── gitc.ts                  # gitc CLI (commit message generator)
│
├── setupKeybindings.ts          # Keybinding helper
├── types.ts                     # Type contracts
├── package.json                 # Extension metadata + command declarations
├── esbuild.js                   # Bundler (8.4MB → 379KB, 95% reduction)
├── themes/                      # Color themes
├── schemas/                     # JSON schemas
├── icons/                       # Custom file icons
└── ...
```

## Flow Visualization

```
Extension Lifecycle
activate() → Initialize subsystems → Register commands → Start watchers
     ↓              ↓                      ↓                  ↓
extension.ts  CommandRegistry      builtin commands    config/command watchers
                  ↓
          .clarityos.json
                  ↓
          external commands


Command Loading Flow (Hot Reload)
.clarityos.json → CommandRegistry → resolve path → require() → register
       ↓                ↓                               ↓           ↓
  config file    loadConfig()                   CommandDefinition  vscode.commands
       ↓                ↓                               ↓           ↓
fs.watch → reload  unload old → load new         execute()    registerCommand()


CLI Bridge Flow (TCP Server)
Terminal → nc localhost 9485 → JSON-RPC → vscode API → response
    ↓            ↓                 ↓           ↓            ↓
  client    TCP connection    eval system  full access  result JSON


Config Registry Flow (Hammerspoon Pattern)
.clarityos-configs.json → register → load → activate → dispose
         ↓                    ↓        ↓        ↓         ↓
    name:path pairs      registry  require() context   cleanup
         ↓                    ↓        ↓        ↓
    fs.watch           hot reload  module  vscode API
```

## Pattern Comparison

- Configuration-driven plugin architecture
- Intelligence centralized in configuration
- Executors dumb (framework provides infrastructure)
- Hot reload support
- Registry pattern + IoC (Inversion of Control)

## Key Features

◉ **Hot Reload Commands**: No extension restart needed
◉ **CLI Bridge**: Terminal → VSCode API control (port 9485)
◉ **Dynamic Config**: Hammerspoon-like external config loading
◉ **Optimized Bundle**: esbuild (8.4MB → 379KB, 95% reduction)
◉ **File History**: Git integration (commit visualization)
◉ **SCM Integration**: Contextual git operations
◉ **Custom Icons**: File/folder icon theming
◉ **Webview Manager**: HTML panels with hot reload

## Adding New Command

**External Command** (.clarityos.json):
```json
{
  "commands": [
    {
      "id": "clarityos.myCommand",
      "title": "My Custom Command",
      "path": "~/my-commands/custom.ts",
      "icon": "$(symbol-method)",
      "keybinding": "cmd+shift+x"
    }
  ]
}
```

**Command Implementation** (~/my-commands/custom.ts):
```ts
import type { CommandDefinition } from './types'

export default {
  id: 'clarityos.myCommand',
  execute: async (context) => {
    // Your logic here
    // Access: context.workspaceRoot, context.extensionContext
  }
} satisfies CommandDefinition
```

**Result**: Save → registry detects change → hot reload → command available

# ClarityOS

Serving clarity to humanity and their agents.

## Quick Start

1. Install extension
2. Setup keybindings:
   - `Cmd+Shift+P` → "ClarityOS: Setup Keybindings"
   - Paste into User Keybindings (opens automatically)
3. Select theme: `Cmd+Shift+P` → "Color Theme" → "ClarityOS"
4. Press `Cmd+[` to search unstaged files

## Features

**Git Navigation**
- `Cmd+[` - Search unstaged files
- `Cmd+]` - Search staged files
- `Cmd+;` - Search folders
- `Cmd+'` - Search paths and functions
- `Cmd+Shift+'` - Send file:line to terminal
- File History - Git log for current file

**Dark Theme**
- Minimal design (#202020)
- Built for AI pair programming

**Markdown Highlighting**
- `/* md */` template literals colorized in TypeScript/JavaScript
- Headers, bold, lists, questions highlighted

**Terminal Control** (optional)

Install CLI: `npm install -g @yemreak/vscode-cli`

```bash
vscode eval "return vscode.window.activeTextEditor?.document.fileName"
vscode status
vscode output
```

## For Your AI Agent

Tell your AI assistant to use these commands:

```bash
vscode --help

# Get active file path
vscode eval "return vscode.window.activeTextEditor?.document.fileName"

# Check system status
vscode status

# Read output logs
vscode output 50
```

ClarityOS enables your AI agent to control VSCode directly from terminal.

## Suggestions

For best experience, use [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme) for file icons.

## License

Apache-2.0

Icons from [Material Icon Theme](https://github.com/PKief/vscode-material-icon-theme) by Philipp Kief, licensed under MIT.

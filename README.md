# ClarityOS VSCode

A minimalist VSCode extension that bridges Claude Code, Git, and your editor into a unified knowledge system.

## Philosophy

**Make the invisible visible. Connect the disconnected.**

This extension follows the principle of "visibility bridging" - turning implicit references into explicit, actionable links. Every hash is a potential commit. Every @ is a potential file. Every session ID is a potential conversation.

## Features

### 1. @ File Linking
Transform file references into clickable links across Markdown, TypeScript, Python, and Swift files.

```markdown
Check @docs/README.md for details
See implementation in @src/index.ts
```

Click any @ reference to open the file directly. Works with both relative and absolute paths.

### 2. Git Commit Intelligence
Hover over any git hash to see commit details inline.

```markdown
Fixed in commit a1b2c3d
Based on pattern from 7f8e9d0
```

Hover shows:
- Commit message
- Relative time (e.g., "2 hours ago")
- Link to view full commit

### 3. Claude Session Bridge
Unrecognized hashes trigger Claude session lookup.

```markdown
Discussed in session df900ee5-1bfb-48e7-86e1-c0a1b5e8648e
```

If not a git commit, the extension offers to run `chats <session-id>` in your terminal.

### 4. Hashtag Syntax Highlighting
Visual emphasis for hashtag patterns in your documents.

```markdown
#planning #executing #teaching
```

### 5. Starry Night Theme
A true dark theme (#202020) that reduces visual noise and lets your content shine.

## Installation

### From Source
```bash
cd /Users/yemreak/Projects/clarity-vscode
bun run install
```

This will:
1. Build the TypeScript source
2. Package the extension
3. Install it in Cursor/VSCode
4. Clean up build artifacts

### Manual Installation
```bash
# Build
bun build ./src/extension.ts --outdir ./out --target node --format cjs

# Package
vsce package --no-dependencies

# Install
cursor --install-extension clarityos-markdown-*.vsix
# or
code --install-extension clarityos-markdown-*.vsix
```

## How It Works

The extension operates on pattern recognition:

- **Hex patterns** (7-40 chars) → Git commits or Claude sessions
- **@ patterns** → File references
- **# patterns** → Semantic tags

Each pattern type gets different treatment:
1. Git commits → Fetch commit info via `git show`
2. File paths → Verify existence and create links
3. Unknown hashes → Suggest Claude session lookup
4. Hashtags → Apply syntax highlighting

## Use Cases

### 1. Living Documentation
```markdown
## Implementation Notes
Based on commit a1b2c3d where we learned about pattern recognition.
See @src/patterns.ts for the implementation.
Session df900ee5 has the full discussion.
#architecture #decision
```

### 2. Git Learning Trail
```markdown
learned: single source of truth pattern
- Started in 1a2b3c4
- Refined in 5d6e7f8  
- Finalized in 9g0h1i2
```

### 3. Cross-Reference System
```markdown
The culture tool (@src/interface/bin/culture.ts) implements 
the pattern from commit abc123. Details in session xyz789.
```

## Configuration

Currently no configuration needed. The extension follows these principles:
- Zero configuration
- Convention over configuration
- Sensible defaults

## Technical Details

- **Languages**: Markdown, TypeScript, JavaScript, Python, Swift
- **Activation**: Automatic on supported file types
- **Dependencies**: None (uses Node.js child_process for git)
- **Build**: Bun + TypeScript
- **Package**: VSCE

## Philosophy Alignment

This extension embodies several core principles:

1. **Atomicity**: Each reference is atomic and independent
2. **Visibility**: Make hidden connections visible
3. **Simplicity**: 101 lines of code, each with purpose
4. **Integration**: Bridge tools rather than replace them
5. **Living Code**: Documentation lives in code, not separate files

## Future Patterns

Potential patterns to recognize:
- PR references (#123)
- Issue references (GH-456)
- TODO patterns
- Error hashes
- Docker image SHAs

## License

Apache License 2.0 - Includes patent protection.

## Author

Built as part of the ClarityOS ecosystem, following the "zero documentation, living code" philosophy.

---

*"Every hash tells a story. Every link builds a connection. Every pattern has meaning."*
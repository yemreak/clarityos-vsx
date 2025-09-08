# ClarityOS VSCode

A VSCode extension that makes file paths and git commits clickable.

## What It Does

When you write these in your files:
- `@docs/README.md` → Click to open the file
- `a1b2c3d` → Hover to see what changed in that commit
- `df900ee5-1bfb-48e7` → If not a git commit, suggests running Claude session command
- `#planning` → Colors hashtags differently so they stand out

## Why Use This

When taking notes or writing documentation, you often reference files and commits. This extension makes those references clickable, so you don't have to copy-paste or search for them.

Works great with Claude Code - when Claude mentions a file with @ or a commit hash, you can click directly.

## Installation

```bash
cd /Users/yemreak/Projects/clarity-vscode
bun run install
```

## How It Works

1. Finds patterns in your text (like @file or hex strings)
2. Checks if they're real files or git commits
3. Makes them clickable or hoverable
4. That's it

## License

Apache 2.0
# ClarityOS VSX

A VSX extension that makes file paths and git commits clickable.

## What It Does

When you write these in your files:
- `@docs/README.md` → Click to open the file
- `a1b2c3d` → Hover to see what changed in that commit
- `#planning` → Colors hashtags differently so they stand out

## Why Use This

When taking notes or writing documentation, you often reference files and commits. This extension makes those references clickable, so you don't have to copy-paste or search for them.

Works with VS Code, VSCodium, and code editors - when you reference files with @ or mention commit hashes, you can click directly.

## Installation

```bash
cd /Users/yemreak/Projects/clarity-vsx
bun run install
```

## Starry Night Theme

Includes a dark theme that's easy on the eyes:
- True black background (#202020) - reduces eye strain
- No bright colors that grab your attention unnecessarily
- Designed to help you focus on your code, not the editor

## How It Works

1. Finds patterns in your text (like @file or hex strings)
2. Checks if they're real files or git commits
3. Makes them clickable or hoverable
4. That's it

## Publishing

This extension is available on [Open VSX Registry](https://open-vsx.org) - the free, vendor-neutral marketplace for VSX extensions.

## License

Apache 2.0
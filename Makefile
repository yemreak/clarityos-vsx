# Install to Cursor
install:
	@bun build ./src/extension.ts --outdir ./out --target node --format cjs --sourcemap --external vscode
	@vsce package --no-dependencies --allow-missing-repository
	@cursor --install-extension clarityos-*.vsix
	@rm -f clarityos-*.vsix
	@rm -rf out node_modules

# Publish to Open VSX
publish:
	@bun build ./src/extension.ts --outdir ./out --target node --format cjs --sourcemap --external vscode
	@npx ovsx publish --pat $(OVSX_PAT)
	@rm -rf out
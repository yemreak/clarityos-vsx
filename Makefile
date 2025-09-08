# ClarityOS VSCode Extension Makefile

# Build the extension
build:
	@echo "[BUILD] Compiling TypeScript..."
	@bun build ./src/extension.ts --outdir ./out --target node --format cjs --sourcemap --external vscode
	@echo "[OK] Build complete"

# Package the extension
package: build
	@echo "[PACKAGE] Creating VSIX package..."
	@vsce package --no-dependencies --allow-missing-repository
	@echo "[OK] Package created: clarityos-*.vsix"

# Install locally in Cursor
install-cursor: package
	@echo "[INSTALL] Installing in Cursor..."
	@cursor --install-extension clarityos-*.vsix
	@rm -f clarityos-*.vsix
	@rm -rf out node_modules
	@echo "[OK] Installed in Cursor"

# Install locally in VSCode
install-vscode: package
	@echo "[INSTALL] Installing in VSCode..."
	@code --install-extension clarityos-*.vsix
	@rm -f clarityos-*.vsix
	@rm -rf out node_modules
	@echo "[OK] Installed in VSCode"

# Publish to VSCode Marketplace
publish: build
	@echo "[PUBLISH] Publishing to VSCode Marketplace..."
	@vsce publish
	@echo "[OK] Published to marketplace"

# Login to VSCode publisher account
login:
	@echo "[LOGIN] Logging in to VSCode publisher account..."
	@vsce login yemreak
	@echo "[OK] Logged in"

# Create publisher if not exists
create-publisher:
	@echo "[SETUP] Creating publisher account..."
	@vsce create-publisher yemreak
	@echo "[OK] Publisher created"

# Clean build artifacts
clean:
	@echo "[CLEAN] Removing build artifacts..."
	@rm -rf out node_modules clarityos-*.vsix
	@echo "[OK] Cleaned"

# Show current version
version:
	@echo "Current version: $$(jq -r .version package.json)"

# Bump patch version (0.0.1 -> 0.0.2)
bump-patch:
	@old=$$(jq -r .version package.json); \
	new=$$(echo $$old | awk -F. '{print $$1"."$$2"."$$3+1}'); \
	jq ".version = \"$$new\"" package.json > package.json.tmp && \
	mv package.json.tmp package.json; \
	echo "[VERSION] $$old -> $$new"

# Bump minor version (0.0.1 -> 0.1.0)
bump-minor:
	@old=$$(jq -r .version package.json); \
	new=$$(echo $$old | awk -F. '{print $$1"."$$2+1".0"}'); \
	jq ".version = \"$$new\"" package.json > package.json.tmp && \
	mv package.json.tmp package.json; \
	echo "[VERSION] $$old -> $$new"

# Bump major version (0.0.1 -> 1.0.0)
bump-major:
	@old=$$(jq -r .version package.json); \
	new=$$(echo $$old | awk -F. '{print $$1+1".0.0"}'); \
	jq ".version = \"$$new\"" package.json > package.json.tmp && \
	mv package.json.tmp package.json; \
	echo "[VERSION] $$old -> $$new"

# Full release cycle: bump version, commit, tag, publish
release-patch: bump-patch
	@git add package.json
	@git commit -m "chore: bump version to $$(jq -r .version package.json)"
	@git tag v$$(jq -r .version package.json)
	@git push && git push --tags
	@$(MAKE) publish

# Help
help:
	@echo "Available commands:"
	@echo "  make build          - Compile TypeScript"
	@echo "  make package        - Create VSIX package"
	@echo "  make install-cursor - Install in Cursor"
	@echo "  make install-vscode - Install in VSCode"
	@echo "  make publish        - Publish to marketplace"
	@echo "  make login          - Login to publisher account"
	@echo "  make bump-patch     - Increase patch version"
	@echo "  make bump-minor     - Increase minor version"
	@echo "  make bump-major     - Increase major version"
	@echo "  make release-patch  - Full release cycle"
	@echo "  make clean          - Remove build artifacts"
	@echo "  make version        - Show current version"

.PHONY: build package install-cursor install-vscode publish login create-publisher clean version bump-patch bump-minor bump-major release-patch help
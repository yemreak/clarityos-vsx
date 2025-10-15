import { execSync } from 'child_process'
import * as path from 'path'
import * as vscode from 'vscode'
import type { CommandContext } from '../types'


// Map folder names to Material Icon Theme SVG filenames
export function getFolderIcon(folderName: string): string {
	const name = folderName.toLowerCase()

	const folderNameMap: Record<string, string> = {
		// Special directories
		'.vscode': 'folder-vscode.svg',
		'.git': 'folder-git.svg',
		'.claude': 'folder-claude.svg',
		'node_modules': 'folder.svg',

		// Config & Settings
		'config': 'folder-config.svg',
		'settings': 'folder-config.svg',
		'zsh': 'folder-lib.svg',
		'ssh': 'folder-ssh.svg',
		'xcode': 'folder-plugin.svg',

		// Database
		'database': 'folder-database.svg',
		'backup': 'folder-archive.svg',
		'personal': 'folder-home.svg',
		'private': 'folder-secure.svg',
		'schema': 'folder-database.svg',
		'storage': 'folder-database.svg',
		'tmp': 'folder-temp.svg',

		// Project structure
		'logs': 'folder-log.svg',
		'my': 'folder-home.svg',
		'archive': 'folder-archive.svg',
		'flows': 'folder-lib.svg',
		'agents': 'folder-agents.svg',
		'sessions': 'folder-sessions.svg',

		// Source code
		'src': 'folder-src.svg',
		'scripts': 'folder-lib.svg',
		'assets': 'folder-images.svg',
		'exp': 'folder-test.svg',

		// Interface platforms
		'interface': 'folder-plugin.svg',
		'cli': 'folder-lib.svg',
		'git': 'folder-git.svg',
		'http': 'folder-api.svg',
		'view': 'folder-views.svg',
		'vscode': 'folder-vscode.svg',
		'telegram': 'folder-telegram.svg',
		'mcp': 'folder-plugin.svg',
		'pm2': 'folder-container.svg',
		'chrome': 'folder-plugin.svg',
		'hammerspoon': 'folder-hammerspoon.svg',
		'cloudflare': 'folder-cloud.svg',
		'fly': 'folder-plugin.svg',

		// Logic layers
		'logic': 'folder-logic.svg',
		'action': 'folder-actions.svg',
		'base': 'folder-core.svg',
		'local': 'folder-home.svg',
		'types': 'folder-typescript.svg',
		'web': 'folder-network.svg',
		'data': 'folder-database.svg',

		// Architecture patterns
		'middleware': 'folder-middleware.svg',
		'actions': 'folder-actions.svg',
		'handlers': 'folder-controller.svg',
		'handler': 'folder-controller.svg',
		'controller': 'folder-controller.svg',
		'controllers': 'folder-controller.svg',
		'api': 'folder-api.svg',
		'routes': 'folder-routes.svg',
		'pipeline': 'folder-ci.svg',
		'utils': 'folder-utils.svg',
		'util': 'folder-utils.svg',
		'core': 'folder-core.svg',
		'lib': 'folder-lib.svg',
		'libs': 'folder-lib.svg',
		'components': 'folder-components.svg',
		'component': 'folder-components.svg',
		'hooks': 'folder-hook.svg',
		'modules': 'folder-packages.svg',
		'module': 'folder-packages.svg',
		'packages': 'folder-packages.svg',
		'services': 'folder-lib.svg',
		'service': 'folder-lib.svg',
		'helpers': 'folder-utils.svg',
		'common': 'folder-lib.svg',

		// Build outputs
		'out': 'folder.svg',
		'dist': 'folder.svg',
		'build': 'folder.svg',
		'icons': 'folder-images.svg',
		'themes': 'folder-views.svg',

		// Documentation
		'docs': 'folder.svg',
		'documentation': 'folder.svg',

		// Content
		'posts': 'folder.svg',
		'contexts': 'folder.svg',
		'indexes': 'folder.svg',
		'prompts': 'folder.svg',

		// System
		'launchagents': 'folder-launchagents.svg',
		'nextdns': 'folder-network.svg',
		'macos': 'folder-macos.svg',
		'admin': 'folder-admin.svg',
		'cloud': 'folder-cloud.svg',
		'history': 'folder-history.svg',
		'output-styles': 'folder-config.svg'
	}

	return folderNameMap[name] || 'folder.svg'
}

// Map file names and extensions to Material Icon Theme SVG filenames
export function getFileIcon(filePath: string): string {
	const fileName = path.basename(filePath).toLowerCase()
	const ext = path.extname(filePath).toLowerCase()

	// Check filename first (specific files like Dockerfile, CLAUDE.md)
	const fileNameMap: Record<string, string> = {
		// Docker
		'dockerfile': 'file-docker.svg',
		// Documentation
		'architecture.md': 'file-architecture.svg',
		'claude.md': 'file-claude.svg',
		'readme.md': 'file-readme.svg',
		'readme': 'file-readme.svg',
		'changelog.md': 'file-changelog.svg',
		'changelog': 'file-changelog.svg',
		'license': 'file-document.svg',
		'license.md': 'file-document.svg',
		// Package managers
		'package.json': 'file-nodejs.svg',
		'package-lock.json': 'file-lock.svg',
		'yarn.lock': 'file-lock.svg',
		'bun.lock': 'file-lock.svg',
		'.npmrc': 'file-npm.svg',
		'.yarnrc': 'file-yarn.svg',
		// Config files
		'tsconfig.json': 'file-typescript.svg',
		'manifest.json': 'file-json.svg',
		'.luacheckrc': 'file-lua.svg',
		// Ignore files
		'.gitignore': 'file-git.svg',
		'.vscodeignore': 'file-vscode.svg',
		'.dockerignore': 'file-docker.svg',
		'.npmignore': 'file-npm.svg',
		// Build tools
		'makefile': 'file-makefile.svg',
		'.editorconfig': 'file-editorconfig.svg',
		'.prettierrc': 'file-prettier.svg',
		'.prettierrc.json': 'file-prettier.svg',
		'.eslintrc': 'file-eslint.svg',
		'.eslintrc.json': 'file-eslint.svg',
		'eslint.config.js': 'file-eslint.svg',
		'fly.toml': 'file-toml.svg',
		'favicon.ico': 'file-favicon.svg'
	}

	if (fileNameMap[fileName]) {
		return fileNameMap[fileName]
	}

	// Check extension
	const extMap: Record<string, string> = {
		// Programming languages
		'.d.ts': 'file-typescript.svg',
		'.ts': 'file-typescript.svg',
		'.tsx': 'file-typescript.svg',
		'.js': 'file-javascript.svg',
		'.jsx': 'file-javascript.svg',
		'.cjs': 'file-cjs.svg',
		'.py': 'file-python.svg',
		'.lua': 'file-lua.svg',
		'.swift': 'file-swift.svg',
		'.sh': 'file-console.svg',
		// Markup & Data
		'.json': 'file-json.svg',
		'.md': 'file-markdown.svg',
		'.html': 'file-html.svg',
		'.xml': 'file-xml.svg',
		'.yml': 'file-yaml.svg',
		'.yaml': 'file-yaml.svg',
		'.toml': 'file-toml.svg',
		'.sql': 'file-database.svg',
		// Styling
		'.css': 'file-css.svg',
		'.scss': 'file-css.svg',
		// Images
		'.svg': 'file-image.svg',
		'.png': 'file-image.svg',
		'.jpg': 'file-image.svg',
		'.jpeg': 'file-image.svg',
		'.gif': 'file-image.svg',
		'.ico': 'file-favicon.svg',
		// Apple & Xcode
		'.plist': 'file-plist.svg',
		'.mobileconfig': 'file-mobileconfig.svg',
		'.xccolortheme': 'file-xccolortheme.svg',
		// Config
		'.env': 'file-settings.svg'
	}
	return extMap[ext] || 'file.svg'
}

interface FileQuickPickItem extends vscode.QuickPickItem {
	filePath: string
}

export async function searchInGitFiles(
	context: CommandContext,
	gitCommand: string,
	placeholder: string
): Promise<void> {
	try {
		const { workspaceRoot, extensionContext } = context

		// Get files from git
		const files = execSync(gitCommand, {
			cwd: workspaceRoot,
			encoding: 'utf-8'
		})
			.trim()
			.split('\n')
			.filter(file => file.length > 0)

		if (files.length === 0) {
			vscode.window.showInformationMessage('No files found')
			return
		}

		// Format items like VS Code Quick Open
		const items: FileQuickPickItem[] = files.map(file => {
			const iconFileName = getFileIcon(file)
			const iconPath = vscode.Uri.file(path.join(extensionContext.extensionPath, 'icons', iconFileName))

			return {
				label: path.basename(file),
				description: path.dirname(file) || '.',
				iconPath: iconPath,
				filePath: file
			}
		})

		// Show Quick Pick
		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: placeholder,
			matchOnDescription: true,
			matchOnDetail: true
		})

		if (selected) {
			const fileUri = vscode.Uri.file(path.join(workspaceRoot, selected.filePath))
			await vscode.window.showTextDocument(fileUri)
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		vscode.window.showErrorMessage(`Failed to get files: ${errorMessage}`)
	}
}

interface FileItem extends vscode.QuickPickItem {
	filePath: string
	isFolder: boolean
}

export async function showFilesInFolder(context: CommandContext, folderUri: vscode.Uri): Promise<void> {
	try {
		const { extensionContext, logState } = context

		logState('folder_opened', { path: folderUri.fsPath })

		const entries = await vscode.workspace.fs.readDirectory(folderUri)
		const files = entries.filter(([_, type]) => type === vscode.FileType.File)
		const folders = entries.filter(([_, type]) => type === vscode.FileType.Directory)

		logState('folder_scanned', {
			path: folderUri.fsPath,
			files: files.length,
			folders: folders.length
		})

		if (files.length === 0 && folders.length === 0) {
			vscode.window.showInformationMessage('Empty folder')
			logState('folder_empty', { path: folderUri.fsPath })
			return
		}

		// Add folders first, then files
		const folderItems: FileItem[] = folders.map(([name]) => {
			const iconFileName = getFolderIcon(name)
			const iconPath = vscode.Uri.file(path.join(extensionContext.extensionPath, 'icons', iconFileName))

			return {
				label: name,
				iconPath: iconPath,
				filePath: path.join(folderUri.fsPath, name),
				isFolder: true
			}
		})

		const fileItems: FileItem[] = files.map(([name]) => {
			const iconFileName = getFileIcon(path.join(folderUri.fsPath, name))
			const iconPath = vscode.Uri.file(path.join(extensionContext.extensionPath, 'icons', iconFileName))

			return {
				label: name,
				iconPath: iconPath,
				filePath: path.join(folderUri.fsPath, name),
				isFolder: false
			}
		})

		const items = [...folderItems, ...fileItems]

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Type to search files and folders...',
			matchOnDescription: true
		})

		if (selected) {
			if (selected.isFolder) {
				logState('subfolder_selected', { path: selected.filePath })
				// Recursively show contents of subfolder
				await showFilesInFolder(context, vscode.Uri.file(selected.filePath))
			} else {
				logState('file_selected', { path: selected.filePath })
				const fileUri = vscode.Uri.file(selected.filePath)
				await vscode.window.showTextDocument(fileUri)
				logState('file_opened', { path: selected.filePath })
			}
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		context.logState('folder_error', { error: errorMessage })
		vscode.window.showErrorMessage(`Failed to read folder: ${errorMessage}`)
	}
}

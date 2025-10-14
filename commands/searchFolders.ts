import * as path from 'path'
import * as vscode from 'vscode'
import type { CommandContext, CommandDefinition } from '../types'
import { getFolderIcon, showFilesInFolder } from './utils'

async function execute(context: CommandContext): Promise<void> {
	try {
		const { extensionContext, logState } = context

		logState('search_started', { command: 'searchFolders' })

		const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
		if (!workspaceFolder) {
			logState('search_error', { error: 'No workspace folder' })
			vscode.window.showErrorMessage('No workspace folder open')
			return
		}

		logState('workspace_detected', { path: workspaceFolder.uri.fsPath })

		const folders: string[] = []
		const visited = new Set<string>()

		async function scanDir(uri: vscode.Uri, depth: number = 0): Promise<void> {
			if (depth > 10) return // Limit depth
			if (visited.has(uri.path)) return
			visited.add(uri.path)

			try {
				const entries = await vscode.workspace.fs.readDirectory(uri)

				for (const [name, type] of entries) {
					// Skip common ignores
					if (name === 'node_modules' || name === '.git' || name === '.cache' || name === 'out' || name === 'dist' || name === 'build') continue

					if (type === vscode.FileType.Directory) {
						const childUri = vscode.Uri.joinPath(uri, name)
						const relativePath = path.relative(workspaceFolder!.uri.path, childUri.path)
						folders.push(relativePath)

						// Recursive scan
						if (folders.length < 500) {
							await scanDir(childUri, depth + 1)
						}
					}
				}
			} catch (e) {
				// Permission denied or other errors
			}
		}

		await scanDir(workspaceFolder.uri)

		logState('scan_completed', {
			total_folders: folders.length,
			depth: 10,
			max: 500
		})

		if (folders.length === 0) {
			logState('scan_empty', { workspace: workspaceFolder.uri.fsPath })
			vscode.window.showInformationMessage('No folders found')
			return
		}

		// Format items with folder-specific icons
		const items: vscode.QuickPickItem[] = folders.map(folder => {
			const folderName = path.basename(folder)
			const iconFileName = getFolderIcon(folderName)
			const iconPath = vscode.Uri.file(path.join(extensionContext.extensionPath, 'icons', iconFileName))

			return {
				label: folderName,
				description: path.dirname(folder) || '.',
				iconPath: iconPath
			}
		})

		// Show Quick Pick (like file search Cmd+P)
		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Type to search folders...',
			matchOnDescription: true,
			matchOnDetail: true
		})

		if (selected) {
			const folderPath = selected.description === '.'
				? selected.label
				: path.join(selected.description!, selected.label)
			const folderUri = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, folderPath))

			logState('folder_selected', { path: folderPath })

			// Show files in selected folder
			await showFilesInFolder(context, folderUri)
		} else {
			logState('search_cancelled', {})
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		context.logState('search_error', { error: errorMessage })
		vscode.window.showErrorMessage(`Failed to search folders: ${errorMessage}`)
	}
}

const command: CommandDefinition = {
	id: 'clarityos.searchFolders',
	execute
}

export default command

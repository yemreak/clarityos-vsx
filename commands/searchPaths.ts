import { execSync } from 'child_process'
import * as path from 'path'
import * as vscode from 'vscode'
import type { CommandContext, CommandDefinition } from '../types'
import { getFolderIcon, getFileIcon } from './utils'

interface PathQuickPickItem extends vscode.QuickPickItem {
	filePath: string
	isFolder?: boolean
	line?: number
}

async function execute(context: CommandContext): Promise<void> {
	try {
		const { workspaceRoot, extensionContext, logState } = context

		logState('search_started', { command: 'searchPaths' })

		logState('workspace_detected', { path: workspaceRoot })

		// Create QuickPick for inline search
		const quickPick = vscode.window.createQuickPick<PathQuickPickItem>()
		quickPick.placeholder = 'Type to search files, folders, and functions...'
		quickPick.matchOnDescription = true
		quickPick.matchOnDetail = true

		let pathItems: PathQuickPickItem[] = []
		let functionItems: PathQuickPickItem[] = []

		// Load path items (files + folders)
		const allFiles = execSync('git ls-files', {
			cwd: workspaceRoot,
			encoding: 'utf-8'
		})
			.trim()
			.split('\n')
			.filter(file => file.length > 0)

		const folderSet = new Set<string>()
		for (const file of allFiles) {
			const dir = path.dirname(file)
			if (dir !== '.') {
				folderSet.add(dir)
			}
		}

		const folders = Array.from(folderSet)

		const folderItems: PathQuickPickItem[] = folders.map(folder => {
			const folderName = path.basename(folder)
			const iconFileName = getFolderIcon(folderName)
			const iconPath = vscode.Uri.file(path.join(extensionContext.extensionPath, 'icons', iconFileName))

			return {
				label: folderName,
				description: path.dirname(folder) || '.',
				iconPath: iconPath,
				filePath: folder,
				isFolder: true
			}
		})

		const fileItems: PathQuickPickItem[] = allFiles.map(file => {
			const fileName = path.basename(file)
			const iconFileName = getFileIcon(file)
			const iconPath = vscode.Uri.file(path.join(extensionContext.extensionPath, 'icons', iconFileName))

			return {
				label: fileName,
				description: path.dirname(file) || '.',
				iconPath: iconPath,
				filePath: file,
				isFolder: false
			}
		})

		pathItems = [...folderItems, ...fileItems]

		// Set initial items (files + folders)
		quickPick.items = pathItems

		logState('scan_completed', {
			total_folders: folders.length,
			total_files: allFiles.length
		})

		// Start async function loading in background
		quickPick.busy = true
		;(async () => {
			try {
				const allTSFiles = allFiles.filter(file => {
					const ext = path.extname(file).toLowerCase()
					return ext === '.ts' || ext === '.tsx' || ext === '.js' || ext === '.jsx'
				})

				logState('function_scan_started', { total_files: allTSFiles.length })

				const functions: Array<{ name: string; file: string; line: number }> = []

				// Extract functions from all TS/JS files
				for (const file of allTSFiles) {
					try {
						const fileUri = vscode.Uri.file(path.join(workspaceRoot, file))
						const symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>(
							'vscode.executeDocumentSymbolProvider',
							fileUri
						)

						if (!symbols) continue

						const extractSymbols = (syms: vscode.DocumentSymbol[], parentName?: string): void => {
							for (const symbol of syms) {
								if (
									symbol.kind === vscode.SymbolKind.Function ||
									symbol.kind === vscode.SymbolKind.Method ||
									symbol.kind === vscode.SymbolKind.Constructor
								) {
									const name = parentName ? `${parentName}.${symbol.name}` : symbol.name
									functions.push({
										name: name,
										file: file,
										line: symbol.range.start.line + 1
									})
								}

								if (symbol.children && symbol.children.length > 0) {
									const newParent = symbol.kind === vscode.SymbolKind.Class ? symbol.name : parentName
									extractSymbols(symbol.children, newParent)
								}
							}
						}

						extractSymbols(symbols)
					} catch (error) {
						// Skip files that can't be analyzed
					}
				}

				functionItems = functions.map(func => {
					return {
						label: func.name,
						description: `${func.file}:${func.line}`,
						iconPath: new vscode.ThemeIcon('symbol-method'),
						filePath: func.file,
						line: func.line
					}
				})

				logState('functions_loaded', { total: functionItems.length })

				// Append functions to existing items
				quickPick.items = [...pathItems, ...functionItems]
				logState('all_items_loaded', { total: quickPick.items.length })
			} catch (error) {
				logState('functions_load_error', { error: String(error) })
			} finally {
				quickPick.busy = false
			}
		})()

		// Handle selection
		quickPick.onDidAccept(() => {
			const selected = quickPick.selectedItems[0]
			if (selected) {
				// Function item has line number → GitHub format
				const output = selected.line
					? `${selected.filePath}#L${selected.line}`
					: selected.filePath

				logState('item_selected', {
					path: output,
					isFolder: selected.isFolder,
					hasLine: !!selected.line
				})

				// Send to terminal
				const terminal = vscode.window.activeTerminal
				if (terminal) {
					terminal.sendText(`${output}\t`, false)
					logState('output_sent_to_terminal', { output })
				} else {
					// No terminal → copy to clipboard
					vscode.env.clipboard.writeText(output)
					vscode.window.showInformationMessage(`Copied: ${output}`)
					logState('output_copied_to_clipboard', { output })
				}
			}

			quickPick.hide()
		})

		quickPick.onDidHide(() => {
			logState('search_cancelled', {})
			quickPick.dispose()
		})

		quickPick.show()
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		context.logState('search_error', { error: errorMessage })
		vscode.window.showErrorMessage(`Failed to search paths: ${errorMessage}`)
	}
}

const command: CommandDefinition = {
	id: 'clarityos.searchPaths',
	execute
}

export default command

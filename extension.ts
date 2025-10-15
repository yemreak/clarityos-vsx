import { execSync } from 'child_process'
import * as vscode from 'vscode'
import { CommandRegistry } from './registry'
import { startBridgeServer } from './lib/server'
import { createWebviewManager } from './lib/webview'
import { createConfigRegistry } from './lib/config'
import { VisualizationHandler } from './lib/visualization'
import { executeSCMCommand } from './lib/scm-executor'
import { setupKeybindings } from './setupKeybindings'
import { activateMarkdownLiteral } from './lib/markdown-literal'
import type { CommandDefinition, CommandContext } from './types'

// Builtin commands
import closeCursorTerminalCmd from './commands/closeCursorTerminal'
import searchInStagedFilesCmd from './commands/searchInStagedFiles'
import searchInUnstagedFilesCmd from './commands/searchInUnstagedFiles'
import searchFoldersCmd from './commands/searchFolders'
import searchPathsCmd from './commands/searchPaths'
import sendCursorLineCmd from './commands/sendCursorLine'
import showFileHistoryCmd from './commands/showFileHistory'

// Global output channel for state logging
let outputChannel: vscode.OutputChannel | undefined
let workspaceRootCache: string | undefined

// Terminal start times tracking
const terminalStartTimes = new Map<vscode.Terminal, number>()

class HistoryContentProvider implements vscode.TextDocumentContentProvider {
	provideTextDocumentContent(uri: vscode.Uri): string {
		const hash = uri.authority
		const filePath = uri.path.startsWith('/') ? uri.path.slice(1) : uri.path

		if (!workspaceRootCache) {
			throw new Error('No workspace root')
		}

		const content = execSync(
			`git show ${hash}:"${filePath}"`,
			{ cwd: workspaceRootCache, encoding: 'utf-8' }
		)

		return content
	}
}

function getOutputChannel(): vscode.OutputChannel {
	if (!outputChannel) {
		outputChannel = vscode.window.createOutputChannel('ClarityOS Commands')
	}
	return outputChannel
}

function logState(type: string, context: any): void {
	const timestamp = new Date().toISOString()
	const log = `[${timestamp}] ${type}: ${JSON.stringify(context)}`
	getOutputChannel().appendLine(log)
}

// All commands moved to commands/ directory (dynamic loading via registry)

export function activate(context: vscode.ExtensionContext) {
	// Cache workspace root
	workspaceRootCache = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''

	// Log activation
	logState('extension_activated', {
		workspace: workspaceRootCache,
		extensionPath: context.extensionPath
	})

	// Activate markdown literal syntax highlighting
	activateMarkdownLiteral(context)

	// Track terminals
	vscode.window.onDidOpenTerminal(terminal => {
		terminalStartTimes.set(terminal, Date.now())
	})

	vscode.window.onDidCloseTerminal(terminal => {
		terminalStartTimes.delete(terminal)
	})

	// Initialize webview manager
	const webviewManager = createWebviewManager({ workspaceRoot: workspaceRootCache })

	// Initialize config registry
	const bridgeStartTime = Date.now()
	const configRegistry = createConfigRegistry({
		vscode,
		context,
		workspaceRoot: workspaceRootCache,
		bridgeStartTime
	})

	// Start CLI Bridge server
	const bridgeOutputChannel = vscode.window.createOutputChannel('ClarityOS Bridge')
	const bridge = startBridgeServer({
		vscode,
		context,
		terminalStartTimes,
		webviewManager,
		configHandlers: {
			register: configRegistry.register,
			unregister: configRegistry.unregister,
			list: configRegistry.list
		},
		outputChannel: bridgeOutputChannel
	})

	context.subscriptions.push({
		dispose: () => bridge.dispose()
	})

	// Event broadcaster: Terminal changes → webhooks
	vscode.window.onDidChangeActiveTerminal(async terminal => {
		if (!terminal) return

		const processId = await terminal.processId
		bridge.broadcast({
			event: 'terminal-changed',
			timestamp: Date.now(),
			data: {
				name: terminal.name,
				processId: processId
			}
		})
	})

	// Status bar
	const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100)
	statusBar.text = '$(plug) ClarityOS'

	function updateStatusBar() {
		const uptimeSeconds = Math.floor((Date.now() - bridge.startTime) / 1000)
		const hours = Math.floor(uptimeSeconds / 3600)
		const minutes = Math.floor((uptimeSeconds % 3600) / 60)
		const uptimeFormatted = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`

		statusBar.tooltip = `ClarityOS Bridge\nPort: 9485\nUptime: ${uptimeFormatted}`
	}

	updateStatusBar()
	const interval = setInterval(updateStatusBar, 30000)
	context.subscriptions.push({ dispose: () => clearInterval(interval) })

	statusBar.show()
	context.subscriptions.push(statusBar)

	// Command context for builtin commands
	const commandContext: CommandContext = {
		extensionContext: context,
		workspaceRoot: workspaceRootCache || '',
		logState
	}

	// Register builtin commands (always available)
	const builtinCommands: CommandDefinition[] = [
		closeCursorTerminalCmd,
		searchInStagedFilesCmd,
		searchInUnstagedFilesCmd,
		searchFoldersCmd,
		searchPathsCmd,
		sendCursorLineCmd,
		showFileHistoryCmd
	]

	for (const cmd of builtinCommands) {
		const disposable = vscode.commands.registerCommand(cmd.id, () => cmd.execute(commandContext))
		context.subscriptions.push(disposable)
	}

	// Setup keybindings helper
	const setupKeybindingsCommand = vscode.commands.registerCommand(
		'clarityos.setupKeybindings',
		() => setupKeybindings(workspaceRootCache || '')
	)
	context.subscriptions.push(setupKeybindingsCommand)

	// SCM command executor with visualization
	const visualizationHandler = new VisualizationHandler(context)
	const executeSCMCommandDisposable = vscode.commands.registerCommand('clarityos.executeSCMCommand', async () => {
		// Read visualization config from .clarityos.json
		const configPath = require('path').join(workspaceRootCache || '', '.vscode', '.clarityos.json')
		let visualizationConfig = {
			showProgress: true,
			showStatus: true,
			outputChannel: 'ClarityOS SCM',
			progressTitle: 'Executing SCM Command'
		}

		try {
			const configContent = require('fs').readFileSync(configPath, 'utf-8')
			const config = JSON.parse(configContent)
			const scmCommand = config.commands.find((cmd: any) => cmd.menu === 'scm/title')
			if (scmCommand?.visualization) {
				visualizationConfig = { ...visualizationConfig, ...scmCommand.visualization }
			}
		} catch {
			// Use default config
		}

		await visualizationHandler.execute({
			config: visualizationConfig,
			execute: async visualizationContext => {
				await executeSCMCommand({
					workspaceRoot: workspaceRootCache || '',
					extensionContext: context,
					visualizationContext
				})
			}
		})
	})
	context.subscriptions.push(executeSCMCommandDisposable)

	// Initialize dynamic command registry
	const registry = new CommandRegistry(context, workspaceRootCache, logState)
	registry.initialize()
	context.subscriptions.push({
		dispose: () => registry.dispose()
	})

	// Register read-only content provider for historical files
	const provider = new HistoryContentProvider()
	context.subscriptions.push(
		vscode.workspace.registerTextDocumentContentProvider('clarityos-history', provider)
	)

	// Show output channel for visibility
	getOutputChannel().appendLine('✓ ClarityOS activated')
	logState('extension_ready', { mode: 'dynamic_command_loading', bridge: 'port_9485' })

	console.log('ClarityOS activated')
}

export async function deactivate() {
	console.log('ClarityOS deactivating...')
	// Note: context.subscriptions automatically handles cleanup
	// including bridge.dispose() which now properly closes the server
}

import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs'
import type { CommandDefinition, CommandContext } from './types'

/**
 * CENTRALIZED-INTELLIGENCE Pattern
 *
 * Extension = Orchestrator (framework)
 * .clarityos.json = Registry (configuration)
 * External files = Intelligence (actual logic)
 *
 * Hammerspoon-like architecture:
 * - Hammerspoon.app → ClarityOS Extension
 * - ~/.hammerspoon/init.lua → .vscode/.clarityos.json
 */

interface CommandConfig {
	id: string
	title: string
	path: string
	icon?: string
	keybinding?: string
	menu?: string
}

interface ClarityConfig {
	commands: CommandConfig[]
}

export class CommandRegistry {
	private commands = new Map<string, CommandDefinition>()
	private disposables = new Map<string, vscode.Disposable[]>()
	private configWatcher: vscode.FileSystemWatcher | undefined
	private commandWatchers = new Map<string, fs.FSWatcher>()
	private context: CommandContext
	private configPath: string

	constructor(
		extensionContext: vscode.ExtensionContext,
		workspaceRoot: string,
		logState: (type: string, context: any) => void
	) {
		this.context = { extensionContext, workspaceRoot, logState }
		this.configPath = path.join(workspaceRoot, '.vscode', '.clarityos.json')
	}

	async initialize(): Promise<void> {
		// Create .vscode directory if doesn't exist
		const vscodeDir = path.dirname(this.configPath)
		if (!fs.existsSync(vscodeDir)) {
			fs.mkdirSync(vscodeDir, { recursive: true })
		}

		// Create default config if doesn't exist
		if (!fs.existsSync(this.configPath)) {
			const defaultConfig: ClarityConfig = {
				commands: []
			}
			fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2))
			this.context.logState('config_created', { path: this.configPath })
		}

		// Initial load
		await this.loadConfig()

		// Watch for config changes
		this.configWatcher = vscode.workspace.createFileSystemWatcher(this.configPath)
		this.configWatcher.onDidChange(() => this.reloadConfig())
		this.configWatcher.onDidCreate(() => this.reloadConfig())

		this.context.logState('registry_initialized', {
			commands: this.commands.size,
			configPath: this.configPath
		})
	}

	private async loadConfig(): Promise<void> {
		try {
			const configContent = fs.readFileSync(this.configPath, 'utf-8')
			const config: ClarityConfig = JSON.parse(configContent)

			// Clear all existing commands
			this.unloadAllCommands()

			// Load all commands from config
			for (const cmdConfig of config.commands) {
				await this.loadCommand(cmdConfig)
			}

			this.context.logState('config_loaded', {
				commands: config.commands.length
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.context.logState('config_load_error', { error: errorMessage })
		}
	}

	private async reloadConfig(): Promise<void> {
		this.context.logState('config_reload_triggered', {})
		await this.loadConfig()
	}

	private async loadCommand(cmdConfig: CommandConfig): Promise<void> {
		try {
			// Resolve path (support ~ and relative paths)
			let commandPath = cmdConfig.path
			if (commandPath.startsWith('~')) {
				commandPath = path.join(require('os').homedir(), commandPath.slice(1))
			} else if (!path.isAbsolute(commandPath)) {
				commandPath = path.join(this.context.workspaceRoot, commandPath)
			}

			// Check if file exists
			if (!fs.existsSync(commandPath)) {
				throw new Error(`Command file not found: ${commandPath}`)
			}

			// Enable TypeScript support for external commands
			if (commandPath.endsWith('.ts')) {
				require('tsx/cjs')
			}

			// Clear module cache for hot reload
			delete require.cache[require.resolve(commandPath)]

			// Load command module
			const module = require(commandPath)
			const commandDef: CommandDefinition = module.default || module

			if (!commandDef?.execute) {
				throw new Error('Invalid command definition (missing execute function)')
			}

			const disposables: vscode.Disposable[] = []

			// Register command
			const commandDisposable = vscode.commands.registerCommand(cmdConfig.id, async () => {
				await commandDef.execute(this.context)
			})
			disposables.push(commandDisposable)

			// Register keybinding (if specified)
			// Note: Keybindings need to be in package.json for proper registration
			// This is just for runtime tracking
			if (cmdConfig.keybinding) {
				this.context.logState('keybinding_registered', {
					id: cmdConfig.id,
					keybinding: cmdConfig.keybinding
				})
			}

			this.commands.set(cmdConfig.id, commandDef)
			this.disposables.set(cmdConfig.id, disposables)

			// Watch command file for changes (hot reload)
			if (this.commandWatchers.has(cmdConfig.id)) {
				this.commandWatchers.get(cmdConfig.id)?.close()
			}

			const watcher = fs.watch(commandPath, () => {
				this.context.logState('command_file_changed', { id: cmdConfig.id })
				this.loadCommand(cmdConfig)
			})
			this.commandWatchers.set(cmdConfig.id, watcher)

			this.context.logState('command_loaded', {
				id: cmdConfig.id,
				path: commandPath,
				title: cmdConfig.title
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			this.context.logState('command_load_error', {
				id: cmdConfig.id,
				error: errorMessage
			})
		}
	}

	private unloadAllCommands(): void {
		// Dispose all commands
		this.disposables.forEach((disposables, id) => {
			disposables.forEach(d => d.dispose())
			this.context.logState('command_unloaded', { id })
		})
		this.disposables.clear()
		this.commands.clear()

		// Close all file watchers
		this.commandWatchers.forEach(watcher => watcher.close())
		this.commandWatchers.clear()
	}

	dispose(): void {
		this.configWatcher?.dispose()
		this.unloadAllCommands()
	}
}

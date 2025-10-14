import * as vscode from 'vscode'

/**
 * Visualization Infrastructure
 * Config-driven progress, status, and output display
 */

export interface VisualizationConfig {
	showProgress?: boolean
	showStatus?: boolean
	outputChannel?: string
	progressTitle?: string
}

export interface VisualizationContext {
	progress?: vscode.Progress<{ message?: string; increment?: number }>
	outputChannel?: vscode.OutputChannel
	statusBarItem?: vscode.StatusBarItem
}

export class VisualizationHandler {
	private outputChannels = new Map<string, vscode.OutputChannel>()
	private statusBarItem: vscode.StatusBarItem | undefined

	constructor(private context: vscode.ExtensionContext) {
		// Create status bar item (reusable)
		this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
		this.context.subscriptions.push(this.statusBarItem)
	}

	/**
	 * Execute command with visualization
	 */
	async execute(params: {
		config: VisualizationConfig
		execute: (ctx: VisualizationContext) => Promise<void>
	}): Promise<void> {
		const { config, execute } = params
		const ctx: VisualizationContext = {}

		try {
			// Setup output channel
			if (config.outputChannel) {
				ctx.outputChannel = this.getOutputChannel(config.outputChannel)
				ctx.outputChannel.clear()
				ctx.outputChannel.show(true) // preserve focus
			}

			// Setup status bar
			if (config.showStatus && this.statusBarItem) {
				ctx.statusBarItem = this.statusBarItem
				this.statusBarItem.text = '$(sync~spin) ' + (config.progressTitle || 'Processing...')
				this.statusBarItem.show()
			}

			// Execute with progress
			if (config.showProgress) {
				await vscode.window.withProgress(
					{
						location: vscode.ProgressLocation.Notification,
						title: config.progressTitle || 'ClarityOS',
						cancellable: false
					},
					async progress => {
						ctx.progress = progress
						await execute(ctx)
					}
				)
			} else {
				await execute(ctx)
			}

			// Success status
			if (config.showStatus && this.statusBarItem) {
				this.statusBarItem.text = '$(check) Done'
				this.statusBarItem.show()
				setTimeout(() => this.statusBarItem?.hide(), 3000)
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)

			// Show error
			vscode.window.showErrorMessage(`ClarityOS: ${errorMessage}`)

			// Error in output
			if (ctx.outputChannel) {
				ctx.outputChannel.appendLine(`ERROR: ${errorMessage}`)
			}

			// Error status
			if (config.showStatus && this.statusBarItem) {
				this.statusBarItem.text = '$(error) Failed'
				this.statusBarItem.show()
				setTimeout(() => this.statusBarItem?.hide(), 5000)
			}

			throw error
		}
	}

	private getOutputChannel(name: string): vscode.OutputChannel {
		if (!this.outputChannels.has(name)) {
			const channel = vscode.window.createOutputChannel(name)
			this.outputChannels.set(name, channel)
			this.context.subscriptions.push(channel)
		}
		return this.outputChannels.get(name)!
	}

	dispose(): void {
		this.outputChannels.forEach(channel => channel.dispose())
		this.outputChannels.clear()
	}
}

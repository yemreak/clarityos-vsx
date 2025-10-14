import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import type { VisualizationContext } from './visualization'

/**
 * SCM Menu Executor
 * Config-driven command execution for SCM menu items
 */

export interface SCMCommandConfig {
	id: string
	title: string
	path: string
	icon?: string
	menu?: string
	visualization?: {
		showProgress?: boolean
		showStatus?: boolean
		outputChannel?: string
		progressTitle?: string
	}
}

export async function executeSCMCommand(params: {
	workspaceRoot: string
	extensionContext: vscode.ExtensionContext
	visualizationContext: VisualizationContext
}): Promise<void> {
	const { workspaceRoot, extensionContext, visualizationContext } = params

	// Read .clarityos.json
	const configPath = path.join(workspaceRoot, '.vscode', '.clarityos.json')

	if (!fs.existsSync(configPath)) {
		throw new Error('.clarityos.json not found')
	}

	const configContent = fs.readFileSync(configPath, 'utf-8')
	const config = JSON.parse(configContent)

	// Find SCM menu command
	const scmCommands = config.commands.filter((cmd: SCMCommandConfig) => cmd.menu === 'scm/title')

	if (scmCommands.length === 0) {
		throw new Error('No SCM menu command configured in .clarityos.json')
	}

	if (scmCommands.length > 1) {
		throw new Error('Multiple SCM commands configured, only one is supported')
	}

	const scmCommand: SCMCommandConfig = scmCommands[0]

	// Report progress
	if (visualizationContext.progress) {
		visualizationContext.progress.report({ message: scmCommand.title })
	}

	if (visualizationContext.outputChannel) {
		visualizationContext.outputChannel.appendLine(`Executing: ${scmCommand.title}`)
		visualizationContext.outputChannel.appendLine(`Command: ${scmCommand.id}`)
		visualizationContext.outputChannel.appendLine(`Path: ${scmCommand.path}`)
		visualizationContext.outputChannel.appendLine('')
	}

	// Resolve command path
	let commandPath = scmCommand.path
	if (commandPath.startsWith('~')) {
		commandPath = path.join(require('os').homedir(), commandPath.slice(1))
	} else if (!path.isAbsolute(commandPath)) {
		commandPath = path.join(workspaceRoot, commandPath)
	}

	if (!fs.existsSync(commandPath)) {
		throw new Error(`Command file not found: ${commandPath}`)
	}

	// Enable TypeScript support
	if (commandPath.endsWith('.ts')) {
		require('tsx/cjs')
	}

	// Load and execute command
	delete require.cache[require.resolve(commandPath)]
	const module = require(commandPath)
	const commandDef = module.default || module

	if (!commandDef?.execute) {
		throw new Error('Invalid command definition (missing execute function)')
	}

	// Execute with context
	await commandDef.execute({
		extensionContext,
		workspaceRoot,
		logState: (type: string, context: any) => {
			if (visualizationContext.outputChannel) {
				visualizationContext.outputChannel.appendLine(`[${type}] ${JSON.stringify(context)}`)
			}
		}
	})

	// Success feedback
	if (visualizationContext.outputChannel) {
		visualizationContext.outputChannel.appendLine('')
		visualizationContext.outputChannel.appendLine('✓ Command completed successfully')
	}
}

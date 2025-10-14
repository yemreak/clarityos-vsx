import * as vscode from 'vscode'

export interface CommandContext {
	extensionContext: vscode.ExtensionContext
	workspaceRoot: string
	logState: (type: string, context: any) => void
}

export interface CommandDefinition {
	id: string
	execute: (context: CommandContext) => Promise<void>
}

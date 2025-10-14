import * as vscode from 'vscode'
import type { CommandContext, CommandDefinition } from '../types'


async function execute(context: CommandContext): Promise<void> {
	const { logState } = context

	const cursorTerminal = vscode.window.terminals.find(t => t.name === 'Cursor')
	if (cursorTerminal) {
		cursorTerminal.dispose()
		vscode.window.showInformationMessage('Cursor terminal closed')
		logState('cursor_terminal_closed', { source: 'command' })
	} else {
		vscode.window.showInformationMessage('Cursor terminal not found')
		logState('cursor_terminal_not_found', {})
	}
}

const command: CommandDefinition = {
	id: 'clarityos.closeCursorTerminal',
	execute
}

export default command

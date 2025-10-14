import * as path from 'path'
import * as vscode from 'vscode'
import type { CommandContext, CommandDefinition } from '../types'

async function execute(context: CommandContext): Promise<void> {
	const { workspaceRoot, logState } = context

	const editor = vscode.window.activeTextEditor
	if (!editor) {
		vscode.window.showErrorMessage('No active file')
		logState('send_cursor_line_error', { error: 'No active editor' })
		return
	}

	const filePath = editor.document.uri.fsPath
	const relativePath = path.relative(workspaceRoot, filePath)

	let reference: string
	if (editor.selection.isEmpty) {
		// No selection → cursor line only
		const line = editor.selection.active.line + 1
		reference = `${relativePath}#L${line}`
	} else {
		// Selection → line range
		const startLine = editor.selection.start.line + 1
		const endLine = editor.selection.end.line + 1
		reference = `${relativePath}#L${startLine}-L${endLine}`
	}

	logState('cursor_line_captured', { reference, hasSelection: !editor.selection.isEmpty })

	// Send to active terminal
	const activeTerminal = vscode.window.activeTerminal
	if (activeTerminal) {
		activeTerminal.sendText(`${reference}\t`, false)
		logState('cursor_line_sent_to_terminal', { reference })
	} else {
		// No active terminal, copy to clipboard
		vscode.env.clipboard.writeText(reference)
		vscode.window.showInformationMessage(`Copied: ${reference}`)
		logState('cursor_line_copied_to_clipboard', { reference })
	}
}

const command: CommandDefinition = {
	id: 'clarityos.sendCursorLine',
	execute
}

export default command

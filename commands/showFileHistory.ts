import { execSync } from 'child_process'
import * as path from 'path'
import * as vscode from 'vscode'
import type { CommandContext, CommandDefinition } from '../types'

interface CommitQuickPickItem extends vscode.QuickPickItem {
	hash: string
	relativePath: string
}

async function execute(context: CommandContext): Promise<void> {
	try {
		const { workspaceRoot, logState } = context

		const editor = vscode.window.activeTextEditor
		if (!editor) {
			vscode.window.showErrorMessage('No active file')
			return
		}

		const filePath = editor.document.uri.fsPath
		const relativePath = path.relative(workspaceRoot, filePath)

		logState('file_history_started', { file: relativePath })

		// Get commit history for this file
		const gitLog = execSync(
			`git log --follow --pretty=format:"%H|%an|%ad|%s" --date=relative -- "${relativePath}"`,
			{ cwd: workspaceRoot, encoding: 'utf-8' }
		)

		if (!gitLog.trim()) {
			vscode.window.showInformationMessage('No git history found for this file')
			logState('file_history_empty', { file: relativePath })
			return
		}

		const commits = gitLog.trim().split('\n').map(line => {
			const [hash, author, date, ...messageParts] = line.split('|')
			return {
				hash: hash!.trim(),
				author: author!.trim(),
				date: date!.trim(),
				message: messageParts.join('|').trim()
			}
		})

		logState('file_history_loaded', { file: relativePath, commits: commits.length })

		const items: CommitQuickPickItem[] = commits.map(commit => ({
			label: commit.message,
			description: commit.date,
			iconPath: new vscode.ThemeIcon('git-commit'),
			hash: commit.hash,
			relativePath: relativePath
		}))

		const selected = await vscode.window.showQuickPick(items, {
			placeHolder: 'Select commit to view file version...',
			matchOnDescription: true
		})

		if (selected) {
			logState('commit_selected', { hash: selected.hash, file: relativePath })

			// Create custom URI for read-only historical file
			const commitShort = selected.hash.substring(0, 7)
			const fileName = path.basename(filePath)
			const uri = vscode.Uri.parse(`clarityos-history://${selected.hash}/${relativePath}?${fileName} (${commitShort})`)

			const doc = await vscode.workspace.openTextDocument(uri)

			await vscode.window.showTextDocument(doc, {
				preview: false,
				viewColumn: vscode.ViewColumn.Active
			})

			logState('commit_opened', { hash: selected.hash, file: relativePath })
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		context.logState('file_history_error', { error: errorMessage })
		vscode.window.showErrorMessage(`Failed to show file history: ${errorMessage}`)
	}
}

const command: CommandDefinition = {
	id: 'clarityos.showFileHistory',
	execute
}

export default command

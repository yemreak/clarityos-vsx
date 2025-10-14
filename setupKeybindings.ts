import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Setup keybindings helper command
 * Reads .clarityos.json and copies keybindings to clipboard
 */
export async function setupKeybindings(workspaceRoot: string): Promise<void> {
	try {
		// Read .clarityos.json
		const configPath = path.join(workspaceRoot, '.vscode', '.clarityos.json')

		if (!fs.existsSync(configPath)) {
			vscode.window.showErrorMessage('ClarityOS: .clarityos.json not found')
			return
		}

		const configContent = fs.readFileSync(configPath, 'utf-8')
		const config = JSON.parse(configContent)

		// Extract keybindings from commands
		const keybindings = config.commands
			.filter((cmd: any) => cmd.keybinding)
			.map((cmd: any) => ({
				key: cmd.keybinding,
				command: cmd.id
			}))

		if (keybindings.length === 0) {
			vscode.window.showInformationMessage('ClarityOS: No keybindings configured')
			return
		}

		// Format as JSON for keybindings.json
		const keybindingsJson = JSON.stringify(keybindings, null, 2)
		const displayJson = keybindingsJson
			.split('\n')
			.map((line, i, arr) => {
				// Add comma after each object except the last one
				if (i === arr.length - 2 && line.trim() === '}') {
					return line + ','
				}
				return line
			})
			.join('\n')

		// Copy to clipboard
		await vscode.env.clipboard.writeText(displayJson)

		// Show instructions
		const action = await vscode.window.showInformationMessage(
			`ClarityOS: ${keybindings.length} keybindings copied to clipboard`,
			'Open Keybindings JSON'
		)

		if (action === 'Open Keybindings JSON') {
			// Open keybindings.json file directly
			vscode.commands.executeCommand('workbench.action.openGlobalKeybindingsFile')
		}

		// Show detailed info in output channel
		const output = vscode.window.createOutputChannel('ClarityOS Setup')
		output.appendLine('=== ClarityOS Keybindings Setup ===')
		output.appendLine('')
		output.appendLine('Keybindings copied to clipboard!')
		output.appendLine('')
		output.appendLine('Next Steps:')
		output.appendLine('1. Open User Keybindings (Cmd+K Cmd+S)')
		output.appendLine('2. Click "Open Keyboard Shortcuts (JSON)" icon')
		output.appendLine('3. Paste the copied keybindings into the array')
		output.appendLine('')
		output.appendLine('Copied keybindings:')
		output.appendLine(displayJson)
		output.show()

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		vscode.window.showErrorMessage(`ClarityOS Setup failed: ${errorMessage}`)
	}
}

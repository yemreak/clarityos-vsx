import type { CommandContext, CommandDefinition } from '../types'
import { searchInGitFiles } from './utils'

async function execute(context: CommandContext): Promise<void> {
	await searchInGitFiles(
		context,
		'git diff --name-only --cached',
		'Select staged file to open'
	)
}

const command: CommandDefinition = {
	id: 'clarityos.searchInStagedFiles',
	execute
}

export default command

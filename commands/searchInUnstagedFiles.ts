import type { CommandContext, CommandDefinition } from '../types'
import { searchInGitFiles } from './utils'

async function execute(context: CommandContext): Promise<void> {
	await searchInGitFiles(
		context,
		'git diff --name-only; git ls-files --others --exclude-standard',
		'Select unstaged file to open'
	)
}

const command: CommandDefinition = {
	id: 'clarityos.searchInUnstagedFiles',
	execute
}

export default command

import * as vscode from 'vscode'

// Token types for markdown highlighting
const tokenTypes = ['keyword', 'string', 'variable', 'comment']
const tokenModifiers = ['declaration', 'documentation', 'markdown']

export const markdownLiteralLegend = new vscode.SemanticTokensLegend(tokenTypes, tokenModifiers)

export class MarkdownLiteralTokensProvider implements vscode.DocumentSemanticTokensProvider {
	provideDocumentSemanticTokens(
		document: vscode.TextDocument
	): vscode.ProviderResult<vscode.SemanticTokens> {
		const tokensBuilder = new vscode.SemanticTokensBuilder(markdownLiteralLegend)
		const text = document.getText()

		// Find all /* md */ markers and parse their template literals
		const markerPattern = /\/\*\s*md\s*\*\/\s*`/g
		let markerMatch: RegExpExecArray | null

		while ((markerMatch = markerPattern.exec(text)) !== null) {
			const contentStart = markerMatch.index + markerMatch[0].length

			// Find matching closing backtick (handle escaped backticks \`)
			let depth = 1
			let i = contentStart
			let contentEnd = contentStart

			while (i < text.length && depth > 0) {
				if (text[i] === '\\' && i + 1 < text.length) {
					i += 2 // Skip escaped character
					continue
				}
				if (text[i] === '`') {
					depth--
					if (depth === 0) {
						contentEnd = i
						break
					}
				}
				i++
			}

			if (depth === 0) {
				const content = text.substring(contentStart, contentEnd)
				this.parseMarkdownTokens(document, content, contentStart, tokensBuilder)
			}
		}

		return tokensBuilder.build()
	}

	private parseMarkdownTokens(
		document: vscode.TextDocument,
		content: string,
		baseOffset: number,
		builder: vscode.SemanticTokensBuilder
	): void {
		const lines = content.split('\n')
		let currentOffset = baseOffset
		let inCodeBlock = false

		for (const line of lines) {
			const trimmed = line.trim()

			// Code block fence: \`\`\`language
			if (trimmed.match(/^\\`{3}/)) {
				const pos = document.positionAt(currentOffset + line.indexOf('\\'))
				const endPos = document.positionAt(currentOffset + line.length)
				builder.push(new vscode.Range(pos, endPos), 'comment', ['documentation'])
				inCodeBlock = !inCodeBlock
				currentOffset += line.length + 1
				continue
			}

			// Skip content inside code blocks
			if (inCodeBlock) {
				currentOffset += line.length + 1
				continue
			}

			// Headers: ## Text
			if (trimmed.match(/^#{1,6}\s/)) {
				const pos = document.positionAt(currentOffset)
				const hashCount = trimmed.match(/^#+/)![0].length
				builder.push(
					new vscode.Range(pos, pos.translate(0, hashCount + 1)),
					'keyword',
					['declaration']
				)
			}

			// Inline code: \`code\` (escaped in template literal)
			const inlineCodePattern = /\\`([^`]+)\\`/g
			let inlineCodeMatch: RegExpExecArray | null
			while ((inlineCodeMatch = inlineCodePattern.exec(line)) !== null) {
				const start = document.positionAt(currentOffset + inlineCodeMatch.index)
				const end = document.positionAt(currentOffset + inlineCodeMatch.index + inlineCodeMatch[0].length)
				builder.push(new vscode.Range(start, end), 'comment', ['documentation'])
			}

			// Bold: **Text** (not escaped \*\*)
			const boldPattern = /(?<!\\)\*\*([^*]+)\*\*/g
			let boldMatch: RegExpExecArray | null
			while ((boldMatch = boldPattern.exec(line)) !== null) {
				const start = document.positionAt(currentOffset + boldMatch.index)
				const end = document.positionAt(currentOffset + boldMatch.index + boldMatch[0].length)
				builder.push(new vscode.Range(start, end), 'string', ['markdown'])
			}

			// Italic: _text_ or *text*
			const italicPattern = /(?<!\\)([_*])([^_*]+)\1/g
			let italicMatch: RegExpExecArray | null
			while ((italicMatch = italicPattern.exec(line)) !== null) {
				// Skip if it's **bold** (already handled)
				if (italicMatch[1] === '*' && line[italicMatch.index - 1] === '*') continue
				const start = document.positionAt(currentOffset + italicMatch.index)
				const end = document.positionAt(currentOffset + italicMatch.index + italicMatch[0].length)
				builder.push(new vscode.Range(start, end), 'string', ['documentation'])
			}

			// Links: [text](url)
			const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g
			let linkMatch: RegExpExecArray | null
			while ((linkMatch = linkPattern.exec(line)) !== null) {
				const start = document.positionAt(currentOffset + linkMatch.index)
				const end = document.positionAt(currentOffset + linkMatch.index + linkMatch[0].length)
				builder.push(new vscode.Range(start, end), 'variable', ['documentation'])
			}

			// Blockquote: > text
			if (trimmed.startsWith('>')) {
				const pos = document.positionAt(currentOffset + line.indexOf('>'))
				const endPos = document.positionAt(currentOffset + line.length)
				builder.push(new vscode.Range(pos, endPos), 'comment', ['documentation'])
			}

			// Lists: - Item or → Item
			const listMatch = trimmed.match(/^[-→•]\s/)
			if (listMatch && trimmed[0]) {
				const pos = document.positionAt(currentOffset + line.indexOf(trimmed[0]))
				builder.push(
					new vscode.Range(pos, pos.translate(0, 1)),
					'variable',
					['markdown']
				)
			}

			// Questions: Text?
			if (trimmed.includes('?')) {
				const questionIndex = line.indexOf('?')
				const pos = document.positionAt(currentOffset + questionIndex)
				builder.push(
					new vscode.Range(pos, pos.translate(0, 1)),
					'comment',
					[]
				)
			}

			currentOffset += line.length + 1 // +1 for newline
		}
	}
}

export function activateMarkdownLiteral(context: vscode.ExtensionContext): void {
	const provider = new MarkdownLiteralTokensProvider()

	// Register for TypeScript files
	const selector: vscode.DocumentSelector = [
		{ language: 'typescript', scheme: 'file' },
		{ language: 'javascript', scheme: 'file' }
	]

	context.subscriptions.push(
		vscode.languages.registerDocumentSemanticTokensProvider(
			selector,
			provider,
			markdownLiteralLegend
		)
	)
}

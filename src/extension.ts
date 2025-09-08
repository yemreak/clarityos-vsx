/**
 * ClarityOS VSX Extension
 * 
 * Pattern: VISIBILITY BRIDGE
 * Make the invisible visible. Connect the disconnected.
 * 
 * Three core recognitions:
 * 1. @ patterns -> File references
 * 2. Hex patterns -> Git commits or Claude sessions  
 * 3. # patterns -> Semantic tags
 * 
 * Philosophy:
 * - Every hash tells a story
 * - Every link builds a connection
 * - Every pattern has meaning
 * 
 * @example
 * @docs/README.md -> Clickable file link
 * a1b2c3d -> Git commit hover
 * df900ee5-1bfb -> Claude session suggestion
 * #architecture -> Highlighted tag
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
	/**
	 * @ File Link Provider
	 * Transforms @path/to/file references into clickable links.
	 * Works across Markdown, TypeScript, Python, and Swift files.
	 */
	const linkProvider = vscode.languages.registerDocumentLinkProvider(
		[{ scheme: 'file', language: 'markdown' }, { scheme: 'file', language: 'swift' }, { scheme: 'file', language: 'typescript' }, { scheme: 'file', language: 'python' }],
		{
			provideDocumentLinks(document: vscode.TextDocument): vscode.DocumentLink[] {
				const links: vscode.DocumentLink[] = [];
				const text = document.getText();
				const regex = /@([^\s]+)/g;
				let match;

				while ((match = regex.exec(text)) !== null) {
					const filePath = match[1]!;
					const startPos = document.positionAt(match.index);
					const endPos = document.positionAt(match.index + match[0].length);
					const range = new vscode.Range(startPos, endPos);

					const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
					if (!workspaceFolder) continue;

					const absolutePath = path.isAbsolute(filePath)
						? filePath
						: path.join(workspaceFolder.uri.fsPath, filePath);

					if (fs.existsSync(absolutePath)) {
						const targetUri = vscode.Uri.file(absolutePath);
						const link = new vscode.DocumentLink(range, targetUri);
						link.tooltip = `Open ${filePath}`;
						links.push(link);
					}
				}

				return links;
			}
		}
	);

	/**
	 * Git Commit & Claude Session Hover Provider
	 * Recognizes 7-40 character hex strings.
	 * First tries git commit lookup, falls back to Claude session suggestion.
	 */
	const hoverProvider = vscode.languages.registerHoverProvider(
		[{ scheme: 'file', language: 'markdown' }, { scheme: 'file', language: 'typescript' }, { scheme: 'file', language: 'javascript' }, { scheme: 'file', language: 'python' }],
		{
			provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | null {
				const range = document.getWordRangeAtPosition(position, /\b[a-f0-9]{7,40}\b/);
				if (!range) return null;

				const hash = document.getText(range);
				const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
				if (!workspaceFolder) return null;

				// Try git first
				try {
					const gitCommand = `git show --no-patch --format="%s%n%n%b" ${hash}`;
					const commitInfo = execSync(gitCommand, {
						cwd: workspaceFolder.uri.fsPath,
						encoding: 'utf-8'
					}).trim();
					
					const dateCommand = `git show --no-patch --format="%ar" ${hash}`;
					const relativeDate = execSync(dateCommand, {
						cwd: workspaceFolder.uri.fsPath,
						encoding: 'utf-8'
					}).trim();

					const markdown = new vscode.MarkdownString();
					markdown.isTrusted = true;
					markdown.supportHtml = true;
					markdown.appendMarkdown(`**Git Commit:** \`${hash.substring(0, 7)}\` · ${relativeDate}\n\n`);
					markdown.appendMarkdown(commitInfo);
					markdown.appendMarkdown(`\n\n[View Full Commit](command:git.viewCommit?${encodeURIComponent(JSON.stringify([hash]))})`);

					return new vscode.Hover(markdown, range);
				} catch (gitError) {
					// Not a git commit, show options
					const markdown = new vscode.MarkdownString();
					markdown.isTrusted = true;
					markdown.supportHtml = true;
					
					markdown.appendMarkdown(`**Hash:** \`${hash.substring(0, 8)}\`\n\n`);
					markdown.appendMarkdown(`Not found in git history\n\n`);
					markdown.appendMarkdown(`If this is a Claude session ID:\n\n`);
					markdown.appendMarkdown(`[▶ Check Claude Session](command:workbench.action.terminal.sendSequence?${encodeURIComponent(JSON.stringify({ "text": `chats ${hash}\n` }))})\n\n`);
					markdown.appendMarkdown(`_Click to run \`chats ${hash}\` in terminal_`);

					return new vscode.Hover(markdown, range);
				}
				return null;
			}
		}
	);

	context.subscriptions.push(linkProvider, hoverProvider);
}

export function deactivate() {}
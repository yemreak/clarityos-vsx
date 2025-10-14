import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Open HTML file as VSCode webview panel with hot reload
 *
 * @example
 * const manager = createWebviewManager({ workspaceRoot: '/path/to/workspace' })
 * manager.openView({
 *   context,
 *   viewName: 'conversation',
 *   title: 'Conversation View'
 * })
 */
export function createWebviewManager(params: {
	workspaceRoot: string
}): WebviewManager {
	const { workspaceRoot } = params
	const panels = new Map<string, vscode.WebviewPanel>()
	const watchers = new Map<string, vscode.FileSystemWatcher>()

	function openView(params: {
		context: vscode.ExtensionContext
		viewName: string
		title?: string
		customPath?: string
	}) {
		if (panels.has(params.viewName)) {
			panels.get(params.viewName)!.reveal()
			return
		}

		const config = vscode.workspace.getConfiguration('clarityos')
		const defaultPath = config.get<string>('webviewPath') || 'src/interface/view'

		let viewPath: string
		let htmlPath: string

		if (params.customPath) {
			viewPath = path.isAbsolute(params.customPath)
				? params.customPath
				: path.join(workspaceRoot, params.customPath)
			htmlPath = path.join(viewPath, 'index.html')
		} else if (params.viewName.includes('/')) {
			const fullPath = path.isAbsolute(params.viewName)
				? params.viewName
				: path.join(workspaceRoot, params.viewName)
			if (params.viewName.endsWith('.html')) {
				viewPath = path.dirname(fullPath)
				htmlPath = fullPath
			} else {
				viewPath = fullPath
				htmlPath = path.join(viewPath, 'index.html')
			}
		} else {
			viewPath = path.join(workspaceRoot, defaultPath, params.viewName)
			htmlPath = path.join(viewPath, 'index.html')
		}

		const manifestPath = path.join(viewPath, 'manifest.json')

		if (!fs.existsSync(htmlPath)) {
			vscode.window.showErrorMessage(`View not found: ${htmlPath}`)
			return
		}

		let watchFiles: string[] = []
		if (fs.existsSync(manifestPath)) {
			try {
				const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
				if (manifest.watch && Array.isArray(manifest.watch)) {
					watchFiles = manifest.watch
				}
			} catch (error) {
				console.error(`Failed to parse manifest.json for ${params.viewName}:`, error)
			}
		}

		const parentPath = path.dirname(viewPath)

		const panel = vscode.window.createWebviewPanel(
			`view-${params.viewName}`,
			params.title || params.viewName,
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [
					vscode.Uri.file(viewPath),
					vscode.Uri.file(parentPath)
				]
			}
		)

		let html = fs.readFileSync(htmlPath, 'utf8')
		html = injectLocalCSS(html, htmlPath, panel.webview)
		html = convertResourcePaths(html, viewPath, panel.webview)
		panel.webview.html = html

		panel.webview.onDidReceiveMessage(msg => {
			if (watchFiles[0]) {
				const firstWatchFile = path.join(viewPath, watchFiles[0])
				handleMessage(firstWatchFile, msg)
			}
		})

		panel.onDidDispose(() => {
			panels.delete(params.viewName)
			Array.from(watchers.keys())
				.filter(key => key.startsWith(params.viewName + '_'))
				.forEach(key => {
					watchers.get(key)?.dispose()
					watchers.delete(key)
				})
		})

		panels.set(params.viewName, panel)
		params.context.subscriptions.push(panel)

		watchFiles.forEach((fileName, index) => {
			const filePath = path.join(viewPath, fileName)
			setupDataWatcher(params.context, params.viewName, filePath, panel, index)
			syncDataToView(filePath, panel)
		})

		setupHtmlWatcher(params.context, params.viewName, htmlPath, panel, viewPath)
		setupAssetWatchers(params.context, params.viewName, viewPath, htmlPath, panel)
	}

	function setupDataWatcher(
		context: vscode.ExtensionContext,
		viewName: string,
		dataPath: string,
		panel: vscode.WebviewPanel,
		index: number
	) {
		const watcher = vscode.workspace.createFileSystemWatcher(dataPath)

		watcher.onDidChange(() => {
			syncDataToView(dataPath, panel)
		})

		watchers.set(`${viewName}_data_${index}`, watcher)
		context.subscriptions.push(watcher)
	}

	function setupHtmlWatcher(
		context: vscode.ExtensionContext,
		viewName: string,
		htmlPath: string,
		panel: vscode.WebviewPanel,
		viewPath: string
	) {
		const htmlPattern = path.join(viewPath, '**/*.html')
		const watcher = vscode.workspace.createFileSystemWatcher(htmlPattern)

		const reload = () => reloadWebview(htmlPath, viewPath, panel)

		watcher.onDidChange(reload)
		watcher.onDidCreate(reload)
		watcher.onDidDelete(reload)

		watchers.set(viewName + '_html', watcher)
		context.subscriptions.push(watcher)
	}

	function setupAssetWatchers(
		context: vscode.ExtensionContext,
		viewName: string,
		viewPath: string,
		htmlPath: string,
		panel: vscode.WebviewPanel
	) {
		const cssPattern = path.join(viewPath, '**/*.css')
		const jsPattern = path.join(viewPath, '**/*.js')

		const cssWatcher = vscode.workspace.createFileSystemWatcher(cssPattern)
		const jsWatcher = vscode.workspace.createFileSystemWatcher(jsPattern)

		const reload = () => reloadWebview(htmlPath, viewPath, panel)

		cssWatcher.onDidChange(reload)
		cssWatcher.onDidCreate(reload)
		cssWatcher.onDidDelete(reload)

		jsWatcher.onDidChange(reload)
		jsWatcher.onDidCreate(reload)
		jsWatcher.onDidDelete(reload)

		watchers.set(`${viewName}_css`, cssWatcher)
		watchers.set(`${viewName}_js`, jsWatcher)
		context.subscriptions.push(cssWatcher, jsWatcher)
	}

	function reloadWebview(htmlPath: string, viewPath: string, panel: vscode.WebviewPanel) {
		try {
			console.log(`[WebviewManager] Reloading: ${htmlPath}`)
			let newHtml = fs.readFileSync(htmlPath, 'utf8')
			newHtml = injectLocalCSS(newHtml, htmlPath, panel.webview)
			newHtml = convertResourcePaths(newHtml, viewPath, panel.webview)
			panel.webview.html = newHtml
			console.log(`[WebviewManager] Reload complete`)
		} catch (error) {
			console.error(`[WebviewManager] Reload error:`, error)
			panel.webview.html = `
				<html>
					<body style="background:#1e1e1e;color:#f44;font-family:monospace;padding:40px">
						<h1>⚠️ Reload Error</h1>
						<pre>${error}</pre>
					</body>
				</html>
			`
		}
	}

	function handleMessage(dataPath: string, msg: any) {
		if (msg.type === 'user_message') {
			const line = JSON.stringify({
				role: 'user',
				content: msg.content,
				timestamp: msg.timestamp
			})

			fs.appendFileSync(dataPath, line + '\n')
		}
	}

	function injectLocalCSS(html: string, htmlPath: string, webview: vscode.Webview): string {
		const htmlBaseName = path.basename(htmlPath, '.html')
		const cssPath = path.join(path.dirname(htmlPath), `${htmlBaseName}.css`)

		if (!fs.existsSync(cssPath)) {
			return html
		}

		const cssUri = webview.asWebviewUri(vscode.Uri.file(cssPath))
		const cssLink = `<link rel="stylesheet" href="${cssUri}">`

		if (html.includes('<head>')) {
			return html.replace('<head>', `<head>\n\t${cssLink}`)
		} else if (html.includes('<!DOCTYPE') || html.includes('<html')) {
			const match = html.match(/(<html[^>]*>)/i)
			if (match) {
				return html.replace(match[0], `${match[0]}\n${cssLink}`)
			}
		}

		return `${cssLink}\n${html}`
	}

	function convertResourcePaths(html: string, viewPath: string, webview: vscode.Webview): string {
		return html.replace(/(href|src)="([^"]+)"/g, (match, attr, relativePath) => {
			if (relativePath.startsWith('http') || relativePath.startsWith('data:') || relativePath.startsWith('vscode-')) {
				return match
			}

			const absolutePath = path.join(viewPath, relativePath)

			if (!fs.existsSync(absolutePath)) {
				console.warn(`Resource not found: ${absolutePath}`)
				return match
			}

			const webviewUri = webview.asWebviewUri(vscode.Uri.file(absolutePath))
			return `${attr}="${webviewUri}"`
		})
	}

	function syncDataToView(dataPath: string, panel: vscode.WebviewPanel) {
		if (!fs.existsSync(dataPath)) return

		const content = fs.readFileSync(dataPath, 'utf8')

		try {
			let data: any

			try {
				data = JSON.parse(content)
			} catch {
				data = content
					.split('\n')
					.filter(line => line.trim())
					.map(line => JSON.parse(line))
			}

			if (Array.isArray(data) && data[0]?.role) {
				panel.webview.postMessage({
					type: 'update_messages',
					messages: data
				})
			} else if (Array.isArray(data) && data[0]?.type) {
				panel.webview.postMessage({
					type: 'update_metrics',
					metrics: data
				})
			} else {
				panel.webview.postMessage({
					type: 'update_data',
					data: data
				})
			}
		} catch (error) {
			console.error(`Failed to sync data:`, error)
		}
	}

	return {
		openView
	}
}

export type WebviewManager = {
	openView: (params: {
		context: vscode.ExtensionContext
		viewName: string
		title?: string
		customPath?: string
	}) => void
}

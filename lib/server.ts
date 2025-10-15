import * as net from 'net'
import * as vscode from 'vscode'

/**
 * Start TCP server on port 9485 for CLI Bridge communication
 *
 * @example
 * const server = startBridgeServer({
 *   vscode,
 *   context,
 *   terminalStartTimes: new Map(),
 *   webviewManager,
 *   configHandlers: { register, unregister, list }
 * })
 */
export function startBridgeServer(params: {
	vscode: typeof vscode
	context: vscode.ExtensionContext
	terminalStartTimes: Map<vscode.Terminal, number>
	webviewManager: any
	configHandlers: {
		register: (params: { name: string; filePath: string }) => any
		unregister: (params: { name: string }) => any
		list: () => any
	}
	outputChannel: vscode.OutputChannel
	onProgress?: (event: BridgeProgressEvent) => void
}): BridgeServerInstance {
	const { vscode: vs, context, terminalStartTimes, webviewManager, configHandlers, outputChannel, onProgress } = params

	const startTime = Date.now()
	const subscribers = new Set<string>()
	const outputHistory: string[] = []  // Store output history

	// Wrap outputChannel to capture logs
	const originalAppendLine = outputChannel.appendLine.bind(outputChannel)
	outputChannel.appendLine = (value: string) => {
		outputHistory.push(value)
		if (outputHistory.length > 1000) {  // Keep last 1000 lines
			outputHistory.shift()
		}
		originalAppendLine(value)
	}

	function broadcast(event: { event: string; timestamp: number; data: any }) {
		subscribers.forEach(url => {
			fetch(url, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(event)
			}).catch(err => {
				outputChannel.appendLine(`✖ Broadcast failed to ${url}: ${err}`)
			})
		})
	}

	async function executeCommand(request: any) {
		const { method, params: cmdParams } = request

		onProgress?.({ type: 'executing', method })

		switch (method) {
			case 'restartExtension':
				setImmediate(() => {
					vs.commands.executeCommand('workbench.action.restartExtensionHost')
				})
				return { success: true, message: 'Extension host will restart' }

			case 'eval':
				const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor
				let code = cmdParams.code.trim()
				const hasExplicitReturn = /\breturn\b/.test(code)
				const isSingleExpression = !code.includes('\n') && !code.includes(';')
				if (!hasExplicitReturn && isSingleExpression) {
					code = `return (${code})`
				}
				// Create console wrapper that logs to output channel
				const evalConsole = {
					log: (...args: any[]) => {
						const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')
						outputChannel.appendLine(`[eval] ${message}`)
					},
					error: (...args: any[]) => {
						const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')
						outputChannel.appendLine(`[eval:error] ${message}`)
					},
					warn: (...args: any[]) => {
						const message = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')
						outputChannel.appendLine(`[eval:warn] ${message}`)
					}
				}
				const fn = new AsyncFunction('require', 'vscode', 'console', code)
				return await fn(require, vs, evalConsole)

			case 'webview':
				if (!webviewManager) {
					return { error: 'WebviewManager not initialized' }
				}
				if (!cmdParams.viewName) {
					return { error: 'viewName parameter required' }
				}
				webviewManager.openView({
					context,
					viewName: cmdParams.viewName,
					title: cmdParams.title || `🌲 ${cmdParams.viewName}`,
					customPath: cmdParams.customPath
				})
				return { success: true, webview: cmdParams.viewName }

			case 'registerConfig':
				if (!cmdParams.name || !cmdParams.filePath) {
					return { error: 'name and filePath required' }
				}
				return configHandlers.register({ name: cmdParams.name, filePath: cmdParams.filePath })

			case 'unregisterConfig':
				if (!cmdParams.name) {
					return { error: 'name required' }
				}
				return configHandlers.unregister({ name: cmdParams.name })

			case 'listConfigs':
				return configHandlers.list()

			case 'subscribe':
				if (!cmdParams.url) {
					return { error: 'url parameter required' }
				}
				subscribers.add(cmdParams.url)
				outputChannel.appendLine(`✓ Subscribed: ${cmdParams.url}`)
				return { success: true, message: `Subscribed to ${cmdParams.url}`, subscribers: Array.from(subscribers) }

			case 'unsubscribe':
				if (!cmdParams.url) {
					return { error: 'url parameter required' }
				}
				subscribers.delete(cmdParams.url)
				outputChannel.appendLine(`✓ Unsubscribed: ${cmdParams.url}`)
				return { success: true, message: `Unsubscribed from ${cmdParams.url}` }

			case 'listSubscribers':
				return { success: true, message: `${subscribers.size} subscriber(s)`, subscribers: Array.from(subscribers) }

			case 'getOutput':
				const lines = cmdParams.lines || 100
				return {
					output: outputHistory.slice(-lines),
					total: outputHistory.length
				}

			case 'status':
				const terminals = await Promise.all(
					vs.window.terminals.map(async (terminal: vscode.Terminal) => {
						const processId = await terminal.processId
						const startTimeValue = terminalStartTimes.get(terminal)
						const now = Date.now()
						return {
							name: terminal.name,
							processId,
							state: terminal.state,
							exitStatus: terminal.exitStatus,
							isActive: terminal === vs.window.activeTerminal,
							startTime: startTimeValue,
							uptime: startTimeValue ? Math.floor((now - startTimeValue) / 1000) : null
						}
					})
				)

				const activeEditor = vs.window.activeTextEditor
				const workspaceFolders = vs.workspace.workspaceFolders

				return {
					timestamp: Date.now(),
					datetime: new Date().toISOString(),
					terminals: {
						count: terminals.length,
						active: vs.window.activeTerminal?.name || null,
						list: terminals
					},
					editor: activeEditor ? {
						file: activeEditor.document.fileName,
						language: activeEditor.document.languageId,
						lines: activeEditor.document.lineCount,
						isDirty: activeEditor.document.isDirty,
						cursor: {
							line: activeEditor.selection.active.line + 1,
							column: activeEditor.selection.active.character + 1
						}
					} : null,
					workspace: {
						folders: workspaceFolders?.map((f: vscode.WorkspaceFolder) => ({
							name: f.name,
							path: f.uri.path
						})) || [],
						openFiles: vs.window.visibleTextEditors.length
					},
					extension: {
						name: 'ClarityOS',
						version: '0.1.0',
						port: 9485,
						uptime: Math.floor((Date.now() - startTime) / 1000),
						features: ['cli-bridge', 'hot-reload', 'gitc']
					}
				}

			default:
				return {
					error: `Unknown method: ${method}`,
					available: ['eval', 'webview', 'registerConfig', 'unregisterConfig', 'listConfigs', 'subscribe', 'unsubscribe', 'listSubscribers', 'status', 'restartExtension'],
					hint: 'Run "vscode --help" for examples'
				}
		}
	}

	function handleConnection(socket: net.Socket) {
		socket.on('data', async data => {
			try {
				const request = JSON.parse(data.toString())
				outputChannel.appendLine(`→ INPUT: ${JSON.stringify(request)}`)

				const result = await executeCommand(request)

				if (result && typeof result === 'object' && 'error' in result) {
					const response = { ok: false, error: result.error }
					outputChannel.appendLine(`← OUTPUT: ${JSON.stringify(response)}`)
					socket.write(JSON.stringify(response))
				} else {
					const response = { ok: true, result }
					outputChannel.appendLine(`← OUTPUT: ${JSON.stringify(response)}`)
					socket.write(JSON.stringify(response))
				}
				socket.end()
			} catch (error) {
				const response = { ok: false, error: error instanceof Error ? error.message : String(error) }
				outputChannel.appendLine(`← ERROR: ${JSON.stringify(response)}`)
				socket.write(JSON.stringify(response))
				socket.end()
			}
		})

		socket.on('error', error => {
			outputChannel.appendLine(`✖ SOCKET ERROR: ${error}`)
		})
	}

	const server = net.createServer(handleConnection)

	const port = 9485
	outputChannel.appendLine('=== CLI Bridge Started ===')
	outputChannel.appendLine(`Listening on port ${port}`)

	server.on('error', (error: NodeJS.ErrnoException) => {
		if (error.code === 'EADDRINUSE') {
			outputChannel.appendLine(`✖ Port ${port} already in use`)
			outputChannel.appendLine('Run: lsof -ti :9485 | xargs kill -9')
		} else {
			outputChannel.appendLine(`✖ Server error: ${error}`)
		}
	})

	server.listen(port, () => {
		outputChannel.appendLine('Server is ready')
		onProgress?.({ type: 'ready', port })
	})

	return {
		startTime,
		broadcast,
		dispose: () => {
			return new Promise<void>((resolve) => {
				server.close((err) => {
					if (err) {
						outputChannel.appendLine(`✖ Error closing server: ${err}`)
					} else {
						outputChannel.appendLine('✓ Server closed')
					}
					resolve()
				})
			})
		}
	}
}

export type BridgeProgressEvent =
	| { type: 'executing'; method: string }
	| { type: 'ready'; port: number }

export type BridgeServerInstance = {
	startTime: number
	broadcast: (event: { event: string; timestamp: number; data: any }) => void
	dispose: () => Promise<void>
}

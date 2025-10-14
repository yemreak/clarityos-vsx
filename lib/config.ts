import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Create dynamic config registry with hot reload
 *
 * @example
 * const registry = createConfigRegistry({
 *   vscode,
 *   context,
 *   workspaceRoot: '/path/to/workspace',
 *   bridgeStartTime: Date.now()
 * })
 *
 * registry.register({ name: 'statusbar', filePath: '/path/to/statusbar.ts' })
 * registry.list()
 * registry.unregister({ name: 'statusbar' })
 */
export function createConfigRegistry(params: {
	vscode: typeof vscode
	context: vscode.ExtensionContext
	workspaceRoot: string
	bridgeStartTime: number
}): ConfigRegistry {
	const { vscode: vs, context, workspaceRoot, bridgeStartTime } = params

	const activeConfigs = new Map<string, { dispose: () => void; watcher: any }>()

	const vscodeDir = path.join(workspaceRoot, '.vscode')
	if (!fs.existsSync(vscodeDir)) {
		fs.mkdirSync(vscodeDir, { recursive: true })
	}

	const configRegistryFile = path.join(vscodeDir, '.clarityos-configs.json')

	function loadConfigRegistry(): Record<string, string> {
		try {
			return JSON.parse(fs.readFileSync(configRegistryFile, 'utf-8'))
		} catch {
			return {}
		}
	}

	function saveConfigRegistry(configs: Record<string, string>) {
		fs.writeFileSync(configRegistryFile, JSON.stringify(configs, null, 2))
	}

	async function loadConfig(params: { name: string; filePath: string }) {
		try {
			if (activeConfigs.has(params.name)) {
				const old = activeConfigs.get(params.name)!
				old.dispose()
				old.watcher.close()
				activeConfigs.delete(params.name)
			}

			delete require.cache[params.filePath]

			const config = require(params.filePath)
			if (config.activate) {
				const instance = config.activate({
					vscode: vs,
					context,
					startTime: bridgeStartTime
				})

				const watcher = fs.watch(params.filePath, () => {
					console.log(`Config '${params.name}' changed, reloading...`)
					loadConfig(params)
				})

				activeConfigs.set(params.name, { dispose: instance.dispose, watcher })
				console.log(`Config '${params.name}' loaded from ${params.filePath}`)
			}
		} catch (error) {
			console.error(`Failed to load config '${params.name}':`, error)
		}
	}

	// Load all registered configs on startup
	const registry = loadConfigRegistry()
	for (const [name, filePath] of Object.entries(registry)) {
		if (fs.existsSync(filePath)) {
			loadConfig({ name, filePath })
		}
	}

	function register(params: { name: string; filePath: string }) {
		const registry = loadConfigRegistry()
		registry[params.name] = params.filePath
		saveConfigRegistry(registry)
		loadConfig(params)
		return { success: true, message: `Config '${params.name}' registered` }
	}

	function unregister(params: { name: string }) {
		const registry = loadConfigRegistry()
		if (!registry[params.name]) {
			return { error: `Config '${params.name}' not found` }
		}

		if (activeConfigs.has(params.name)) {
			const config = activeConfigs.get(params.name)!
			config.dispose()
			config.watcher.close()
			activeConfigs.delete(params.name)
		}

		delete registry[params.name]
		saveConfigRegistry(registry)
		return { success: true, message: `Config '${params.name}' unregistered` }
	}

	function list() {
		const registry = loadConfigRegistry()
		return {
			configs: Object.entries(registry).map(([name, filePath]) => ({
				name,
				filePath,
				active: activeConfigs.has(name)
			}))
		}
	}

	return {
		register,
		unregister,
		list
	}
}

export type ConfigRegistry = {
	register: (params: { name: string; filePath: string }) => any
	unregister: (params: { name: string }) => any
	list: () => any
}

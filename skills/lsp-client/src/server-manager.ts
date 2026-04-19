/**
 * LSP Server Manager
 *
 * Manages LSP server instances and routes requests based on file extensions.
 * Each server is a child process communicating via stdio using JSON-RPC.
 */

import { spawn, type ChildProcess } from 'child_process'
import * as path from 'path'
import { pathToFileURL } from 'url'
import type {
  InitializeParams,
  InitializeResult,
  LspServerState,
  ScopedLspServerConfig,
  ServerCapabilities,
} from './protocol.js'

// ---------------------------------------------------------------------------
// LSP Client (stdio communication)
// ---------------------------------------------------------------------------

export type LSPClient = {
  readonly capabilities: ServerCapabilities | undefined
  readonly isInitialized: boolean
  start(
    command: string,
    args: string[],
    options?: { env?: Record<string, string>; cwd?: string },
  ): Promise<void>
  initialize(params: InitializeParams): Promise<InitializeResult>
  sendRequest<TResult>(method: string, params: unknown): Promise<TResult>
  sendNotification(method: string, params: unknown): Promise<void>
  onNotification(method: string, handler: (params: unknown) => void): void
  onRequest<TParams, TResult>(
    method: string,
    handler: (params: TParams) => TResult | Promise<TResult>,
  ): void
  stop(): Promise<void>
}

export function createLSPClient(serverName: string): LSPClient {
  let proc: ChildProcess | undefined
  let connection: unknown = undefined // JSON-RPC connection
  let capabilities: ServerCapabilities | undefined
  let isInitialized = false
  let isStopping = false

  // Lazy-load vscode-jsonrpc to avoid loading it when not needed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createMessageConnection, StreamMessageReader, StreamMessageWriter, Trace } =
    require('vscode-jsonrpc/node.js') as typeof import('vscode-jsonrpc/node')

  function getConnection() {
    if (!connection) {
      throw new Error(`LSP client for ${serverName} not started`)
    }
    return connection as ReturnType<typeof createMessageConnection>
  }

  return {
    get capabilities() {
      return capabilities
    },
    get isInitialized() {
      return isInitialized
    },

    async start(
      command: string,
      args: string[],
      options?: { env?: Record<string, string>; cwd?: string },
    ): Promise<void> {
      // Spawn the LSP server process
      proc = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...options?.env },
        cwd: options?.cwd,
        windowsHide: true,
      })

      if (!proc.stdout || !proc.stdin) {
        throw new Error('LSP server process stdio not available')
      }

      // Wait for process to spawn (handles ENOENT etc.)
      await new Promise<void>((resolve, reject) => {
        const p = proc!
        const onSpawn = () => {
          cleanup()
          resolve()
        }
        const onError = (err: Error) => {
          cleanup()
          reject(err)
        }
        const cleanup = () => {
          p.removeListener('spawn', onSpawn)
          p.removeListener('error', onError)
        }
        p.once('spawn', onSpawn)
        p.once('error', onError)
      })

      // Capture stderr for debugging
      proc.stderr?.on('data', (data: Buffer) => {
        const output = data.toString().trim()
        if (output) {
          console.log(`[LSP SERVER ${serverName}] ${output}`)
        }
      })

      // Create JSON-RPC connection
      const reader = new StreamMessageReader(proc.stdout)
      const writer = new StreamMessageWriter(proc.stdin)
      connection = createMessageConnection(reader, writer)

      const conn = getConnection()

      // Error handlers
      conn.onError(([err]: [Error]) => {
        if (!isStopping) {
          console.error(`[LSP ERROR] ${serverName}: ${err.message}`)
        }
      })

      conn.onClose(() => {
        if (!isStopping) {
          console.log(`[LSP] ${serverName} connection closed`)
        }
      })

      // Start listening
      conn.listen()

      // Enable tracing
      conn
        .trace(Trace.Verbose, {
          log: (message: string) => {
            console.log(`[LSP PROTOCOL ${serverName}] ${message}`)
          },
        })
        .catch((err: Error) => {
          console.log(`[LSP] ${serverName} trace error: ${err.message}`)
        })

      console.log(`[LSP] Client started for ${serverName}`)
    },

    async initialize(params: InitializeParams): Promise<InitializeResult> {
      const conn = getConnection()

      const result: InitializeResult = await conn.sendRequest(
        'initialize',
        params,
      )

      capabilities = result.capabilities

      // Send initialized notification
      await conn.sendNotification('initialized', {})

      isInitialized = true
      console.log(`[LSP] ${serverName} initialized`)

      return result
    },

    async sendRequest<TResult>(method: string, params: unknown): Promise<TResult> {
      const conn = getConnection()
      if (!isInitialized) {
        throw new Error(`LSP server ${serverName} not initialized`)
      }
      return await conn.sendRequest(method, params)
    },

    async sendNotification(method: string, params: unknown): Promise<void> {
      const conn = getConnection()
      if (!isInitialized) {
        throw new Error(`LSP server ${serverName} not initialized`)
      }
      try {
        await conn.sendNotification(method, params)
      } catch (err) {
        // Notifications are fire-and-forget, log but don't throw
        console.log(`[LSP] Notification ${method} failed: ${(err as Error).message}`)
      }
    },

    onNotification(method: string, handler: (params: unknown) => void): void {
      const conn = getConnection()
      conn.onNotification(method, handler)
    },

    onRequest<TParams, TResult>(
      method: string,
      handler: (params: TParams) => TResult | Promise<TResult>,
    ): void {
      const conn = getConnection()
      conn.onRequest(method, handler)
    },

    async stop(): Promise<void> {
      isStopping = true
      try {
        if (connection) {
          try {
            await (connection as ReturnType<typeof createMessageConnection>).sendRequest('shutdown', {})
            await (connection as ReturnType<typeof createMessageConnection>).sendNotification('exit', {})
          } catch (_) {
            // Ignore shutdown errors
          }
          ;(connection as ReturnType<typeof createMessageConnection>).dispose()
          connection = undefined
        }
      } finally {
        if (proc) {
          proc.removeAllListeners('error')
          proc.removeAllListeners('exit')
          proc.stdin?.removeAllListeners('error')
          proc.stderr?.removeAllListeners('data')
          try {
            proc.kill()
          } catch (_) {
            // Process may already be dead
          }
          proc = undefined
        }
        isInitialized = false
        capabilities = undefined
        isStopping = false
      }
    },
  }
}

// ---------------------------------------------------------------------------
// LSP Server Instance
// ---------------------------------------------------------------------------

export type LSPServerInstance = {
  readonly name: string
  readonly config: ScopedLspServerConfig
  readonly state: LspServerState
  start(): Promise<void>
  stop(): Promise<void>
  sendRequest<T>(method: string, params: unknown): Promise<T>
  sendNotification(method: string, params: unknown): Promise<void>
  onRequest<TParams, TResult>(
    method: string,
    handler: (params: TParams) => TResult | Promise<TResult>,
  ): void
  onNotification(method: string, handler: (params: unknown) => void): void
}

const MAX_RETRIES = 3

export function createLSPServerInstance(
  name: string,
  config: ScopedLspServerConfig,
): LSPServerInstance {
  let state: LspServerState = 'stopped'
  const client = createLSPClient(name)

  async function start(): Promise<void> {
    if (state === 'running' || state === 'starting') return

    state = 'starting'
    try {
      await client.start(config.command, config.args || [], {
        env: config.env,
        cwd: config.workspaceFolder,
      })

      const workspaceFolder = config.workspaceFolder || process.cwd()
      const workspaceUri = pathToFileURL(workspaceFolder).href

      const initParams: InitializeParams = {
        processId: process.pid ?? null,
        initializationOptions: config.initializationOptions ?? {},
        workspaceFolders: [
          {
            uri: workspaceUri,
            name: path.basename(workspaceFolder),
          },
        ],
        rootPath: workspaceFolder,
        rootUri: workspaceUri,
        capabilities: {
          workspace: {
            configuration: false,
            workspaceFolders: false,
          },
          textDocument: {
            synchronization: {
              dynamicRegistration: false,
              willSave: false,
              willSaveWaitUntil: false,
              didSave: true,
            },
            publishDiagnostics: {
              relatedInformation: true,
              tagSupport: { valueSet: [1, 2] },
              versionSupport: false,
              codeDescriptionSupport: true,
              dataSupport: false,
            },
            hover: {
              dynamicRegistration: false,
              contentFormat: ['markdown', 'plaintext'],
            },
            definition: {
              dynamicRegistration: false,
              linkSupport: true,
            },
            references: {
              dynamicRegistration: false,
            },
            documentSymbol: {
              dynamicRegistration: false,
              hierarchicalDocumentSymbolSupport: true,
            },
          },
          general: {
            positionEncodings: ['utf-16'],
          },
        },
      }

      const timeout = config.startupTimeout ?? 30000
      const initPromise = client.initialize(initParams)

      await Promise.race([
        initPromise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout),
        ),
      ])

      state = 'running'
      console.log(`[LSP] Server instance started: ${name}`)
    } catch (err) {
      state = 'error'
      await client.stop()
      throw err
    }
  }

  async function stop(): Promise<void> {
    if (state === 'stopped' || state === 'stopping') return
    state = 'stopping'
    try {
      await client.stop()
      state = 'stopped'
    } catch (err) {
      state = 'error'
      throw err
    }
  }

  async function sendRequest<T>(method: string, params: unknown): Promise<T> {
    if (state !== 'running') {
      throw new Error(`Cannot send request to LSP server '${name}': server is ${state}`)
    }
    return await client.sendRequest<T>(method, params)
  }

  async function sendNotification(method: string, params: unknown): Promise<void> {
    if (state !== 'running') return
    await client.sendNotification(method, params)
  }

  function onRequest<TParams, TResult>(
    method: string,
    handler: (params: TParams) => TResult | Promise<TResult>,
  ): void {
    client.onRequest(method, handler)
  }

  function onNotification(method: string, handler: (params: unknown) => void): void {
    client.onNotification(method, handler)
  }

  return {
    get name() {
      return name
    },
    get config() {
      return config
    },
    get state() {
      return state
    },
    start,
    stop,
    sendRequest,
    sendNotification,
    onRequest,
    onNotification,
  }
}

// ---------------------------------------------------------------------------
// LSP Server Manager
// ---------------------------------------------------------------------------

export interface LSPServerManager {
  initialize(): Promise<void>
  shutdown(): Promise<void>
  getServerForFile(filePath: string): LSPServerInstance | undefined
  ensureServerStarted(filePath: string): Promise<LSPServerInstance | undefined>
  sendRequest<T>(
    filePath: string,
    method: string,
    params: unknown,
  ): Promise<T | undefined>
  openFile(filePath: string, content: string): Promise<void>
  changeFile(filePath: string, content: string): Promise<void>
  saveFile(filePath: string): Promise<void>
  closeFile(filePath: string): Promise<void>
}

export function createLSPServerManager(
  serverConfigs: Record<string, ScopedLspServerConfig>,
): LSPServerManager {
  const servers = new Map<string, LSPServerInstance>()
  const extensionMap = new Map<string, string[]>()
  const openedFiles = new Map<string, string>()

  // Build extension → server mapping
  for (const [serverName, config] of Object.entries(serverConfigs)) {
    const fileExtensions = Object.keys(config.extensionToLanguage)
    for (const ext of fileExtensions) {
      const normalized = ext.toLowerCase()
      if (!extensionMap.has(normalized)) {
        extensionMap.set(normalized, [])
      }
      extensionMap.get(normalized)!.push(serverName)
    }
    servers.set(serverName, createLSPServerInstance(serverName, config))
  }

  async function initialize(): Promise<void> {
    console.log(`[LSP] Manager initialized with ${servers.size} servers`)
  }

  async function shutdown(): Promise<void> {
    await Promise.allSettled(
      Array.from(servers.values()).map((s) => s.stop()),
    )
    servers.clear()
    extensionMap.clear()
    openedFiles.clear()
  }

  function getServerForFile(filePath: string): LSPServerInstance | undefined {
    const ext = path.extname(filePath).toLowerCase()
    const serverNames = extensionMap.get(ext)
    if (!serverNames?.length) return undefined
    return servers.get(serverNames[0])
  }

  async function ensureServerStarted(
    filePath: string,
  ): Promise<LSPServerInstance | undefined> {
    const server = getServerForFile(filePath)
    if (!server) return undefined
    if (server.state === 'stopped' || server.state === 'error') {
      await server.start()
    }
    return server
  }

  async function sendRequest<T>(
    filePath: string,
    method: string,
    params: unknown,
  ): Promise<T | undefined> {
    const server = await ensureServerStarted(filePath)
    if (!server) return undefined
    return await server.sendRequest<T>(method, params)
  }

  async function openFile(filePath: string, content: string): Promise<void> {
    const server = await ensureServerStarted(filePath)
    if (!server) return

    const fileUri = pathToFileURL(path.resolve(filePath)).href
    const ext = path.extname(filePath).toLowerCase()
    const languageId = server.config.extensionToLanguage[ext] || 'plaintext'

    if (openedFiles.get(fileUri) === server.name) return

    await server.sendNotification('textDocument/didOpen', {
      textDocument: {
        uri: fileUri,
        languageId,
        version: 1,
        text: content,
      },
    })
    openedFiles.set(fileUri, server.name)
  }

  async function changeFile(filePath: string, content: string): Promise<void> {
    const server = getServerForFile(filePath)
    if (!server || server.state !== 'running') {
      return openFile(filePath, content)
    }

    const fileUri = pathToFileURL(path.resolve(filePath)).href
    if (openedFiles.get(fileUri) !== server.name) {
      return openFile(filePath, content)
    }

    await server.sendNotification('textDocument/didChange', {
      textDocument: { uri: fileUri, version: 1 },
      contentChanges: [{ text: content }],
    })
  }

  async function saveFile(filePath: string): Promise<void> {
    const server = getServerForFile(filePath)
    if (!server || server.state !== 'running') return

    await server.sendNotification('textDocument/didSave', {
      textDocument: { uri: pathToFileURL(path.resolve(filePath)).href },
    })
  }

  async function closeFile(filePath: string): Promise<void> {
    const server = getServerForFile(filePath)
    if (!server || server.state !== 'running') return

    const fileUri = pathToFileURL(path.resolve(filePath)).href
    await server.sendNotification('textDocument/didClose', {
      textDocument: { uri: fileUri },
    })
    openedFiles.delete(fileUri)
  }

  return {
    initialize,
    shutdown,
    getServerForFile,
    ensureServerStarted,
    sendRequest,
    openFile,
    changeFile,
    saveFile,
    closeFile,
  }
}

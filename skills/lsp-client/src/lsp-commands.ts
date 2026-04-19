/**
 * LSP Commands Implementation
 *
 * Implements code intelligence commands by communicating with LSP servers.
 * Commands: goto definition, find references, hover, document symbols.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { pathToFileURL } from 'url'
import type {
  DefinitionParams,
  DocumentSymbol,
  Hover,
  Location,
  ReferencesParams,
} from './protocol.js'
import type { LSPServerManager } from './server-manager.js'

// ---------------------------------------------------------------------------
// Server Configurations
// ---------------------------------------------------------------------------

export interface LSPServerDefinition {
  command: string
  args?: string[]
  extensionToLanguage: Record<string, string>
  env?: Record<string, string>
  initializationOptions?: unknown
  workspaceFolder?: string
}

/**
 * Default LSP server configurations for common languages.
 * Add more as needed. Users can also provide their own configs.
 */
export const DEFAULT_LSP_SERVERS: Record<string, LSPServerDefinition> = {
  'typescript-language-server': {
    command: 'typescript-language-server',
    args: ['--stdio'],
    extensionToLanguage: {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
    },
  },
  'typescript-language-server-npm': {
    command: 'npx',
    args: ['-y', 'typescript-language-server', '--stdio'],
    extensionToLanguage: {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
    },
  },
  'rust-analyzer': {
    command: 'rust-analyzer',
    args: [],
    extensionToLanguage: {
      '.rs': 'rust',
    },
  },
  'pyright': {
    command: 'pyright-langserver',
    args: ['--stdio'],
    extensionToLanguage: {
      '.py': 'python',
    },
  },
  'pylance': {
    command: 'pylance',
    args: ['--stdio'],
    extensionToLanguage: {
      '.py': 'python',
    },
  },
  'gopls': {
    command: 'gopls',
    args: [],
    extensionToLanguage: {
      '.go': 'go',
    },
  },
  'clangd': {
    command: 'clangd',
    args: [],
    extensionToLanguage: {
      '.c': 'c',
      '.cpp': 'cpp',
      '.cc': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
    },
  },
  'jedi-language-server': {
    command: 'jedi-language-server',
    args: [],
    extensionToLanguage: {
      '.py': 'python',
    },
  },
}

// ---------------------------------------------------------------------------
// Command Results
// ---------------------------------------------------------------------------

export interface GotoDefinitionResult {
  file: string
  line: number
  column: number
  description: string
}

export interface FindReferencesResult {
  file: string
  line: number
  column: number
  description: string
}

export interface HoverResult {
  contents: string
  range?: {
    start: { line: number; character: number }
    end: { line: number; character: number }
  }
}

export interface DocumentSymbolResult {
  name: string
  kind: string
  line: number
  column: number
  children?: DocumentSymbolResult[]
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function symbolKindToString(kind: number): string {
  const kinds: Record<number, string> = {
    1: 'File',
    2: 'Module',
    3: 'Namespace',
    4: 'Package',
    5: 'Class',
    6: 'Method',
    7: 'Property',
    8: 'Field',
    9: 'Constructor',
    10: 'Enum',
    11: 'Interface',
    12: 'Function',
    13: 'Variable',
    14: 'Constant',
    15: 'String',
    16: 'Number',
    17: 'Boolean',
    18: 'Array',
    19: 'Object',
    20: 'Key',
    21: 'Null',
    22: 'EnumMember',
    23: 'Struct',
    24: 'Event',
    25: 'Operator',
    26: 'TypeParameter',
  }
  return kinds[kind] || `Unknown(${kind})`
}

function locationToResult(loc: Location): GotoDefinitionResult | FindReferencesResult {
  const uri = loc.uri
  const range = loc.range
  const file = uri.startsWith('file://') ? uri.slice(7) : uri
  return {
    file,
    line: range.start.line + 1,
    column: range.start.character + 1,
    description: `${file}:${range.start.line + 1}:${range.start.character + 1}`,
  }
}

function markupContentToString(
  contents: Hover['contents'],
): string {
  if (typeof contents === 'string') return contents
  if (Array.isArray(contents)) {
    return contents.map(c => (typeof c === 'string' ? c : c.value)).join('\n---\n')
  }
  return contents.value
}

// ---------------------------------------------------------------------------
// LSP Commands
// ---------------------------------------------------------------------------

export class LSPCommands {
  private manager: LSPServerManager
  private rootPath: string

  constructor(manager: LSPServerManager, rootPath: string) {
    this.manager = manager
    this.rootPath = rootPath
  }

  /**
   * Jump to the definition of the symbol at the given position.
   */
  async gotoDefinition(
    filePath: string,
    line: number,
    character: number,
  ): Promise<GotoDefinitionResult[]> {
    const params: DefinitionParams = {
      textDocument: { uri: pathToFileURL(path.resolve(filePath)).href },
      position: { line: line - 1, character: character - 1 },
    }

    const result = await this.manager.sendRequest<Location | Location[] | null>(
      filePath,
      'textDocument/definition',
      params,
    )

    if (!result) return []
    const locations = Array.isArray(result) ? result : [result]
    return locations.map(locationToResult)
  }

  /**
   * Find all references to the symbol at the given position.
   */
  async findReferences(
    filePath: string,
    line: number,
    character: number,
  ): Promise<FindReferencesResult[]> {
    const params: ReferencesParams = {
      textDocument: { uri: pathToFileURL(path.resolve(filePath)).href },
      position: { line: line - 1, character: character - 1 },
      context: { includeDeclaration: true },
    }

    const result = await this.manager.sendRequest<Location[] | null>(
      filePath,
      'textDocument/references',
      params,
    )

    if (!result) return []
    return result.map(locationToResult)
  }

  /**
   * Get hover information for the symbol at the given position.
   */
  async hover(
    filePath: string,
    line: number,
    character: number,
  ): Promise<HoverResult | null> {
    const params = {
      textDocument: { uri: pathToFileURL(path.resolve(filePath)).href },
      position: { line: line - 1, character: character - 1 },
    }

    const result = await this.manager.sendRequest<Hover | null>(
      filePath,
      'textDocument/hover',
      params,
    )

    if (!result) return null

    return {
      contents: markupContentToString(result.contents),
      range: result.range
        ? {
            start: result.range.start,
            end: result.range.end,
          }
        : undefined,
    }
  }

  /**
   * Get all document symbols (outline) for a file.
   */
  async documentSymbols(filePath: string): Promise<DocumentSymbolResult[]> {
    const params = {
      textDocument: { uri: pathToFileURL(path.resolve(filePath)).href },
    }

    const result = await this.manager.sendRequest<DocumentSymbol[] | null>(
      filePath,
      'textDocument/documentSymbol',
      params,
    )

    if (!result) return []

    const flatten = (symbols: DocumentSymbol[]): DocumentSymbolResult[] => {
      const out: DocumentSymbolResult[] = []
      for (const sym of symbols) {
        out.push({
          name: sym.name,
          kind: symbolKindToString(sym.kind),
          line: sym.range.start.line + 1,
          column: sym.range.start.character + 1,
          children: sym.children ? flatten(sym.children) : undefined,
        })
      }
      return out
    }

    return flatten(result)
  }

  /**
   * Open a file on the LSP server (required before sending requests).
   */
  async openFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8')
    await this.manager.openFile(filePath, content)
  }

  /**
   * Sync file changes to the LSP server.
   */
  async updateFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath, 'utf-8')
    await this.manager.changeFile(filePath, content)
  }

  /**
   * Close a file on the LSP server.
   */
  async closeFile(filePath: string): Promise<void> {
    await this.manager.closeFile(filePath)
  }

  /**
   * Shutdown all LSP servers.
   */
  async shutdown(): Promise<void> {
    await this.manager.shutdown()
  }
}

// ---------------------------------------------------------------------------
// Quick Command Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a cursor position from "file:line:col" format.
 */
export function parsePosition(input: string): {
  filePath: string
  line: number
  character: number
} | null {
  // Match patterns like "file.ts:10:5" or just "10:5" (uses last opened file)
  const withFile = input.match(/^(.+?):(\d+):(\d+)$/)
  if (withFile) {
    return {
      filePath: withFile[1],
      line: parseInt(withFile[2], 10),
      character: parseInt(withFile[3], 10),
    }
  }
  const justPos = input.match(/^(\d+):(\d+)$/)
  if (justPos) {
    return {
      filePath: '',
      line: parseInt(justPos[1], 10),
      character: parseInt(justPos[2], 10),
    }
  }
  return null
}

/**
 * Format results for display.
 */
export function formatGotoDefinition(results: GotoDefinitionResult[]): string {
  if (results.length === 0) return 'No definition found.'
  return results
    .map((r) => `→ ${r.description}`)
    .join('\n')
}

export function formatReferences(results: FindReferencesResult[]): string {
  if (results.length === 0) return 'No references found.'
  return results
    .map((r, i) => `${i + 1}. ${r.description}`)
    .join('\n')
}

export function formatHover(result: HoverResult | null): string {
  if (!result) return 'No hover information available.'
  return result.contents
}

export function formatDocumentSymbols(
  symbols: DocumentSymbolResult[],
  indent = 0,
): string {
  const pad = '  '.repeat(indent)
  return symbols
    .map((s) => {
      let out = `${pad}${s.name} (${s.kind}) :${s.line}:${s.column}`
      if (s.children?.length) {
        out += '\n' + formatDocumentSymbols(s.children, indent + 1)
      }
      return out
    })
    .join('\n')
}

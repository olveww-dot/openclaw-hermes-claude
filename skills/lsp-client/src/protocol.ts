/**
 * LSP Protocol Type Definitions
 *
 * Based on the Language Server Protocol specification:
 * https://microsoft.github.io/language-server-protocol/
 *
 * This module provides TypeScript types for LSP messages and structures.
 * The actual JSON-RPC communication is handled by vscode-jsonrpc.
 */

// ---------------------------------------------------------------------------
// Common Types
// ---------------------------------------------------------------------------

export interface Position {
  line: number
  character: number
}

export interface Range {
  start: Position
  end: Position
}

export interface Location {
  uri: string
  range: Range
}

export interface LocationLink {
  originSelectionRange?: Range
  uri: string
  range: Range
}

export interface TextDocumentIdentifier {
  uri: string
}

export interface TextDocumentPositionParams {
  textDocument: TextDocumentIdentifier
  position: Position
}

// ---------------------------------------------------------------------------
// Initialize
// ---------------------------------------------------------------------------

export interface InitializeParams {
  processId: number | null
  initializationOptions?: unknown
  workspaceFolders?: WorkspaceFolder[]
  capabilities: ClientCapabilities
  rootPath?: string | null
  rootUri?: string | null
}

export interface WorkspaceFolder {
  uri: string
  name: string
}

export interface ClientCapabilities {
  workspace?: {
    configuration?: boolean
    workspaceFolders?: boolean
  }
  textDocument?: {
    synchronization?: TextDocumentSyncOptions
    publishDiagnostics?: PublishDiagnosticsOptions
    hover?: HoverOptions
    definition?: DefinitionOptions
    references?: ReferenceOptions
    documentSymbol?: DocumentSymbolOptions
    callHierarchy?: CallHierarchyOptions
  }
  general?: {
    positionEncodings?: string[]
  }
}

export interface TextDocumentSyncOptions {
  dynamicRegistration?: boolean
  willSave?: boolean
  willSaveWaitUntil?: boolean
  didSave?: boolean
  didChange?: boolean
}

export interface PublishDiagnosticsOptions {
  relatedInformation?: boolean
  tagSupport?: { valueSet: number[] }
  versionSupport?: boolean
  codeDescriptionSupport?: boolean
  dataSupport?: boolean
}

export interface HoverOptions {
  dynamicRegistration?: boolean
  contentFormat?: ('plaintext' | 'markdown')[]
}

export interface DefinitionOptions {
  dynamicRegistration?: boolean
  linkSupport?: boolean
}

export interface ReferenceOptions {
  dynamicRegistration?: boolean
}

export interface DocumentSymbolOptions {
  dynamicRegistration?: boolean
  hierarchicalDocumentSymbolSupport?: boolean
  labelSupport?: boolean
}

export interface CallHierarchyOptions {
  dynamicRegistration?: boolean
}

export interface InitializeResult {
  capabilities: ServerCapabilities
  serverInfo?: { name: string; version?: string }
}

export interface ServerCapabilities {
  textDocumentSync?: number | TextDocumentSyncOptions
  hoverProvider?: boolean | HoverOptions
  definitionProvider?: boolean | DefinitionOptions
  referencesProvider?: boolean | ReferenceOptions
  documentSymbolProvider?: boolean | DocumentSymbolOptions
  callHierarchyProvider?: boolean
  completionProvider?: CompletionOptions
  signatureHelpProvider?: SignatureHelpOptions
  codeActionProvider?: boolean
  codeLensProvider?: CodeLensOptions
  documentFormattingProvider?: boolean
  documentRangeFormattingProvider?: boolean
  documentHighlightProvider?: boolean
  workspaceSymbolProvider?: boolean
  workspace?: {
    fileOperations?: unknown
  }
}

// ---------------------------------------------------------------------------
// Text Document
// ---------------------------------------------------------------------------

export interface TextDocumentItem {
  uri: string
  languageId: string
  version: number
  text: string
}

export interface TextDocumentDidChangeParams {
  textDocument: VersionedTextDocumentIdentifier
  contentChanges: TextDocumentContentChangeEvent[]
}

export interface TextDocumentContentChangeEvent {
  text: string
  range?: Range
  rangeLength?: number
}

export interface VersionedTextDocumentIdentifier {
  uri: string
  version: number
}

export interface SaveOptions {
  includeText?: boolean
}

export interface DidSaveTextDocumentParams {
  textDocument: TextDocumentIdentifier
  text?: string
}

// ---------------------------------------------------------------------------
// Hover
// ---------------------------------------------------------------------------

export interface Hover {
  contents: MarkupContent | MarkedString | MarkedString[]
  range?: Range
}

export type MarkedString = string | { language: string; value: string }

export interface MarkupContent {
  kind: 'plaintext' | 'markdown'
  value: string
}

// ---------------------------------------------------------------------------
// Definition & References
// ---------------------------------------------------------------------------

export interface DefinitionParams extends TextDocumentPositionParams {
  workDoneToken?: string
  partialResultToken?: string
}

export interface ReferencesParams extends TextDocumentPositionParams {
  context: ReferencesContext
  workDoneToken?: string
  partialResultToken?: string
}

export interface ReferencesContext {
  includeDeclaration: boolean
}

// ---------------------------------------------------------------------------
// Document Symbol
// ---------------------------------------------------------------------------

export interface DocumentSymbolParams {
  textDocument: TextDocumentIdentifier
  workDoneToken?: string
  partialResultToken?: string
}

export interface DocumentSymbol {
  name: string
  detail?: string
  kind: SymbolKind
  tags?: SymbolTag[]
  range: Range
  selectionRange: Range
  children?: DocumentSymbol[]
}

export enum SymbolKind {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26,
}

export enum SymbolTag {
  Deprecated = 1,
}

// ---------------------------------------------------------------------------
// Completion
// ---------------------------------------------------------------------------

export interface CompletionParams extends TextDocumentPositionParams {
  context?: CompletionContext
  workDoneToken?: string
  partialResultToken?: string
}

export interface CompletionContext {
  triggerKind: CompletionTriggerKind
  triggerCharacter?: string
}

export enum CompletionTriggerKind {
  Invoked = 1,
  TriggerCharacter = 2,
  TriggerForIncompleteCompletions = 3,
}

export interface CompletionOptions {
  resolveProvider?: boolean
  triggerCharacters?: string[]
}

export interface CompletionList {
  isIncomplete: boolean
  items: CompletionItem[]
}

export interface CompletionItem {
  label: string
  kind?: CompletionItemKind
  detail?: string
  documentation?: string | MarkupContent
  insertText?: string
  insertTextFormat?: InsertTextFormat
  filterText?: string
  sortText?: string
  preselect?: boolean
  commitCharacters?: string[]
  data?: unknown
}

export enum InsertTextFormat {
  PlainText = 1,
  Snippet = 2,
}

// eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
export enum CompletionItemKind {
  Text = 1,
  Method = 2,
  Function = 3,
  Constructor = 4,
  Field = 5,
  Variable = 6,
  Class = 7,
  Interface = 8,
  Module = 9,
  Property = 10,
  Unit = 11,
  Value = 12,
  Enum = 13,
  Keyword = 14,
  Snippet = 15,
  Color = 16,
  File = 17,
  Reference = 18,
  Folder = 19,
  EnumMember = 20,
  Constant = 21,
  Struct = 22,
  Event = 23,
  Operator = 24,
  TypeParameter = 25,
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

export interface PublishDiagnosticsParams {
  uri: string
  version?: number
  diagnostics: Diagnostic[]
}

export interface Diagnostic {
  range: Range
  severity?: DiagnosticSeverity
  code?: number | string
  source?: string
  message: string
  tags?: DiagnosticTag[]
  relatedInformation?: DiagnosticRelatedInformation[]
}

export enum DiagnosticSeverity {
  Error = 1,
  Warning = 2,
  Information = 3,
  Hint = 4,
}

export enum DiagnosticTag {
  Unnecessary = 1,
  Deprecated = 2,
}

export interface DiagnosticRelatedInformation {
  location: Location
  message: string
}

// ---------------------------------------------------------------------------
// Window / Logging
// ---------------------------------------------------------------------------

export interface LogMessageParams {
  type: MessageType
  message: string
}

export enum MessageType {
  Error = 1,
  Warning = 2,
  Info = 3,
  Log = 4,
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface ConfigurationParams {
  items: ConfigurationItem[]
}

export interface ConfigurationItem {
  scopeUri?: string
  section?: string
}

// ---------------------------------------------------------------------------
// Server State
// ---------------------------------------------------------------------------

export type LspServerState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error'

// ---------------------------------------------------------------------------
// Scoped LSP Server Config (from plugin system)
// ---------------------------------------------------------------------------

export interface ScopedLspServerConfig {
  command: string
  args?: string[]
  extensionToLanguage: Record<string, string>
  transport?: 'stdio' | 'socket'
  env?: Record<string, string>
  initializationOptions?: unknown
  settings?: unknown
  workspaceFolder?: string
  startupTimeout?: number
  shutdownTimeout?: number
  restartOnCrash?: boolean
  maxRestarts?: number
  scope?: 'dynamic'
  source?: string
}

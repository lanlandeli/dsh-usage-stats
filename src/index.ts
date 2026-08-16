import type { IncomingMessage, ServerResponse } from 'node:http'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import type { Session, SessionEvent, SessionId } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session-query'
import type {} from '@deepseek-ai/dsh-host-webserver'
import z from '@deepseek-ai/schemastery'
import { aggregateCalls, aggregateStats, appendActivity, exportCsv, newCollectState, summarizeSession, type CollectState } from './core.js'
import type { CallsPage, IndexCache, SessionSummary, StatsQuery, TaskScope } from './types.js'

export const name = 'usage-stats'
export const inject = ['sessionQuery', 'webServer']

export interface Config {
  indexConcurrency?: number
  cacheWriteDelayMs?: number
  cachePath?: string
  apiPath?: string
}

export const Config: z<Config> = z.object({
  indexConcurrency: z.natural().min(1).max(8).default(2).description('Concurrent historical session reads.'),
  cacheWriteDelayMs: z.natural().min(250).max(30_000).default(1000).description('Debounce delay for local index writes.'),
  cachePath: z.string().description('Optional index path; defaults below DSH_HOME.'),
  apiPath: z.string().default('/usage-stats/v1').description('Same-origin read-only API prefix.'),
})

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const SCOPES = new Set<TaskScope>(['all', 'main', 'subtasks'])

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(json),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(json)
}

function parseQuery(req: IncomingMessage): StatsQuery {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const now = new Date()
  const fallbackTo = now.toISOString().slice(0, 10)
  now.setUTCDate(now.getUTCDate() - 29)
  const fallbackFrom = now.toISOString().slice(0, 10)
  const from = url.searchParams.get('from') ?? fallbackFrom
  const to = url.searchParams.get('to') ?? fallbackTo
  if (!ISO_DATE.test(from) || !ISO_DATE.test(to) || from > to) throw new Error('Invalid date range')
  const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000
  if (!Number.isFinite(span) || span > 3660) throw new Error('Date range exceeds 10 years')
  const scope = url.searchParams.get('scope') ?? 'all'
  if (!SCOPES.has(scope as TaskScope)) throw new Error('Invalid task scope')
  const workspace = url.searchParams.get('workspace') ?? undefined
  const timeZone = (url.searchParams.get('timeZone') ?? 'UTC').slice(0, 80)
  const query: StatsQuery = { from, to, timeZone, scope: scope as TaskScope }
  if (workspace !== undefined && workspace.length <= 4096) query.workspace = workspace
  return query
}

/** Pagination, model/provider, and token-threshold filters for `/calls`. */
function parsePagination(req: IncomingMessage): { page: number; pageSize: number; model: string | undefined; provider: string | undefined; minInputTokens: number | undefined; minOutputTokens: number | undefined } {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const page = Number(url.searchParams.get('page') ?? '1')
  const pageSize = Number(url.searchParams.get('pageSize') ?? '50')
  if (!Number.isInteger(page) || page < 1) throw new Error('Invalid page')
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 200) throw new Error('Invalid page size')
  const model = url.searchParams.get('model') ?? undefined
  const provider = url.searchParams.get('provider') ?? undefined
  if (model !== undefined && model.length > 4096) throw new Error('Invalid model filter')
  if (provider !== undefined && provider.length > 4096) throw new Error('Invalid provider filter')
  const threshold = (name: string): number | undefined => {
    const raw = url.searchParams.get(name)
    if (raw === null || raw === '') return undefined
    const value = Number(raw)
    if (!Number.isInteger(value) || value < 0) throw new Error(`Invalid ${name}`)
    return value
  }
  return { page, pageSize, model, provider, minInputTokens: threshold('minInputTokens'), minOutputTokens: threshold('minOutputTokens') }
}

function isCache(value: unknown): value is IndexCache {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Partial<IndexCache>
  // Schema 2 summaries exclude inherited fork prefixes from child sessions.
  return record.schema === 2 && Array.isArray(record.sessions)
}

class UsageIndex {
  private readonly sessions = new Map<string, SessionSummary>()
  private readonly collectors = new Map<string, CollectState>()
  /** True once the historical replay finished; served to `/calls` as `indexReady`. */
  private ready = false
  private readonly cachePath: string
  private writeTimer: ReturnType<typeof setTimeout> | undefined
  private disposed = false
  private loading: Promise<void> | undefined

  constructor(private readonly ctx: Context, private readonly config: Required<Pick<Config, 'indexConcurrency' | 'cacheWriteDelayMs' | 'apiPath'>> & Config) {
    this.cachePath = config.cachePath ?? dshHomePath('usage-stats', 'index-v1.json')
  }

  start(): void {
    this.ctx.on('session/event', (session: Session, event: SessionEvent) => { this.acceptLive(session, event) })
    this.ctx.effect(() => this.ctx.webServer.register({
      kind: 'prefix',
      path: this.config.apiPath,
      handler: (req, res) => this.handle(req, res),
    }), 'usage-stats: read-only API')
    this.ctx.effect(() => () => { void this.dispose() }, 'usage-stats: local index lifecycle')
    this.loading = this.initialize().catch((error: unknown) => {
      this.ctx.logger.warn(error instanceof Error ? error : new Error(String(error)))
    })
  }

  private async initialize(): Promise<void> {
    const cacheNeedsRewrite = await this.loadCache()
    const records = await this.ctx.sessionQuery.listSessions()
    const missing = records.filter(record => !this.sessions.has(String(record.header.id)))
    let cursor = 0
    const worker = async (): Promise<void> => {
      while (!this.disposed) {
        const record = missing[cursor]
        cursor += 1
        if (record === undefined) return
        try {
          const snapshot = await this.ctx.sessionQuery.readSession(record.header.id)
          const incoming = summarizeSession(snapshot.session, snapshot.events)
          const current = this.sessions.get(incoming.id)
          if (current === undefined || current.lastSeq < incoming.lastSeq) this.sessions.set(incoming.id, incoming)
        } catch (error) {
          this.ctx.logger.warn(error instanceof Error ? error : new Error(String(error)))
        }
        await new Promise<void>(resolve => setImmediate(resolve))
      }
    }
    await Promise.all(Array.from({ length: Math.min(this.config.indexConcurrency, Math.max(1, missing.length)) }, worker))
    if (cacheNeedsRewrite) await this.persist()
    else if (missing.length > 0) this.scheduleWrite()
    this.ready = true
  }

  private acceptLive(session: Session, event: SessionEvent): void {
    const id = String(session.id)
    let summary = this.sessions.get(id)
    if (summary === undefined) {
      summary = summarizeSession(session.header, [])
      this.sessions.set(id, summary)
    }
    let state = this.collectors.get(id)
    if (state === undefined) {
      state = newCollectState()
      this.collectors.set(id, state)
    }
    if (appendActivity(summary, event, state)) this.scheduleWrite()
  }

  /** Returns true when an existing cache must be replaced after reindexing. */
  private async loadCache(): Promise<boolean> {
    try {
      const parsed: unknown = JSON.parse(await readFile(this.cachePath, 'utf8'))
      if (!isCache(parsed)) return true
      for (const session of parsed.sessions) {
        if (typeof session.id === 'string' && Array.isArray(session.activities)) this.sessions.set(session.id, session)
      }
      return false
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.ctx.logger.warn(error instanceof Error ? error : new Error(String(error)))
        return true
      }
      return false
    }
  }

  private scheduleWrite(): void {
    if (this.disposed || this.writeTimer !== undefined) return
    this.writeTimer = setTimeout(() => {
      this.writeTimer = undefined
      void this.persist().catch((error: unknown) => this.ctx.logger.warn(error instanceof Error ? error : new Error(String(error))))
    }, this.config.cacheWriteDelayMs)
    this.writeTimer.unref?.()
  }

  private async persist(): Promise<void> {
    const data: IndexCache = { schema: 2, sessions: [...this.sessions.values()] }
    const temporary = `${this.cachePath}.${process.pid}.tmp`
    await mkdir(dirname(this.cachePath), { recursive: true })
    await writeFile(temporary, JSON.stringify(data), { encoding: 'utf8', mode: 0o600 })
    await rename(temporary, this.cachePath)
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { allow: 'GET, HEAD' })
      res.end()
      return
    }
    try {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname
      if (path === `${this.config.apiPath}/calls`) {
        const query = parseQuery(req)
        const pagination = parsePagination(req)
        const calls = aggregateCalls(this.sessions.values(), { ...query, ...pagination })
        const page: CallsPage = {
          indexReady: this.ready,
          items: calls.items,
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: calls.total,
          hasMore: calls.total > pagination.page * pagination.pageSize,
        }
        sendJson(res, 200, req.method === 'HEAD' ? null : page)
        return
      }
      const query = parseQuery(req)
      const snapshot = aggregateStats(this.sessions.values(), query)
      if (path === `${this.config.apiPath}/export.csv`) {
        const csv = exportCsv(snapshot)
        res.writeHead(200, {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': 'attachment; filename="dsh-usage-stats.csv"',
          'cache-control': 'no-store',
          'x-content-type-options': 'nosniff',
        })
        res.end(req.method === 'HEAD' ? undefined : `\uFEFF${csv}`)
        return
      }
      if (path === `${this.config.apiPath}/export.json`) {
        res.setHeader('content-disposition', 'attachment; filename="dsh-usage-stats.json"')
      } else if (path !== `${this.config.apiPath}/snapshot`) {
        sendJson(res, 404, { error: 'Not found' })
        return
      }
      sendJson(res, 200, req.method === 'HEAD' ? null : snapshot)
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : 'Bad request' })
    }
  }

  private async dispose(): Promise<void> {
    this.disposed = true
    if (this.writeTimer !== undefined) clearTimeout(this.writeTimer)
    await this.loading
    await this.persist()
  }
}

export function apply(ctx: Context, config: Config = {}): void {
  const normalized = {
    ...config,
    indexConcurrency: config.indexConcurrency ?? 2,
    cacheWriteDelayMs: config.cacheWriteDelayMs ?? 1000,
    apiPath: (config.apiPath ?? '/usage-stats/v1').replace(/\/$/, ''),
  }
  new UsageIndex(ctx, normalized).start()
}

export type * from './types.js'
export { aggregateCalls, activityFromEvent, aggregateStats, appendActivity, exportCsv, newCollectState, summarizeSession } from './core.js'

export type TaskScope = 'all' | 'main' | 'subtasks'

export interface TokenBreakdown {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  reasoning: number
}

export interface ActivityRecord {
  seq: number
  time: number
  kind: 'human' | 'assistant'
  provider?: string
  model?: string
  tokens?: TokenBreakdown
  /** step/start → assistant/message wall time in ms; absent for history without a paired start. */
  durationMs?: number
  /** Effective reasoning effort from the nearest request/header; absent when none was recorded. */
  effort?: string
}

export interface SessionSummary {
  id: string
  createdAt: number
  cwd?: string
  parentSession?: string
  lastSeq: number
  indexedAt: number
  activities: ActivityRecord[]
}

export interface IndexCache {
  /** Schema 2 excludes inherited fork prefixes from child summaries. */
  schema: 2
  sessions: SessionSummary[]
}

export interface StatsQuery {
  from: string
  to: string
  timeZone: string
  workspace?: string
  scope: TaskScope
}

/** Query filters for the per-call detail endpoint (`/calls`). */
export interface CallsQuery extends StatsQuery {
  /** Exact model filter; absent means no filter. */
  model: string | undefined
  /** Exact provider route filter; absent means no filter. */
  provider: string | undefined
  /** Keep only calls whose billed input tokens are at least this value. */
  minInputTokens: number | undefined
  /** Keep only calls whose output tokens are at least this value. */
  minOutputTokens: number | undefined
  page: number
  pageSize: number
}

/** One assistant call row served by `/calls`. */
export interface CallRecord {
  key: string
  seq: number
  time: number
  sessionId: string
  provider: string
  model: string
  effort: string | null
  durationMs: number | null
  tokens: TokenBreakdown
}

/** Paginated payload served by `/calls`. */
export interface CallsPage {
  indexReady: boolean
  items: CallRecord[]
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

export interface ModelStats extends TokenBreakdown {
  key: string
  provider: string
  model: string
  tokens: number
  calls: number
  percent: number
}

export interface DayStats extends TokenBreakdown {
  date: string
  tokens: number
  calls: number
  messages: number
  sessions: number
  models: Record<string, number>
}

export interface StatsSnapshot {
  generatedAt: number
  range: { from: string; to: string; timeZone: string }
  totals: {
    tokens: number
    sessions: number
    messages: number
    activeDays: number
    currentStreak: number
  } & TokenBreakdown
  mostUsedModel: ModelStats | null
  allTime: {
    totals: StatsSnapshot['totals']
    mostUsedModel: ModelStats | null
  }
  days: DayStats[]
  models: ModelStats[]
  workspaces: { path: string; sessions: number }[]
  index: { sessions: number; lastUpdatedAt: number | null }
}

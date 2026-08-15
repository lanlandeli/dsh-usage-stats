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

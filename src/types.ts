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
  schema: 1
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
  /** Estimated cost in the snapshot currency. */
  cost: number
}

export interface DayStats extends TokenBreakdown {
  date: string
  tokens: number
  calls: number
  messages: number
  sessions: number
  models: Record<string, number>
  /** Estimated cost per "provider/model" key for this day. */
  modelCosts: Record<string, number>
  /** Estimated cost for this day. */
  cost: number
}

export interface StatsSnapshot {
  generatedAt: number
  range: { from: string; to: string; timeZone: string }
  /** Currency symbol used for all estimated costs in this snapshot. */
  currency: string
  totals: {
    tokens: number
    sessions: number
    messages: number
    activeDays: number
    currentStreak: number
    /** Estimated cost in the snapshot currency. */
    cost: number
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

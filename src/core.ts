import type { SessionEvent, SessionHeader } from '@deepseek-ai/dsh-session'
import type {
  ActivityRecord,
  CallRecord,
  CallsFilter,
  CallsQuery,
  DayStats,
  ModelStats,
  SessionSummary,
  StatsQuery,
  StatsSnapshot,
  TokenBreakdown,
} from './types.js'

const ZERO_TOKENS = (): TokenBreakdown => ({ input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 })

function finiteCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

/** Per-session in-memory state for pairing step timing and reasoning effort. */
export interface CollectState {
  openStep: { turn: number; step: number; time: number } | null
  currentEffort: string | undefined
}

export function newCollectState(): CollectState {
  return { openStep: null, currentEffort: undefined }
}

export function activityFromEvent(event: SessionEvent, state: CollectState = newCollectState()): ActivityRecord | null {
  if (event.type === 'step/start') {
    state.openStep = { turn: event.data.turn, step: event.data.step, time: event.time }
    return null
  }
  if (event.type === 'request/header') {
    const effort = event.data.header?.config?.reasoningEffort
    if (typeof effort === 'string' && effort.length > 0) state.currentEffort = effort
    return null
  }
  if (event.type === 'step/end' || event.type === 'turn/end') {
    state.openStep = null
    return null
  }
  if (event.type === 'user/message' && event.data.source.kind === 'user') {
    return { seq: event.seq, time: event.time, kind: 'human' }
  }
  if (event.type !== 'assistant/message') return null
  const usage = event.data.usage
  let durationMs: number | undefined
  if (state.openStep !== null && state.openStep.turn === event.data.turn && state.openStep.step === event.data.step) {
    durationMs = Math.max(0, event.time - state.openStep.time)
    state.openStep = null
  }
  const activity: ActivityRecord = {
    seq: event.seq,
    time: event.time,
    kind: 'assistant',
    provider: event.data.message.source.provider,
    model: event.data.message.source.model,
    tokens: {
      input: finiteCount(usage?.inputTokens),
      output: finiteCount(usage?.outputTokens),
      cacheRead: finiteCount(usage?.cacheReadTokens),
      cacheWrite: finiteCount(usage?.cacheWriteTokens),
      reasoning: finiteCount(usage?.reasoningTokens),
    },
  }
  if (durationMs !== undefined) activity.durationMs = durationMs
  if (state.currentEffort !== undefined) activity.effort = state.currentEffort
  return activity
}

export function summarizeSession(header: SessionHeader, events: readonly SessionEvent[], indexedAt = Date.now()): SessionSummary {
  // A forked child stores the parent's copied prefix in its own log. The
  // durable fork boundary is header.seedLength; lifecycle markers such as
  // session/end-seed may be appended again whenever the child is resumed and
  // therefore cannot identify the child's original ownership boundary.
  const firstOwnSeq = header.parentSession !== undefined ? (header.seedLength ?? 0) : 0
  const activities: ActivityRecord[] = []
  const state = newCollectState()
  for (const event of events) {
    if (event.seq < firstOwnSeq) continue
    const activity = activityFromEvent(event, state)
    if (activity !== null) activities.push(activity)
  }
  const summary: SessionSummary = {
    id: String(header.id),
    createdAt: header.createdAt,
    lastSeq: events.at(-1)?.seq ?? -1,
    indexedAt,
    activities,
  }
  if (header.cwd !== undefined) summary.cwd = header.cwd
  if (header.parentSession !== undefined) summary.parentSession = String(header.parentSession)
  return summary
}

export function appendActivity(summary: SessionSummary, event: SessionEvent, indexedAt = Date.now(), state?: CollectState): boolean {
  if (event.seq <= summary.lastSeq) return false
  summary.lastSeq = event.seq
  summary.indexedAt = indexedAt
  const activity = activityFromEvent(event, state ?? newCollectState())
  if (activity !== null) summary.activities.push(activity)
  return true
}

function addTokens(target: TokenBreakdown, value: TokenBreakdown): number {
  target.input += value.input
  target.output += value.output
  target.cacheRead += value.cacheRead
  target.cacheWrite += value.cacheWrite
  target.reasoning += value.reasoning
  return value.input + value.output + value.cacheRead + value.cacheWrite
}

function formatter(timeZone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
  } catch {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' })
  }
}

function dateKey(value: number, format: Intl.DateTimeFormat): string {
  const parts = format.formatToParts(value)
  const year = parts.find(part => part.type === 'year')?.value ?? '1970'
  const month = parts.find(part => part.type === 'month')?.value ?? '01'
  const day = parts.find(part => part.type === 'day')?.value ?? '01'
  return `${year}-${month}-${day}`
}

function datesBetween(from: string, to: string): string[] {
  const days: string[] = []
  const cursor = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  while (cursor <= end && days.length < 3660) {
    days.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

function newDay(date: string): DayStats {
  return { date, tokens: 0, calls: 0, messages: 0, sessions: 0, models: {}, ...ZERO_TOKENS() }
}

function inScope(session: SessionSummary, query: StatsQuery): boolean {
  if (query.workspace !== undefined && session.cwd !== query.workspace) return false
  if (query.scope === 'main' && session.parentSession !== undefined) return false
  if (query.scope === 'subtasks' && session.parentSession === undefined) return false
  return true
}

export function aggregateStats(sessions: Iterable<SessionSummary>, query: StatsQuery): StatsSnapshot {
  const allSessions = [...sessions]
  const format = formatter(query.timeZone)
  const days = datesBetween(query.from, query.to).map(newDay)
  const byDate = new Map(days.map(day => [day.date, day]))
  const activeSessionsByDay = new Map<string, Set<string>>()
  const models = new Map<string, ModelStats>()
  const sessionIds = new Set<string>()
  const activeDates = new Set<string>()
  const totals = { tokens: 0, sessions: 0, messages: 0, activeDays: 0, currentStreak: 0, ...ZERO_TOKENS() }
  const allTimeTotals = { tokens: 0, sessions: 0, messages: 0, activeDays: 0, currentStreak: 0, ...ZERO_TOKENS() }
  const allTimeModels = new Map<string, ModelStats>()
  const allTimeSessionIds = new Set<string>()
  const allTimeActiveDates = new Set<string>()

  for (const session of allSessions) {
    if (!inScope(session, query)) continue
    let sessionActive = false
    let allTimeSessionActive = false
    for (const activity of session.activities) {
      const dayKey = dateKey(activity.time, format)
      allTimeTotals.messages += 1
      allTimeSessionActive = true
      allTimeActiveDates.add(dayKey)
      if (activity.kind === 'assistant' && activity.tokens !== undefined) {
        const provider = activity.provider ?? 'unknown'
        const model = activity.model ?? 'unknown'
        const key = `${provider}/${model}`
        let modelStats = allTimeModels.get(key)
        if (modelStats === undefined) {
          modelStats = { key, provider, model, tokens: 0, calls: 0, percent: 0, ...ZERO_TOKENS() }
          allTimeModels.set(key, modelStats)
        }
        const amount = addTokens(modelStats, activity.tokens)
        modelStats.tokens += amount
        modelStats.calls += 1
        allTimeTotals.tokens += amount
        addTokens(allTimeTotals, activity.tokens)
      }
      const day = byDate.get(dayKey)
      if (day === undefined) continue
      day.messages += 1
      totals.messages += 1
      sessionActive = true
      activeDates.add(dayKey)
      let daySessions = activeSessionsByDay.get(dayKey)
      if (daySessions === undefined) activeSessionsByDay.set(dayKey, daySessions = new Set())
      daySessions.add(session.id)
      if (activity.kind !== 'assistant' || activity.tokens === undefined) continue
      day.calls += 1
      const provider = activity.provider ?? 'unknown'
      const model = activity.model ?? 'unknown'
      const key = `${provider}/${model}`
      let modelStats = models.get(key)
      if (modelStats === undefined) {
        modelStats = { key, provider, model, tokens: 0, calls: 0, percent: 0, ...ZERO_TOKENS() }
        models.set(key, modelStats)
      }
      const amount = addTokens(modelStats, activity.tokens)
      modelStats.tokens += amount
      modelStats.calls += 1
      day.tokens += amount
      day.models[key] = (day.models[key] ?? 0) + amount
      addTokens(day, activity.tokens)
      totals.tokens += amount
      addTokens(totals, activity.tokens)
    }
    if (sessionActive) sessionIds.add(session.id)
    if (allTimeSessionActive) allTimeSessionIds.add(session.id)
  }

  for (const day of days) day.sessions = activeSessionsByDay.get(day.date)?.size ?? 0
  totals.sessions = sessionIds.size
  totals.activeDays = activeDates.size
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const day = days[index]
    if (day === undefined || !activeDates.has(day.date)) break
    totals.currentStreak += 1
  }

  const sortedModels = [...models.values()].sort((a, b) => b.tokens - a.tokens || a.key.localeCompare(b.key))
  for (const model of sortedModels) model.percent = totals.tokens === 0 ? 0 : model.tokens / totals.tokens * 100
  allTimeTotals.sessions = allTimeSessionIds.size
  allTimeTotals.activeDays = allTimeActiveDates.size
  const todayKey = dateKey(Date.now(), format)
  const streakCursor = new Date(`${todayKey}T00:00:00Z`)
  while (allTimeActiveDates.has(streakCursor.toISOString().slice(0, 10))) {
    allTimeTotals.currentStreak += 1
    streakCursor.setUTCDate(streakCursor.getUTCDate() - 1)
  }
  const sortedAllTimeModels = [...allTimeModels.values()].sort((a, b) => b.tokens - a.tokens || a.key.localeCompare(b.key))
  for (const model of sortedAllTimeModels) model.percent = allTimeTotals.tokens === 0 ? 0 : model.tokens / allTimeTotals.tokens * 100

  const workspaceCounts = new Map<string, Set<string>>()
  for (const session of allSessions) {
    if (session.cwd === undefined) continue
    let ids = workspaceCounts.get(session.cwd)
    if (ids === undefined) workspaceCounts.set(session.cwd, ids = new Set())
    ids.add(session.id)
  }
  const workspaces = [...workspaceCounts].map(([path, ids]) => ({ path, sessions: ids.size }))
    .sort((a, b) => b.sessions - a.sessions || a.path.localeCompare(b.path))

  return {
    generatedAt: Date.now(),
    range: { from: query.from, to: query.to, timeZone: query.timeZone },
    totals,
    mostUsedModel: sortedModels[0] ?? null,
    allTime: { totals: allTimeTotals, mostUsedModel: sortedAllTimeModels[0] ?? null },
    days,
    models: sortedModels,
    workspaces,
    index: {
      sessions: allSessions.length,
      lastUpdatedAt: allSessions.length === 0 ? null : Math.max(...allSessions.map(session => session.indexedAt)),
    },
  }
}

export function collectCalls(sessions: Iterable<SessionSummary>, query: CallsFilter): CallRecord[] {
  const format = formatter(query.timeZone)
  const rows: CallRecord[] = []
  for (const session of sessions) {
    if (!inScope(session, query)) continue
    for (const activity of session.activities) {
      if (activity.kind !== 'assistant') continue
      if (query.model !== undefined && activity.model !== query.model) continue
      if (query.provider !== undefined && activity.provider !== query.provider) continue
      const tokens = activity.tokens ?? ZERO_TOKENS()
      if (query.minInputTokens !== undefined && tokens.input < query.minInputTokens) continue
      if (query.minOutputTokens !== undefined && tokens.output < query.minOutputTokens) continue
      const dayKey = dateKey(activity.time, format)
      if (dayKey < query.from || dayKey > query.to) continue
      rows.push({
        key: `${session.id}:${activity.seq}`,
        seq: activity.seq,
        time: activity.time,
        sessionId: session.id,
        provider: activity.provider ?? 'unknown',
        model: activity.model ?? 'unknown',
        effort: activity.effort ?? null,
        durationMs: activity.durationMs ?? null,
        tokens,
      })
    }
  }
  rows.sort((a, b) => b.time - a.time || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
  if (rows.length > query.maxRecords) rows.length = query.maxRecords
  return rows
}

export function aggregateCalls(sessions: Iterable<SessionSummary>, query: CallsQuery): { items: CallRecord[]; total: number } {
  const rows = collectCalls(sessions, query)
  const total = rows.length
  const offset = (query.page - 1) * query.pageSize
  return { items: rows.slice(offset, offset + query.pageSize), total }
}

export function exportCsv(snapshot: StatsSnapshot): string {
  const quote = (value: string | number): string => `"${String(value).replaceAll('"', '""')}"`
  const header = ['date', 'model', 'provider', 'tokens', 'input', 'output', 'cache_read', 'cache_write', 'messages', 'sessions']
  const rows: string[][] = []
  for (const day of snapshot.days) {
    const entries = Object.entries(day.models)
    if (entries.length === 0) rows.push([day.date, '', '', '0', '0', '0', '0', '0', String(day.messages), String(day.sessions)])
    for (const [key, tokens] of entries) {
      const model = snapshot.models.find(item => item.key === key)
      rows.push([day.date, model?.model ?? key, model?.provider ?? '', String(tokens), '', '', '', '', String(day.messages), String(day.sessions)])
    }
  }
  return [header, ...rows].map(row => row.map(quote).join(',')).join('\r\n')
}

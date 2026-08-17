import { describe, expect, it } from 'vitest'
import type { SessionEvent, SessionHeader } from '@deepseek-ai/dsh-session'
import { activityFromEvent, aggregateCalls, aggregateStats, appendActivity, newCollectState, summarizeSession } from '../src/core.js'
import type { SessionSummary } from '../src/types.js'

const header = {
  version: 0,
  id: 's-main',
  createdAt: Date.parse('2026-08-01T00:00:00Z'),
  cwd: 'D:\\work',
} as unknown as SessionHeader

function human(seq: number, time: string): SessionEvent {
  return {
    type: 'user/message', seq, time: Date.parse(time), surfaceOp: 'append',
    data: { id: `m${seq}`, role: 'user', content: [], source: { kind: 'user' } },
  } as unknown as SessionEvent
}

function synthetic(seq: number, time: string): SessionEvent {
  return {
    type: 'user/message', seq, time: Date.parse(time), surfaceOp: 'append',
    data: { id: `m${seq}`, role: 'user', content: [], source: { kind: 'plugin', plugin: 'test' } },
  } as unknown as SessionEvent
}

function assistant(seq: number, time: string): SessionEvent {
  return {
    type: 'assistant/message', seq, time: Date.parse(time), surfaceOp: 'append',
    data: {
      turn: 0, step: 0,
      message: { id: `m${seq}`, role: 'assistant', content: [], source: { kind: 'model', provider: 'deepseek', model: 'deepseek-chat' } },
      usage: { inputTokens: 100, outputTokens: 40, cacheReadTokens: 20, cacheWriteTokens: 10, reasoningTokens: 5 },
    },
  } as unknown as SessionEvent
}

function marker(type: 'session/end-seed' | 'subagent/descriptor', seq: number): SessionEvent {
  return { type, seq, time: Date.parse(`2026-08-01T01:00:${String(seq).padStart(2, '0')}Z`), data: {} } as unknown as SessionEvent
}

describe('usage statistics core', () => {
  it('never counts synthetic injected user context as a human message', () => {
    expect(activityFromEvent(synthetic(0, '2026-08-01T01:00:00Z'))).toBeNull()
    expect(activityFromEvent(human(1, '2026-08-01T01:00:00Z'))?.kind).toBe('human')
  })

  it('attributes disjoint token buckets without double-counting reasoning', () => {
    const summary = summarizeSession(header, [human(0, '2026-08-01T01:00:00Z'), assistant(1, '2026-08-01T01:01:00Z')])
    const result = aggregateStats([summary], { from: '2026-08-01', to: '2026-08-02', timeZone: 'UTC', scope: 'all' })
    expect(result.totals.tokens).toBe(170)
    expect(result.totals.reasoning).toBe(5)
    expect(result.totals.messages).toBe(2)
    expect(result.days[0]?.calls).toBe(1)
    expect(result.models[0]).toMatchObject({ provider: 'deepseek', model: 'deepseek-chat', tokens: 170 })
  })

  it('projects events to counters without retaining message or tool content', () => {
    const source = assistant(1, '2026-08-01T01:01:00Z') as SessionEvent & { secret?: string }
    source.secret = 'must-not-survive'
    const activity = activityFromEvent(source)
    expect(activity).toEqual({
      seq: 1,
      time: Date.parse('2026-08-01T01:01:00Z'),
      kind: 'assistant',
      provider: 'deepseek',
      model: 'deepseek-chat',
      tokens: { input: 100, output: 40, cacheRead: 20, cacheWrite: 10, reasoning: 5 },
    })
    expect(JSON.stringify(activity)).not.toContain('must-not-survive')
  })

  it('normalizes invalid token counters instead of poisoning aggregates', () => {
    const event = assistant(1, '2026-08-01T01:01:00Z') as unknown as { data: { usage: Record<string, number> } }
    event.data.usage = { inputTokens: Number.NaN, outputTokens: -4, cacheReadTokens: Number.POSITIVE_INFINITY, cacheWriteTokens: 1.9, reasoningTokens: 2.8 }
    const activity = activityFromEvent(event as unknown as SessionEvent)
    expect(activity?.tokens).toEqual({ input: 0, output: 0, cacheRead: 0, cacheWrite: 1, reasoning: 2 })
  })

  it('updates a cached session monotonically and ignores duplicate events', () => {
    const summary: SessionSummary = { id: 's-main', createdAt: 0, lastSeq: -1, indexedAt: 0, activities: [] }
    expect(appendActivity(summary, human(0, '2026-08-01T01:00:00Z'), 1234)).toBe(true)
    expect(summary.indexedAt).toBe(1234)
    expect(appendActivity(summary, human(0, '2026-08-01T01:00:00Z'))).toBe(false)
    expect(summary.activities).toHaveLength(1)
  })

  it('filters main tasks, subtasks, and workspaces', () => {
    const main = summarizeSession(header, [human(0, '2026-08-01T01:00:00Z')])
    const sub = { ...main, id: 's-sub', parentSession: 's-main', cwd: 'D:\\other' }
    const mainOnly = aggregateStats([main, sub], { from: '2026-08-01', to: '2026-08-01', timeZone: 'UTC', scope: 'main' })
    const subOnly = aggregateStats([main, sub], { from: '2026-08-01', to: '2026-08-01', timeZone: 'UTC', scope: 'subtasks' })
    const workspace = aggregateStats([main, sub], { from: '2026-08-01', to: '2026-08-01', timeZone: 'UTC', scope: 'all', workspace: 'D:\\other' })
    expect(mainOnly.totals.sessions).toBe(1)
    expect(subOnly.totals.sessions).toBe(1)
    expect(workspace.totals.sessions).toBe(1)
  })

  it('keeps overview totals all-time while chart totals follow the selected range', () => {
    const summary = summarizeSession(header, [
      human(0, '2026-07-01T01:00:00Z'), assistant(1, '2026-07-01T01:01:00Z'),
      human(2, '2026-08-01T01:00:00Z'), assistant(3, '2026-08-01T01:01:00Z'),
    ])
    const result = aggregateStats([summary], { from: '2026-08-01', to: '2026-08-01', timeZone: 'UTC', scope: 'all' })
    expect(result.totals).toMatchObject({ tokens: 170, messages: 2, activeDays: 1 })
    expect(result.allTime.totals).toMatchObject({ tokens: 340, messages: 4, activeDays: 2, sessions: 1 })
    expect(result.allTime.mostUsedModel).toMatchObject({ model: 'deepseek-chat', tokens: 340 })
  })

  it('excludes the inherited fork prefix from child usage', () => {
    const child = { ...header, id: 's-child', parentSession: 's-main', seedLength: 2 } as unknown as SessionHeader
    const summary = summarizeSession(child, [
      human(0, '2026-08-01T01:00:00Z'),
      assistant(1, '2026-08-01T01:00:01Z'),
      marker('session/end-seed', 2),
      human(3, '2026-08-01T01:00:03Z'),
      assistant(4, '2026-08-01T01:00:04Z'),
    ])

    expect(summary.activities.map(activity => activity.seq)).toEqual([3, 4])
    const result = aggregateStats([summary], { from: '2026-08-01', to: '2026-08-01', timeZone: 'UTC', scope: 'subtasks' })
    expect(result.totals).toMatchObject({ tokens: 170, messages: 2 })
  })

  it('keeps all child-owned usage across repeated resume boundaries', () => {
    const child = { ...header, id: 's-child', parentSession: 's-main', seedLength: 1 } as unknown as SessionHeader
    const summary = summarizeSession(child, [
      assistant(0, '2026-08-01T01:00:00Z'),
      marker('session/end-seed', 1),
      assistant(2, '2026-08-01T01:00:02Z'),
      marker('session/end-seed', 3),
      assistant(4, '2026-08-01T01:00:04Z'),
    ])

    expect(summary.activities.map(activity => activity.seq)).toEqual([2, 4])
  })

  it('does not treat repeated subagent descriptors as ownership boundaries', () => {
    const child = { ...header, id: 's-child', parentSession: 's-main', seedLength: 1 } as unknown as SessionHeader
    const summary = summarizeSession(child, [
      assistant(0, '2026-08-01T01:00:00Z'),
      marker('subagent/descriptor', 1),
      assistant(2, '2026-08-01T01:00:02Z'),
      marker('subagent/descriptor', 3),
      assistant(4, '2026-08-01T01:00:04Z'),
    ])

    expect(summary.activities.map(activity => activity.seq)).toEqual([2, 4])
  })

  it('keeps child events when no inherited seed exists', () => {
    const child = { ...header, id: 's-child', parentSession: 's-main', seedLength: 0 } as unknown as SessionHeader
    const legacyChild = { ...header, id: 's-legacy-child', parentSession: 's-main' } as unknown as SessionHeader

    expect(summarizeSession(child, [assistant(0, '2026-08-01T01:00:00Z')]).activities).toHaveLength(1)
    expect(summarizeSession(legacyChild, [assistant(0, '2026-08-01T01:00:00Z')]).activities).toHaveLength(1)
  })

  it('never applies a seed boundary to root sessions', () => {
    const rootWithSeedMetadata = { ...header, seedLength: 5 } as unknown as SessionHeader
    const summary = summarizeSession(rootWithSeedMetadata, [assistant(0, '2026-08-01T01:00:00Z')])
    expect(summary.activities).toHaveLength(1)
  })
})

function stepStart(seq: number, time: string, turn = 0, step = 0): SessionEvent {
  return { type: 'step/start', seq, time: Date.parse(time), surfaceOp: 'append', data: { turn, step } } as unknown as SessionEvent
}

function requestHeader(seq: number, effort: string): SessionEvent {
  return { type: 'request/header', seq, time: Date.parse('2026-08-01T01:00:00Z'), data: { header: { config: { reasoningEffort: effort } } } } as unknown as SessionEvent
}

function timedAssistant(seq: number, time: string, turn = 0, step = 0): SessionEvent {
  return {
    type: 'assistant/message', seq, time: Date.parse(time), surfaceOp: 'append',
    data: { turn, step, message: { id: `m${seq}`, role: 'assistant', content: [], source: { kind: 'model', provider: 'deepseek', model: 'deepseek-chat' } }, usage: { inputTokens: 1000, outputTokens: 200, cacheReadTokens: 100, cacheWriteTokens: 0, reasoningTokens: 10 } },
  } as unknown as SessionEvent
}

describe('per-call detail (calls)', () => {
  it('pairs step timing and reasoning effort from a replayed session', () => {
    const summary = summarizeSession(header, [
      stepStart(1, '2026-08-01T01:00:00Z'),
      requestHeader(2, 'medium'),
      timedAssistant(3, '2026-08-01T01:00:12Z'),
    ])
    const activity = summary.activities[0]
    expect(activity?.durationMs).toBe(12_000)
    expect(activity?.effort).toBe('medium')
  })

  it('leaves durationMs and effort absent without a paired start or header', () => {
    const summary = summarizeSession(header, [timedAssistant(1, '2026-08-01T01:00:00Z')])
    expect(summary.activities[0]?.durationMs).toBeUndefined()
    expect(summary.activities[0]?.effort).toBeUndefined()
  })

  it('keeps the latest reasoning effort until a new request header changes it', () => {
    const summary = summarizeSession(header, [
      stepStart(1, '2026-08-01T01:00:00Z'),
      requestHeader(2, 'medium'),
      timedAssistant(3, '2026-08-01T01:00:12Z'),
      stepStart(4, '2026-08-01T01:01:00Z', 1),
      timedAssistant(5, '2026-08-01T01:01:05Z', 1),
    ])
    expect(summary.activities[0]?.effort).toBe('medium')
    expect(summary.activities[1]?.effort).toBe('medium')
  })

  it('pairs live events per session without cross-session bleed', () => {
    const summaryA: SessionSummary = { ...summarizeSession(header, []), id: 'A', lastSeq: -1, activities: [] }
    const summaryB: SessionSummary = { ...summarizeSession(header, []), id: 'B', lastSeq: -1, activities: [] }
    const stateA = newCollectState()
    const stateB = newCollectState()
    expect(appendActivity(summaryA, stepStart(1, '2026-08-01T01:00:00Z'), Date.now(), stateA)).toBe(true)
    expect(appendActivity(summaryB, stepStart(1, '2026-08-01T02:00:00Z'), Date.now(), stateB)).toBe(true)
    expect(appendActivity(summaryA, timedAssistant(2, '2026-08-01T01:00:10Z'), Date.now(), stateA)).toBe(true)
    expect(appendActivity(summaryB, timedAssistant(2, '2026-08-01T02:00:05Z'), Date.now(), stateB)).toBe(true)
    expect(summaryA.activities[0]?.durationMs).toBe(10_000)
    expect(summaryB.activities[0]?.durationMs).toBe(5_000)
  })

  it('ignores duplicate out-of-order events without clobbering the open step', () => {
    const summary = summarizeSession(header, [stepStart(1, '2026-08-01T01:00:00Z'), stepStart(1, '2026-08-01T01:00:00Z')])
    expect(summary.activities).toHaveLength(0)
    const live: SessionSummary = { ...summarizeSession(header, []), lastSeq: 2, activities: [] }
    expect(appendActivity(live, stepStart(1, '2026-08-01T01:00:00Z'))).toBe(false)
  })

  it('filters calls by model, provider, and token thresholds with stable keys', () => {
    const summary = summarizeSession(header, [stepStart(1, '2026-08-01T01:00:00Z'), requestHeader(2, 'medium'), timedAssistant(3, '2026-08-01T01:00:12Z')])
    const query = { from: '2026-08-01', to: '2026-08-02', timeZone: 'UTC', scope: 'all' as const, model: 'deepseek-chat', provider: 'deepseek', minInputTokens: 500, minOutputTokens: 100, maxRecords: 1_000, page: 1, pageSize: 50 }
    const result = aggregateCalls([summary], query)
    expect(result.total).toBe(1)
    expect(result.items[0]?.key).toBe(`${summary.id}:3`)
    expect(result.items[0]?.durationMs).toBe(12_000)
    expect(result.items[0]?.effort).toBe('medium')
    const filtered = aggregateCalls([summary], { ...query, minInputTokens: 5000 })
    expect(filtered.total).toBe(0)
  })

  it('paginates calls in stable newest-first order', () => {
    const summary = summarizeSession(header, [
      timedAssistant(1, '2026-08-01T01:00:00Z'),
      timedAssistant(2, '2026-08-01T02:00:00Z'),
      timedAssistant(3, '2026-08-01T03:00:00Z'),
    ])
    const query = {
      from: '2026-08-01', to: '2026-08-01', timeZone: 'UTC', scope: 'all' as const,
      model: undefined, provider: undefined, minInputTokens: undefined, minOutputTokens: undefined,
      maxRecords: 1_000, page: 1, pageSize: 2,
    }
    const first = aggregateCalls([summary], query)
    const second = aggregateCalls([summary], { ...query, page: 2 })
    expect(first.total).toBe(3)
    expect(first.items.map(item => item.seq)).toEqual([3, 2])
    expect(second.items.map(item => item.seq)).toEqual([1])
  })

  it('keeps only the configured number of newest call-detail records', () => {
    const summary = summarizeSession(header, [
      timedAssistant(1, '2026-08-01T01:00:00Z'),
      timedAssistant(2, '2026-08-01T02:00:00Z'),
      timedAssistant(3, '2026-08-01T03:00:00Z'),
    ])
    const result = aggregateCalls([summary], {
      from: '2026-08-01', to: '2026-08-01', timeZone: 'UTC', scope: 'all',
      model: undefined, provider: undefined, minInputTokens: undefined, minOutputTokens: undefined,
      maxRecords: 2, page: 1, pageSize: 50,
    })
    expect(result.total).toBe(2)
    expect(result.items.map(item => item.seq)).toEqual([3, 2])
    expect(aggregateStats([summary], { from: '2026-08-01', to: '2026-08-01', timeZone: 'UTC', scope: 'all' }).days[0]?.calls).toBe(3)
  })
})

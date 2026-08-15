import { describe, expect, it } from 'vitest'
import { aggregateStats, exportCsv } from '../src/core.js'
import { Config } from '../src/index.js'
import { buildPricingTable, estimateCost, priceForTime, resolvePricing } from '../src/pricing.js'
import type { PriceEntry } from '../src/pricing.js'
import type { ActivityRecord, SessionSummary } from '../src/types.js'

const act = (time: number, provider: string, model: string, tokens: { input: number; output: number; cacheRead: number; cacheWrite?: number; reasoning?: number }): ActivityRecord => ({
  seq: 1, time, kind: 'assistant', provider, model,
  tokens: { input: tokens.input, output: tokens.output, cacheRead: tokens.cacheRead, cacheWrite: tokens.cacheWrite ?? 0, reasoning: tokens.reasoning ?? 0 },
})

const summary = (id: string, activities: ActivityRecord[]): SessionSummary => ({
  id, createdAt: activities[0]?.time ?? Date.now(), lastSeq: 999, indexedAt: Date.now(), activities,
})

const QUERY = { from: '2026-08-01', to: '2026-08-31', timeZone: 'UTC', scope: 'all' as const }

// 北京时 2026-08-10 10:00 = 2026-08-10T02:00:00Z（调价前，平峰价）
const before = Date.parse('2026-08-10T02:00:00Z')
// 北京时 2026-08-17 10:00 = 2026-08-17T02:00:00Z（调价后高峰）
const peak = Date.parse('2026-08-17T02:00:00Z')
// 北京时 2026-08-17 20:00 = 2026-08-17T12:00:00Z（调价后空闲）
const offPeak = Date.parse('2026-08-17T12:00:00Z')

describe('pricing: built-in DeepSeek rates', () => {
  it('charges flat pre-adjustment rates before 2026-08-17', () => {
    const snap = aggregateStats([
      summary('s1', [act(before, 'deepseek-official', 'deepseek-v4-flash', { input: 1_000_000, output: 500_000, cacheRead: 4_000_000 })]),
    ], QUERY, buildPricingTable(), '¥')
    // 1*1 + 0.5*2 + 4*0.02 = 2.08
    expect(snap.currency).toBe('¥')
    expect(snap.allTime.totals.cost).toBeCloseTo(2.08)
    expect(snap.totals.cost).toBeCloseTo(2.08)
    expect(snap.models[0]?.cost).toBeCloseTo(2.08)
    expect(snap.days[9]?.cost).toBeCloseTo(2.08)
    expect(snap.days[9]?.modelCosts['deepseek-official/deepseek-v4-flash']).toBeCloseTo(2.08)
  })

  it('applies peak/off-peak rates after 2026-08-17 and prices unknown models at 0', () => {
    const snap = aggregateStats([
      summary('s2', [
        act(peak, 'deepseek-official', 'deepseek-v4-flash', { input: 1_000_000, output: 1_000_000, cacheRead: 1_000_000 }),
        act(offPeak, 'deepseek-official', 'deepseek-v4-flash', { input: 1_000_000, output: 1_000_000, cacheRead: 1_000_000 }),
        act(peak, 'deepseek-official', 'deepseek-v4-pro', { input: 1_000_000, output: 100_000, cacheRead: 1_000_000 }),
        act(before, 'openrouter', 'gpt-5', { input: 1_000_000, output: 1_000_000, cacheRead: 0 }),
      ]),
    ], QUERY, buildPricingTable(), '¥')
    // flash 高峰: 1*3 + 1*9 + 1*0.1 = 12.1 ; flash 空闲: 1*1.5 + 1*4.5 + 1*0.05 = 6.05
    // pro 高峰: 1*9 + 0.1*27 + 1*0.3 = 12.0 ; gpt-5 未定价 = 0
    expect(snap.allTime.totals.cost).toBeCloseTo(12.1 + 6.05 + 12.0, 6)
    expect(snap.models.find(m => m.model === 'gpt-5')?.cost ?? -1).toBe(0)
  })

  it('never double-counts reasoning (billed inside output) or cacheWrite', () => {
    const snap = aggregateStats([
      summary('s3', [act(before, 'deepseek-official', 'deepseek-v4-flash', { input: 0, output: 1_000_000, cacheRead: 0, cacheWrite: 1_000_000, reasoning: 500_000 })]),
    ], QUERY, buildPricingTable(), '¥')
    // 1M 输出 * 2 = 2.0；cacheWrite 与 reasoning 均按 0 计
    expect(snap.allTime.totals.cost).toBeCloseTo(2.0)
  })
})

describe('pricing: configuration', () => {
  it('merges user overrides onto built-in entries field-wise', () => {
    const table = buildPricingTable({ 'deepseek-v4-flash': { output: 9 } })
    const entry = table.get('deepseek-v4-flash')
    expect(entry?.output).toBe(9)
    expect(entry?.input).toBe(1)
    expect(entry?.cacheRead).toBe(0.02)
  })

  it('accepts custom models as-is and prefers "provider/model" keys', () => {
    const table = buildPricingTable({
      'openrouter/gpt-5': { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0, reasoning: 0 },
      'gpt-5': { input: 9, output: 9, cacheRead: 9, cacheWrite: 0, reasoning: 0 },
    })
    expect(resolvePricing('openrouter', 'gpt-5', table)?.input).toBe(1.25)
    expect(resolvePricing('other', 'gpt-5', table)?.input).toBe(9)
    expect(resolvePricing('openrouter', 'unknown-model', table)).toBeNull()
  })

  it('supports custom peak/off-peak schedules', () => {
    const table = buildPricingTable({
      'my-model': {
        input: 1, output: 2, cacheRead: 0, cacheWrite: 0, reasoning: 0,
        peak: { input: 4, output: 8 }, offPeak: { input: 2, output: 4 },
        peakHours: [[9, 12]], peakTimeZone: 'Asia/Shanghai', offPeakSince: '2026-08-17',
      },
    })
    expect(estimateCost(table.get('my-model') ?? null, { input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheWrite: 0, reasoning: 0 }, peak)).toBeCloseTo(12) // 高峰 4+8
    expect(estimateCost(table.get('my-model') ?? null, { input: 1_000_000, output: 1_000_000, cacheRead: 0, cacheWrite: 0, reasoning: 0 }, offPeak)).toBeCloseTo(6) // 空闲 2+4
  })

  it('keeps flat pricing when no peak/off-peak fields are configured', () => {
    const entry: PriceEntry = { input: 1, output: 2, cacheRead: 0, cacheWrite: 0, reasoning: 0 }
    expect(priceForTime(entry, peak)).toBe(entry)
  })

  it('accepts partial configs in the Config schema', () => {
    expect(() => Config()).not.toThrow()
    expect(() => Config({ pricing: { 'deepseek-v4-flash': { output: 9 } }, currencySymbol: '$' })).not.toThrow()
    expect(() => Config({ pricing: { 'my-model': { input: 0.5, output: 1 } } })).not.toThrow()
    expect(() => Config({ pricing: { 'deepseek-v4-flash': { peak: { input: 3 }, offPeak: { input: 1 } } } })).not.toThrow()
  })
})

describe('pricing: CSV export', () => {
  it('includes a cost column with the per-day per-model estimate', () => {
    const snap = aggregateStats([
      summary('s4', [act(before, 'deepseek-official', 'deepseek-v4-flash', { input: 1_000_000, output: 0, cacheRead: 0 })]),
    ], QUERY, buildPricingTable(), '¥')
    const csv = exportCsv(snap)
    expect(csv.split('\r\n')[0]).toContain('cost')
    const dataRow = csv.split('\r\n').find(line => line.includes('deepseek-v4-flash'))
    expect(dataRow?.split(',')[8]?.replaceAll('"', '')).toBe('1')
  })
})

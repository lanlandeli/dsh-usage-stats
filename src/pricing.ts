import type { TokenBreakdown } from './types.js'

/**
 * Per-1M-token rates in currency units (e.g. ¥ / 1M tokens).
 */
export interface PriceRates {
  /** Input tokens (cache miss) price per 1M tokens. */
  input: number
  /** Output tokens price per 1M tokens. */
  output: number
  /** Cache-hit input tokens price per 1M tokens. */
  cacheRead: number
  /** Cache-write tokens price per 1M tokens. */
  cacheWrite: number
  /** Reasoning tokens price per 1M tokens (usually 0; included in output). */
  reasoning: number
}

/**
 * Per-model price entry. Optionally carries peak/off-peak rates that apply
 * from `offPeakSince` (local date in `peakTimeZone`) onward.
 */
export interface PriceEntry extends PriceRates {
  /** Peak-hour price set after offPeakSince (same fields as above). */
  peak?: Partial<PriceRates>
  /** Off-peak price set after offPeakSince (same fields as above). */
  offPeak?: Partial<PriceRates>
  /** Peak hour ranges in peakTimeZone, e.g. [[9,12],[14,18]] (half-open). */
  peakHours?: [number, number][]
  /** Time zone used to evaluate peak/off-peak hours. */
  peakTimeZone?: string
  /** Local date (peakTimeZone) from which peak/off-peak pricing applies. */
  offPeakSince?: string
}

export type PricingTable = Map<string, PriceEntry>

const PEAK_SCHEDULE = {
  peakHours: [[9, 12], [14, 18]] as [number, number][],
  peakTimeZone: 'Asia/Shanghai',
  offPeakSince: '2026-08-17',
}

/**
 * Built-in DeepSeek pricing (¥ / 1M tokens), from the official pricing docs.
 * DeepSeek switched to peak/off-peak pricing on 2026-08-17 (Beijing time):
 * peak hours 9–12 and 14–18 charge 3× the pre-adjustment rate; off-peak
 * charges half of the peak rate (i.e. 1.5× the pre-adjustment rate).
 * `cacheWrite` and `reasoning` are not billed separately (reasoning is part
 * of output; cache write is free), so they default to 0.
 */
const BUILTIN_PRICING: Record<string, PriceEntry> = {
  'deepseek-v4-flash': {
    input: 1,
    output: 2,
    cacheRead: 0.02,
    cacheWrite: 0,
    reasoning: 0,
    peak: { input: 3, output: 9, cacheRead: 0.1, cacheWrite: 0, reasoning: 0 },
    offPeak: { input: 1.5, output: 4.5, cacheRead: 0.05, cacheWrite: 0, reasoning: 0 },
    ...PEAK_SCHEDULE,
  },
  'deepseek-v4-pro': {
    input: 3,
    output: 6,
    cacheRead: 0.025,
    cacheWrite: 0,
    reasoning: 0,
    peak: { input: 9, output: 27, cacheRead: 0.3, cacheWrite: 0, reasoning: 0 },
    offPeak: { input: 4.5, output: 13.5, cacheRead: 0.15, cacheWrite: 0, reasoning: 0 },
    ...PEAK_SCHEDULE,
  },
}

/**
 * Merge user-supplied pricing over the built-in table. Keys may be
 * "provider/model" or "model"; built-in entries are merged field-wise,
 * unknown keys are used as-is.
 */
export function buildPricingTable(custom: Record<string, Partial<PriceEntry>> = {}): PricingTable {
  const table = new Map<string, PriceEntry>()
  for (const [key, entry] of Object.entries(BUILTIN_PRICING)) table.set(key, entry)
  for (const [key, entry] of Object.entries(custom)) {
    const previous = table.get(key)
    if (previous !== undefined && key in BUILTIN_PRICING) table.set(key, { ...previous, ...entry })
    else table.set(key, entry as PriceEntry)
  }
  return table
}

export function resolvePricing(provider: string, model: string, table: PricingTable | null): PriceEntry | null {
  if (table === undefined || table === null) return null
  const byKey = table.get(`${provider}/${model}`)
  if (byKey !== undefined) return byKey
  return table.get(model) ?? null
}

function hasRates(entry: Partial<PriceRates> | undefined): boolean {
  return entry !== undefined && entry !== null && typeof entry === 'object'
    && Object.values(entry).some(value => typeof value === 'number' && value > 0)
}

const PEAK_FORMATTERS = new Map<string, Intl.DateTimeFormat>()

function zoneParts(time: number, timeZone: string): { date: string; hour: number } {
  let format = PEAK_FORMATTERS.get(timeZone)
  if (format === undefined) {
    try {
      format = new Intl.DateTimeFormat('en-CA', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', hourCycle: 'h23', hour12: false,
      })
    } catch {
      format = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', hourCycle: 'h23', hour12: false,
      })
    }
    PEAK_FORMATTERS.set(timeZone, format)
  }
  const parts = format.formatToParts(new Date(time))
  const get = (type: Intl.DateTimeFormatPartTypes): number => Number(parts.find(part => part.type === type)?.value ?? 0)
  return {
    date: `${String(get('year')).padStart(4, '0')}-${String(get('month')).padStart(2, '0')}-${String(get('day')).padStart(2, '0')}`,
    hour: get('hour'),
  }
}

/**
 * Pick the rates that apply to a call at `time`: the flat entry before
 * `offPeakSince`, otherwise peak/off-peak rates by local hour.
 */
export function priceForTime(entry: PriceEntry, time: number): PriceRates {
  if (typeof entry.offPeakSince !== 'string' || entry.offPeakSince.length === 0) return entry
  if (!Array.isArray(entry.peakHours) || typeof entry.peakTimeZone !== 'string') return entry
  const peak = hasRates(entry.peak) ? entry.peak : undefined
  const offPeak = hasRates(entry.offPeak) ? entry.offPeak : undefined
  if (peak === undefined && offPeak === undefined) return entry
  const parts = zoneParts(time, entry.peakTimeZone)
  if (parts.date < entry.offPeakSince) return entry
  const inPeak = entry.peakHours.some(([from, to]) => parts.hour >= from && parts.hour < to)
  return inPeak ? { ...entry, ...(peak ?? {}) } : { ...entry, ...(offPeak ?? {}) }
}

/**
 * Estimated cost of one call in currency units (¥ by default):
 * sum(tokens × rate) / 1_000_000. Unknown/unpriced models cost 0.
 */
export function estimateCost(entry: PriceEntry | null, tokens: TokenBreakdown, time = 0): number {
  if (entry === undefined || entry === null) return 0
  const price = priceForTime(entry, time)
  return ((tokens.input ?? 0) * (price.input ?? 0)
    + (tokens.output ?? 0) * (price.output ?? 0)
    + (tokens.cacheRead ?? 0) * (price.cacheRead ?? 0)
    + (tokens.cacheWrite ?? 0) * (price.cacheWrite ?? 0)
    + (tokens.reasoning ?? 0) * (price.reasoning ?? 0)) / 1e6
}

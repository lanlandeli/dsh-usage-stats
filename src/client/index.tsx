import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { CallRecord, CallsPage, StatsSnapshot, TaskScope } from '../types.js'
import { formatDateLabel, installLocale, useLocale, type I18nKey } from './i18n.js'
import { styles } from './styles.js'

export const inject = ['slots', 'locale']

type IconName = 'chart' | 'close' | 'back' | 'download' | 'tokens' | 'chat' | 'message' | 'calendar' | 'streak' | 'model'

function Icon({ name, size = 18 }: { name: IconName; size?: number }): ReactNode {
  const paths: Record<IconName, ReactNode> = {
    chart: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    back: <><path d="m15 18-6-6 6-6" /><path d="M9 12h11" /></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" /></>,
    tokens: <><path d="M13 2 5 14h7l-1 8 8-12h-7z" /></>,
    chat: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3 1.5-5A7 7 0 0 1 3 13V8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" /></>,
    message: <><path d="M4 5h16v12H8l-4 3z" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4m8-4v4M3 10h18" /></>,
    streak: <><path d="M12 22c4 0 7-3 7-7 0-5-4-8-6-12 0 4-3 6-4 8-1-2-2-3-2-5-2 2-3 5-3 8 0 5 3 8 8 8z" /></>,
    model: <><path d="M4 17 12 3l8 14-8 4zM8 17h8" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>
}

class VisibilityController {
  private open = false
  private listeners = new Set<() => void>()
  getSnapshot = (): boolean => this.open
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  show = (): void => { this.set(true) }
  hide = (): void => { this.set(false) }
  private set(value: boolean): void { if (value === this.open) return; this.open = value; for (const listener of this.listeners) listener() }
}

interface Injected {
  useVisibility: <T>(selector: (open: boolean) => T) => T
  show: () => void
  hide: () => void
}

type BoundInjected = Omit<Injected, 'useVisibility'> & {
  useVisibility: <T>(selector: (open: boolean) => T) => T
}
type FooterProps = PropsRuntime<'sidebar.footer.action'> & BoundInjected
type OverlayProps = PropsRuntime<'shell.overlay'> & BoundInjected

function FooterAction({ wide, show }: FooterProps): ReactNode {
  const { t } = useLocale()
  return <button data-usage-stats className="us-nav" data-rail={!wide} onClick={show} title={wide ? undefined : t('nav')} aria-label={t('nav')}>
    <Icon name="chart" />{wide && <span>{t('nav')}</span>}
  </button>
}

function localDate(offset = 0): string {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  const year = date.getFullYear()
  return `${year}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function compact(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { notation: value >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value)
}

function Card({ icon, label, value, detail }: { icon: IconName; label: string; value: ReactNode; detail?: string }): ReactNode {
  return <article className="us-card"><div className="us-card-label"><Icon name={icon} size={16} />{label}</div><div className="us-card-value">{value}</div>{detail && <div className="us-card-detail" title={detail}>{detail}</div>}</article>
}

interface SelectOption {
  value: string
  label: string
}

function SelectControl({ label, triggerLabel, value, options, onChange, className = '' }: { label: string; triggerLabel?: string; value: string; options: readonly SelectOption[]; onChange: (value: string) => void; className?: string }): ReactNode {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const selected = options.find(option => option.value === value) ?? options[0]
  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent): void => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    window.addEventListener('pointerdown', close)
    return () => { window.removeEventListener('pointerdown', close) }
  }, [open])
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Escape') { setOpen(false); return }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const current = Math.max(0, options.findIndex(option => option.value === value))
    const direction = event.key === 'ArrowDown' ? 1 : -1
    const next = (current + direction + options.length) % options.length
    const option = options[next]
    if (option !== undefined) onChange(option.value)
  }
  return <div className={`us-select ${className}`.trim()} ref={root} data-open={open || undefined}>
    <button type="button" className="us-select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)} onKeyDown={onKeyDown}><span>{triggerLabel ?? selected?.label ?? ''}</span><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 6.5 3.5 3 3.5-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
    {open && <div className="us-select-menu" role="listbox" aria-label={label}>{options.map(option => <button type="button" role="option" aria-selected={option.value === value} key={option.value} onClick={() => { onChange(option.value); setOpen(false) }}>{option.label}</button>)}</div>}
  </div>
}

function Heatmap({ snapshot }: { snapshot: StatsSnapshot }): ReactNode {
  const { t, lang, numberLocale } = useLocale()
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)
  const max = Math.max(1, ...snapshot.days.map(day => day.tokens))
  const level = (tokens: number): number => tokens === 0 ? 0 : Math.max(1, Math.min(5, Math.ceil(Math.log1p(tokens) / Math.log1p(max) * 5)))
  const showTip = (target: HTMLElement, text: string): void => {
    const rect = target.getBoundingClientRect()
    setTip({ x: Math.min(window.innerWidth - 150, Math.max(150, rect.left + rect.width / 2)), y: rect.top - 10, text })
  }
  return <><section className="us-panel us-heat-panel"><div className="us-panel-head"><span className="us-panel-title">{t('heatmap')}</span><span className="us-panel-note us-heat-legend"><span>{t('less')}</span>{[0,1,2,3,4,5].map(item => <i key={item} className="us-cell" data-level={item} />)}<span>{t('more')}</span></span></div><div className="us-heat-scroll"><div className="us-heat-week"><span>{t('mon')}</span><span>{t('wed')}</span><span>{t('fri')}</span></div><div className="us-heat">{snapshot.days.map(day => {
    const text = `${formatDateLabel(day.date, lang)}: ${compact(day.tokens, numberLocale)} Tokens · ${day.calls} ${t('callsSuffix')}`
    return <span className="us-cell us-cell-tip" key={day.date} data-level={level(day.tokens)} aria-label={text} tabIndex={0} onMouseEnter={event => showTip(event.currentTarget, text)} onMouseLeave={() => setTip(null)} onFocus={event => showTip(event.currentTarget, text)} onBlur={() => setTip(null)} />
  })}</div></div></section>{tip && createPortal(<div data-usage-stats className="us-floating-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>, document.body)}</>
}

function DailyChart({ snapshot }: { snapshot: StatsSnapshot }): ReactNode {
  const { t, lang, numberLocale } = useLocale()
  const [tip, setTip] = useState<{ x: number; y: number; date: string; total: number; rows: { key: string; name: string; value: number; color: string }[] } | null>(null)
  const max = Math.max(1, ...snapshot.days.map(day => day.tokens))
  const visibleModels = snapshot.models.slice(0, 6)
  const colors = ['#1684ff', '#219653', '#9368ef', '#f59e0b', '#ef5da8', '#22b8b5']
  const tickEvery = snapshot.days.length <= 8 ? 1 : Math.max(1, Math.ceil(snapshot.days.length / 7))
  const showTip = (target: HTMLElement, day: StatsSnapshot['days'][number]): void => {
    const rect = target.getBoundingClientRect()
    const rows = visibleModels.flatMap((model, index) => {
      const value = day.models[model.key] ?? 0
      return value === 0 ? [] : [{ key: model.key, name: model.model, value, color: colors[index] ?? colors[0]! }]
    })
    const halfWidth = Math.min(195, Math.max(130, window.innerWidth / 2 - 12))
    const halfHeight = (52 + rows.length * 25) / 2
    const x = Math.min(window.innerWidth - halfWidth - 12, Math.max(halfWidth + 12, rect.left + rect.width / 2))
    const preferredY = rect.top > halfHeight + 24 ? rect.top - halfHeight - 12 : rect.bottom + halfHeight + 12
    const y = Math.min(window.innerHeight - halfHeight - 12, Math.max(halfHeight + 12, preferredY))
    setTip({ x, y, date: formatDateLabel(day.date, lang), total: day.tokens, rows })
  }
  return <><section className="us-panel us-trend"><div className="us-panel-head"><span className="us-panel-title">{t('dailyTrend')}</span></div><div className="us-chart-frame"><div className="us-grid-lines"><i /><i /><i /><i /></div><div className="us-chart-scroll"><div className="us-chart" data-dense={snapshot.days.length > 14}>{snapshot.days.map((day, dayIndex) => <div className="us-bar-column" key={day.date}><div className="us-bar-wrap">{day.tokens > 0 && <div className="us-bar-hit" style={{ height: `${day.tokens / max * 100}%` }} tabIndex={0} aria-label={`${formatDateLabel(day.date, lang)}, ${compact(day.tokens, numberLocale)} tokens`} onMouseEnter={event => showTip(event.currentTarget, day)} onMouseLeave={() => setTip(null)} onFocus={event => showTip(event.currentTarget, day)} onBlur={() => setTip(null)}>{visibleModels.map((model, modelIndex) => {
    const value = day.models[model.key] ?? 0
    if (value === 0) return null
    return <i className="us-bar-segment" key={model.key} style={{ height: `${value / day.tokens * 100}%`, background: colors[modelIndex] }} />
  })}</div>}</div><span className="us-date-label">{dayIndex % tickEvery === 0 || dayIndex === snapshot.days.length - 1 ? formatDateLabel(day.date, lang) : ''}</span></div>)}</div></div></div><div className="us-legend">{visibleModels.map((model, index) => <span key={model.key}><i className="us-dot" style={{ background: colors[index] }} />{model.model}</span>)}</div></section>{tip && createPortal(<div data-usage-stats className="us-chart-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}><div className="us-chart-tip-head"><strong>{tip.date}</strong><span>{compact(tip.total, numberLocale)} tokens</span></div>{tip.rows.map(row => <div className="us-chart-tip-row" key={row.key}><i style={{ background: row.color }} /><span>{row.name}</span><b>{new Intl.NumberFormat(numberLocale).format(row.value)}</b></div>)}</div>, document.body)}</>
}

function ModelUsage({ snapshot }: { snapshot: StatsSnapshot }): ReactNode {
  const { t, numberLocale } = useLocale()
  const p1 = Math.min(100, snapshot.models[0]?.percent ?? 0)
  const p2 = Math.min(100, p1 + (snapshot.models[1]?.percent ?? 0))
  return <section className="us-panel"><div className="us-panel-head"><span className="us-panel-title">{t('modelUsage')}</span><span className="us-panel-note">{t('tokenSummary')}</span></div><div className="us-model-layout"><div className="us-donut" style={{ '--us-p1': `${p1}%`, '--us-p2': `${p2}%` } as React.CSSProperties}><div className="us-donut-center">{compact(snapshot.totals.tokens, numberLocale)}<small>tokens</small></div></div><div>{snapshot.models.slice(0, 8).map(model => <div className="us-model-row" key={model.key}><span className="us-model-name"><i className="us-dot" />{model.model}</span><span className="us-model-percent">{model.percent.toFixed(model.percent < 10 ? 1 : 0)}%</span><span className="us-model-meta">{model.provider} · {compact(model.tokens, numberLocale)} tokens · {model.calls} {t('callsCount')}</span></div>)}</div></div></section>
}

function Breakdown({ snapshot }: { snapshot: StatsSnapshot }): ReactNode {
  const { t, numberLocale } = useLocale()
  const rows = [[t('input'),snapshot.totals.input],[t('output'),snapshot.totals.output],[t('cacheRead'),snapshot.totals.cacheRead],[t('cacheWrite'),snapshot.totals.cacheWrite]] as const
  return <section className="us-panel"><div className="us-panel-head"><span className="us-panel-title">{t('tokenComposition')}</span></div><div className="us-breakdown">{rows.map(([label,value]) => <div className="us-break-item" key={label}><span>{label}</span><strong>{compact(value, numberLocale)}</strong></div>)}</div></section>
}

function formatCallTime(value: number): string {
  const d = new Date(value)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

function formatCallTokens(n: number, numberLocale: string): string {
  if (n < 1_000) return `${n} token`
  return `${new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 1 }).format(n / 1_000)}k token`
}

function formatExactTokens(n: number, numberLocale: string): string {
  return `${new Intl.NumberFormat(numberLocale).format(n)} tokens`
}

function formatExactTime(value: number, numberLocale: string): string {
  return new Intl.DateTimeFormat(numberLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(value)
}

function formatCallDuration(ms: number | null, t: (key: I18nKey) => string): string {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1_000) return t('durationSubSecond')
  const s = ms / 1_000
  if (s < 60) return `${Math.round(s * 10) / 10}s`
  const m = Math.floor(s / 60)
  return `${m}m${Math.round(s % 60)}s`
}

function callCachePercent(tokens: CallRecord['tokens'], t: (key: I18nKey, vars?: Record<string, string | number>) => string): string {
  const denominator = tokens.input + tokens.cacheRead + tokens.cacheWrite
  return denominator === 0 ? '—' : t('cacheRate', { percent: Math.round(tokens.cacheRead / denominator * 100) })
}

function formatEffort(value: string | null, t: (key: I18nKey) => string): string {
  if (value === null || value === '') return t('notRecorded')
  const labels: Partial<Record<string, I18nKey>> = { max: 'effortMax', high: 'effortHigh', medium: 'effortMedium', low: 'effortLow' }
  const key = labels[value.toLowerCase()]
  return key === undefined ? value : t(key)
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]
const PAGE_SIZE_STORAGE_KEY = 'dsh-usage-stats:calls-page-size'
const MAX_RECORD_OPTIONS = [100, 500, 1_000, 2_000, 5_000, 10_000]
const MAX_RECORD_STORAGE_KEY = 'dsh-usage-stats:calls-max-records'

function initialPageSize(): number {
  if (typeof window === 'undefined') return 5
  try {
    const saved = Number(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY))
    return PAGE_SIZE_OPTIONS.includes(saved) ? saved : 5
  } catch {
    return 5
  }
}

function initialMaxRecords(): number {
  if (typeof window === 'undefined') return 1_000
  try {
    const saved = Number(window.localStorage.getItem(MAX_RECORD_STORAGE_KEY))
    return MAX_RECORD_OPTIONS.includes(saved) ? saved : 1_000
  } catch {
    return 1_000
  }
}

function CallsPanel({ snapshot, scope, workspace, days }: { snapshot: StatsSnapshot; scope: TaskScope; workspace: string; days: number }): ReactNode {
  const { t, numberLocale } = useLocale()
  const [page, setPage] = useState(1)
  const [model, setModel] = useState('')
  const [provider, setProvider] = useState('')
  const [minInput, setMinInput] = useState('')
  const [minOutput, setMinOutput] = useState('')
  const [debouncedMinInput, setDebouncedMinInput] = useState('')
  const [debouncedMinOutput, setDebouncedMinOutput] = useState('')
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [maxRecords, setMaxRecords] = useState(initialMaxRecords)
  const [data, setData] = useState<CallsPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const range = useMemo(() => ({ from: localDate(-(days - 1)), to: localDate() }), [days])
  const query = useMemo(() => {
    const params = new URLSearchParams({ ...range, scope, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', page: String(page), pageSize: String(pageSize), maxRecords: String(maxRecords) })
    if (workspace) params.set('workspace', workspace)
    if (model) params.set('model', model)
    if (provider) params.set('provider', provider)
    if (debouncedMinInput !== '') params.set('minInputTokens', debouncedMinInput)
    if (debouncedMinOutput !== '') params.set('minOutputTokens', debouncedMinOutput)
    return params
  }, [range, scope, workspace, page, pageSize, maxRecords, model, provider, debouncedMinInput, debouncedMinOutput])
  useEffect(() => { setPage(1) }, [scope, workspace, days])
  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedMinInput(minInput); setDebouncedMinOutput(minOutput) }, 250)
    return () => { window.clearTimeout(timer) }
  }, [minInput, minOutput])
  useEffect(() => {
    try { window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(pageSize)) } catch { /* Storage may be disabled. */ }
  }, [pageSize])
  useEffect(() => {
    try { window.localStorage.setItem(MAX_RECORD_STORAGE_KEY, String(maxRecords)) } catch { /* Storage may be disabled. */ }
  }, [maxRecords])
  useEffect(() => {
    const abort = new AbortController()
    setError(null)
    fetch(`/usage-stats/v1/calls?${query}`, { signal: abort.signal, headers: { accept: 'application/json' } })
      .then(async response => { if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `HTTP ${response.status}`); return response.json() as Promise<CallsPage> })
      .then(setData).catch((reason: unknown) => { if ((reason as { name?: string }).name !== 'AbortError') setError(reason instanceof Error ? reason.message : String(reason)) })
    return () => { abort.abort() }
  }, [query])
  const modelOptions = useMemo(() => ['', ...new Set((snapshot.models ?? []).map(item => item.model))], [snapshot.models])
  const providerOptions = useMemo(() => ['', ...new Set((snapshot.models ?? []).map(item => item.provider))], [snapshot.models])
  const hasFilters = model !== '' || provider !== '' || minInput !== '' || minOutput !== ''
  const clearFilters = (): void => {
    setModel(''); setProvider(''); setMinInput(''); setMinOutput(''); setDebouncedMinInput(''); setDebouncedMinOutput(''); setPage(1)
  }
  const content: ReactNode = error ? <div className="us-state"><div><p>{t('callsLoadError')}</p><small>{error}</small></div></div>
    : data === null ? <div className="us-state"><div><div className="us-spinner" />{t('callsLoading')}</div></div>
    : !data.indexReady ? <div className="us-state">{t('callsIndexing')}</div>
    : data.items.length === 0 ? <div className="us-state">{t('callsEmpty')}</div>
    : <div className="us-calls-wrap"><table className="us-calls-table" aria-label={t('callsTitle')}><colgroup><col className="us-col-time" /><col className="us-col-duration" /><col className="us-col-token" /><col className="us-col-token" /><col className="us-col-cache" /><col className="us-col-model" /><col className="us-col-effort" /></colgroup><thead><tr><th>{t('colTime')}</th><th className="us-number">{t('colDuration')}</th><th className="us-number">{t('colInput')}</th><th className="us-number">{t('colOutput')}</th><th className="us-number">{t('colCacheRate')}</th><th>{t('colModel')}</th><th className="us-center">{t('colEffort')}</th></tr></thead><tbody>{data.items.map(item => <tr key={item.key}><td className="us-calls-time" title={formatExactTime(item.time, numberLocale)}>{formatCallTime(item.time)}</td><td className="us-number">{formatCallDuration(item.durationMs, t)}</td><td className="us-number" title={formatExactTokens(item.tokens.input, numberLocale)}>{formatCallTokens(item.tokens.input, numberLocale)}</td><td className="us-number" title={formatExactTokens(item.tokens.output, numberLocale)}>{formatCallTokens(item.tokens.output, numberLocale)}</td><td className="us-number">{callCachePercent(item.tokens, t)}</td><td className="us-calls-model" title={`${item.provider}/${item.model}`}>{item.model}</td><td className={item.effort === null ? 'us-calls-effort us-center is-empty' : 'us-calls-effort us-center'}>{formatEffort(item.effort, t)}</td></tr>)}</tbody></table><div className="us-calls-pager"><span>{t('pageInfo', { start: (page - 1) * pageSize + 1, end: Math.min(page * pageSize, data.total), total: data.total })}</span><div className="us-calls-page-buttons"><button type="button" aria-label={t('prevPage')} title={t('prevPage')} disabled={page <= 1} onClick={() => setPage(page - 1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m9.5 4-4 4 4 4" /></svg></button><button type="button" aria-label={t('nextPage')} title={t('nextPage')} disabled={!data.hasMore} onClick={() => setPage(page + 1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6.5 4 4 4-4 4" /></svg></button></div></div></div>
  return <section className="us-panel"><div className="us-panel-head"><span className="us-panel-title">{t('callsTitle')}</span><span className="us-panel-note">{t('callsNote')}</span></div><div className="us-calls-toolbar">
    <SelectControl className="us-calls-select" label={t('colModel')} value={model} options={modelOptions.map(value => ({ value, label: value === '' ? t('allModels') : value }))} onChange={value => { setModel(value); setPage(1) }} />
    <SelectControl className="us-calls-select" label={t('allProviders')} value={provider} options={providerOptions.map(value => ({ value, label: value === '' ? t('allProviders') : value }))} onChange={value => { setProvider(value); setPage(1) }} />
    <label className="us-calls-number-field"><input className="us-calls-number-input" type="text" inputMode="numeric" value={minInput} aria-label={t('minInput')} placeholder={t('minInput')} onChange={event => { setMinInput(event.target.value.replace(/\D/g, '')); setPage(1) }} /><span>{t('tokenUnit')}</span></label>
    <label className="us-calls-number-field"><input className="us-calls-number-input" type="text" inputMode="numeric" value={minOutput} aria-label={t('minOutput')} placeholder={t('minOutput')} onChange={event => { setMinOutput(event.target.value.replace(/\D/g, '')); setPage(1) }} /><span>{t('tokenUnit')}</span></label>
    {hasFilters && <button type="button" className="us-calls-clear" onClick={clearFilters}>{t('clearFilters')}</button>}
    <span className="us-spacer" />
    <SelectControl className="us-calls-select us-calls-max-records" label={t('maxRecords', { size: maxRecords.toLocaleString(numberLocale) })} triggerLabel={t('maxRecords', { size: maxRecords.toLocaleString(numberLocale) })} value={String(maxRecords)} options={MAX_RECORD_OPTIONS.map(value => ({ value: String(value), label: t('recordCount', { size: value.toLocaleString(numberLocale) }) }))} onChange={value => { setMaxRecords(Number(value)); setPage(1) }} />
    <SelectControl className="us-calls-select us-calls-page-size" label={t('perPage', { size: pageSize })} value={String(pageSize)} options={PAGE_SIZE_OPTIONS.map(value => ({ value: String(value), label: t('perPage', { size: value }) }))} onChange={value => { setPageSize(Number(value)); setPage(1) }} />
  </div>{content}</section>
}

function Dashboard({ hide }: { hide: () => void }): ReactNode {
  const { t, numberLocale } = useLocale()
  const [days, setDays] = useState(30)
  const [scope, setScope] = useState<TaskScope>('all')
  const [workspace, setWorkspace] = useState('')
  const [snapshot, setSnapshot] = useState<StatsSnapshot | null>(null)
  const [heatmap, setHeatmap] = useState<StatsSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const range = useMemo(() => ({ from: localDate(-(days - 1)), to: localDate() }), [days])
  const query = useMemo(() => {
    const params = new URLSearchParams({ ...range, scope, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' })
    if (workspace) params.set('workspace', workspace)
    return params
  }, [range, scope, workspace])
  const refresh = useCallback((signal?: AbortSignal) => {
    setError(null)
    fetch(`/usage-stats/v1/snapshot?${query}`, { signal: signal ?? null, headers: { accept: 'application/json' } })
      .then(async response => { if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? `HTTP ${response.status}`); return response.json() as Promise<StatsSnapshot> })
      .then(setSnapshot).catch((reason: unknown) => { if ((reason as { name?: string }).name !== 'AbortError') setError(reason instanceof Error ? reason.message : String(reason)) })
  }, [query])
  useEffect(() => { const abort = new AbortController(); refresh(abort.signal); return () => { abort.abort() } }, [refresh])
  useEffect(() => {
    const abort = new AbortController()
    const params = new URLSearchParams({ from: localDate(-364), to: localDate(), scope, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' })
    if (workspace) params.set('workspace', workspace)
    fetch(`/usage-stats/v1/snapshot?${params}`, { signal: abort.signal, headers: { accept: 'application/json' } })
      .then(response => response.ok ? response.json() as Promise<StatsSnapshot> : Promise.reject(new Error(`HTTP ${response.status}`)))
      .then(setHeatmap).catch((reason: unknown) => { if ((reason as { name?: string }).name !== 'AbortError') setHeatmap(null) })
    return () => { abort.abort() }
  }, [scope, workspace])
  useEffect(() => { const onKey = (event: KeyboardEvent): void => { if (event.key === 'Escape') hide() }; window.addEventListener('keydown', onKey); return () => { window.removeEventListener('keydown', onKey) } }, [hide])
  const exportUrl = (format: 'csv' | 'json'): string => `/usage-stats/v1/export.${format}?${query}`
  const workspaceOptions = useMemo<SelectOption[]>(() => [{ value: '', label: t('allWorkspaces') }, ...(snapshot?.workspaces.map(item => ({ value: item.path, label: `${item.path} (${item.sessions})` })) ?? [])], [snapshot?.workspaces, t])
  const scopeOptions: readonly SelectOption[] = [{ value: 'all', label: t('allTasks') }, { value: 'main', label: t('mainOnly') }, { value: 'subtasks', label: t('subtasksOnly') }]
  return <div data-usage-stats className="us-shell" role="dialog" aria-modal="true" aria-label={t('title')}>
    <header className="us-top"><div className="us-heading"><div className="us-title">{t('title')}</div><span className="us-tab">{t('appUsage')}</span></div><button className="us-back" onClick={hide}><Icon name="back" size={17} />{t('back')}</button></header>
    <main className="us-scroll"><div className="us-content">
      <div className="us-range-row"><span className="us-range-label">{t('rangeLabel')}</span><div className="us-segment" aria-label={t('rangeLabel')}><button aria-pressed={days === 7} onClick={() => { setDays(7) }}>{t('last7Days')}</button><button aria-pressed={days === 30} onClick={() => { setDays(30) }}>{t('last30Days')}</button></div></div>
      <div className="us-toolbar us-filterbar">
        <SelectControl label={t('workspace')} value={workspace} options={workspaceOptions} onChange={setWorkspace} />
        <SelectControl label={t('taskScope')} value={scope} options={scopeOptions} onChange={value => setScope(value as TaskScope)} />
        <span className="us-spacer" /><a className="us-export" href={exportUrl('csv')}><Icon name="download" size={15} />CSV</a><a className="us-export" href={exportUrl('json')}><Icon name="download" size={15} />JSON</a>
      </div>
      {error ? <div className="us-state"><div><p>{t('loadError')}</p><small>{error}</small></div></div> : snapshot === null ? <div className="us-state"><div><div className="us-spinner" />{t('loading')}</div></div> : <>
        <div className="us-cards"><Card icon="tokens" label={t('tokensUsage')} value={compact(snapshot.allTime.totals.tokens, numberLocale)} detail={t('inputOutputDetail', { input: compact(snapshot.allTime.totals.input, numberLocale), output: compact(snapshot.allTime.totals.output, numberLocale) })} /><Card icon="chat" label={t('sessions')} value={snapshot.allTime.totals.sessions} /><Card icon="message" label={t('messages')} value={snapshot.allTime.totals.messages} /><Card icon="calendar" label={t('activeDays')} value={snapshot.allTime.totals.activeDays} /><Card icon="streak" label={t('streak')} value={snapshot.allTime.totals.currentStreak} />{snapshot.allTime.mostUsedModel ? <Card icon="model" label={t('mostUsedModel')} value={<span style={{ fontSize: '18px' }}>{snapshot.allTime.mostUsedModel.model}</span>} detail={`${snapshot.allTime.mostUsedModel.percent.toFixed(1)}% · ${snapshot.allTime.mostUsedModel.provider}`} /> : <Card icon="model" label={t('mostUsedModel')} value={<span style={{ fontSize: '18px' }}>{t('noData')}</span>} />}</div>
        <Heatmap snapshot={heatmap ?? snapshot} /><DailyChart snapshot={snapshot} /><ModelUsage snapshot={snapshot} /><Breakdown snapshot={snapshot} /><CallsPanel snapshot={snapshot} scope={scope} workspace={workspace} days={days} />
      </>}
    </div></main>
  </div>
}

function Overlay({ useVisibility, hide }: OverlayProps): ReactNode {
  const open = useVisibility(value => value)
  return open ? <Dashboard hide={hide} /> : null
}

export function apply(ctx: ClientContext & { locale: LocaleRuntime }): void {
  const uninstallLocale = installLocale(ctx.locale)
  ctx.effect(() => uninstallLocale, 'usage-stats: locale dictionaries')
  const style = document.createElement('style')
  style.dataset.plugin = 'dsh-usage-stats'
  style.textContent = styles
  document.head.appendChild(style)
  ctx.effect(() => () => { style.remove() }, 'usage-stats: styles')
  const visibility = new VisibilityController()
  const injected = () => ({ hooks: { visibility }, show: visibility.show, hide: visibility.hide })
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'usage-stats', order: 20, inject: injected }, FooterAction))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'usage-stats', order: 20, inject: injected }, Overlay))
}

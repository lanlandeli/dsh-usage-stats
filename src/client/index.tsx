import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { StatsSnapshot, TaskScope } from '../types.js'
import { styles } from './styles.js'
import { installLocale, useLocale, formatDateLabel } from './i18n.js'
import type { LocaleFaceLike } from './i18n.js'

export const inject = ['slots', 'locale']

type IconName = 'chart' | 'close' | 'back' | 'download' | 'tokens' | 'chat' | 'message' | 'calendar' | 'streak' | 'model' | 'money'

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
    money: <><path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
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

function compact(value: number, numberLocale: string): string {
  return new Intl.NumberFormat(numberLocale, { notation: value >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(value)
}

function formatMoney(value: number, symbol: string, numberLocale: string): string {
  if (!Number.isFinite(value) || value <= 0) return `${symbol}0.00`
  if (value < 0.01) {
    const label = `${symbol}${value.toFixed(4)}`
    return label === `${symbol}0.0000` ? `${symbol}<0.0001` : label
  }
  if (value < 1000) return `${symbol}${value.toFixed(2)}`
  return `${symbol}${new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 0 }).format(value)}`
}

function Card({ icon, label, value, detail }: { icon: IconName; label: string; value: ReactNode; detail?: string }): ReactNode {
  return <article className="us-card"><div className="us-card-label"><Icon name={icon} size={16} />{label}</div><div className="us-card-value">{value}</div>{detail && <div className="us-card-detail" title={detail}>{detail}</div>}</article>
}

interface SelectOption {
  value: string
  label: string
}

function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: readonly SelectOption[]; onChange: (value: string) => void }): ReactNode {
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
  return <div className="us-select" ref={root} data-open={open || undefined}>
    <button type="button" className="us-select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen(current => !current)} onKeyDown={onKeyDown}><span>{selected?.label ?? ''}</span><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m4.5 6.5 3.5 3 3.5-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
    {open && <div className="us-select-menu" role="listbox" aria-label={label}>{options.map(option => <button type="button" role="option" aria-selected={option.value === value} key={option.value} onClick={() => { onChange(option.value); setOpen(false) }}>{option.label}</button>)}</div>}
  </div>
}

function Heatmap({ snapshot }: { snapshot: StatsSnapshot }): ReactNode {
  const { t, lang, numberLocale } = useLocale()
  const [tip, setTip] = useState<{ x: number; y: number; text: string } | null>(null)
  const max = Math.max(1, ...snapshot.days.map(day => day.tokens))
  const level = (tokens: number): number => tokens === 0 ? 0 : Math.max(1, Math.min(5, Math.ceil(Math.log1p(tokens) / Math.log1p(max) * 5)))
  const sep = lang === 'zh' ? '：' : ': '
  const showTip = (target: HTMLElement, text: string): void => {
    const rect = target.getBoundingClientRect()
    setTip({ x: Math.min(window.innerWidth - 150, Math.max(150, rect.left + rect.width / 2)), y: rect.top - 10, text })
  }
  return <><section className="us-panel us-heat-panel"><div className="us-panel-head"><span className="us-panel-title">{t('heatmap')}</span><span className="us-panel-note us-heat-legend"><span>{t('less')}</span>{[0,1,2,3,4,5].map(item => <i key={item} className="us-cell" data-level={item} />)}<span>{t('more')}</span></span></div><div className="us-heat-scroll"><div className="us-heat-week"><span>{t('mon')}</span><span>{t('wed')}</span><span>{t('fri')}</span></div><div className="us-heat">{snapshot.days.map(day => {
    const text = `${formatDateLabel(day.date, lang)}${sep}${compact(day.tokens, numberLocale)} Tokens · ${day.calls} ${t('callsSuffix')} · ${t('approx')} ${formatMoney(day.cost, snapshot.currency, numberLocale)}`
    return <span className="us-cell us-cell-tip" key={day.date} data-level={level(day.tokens)} aria-label={text} tabIndex={0} onMouseEnter={event => showTip(event.currentTarget, text)} onMouseLeave={() => setTip(null)} onFocus={event => showTip(event.currentTarget, text)} onBlur={() => setTip(null)} />
  })}</div></div></section>{tip && createPortal(<div data-usage-stats className="us-floating-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>, document.body)}</>
}

function DailyChart({ snapshot }: { snapshot: StatsSnapshot }): ReactNode {
  const { t, lang, numberLocale } = useLocale()
  const [tip, setTip] = useState<{ x: number; y: number; date: string; total: number; cost: number; currency: string; rows: { key: string; name: string; value: number; color: string }[] } | null>(null)
  const max = Math.max(1, ...snapshot.days.map(day => day.tokens))
  const visibleModels = snapshot.models.slice(0, 6)
  const colors = ['#1684ff', '#219653', '#9368ef', '#f59e0b', '#ef5da8', '#22b8b5']
  const tickEvery = snapshot.days.length <= 8 ? 1 : Math.max(1, Math.ceil(snapshot.days.length / 7))
  const dateLabel = (date: string): string => formatDateLabel(date, lang)
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
    setTip({ x, y, date: dateLabel(day.date), total: day.tokens, cost: day.cost, currency: snapshot.currency, rows })
  }
  return <><section className="us-panel us-trend"><div className="us-panel-head"><span className="us-panel-title">{t('dailyTrend')}</span></div><div className="us-chart-frame"><div className="us-grid-lines"><i /><i /><i /><i /></div><div className="us-chart-scroll"><div className="us-chart" data-dense={snapshot.days.length > 14}>{snapshot.days.map((day, dayIndex) => <div className="us-bar-column" key={day.date}><div className="us-bar-wrap">{day.tokens > 0 && <div className="us-bar-hit" style={{ height: `${day.tokens / max * 100}%` }} tabIndex={0} aria-label={`${dateLabel(day.date)}，${compact(day.tokens, numberLocale)} tokens`} onMouseEnter={event => showTip(event.currentTarget, day)} onMouseLeave={() => setTip(null)} onFocus={event => showTip(event.currentTarget, day)} onBlur={() => setTip(null)}>{visibleModels.map((model, modelIndex) => {
    const value = day.models[model.key] ?? 0
    if (value === 0) return null
    return <i className="us-bar-segment" key={model.key} style={{ height: `${value / day.tokens * 100}%`, background: colors[modelIndex] }} />
  })}</div>}</div><span className="us-date-label">{dayIndex % tickEvery === 0 || dayIndex === snapshot.days.length - 1 ? dateLabel(day.date) : ''}</span></div>)}</div></div></div><div className="us-legend">{visibleModels.map((model, index) => <span key={model.key}><i className="us-dot" style={{ background: colors[index] }} />{model.model}</span>)}</div></section>{tip && createPortal(<div data-usage-stats className="us-chart-tip" role="tooltip" style={{ left: tip.x, top: tip.y }}><div className="us-chart-tip-head"><strong>{tip.date}</strong><span>{compact(tip.total, numberLocale)} tokens · {t('approx')} {formatMoney(tip.cost, tip.currency, numberLocale)}</span></div>{tip.rows.map(row => <div className="us-chart-tip-row" key={row.key}><i style={{ background: row.color }} /><span>{row.name}</span><b>{new Intl.NumberFormat('en-US').format(row.value)}</b></div>)}</div>, document.body)}</>
}

function ModelUsage({ snapshot }: { snapshot: StatsSnapshot }): ReactNode {
  const { t, numberLocale } = useLocale()
  const p1 = Math.min(100, snapshot.models[0]?.percent ?? 0)
  const p2 = Math.min(100, p1 + (snapshot.models[1]?.percent ?? 0))
  return <section className="us-panel"><div className="us-panel-head"><span className="us-panel-title">{t('modelUsage')}</span><span className="us-panel-note">{t('tokenSummary')} · {t('costAbout')} {formatMoney(snapshot.totals.cost, snapshot.currency, numberLocale)}</span></div><div className="us-model-layout"><div className="us-donut" style={{ '--us-p1': `${p1}%`, '--us-p2': `${p2}%` } as React.CSSProperties}><div className="us-donut-center">{compact(snapshot.totals.tokens, numberLocale)}<small>tokens</small></div></div><div>{snapshot.models.slice(0, 8).map(model => <div className="us-model-row" key={model.key}><span className="us-model-name"><i className="us-dot" />{model.model}</span><span className="us-model-percent">{model.percent.toFixed(model.percent < 10 ? 1 : 0)}%</span><span className="us-model-meta">{model.provider} · {compact(model.tokens, numberLocale)} tokens · {model.calls} {t('callsCount')}{model.cost > 0 ? ` · ${t('costAbout')} ${formatMoney(model.cost, snapshot.currency, numberLocale)}` : ''}</span></div>)}</div></div></section>
}

function Breakdown({ snapshot }: { snapshot: StatsSnapshot }): ReactNode {
  const { t, numberLocale } = useLocale()
  const rows: [string, number | string][] = [
    [t('input'), snapshot.totals.input],
    [t('output'), snapshot.totals.output],
    [t('cacheRead'), snapshot.totals.cacheRead],
    [t('cacheWrite'), snapshot.totals.cacheWrite],
    [t('costEstimate'), formatMoney(snapshot.totals.cost, snapshot.currency, numberLocale)],
  ]
  return <section className="us-panel"><div className="us-panel-head"><span className="us-panel-title">{t('tokenComposition')}</span></div><div className="us-breakdown">{rows.map(([label, value]) => <div className="us-break-item" key={label}><span>{label}</span><strong>{typeof value === 'number' ? compact(value, numberLocale) : value}</strong></div>)}</div></section>
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
  const workspaceOptions = useMemo<SelectOption[]>(() => [{ value: '', label: t('allWorkspaces') }, ...(snapshot?.workspaces.map(item => ({ value: item.path, label: `${item.path} (${item.sessions})` })) ?? [])], [snapshot?.workspaces])
  const scopeOptions: readonly SelectOption[] = [{ value: 'all', label: t('allTasks') }, { value: 'main', label: t('mainOnly') }, { value: 'subtasks', label: t('subtasksOnly') }]
  return <div data-usage-stats className="us-shell" role="dialog" aria-modal="true" aria-label="使用统计">
    <header className="us-top"><div className="us-heading"><div className="us-title">{t('title')}</div><span className="us-tab">{t('appUsage')}</span></div><button className="us-back" onClick={hide}><Icon name="back" size={17} />{t('back')}</button></header>
    <main className="us-scroll"><div className="us-content">
      <div className="us-range-row"><span className="us-range-label">{t('rangeLabel')}</span><div className="us-segment" aria-label={t('rangeLabel')}><button aria-pressed={days === 7} onClick={() => { setDays(7) }}>{t('last7Days')}</button><button aria-pressed={days === 30} onClick={() => { setDays(30) }}>{t('last30Days')}</button></div></div>
      <div className="us-toolbar us-filterbar">
        <SelectControl label={t('workspace')} value={workspace} options={workspaceOptions} onChange={setWorkspace} />
        <SelectControl label={t('taskScope')} value={scope} options={scopeOptions} onChange={value => setScope(value as TaskScope)} />
        <span className="us-spacer" /><a className="us-export" href={exportUrl('csv')}><Icon name="download" size={15} />CSV</a><a className="us-export" href={exportUrl('json')}><Icon name="download" size={15} />JSON</a>
      </div>
      {error ? <div className="us-state"><div><p>{t('loadError')}</p><small>{error}</small></div></div> : snapshot === null ? <div className="us-state"><div><div className="us-spinner" />{t('loading')}</div></div> : <>
        <div className="us-cards"><Card icon="tokens" label={t('tokensUsage')} value={compact(snapshot.allTime.totals.tokens, numberLocale)} detail={t('inputOutputDetail', { input: compact(snapshot.allTime.totals.input, numberLocale), output: compact(snapshot.allTime.totals.output, numberLocale) })} /><Card icon="money" label={t('costEstimate')} value={formatMoney(snapshot.allTime.totals.cost, snapshot.currency, numberLocale)} detail={t('costDetail', { days, cost: formatMoney(snapshot.totals.cost, snapshot.currency, numberLocale) })} /><Card icon="chat" label={t('sessions')} value={snapshot.allTime.totals.sessions} /><Card icon="message" label={t('messages')} value={snapshot.allTime.totals.messages} /><Card icon="calendar" label={t('activeDays')} value={snapshot.allTime.totals.activeDays} /><Card icon="streak" label={t('streak')} value={snapshot.allTime.totals.currentStreak} />{snapshot.allTime.mostUsedModel ? <Card icon="model" label={t('mostUsedModel')} value={<span style={{ fontSize: '18px' }}>{snapshot.allTime.mostUsedModel.model}</span>} detail={`${snapshot.allTime.mostUsedModel.percent.toFixed(1)}% · ${snapshot.allTime.mostUsedModel.provider}`} /> : <Card icon="model" label={t('mostUsedModel')} value={<span style={{ fontSize: '18px' }}>{t('noData')}</span>} />}</div>
        <Heatmap snapshot={heatmap ?? snapshot} /><DailyChart snapshot={snapshot} /><ModelUsage snapshot={snapshot} /><Breakdown snapshot={snapshot} />
        <p className="us-note">{t('costNote', { currency: snapshot.currency })}</p>
      </>}
    </div></main>
  </div>
}

function Overlay({ useVisibility, hide }: OverlayProps): ReactNode {
  const open = useVisibility(value => value)
  return open ? <Dashboard hide={hide} /> : null
}

export function apply(ctx: ClientContext & { locale?: LocaleFaceLike }): void {
  installLocale(ctx.locale as unknown as LocaleFaceLike)
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

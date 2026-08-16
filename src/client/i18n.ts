import type { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { useSyncExternalStore } from 'react'

export type Language = 'zh' | 'en'

const zh = {
  nav: '使用统计',
  title: '使用统计',
  appUsage: '应用用量',
  back: '返回对话',
  rangeLabel: '趋势范围',
  last7Days: '最近 7 天',
  last30Days: '最近 30 天',
  workspace: '工作区',
  taskScope: '任务范围',
  allWorkspaces: '全部工作区',
  allTasks: '全部任务',
  mainOnly: '仅主任务',
  subtasksOnly: '仅子任务',
  heatmap: '活跃热力图',
  less: '较少',
  more: '较多',
  mon: '一',
  wed: '三',
  fri: '五',
  callsSuffix: '轮',
  dailyTrend: '按天 Token 趋势',
  modelUsage: '模型用量',
  tokenSummary: '输入、输出与缓存合计',
  callsCount: '次调用',
  tokenComposition: 'Token 构成',
  input: '输入',
  output: '输出',
  cacheRead: '缓存读取',
  cacheWrite: '缓存写入',
  tokensUsage: 'Tokens 用量',
  inputOutputDetail: '输入 {input} · 输出 {output}',
  sessions: '会话数量',
  messages: '消息数量',
  activeDays: '活跃天数',
  streak: '当前连续天数',
  mostUsedModel: '最常用模型',
  noData: '暂无数据',
  loadError: '统计数据暂时无法读取',
  loading: '正在建立本地增量索引…',
  callsTitle: '调用明细',
  callsNote: '每次模型调用 · 最新在前',
  callsLoadError: '调用明细暂时无法读取',
  callsLoading: '正在加载调用明细…',
  callsIndexing: '正在建立本地增量索引…',
  callsEmpty: '暂无调用数据',
  allModels: '全部模型',
  allProviders: '全部提供商',
  minInput: '输入 ≥',
  minOutput: '输出 ≥',
  perPage: '{size} 条/页',
  prevPage: '上一页',
  nextPage: '下一页',
  pageInfo: '{page} / {pages} · 共 {total} 条',
  colTime: '时间',
  colDuration: '耗时',
  colInput: '输入',
  colOutput: '输出',
  colCacheRate: '缓存率',
  colModel: '模型',
  colEffort: '思考程度',
  cacheRate: '{percent}%',
  durationSubSecond: '<1s',
} as const

type Dictionary = Record<keyof typeof zh, string>

const en: Dictionary = {
  nav: 'Usage Stats',
  title: 'Usage Stats',
  appUsage: 'App Usage',
  back: 'Back to chat',
  rangeLabel: 'Range',
  last7Days: 'Last 7 days',
  last30Days: 'Last 30 days',
  workspace: 'Workspace',
  taskScope: 'Scope',
  allWorkspaces: 'All workspaces',
  allTasks: 'All tasks',
  mainOnly: 'Main tasks only',
  subtasksOnly: 'Subtasks only',
  heatmap: 'Activity Heatmap',
  less: 'Less',
  more: 'More',
  mon: 'M',
  wed: 'W',
  fri: 'F',
  callsSuffix: 'calls',
  dailyTrend: 'Daily Token Trend',
  modelUsage: 'Model Usage',
  tokenSummary: 'Input, output and cache total',
  callsCount: 'calls',
  tokenComposition: 'Token Breakdown',
  input: 'Input',
  output: 'Output',
  cacheRead: 'Cache read',
  cacheWrite: 'Cache write',
  tokensUsage: 'Tokens Used',
  inputOutputDetail: 'Input {input} · Output {output}',
  sessions: 'Sessions',
  messages: 'Messages',
  activeDays: 'Active Days',
  streak: 'Current Streak',
  mostUsedModel: 'Most Used Model',
  noData: 'No data',
  loadError: 'Unable to load usage stats',
  loading: 'Building local index…',
  callsTitle: 'Call Details',
  callsNote: 'Per model call · newest first',
  callsLoadError: 'Unable to load call details',
  callsLoading: 'Loading call details…',
  callsIndexing: 'Building local index…',
  callsEmpty: 'No calls yet',
  allModels: 'All models',
  allProviders: 'All providers',
  minInput: 'Input ≥',
  minOutput: 'Output ≥',
  perPage: '{size} / page',
  prevPage: 'Prev',
  nextPage: 'Next',
  pageInfo: '{page} / {pages} · {total} total',
  colTime: 'Time',
  colDuration: 'Duration',
  colInput: 'Input',
  colOutput: 'Output',
  colCacheRate: 'Cache',
  colModel: 'Model',
  colEffort: 'Thinking',
  cacheRate: '{percent}%',
  durationSubSecond: '<1s',
}

export type I18nKey = keyof typeof zh
export const NS = 'usage-stats'
export const dictionaries: Record<Language, Dictionary> = { zh, en }

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    'usage-stats': I18nKey
  }
}

export function languageOf(locale: string): Language {
  return /^zh(?:-|$)/i.test(locale) ? 'zh' : 'en'
}

export function translate(lang: Language, key: I18nKey, vars?: Record<string, string | number>): string {
  let text = dictionaries[lang][key]
  if (vars !== undefined) {
    for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value))
  }
  return text
}

export function formatDateLabel(date: string, lang: Language): string {
  const [, month = '', day = ''] = date.split('-')
  return lang === 'zh' ? `${Number(month)}月${Number(day)}日` : `${Number(month)}/${Number(day)}`
}

export function numberLocaleOf(lang: Language): string {
  return lang === 'zh' ? 'zh-CN' : 'en-US'
}

let localeRuntime: LocaleRuntime | null = null

export function installLocale(locale: LocaleRuntime): () => void {
  localeRuntime = locale
  const unregister = locale.register(NS, dictionaries)
  return () => {
    unregister()
    if (localeRuntime === locale) localeRuntime = null
  }
}

const FALLBACK_SNAPSHOT = { active: 'zh', revision: 0 }

export function useLocale(): {
  lang: Language
  numberLocale: string
  t: (key: I18nKey, vars?: Record<string, string | number>) => string
} {
  const snapshot = useSyncExternalStore(
    callback => localeRuntime?.subscribe(callback) ?? (() => {}),
    () => localeRuntime?.getSnapshot() ?? FALLBACK_SNAPSHOT,
  )
  const lang = languageOf(snapshot.active)
  return {
    lang,
    numberLocale: numberLocaleOf(lang),
    t: (key, vars) => translate(lang, key, vars),
  }
}

import { useSyncExternalStore } from 'react'

/**
 * LocaleFace provided by @deepseek-ai/dsh-client-locale (injected as
 * `ctx.locale`): `register` publishes dictionaries for a namespace,
 * `getSnapshot`/`subscribe` carry the active locale (DSH language setting,
 * browser-derived when unset) and revision changes.
 */
export interface LocaleFaceLike {
  register?(ns: string, dicts: Record<string, Record<string, string>>): () => void
  getSnapshot(): { active: string; revision: number }
  subscribe(fn: () => void): () => void
}

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
  approx: '约',
  costAbout: '费用约',
  modelUsage: '模型用量',
  tokenSummary: '输入、输出与缓存合计',
  callsCount: '次调用',
  tokenComposition: 'Token 构成',
  input: '输入',
  output: '输出',
  cacheRead: '缓存读取',
  cacheWrite: '缓存写入',
  costEstimate: '费用估算',
  tokensUsage: 'Tokens 用量',
  inputOutputDetail: '输入 {input} · 输出 {output}',
  costDetail: '按官方定价估算 · 近 {days} 天约 {cost}',
  sessions: '会话数量',
  messages: '消息数量',
  activeDays: '活跃天数',
  streak: '当前连续天数',
  mostUsedModel: '最常用模型',
  noData: '暂无数据',
  loadError: '统计数据暂时无法读取',
  loading: '正在建立本地增量索引…',
  costNote: '费用为按模型官方定价（{currency}/百万 tokens）的估算值；DeepSeek 已内置现价与 2026-08-17 起峰谷调价（北京时 9–12、14–18 高峰，其余时段半价）。未覆盖的模型按 0 计，可在插件配置 pricing 中新增或覆盖价格。',
} as const

const en: Record<keyof typeof zh, string> = {
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
  approx: '~',
  costAbout: 'est.',
  modelUsage: 'Model Usage',
  tokenSummary: 'Input, output & cache total',
  callsCount: 'calls',
  tokenComposition: 'Token Breakdown',
  input: 'Input',
  output: 'Output',
  cacheRead: 'Cache read',
  cacheWrite: 'Cache write',
  costEstimate: 'Est. cost',
  tokensUsage: 'Tokens Used',
  inputOutputDetail: 'Input {input} · Output {output}',
  costDetail: 'Per official pricing · ~{cost} in last {days} days',
  sessions: 'Sessions',
  messages: 'Messages',
  activeDays: 'Active Days',
  streak: 'Current Streak',
  mostUsedModel: 'Most Used Model',
  noData: 'No data',
  loadError: 'Unable to load usage stats',
  loading: 'Building local index…',
  costNote: 'Estimated at official model pricing ({currency}/1M tokens). DeepSeek rates and the peak/off-peak schedule effective 2026-08-17 (Beijing 9–12, 14–18 peak; off-peak at half the peak rate) are built in. Unlisted models count as 0; add or override prices via the pricing config.',
}

export type I18nKey = keyof typeof zh

export const NS = 'usage-stats'
export const dictionaries: Record<Language, Record<I18nKey, string>> = { zh, en }

export function languageOf(locale: string): Language {
  return /^zh/i.test(locale) ? 'zh' : 'en'
}

export function translate(lang: Language, key: I18nKey, vars?: Record<string, string | number>): string {
  let text: string = dictionaries[lang][key] ?? dictionaries.zh[key] ?? key
  if (vars) for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value))
  return text
}

export function formatDateLabel(date: string, lang: Language): string {
  const [, month = '', day = ''] = date.split('-')
  return lang === 'zh' ? `${Number(month)}月${Number(day)}日` : `${Number(month)}/${Number(day)}`
}

export function numberLocaleOf(lang: Language): string {
  return lang === 'zh' ? 'zh-CN' : 'en-US'
}

let face: LocaleFaceLike | null = null

/** 安装 DSH LocaleFace（apply 时调用），注册本插件字典。 */
export function installLocale(locale: LocaleFaceLike): void {
  face = locale
  face.register?.(NS, { zh, en })
}

const FALLBACK_SNAPSHOT = { active: 'zh', revision: 0 }

/**
 * React hook：读取 DSH 当前语言（设置 locale.preference，缺省浏览器语言），
 * 语言切换时自动重渲染。未接入 face 时回退中文。
 */
export function useLocale(): { lang: Language; numberLocale: string; t: (key: I18nKey, vars?: Record<string, string | number>) => string } {
  const snapshot = useSyncExternalStore(
    (callback) => (face?.subscribe(callback) ?? (() => {})),
    () => face?.getSnapshot() ?? FALLBACK_SNAPSHOT,
  )
  const lang = languageOf(snapshot.active)
  return {
    lang,
    numberLocale: numberLocaleOf(lang),
    t: (key, vars) => translate(lang, key, vars),
  }
}

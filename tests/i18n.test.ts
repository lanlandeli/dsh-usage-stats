import { describe, expect, it } from 'vitest'
import { formatDateLabel, languageOf, numberLocaleOf, translate } from '../src/client/i18n.js'

describe('i18n', () => {
  it('returns Chinese strings for zh and interpolates variables', () => {
    expect(translate('zh', 'nav')).toBe('使用统计')
    expect(translate('zh', 'costDetail', { days: 30, cost: '¥1.20' })).toBe('按官方定价估算 · 近 30 天约 ¥1.20')
    expect(numberLocaleOf('zh')).toBe('zh-CN')
  })

  it('returns English strings for en', () => {
    expect(translate('en', 'nav')).toBe('Usage Stats')
    expect(translate('en', 'tokenComposition')).toBe('Token Breakdown')
    expect(translate('en', 'costDetail', { days: 7, cost: '¥0.50' })).toBe('Per official pricing · ~¥0.50 in last 7 days')
    expect(numberLocaleOf('en')).toBe('en-US')
  })

  it('matches locale tags and falls back to zh for missing keys', () => {
    expect(languageOf('zh-CN')).toBe('zh')
    expect(languageOf('en-US')).toBe('en')
    expect(languageOf('de')).toBe('en')
    expect(translate('en', 'nav')).toBeTruthy()
  })

  it('formats date labels per language', () => {
    expect(formatDateLabel('2026-08-17', 'zh')).toBe('8月17日')
    expect(formatDateLabel('2026-08-17', 'en')).toBe('8/17')
  })
})

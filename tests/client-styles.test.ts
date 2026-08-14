import { describe, expect, it } from 'vitest'
import { styles } from '../src/client/styles.js'

describe('daily chart layout', () => {
  it('keeps edge date labels inside the clipped chart frame', () => {
    const chartInset = styles.match(/\.us-chart \{[^}]*padding:\s*26px\s+(\d+)px\s+0;/)?.[1]
    const labelWidth = styles.match(/\.us-date-label \{[^}]*min-width:\s*(\d+)px;/)?.[1]
    const gridInset = styles.match(/\.us-grid-lines \{[^}]*inset:\s*26px\s+(\d+)px\s+47px;/)?.[1]

    expect(chartInset).toBeDefined()
    expect(labelWidth).toBeDefined()
    expect(Number(chartInset)).toBeGreaterThanOrEqual(Number(labelWidth) / 2)
    expect(gridInset).toBe(chartInset)
  })
})

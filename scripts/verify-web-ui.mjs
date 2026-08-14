import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const appUrl = process.env.APP_URL || 'http://127.0.0.1:3091'
const debugUrl = process.env.CDP_URL || 'http://127.0.0.1:9223'
const screenshotDir = process.env.SCREENSHOT_DIR ? resolve(process.env.SCREENSHOT_DIR) : undefined

async function waitForValue(read, label, timeout = 20000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    try {
      const value = await read()
      if (value) return value
    } catch {}
    await new Promise(resolvePromise => setTimeout(resolvePromise, 150))
  }
  throw new Error(`Timed out waiting for ${label}`)
}

const targets = await waitForValue(
  async () => {
    const response = await fetch(`${debugUrl}/json/list`)
    if (!response.ok) return undefined
    const pages = await response.json()
    return pages.find(item => item.type === 'page') ? pages : undefined
  },
  'Chrome DevTools target',
)
const page = targets.find(item => item.type === 'page')
const socket = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((resolvePromise, reject) => {
  socket.addEventListener('open', resolvePromise, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let id = 0
const pending = new Map()
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  const waiter = pending.get(message.id)
  if (!waiter) return
  pending.delete(message.id)
  message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result)
})
const send = (method, params = {}) => new Promise((resolvePromise, reject) => {
  const requestId = ++id
  pending.set(requestId, { resolve: resolvePromise, reject })
  socket.send(JSON.stringify({ id: requestId, method, params }))
})
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

await send('Page.enable')
await send('Runtime.enable')
await send('Page.navigate', { url: appUrl })
await waitForValue(() => evaluate(`document.readyState === 'complete'`), 'page load')
await waitForValue(() => evaluate(`Boolean(document.querySelector('[data-usage-stats].us-nav'))`), 'sidebar entry')
await evaluate(`document.querySelector('[data-usage-stats].us-nav').click()`)
await waitForValue(() => evaluate(`document.querySelectorAll('.us-card').length === 6`), 'dashboard')

const report = await evaluate(`(() => {
  const columns = [...document.querySelectorAll('.us-bar-column')]
  const zeroColumns = columns.filter(column => !column.querySelector('.us-bar-segment'))
  const shell = document.querySelector('.us-shell')
  return {
    cards: document.querySelectorAll('.us-card').length,
    dateInputs: document.querySelectorAll('input[type="date"]').length,
    selects: document.querySelectorAll('.us-select').length,
    trendColumns: columns.length,
    zeroColumns: zeroColumns.length,
    zeroHitTargets: zeroColumns.filter(column => column.querySelector('.us-bar-hit')).length,
    visibleHitTargets: document.querySelectorAll('.us-bar-hit').length,
    fontFamily: getComputedStyle(shell).fontFamily,
    overflowX: getComputedStyle(document.querySelector('.us-chart-scroll')).overflowX,
  }
})()`)

if (report.cards !== 6 || report.dateInputs !== 0 || report.selects !== 2 || report.zeroHitTargets !== 0) {
  throw new Error(`UI contract failed: ${JSON.stringify(report)}`)
}

if (screenshotDir) {
  await mkdir(screenshotDir, { recursive: true })
  const capture = async filename => {
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, fromSurface: true })
    await writeFile(resolve(screenshotDir, filename), Buffer.from(result.data, 'base64'))
  }
  await evaluate(`window.scrollTo(0, 0); document.querySelector('.us-scroll').scrollTop = 0`)
  await new Promise(resolvePromise => setTimeout(resolvePromise, 900))
  await capture('dashboard-light.png')
  const fullHeight = await evaluate(`Math.ceil(document.querySelector('.us-top').offsetHeight + document.querySelector('.us-scroll').scrollHeight)`)
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: fullHeight, deviceScaleFactor: 1, mobile: false })
  await new Promise(resolvePromise => setTimeout(resolvePromise, 350))
  await capture('dashboard-light-full.png')
  await evaluate(`document.body.setAttribute('data-ds-dark-theme', '')`)
  await new Promise(resolvePromise => setTimeout(resolvePromise, 250))
  await capture('dashboard-dark.png')
  await capture('dashboard-dark-full.png')
}

console.log(JSON.stringify(report, null, 2))
socket.close()

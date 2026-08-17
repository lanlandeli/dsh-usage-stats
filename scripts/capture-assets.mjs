import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dshBin = join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
const npmCli = process.env.npm_execpath
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
if (!npmCli) throw new Error('npm_execpath is unavailable; run through npm run assets:capture')

const temporary = await mkdtemp(join(tmpdir(), 'dsh-usage-stats-capture-'))
const dshHome = join(temporary, 'home')
const packageDir = join(temporary, 'package')
const environment = { ...process.env, DSH_HOME: dshHome, NO_COLOR: '1' }
let server
let browser

function runNode(entry, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [entry, ...args], { cwd: projectRoot, env: environment, stdio: ['ignore', 'pipe', 'pipe'], ...options })
    let stdout = ''
    let stderr = ''
    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')
    child.stdout?.on('data', chunk => { stdout += chunk })
    child.stderr?.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolvePromise({ stdout, stderr }) : reject(new Error(`${entry} ${args.join(' ')} exited ${code}\n${stdout}\n${stderr}`)))
  })
}

async function waitFor(read, label, timeout = 30_000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    const value = await read().catch(() => undefined)
    if (value) return value
    await new Promise(resolvePromise => setTimeout(resolvePromise, 150))
  }
  throw new Error(`Timed out waiting for ${label}`)
}

async function stop(child) {
  if (!child || child.exitCode !== null) return
  child.kill('SIGTERM')
  await Promise.race([new Promise(resolvePromise => child.once('exit', resolvePromise)), new Promise(resolvePromise => setTimeout(resolvePromise, 3000))])
  if (child.exitCode === null) child.kill('SIGKILL')
}

function sampleSessions() {
  const models = [
    { provider: '示例提供商', model: 'deepseek-v4-flash', effort: 'medium' },
    { provider: '示例提供商', model: 'deepseek-v4-pro', effort: 'high' },
  ]
  const dayOffsets = [-29, -24, -23, -22, -21, -14, -13, -12, -11, -7, -6, -5, -4, -3, -2, -1, 0]
  return Array.from({ length: 24 }, (_, sessionIndex) => {
    const activities = []
    let seq = 0
    const calls = 4 + sessionIndex % 4
    for (let callIndex = 0; callIndex < calls; callIndex += 1) {
      const offset = dayOffsets[(sessionIndex * 3 + callIndex) % dayOffsets.length]
      const date = new Date()
      date.setHours(9 + (callIndex * 2) % 10, (sessionIndex * 7 + callIndex * 11) % 60, 0, 0)
      date.setDate(date.getDate() + offset)
      const model = models[(sessionIndex + callIndex) % 6 === 0 ? 1 : 0]
      const input = 18_000 + sessionIndex * 1370 + callIndex * 8920
      const output = 5_000 + sessionIndex * 610 + callIndex * 2310
      const cacheRead = input * (3 + callIndex % 4)
      activities.push({ seq: seq++, time: date.getTime() - 30_000, kind: 'human' })
      activities.push({
        seq: seq++, time: date.getTime(), kind: 'assistant', provider: model.provider, model: model.model,
        durationMs: 2_600 + ((sessionIndex * 731 + callIndex * 991) % 17_000), effort: model.effort,
        tokens: { input, output, cacheRead, cacheWrite: callIndex % 5 === 0 ? 1200 : 0, reasoning: Math.round(output * 0.32) },
      })
    }
    return {
      id: `sample-session-${String(sessionIndex + 1).padStart(2, '0')}`,
      createdAt: activities[0]?.time ?? Date.now(),
      cwd: sessionIndex % 3 === 0 ? 'D:\\Projects\\sample-app' : 'D:\\Projects\\docs-site',
      lastSeq: seq - 1,
      indexedAt: Date.now(),
      activities,
    }
  })
}

try {
  await mkdir(packageDir, { recursive: true })
  await mkdir(join(dshHome, 'usage-stats'), { recursive: true })
  await writeFile(join(dshHome, 'usage-stats', 'index-v1.json'), JSON.stringify({ schema: 4, sessions: sampleSessions() }), 'utf8')
  const packed = await runNode(npmCli, ['pack', '--json', '--ignore-scripts', '--pack-destination', packageDir])
  const filename = JSON.parse(packed.stdout)[0]?.filename
  if (!filename) throw new Error('npm pack did not return a filename')
  await runNode(dshBin, ['plugin', '--profile', 'web', 'add', join(packageDir, filename)])

  server = spawn(process.execPath, [dshBin, '--profile', 'web', '--port', '0'], { cwd: temporary, env: environment, stdio: ['ignore', 'pipe', 'pipe'] })
  server.stdout.setEncoding('utf8')
  server.stderr.setEncoding('utf8')
  let serverOutput = ''
  server.stdout.on('data', chunk => { serverOutput += chunk })
  const appUrl = await waitFor(async () => serverOutput.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0], 'Harness URL')

  const debugPort = 9337
  browser = spawn(chrome, [
    '--headless=new', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${join(temporary, 'chrome')}`,
    '--no-first-run', '--disable-extensions', '--disable-background-networking', '--lang=zh-CN', 'about:blank',
  ], { cwd: temporary, stdio: 'ignore' })
  await waitFor(async () => (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).ok, 'Chrome DevTools')
  const result = await runNode(join(projectRoot, 'scripts', 'verify-web-ui.mjs'), [], {
    env: { ...environment, APP_URL: appUrl, CDP_URL: `http://127.0.0.1:${debugPort}`, SCREENSHOT_DIR: join(projectRoot, 'assets') },
  })
  process.stdout.write(result.stdout)
} finally {
  await stop(browser)
  await stop(server)
  await rm(temporary, { recursive: true, force: true })
}

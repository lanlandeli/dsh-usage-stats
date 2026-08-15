import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dshBin = process.env.DSH_BIN || join(projectRoot, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
const npmCli = process.env.npm_execpath
if (!npmCli) throw new Error('npm_execpath is unavailable; run through npm run smoke:clean-profile')

const temporary = await mkdtemp(join(tmpdir(), 'dsh-usage-stats-smoke-'))
const dshHome = join(temporary, 'home')
const packageDir = join(temporary, 'package')
const environment = { ...process.env, DSH_HOME: dshHome, NO_COLOR: '1' }
let server

function runNode(entry, args, options = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [entry, ...args], {
      cwd: projectRoot,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    })
    let stdout = ''
    let stderr = ''
    child.stdout?.setEncoding('utf8')
    child.stderr?.setEncoding('utf8')
    child.stdout?.on('data', chunk => { stdout += chunk })
    child.stderr?.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('exit', code => code === 0
      ? resolvePromise({ stdout, stderr })
      : reject(new Error(`${entry} ${args.join(' ')} exited ${code}\n${stdout}\n${stderr}`)))
  })
}

async function stopServer() {
  if (!server || server.exitCode !== null) return
  server.kill('SIGTERM')
  await Promise.race([
    new Promise(resolvePromise => server.once('exit', resolvePromise)),
    new Promise(resolvePromise => setTimeout(resolvePromise, 3000)),
  ])
  if (server.exitCode === null) server.kill('SIGKILL')
}

try {
  await mkdir(packageDir, { recursive: true })
  const cacheDirectory = join(dshHome, 'usage-stats')
  const cachePath = join(cacheDirectory, 'index-v1.json')
  await mkdir(cacheDirectory, { recursive: true })
  await writeFile(cachePath, JSON.stringify({
    schema: 1,
    sessions: [{
      id: 'polluted-child', createdAt: 1, parentSession: 'parent', lastSeq: 1, indexedAt: 1,
      activities: [{
        seq: 1, time: Date.parse('2026-08-14T00:00:00Z'), kind: 'assistant',
        provider: 'seed', model: 'inherited',
        tokens: { input: 9_999_999, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: 0 },
      }],
    }],
  }), 'utf8')
  const packed = await runNode(npmCli, ['pack', '--json', '--ignore-scripts', '--pack-destination', packageDir])
  const packReport = JSON.parse(packed.stdout)
  const filename = packReport[0]?.filename
  if (!filename) throw new Error('npm pack did not return a filename')
  const tarball = join(packageDir, filename)

  await runNode(dshBin, ['plugin', '--profile', 'web', 'add', tarball])
  const profilePath = join(dshHome, 'profiles', 'web', 'package.json')
  const installed = JSON.parse(await readFile(profilePath, 'utf8'))
  if (installed.dependencies?.['dsh-usage-stats'] === undefined) throw new Error('Plugin dependency was not installed')
  if (!installed.dsh?.profile?.bundles?.includes('dsh-usage-stats')) throw new Error('Bundle was not activated')

  const dump = await runNode(dshBin, ['--profile', 'web', '--dump-config'])
  if (!dump.stdout.includes('dsh-usage-stats')) throw new Error('Composed config does not contain the plugin')

  server = spawn(process.execPath, [dshBin, '--profile', 'web', '--port', '0'], {
    cwd: temporary,
    env: environment,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  server.stdout.setEncoding('utf8')
  server.stderr.setEncoding('utf8')
  let startupOutput = ''
  let startupError = ''
  server.stdout.on('data', chunk => { startupOutput += chunk })
  server.stderr.on('data', chunk => { startupError += chunk })
  const url = await new Promise((resolvePromise, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Web startup timed out\n${startupOutput}\n${startupError}`)), 30000)
    const inspect = () => {
      const match = startupOutput.match(/http:\/\/127\.0\.0\.1:\d+/)
      if (!match) return
      clearTimeout(timeout)
      resolvePromise(match[0])
    }
    server.stdout.on('data', inspect)
    server.once('exit', code => {
      clearTimeout(timeout)
      reject(new Error(`Web process exited ${code}\n${startupOutput}\n${startupError}`))
    })
  })

  const query = 'from=2026-08-14&to=2026-08-14&scope=all&timeZone=UTC'
  const snapshotResponse = await fetch(`${url}/usage-stats/v1/snapshot?${query}`)
  if (!snapshotResponse.ok) throw new Error(`Snapshot returned ${snapshotResponse.status}`)
  const snapshot = await snapshotResponse.json()
  if (!snapshot.allTime?.totals || !Array.isArray(snapshot.days) || snapshot.days.length !== 1) {
    throw new Error('Snapshot schema is incomplete')
  }
  if (snapshot.allTime.totals.tokens !== 0 || snapshot.allTime.totals.sessions !== 0) {
    throw new Error('Schema-1 cache was not invalidated')
  }
  let rebuiltCache
  for (let attempt = 0; attempt < 50; attempt += 1) {
    rebuiltCache = JSON.parse(await readFile(cachePath, 'utf8'))
    if (rebuiltCache.schema === 2) break
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  if (rebuiltCache?.schema !== 2 || !Array.isArray(rebuiltCache.sessions) || rebuiltCache.sessions.length !== 0) {
    throw new Error('Cache was not rebuilt with schema 2')
  }
  const headResponse = await fetch(`${url}/usage-stats/v1/snapshot?${query}`, { method: 'HEAD' })
  if (!headResponse.ok || (await headResponse.text()) !== '') throw new Error('HEAD contract failed')
  const postResponse = await fetch(`${url}/usage-stats/v1/snapshot?${query}`, { method: 'POST' })
  if (postResponse.status !== 405) throw new Error('Write-method fence failed')
  const csvResponse = await fetch(`${url}/usage-stats/v1/export.csv?${query}`)
  const csv = (await csvResponse.text()).replace(/^\uFEFF/, '')
  if (!csvResponse.ok || !csv.startsWith('"date"')) throw new Error('CSV export failed')

  await stopServer()
  await runNode(dshBin, ['plugin', '--profile', 'web', 'remove', 'dsh-usage-stats'])
  const removed = JSON.parse(await readFile(profilePath, 'utf8'))
  if (removed.dependencies?.['dsh-usage-stats'] !== undefined) throw new Error('Plugin dependency survived removal')
  if (removed.dsh?.profile?.bundles?.includes('dsh-usage-stats')) throw new Error('Bundle survived removal')

  console.log('Clean-profile lifecycle verified: pack, install, schema-1 invalidation, compose, boot, API, export, method fence, schema-2 rebuild, remove.')
} finally {
  await stopServer()
  await rm(temporary, { recursive: true, force: true })
}

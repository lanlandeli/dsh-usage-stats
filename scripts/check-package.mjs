import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'

function runNpm(args) {
  const npmCli = process.env.npm_execpath
  if (!npmCli) throw new Error('npm_execpath is unavailable; run through npm run pack:check')
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, ...args], { stdio: ['ignore', 'pipe', 'inherit'] })
    let stdout = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', chunk => { stdout += chunk })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve(stdout) : reject(new Error(`npm ${args.join(' ')} exited ${code}`)))
  })
}

const output = await runNpm(['pack', '--dry-run', '--json', '--ignore-scripts'])
const report = JSON.parse(output)
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
if (manifest.name !== 'dsh-usage-stats' || typeof manifest.version !== 'string') {
  throw new Error('Invalid package manifest')
}
const bundledOfficialPackages = Object.keys(manifest.dependencies ?? {}).filter(name => name.startsWith('@deepseek-ai/'))
if (bundledOfficialPackages.length > 0) {
  throw new Error(`Official Harness packages must be peer dependencies: ${bundledOfficialPackages.join(', ')}`)
}
const pack = Array.isArray(report) ? report[0] : report[Object.keys(report)[0]]
const files = new Set(pack?.files?.map(file => file.path) ?? [])
const required = [
  'package.json', 'README.md', 'README.en.md', 'LICENSE', 'CHANGELOG.md',
  'PRIVACY.md', 'SECURITY.md', 'cordis.patch.yml', 'lib/index.js',
  'lib/index.d.ts', 'lib/client.js', 'assets/dashboard-light-full.png',
  'assets/dashboard-dark-full.png',
  'assets/usage-demo.gif',
]
for (const file of required) {
  if (file === 'package.json') continue
  if (!files.has(file)) throw new Error(`Published package is missing ${file}`)
}
const forbidden = [...files].filter(file => /^(src|tests|scripts|node_modules)\//.test(file)
  || /^README\.draft\.md$/i.test(file)
  || /\.(?:tgz|log)$/.test(file))
if (forbidden.length > 0) throw new Error(`Unexpected published files: ${forbidden.join(', ')}`)
console.log(`Package contents verified: ${files.size} files, no source/cache/log leakage.`)

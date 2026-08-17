import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit', ...options })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

const pack = spawnSync('npm', ['pack', '--json', '--ignore-scripts'], { encoding: 'utf8' })
if (pack.status !== 0) {
  process.stderr.write(pack.stderr ?? '')
  process.exit(pack.status ?? 1)
}
const payload = JSON.parse(pack.stdout)
const filename = payload[0]?.filename
if (!filename) throw new Error('npm pack did not return a tarball filename')

const tarball = resolve(filename)
const temp = await mkdtemp(join(tmpdir(), 'huly-skills-importer-smoke-'))
try {
  run('npm', ['init', '-y'], { cwd: temp })
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], { cwd: temp })
  const cli = join(temp, 'node_modules', '.bin', 'huly-skills-importer')
  run(cli, ['--help'], { cwd: temp })
  run(cli, ['catalogues'], { cwd: temp })
  run(cli, ['check', join(temp, 'node_modules', 'huly-skills-importer', 'skills', 'example.yaml')], { cwd: temp })
} finally {
  await rm(temp, { recursive: true, force: true })
  await rm(tarball, { force: true })
}

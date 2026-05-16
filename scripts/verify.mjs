#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const pnpm = 'pnpm'
const requiredPaths = [
  'AGENTS.md',
  'CLAUDE.md',
  'HANDOFF-JA.md',
  'tasks.md',
  'docs/vision.md',
  'docs/state.md',
  'docs/decisions.md',
  'docs/issues.md',
  'docs/repo-map.md',
  '.claude/settings.json',
]

const failures = []
for (const file of requiredPaths) {
  const ok = existsSync(file)
  console.log(`${ok ? 'OK' : 'MISSING'} ${file}`)
  if (!ok) failures.push(`required:${file}`)
}

const compile = spawnSync(pnpm, ['run', 'compile'], { stdio: 'inherit', shell: process.platform === 'win32' })
if (compile.status !== 0) {
  failures.push('compile')
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`[verify] failed: ${failure}`)
  process.exit(1)
}

console.log('[verify] all checks passed')

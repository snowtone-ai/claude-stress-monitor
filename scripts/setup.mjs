#!/usr/bin/env node
import fs from 'node:fs/promises'

for (const dir of ['docs', 'scripts']) {
  await fs.mkdir(dir, { recursive: true })
  console.log(`ready: ${dir}`)
}

console.log('pm-zero v9.4 directory structure ready.')

#!/usr/bin/env node
// SPDX-License-Identifier: AGPL-3.0-or-later
/**
 * Fail if zh-CN locale JSON contains glossary-forbidden UI terms.
 * TASK-20261102-CASCADIA-I18N-ZH
 */
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('cascadia-web/src/i18n/locales/zh-CN')
const forbidden = ['程序', '金库', '保险库', '账单']

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (ent.name.endsWith('.json')) out.push(p)
  }
  return out
}

if (!fs.existsSync(root)) {
  console.error(`missing ${root}`)
  process.exit(1)
}

const hits = []
for (const file of walk(root)) {
  const text = fs.readFileSync(file, 'utf8')
  for (const word of forbidden) {
    if (text.includes(word)) hits.push({ file, word })
  }
}

if (hits.length) {
  console.error('Forbidden glossary terms found in zh-CN locales:')
  for (const h of hits) console.error(`  ${h.word}  <-  ${h.file}`)
  process.exit(1)
}

console.log('i18n-scan-forbidden: ok')

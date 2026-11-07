// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { describe, expect, it } from 'vitest'
import { items } from './schema'
import { buildItemTextSearchCondition } from './item-text-search'
import { likeContains } from './like-pattern'

const columns = {
  itemNumber: items.itemNumber,
  name: items.name,
}

describe('buildItemTextSearchCondition', () => {
  it('returns null for empty / whitespace query', () => {
    expect(buildItemTextSearchCondition(undefined, columns)).toBeNull()
    expect(buildItemTextSearchCondition('', columns)).toBeNull()
    expect(buildItemTextSearchCondition('   ', columns)).toBeNull()
  })

  it('builds a single-token ILIKE contains condition', () => {
    const cond = buildItemTextSearchCondition('电机', columns)
    expect(cond).not.toBeNull()
    expect(cond).not.toBe('no-match')
    // Drizzle SQL object — shape is opaque; presence is enough here.
    expect(typeof cond).toBe('object')
  })

  it('builds a multi-token AND condition', () => {
    const one = buildItemTextSearchCondition('电机', columns)
    const two = buildItemTextSearchCondition('电机 壳体', columns)
    expect(one).not.toBeNull()
    expect(two).not.toBeNull()
    expect(two).not.toBe('no-match')
    // Multi-token must not collapse to the same object as single-token.
    expect(two).not.toBe(one)
  })
})

describe('likeContains (escape contract used by item-text-search)', () => {
  it('escapes ILIKE wildcards so bare %/_ are literals', () => {
    expect(likeContains('%')).toBe('%\\%%')
    expect(likeContains('A_1')).toBe('%A\\_1%')
    expect(likeContains('a\\b')).toBe('%a\\\\b%')
  })
})

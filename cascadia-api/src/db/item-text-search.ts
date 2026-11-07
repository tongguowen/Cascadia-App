// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

/**
 * Item number/name free-text match — Watchlink low-risk S1-lite (ILIKE only):
 * - Contains match on itemNumber / name (CJK-safe; no ASCII strip)
 * - Multi-word queries are AND across tokens
 * - No pg_trgm / no pinyin (trgm is a later change)
 *
 * Replaces the old ASCII-only to_tsquery path that dropped CJK.
 */

import { and, ilike, or, type SQL } from 'drizzle-orm'
import { likeContains } from './like-pattern'

/** Drizzle column refs for item number / name (kept loose for reuse). */
export type ItemTextSearchColumns = {
  itemNumber: Parameters<typeof ilike>[0]
  name: Parameters<typeof ilike>[0]
}

/**
 * Build a SQL condition matching `query` against itemNumber and name.
 * Returns `'no-match'` when the query has no usable tokens.
 */
export function buildItemTextSearchCondition(
  query: string | undefined,
  columns: ItemTextSearchColumns,
): SQL<unknown> | 'no-match' | null {
  const term = query?.trim()
  if (!term) return null

  const tokens = term.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return 'no-match'

  const perToken = tokens.map((token) => {
    const pattern = likeContains(token)
    return or(
      ilike(columns.itemNumber, pattern),
      ilike(columns.name, pattern),
    ) as SQL<unknown>
  })
  if (perToken.length === 1) return perToken[0]!
  return and(...perToken) as SQL<unknown>
}

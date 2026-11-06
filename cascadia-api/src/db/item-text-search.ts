// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

/**
 * Item number/name free-text match for Watchlink S1 search:
 * - Contains (ILIKE) for exact substrings, including Chinese
 * - Trigram similarity for mild typos / near matches (pg_trgm)
 * - Multi-word queries are AND across tokens
 * - No pinyin (S2)
 *
 * Replaces the old ASCII-only to_tsquery path that dropped CJK and felt
 * non-fuzzy to operators.
 */

import { and, ilike, or, sql, type SQL } from 'drizzle-orm'
import { likeContains } from './like-pattern'

/** Similarity floor for full-string trigram match (pg_trgm default is 0.3). */
export const ITEM_SEARCH_SIMILARITY_THRESHOLD = 0.3

/** Word-similarity floor when the query is a fragment of a longer name. */
export const ITEM_SEARCH_WORD_SIMILARITY_THRESHOLD = 0.4

/** Only apply trigram fuzzy when the token is long enough to be meaningful. */
export const ITEM_SEARCH_FUZZY_MIN_LEN = 3

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

  const perToken = tokens.map((token) =>
    buildSingleTokenCondition(token, columns),
  )
  if (perToken.length === 1) return perToken[0]!
  return and(...perToken) as SQL<unknown>
}

function buildSingleTokenCondition(
  token: string,
  columns: ItemTextSearchColumns,
): SQL<unknown> {
  const pattern = likeContains(token)
  const contains = or(
    ilike(columns.itemNumber, pattern),
    ilike(columns.name, pattern),
  ) as SQL<unknown>

  if (token.length < ITEM_SEARCH_FUZZY_MIN_LEN) {
    return contains
  }

  // pg_trgm: mild typos + near matches. ILIKE still covers pure contains
  // (including CJK). Escape single quotes for embedding in sql fragments —
  // drizzle param binding via ${token} is preferred.
  const fuzzy = sql`(
    similarity(lower(coalesce(${columns.itemNumber}, '')), lower(${token}))
      >= ${ITEM_SEARCH_SIMILARITY_THRESHOLD}
    OR similarity(lower(coalesce(${columns.name}, '')), lower(${token}))
      >= ${ITEM_SEARCH_SIMILARITY_THRESHOLD}
    OR word_similarity(
         lower(${token}),
         lower(coalesce(${columns.itemNumber}, '') || ' ' || coalesce(${columns.name}, ''))
       ) >= ${ITEM_SEARCH_WORD_SIMILARITY_THRESHOLD}
  )`

  return or(contains, fuzzy) as SQL<unknown>
}

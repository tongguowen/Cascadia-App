// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useQuery } from '@tanstack/react-query'
import { Lock, Unlock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { DesignStatus } from '@/query/options/branches'
import { Badge } from '@/components/ui'
import { designStatusQuery } from '@/query/options/branches'

/** Re-exported so the forms that read a design's phase keep one import path. */
export type { DesignStatus }

interface DesignPhaseIndicatorProps {
  designId: string
  className?: string
  showDetails?: boolean
  /**
   * Optional: Pass pre-fetched status to avoid additional API call
   */
  status?: DesignStatus
}

/**
 * Displays the current development phase of a design:
 * - Pre-Release: Items can be created/edited directly on main branch
 * - Post-Release: Main branch is protected, must use ECO/workspace branches
 */
export function DesignPhaseIndicator({
  designId,
  className,
  showDetails = false,
  status: initialStatus,
}: DesignPhaseIndicatorProps) {
  const { t: tp } = useTranslation('pages')
  // A caller that already holds the status passes it in rather than paying for
  // a second request.
  const { data: fetchedStatus, isLoading: loading } = useQuery(
    designStatusQuery(designId, !initialStatus),
  )

  const status = initialStatus ?? fetchedStatus

  if (loading) {
    return (
      <div className="h-6 w-24 animate-pulse bg-slate-200 dark:bg-slate-700 rounded-full" />
    )
  }

  if (!status) {
    return null
  }

  const { phase, releasedItemCount, draftItemCount } = status.protection
  const isPreRelease = phase === 'pre-release'

  const tooltipText = isPreRelease
    ? tp('designs.preRelease.tooltipPre', { count: draftItemCount })
    : tp('designs.preRelease.tooltipPost', { count: releasedItemCount })

  return (
    <div
      className={`inline-flex items-center gap-2 ${className ?? ''}`}
      title={tooltipText}
    >
      <Badge
        variant={isPreRelease ? 'warning' : 'success'}
        className="flex items-center gap-1 cursor-help"
      >
        {isPreRelease ? (
          <>
            <Unlock className="h-3 w-3" />
            {tp('designs.preRelease.badge')}
          </>
        ) : (
          <>
            <Lock className="h-3 w-3" />
            {tp('designs.preRelease.changeControlBadge')}
          </>
        )}
      </Badge>
      {showDetails && (
        <span className="text-xs text-slate-500">
          {tp('designs.preRelease.phaseDetails', {
            draft: draftItemCount,
            released: releasedItemCount,
          })}
        </span>
      )}
    </div>
  )
}

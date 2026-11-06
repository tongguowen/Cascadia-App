// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useTranslation } from 'react-i18next'
import { ArrowLeft, Clock } from 'lucide-react'
import type { VersionContext } from '@/hooks/useVersionContext'
import { Button } from '@/components/ui'

interface HistoricalViewBannerProps {
  context: VersionContext
  onReturnToCurrent: () => void
}

export function HistoricalViewBanner({
  context,
  onReturnToCurrent,
}: HistoricalViewBannerProps) {
  const { t: tp } = useTranslation('pages')
  // Get display label for context
  const getContextLabel = () => {
    if (context.type === 'tag') {
      return (
        context.tagName ||
        tp('designs.historicalView.tagLabel', {
          id: context.tagId?.slice(0, 8) ?? '',
        })
      )
    }
    if (context.type === 'commit') {
      return tp('designs.historicalView.commitLabel', {
        id: context.commitId?.slice(0, 8) ?? '',
      })
    }
    return tp('designs.historicalView.historicalState')
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-full">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-amber-800 dark:text-amber-200">
              {tp('designs.historicalView.title')}
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {getContextLabel()}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={onReturnToCurrent}
          className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/40"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {tp('designs.historicalView.returnToCurrent')}
        </Button>
      </div>

      <div className="mt-3 text-sm text-amber-600 dark:text-amber-400">
        {tp('designs.historicalView.notice')}
      </div>
    </div>
  )
}

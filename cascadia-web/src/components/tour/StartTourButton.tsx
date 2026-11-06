// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { HelpCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTour } from '@/tour'

export function StartTourButton() {
  const { startTour, isTourActive } = useTour()
  const { t } = useTranslation('tour')

  return (
    <button
      onClick={startTour}
      disabled={isTourActive}
      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label={t('startButton.aria')}
      title={t('startButton.title')}
    >
      <HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
    </button>
  )
}

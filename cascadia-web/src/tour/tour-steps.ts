// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import type { DriveStep } from 'driver.js'
import i18n from '@/i18n'

export function getTourSteps(): Array<DriveStep> {
  const t = (key: string) => i18n.t(key, { ns: 'tour' })

  return [
    {
      popover: {
        title: t('steps.welcome.title'),
        description: t('steps.welcome.description'),
        align: 'center',
      },
    },
    {
      element: '[data-testid="main-nav"]',
      popover: {
        title: t('steps.navigation.title'),
        description: t('steps.navigation.description'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-testid="nav-parts"]',
      popover: {
        title: t('steps.parts.title'),
        description: t('steps.parts.description'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-testid="nav-documents"]',
      popover: {
        title: t('steps.documents.title'),
        description: t('steps.documents.description'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-testid="nav-change-orders"]',
      popover: {
        title: t('steps.changeOrders.title'),
        description: t('steps.changeOrders.description'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-testid="nav-programs"]',
      popover: {
        title: t('steps.programs.title'),
        description: t('steps.programs.description'),
        side: 'right',
        align: 'start',
      },
    },
    {
      element: '[data-testid="enterprise-search"]',
      popover: {
        title: t('steps.search.title'),
        description: t('steps.search.description'),
        side: 'bottom',
        align: 'center',
      },
    },
    {
      element: '[data-testid="dashboard-stats"]',
      popover: {
        title: t('steps.dashboard.title'),
        description: t('steps.dashboard.description'),
        side: 'bottom',
        align: 'start',
      },
    },
    {
      element: '[data-testid="profile-dropdown"]',
      popover: {
        title: t('steps.profile.title'),
        description: t('steps.profile.description'),
        side: 'bottom',
        align: 'end',
      },
    },
    {
      popover: {
        title: t('steps.complete.title'),
        description: t('steps.complete.description'),
        align: 'center',
      },
    },
  ]
}

/** @deprecated Use getTourSteps() so steps follow the active locale */
export const tourSteps: Array<DriveStep> = getTourSteps()

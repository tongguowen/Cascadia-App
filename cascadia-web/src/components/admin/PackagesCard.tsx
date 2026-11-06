// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useTranslation } from 'react-i18next'
import { Boxes, Check, Loader2, Lock } from 'lucide-react'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { usePackages } from '@/hooks/usePackages'

/**
 * Read-only listing of the optional packages this instance is licensed for.
 *
 * There is intentionally no toggle: entitlement is set at deploy time via
 * `CASCADIA_PACKAGES`, so an administrator can see what they have but cannot
 * grant themselves more.
 */
export function PackagesCard() {
  const { t } = useTranslation('pages')
  const { packages, loading } = usePackages()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Boxes className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <CardTitle>{t('admin.packages.title')}</CardTitle>
        </div>
        <CardDescription>
          {t('admin.packages.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('admin.packages.loading')}
          </div>
        ) : packages.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 italic">
            {t('admin.packages.empty')}
          </p>
        ) : (
          <ul className="space-y-4">
            {packages.map((pkg) => (
              <li
                key={pkg.id}
                className="rounded-md border border-slate-200 dark:border-slate-700 p-4 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-medium text-slate-900 dark:text-white">
                    {pkg.name}
                  </span>
                  {pkg.enabled ? (
                    <Badge variant="default" className="gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      {t('admin.packages.enabled')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1.5">
                      <Lock className="w-3.5 h-3.5" />
                      {t('admin.packages.notLicensed')}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {pkg.description}
                </p>
                <ul className="text-xs text-slate-500 dark:text-slate-400 list-disc list-inside space-y-0.5">
                  {pkg.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

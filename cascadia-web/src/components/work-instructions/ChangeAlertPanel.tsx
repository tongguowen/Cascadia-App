// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Check, CheckCheck, Clock, X } from 'lucide-react'
import type { WorkInstructionChangeAlert } from '@cascadia/commons/items/types/work-instruction'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { cn } from '@/utils'
import { apiFetch } from '@/api/client'
import { useInvalidateResources, workInstructionAlertsQuery } from '@/query'

interface ChangeAlertPanelProps {
  workInstructionId: string
  onError?: (error: Error) => void
  onSuccess?: (message: string) => void
}

export function ChangeAlertPanel({
  workInstructionId,
  onError,
  onSuccess,
}: ChangeAlertPanelProps) {
  const { t: tp } = useTranslation('pages')
  const alertT = (key: string, options?: Record<string, unknown>) =>
    tp(`workInstructions.alerts.${key}`, options)
  const [filter, setFilter] = useState<string | null>(null)
  const invalidate = useInvalidateResources()

  const filterOptions: Array<{ value: string | null; label: string }> = [
    { value: null, label: alertT('filterAll') },
    { value: 'pending', label: alertT('filterPending') },
    { value: 'acknowledged', label: alertT('filterAcknowledged') },
    { value: 'dismissed', label: alertT('filterDismissed') },
  ]

  const { data, isPending: loading } = useQuery(
    workInstructionAlertsQuery<WorkInstructionChangeAlert>(
      workInstructionId,
      filter ?? undefined,
    ),
  )
  const alerts = data?.alerts ?? []
  const counts = data?.counts ?? { pending: 0, total: 0 }

  const handleAction = async (
    alertId: string,
    action: 'acknowledge' | 'dismiss',
  ) => {
    try {
      await apiFetch(`/api/v1/work-instructions/${workInstructionId}/alerts`, {
        method: 'PUT',
        body: JSON.stringify({ alertId, action }),
      })
      // Refreshes this list and the tab badge together — both hang off the
      // work instruction.
      await invalidate('work-instructions')
      onSuccess?.(
        action === 'acknowledge'
          ? alertT('toastAcknowledged')
          : alertT('toastDismissed'),
      )
    } catch (error) {
      onError?.(error as Error)
    }
  }

  const handleBulkAcknowledge = async () => {
    try {
      const result = await apiFetch<{ data?: { acknowledged?: number } }>(
        `/api/v1/work-instructions/${workInstructionId}/alerts`,
        { method: 'POST' },
      )
      await invalidate('work-instructions')
      const acknowledged = result.data?.acknowledged ?? 0
      onSuccess?.(alertT('toastBulk', { count: acknowledged }))
    } catch (error) {
      onError?.(error as Error)
    }
  }

  const getChangeTypeLabel = (type: string) =>
    alertT(`changeType.${type}`, { defaultValue: type })

  const getChangeTypeBadge = (type: string) => {
    switch (type) {
      case 'part_modified':
        return 'warning' as const
      case 'part_obsoleted':
        return 'destructive' as const
      case 'parametric_stale':
        return 'secondary' as const
      default:
        return 'default' as const
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'acknowledged':
        return <Check className="h-4 w-4 text-green-500" />
      case 'dismissed':
        return <X className="h-4 w-4 text-slate-400" />
      default:
        return null
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {alertT('title')}
              {counts.pending > 0 && (
                <Badge variant="warning">
                  {alertT('pendingBadge', { count: counts.pending })}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>{alertT('description')}</CardDescription>
          </div>
          {counts.pending > 0 && (
            <Button variant="outline" size="sm" onClick={handleBulkAcknowledge}>
              <CheckCheck className="h-4 w-4 mr-2" />
              {alertT('acknowledgeAll')}
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mt-4">
          {filterOptions.map(({ value, label }) => (
            <button
              key={value ?? 'all'}
              className={cn(
                'text-xs px-3 py-1 rounded-full transition-colors',
                filter === value
                  ? 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 dark:bg-slate-800 dark:text-slate-400',
              )}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-slate-500 text-center py-4">{alertT('loading')}</p>
        ) : alerts.length === 0 ? (
          <p className="text-slate-500 text-center py-8">
            {filter
              ? alertT('emptyFilter', {
                  status:
                    filterOptions.find((o) => o.value === filter)?.label ??
                    filter,
                })
              : alertT('emptyAll')}
          </p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  alert.status === 'pending'
                    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
                )}
              >
                {getStatusIcon(alert.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={getChangeTypeBadge(alert.changeType)}>
                      {getChangeTypeLabel(alert.changeType)}
                    </Badge>
                    {alert.part && (
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {alert.part.itemNumber}
                      </span>
                    )}
                    {alert.part?.name && (
                      <span className="text-sm text-slate-500 truncate">
                        {alert.part.name}
                      </span>
                    )}
                  </div>
                  {alert.changedFields && alert.changedFields.length > 0 && (
                    <p className="text-xs text-slate-500 mb-1">
                      {alertT('changedFields', {
                        fields: alert.changedFields.join(', '),
                      })}
                    </p>
                  )}
                  {alert.eco && (
                    <p className="text-xs text-slate-400">
                      {alertT('ecoLine', { itemNumber: alert.eco.itemNumber })}
                      {alert.eco.name ? ` - ${alert.eco.name}` : ''}
                    </p>
                  )}
                  {alert.createdAt && (
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  )}
                </div>
                {alert.status === 'pending' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                      onClick={() => handleAction(alert.id, 'acknowledge')}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      {alertT('ack')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-slate-400 hover:text-slate-600 dark:hover:text-slate-400"
                      onClick={() => handleAction(alert.id, 'dismiss')}
                    >
                      <X className="h-3 w-3 mr-1" />
                      {alertT('dismiss')}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

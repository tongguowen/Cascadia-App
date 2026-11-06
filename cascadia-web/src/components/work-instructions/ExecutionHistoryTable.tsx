// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { DataGridColumn } from '@/components/ui'
import type { InstructionExecution } from '@cascadia/commons/items/types/work-order'
import { Badge, DataGrid } from '@/components/ui'
import { cn } from '@/utils'

interface ExecutionHistoryTableProps {
  executions: Array<InstructionExecution>
  /** Owning work order — review links are scoped to it. */
  workOrderId: string
}

function formatDuration(seconds?: number | null): string {
  if (!seconds) return '—'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes < 60) return `${minutes}m ${secs}s`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

export function ExecutionHistoryTable({
  executions,
  workOrderId,
}: ExecutionHistoryTableProps) {
  const { t: tp } = useTranslation('pages')
  const histT = (key: string, options?: Record<string, unknown>) =>
    tp(`workInstructions.executionHistory.${key}`, options)

  const statusConfig = useMemo(() => {
    const label = (status: string) =>
      histT(`statusLabels.${status}`, { defaultValue: status })
    const inProgress = {
      className:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      label: label('In Progress'),
    }
    return {
      'In Progress': inProgress,
      Complete: {
        className:
          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        label: label('Complete'),
      },
      Incomplete: {
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        label: label('Incomplete'),
      },
      'Pending Approval': {
        className:
          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        label: label('Pending Approval'),
      },
      Approved: {
        className:
          'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        label: label('Approved'),
      },
      Rejected: {
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        label: label('Rejected'),
      },
      inProgressFallback: inProgress,
    }
  }, [histT])

  const columns: Array<DataGridColumn<InstructionExecution>> = [
    {
      id: 'instruction',
      header: histT('instruction'),
      accessorFn: (row) => row.instruction?.title || '—',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.instruction?.title || '—'}
        </span>
      ),
    },
    {
      id: 'executor',
      header: histT('executor'),
      accessorFn: (row) => row.executor?.name || row.executor?.email || '—',
      cell: ({ row }) => (
        <span>
          {row.original.executor?.name || row.original.executor?.email || '—'}
        </span>
      ),
    },
    {
      id: 'unit',
      header: histT('unit'),
      accessorFn: (row) => row.unitLabel || '—',
      cell: ({ row }) =>
        row.original.unitLabel ? (
          <span className="font-mono text-sm">{row.original.unitLabel}</span>
        ) : (
          <span className="text-slate-400">—</span>
        ),
    },
    {
      id: 'status',
      header: histT('status'),
      accessorKey: 'status',
      enableFiltering: true,
      cell: ({ row }) => {
        const config =
          statusConfig[row.original.status as keyof typeof statusConfig] ??
          statusConfig['In Progress']
        return (
          <Badge
            variant="secondary"
            className={cn('font-medium', config.className)}
          >
            {config.label}
          </Badge>
        )
      },
    },
    {
      id: 'startedAt',
      header: histT('started'),
      accessorKey: 'startedAt',
      enableSorting: true,
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.startedAt).toLocaleString()}
        </span>
      ),
    },
    {
      id: 'duration',
      header: histT('duration'),
      accessorKey: 'duration',
      cell: ({ row }) => (
        <span className="tabular-nums">
          {formatDuration(row.original.duration)}
        </span>
      ),
    },
    {
      id: 'dataFields',
      header: histT('dataFields'),
      accessorFn: (row) => Object.keys(row.stepData).length,
      cell: ({ row }) => {
        const count = Object.keys(row.original.stepData).length
        return count > 0 ? (
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {histT('captured', { count })}
          </span>
        ) : (
          <span className="text-slate-400">—</span>
        )
      },
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Link
            to="/work-orders/$id/executions/$executionId"
            params={{
              id: workOrderId,
              executionId: row.original.id,
            }}
            className="text-sm text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium"
          >
            {row.original.status === 'Pending Approval'
              ? histT('review')
              : histT('view')}
          </Link>
        </div>
      ),
    },
  ]

  return (
    <DataGrid
      data={executions}
      columns={columns}
      emptyMessage={histT('empty')}
      enablePagination
    />
  )
}

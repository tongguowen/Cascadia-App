// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import {
  Activity,
  Eye,
  MoreVertical,
  RefreshCw,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import type { DataGridColumn, Row } from '@/components/ui'
import type { Job } from '@/query'
import type { JobPriority, JobStatus } from '@cascadia/commons/jobs/types-wire'
import { Badge, Button, DataGrid } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { jobDetailQuery, jobListQuery, useInvalidateResources } from '@/query'
import { apiFetch } from '@/api/client'

const JOB_LIST_LIMIT = 500
const AUTO_REFRESH_MS = 5000

export const Route = createFileRoute('/admin/jobs')({
  component: JobsPage,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(jobListQuery(JOB_LIST_LIMIT)),
})

const statusVariants: Record<
  JobStatus,
  'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'outline'
> = {
  pending: 'secondary',
  queued: 'outline',
  running: 'warning',
  completed: 'success',
  failed: 'destructive',
  cancelled: 'secondary',
}

const priorityVariants: Record<
  JobPriority,
  'default' | 'secondary' | 'success' | 'destructive' | 'warning' | 'outline'
> = {
  low: 'secondary',
  normal: 'outline',
  high: 'warning',
  critical: 'destructive',
}

const logLevelColors: Record<string, string> = {
  debug: 'text-slate-400',
  info: 'text-blue-500',
  warn: 'text-amber-500',
  error: 'text-red-500',
}

function JobsPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const invalidate = useInvalidateResources()
  const jobTitle = t('admin.jobs.title')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const {
    data: jobs = [],
    error,
    isFetching,
    refetch,
  } = useQuery({
    ...jobListQuery(JOB_LIST_LIMIT),
    refetchInterval: autoRefresh ? AUTO_REFRESH_MS : false,
  })

  const { data: detail, isPending: loadingLogs } = useQuery(
    jobDetailQuery(selectedJob?.id ?? '', selectedJob !== null),
  )
  const jobLogs = detail?.logs ?? []

  const handleRetry = async (job: Job) => {
    setActionLoading(job.id)
    try {
      await apiFetch(`/api/v1/admin/jobs/${job.id}/retry`, { method: 'POST' })
      await invalidate('jobs')
    } catch (err) {
      alert(err instanceof Error ? err.message : t('admin.jobs.retryFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancel = async (job: Job) => {
    if (!confirm(t('admin.jobs.cancelConfirm'))) return

    setActionLoading(job.id)
    try {
      await apiFetch(`/api/v1/admin/jobs/${job.id}/cancel`, { method: 'POST' })
      await invalidate('jobs')
    } catch (err) {
      alert(err instanceof Error ? err.message : t('admin.jobs.cancelFailed'))
    } finally {
      setActionLoading(null)
    }
  }

  const columns: Array<DataGridColumn<Job>> = useMemo(
    () => [
    {
      id: 'type',
      header: t('admin.jobs.colType'),
      accessorKey: 'type',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: t('admin.jobs.filterTypePlaceholder'),
      cell: ({ getValue }) => (
        <span className="font-mono text-sm text-slate-700 dark:text-slate-200">
          {getValue() as string}
        </span>
      ),
    },
    {
      id: 'status',
      header: tc('columns.status'),
      accessorKey: 'status',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: [
        { label: t('admin.jobs.statusPending'), value: 'pending' },
        { label: t('admin.jobs.statusQueued'), value: 'queued' },
        { label: t('admin.jobs.statusRunning'), value: 'running' },
        { label: t('admin.jobs.statusCompleted'), value: 'completed' },
        { label: t('admin.jobs.statusFailed'), value: 'failed' },
        { label: t('admin.jobs.statusCancelled'), value: 'cancelled' },
      ],
      cell: ({ getValue }) => {
        const status = getValue() as JobStatus
        return <Badge variant={statusVariants[status]}>{status}</Badge>
      },
    },
    {
      id: 'priority',
      header: tc('columns.priority'),
      accessorKey: 'priority',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: [
        { label: t('admin.jobs.priorityLow'), value: 'low' },
        { label: t('admin.jobs.priorityNormal'), value: 'normal' },
        { label: t('admin.jobs.priorityHigh'), value: 'high' },
        { label: t('admin.jobs.priorityCritical'), value: 'critical' },
      ],
      cell: ({ getValue }) => {
        const priority = getValue() as JobPriority
        return <Badge variant={priorityVariants[priority]}>{priority}</Badge>
      },
    },
    {
      id: 'progress',
      header: t('admin.jobs.colProgress'),
      accessorKey: 'progress',
      cell: ({ row }) => {
        const progress = row.original.progress
        const message = row.original.progressMessage
        const status = row.original.status

        if (status === 'completed') {
          return (
            <span className="text-green-600 dark:text-green-400">100%</span>
          )
        }
        if (status === 'failed' || status === 'cancelled') {
          return <span className="text-slate-400">-</span>
        }

        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-500">{progress}%</span>
            {message && (
              <span
                className="text-xs text-slate-400 truncate max-w-[100px]"
                title={message}
              >
                {message}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'attempts',
      header: t('admin.jobs.colAttempts'),
      accessorFn: (row) => `${row.attempts}/${row.maxAttempts}`,
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {row.original.attempts}/{row.original.maxAttempts}
        </span>
      ),
    },
    {
      id: 'createdAt',
      header: tc('columns.created'),
      accessorKey: 'createdAt',
      enableSorting: true,
      cell: ({ getValue }) => {
        const date = getValue() as string
        return (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {new Date(date).toLocaleString()}
          </span>
        )
      },
    },
    {
      id: 'error',
      header: t('admin.jobs.colError'),
      accessorKey: 'error',
      cell: ({ getValue }) => {
        const errorValue = getValue() as string | null
        if (!errorValue) return <span className="text-slate-400">-</span>
        return (
          <span
            className="text-xs text-red-600 dark:text-red-400 truncate max-w-[200px] block"
            title={errorValue}
          >
            {errorValue}
          </span>
        )
      },
    },
  ],
    [t, tc],
  )

  const renderRowActions = useCallback(
    (row: Row<Job>) => {
      const job = row.original
      const canRetry = job.status === 'failed'
      const canCancel = job.status === 'pending' || job.status === 'queued'
      const isLoading = actionLoading === job.id

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <MoreVertical className="h-4 w-4" />
              )}
              <span className="sr-only">{tc('actions.openMenu')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedJob(job)}>
              <Eye className="mr-2 h-4 w-4" />
              {tc('actions.viewDetails')}
            </DropdownMenuItem>
            {canRetry && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleRetry(job)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t('admin.jobs.retryJob')}
                </DropdownMenuItem>
              </>
            )}
            {canCancel && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleCancel(job)}
                  className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {t('admin.jobs.cancelJob')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    [actionLoading, t, tc],
  )

  // Calculate stats
  const stats = {
    total: jobs.length,
    pending: jobs.filter((j) => j.status === 'pending').length,
    queued: jobs.filter((j) => j.status === 'queued').length,
    running: jobs.filter((j) => j.status === 'running').length,
    completed: jobs.filter((j) => j.status === 'completed').length,
    failed: jobs.filter((j) => j.status === 'failed').length,
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Activity size={32} className="text-cyan-600 dark:text-cyan-400" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {jobTitle}
          </h1>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
          {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity size={32} className="text-cyan-600 dark:text-cyan-400" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {jobTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`}
            />
            {t('admin.jobs.autoRefresh')}
            {autoRefresh ? ' ✓' : ''}
          </Button>
          <Button
            onClick={() => void refetch()}
            disabled={isFetching}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`}
            />
            {t('admin.jobs.refresh')}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="text-2xl font-bold text-slate-700 dark:text-slate-100">
            {stats.total}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t('admin.jobs.total')}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="text-2xl font-bold text-slate-500 dark:text-slate-400">
            {stats.pending}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t('admin.jobs.pending')}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.queued}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t('admin.jobs.queued')}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.running}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t('admin.jobs.running')}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.completed}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t('admin.jobs.completed')}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-300 dark:border-slate-700">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {stats.failed}
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {t('admin.jobs.failed')}
          </div>
        </div>
      </div>

      {/* DataGrid */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700">
        <DataGrid
          data={jobs}
          columns={columns}
          getRowId={(row) => row.id}
          enableRowActions
          renderRowActions={renderRowActions}
          emptyMessage={
            isFetching ? t('admin.jobs.emptyLoading') : t('admin.jobs.emptyNone')
          }
          emptyDescription={
            isFetching ? '' : t('admin.jobs.emptyDescription')
          }
          exportFilename="jobs"
        />
      </div>

      {/* Job Detail Dialog */}
      <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              {t('admin.jobs.detailTitle')}
            </DialogTitle>
          </DialogHeader>

          {selectedJob && (
            <div className="flex-1 overflow-y-auto space-y-6">
              {/* Job Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {tc('columns.type')}
                  </div>
                  <div className="font-mono text-sm text-slate-900 dark:text-slate-100">
                    {selectedJob.type}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {tc('columns.status')}
                  </div>
                  <Badge variant={statusVariants[selectedJob.status]}>
                    {selectedJob.status}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {tc('columns.priority')}
                  </div>
                  <Badge variant={priorityVariants[selectedJob.priority]}>
                    {selectedJob.priority}
                  </Badge>
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {t('admin.jobs.colAttempts')}
                  </div>
                  <div className="text-slate-900 dark:text-slate-100">
                    {selectedJob.attempts} / {selectedJob.maxAttempts}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {tc('columns.created')}
                  </div>
                  <div className="text-slate-900 dark:text-slate-100">
                    {new Date(selectedJob.createdAt).toLocaleString()}
                  </div>
                </div>
                {selectedJob.completedAt && (
                  <div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {t('admin.jobs.detailCompleted')}
                    </div>
                    <div className="text-slate-900 dark:text-slate-100">
                      {new Date(selectedJob.completedAt).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>

              {/* Error */}
              {selectedJob.error && (
                <div>
                  <div className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">
                    {t('admin.jobs.colError')}
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap">
                    {selectedJob.error}
                  </div>
                </div>
              )}

              {/* Payload */}
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('admin.jobs.detailPayload')}
                </div>
                <pre className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-3 text-xs text-slate-700 dark:text-slate-300 overflow-x-auto max-h-48">
                  {JSON.stringify(selectedJob.payload, null, 2)}
                </pre>
              </div>

              {/* Result */}
              {selectedJob.result && (
                <div>
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    {tc('columns.result')}
                  </div>
                  <pre className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-3 text-xs text-slate-700 dark:text-slate-300 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedJob.result, null, 2)}
                  </pre>
                </div>
              )}

              {/* Logs */}
              <div>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  {t('admin.jobs.detailLogs')}
                </div>
                {loadingLogs ? (
                  <div className="text-sm text-slate-500">
                    {t('admin.jobs.loadingLogs')}
                  </div>
                ) : jobLogs.length === 0 ? (
                  <div className="text-sm text-slate-500">
                    {t('admin.jobs.noLogs')}
                  </div>
                ) : (
                  <div className="bg-slate-900 dark:bg-slate-950 rounded p-3 text-xs font-mono max-h-48 overflow-y-auto space-y-1">
                    {jobLogs.map((log) => (
                      <div key={log.id} className="flex gap-2">
                        <span className="text-slate-500 shrink-0">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </span>
                        <span
                          className={`shrink-0 uppercase ${logLevelColors[log.level] || 'text-slate-400'}`}
                        >
                          [{log.level}]
                        </span>
                        <span className="text-slate-300">{log.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

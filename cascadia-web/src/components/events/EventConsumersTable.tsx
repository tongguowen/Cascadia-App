// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { MoreVertical, RotateCcw, SkipForward, Trash2 } from 'lucide-react'
import type { DataGridColumn, Row } from '@/components/ui'
import type { EventConsumerStatus } from '@/query'
import { Badge, Button, DataGrid } from '@/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

export interface EventConsumersTableProps {
  consumers: Array<EventConsumerStatus>
  latestSeq: number
  onResume: (consumer: EventConsumerStatus) => void
  onSkip: (consumer: EventConsumerStatus) => void
  onForget: (consumer: EventConsumerStatus) => void
  onViewError: (consumer: EventConsumerStatus) => void
  busyId?: string | null
}

const DESTRUCTIVE_ITEM =
  'text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400'

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

/**
 * Cursor state for every event consumer, with the actions an operator has.
 *
 * Two presentation rules that look like details and are not:
 *
 * - **`registeredHere: false` is not a fault** and must not render as one.
 *   Each process registers only the consumers it runs — the RabbitMQ relay and
 *   the webhook dispatcher run in the jobs worker alone — so the process
 *   serving this page legitimately reports false for those. What says "nothing
 *   is draining this" is lag that grows while `updatedAt` stays stale — which
 *   is why this table shows both columns next to each other instead of a
 *   single health light.
 * - **Abandoned is worse than parked**, and is shown as such. A parked consumer
 *   still holds its backlog and the retention horizon with it; an abandoned one
 *   has forfeited both and has to be re-registered to come back.
 */
export function EventConsumersTable({
  consumers,
  latestSeq,
  onResume,
  onSkip,
  onForget,
  onViewError,
  busyId = null,
}: EventConsumersTableProps) {
  const { t: tp } = useTranslation('pages')
  const { t: tc } = useTranslation('common')

  const columns: Array<DataGridColumn<EventConsumerStatus>> = useMemo(
    () => [
    {
      id: 'id',
      header: tp('admin.events.consumersTable.colConsumer'),
      accessorKey: 'id',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: tp('admin.events.consumersTable.filterIdPlaceholder'),
      cell: ({ getValue }) => (
        <span className="font-mono text-sm text-slate-700 dark:text-slate-200">
          {getValue() as string}
        </span>
      ),
    },
    {
      id: 'state',
      header: tp('admin.events.consumersTable.colState'),
      accessorFn: (row) =>
        row.abandonedAt
          ? 'abandoned'
          : row.parkedAt
            ? 'parked'
            : row.nextAttemptAt
              ? 'retrying'
              : row.lag > 0
                ? 'behind'
                : 'current',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: [
        {
          label: tp('admin.events.consumersTable.stateCurrent'),
          value: 'current',
        },
        {
          label: tp('admin.events.consumersTable.stateBehind'),
          value: 'behind',
        },
        {
          label: tp('admin.events.consumersTable.stateRetrying'),
          value: 'retrying',
        },
        {
          label: tp('admin.events.consumersTable.stateParked'),
          value: 'parked',
        },
        {
          label: tp('admin.events.consumersTable.stateAbandoned'),
          value: 'abandoned',
        },
      ],
      cell: ({ getValue }) => {
        const state = getValue() as string
        if (state === 'abandoned') {
          return (
            <Badge
              variant="destructive"
              title={tp('admin.events.consumersTable.abandonedTitle')}
            >
              {tp('admin.events.consumersTable.stateAbandoned')}
            </Badge>
          )
        }
        if (state === 'parked') {
          return (
            <Badge
              variant="destructive"
              title={tp('admin.events.consumersTable.parkedTitle')}
            >
              {tp('admin.events.consumersTable.stateParked')}
            </Badge>
          )
        }
        if (state === 'retrying')
          return (
            <Badge variant="warning">
              {tp('admin.events.consumersTable.stateRetrying')}
            </Badge>
          )
        if (state === 'behind')
          return (
            <Badge variant="outline">
              {tp('admin.events.consumersTable.stateBehind')}
            </Badge>
          )
        return (
          <Badge variant="success">
            {tp('admin.events.consumersTable.stateCurrent')}
          </Badge>
        )
      },
    },
    {
      id: 'lag',
      header: tp('admin.events.consumersTable.colLag'),
      accessorKey: 'lag',
      cell: ({ getValue }) => {
        const lag = getValue() as number
        return (
          <span
            className={
              lag > 0
                ? 'font-medium text-amber-600 dark:text-amber-400'
                : 'text-slate-500 dark:text-slate-400'
            }
          >
            {lag > 0 ? lag.toLocaleString() : '—'}
          </span>
        )
      },
    },
    {
      id: 'cursor',
      header: tp('admin.events.consumersTable.colCursor'),
      accessorKey: 'lastSeq',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {(getValue() as number).toLocaleString()} /{' '}
          {latestSeq.toLocaleString()}
        </span>
      ),
    },
    {
      id: 'failures',
      header: tp('admin.events.consumersTable.colFailures'),
      accessorKey: 'failureCount',
      cell: ({ row }) => {
        const consumer = row.original
        if (consumer.failureCount === 0) {
          return <span className="text-slate-500 dark:text-slate-400">—</span>
        }
        return (
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-red-600 dark:text-red-400"
            onClick={() => onViewError(consumer)}
          >
            {tp('admin.events.consumersTable.seeError', {
              count: consumer.failureCount,
            })}
          </Button>
        )
      },
    },
    {
      id: 'updatedAt',
      header: tp('admin.events.consumersTable.colLastProgress'),
      accessorKey: 'updatedAt',
      cell: ({ getValue }) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {formatWhen(getValue() as string)}
        </span>
      ),
    },
    {
      id: 'registeredHere',
      header: tp('admin.events.consumersTable.colPolledBy'),
      accessorKey: 'registeredHere',
      cell: ({ getValue }) => {
        const here = getValue() as boolean
        // Deliberately neutral in both cases: see the rule in this file's
        // docstring. `false` is what an API process reports for every
        // consumer, and rendering it as a warning would cry wolf on every row.
        return (
          <span
            className="text-xs text-slate-500 dark:text-slate-400"
            title={
              here
                ? tp('admin.events.consumersTable.polledHereTitle')
                : tp('admin.events.consumersTable.polledElsewhereTitle')
            }
          >
            {here
              ? tp('admin.events.consumersTable.polledHere')
              : tp('admin.events.consumersTable.polledElsewhere')}
          </span>
        )
      },
    },
  ],
    [onViewError, tp],
  )

  const renderRowActions = (row: Row<EventConsumerStatus>) => {
    const consumer = row.original
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            disabled={busyId === consumer.id}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">{tc('actions.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {/* An abandoned consumer's backlog may already be pruned, so the
              server refuses both actions; forgetting it is the way back. */}
          <DropdownMenuItem
            onClick={() => onResume(consumer)}
            disabled={consumer.abandonedAt !== null}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {tp('admin.events.consumersTable.resume')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onSkip(consumer)}
            disabled={
              consumer.lastErrorSeq === null || consumer.abandonedAt !== null
            }
          >
            <SkipForward className="mr-2 h-4 w-4" />
            {tp('admin.events.consumersTable.skipFailingEvent')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onForget(consumer)}
            className={DESTRUCTIVE_ITEM}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {tp('admin.events.consumersTable.forgetCursor')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DataGrid
      data={consumers}
      columns={columns}
      getRowId={(consumer) => consumer.id}
      enableRowActions={true}
      renderRowActions={renderRowActions}
      emptyMessage={tp('admin.events.consumersTable.emptyMessage')}
      emptyDescription={tp('admin.events.consumersTable.emptyDescription')}
    />
  )
}

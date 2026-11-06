// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  KeyRound,
  ListOrdered,
  MoreVertical,
  Pause,
  Pencil,
  Play,
  Trash2,
} from 'lucide-react'
import type { DataGridColumn, Row } from '@/components/ui'
import type { WebhookSubscription } from '@/query'
import { Badge, Button, DataGrid } from '@/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'

export interface WebhookSubscriptionsTableProps {
  subscriptions: Array<WebhookSubscription>
  onEdit: (subscription: WebhookSubscription) => void
  onEnable: (subscription: WebhookSubscription) => void
  onDisable: (subscription: WebhookSubscription) => void
  onRotate: (subscription: WebhookSubscription) => void
  onDelete: (subscription: WebhookSubscription) => void
  onViewDeliveries: (subscription: WebhookSubscription) => void
  busyId?: string | null
}

const DESTRUCTIVE_ITEM =
  'text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400'

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

/**
 * Every live subscription, with the operator's actions.
 *
 * The state column keeps **auto-disabled** distinct from **off**, mirroring the
 * two columns behind it. They are not the same fact: one is a decision the
 * operator made and can undo, the other is the system reporting that a receiver
 * stopped answering — and collapsing them would leave somebody staring at a
 * subscription they know they left switched on. An auto-disabled row is surfaced
 * the way a parked consumer is, with the reason attached rather than inferred.
 */
export function WebhookSubscriptionsTable({
  subscriptions,
  onEdit,
  onEnable,
  onDisable,
  onRotate,
  onDelete,
  onViewDeliveries,
  busyId = null,
}: WebhookSubscriptionsTableProps) {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const tt = (key: string, options?: Record<string, unknown>) =>
    t(`admin.webhooks.table.${key}`, options)

  const columns: Array<DataGridColumn<WebhookSubscription>> = useMemo(
    () => [
    {
      id: 'name',
      header: tc('fields.name'),
      accessorKey: 'name',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: tt('filterNamePlaceholder'),
    },
    {
      id: 'targetUrl',
      header: tt('colTarget'),
      accessorKey: 'targetUrl',
      cell: ({ getValue }) => (
        <span
          className="font-mono text-xs text-slate-600 dark:text-slate-300"
          title={getValue() as string}
        >
          {getValue() as string}
        </span>
      ),
    },
    {
      id: 'state',
      header: tc('columns.state'),
      accessorFn: (row) =>
        row.disabledAt ? 'auto-disabled' : row.enabled ? 'active' : 'off',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: [
        { label: tt('stateActive'), value: 'active' },
        { label: tt('stateOff'), value: 'off' },
        { label: tt('stateAutoDisabled'), value: 'auto-disabled' },
      ],
      cell: ({ row, getValue }) => {
        const state = getValue() as string
        if (state === 'auto-disabled') {
          return (
            <Badge
              variant="destructive"
              title={
                row.original.disabledReason ?? tt('autoDisabledTitle')
              }
            >
              {tt('stateAutoDisabled')}
            </Badge>
          )
        }
        if (state === 'off')
          return <Badge variant="secondary">{tt('stateOff')}</Badge>
        return <Badge variant="success">{tt('stateActive')}</Badge>
      },
    },
    {
      id: 'eventTypes',
      header: tt('colEvents'),
      cell: ({ row }) => {
        const types = row.original.eventTypes
        if (types.length === 0) {
          return (
            <span
              className="text-slate-500 dark:text-slate-400"
              title={tt('allTypesTitle')}
            >
              {tt('allTypes')}
            </span>
          )
        }
        return (
          <span
            className="text-xs text-slate-600 dark:text-slate-300"
            title={types.join('\n')}
          >
            {types.length === 1
              ? types[0]
              : tt('typesCount', { count: types.length })}
          </span>
        )
      },
    },
    {
      id: 'signing',
      header: tt('colSigning'),
      cell: ({ row }) =>
        row.original.secretPrefix ? (
          <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
            {row.original.secretPrefix}…
          </span>
        ) : (
          <Badge variant="warning" title={tt('unsignedTitle')}>
            {tt('unsigned')}
          </Badge>
        ),
    },
    {
      id: 'failures',
      header: tt('colFailures'),
      accessorKey: 'consecutiveFailures',
      cell: ({ getValue }) => {
        const count = getValue() as number
        return count === 0 ? (
          <span className="text-slate-500 dark:text-slate-400">—</span>
        ) : (
          <span className="font-medium text-red-600 dark:text-red-400">
            {count}
          </span>
        )
      },
    },
    {
      id: 'lastSuccessAt',
      header: tt('colLastDelivered'),
      accessorKey: 'lastSuccessAt',
      cell: ({ getValue }) => (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {formatWhen(getValue() as string | null)}
        </span>
      ),
    },
  ],
    [t, tc],
  )

  const renderRowActions = (row: Row<WebhookSubscription>) => {
    const subscription = row.original
    const isOn = subscription.enabled && !subscription.disabledAt

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            disabled={busyId === subscription.id}
          >
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">{tc('actions.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onViewDeliveries(subscription)}>
            <ListOrdered className="mr-2 h-4 w-4" />
            {tt('deliveryLog')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(subscription)}>
            <Pencil className="mr-2 h-4 w-4" />
            {tc('actions.edit')}
          </DropdownMenuItem>
          {isOn ? (
            <DropdownMenuItem onClick={() => onDisable(subscription)}>
              <Pause className="mr-2 h-4 w-4" />
              {tt('disableAction')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onEnable(subscription)}>
              <Play className="mr-2 h-4 w-4" />
              {tt('enableAction')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onRotate(subscription)}>
            <KeyRound className="mr-2 h-4 w-4" />
            {tt('rotateSecret')}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(subscription)}
            className={DESTRUCTIVE_ITEM}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {tc('actions.delete')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DataGrid
      data={subscriptions}
      columns={columns}
      getRowId={(subscription) => subscription.id}
      enableRowActions={true}
      renderRowActions={renderRowActions}
      emptyMessage={tt('emptyMessage')}
      emptyDescription={tt('emptyDescription')}
    />
  )
}

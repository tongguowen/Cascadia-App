// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, Edit, Eye, MoreVertical, Trash2 } from 'lucide-react'
import type { ChangeOrder } from '@cascadia/commons/items/types/change-order'
import type { DataGridColumn, Row } from '@/components/ui'
import { Badge, Button, DataGrid } from '@/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/ContextMenu'
import { StateBadge } from '@/components/items/StateBadge'
import { useLifecyclePhases } from '@/hooks/useLifecyclePhases'
import { translateStateName } from '@/i18n'

interface ChangeOrderTableProps {
  items: Array<ChangeOrder>
  onEdit?: (changeOrder: ChangeOrder) => void
  onDelete?: (changeOrder: ChangeOrder) => void
  // Server-side pagination
  serverSidePagination?: boolean
  totalRows?: number
  onPageChange?: (page: number, pageSize: number) => void
  isLoading?: boolean
}

const priorityColors: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  low: 'secondary',
  medium: 'default',
  high: 'warning',
  critical: 'destructive',
}

const riskLevelColors: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  low: 'success',
  medium: 'warning',
  high: 'destructive',
  critical: 'destructive',
}

export function ChangeOrderTable({
  items,
  onEdit,
  onDelete,
  serverSidePagination,
  totalRows,
  onPageChange,
  isLoading,
}: ChangeOrderTableProps) {
  // State filter options and badges come from the ChangeOrder lifecycle's
  // configuration, not from a list in code
  const { t } = useTranslation('common')
  const { t: tp } = useTranslation('pages')
  const { data: lifecycle } = useLifecyclePhases('ChangeOrder')
  const stateFilterOptions = (lifecycle?.states ?? []).map((state) => ({
    label: translateStateName(state.name),
    value: state.id,
  }))
  const changeTypeFilterOptions = (
    ['ECO', 'ECN', 'MCO', 'Deviation', 'XCO'] as const
  ).map((value) => ({
    value,
    label: t(`enum.changeType.${value}`),
  }))
  const priorityFilterOptions = (
    ['low', 'medium', 'high', 'critical'] as const
  ).map((value) => ({
    value,
    label: t(`enum.priority.${value}`),
  }))
  const riskFilterOptions = (['low', 'medium', 'high', 'critical'] as const).map(
    (value) => ({
      value,
      label: t(`enum.severity.${value}`),
    }),
  )

  // The server refuses to hard-delete a change order that has left its initial
  // state — past that it holds votes, workflow history and an affected-item
  // list that the delete would cascade away. Offering the action anyway would
  // be offering a guaranteed error, so the menu item follows the same rule.
  // A hint, not the gate: ItemService.delete is the gate.
  const isDeletable = useCallback(
    (co: ChangeOrder) =>
      (lifecycle?.states ?? []).some(
        (state) => state.isInitial === true && state.id === co.state,
      ),
    [lifecycle],
  )

  const columns: Array<DataGridColumn<ChangeOrder>> = [
    {
      id: 'itemNumber',
      header: t('columns.itemNumber'),
      accessorKey: 'itemNumber',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: t('filters.searchPlaceholder'),
      cell: ({ row }) =>
        row.original.id ? (
          <Link
            to="/change-orders/$id"
            params={{ id: row.original.id }}
            className="font-medium text-sky-600 hover:text-sky-800 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          >
            {row.original.itemNumber}
          </Link>
        ) : (
          <span className="font-medium">{row.original.itemNumber}</span>
        ),
    },
    {
      id: 'revision',
      header: t('columns.rev'),
      accessorKey: 'revision',
      enableSorting: true,
    },
    {
      id: 'name',
      header: t('columns.name'),
      accessorKey: 'name',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: t('filters.searchPlaceholder'),
      cell: ({ getValue }) => {
        const value = getValue() as string
        return (
          <div className="max-w-xs truncate" title={value}>
            {value || '-'}
          </div>
        )
      },
    },
    {
      id: 'changeType',
      header: t('columns.type'),
      accessorKey: 'changeType',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: changeTypeFilterOptions,
      cell: ({ getValue }) => {
        const value = getValue() as string
        return (
          <Badge variant="default">
            {t(`enum.changeType.${value}`, { defaultValue: value })}
          </Badge>
        )
      },
    },
    {
      id: 'priority',
      header: t('columns.priority'),
      accessorKey: 'priority',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: priorityFilterOptions,
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined
        if (!value) return null
        return (
          <Badge variant={priorityColors[value]}>
            {t(`enum.priority.${value}`)}
          </Badge>
        )
      },
    },
    {
      id: 'state',
      header: t('columns.state'),
      accessorKey: 'state',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: stateFilterOptions,
      cell: ({ getValue }) => (
        <StateBadge itemType="ChangeOrder" state={getValue() as string} />
      ),
    },
    {
      id: 'riskLevel',
      header: t('columns.riskLevel'),
      accessorKey: 'riskLevel',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: riskFilterOptions,
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined
        if (!value) return <span className="text-slate-400">-</span>

        return (
          <div className="flex items-center gap-1">
            {(value === 'high' || value === 'critical') && (
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
            <Badge variant={riskLevelColors[value]}>
              {t(`enum.severity.${value}`)}
            </Badge>
          </div>
        )
      },
    },
  ]

  const renderRowActions = (row: Row<ChangeOrder>) => {
    const co = row.original
    const canDelete = onDelete && isDeletable(co)
    const hasActions = co.id || onEdit || canDelete
    if (!hasActions) return null

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">{t('actions.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {co.id && (
            <DropdownMenuItem asChild>
              <Link to="/change-orders/$id" params={{ id: co.id }}>
                <Eye className="mr-2 h-4 w-4" />
                {t('actions.viewDetails')}
              </Link>
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(co)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </DropdownMenuItem>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(co)}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('actions.delete')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const renderContextMenuItems = useCallback(
    (row: Row<ChangeOrder>) => {
      const co = row.original
      const canDelete = onDelete && isDeletable(co)
      const hasActions = onEdit || canDelete
      if (!hasActions) return null

      return (
        <>
          {onEdit && (
            <ContextMenuItem onClick={() => onEdit(co)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </ContextMenuItem>
          )}
          {canDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onDelete(co)}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('actions.delete')}
              </ContextMenuItem>
            </>
          )}
        </>
      )
    },
    [onEdit, onDelete, isDeletable],
  )

  const getRowUrl = useCallback((row: ChangeOrder) => {
    return row.id ? `/change-orders/${row.id}` : ''
  }, [])

  return (
    <DataGrid
      data={items}
      columns={columns}
      getRowId={(row) => row.id ?? row.itemNumber ?? ''}
      enableRowActions={true}
      renderRowActions={renderRowActions}
      enableContextMenu
      getRowUrl={getRowUrl}
      renderContextMenuItems={renderContextMenuItems}
      emptyMessage={tp('changeOrders.emptyMessage')}
      emptyDescription={tp('changeOrders.emptyDescription')}
      exportFilename="change-orders"
      serverSidePagination={serverSidePagination}
      totalRows={totalRows}
      onPageChange={onPageChange}
      isLoading={isLoading}
    />
  )
}

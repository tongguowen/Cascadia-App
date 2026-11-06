// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Edit2, Trash2, XCircle } from 'lucide-react'
import type { LifecycleDefinition } from '@cascadia/commons/lifecycles/types'
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

interface LifecycleTableProps {
  lifecycles: Array<LifecycleDefinition>
  onDelete?: (lifecycle: LifecycleDefinition) => void
}

export function LifecycleTable({ lifecycles, onDelete }: LifecycleTableProps) {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const lt = (key: string) => t(`lifecycles.table.${key}`)

  const columns: Array<DataGridColumn<LifecycleDefinition>> = useMemo(
    () => [
    {
      id: 'name',
      header: lt('name'),
      accessorKey: 'name',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: lt('searchLifecycles'),
      cell: ({ row }) =>
        row.original.id ? (
          <Link
            to="/lifecycles/$id"
            params={{ id: row.original.id }}
            className="font-medium text-sky-600 hover:text-sky-800 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          >
            {row.original.name}
          </Link>
        ) : (
          <span className="font-medium">{row.original.name}</span>
        ),
    },
    {
      id: 'description',
      header: lt('description'),
      accessorKey: 'description',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: lt('searchDescriptions'),
      cell: ({ getValue }) => {
        const value = getValue() as string
        return (
          <div className="max-w-xs truncate text-slate-500" title={value}>
            {value || '-'}
          </div>
        )
      },
    },
    {
      id: 'statesCount',
      header: lt('states'),
      accessorFn: (row) => row.states.length,
      enableSorting: true,
      enableFiltering: true,
      filterType: 'range',
      filterPlaceholder: tc('actions.any'),
      meta: { align: 'right' },
    },
    {
      id: 'changeActionsCount',
      header: lt('changeActions'),
      accessorFn: (row) => Object.keys(row.changeActionMappings || {}).length,
      enableSorting: true,
      enableFiltering: true,
      filterType: 'range',
      filterPlaceholder: tc('actions.any'),
      meta: { align: 'right' },
    },
    {
      id: 'isActive',
      header: lt('status'),
      accessorKey: 'isActive',
      enableFiltering: true,
      filterType: 'select',
      filterOptions: [
        { label: lt('active'), value: 'true' },
        { label: lt('inactive'), value: 'false' },
      ],
      cell: ({ getValue }) => {
        const isActive = getValue() as boolean
        if (isActive) {
          return (
            <Badge variant="success">
              <CheckCircle className="h-3 w-3 mr-1" />
              {lt('active')}
            </Badge>
          )
        }
        return (
          <Badge variant="secondary">
            <XCircle className="h-3 w-3 mr-1" />
            {lt('inactive')}
          </Badge>
        )
      },
    },
  ],
    [lt, tc],
  )

  const renderRowActions = (row: Row<LifecycleDefinition>) => {
    const lifecycle = row.original
    const hasActions = lifecycle.id || onDelete
    if (!hasActions) return null

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost">
            <Edit2 className="h-4 w-4" />
            <span className="sr-only">{tc('actions.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {lifecycle.id && (
            <DropdownMenuItem asChild>
              <Link to="/lifecycles/$id" params={{ id: lifecycle.id }}>
                <Edit2 className="mr-2 h-4 w-4" />
                {lt('editLifecycle')}
              </Link>
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(lifecycle)}
                className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {tc('actions.delete')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const renderContextMenuItems = useCallback(
    (row: Row<LifecycleDefinition>) => {
      const lifecycle = row.original
      if (!onDelete) return null

      return (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={() => onDelete(lifecycle)}
            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {tc('actions.delete')}
          </ContextMenuItem>
        </>
      )
    },
    [onDelete, tc],
  )

  const getRowUrl = useCallback((row: LifecycleDefinition) => {
    return row.id ? `/lifecycles/${row.id}` : undefined
  }, [])

  return (
    <DataGrid
      data={lifecycles}
      columns={columns}
      getRowId={(row) => row.id || row.name}
      enableRowActions={true}
      renderRowActions={renderRowActions}
      enableContextMenu
      getRowUrl={getRowUrl}
      renderContextMenuItems={renderContextMenuItems}
      emptyMessage={lt('emptyMessage')}
      emptyDescription={lt('emptyDescription')}
      exportFilename="lifecycles"
    />
  )
}

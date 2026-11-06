// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit, Eye, MoreVertical, Trash2 } from 'lucide-react'
import type { Task } from '@cascadia/commons/items/types/task'
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

interface TaskTableProps {
  items: Array<Task>
  onEdit?: (task: Task) => void
  onDelete?: (task: Task) => void
}

const priorityColors: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  Low: 'secondary',
  Medium: 'default',
  High: 'warning',
  Critical: 'destructive',
}

const formatDate = (date?: string | Date) => {
  if (!date) return '-'
  try {
    return new Date(date).toLocaleDateString()
  } catch {
    return '-'
  }
}

export function TaskTable({ items, onEdit, onDelete }: TaskTableProps) {
  const { t } = useTranslation('common')
  // State filter options and badges come from the Task lifecycle's
  // configuration, not from a list in code
  const { data: lifecycle } = useLifecyclePhases('Task')
  const stateFilterOptions = (lifecycle?.states ?? []).map((state) => ({
    label: translateStateName(state.name),
    value: state.id,
  }))
  const priorityFilterOptions = (
    ['Low', 'Medium', 'High', 'Critical'] as const
  ).map((value) => ({
    value,
    label: t(`enum.priority.${value}`),
  }))

  const columns: Array<DataGridColumn<Task>> = [
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
            to="/tasks/$id"
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
          <div className="max-w-md truncate" title={value}>
            {value || '-'}
          </div>
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
        <StateBadge itemType="Task" state={getValue() as string} />
      ),
    },
    {
      id: 'dueDate',
      header: t('columns.dueDate'),
      accessorKey: 'dueDate',
      enableSorting: true,
      cell: ({ getValue }) =>
        formatDate(getValue() as string | Date | undefined),
    },
    {
      id: 'estimatedHours',
      header: t('columns.estHours'),
      accessorKey: 'estimatedHours',
      enableSorting: true,
      enableFiltering: true,
      filterType: 'range',
      filterPlaceholder: t('actions.any'),
      meta: { align: 'right' },
      cell: ({ getValue }) => {
        const value = getValue() as number | undefined
        return value || '-'
      },
    },
  ]

  const renderRowActions = (row: Row<Task>) => {
    const task = row.original
    const hasActions = task.id || onEdit || onDelete
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
          {task.id && (
            <DropdownMenuItem asChild>
              <Link to="/tasks/$id" params={{ id: task.id }}>
                <Eye className="mr-2 h-4 w-4" />
                {t('actions.viewDetails')}
              </Link>
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(task)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(task)}
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
    (row: Row<Task>) => {
      const task = row.original
      const hasActions = onEdit || onDelete
      if (!hasActions) return null

      return (
        <>
          {onEdit && (
            <ContextMenuItem onClick={() => onEdit(task)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </ContextMenuItem>
          )}
          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onDelete(task)}
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
    [onEdit, onDelete],
  )

  const getRowUrl = useCallback((row: Task) => {
    return row.id ? `/tasks/${row.id}` : ''
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
      emptyMessage="No tasks found"
      emptyDescription="Create your first task to get started"
      exportFilename="tasks"
    />
  )
}

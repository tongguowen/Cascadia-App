// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit, Eye, MoreVertical, Trash2 } from 'lucide-react'
import type { Requirement } from '@cascadia/commons/items/types/requirement'
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

interface RequirementTableProps {
  requirements: Array<Requirement>
  onEdit?: (requirement: Requirement) => void
  onDelete?: (requirement: Requirement) => void
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
  MustHave: 'destructive',
  ShouldHave: 'warning',
  CouldHave: 'default',
  WontHave: 'secondary',
}

const priorityLabels: Record<string, string> = {
  MustHave: 'Must Have',
  ShouldHave: 'Should Have',
  CouldHave: 'Could Have',
  WontHave: "Won't Have",
}

export function RequirementTable({
  requirements,
  onEdit,
  onDelete,
  serverSidePagination,
  totalRows,
  onPageChange,
  isLoading,
}: RequirementTableProps) {
  // State filter options and badges come from the Requirement lifecycle's
  // configuration, not from a list in code
  const { t } = useTranslation('common')
  const { data: lifecycle } = useLifecyclePhases('Requirement')
  const stateFilterOptions = (lifecycle?.states ?? []).map((state) => ({
    label: translateStateName(state.name),
    value: state.id,
  }))

  const columns: Array<DataGridColumn<Requirement>> = [
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
            to="/requirements/$id"
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
      cell: ({ getValue }) => (getValue() as string) || '-',
    },
    {
      id: 'type',
      header: t('columns.type'),
      accessorKey: 'type',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: t('filters.filterType'),
      cell: ({ getValue }) => (getValue() as string) || '-',
    },
    {
      id: 'priority',
      header: t('columns.priority'),
      accessorKey: 'priority',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: [
        { label: 'Must Have', value: 'MustHave' },
        { label: 'Should Have', value: 'ShouldHave' },
        { label: 'Could Have', value: 'CouldHave' },
        { label: "Won't Have", value: 'WontHave' },
      ],
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined
        if (!value) return null
        return (
          <Badge variant={priorityColors[value]}>
            {priorityLabels[value] || value}
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
        <StateBadge itemType="Requirement" state={getValue() as string} />
      ),
    },
  ]

  const renderRowActions = (row: Row<Requirement>) => {
    const requirement = row.original
    const hasActions = requirement.id || onEdit || onDelete
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
          {requirement.id && (
            <DropdownMenuItem asChild>
              <Link to="/requirements/$id" params={{ id: requirement.id }}>
                <Eye className="mr-2 h-4 w-4" />
                {t('actions.viewDetails')}
              </Link>
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(requirement)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(requirement)}
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
    (row: Row<Requirement>) => {
      const requirement = row.original
      const hasActions = onEdit || onDelete
      if (!hasActions) return null

      return (
        <>
          {onEdit && (
            <ContextMenuItem onClick={() => onEdit(requirement)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </ContextMenuItem>
          )}
          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onDelete(requirement)}
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

  const getRowUrl = useCallback((row: Requirement) => {
    return row.id ? `/requirements/${row.id}` : ''
  }, [])

  return (
    <DataGrid
      data={requirements}
      columns={columns}
      getRowId={(row) => row.id ?? row.itemNumber ?? ''}
      enableRowActions={true}
      renderRowActions={renderRowActions}
      enableContextMenu
      getRowUrl={getRowUrl}
      renderContextMenuItems={renderContextMenuItems}
      emptyMessage="No requirements found"
      emptyDescription="Create your first requirement to get started"
      exportFilename="requirements"
      serverSidePagination={serverSidePagination}
      totalRows={totalRows}
      onPageChange={onPageChange}
      isLoading={isLoading}
    />
  )
}

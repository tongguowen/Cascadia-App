// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit, Eye, MoreVertical, Trash2 } from 'lucide-react'
import type { Program } from '@cascadia/commons/types/program'
import type {
  ColumnFiltersState,
  DataGridColumn,
  PaginationState,
  Row,
  SortingState,
} from '@/components/ui'
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

interface ProgramTableProps {
  items: Array<Program>
  onEdit?: (program: Program) => void
  onDelete?: (program: Program) => void
  // Initial state from URL (uncontrolled - just sets starting values)
  defaultSorting?: SortingState
  defaultColumnFilters?: ColumnFiltersState
  defaultGlobalFilter?: string
  // Server-side pagination
  serverSidePagination?: boolean
  totalRows?: number
  onPageChange?: (page: number, pageSize: number) => void
  isLoading?: boolean
  // Server-side operations (controlled state)
  serverSideOperations?: boolean
  sorting?: SortingState
  onSortingChange?: (sorting: SortingState) => void
  columnFilters?: ColumnFiltersState
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void
  globalFilter?: string
  onGlobalFilterChange?: (filter: string) => void
  pagination?: PaginationState
  onPaginationChange?: (pagination: PaginationState) => void
}

const statusColors: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  Active: 'success',
  'On Hold': 'warning',
  Completed: 'secondary',
  Cancelled: 'destructive',
}

export function ProgramTable({
  items,
  onEdit,
  onDelete,
  defaultSorting,
  defaultColumnFilters,
  defaultGlobalFilter,
  serverSidePagination,
  totalRows,
  onPageChange,
  isLoading,
  serverSideOperations,
  sorting,
  onSortingChange,
  columnFilters,
  onColumnFiltersChange,
  globalFilter,
  onGlobalFilterChange,
  pagination,
  onPaginationChange,
}: ProgramTableProps) {
  const { t } = useTranslation('common')
  const { t: tp } = useTranslation('pages')
  const programStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      Active: tp('programs.form.statusActive'),
      'On Hold': tp('programs.form.statusOnHold'),
      Completed: tp('programs.form.statusCompleted'),
      Cancelled: tp('programs.form.statusCancelled'),
    }
    return labels[status] ?? status
  }
  const programStatusFilterOptions = (
    ['Active', 'On Hold', 'Completed', 'Cancelled'] as const
  ).map((value) => ({
    label: programStatusLabel(value),
    value,
  }))
  const columns: Array<DataGridColumn<Program>> = [
    {
      id: 'code',
      header: t('columns.code'),
      accessorKey: 'code',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: t('filters.placeholder'),
      cell: ({ row }) => (
        <Link
          to="/programs/$id"
          params={{ id: row.original.id }}
          className="font-medium text-cyan-600 dark:text-cyan-400 hover:underline"
        >
          {row.original.code}
        </Link>
      ),
    },
    {
      id: 'name',
      header: t('columns.name'),
      accessorKey: 'name',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: t('filters.placeholder'),
    },
    {
      id: 'status',
      header: t('columns.status'),
      accessorKey: 'status',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: programStatusFilterOptions,
      cell: ({ getValue }) => {
        const value = getValue() as string
        return (
          <Badge variant={statusColors[value] ?? 'default'}>
            {programStatusLabel(value)}
          </Badge>
        )
      },
    },
    {
      id: 'customer',
      header: t('columns.customer'),
      accessorKey: 'customer',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: t('filters.placeholder'),
      cell: ({ getValue }) => (getValue() as string) || '-',
    },
    {
      id: 'startDate',
      header: t('columns.startDate'),
      accessorKey: 'startDate',
      cell: ({ getValue }) => {
        const value = getValue() as string | Date | null
        if (!value) return '-'
        return new Date(value).toLocaleDateString()
      },
    },
    {
      id: 'targetEndDate',
      header: t('columns.targetEnd'),
      accessorKey: 'targetEndDate',
      cell: ({ getValue }) => {
        const value = getValue() as string | Date | null
        if (!value) return '-'
        return new Date(value).toLocaleDateString()
      },
    },
  ]

  const renderRowActions = (row: Row<Program>) => {
    const program = row.original
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon" variant="ghost" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">{t('actions.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link to="/programs/$id" params={{ id: program.id }}>
              <Eye className="mr-2 h-4 w-4" />
              {t('actions.viewDetails')}
            </Link>
          </DropdownMenuItem>
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(program)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(program)}
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

  // Context menu items (Edit, Delete)
  const renderContextMenuItems = useCallback(
    (row: Row<Program>) => {
      const program = row.original
      const hasActions = onEdit || onDelete
      if (!hasActions) return null

      return (
        <>
          {onEdit && (
            <ContextMenuItem onClick={() => onEdit(program)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </ContextMenuItem>
          )}
          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onDelete(program)}
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

  // Get URL for row (for "Open in new tab")
  const getRowUrl = useCallback((row: Program) => {
    return `/programs/${row.id}`
  }, [])

  return (
    <DataGrid
      data={items}
      columns={columns}
      getRowId={(row) => row.id}
      enableRowActions={true}
      renderRowActions={renderRowActions}
      enableContextMenu
      getRowUrl={getRowUrl}
      renderContextMenuItems={renderContextMenuItems}
      defaultSorting={defaultSorting}
      defaultColumnFilters={defaultColumnFilters}
      defaultGlobalFilter={defaultGlobalFilter}
      emptyMessage="No programs found"
      emptyDescription="Create your first program to get started"
      exportFilename="programs"
      serverSidePagination={serverSidePagination}
      totalRows={totalRows}
      onPageChange={onPageChange}
      isLoading={isLoading}
      // Server-side operations (controlled state)
      serverSideOperations={serverSideOperations}
      sorting={sorting}
      onSortingChange={onSortingChange}
      columnFilters={columnFilters}
      onColumnFiltersChange={onColumnFiltersChange}
      globalFilter={globalFilter}
      onGlobalFilterChange={onGlobalFilterChange}
      pagination={pagination}
      onPaginationChange={onPaginationChange}
    />
  )
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit, Eye, MoreVertical, Trash2 } from 'lucide-react'
import type { Issue } from '@cascadia/commons/items/types/issue'
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

interface IssueTableProps {
  items: Array<Issue>
  onEdit?: (issue: Issue) => void
  onDelete?: (issue: Issue) => void
  // Server-side pagination
  serverSidePagination?: boolean
  totalRows?: number
  onPageChange?: (page: number, pageSize: number) => void
  isLoading?: boolean
}

const severityVariant = (
  severity: string,
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' => {
  const variants: Record<
    string,
    'default' | 'secondary' | 'success' | 'warning' | 'destructive'
  > = {
    Critical: 'destructive',
    High: 'warning',
    Medium: 'default',
    Low: 'secondary',
  }
  return variants[severity] || 'default'
}

const priorityVariant = (
  priority: string,
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' => {
  const variants: Record<
    string,
    'default' | 'secondary' | 'success' | 'warning' | 'destructive'
  > = {
    Critical: 'destructive',
    High: 'warning',
    Medium: 'default',
    Low: 'secondary',
  }
  return variants[priority] || 'default'
}

const formatDate = (date?: string | Date) => {
  if (!date) return '-'
  try {
    return new Date(date).toLocaleDateString()
  } catch {
    return '-'
  }
}

export function IssueTable({
  items,
  onEdit,
  onDelete,
  serverSidePagination,
  totalRows,
  onPageChange,
  isLoading,
}: IssueTableProps) {
  // State filter options and badges come from the Issue lifecycle's
  // configuration, not from a list in code
  const { t } = useTranslation('common')
  const { data: lifecycle } = useLifecyclePhases('Issue')
  const stateFilterOptions = (lifecycle?.states ?? []).map((state) => ({
    label: translateStateName(state.name),
    value: state.id,
  }))

  const columns: Array<DataGridColumn<Issue>> = [
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
            to="/issues/$id"
            params={{ id: row.original.id }}
            className="font-mono text-sm text-sky-600 hover:text-sky-800 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          >
            {row.original.itemNumber}
          </Link>
        ) : (
          <span className="font-mono text-sm">{row.original.itemNumber}</span>
        ),
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
      id: 'state',
      header: t('columns.state'),
      accessorKey: 'state',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: stateFilterOptions,
      cell: ({ getValue }) => (
        <StateBadge itemType="Issue" state={getValue() as string} />
      ),
    },
    {
      id: 'severity',
      header: t('columns.severity'),
      accessorKey: 'severity',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: [
        { label: t('enum.severity.Critical'), value: 'Critical' },
        { label: t('enum.severity.High'), value: 'High' },
        { label: t('enum.severity.Medium'), value: 'Medium' },
        { label: t('enum.severity.Low'), value: 'Low' },
      ],
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined
        if (!value) return '-'
        return (
          <Badge variant={severityVariant(value)}>
            {t(`enum.severity.${value}`, { defaultValue: value })}
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
      filterOptions: [
        { label: t('enum.priority.Critical'), value: 'Critical' },
        { label: t('enum.priority.High'), value: 'High' },
        { label: t('enum.priority.Medium'), value: 'Medium' },
        { label: t('enum.priority.Low'), value: 'Low' },
      ],
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined
        if (!value) return '-'
        return (
          <Badge variant={priorityVariant(value)}>
            {t(`enum.priority.${value}`, { defaultValue: value })}
          </Badge>
        )
      },
    },
    {
      id: 'category',
      header: t('columns.category'),
      accessorKey: 'category',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: [
        { label: t('enum.issueCategory.Design'), value: 'Design' },
        { label: t('enum.issueCategory.Manufacturing'), value: 'Manufacturing' },
        { label: t('enum.issueCategory.Quality'), value: 'Quality' },
        { label: t('enum.issueCategory.Customer'), value: 'Customer' },
        { label: t('enum.issueCategory.Safety'), value: 'Safety' },
        { label: t('enum.issueCategory.Other'), value: 'Other' },
      ],
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined
        if (!value) return '-'
        return t(`enum.issueCategory.${value}`, { defaultValue: value })
      },
    },
    {
      id: 'createdAt',
      header: t('columns.created'),
      accessorKey: 'createdAt',
      enableSorting: true,
      cell: ({ getValue }) =>
        formatDate(getValue() as string | Date | undefined),
    },
  ]

  const renderRowActions = (row: Row<Issue>) => {
    const issue = row.original
    const hasActions = issue.id || onEdit || onDelete
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
          {issue.id && (
            <DropdownMenuItem asChild>
              <Link to="/issues/$id" params={{ id: issue.id }}>
                <Eye className="mr-2 h-4 w-4" />
                {t('actions.viewDetails')}
              </Link>
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(issue)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(issue)}
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
    (row: Row<Issue>) => {
      const issue = row.original
      const hasActions = onEdit || onDelete
      if (!hasActions) return null

      return (
        <>
          {onEdit && (
            <ContextMenuItem onClick={() => onEdit(issue)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </ContextMenuItem>
          )}
          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onDelete(issue)}
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

  const getRowUrl = useCallback((row: Issue) => {
    return row.id ? `/issues/${row.id}` : ''
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
      emptyMessage="No issues found"
      emptyDescription="Create your first issue to get started"
      exportFilename="issues"
      serverSidePagination={serverSidePagination}
      totalRows={totalRows}
      onPageChange={onPageChange}
      isLoading={isLoading}
    />
  )
}

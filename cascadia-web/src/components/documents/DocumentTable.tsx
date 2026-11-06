// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Edit, Eye, MoreVertical, Trash2 } from 'lucide-react'
import type { Document } from '@cascadia/commons/items/types/document'
import type { DataGridColumn, Row } from '@/components/ui'
import { Badge, Button, DataGrid } from '@/components/ui'
import { PhaseBadge } from '@/components/items/PhaseBadge'
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

interface DocumentTableProps {
  documents: Array<Document>
  onEdit?: (document: Document) => void
  onDelete?: (document: Document) => void
  // Server-side pagination
  serverSidePagination?: boolean
  totalRows?: number
  onPageChange?: (page: number, pageSize: number) => void
  isLoading?: boolean
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '-'
  const kb = bytes / 1024
  const mb = kb / 1024
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`
  } else if (kb >= 1) {
    return `${kb.toFixed(2)} KB`
  } else {
    return `${bytes} B`
  }
}

export function DocumentTable({
  documents,
  onEdit,
  onDelete,
  serverSidePagination,
  totalRows,
  onPageChange,
  isLoading,
}: DocumentTableProps) {
  // State filter options and badges come from the Document lifecycle's
  // configuration, not from a list in code
  const { t } = useTranslation('common')
  const { t: tp } = useTranslation('pages')
  const { data: lifecycle } = useLifecyclePhases('Document')
  const stateFilterOptions = (lifecycle?.states ?? []).map((state) => ({
    label: translateStateName(state.name),
    value: state.id,
  }))

  const columns: Array<DataGridColumn<Document>> = [
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
            to="/documents/$id"
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
      id: 'fileName',
      header: t('columns.fileName'),
      accessorKey: 'fileName',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: t('filters.searchPlaceholder'),
      cell: ({ getValue }) => (getValue() as string) || '-',
    },
    {
      id: 'fileSize',
      header: t('columns.size'),
      accessorKey: 'fileSize',
      enableSorting: true,
      enableFiltering: true,
      filterType: 'range',
      filterPlaceholder: t('actions.any'),
      cell: ({ getValue }) => formatFileSize(getValue() as number | undefined),
    },
    {
      id: 'state',
      header: t('columns.state'),
      accessorKey: 'state',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: stateFilterOptions,
      cell: ({ getValue }) => (
        <StateBadge itemType="Document" state={getValue() as string} />
      ),
    },
    {
      id: 'phase',
      header: t('columns.phase'),
      enableSorting: false,
      enableFiltering: false,
      meta: { width: '120px' },
      cell: ({ row }) => (
        <PhaseBadge
          itemType="Document"
          state={row.original.state ?? ''}
          className="text-xs"
        />
      ),
    },
    {
      id: 'usageCount',
      header: t('columns.usedIn'),
      accessorKey: 'usageCount',
      enableFiltering: false,
      enableSorting: true,
      meta: { align: 'center' },
      cell: ({ row }) => {
        const count = row.original.usageCount
        if (count === undefined) return null // Not showing usage counts (design-specific view)
        if (count === 0) return <span className="text-slate-400">-</span>
        return (
          <Badge variant="outline" className="text-xs">
            {count} {t('units.design', { count })}
          </Badge>
        )
      },
    },
  ]

  const renderRowActions = (row: Row<Document>) => {
    const document = row.original
    const hasActions = document.id || onEdit || onDelete
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
          {document.id && (
            <DropdownMenuItem asChild>
              <Link to="/documents/$id" params={{ id: document.id }}>
                <Eye className="mr-2 h-4 w-4" />
                {t('actions.viewDetails')}
              </Link>
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onClick={() => onEdit(document)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </DropdownMenuItem>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(document)}
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
    (row: Row<Document>) => {
      const document = row.original
      const hasActions = onEdit || onDelete
      if (!hasActions) return null

      return (
        <>
          {onEdit && (
            <ContextMenuItem onClick={() => onEdit(document)}>
              <Edit className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </ContextMenuItem>
          )}
          {onDelete && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onDelete(document)}
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

  const getRowUrl = useCallback((row: Document) => {
    return row.id ? `/documents/${row.id}` : ''
  }, [])

  return (
    <DataGrid
      data={documents}
      columns={columns}
      getRowId={(row) => row.id ?? row.itemNumber ?? ''}
      enableRowActions={true}
      renderRowActions={renderRowActions}
      enableContextMenu
      getRowUrl={getRowUrl}
      renderContextMenuItems={renderContextMenuItems}
      emptyMessage={tp('documents.emptyMessage')}
      emptyDescription={tp('documents.emptyDescription')}
      exportFilename="documents"
      serverSidePagination={serverSidePagination}
      totalRows={totalRows}
      onPageChange={onPageChange}
      isLoading={isLoading}
    />
  )
}

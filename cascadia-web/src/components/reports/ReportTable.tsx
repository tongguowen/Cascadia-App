// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Pencil, Play, Trash2 } from 'lucide-react'
import type { Report } from '@cascadia/commons/reports/types'
import type { DataGridColumn, Row } from '@/components/ui'
import { Badge, Button, DataGrid } from '@/components/ui'

interface ReportTableProps {
  reports: Array<Report>
  onDelete?: (report: Report) => void
}

export function ReportTable({ reports, onDelete }: ReportTableProps) {
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')

  const columns: Array<DataGridColumn<Report>> = useMemo(
    () => [
    {
      id: 'name',
      header: tc('columns.name'),
      accessorKey: 'name',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: tp('reports.table.searchReports'),
      cell: ({ row }) =>
        row.original.id ? (
          <Link
            to="/reports/$id/view"
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
      header: tc('columns.description'),
      accessorKey: 'description',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: tp('reports.table.searchDescriptions'),
      cell: ({ getValue }) => {
        const value = getValue() as string
        return (
          <div className="max-w-xs truncate text-gray-500" title={value}>
            {value || '-'}
          </div>
        )
      },
    },
    {
      id: 'isPublic',
      header: tp('reports.viewer.visibility'),
      accessorKey: 'isPublic',
      enableFiltering: true,
      filterType: 'select',
      filterOptions: [
        { label: tp('reports.public'), value: 'true' },
        { label: tp('reports.private'), value: 'false' },
      ],
      cell: ({ getValue }) => {
        const isPublic = getValue() as boolean
        if (isPublic) {
          return (
            <Badge variant="default" className="gap-1">
              <Eye className="w-3 h-3" />
              {tp('reports.public')}
            </Badge>
          )
        }
        return (
          <Badge variant="outline" className="gap-1">
            <EyeOff className="w-3 h-3" />
            {tp('reports.private')}
          </Badge>
        )
      },
    },
    {
      id: 'columnsCount',
      header: tp('reports.viewer.columns'),
      accessorFn: (row) => row.columns?.length || 0,
      enableSorting: true,
      enableFiltering: true,
      filterType: 'range',
      filterPlaceholder: tc('actions.any'),
      meta: { align: 'right' },
    },
    {
      id: 'filtersCount',
      header: tp('reports.viewer.filtersLabel'),
      accessorFn: (row) => row.filters?.length || 0,
      enableSorting: true,
      enableFiltering: true,
      filterType: 'range',
      filterPlaceholder: tc('actions.any'),
      meta: { align: 'right' },
    },
  ],
    [tc, tp],
  )

  const renderRowActions = (row: Row<Report>) => {
    const report = row.original
    if (!report.id) return null

    return (
      <div className="flex justify-end gap-2">
        <Link to="/reports/$id/view" params={{ id: report.id }}>
          <Button variant="ghost" size="sm" title={tp('reports.table.runReport')}>
            <Play className="w-4 h-4" />
          </Button>
        </Link>
        <Link to="/reports/$id/edit" params={{ id: report.id }}>
          <Button variant="ghost" size="sm" title={tp('reports.table.editReport')}>
            <Pencil className="w-4 h-4" />
          </Button>
        </Link>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(report)}
            className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
            title={tp('reports.table.deleteReport')}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    )
  }

  const getRowUrl = useCallback((row: Report) => {
    return row.id ? `/reports/${row.id}/view` : undefined
  }, [])

  return (
    <DataGrid
      data={reports}
      columns={columns}
      getRowId={(row) => row.id || row.name}
      enableRowActions={true}
      renderRowActions={renderRowActions}
      enableContextMenu
      getRowUrl={getRowUrl}
      emptyMessage={tp('reports.table.emptyMessage')}
      emptyDescription={tp('reports.table.emptyDescription')}
      exportFilename="reports"
    />
  )
}

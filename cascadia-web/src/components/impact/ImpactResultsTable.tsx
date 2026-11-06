// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Cog,
  ExternalLink,
  Factory,
  FileText,
  FlaskConical,
  Package,
} from 'lucide-react'
import type { DataGridColumn } from '@/components/ui/DataGrid'
import type {
  ImpactSeverity,
  ImpactedItem,
} from '@cascadia/commons/services/types/impact-analysis'
import type { ThreadDomain } from '@cascadia/commons/thread/types'
import { DataGrid } from '@/components/ui/DataGrid'
import { Badge, Checkbox } from '@/components/ui'
import { cn } from '@/utils'
import { ItemLink } from '@/components/items/ItemLink'
import { translateItemTypeLabel } from '@/i18n'

interface ImpactResultsTableProps {
  items: Array<ImpactedItem>
  onSelectionChange?: (selectedIds: Array<string>) => void
  className?: string
}

const domainIcons: Record<ThreadDomain, typeof Cog> = {
  requirements: FileText,
  engineering: Cog,
  manufacturing: Factory,
  validation: FlaskConical,
  physical: Package,
}

const severityVariants: Record<
  ImpactSeverity,
  'destructive' | 'warning' | 'secondary' | 'outline'
> = {
  critical: 'destructive',
  high: 'warning',
  medium: 'secondary',
  low: 'outline',
}

/**
 * Table showing detailed impact analysis results.
 * Supports filtering by domain and severity, and row selection for ECO creation.
 */
export function ImpactResultsTable({
  items,
  onSelectionChange,
  className,
}: ImpactResultsTableProps) {
  const { t: tc } = useTranslation('common')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const domainLabel = (domain: ThreadDomain) =>
    tc(`labels.domains.${domain}`)
  const severityLabel = (severity: ImpactSeverity) =>
    tc(`labels.severity.${severity}`)

  // Toggle selection of a single item
  const toggleSelection = (itemId: string) => {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(itemId)) {
      newSelection.delete(itemId)
    } else {
      newSelection.add(itemId)
    }
    setSelectedIds(newSelection)
    onSelectionChange?.(Array.from(newSelection))
  }

  // Toggle all items
  const toggleAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set())
      onSelectionChange?.([])
    } else {
      const allIds = new Set(items.map((item) => item.item.id))
      setSelectedIds(allIds)
      onSelectionChange?.(Array.from(allIds))
    }
  }

  // Define columns
  const columns = useMemo<Array<DataGridColumn<ImpactedItem>>>(
    () => [
      // Selection column
      {
        id: 'select',
        header: '',
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.has(row.original.item.id)}
            onCheckedChange={() => toggleSelection(row.original.item.id)}
            aria-label={tc('dialogs.impact.table.selectItem', {
              itemNumber: row.original.item.itemNumber,
            })}
          />
        ),
        enableSorting: false,
        enableFiltering: false,
        meta: { width: '40px' },
      },
      // Item Number
      {
        id: 'itemNumber',
        header: tc('columns.itemNumber'),
        accessorFn: (row) => row.item.itemNumber,
        cell: ({ row }) => {
          const item = row.original.item
          return (
            <div className="flex items-center gap-2">
              <ItemLink
                itemType={item.itemType}
                itemId={item.id}
                className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
              >
                {item.itemNumber}
              </ItemLink>
              <ItemLink
                itemType={item.itemType}
                itemId={item.id}
                target="_blank"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-400"
              >
                <ExternalLink className="h-3 w-3" />
              </ItemLink>
            </div>
          )
        },
        enableSorting: true,
        enableFiltering: true,
        filterType: 'text',
        filterPlaceholder: tc('dialogs.impact.table.filterItemNumber'),
      },
      // Name
      {
        id: 'name',
        header: tc('columns.name'),
        accessorFn: (row) => row.item.name ?? '',
        cell: ({ row }) => (
          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px] block">
            {row.original.item.name || '-'}
          </span>
        ),
        enableSorting: true,
        enableFiltering: true,
        filterType: 'text',
      },
      // Type
      {
        id: 'itemType',
        header: tc('columns.type'),
        accessorFn: (row) => row.item.itemType,
        cell: ({ row }) => (
          <span className="text-slate-700 dark:text-slate-300">
            {row.original.item.itemType}
          </span>
        ),
        enableSorting: true,
        enableFiltering: true,
        filterType: 'select',
        filterOptions: (
          ['Part', 'Requirement', 'Document', 'TestCase'] as const
        ).map((value) => ({
          label: translateItemTypeLabel(value),
          value,
        })),
      },
      // Domain
      {
        id: 'domain',
        header: tc('labels.domain'),
        accessorFn: (row) => row.domain,
        cell: ({ row }) => {
          const domain = row.original.domain
          const Icon = domainIcons[domain]
          return (
            <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
              <Icon className="h-3.5 w-3.5" />
              <span>{domainLabel(domain)}</span>
            </div>
          )
        },
        enableSorting: true,
        enableFiltering: true,
        filterType: 'multiSelect',
        filterOptions: (
          [
            'requirements',
            'engineering',
            'manufacturing',
            'validation',
          ] as const
        ).map((value) => ({
          label: domainLabel(value),
          value,
        })),
      },
      // Severity
      {
        id: 'severity',
        header: tc('columns.severity'),
        accessorFn: (row) => row.severity,
        cell: ({ row }) => {
          const severity = row.original.severity
          return (
            <Badge variant={severityVariants[severity]}>
              {severityLabel(severity)}
            </Badge>
          )
        },
        enableSorting: true,
        enableFiltering: true,
        filterType: 'multiSelect',
        filterOptions: (['critical', 'high', 'medium', 'low'] as const).map(
          (value) => ({
            label: severityLabel(value),
            value,
          }),
        ),
      },
      // Impact Path
      {
        id: 'impactPath',
        header: tc('labels.impactPath'),
        accessorFn: (row) => row.impactPath.join(' → '),
        cell: ({ row }) => (
          <span className="text-xs text-slate-500 font-mono">
            {row.original.impactPath.join(' → ')}
          </span>
        ),
        enableSorting: false,
        enableFiltering: false,
      },
      // Reason
      {
        id: 'reason',
        header: tc('labels.reason'),
        accessorFn: (row) => row.reason,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {row.original.reason}
          </span>
        ),
        enableSorting: false,
        enableFiltering: false,
      },
      // Required Action
      {
        id: 'requiredAction',
        header: tc('labels.requiredAction'),
        accessorFn: (row) => row.requiredAction ?? '',
        cell: ({ row }) =>
          row.original.requiredAction ? (
            <span className="text-sm text-orange-600 dark:text-orange-400">
              {row.original.requiredAction}
            </span>
          ) : (
            <span className="text-slate-400">-</span>
          ),
        enableSorting: false,
        enableFiltering: false,
      },
    ],
    [selectedIds, tc],
  )

  return (
    <div className={cn('space-y-3 w-full max-w-full min-w-0', className)}>
      {/* Selection Controls */}
      {onSelectionChange && (
        <div className="flex items-center gap-3">
          <Checkbox
            checked={selectedIds.size === items.length && items.length > 0}
            onCheckedChange={toggleAll}
            aria-label={tc('dialogs.impact.table.selectAll')}
          />
          <span className="text-sm text-slate-500">
            {selectedIds.size > 0
              ? tc('dialogs.impact.table.selectedCount', {
                  selected: selectedIds.size,
                  total: items.length,
                })
              : tc('dialogs.impact.table.itemCount', { count: items.length })}
          </span>
        </div>
      )}

      {/* Table */}
      <DataGrid
        data={items}
        columns={columns}
        getRowId={(row) => row.item.id}
        enablePagination={true}
        enableSorting={true}
        enableFiltering={true}
        enableGlobalFilter={true}
        enableExport={true}
        exportFilename="impact-analysis"
        defaultPageSize={20}
        pageSizeOptions={[10, 20, 50, 100]}
        emptyMessage={tc('dialogs.impact.table.emptyMessage')}
        emptyDescription={tc('dialogs.impact.table.emptyDescription')}
      />
    </div>
  )
}

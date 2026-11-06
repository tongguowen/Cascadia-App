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
  Gap,
  GapSeverity,
  GapType,
} from '@cascadia/commons/services/types/gap-analysis'
import type { ThreadDomain } from '@cascadia/commons/thread/types'
import { DataGrid } from '@/components/ui/DataGrid'
import { Badge, Checkbox } from '@/components/ui'
import { cn } from '@/utils'
import { ItemLink } from '@/components/items/ItemLink'

interface GapResultsTableProps {
  gaps: Array<Gap>
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
  GapSeverity,
  'destructive' | 'warning' | 'outline'
> = {
  critical: 'destructive',
  major: 'warning',
  minor: 'outline',
}

const GAP_TYPES: Array<GapType> = [
  'unallocated_requirement',
  'unsatisfied_requirement',
  'unverified_requirement',
  'suspect_requirement',
  'untested_part',
  'unmapped_ebom_item',
  'orphan_mbom_item',
  'missing_documentation',
]

const FILTER_DOMAINS: Array<ThreadDomain> = [
  'requirements',
  'engineering',
  'manufacturing',
  'validation',
]

const SEVERITIES: Array<GapSeverity> = ['critical', 'major', 'minor']

const PRIORITIES = ['MustHave', 'ShouldHave', 'CouldHave', 'WontHave'] as const

const FILTER_ITEM_TYPES = ['Part', 'Requirement', 'Document', 'TestCase'] as const

/**
 * Table showing detailed gap analysis results.
 * Supports filtering by gap type, domain, and severity, and row selection.
 */
export function GapResultsTable({
  gaps,
  onSelectionChange,
  className,
}: GapResultsTableProps) {
  const { t: tc } = useTranslation('common')
  const { t: ti } = useTranslation('itemTypes')
  const rt = (key: string) =>
    tc(`dialogs.gap.resultsTable.${key}` as 'dialogs.gap.resultsTable.itemNumber')

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

  const toggleAll = () => {
    if (selectedIds.size === gaps.length) {
      setSelectedIds(new Set())
      onSelectionChange?.([])
    } else {
      const allIds = new Set(gaps.map((gap) => gap.itemId))
      setSelectedIds(allIds)
      onSelectionChange?.(Array.from(allIds))
    }
  }

  const columns = useMemo<Array<DataGridColumn<Gap>>>(
    () => [
      {
        id: 'select',
        header: '',
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.has(row.original.itemId)}
            onCheckedChange={() => toggleSelection(row.original.itemId)}
            aria-label={tc('dialogs.gap.resultsTable.selectGap', {
              itemNumber: row.original.itemNumber,
            })}
          />
        ),
        enableSorting: false,
        enableFiltering: false,
        meta: { width: '40px' },
      },
      {
        id: 'itemNumber',
        header: rt('itemNumber'),
        accessorFn: (row) => row.itemNumber,
        cell: ({ row }) => {
          const gap = row.original
          return (
            <div className="flex items-center gap-2">
              <ItemLink
                itemType={gap.itemType}
                itemId={gap.itemId}
                className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
              >
                {gap.itemNumber}
              </ItemLink>
              <ItemLink
                itemType={gap.itemType}
                itemId={gap.itemId}
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
        filterPlaceholder: rt('filterItemNumber'),
      },
      {
        id: 'name',
        header: rt('name'),
        accessorFn: (row) => row.itemName ?? '',
        cell: ({ row }) => (
          <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px] block">
            {row.original.itemName || '-'}
          </span>
        ),
        enableSorting: true,
        enableFiltering: true,
        filterType: 'text',
      },
      {
        id: 'itemType',
        header: rt('itemType'),
        accessorFn: (row) => row.itemType,
        cell: ({ row }) => (
          <span className="text-slate-700 dark:text-slate-300">
            {ti(row.original.itemType === 'TestCase' ? 'Test Case' : row.original.itemType)}
          </span>
        ),
        enableSorting: true,
        enableFiltering: true,
        filterType: 'select',
        filterOptions: FILTER_ITEM_TYPES.map((value) => ({
          label: ti(value === 'TestCase' ? 'Test Case' : value),
          value,
        })),
      },
      {
        id: 'domain',
        header: rt('domain'),
        accessorFn: (row) => row.domain,
        cell: ({ row }) => {
          const domain = row.original.domain
          const Icon = domainIcons[domain]
          return (
            <div className="flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
              <Icon className="h-3.5 w-3.5" />
              <span>{rt(`domains.${domain}`)}</span>
            </div>
          )
        },
        enableSorting: true,
        enableFiltering: true,
        filterType: 'multiSelect',
        filterOptions: FILTER_DOMAINS.map((value) => ({
          label: rt(`domains.${value}`),
          value,
        })),
      },
      {
        id: 'type',
        header: rt('gapType'),
        accessorFn: (row) => row.type,
        cell: ({ row }) => (
          <Badge variant="secondary" className="text-xs">
            {rt(`gapTypes.${row.original.type}`)}
          </Badge>
        ),
        enableSorting: true,
        enableFiltering: true,
        filterType: 'multiSelect',
        filterOptions: GAP_TYPES.map((value) => ({
          label: rt(`gapTypes.${value}`),
          value,
        })),
      },
      {
        id: 'severity',
        header: rt('severity'),
        accessorFn: (row) => row.severity,
        cell: ({ row }) => {
          const severity = row.original.severity
          return (
            <Badge variant={severityVariants[severity]}>
              {rt(`severities.${severity}`)}
            </Badge>
          )
        },
        enableSorting: true,
        enableFiltering: true,
        filterType: 'multiSelect',
        filterOptions: SEVERITIES.map((value) => ({
          label: rt(`severities.${value}`),
          value,
        })),
      },
      {
        id: 'priority',
        header: rt('priority'),
        accessorFn: (row) => row.priority ?? '',
        cell: ({ row }) => {
          const priority = row.original.priority
          if (!priority) return <span className="text-slate-400">-</span>
          return (
            <Badge
              variant={priority === 'MustHave' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {rt(`priorities.${priority}`)}
            </Badge>
          )
        },
        enableSorting: true,
        enableFiltering: true,
        filterType: 'select',
        filterOptions: PRIORITIES.map((value) => ({
          label: rt(`priorities.${value}`),
          value,
        })),
      },
      {
        id: 'suggestion',
        header: rt('suggestedAction'),
        accessorFn: (row) => row.suggestion,
        cell: ({ row }) => (
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {row.original.suggestion}
          </span>
        ),
        enableSorting: false,
        enableFiltering: false,
      },
    ],
    [selectedIds, tc, ti],
  )

  return (
    <div className={cn('space-y-3 w-full max-w-full min-w-0', className)}>
      {onSelectionChange && (
        <div className="flex items-center gap-3">
          <Checkbox
            checked={selectedIds.size === gaps.length && gaps.length > 0}
            onCheckedChange={toggleAll}
            aria-label={rt('selectAllGaps')}
          />
          <span className="text-sm text-slate-500">
            {selectedIds.size > 0
              ? tc('dialogs.gap.resultsTable.selectedCount', {
                  selected: selectedIds.size,
                  total: gaps.length,
                })
              : tc('dialogs.gap.resultsTable.gapCount', { count: gaps.length })}
          </span>
        </div>
      )}

      <DataGrid
        data={gaps}
        columns={columns}
        getRowId={(row) => row.id}
        enablePagination={true}
        enableSorting={true}
        enableFiltering={true}
        enableGlobalFilter={true}
        enableExport={true}
        exportFilename="gap-analysis"
        defaultPageSize={20}
        pageSizeOptions={[10, 20, 50, 100]}
        emptyMessage={rt('emptyMessage')}
        emptyDescription={rt('emptyDescription')}
      />
    </div>
  )
}

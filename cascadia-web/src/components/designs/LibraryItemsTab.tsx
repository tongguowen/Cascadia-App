// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { VersionContext } from '@/hooks/useVersionContext'
import type { DataGridColumn } from '@/components/ui/DataGrid'
import type { DesignItem, GridParams } from '@/query'
import { useServerDataGrid } from '@/hooks/useServerDataGrid'
import { designItemsGridQuery } from '@/query'
import { Badge } from '@/components/ui'
import { DataGrid } from '@/components/ui/DataGrid'
import { StateBadge } from '@/components/items/StateBadge'
import { ItemLink } from '@/components/items/ItemLink'
import { getItemDetailPath } from '@/items/item-type-ui'

interface LibraryItemsTabProps {
  designId: string
  versionContext: VersionContext
  isHistoricalView: boolean
}

const getTypeBadgeVariant = (itemType: string) => {
  switch (itemType) {
    case 'Part':
      return 'default' as const
    case 'Document':
      return 'secondary' as const
    case 'Requirement':
      return 'outline' as const
    default:
      return 'default' as const
  }
}

export function LibraryItemsTab({
  designId,
  versionContext,
  isHistoricalView,
}: LibraryItemsTabProps) {
  const { t: tp } = useTranslation('pages')

  const columns = useMemo<Array<DataGridColumn<DesignItem>>>(
    () => [
      {
        id: 'itemNumber',
        header: tp('designs.libraryItemsTab.colItemNumber'),
        accessorKey: 'itemNumber',
        enableFiltering: true,
        filterType: 'text',
        filterPlaceholder: tp('designs.libraryItemsTab.filterPlaceholder'),
        cell: ({ row }) => (
          <ItemLink
            itemType={row.original.itemType}
            itemId={row.original.id}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            {row.original.itemNumber}
          </ItemLink>
        ),
      },
      {
        id: 'itemType',
        header: tp('designs.libraryItemsTab.colType'),
        accessorKey: 'itemType',
        enableFiltering: true,
        filterType: 'multiSelect',
        filterOptions: [
          {
            label: tp('designs.libraryItemsTab.typePart'),
            value: 'Part',
          },
          {
            label: tp('designs.libraryItemsTab.typeDocument'),
            value: 'Document',
          },
          {
            label: tp('designs.libraryItemsTab.typeRequirement'),
            value: 'Requirement',
          },
        ],
        cell: ({ getValue }) => (
          <Badge
            variant={getTypeBadgeVariant(getValue() as string)}
            className="text-xs"
          >
            {getValue() as string}
          </Badge>
        ),
      },
      {
        id: 'name',
        header: tp('designs.libraryItemsTab.colName'),
        accessorKey: 'name',
        enableFiltering: true,
        filterType: 'text',
        filterPlaceholder: tp('designs.libraryItemsTab.filterPlaceholder'),
      },
      {
        id: 'revision',
        header: tp('designs.libraryItemsTab.colRevision'),
        accessorKey: 'revision',
        meta: { align: 'center' },
      },
      {
        id: 'state',
        header: tp('designs.libraryItemsTab.colState'),
        accessorKey: 'state',
        enableFiltering: true,
        filterType: 'text',
        filterPlaceholder: tp('designs.libraryItemsTab.filterStatePlaceholder'),
        cell: ({ row, getValue }) => (
          <StateBadge
            itemType={row.original.itemType}
            state={getValue() as string}
            className="text-xs"
          />
        ),
      },
      {
        id: 'modifiedAt',
        header: tp('designs.libraryItemsTab.colModified'),
        accessorKey: 'modifiedAt',
        cell: ({ getValue }) => {
          const val = getValue() as string
          return (
            <span className="text-slate-700 dark:text-slate-300">
              {val ? new Date(val).toLocaleDateString() : '-'}
            </span>
          )
        },
      },
    ],
    [tp],
  )

  const { items, dataGridProps } = useServerDataGrid<DesignItem>({
    query: (grid: GridParams) =>
      designItemsGridQuery(designId, grid, {
        branch: versionContext.branchId,
        tag: versionContext.tagId,
        commit: versionContext.commitId,
      }),
  })

  return (
    <DataGrid
      data={items}
      columns={columns}
      getRowId={(row) => row.id}
      getRowUrl={(row) => getItemDetailPath(row.itemType, row.id) ?? undefined}
      emptyMessage={
        isHistoricalView
          ? tp('designs.libraryItemsTab.emptyHistorical')
          : tp('designs.libraryItemsTab.empty')
      }
      emptyDescription={tp('designs.libraryItemsTab.emptyDescription')}
      exportFilename="library-items"
      defaultSorting={[{ id: 'itemNumber', desc: false }]}
      {...dataGridProps}
    />
  )
}

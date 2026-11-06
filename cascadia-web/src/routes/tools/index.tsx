// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import type { Tool } from '@cascadia/commons/items/types/tool'
import type { ItemFilters } from '@/query'
import { PageContainer } from '@/components/layout'
import { ToolTable } from '@/components/tools/ToolTable'
import { useServerDataGrid } from '@/hooks/useServerDataGrid'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { useAlertDialog } from '@/hooks/useAlertDialog'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import {
  gridParamsFromSearch,
  itemCountsQuery,
  itemGridQuery,
  itemListQuery,
  lifecycleByItemTypeQuery,
  useInvalidateResources,
} from '@/query'
import { apiFetch } from '@/api/client'
import { LifecycleStateCards } from '@/components/items/LifecycleStateCards'

// Search schema for URL validation (drives useServerDataGrid state sync)
const toolsSearchSchema = z.object({
  search: z.coerce.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  filter_toolType: z.coerce.string().optional(),
  filter_state: z.coerce.string().optional(),
})

const TOOL_FILTERS: ItemFilters = { itemType: 'Tool' }
export const Route = createFileRoute('/tools/')({
  validateSearch: toolsSearchSchema,
  component: ToolsListPage,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const grid = gridParamsFromSearch(deps)
    await Promise.all([
      queryClient.ensureQueryData(itemListQuery<Tool>(TOOL_FILTERS, grid)),
      (async () => {
        const lifecycle = await queryClient.ensureQueryData(
          lifecycleByItemTypeQuery('Tool'),
        )
        await queryClient.ensureQueryData(
          itemCountsQuery(
            TOOL_FILTERS,
            lifecycle.states.map((state) => state.id),
          ),
        )
      })(),
    ])
  },
})

function ToolsListPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { confirm } = useAlertDialog()
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()

  // Server-side DataGrid with URL state sync
  const {
    items: tools,
    total,
    dataGridProps,
  } = useServerDataGrid<Tool>({
    query: itemGridQuery<Tool>(TOOL_FILTERS),
  })

  const handleEditTool = (tool: Tool) => {
    if (tool.id) {
      navigate({ to: '/tools/$id', params: { id: tool.id } })
    }
  }

  const handleDeleteTool = (tool: Tool) => {
    if (!tool.id) return

    confirm({
      title: t('tools.deleteTitle'),
      description: tc('dialog.confirmDeleteDescription', {
        identifier: tool.itemNumber,
      }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/tools/${tool.id}`, {
            method: 'DELETE',
          })

          showSuccess(
            t('tools.deletedTitle'),
            tc('dialog.deletedMessage', { identifier: tool.itemNumber }),
          )
          await invalidate('tools')
        } catch (error) {
          handleError(error, { title: t('tools.deleteFailed') })
        }
      },
    })
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            {t('tools.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('tools.subtitle')}
          </p>
        </div>
        <Link to="/tools/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('tools.create')}
          </Button>
        </Link>
      </div>

      {/* Stats — one card per lifecycle state, from configuration */}
      <LifecycleStateCards
        itemType="Tool"
        filters={TOOL_FILTERS}
        total={total}
        totalLabel={t('tools.total')}
      />

      {/* Tools Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('tools.tableTitle')}</CardTitle>
          <CardDescription>
            {t('tools.tableDescription', { count: total })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToolTable
            items={tools}
            onEdit={handleEditTool}
            onDelete={handleDeleteTool}
            // Server-side operations with URL state sync
            serverSidePagination={dataGridProps.serverSidePagination}
            serverSideOperations={dataGridProps.serverSideOperations}
            totalRows={dataGridProps.totalRows}
            isLoading={dataGridProps.isLoading}
            sorting={dataGridProps.sorting}
            onSortingChange={dataGridProps.onSortingChange}
            columnFilters={dataGridProps.columnFilters}
            onColumnFiltersChange={dataGridProps.onColumnFiltersChange}
            globalFilter={dataGridProps.globalFilter}
            onGlobalFilterChange={dataGridProps.onGlobalFilterChange}
            pagination={dataGridProps.pagination}
            onPaginationChange={dataGridProps.onPaginationChange}
            onPageChange={dataGridProps.onPageChange}
          />
        </CardContent>
      </Card>
    </PageContainer>
  )
}

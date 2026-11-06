// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import type { SystemElement } from '@cascadia/commons/items/types/system-element'
import type { ItemFilters } from '@/query'
import { PageContainer } from '@/components/layout'
import { SystemElementTable } from '@/components/system-elements/SystemElementTable'
import { useVersionContext } from '@/hooks/useVersionContext'
import { useServerDataGrid } from '@/hooks/useServerDataGrid'
import {
  Badge,
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
  designListQuery,
  gridParamsFromSearch,
  itemCountsQuery,
  itemGridQuery,
  itemListQuery,
  lifecycleByItemTypeQuery,
  useInvalidateResources,
} from '@/query'
import { apiFetch } from '@/api/client'
import { LifecycleStateCards } from '@/components/items/LifecycleStateCards'

// Search schema for URL validation
const systemElementsSearchSchema = z.object({
  search: z.coerce.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  filter_state: z.coerce.string().optional(),
  filter_elementKind: z.coerce.string().optional(),
  programId: z.string().uuid().optional(),
  designId: z.string().uuid().optional(),
  // Version context params
  branch: z.string().uuid().optional(),
  tag: z.string().uuid().optional(),
  commit: z.string().uuid().optional(),
})

type SystemElementsSearch = z.infer<typeof systemElementsSearchSchema>

// Shared by the loader and the component so both key on identical filters.
function elementFilters(search: SystemElementsSearch): ItemFilters {
  return {
    itemType: 'SystemElement',
    programId: search.programId,
    designId: search.designId,
    branch: search.branch,
    tag: search.tag,
    commit: search.commit,
  }
}

export const Route = createFileRoute('/system-elements/')({
  validateSearch: systemElementsSearchSchema,
  component: SystemElementsListPage,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const filters = elementFilters(deps)
    await Promise.all([
      queryClient.ensureQueryData(
        itemListQuery<SystemElement>(filters, gridParamsFromSearch(deps)),
      ),
      (async () => {
        const lifecycle = await queryClient.ensureQueryData(
          lifecycleByItemTypeQuery('SystemElement'),
        )
        await queryClient.ensureQueryData(
          itemCountsQuery(
            filters,
            lifecycle.states.map((state) => state.id),
          ),
        )
      })(),
      queryClient.ensureQueryData(designListQuery()),
    ])
  },
})

function SystemElementsListPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { confirm } = useAlertDialog()
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()
  const searchParams = Route.useSearch()
  const filters = elementFilters(searchParams)

  const { data: designs = [] } = useQuery(designListQuery())
  const {
    items: elements,
    total,
    dataGridProps,
  } = useServerDataGrid<SystemElement>({
    query: itemGridQuery<SystemElement>(filters),
  })

  const selectedDesignId = searchParams.designId
  const selectedDesign = designs.find((d) => d.id === selectedDesignId)
  const { context, contextLabel, isEditable } =
    useVersionContext(selectedDesignId)

  const handleEdit = (element: SystemElement) => {
    if (element.id) {
      navigate({ to: '/system-elements/$id', params: { id: element.id } })
    }
  }

  const handleDelete = (element: SystemElement) => {
    if (!element.id) return
    confirm({
      title: t('systemElements.deleteTitle'),
      description: tc('dialog.confirmDeleteDescription', {
        identifier: element.itemNumber,
      }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/system-elements/${element.id}`, {
            method: 'DELETE',
          })
          showSuccess(
            t('systemElements.deletedTitle'),
            tc('dialog.deletedMessage', { identifier: element.itemNumber }),
          )
          await invalidate('system-elements')
        } catch (error) {
          handleError(error, { title: t('systemElements.deleteFailed') })
        }
      },
    })
  }

  const getContextBadgeVariant = () => {
    switch (context.type) {
      case 'branch':
        return 'secondary'
      case 'tag':
      case 'commit':
        return 'outline'
      default:
        return 'default'
    }
  }

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              {t('systemElements.title')}
            </h1>
            {selectedDesignId && (
              <Badge variant={getContextBadgeVariant()} className="text-sm">
                {contextLabel}
              </Badge>
            )}
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('systemElements.subtitle')}
            {selectedDesign && (
              <span className="text-slate-500">
                {tc('context.inDesign', { designName: selectedDesign.name })}
              </span>
            )}
          </p>
        </div>
        <Link
          to="/system-elements/new"
          search={selectedDesignId ? { designId: selectedDesignId } : {}}
        >
          <Button disabled={!isEditable && context.type !== 'main'}>
            <Plus className="h-4 w-4 mr-2" />
            {t('systemElements.create')}
          </Button>
        </Link>
      </div>

      {/* Stats — one card per lifecycle state, from configuration */}
      <LifecycleStateCards
        itemType="SystemElement"
        filters={filters}
        total={total}
        totalLabel={t('systemElements.total')}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('systemElements.tableTitle')}</CardTitle>
          <CardDescription>
            {t('systemElements.tableDescription', { count: total })}
            {selectedDesign && context.type !== 'main' && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                {tc('context.viewing', { contextLabel })}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SystemElementTable
            elements={elements}
            onEdit={handleEdit}
            onDelete={handleDelete}
            serverSidePagination={dataGridProps.serverSidePagination}
            totalRows={dataGridProps.totalRows}
            onPageChange={dataGridProps.onPageChange}
            isLoading={dataGridProps.isLoading}
          />
        </CardContent>
      </Card>
    </PageContainer>
  )
}

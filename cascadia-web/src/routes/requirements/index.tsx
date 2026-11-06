// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import type { Requirement } from '@cascadia/commons/items/types/requirement'
import type { ItemFilters } from '@/query'
import { PageContainer } from '@/components/layout'
import { RequirementTable } from '@/components/requirements/RequirementTable'
import { ImportButton } from '@/components/import/ImportButton'
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

// The states behind the stat cards, counted in one request rather than one
// probe request each.
// Search schema for URL validation
const requirementsSearchSchema = z.object({
  search: z.coerce.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  filter_state: z.coerce.string().optional(),
  filter_priority: z.coerce.string().optional(),
  filter_reqType: z.coerce.string().optional(),
  programId: z.string().uuid().optional(),
  designId: z.string().uuid().optional(),
  // Version context params
  branch: z.string().uuid().optional(),
  tag: z.string().uuid().optional(),
  commit: z.string().uuid().optional(),
})

type RequirementsSearch = z.infer<typeof requirementsSearchSchema>

// Shared by the loader and the component so both key on identical filters.
function requirementFilters(search: RequirementsSearch): ItemFilters {
  return {
    itemType: 'Requirement',
    programId: search.programId,
    designId: search.designId,
    branch: search.branch,
    tag: search.tag,
    commit: search.commit,
  }
}

export const Route = createFileRoute('/requirements/')({
  validateSearch: requirementsSearchSchema,
  component: RequirementsListPage,
  // The whole search object, so the loader can derive the very same grid
  // params the component derives — same params, same query key, one fetch.
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const filters = requirementFilters(deps)
    await Promise.all([
      queryClient.ensureQueryData(
        itemListQuery<Requirement>(filters, gridParamsFromSearch(deps)),
      ),
      (async () => {
        const lifecycle = await queryClient.ensureQueryData(
          lifecycleByItemTypeQuery('Requirement'),
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

function RequirementsListPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { confirm } = useAlertDialog()
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()
  const searchParams = Route.useSearch()

  const filters = requirementFilters(searchParams)

  const { data: designs = [] } = useQuery(designListQuery())

  const {
    items: requirements,
    total,
    dataGridProps,
  } = useServerDataGrid<Requirement>({
    query: itemGridQuery<Requirement>(filters),
  })

  // Get selected design from URL
  const selectedDesignId = searchParams.designId
  const selectedDesign = designs.find((d) => d.id === selectedDesignId)

  // Version context management
  const { context, contextLabel, isEditable } =
    useVersionContext(selectedDesignId)

  // Navigate to detail page for editing
  const handleEditRequirement = (requirement: Requirement) => {
    if (requirement.id) {
      navigate({ to: '/requirements/$id', params: { id: requirement.id } })
    }
  }

  const handleDeleteRequirement = (requirement: Requirement) => {
    if (!requirement.id) return

    confirm({
      title: t('requirements.deleteTitle'),
      description: tc('dialog.confirmDeleteDescription', {
        identifier: requirement.itemNumber,
      }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/requirements/${requirement.id}`, {
            method: 'DELETE',
          })

          showSuccess(
            t('requirements.deletedTitle'),
            tc('dialog.deletedMessage', {
              identifier: requirement.itemNumber,
            }),
          )
          await invalidate('requirements')
        } catch (error) {
          handleError(error, { title: t('requirements.deleteFailed') })
        }
      },
    })
  }

  // Get context badge variant
  const getContextBadgeVariant = () => {
    switch (context.type) {
      case 'main':
        return 'default'
      case 'branch':
        return 'secondary'
      case 'tag':
        return 'outline'
      case 'commit':
        return 'outline'
      default:
        return 'default'
    }
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              {t('requirements.title')}
            </h1>
            {selectedDesignId && (
              <Badge variant={getContextBadgeVariant()} className="text-sm">
                {contextLabel}
              </Badge>
            )}
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('requirements.subtitle')}
            {selectedDesign && (
              <span className="text-slate-500">
                {tc('context.inDesign', { designName: selectedDesign.name })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportButton
            itemType="Requirement"
            designId={selectedDesignId}
            onImportComplete={() => {
              void invalidate('requirements')
            }}
          />
          <Link
            to="/requirements/new"
            search={
              selectedDesignId ? { designId: selectedDesignId } : undefined
            }
          >
            <Button disabled={!isEditable && context.type !== 'main'}>
              <Plus className="h-4 w-4 mr-2" />
              {t('requirements.create')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats — one card per lifecycle state, from configuration */}
      <LifecycleStateCards
        itemType="Requirement"
        filters={filters}
        total={total}
        totalLabel={t('requirements.total')}
      />

      {/* Requirements Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('requirements.tableTitle')}</CardTitle>
          <CardDescription>
            {t('requirements.tableDescription', { count: total })}
            {selectedDesign && context.type !== 'main' && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                {tc('context.viewing', { contextLabel })}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RequirementTable
            requirements={requirements}
            onEdit={handleEditRequirement}
            onDelete={handleDeleteRequirement}
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

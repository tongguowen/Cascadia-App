// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import type { TestPlan } from '@cascadia/commons/items/types/testplan'
import type { ItemFilters } from '@/query'
import { PageContainer } from '@/components/layout'
import { TestPlanTable } from '@/components/tests'
import { useVersionContext } from '@/hooks/useVersionContext'
import { useServerDataGrid } from '@/hooks/useServerDataGrid'
import { Badge, Button, Card, CardContent } from '@/components/ui'
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
const testPlansSearchSchema = z.object({
  search: z.coerce.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  filter_state: z.coerce.string().optional(),
  filter_status: z.coerce.string().optional(),
  programId: z.string().uuid().optional(),
  designId: z.string().uuid().optional(),
  // Version context params
  branch: z.string().uuid().optional(),
  tag: z.string().uuid().optional(),
  commit: z.string().uuid().optional(),
})

type TestPlansSearch = z.infer<typeof testPlansSearchSchema>

// Shared by the loader and the component so both key on identical filters.
function testPlanFilters(search: TestPlansSearch): ItemFilters {
  return {
    itemType: 'TestPlan',
    programId: search.programId,
    designId: search.designId,
    branch: search.branch,
    tag: search.tag,
    commit: search.commit,
  }
}

export const Route = createFileRoute('/test-plans/')({
  validateSearch: testPlansSearchSchema,
  component: TestPlansListPage,
  // The whole search object, so the loader can derive the very same grid
  // params the component derives — same params, same query key, one fetch.
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const filters = testPlanFilters(deps)
    await Promise.all([
      queryClient.ensureQueryData(
        itemListQuery<TestPlan>(filters, gridParamsFromSearch(deps)),
      ),
      (async () => {
        const lifecycle = await queryClient.ensureQueryData(
          lifecycleByItemTypeQuery('TestPlan'),
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

function TestPlansListPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { confirm } = useAlertDialog()
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()
  const searchParams = Route.useSearch()

  const filters = testPlanFilters(searchParams)

  const { data: designs = [] } = useQuery(designListQuery())

  const {
    items: testPlans,
    total,
    dataGridProps,
  } = useServerDataGrid<TestPlan>({
    query: itemGridQuery<TestPlan>(filters),
  })

  const selectedDesignId = searchParams.designId
  const selectedDesign = designs.find((d) => d.id === selectedDesignId)

  const { context, contextLabel, isEditable } =
    useVersionContext(selectedDesignId)

  const handleEditTestPlan = (testPlan: TestPlan) => {
    if (testPlan.id) {
      navigate({ to: '/test-plans/$id', params: { id: testPlan.id } })
    }
  }

  const handleDeleteTestPlan = (testPlan: TestPlan) => {
    if (!testPlan.id) return

    confirm({
      title: t('testPlans.deleteTitle'),
      description: tc('dialog.confirmDeleteDescription', {
        identifier: testPlan.itemNumber,
      }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/items/${testPlan.id}`, { method: 'DELETE' })

          showSuccess(
            t('testPlans.deletedTitle'),
            tc('dialog.deletedMessage', { identifier: testPlan.itemNumber }),
          )
          await invalidate('test-plans')
        } catch (error) {
          handleError(error, { title: t('testPlans.deleteFailed') })
        }
      },
    })
  }

  const getContextBadgeVariant = () => {
    switch (context.type) {
      case 'main':
        return 'default'
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              {t('testPlans.title')}
            </h1>
            {selectedDesignId && (
              <Badge variant={getContextBadgeVariant()} className="text-sm">
                {contextLabel}
              </Badge>
            )}
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('testPlans.subtitle')}
            {selectedDesign && (
              <span className="text-slate-500">
                {tc('context.inDesign', { designName: selectedDesign.name })}
              </span>
            )}
          </p>
        </div>
        <Link
          to="/test-plans/new"
          search={selectedDesignId ? { designId: selectedDesignId } : undefined}
        >
          <Button disabled={!isEditable && context.type !== 'main'}>
            <Plus className="h-4 w-4 mr-2" />
            {t('testPlans.create')}
          </Button>
        </Link>
      </div>

      {/* Stats — one card per lifecycle state, from configuration */}
      <LifecycleStateCards
        itemType="TestPlan"
        filters={filters}
        total={total}
        totalLabel={t('testPlans.total')}
      />

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <TestPlanTable
            testPlans={testPlans}
            onEdit={handleEditTestPlan}
            onDelete={handleDeleteTestPlan}
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

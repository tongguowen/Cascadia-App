// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import type { Issue } from '@cascadia/commons/items/types/issue'
import type { ItemFilters } from '@/query'
import { PageContainer } from '@/components/layout'
import { IssueTable } from '@/components/issues/IssueTable'
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
const issuesSearchSchema = z.object({
  search: z.coerce.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  filter_state: z.coerce.string().optional(),
  filter_severity: z.coerce.string().optional(),
  filter_issueType: z.coerce.string().optional(),
  programId: z.string().uuid().optional(),
  designId: z.string().uuid().optional(),
  // Version context params
  branch: z.string().uuid().optional(),
  tag: z.string().uuid().optional(),
  commit: z.string().uuid().optional(),
})

type IssuesSearch = z.infer<typeof issuesSearchSchema>

// Shared by the loader and the component so both key on identical filters.
function issueFilters(search: IssuesSearch): ItemFilters {
  return {
    itemType: 'Issue',
    programId: search.programId,
    designId: search.designId,
    branch: search.branch,
    tag: search.tag,
    commit: search.commit,
  }
}

export const Route = createFileRoute('/issues/')({
  validateSearch: issuesSearchSchema,
  component: IssuesListPage,
  // The whole search object, so the loader can derive the very same grid
  // params the component derives — same params, same query key, one fetch.
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const filters = issueFilters(deps)
    await Promise.all([
      queryClient.ensureQueryData(
        itemListQuery<Issue>(filters, gridParamsFromSearch(deps)),
      ),
      (async () => {
        const lifecycle = await queryClient.ensureQueryData(
          lifecycleByItemTypeQuery('Issue'),
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

function IssuesListPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { confirm } = useAlertDialog()
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()
  const searchParams = Route.useSearch()

  const filters = issueFilters(searchParams)

  const { data: designs = [] } = useQuery(designListQuery())

  const {
    items: issues,
    total,
    dataGridProps,
  } = useServerDataGrid<Issue>({
    query: itemGridQuery<Issue>(filters),
  })

  // Get selected design from URL
  const selectedDesignId = searchParams.designId
  const selectedDesign = designs.find((d) => d.id === selectedDesignId)

  // Version context management
  const { context, contextLabel } = useVersionContext(selectedDesignId)

  const handleEditIssue = (issue: Issue) => {
    if (issue.id) {
      navigate({ to: '/issues/$id', params: { id: issue.id } })
    }
  }

  const handleDeleteIssue = (issue: Issue) => {
    if (!issue.id) return

    confirm({
      title: t('issues.deleteTitle'),
      description: tc('dialog.confirmDeleteDescription', {
        identifier: issue.itemNumber,
      }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/issues/${issue.id}`, {
            method: 'DELETE',
          })

          showSuccess(
            t('issues.deletedTitle'),
            tc('dialog.deletedMessage', { identifier: issue.itemNumber }),
          )
          await invalidate('issues')
        } catch (error) {
          handleError(error, { title: t('issues.deleteFailed') })
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
              {t('issues.title')}
            </h1>
            {selectedDesignId && (
              <Badge variant={getContextBadgeVariant()} className="text-sm">
                {contextLabel}
              </Badge>
            )}
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('issues.subtitle')}
            {selectedDesign && (
              <span className="text-slate-500">
                {tc('context.inDesign', { designName: selectedDesign.name })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportButton
            itemType="Issue"
            onImportComplete={() => {
              void invalidate('issues')
            }}
          />
          <Link
            to="/issues/new"
            search={
              selectedDesignId ? { designId: selectedDesignId } : undefined
            }
          >
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('issues.create')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats — one card per lifecycle state, from configuration */}
      <LifecycleStateCards
        itemType="Issue"
        filters={filters}
        total={total}
        totalLabel={t('issues.total')}
      />

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('issues.tableTitle')}</CardTitle>
          <CardDescription>
            {t('issues.tableDescription', { count: total })}
            {selectedDesign && context.type !== 'main' && (
              <span className="ml-2 text-amber-600 dark:text-amber-400">
                {tc('context.viewing', { contextLabel })}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IssueTable
            items={issues}
            onEdit={handleEditIssue}
            onDelete={handleDeleteIssue}
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

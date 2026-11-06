// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import type { Design } from '@cascadia/commons/types/design'
import type { GridParams } from '@/query'
import { PageContainer } from '@/components/layout'
import { DesignTable } from '@/components/designs/DesignTable'
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
import { useServerDataGrid } from '@/hooks/useServerDataGrid'
import {
  designCountsQuery,
  designGridQuery,
  gridParamsFromSearch,
  programListQuery,
  useInvalidateResources,
} from '@/query'
import { apiFetch } from '@/api/client'

// Search schema for URL validation
const designsSearchSchema = z.object({
  search: z.coerce.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  filter_designType: z.coerce.string().optional(),
  programId: z.string().optional(),
})

type DesignWithProgram = Design & { programCode?: string; programName?: string }

export const Route = createFileRoute('/designs/')({
  validateSearch: designsSearchSchema,
  component: DesignsListPage,
  // The whole search object, so the loader can derive the very same grid
  // params the component derives — same params, same query key, one fetch.
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    const grid = gridParamsFromSearch(deps)
    await Promise.all([
      queryClient.ensureQueryData(designGridQuery(grid, deps.programId)),
      queryClient.ensureQueryData(designCountsQuery(deps.programId)),
      queryClient.ensureQueryData(programListQuery()),
    ])
  },
})

function DesignsListPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { confirm } = useAlertDialog()
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()
  const searchParams = Route.useSearch()

  const { data: programs = [] } = useQuery(programListQuery())
  const { data: counts } = useQuery(designCountsQuery(searchParams.programId))

  const {
    items: pagedDesigns,
    total,
    dataGridProps,
  } = useServerDataGrid<Design>({
    query: (grid: GridParams) => designGridQuery(grid, searchParams.programId),
  })

  // The designs endpoint returns `programId` only; the table renders the
  // program's code and name, so join them from the programs list here.
  const designs = useMemo<Array<DesignWithProgram>>(() => {
    const byId = new Map(programs.map((p) => [p.id, p]))
    return pagedDesigns.map((design) => {
      const program = design.programId ? byId.get(design.programId) : undefined
      return {
        ...design,
        programCode: program?.code,
        programName: program?.name,
      }
    })
  }, [pagedDesigns, programs])

  // Navigate to detail page for editing
  const handleEditDesign = (design: Design) => {
    if (design.id) {
      navigate({ to: '/designs/$id', params: { id: design.id } })
    }
  }

  const handleArchiveDesign = (design: Design) => {
    confirm({
      title: t('designs.archiveTitle'),
      description: t('designs.archiveDescription', { code: design.code }),
      actionLabel: tc('actions.archive'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/designs/${design.id}/archive`, {
            method: 'POST',
          })

          showSuccess(
            t('designs.archivedTitle'),
            `${design.code} has been archived`,
          )
          await invalidate('designs')
        } catch (error) {
          handleError(error, { title: t('designs.archiveFailed') })
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
            {t('designs.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('designs.subtitle')}
          </p>
        </div>
        <Link
          to="/designs/new"
          search={
            searchParams.programId
              ? { programId: searchParams.programId }
              : undefined
          }
        >
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('designs.create')}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('designs.total')}</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('designs.engineering')}</CardDescription>
            <CardTitle className="text-3xl text-cyan-600 dark:text-cyan-400">
              {counts?.design ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('designs.families')}</CardDescription>
            <CardTitle className="text-3xl text-amber-600 dark:text-amber-400">
              {counts?.family ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('designs.libraries')}</CardDescription>
            <CardTitle className="text-3xl text-purple-600 dark:text-purple-400">
              {counts?.library ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Designs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {searchParams.programId
              ? t('designs.tableTitleProgram', {
                  programName:
                    programs.find((p) => p.id === searchParams.programId)
                      ?.name ?? t('designs.tableTitleProgramFallback'),
                })
              : t('designs.tableTitleAll')}
          </CardTitle>
          <CardDescription>
            {t('designs.tableDescription', {
              count: total,
              scope: searchParams.programId
                ? t('designs.scopeInProgram')
                : t('designs.scopeInSystem'),
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DesignTable
            items={designs}
            onEdit={handleEditDesign}
            onArchive={handleArchiveDesign}
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

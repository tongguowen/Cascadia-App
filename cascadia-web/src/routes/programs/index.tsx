// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import type { Program } from '@cascadia/commons/types/program'
import type { GridParams } from '@/query'
import { PageContainer } from '@/components/layout'
import { ProgramTable } from '@/components/programs/ProgramTable'
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
  gridParamsFromSearch,
  programCountsQuery,
  programGridQuery,
  useInvalidateResources,
} from '@/query'
import { apiFetch } from '@/api/client'

// Search schema for URL validation
const programsSearchSchema = z.object({
  search: z.coerce.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().optional(),
  filter_status: z.coerce.string().optional(),
})

export const Route = createFileRoute('/programs/')({
  validateSearch: programsSearchSchema,
  component: ProgramsListPage,
  // The whole search object, so the loader can derive the very same grid
  // params the component derives — same params, same query key, one fetch.
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps }) => {
    await Promise.all([
      queryClient.ensureQueryData(programGridQuery(gridParamsFromSearch(deps))),
      queryClient.ensureQueryData(programCountsQuery()),
    ])
  },
})

function ProgramsListPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { confirm } = useAlertDialog()
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()

  const { data: counts } = useQuery(programCountsQuery())

  // Server-side DataGrid with URL state sync
  const {
    items: programs,
    total,
    dataGridProps,
  } = useServerDataGrid<Program>({
    query: (grid: GridParams) => programGridQuery(grid),
  })

  // Navigate to detail page for editing
  const handleEditProgram = (program: Program) => {
    if (program.id) {
      navigate({ to: '/programs/$id', params: { id: program.id } })
    }
  }

  const handleDeleteProgram = (program: Program) => {
    confirm({
      title: t('programs.deleteTitle'),
      description: t('programs.deleteDescription', { code: program.code }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/programs/${program.id}`, {
            method: 'DELETE',
          })

          showSuccess(
            t('programs.deletedTitle'),
            tc('dialog.deletedMessage', { identifier: program.code }),
          )
          await invalidate('programs')
        } catch (error) {
          handleError(error, { title: t('programs.deleteFailed') })
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
            {t('programs.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('programs.subtitle')}
          </p>
        </div>
        <Link to="/programs/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('programs.create')}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('programs.total')}</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('programs.active')}</CardDescription>
            <CardTitle className="text-3xl text-green-600 dark:text-green-400">
              {counts?.active ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('programs.onHold')}</CardDescription>
            <CardTitle className="text-3xl text-yellow-600 dark:text-yellow-400">
              {counts?.onHold ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('programs.completed')}</CardDescription>
            <CardTitle className="text-3xl text-slate-600 dark:text-slate-400">
              {counts?.completed ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Programs Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('programs.tableTitle')}</CardTitle>
          <CardDescription>
            {t('programs.tableDescription', { count: total })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProgramTable
            items={programs}
            onEdit={handleEditProgram}
            onDelete={handleDeleteProgram}
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

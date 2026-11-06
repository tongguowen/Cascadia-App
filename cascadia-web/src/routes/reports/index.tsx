// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Plus } from 'lucide-react'
import type { Report } from '@cascadia/commons/reports/types'
import { PageContainer } from '@/components/layout'
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
import { reportListQuery, useInvalidateResources } from '@/query'
import { apiFetch } from '@/api/client'
import { ReportTable } from '@/components/reports/ReportTable'

export const Route = createFileRoute('/reports/')({
  component: ReportsListPage,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(reportListQuery()),
})

function ReportsListPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const { confirm } = useAlertDialog()
  const { handleError } = useErrorHandler()
  const invalidate = useInvalidateResources()
  const { data: reports = [] } = useQuery(reportListQuery())

  const handleDeleteReport = (report: Report) => {
    if (!report.id) return

    confirm({
      title: t('reports.deleteTitle'),
      description: t('reports.deleteDescription', { name: report.name }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/reports/${report.id}`, {
            method: 'DELETE',
          })

          await invalidate('reports')
        } catch (error) {
          handleError(error, { title: tc('dialog.failedDelete') })
        }
      },
    })
  }

  // Group reports by item type
  const reportsByType = reports.reduce<Record<string, Array<Report>>>(
    (acc, report) => {
      const type = report.itemType
      const bucket = (acc[type] ??= [])
      bucket.push(report)
      return acc
    },
    {},
  )

  const itemTypeLabels: Record<string, string> = {
    Part: 'Parts',
    Document: 'Documents',
    ChangeOrder: 'Change Orders',
    Project: 'Projects',
    Requirement: 'Requirements',
    Task: 'Tasks',
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            {t('reports.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('reports.subtitle')}
          </p>
        </div>
        <Link to="/reports/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('reports.create')}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('reports.total')}</CardDescription>
            <CardTitle className="text-3xl">{reports.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('reports.public')}</CardDescription>
            <CardTitle className="text-3xl">
              {reports.filter((r) => r.isPublic).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('reports.private')}</CardDescription>
            <CardTitle className="text-3xl">
              {reports.filter((r) => !r.isPublic).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('reports.itemTypes')}</CardDescription>
            <CardTitle className="text-3xl">
              {Object.keys(reportsByType).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Reports by Item Type */}
      {reports.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                {t('reports.emptyTitle')}
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                {t('reports.emptyDescription')}
              </p>
              <div className="mt-6">
                <Link to="/reports/new">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('reports.create')}
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        Object.entries(reportsByType).map(([itemType, typeReports]) => (
          <Card key={itemType}>
            <CardHeader>
              <CardTitle>
                {t('reports.groupTitle', {
                  itemTypeLabel: itemTypeLabels[itemType] || itemType,
                })}
              </CardTitle>
              <CardDescription>
                {t('reports.groupDescription', { count: typeReports.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportTable
                reports={typeReports}
                onDelete={handleDeleteReport}
              />
            </CardContent>
          </Card>
        ))
      )}
    </PageContainer>
  )
}

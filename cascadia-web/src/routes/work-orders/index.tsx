// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus, Wrench } from 'lucide-react'
import type { WorkOrder } from '@cascadia/commons/items/types/work-order'
import { PageContainer } from '@/components/layout'
import { WorkOrderTable } from '@/components/work-orders/WorkOrderTable'
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
import { useInvalidateResources, workOrderListQuery } from '@/query'
import { apiFetch } from '@/api/client'

export const Route = createFileRoute('/work-orders/')({
  component: WorkOrdersListPage,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(workOrderListQuery()),
})

function WorkOrdersListPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { confirm } = useAlertDialog()
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()
  const { data } = useQuery(workOrderListQuery())
  const workOrders = data?.workOrders ?? []

  const statusCounts = {
    notStarted: workOrders.filter((wo) => wo.status === 'Not Started').length,
    inProgress: workOrders.filter((wo) => wo.status === 'In Progress').length,
    complete: workOrders.filter((wo) => wo.status === 'Complete').length,
  }

  const handleView = (workOrder: WorkOrder) => {
    navigate({ to: '/work-orders/$id', params: { id: workOrder.id } })
  }

  const handleEdit = (workOrder: WorkOrder) => {
    navigate({ to: '/work-orders/$id', params: { id: workOrder.id } })
  }

  const handleDelete = (workOrder: WorkOrder) => {
    confirm({
      title: t('workOrders.deleteTitle'),
      description: tc('dialog.confirmDeleteDescription', {
        identifier: workOrder.workOrderNumber,
      }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/work-orders/${workOrder.id}`, {
            method: 'DELETE',
          })

          showSuccess(
            t('workOrders.deletedTitle'),
            tc('dialog.deletedMessage', {
              identifier: workOrder.workOrderNumber,
            }),
          )
          await invalidate('work-orders')
        } catch (error) {
          handleError(error, { title: t('workOrders.deleteFailed') })
        }
      },
    })
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <Wrench className="h-6 w-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              {t('workOrders.title')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {t('workOrders.subtitle')}
            </p>
          </div>
        </div>
        <Link to="/work-orders/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('workOrders.create')}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('workOrders.total')}</CardDescription>
            <CardTitle className="text-3xl">{workOrders.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('workOrders.notStarted')}</CardDescription>
            <CardTitle className="text-3xl">
              {statusCounts.notStarted}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('workOrders.inProgress')}</CardDescription>
            <CardTitle className="text-3xl">
              {statusCounts.inProgress}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('workOrders.complete')}</CardDescription>
            <CardTitle className="text-3xl">{statusCounts.complete}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('workOrders.tableTitle')}</CardTitle>
          <CardDescription>
            {t('workOrders.tableDescription', { count: workOrders.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkOrderTable
            items={workOrders}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </CardContent>
      </Card>
    </PageContainer>
  )
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { GitBranch, Loader2, Plus, RotateCcw, Workflow } from 'lucide-react'
import { resolveLifecycleType } from '@cascadia/commons/lifecycles/normalize'
import type {
  LifecycleDefinition,
  LifecycleType,
} from '@cascadia/commons/lifecycles/types'
import { PageContainer } from '@/components/layout'
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
import { LifecycleTable } from '@/components/lifecycles/LifecycleTable'
import { lifecycleListQuery, useInvalidateResources } from '@/query'
import { apiFetch } from '@/api/client'

export const Route = createFileRoute('/lifecycles/')({
  component: LifecyclesListPage,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(lifecycleListQuery()),
})

function LifecyclesListPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const { confirm } = useAlertDialog()
  const { handleError } = useErrorHandler()
  const invalidate = useInvalidateResources()
  // Lifecycles and change-order workflows are one unified list
  const { data: lifecycles = [], isPending } = useQuery(lifecycleListQuery())

  // Legacy definitions resolve through the one sanctioned inference
  const getLifecycleType = (lifecycle: LifecycleDefinition): LifecycleType =>
    resolveLifecycleType(lifecycle)

  // Group lifecycles by type
  const freeLifecycles = lifecycles.filter(
    (l) => getLifecycleType(l) === 'Free',
  )
  const drivenLifecycles = lifecycles.filter(
    (l) => getLifecycleType(l) === 'Driven',
  )
  const drivingLifecycles = lifecycles.filter(
    (l) => getLifecycleType(l) === 'Driving',
  )

  const handleDelete = (lifecycle: LifecycleDefinition) => {
    confirm({
      title: t('lifecycles.deleteTitle'),
      description: t('lifecycles.deleteDescription', { name: lifecycle.name }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/lifecycles/${lifecycle.id}`, {
            method: 'DELETE',
          })

          await invalidate('lifecycles')
        } catch (error) {
          handleError(error, { title: tc('dialog.failedDelete') })
        }
      },
    })
  }

  if (isPending) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
          <span className="ml-2 text-slate-600 dark:text-slate-400">
            {t('lifecycles.loading')}
          </span>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            {t('lifecycles.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('lifecycles.subtitle')}
          </p>
        </div>
        <Link to="/lifecycles/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('lifecycles.create')}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('lifecycles.total')}</CardDescription>
            <CardTitle className="text-3xl">{lifecycles.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">
                  {t('lifecycles.free')}
                </Badge>
              </div>
            </CardDescription>
            <CardTitle className="text-3xl">{freeLifecycles.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>
              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className="text-xs bg-amber-50 dark:bg-amber-950"
                >
                  {t('lifecycles.driven')}
                </Badge>
              </div>
            </CardDescription>
            <CardTitle className="text-3xl">
              {drivenLifecycles.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>
              <div className="flex items-center gap-1">
                <Badge
                  variant="outline"
                  className="text-xs bg-cyan-50 dark:bg-cyan-950"
                >
                  {t('lifecycles.driving')}
                </Badge>
              </div>
            </CardDescription>
            <CardTitle className="text-3xl">
              {drivingLifecycles.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Driving Lifecycles (ECO Workflows) */}
      {drivingLifecycles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Workflow className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              <CardTitle>{t('lifecycles.drivingTitle')}</CardTitle>
              <Badge variant="outline" className="bg-cyan-50 dark:bg-cyan-950">
                {t('lifecycles.drivingBadge')}
              </Badge>
            </div>
            <CardDescription>
              {t('lifecycles.drivingDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LifecycleTable
              lifecycles={drivingLifecycles}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      )}

      {/* Driven Lifecycles (Parts, Documents) */}
      {drivenLifecycles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <CardTitle>{t('lifecycles.drivenTitle')}</CardTitle>
              <Badge
                variant="outline"
                className="bg-amber-50 dark:bg-amber-950"
              >
                {t('lifecycles.drivenBadge')}
              </Badge>
            </div>
            <CardDescription>
              {t('lifecycles.drivenDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LifecycleTable
              lifecycles={drivenLifecycles}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      )}

      {/* Free Lifecycles (Programs, Projects) */}
      {freeLifecycles.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              <CardTitle>{t('lifecycles.freeTitle')}</CardTitle>
              <Badge variant="outline">{t('lifecycles.freeBadge')}</Badge>
            </div>
            <CardDescription>
              {t('lifecycles.freeDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LifecycleTable
              lifecycles={freeLifecycles}
              onDelete={handleDelete}
            />
          </CardContent>
        </Card>
      )}

      {/* Show all if no grouped data */}
      {lifecycles.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('lifecycles.emptyTitle')}</CardTitle>
            <CardDescription>
              {t('lifecycles.emptyDescription')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </PageContainer>
  )
}

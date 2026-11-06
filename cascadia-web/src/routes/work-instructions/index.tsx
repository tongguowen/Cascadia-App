// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ClipboardCheck, Plus } from 'lucide-react'
import type { WorkInstruction } from '@cascadia/commons/items/types/work-instruction'
import type { GridParams, ItemFilters } from '@/query'
import { PageContainer } from '@/components/layout'
import { WorkInstructionTable } from '@/components/work-instructions/WorkInstructionTable'
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
  itemCountsQuery,
  itemListQuery,
  lifecycleByItemTypeQuery,
  useInvalidateResources,
} from '@/query'
import { apiFetch } from '@/api/client'
import { LifecycleStateCards } from '@/components/items/LifecycleStateCards'

const WORK_INSTRUCTION_FILTERS: ItemFilters = { itemType: 'WorkInstruction' }

// The table paginates client-side, so one fixed page is fetched. Kept at
// module scope so the loader and the component key on the same params.
const WORK_INSTRUCTION_GRID: GridParams = { page: 1, pageSize: 50 }

// The states behind the stat cards, counted in one request rather than one
// probe request each.
export const Route = createFileRoute('/work-instructions/')({
  component: WorkInstructionsListPage,
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(
        itemListQuery<WorkInstruction>(
          WORK_INSTRUCTION_FILTERS,
          WORK_INSTRUCTION_GRID,
        ),
      ),
      (async () => {
        const lifecycle = await queryClient.ensureQueryData(
          lifecycleByItemTypeQuery('WorkInstruction'),
        )
        await queryClient.ensureQueryData(
          itemCountsQuery(
            WORK_INSTRUCTION_FILTERS,
            lifecycle.states.map((state) => state.id),
          ),
        )
      })(),
    ])
  },
})

function WorkInstructionsListPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { confirm } = useAlertDialog()
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()

  const { data: page } = useQuery(
    itemListQuery<WorkInstruction>(
      WORK_INSTRUCTION_FILTERS,
      WORK_INSTRUCTION_GRID,
    ),
  )

  const workInstructions = page?.items ?? []
  const total = page?.total ?? 0

  const handleEdit = (workInstruction: WorkInstruction) => {
    if (workInstruction.id) {
      navigate({
        to: '/work-instructions/$id',
        params: { id: workInstruction.id },
      })
    }
  }

  const handlePresent = (workInstruction: WorkInstruction) => {
    if (workInstruction.id) {
      navigate({
        to: '/work-instructions/$id/present',
        params: { id: workInstruction.id },
      })
    }
  }

  const handleDelete = (workInstruction: WorkInstruction) => {
    if (!workInstruction.id) return

    confirm({
      title: t('workInstructions.deleteTitle'),
      description: tc('dialog.confirmDeleteDescription', {
        identifier: workInstruction.itemNumber,
      }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/work-instructions/${workInstruction.id}`, {
            method: 'DELETE',
          })

          showSuccess(
            t('workInstructions.deletedTitle'),
            tc('dialog.deletedMessage', {
              identifier: workInstruction.itemNumber,
            }),
          )
          await invalidate('work-instructions')
        } catch (error) {
          handleError(error, { title: t('workInstructions.deleteFailed') })
        }
      },
    })
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-100 dark:bg-sky-900 rounded-lg">
            <ClipboardCheck className="h-6 w-6 text-sky-600 dark:text-sky-400" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              {t('workInstructions.title')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {t('workInstructions.subtitle')}
            </p>
          </div>
        </div>
        <Link to="/work-instructions/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('workInstructions.create')}
          </Button>
        </Link>
      </div>

      {/* Stats — one card per lifecycle state, from configuration */}
      <LifecycleStateCards
        itemType="WorkInstruction"
        filters={WORK_INSTRUCTION_FILTERS}
        total={total}
        totalLabel={t('workInstructions.total')}
      />

      {/* Work Instructions Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('workInstructions.tableTitle')}</CardTitle>
          <CardDescription>
            {t('workInstructions.tableDescription', { count: total })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WorkInstructionTable
            items={workInstructions}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPresent={handlePresent}
          />
        </CardContent>
      </Card>
    </PageContainer>
  )
}

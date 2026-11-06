// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { LayoutGrid, List as ListIcon, Plus } from 'lucide-react'
import type { Task } from '@cascadia/commons/items/types/task'
import type { ItemFilters } from '@/query'
import { PageContainer } from '@/components/layout'
import { TaskTable } from '@/components/tasks/TaskTable'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
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
import { itemCollectionQuery, useInvalidateResources } from '@/query'
import { apiFetch } from '@/api/client'
import { LifecycleStateCards } from '@/components/items/LifecycleStateCards'

const TASK_FILTERS: ItemFilters = { itemType: 'Task' }

// The kanban board and the stat cards both need every task at once.
const TASK_LIMIT = 1000

export const Route = createFileRoute('/tasks/')({
  component: TasksListPage,
  loader: async ({ context: { queryClient } }) => {
    await queryClient.ensureQueryData(
      itemCollectionQuery<Task>(TASK_FILTERS, TASK_LIMIT),
    )
  },
})

function TasksListPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { confirm } = useAlertDialog()
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')

  const { data: tasks = [] } = useQuery(
    itemCollectionQuery<Task>(TASK_FILTERS, TASK_LIMIT),
  )
  const taskCountsByState = tasks.reduce<Record<string, number>>((acc, t) => {
    if (t.state) acc[t.state] = (acc[t.state] ?? 0) + 1
    return acc
  }, {})

  // Navigate to new task page
  const handleEditTask = (task: Task) => {
    // Tasks don't have a detail page, so navigate to the list for now
    // You could create a /tasks/$id page for editing
    if (task.id) {
      navigate({ to: '/tasks/new' })
    }
  }

  // Dragging a card between kanban columns has to land immediately — waiting
  // for the round trip makes the card visibly snap back first. Write the new
  // state into the cache up front and roll it back if the PUT fails; the
  // invalidation that follows reconciles against the server either way.
  const handleTaskUpdate = async (updatedTask: Task) => {
    if (!updatedTask.id) return

    const taskQuery = itemCollectionQuery<Task>(TASK_FILTERS, TASK_LIMIT)
    await queryClient.cancelQueries({ queryKey: taskQuery.queryKey })
    const previous = queryClient.getQueryData<Array<Task>>(taskQuery.queryKey)

    queryClient.setQueryData<Array<Task>>(taskQuery.queryKey, (current) =>
      current?.map((task) =>
        task.id === updatedTask.id ? { ...task, ...updatedTask } : task,
      ),
    )

    try {
      // Dragging between columns is a lifecycle transition - the sealed item
      // update rejects state changes, and the lifecycle's own transitions
      // decide which moves are legal
      await apiFetch(`/api/v1/items/${updatedTask.id}/transition`, {
        method: 'POST',
        body: JSON.stringify({ toState: updatedTask.state }),
      })
    } catch (error) {
      queryClient.setQueryData(taskQuery.queryKey, previous)
      handleError(error, { title: tc('dialog.failedGeneric') })
      return
    }

    await invalidate('tasks')
  }

  const handleDeleteTask = (task: Task) => {
    if (!task.id) return

    confirm({
      title: t('tasks.deleteTitle'),
      description: tc('dialog.confirmDeleteDescription', {
        identifier: task.itemNumber,
      }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/tasks/${task.id}`, {
            method: 'DELETE',
          })

          showSuccess(
            t('tasks.deletedTitle'),
            tc('dialog.deletedMessage', { identifier: task.itemNumber }),
          )
          await invalidate('tasks')
        } catch (error) {
          handleError(error, { title: t('tasks.deleteFailed') })
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
            {t('tasks.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('tasks.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            {t('tasks.viewKanban')}
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            <ListIcon className="h-4 w-4 mr-2" />
            {t('tasks.viewList')}
          </Button>
          <Link to="/tasks/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('tasks.create')}
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats - one card per Task lifecycle state, from configuration */}
      <LifecycleStateCards
        itemType="Task"
        filters={TASK_FILTERS}
        total={tasks.length}
        totalLabel={t('tasks.total')}
        counts={taskCountsByState}
      />

      {/* Content - Kanban or List */}
      {viewMode === 'kanban' ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('tasks.kanbanTitle')}</CardTitle>
            <CardDescription>{t('tasks.kanbanDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <KanbanBoard
              tasks={tasks}
              onTaskUpdate={handleTaskUpdate}
              onTaskEdit={handleEditTask}
              onTaskDelete={handleDeleteTask}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{t('tasks.listTitle')}</CardTitle>
            <CardDescription>
              {t('tasks.listDescription', { count: tasks.length })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaskTable
              items={tasks}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
            />
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}

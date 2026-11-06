// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Edit, Save, Tag, Trash2, X } from 'lucide-react'
import type { Task } from '@cascadia/commons/items/types/task'
import { PageContainer } from '@/components/layout'
import { ItemHistoryTab } from '@/components/items/ItemHistoryTab'
import { useVersionContext } from '@/hooks/useVersionContext'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ViewEditBadge,
  ViewEditNumber,
  ViewEditStatic,
  ViewEditText,
  ViewEditTextarea,
} from '@/components/ui'
import { useAlertDialog } from '@/hooks/useAlertDialog'
import { itemAtContextQuery } from '@/query/options/items'
import { StateBadge } from '@/components/items/StateBadge'
import { FreeTransitionControl } from '@/components/items/FreeTransitionControl'

const priorityVariant = (priority: string) => {
  const variants: Record<
    string,
    'default' | 'secondary' | 'success' | 'warning' | 'destructive'
  > = {
    Low: 'secondary',
    Medium: 'default',
    High: 'warning',
    Critical: 'destructive',
  }
  return variants[priority] || 'default'
}

const createEmptyTask = (): Task => ({
  id: undefined,
  masterId: undefined,
  itemType: 'Task',
  itemNumber: '',
  name: '',
  description: '',
  state: '',
  isCurrent: true,
  priority: 'Medium',
  assignee: undefined,
  dueDate: undefined,
  estimatedHours: undefined,
  actualHours: undefined,
  tags: [],
  programId: undefined,
  designId: undefined,
  createdAt: undefined,
  modifiedAt: undefined,
})

/**
 * The tabs this detail view renders. The route's search schema derives its
 * `tab` enum from this list, so the URL contract and the rendered tabs
 * cannot drift apart; the `onValueChange` cast below is the one seam where
 * Radix's `string` meets it, and the triggers are rendered from the same
 * source of truth.
 */
export const TASK_DETAIL_TABS = ['details', 'history'] as const
export type TaskDetailTab = (typeof TASK_DETAIL_TABS)[number]

interface TaskDetailProps {
  /** Called after a lifecycle transition succeeds (refresh the item) */
  onTransitioned?: () => void
  task?: Task
  onSave: (task: Task) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  activeTab?: TaskDetailTab
  onTabChange?: (tab: TaskDetailTab) => void
}

export function TaskDetail({
  onTransitioned,
  task: initialTask,
  onSave,
  onDelete,
  onCancel,
  isSubmitting = false,
  activeTab = 'details',
  onTabChange,
}: TaskDetailProps) {
  const { confirm } = useAlertDialog()
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')

  const priorityOptions = useMemo(
    () =>
      (['Low', 'Medium', 'High', 'Critical'] as const).map((value) => ({
        value,
        label: tc(`enum.priority.${value}`),
      })),
    [tc],
  )
  const ttk = (key: string) => tp(`tasks.detail.${key}`)

  const isCreateMode = !initialTask?.id

  const [task, setTask] = useState<Task>(() => initialTask || createEmptyTask())
  const [isEditing, setIsEditing] = useState(isCreateMode)

  const { context, setContext } = useVersionContext(
    isCreateMode ? undefined : task.designId,
  )

  // The task as it stood at the selected version context. Viewing `main`
  // addresses nothing, so the query stays disabled and the caller's copy is
  // shown — the same rule the shared factory encodes for every detail page.
  const { data: versionAtContext } = useQuery(
    itemAtContextQuery<Task>(
      task.id ?? '',
      context,
      !isCreateMode && Boolean(task.designId),
    ),
  )
  const displayedTask = isCreateMode ? task : (versionAtContext ?? task)

  useEffect(() => {
    if (initialTask) {
      setTask(initialTask)
    }
  }, [initialTask])

  const currentTask = isCreateMode ? task : displayedTask

  const updateField = (field: keyof Task, value: any) => {
    setTask((prev) => ({ ...prev, [field]: value }))
  }

  const handleEdit = () => {
    setTask(currentTask)
    setIsEditing(true)
  }

  const handleSave = async () => {
    await onSave(task)
    if (!isCreateMode) setIsEditing(false)
  }

  const handleCancelEdit = () => {
    if (isCreateMode) {
      onCancel()
    } else {
      setTask(currentTask)
      setIsEditing(false)
    }
  }

  const handleDelete = () => {
    if (!onDelete || !currentTask.id) return
    confirm({
      title: tp('tasks.deleteTitle'),
      description: tp('tasks.detail.deleteDescription', {
        itemNumber: currentTask.itemNumber ?? '',
      }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: onDelete,
    })
  }

  const formatDate = (date?: string | Date | null) => {
    if (!date) return '-'
    try {
      return new Date(date).toLocaleDateString()
    } catch {
      return '-'
    }
  }

  return (
    <PageContainer>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/tasks">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              {isCreateMode
                ? tp('tasks.form.createTitle')
                : currentTask.itemNumber}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {isCreateMode
                ? tp('tasks.form.createSubtitle')
                : currentTask.name || tc('labels.unnamed')}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isSubmitting}
              >
                <X className="h-4 w-4 mr-2" />
                {tc('actions.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting
                  ? tc('actions.saving')
                  : isCreateMode
                    ? tp('tasks.form.createSubmit')
                    : tc('actions.saveChanges')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                {tc('actions.edit')}
              </Button>
              {onDelete && (
                <Button variant="destructive" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {tc('actions.delete')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {!isCreateMode && (
        <div className="flex gap-2">
          <StateBadge
            itemType="Task"
            state={currentTask.state}
            className="text-sm"
          />
          {currentTask.id && (
            <FreeTransitionControl
              itemId={currentTask.id}
              state={currentTask.state}
              onTransitioned={onTransitioned}
            />
          )}
          {currentTask.priority && (
            <Badge
              variant={priorityVariant(currentTask.priority)}
              className="text-sm"
            >
              {currentTask.priority} Priority
            </Badge>
          )}
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange?.(value as TaskDetailTab)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">{tc('tabs.details')}</TabsTrigger>
          <TabsTrigger value="history">{tc('tabs.history')}</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{tc('sections.overview')}</CardTitle>
                  <CardDescription>{ttk('overviewDescription')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ViewEditText
                      label={tc('fields.itemNumber')}
                      value={
                        isEditing ? task.itemNumber : currentTask.itemNumber
                      }
                      onChange={(v) => updateField('itemNumber', v)}
                      isEditing={isEditing && isCreateMode}
                      placeholder={ttk('itemNumberPlaceholder')}
                      required
                    />
                    <ViewEditText
                      label={tc('fields.name')}
                      value={isEditing ? task.name : currentTask.name}
                      onChange={(v) => updateField('name', v)}
                      isEditing={isEditing}
                      placeholder={ttk('namePlaceholder')}
                      required
                    />
                    <ViewEditBadge
                      label={tc('fields.priority')}
                      value={isEditing ? task.priority : currentTask.priority}
                      onChange={(v) => updateField('priority', v)}
                      isEditing={isEditing}
                      options={priorityOptions}
                      placeholder={tc('placeholders.selectGeneric')}
                      variant={priorityVariant}
                    />
                    <ViewEditTextarea
                      label={tc('fields.description')}
                      value={
                        isEditing ? task.description : currentTask.description
                      }
                      onChange={(v) => updateField('description', v)}
                      isEditing={isEditing}
                      placeholder={ttk('descriptionPlaceholder')}
                      className="md:col-span-2"
                    />
                  </dl>
                </CardContent>
              </Card>

              {(currentTask.tags && currentTask.tags.length > 0) ||
              isEditing ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{tc('sections.tags')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <ViewEditText
                        label={tc('labels.tagsCommaSeparated')}
                        value={task.tags?.join(', ') ?? ''}
                        onChange={(v) =>
                          updateField(
                            'tags',
                            v
                              .split(',')
                              .map((t) => t.trim())
                              .filter(Boolean),
                          )
                        }
                        isEditing={isEditing}
                        placeholder={ttk('tagsPlaceholder')}
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {currentTask.tags?.map((tag, idx) => (
                          <Badge key={idx} variant="secondary">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : null}
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{tc('sections.assignment')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ViewEditText
                    label={tc('fields.assignee')}
                    value={isEditing ? task.assignee : currentTask.assignee}
                    onChange={(v) => updateField('assignee', v)}
                    isEditing={isEditing}
                    placeholder={ttk('assigneePlaceholder')}
                  />
                  <ViewEditText
                    label={tc('fields.dueDate')}
                    value={
                      isEditing
                        ? task.dueDate
                          ? new Date(task.dueDate).toISOString().split('T')[0]
                          : ''
                        : formatDate(currentTask.dueDate)
                    }
                    onChange={(v) => updateField('dueDate', v)}
                    isEditing={isEditing}
                    placeholder={ttk('dueDatePlaceholder')}
                  />
                  <ViewEditNumber
                    label={tc('fields.estimatedHours')}
                    value={
                      isEditing
                        ? task.estimatedHours
                        : currentTask.estimatedHours
                    }
                    onChange={(v) =>
                      updateField(
                        'estimatedHours',
                        v ? parseFloat(v) : undefined,
                      )
                    }
                    isEditing={isEditing}
                    unit="hours"
                    step="0.5"
                  />
                  <ViewEditNumber
                    label={tc('fields.actualHours')}
                    value={
                      isEditing ? task.actualHours : currentTask.actualHours
                    }
                    onChange={(v) =>
                      updateField('actualHours', v ? parseFloat(v) : undefined)
                    }
                    isEditing={isEditing}
                    unit="hours"
                    step="0.5"
                  />
                </CardContent>
              </Card>

              <Collapsible defaultOpen={false}>
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger className="hover:opacity-70">
                      <CardTitle>{tc('sections.metadata')}</CardTitle>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-3">
                      <ViewEditStatic
                        label={tc('fields.revision')}
                        value={currentTask.revision}
                      />
                      <ViewEditStatic
                        label={tc('columns.created')}
                        value={formatDate(currentTask.createdAt)}
                      />
                      <ViewEditStatic
                        label={tc('fields.lastModified')}
                        value={formatDate(currentTask.modifiedAt)}
                      />
                      {!isCreateMode && (
                        <ViewEditStatic
                          label={ttk('taskId')}
                          value={currentTask.id}
                          mono
                        />
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {currentTask.id ? (
            <ItemHistoryTab
              itemId={currentTask.id}
              designId={currentTask.designId ?? null}
              versionContext={context}
              onViewHistoricalState={setContext}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">
                  Save the task first to view history
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

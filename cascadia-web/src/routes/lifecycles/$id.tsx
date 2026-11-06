// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, ArrowLeft, Loader2, Save } from 'lucide-react'
import { resolveLifecycleType } from '@cascadia/commons/lifecycles/normalize'
import type {
  LifecycleDefinition,
  LifecycleType,
  WorkflowType,
} from '@cascadia/commons/lifecycles/types'
import { LifecycleTypeSelector } from '@/components/lifecycles/LifecycleTypeSelector'
import { DriverSelector } from '@/components/lifecycles/DriverSelector'
import { LifecycleBuilder } from '@/components/lifecycles/LifecycleBuilder'
import { RevisionSchemeSelector } from '@/components/lifecycles/RevisionSchemeSelector'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { apiFetch } from '@/api/client'
import { lifecycleDefinitionQuery } from '@/query'

export const Route = createFileRoute('/lifecycles/$id')({
  component: EditLifecyclePage,
})

function EditLifecyclePage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const { handleError, showSuccess } = useErrorHandler()
  const { id } = Route.useParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [definition, setDefinition] =
    useState<Partial<LifecycleDefinition> | null>(null)
  const [lifecycleType, setLifecycleType] = useState<LifecycleType>('Free')
  const [drivers, setDrivers] = useState<Array<string>>([])

  // The server's copy; the editable state below is seeded from it.
  const {
    data: saved,
    isPending: loading,
    error: loadError,
  } = useQuery(lifecycleDefinitionQuery<LifecycleDefinition>(id))

  useEffect(() => {
    if (!saved) return
    setDefinition(saved)
    // Legacy definitions resolve through the one sanctioned inference
    setLifecycleType(resolveLifecycleType(saved))
    setDrivers(saved.drivers || [])
  }, [saved])

  useEffect(() => {
    if (loadError)
      handleError(loadError, { title: t('lifecycles.edit.loadFailedTitle') })
  }, [loadError, handleError])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
        <span className="ml-2 text-slate-600 dark:text-slate-400">
          {t('lifecycles.edit.loading')}
        </span>
      </div>
    )
  }

  if (!definition) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <Card className="w-96">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <h2 className="text-xl font-semibold">
                {t('lifecycles.edit.notFoundTitle')}
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                {t('lifecycles.edit.notFoundDescription')}
              </p>
              <Button onClick={() => navigate({ to: '/lifecycles' })}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('lifecycles.edit.backToList')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleChange = (updates: Partial<LifecycleDefinition>) => {
    setDefinition(updates)
    setHasChanges(true)
  }

  const handleLifecycleTypeChange = (newType: LifecycleType) => {
    setLifecycleType(newType)
    if (newType === 'Driven' && definition.revisionScheme?.type === 'none') {
      setDefinition({ ...definition, revisionScheme: { type: 'alpha' } })
    }
    setHasChanges(true)
  }

  const handleDriversChange = (newDrivers: Array<string>) => {
    setDrivers(newDrivers)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!definition.name?.trim()) {
      handleError(new Error(t('lifecycles.form.nameRequired')), {
        title: t('lifecycles.form.validationTitle'),
      })
      return
    }

    setIsSubmitting(true)
    try {
      await apiFetch(`/api/v1/lifecycles/${definition.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...definition,
          lifecycleType,
          drivers: lifecycleType === 'Driven' ? drivers : [],
          // For Driven lifecycles, clear transitions (states only)
          transitions: lifecycleType === 'Driven' ? [] : definition.transitions,
        }),
      })

      setHasChanges(false)
      showSuccess(t('lifecycles.edit.savedTitle'), t('lifecycles.edit.savedDescription'))
    } catch (error) {
      handleError(error, { title: t('lifecycles.edit.updateFailedTitle') })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getLifecycleTypeBadge = () => {
    switch (lifecycleType) {
      case 'Driving':
        return (
          <Badge variant="outline" className="bg-cyan-50 dark:bg-cyan-950">
            {t('lifecycles.edit.typeDriving')}
          </Badge>
        )
      case 'Driven':
        return (
          <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950">
            {t('lifecycles.edit.typeDriven')}
          </Badge>
        )
      default:
        return (
          <Badge variant="outline">{t('lifecycles.edit.typeFree')}</Badge>
        )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="border-b bg-white dark:bg-slate-950 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: '/lifecycles' })}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                    {definition.name}
                  </h1>
                  {getLifecycleTypeBadge()}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('lifecycles.edit.stateCount', {
                    states: definition.states?.length || 0,
                    transitions: definition.transitions?.length || 0,
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  {t('lifecycles.edit.unsavedChanges')}
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={isSubmitting || !hasChanges}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? tc('actions.saving') : tc('actions.save')}
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Settings */}
          <div className="w-96 border-r bg-white dark:bg-slate-950 overflow-y-auto p-4 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {t('lifecycles.form.lifecycleType')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LifecycleTypeSelector
                  value={lifecycleType}
                  onChange={handleLifecycleTypeChange}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {t('lifecycles.form.basicInformation')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">
                    {tc('fields.name')} *
                  </Label>
                  <Input
                    id="name"
                    value={definition.name}
                    onChange={(e) =>
                      handleChange({ ...definition, name: e.target.value })
                    }
                    placeholder={t('lifecycles.form.namePlaceholder')}
                    className="h-8 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">{tc('fields.mode')}</Label>
                  <Select
                    value={definition.workflowType}
                    onValueChange={(value: WorkflowType) =>
                      handleChange({ ...definition, workflowType: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="strict">
                        {t('lifecycles.form.modeStrict')}
                      </SelectItem>
                      <SelectItem value="flexible">
                        {t('lifecycles.form.modeFlexible')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs">
                    {tc('fields.description')}
                  </Label>
                  <textarea
                    id="description"
                    value={definition.description || ''}
                    onChange={(e) =>
                      handleChange({
                        ...definition,
                        description: e.target.value,
                      })
                    }
                    className="w-full h-20 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 resize-none"
                    placeholder={t('lifecycles.form.descriptionPlaceholder')}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={definition.isActive ?? true}
                    onChange={(e) =>
                      handleChange({
                        ...definition,
                        isActive: e.target.checked,
                      })
                    }
                    className="rounded"
                  />
                  <Label htmlFor="isActive" className="text-sm">
                    {t('lifecycles.table.active')}
                  </Label>
                </div>
              </CardContent>
            </Card>

            {lifecycleType !== 'Driving' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    {t('lifecycles.form.revisionScheme')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <RevisionSchemeSelector
                    value={definition.revisionScheme}
                    onChange={(revisionScheme) =>
                      handleChange({ ...definition, revisionScheme })
                    }
                    label={t('lifecycles.form.defaultScheme')}
                    allowNone={lifecycleType !== 'Driven'}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('lifecycles.form.revisionSchemeHelp')}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Driver Selector for Driven lifecycles */}
            {lifecycleType === 'Driven' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    {t('lifecycles.form.ecoDrivers')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DriverSelector
                    selectedDriverIds={drivers}
                    onChange={handleDriversChange}
                  />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {t('lifecycles.form.statistics')}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    {t('lifecycles.edit.statisticsStates')}
                  </span>
                  <span className="font-medium">
                    {definition.states?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    {t('lifecycles.form.transitions')}
                  </span>
                  <span className="font-medium">
                    {definition.transitions?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    {t('lifecycles.form.initialState')}
                  </span>
                  <span className="font-medium">
                    {definition.states?.find((s) => s.isInitial)?.name ||
                      t('lifecycles.form.none')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">
                    {t('lifecycles.form.finalStates')}
                  </span>
                  <span className="font-medium">
                    {definition.states?.filter((s) => s.isFinal).length || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Workflow Builder */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {lifecycleType !== 'Driving' && (
              <div className="p-4 border-b bg-white dark:bg-slate-950">
                <h2 className="text-lg font-semibold">
                  {t('lifecycles.form.statesTitle')}
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {lifecycleType === 'Driven'
                    ? t('lifecycles.form.statesHelpDriven')
                    : t('lifecycles.form.statesHelpFree')}
                </p>
              </div>
            )}
            <div className="flex-1">
              <LifecycleBuilder
                definition={definition}
                kind={lifecycleType === 'Driving' ? 'workflow' : 'lifecycle'}

                onChange={handleChange}
                disableTransitions={lifecycleType !== 'Driving'}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

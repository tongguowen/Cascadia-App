// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Save } from 'lucide-react'
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

export const Route = createFileRoute('/lifecycles/new')({
  component: NewLifecyclePage,
})

function NewLifecyclePage() {
  const navigate = useNavigate()
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const { handleError, showSuccess } = useErrorHandler()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [lifecycleType, setLifecycleType] = useState<LifecycleType>('Free')
  const [drivers, setDrivers] = useState<Array<string>>([])

  const [definition, setDefinition] = useState<Partial<LifecycleDefinition>>(
    () => ({
      name: '',
      workflowType: 'strict',
      description: '',
      states: [
        {
          id: 'Draft',
          name: 'Draft',
          color: 'gray',
          isInitial: true,
          isFinal: false,
          description: t('lifecycles.form.defaultStates.draftDescription'),
        },
        {
          id: 'Released',
          name: 'Released',
          color: 'green',
          isInitial: false,
          isFinal: false,
          description: t('lifecycles.form.defaultStates.releasedDescription'),
        },
        {
          id: 'Obsolete',
          name: 'Obsolete',
          color: 'red',
          isInitial: false,
          isFinal: true,
          description: t('lifecycles.form.defaultStates.obsoleteDescription'),
        },
      ],
      transitions: [],
      isActive: true,
    }),
  )

  const handleChange = (updates: Partial<LifecycleDefinition>) => {
    setDefinition(updates)
  }

  const handleLifecycleTypeChange = (newType: LifecycleType) => {
    setLifecycleType(newType)
    if (newType === 'Driven') {
      setDefinition((current) =>
        current.revisionScheme?.type === 'none'
          ? { ...current, revisionScheme: { type: 'alpha' } }
          : current,
      )
    }
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
      const result = await apiFetch<{
        data: { workflow: LifecycleDefinition }
      }>('/api/v1/lifecycles', {
        method: 'POST',
        body: JSON.stringify({
          ...definition,
          lifecycleType,
          drivers: lifecycleType === 'Driven' ? drivers : [],
          // For Driven lifecycles, clear transitions (states only)
          transitions: lifecycleType === 'Driven' ? [] : definition.transitions,
        }),
      })

      showSuccess(
        t('lifecycles.form.createdTitle'),
        t('lifecycles.form.createdDescription'),
      )
      navigate({
        to: '/lifecycles/$id',
        params: { id: result.data.workflow.id },
      })
    } catch (error) {
      handleError(error, { title: t('lifecycles.form.createFailedTitle') })
    } finally {
      setIsSubmitting(false)
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
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {t('lifecycles.form.createTitle')}
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {t('lifecycles.form.createSubtitle')}
                </p>
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSubmitting}>
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting
                ? tc('actions.saving')
                : t('lifecycles.form.saveLifecycle')}
            </Button>
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
                      setDefinition((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
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
                      setDefinition((prev) => ({
                        ...prev,
                        workflowType: value,
                      }))
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
                      setDefinition((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
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
                      setDefinition((prev) => ({
                        ...prev,
                        isActive: e.target.checked,
                      }))
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
                      setDefinition((current) => ({
                        ...current,
                        revisionScheme,
                      }))
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
                    onChange={setDrivers}
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
                    {t('lifecycles.table.states')}
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

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  {t('lifecycles.form.aboutLifecycleTypes')}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 dark:text-slate-400 space-y-2">
                {lifecycleType === 'Free' && (
                  <>
                    <p>
                      <strong>{t('lifecycles.form.freeAboutLead')}:</strong>{' '}
                      {t('lifecycles.form.freeAboutText')}
                    </p>
                    <p>{t('lifecycles.form.freeUseFor')}</p>
                  </>
                )}
                {lifecycleType === 'Driven' && (
                  <>
                    <p>
                      <strong>{t('lifecycles.form.drivenAboutLead')}:</strong>{' '}
                      {t('lifecycles.form.drivenAboutText')}
                    </p>
                    <p>{t('lifecycles.form.drivenUseFor')}</p>
                    <p>
                      <strong>{t('lifecycles.form.drivenNoteLead')}:</strong>{' '}
                      {t('lifecycles.form.drivenNoteText')}
                    </p>
                  </>
                )}
                {lifecycleType === 'Driving' && (
                  <>
                    <p>
                      <strong>{t('lifecycles.form.drivingAboutLead')}:</strong>{' '}
                      {t('lifecycles.form.drivingAboutText')}
                    </p>
                    <p>{t('lifecycles.form.drivingUseFor')}</p>
                  </>
                )}
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

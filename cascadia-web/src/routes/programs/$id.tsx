// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  ArrowLeft,
  Box,
  Edit,
  GitBranch,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import type {
  CreateProgramInput,
  Program,
} from '@cascadia/commons/types/program'
import type { Design } from '@cascadia/commons/types/design'
import { PageContainer } from '@/components/layout'
import { ProgramHistoryGraphView } from '@/components/programs/ProgramHistoryGraphView'
import { ProgramModelViewer } from '@/components/programs/ProgramModelViewer'
import { ProgramTeamCard } from '@/components/programs/ProgramTeamCard'
import { ProgramRequirementsCard } from '@/components/programs/ProgramRequirementsCard'
import { ScopeGraphView } from '@/components/graph/ScopeGraphView'
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
} from '@/components/ui'
import {
  ViewEditBadge,
  ViewEditText,
  ViewEditTextarea,
} from '@/components/ui/view-edit-field'
import {
  AttributesEditor,
  formatAttributeValue,
} from '@/components/items/AttributesEditor'
import { useAlertDialog } from '@/hooks/useAlertDialog'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import {
  designListQuery,
  programDetailQuery,
  useInvalidateResources,
} from '@/query'
import { apiFetch } from '@/api/client'

export const Route = createFileRoute('/programs/$id')({
  component: ProgramDetailPage,
  loader: async ({ context: { queryClient }, params }) => {
    await Promise.all([
      queryClient.ensureQueryData(programDetailQuery(params.id)),
      queryClient.ensureQueryData(designListQuery(params.id)),
    ])
  },
})

function programStatusOptions(tp: TFunction<'pages'>) {
  return [
    { value: 'Active', label: tp('programs.form.statusActive') },
    { value: 'On Hold', label: tp('programs.form.statusOnHold') },
    { value: 'Completed', label: tp('programs.form.statusCompleted') },
    { value: 'Cancelled', label: tp('programs.form.statusCancelled') },
  ]
}

function programStatusLabel(status: string, tp: TFunction<'pages'>): string {
  const map: Record<string, string> = {
    Active: tp('programs.form.statusActive'),
    'On Hold': tp('programs.form.statusOnHold'),
    Completed: tp('programs.form.statusCompleted'),
    Cancelled: tp('programs.form.statusCancelled'),
  }
  return map[status] ?? status
}

function translateDesignType(designType: string, tp: TFunction<'pages'>): string {
  const key = `designs.types.${designType}` as const
  const translated = tp(key)
  return translated === key ? designType : translated
}

function statusVariant(
  value: string,
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' {
  const map: Record<
    string,
    'success' | 'warning' | 'secondary' | 'destructive'
  > = {
    Active: 'success',
    'On Hold': 'warning',
    Completed: 'secondary',
    Cancelled: 'destructive',
  }
  return map[value] ?? 'default'
}

function toDateInputValue(value: string | null | undefined): string {
  if (!value) return ''
  return new Date(value).toISOString().slice(0, 10)
}

function ProgramDetailPage() {
  const { id } = Route.useParams()
  const { data: program } = useQuery(programDetailQuery(id))
  const { data: designs = [] } = useQuery(designListQuery(id))

  if (!program) return null

  return <ProgramDetail program={program} designs={designs} />
}

function ProgramDetail({
  program,
  designs,
}: {
  program: Program
  designs: Array<Design>
}) {
  const navigate = useNavigate()
  const { confirm } = useAlertDialog()
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')
  const statusOptions = programStatusOptions(tp)

  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editProgram, setEditProgram] = useState<Program>(program)
  const [attributes, setAttributes] = useState<Record<string, unknown>>(
    program.attributes ?? {},
  )

  const updateField = <TKey extends keyof Program>(
    field: TKey,
    value: Program[TKey],
  ) => {
    setEditProgram((prev) => ({ ...prev, [field]: value }))
  }

  const handleEdit = () => {
    setEditProgram(program)
    setAttributes(program.attributes ?? {})
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setEditProgram(program)
    setAttributes(program.attributes ?? {})
    setIsEditing(false)
  }

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      const data: CreateProgramInput = {
        code: editProgram.code,
        name: editProgram.name,
        description: editProgram.description || '',
        // The DB column is a plain varchar (typed `string`), but the Status
        // control only ever sets one of the four enum values.
        status: editProgram.status as CreateProgramInput['status'],
        customer: editProgram.customer || '',
        contractNumber: editProgram.contractNumber || '',
        // `null`, not `''`: an emptied `<input type="date">` reads back as
        // the empty string, and a program with no dates set starts there.
        // Both spellings mean "no date" and the server normalizes either
        // (see `clearableDate`), but only one of them says so.
        startDate: editProgram.startDate || null,
        targetEndDate: editProgram.targetEndDate || null,
        attributes,
      }
      await apiFetch(`/api/v1/programs/${program.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })

      setIsEditing(false)
      showSuccess(
        tp('programs.detail.updatedTitle'),
        tp('programs.detail.updatedDescription', { code: data.code }),
      )
      await invalidate('programs')
    } catch (error) {
      handleError(error, { title: tp('programs.detail.updateFailed') })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = () => {
    confirm({
      title: tp('programs.deleteTitle'),
      description: tp('programs.detail.deleteDescription', {
        code: program.code,
      }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/programs/${program.id}`, {
            method: 'DELETE',
          })

          showSuccess(
            tp('programs.deletedTitle'),
            tp('programs.detail.deletedDescription', { code: program.code }),
          )
          await invalidate('programs')
          navigate({ to: '/programs' })
        } catch (error) {
          handleError(error, { title: tp('programs.deleteFailed') })
        }
      },
    })
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/programs">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
                {program.code}
              </h1>
              <Badge
                className="text-base"
                variant={statusVariant(program.status)}
              >
                {programStatusLabel(program.status, tp)}
              </Badge>
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {program.name}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="h-4 w-4 mr-2" />
                {tc('actions.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={isSubmitting}>
                <Save className="h-4 w-4 mr-2" />
                {isSubmitting ? tc('actions.saving') : tc('actions.save')}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleEdit}>
                <Edit className="h-4 w-4 mr-2" />
                {tc('actions.edit')}
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                {tc('actions.delete')}
              </Button>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{tc('tabs.overview')}</TabsTrigger>
          <TabsTrigger value="team">{tc('tabs.team')}</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <ProgramTeamCard program={program} />
        </TabsContent>

        <TabsContent value="overview">
          {/* Main Layout with Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Left 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>{tc('sections.overview')}</CardTitle>
                  <CardDescription>
                    {tp('programs.detail.overviewDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ViewEditText
                      label={tp('programs.form.code')}
                      value={isEditing ? editProgram.code : program.code}
                      onChange={(v) => updateField('code', v)}
                      isEditing={isEditing}
                      required
                    />

                    <ViewEditText
                      label={tc('fields.name')}
                      value={isEditing ? editProgram.name : program.name}
                      onChange={(v) => updateField('name', v)}
                      isEditing={isEditing}
                      required
                    />

                    <ViewEditBadge
                      label={tc('fields.status')}
                      value={isEditing ? editProgram.status : program.status}
                      onChange={(v) => updateField('status', v)}
                      isEditing={isEditing}
                      options={statusOptions}
                      variant={statusVariant}
                    />

                    <ViewEditText
                      label={tc('fields.customer')}
                      value={
                        isEditing ? editProgram.customer : program.customer
                      }
                      onChange={(v) => updateField('customer', v)}
                      isEditing={isEditing}
                    />

                    <ViewEditText
                      label={tc('fields.contractNumber')}
                      value={
                        isEditing
                          ? editProgram.contractNumber
                          : program.contractNumber
                      }
                      onChange={(v) => updateField('contractNumber', v)}
                      isEditing={isEditing}
                    />

                    <ViewEditText
                      label={tc('fields.startDate')}
                      value={
                        isEditing
                          ? toDateInputValue(editProgram.startDate)
                          : program.startDate
                            ? new Date(program.startDate).toLocaleDateString()
                            : null
                      }
                      onChange={(v) => updateField('startDate', v)}
                      isEditing={isEditing}
                      inputType="date"
                    />

                    <ViewEditText
                      label={tc('fields.targetEndDate')}
                      value={
                        isEditing
                          ? toDateInputValue(editProgram.targetEndDate)
                          : program.targetEndDate
                            ? new Date(
                                program.targetEndDate,
                              ).toLocaleDateString()
                            : null
                      }
                      onChange={(v) => updateField('targetEndDate', v)}
                      isEditing={isEditing}
                      inputType="date"
                    />

                    <ViewEditTextarea
                      label={tc('fields.description')}
                      value={
                        isEditing
                          ? editProgram.description
                          : program.description
                      }
                      onChange={(v) => updateField('description', v)}
                      isEditing={isEditing}
                      className="md:col-span-2"
                    />
                  </dl>
                </CardContent>
              </Card>

              {/* 3D Model — pick a design, then a top-level part of it */}
              <ProgramRequirementsCard programId={program.id} />

              <ProgramModelViewer designs={designs} />

              {/* Program Graph */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-slate-400" />
                    <CardTitle>{tp('programs.detail.programGraphTitle')}</CardTitle>
                  </div>
                  <CardDescription>
                    {tp('programs.detail.programGraphDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScopeGraphView
                    rootType="program"
                    rootId={program.id}
                    inlineHeight="500px"
                  />
                </CardContent>
              </Card>

              {/* Change History */}
              {designs.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-slate-400" />
                      <CardTitle>
                        {tp('programs.detail.changeHistoryTitle')}
                      </CardTitle>
                    </div>
                    <CardDescription>
                      {tp('programs.detail.changeHistoryDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ProgramHistoryGraphView programId={program.id} />
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar - Right column */}
            <div className="space-y-6">
              {/* Designs */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{tp('programs.detail.designsTitle')}</CardTitle>
                    <CardDescription>
                      {tp('programs.detail.designsCount', {
                        count: designs.length,
                      })}
                    </CardDescription>
                  </div>
                  <Link to="/designs" search={{ programId: program.id }}>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      {tp('programs.detail.addDesign')}
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {designs.length > 0 ? (
                    <div className="space-y-3">
                      {designs.map((design) => (
                        <Link
                          key={design.id}
                          to="/designs/$id"
                          params={{ id: design.id }}
                          className="flex items-center justify-between p-4 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Box className="h-5 w-5 text-slate-400" />
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {design.code}
                              </p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">
                                {design.name}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              design.designType === 'Library'
                                ? 'secondary'
                                : 'default'
                            }
                          >
                            {translateDesignType(design.designType, tp)}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      {tp('programs.detail.designsEmpty')}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Custom Attributes */}
              {isEditing ? (
                <Card>
                  <AttributesEditor
                    value={attributes}
                    onChange={setAttributes}
                    className="border-0 rounded-none"
                  />
                </Card>
              ) : (
                <Card>
                  <Collapsible
                    defaultOpen={
                      Object.keys(program.attributes || {}).length > 0
                    }
                  >
                    <CardHeader className="pb-3">
                      <CollapsibleTrigger className="flex items-center justify-between w-full hover:opacity-70">
                        <CardTitle>{tc('sections.customAttributes')}</CardTitle>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {Object.keys(program.attributes || {}).length > 0 ? (
                          <dl className="space-y-3">
                            {Object.entries(program.attributes || {}).map(
                              ([key, value]) => (
                                <div key={key} className="space-y-1">
                                  <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                    {key}
                                  </dt>
                                  <dd className="text-slate-900 dark:text-white">
                                    {formatAttributeValue(value) || '-'}
                                  </dd>
                                </div>
                              ),
                            )}
                          </dl>
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {tp('programs.detail.noCustomAttributes')}
                          </p>
                        )}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )}

              {/* Metadata */}
              <Collapsible defaultOpen={false}>
                <Card>
                  <CardHeader>
                    <CollapsibleTrigger className="hover:opacity-70">
                      <CardTitle>{tc('sections.metadata')}</CardTitle>
                    </CollapsibleTrigger>
                  </CardHeader>
                  <CollapsibleContent>
                    <CardContent className="space-y-3">
                      <div className="space-y-1">
                        <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          {tc('columns.created')}
                        </dt>
                        <dd className="text-slate-900 dark:text-white">
                          {new Date(program.createdAt).toLocaleDateString()}
                        </dd>
                      </div>

                      <div className="space-y-1">
                        <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          {tp('programs.detail.lastModified')}
                        </dt>
                        <dd className="text-slate-900 dark:text-white">
                          {new Date(program.updatedAt).toLocaleDateString()}
                        </dd>
                      </div>

                      <div className="space-y-1">
                        <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                          {tp('programs.detail.programId')}
                        </dt>
                        <dd className="text-sm font-mono text-slate-600 dark:text-slate-400">
                          {program.id}
                        </dd>
                      </div>

                      {program.userRole && (
                        <div className="space-y-1">
                          <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {tp('programs.detail.yourRole')}
                          </dt>
                          <dd>
                            <Badge variant="outline">{program.userRole}</Badge>
                          </dd>
                        </div>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

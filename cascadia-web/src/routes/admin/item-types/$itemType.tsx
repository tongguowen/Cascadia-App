// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  Save,
} from 'lucide-react'
import { resolveLifecycleType } from '@cascadia/commons/lifecycles/normalize'
import type { LifecyclesByChangeType } from '@/query'
import { PageContainer } from '@/components/layout'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { getNumberingInfo } from '@/items/numbering/format'
import {
  itemTypeConfigQuery,
  lifecycleListQuery,
  useInvalidateResources,
} from '@/query'
import { apiFetch } from '@/api/client'

export const Route = createFileRoute('/admin/item-types/$itemType')({
  component: ItemTypeConfigEditPage,
  loader: async ({ context: { queryClient }, params }) => {
    await Promise.all([
      queryClient.ensureQueryData(itemTypeConfigQuery(params.itemType)),
      queryClient.ensureQueryData(lifecycleListQuery()),
    ])
  },
})

const CHANGE_ORDER_TYPES = ['ECO', 'ECN', 'Deviation', 'MCO', 'XCO'] as const

function ItemTypeConfigEditPage() {
  const { itemType } = Route.useParams()
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const td = (key: string, options?: Record<string, unknown>) =>
    t(`admin.itemTypes.detail.${key}`, options)
  const invalidate = useInvalidateResources()

  // Read-only view of the code-defined numbering scheme for this item type.
  const numbering = getNumberingInfo(itemType)

  const {
    data: detail,
    isPending,
    error: loadError,
  } = useQuery(itemTypeConfigQuery(itemType))
  const { data: definitions = [] } = useQuery(lifecycleListQuery())

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state. The lifecycle assignment — and, for ChangeOrder, the
  // definition each change type runs — is the whole of what an administrator
  // can change here; everything else about an item type is code.
  const [lifecycleDefinitionId, setLifecycleDefinitionId] = useState<
    string | null
  >(null)
  const [lifecyclesByChangeType, setLifecyclesByChangeType] =
    useState<LifecyclesByChangeType>({})

  // Item lifecycles are the non-Driving kinds (Driven and Free);
  // Driving definitions are the change-order workflows
  const availableLifecycles = useMemo(
    () => definitions.filter((w) => resolveLifecycleType(w) !== 'Driving'),
    [definitions],
  )
  const availableWorkflows = useMemo(
    () => definitions.filter((w) => resolveLifecycleType(w) === 'Driving'),
    [definitions],
  )

  const runtimeConfigVersion = detail?.runtimeConfig?.version ?? 0
  const codeConfig = detail?.codeConfig ?? null

  // The stored values are seeded into the form once per saved revision, so an
  // ordinary background refetch never overwrites edits in progress while a
  // save or a reset-to-code still re-seeds.
  const [seededRevision, setSeededRevision] = useState<string | null>(null)
  const revision = detail ? `${itemType}:${runtimeConfigVersion}` : null

  useEffect(() => {
    if (!detail || revision === null || revision === seededRevision) return

    const overrides = detail.runtimeConfig?.config
    const base = overrides ?? detail.mergedConfig ?? detail.codeConfig

    setLifecycleDefinitionId(
      base.lifecycleDefinitionId ??
        detail.codeConfig.lifecycleDefinitionId ??
        null,
    )
    setLifecyclesByChangeType(overrides?.lifecyclesByChangeType ?? {})
    setSeededRevision(revision)
  }, [detail, revision, seededRevision])

  const selectedLifecycle =
    availableLifecycles.find((l) => l.id === lifecycleDefinitionId) ?? null

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const config: Record<string, unknown> = {
        lifecycleDefinitionId: lifecycleDefinitionId || null,
      }

      // Include lifecyclesByChangeType for ChangeOrder
      if (itemType === 'ChangeOrder') {
        config.lifecyclesByChangeType = lifecyclesByChangeType
      }

      await apiFetch('/api/v1/admin/item-type-configs', {
        method: 'POST',
        body: JSON.stringify({ itemType, config }),
      })

      setSuccessMessage(td('saveSuccess'))
      await invalidate('admin')
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : td('genericError'))
    } finally {
      setSaving(false)
    }
  }

  const getStateColorClass = (color?: string) => {
    const colorMap: Record<string, string> = {
      gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
      blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      green:
        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      yellow:
        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      red: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    }
    return colorMap[color || 'gray'] || colorMap.gray
  }

  if (isPending || seededRevision === null) {
    return (
      <PageContainer maxWidth="wide">
        <p className="text-slate-600 dark:text-slate-400">
          {loadError ? loadError.message : td('loading')}
        </p>
      </PageContainer>
    )
  }

  const errorMessage = error ?? loadError?.message ?? null

  return (
    <PageContainer maxWidth="wide">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin/item-types">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {tc('actions.back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {td('configureTitle', {
                label: codeConfig?.label ?? itemType,
              })}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {td('typePrefix')}{' '}
              <code className="text-sm">{itemType}</code>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? tc('actions.saving') : tc('actions.saveChanges')}
          </Button>
        </div>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {errorMessage}
          </div>
        </div>
      )}

      {/* Success message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {successMessage}
          </div>
        </div>
      )}

      {/* What is configurable here */}
      <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-2">
            <Badge variant="secondary">v{runtimeConfigVersion}</Badge>
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {td('runtimeBannerBeforeRoles')}{' '}
              <Link to="/admin/roles" className="underline">
                {t('admin.roles.title')}
              </Link>
              {td('runtimeBannerAfterRoles')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Numbering Scheme (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle>{td('numberingTitle')}</CardTitle>
          <CardDescription>{td('numberingDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {numbering ? (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {td('example')}
                </span>
                <code className="text-base font-mono bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded">
                  {numbering.example ?? '—'}
                </code>
                <Badge variant="secondary">
                  {numbering.allowManualEntry
                    ? td('manualEntryAllowed')
                    : td('alwaysAutoGenerated')}
                </Badge>
                {numbering.familyVariants.enabled && (
                  <Badge variant="secondary">
                    {td('familyVariants', {
                      example: numbering.familyVariants.example,
                    })}
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <Label>{td('pattern')}</Label>
                <ol className="space-y-1.5">
                  {numbering.segments.map((seg, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs dark:bg-slate-700">
                        {i + 1}
                      </span>
                      <span>{seg.description}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-slate-500">
                  {td('segmentsJoined', { separator: numbering.separator })}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {td('noNumberingScheme')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lifecycle Assignment - not shown for ChangeOrder as they use workflows */}
      {itemType !== 'ChangeOrder' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{td('lifecycleAssignmentTitle')}</CardTitle>
                <CardDescription>
                  {td('lifecycleAssignmentDescription')}
                </CardDescription>
              </div>
              {selectedLifecycle && (
                <Link
                  to="/lifecycles/$id"
                  params={{ id: selectedLifecycle.id }}
                >
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {td('editLifecycle')}
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{td('lifecycle')}</Label>
              <Select
                value={lifecycleDefinitionId || '__none__'}
                onValueChange={(value) =>
                  setLifecycleDefinitionId(value === '__none__' ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={td('selectLifecycle')} />
                </SelectTrigger>
                <SelectContent>
                  {availableLifecycles.map((lifecycle) => (
                    <SelectItem key={lifecycle.id} value={lifecycle.id}>
                      {lifecycle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {codeConfig?.lifecycleDefinitionId && (
                <p className="text-xs text-slate-500">
                  {td('codeDefault')}{' '}
                  {availableLifecycles.find(
                    (l) => l.id === codeConfig.lifecycleDefinitionId,
                  )?.name || codeConfig.lifecycleDefinitionId}
                </p>
              )}
            </div>

            {/* Show selected lifecycle states (read-only) */}
            {selectedLifecycle && (
              <div className="space-y-2">
                <Label className="text-slate-600 dark:text-slate-400">
                  {td('statesIn', { name: selectedLifecycle.name })}
                </Label>
                <div className="flex flex-wrap gap-2">
                  {selectedLifecycle.states.map((state) => (
                    <Badge
                      key={state.id}
                      className={`${getStateColorClass(state.color)} text-xs`}
                    >
                      {state.name}
                      {state.isInitial && ` ${td('stateInitial')}`}
                      {state.isFinal && ` ${td('stateFinal')}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {availableLifecycles.length === 0 && (
              <div className="p-3 bg-slate-100 border border-slate-300 rounded text-slate-600 text-sm dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400">
                {td('noLifecyclesAvailable')}{' '}
                <Link
                  to="/lifecycles/new"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {td('createLifecycle')}
                </Link>{' '}
                {td('assignLifecycleSuffix')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Workflow Assignment by Change Type - ChangeOrder only */}
      {itemType === 'ChangeOrder' && (
        <Card>
          <CardHeader>
            <CardTitle>{td('workflowsByChangeTypeTitle')}</CardTitle>
            <CardDescription>
              {td('workflowsByChangeTypeDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availableWorkflows.length === 0 ? (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400">
                <AlertCircle className="w-4 h-4 inline mr-2" />
                {td('noWorkflowsAvailable')}{' '}
                <Link
                  to="/workflows/new"
                  className="text-yellow-900 underline dark:text-yellow-300"
                >
                  {td('createWorkflow')}
                </Link>{' '}
                {td('assignWorkflowSuffix')}
              </div>
            ) : (
              <>
                {CHANGE_ORDER_TYPES.map((changeType) => (
                  <div key={changeType} className="flex items-center gap-4">
                    <Label className="w-24 font-medium">{changeType}</Label>
                    <Select
                      value={lifecyclesByChangeType[changeType] || undefined}
                      onValueChange={(value) =>
                        setLifecyclesByChangeType((prev) => ({
                          ...prev,
                          [changeType]: value || undefined,
                        }))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={td('selectWorkflow')} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableWorkflows.map((workflow) => (
                          <SelectItem key={workflow.id} value={workflow.id}>
                            {workflow.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {lifecyclesByChangeType[changeType] && (
                      <Link
                        to="/workflows/$id"
                        params={{ id: lifecyclesByChangeType[changeType] }}
                      >
                        <Button variant="outline" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
                {/* Warning if not all types are assigned */}
                {CHANGE_ORDER_TYPES.some(
                  (type) => !lifecyclesByChangeType[type],
                ) && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-800 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 inline mr-2" />
                    {td('allChangeTypesNeedWorkflow')}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Code Defaults Reference */}
      {codeConfig && (
        <Card className="opacity-70">
          <CardHeader>
            <CardTitle>{td('codeDefaultsTitle')}</CardTitle>
            <CardDescription>{td('codeDefaultsDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-4 rounded overflow-auto max-h-64">
              {JSON.stringify(codeConfig, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}

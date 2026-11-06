// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Box, Check, Edit, Save, Trash2, X } from 'lucide-react'
import { changeOrderTypeSchema } from '@cascadia/commons/items/types/change-order'
import type { ChangeOrder } from '@cascadia/commons/items/types/change-order'
import { PageContainer } from '@/components/layout'
import {
  AttributesEditor,
  formatAttributeValue,
} from '@/components/items/AttributesEditor'
import { ItemHistoryTab } from '@/components/items/ItemHistoryTab'
import { StateBadge } from '@/components/items/StateBadge'
import { ChangeOrderHistoryGraphView as ChangeOrderHistoryGraphView } from '@/components/change-orders/ChangeOrderHistoryGraphView'
import { useVersionContext } from '@/hooks/useVersionContext'
import { useLifecyclePhases } from '@/hooks/useLifecyclePhases'
import { FileList, FileUploadZone } from '@/components/vault'
import { GraphNavigator } from '@/components/items/GraphNavigator'
import { ChangeOrderAffectedItemsPanel } from '@/components/change-orders/ChangeOrderAffectedItemsPanel'
import { ImpactAssessmentPanel } from '@/components/change-orders/ImpactAssessmentPanel'
import { ChangeOrderSummaryDashboard as ChangeOrderSummaryDashboard } from '@/components/change-orders/ChangeOrderSummaryDashboard'
import { ConflictsList } from '@/components/change-orders/ConflictsList'
import { ApprovalStatusPanel } from '@/components/change-orders/ApprovalStatusPanel'
import { TransitionActions } from '@/components/lifecycles/TransitionActions'
import { LifecycleInstanceEditor } from '@/components/change-orders/LifecycleInstanceEditor'
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
  Input,
  Label,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  ViewEditBadge,
  ViewEditSelect,
  ViewEditStatic,
  ViewEditText,
  ViewEditTextarea,
} from '@/components/ui'
import { useAlertDialog } from '@/hooks/useAlertDialog'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import {
  changeOrderDesignsQuery,
  changeOrderLifecycleStructureQuery,
  useInvalidateResources,
} from '@/query'
import { designDetailQuery, designListQuery } from '@/query/options/designs'
import { itemAtContextQuery } from '@/query/options/items'

interface Design {
  id: string
  code: string
  name: string
  programId: string
  programName?: string
  designType: 'Engineering' | 'Library'
  phase: string
}

const priorityVariant = (priority: string) => {
  const variants: Record<
    string,
    'default' | 'secondary' | 'success' | 'warning' | 'destructive'
  > = {
    low: 'secondary',
    medium: 'default',
    high: 'warning',
    critical: 'destructive',
  }
  return variants[priority] || 'default'
}

const riskVariant = (risk: string) => {
  const variants: Record<
    string,
    'default' | 'secondary' | 'success' | 'warning' | 'destructive'
  > = {
    low: 'success',
    medium: 'default',
    high: 'warning',
    critical: 'destructive',
  }
  return variants[risk] || 'default'
}

const createEmptyChangeOrder = (): ChangeOrder => ({
  id: undefined,
  masterId: undefined,
  itemType: 'ChangeOrder',
  itemNumber: '',
  name: '',
  description: '',
  state: '',
  isCurrent: true,
  changeType: 'ECO',
  priority: 'medium',
  reasonForChange: '',
  impactDescription: '',
  riskLevel: undefined,
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
export const CHANGE_ORDER_DETAIL_TABS = [
  'overview',
  'affected-items',
  'conflicts',
  'impact',
  'files',
  'approvals',
  'workflow',
  'history',
] as const
export type ChangeOrderDetailTab = (typeof CHANGE_ORDER_DETAIL_TABS)[number]

interface ChangeOrderDetailProps {
  changeOrder?: ChangeOrder
  onSave: (changeOrder: ChangeOrder, designIds?: Array<string>) => Promise<void>
  onDelete?: () => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  activeTab?: ChangeOrderDetailTab
  onTabChange?: (tab: ChangeOrderDetailTab) => void
}

export function ChangeOrderDetail({
  changeOrder: initialChangeOrder,
  onSave,
  onDelete,
  onCancel,
  isSubmitting = false,
  activeTab = 'overview',
  onTabChange,
}: ChangeOrderDetailProps) {
  const invalidate = useInvalidateResources()
  const { confirm } = useAlertDialog()
  const { handleError, showSuccess } = useErrorHandler()
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')

  const changeTypeOptions = useMemo(
    () =>
      changeOrderTypeSchema.options.map((value) => ({
        value,
        label: tc(`enum.changeType.${value}`),
      })),
    [tc],
  )

  const priorityOptions = useMemo(
    () =>
      (['low', 'medium', 'high', 'critical'] as const).map((value) => ({
        value,
        label: tc(`enum.priority.${value}`),
      })),
    [tc],
  )

  const isCreateMode = !initialChangeOrder?.id

  const [changeOrder, setChangeOrder] = useState<ChangeOrder>(
    () => initialChangeOrder || createEmptyChangeOrder(),
  )
  const [isEditing, setIsEditing] = useState(isCreateMode)
  const [attributes, setAttributes] = useState<Record<string, unknown>>(
    initialChangeOrder?.attributes || {},
  )

  const { data: workflowStructure } = useQuery(
    changeOrderLifecycleStructureQuery(
      changeOrder.id ?? '',
      !isCreateMode && !!changeOrder.id,
    ),
  )

  // The branch-backed panels — the summary dashboard and the branch history —
  // belong to any change order that carries branches, not to the ECO type
  // value: an MCO's branches are identical to an ECO's, and gating on the
  // type left its branch history invisible on its own page.
  const { data: designScope } = useQuery({
    ...changeOrderDesignsQuery(changeOrder.id ?? ''),
    enabled: !isCreateMode && Boolean(changeOrder.id),
  })
  const hasBranches = (designScope?.designs ?? []).some(
    (d) => d.branchId !== null,
  )

  // Editable while the workflow has not reached a final state — the same rule
  // the server enforces (`ChangeOrderService.assertEditable`). Gating on the literal
  // state name 'Draft' made a change order uneditable and undeletable through
  // the UI whenever its workflow called the initial state anything else.
  const currentWorkflowState = workflowStructure?.states.find(
    (s) => s.id === workflowStructure.currentState,
  )
  const isEditable =
    !isCreateMode &&
    (workflowStructure === undefined || currentWorkflowState?.isFinal !== true)

  // Deletable only in the initial state, which is the rule the server enforces
  // (`ItemService.requireNoRetainedEvidence`): past it the change order holds
  // votes, workflow history and an affected-item list that a hard delete would
  // cascade away. Read from the ChangeOrder definition rather than the
  // instance so a change order that has no workflow instance yet — freshly
  // created, and the one case the delete exists for — still offers it.
  const { data: changeOrderLifecycle } = useLifecyclePhases('ChangeOrder')
  const isDeletable =
    !isCreateMode &&
    (changeOrderLifecycle?.states ?? []).some(
      (s) => s.isInitial === true && s.id === changeOrder.state,
    )

  const { context, setContext } = useVersionContext(
    isCreateMode ? undefined : changeOrder.designId,
  )

  const isHistoricalView = context.type === 'commit' || context.type === 'tag'

  // Design selection state for create mode
  const [selectedDesigns, setSelectedDesigns] = useState<Array<Design>>([])
  const [designSearchQuery, setDesignSearchQuery] = useState('')
  const { data: availableDesigns = [], isFetching: loadingDesigns } = useQuery({
    ...designListQuery<Design>(),
    enabled: isCreateMode,
  })

  useEffect(() => {
    if (initialChangeOrder) {
      setChangeOrder(initialChangeOrder)
      setAttributes(initialChangeOrder.attributes || {})
    }
  }, [initialChangeOrder])

  // The design's main branch, for the history and structure views.
  const { data: ownDesign } = useQuery({
    ...designDetailQuery(changeOrder.designId ?? ''),
    enabled: !isCreateMode && Boolean(changeOrder.designId),
  })
  const mainBranchId = ownDesign?.defaultBranchId ?? undefined

  // The change order as it stood at the selected version context. Viewing
  // `main` addresses nothing, so the query stays disabled and the item the
  // caller already holds is shown.
  const { data: versionAtContext } = useQuery(
    itemAtContextQuery<ChangeOrder>(
      changeOrder.id ?? '',
      context,
      !isCreateMode && Boolean(changeOrder.designId),
    ),
  )

  const currentChangeOrder = isCreateMode
    ? changeOrder
    : (versionAtContext ?? changeOrder)

  const updateField = (field: keyof ChangeOrder, value: any) => {
    setChangeOrder((prev) => ({ ...prev, [field]: value }))
  }

  const handleEdit = () => {
    setChangeOrder(currentChangeOrder)
    setIsEditing(true)
  }

  const toggleDesignSelection = (design: Design) => {
    setSelectedDesigns((prev) => {
      const isSelected = prev.some((d) => d.id === design.id)
      if (isSelected) {
        return prev.filter((d) => d.id !== design.id)
      } else {
        return [...prev, design]
      }
    })
  }

  // Filter designs based on search query
  const filteredDesigns = designSearchQuery
    ? availableDesigns.filter(
        (design) =>
          design.code.toLowerCase().includes(designSearchQuery.toLowerCase()) ||
          design.name.toLowerCase().includes(designSearchQuery.toLowerCase()),
      )
    : availableDesigns

  // A change order has to affect at least one design — the server refuses
  // otherwise, since a design-less ECO belongs to no program and so would be
  // readable by everyone. Mirrored here so the refusal is visible before
  // submit rather than as an error afterwards.
  const hasRequiredDesigns = !isCreateMode || selectedDesigns.length > 0

  const handleSave = async () => {
    const designIds = isCreateMode
      ? selectedDesigns.map((d) => d.id)
      : undefined
    // Include attributes in the change order being saved
    const changeOrderWithAttributes = {
      ...changeOrder,
      attributes,
    }
    await onSave(changeOrderWithAttributes, designIds)
    if (!isCreateMode) {
      setIsEditing(false)
    }
  }

  const handleCancelEdit = () => {
    if (isCreateMode) {
      onCancel()
    } else {
      setChangeOrder(currentChangeOrder)
      // Reset attributes to current values
      setAttributes(currentChangeOrder.attributes || {})
      setIsEditing(false)
    }
  }

  const handleDelete = () => {
    if (!onDelete || !currentChangeOrder.id) return

    confirm({
      title: tc('confirm.deleteChangeOrder'),
      description: `Are you sure you want to delete ${currentChangeOrder.itemNumber}? This action cannot be undone.`,
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: onDelete,
    })
  }

  // In create mode, only show Overview tab
  const tabs = isCreateMode
    ? [{ value: 'overview', label: tc('tabs.overview') }]
    : [
        { value: 'overview', label: tc('tabs.overview') },
        { value: 'affected-items', label: tc('tabs.affectedItems') },
        { value: 'conflicts', label: tc('tabs.conflicts') },
        { value: 'impact', label: tc('tabs.impact') },
        { value: 'approvals', label: tc('tabs.approvals') },
        // The value is the tab's search-param key and stays; the label
        // matches the sidebar (remediation plan, Decision 8).
        { value: 'workflow', label: tc('tabs.lifecycle') },
        { value: 'history', label: tc('tabs.history') },
      ]

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/change-orders">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
                {isCreateMode
                  ? tp('changeOrders.form.createTitle')
                  : currentChangeOrder.itemNumber || tp('changeOrders.form.newItemFallback')}
              </h1>
              {!isCreateMode && currentChangeOrder.state && (
                <StateBadge
                  itemType="ChangeOrder"
                  state={currentChangeOrder.state}
                  // The instance's own states: a change order runs whichever
                  // definition its change type maps to, and a flexible one
                  // may carry states of its own
                  states={workflowStructure?.states}
                  className="text-base"
                />
              )}
              {!isCreateMode && currentChangeOrder.priority && (
                <Badge
                  className="text-base"
                  variant={priorityVariant(currentChangeOrder.priority)}
                >
                  {tc(`enum.priority.${currentChangeOrder.priority}`)}
                </Badge>
              )}
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {isCreateMode
                ? tp('changeOrders.form.createSubtitle')
                : tp('changeOrders.detail.revisionSubtitle', { revision: currentChangeOrder.revision, name: currentChangeOrder.name || tc('labels.unnamed') })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!isCreateMode && !isEditing && currentChangeOrder.id && (
            <TransitionActions
              itemId={currentChangeOrder.id}
              itemNumber={currentChangeOrder.itemNumber ?? ''}
            />
          )}
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
                <Button
                  onClick={handleSave}
                  disabled={isSubmitting || !hasRequiredDesigns}
                  title={
                    hasRequiredDesigns
                      ? undefined
                      : tp('changeOrders.detail.selectAtLeastOneDesign')
                  }
                  data-testid="change-order-submit"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting
                    ? tc('actions.saving')
                    : isCreateMode
                      ? tp('changeOrders.create')
                      : tc('actions.saveChanges')}
                </Button>
              </>
            ) : (
              <>
                {isEditable && (
                  <>
                    <Button variant="outline" onClick={handleEdit}>
                      <Edit className="h-4 w-4 mr-2" />
                      {tc('actions.edit')}
                    </Button>
                    {onDelete && isDeletable && (
                      <Button variant="destructive" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        {tc('actions.delete')}
                      </Button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => onTabChange?.(value as ChangeOrderDetailTab)}
        className="w-full"
      >
        <TabsList className={`grid w-full grid-cols-${tabs.length}`}>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent
          value="overview"
          className="mt-6"
          data-testid="change-order-form"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content - Left 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{tc('sections.overview')}</CardTitle>
                  <CardDescription>
                    {tp('changeOrders.detail.overviewDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isCreateMode ? (
                      <ViewEditStatic
                        label={tc('fields.changeOrderNumber')}
                        value={
                          <span className="text-muted-foreground">
                            {tc('labels.autoGeneratedOnCreation')}
                          </span>
                        }
                      />
                    ) : (
                      <ViewEditText
                        label={tc('fields.itemNumber')}
                        value={currentChangeOrder.itemNumber}
                        onChange={(v) => updateField('itemNumber', v)}
                        isEditing={false}
                        placeholder={tp(
                          'changeOrders.detail.itemNumberPlaceholder',
                        )}
                      />
                    )}
                    <ViewEditSelect
                      label={tc('fields.changeType')}
                      value={
                        isEditing
                          ? changeOrder.changeType
                          : currentChangeOrder.changeType
                      }
                      onChange={(v) => updateField('changeType', v)}
                      isEditing={isEditing}
                      options={changeTypeOptions}
                      required
                    />
                    <ViewEditBadge
                      label={tc('fields.priority')}
                      value={
                        isEditing
                          ? changeOrder.priority
                          : currentChangeOrder.priority
                      }
                      onChange={(v) => updateField('priority', v)}
                      isEditing={isEditing}
                      options={priorityOptions}
                      variant={priorityVariant}
                      placeholder={tc('placeholders.selectGeneric')}
                    />
                    <ViewEditStatic
                      label={tc('columns.riskLevel')}
                      value={
                        currentChangeOrder.riskLevel ? (
                          <Badge
                            variant={riskVariant(currentChangeOrder.riskLevel)}
                          >
                            {tc(
                              `enum.severity.${currentChangeOrder.riskLevel}`,
                            )}
                          </Badge>
                        ) : (
                          tc('labels.notAssessed')
                        )
                      }
                    />
                    <ViewEditText
                      label={tc('fields.name')}
                      value={
                        isEditing ? changeOrder.name : currentChangeOrder.name
                      }
                      onChange={(v) => updateField('name', v)}
                      isEditing={isEditing}
                      placeholder={tp('changeOrders.detail.namePlaceholder')}
                      required
                      className="md:col-span-2"
                      data-testid="change-order-name"
                    />
                    <ViewEditTextarea
                      label={tc('fields.description')}
                      value={
                        isEditing
                          ? changeOrder.description
                          : currentChangeOrder.description
                      }
                      onChange={(v) => updateField('description', v)}
                      isEditing={isEditing}
                      placeholder={tp('changeOrders.detail.descriptionPlaceholder')}
                      className="md:col-span-2"
                    />
                    <ViewEditTextarea
                      label={tc('fields.reasonForChange')}
                      value={
                        isEditing
                          ? changeOrder.reasonForChange
                          : currentChangeOrder.reasonForChange
                      }
                      onChange={(v) => updateField('reasonForChange', v)}
                      isEditing={isEditing}
                      placeholder={tp('changeOrders.detail.reasonPlaceholder')}
                      className="md:col-span-2"
                    />
                    <ViewEditTextarea
                      label={tc('fields.impactDescription')}
                      value={
                        isEditing
                          ? changeOrder.impactDescription
                          : currentChangeOrder.impactDescription
                      }
                      onChange={(v) => updateField('impactDescription', v)}
                      isEditing={isEditing}
                      placeholder={tp('changeOrders.detail.impactPlaceholder')}
                      className="md:col-span-2"
                    />
                  </dl>
                </CardContent>
              </Card>

              {/* Design Selector (only for create mode) */}
              {isCreateMode && (
                <Card>
                  <CardHeader>
                    <CardTitle>{tc('sections.affectedDesigns')}</CardTitle>
                    <CardDescription>
                      {tp('changeOrders.form.selectAffectedDesignsDescription')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Search Input */}
                    <div>
                      <Label>
                        {tc('dialogs.addDesignToChangeOrder.searchDesignsLabel')}
                      </Label>
                      <Input
                        type="text"
                        placeholder={tp(
                          'changeOrders.detail.searchDesignsPlaceholder',
                        )}
                        value={designSearchQuery}
                        onChange={(e) => setDesignSearchQuery(e.target.value)}
                      />
                    </div>

                    {/* Selected Designs */}
                    {selectedDesigns.length > 0 && (
                      <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                        <Label className="text-xs text-cyan-700 dark:text-cyan-300">
                          {tp('changeOrders.detail.selectedDesignsCount', {
                            count: selectedDesigns.length,
                          })}
                        </Label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {selectedDesigns.map((design) => (
                            <Badge
                              key={design.id}
                              variant="default"
                              className="cursor-pointer hover:bg-cyan-600"
                              onClick={() => toggleDesignSelection(design)}
                            >
                              {design.code} &times;
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Design List */}
                    <div className="border border-slate-300 dark:border-slate-700 rounded-lg max-h-60 overflow-y-auto auto-hide-scroll">
                      {loadingDesigns ? (
                        <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                          {tp('changeOrders.detail.loadingDesigns')}
                        </div>
                      ) : filteredDesigns.length === 0 ? (
                        <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                          {availableDesigns.length === 0
                            ? tp('changeOrders.detail.noDesignsAvailable')
                            : tp('changeOrders.detail.noDesignsMatchSearch')}
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-200 dark:divide-slate-700">
                          {filteredDesigns.map((design) => {
                            const isSelected = selectedDesigns.some(
                              (d) => d.id === design.id,
                            )
                            return (
                              <button
                                key={design.id}
                                type="button"
                                data-testid="design-option"
                                data-design-id={design.id}
                                aria-pressed={isSelected}
                                onClick={() => toggleDesignSelection(design)}
                                className={`w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors ${
                                  isSelected
                                    ? 'bg-cyan-50 dark:bg-cyan-950'
                                    : ''
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center ${
                                      isSelected
                                        ? 'bg-cyan-500 border-cyan-500'
                                        : 'border-slate-300 dark:border-slate-600'
                                    }`}
                                  >
                                    {isSelected && (
                                      <Check className="h-3 w-3 text-white" />
                                    )}
                                  </div>
                                  <Box className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                        {design.code}
                                      </span>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {design.designType}
                                      </Badge>
                                      <Badge
                                        variant={
                                          design.phase === 'Production'
                                            ? 'default'
                                            : 'secondary'
                                        }
                                        className="text-xs"
                                      >
                                        {design.phase}
                                      </Badge>
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                                      {design.name}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary dashboard: the branches and what they carry */}
              {!isCreateMode && currentChangeOrder.id && hasBranches && (
                <ChangeOrderSummaryDashboard
                  changeOrderId={currentChangeOrder.id}
                />
              )}
            </div>

            {/* Sidebar - Right column */}
            <div className="space-y-6">
              {/* Files (only for existing change orders) */}
              {!isCreateMode && currentChangeOrder.id && (
                <Card>
                  <CardHeader>
                    <CardTitle>{tc('sections.files')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FileUploadZone
                      itemId={currentChangeOrder.id}
                      branchId={
                        context.type === 'branch'
                          ? context.branchId
                          : mainBranchId
                      }
                      onUploadComplete={() => {
                        showSuccess(
                          'File uploaded',
                          'File has been uploaded successfully',
                        )
                        void invalidate('files')
                      }}
                      onUploadError={(error) =>
                        handleError(error, { title: tc('errors.uploadFailed') })
                      }
                    />
                    <FileList
                      itemId={currentChangeOrder.id}
                      branchId={
                        context.type === 'branch' ? context.branchId : undefined
                      }
                      mainBranchId={mainBranchId}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Custom Attributes */}
              {isEditing ? (
                <Card>
                  <AttributesEditor
                    value={attributes}
                    onChange={setAttributes}
                    disabled={isSubmitting}
                    className="border-0 rounded-none"
                  />
                </Card>
              ) : (
                <Card>
                  <Collapsible
                    defaultOpen={
                      Object.keys(currentChangeOrder.attributes || {}).length >
                      0
                    }
                  >
                    <CardHeader className="pb-3">
                      <CollapsibleTrigger className="hover:opacity-70">
                        <CardTitle>{tc('sections.customAttributes')}</CardTitle>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        {Object.keys(currentChangeOrder.attributes || {})
                          .length > 0 ? (
                          <dl className="space-y-3">
                            {Object.entries(
                              currentChangeOrder.attributes || {},
                            ).map(([key, value]) => (
                              <div key={key} className="space-y-1">
                                <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                  {key}
                                </dt>
                                <dd className="text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-md">
                                  {formatAttributeValue(value) || '-'}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        ) : (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {tc('messages.noCustomAttributes')}
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
                      <ViewEditStatic
                        label={tc('columns.created')}
                        value={
                          currentChangeOrder.createdAt
                            ? new Date(
                                currentChangeOrder.createdAt,
                              ).toLocaleDateString()
                            : '-'
                        }
                      />
                      <ViewEditStatic
                        label={tc('fields.lastModified')}
                        value={
                          currentChangeOrder.modifiedAt
                            ? new Date(
                                currentChangeOrder.modifiedAt,
                              ).toLocaleDateString()
                            : '-'
                        }
                      />
                      <ViewEditStatic
                        label={tc('fields.submitted')}
                        value={
                          currentChangeOrder.submittedAt
                            ? new Date(
                                currentChangeOrder.submittedAt,
                              ).toLocaleDateString()
                            : '-'
                        }
                      />
                      <ViewEditStatic
                        label={tc('fields.approved')}
                        value={
                          currentChangeOrder.approvedAt
                            ? new Date(
                                currentChangeOrder.approvedAt,
                              ).toLocaleDateString()
                            : '-'
                        }
                      />
                      {!isCreateMode && (
                        <>
                          <ViewEditStatic
                            label={tc('fields.masterId')}
                            value={currentChangeOrder.masterId}
                            mono
                          />
                          <ViewEditStatic
                            label={tp('changeOrders.detail.changeOrderId')}
                            value={currentChangeOrder.id}
                            mono
                          />
                        </>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          </div>
        </TabsContent>

        {/* Affected Items Tab */}
        {!isCreateMode && (
          <TabsContent value="affected-items" className="mt-6">
            {currentChangeOrder.id && (
              <ChangeOrderAffectedItemsPanel
                changeOrderId={currentChangeOrder.id}
                changeOrderState={currentChangeOrder.state ?? ''}
                readOnly={isHistoricalView}
              />
            )}
          </TabsContent>
        )}

        {/* Conflicts Tab */}
        {!isCreateMode && (
          <TabsContent value="conflicts" className="mt-6">
            {currentChangeOrder.id && (
              <ConflictsList
                ecoId={currentChangeOrder.id}
                ecoNumber={currentChangeOrder.itemNumber}
                onResolve={() => void invalidate('change-orders')}
              />
            )}
          </TabsContent>
        )}

        {/* Impact Tab */}
        {!isCreateMode && (
          <TabsContent value="impact" className="mt-6 space-y-6">
            {currentChangeOrder.id && (
              <ImpactAssessmentPanel changeOrderId={currentChangeOrder.id} />
            )}
            {currentChangeOrder.id && (
              <GraphNavigator
                itemId={currentChangeOrder.id}
                itemType="ChangeOrder"
                defaultDepth={2}
              />
            )}
          </TabsContent>
        )}

        {/* Approvals Tab */}
        {!isCreateMode && (
          <TabsContent value="approvals" className="mt-6">
            {currentChangeOrder.id && (
              <ApprovalStatusPanel
                changeOrderId={currentChangeOrder.id}
                changeOrderNumber={currentChangeOrder.itemNumber}
              />
            )}
          </TabsContent>
        )}

        {/* Workflow Tab */}
        {!isCreateMode && (
          <TabsContent value="workflow" className="mt-6">
            {currentChangeOrder.id && workflowStructure ? (
              <Card>
                <CardHeader>
                  <CardTitle>{tc('sections.lifecycle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[600px] border rounded-lg overflow-hidden">
                    <LifecycleInstanceEditor
                      changeOrderId={currentChangeOrder.id}
                      instanceId={workflowStructure.instanceId}
                      states={workflowStructure.states}
                      transitions={workflowStructure.transitions}
                      currentState={workflowStructure.currentState}
                      canEdit={workflowStructure.canEdit && !isHistoricalView}
                      onStructureChange={() => void invalidate('change-orders')}
                    />
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-slate-500 dark:text-slate-400">
                    {tp('changeOrders.detail.noWorkflowAssociated')}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* History Tab */}
        {!isCreateMode && (
          <TabsContent value="history" className="mt-6">
            {hasBranches ? (
              <ChangeOrderHistoryGraphView
                changeOrderId={currentChangeOrder.id ?? ''}
              />
            ) : (
              <ItemHistoryTab
                itemId={currentChangeOrder.id ?? ''}
                designId={currentChangeOrder.designId ?? null}
                versionContext={context}
                onViewHistoricalState={setContext}
              />
            )}
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  )
}

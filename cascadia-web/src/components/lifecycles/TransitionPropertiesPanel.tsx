// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Mail, Plus, Trash2, X } from 'lucide-react'
import type {
  ActionType,
  FieldOperator,
  GuardType,
  LifecycleTransition,
  NotificationRecipient,
  NotificationRecipientType,
  SendNotificationConfig,
  TransitionAction,
  TransitionGuard,
  UpdateFieldConfig,
} from '@cascadia/commons/lifecycles/types'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  LoadingSpinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { roleListQuery, userListQuery } from '@/query/options/users'

interface TransitionPropertiesPanelProps {
  transition: LifecycleTransition
  kind: 'lifecycle' | 'workflow'
  onUpdate: (transition: LifecycleTransition) => void
  onDelete: (transitionId: string) => void
  onClose: () => void
}

export function TransitionPropertiesPanel({
  transition,
  kind,
  onUpdate,
  onDelete,
  onClose,
}: TransitionPropertiesPanelProps) {
  const { t } = useTranslation('pages')
  const tp = (key: string, options?: Record<string, unknown>) =>
    t(`lifecycles.transitionPanel.${key}`, options)

  const guardTypes: Array<{ value: GuardType; label: string }> = useMemo(
    () => [
      { value: 'field_value', label: tp('guardFieldValue') },
      { value: 'user_role', label: tp('guardUserRole') },
    ],
    [t],
  )

  const fieldOperators: Array<{ value: FieldOperator; label: string }> =
    useMemo(
      () => [
        { value: 'equals', label: tp('opEquals') },
        { value: 'not_equals', label: tp('opNotEquals') },
        { value: 'contains', label: tp('opContains') },
        { value: 'is_empty', label: tp('opIsEmpty') },
        { value: 'is_not_empty', label: tp('opIsNotEmpty') },
        { value: 'greater_than', label: tp('opGreaterThan') },
        { value: 'less_than', label: tp('opLessThan') },
      ],
      [t],
    )

  const actionTypes: Array<{ value: ActionType; label: string }> = useMemo(
    () => [
      { value: 'send_notification', label: tp('actionSendNotification') },
      { value: 'update_field', label: tp('actionUpdateField') },
    ],
    [t],
  )

  const [expandedGuards, setExpandedGuards] = useState<Set<string>>(new Set())
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())
  const isWorkflow = kind === 'workflow'

  // Recipient pickers, only for workflows — actions are a workflow feature.
  const { data: users = [], isFetching: loadingUsers } = useQuery({
    ...userListQuery(),
    enabled: isWorkflow,
  })
  const { data: roles = [], isFetching: loadingRoles } = useQuery({
    ...roleListQuery(),
    enabled: isWorkflow,
  })

  // Helper to update transition and immediately propagate changes
  const handleChange = (updates: Partial<LifecycleTransition>) => {
    onUpdate({ ...transition, ...updates })
  }

  const toggleGuardExpanded = (id: string) => {
    setExpandedGuards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleActionExpanded = (id: string) => {
    setExpandedActions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const addGuard = () => {
    const newGuard: TransitionGuard = {
      id: `guard-${Date.now()}`,
      name: tp('newGuard'),
      type: 'field_value',
      config: { fieldName: '', operator: 'is_not_empty' },
    }
    handleChange({ guards: [...(transition.guards || []), newGuard] })
    setExpandedGuards((prev) => new Set([...prev, newGuard.id]))
  }

  const updateGuard = (index: number, updates: Partial<TransitionGuard>) => {
    const newGuards = transition.guards?.map((g, i) =>
      i === index ? { ...g, ...updates } : g,
    )
    handleChange({ guards: newGuards })
  }

  const removeGuard = (index: number) => {
    handleChange({ guards: transition.guards?.filter((_, i) => i !== index) })
  }

  const addAction = () => {
    const newAction: TransitionAction = {
      id: `action-${Date.now()}`,
      name: tp('newAction'),
      type: 'send_notification',
      executeOn: 'after',
      config: { recipients: [], templateId: 'workflow_transition' },
    }
    handleChange({ actions: [...(transition.actions || []), newAction] })
    setExpandedActions((prev) => new Set([...prev, newAction.id]))
  }

  // Get default config for an action type
  const getDefaultActionConfig = (
    type: ActionType,
  ): SendNotificationConfig | UpdateFieldConfig => {
    switch (type) {
      case 'send_notification':
        return {
          recipients: [],
          templateId: 'workflow_transition',
        } satisfies SendNotificationConfig
      case 'update_field':
        return { fieldName: '', value: '' } satisfies UpdateFieldConfig
    }
  }

  const updateAction = (index: number, updates: Partial<TransitionAction>) => {
    const newActions = transition.actions?.map((a, i) =>
      i === index ? { ...a, ...updates } : a,
    )
    handleChange({ actions: newActions })
  }

  const removeAction = (index: number) => {
    handleChange({ actions: transition.actions?.filter((_, i) => i !== index) })
  }

  return (
    <Card className="w-96 shadow-lg max-h-[80vh] overflow-y-auto">
      <CardHeader className="pb-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{tp('title')}</CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Transition Name */}
        <div className="space-y-1.5">
          <Label htmlFor="transitionName" className="text-xs">
            {tp('fieldName')}
          </Label>
          <Input
            id="transitionName"
            value={transition.name}
            onChange={(e) => handleChange({ name: e.target.value })}
            className="h-8 text-sm"
            placeholder={tp('namePlaceholder')}
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="transitionDescription" className="text-xs">
            {tp('fieldDescription')}
          </Label>
          <textarea
            id="transitionDescription"
            value={transition.description || ''}
            onChange={(e) => handleChange({ description: e.target.value })}
            className="w-full h-16 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 resize-none"
            placeholder={tp('descriptionPlaceholder')}
          />
        </div>

        {/* Required approvals */}
        <div className="space-y-1.5">
          <Label htmlFor="transitionApprovals" className="text-xs">
            {tp('requiredApprovals')}
          </Label>
          <Input
            id="transitionApprovals"
            type="number"
            min={0}
            value={transition.approvalRequirement?.requiredCount ?? 0}
            onChange={(e) => {
              const requiredCount = Math.max(
                0,
                Number.parseInt(e.target.value, 10) || 0,
              )
              handleChange({
                approvalRequirement:
                  requiredCount > 0 ? { requiredCount } : undefined,
              })
            }}
            className="h-8 text-sm"
          />
          <p className="text-xs text-slate-500">
            {tp('requiredApprovalsHelp')}
          </p>
        </div>

        {/* Guards Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">{tp('guards')}</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addGuard}
              className="h-6 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              {tp('addGuard')}
            </Button>
          </div>
          <p className="text-xs text-slate-500">{tp('guardsHelp')}</p>

          {transition.guards?.map((guard, index) => (
            <div
              key={guard.id}
              className="border rounded-md bg-slate-50 dark:bg-slate-900"
            >
              <button
                type="button"
                onClick={() => toggleGuardExpanded(guard.id)}
                className="w-full flex items-center justify-between p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span className="text-sm font-medium">{guard.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-500">{guard.type}</span>
                  {expandedGuards.has(guard.id) ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {expandedGuards.has(guard.id) && (
                <div className="p-2 pt-0 space-y-2 border-t">
                  {/* Guard Name */}
                  <Input
                    value={guard.name}
                    onChange={(e) =>
                      updateGuard(index, { name: e.target.value })
                    }
                    className="h-7 text-xs"
                    placeholder={tp('guardNamePlaceholder')}
                  />

                  {/* Guard Type */}
                  <Select
                    value={guard.type}
                    onValueChange={(value: GuardType) =>
                      updateGuard(index, {
                        type: value,
                        config:
                          value === 'field_value'
                            ? { fieldName: '', operator: 'is_not_empty' }
                            : { requiredRoles: [] },
                      })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {guardTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Guard Config based on type */}
                  {guard.type === 'field_value' && (
                    <div className="space-y-2">
                      <Input
                        value={(guard.config as any).fieldName || ''}
                        onChange={(e) =>
                          updateGuard(index, {
                            config: {
                              ...guard.config,
                              fieldName: e.target.value,
                            },
                          })
                        }
                        className="h-7 text-xs"
                        placeholder={tp('fieldNamePlaceholder')}
                      />
                      <Select
                        value={(guard.config as any).operator || 'is_not_empty'}
                        onValueChange={(value: FieldOperator) =>
                          updateGuard(index, {
                            config: { ...guard.config, operator: value },
                          })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {fieldOperators.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!['is_empty', 'is_not_empty'].includes(
                        (guard.config as any).operator,
                      ) && (
                        <Input
                          value={(guard.config as any).value || ''}
                          onChange={(e) =>
                            updateGuard(index, {
                              config: {
                                ...guard.config,
                                value: e.target.value,
                              },
                            })
                          }
                          className="h-7 text-xs"
                          placeholder={tp('valueToComparePlaceholder')}
                        />
                      )}
                    </div>
                  )}

                  {guard.type === 'user_role' && (
                    <Input
                      value={((guard.config as any).requiredRoles || []).join(
                        ', ',
                      )}
                      onChange={(e) =>
                        updateGuard(index, {
                          config: {
                            ...guard.config,
                            requiredRoles: e.target.value
                              .split(',')
                              .map((r) => r.trim())
                              .filter(Boolean),
                          },
                        })
                      }
                      className="h-7 text-xs"
                      placeholder={tp('rolesCommaPlaceholder')}
                    />
                  )}

                  {/* Error Message */}
                  <Input
                    value={guard.errorMessage || ''}
                    onChange={(e) =>
                      updateGuard(index, { errorMessage: e.target.value })
                    }
                    className="h-7 text-xs"
                    placeholder={tp('guardErrorPlaceholder')}
                  />

                  {/* Remove Guard */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeGuard(index)}
                    className="h-6 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    {tp('removeGuard')}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions Section - Only for Workflows */}
        {isWorkflow && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">{tp('actions')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAction}
                className="h-6 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                {tp('addAction')}
              </Button>
            </div>
            <p className="text-xs text-slate-500">{tp('actionsHelp')}</p>

            {transition.actions?.map((action, index) => (
              <div
                key={action.id}
                className="border rounded-md bg-purple-50 dark:bg-purple-900/20"
              >
                <button
                  type="button"
                  onClick={() => toggleActionExpanded(action.id)}
                  className="w-full flex items-center justify-between p-2 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                >
                  <span className="text-sm font-medium">{action.name}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-purple-600 dark:text-purple-400">
                      {action.executeOn}
                    </span>
                    {expandedActions.has(action.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {expandedActions.has(action.id) && (
                  <div className="p-2 pt-0 space-y-2 border-t">
                    {/* Action Name */}
                    <Input
                      value={action.name}
                      onChange={(e) =>
                        updateAction(index, { name: e.target.value })
                      }
                      className="h-7 text-xs"
                      placeholder={tp('actionNamePlaceholder')}
                    />

                    {/* Action Type */}
                    <Select
                      value={action.type}
                      onValueChange={(value: ActionType) =>
                        updateAction(index, {
                          type: value,
                          config: getDefaultActionConfig(value),
                        })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {actionTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Execute On */}
                    <Select
                      value={action.executeOn}
                      onValueChange={(value: 'before' | 'after') =>
                        updateAction(index, { executeOn: value })
                      }
                    >
                      <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before">
                          {tp('timingBefore')}
                        </SelectItem>
                        <SelectItem value="after">{tp('timingAfter')}</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Send Notification Configuration */}
                    {action.type === 'send_notification' && (
                      <div className="space-y-2 pt-2 border-t border-purple-200 dark:border-purple-800">
                        <div className="flex items-center gap-1 text-xs font-medium text-purple-700 dark:text-purple-300">
                          <Mail className="h-3 w-3" />
                          {tp('notificationSettings')}
                        </div>

                        {/* Template (read-only for now) */}
                        <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded">
                          <span className="font-medium">{tp('templateLabel')}</span>{' '}
                          {tp('workflowTransitionTemplate')}
                        </div>

                        {/* Recipients */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">
                              {tp('recipients')}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const config = (action.config as
                                  SendNotificationConfig | undefined) ?? {
                                  recipients: [],
                                  templateId: 'workflow_transition',
                                }
                                const newRecipient: NotificationRecipient = {
                                  type: 'role',
                                  id: '',
                                }
                                updateAction(index, {
                                  config: {
                                    ...config,
                                    templateId: 'workflow_transition',
                                    recipients: [
                                      ...config.recipients,
                                      newRecipient,
                                    ],
                                  },
                                })
                              }}
                              className="h-5 text-xs px-2"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {tp('add')}
                            </Button>
                          </div>

                          {(
                            (
                              action.config as
                                SendNotificationConfig | undefined
                            )?.recipients ?? []
                          ).length === 0 && (
                            <p className="text-xs text-slate-500 italic">
                              {tp('noRecipients')}
                            </p>
                          )}

                          {(
                            (
                              action.config as
                                SendNotificationConfig | undefined
                            )?.recipients ?? []
                          ).map((recipient, recipientIndex) => (
                            <div
                              key={recipientIndex}
                              className="flex items-center gap-1"
                            >
                              {/* Recipient Type */}
                              <Select
                                value={recipient.type}
                                onValueChange={(
                                  value: NotificationRecipientType,
                                ) => {
                                  const config =
                                    action.config as SendNotificationConfig
                                  const newRecipients = [...config.recipients]
                                  newRecipients[recipientIndex] = {
                                    ...recipient,
                                    type: value,
                                    id: '',
                                  }
                                  updateAction(index, {
                                    config: {
                                      ...config,
                                      recipients: newRecipients,
                                    },
                                  })
                                }}
                              >
                                <SelectTrigger className="h-6 text-xs w-20">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="user">
                                    {tp('recipientUser')}
                                  </SelectItem>
                                  <SelectItem value="role">
                                    {tp('recipientRole')}
                                  </SelectItem>
                                </SelectContent>
                              </Select>

                              {/* Recipient ID (User or Role) */}
                              {recipient.type === 'user' ? (
                                <div className="relative flex-1">
                                  <Select
                                    value={recipient.id || ''}
                                    onValueChange={(value) => {
                                      const config =
                                        action.config as SendNotificationConfig
                                      const newRecipients = [
                                        ...config.recipients,
                                      ]
                                      newRecipients[recipientIndex] = {
                                        ...recipient,
                                        id: value,
                                      }
                                      updateAction(index, {
                                        config: {
                                          ...config,
                                          recipients: newRecipients,
                                        },
                                      })
                                    }}
                                  >
                                    <SelectTrigger className="h-6 text-xs">
                                      <SelectValue
                                        placeholder={tp('selectUser')}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {users.map((user) => (
                                        <SelectItem
                                          key={user.id}
                                          value={user.id}
                                        >
                                          {user.name || user.email}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {loadingUsers && (
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                      <LoadingSpinner size="sm" />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="relative flex-1">
                                  <Select
                                    value={recipient.id || ''}
                                    onValueChange={(value) => {
                                      const config =
                                        action.config as SendNotificationConfig
                                      const newRecipients = [
                                        ...config.recipients,
                                      ]
                                      newRecipients[recipientIndex] = {
                                        ...recipient,
                                        id: value,
                                      }
                                      updateAction(index, {
                                        config: {
                                          ...config,
                                          recipients: newRecipients,
                                        },
                                      })
                                    }}
                                  >
                                    <SelectTrigger className="h-6 text-xs">
                                      <SelectValue
                                        placeholder={tp('selectRole')}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {roles.map((role) => (
                                        <SelectItem
                                          key={role.id}
                                          value={role.id}
                                        >
                                          {role.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  {loadingRoles && (
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2">
                                      <LoadingSpinner size="sm" />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Remove Recipient */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const config =
                                    action.config as SendNotificationConfig
                                  const newRecipients =
                                    config.recipients.filter(
                                      (_, i) => i !== recipientIndex,
                                    )
                                  updateAction(index, {
                                    config: {
                                      ...config,
                                      recipients: newRecipients,
                                    },
                                  })
                                }}
                                className="h-6 w-6 p-0 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <p className="text-xs text-slate-500">
                          {tp('recipientsPermissionNote')}
                        </p>
                      </div>
                    )}

                    {/* Remove Action */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAction(index)}
                      className="h-6 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {tp('removeAction')}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Definition-level transitions carry no approval knob: state
            approvers are the mechanism that gates leaving a state.
            (Per-transition approval counts exist only on instance-level
            transitions of flexible workflows, where WI-4.2 enforces them.) */}
        {isWorkflow && (
          <div className="space-y-1">
            <Label className="text-xs font-semibold">{tp('approvals')}</Label>
            <p className="text-xs text-slate-500">
              {tp('approvalsWorkflowHelp')}
            </p>
          </div>
        )}

        {/* Delete Transition */}
        <div className="pt-2 border-t">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onDelete(transition.id)}
            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            {tp('deleteTransition')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

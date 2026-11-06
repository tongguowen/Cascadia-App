// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { formatRevision } from '@cascadia/commons/types/lifecycle'
import type { BOMTreeNode } from './ChangeOrderTreeTable'
import type { ChangeAction } from '@cascadia/commons/types/lifecycle'
import { changeActionOptionsQuery } from '@/query'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'
import { apiFetch } from '@/api/client'
import { useAlertDialog } from '@/hooks/useAlertDialog'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { translateStateName } from '@/i18n'

interface AddToChangeOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  changeOrderId: string
  item: BOMTreeNode
  onSuccess: () => void
}

export function AddToChangeOrderDialog({
  open,
  onOpenChange,
  changeOrderId,
  item,
  onSuccess,
}: AddToChangeOrderDialogProps) {
  const { alert } = useAlertDialog()
  const { handleError } = useErrorHandler()
  const { t: tc } = useTranslation('common')
  const [loading, setLoading] = useState(false)
  const [selectedAction, setSelectedAction] = useState<ChangeAction | null>(
    null,
  )
  const [description, setDescription] = useState('')

  // What the server will actually do, resolved from the item's lifecycle
  const { data: options, isLoading: loadingOptions } = useQuery({
    ...changeActionOptionsQuery(changeOrderId, [item.itemId]),
    enabled: open,
  })
  const itemOptions = options?.at(0)
  const availableActions = itemOptions?.actions ?? []
  const changeAction = selectedAction ?? itemOptions?.defaultAction ?? null
  const targetInfo = availableActions.find((a) => a.action === changeAction)

  const handleSubmit = async () => {
    if (!changeAction) return
    setLoading(true)
    try {
      await apiFetch(`/api/v1/change-orders/${changeOrderId}/affected-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          affectedItemId: item.itemId,
          changeAction,
          changeDescription: description || null,
        }),
      })

      alert({
        title: tc('dialogs.addToEco.addedTitle'),
        description: tc('dialogs.addToEco.addedDescription', {
          itemNumber: item.itemNumber,
        }),
      })

      onSuccess()
    } catch (error) {
      handleError(error, { title: tc('dialogs.addToEco.failedTitle') })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tc('dialogs.addToEco.title')}</DialogTitle>
          <DialogDescription>
            {tc('dialogs.addToEco.description', { itemNumber: item.itemNumber })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item info */}
          <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {item.itemNumber}
              </span>
              <Badge variant="outline">{item.itemType}</Badge>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {item.name}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {tc('labels.currentRev', {
                revision: formatRevision(item.revision),
                state: translateStateName(item.state),
              })}
            </div>
          </div>

          {/* Change action */}
          <div className="space-y-2">
            <Label>{tc('labels.changeAction')}</Label>
            {loadingOptions ? (
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                {tc('dialogs.addToEco.resolvingActions')}
              </div>
            ) : availableActions.length > 0 ? (
              <Select
                value={changeAction ?? undefined}
                onValueChange={(v) => setSelectedAction(v as ChangeAction)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('labels.selectAction')} />
                </SelectTrigger>
                <SelectContent>
                  {availableActions.map((action) => (
                    <SelectItem key={action.action} value={action.action}>
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {itemOptions?.blockedReason ??
                  tc('dialogs.addToEco.noActionForState', {
                    state: translateStateName(item.state),
                  })}
              </div>
            )}
          </div>

          {/* Target info. Revision is what the server predicts today; for a
              revision it is recomputed against main at release. */}
          {targetInfo?.targetState && (
            <div className="text-sm">
              <span className="text-slate-500 dark:text-slate-400">
                {tc('labels.target')}{' '}
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {targetInfo.targetRevision
                  ? tc('dialogs.addToEco.targetRev', {
                      revision: targetInfo.targetRevision,
                      state: translateStateName(targetInfo.targetState),
                    })
                  : translateStateName(targetInfo.targetState)}
              </span>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              {tc('labels.descriptionOptional')}
            </Label>
            <Textarea
              id="description"
              placeholder={tc('dialogs.addToEco.describePlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('actions.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || loadingOptions || !changeAction}
          >
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {tc('actions.addToEco')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

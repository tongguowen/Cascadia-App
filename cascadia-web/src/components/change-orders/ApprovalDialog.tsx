// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, X } from 'lucide-react'
import type { CanApproveResult } from '@cascadia/commons/lifecycles/types'
import {
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
} from '@/components/ui'
import { apiFetch } from '@/api/client'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { useApprovalFormSlots } from '@/lifecycles/approval-form-registry'

interface ApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  changeOrderId: string
  stateId: string
  canApprove: CanApproveResult
  onApprovalSubmitted: () => void
  /** Shown in the attestation line, e.g. "ECO-000123". */
  changeOrderNumber?: string
}

export function ApprovalDialog({
  open,
  onOpenChange,
  changeOrderId,
  stateId,
  canApprove,
  onApprovalSubmitted,
  changeOrderNumber,
}: ApprovalDialogProps) {
  const { handleError, showSuccess } = useErrorHandler()
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')
  const [submitting, setSubmitting] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>(
    undefined,
  )
  const [comments, setComments] = useState('')

  // Whatever the licensed modules want in this dialog: what to render, whether
  // they are ready to let it submit, and what to add to the request. Empty on
  // an instance with no such module, which is what lets this dialog stand alone.
  const {
    slots: moduleSlots,
    blocked: moduleBlocked,
    body: moduleBody,
  } = useApprovalFormSlots({
    open,
    disabled: submitting,
    subjectLabel: changeOrderNumber ?? null,
  })

  // Determine approval options
  const canApproveAsUser = canApprove.asUser
  const canApproveAsRoles = canApprove.asRoles
  const hasMultipleOptions =
    (canApproveAsUser ? 1 : 0) + canApproveAsRoles.length > 1

  const submitDisabled = submitting || moduleBlocked

  const handleSubmit = async (vote: 'approved' | 'rejected') => {
    setSubmitting(true)
    try {
      await apiFetch(`/api/v1/change-orders/${changeOrderId}/approvals`, {
        method: 'POST',
        body: JSON.stringify({
          vote,
          stateId,
          roleId: selectedRoleId,
          comments: comments.trim() || undefined,
          ...moduleBody,
        }),
      })

      showSuccess(
        vote === 'approved'
          ? tp('changeOrders.approval.submittedApprovalTitle')
          : tp('changeOrders.approval.submittedRejectionTitle'),
        vote === 'approved'
          ? tp('changeOrders.approval.recordedApprovalDescription')
          : tp('changeOrders.approval.recordedRejectionDescription'),
      )
      onApprovalSubmitted()
      onOpenChange(false)
      // Reset the fields this dialog owns. Module contributions reset
      // themselves — closing the dialog unmounts them along with their state,
      // and a failed submit deliberately leaves the dialog (and their input)
      // standing so the signer can retry without retyping.
      setSelectedRoleId(undefined)
      setComments('')
    } catch (error) {
      handleError(error, { title: tp('changeOrders.approval.submitFailedTitle') })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tc('actions.submitApproval')}</DialogTitle>
          <DialogDescription>
            {tc('dialogs.submitApproval.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Approval Identity Selection */}
          {hasMultipleOptions && (
            <div className="space-y-2">
              <Label>{tp('changeOrders.approval.approveAs')}</Label>
              <Select
                value={selectedRoleId || 'self'}
                onValueChange={(value) =>
                  setSelectedRoleId(value === 'self' ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={tp('changeOrders.approval.selectHowToApprove')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {canApproveAsUser && (
                    <SelectItem value="self">
                      {tp('changeOrders.approval.approveAsYourself')}
                    </SelectItem>
                  )}
                  {canApproveAsRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} (Role)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Single option display */}
          {!hasMultipleOptions && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Approving as:{' '}
                <span className="font-medium text-slate-900 dark:text-white">
                  {canApproveAsUser
                    ? 'Yourself'
                    : canApproveAsRoles[0]?.name || 'Unknown'}
                </span>
              </p>
            </div>
          )}

          {/* Comments */}
          <div className="space-y-2">
            <Label htmlFor="comments">{tc('labels.commentsOptional')}</Label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={tp('changeOrders.approval.decisionNotesPlaceholder')}
              className="w-full h-24 px-3 py-2 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 resize-none"
            />
          </div>

          {moduleSlots}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {tc('actions.cancel')}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => handleSubmit('rejected')}
            disabled={submitDisabled}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <X className="h-4 w-4 mr-2" />
                {tc('actions.reject')}
              </>
            )}
          </Button>
          <Button
            type="button"
            onClick={() => handleSubmit('approved')}
            disabled={submitDisabled}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                {tc('actions.approve')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

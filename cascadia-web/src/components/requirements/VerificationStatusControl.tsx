// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, ShieldOff } from 'lucide-react'
import type { Requirement } from '@cascadia/commons/items/types/requirement'
import { apiFetch } from '@/api/client'
import { useResourceMutation } from '@/query'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@/components/ui'

const statusVariant = (
  status: string | undefined,
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' => {
  switch (status) {
    case 'Passed':
      return 'success'
    case 'Failed':
      return 'destructive'
    case 'InProgress':
      return 'default'
    default:
      return 'secondary'
  }
}

/**
 * A requirement's verification status: derived from the latest execution of
 * every test case that verifies it, so there is nothing to edit here — only
 * the one manual exception, a waiver with a note, and the clearing of it.
 * Both are review records rather than design edits, offered whether or not
 * the page is in edit mode; the API charges `requirements:update`.
 */
export function VerificationStatusControl({
  requirement,
}: {
  requirement: Requirement
}) {
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')
  const { handleError } = useErrorHandler()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [note, setNote] = useState('')
  const status = requirement.verificationStatus ?? 'NotStarted'
  const waiver = requirement.verificationWaiver ?? null

  const waive = useResourceMutation({
    mutationFn: (reason: string) =>
      apiFetch(`/api/v1/requirements/${requirement.id}/waive`, {
        method: 'POST',
        body: JSON.stringify({ note: reason }),
      }),
    invalidates: ['requirements', 'items'],
    onSuccess: () => {
      setDialogOpen(false)
      setNote('')
    },
  })
  const clearWaiver = useResourceMutation({
    mutationFn: () =>
      apiFetch(`/api/v1/requirements/${requirement.id}/waive`, {
        method: 'DELETE',
      }),
    invalidates: ['requirements', 'items'],
  })

  const submitWaiver = async () => {
    try {
      await waive.mutateAsync(note.trim())
    } catch (error) {
      handleError(error, { title: tp('requirements.waiveVerificationFailedTitle') })
    }
  }

  const submitClear = async () => {
    try {
      await clearWaiver.mutateAsync()
    } catch (error) {
      handleError(error, { title: tp('requirements.clearWaiverFailedTitle') })
    }
  }

  return (
    <div>
      <div className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {tp('requirements.verification.statusLabel')}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(status)}>
          {tc(`enum.verificationStatus.${status}`, { defaultValue: status })}
        </Badge>
        {requirement.id &&
          (waiver ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={submitClear}
              disabled={clearWaiver.isPending}
              title={tp('requirements.verification.clearDerivedStatusTitle')}
            >
              {clearWaiver.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {tp('requirements.verification.clearWaiver')}
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDialogOpen(true)}
              title={tp('requirements.verification.recordWaiverTitle')}
            >
              <ShieldOff className="h-4 w-4 mr-1" />
              {tp('requirements.verification.waiveAction')}
            </Button>
          ))}
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {waiver
          ? tp('requirements.verification.waivedAtNote', {
              date: new Date(waiver.waivedAt).toLocaleDateString(),
              note: waiver.note,
            })
          : tp('requirements.verification.derivedFromTestsHint')}
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tc('dialogs.waiveVerification.title')}</DialogTitle>
            <DialogDescription>
              {tc('dialogs.waiveVerification.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="waiver-note">{tc('labels.reason')}</Label>
            <Textarea
              id="waiver-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={tp('requirements.verification.waiverReasonPlaceholder')}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={waive.isPending}
            >
              {tc('actions.cancel')}
            </Button>
            <Button
              type="button"
              onClick={submitWaiver}
              disabled={waive.isPending || note.trim().length === 0}
            >
              {waive.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : null}
              {tp('requirements.verification.waiveAction')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

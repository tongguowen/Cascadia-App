// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

interface WebhookSecretDialogProps {
  secret: string | null
  /** Distinguishes a freshly created subscription from a rotated one. */
  mode: 'created' | 'rotated'
  onClose: () => void
}

/**
 * The one and only time a signing secret is visible.
 *
 * Deliberately the same moment as the API-key experience, because it is the same
 * promise: copy it now, it is gone. The difference worth stating in the copy is
 * *why* — an API key is stored as a one-way hash, while a webhook secret is
 * stored encrypted and simply never read back out to a human. Either way a lost
 * secret is rotated, not recovered.
 */
export function WebhookSecretDialog({
  secret,
  mode,
  onClose,
}: WebhookSecretDialogProps) {
  const { t } = useTranslation('pages')
  const ts = (key: string) => t(`admin.webhooks.secret.${key}`)
  const [copy, setCopy] = useState<'idle' | 'copied' | 'failed'>('idle')

  const handleClose = () => {
    setCopy('idle')
    onClose()
  }

  return (
    <Dialog
      open={secret !== null}
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'created' ? ts('createdTitle') : ts('rotatedTitle')}
          </DialogTitle>
          <DialogDescription>{ts('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-slate-100 p-3 text-sm break-all dark:bg-slate-800">
              {secret}
            </code>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (!secret) return
                void navigator.clipboard.writeText(secret).then(
                  () => setCopy('copied'),
                  () => setCopy('failed'),
                )
              }}
              title={ts('copyTitle')}
            >
              {copy === 'copied' ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {copy === 'failed' && (
            <p className="text-sm text-destructive">{ts('copyFailed')}</p>
          )}

          <div className="flex gap-2 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              {mode === 'rotated'
                ? ts('rotatedWarning')
                : ts('createdWarning')}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>
            {copy === 'copied' ? ts('copiedDone') : ts('confirmCopied')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

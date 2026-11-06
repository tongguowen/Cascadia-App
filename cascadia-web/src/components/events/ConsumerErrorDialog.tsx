// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useTranslation } from 'react-i18next'
import { RotateCcw, SkipForward } from 'lucide-react'
import type { EventConsumerStatus } from '@/query'
import { Button } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

export interface ConsumerErrorDialogProps {
  consumer: EventConsumerStatus | null
  onClose: () => void
  onResume: (consumer: EventConsumerStatus) => void
  onSkip: (consumer: EventConsumerStatus) => void
  busy?: boolean
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="text-sm text-slate-900 dark:text-slate-100">{children}</dd>
    </div>
  )
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString()
}

/**
 * Why a consumer stopped, and the two ways out of it.
 *
 * Both actions are offered from here rather than from the menu alone because
 * the choice between them depends on what the error says: resume re-attempts
 * the same event, so it is right for a transient failure, while skip advances
 * the cursor past it and is the only way forward for a genuinely poisonous
 * event — at the cost of that event never being handled.
 */
export function ConsumerErrorDialog({
  consumer,
  onClose,
  onResume,
  onSkip,
  busy = false,
}: ConsumerErrorDialogProps) {
  const { t: tp } = useTranslation('pages')
  const { t: tc } = useTranslation('common')

  return (
    <Dialog
      open={consumer !== null}
      onOpenChange={(open) => !open && onClose()}
    >
      <DialogContent className="max-w-2xl">
        {consumer && (
          <>
            <DialogHeader>
              <DialogTitle className="font-mono text-base">
                {consumer.id}
              </DialogTitle>
              <DialogDescription>
                {consumer.abandonedAt
                  ? tp('admin.events.consumerDialog.descAbandoned')
                  : consumer.parkedAt
                    ? tp('admin.events.consumerDialog.descParked')
                    : tp('admin.events.consumerDialog.descRetrying')}
              </DialogDescription>
            </DialogHeader>

            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label={tp('admin.events.consumerDialog.consecutiveFailures')}>
                {consumer.failureCount}
              </Field>
              <Field label={tp('admin.events.consumerDialog.stuckAtSeq')}>
                {consumer.lastErrorSeq ?? '—'}
              </Field>
              <Field label={tp('admin.events.consumerDialog.cursor')}>
                {consumer.lastSeq}
              </Field>
              <Field label={tp('admin.events.consumerDialog.lastFailure')}>
                {formatWhen(consumer.lastErrorAt)}
              </Field>
              <Field label={tp('admin.events.consumerDialog.nextAttempt')}>
                {formatWhen(consumer.nextAttemptAt)}
              </Field>
              <Field label={tp('admin.events.consumerDialog.parked')}>
                {formatWhen(consumer.parkedAt)}
              </Field>
            </dl>

            <div>
              <div className="mb-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                {tp('admin.events.consumerDialog.errorLabel')}
              </div>
              <pre className="max-h-64 overflow-auto rounded border border-slate-300 bg-slate-50 p-3 font-mono text-xs whitespace-pre-wrap text-red-700 dark:border-slate-700 dark:bg-slate-900 dark:text-red-400">
                {consumer.lastError ??
                  tp('admin.events.consumerDialog.noErrorRecorded')}
              </pre>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {tc('actions.close')}
              </Button>
              <Button
                variant="outline"
                disabled={busy || consumer.lastErrorSeq === null}
                onClick={() => onSkip(consumer)}
              >
                <SkipForward className="mr-2 h-4 w-4" />
                {tp('admin.events.consumerDialog.skipSeq', {
                  seq: consumer.lastErrorSeq ?? '',
                })}
              </Button>
              <Button disabled={busy} onClick={() => onResume(consumer)}>
                <RotateCcw className="mr-2 h-4 w-4" />
                {tp('admin.events.consumerDialog.resume')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

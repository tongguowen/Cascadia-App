// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle, Loader2, RefreshCw, XCircle } from 'lucide-react'
import type { InstructionExecution } from '@cascadia/commons/items/types/work-order'
import { Button, Textarea } from '@/components/ui'

interface SignOffPanelProps {
  execution: InstructionExecution
  onSignOff: (
    decision: 'approved' | 'rejected',
    comments?: string,
  ) => Promise<void>
  onResubmit?: () => Promise<void>
  canResubmit?: boolean
}

export function SignOffPanel({
  execution,
  onSignOff,
  onResubmit,
  canResubmit = false,
}: SignOffPanelProps) {
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')
  const signT = (key: string, options?: Record<string, unknown>) =>
    tp(`workOrders.signOff.${key}`, options)

  const [comments, setComments] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (decision === 'rejected' && !comments.trim()) {
      setError(signT('commentsRequiredError'))
      return
    }

    setLoading(decision)
    setError(null)
    try {
      await onSignOff(decision, comments.trim() || undefined)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(null)
    }
  }

  const handleResubmit = async () => {
    if (!onResubmit) return
    setLoading('resubmit')
    setError(null)
    try {
      await onResubmit()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(null)
    }
  }

  if (execution.status === 'Rejected') {
    return (
      <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700 space-y-4">
        <div className="flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            {signT('rejectedTitle')}
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        {canResubmit && onResubmit && (
          <Button
            onClick={handleResubmit}
            disabled={loading !== null}
            variant="outline"
          >
            {loading === 'resubmit' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {signT('resubmit')}
          </Button>
        )}
      </div>
    )
  }

  if (execution.status !== 'Pending Approval') {
    return null
  }

  return (
    <div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
          {signT('requiresSignOff')}
        </span>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          <p>
            {signT('executedBy')}{' '}
            <span className="font-medium text-slate-900 dark:text-white">
              {execution.executor?.name || execution.executor?.email}
            </span>
          </p>
          <p>
            {signT('started')}{' '}
            <span className="font-medium">
              {new Date(execution.startedAt).toLocaleString()}
            </span>
          </p>
          <p>
            {signT('dataFieldsCaptured')}{' '}
            <span className="font-medium">
              {Object.keys(execution.stepData).length}
            </span>
          </p>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1 block">
            {signT('comments')}{' '}
            {loading === 'rejected'
              ? signT('commentsRequiredReject')
              : signT('commentsOptional')}
          </label>
          <Textarea
            value={comments}
            onChange={(e) => {
              setComments(e.target.value)
              setError(null)
            }}
            placeholder={tc('placeholders.addReviewComments')}
            rows={2}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="flex gap-3">
          <Button
            onClick={() => handleDecision('approved')}
            disabled={loading !== null}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading === 'approved' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            {signT('approve')}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDecision('rejected')}
            disabled={loading !== null}
            className="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {loading === 'rejected' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            {signT('reject')}
          </Button>
        </div>
      </div>
    </div>
  )
}

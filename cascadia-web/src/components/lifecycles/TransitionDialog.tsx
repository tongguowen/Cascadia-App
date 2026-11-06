// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import { TraceImpactSummary } from './TraceImpactSummary'
import type {
  AvailableTransition,
  LifecycleState,
} from '@cascadia/commons/lifecycles/types'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@/components/ui'
import { cn } from '@/utils'
import { changeOrderReleasePreviewQuery } from '@/query/options/change-orders'
import { translateStateName } from '@/i18n'

interface TransitionDialogProps {
  isOpen: boolean
  onClose: () => void
  changeOrderId: string
  changeOrderNumber: string
  currentState: LifecycleState
  availableTransitions: Array<AvailableTransition>
  allStates: Array<LifecycleState>
  /** The transition the user clicked, preselected on open */
  initialTransitionId?: string | null
  onConfirm: (toStateId: string, comments?: string) => Promise<void>
  isSubmitting?: boolean
}

export function TransitionDialog({
  isOpen,
  onClose,
  changeOrderId,
  changeOrderNumber,
  currentState,
  availableTransitions,
  allStates,
  initialTransitionId,
  onConfirm,
  isSubmitting = false,
}: TransitionDialogProps) {
  const { t: tc } = useTranslation('common')
  // The transition the user actually clicked. Every button used to open this
  // dialog with nothing chosen, so pressing "Approve" made you pick Approve
  // again from a list that also offered Cancel.
  const defaultTransitionId =
    initialTransitionId ??
    (availableTransitions.length === 1
      ? (availableTransitions[0]?.transition.id ?? null)
      : null)
  const [selectedTransitionId, setSelectedTransitionId] = useState<
    string | null
  >(defaultTransitionId)
  const [comments, setComments] = useState('')
  // Large initial releases dump hundreds of "PN -→A" lines and push the
  // confirm button off-screen; keep the list collapsed unless opened.
  const [showRevisionDetails, setShowRevisionDetails] = useState(false)

  // Re-seed when the dialog opens or the clicked transition changes
  useEffect(() => {
    if (!isOpen) return
    setSelectedTransitionId(
      initialTransitionId ??
        (availableTransitions.length === 1
          ? (availableTransitions[0]?.transition.id ?? null)
          : null),
    )
    setShowRevisionDetails(false)
  }, [isOpen, initialTransitionId, availableTransitions])

  const selectedTransition = availableTransitions.find(
    (t) => t.transition.id === selectedTransitionId,
  )

  const getTargetState = (toStateId: string) => {
    return allStates.find((s) => s.id === toStateId)
  }

  // Whether the selected transition releases. Keyed on `finalKind`, not on
  // `isFinal`: a cancellation is also final but merges nothing, and gating on
  // `isFinal` showed "N item(s) will be merged to main" with a list of revision
  // assignments to someone about to abandon the change order.
  const selectedTargetState = selectedTransition
    ? getTargetState(selectedTransition.transition.toStateId)
    : null
  const isReleaseTransition = selectedTargetState?.finalKind === 'release'
  const isCancelTransition = selectedTargetState?.finalKind === 'cancel'

  // Previewed only once a releasing transition is actually selected.
  const { data: releasePreview, isFetching: loadingPreview } = useQuery(
    changeOrderReleasePreviewQuery(changeOrderId, isReleaseTransition),
  )

  // A release the preview says cannot happen must not be offered. It used to
  // render the reasons in red and leave Confirm enabled, so the user pressed it
  // and got the same refusal back as an error.
  const releaseBlocked =
    isReleaseTransition && releasePreview?.canRelease === false

  const handleConfirm = async () => {
    if (!selectedTransition) return
    await onConfirm(
      selectedTransition.transition.toStateId,
      comments || undefined,
    )
  }

  const handleClose = () => {
    setSelectedTransitionId(defaultTransitionId)
    setComments('')
    onClose()
  }

  // Get color for state badge - using !important-style classes to override Badge defaults
  const getStateColor = (color?: string) => {
    const colorMap: Record<string, string> = {
      gray: 'bg-slate-200 border-slate-400 dark:bg-slate-700 dark:border-slate-500 [&]:text-slate-900 dark:[&]:text-slate-100',
      blue: 'bg-blue-100 border-blue-400 dark:bg-blue-800 dark:border-blue-600 [&]:text-blue-900 dark:[&]:text-blue-100',
      green:
        'bg-green-100 border-green-400 dark:bg-green-800 dark:border-green-600 [&]:text-green-900 dark:[&]:text-green-100',
      red: 'bg-red-100 border-red-400 dark:bg-red-800 dark:border-red-600 [&]:text-red-900 dark:[&]:text-red-100',
      yellow:
        'bg-yellow-100 border-yellow-400 dark:bg-yellow-800 dark:border-yellow-600 [&]:text-yellow-900 dark:[&]:text-yellow-100',
      purple:
        'bg-purple-100 border-purple-400 dark:bg-purple-800 dark:border-purple-600 [&]:text-purple-900 dark:[&]:text-purple-100',
      orange:
        'bg-orange-100 border-orange-400 dark:bg-orange-800 dark:border-orange-600 [&]:text-orange-900 dark:[&]:text-orange-100',
    }
    return colorMap[color || 'gray'] || colorMap.gray
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className={cn(
          // Dialog shell already centers + caps height; keep a scroll body so
          // the footer (确认流转) stays on screen for tall release previews.
          isReleaseTransition ? 'max-w-lg' : 'max-w-md',
          'gap-3 p-4',
        )}
      >
        <DialogHeader className="space-y-1">
          <DialogTitle>{tc('dialogs.transition.title')}</DialogTitle>
          <DialogDescription>
            {tc('dialogs.transition.description', { changeOrderNumber })}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
          {/* Current State */}
          <div>
            <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {tc('labels.currentState')}
            </label>
            <div className="mt-1">
              <Badge
                className={cn('border', getStateColor(currentState.color))}
              >
                {translateStateName(currentState.name)}
              </Badge>
            </div>
          </div>

          {/* Target State Selection */}
          <div>
            <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {availableTransitions.length === 1
                ? tc('labels.targetState')
                : tc('labels.selectTargetState')}
            </label>
            <div className="mt-2 space-y-2">
              {availableTransitions.map((at) => {
                const targetState = getTargetState(at.transition.toStateId)
                const isSelected = selectedTransitionId === at.transition.id
                const canTransition = at.canTransition
                const failedGuards = at.guardResults.filter((g) => !g.passed)

                return (
                  <div key={at.transition.id}>
                    <button
                      type="button"
                      onClick={() =>
                        canTransition &&
                        setSelectedTransitionId(at.transition.id)
                      }
                      disabled={!canTransition || isSubmitting}
                      className={cn(
                        'w-full p-2 rounded-lg border text-left transition-all relative',
                        isSelected
                          ? 'border-green-500 dark:border-green-400 bg-green-500/10 dark:bg-green-500/15 ring-2 ring-green-500/30 ring-offset-1 ring-offset-background'
                          : canTransition
                            ? 'border-slate-300 dark:border-slate-500 hover:border-slate-400 dark:hover:border-slate-400 hover:bg-muted/50'
                            : 'border-muted bg-muted/50 opacity-60 cursor-not-allowed',
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <Badge
                          className={cn(
                            'border',
                            getStateColor(currentState.color),
                          )}
                        >
                          {translateStateName(currentState.name)}
                        </Badge>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                        <Badge
                          className={cn(
                            'border',
                            getStateColor(targetState?.color),
                          )}
                        >
                          {targetState
                            ? translateStateName(targetState.name)
                            : at.transition.toStateId}
                        </Badge>
                      </div>
                      <div className="mt-0.5 text-sm font-medium text-slate-900 dark:text-slate-100">
                        {at.transition.name}
                      </div>
                      {at.transition.description && (
                        <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                          {at.transition.description}
                        </div>
                      )}
                    </button>

                    {/* Show guard failures */}
                    {failedGuards.length > 0 && (
                      <div className="mt-1 ml-2 text-xs text-destructive">
                        {failedGuards.map((g, idx) => (
                          <div key={idx}>
                            {g.errorMessage ||
                              tc('dialogs.transition.guardFailed', {
                                guardName: g.guardName,
                              })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Release Preview (shown when the transition releases) */}
          {isReleaseTransition && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 p-2">
              <div className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1.5">
                {tc('dialogs.transition.releasePreview')}
              </div>
              {loadingPreview ? (
                <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tc('dialogs.transition.loadingPreview')}
                </div>
              ) : releasePreview ? (
                <div className="space-y-2 text-sm">
                  {(releasePreview.validationIssues ?? []).length > 0 && (
                    <div className="space-y-1">
                      {(releasePreview.validationIssues ?? []).map(
                        (issue, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              'text-xs',
                              releasePreview.canRelease
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-red-600 dark:text-red-400',
                            )}
                          >
                            {issue}
                          </div>
                        ),
                      )}
                    </div>
                  )}
                  <div className="text-amber-800 dark:text-amber-200">
                    {tc('dialogs.transition.mergeSummary', {
                      designCount: (releasePreview.designs ?? []).length,
                      itemCount: releasePreview.totalItems,
                    })}
                  </div>
                  {(releasePreview.designs ?? []).map((design) => {
                    const items = design.items ?? []
                    return (
                      <div
                        key={design.designId}
                        className="ml-2 text-xs text-amber-700 dark:text-amber-300"
                      >
                        <span className="font-medium">{design.designName}</span>
                        {' — '}
                        {tc('dialogs.transition.designItemCount', {
                          count: items.length,
                        })}
                      </div>
                    )
                  })}
                  {(releasePreview.totalItems ?? 0) > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        {tc('dialogs.transition.revisionDetailsHint')}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs border-amber-300 text-amber-900 dark:border-amber-700 dark:text-amber-100"
                        onClick={() =>
                          setShowRevisionDetails((open) => !open)
                        }
                      >
                        {showRevisionDetails
                          ? tc('dialogs.transition.hideRevisionDetails')
                          : tc('dialogs.transition.showRevisionDetails', {
                              count: releasePreview.totalItems,
                            })}
                      </Button>
                      {showRevisionDetails && (
                        <div className="max-h-40 overflow-y-auto rounded border border-amber-200 dark:border-amber-800 bg-amber-100/60 dark:bg-amber-900/40 p-2 space-y-2">
                          {(releasePreview.designs ?? []).map((design) => {
                            const items = design.items ?? []
                            if (items.length === 0) return null
                            return (
                              <div
                                key={`${design.designId}-revs`}
                                className="text-xs text-amber-800 dark:text-amber-200"
                              >
                                <div className="font-medium mb-1">
                                  {design.designName} —{' '}
                                  {tc('dialogs.transition.revisions')}
                                </div>
                                <ul className="list-disc list-inside space-y-0.5">
                                  {items.map((r) => (
                                    <li key={`${r.itemNumber}-${r.newRevision}`}>
                                      {r.itemNumber} {r.currentRevision}→
                                      {r.newRevision}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {releasePreview.traceImpact &&
                    releasePreview.traceImpact.suspectAfterRelease > 0 && (
                      <TraceImpactSummary impact={releasePreview.traceImpact} />
                    )}
                </div>
              ) : (
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  {tc('dialogs.transition.releaseFallback')}
                </div>
              )}
            </div>
          )}

          {/* Cancellation notice — merges nothing, consumes no revisions */}
          {isCancelTransition && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/50 p-3">
              <div className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                {tc('dialogs.transition.cancelTitle', { changeOrderNumber })}
              </div>
              <div className="text-sm text-red-700 dark:text-red-300">
                {tc('dialogs.transition.cancelDescription')}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <label className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {tc('labels.commentsOptional')}
            </label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={tc('dialogs.transition.commentsPlaceholder')}
              rows={2}
              className="mt-1"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <DialogFooter className="mt-0 border-t border-slate-200 pt-3 dark:border-slate-800">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {tc('actions.cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !selectedTransition?.canTransition ||
              isSubmitting ||
              loadingPreview ||
              releaseBlocked
            }
          >
            {isSubmitting
              ? tc('actions.processing')
              : tc('actions.confirmTransition')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useQueries, useQuery } from '@tanstack/react-query'
import { AlertTriangle, GitBranch, Loader2, Lock, Plus } from 'lucide-react'
import { BRANCH_TYPES } from '@cascadia/commons/versioning/branch-types'
import type { CheckoutStatus } from '@cascadia/commons/services/types/checkout'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { apiFetch } from '@/api/client'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { CreateWorkspaceDialog } from '@/components/workspaces/CreateWorkspaceDialog'
import { useInvalidateResources } from '@/query'
import { designBranchesQuery } from '@/query/options/designs'
import { itemCheckoutQuery } from '@/query/options/checkout'

interface Branch {
  id: string
  name: string
  branchType: 'main' | 'eco' | 'workspace' | 'release'
  isArchived: boolean
  isLocked: boolean
  changeOrderItemId?: string | null
}

interface CheckoutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId: string
  itemNumber: string
  designId: string
  /**
   * `currentItemId` is the row the branch now tracks for this item — the
   * revision working copy the checkout minted for a released item, or the
   * shared base row when no copy was needed. When it differs from `itemId`,
   * edits belong on that row's page: saves addressed to the row the dialog
   * was opened from would target the released version and be refused.
   */
  onCheckoutComplete?: (branchId: string, currentItemId?: string) => void
}

export function CheckoutDialog({
  open,
  onOpenChange,
  itemId,
  itemNumber,
  designId,
  onCheckoutComplete,
}: CheckoutDialogProps) {
  const { handleError, showSuccess } = useErrorHandler()
  const { t: tc } = useTranslation('common')
  const invalidate = useInvalidateResources()
  const [selectedBranchId, setSelectedBranchId] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [checkoutOption, setCheckoutOption] = useState<
    'existing' | 'new-eco' | 'workspace' | 'new-workspace'
  >('existing')
  const [createWorkspaceDialogOpen, setCreateWorkspaceDialogOpen] =
    useState(false)

  const { data: allBranches, isLoading: loading } = useQuery({
    ...designBranchesQuery<Branch>(designId),
    enabled: open && Boolean(designId),
  })

  const branches = useMemo(
    () =>
      (allBranches ?? []).filter(
        (b) => !b.isArchived && !b.isLocked && b.branchType !== 'main',
      ),
    [allBranches],
  )

  // Checkout status per branch, so the picker can flag the ones already locked
  const statusResults = useQueries({
    queries: branches.map((branch) => ({
      ...itemCheckoutQuery(itemId, branch.id),
      enabled: open && Boolean(itemId),
    })),
  })

  const branchStatuses = useMemo(() => {
    const statuses = new Map<string, CheckoutStatus>()
    branches.forEach((branch, index) => {
      const status = statusResults[index]?.data
      if (status) statuses.set(branch.id, status)
    })
    return statuses
  }, [branches, statusResults])

  // Get the selected branch's checkout status
  const selectedBranchStatus = selectedBranchId
    ? branchStatuses.get(selectedBranchId)
    : undefined

  // Group branches by type
  const changeOrderBranches = branches.filter(
    (b) => b.branchType === BRANCH_TYPES.changeOrder,
  )
  const workspaceBranches = branches.filter((b) => b.branchType === 'workspace')

  // Handle checkout
  const handleCheckout = async () => {
    if (!selectedBranchId) {
      return
    }

    setIsSubmitting(true)
    try {
      const result = await apiFetch<{
        data: { branchItem: { currentItemId: string | null } }
      }>(`/api/v1/items/${itemId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ branchId: selectedBranchId }),
      })

      const branch = branches.find((b) => b.id === selectedBranchId)
      showSuccess(
        tc('dialogs.checkout.successTitle'),
        tc('dialogs.checkout.successDescription', {
          itemNumber,
          branchName: branch?.name ?? tc('dialogs.checkout.unknownBranch'),
        }),
      )

      await invalidate('branch-items')
      onOpenChange(false)
      onCheckoutComplete?.(
        selectedBranchId,
        result.data.branchItem.currentItemId ?? undefined,
      )
    } catch (error) {
      handleError(error, { title: tc('dialogs.checkout.failedTitle') })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get display for selected branch
  const getSelectedBranchDisplay = () => {
    if (!selectedBranchId) return tc('dialogs.checkout.selectBranch')
    const branch = branches.find((b) => b.id === selectedBranchId)
    return branch?.name || tc('dialogs.checkout.unknownBranch')
  }

  // Handle workspace creation and automatic checkout
  const handleWorkspaceCreated = async (
    workspaceId: string,
    workspaceName: string,
  ) => {
    setCreateWorkspaceDialogOpen(false)

    // Automatically select the new workspace and check out
    setSelectedBranchId(workspaceId)
    setIsSubmitting(true)
    try {
      const result = await apiFetch<{
        data: { branchItem: { currentItemId: string | null } }
      }>(`/api/v1/items/${itemId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ branchId: workspaceId }),
      })

      showSuccess(
        tc('dialogs.checkout.workspaceSuccessTitle'),
        tc('dialogs.checkout.workspaceSuccessDescription', {
          itemNumber,
          workspaceName,
        }),
      )

      await invalidate('workspaces', 'branch-items')
      onOpenChange(false)
      onCheckoutComplete?.(
        workspaceId,
        result.data.branchItem.currentItemId ?? undefined,
      )
    } catch (error) {
      handleError(error, { title: tc('dialogs.checkout.failedTitle') })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            {tc('dialogs.checkout.title')}
          </DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="dialogs.checkout.description"
              values={{ itemNumber }}
              components={{ strong: <strong /> }}
            />
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              <span className="ml-2 text-slate-500">
                {tc('dialogs.checkout.loadingBranches')}
              </span>
            </div>
          ) : (
            <>
              {/* Checkout options */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {tc('dialogs.checkout.checkoutTo')}
                </label>

                {/* Option: Existing ECO */}
                {changeOrderBranches.length > 0 && (
                  <div
                    data-testid="checkout-option-eco"
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      checkoutOption === 'existing'
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                    onClick={() => setCheckoutOption('existing')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        ECO
                      </Badge>
                      <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                        {tc('dialogs.checkout.existingChangeOrder')}
                      </span>
                    </div>
                    {checkoutOption === 'existing' && (
                      <Select
                        value={selectedBranchId}
                        onValueChange={setSelectedBranchId}
                      >
                        <SelectTrigger
                          className="w-full mt-2"
                          data-testid="checkout-eco-branch-select"
                        >
                          <SelectValue
                            placeholder={tc(
                              'dialogs.checkout.selectChangeOrderBranch',
                            )}
                          >
                            {getSelectedBranchDisplay()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>
                              {tc('dialogs.checkout.activeChangeOrders')}
                            </SelectLabel>
                            {changeOrderBranches.map((branch) => {
                              const status = branchStatuses.get(branch.id)
                              return (
                                <SelectItem
                                  key={branch.id}
                                  value={branch.id}
                                  data-testid="checkout-eco-branch-option"
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{branch.name}</span>
                                    {status?.isCheckedOut && (
                                      <Badge
                                        variant="warning"
                                        className="text-xs px-1 py-0"
                                      >
                                        <Lock className="w-3 h-3 mr-1" />
                                        {tc('dialogs.checkout.locked')}
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              )
                            })}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}

                {/* Option: Existing Workspace */}
                {workspaceBranches.length > 0 && (
                  <div
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      checkoutOption === 'workspace'
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                    onClick={() => setCheckoutOption('workspace')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="text-xs">
                        WS
                      </Badge>
                      <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                        {tc('dialogs.checkout.myWorkspace')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {tc('dialogs.checkout.workspaceHint')}
                    </p>
                    {checkoutOption === 'workspace' &&
                      workspaceBranches.length > 0 && (
                        <Select
                          value={selectedBranchId}
                          onValueChange={setSelectedBranchId}
                        >
                          <SelectTrigger className="w-full mt-2">
                            <SelectValue
                              placeholder={tc('dialogs.checkout.selectWorkspace')}
                            >
                              {getSelectedBranchDisplay()}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>
                                {tc('dialogs.checkout.workspaces')}
                              </SelectLabel>
                              {workspaceBranches.map((branch) => {
                                const status = branchStatuses.get(branch.id)
                                return (
                                  <SelectItem key={branch.id} value={branch.id}>
                                    <div className="flex items-center gap-2">
                                      <span>{branch.name}</span>
                                      {status?.isCheckedOut && (
                                        <Badge
                                          variant="warning"
                                          className="text-xs px-1 py-0"
                                        >
                                          <Lock className="w-3 h-3 mr-1" />
                                          {tc('dialogs.checkout.locked')}
                                        </Badge>
                                      )}
                                    </div>
                                  </SelectItem>
                                )
                              })}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      )}
                  </div>
                )}

                {/* Option: Create New Workspace */}
                <div
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    checkoutOption === 'new-workspace'
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                      : 'border-slate-300 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  onClick={() => {
                    setCheckoutOption('new-workspace')
                    setCreateWorkspaceDialogOpen(true)
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                      {tc('dialogs.checkout.createNewWorkspace')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {tc('dialogs.checkout.createWorkspaceHint')}
                  </p>
                </div>

                {/* Warning when selected branch has existing checkout */}
                {selectedBranchId && selectedBranchStatus?.isCheckedOut && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-800 dark:text-amber-200">
                          {tc('dialogs.checkout.alreadyCheckedOut')}
                        </p>
                        <p className="text-amber-700 dark:text-amber-300 mt-1">
                          <Trans
                            i18nKey="dialogs.checkout.overrideCheckout"
                            values={{
                              user:
                                selectedBranchStatus.checkedOutBy?.name ||
                                selectedBranchStatus.checkedOutBy?.email ||
                                tc('dialogs.checkout.anotherUser'),
                            }}
                            components={{ strong: <strong /> }}
                          />
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* No branches available */}
                {changeOrderBranches.length === 0 &&
                  workspaceBranches.length === 0 && (
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        {tc('dialogs.checkout.noBranchesAvailable')}
                      </p>
                    </div>
                  )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('actions.cancel')}
          </Button>
          <Button
            data-testid="checkout-confirm"
            onClick={handleCheckout}
            disabled={
              !selectedBranchId ||
              isSubmitting ||
              loading ||
              checkoutOption === 'new-workspace'
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tc('actions.checkingOut')}
              </>
            ) : (
              <>
                <GitBranch className="h-4 w-4 mr-2" />
                {tc('actions.checkOut')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Create Workspace Dialog (nested) */}
      <CreateWorkspaceDialog
        open={createWorkspaceDialogOpen}
        onOpenChange={setCreateWorkspaceDialogOpen}
        designId={designId}
        onSuccess={handleWorkspaceCreated}
      />
    </Dialog>
  )
}

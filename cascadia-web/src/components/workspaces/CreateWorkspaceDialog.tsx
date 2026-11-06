// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { GitBranch, Loader2 } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from '@/components/ui'
import { apiFetch } from '@/api/client'
import { useErrorHandler } from '@/hooks/useErrorHandler'

interface CreateWorkspaceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  designId: string
  designName?: string
  onSuccess?: (workspaceId: string, workspaceName: string) => void
}

export function CreateWorkspaceDialog({
  open,
  onOpenChange,
  designId,
  designName,
  onSuccess,
}: CreateWorkspaceDialogProps) {
  const { t: tc } = useTranslation('common')
  const { handleError, showSuccess } = useErrorHandler()
  const [workspaceName, setWorkspaceName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async () => {
    if (!workspaceName.trim()) {
      handleError(new Error(tc('dialogs.createWorkspace.workspaceNameRequired')), {
        title: tc('dialogs.createWorkspace.validationTitle'),
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await apiFetch<{
        data: { workspaceId: string; branchName: string }
      }>('/api/v1/workspaces', {
        method: 'POST',
        body: JSON.stringify({
          designId,
          workspaceName: workspaceName.trim(),
        }),
      })

      showSuccess(
        tc('dialogs.createWorkspace.successTitle'),
        tc('dialogs.createWorkspace.successDescription', {
          workspaceName,
        }),
      )

      onOpenChange(false)
      setWorkspaceName('')
      onSuccess?.(response.data.workspaceId, response.data.branchName)
    } catch (error) {
      handleError(error, { title: tc('dialogs.createWorkspace.failedTitle') })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      e.preventDefault()
      handleCreate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            {tc('dialogs.createWorkspace.title')}
          </DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="dialogs.createWorkspace.description"
              values={{
                designName:
                  designName ?? tc('dialogs.createWorkspace.thisDesign'),
              }}
              components={{ strong: <strong /> }}
            />
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">
              {tc('dialogs.createWorkspace.workspaceNameLabel')}
            </Label>
            <Input
              id="workspace-name"
              placeholder={tc('dialogs.createWorkspace.namePlaceholder')}
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              autoFocus
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tc('dialogs.createWorkspace.nameHint')}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {tc('actions.cancel')}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!workspaceName.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tc('actions.creating')}
              </>
            ) : (
              <>
                <GitBranch className="h-4 w-4 mr-2" />
                {tc('dialogs.createWorkspace.createButton')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

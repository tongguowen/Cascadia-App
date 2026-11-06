// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { FileBox, Loader2 } from 'lucide-react'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'
import { apiFetch } from '@/api/client'
import { useErrorHandler } from '@/hooks/useErrorHandler'

interface ConvertToChangeOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceId: string
  workspaceName: string
  itemCount: number
  onSuccess?: (changeOrderId: string, changeOrderNumber: string) => void
}

export function ConvertToChangeOrderDialog({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
  itemCount,
  onSuccess,
}: ConvertToChangeOrderDialogProps) {
  const { t: tc } = useTranslation('common')
  const { handleError, showSuccess } = useErrorHandler()
  const [changeOrderTitle, setChangeOrderTitle] = useState('')
  const [changeOrderDescription, setChangeOrderDescription] = useState('')
  const [changeType, setChangeType] = useState<
    'ECO' | 'ECN' | 'MCO' | 'Deviation'
  >('ECO')
  const [deleteWorkspace, setDeleteWorkspace] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConvert = async () => {
    if (!changeOrderTitle.trim()) {
      handleError(new Error(tc('dialogs.convertToChangeOrder.titleRequired')), {
        title: tc('dialogs.convertToChangeOrder.validationTitle'),
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await apiFetch<{
        data: {
          ecoId: string
          ecoNumber: string
          itemsConverted: number
          itemsSkipped: number
          workspaceDeleted: boolean
        }
      }>(`/api/v1/workspaces/${workspaceId}/convert-to-change-order`, {
        method: 'POST',
        body: JSON.stringify({
          ecoTitle: changeOrderTitle.trim(),
          ecoDescription: changeOrderDescription.trim(),
          changeType,
          deleteWorkspace,
        }),
      })

      const skippedSuffix =
        response.data.itemsSkipped > 0
          ? tc('dialogs.convertToChangeOrder.skippedSuffix', {
              count: response.data.itemsSkipped,
            })
          : ''

      showSuccess(
        tc('dialogs.convertToChangeOrder.successTitle'),
        tc('dialogs.convertToChangeOrder.successDescription', {
          count: response.data.itemsConverted,
          ecoNumber: response.data.ecoNumber,
        }) + skippedSuffix,
      )

      onOpenChange(false)
      setChangeOrderTitle('')
      setChangeOrderDescription('')
      setDeleteWorkspace(false)
      onSuccess?.(response.data.ecoId, response.data.ecoNumber)
    } catch (error) {
      handleError(error, {
        title: tc('dialogs.convertToChangeOrder.failedTitle'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBox className="h-5 w-5" />
            {tc('dialogs.convertToChangeOrder.title')}
          </DialogTitle>
          <DialogDescription>
            <Trans
              i18nKey="dialogs.convertToChangeOrder.description"
              count={itemCount}
              values={{ workspaceName, count: itemCount }}
              components={{ strong: <strong /> }}
            />
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eco-title">
              {tc('dialogs.convertToChangeOrder.titleLabel')}
            </Label>
            <Input
              id="eco-title"
              placeholder={tc('dialogs.convertToChangeOrder.titlePlaceholder')}
              value={changeOrderTitle}
              onChange={(e) => setChangeOrderTitle(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eco-description">
              {tc('dialogs.convertToChangeOrder.descriptionLabel')}
            </Label>
            <Textarea
              id="eco-description"
              placeholder={tc(
                'dialogs.convertToChangeOrder.descriptionPlaceholder',
              )}
              value={changeOrderDescription}
              onChange={(e) => setChangeOrderDescription(e.target.value)}
              disabled={isSubmitting}
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="change-type">
              {tc('dialogs.convertToChangeOrder.changeTypeLabel')}
            </Label>
            <Select
              value={changeType}
              onValueChange={(value) =>
                setChangeType(value as 'ECO' | 'ECN' | 'MCO' | 'Deviation')
              }
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ECO">
                  {tc('dialogs.convertToChangeOrder.changeTypeEco')}
                </SelectItem>
                <SelectItem value="ECN">
                  {tc('dialogs.convertToChangeOrder.changeTypeEcn')}
                </SelectItem>
                <SelectItem value="MCO">
                  {tc('dialogs.convertToChangeOrder.changeTypeMco')}
                </SelectItem>
                <SelectItem value="Deviation">
                  {tc('dialogs.convertToChangeOrder.changeTypeDeviation')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="delete-workspace"
              checked={deleteWorkspace}
              onCheckedChange={(checked) =>
                setDeleteWorkspace(checked === true)
              }
              disabled={isSubmitting}
            />
            <label
              htmlFor="delete-workspace"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {tc('dialogs.convertToChangeOrder.deleteWorkspaceLabel')}
            </label>
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
            onClick={handleConvert}
            disabled={!changeOrderTitle.trim() || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tc('actions.converting')}
              </>
            ) : (
              <>
                <FileBox className="h-4 w-4 mr-2" />
                {tc('dialogs.convertToChangeOrder.convertButton')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

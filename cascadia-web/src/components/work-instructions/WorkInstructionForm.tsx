// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import {
  workInstructionEditSchema,
  workInstructionSchema,
} from '@cascadia/commons/items/types/work-instruction'
import { OutputPartField } from './OutputPartField'
import type { WorkInstruction } from '@cascadia/commons/items/types/work-instruction'
import {
  Button,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'
import { ItemNumberField } from '@/components/items/ItemNumberField'

interface WorkInstructionFormProps {
  workInstruction?: Partial<WorkInstruction>
  onSubmit: (data: WorkInstruction) => void | Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
  /**
   * Whether to ask for the output part. Creation only: the output part anchors
   * the work instruction's design, and moving an existing one between designs
   * is a re-point of its attachments, not a form edit — see the Attached Parts
   * panel on the detail page.
   */
  showOutputPart?: boolean
}

export function WorkInstructionForm({
  workInstruction,
  onSubmit,
  onCancel,
  isSubmitting,
  showOutputPart = false,
}: WorkInstructionFormProps) {
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')
  const form = useForm({
    defaultValues: {
      itemType: 'WorkInstruction' as const,
      itemNumber: '',
      name: '',
      description: '',
      estimatedTime: undefined as number | undefined,
      difficulty: undefined as 'Easy' | 'Medium' | 'Hard' | undefined,
      safetyNotes: '',
      requiredTools: '',
      outputPartId: undefined as string | undefined,
      ...workInstruction,
    },
    onSubmit: async ({ value }) => {
      const submissionData = {
        ...value,
        itemNumber: value.itemNumber || undefined,
      } as WorkInstruction

      // Creating requires the output part; editing does not restate it, since
      // it lives on an attachment rather than on the item.
      if (showOutputPart && !submissionData.outputPartId) {
        throw new Error('Select the part this work instruction builds')
      }

      // Validate after transforming empty strings to undefined
      const result = (
        showOutputPart ? workInstructionSchema : workInstructionEditSchema
      ).safeParse(submissionData)
      if (!result.success) {
        throw result.error
      }

      await onSubmit(submissionData)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Item Number */}
        <form.Field name="itemNumber">
          {(field) => (
            <ItemNumberField
              itemType="WorkInstruction"
              label={tp('workInstructions.form.instructionNumber')}
              name={field.name}
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]}
            />
          )}
        </form.Field>

        {/* Name */}
        <form.Field name="name">
          {(field) => (
            <FormField
              label={tp('workInstructions.form.instructionName')}
              error={field.state.meta.errors[0]}
              className="md:col-span-2"
            >
              <Input
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tp('workInstructions.form.namePlaceholder')}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* Output Part — anchors the work instruction to a design */}
        {showOutputPart && (
          <form.Field name="outputPartId">
            {(field) => (
              <OutputPartField
                value={field.state.value}
                onChange={(partId) => field.handleChange(partId)}
                error={field.state.meta.errors[0]}
                disabled={isSubmitting}
              />
            )}
          </form.Field>
        )}

        {/* Description */}
        <form.Field name="description">
          {(field) => (
            <FormField
              label={tc('fields.description')}
              error={field.state.meta.errors[0]}
              className="md:col-span-2"
            >
              <Textarea
                name={field.name}
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tp('workInstructions.form.descriptionPlaceholder')}
                rows={3}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* State */}
        <form.Field name="state">
          {(field) => (
            <FormField label={tc('columns.state')} error={field.state.meta.errors[0]}>
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger error={!!field.state.meta.errors.length}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">
                    {tc('enum.workInstructionState.Draft')}
                  </SelectItem>
                  <SelectItem value="InReview">
                    {tc('enum.workInstructionState.InReview')}
                  </SelectItem>
                  <SelectItem value="Approved">
                    {tc('enum.workInstructionState.Approved')}
                  </SelectItem>
                  <SelectItem value="Released">
                    {tc('enum.workInstructionState.Released')}
                  </SelectItem>
                  <SelectItem value="Obsolete">
                    {tc('enum.workInstructionState.Obsolete')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>

        {/* Difficulty */}
        <form.Field name="difficulty">
          {(field) => (
            <FormField label={tc('columns.difficulty')} error={field.state.meta.errors[0]}>
              <Select
                value={field.state.value || ''}
                onValueChange={(value) =>
                  field.handleChange(value as 'Easy' | 'Medium' | 'Hard')
                }
              >
                <SelectTrigger error={!!field.state.meta.errors.length}>
                  <SelectValue placeholder={tp('workInstructions.form.selectDifficulty')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">
                    {tc('enum.workInstructionDifficulty.Easy')}
                  </SelectItem>
                  <SelectItem value="Medium">
                    {tc('enum.workInstructionDifficulty.Medium')}
                  </SelectItem>
                  <SelectItem value="Hard">
                    {tc('enum.workInstructionDifficulty.Hard')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>

        {/* Estimated Time */}
        <form.Field name="estimatedTime">
          {(field) => (
            <FormField
              label={tp('workInstructions.form.estimatedTime')}
              error={field.state.meta.errors[0]}
            >
              <Input
                name={field.name}
                value={field.state.value?.toString() || ''}
                onChange={(e) => {
                  const val = e.target.value
                  field.handleChange(val ? parseInt(val, 10) : undefined)
                }}
                onBlur={field.handleBlur}
                type="number"
                min="0"
                placeholder={tp('workInstructions.form.estimatedTimePlaceholder')}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* Required Tools */}
        <form.Field name="requiredTools">
          {(field) => (
            <FormField
              label={tp('workInstructions.form.requiredTools')}
              error={field.state.meta.errors[0]}
            >
              <Input
                name={field.name}
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tp('workInstructions.form.requiredToolsPlaceholder')}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* Safety Notes */}
        <form.Field name="safetyNotes">
          {(field) => (
            <FormField
              label={tp('workInstructions.form.safetyNotes')}
              error={field.state.meta.errors[0]}
              className="md:col-span-2"
            >
              <Textarea
                name={field.name}
                value={field.state.value || ''}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tp('workInstructions.form.safetyNotesPlaceholder')}
                rows={3}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {tc('actions.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? tc('actions.saving')
            : workInstruction?.id
              ? tp('workInstructions.form.updateSubmit')
              : tp('workInstructions.form.createSubmit')}
        </Button>
      </div>
    </form>
  )
}

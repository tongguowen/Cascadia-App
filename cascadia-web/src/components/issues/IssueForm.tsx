// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useForm } from '@tanstack/react-form'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { issueSchema } from '@cascadia/commons/items/types/issue'
import type { Issue } from '@cascadia/commons/items/types/issue'
import { AttributesEditor } from '@/components/items/AttributesEditor'
import { ItemNumberField } from '@/components/items/ItemNumberField'
import { zodValidator } from '@/form-validation'
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

interface IssueFormProps {
  issue?: Partial<Issue>
  onSubmit: (data: Issue) => void | Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

export function IssueForm({
  issue,
  onSubmit,
  onCancel,
  isSubmitting,
}: IssueFormProps) {
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')
  const [attributes, setAttributes] = useState<Record<string, unknown>>(
    issue?.attributes ?? {},
  )
  const form = useForm({
    defaultValues: {
      itemType: 'Issue' as const,
      state: 'Open',
      severity: 'Medium' as const,
      priority: 'Medium' as const,
      itemNumber: '',
      name: '',
      description: '',
      category: undefined as string | undefined,
      assignedTo: '',
      resolution: '',
      rootCause: '',
      programId: '',
      ...issue,
    },
    validators: {
      onSubmit: zodValidator(issueSchema),
    },
    onSubmit: async ({ value }) => {
      const submissionData = {
        ...value,
        attributes,
      } as Issue
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
              itemType="Issue"
              label={tp('issues.form.issueNumber')}
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
              label={tp('issues.form.issueTitle')}
              error={field.state.meta.errors[0]}
              className="md:col-span-2"
            >
              <Input
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tp('issues.form.titlePlaceholder')}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

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
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tp('issues.form.descriptionPlaceholder')}
                rows={4}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* Severity */}
        <form.Field name="severity">
          {(field) => (
            <FormField label={tc('fields.severity')} error={field.state.meta.errors[0]}>
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  field.handleChange(
                    value as 'Critical' | 'High' | 'Medium' | 'Low',
                  )
                }
              >
                <SelectTrigger error={!!field.state.meta.errors.length}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['Critical', 'High', 'Medium', 'Low'] as const).map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {tc(`enum.severity.${value}`)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>

        {/* Priority */}
        <form.Field name="priority">
          {(field) => (
            <FormField label={tc('fields.priority')} error={field.state.meta.errors[0]}>
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  field.handleChange(
                    value as 'Critical' | 'High' | 'Medium' | 'Low',
                  )
                }
              >
                <SelectTrigger error={!!field.state.meta.errors.length}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['Critical', 'High', 'Medium', 'Low'] as const).map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {tc(`enum.priority.${value}`)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>

        {/* Category */}
        <form.Field name="category">
          {(field) => (
            <FormField label={tc('fields.category')} error={field.state.meta.errors[0]}>
              <Select
                value={field.state.value || ''}
                onValueChange={(value) =>
                  field.handleChange(value || undefined)
                }
              >
                <SelectTrigger error={!!field.state.meta.errors.length}>
                  <SelectValue placeholder={tc('labels.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      'Design',
                      'Manufacturing',
                      'Quality',
                      'Customer',
                      'Safety',
                      'Other',
                    ] as const
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {tc(`enum.issueCategory.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  {(
                    [
                      'Open',
                      'InProgress',
                      'Pending',
                      'Resolved',
                      'Verified',
                      'Closed',
                      'Cancelled',
                    ] as const
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {tc(`enum.issueStatus.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>

        {/* Assigned To */}
        <form.Field name="assignedTo">
          {(field) => (
            <FormField
              label={tc('fields.assignee')}
              error={field.state.meta.errors[0]}
              helpText="UUID of the assigned user"
            >
              <Input
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tc('placeholders.userUuid')}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* Root Cause */}
        <form.Field name="rootCause">
          {(field) => (
            <FormField
              label={tc('fields.rootCause')}
              error={field.state.meta.errors[0]}
              className="md:col-span-2"
            >
              <Textarea
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tp('issues.form.rootCausePlaceholder')}
                rows={3}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* Resolution */}
        <form.Field name="resolution">
          {(field) => (
            <FormField
              label={tc('fields.resolution')}
              error={field.state.meta.errors[0]}
              className="md:col-span-2"
            >
              <Textarea
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tp('issues.form.resolutionPlaceholder')}
                rows={3}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>
      </div>

      {/* Custom Attributes */}
      <AttributesEditor
        value={attributes}
        onChange={setAttributes}
        disabled={isSubmitting}
      />

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
            : issue?.id
              ? tp('issues.form.updateSubmit')
              : tp('issues.form.createSubmit')}
        </Button>
      </div>
    </form>
  )
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useForm, useStore } from '@tanstack/react-form'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Info } from 'lucide-react'
import { requirementSchema } from '@cascadia/commons/items/types/requirement'
import type { Requirement } from '@cascadia/commons/items/types/requirement'
import type { Design } from '@cascadia/commons/types/design'
import { DesignSelector } from '@/components/versioning/DesignSelector'
import { DesignPhaseIndicator } from '@/components/versioning/DesignPhaseIndicator'
import { BranchSelector } from '@/components/versioning/BranchSelector'
import { AttributesEditor } from '@/components/items/AttributesEditor'
import { ItemNumberField } from '@/components/items/ItemNumberField'
import { designStatusQuery } from '@/query'
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

interface RequirementFormProps {
  requirement?: Partial<Requirement>
  /** List of designs to select from */
  designs?: Array<Design>
  /** Default design ID for new requirements */
  defaultDesignId?: string
  /** Called when form is submitted. Includes branchId if design is in post-release phase. */
  onSubmit: (data: Requirement, branchId?: string) => void | Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

export function RequirementForm({
  requirement,
  designs = [],
  defaultDesignId,
  onSubmit,
  onCancel,
  isSubmitting,
}: RequirementFormProps) {
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')
  // Track selected design's protection status
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>()
  const [attributes, setAttributes] = useState<Record<string, unknown>>(
    requirement?.attributes ?? {},
  )
  const form = useForm({
    defaultValues: {
      itemType: 'Requirement' as const,
      designId: requirement?.designId || defaultDesignId || '',
      itemNumber: '',
      name: '',
      description: '',
      type: undefined as
        | 'Functional'
        | 'Non-Functional'
        | 'Performance'
        | 'Security'
        | 'Usability'
        | 'Business'
        | undefined,
      priority: undefined as
        'MustHave' | 'ShouldHave' | 'CouldHave' | 'WontHave' | undefined,
      source: '',
      category: '',
      acceptanceCriteria: '',
      verificationMethod: undefined as
        | 'Analysis'
        | 'Inspection'
        | 'Demonstration'
        | 'Test'
        | 'Documentation'
        | undefined,
      ...requirement,
    },
    validators: {
      onSubmit: zodValidator(requirementSchema),
    },
    onSubmit: async ({ value }) => {
      const submissionData = {
        ...value,
        attributes,
      } as Requirement
      // Pass branchId if product is in post-release phase
      await onSubmit(submissionData, selectedBranchId)
    },
  })

  // The design the form currently targets; its status decides whether a
  // branch must be chosen.
  const currentDesignId = useStore(form.store, (state) => state.values.designId)

  const { data: designStatus = null, isFetching: loadingStatus } = useQuery(
    designStatusQuery(currentDesignId, Boolean(currentDesignId)),
  )

  // A different design means a different set of branches, so the pick the
  // user made against the previous one no longer means anything.
  useEffect(() => {
    setSelectedBranchId(undefined)
  }, [currentDesignId])

  // Check if we're in post-release phase and need branch selection
  const isPostRelease = designStatus?.protection.phase === 'post-release'
  const needsBranchSelection = isPostRelease && !requirement?.id

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-6"
      data-testid="requirement-form"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Design - Required for versioning */}
        <form.Field name="designId">
          {(field) => (
            <FormField
              label={tc('fields.design')}
              required
              error={field.state.meta.errors[0]}
              helpText={tp('requirements.form.designHelp')}
              className="md:col-span-2"
            >
              <div className="flex items-center gap-4">
                <DesignSelector
                  designs={designs}
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  required
                  disabled={!!requirement?.id}
                />
                {field.state.value && !loadingStatus && designStatus && (
                  <DesignPhaseIndicator
                    designId={field.state.value}
                    status={designStatus}
                  />
                )}
              </div>
            </FormField>
          )}
        </form.Field>

        {/* Branch Selection - Only shown in post-release phase for new items */}
        {needsBranchSelection && currentDesignId && (
          <FormField
            label={tc('fields.targetBranch')}
            required
            error={
              !selectedBranchId
                ? tp('requirements.form.branchSelectRequired')
                : undefined
            }
            helpText={tp('requirements.form.branchHelpRequired')}
            className="md:col-span-2"
          >
            <BranchSelector
              designId={currentDesignId}
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              showMainOption={false}
              placeholder={tc('labels.selectBranch')}
            />
            <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm rounded-md">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{tp('requirements.form.changeControlNotice')}</span>
            </div>
          </FormField>
        )}

        {/* Item Number */}
        <form.Field name="itemNumber">
          {(field) => (
            <ItemNumberField
              itemType="Requirement"
              name={field.name}
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]}
              data-testid="requirement-item-number"
            />
          )}
        </form.Field>

        {/* Name */}
        <form.Field name="name">
          {(field) => (
            <FormField
              label={tc('fields.name')}
              error={field.state.meta.errors[0]}
              className="md:col-span-2"
            >
              <Input
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tp('requirements.form.namePlaceholder')}
                error={!!field.state.meta.errors.length}
                data-testid="requirement-name"
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
                placeholder={tp('requirements.form.descriptionPlaceholder')}
                rows={4}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* Type */}
        <form.Field name="type">
          {(field) => (
            <FormField label={tc('fields.type')} error={field.state.meta.errors[0]}>
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  field.handleChange(value as typeof field.state.value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('labels.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      'Functional',
                      'Non-Functional',
                      'Performance',
                      'Security',
                      'Usability',
                      'Business',
                    ] as const
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {tc(`enum.requirementType.${value}`)}
                    </SelectItem>
                  ))}
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
                  field.handleChange(value as typeof field.state.value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('labels.selectPriority')} />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      'MustHave',
                      'ShouldHave',
                      'CouldHave',
                      'WontHave',
                    ] as const
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {tc(`enum.requirementPriority.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>

        {/* Source */}
        <form.Field name="source">
          {(field) => (
            <FormField
              label={tc('columns.source')}
              error={field.state.meta.errors[0]}
              helpText={tp('requirements.form.sourceHelp')}
            >
              <Input
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tp('requirements.form.sourcePlaceholder')}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* Category */}
        <form.Field name="category">
          {(field) => (
            <FormField
              label={tc('fields.category')}
              error={field.state.meta.errors[0]}
              className="md:col-span-2"
            >
              <Input
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tp('requirements.form.categoryPlaceholder')}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* Acceptance Criteria */}
        <form.Field name="acceptanceCriteria">
          {(field) => (
            <FormField
              label={tp('requirements.form.acceptanceCriteria')}
              error={field.state.meta.errors[0]}
              className="md:col-span-2"
            >
              <Textarea
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tp('requirements.form.acceptanceCriteriaPlaceholder')}
                rows={4}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* Verification Method */}
        <form.Field name="verificationMethod">
          {(field) => (
            <FormField
              label={tp('requirements.form.verificationMethod')}
              error={field.state.meta.errors[0]}
              helpText={tp('requirements.form.verificationMethodHelp')}
            >
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  field.handleChange(value as typeof field.state.value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('labels.selectMethod')} />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      'Analysis',
                      'Inspection',
                      'Demonstration',
                      'Test',
                      'Documentation',
                    ] as const
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {tc(`enum.verificationMethod.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>

        {/* No verification-status field: the status is derived from the
            verifying tests' executions once the requirement exists. */}
      </div>

      {/* Custom Attributes */}
      <AttributesEditor
        value={attributes}
        onChange={setAttributes}
        disabled={isSubmitting}
      />

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
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
        <Button
          type="submit"
          disabled={isSubmitting || (needsBranchSelection && !selectedBranchId)}
          data-testid="requirement-submit"
        >
          {isSubmitting
            ? tc('actions.saving')
            : requirement?.id
              ? tp('requirements.form.updateSubmit')
              : tp('requirements.form.createSubmit')}
        </Button>
      </div>
    </form>
  )
}

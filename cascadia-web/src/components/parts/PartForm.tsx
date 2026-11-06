// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useForm, useStore } from '@tanstack/react-form'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { partSchema } from '@cascadia/commons/items/types/part'
import type { Part } from '@cascadia/commons/items/types/part'
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

interface PartFormProps {
  part?: Partial<Part>
  /** List of designs to select from */
  designs?: Array<Design>
  /** Default design ID for new parts */
  defaultDesignId?: string
  /** Called when form is submitted. Includes branchId if design is in post-release phase. */
  onSubmit: (data: Part, branchId?: string) => void | Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

export function PartForm({
  part,
  designs = [],
  defaultDesignId,
  onSubmit,
  onCancel,
  isSubmitting,
}: PartFormProps) {
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')
  // Track selected design's protection status
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>()
  const [attributes, setAttributes] = useState<Record<string, unknown>>(
    part?.attributes ?? {},
  )
  const form = useForm({
    defaultValues: {
      itemType: 'Part' as const,
      weightUnit: 'kg',
      costCurrency: 'USD',
      designId: part?.designId || defaultDesignId || '',
      itemNumber: '',
      name: '',
      description: '',
      partType: undefined as
        'Manufacture' | 'Purchase' | 'Software' | 'Phantom' | undefined,
      trackingMode: 'none' as 'none' | 'lot' | 'serial',
      material: '',
      weight: '',
      cost: '',
      leadTimeDays: undefined as number | undefined,
      ...part,
    },
    validators: {
      onSubmit: zodValidator(partSchema),
    },
    onSubmit: async ({ value }) => {
      const submissionData = {
        ...value,
        attributes,
      } as Part
      // Pass branchId if product is in post-release phase
      await onSubmit(submissionData, selectedBranchId)
    },
  })

  // Watch for design changes and fetch status
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
  // In post-release, branch is required. In pre-release, branch is optional (for private work).
  const showBranchSelector = currentDesignId && !part?.id
  const branchRequired = isPostRelease

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-6"
      data-testid="part-form"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Design - Required for versioning */}
        <form.Field name="designId">
          {(field) => (
            <FormField
              label={tc('fields.design')}
              required
              error={field.state.meta.errors[0]}
              helpText={tp('parts.form.designHelp')}
              className="md:col-span-2"
            >
              <div className="flex items-center gap-4">
                <DesignSelector
                  designs={designs}
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  required
                  disabled={!!part?.id}
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

        {/* Branch Selection - Available for new items in both phases */}
        {showBranchSelector && (
          <FormField
            label={tc('fields.targetBranch')}
            required={branchRequired}
            error={
              branchRequired && !selectedBranchId
                ? tp('parts.form.branchSelectRequired')
                : undefined
            }
            helpText={
              branchRequired
                ? tp('parts.form.branchHelpRequired')
                : tp('parts.form.branchHelpOptional')
            }
            className="md:col-span-2"
          >
            <BranchSelector
              designId={currentDesignId}
              value={selectedBranchId}
              onChange={setSelectedBranchId}
              showMainOption={!branchRequired}
              placeholder={
                branchRequired
                  ? tc('labels.selectBranch')
                  : tc('labels.mainBranchDefault')
              }
            />
            {branchRequired && (
              <div className="flex items-start gap-2 mt-2 p-3 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-sm rounded-md">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{tp('parts.form.changeControlNotice')}</span>
              </div>
            )}
            {!branchRequired && !selectedBranchId && (
              <div className="flex items-start gap-2 mt-2 p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm rounded-md">
                <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{tp('parts.form.mainBranchNotice')}</span>
              </div>
            )}
          </FormField>
        )}

        {/* Item Number */}
        <form.Field name="itemNumber">
          {(field) => (
            <ItemNumberField
              itemType="Part"
              name={field.name}
              value={field.state.value}
              onChange={field.handleChange}
              onBlur={field.handleBlur}
              error={field.state.meta.errors[0]}
              label={tc('fields.itemNumber')}
              data-testid="part-item-number"
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
                placeholder={tp('parts.form.namePlaceholder')}
                error={!!field.state.meta.errors.length}
                data-testid="part-name"
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
                placeholder={tp('parts.form.descriptionPlaceholder')}
                rows={4}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* Type */}
        <form.Field name="partType">
          {(field) => (
            <FormField label={tc('fields.type')} error={field.state.meta.errors[0]}>
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  field.handleChange(
                    value as
                      'Manufacture' | 'Purchase' | 'Software' | 'Phantom',
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('labels.selectOption')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manufacture">
                    {tp('parts.partType.Manufacture')}
                  </SelectItem>
                  <SelectItem value="Purchase">
                    {tp('parts.partType.Purchase')}
                  </SelectItem>
                  <SelectItem value="Software">
                    {tp('parts.partType.Software')}
                  </SelectItem>
                  <SelectItem value="Phantom">
                    {tp('parts.partType.Phantom')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>

        {/* Tracking Mode */}
        <form.Field name="trackingMode">
          {(field) => (
            <FormField
              label={tc('fields.tracking')}
              error={field.state.meta.errors[0]}
            >
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  field.handleChange(value as 'none' | 'lot' | 'serial')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder={tc('labels.selectOption')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {tp('parts.form.trackingNone')}
                  </SelectItem>
                  <SelectItem value="lot">
                    {tp('parts.form.trackingLot')}
                  </SelectItem>
                  <SelectItem value="serial">
                    {tp('parts.form.trackingSerial')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormField>
          )}
        </form.Field>

        {/* Material */}
        <form.Field name="material">
          {(field) => (
            <FormField label={tc('fields.material')} error={field.state.meta.errors[0]}>
              <Input
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={tp('parts.form.materialPlaceholder')}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* Weight */}
        <form.Field name="weight">
          {(field) => (
            <FormField label={tc('fields.weight')} error={field.state.meta.errors[0]}>
              <div className="flex gap-2">
                <Input
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="number"
                  step="0.001"
                  placeholder="0.000"
                  error={!!field.state.meta.errors.length}
                  className="flex-1"
                />
                <form.Field name="weightUnit">
                  {(unitField) => (
                    <Select
                      value={unitField.state.value}
                      onValueChange={(value) => unitField.handleChange(value)}
                    >
                      <SelectTrigger className="!w-20 !px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">
                          {tc('enum.weightUnit.kg')}
                        </SelectItem>
                        <SelectItem value="g">{tc('enum.weightUnit.g')}</SelectItem>
                        <SelectItem value="lb">
                          {tc('enum.weightUnit.lb')}
                        </SelectItem>
                        <SelectItem value="oz">
                          {tc('enum.weightUnit.oz')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </form.Field>
              </div>
            </FormField>
          )}
        </form.Field>

        {/* Cost */}
        <form.Field name="cost">
          {(field) => (
            <FormField label={tc('fields.cost')} error={field.state.meta.errors[0]}>
              <div className="flex gap-2">
                <form.Field name="costCurrency">
                  {(currencyField) => (
                    <Select
                      value={currencyField.state.value}
                      onValueChange={(value) =>
                        currencyField.handleChange(value)
                      }
                    >
                      <SelectTrigger className="!w-20 !px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </form.Field>
                <Input
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  error={!!field.state.meta.errors.length}
                  className="flex-1"
                />
              </div>
            </FormField>
          )}
        </form.Field>

        {/* Lead Time */}
        <form.Field name="leadTimeDays">
          {(field) => (
            <FormField
              label={tc('fields.leadTimeDays')}
              error={field.state.meta.errors[0]}
            >
              <Input
                name={field.name}
                value={field.state.value ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  field.handleChange(value ? parseInt(value, 10) : undefined)
                }}
                onBlur={field.handleBlur}
                type="number"
                placeholder="30"
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

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="part-cancel"
          >
            {tc('actions.cancel')}
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting || (branchRequired && !selectedBranchId)}
          data-testid="part-submit"
        >
          {isSubmitting
            ? tc('actions.saving')
            : part?.id
              ? tp('parts.form.updateSubmit')
              : tp('parts.form.createSubmit')}
        </Button>
      </div>
    </form>
  )
}

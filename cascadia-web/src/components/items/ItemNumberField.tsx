// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useTranslation } from 'react-i18next'
import { FormField, Input } from '@/components/ui'
import {
  allowsManualEntry,
  formatSchemeExample,
} from '@/items/numbering/format'

interface ItemNumberFieldProps {
  /** Item type key (e.g. 'Part') — drives the format example in the help text. */
  itemType: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string
  /** Field label. Defaults to "Item Number". */
  label?: string
  name?: string
  disabled?: boolean
  className?: string
  'data-testid'?: string
}

/**
 * Shared item-number input for create/edit forms.
 *
 * Centralizes the placeholder and help-text wording so every item type says the
 * same thing, and surfaces the type's auto-generated format (e.g. `PN-000001`).
 * Leaving the field blank is always valid — the server auto-generates the
 * number (see `baseItemSchema.itemNumber`).
 */
export function ItemNumberField({
  itemType,
  value,
  onChange,
  onBlur,
  error,
  label,
  name,
  disabled,
  className,
  'data-testid': testId,
}: ItemNumberFieldProps) {
  const { t: tc } = useTranslation('common')
  const example = formatSchemeExample(itemType)
  const exampleSuffix = example
    ? tc('labels.itemNumberExample', { example })
    : ''
  const helpText = allowsManualEntry(itemType)
    ? `${tc('labels.itemNumberHelpManual')}${exampleSuffix}`
    : `${tc('labels.itemNumberHelpAuto')}${exampleSuffix}`

  return (
    <FormField
      label={label ?? tc('fields.itemNumber')}
      error={error}
      helpText={helpText}
      className={className}
    >
      <Input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={tc('labels.itemNumberPlaceholder')}
        error={!!error}
        disabled={disabled}
        data-testid={testId}
      />
    </FormField>
  )
}

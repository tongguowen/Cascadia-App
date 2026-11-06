// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { Part } from '@cascadia/commons/items/types/part'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ViewEditBadge,
  ViewEditCurrency,
  ViewEditNumber,
  ViewEditText,
} from '@/components/ui'

// Shared with the design page's in-place part form, so both offer the one
// list of types.
export const PART_TYPE_OPTIONS = [
  { value: 'Manufacture', label: 'Manufacture' },
  { value: 'Purchase', label: 'Purchase' },
  { value: 'Software', label: 'Software' },
  { value: 'Phantom', label: 'Phantom' },
]

const WEIGHT_UNIT_OPTIONS = [
  { value: 'kg', label: 'kg' },
  { value: 'g', label: 'g' },
  { value: 'lb', label: 'lb' },
  { value: 'oz', label: 'oz' },
]

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD' },
  { value: 'EUR', label: 'EUR' },
  { value: 'GBP', label: 'GBP' },
  { value: 'JPY', label: 'JPY' },
]

/**
 * Production and sourcing fields: type, tracking policy, material, weight,
 * cost, lead time.
 *
 * Takes both parts because the page shows the *displayed* version's values
 * while reading, and the *edited* draft while editing — the same pair every
 * field card on this page threads. The option lists live here rather than in
 * PartDetail because nothing else uses them.
 */
export function PartManufacturingCard({
  edited,
  displayed,
  isEditing,
  onFieldChange,
}: {
  edited: Part
  displayed: Part
  isEditing: boolean
  onFieldChange: (field: keyof Part, value: unknown) => void
}) {
  const { t: tp } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const updateField = onFieldChange

  const partTypeOptions = useMemo(
    () =>
      PART_TYPE_OPTIONS.map((opt) => ({
        ...opt,
        label: tp(`parts.partType.${opt.value}`),
      })),
    [tp],
  )

  const trackingModeOptions = useMemo(
    () => [
      { value: 'none', label: tp('parts.form.trackingNone') },
      { value: 'lot', label: tp('parts.form.trackingLot') },
      { value: 'serial', label: tp('parts.form.trackingSerial') },
    ],
    [tp],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{tp('parts.detail.manufacturingTitle')}</CardTitle>
        <CardDescription>
          {tp('parts.detail.manufacturingDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ViewEditBadge
            label={tc('fields.type')}
            value={isEditing ? edited.partType : displayed.partType}
            onChange={(v) => updateField('partType', v)}
            isEditing={isEditing}
            options={partTypeOptions}
            variant={(v) => {
              const m: Record<
                string,
                'default' | 'secondary' | 'success' | 'outline'
              > = {
                Manufacture: 'default',
                Purchase: 'secondary',
                Software: 'success',
                Phantom: 'outline',
              }
              return m[v] || 'default'
            }}
          />
          <ViewEditBadge
            label={tc('fields.tracking')}
            value={
              isEditing
                ? (edited.trackingMode ?? 'none')
                : (displayed.trackingMode ?? 'none')
            }
            onChange={(v) => updateField('trackingMode', v)}
            isEditing={isEditing}
            options={trackingModeOptions}
            variant={(v) => {
              const m: Record<
                string,
                'default' | 'secondary' | 'success' | 'outline'
              > = {
                none: 'outline',
                lot: 'secondary',
                serial: 'success',
              }
              return m[v] || 'outline'
            }}
          />
          <ViewEditText
            label={tc('fields.material')}
            value={isEditing ? edited.material : displayed.material}
            onChange={(v) => updateField('material', v)}
            isEditing={isEditing}
            placeholder={tp('parts.detail.materialPlaceholder')}
          />
          <ViewEditNumber
            label={tc('fields.weight')}
            value={isEditing ? edited.weight : displayed.weight}
            onChange={(v) => updateField('weight', v)}
            isEditing={isEditing}
            unitOptions={WEIGHT_UNIT_OPTIONS}
            unitValue={isEditing ? edited.weightUnit : displayed.weightUnit}
            onUnitChange={(v) => updateField('weightUnit', v)}
            step="0.001"
          />
          <ViewEditCurrency
            label={tc('fields.cost')}
            value={isEditing ? edited.cost : displayed.cost}
            onChange={(v) => updateField('cost', v)}
            isEditing={isEditing}
            currency={isEditing ? edited.costCurrency : displayed.costCurrency}
            currencyOptions={CURRENCY_OPTIONS}
            onCurrencyChange={(v) => updateField('costCurrency', v)}
          />
          <ViewEditNumber
            label={tc('fields.leadTimeDays')}
            value={isEditing ? edited.leadTimeDays : displayed.leadTimeDays}
            onChange={(v) =>
              updateField('leadTimeDays', v ? parseInt(v) : undefined)
            }
            isEditing={isEditing}
            unit={tp('parts.detail.unitDays')}
            min={0}
          />
        </dl>
      </CardContent>
    </Card>
  )
}

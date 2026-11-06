// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowRight, Check, Info, Sparkles } from 'lucide-react'
import {
  BOM_FIELDS,
  checkRequiredFieldsMapped,
  getAllFieldsForItemType,
  getFieldsForType,
  getImportConfig,
  getUnmappedColumns,
  updateMapping,
} from '@cascadia/commons/import'
import type {
  ColumnMapping,
  ImportItemType,
  ParsedFile,
} from '@cascadia/commons/import'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Badge } from '@/components/ui'
import { cn } from '@/utils'

interface ColumnMappingStepProps {
  itemType?: ImportItemType
  parsedFile: ParsedFile
  mappings: Array<ColumnMapping>
  onMappingsChange: (mappings: Array<ColumnMapping>) => void
}

/**
 * Step 3: Map source columns to target fields.
 */
export function ColumnMappingStep({
  itemType = 'Part',
  parsedFile,
  mappings,
  onMappingsChange,
}: ColumnMappingStepProps) {
  const { t: tp } = useTranslation('pages')
  const config = getImportConfig(itemType)
  const itemFields = getFieldsForType(itemType)

  // Check required fields
  const { allMapped, missingFields } = useMemo(
    () => checkRequiredFieldsMapped(mappings, itemType),
    [mappings, itemType],
  )

  // Count auto-detected vs manual mappings
  const stats = useMemo(() => {
    const autoDetected = mappings.filter(
      (m) => m.targetField && m.confidence > 0.5,
    ).length
    const totalMapped = mappings.filter((m) => m.targetField).length
    return { autoDetected, totalMapped }
  }, [mappings])

  // Get unmapped columns that will become custom attributes
  const unmappedForAttributes = useMemo(
    () => getUnmappedColumns(mappings),
    [mappings],
  )

  const handleMappingChange = useCallback(
    (sourceIndex: number, targetField: string | null) => {
      const newMappings = updateMapping(
        mappings,
        sourceIndex,
        targetField === 'skip' ? null : targetField,
      )
      onMappingsChange(newMappings)
    },
    [mappings, onMappingsChange],
  )

  // Get available fields that aren't already mapped (separate item and BOM fields)
  const getAvailableFields = useCallback(
    (currentMapping: ColumnMapping) => {
      const usedFields = new Set(
        mappings
          .filter(
            (m) =>
              m.sourceIndex !== currentMapping.sourceIndex && m.targetField,
          )
          .map((m) => m.targetField),
      )
      const availableItemFields = itemFields.filter(
        (f) =>
          !usedFields.has(f.field) || f.field === currentMapping.targetField,
      )
      // Only include BOM fields for Parts
      const availableBomFields = config.supportsBom
        ? BOM_FIELDS.filter(
            (f) =>
              !usedFields.has(f.field) ||
              f.field === currentMapping.targetField,
          )
        : []
      return { itemFields: availableItemFields, bomFields: availableBomFields }
    },
    [mappings, itemFields, config.supportsBom],
  )

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {tp('import.columnMapping.title')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {tp('import.columnMapping.subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-slate-600 dark:text-slate-400">
            {tp('import.columnMapping.autoDetected', {
              count: stats.autoDetected,
            })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-slate-600 dark:text-slate-400">
            {tp('import.columnMapping.mapped', { count: stats.totalMapped })}
          </span>
        </div>
      </div>

      {/* Required fields warning */}
      {!allMapped && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="text-sm text-amber-800 dark:text-amber-200">
              {tp('import.columnMapping.requiredNotMapped', {
                fields: missingFields.join(', '),
              })}
            </span>
          </div>
        </div>
      )}

      {/* Custom attributes info */}
      {unmappedForAttributes.length > 0 && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <span className="text-sm text-blue-800 dark:text-blue-200">
                {tp('import.columnMapping.unmappedAttributes', {
                  count: unmappedForAttributes.length,
                })}
              </span>
              <div className="flex flex-wrap gap-1 mt-2">
                {unmappedForAttributes.map(({ sourceColumn, attributeKey }) => (
                  <Badge
                    key={sourceColumn}
                    variant="secondary"
                    className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-200"
                  >
                    {sourceColumn} → {attributeKey}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mapping Table */}
      <div className="border rounded-lg max-h-[40vh] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400 w-1/3">
                {tp('import.columnMapping.sourceColumn')}
              </th>
              <th className="px-2 py-3 w-10"></th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400 w-1/3">
                {tp('import.columnMapping.targetField')}
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600 dark:text-slate-400">
                {tp('import.columnMapping.sampleData')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {mappings.map((mapping) => {
              const { itemFields: availableItemFields, bomFields } =
                getAvailableFields(mapping)
              const allFieldsForType = getAllFieldsForItemType(itemType)
              const fieldConfig = allFieldsForType.find(
                (f) => f.field === mapping.targetField,
              )
              // Get sample value from first non-empty row
              const sampleValue = parsedFile.rows
                .slice(0, 5)
                .map((row) => row[mapping.sourceColumn])
                .find((v) => v !== undefined && v !== '')

              return (
                <tr
                  key={mapping.sourceIndex}
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {mapping.sourceColumn}
                      </span>
                      {mapping.confidence >= 0.8 && mapping.targetField && (
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          {tp('import.columnMapping.autoBadge')}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={mapping.targetField || 'skip'}
                      onValueChange={(val) =>
                        handleMappingChange(mapping.sourceIndex, val)
                      }
                    >
                      <SelectTrigger
                        className={cn(
                          'w-full',
                          !mapping.targetField && 'text-slate-400',
                        )}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">
                          <span className="text-slate-400">
                            {tp('import.columnMapping.skipColumn')}
                          </span>
                        </SelectItem>
                        <SelectGroup>
                          <SelectLabel>
                            {tp('import.columnMapping.fieldsGroup', {
                              label: config.singularLabel,
                            })}
                          </SelectLabel>
                          {availableItemFields.map((field) => (
                            <SelectItem key={field.field} value={field.field}>
                              <div className="flex items-center gap-2">
                                <span>{field.label}</span>
                                {field.required && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs"
                                  >
                                    {tp('import.columnMapping.required')}
                                  </Badge>
                                )}
                                {field.autoGenerate && (
                                  <Badge variant="outline" className="text-xs">
                                    {tp('import.columnMapping.autoBadge')}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        {config.supportsBom && bomFields.length > 0 && (
                          <SelectGroup>
                            <SelectLabel>
                              {tp('import.columnMapping.bomFields')}
                            </SelectLabel>
                            {bomFields.map((field) => (
                              <SelectItem key={field.field} value={field.field}>
                                <div className="flex items-center gap-2">
                                  <span>{field.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        )}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400 truncate block max-w-[200px]">
                      {sampleValue !== undefined ? String(sampleValue) : '-'}
                    </span>
                    {fieldConfig?.type === 'enum' &&
                      sampleValue !== undefined && (
                        <span className="text-xs text-slate-400">
                          {tp('import.columnMapping.expected', {
                            values: fieldConfig.enumValues?.join(', '),
                          })}
                        </span>
                      )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Field Legend */}
      <div className="text-sm text-slate-600 dark:text-slate-400">
        <p className="font-medium mb-2">
          {tp('import.columnMapping.fieldTypesTitle')}
        </p>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="destructive" className="text-xs">
              {tp('import.columnMapping.required')}
            </Badge>
            <span>{tp('import.columnMapping.mustBeMapped')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {tp('import.columnMapping.autoBadge')}
            </Badge>
            <span>{tp('import.columnMapping.autoGeneratedHint')}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  GitBranch,
  XCircle,
} from 'lucide-react'
import {
  getBomSummary,
  getImportConfig,
  getValidationSummary,
  validateBomStructure,
} from '@cascadia/commons/import'
import type {
  BomDetectionResult,
  BomRelationship,
  ImportItemType,
  ValidatedRow,
} from '@cascadia/commons/import'
import { Badge, Button } from '@/components/ui'
import { cn } from '@/utils'

interface ValidationPreviewStepProps {
  itemType?: ImportItemType
  validatedRows: Array<ValidatedRow>
  bomFormat: BomDetectionResult | null
  bomRelationships: Array<BomRelationship>
}

type FilterType = 'all' | 'valid' | 'invalid'

/**
 * Step 4: Review validation results before import.
 */
export function ValidationPreviewStep({
  itemType = 'Part',
  validatedRows,
  bomFormat,
  bomRelationships,
}: ValidationPreviewStepProps) {
  const { t: tp } = useTranslation('pages')
  const config = getImportConfig(itemType)
  const [filter, setFilter] = useState<FilterType>('all')

  const summary = useMemo(
    () => getValidationSummary(validatedRows),
    [validatedRows],
  )

  // BOM validation (only for item types that support BOM)
  const bomValidation = useMemo(
    () =>
      config.supportsBom && bomRelationships.length > 0
        ? validateBomStructure(bomRelationships)
        : null,
    [bomRelationships, config.supportsBom],
  )

  const bomSummary = useMemo(
    () =>
      config.supportsBom && bomRelationships.length > 0
        ? getBomSummary(bomRelationships)
        : null,
    [bomRelationships, config.supportsBom],
  )

  const filteredRows = useMemo(() => {
    switch (filter) {
      case 'valid':
        return validatedRows.filter((r) => r.isValid)
      case 'invalid':
        return validatedRows.filter((r) => !r.isValid)
      default:
        return validatedRows
    }
  }, [validatedRows, filter])

  // Get the columns to display (from mapped data keys)
  const displayColumns = useMemo(() => {
    if (validatedRows.length === 0) return []
    const allKeys = new Set<string>()
    for (const row of validatedRows) {
      Object.keys(row.mappedData).forEach((k) => allKeys.add(k))
    }
    // Prioritize common fields
    const priority = [
      'itemNumber',
      'name',
      'description',
      'partType',
      'material',
    ]
    const sorted = [...allKeys].sort((a, b) => {
      const aIdx = priority.indexOf(a)
      const bIdx = priority.indexOf(b)
      if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx
      if (aIdx >= 0) return -1
      if (bIdx >= 0) return 1
      return a.localeCompare(b)
    })
    return sorted.slice(0, 5) // Show max 5 columns
  }, [validatedRows])

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {tp('import.validationPreview.title')}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {tp('import.validationPreview.subtitle')}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800">
          <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            {summary.totalRows}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {tp('import.validationPreview.totalRows')}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/30">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-3xl font-bold text-green-700 dark:text-green-400">
              {summary.validRows}
            </span>
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">
            {tp('import.validationPreview.valid')}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="text-3xl font-bold text-red-700 dark:text-red-400">
              {summary.invalidRows}
            </span>
          </div>
          <div className="text-sm text-red-600 dark:text-red-400">
            {tp('import.validationPreview.invalid')}
          </div>
        </div>
      </div>

      {/* BOM Detection Info */}
      {bomFormat && bomFormat.format !== 'flat' && (
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200">
                {tp('import.validationPreview.bomDetected')}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                {tp('import.validationPreview.formatLabel')}{' '}
                {bomFormat.format === 'level-based'
                  ? tp('import.validationPreview.formatLevelBased')
                  : tp('import.validationPreview.formatParentChild')}
              </p>
              {bomSummary && (
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {tp('import.validationPreview.relationshipsWillBeCreated', {
                    count: bomSummary.totalRelationships,
                  })}
                  {bomSummary.externalParentCount > 0 && (
                    <span className="ml-1">
                      {tp('import.validationPreview.externalParents', {
                        count: bomSummary.externalParentCount,
                      })}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BOM Validation Errors */}
      {bomValidation && bomValidation.errors.length > 0 && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-900/20 dark:border-red-800">
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                {tp('import.validationPreview.bomStructureErrors')}
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-red-700 dark:text-red-300">
                {bomValidation.errors.map((error, i) => (
                  <li key={i}>
                    {error.message}
                    {error.itemNumber && <span> ({error.itemNumber})</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* BOM Validation Warnings */}
      {bomValidation && bomValidation.warnings.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {tp('import.validationPreview.bomWarnings')}
              </p>
              <ul className="list-disc list-inside mt-2 text-sm text-amber-700 dark:text-amber-300">
                {bomValidation.warnings.map((warning, i) => (
                  <li key={i}>{warning.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Error Summary */}
      {summary.invalidRows > 0 && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                {tp('import.validationPreview.rowsHaveErrors', {
                  count: summary.invalidRows,
                })}
              </p>
              <div className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                <p>{tp('import.validationPreview.commonIssues')}</p>
                <ul className="list-disc list-inside mt-1">
                  {Object.entries(summary.errorsByField)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 3)
                    .map(([field, count]) => (
                      <li key={field}>
                        {tp('import.validationPreview.fieldErrors', {
                          field,
                          count,
                        })}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400" />
        <span className="text-sm text-slate-600 dark:text-slate-400 mr-2">
          {tp('import.validationPreview.show')}
        </span>
        <div className="flex gap-1">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            {tp('import.validationPreview.all', { count: summary.totalRows })}
          </Button>
          <Button
            variant={filter === 'valid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('valid')}
          >
            {tp('import.validationPreview.validFilter', {
              count: summary.validRows,
            })}
          </Button>
          <Button
            variant={filter === 'invalid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('invalid')}
          >
            {tp('import.validationPreview.invalidFilter', {
              count: summary.invalidRows,
            })}
          </Button>
        </div>
      </div>

      {/* Data Preview Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-400 font-medium w-16">
                  {tp('import.validationPreview.colRow')}
                </th>
                <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-400 font-medium w-20">
                  {tp('import.validationPreview.colStatus')}
                </th>
                {displayColumns.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2 text-left text-slate-600 dark:text-slate-400 font-medium"
                  >
                    {col}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-slate-600 dark:text-slate-400 font-medium">
                  {tp('import.validationPreview.colIssues')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {filteredRows.map((row) => (
                <tr
                  key={row.rowNumber}
                  className={cn(
                    'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                    !row.isValid && 'bg-red-50/50 dark:bg-red-900/10',
                  )}
                >
                  <td className="px-3 py-2 text-slate-500">{row.rowNumber}</td>
                  <td className="px-3 py-2">
                    {row.isValid ? (
                      <Badge variant="default" className="bg-green-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {tp('import.validationPreview.statusValid')}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        {tp('import.validationPreview.statusError')}
                      </Badge>
                    )}
                  </td>
                  {displayColumns.map((col) => (
                    <td
                      key={col}
                      className="px-3 py-2 text-slate-700 dark:text-slate-300 max-w-[150px] truncate"
                    >
                      {row.mappedData[col] !== undefined
                        ? String(row.mappedData[col])
                        : '-'}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      {row.errors.map((error, i) => (
                        <span
                          key={i}
                          className="text-xs text-red-600 dark:text-red-400"
                        >
                          {error.field}: {error.message}
                        </span>
                      ))}
                      {row.warnings.map((warning, i) => (
                        <span
                          key={i}
                          className="text-xs text-amber-600 dark:text-amber-400"
                        >
                          {warning.field}: {warning.message}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination info */}
      <div className="text-sm text-slate-500 text-center">
        {tp('import.validationPreview.showingRows', {
          shown: filteredRows.length,
          total: summary.totalRows,
        })}
      </div>

      {/* Info about what will be imported */}
      {summary.invalidRows > 0 && summary.validRows > 0 && (
        <div className="text-sm text-slate-500 text-center">
          {tp('import.validationPreview.willImportValid', {
            valid: summary.validRows,
            invalid: summary.invalidRows,
            items:
              summary.validRows !== 1
                ? config.pluralLabel.toLowerCase()
                : config.singularLabel.toLowerCase(),
          })}
        </div>
      )}
    </div>
  )
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  GitBranch,
  Loader2,
  PartyPopper,
  XCircle,
} from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { getImportConfig, getValidRows } from '@cascadia/commons/import'
import type {
  BomImportResult,
  BomRelationship,
  ImportContext,
  ImportItemType,
  ValidatedRow,
} from '@cascadia/commons/import'
import { Badge, Progress } from '@/components/ui'
import { apiFetch } from '@/api/client'

interface ImportProgressStepProps {
  itemType?: ImportItemType
  context: ImportContext
  validatedRows: Array<ValidatedRow>
  bomRelationships: Array<BomRelationship>
  onComplete: (result: BomImportResult) => void
}

type ImportStatus = 'idle' | 'importing' | 'complete' | 'error'

/**
 * Step 5: Execute import and show progress.
 */
export function ImportProgressStep({
  itemType = 'Part',
  context,
  validatedRows,
  bomRelationships,
  onComplete,
}: ImportProgressStepProps) {
  const { t: tp } = useTranslation('pages')
  const config = getImportConfig(itemType)
  const itemsLower = config.pluralLabel.toLowerCase()
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<BomImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasStarted = useRef(false)

  const validRows = getValidRows(validatedRows)
  const hasBomRelationships = config.supportsBom && bomRelationships.length > 0

  // The import is an action, not a read: it lives in a mutation, and the
  // effect below only fires it once when the step opens.
  const runImport = useMutation({
    mutationFn: async () => {
      // Prepare the import request based on item type
      let rows: Array<Record<string, unknown>>
      let requestBody: Record<string, unknown>

      if (itemType === 'Part') {
        rows = validRows.map((row) => ({
          itemNumber: row.mappedData.itemNumber as string | undefined,
          name: row.mappedData.name as string,
          revision: (row.mappedData.revision as string) || '-',
          description: row.mappedData.description as string | undefined,
          partType: row.mappedData.partType as
            'Manufacture' | 'Purchase' | 'Software' | 'Phantom' | undefined,
          material: row.mappedData.material as string | undefined,
          weight: row.mappedData.weight as string | undefined,
          weightUnit: row.mappedData.weightUnit as string | undefined,
          cost: row.mappedData.cost as string | undefined,
          costCurrency: row.mappedData.costCurrency as string | undefined,
          leadTimeDays: row.mappedData.leadTimeDays as number | undefined,
          attributes: row.mappedData.attributes as
            Record<string, unknown> | undefined,
        }))

        // Prepare BOM relationships for API
        const bomRelationshipsForApi = bomRelationships.map((rel) => ({
          parentItemNumber: rel.parentItemNumber,
          childItemNumber: rel.childItemNumber,
          quantity: rel.quantity,
          findNumber: rel.findNumber,
          referenceDesignator: rel.referenceDesignator,
        }))

        requestBody = {
          designId: context.designId,
          branchId: context.importAsReleased ? undefined : context.branchId,
          rows,
          bypassBranchProtection: context.designPhase === 'pre-release',
          importAsReleased: context.importAsReleased,
          bomRelationships:
            bomRelationshipsForApi.length > 0
              ? bomRelationshipsForApi
              : undefined,
        }
      } else if (itemType === 'Document') {
        rows = validRows.map((row) => ({
          itemNumber: row.mappedData.itemNumber as string | undefined,
          name: row.mappedData.name as string,
          revision: (row.mappedData.revision as string) || '-',
          description: row.mappedData.description as string | undefined,
          docType: row.mappedData.docType as string | undefined,
          fileName: row.mappedData.fileName as string | undefined,
          mimeType: row.mappedData.mimeType as string | undefined,
          attributes: row.mappedData.attributes as
            Record<string, unknown> | undefined,
        }))

        requestBody = {
          designId: context.designId,
          branchId: context.importAsReleased ? undefined : context.branchId,
          rows,
          bypassBranchProtection: context.designPhase === 'pre-release',
          importAsReleased: context.importAsReleased,
        }
      } else if (itemType === 'Requirement') {
        rows = validRows.map((row) => ({
          itemNumber: row.mappedData.itemNumber as string | undefined,
          name: row.mappedData.name as string,
          revision: (row.mappedData.revision as string) || '-',
          description: row.mappedData.description as string | undefined,
          type: row.mappedData.type as string | undefined,
          priority: row.mappedData.priority as string | undefined,
          category: row.mappedData.category as string | undefined,
          source: row.mappedData.source as string | undefined,
          acceptanceCriteria: row.mappedData.acceptanceCriteria as
            string | undefined,
          verificationMethod: row.mappedData.verificationMethod as
            string | undefined,
          parentItemNumber: row.mappedData.parentItemNumber as
            string | undefined,
          attributes: row.mappedData.attributes as
            Record<string, unknown> | undefined,
        }))

        requestBody = {
          designId: context.designId,
          branchId: context.importAsReleased ? undefined : context.branchId,
          rows,
          bypassBranchProtection: context.designPhase === 'pre-release',
          importAsReleased: context.importAsReleased,
        }
      } else {
        // Issue
        rows = validRows.map((row) => ({
          itemNumber: row.mappedData.itemNumber as string | undefined,
          name: row.mappedData.name as string,
          description: row.mappedData.description as string | undefined,
          severity: row.mappedData.severity as string | undefined,
          priority: row.mappedData.priority as string | undefined,
          category: row.mappedData.category as string | undefined,
          reportedDate: row.mappedData.reportedDate as string | undefined,
          resolution: row.mappedData.resolution as string | undefined,
          rootCause: row.mappedData.rootCause as string | undefined,
          attributes: row.mappedData.attributes as
            Record<string, unknown> | undefined,
        }))

        requestBody = {
          programId: context.programId,
          rows,
        }
      }

      setProgress(30)

      // Make the API call using the appropriate endpoint
      const response = await apiFetch<{ data: { result: BomImportResult } }>(
        config.apiEndpoint,
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        },
      )
      return response.data.result
    },
    onSuccess: (imported) => {
      setProgress(100)
      setResult(imported)
      setStatus('complete')
      onComplete(imported)
    },
    onError: (err: unknown) => {
      setStatus('error')
      setError(
        err instanceof Error
          ? err.message
          : tp('import.progress.importFailedGeneric'),
      )
    },
  })

  useEffect(() => {
    // Prevent double execution in StrictMode
    if (hasStarted.current || validRows.length === 0) return
    hasStarted.current = true
    setStatus('importing')
    setProgress(10)
    // Fires exactly once when the step opens, guarded by the ref above.
    runImport.mutate()
  }, [])

  // Render based on status
  if (status === 'idle' || status === 'importing') {
    const itemLabel =
      validRows.length === 1
        ? config.singularLabel.toLowerCase()
        : config.pluralLabel.toLowerCase()
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 text-cyan-600 dark:text-cyan-400 animate-spin mb-6" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {tp('import.progress.importing', { items: itemsLower })}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {tp('import.progress.creating', {
            count: validRows.length,
            itemLabel,
          })}
          {hasBomRelationships && (
            <span>
              {tp('import.progress.bomRelationships', {
                count: bomRelationships.length,
              })}
            </span>
          )}
        </p>
        <div className="w-64">
          <Progress value={progress} />
        </div>
        <p className="text-sm text-slate-500 mt-2">{progress}%</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <XCircle className="h-12 w-12 text-red-500 mb-6" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
          {tp('import.progress.failed')}
        </h3>
        <p className="text-sm text-red-600 dark:text-red-400 max-w-md text-center">
          {error}
        </p>
      </div>
    )
  }

  // Check if there are any errors (parts or relationships)
  const hasAnyErrors =
    result && (result.errorCount > 0 || result.relationshipsFailed > 0)
  const hasRelationshipResults =
    result &&
    (result.relationshipsCreated > 0 || result.relationshipsFailed > 0)

  // Complete state
  const successLabel =
    result?.successCount === 1
      ? config.singularLabel.toLowerCase()
      : config.pluralLabel.toLowerCase()
  return (
    <div className="flex flex-col items-center justify-center py-8">
      {result && !hasAnyErrors ? (
        <>
          <div className="relative mb-6">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
            <PartyPopper className="h-6 w-6 text-amber-500 absolute -top-1 -right-1 animate-bounce" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {tp('import.progress.complete')}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {tp('import.progress.successCreated', {
              count: result.successCount,
              itemLabel: successLabel,
            })}
            {result.relationshipsCreated > 0 && (
              <span>
                {tp('import.progress.bomCreated', {
                  count: result.relationshipsCreated,
                })}
              </span>
            )}
          </p>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-16 w-16 text-amber-500 mb-6" />
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {tp('import.progress.completedWithIssues')}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {tp('import.progress.partialCreated', {
              success: result?.successCount || 0,
              total: result?.totalRows || 0,
              items: itemsLower,
            })}
            {hasRelationshipResults && result && (
              <span>
                {tp('import.progress.partialRelationships', {
                  created: result.relationshipsCreated,
                  total:
                    result.relationshipsCreated + result.relationshipsFailed,
                })}
              </span>
            )}
          </p>
        </>
      )}

      {/* Results Summary */}
      {result && (
        <div className="w-full max-w-md space-y-4">
          {/* Success Summary */}
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  {tp('import.progress.createdSummary', {
                    count: result.successCount,
                    itemLabel:
                      result.successCount === 1
                        ? config.singularLabel.toLowerCase()
                        : config.pluralLabel.toLowerCase(),
                  })}
                </p>
                {result.createdItems.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-1">
                      {result.createdItems.slice(0, 10).map((item) => (
                        <Badge
                          key={item.itemId}
                          variant="outline"
                          className="text-xs"
                        >
                          {item.itemNumber}
                        </Badge>
                      ))}
                      {result.createdItems.length > 10 && (
                        <Badge variant="outline" className="text-xs">
                          {tp('import.progress.moreItems', {
                            count: result.createdItems.length - 10,
                          })}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Summary */}
          {result.errorCount > 0 && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    {tp('import.progress.rowsFailed', {
                      count: result.errorCount,
                    })}
                  </p>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      {result.failedRows.slice(0, 5).map((failed) => (
                        <li key={failed.rowNumber}>
                          {tp('import.progress.rowError', {
                            row: failed.rowNumber,
                            errors: failed.errors.join(', '),
                          })}
                        </li>
                      ))}
                      {result.failedRows.length > 5 && (
                        <li>
                          {tp('import.progress.andMoreFailed', {
                            count: result.failedRows.length - 5,
                          })}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* BOM Relationship Success Summary */}
          {result.relationshipsCreated > 0 && (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <GitBranch className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <p className="font-medium text-blue-800 dark:text-blue-200">
                  {tp('import.progress.bomCreatedSummary', {
                    count: result.relationshipsCreated,
                  })}
                </p>
              </div>
            </div>
          )}

          {/* BOM Relationship Error Summary */}
          {result.relationshipsFailed > 0 && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    {tp('import.progress.bomFailedSummary', {
                      count: result.relationshipsFailed,
                    })}
                  </p>
                  <div className="mt-2 max-h-32 overflow-y-auto">
                    <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                      {result.failedRelationships
                        .slice(0, 5)
                        .map((failed, i) => (
                          <li key={i}>
                            {tp('import.progress.relationshipError', {
                              parent: failed.parentItemNumber,
                              child: failed.childItemNumber,
                              error: failed.error,
                            })}
                          </li>
                        ))}
                      {result.failedRelationships.length > 5 && (
                        <li>
                          {tp('import.progress.andMoreFailed', {
                            count: result.failedRelationships.length - 5,
                          })}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

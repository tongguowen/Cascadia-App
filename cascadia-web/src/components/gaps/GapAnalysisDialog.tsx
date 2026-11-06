// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Cog,
  Factory,
  FileText,
  FlaskConical,
  Loader2,
  Search,
} from 'lucide-react'
import { GapSummaryCards } from './GapSummaryCards'
import { GapResultsTable } from './GapResultsTable'
import type {
  GapAnalysisResult,
  GapSeverity,
  GapType,
} from '@cascadia/commons/services/types/gap-analysis'
import type { ThreadDomain } from '@cascadia/commons/thread/types'
import { apiFetch } from '@/api/client'
import { cn } from '@/utils'
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from '@/components/ui'

interface GapAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  designId: string
  designCode: string
  designName?: string | null
}

type WizardStep = 'configure' | 'analyzing' | 'results'

const GAP_TYPES: Array<GapType> = [
  'unallocated_requirement',
  'unsatisfied_requirement',
  'unverified_requirement',
  'suspect_requirement',
  'untested_part',
  'unmapped_ebom_item',
  'orphan_mbom_item',
]

const GAP_SEVERITIES: Array<GapSeverity> = ['critical', 'major', 'minor']

const SEVERITY_COLORS: Record<GapSeverity, string> = {
  critical: 'bg-red-600',
  major: 'bg-orange-500',
  minor: 'bg-blue-400',
}

const DOMAIN_OPTIONS: Array<{
  value: ThreadDomain
  Icon: typeof Cog
}> = [
  { value: 'requirements', Icon: FileText },
  { value: 'engineering', Icon: Cog },
  { value: 'manufacturing', Icon: Factory },
  { value: 'validation', Icon: FlaskConical },
]

/**
 * Wizard-style dialog for running gap analysis on a design.
 */
export function GapAnalysisDialog({
  open,
  onOpenChange,
  designId,
  designCode,
  designName,
}: GapAnalysisDialogProps) {
  const { t: tc } = useTranslation('common')

  const gapTypeOptions = useMemo(
    () =>
      GAP_TYPES.map((value) => ({
        value,
        label: tc(`dialogs.gap.types.${value}.label`),
        description: tc(`dialogs.gap.types.${value}.description`),
      })),
    [tc],
  )

  const severityOptions = useMemo(
    () =>
      GAP_SEVERITIES.map((value) => ({
        value,
        label: tc(`labels.severity.${value}`),
        color: SEVERITY_COLORS[value],
      })),
    [tc],
  )

  const domainOptions = useMemo(
    () =>
      DOMAIN_OPTIONS.map(({ value, Icon }) => ({
        value,
        label: tc(`labels.domains.${value}`),
        Icon,
      })),
    [tc],
  )

  // Wizard state
  const [step, setStep] = useState<WizardStep>('configure')

  // Configuration
  const [includeTypes, setIncludeTypes] = useState<Array<GapType>>([
    'unallocated_requirement',
    'unsatisfied_requirement',
    'unverified_requirement',
    'suspect_requirement',
    'untested_part',
    'unmapped_ebom_item',
    'orphan_mbom_item',
  ])
  const [includeDomains, setIncludeDomains] = useState<Array<ThreadDomain>>([
    'requirements',
    'engineering',
    'manufacturing',
    'validation',
  ])
  const [includeSeverities, setIncludeSeverities] = useState<
    Array<GapSeverity>
  >(['critical', 'major', 'minor'])

  // Results
  const [result, setResult] = useState<GapAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Toggle gap type selection
  const toggleGapType = (gapType: GapType) => {
    if (includeTypes.includes(gapType)) {
      setIncludeTypes(includeTypes.filter((t) => t !== gapType))
    } else {
      setIncludeTypes([...includeTypes, gapType])
    }
  }

  // Toggle domain selection
  const toggleDomain = (domain: ThreadDomain) => {
    if (includeDomains.includes(domain)) {
      setIncludeDomains(includeDomains.filter((d) => d !== domain))
    } else {
      setIncludeDomains([...includeDomains, domain])
    }
  }

  // Toggle severity selection
  const toggleSeverity = (severity: GapSeverity) => {
    if (includeSeverities.includes(severity)) {
      setIncludeSeverities(includeSeverities.filter((s) => s !== severity))
    } else {
      setIncludeSeverities([...includeSeverities, severity])
    }
  }

  // Run analysis
  const runAnalysis = useCallback(async () => {
    setStep('analyzing')
    setError(null)
    setResult(null)

    try {
      const response = await apiFetch<{ data: GapAnalysisResult }>(
        `/api/v1/designs/${designId}/gap-analysis`,
        {
          method: 'POST',
          body: JSON.stringify({
            includeTypes,
            includeDomains,
            includeSeverities,
          }),
        },
      )

      setResult(response.data)
      setStep('results')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tc('dialogs.gap.analysisFailed'),
      )
      setStep('configure')
    }
  }, [designId, includeTypes, includeDomains, includeSeverities, tc])

  // Reset dialog state when closed
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep('configure')
      setResult(null)
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  // Select all types
  const selectAllTypes = () => {
    setIncludeTypes(gapTypeOptions.map((o) => o.value))
  }

  // Clear all types
  const clearAllTypes = () => {
    setIncludeTypes([])
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'overflow-y-auto',
          step === 'results'
            ? '!w-[95vw] !max-w-[95vw] h-[95vh] max-h-[95vh]'
            : 'max-w-2xl max-h-[90vh]',
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {tc('dialogs.gap.title')}
          </DialogTitle>
          <DialogDescription>
            {tc('dialogs.gap.description', { designCode })}
            {designName && <> ({designName})</>}
          </DialogDescription>
        </DialogHeader>

        {/* Configure Step */}
        {step === 'configure' && (
          <div className="space-y-6 py-4">
            {/* Gap Types */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {tc('dialogs.gap.gapTypesQuestion')}
                </Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllTypes}
                    className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    {tc('actions.selectAll')}
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={clearAllTypes}
                    className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    {tc('actions.clearAll')}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {gapTypeOptions.map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      'flex flex-col items-start p-3 rounded-lg border cursor-pointer transition-colors',
                      includeTypes.includes(option.value)
                        ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950'
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-700',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={includeTypes.includes(option.value)}
                        onCheckedChange={() => toggleGapType(option.value)}
                      />
                      <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                        {option.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 ml-6">
                      {option.description}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Domains */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {tc('labels.includeDomains')}
              </Label>
              <div className="flex flex-wrap gap-3">
                {domainOptions.map(({ value, label, Icon }) => (
                  <label
                    key={value}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                      includeDomains.includes(value)
                        ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950'
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-700',
                    )}
                  >
                    <Checkbox
                      checked={includeDomains.includes(value)}
                      onCheckedChange={() => toggleDomain(value)}
                    />
                    <Icon className="h-4 w-4 text-slate-700 dark:text-slate-100" />
                    <span className="text-sm text-slate-900 dark:text-slate-100">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Severities */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {tc('labels.includeSeverities')}
              </Label>
              <div className="flex flex-wrap gap-3">
                {severityOptions.map(({ value, label, color }) => (
                  <label
                    key={value}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                      includeSeverities.includes(value)
                        ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950'
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-700',
                    )}
                  >
                    <Checkbox
                      checked={includeSeverities.includes(value)}
                      onCheckedChange={() => toggleSeverity(value)}
                    />
                    <div className={cn('w-3 h-3 rounded-full', color)} />
                    <span className="text-sm text-slate-900 dark:text-slate-100">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Validation Messages */}
            {includeTypes.length === 0 && (
              <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {tc('dialogs.gap.selectOneGapType')}
              </p>
            )}
            {includeDomains.length === 0 && (
              <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {tc('dialogs.impact.selectOneDomain')}
              </p>
            )}
            {includeSeverities.length === 0 && (
              <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {tc('dialogs.gap.selectOneSeverity')}
              </p>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
        )}

        {/* Analyzing Step */}
        {step === 'analyzing' && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
            <p className="text-slate-600 dark:text-slate-400">
              {tc('dialogs.gap.analyzing')}
            </p>
            <p className="text-sm text-slate-500">
              {tc('dialogs.gap.analyzingHint')}
            </p>
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && result && (
          <div className="space-y-6 py-4 w-full max-w-full min-w-0 overflow-x-hidden">
            {/* Summary */}
            <GapSummaryCards result={result} />

            {/* Detailed Results */}
            {result.gaps.length > 0 && (
              <div className="space-y-3 w-full max-w-full min-w-0">
                <h3 className="text-lg font-medium">
                  {tc('dialogs.gap.gapDetails')}
                </h3>
                <GapResultsTable gaps={result.gaps} />
              </div>
            )}

            {/* No Gaps Message */}
            {result.gaps.length === 0 && (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                  {tc('dialogs.gap.noGapsTitle')}
                </h3>
                <p className="text-slate-500 mt-1">
                  {tc('dialogs.gap.noGapsDescription')}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'configure' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {tc('actions.cancel')}
              </Button>
              <Button
                onClick={runAnalysis}
                disabled={
                  includeTypes.length === 0 ||
                  includeDomains.length === 0 ||
                  includeSeverities.length === 0
                }
              >
                <Search className="h-4 w-4 mr-2" />
                {tc('actions.analyzeGaps')}
              </Button>
            </>
          )}

          {step === 'analyzing' && (
            <Button variant="outline" onClick={() => setStep('configure')}>
              {tc('actions.cancel')}
            </Button>
          )}

          {step === 'results' && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('configure')}
                className="mr-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {tc('actions.reconfigure')}
              </Button>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {tc('actions.close')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Cog,
  Factory,
  FileText,
  FlaskConical,
  Loader2,
  Search,
} from 'lucide-react'
import { ImpactSummaryCards } from './ImpactSummaryCards'
import { ImpactResultsTable } from './ImpactResultsTable'
import type {
  ChangeType,
  ImpactAnalysisResult,
  ImpactDirection,
} from '@cascadia/commons/services/types/impact-analysis'
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

interface ImpactAnalysisDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId: string
  itemNumber: string
  itemName?: string | null
}

type WizardStep = 'configure' | 'analyzing' | 'results'

const CHANGE_TYPES: Array<ChangeType> = [
  'revision',
  'obsolescence',
  'bom_removal',
  'specification_change',
]

const DIRECTIONS: Array<ImpactDirection> = ['downstream', 'upstream', 'both']

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
 * Wizard-style dialog for running impact analysis on an item.
 */
export function ImpactAnalysisDialog({
  open,
  onOpenChange,
  itemId,
  itemNumber,
  itemName,
}: ImpactAnalysisDialogProps) {
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()

  const changeTypeOptions = useMemo(
    () =>
      CHANGE_TYPES.map((value) => ({
        value,
        label: tc(`dialogs.impact.changeTypes.${value}.label`),
        description: tc(`dialogs.impact.changeTypes.${value}.description`),
      })),
    [tc],
  )

  const directionOptions = useMemo(
    () =>
      DIRECTIONS.map((value) => ({
        value,
        label: tc(`dialogs.impact.directions.${value}.label`),
        description: tc(`dialogs.impact.directions.${value}.description`),
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
  const [changeType, setChangeType] = useState<ChangeType>('revision')
  const [direction, setDirection] = useState<ImpactDirection>('both')
  const [maxDepth, setMaxDepth] = useState(5)
  const [includeDomains, setIncludeDomains] = useState<Array<ThreadDomain>>([
    'requirements',
    'engineering',
    'manufacturing',
    'validation',
  ])

  // Results
  const [result, setResult] = useState<ImpactAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedItemIds, setSelectedItemIds] = useState<Array<string>>([])

  // Toggle domain selection
  const toggleDomain = (domain: ThreadDomain) => {
    if (includeDomains.includes(domain)) {
      setIncludeDomains(includeDomains.filter((d) => d !== domain))
    } else {
      setIncludeDomains([...includeDomains, domain])
    }
  }

  // Run analysis
  const runAnalysis = useCallback(async () => {
    setStep('analyzing')
    setError(null)
    setResult(null)

    try {
      const response = await apiFetch<{ data: ImpactAnalysisResult }>(
        `/api/v1/items/${itemId}/impact-analysis`,
        {
          method: 'POST',
          body: JSON.stringify({
            changeType,
            direction,
            maxDepth,
            includeDomains,
          }),
        },
      )

      setResult(response.data)
      setStep('results')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tc('dialogs.impact.analysisFailed'),
      )
      setStep('configure')
    }
  }, [itemId, changeType, direction, maxDepth, includeDomains, tc])

  // Create ECO from selection
  const createChangeOrderFromSelection = useCallback(async () => {
    if (selectedItemIds.length === 0) return

    // Navigate to ECO creation with pre-selected items
    // The query param will be picked up by the ECO form
    const affectedIds = selectedItemIds.join(',')
    await navigate({
      to: '/change-orders/new',
      search: { affectedItems: affectedIds, sourceItem: itemId },
    } as any)

    onOpenChange(false)
  }, [selectedItemIds, itemId, navigate, onOpenChange])

  // Reset dialog state when closed
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep('configure')
      setResult(null)
      setError(null)
      setSelectedItemIds([])
    }
    onOpenChange(nextOpen)
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
            {tc('dialogs.impact.title')}
          </DialogTitle>
          <DialogDescription>
            {tc('dialogs.impact.description', { itemNumber })}
            {itemName && <> ({itemName})</>}
          </DialogDescription>
        </DialogHeader>

        {/* Configure Step */}
        {step === 'configure' && (
          <div className="space-y-6 py-4">
            {/* Change Type */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {tc('dialogs.impact.changeTypeQuestion')}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {changeTypeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setChangeType(option.value)}
                    className={cn(
                      'flex flex-col items-start p-3 rounded-lg border text-left transition-colors',
                      changeType === option.value
                        ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950'
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-700',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {changeType === option.value ? (
                        <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                      )}
                      <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                        {option.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-6">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Direction */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">
                {tc('dialogs.impact.directionQuestion')}
              </Label>
              <div className="grid grid-cols-3 gap-3">
                {directionOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDirection(option.value)}
                    className={cn(
                      'flex flex-col items-start p-3 rounded-lg border text-left transition-colors',
                      direction === option.value
                        ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950'
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-700',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {direction === option.value ? (
                        <CheckCircle2 className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-slate-300 dark:border-slate-600" />
                      )}
                      <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                        {option.label}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 ml-6">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Max Depth */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <Label className="text-sm font-medium">
                  {tc('labels.maximumDepth')}
                </Label>
                <span className="text-sm text-slate-500">
                  {tc('dialogs.impact.levels', { count: maxDepth })}
                </span>
              </div>
              <input
                type="range"
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value, 10))}
                min={1}
                max={10}
                step={1}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-600 dark:accent-cyan-400"
              />
              <div className="flex justify-between text-xs text-slate-400">
                <span>{tc('dialogs.impact.depthDirectOnly')}</span>
                <span>{tc('dialogs.impact.depthFull')}</span>
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
              {includeDomains.length === 0 && (
                <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {tc('dialogs.impact.selectOneDomain')}
                </p>
              )}
            </div>

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
              {tc('dialogs.impact.analyzing')}
            </p>
            <p className="text-sm text-slate-500">
              {tc('dialogs.impact.traversing', { maxDepth })}
            </p>
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && result && (
          <div className="space-y-6 py-4 w-full max-w-full min-w-0 overflow-x-hidden">
            {/* Summary */}
            <ImpactSummaryCards result={result} />

            {/* Detailed Results */}
            {result.impactedItems.length > 0 && (
              <div className="space-y-3 w-full max-w-full min-w-0">
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                  {tc('dialogs.impact.impactedItems')}
                </h3>
                <ImpactResultsTable
                  items={result.impactedItems}
                  onSelectionChange={setSelectedItemIds}
                />
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
                disabled={includeDomains.length === 0}
              >
                <Search className="h-4 w-4 mr-2" />
                {tc('actions.analyzeImpact')}
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
              {result && result.impactedItems.length > 0 && (
                <Button
                  onClick={createChangeOrderFromSelection}
                  disabled={selectedItemIds.length === 0}
                >
                  {tc('actions.createEco')}
                  {selectedItemIds.length > 0 && (
                    <span className="ml-1">({selectedItemIds.length})</span>
                  )}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

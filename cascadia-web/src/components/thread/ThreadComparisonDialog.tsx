// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  AlertCircle,
  ArrowLeft,
  Cog,
  Factory,
  FileText,
  FlaskConical,
  GitCompare,
  Loader2,
} from 'lucide-react'
import { ContextSelector } from './ContextSelector'
import { ComparisonSummaryCards } from './ComparisonSummaryCards'
import { DiffLegend } from './DiffLegend'
import { ThreadNodeDiff } from './ThreadNodeDiff'
import { swimLaneLayout } from './swimLaneLayout'

import type { Edge, Node } from '@xyflow/react'
import type {
  ComparisonTargets,
  ThreadComparison,
  ThreadDomain,
} from '@cascadia/commons/thread/types'
import type { VersionContext } from '@cascadia/commons/versioning/version-context'
import { apiFetch } from '@/api/client'
import { threadComparisonTargetsQuery } from '@/query'
import { cn } from '@/utils'
import { useTheme } from '@/theme'
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

interface ThreadComparisonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId: string
  itemNumber: string
  itemName?: string | null
  designId: string
}

type WizardStep = 'configure' | 'comparing' | 'results'

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
 * Wizard-style dialog for comparing digital threads at different version contexts.
 */
export function ThreadComparisonDialog({
  open,
  onOpenChange,
  itemId,
  itemNumber,
  itemName,
  designId,
}: ThreadComparisonDialogProps) {
  const { t: tc } = useTranslation('common')
  const cmp = (key: string, options?: Record<string, unknown>) =>
    tc(`thread.comparison.${key}`, options)
  const { theme } = useTheme()
  // Wizard state
  const [step, setStep] = useState<WizardStep>('configure')

  // Comparison targets (tags, branches, commits)

  // Configuration
  const [beforeContext, setBeforeContext] = useState<VersionContext | null>(
    null,
  )
  const [afterContext, setAfterContext] = useState<VersionContext | null>({
    type: 'released',
    designId,
  })
  const [includeDomains, setIncludeDomains] = useState<Array<ThreadDomain>>([
    'engineering',
    'manufacturing',
  ])
  const [showOnlyChanges, setShowOnlyChanges] = useState(false)

  // Results
  const [result, setResult] = useState<ThreadComparison | null>(null)
  const [error, setError] = useState<string | null>(null)

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const nodeTypes = useMemo(() => ({ threadNodeDiff: ThreadNodeDiff }), [])

  // What this item can be compared against; asked only while the dialog is
  // open, and shared with anything else that needs the same list.
  const { data: targets = null, isFetching: loadingTargets } = useQuery(
    threadComparisonTargetsQuery<ComparisonTargets>(itemId, open),
  )

  // Toggle domain selection
  const toggleDomain = (domain: ThreadDomain) => {
    if (includeDomains.includes(domain)) {
      setIncludeDomains(includeDomains.filter((d) => d !== domain))
    } else {
      setIncludeDomains([...includeDomains, domain])
    }
  }

  // Run comparison
  const runComparison = useCallback(async () => {
    if (!beforeContext || !afterContext) return

    setStep('comparing')
    setError(null)
    setResult(null)

    try {
      const response = await apiFetch<{ data: ThreadComparison }>(
        `/api/v1/thread/${itemId}/compare`,
        {
          method: 'POST',
          body: JSON.stringify({
            beforeContext,
            afterContext,
            domains: includeDomains,
            includeFieldChanges: true,
          }),
        },
      )

      setResult(response.data)

      // Build nodes for visualization
      const allNodeDiffs = [
        response.data.focalItem,
        ...response.data.domains.requirements,
        ...response.data.domains.engineering,
        ...response.data.domains.manufacturing,
        ...response.data.domains.validation,
      ]

      // Filter if showing only changes
      const filteredDiffs = showOnlyChanges
        ? allNodeDiffs.filter((d) => d.status !== 'unchanged')
        : allNodeDiffs

      // Convert to ThreadNode format for layout
      const threadNodes = filteredDiffs.map((diff) => diff.node)

      // Build edges with diff status
      const threadEdges = response.data.relationships.map((edgeDiff) => ({
        ...edgeDiff.edge,
        diffStatus: edgeDiff.status,
      }))

      // Apply swim lane layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = swimLaneLayout(
        threadNodes,
        threadEdges,
      )

      // Add diff status to nodes
      const nodesWithDiff = layoutedNodes.map((node) => {
        const nodeDiff = allNodeDiffs.find((d) => d.node.id === node.id)
        return {
          ...node,
          type: 'threadNodeDiff',
          data: (nodeDiff ?? {}) as Record<string, unknown>,
        }
      })

      // Style edges based on diff status
      const edgesWithDiff = layoutedEdges.map((edge) => {
        const edgeDiff = response.data.relationships.find(
          (d) => d.edge.id === edge.id,
        )
        const status = edgeDiff?.status ?? 'unchanged'

        let strokeColor = '#94a3b8' // default gray
        let strokeDasharray = ''
        if (status === 'added') {
          strokeColor = '#22c55e' // green
        } else if (status === 'removed') {
          strokeColor = '#ef4444' // red
          strokeDasharray = '5,5'
        } else if (status === 'modified') {
          strokeColor = '#f59e0b' // amber
        }

        return {
          ...edge,
          style: {
            ...edge.style,
            stroke: strokeColor,
            strokeDasharray,
          },
        }
      })

      setNodes(nodesWithDiff)
      setEdges(edgesWithDiff)
      setStep('results')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : cmp('comparisonFailed'),
      )
      setStep('configure')
    }
  }, [
    itemId,
    beforeContext,
    afterContext,
    includeDomains,
    showOnlyChanges,
    setNodes,
    setEdges,
  ])

  // Reset dialog state when closed
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setStep('configure')
      setResult(null)
      setError(null)
      setNodes([])
      setEdges([])
      // Don't reset targets - cache them
    }
    onOpenChange(isOpen)
  }

  const canCompare =
    beforeContext !== null && afterContext !== null && includeDomains.length > 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[90vh] overflow-y-auto',
          step === 'results' ? 'max-w-6xl' : 'max-w-3xl',
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="h-5 w-5" />
            {cmp('title')}
          </DialogTitle>
          <DialogDescription>
            {cmp('descriptionIntro')}{' '}
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {itemNumber}
            </span>
            {itemName ? ` (${itemName})` : ''} {cmp('descriptionAtContexts')}
          </DialogDescription>
        </DialogHeader>

        {/* Configure Step */}
        {step === 'configure' && (
          <div className="space-y-6 py-4">
            {loadingTargets ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                <span className="ml-2 text-slate-500">
                  {cmp('loadingContexts')}
                </span>
              </div>
            ) : targets ? (
              <>
                {/* Before Context */}
                <ContextSelector
                  targets={targets}
                  designId={designId}
                  value={beforeContext}
                  onChange={setBeforeContext}
                  label={cmp('beforeBaseline')}
                />

                {/* After Context */}
                <ContextSelector
                  targets={targets}
                  designId={designId}
                  value={afterContext}
                  onChange={setAfterContext}
                  label={cmp('afterCompareTo')}
                />

                {/* Domains */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    {tc('labels.includeDomains')}
                  </Label>
                  <div className="flex flex-wrap gap-3">
                    {DOMAIN_OPTIONS.map(({ value, Icon }) => (
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
                        <Icon className="h-4 w-4" />
                        <span className="text-sm">
                          {tc(`thread.domains.${value}`)}
                        </span>
                      </label>
                    ))}
                  </div>
                  {includeDomains.length === 0 && (
                    <p className="text-sm text-orange-600 dark:text-orange-400 flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {cmp('selectOneDomain')}
                    </p>
                  )}
                </div>

                {/* Show only changes toggle */}
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={showOnlyChanges}
                    onCheckedChange={(checked) =>
                      setShowOnlyChanges(checked === true)
                    }
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {cmp('showOnlyChanges')}
                  </span>
                </label>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
                <p>{cmp('failedLoadContexts')}</p>
                {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
              </div>
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

        {/* Comparing Step */}
        {step === 'comparing' && (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-600 dark:text-cyan-400" />
            <p className="text-slate-600 dark:text-slate-400">
              {cmp('comparing')}
            </p>
            <p className="text-sm text-slate-500">{cmp('analyzing')}</p>
          </div>
        )}

        {/* Results Step */}
        {step === 'results' && result && (
          <div className="space-y-6 py-4">
            {/* Context labels */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700">
              <div>
                <span className="text-xs text-slate-500">{cmp('before')}</span>
                <p className="text-sm font-medium">
                  {result.beforeContext.label}
                </p>
              </div>
              <GitCompare className="h-5 w-5 text-slate-400" />
              <div className="text-right">
                <span className="text-xs text-slate-500">{cmp('after')}</span>
                <p className="text-sm font-medium">
                  {result.afterContext.label}
                </p>
              </div>
            </div>

            {/* Summary cards */}
            <ComparisonSummaryCards stats={result.stats} />

            {/* Diff legend */}
            <DiffLegend />

            {/* Thread visualization */}
            {nodes.length > 0 && (
              <div className="h-[400px] border rounded-lg bg-slate-50 dark:bg-slate-950">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  nodeTypes={nodeTypes}
                  colorMode={theme}
                  fitView
                  attributionPosition="bottom-right"
                  minZoom={0.1}
                  maxZoom={2}
                >
                  <Background gap={16} />
                  <Controls />
                </ReactFlow>
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
              <Button onClick={runComparison} disabled={!canCompare}>
                <GitCompare className="h-4 w-4 mr-2" />
                {tc('thread.compare')}
              </Button>
            </>
          )}

          {step === 'comparing' && (
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

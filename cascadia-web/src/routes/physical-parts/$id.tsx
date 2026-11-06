// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { BadgeCheck, GitCompareArrows, GitFork, Package } from 'lucide-react'
import type {
  AsBuiltLine,
  GenealogyNode,
  PhysicalPartEvidenceLink,
} from '@/query'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { PageContainer } from '@/components/layout'
import { DigitalThreadNavigator } from '@/components/thread'
import { FileList, FileUploadZone } from '@/components/vault'
import { apiFetch } from '@/api/client'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { translatePhysicalPartState } from '@/i18n'
import {
  itemTextSearchQuery,
  physicalPartAsBuiltQuery,
  physicalPartDetailQuery,
  physicalPartEvidenceQuery,
  physicalPartGenealogyQuery,
  useInvalidateResources,
} from '@/query'

export const Route = createFileRoute('/physical-parts/$id')({
  component: PhysicalPartDetailPage,
  loader: ({ context: { queryClient }, params }) =>
    queryClient.ensureQueryData(physicalPartDetailQuery(params.id)),
})

const STATES = ['Available', 'Consumed', 'In Service', 'Scrapped']

function PhysicalPartDetailPage() {
  const { t: tp } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const { id } = Route.useParams()
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()
  const { data: physicalPart } = useQuery(physicalPartDetailQuery(id))

  if (!physicalPart) return null

  const handleStateChange = async (state: string) => {
    try {
      await apiFetch(`/api/v1/physical-parts/${physicalPart.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ state }),
      })
      showSuccess(
        tp('physicalParts.detail.stateUpdatedTitle'),
        `${physicalPart.itemNumber} → ${translatePhysicalPartState(state)}`,
      )
      await invalidate('physical-parts')
    } catch (error) {
      handleError(error)
    }
  }

  const identityLabel =
    physicalPart.instanceKind === 'unit'
      ? tp('physicalParts.detail.serialNumberLabel')
      : tp('physicalParts.detail.lotNumberLabel')
  const identityValue = physicalPart.serialNumber ?? physicalPart.lotNumber

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-slate-900 dark:text-white">
          <Package className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-semibold">
              {physicalPart.itemNumber}
              <Badge variant="outline" className="ml-3 align-middle">
                {physicalPart.instanceKind === 'unit'
                  ? tp('physicalParts.unit')
                  : tp('physicalParts.lot')}
              </Badge>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {physicalPart.name}
            </p>
          </div>
        </div>
        <Select value={physicalPart.state} onValueChange={handleStateChange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {translatePhysicalPartState(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
            <CardDescription>
              Traceability identity — immutable after registration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                {identityLabel}
              </span>
              <span className="font-mono font-medium">{identityValue}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">
                {tc('columns.part')}
              </span>
              <span>
                <span className="font-medium">
                  {physicalPart.partItemNumber}
                </span>
                {physicalPart.partName && (
                  <span className="ml-2 text-slate-500 dark:text-slate-400">
                    {physicalPart.partName}
                  </span>
                )}
              </span>
            </div>
            {physicalPart.erpRef && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {tp('physicalParts.detail.erpRef')}
                </span>
                <span className="font-mono">{physicalPart.erpRef}</span>
              </div>
            )}
            {physicalPart.producingWorkOrderId && (
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {tp('physicalParts.detail.producedBy')}
                </span>
                <Link
                  to="/work-orders/$id"
                  params={{ id: physicalPart.producingWorkOrderId }}
                  className="underline underline-offset-2"
                >
                  {tp('physicalParts.detail.workOrderLink')}
                </Link>
              </div>
            )}
            {physicalPart.notes && (
              <div className="pt-2">
                <span className="text-slate-500 dark:text-slate-400">
                  {tc('fields.notes')}
                </span>
                <p className="mt-1 whitespace-pre-wrap">{physicalPart.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tp('physicalParts.detail.documentsTitle')}</CardTitle>
            <CardDescription>
              {tp('physicalParts.detail.documentsDescription', {
                kind: physicalPart.instanceKind,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploadZone
              itemId={physicalPart.id}
              onUploadComplete={() => invalidate('files')}
            />
            <FileList itemId={physicalPart.id} />
          </CardContent>
        </Card>
      </div>

      <EvidenceCard physicalPartId={physicalPart.id} />

      <GenealogyCard physicalPartId={physicalPart.id} />

      {physicalPart.producingWorkOrderId && (
        <AsBuiltComparisonCard physicalPartId={physicalPart.id} />
      )}

      <DigitalThreadNavigator
        itemId={physicalPart.id}
        itemNumber={physicalPart.itemNumber}
        itemName={physicalPart.name}
      />
    </PageContainer>
  )
}

interface RequirementSuggestion {
  id: string
  itemNumber: string
  name?: string | null
}

function EvidenceCard({ physicalPartId }: { physicalPartId: string }) {
  const { t: tp } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')

  const { data } = useQuery(physicalPartEvidenceQuery(physicalPartId))

  // Requirement typeahead. The debounced term is part of the key, so typing
  // costs one request per pause and re-typing a term resolves from cache.
  const debouncedQuery = useDebouncedValue(query.trim(), 250)
  const { data: suggestions = [] } = useQuery(
    itemTextSearchQuery<RequirementSuggestion>(
      { q: debouncedQuery, types: ['Requirement'], limit: 8 },
      debouncedQuery.length >= 2,
    ),
  )

  const handleAdd = async (requirement: RequirementSuggestion) => {
    try {
      await apiFetch(`/api/v1/physical-parts/${physicalPartId}/evidence`, {
        method: 'POST',
        body: JSON.stringify({
          requirementId: requirement.id,
          note: note.trim() || undefined,
        }),
      })
      showSuccess(
        tp('physicalParts.detail.evidenceLinkedTitle'),
        tp('physicalParts.detail.evidenceLinkedDescription', {
          itemNumber: requirement.itemNumber,
        }),
      )
      setQuery('')
      setNote('')
      await invalidate('physical-parts')
    } catch (error) {
      handleError(error)
    }
  }

  const handleRemove = async (link: PhysicalPartEvidenceLink) => {
    try {
      await apiFetch(
        `/api/v1/physical-parts/${physicalPartId}/evidence/${link.edgeId}`,
        { method: 'DELETE' },
      )
      await invalidate('physical-parts')
    } catch (error) {
      handleError(error)
    }
  }

  const links = data ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4" />
          {tp('physicalParts.detail.evidenceTitle')}
        </CardTitle>
        <CardDescription>
          {tp('physicalParts.detail.evidenceDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tp('physicalParts.searchRequirementPlaceholder')}
            />
            {suggestions.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-300 bg-white shadow-md dark:border-slate-700 dark:bg-slate-950">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    onClick={() => handleAdd(s)}
                  >
                    <span className="font-medium">{s.itemNumber}</span>
                    {s.name && (
                      <span className="ml-2 text-slate-500 dark:text-slate-400">
                        {s.name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={tp('physicalParts.evidenceNotePlaceholder')}
            className="max-w-xs"
          />
        </div>

        {links.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {tp('physicalParts.detail.evidenceEmpty')}
          </p>
        ) : (
          <ul className="space-y-1">
            {links.map((link) => (
              <li
                key={link.edgeId}
                className="flex items-center justify-between rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
              >
                <div>
                  <span className="font-medium">{link.requirementNumber}</span>
                  {link.requirementName && (
                    <span className="ml-2 text-slate-500 dark:text-slate-400">
                      {link.requirementName}
                    </span>
                  )}
                  {link.note && (
                    <span className="ml-2 italic text-slate-500 dark:text-slate-400">
                      — {link.note}
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(link)}
                >
                  {tc('actions.remove')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function GenealogyNodeList({ nodes }: { nodes: Array<GenealogyNode> }) {
  const { t: tp } = useTranslation('pages')
  if (nodes.length === 0) return null
  return (
    <ul className="ml-4 space-y-1 border-l border-slate-300 pl-3 dark:border-slate-700">
      {nodes.map((node) => (
        <li key={`${node.itemId}-${node.workOrder?.id ?? ''}`}>
          <div className="text-sm">
            {node.kind === 'bulk' ? (
              <span>
                <span className="font-medium">{node.partItemNumber}</span>
                {node.partName && (
                  <span className="ml-1 text-slate-500 dark:text-slate-400">
                    {node.partName}
                  </span>
                )}
              </span>
            ) : (
              <Link
                to="/physical-parts/$id"
                params={{ id: node.itemId }}
                className="font-mono underline-offset-2 hover:underline"
              >
                {node.serialNumber
                  ? tp('workOrders.materials.serialLink', {
                      serial: node.serialNumber,
                    })
                  : tp('workOrders.materials.lotLink', {
                      lot: node.lotNumber ?? '',
                    })}
              </Link>
            )}
            {node.kind !== 'bulk' && node.partItemNumber && (
              <span className="ml-2 text-slate-500 dark:text-slate-400">
                {node.partItemNumber}
              </span>
            )}
            {node.quantity !== null && node.quantity !== 1 && (
              <span className="ml-2 text-slate-500 dark:text-slate-400">
                × {node.quantity}
              </span>
            )}
            {node.workOrder && (
              <Link
                to="/work-orders/$id"
                params={{ id: node.workOrder.id }}
                className="ml-2 text-xs text-slate-500 dark:text-slate-400 underline-offset-2 hover:underline"
              >
                {node.workOrder.itemNumber}
              </Link>
            )}
          </div>
          <GenealogyNodeList nodes={node.children} />
        </li>
      ))}
    </ul>
  )
}

const AS_BUILT_STATUS_CLASS: Record<AsBuiltLine['status'], string> = {
  match:
    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  missing: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  extra:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  quantity_mismatch:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
}

function AsBuiltComparisonCard({ physicalPartId }: { physicalPartId: string }) {
  const { t: tp } = useTranslation('pages')
  const { data } = useQuery(physicalPartAsBuiltQuery(physicalPartId))

  const asBuiltStatusLabel = (status: AsBuiltLine['status']) => {
    switch (status) {
      case 'match':
        return tp('physicalParts.detail.asBuiltStatusMatch')
      case 'missing':
        return tp('physicalParts.detail.asBuiltStatusMissing')
      case 'extra':
        return tp('physicalParts.detail.asBuiltStatusExtra')
      case 'quantity_mismatch':
        return tp('physicalParts.detail.asBuiltStatusQtyMismatch')
    }
  }

  if (!data) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitCompareArrows className="h-4 w-4" />
          {tp('physicalParts.detail.asBuiltComparisonTitle')}
        </CardTitle>
        <CardDescription>
          {tp('physicalParts.detail.asBuiltDescriptionIntro')}
          {data.asBuiltItem &&
            tp('physicalParts.detail.asBuiltDescriptionRevision', {
              itemNumber: data.asBuiltItem.itemNumber,
              revision: data.asBuiltItem.revision,
            })}
          {tp('physicalParts.detail.asBuiltDescriptionConsumed')}
          {data.producedUnitCount > 1 &&
            tp('physicalParts.detail.asBuiltDescriptionBatch', {
              count: data.producedUnitCount,
            })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.lines.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {tp('physicalParts.detail.asBuiltEmpty')}
          </p>
        ) : (
          <ul className="space-y-1">
            {data.lines.map((line) => (
              <li
                key={line.partMasterId}
                className="flex items-center justify-between rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700"
              >
                <div>
                  <span className="font-medium">{line.partItemNumber}</span>
                  {line.partName && (
                    <span className="ml-2 text-slate-500 dark:text-slate-400">
                      {line.partName}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 dark:text-slate-400">
                    {tp('physicalParts.detail.asBuiltQuantities', {
                      designed: line.designedQuantity ?? '—',
                      consumed: line.consumedQuantity ?? '—',
                    })}
                  </span>
                  <Badge
                    variant="secondary"
                    className={AS_BUILT_STATUS_CLASS[line.status]}
                  >
                    {asBuiltStatusLabel(line.status)}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function GenealogyCard({ physicalPartId }: { physicalPartId: string }) {
  const { t: tp } = useTranslation('pages')
  const { data } = useQuery(physicalPartGenealogyQuery(physicalPartId))

  const composition = data?.composition ?? []
  const whereUsed = data?.whereUsed ?? []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitFork className="h-4 w-4" />
          {tp('physicalParts.detail.genealogyTitle')}
        </CardTitle>
        <CardDescription>
          {tp('physicalParts.detail.genealogyDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium">
              {tp('physicalParts.detail.compositionTitle')}
            </h3>
            {composition.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tp('physicalParts.detail.compositionEmpty')}
              </p>
            ) : (
              <GenealogyNodeList nodes={composition} />
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">
              {tp('physicalParts.detail.whereUsedTitle')}
            </h3>
            {whereUsed.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {tp('physicalParts.detail.whereUsedEmpty')}
              </p>
            ) : (
              <GenealogyNodeList nodes={whereUsed} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

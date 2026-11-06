// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react'
import { AddRelationshipDialog } from './AddRelationshipDialog'
import { EditRelationshipDialog } from './EditRelationshipDialog'
import { NewRelationshipTypeDialog } from './NewRelationshipTypeDialog'
import type { DataGridColumn } from '@/components/ui/DataGrid'
import type { Row } from '@tanstack/react-table'
import type {
  SuspectReason,
  SuspectReasonLabels,
} from '@/components/items/suspect-links'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { DataGrid } from '@/components/ui/DataGrid'
import { ContextMenuItem } from '@/components/ui/ContextMenu'
import { useAlertDialog } from '@/hooks/useAlertDialog'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { apiFetch } from '@/api/client'
import { useInvalidateResources } from '@/query'
import { itemRelationshipsQuery } from '@/query/options/relationships'
import { StateBadge } from '@/components/items/StateBadge'
import { ItemLink } from '@/components/items/ItemLink'
import {
  AffirmAllButton,
  AffirmButton,
  SuspectBadge,
  useAffirmLinks,
} from '@/components/items/suspect-links'
import { getItemDetailPath } from '@/items/item-type-ui'

interface Relationship {
  id: string
  sourceId: string
  targetId: string
  relationshipType: string
  quantity: string | null
  referenceDesignator: string | null
  findNumber: number | null
  targetItem: {
    id: string
    itemNumber: string
    revision: string
    itemType: string
    name: string
    state: string
  }
  /**
   * Present on a trace claim (`SATISFIES`, `VERIFIED_BY`, …) and absent on
   * every other edge: the claim is stale when one end revised since it was
   * last affirmed.
   */
  suspect?: boolean
  suspectReasons?: Array<SuspectReason>
}

/** Whether a group of edges carries trace flags at all. */
function hasTraceFlags(rels: Array<Relationship>): boolean {
  return rels.some((rel) => rel.suspect !== undefined)
}

interface RelationshipSectionProps {
  itemId: string
  itemType: string
  /**
   * Hide add/remove affordances. Relationship changes are content edits of
   * the item, so they follow the click-Edit (checkout) policy — the parent
   * passes readOnly until the user holds the edit lock. The server enforces
   * the same rule regardless.
   */
  readOnly?: boolean
}

export function RelationshipSection({
  itemId,
  itemType,
  readOnly = false,
}: RelationshipSectionProps) {
  const { t: tp } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const suspectReasonLabels = useMemo<SuspectReasonLabels>(
    () => ({
      source_revised: tp('relationships.suspectSourceRevised'),
      target_revised: tp('relationships.suspectTargetRevised'),
    }),
    [tp],
  )
  const { confirm } = useAlertDialog()
  const { handleError } = useErrorHandler()
  const invalidate = useInvalidateResources()
  // Types are expanded by default, so this tracks the ones closed by hand
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set())
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newTypeDialogOpen, setNewTypeDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [editingRelationship, setEditingRelationship] =
    useState<Relationship | null>(null)
  // Affirming is a review record, not an edit of the link, so it is offered
  // whenever a trace claim is suspect — read-only views included.
  const { affirm, pendingIds } = useAffirmLinks({
    invalidates: ['relationships'],
  })

  const { data: relationships = [], isPending: loading } = useQuery(
    itemRelationshipsQuery<Relationship>(itemId),
  )

  // Group relationships by type
  const groupedRelationships = relationships.reduce(
    (acc, rel) => {
      ;(acc[rel.relationshipType] ??= []).push(rel)
      return acc
    },
    {} as Record<string, Array<Relationship>>,
  )

  const isTypeExpanded = (type: string) => !collapsedTypes.has(type)

  const toggleType = (type: string) => {
    setCollapsedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }

  const handleAddToExistingType = (type: string) => {
    setSelectedType(type)
    setAddDialogOpen(true)
  }

  const handleAddNewType = () => {
    setSelectedType(null)
    setNewTypeDialogOpen(true)
  }

  const handleRemoveRelationship = (relationshipId: string) => {
    confirm({
      title: tp('relationships.removeTitle'),
      description: tp('relationships.removeDescription'),
      actionLabel: tp('relationships.remove'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/relationships/${relationshipId}`, {
            method: 'DELETE',
          })
          await invalidate('relationships')
        } catch (error) {
          handleError(error, {
            title: tp('relationships.removeFailedTitle'),
          })
        }
      },
    })
  }

  const handleRelationshipAdded = () => {
    setAddDialogOpen(false)
    setNewTypeDialogOpen(false)
  }

  // Get unique states for filter options
  const stateOptions = useMemo(() => {
    const states = new Set(relationships.map((r) => r.targetItem.state))
    return Array.from(states).map((state) => ({ label: state, value: state }))
  }, [relationships])

  // Get unique item types for filter options
  const itemTypeOptions = useMemo(() => {
    const types = new Set(relationships.map((r) => r.targetItem.itemType))
    return Array.from(types).map((type) => ({ label: type, value: type }))
  }, [relationships])

  // Get URL for relationship row (for "Open in new tab")
  const getRowUrl = useCallback(
    (row: Relationship) =>
      getItemDetailPath(row.targetItem.itemType, row.targetItem.id) ??
      undefined,
    [],
  )

  // Context menu items (Edit, Remove)
  const renderContextMenuItems = useCallback(
    (row: Row<Relationship>) => {
      if (readOnly) return null
      return (
        <>
          <ContextMenuItem onClick={() => setEditingRelationship(row.original)}>
            <Pencil className="mr-2 h-4 w-4" />
            {tp('relationships.edit')}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => handleRemoveRelationship(row.original.id)}
            className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {tp('relationships.remove')}
          </ContextMenuItem>
        </>
      )
    },
    [readOnly, tp, handleRemoveRelationship],
  )

  // Define columns for the DataGrid
  const columns: Array<DataGridColumn<Relationship>> = useMemo(
    () => [
      {
        id: 'findNumber',
        header: tp('relationships.findNumberShort'),
        accessorFn: (row) => row.findNumber,
        enableSorting: true,
        enableFiltering: true,
        filterType: 'range' as const,
        meta: { width: '70px', align: 'center' as const },
        cell: ({ getValue }) => {
          const value = getValue() as number | null
          return value ?? '-'
        },
      },
      {
        id: 'itemNumber',
        header: tc('columns.itemNumber'),
        accessorFn: (row) => row.targetItem.itemNumber,
        enableSorting: true,
        enableFiltering: true,
        filterType: 'text' as const,
        filterPlaceholder: tp('relationships.filterItemNumber'),
        cell: ({ row }) => {
          const rel = row.original
          return (
            <ItemLink
              itemType={rel.targetItem.itemType}
              itemId={rel.targetItem.id}
              className="font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:underline flex items-center gap-1"
            >
              {rel.targetItem.itemNumber}
              <ExternalLink className="h-3 w-3" />
            </ItemLink>
          )
        },
      },
      {
        id: 'revision',
        header: tc('columns.rev'),
        accessorFn: (row) => row.targetItem.revision,
        enableSorting: true,
        enableFiltering: false,
        meta: { width: '60px', align: 'center' as const },
        cell: ({ getValue }) => (
          <Badge variant="outline" className="text-xs">
            {getValue() as string}
          </Badge>
        ),
      },
      {
        id: 'name',
        header: tc('columns.name'),
        accessorFn: (row) => row.targetItem.name,
        enableSorting: true,
        enableFiltering: true,
        filterType: 'text' as const,
        filterPlaceholder: tp('relationships.filterName'),
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          return (
            <span className="text-slate-600 dark:text-slate-400">
              {value || '-'}
            </span>
          )
        },
      },
      {
        id: 'itemType',
        header: tc('columns.type'),
        accessorFn: (row) => row.targetItem.itemType,
        enableSorting: true,
        enableFiltering: true,
        filterType: 'multiSelect' as const,
        filterOptions: itemTypeOptions,
        meta: { width: '90px' },
        cell: ({ getValue }) => (
          <Badge variant="outline" className="text-xs">
            {getValue() as string}
          </Badge>
        ),
      },
      {
        id: 'state',
        header: tc('columns.state'),
        accessorFn: (row) => row.targetItem.state,
        enableSorting: true,
        enableFiltering: true,
        filterType: 'multiSelect' as const,
        filterOptions: stateOptions,
        meta: { width: '100px' },
        cell: ({ row, getValue }) => (
          <StateBadge
            itemType={row.original.targetItem.itemType}
            state={getValue() as string}
            className="text-xs"
          />
        ),
      },
      {
        id: 'quantity',
        header: tc('columns.qty'),
        accessorFn: (row) => (row.quantity ? parseFloat(row.quantity) : null),
        enableSorting: true,
        enableFiltering: true,
        filterType: 'range' as const,
        meta: { width: '70px', align: 'right' as const },
        cell: ({ row }) => {
          const qty = row.original.quantity
          return qty ?? '-'
        },
      },
      {
        id: 'referenceDesignator',
        header: tp('relationships.refDesignator'),
        accessorFn: (row) => row.referenceDesignator,
        enableSorting: true,
        enableFiltering: true,
        filterType: 'text' as const,
        filterPlaceholder: tp('relationships.filterRefDes'),
        cell: ({ getValue }) => {
          const value = getValue() as string | null
          return (
            <span className="font-mono text-sm text-slate-600 dark:text-slate-400">
              {value || '-'}
            </span>
          )
        },
      },
      {
        id: 'trace',
        header: tp('relationships.trace'),
        accessorFn: (row) => (row.suspect ? 'suspect' : 'affirmed'),
        enableSorting: true,
        enableFiltering: false,
        meta: { width: '170px' },
        cell: ({ row }) => {
          const { suspect, suspectReasons, id } = row.original
          if (!suspect) return '-'
          return (
            <div className="flex items-center gap-2">
              <SuspectBadge
                reasons={suspectReasons}
                labels={suspectReasonLabels}
              />
              <AffirmButton
                relationshipId={id}
                pendingIds={pendingIds}
                onAffirm={affirm}
                variant="ghost"
                title={tp('relationships.affirmOneTitle')}
              />
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: '',
        enableSorting: false,
        enableFiltering: false,
        meta: { width: '100px', align: 'center' as const },
        cell: ({ row }) =>
          readOnly ? null : (
            <div className="flex items-center justify-center gap-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setEditingRelationship(row.original)}
                aria-label={tp('relationships.editRelationshipAria')}
              >
                <Pencil className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveRelationship(row.original.id)}
                aria-label={tp('relationships.removeRelationshipAria')}
              >
                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
              </Button>
            </div>
          ),
      },
    ],
    [
      stateOptions,
      itemTypeOptions,
      readOnly,
      affirm,
      pendingIds,
      tp,
      tc,
      suspectReasonLabels,
      handleRemoveRelationship,
    ],
  )

  // The trace column is for trace claims; a BOM or document group shows the
  // columns without it.
  const columnsWithoutTrace = useMemo(
    () => columns.filter((column) => column.id !== 'trace'),
    [columns],
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tp('relationships.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">{tp('relationships.loading')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{tp('relationships.title')}</CardTitle>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddNewType}
              >
                <Plus className="h-4 w-4 mr-1" />
                {tp('relationships.newType')}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(groupedRelationships).length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500 mb-4">
                {tp('relationships.empty')}
              </p>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddNewType}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {tp('relationships.addFirst')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedRelationships).map(([type, rels]) => (
                <div key={type} className="border rounded-lg overflow-hidden">
                  <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => toggleType(type)}
                      className="flex items-center gap-2 text-sm font-medium hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    >
                      <div
                        className={`chevron-rotate ${isTypeExpanded(type) ? 'chevron-rotate-down' : 'chevron-rotate-right'}`}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </div>
                      {type}
                      <Badge
                        variant="secondary"
                        className="animate-badge-pulse"
                      >
                        {rels.length}
                      </Badge>
                    </button>
                    <div className="flex items-center gap-2">
                      <AffirmAllButton
                        relationshipIds={rels
                          .filter((rel) => rel.suspect)
                          .map((rel) => rel.id)}
                        pendingIds={pendingIds}
                        onAffirm={affirm}
                        title={tp('relationships.affirmAllTitle')}
                      />
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAddToExistingType(type)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {tp('relationships.add')}
                        </Button>
                      )}
                    </div>
                  </div>

                  {isTypeExpanded(type) && (
                    <div className="p-4 tree-expand-enter">
                      <DataGrid
                        data={rels}
                        columns={
                          hasTraceFlags(rels) ? columns : columnsWithoutTrace
                        }
                        getRowId={(row) => row.id}
                        enablePagination={rels.length > 10}
                        defaultPageSize={10}
                        enableGlobalFilter={rels.length > 5}
                        enableContextMenu
                        getRowUrl={getRowUrl}
                        renderContextMenuItems={renderContextMenuItems}
                        emptyMessage={tp('relationships.emptyGrid')}
                        emptyDescription={tp('relationships.emptyGridDescription')}
                        exportFilename={`relationships-${type.toLowerCase()}`}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {addDialogOpen && selectedType && (
        <AddRelationshipDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          itemId={itemId}
          relationshipType={selectedType}
          onSuccess={handleRelationshipAdded}
        />
      )}

      {newTypeDialogOpen && (
        <NewRelationshipTypeDialog
          open={newTypeDialogOpen}
          onOpenChange={setNewTypeDialogOpen}
          itemId={itemId}
          itemType={itemType}
          onSuccess={handleRelationshipAdded}
        />
      )}

      {editingRelationship && (
        <EditRelationshipDialog
          open
          onOpenChange={(open) => {
            if (!open) setEditingRelationship(null)
          }}
          relationship={editingRelationship}
        />
      )}
    </>
  )
}

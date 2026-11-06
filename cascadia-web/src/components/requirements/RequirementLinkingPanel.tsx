// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Link as LinkIcon, Plus, Trash2 } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { DataGridColumn } from '@/components/ui/DataGrid'
import type {
  SuspectReason,
  SuspectReasonLabels,
} from '@/components/items/suspect-links'
import {
  AffirmAllButton,
  AffirmButton,
  SuspectBadge,
  suspectIdsOf,
  useAffirmLinks,
} from '@/components/items/suspect-links'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataGrid,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
} from '@/components/ui'
import { useAlertDialog } from '@/hooks/useAlertDialog'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { apiFetch } from '@/api/client'
import {
  entitySubQuery,
  itemSearchQuery,
  itemTextSearchQuery,
  useInvalidateResources,
} from '@/query'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

interface SatisfiedRequirement {
  id: string
  itemNumber: string
  name: string | null
  priority: string | null
  verificationStatus: string | null
  relationshipId: string
  /** The claim is stale: one end revised since it was last affirmed. */
  suspect?: boolean
  suspectReasons?: Array<SuspectReason>
}

interface RequirementSearchResult {
  id: string
  itemNumber: string
  name: string | null
  state: string
  revision: string
  priority?: string
}

interface RequirementLinkingPanelProps {
  /** The item ID to show/manage requirements for */
  itemId: string
  /** The item's design ID for filtering requirements */
  designId?: string
  /** Whether the panel is read-only */
  readOnly?: boolean
  /** Callback when requirements are updated */
  onUpdate?: () => void
}

/**
 * Panel for linking requirements to a Part or Document.
 * Shows what requirements an item satisfies and allows adding/removing links.
 */
export function RequirementLinkingPanel({
  itemId,
  designId,
  readOnly = false,
  onUpdate,
}: RequirementLinkingPanelProps) {
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')
  const suspectReasonLabels: SuspectReasonLabels = useMemo(
    () => ({
      source_revised: tp('requirements.linking.suspectSourceRevised'),
      target_revised: tp('requirements.linking.suspectTargetRevised'),
    }),
    [tp],
  )
  const { confirm } = useAlertDialog()
  const { handleError } = useErrorHandler()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState(false)
  const invalidate = useInvalidateResources()
  // Affirming is a review record, not an edit of the link, so it is offered
  // whenever a link is suspect — read-only panels included.
  const { affirm, pendingIds } = useAffirmLinks({
    invalidates: ['items'],
    onAffirmed: onUpdate,
  })

  // Requirements this item satisfies
  const { data: requirements = [], isPending: loading } = useQuery(
    entitySubQuery<SatisfiedRequirement>(
      'items',
      itemId,
      'satisfied-requirements',
      'requirements',
    ),
  )

  // Two search modes, one live at a time: a typed term searches by text,
  // and an empty box browses the first few so the dialog is never blank. A
  // single character searches nothing, as before. `designIds` (CSV) is the
  // param the endpoint reads — a singular `designId` was silently ignored,
  // leaving this search unscoped.
  const debouncedSearch = useDebouncedValue(searchQuery)
  const { data: textHits = [], isFetching: textSearching } = useQuery(
    itemTextSearchQuery<RequirementSearchResult>(
      {
        q: debouncedSearch,
        types: ['Requirement'],
        limit: 20,
        designIds: designId,
      },
      addDialogOpen && debouncedSearch.length >= 2,
    ),
  )
  const { data: browseHits = [], isFetching: browsing } = useQuery(
    itemSearchQuery<RequirementSearchResult>(
      { itemType: 'Requirement', limit: 5, designIds: designId },
      addDialogOpen && debouncedSearch.length === 0,
    ),
  )
  const searchLoading = textSearching || browsing
  const linkedIds = new Set(requirements.map((r) => r.id))
  const searchResults = (
    debouncedSearch.length >= 2
      ? textHits
      : debouncedSearch.length === 0
        ? browseHits
        : []
  ).filter((r) => !linkedIds.has(r.id))

  const handleRemoveLink = (requirementId: string) => {
    confirm({
      title: tc('confirm.removeRequirementLink'),
      description: tp('requirements.linking.removeConfirmDescription'),
      actionLabel: tc('actions.remove'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(`/api/v1/requirements/${requirementId}/satisfy`, {
            method: 'DELETE',
            body: JSON.stringify({ itemId }),
          })
          await invalidate('items')
          onUpdate?.()
        } catch (error) {
          handleError(error, { title: tp('requirements.removeLinkFailedTitle') })
        }
      },
    })
  }

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return

    setAdding(true)
    try {
      // Link each selected requirement
      for (const requirementId of selectedIds) {
        await apiFetch(`/api/v1/requirements/${requirementId}/satisfy`, {
          method: 'POST',
          body: JSON.stringify({ itemIds: [itemId] }),
        })
      }
      await invalidate('items')
      setAddDialogOpen(false)
      setSelectedIds(new Set())
      setSearchQuery('')
      onUpdate?.()
    } catch (error) {
      handleError(error, { title: tp('requirements.linkRequirementsFailedTitle') })
    } finally {
      setAdding(false)
    }
  }

  const priorityVariant = (priority: string | null) => {
    const variants: Record<
      string,
      'default' | 'secondary' | 'success' | 'warning' | 'destructive'
    > = {
      MustHave: 'destructive',
      ShouldHave: 'warning',
      CouldHave: 'default',
      WontHave: 'secondary',
    }
    return variants[priority || ''] || 'secondary'
  }

  const verificationStatusVariant = (status: string | null) => {
    const variants: Record<
      string,
      'default' | 'secondary' | 'success' | 'warning' | 'destructive'
    > = {
      NotStarted: 'secondary',
      InProgress: 'default',
      Passed: 'success',
      Failed: 'destructive',
      Waived: 'secondary',
    }
    return variants[status || ''] || 'secondary'
  }

  const columns: Array<DataGridColumn<SatisfiedRequirement>> = useMemo(
    () => [
      {
        id: 'itemNumber',
        header: tp('requirements.linking.columnRequirement'),
        accessorKey: 'itemNumber',
        enableSorting: true,
        cell: ({ row }) => (
          <Link
            to={`/requirements/${row.original.id}`}
            className="font-medium text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 hover:underline flex items-center gap-1"
          >
            {row.original.itemNumber}
            <ExternalLink className="h-3 w-3" />
          </Link>
        ),
      },
      {
        id: 'name',
        header: tc('columns.name'),
        accessorKey: 'name',
        enableSorting: true,
        cell: ({ getValue }) => (
          <span className="text-slate-600 dark:text-slate-400">
            {(getValue() as string | null) || '-'}
          </span>
        ),
      },
      {
        id: 'priority',
        header: tc('columns.priority'),
        accessorKey: 'priority',
        enableSorting: true,
        meta: { width: '100px' },
        cell: ({ getValue }) => {
          const priority = getValue() as string | null
          if (!priority) return '-'
          return (
            <Badge variant={priorityVariant(priority)}>
              {tc(`enum.requirementPriority.${priority}`, {
                defaultValue: priority,
              })}
            </Badge>
          )
        },
      },
      {
        id: 'verificationStatus',
        header: tp('requirements.linking.columnVerification'),
        accessorKey: 'verificationStatus',
        enableSorting: true,
        meta: { width: '110px' },
        cell: ({ getValue }) => {
          const status = getValue() as string | null
          if (!status) return '-'
          return (
            <Badge variant={verificationStatusVariant(status)}>
              {tc(`enum.verificationStatus.${status}`, { defaultValue: status })}
            </Badge>
          )
        },
      },
      {
        id: 'suspect',
        header: tp('requirements.linking.columnTrace'),
        accessorKey: 'suspect',
        enableSorting: true,
        meta: { width: '150px' },
        cell: ({ row }) => {
          const { suspect, suspectReasons, relationshipId } = row.original
          if (!suspect) return '-'
          return (
            <div className="flex items-center gap-2">
              <SuspectBadge
                reasons={suspectReasons}
                labels={suspectReasonLabels}
              />
              <AffirmButton
                relationshipId={relationshipId}
                pendingIds={pendingIds}
                onAffirm={affirm}
                variant="ghost"
                title={tp('requirements.linking.affirmOneTitle')}
              />
            </div>
          )
        },
      },
      ...(readOnly
        ? []
        : ([
            {
              id: 'actions',
              header: '',
              enableSorting: false,
              meta: { width: '60px', align: 'center' as const },
              cell: ({ row }) => (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveLink(row.original.id)}
                  title={tp('requirements.linking.removeLink')}
                >
                  <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                </Button>
              ),
            },
          ] as Array<DataGridColumn<SatisfiedRequirement>>)),
    ],
    [readOnly, affirm, pendingIds, tc, tp, suspectReasonLabels],
  )

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            {tp('requirements.linking.panelTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            {tp('requirements.linking.loading')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                {tp('requirements.linking.panelTitle')}
              </CardTitle>
              <CardDescription>
                {tp('requirements.linking.panelDescription')}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <AffirmAllButton
                relationshipIds={suspectIdsOf(requirements)}
                pendingIds={pendingIds}
                onAffirm={affirm}
                title={tp('requirements.linking.affirmAllTitle')}
              />
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {tp('requirements.linking.linkRequirement')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {requirements.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-slate-500 mb-4">
                {tp('requirements.linking.emptyLinked')}
              </p>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {tp('requirements.linking.linkFirstRequirement')}
                </Button>
              )}
            </div>
          ) : (
            <DataGrid
              data={requirements}
              columns={columns}
              getRowId={(row) => row.id}
              enablePagination={requirements.length > 10}
              defaultPageSize={10}
              emptyMessage={tp('requirements.linking.emptyGrid')}
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{tc('dialogs.linkRequirements.title')}</DialogTitle>
            <DialogDescription>
              {tc('dialogs.linkRequirements.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder={tp('requirements.linking.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />

            {searchLoading ? (
              <p className="text-sm text-slate-500">
                {tp('requirements.linking.searching')}
              </p>
            ) : searchResults.length > 0 ? (
              <div className="border border-slate-300 dark:border-slate-700 rounded-lg divide-y divide-slate-200 dark:divide-slate-700 max-h-80 overflow-auto">
                {searchResults.map((req) => (
                  <div
                    key={req.id}
                    className={`p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer ${
                      selectedIds.has(req.id)
                        ? 'bg-cyan-50 dark:bg-cyan-950'
                        : ''
                    }`}
                    onClick={() => toggleSelection(req.id)}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {req.itemNumber}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {req.revision}
                        </Badge>
                        {req.priority && (
                          <Badge
                            variant={priorityVariant(req.priority)}
                            className="text-xs"
                          >
                            {tc(`enum.requirementPriority.${req.priority}`, {
                              defaultValue: req.priority,
                            })}
                          </Badge>
                        )}
                      </div>
                      {req.name && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                          {req.name}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge variant="secondary" className="text-xs">
                        {req.state}
                      </Badge>
                      {selectedIds.has(req.id) && (
                        <Badge variant="default">
                          {tp('requirements.linking.selected')}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : searchQuery.length === 1 ? (
              <p className="text-sm text-slate-500">
                {tp('requirements.linking.searchMinChars')}
              </p>
            ) : searchQuery.length >= 2 ? (
              <p className="text-sm text-slate-500">
                {tp('requirements.linking.noRequirementsFound')}
              </p>
            ) : (
              <p className="text-sm text-slate-500">
                {tp('requirements.linking.noRequirementsAvailable')}
              </p>
            )}

            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm text-slate-500">
                {tp('requirements.linking.selectedCount', {
                  count: selectedIds.size,
                })}
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddDialogOpen(false)
                    setSelectedIds(new Set())
                    setSearchQuery('')
                  }}
                >
                  {tc('actions.cancel')}
                </Button>
                <Button
                  type="button"
                  disabled={selectedIds.size === 0 || adding}
                  onClick={handleAddSelected}
                >
                  {adding
                    ? tp('requirements.linking.linking')
                    : tp('requirements.linking.linkCount', {
                        count: selectedIds.size,
                      })}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

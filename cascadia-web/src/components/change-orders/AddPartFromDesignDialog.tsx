// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Info, Loader2, Search } from 'lucide-react'
import { formatRevision } from '@cascadia/commons/types/lifecycle'
import type { ChangeAction } from '@cascadia/commons/types/lifecycle'
import type { DataGridColumn } from '@/components/ui/DataGrid'
import type { Row } from '@tanstack/react-table'
import { changeActionOptionsQuery } from '@/query'
import {
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'
import { DataGrid } from '@/components/ui/DataGrid'
import { apiFetch } from '@/api/client'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { changeOrderAffectedItemsQuery } from '@/query/options/change-orders'
import { designItemsGridQuery } from '@/query/options/design-items'
import { itemTextSearchQuery } from '@/query/options/item-search'
import { useAlertDialog } from '@/hooks/useAlertDialog'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { cn } from '@/utils'
import { StateBadge } from '@/components/items/StateBadge'

interface DesignItem {
  id: string
  itemNumber: string
  name: string | null
  revision: string
  state: string
  itemType: string
}

interface CrossDesignItem {
  id: string
  itemNumber: string
  name: string
  revision: string
  state: string
  itemType: string
  designId?: string | null
  designCode?: string | null
  designName?: string | null
}

type ImportDesignScope = 'all' | 'library'

interface AddPartFromDesignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  designId: string
  designName: string
  changeOrderId: string
  designType?: string
  branchId?: string | null
  onSuccess: () => void
}

export function AddPartFromDesignDialog({
  open,
  onOpenChange,
  designId,
  designName,
  changeOrderId,
  designType,
  branchId,
  onSuccess,
}: AddPartFromDesignDialogProps) {
  const { t: tc } = useTranslation('common')
  const { alert } = useAlertDialog()
  const { handleError, showWarning } = useErrorHandler()
  const isLibrary = designType === 'Library'
  const [step, setStep] = useState<'select' | 'review'>('select')
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedItemsMap, setSelectedItemsMap] = useState<
    Map<string, DesignItem>
  >(new Map())
  const [description, setDescription] = useState('')
  const [actionOverrides, setActionOverrides] = useState<
    Record<string, ChangeAction>
  >({})

  // Server-side pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Library mode toggle: 'add' = add existing library parts, 'import' = cross-design import
  const [libraryMode, setLibraryMode] = useState<'add' | 'import'>('add')

  // Import mode state (Library designs)
  const [importScope, setImportScope] = useState<ImportDesignScope>('all')

  // Reopening the dialog starts over — the queries below refetch on their own,
  // but the selection the user built up last time must not survive.
  useEffect(() => {
    if (!open) return
    setStep('select')
    setSelectedIds(new Set())
    setSelectedItemsMap(new Map())
    setSearchQuery('')
    setDescription('')
    setActionOverrides({})
    setImportScope('all')
    setLibraryMode('add')
    setPage(1)
    setPageSize(20)
  }, [open])

  // One request per typing pause; the queries below key on the settled term.
  const debouncedSearch = useDebouncedValue(searchQuery)
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const isImporting = isLibrary && libraryMode === 'import'

  // Items already on the change order, so the picker can mark them
  const { data: affectedItems = [] } = useQuery({
    ...changeOrderAffectedItemsQuery(changeOrderId),
    enabled: open,
  })
  const affectedItemIds = new Set(
    affectedItems
      .map((item) => item.affectedItemId)
      .filter((id): id is string => Boolean(id)),
  )

  // The design's own parts, paged
  const { data: pageData, isFetching: loading } = useQuery({
    ...designItemsGridQuery(
      designId,
      { page, pageSize, globalSearch: debouncedSearch },
      { itemType: 'Part' },
    ),
    enabled: open && !isImporting,
  })
  const pageItems: Array<DesignItem> = pageData?.items ?? []
  const totalItems = pageData?.total ?? 0

  // Everything already in this Library design, to keep the import list to
  // things that are not here yet.
  const { data: existingData } = useQuery({
    ...designItemsGridQuery(
      designId,
      { page: 1, pageSize: 1000 },
      { itemType: 'Part' },
    ),
    enabled: open && isLibrary,
  })
  const existingDesignItemIds = new Set(
    (existingData?.items ?? []).map((i) => i.id),
  )

  // Cross-design search, for Library import mode
  const { data: importMatches = [], isFetching: importSearching } = useQuery(
    itemTextSearchQuery<CrossDesignItem>(
      {
        q: debouncedSearch,
        types: ['Part'],
        // 'all' means no scope restriction rather than a scope named 'all'
        designScope: importScope === 'library' ? 'library' : undefined,
        contextDesignId: designId,
      },
      open && isImporting && debouncedSearch.length >= 2,
    ),
  )
  const importResults = importMatches.filter(
    (item) => item.designId !== designId && !existingDesignItemIds.has(item.id),
  )

  // --- Selection helpers ---

  const toggleItem = (id: string, item?: DesignItem) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
    setSelectedItemsMap((prev) => {
      const next = new Map(prev)
      if (next.has(id)) {
        next.delete(id)
      } else if (item) {
        next.set(id, item)
      }
      return next
    })
  }

  const toggleAllOnPage = (checked: boolean) => {
    const selectableItems = pageItems.filter(
      (item) => !affectedItemIds.has(item.id),
    )
    setSelectedIds((prev) => {
      const next = new Set(prev)
      for (const item of selectableItems) {
        if (checked) {
          next.add(item.id)
        } else {
          next.delete(item.id)
        }
      }
      return next
    })
    setSelectedItemsMap((prev) => {
      const next = new Map(prev)
      for (const item of selectableItems) {
        if (checked) {
          next.set(item.id, item)
        } else {
          next.delete(item.id)
        }
      }
      return next
    })
  }

  // For normal mode — use accumulated map
  const selectedItems = Array.from(selectedItemsMap.values())

  // For import mode
  const selectedImportItems = importResults.filter((item) =>
    selectedIds.has(item.id),
  )

  // What the server will do for each selected item, resolved from its
  // lifecycle rather than guessed from its state name
  const { data: actionOptions, isLoading: loadingActionOptions } = useQuery({
    ...changeActionOptionsQuery(
      changeOrderId,
      selectedItems.map((i) => i.id),
    ),
    enabled: open && selectedItems.length > 0,
  })
  const optionsByItemId = new Map(
    (actionOptions ?? []).map((o) => [o.itemId, o]),
  )

  const getItemAction = (item: DesignItem): ChangeAction | null => {
    return (
      actionOverrides[item.id] ??
      optionsByItemId.get(item.id)?.defaultAction ??
      null
    )
  }

  const setItemAction = (itemId: string, action: ChangeAction) => {
    setActionOverrides((prev) => ({ ...prev, [itemId]: action }))
  }

  // Normal mode submit
  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // Items whose state maps to no action are left out rather than sent
      // with a guessed one
      const itemsPayload = selectedItems.flatMap((item) => {
        const action = getItemAction(item)
        if (!action) return []
        return [
          {
            affectedItemId: item.id,
            changeAction: action,
            changeDescription: description || null,
          },
        ]
      })

      if (itemsPayload.length === 0) {
        showWarning(
          tc('dialogs.batchAddToEco.nothingToAddTitle'),
          tc('dialogs.batchAddToEco.nothingToAddDescription'),
        )
        return
      }

      await apiFetch(`/api/v1/change-orders/${changeOrderId}/affected-items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsPayload }),
      })

      alert({
        title: tc('dialogs.addPartFromDesign.itemsAddedTitle'),
        description: tc('dialogs.addPartFromDesign.itemsAddedDescription', {
          count: selectedItems.length,
        }),
      })

      onOpenChange(false)
      onSuccess()
    } catch (error) {
      handleError(error, {
        title: tc('dialogs.addPartFromDesign.failedAddTitle'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Library import mode submit
  const handleImportSubmit = async () => {
    setSubmitting(true)
    try {
      // Step 1: Create usages in the Library design for each selected item
      const createdUsageIds: Array<string> = []

      for (const item of selectedImportItems) {
        const response = await apiFetch<{
          data: {
            items: Array<{ id: string; revision: string; state: string }>
          }
        }>(`/api/v1/designs/${designId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: item.id,
            mode: 'usage_copy',
            branchId: branchId || undefined,
          }),
        })

        for (const created of response.data.items) {
          createdUsageIds.push(created.id)
        }
      }

      // Step 2: Register the created usages on the ECO. They are new items on
      // its branch, so the action is a first release — the branch merge assigns
      // the initial revision. (This used to send 'add', which did nothing at
      // merge; the branch merge released them anyway and the row was only ever
      // paperwork for the scope check.)
      if (createdUsageIds.length > 0) {
        const itemsPayload = createdUsageIds.map((id) => ({
          affectedItemId: id,
          changeAction: 'release' as const,
          changeDescription: description || null,
        }))

        await apiFetch(
          `/api/v1/change-orders/${changeOrderId}/affected-items`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: itemsPayload }),
          },
        )
      }

      alert({
        title: tc('dialogs.addPartFromDesign.partsImportedTitle'),
        description: tc('dialogs.addPartFromDesign.partsImportedDescription', {
          count: selectedImportItems.length,
        }),
      })

      onOpenChange(false)
      onSuccess()
    } catch (error) {
      handleError(error, {
        title: tc('dialogs.addPartFromDesign.failedImportTitle'),
      })
    } finally {
      setSubmitting(false)
    }
  }

  const scopeOptions: Array<{ value: ImportDesignScope; labelKey: string }> = [
    {
      value: 'all',
      labelKey: 'dialogs.addPartFromDesign.scopeAllDesigns',
    },
    {
      value: 'library',
      labelKey: 'dialogs.addPartFromDesign.scopeLibraries',
    },
  ]

  // Determine effective selected items for display
  const effectiveSelectedCount =
    isLibrary && libraryMode === 'import'
      ? selectedImportItems.length
      : selectedIds.size

  // Switch library mode handler — clears selection state
  const switchLibraryMode = (mode: 'add' | 'import') => {
    if (mode === libraryMode) return
    setLibraryMode(mode)
    setSelectedIds(new Set())
    setSelectedItemsMap(new Map())
    setSearchQuery('')
    setPage(1)
  }

  // --- DataGrid columns for design items ---
  const selectableOnPage = pageItems.filter(
    (item) => !affectedItemIds.has(item.id),
  )
  const allPageSelected =
    selectableOnPage.length > 0 &&
    selectableOnPage.every((item) => selectedIds.has(item.id))
  const somePageSelected = selectableOnPage.some((item) =>
    selectedIds.has(item.id),
  )

  const designItemColumns: Array<DataGridColumn<DesignItem>> = [
    {
      id: 'select',
      header: '', // We render a custom header via cell — but DataGrid uses string headers
      accessorFn: () => null,
      cell: ({ row }: { row: Row<DesignItem>; getValue: () => unknown }) => {
        const item = row.original
        const isAffected = affectedItemIds.has(item.id)
        const isSelected = selectedIds.has(item.id)
        return (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => !isAffected && toggleItem(item.id, item)}
            disabled={isAffected}
          />
        )
      },
      enableSorting: false,
      enableFiltering: false,
      meta: { width: '40px' },
    },
    {
      id: 'itemNumber',
      header: tc('columns.item'),
      accessorKey: 'itemNumber',
      enableSorting: false,
      meta: { width: '140px' },
    },
    {
      id: 'name',
      header: tc('columns.name'),
      accessorKey: 'name',
      enableSorting: false,
      cell: ({
        getValue,
      }: {
        row: Row<DesignItem>
        getValue: () => unknown
      }) => {
        const val = getValue() as string | null
        return (
          <span className="truncate text-slate-600 dark:text-slate-400">
            {val || '-'}
          </span>
        )
      },
    },
    {
      id: 'revision',
      header: tc('labels.rev'),
      accessorKey: 'revision',
      enableSorting: false,
      meta: { width: '60px', align: 'center' as const },
      cell: ({ getValue }) => formatRevision(getValue() as string),
    },
    {
      id: 'state',
      header: tc('labels.state'),
      accessorKey: 'state',
      enableSorting: false,
      cell: ({
        getValue,
      }: {
        row: Row<DesignItem>
        getValue: () => unknown
      }) => {
        const state = getValue() as string
        return <StateBadge itemType="Part" state={state} className="text-xs" />
      },
      meta: { width: '100px', align: 'center' as const },
    },
    {
      id: 'eco',
      header: '',
      accessorFn: () => null,
      enableSorting: false,
      enableFiltering: false,
      cell: ({ row }: { row: Row<DesignItem>; getValue: () => unknown }) => {
        if (affectedItemIds.has(row.original.id)) {
          return (
            <Badge variant="outline" className="text-xs">
              {tc('dialogs.addPartFromDesign.alreadyInEco')}
            </Badge>
          )
        }
        return null
      },
      meta: { width: '110px' },
    },
  ]

  // Render the design items DataGrid (shared between normal and library "add" modes)
  const renderDesignItemsGrid = () => (
    <div className="flex flex-col min-h-0 flex-1 gap-2">
      {/* Search + count + select-all */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={tc('dialogs.addPartFromDesign.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8"
          />
        </div>
        {selectableOnPage.length > 0 && (
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer whitespace-nowrap">
            <Checkbox
              checked={allPageSelected}
              // Use string 'indeterminate' or boolean for indeterminate state
              {...(somePageSelected && !allPageSelected
                ? { 'data-state': 'indeterminate' }
                : {})}
              onCheckedChange={(checked) => toggleAllOnPage(!!checked)}
            />
            {tc('dialogs.addPartFromDesign.allOnPage')}
          </label>
        )}
        {selectedIds.size > 0 && (
          <Badge variant="default" className="text-xs whitespace-nowrap">
            {tc('dialogs.addPartFromDesign.selectedCount', {
              count: selectedIds.size,
            })}
          </Badge>
        )}
      </div>

      {/* DataGrid */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <DataGrid
          data={pageItems}
          columns={designItemColumns}
          getRowId={(row) => row.id}
          serverSidePagination
          serverSideOperations
          totalRows={totalItems}
          isLoading={loading}
          pagination={{ pageIndex: page - 1, pageSize }}
          onPaginationChange={(p) => {
            setPage(p.pageIndex + 1)
            setPageSize(p.pageSize)
          }}
          onPageChange={(p, ps) => {
            setPage(p)
            setPageSize(ps)
          }}
          enableGlobalFilter={false}
          enableFiltering={false}
          enableSorting={false}
          defaultPageSize={20}
          pageSizeOptions={[20, 50, 100]}
          emptyMessage={
            searchQuery
              ? tc('dialogs.addPartFromDesign.noSearchMatch')
              : tc('dialogs.addPartFromDesign.noPartsInDesign')
          }
        />
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] grid-rows-[auto_1fr_auto] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {step === 'select'
              ? isLibrary
                ? tc('dialogs.addPartFromDesign.titleAddToLibrary', {
                    designName,
                  })
                : tc('dialogs.addPartFromDesign.titleAddFromDesign', {
                    designName,
                  })
              : tc('dialogs.addPartFromDesign.titleReview', {
                  count: effectiveSelectedCount,
                })}
          </DialogTitle>
          <DialogDescription>
            {step === 'select'
              ? isLibrary
                ? tc('dialogs.addPartFromDesign.descSelectLibrary')
                : tc('dialogs.addPartFromDesign.descSelectDesign')
              : isLibrary && libraryMode === 'import'
                ? tc('dialogs.addPartFromDesign.descReviewImport')
                : tc('dialogs.addPartFromDesign.descReviewNormal')}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          isLibrary ? (
            /* Step 1 — Library Mode: Toggle between Add from Library / Import from Designs */
            <div className="space-y-3 py-2 overflow-hidden flex flex-col min-h-0">
              {/* Mode toggle */}
              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => switchLibraryMode('add')}
                  className={cn(
                    'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    libraryMode === 'add'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                  )}
                >
                  {tc('dialogs.addPartFromDesign.addFromLibrary')}
                </button>
                <button
                  type="button"
                  onClick={() => switchLibraryMode('import')}
                  className={cn(
                    'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                    libraryMode === 'import'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                  )}
                >
                  {tc('dialogs.addPartFromDesign.importFromDesigns')}
                </button>
              </div>

              {libraryMode === 'import' ? (
                /* Import from Designs sub-mode */
                <>
                  {/* Scope selector */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      {tc('dialogs.addPartFromDesign.sourceLabel')}
                    </Label>
                    <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      {scopeOptions.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setImportScope(option.value)}
                          className={cn(
                            'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                            importScope === option.value
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                          )}
                        >
                          {tc(option.labelKey)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search + count */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder={tc(
                          'dialogs.addPartFromDesign.searchImportPlaceholder',
                        )}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-8"
                      />
                    </div>
                    {selectedIds.size > 0 && (
                      <Badge
                        variant="default"
                        className="text-xs whitespace-nowrap"
                      >
                        {tc('dialogs.addPartFromDesign.selectedCount', {
                          count: selectedIds.size,
                        })}
                      </Badge>
                    )}
                  </div>

                  {/* Scrollable results */}
                  <div className="border rounded-lg dark:border-slate-700 overflow-y-auto min-h-0 flex-1">
                    {importSearching ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                      </div>
                    ) : searchQuery.length < 2 ? (
                      <div className="text-center py-8 text-sm text-slate-500">
                        {tc('dialogs.addPartFromDesign.minImportSearch')}
                      </div>
                    ) : importResults.length === 0 ? (
                      <div className="text-center py-8 text-sm text-slate-500">
                        {tc('dialogs.addPartFromDesign.noImportMatch')}
                      </div>
                    ) : (
                      <div className="divide-y dark:divide-slate-700">
                        {importResults.map((item) => {
                          const isAffected = affectedItemIds.has(item.id)
                          const isSelected = selectedIds.has(item.id)

                          return (
                            <label
                              key={item.id}
                              className={cn(
                                'flex items-center gap-3 px-3 py-1.5 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800',
                                isAffected && 'opacity-50 cursor-not-allowed',
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() =>
                                  !isAffected && toggleItem(item.id)
                                }
                                disabled={isAffected}
                              />
                              <span className="font-medium text-slate-900 dark:text-white min-w-[120px] truncate">
                                {item.itemNumber}
                              </span>
                              <span className="flex-1 text-slate-600 dark:text-slate-400 truncate">
                                {item.name || '-'}
                              </span>
                              <span className="text-xs text-slate-500 w-10 text-center">
                                {formatRevision(item.revision)}
                              </span>
                              <StateBadge
                                itemType="Part"
                                state={item.state}
                                className="text-xs"
                              />
                              {item.designCode && (
                                <Badge variant="outline" className="text-xs">
                                  {item.designCode}
                                </Badge>
                              )}
                              {isAffected && (
                                <Badge variant="outline" className="text-xs">
                                  {tc('dialogs.addPartFromDesign.alreadyInEco')}
                                </Badge>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Add from Library sub-mode — server-side paginated DataGrid */
                renderDesignItemsGrid()
              )}
            </div>
          ) : (
            /* Step 1 — Normal Mode: Select parts from same design */
            <div className="space-y-3 py-2 overflow-hidden flex flex-col min-h-0">
              {renderDesignItemsGrid()}
            </div>
          )
        ) : isLibrary && libraryMode === 'import' ? (
          /* Step 2 — Import Mode Review */
          <div className="space-y-4 py-2 overflow-y-auto min-h-0">
            {/* Info banner */}
            <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  {tc('dialogs.addPartFromDesign.importingAsUsagesTitle')}
                </p>
                <p className="text-blue-700 dark:text-blue-300 mt-0.5">
                  <Trans
                    i18nKey="dialogs.addPartFromDesign.importingAsUsagesDescription"
                    components={{ strong: <strong /> }}
                  />
                </p>
              </div>
            </div>

            <div className="border rounded-lg dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                  <tr className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <th className="text-left px-3 py-1.5">
                      {tc('columns.item')}
                    </th>
                    <th className="text-left px-3 py-1.5">
                      {tc('columns.name')}
                    </th>
                    <th className="text-center px-3 py-1.5">
                      {tc('labels.rev')}
                    </th>
                    <th className="text-center px-3 py-1.5">
                      {tc('labels.state')}
                    </th>
                    <th className="text-center px-3 py-1.5">
                      {tc('dialogs.addPartFromDesign.tableSource')}
                    </th>
                    <th className="text-center px-3 py-1.5">
                      {tc('labels.action')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {selectedImportItems.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <td className="px-3 py-1.5 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {item.itemNumber}
                      </td>
                      <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                        {item.name || '-'}
                      </td>
                      <td className="px-3 py-1.5 text-center text-xs text-slate-500 dark:text-slate-400">
                        {formatRevision(item.revision)}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <StateBadge
                          itemType="Part"
                          state={item.state}
                          className="text-xs"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        {item.designCode && (
                          <Badge variant="outline" className="text-xs">
                            {item.designCode}
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <Badge variant="success" className="text-xs">
                          Add
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-parts-description">
                {tc('labels.descriptionOptional')}
              </Label>
              <Textarea
                id="import-parts-description"
                placeholder={tc(
                  'dialogs.addPartFromDesign.importDescriptionPlaceholder',
                )}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        ) : (
          /* Step 2 — Normal Mode Review */
          <div className="space-y-4 py-2 overflow-y-auto min-h-0">
            <div className="border rounded-lg dark:border-slate-700">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0">
                  <tr className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                    <th className="text-left px-3 py-1.5">
                      {tc('columns.item')}
                    </th>
                    <th className="text-left px-3 py-1.5">
                      {tc('columns.name')}
                    </th>
                    <th className="text-center px-3 py-1.5">
                      {tc('labels.rev')}
                    </th>
                    <th className="text-center px-3 py-1.5">
                      {tc('labels.state')}
                    </th>
                    <th className="text-center px-3 py-1.5">
                      {tc('labels.action')}
                    </th>
                    <th className="text-center px-3 py-1.5">
                      {tc('labels.target')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-700">
                  {selectedItems.map((item) => {
                    const action = getItemAction(item)
                    const itemOptions = optionsByItemId.get(item.id)
                    const available = itemOptions?.actions ?? []
                    const target = available.find((a) => a.action === action)

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <td className="px-3 py-1.5 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          {item.itemNumber}
                        </td>
                        <td className="px-3 py-1.5 text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                          {item.name || '-'}
                        </td>
                        <td className="px-3 py-1.5 text-center text-xs text-slate-500 dark:text-slate-400">
                          {formatRevision(item.revision)}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <StateBadge
                            itemType="Part"
                            state={item.state}
                            className="text-xs"
                          />
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {loadingActionOptions ? (
                            <Loader2 className="h-3 w-3 animate-spin mx-auto text-slate-400" />
                          ) : available.length > 1 ? (
                            <Select
                              value={action ?? undefined}
                              onValueChange={(v) =>
                                setItemAction(item.id, v as ChangeAction)
                              }
                            >
                              <SelectTrigger className="h-7 w-24 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {available.map((a) => (
                                  <SelectItem key={a.action} value={a.action}>
                                    {a.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge
                              variant={
                                action === 'release'
                                  ? 'success'
                                  : action === 'obsolete'
                                    ? 'destructive'
                                    : action
                                      ? 'default'
                                      : 'outline'
                              }
                              className="text-xs"
                            >
                              {available.at(0)?.label ??
                                tc('dialogs.addPartFromDesign.noActionAvailable')}
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-center text-xs text-slate-500 dark:text-slate-400">
                          {target?.targetState
                            ? target.targetRevision
                              ? `Rev ${target.targetRevision} (${target.targetState})`
                              : target.targetState
                            : (itemOptions?.blockedReason ?? '—')}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-parts-description">
                {tc('labels.descriptionOptional')}
              </Label>
              <Textarea
                id="add-parts-description"
                placeholder={tc('dialogs.addPartFromDesign.describePlaceholder')}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'review' && (
            <Button
              variant="outline"
              onClick={() => setStep('select')}
              className="mr-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {tc('actions.back')}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('actions.cancel')}
          </Button>
          {step === 'select' ? (
            <Button
              onClick={() => setStep('review')}
              disabled={selectedIds.size === 0}
            >
              {tc('dialogs.addPartFromDesign.reviewButton', {
                count: selectedIds.size,
              })}
            </Button>
          ) : (
            <Button
              onClick={
                isLibrary && libraryMode === 'import'
                  ? handleImportSubmit
                  : handleSubmit
              }
              disabled={submitting || effectiveSelectedCount === 0}
            >
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLibrary && libraryMode === 'import'
                ? tc('dialogs.addPartFromDesign.importParts', {
                    count: effectiveSelectedCount,
                  })
                : tc('dialogs.addPartFromDesign.addItems', {
                    count: selectedItems.length,
                  })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

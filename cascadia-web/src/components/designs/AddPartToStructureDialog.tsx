// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useEffect, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ExternalLink, Search } from 'lucide-react'
import { AddPartChoice } from './AddPartChoice'
import { CreatePartInDesignForm } from './CreatePartInDesignForm'
import type { AddPartStep } from './AddPartChoice'
import type { Part } from '@cascadia/commons/items/types/part'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { apiFetch } from '@/api/client'
import { entityQuery, useResourceMutation } from '@/query'
import { cn } from '@/utils'
import { StateBadge } from '@/components/items/StateBadge'

type DesignScope = 'current' | 'library'

interface EnrichedItem {
  id: string
  itemNumber: string
  revision: string
  itemType: string
  name: string
  state: string
  designId?: string | null
  designCode?: string | null
  designName?: string | null
  isExternal?: boolean
}

interface AddPartToStructureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentItemId: string
  parentItemNumber: string
  currentDesignId: string
  currentDesignCode: string
  /**
   * The branch the design page is viewing, for the create path; undefined
   * is main. The use-existing path is unchanged and does not read it.
   */
  branchId?: string
  onSuccess?: () => void
}

/**
 * Opens on a choice — make a new part under the parent, or bring in one that
 * exists. 'existing' is the original dialog: a part from this design or the
 * standard library, added as a BOM line. 'create' is the in-place part form,
 * which writes the part and then the same line.
 */
export function AddPartToStructureDialog({
  open,
  onOpenChange,
  parentItemId,
  parentItemNumber,
  currentDesignId,
  currentDesignCode,
  branchId,
  onSuccess,
}: AddPartToStructureDialogProps) {
  const { t: tc } = useTranslation('common')
  const { handleError } = useErrorHandler()
  const [step, setStep] = useState<AddPartStep>('choose')
  const [designScope, setDesignScope] = useState<DesignScope>('current')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<EnrichedItem>>([])
  const [selectedItem, setSelectedItem] = useState<EnrichedItem | null>(null)
  const [quantity, setQuantity] = useState('1')
  const [findNumber, setFindNumber] = useState('')
  const [targetMakeCode, setTargetMakeCode] = useState('__none__')
  const [searching, setSearching] = useState(false)
  const { data: selectedPart } = useQuery(
    entityQuery<Part>(
      'parts',
      selectedItem?.id ?? '',
      'part',
      Boolean(selectedItem?.id),
    ),
  )

  useEffect(() => {
    setTargetMakeCode('__none__')
  }, [selectedItem?.id])

  // Search for parts based on scope and query
  const handleSearch = async () => {
    if (searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const params = new URLSearchParams({
        q: searchQuery,
        types: 'Part',
        limit: '50',
        designScope,
        contextDesignId: currentDesignId,
      })

      const response = await fetch(`/api/v1/items/search?${params}`)
      if (response.ok) {
        const data = await response.json()
        // Filter out the parent item itself
        const items = (data.data?.items ?? []).filter(
          (item: EnrichedItem) => item.id !== parentItemId,
        )
        setSearchResults(items)
      }
    } catch {
      // Silently fail - search results will remain empty
    } finally {
      setSearching(false)
    }
  }

  // Search when query or scope changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        handleSearch()
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(debounceTimer)
  }, [searchQuery, designScope])

  // Reset state when dialog opens, on the choice
  useEffect(() => {
    if (open) {
      setStep('choose')
      setDesignScope('current')
      setSearchQuery('')
      setSearchResults([])
      setSelectedItem(null)
      setQuantity('1')
      setFindNumber('')
      setTargetMakeCode('__none__')
    }
  }, [open])

  const addPart = useResourceMutation({
    mutationFn: (item: EnrichedItem) =>
      apiFetch(`/api/v1/items/${parentItemId}/relationships`, {
        method: 'POST',
        body: JSON.stringify({
          targetId: item.id,
          relationshipType: 'BOM',
          quantity: quantity || '1',
          findNumber: findNumber ? parseInt(findNumber) : undefined,
          targetMakeCode:
            targetMakeCode === '__none__' ? undefined : targetMakeCode,
        }),
      }),
    invalidates: ['relationships'],
    onSuccess: () => {
      onSuccess?.()
      onOpenChange(false)
    },
    onError: (error: unknown) => {
      handleError(error, { title: tc('dialogs.addPartToStructure.failedTitle') })
    },
  })

  const handleAdd = () => {
    if (!selectedItem) return
    addPart.mutate(selectedItem)
  }

  const scopeOptions: Array<{ value: DesignScope; labelKey: string }> = [
    { value: 'current', labelKey: 'dialogs.addPartToStructure.scopeThisDesign' },
    { value: 'library', labelKey: 'dialogs.addPartToStructure.scopeLibraries' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto auto-hide-scroll">
        <DialogHeader>
          <DialogTitle>
            {step === 'choose'
              ? tc('dialogs.addPartToStructure.titleChoose')
              : step === 'create'
                ? tc('dialogs.addPartToStructure.titleCreate')
                : tc('dialogs.addPartToStructure.titleExisting')}
          </DialogTitle>
          <DialogDescription>
            {step === 'choose' ? (
              <Trans
                i18nKey="dialogs.addPartToStructure.descChoose"
                values={{ parentItemNumber }}
                components={{ strong: <span className="font-medium" /> }}
              />
            ) : step === 'create' ? (
              <Trans
                i18nKey="dialogs.addPartToStructure.descCreate"
                values={{ currentDesignCode, parentItemNumber }}
                components={{ strong: <span className="font-medium" /> }}
              />
            ) : (
              <Trans
                i18nKey="dialogs.addPartToStructure.descExisting"
                values={{ parentItemNumber, currentDesignCode }}
                components={{ strong: <span className="font-medium" /> }}
              />
            )}
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' && (
          <AddPartChoice
            createDescription={tc(
              'dialogs.addPartToStructure.createChoiceDescription',
              { currentDesignCode, parentItemNumber },
            )}
            existingDescription={tc(
              'dialogs.addPartToStructure.existingChoiceDescription',
              { parentItemNumber },
            )}
            onCreateNew={() => setStep('create')}
            onUseExisting={() => setStep('existing')}
          />
        )}

        {step === 'create' && (
          <CreatePartInDesignForm
            designId={currentDesignId}
            designCode={currentDesignCode}
            branchId={branchId}
            parent={{ id: parentItemId, itemNumber: parentItemNumber }}
            onBack={() => setStep('choose')}
            onCreated={() => {
              onSuccess?.()
              onOpenChange(false)
            }}
          />
        )}

        {step === 'existing' && (
          <div className="space-y-4">
            {/* Source Selector */}
            <div>
              <Label className="text-sm font-medium mb-2 block">
                {tc('dialogs.addPartToStructure.sourceLabel')}
              </Label>
              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {scopeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDesignScope(option.value)}
                    className={cn(
                      'flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                      designScope === option.value
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white',
                    )}
                  >
                    {tc(option.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input */}
            <div>
              <Label>{tc('dialogs.addPartToStructure.searchPartsLabel')}</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder={tc(
                    'dialogs.addPartToStructure.searchPartsPlaceholder',
                  )}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Search Results */}
            <div className="border border-slate-300 dark:border-slate-700 rounded-lg max-h-48 overflow-y-auto auto-hide-scroll">
              {searching ? (
                <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  {tc('dialogs.addPartToStructure.searching')}
                </div>
              ) : searchQuery.length < 2 ? (
                <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  {tc('dialogs.addPartToStructure.minSearchChars')}
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                  {tc('dialogs.addPartToStructure.noMatch', {
                    query: searchQuery,
                  })}
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {searchResults.map((item) => {
                    const isSelected = selectedItem?.id === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className={cn(
                          'w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors',
                          isSelected && 'bg-cyan-50 dark:bg-cyan-950',
                        )}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <div
                            className={cn(
                              'flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center',
                              isSelected
                                ? 'border-slate-900 dark:border-slate-50'
                                : 'border-slate-300 dark:border-slate-600',
                            )}
                          >
                            {isSelected && (
                              <div className="w-2 h-2 rounded-full bg-slate-900 dark:bg-slate-50" />
                            )}
                          </div>
                          <span className="font-medium text-sm text-slate-900 dark:text-slate-100">
                            {item.itemNumber}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {item.revision}
                          </Badge>
                          <StateBadge
                            itemType={item.itemType}
                            state={item.state}
                            className="text-xs"
                          />
                          {/* External design badge */}
                          {item.isExternal && item.designCode && (
                            <Badge
                              variant="outline"
                              className="text-xs text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-600"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              {item.designCode}
                            </Badge>
                          )}
                        </div>
                        {item.name && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 ml-6">
                            {item.name}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* BOM Fields */}
            {selectedItem && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <Label>{tc('dialogs.addPartToStructure.quantityLabel')}</Label>
                  <Input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label>
                    {tc('dialogs.addPartToStructure.findNumberLabel')}
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={findNumber}
                    onChange={(e) => setFindNumber(e.target.value)}
                    placeholder={tc(
                      'dialogs.addPartToStructure.optionalPlaceholder',
                    )}
                  />
                </div>
              </div>
            )}

            {selectedItem && (selectedPart?.makes?.length ?? 0) > 0 && (
              <div>
                <Label>
                  {tc('dialogs.addPartToStructure.targetExecutionLabel')}
                </Label>
                <Select
                  value={targetMakeCode}
                  onValueChange={setTargetMakeCode}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      {tc('dialogs.addPartToStructure.unspecified')}
                    </SelectItem>
                    {selectedPart?.makes
                      ?.filter((make) => make.active)
                      .map((make) => (
                        <SelectItem key={make.code} value={make.code}>
                          {make.code}
                          {make.name ? ` — ${make.name}` : ''}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {tc('dialogs.addPartToStructure.targetExecutionHint')}
                </p>
              </div>
            )}
          </div>
        )}

        {step === 'choose' && (
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc('actions.cancel')}
            </Button>
          </DialogFooter>
        )}

        {step === 'existing' && (
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="mr-auto"
              onClick={() => setStep('choose')}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              {tc('actions.back')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tc('actions.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={!selectedItem || addPart.isPending}
            >
              {addPart.isPending
                ? tc('actions.adding')
                : tc('dialogs.addPartToStructure.addToBom')}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

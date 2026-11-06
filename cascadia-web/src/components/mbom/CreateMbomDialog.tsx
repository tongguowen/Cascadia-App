// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Factory, Loader2, XCircle } from 'lucide-react'
import type { BOMTreeNode, OrphanItem } from '@cascadia/commons/types/bom'
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
import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { apiFetch } from '@/api/client'
import {
  designStructureQuery,
  designTagsQuery,
  useResourceMutation,
} from '@/query'

interface Tag {
  id: string
  name: string
  tagType: string
  createdAt: string
}

/** Product variants: derive the MBOM as one configuration of a part. */
export interface MbomConfigurationInput {
  rootItemId: string
  rootItemNumber: string
  makeCode?: string
  selections: Record<string, string>
}

interface CreateMbomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceDesignId: string
  sourceDesignCode: string
  sourceDesignName: string
  /**
   * When given, the copied BOM is resolved against these selections: lines
   * they do not admit are left out and the rest become fixed lines. Shown
   * read-only; the Variants tab is where it is chosen.
   */
  configuration?: MbomConfigurationInput
}

interface MbomResult {
  design: {
    id: string
    code: string
    name: string
  }
  itemsCopied: number
  relationshipsCopied: number
  sourceLinks: number
  linesFiltered?: number
}

export function CreateMbomDialog({
  open,
  onOpenChange,
  sourceDesignId,
  sourceDesignCode,
  sourceDesignName,
  configuration,
}: CreateMbomDialogProps) {
  const { t: tc } = useTranslation('common')
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sourceTagId, setSourceTagId] = useState<string>('__current__')
  const [copyBomStructure, setCopyBomStructure] = useState(true)
  const [linkToSource, setLinkToSource] = useState(true)
  const [renumberItems, setRenumberItems] = useState(true)
  const [rootItemId, setRootItemId] = useState(configuration?.rootItemId ?? '')

  // The baseline tags are only worth asking for while the dialog is on
  // screen, but the answer is the one every other reader of this design's
  // tags already holds — so it comes from the shared cache rather than from
  // a fetch this component owns.
  const { data: tags = [], isFetching: isLoadingTags } = useQuery({
    ...designTagsQuery<Tag>(sourceDesignId),
    enabled: open,
  })
  const { data: structure } = useQuery(
    designStructureQuery<BOMTreeNode, OrphanItem>(sourceDesignId),
  )
  const roots = structure?.roots ?? []

  /**
   * Creating an MBOM mints a whole Manufacturing design carrying copies of
   * the source items, so `designs` goes stale alongside `mbom` — without it
   * the designs list keeps its pre-creation rows until something else happens
   * to refetch them.
   */
  const createMbom = useResourceMutation<MbomResult, Error, void>({
    mutationFn: async () => {
      const response = await apiFetch<{ data: MbomResult }>('/api/v1/mbom', {
        method: 'POST',
        body: JSON.stringify({
          sourceDesignId,
          rootItemId,
          code: code.toUpperCase(),
          name,
          description: description || undefined,
          sourceTagId: sourceTagId === '__current__' ? undefined : sourceTagId,
          copyBomStructure,
          linkToSource,
          renumberItems,
          configuration: configuration
            ? {
                rootItemId: configuration.rootItemId,
                makeCode: configuration.makeCode,
                selections: configuration.selections,
              }
            : undefined,
        }),
      })
      return response.data
    },
    invalidates: ['mbom', 'designs'],
  })

  const result = createMbom.data ?? null
  const error = createMbom.error
    ? createMbom.error.message || tc('dialogs.createMbom.failedToCreate')
    : null
  const isFormDisabled = createMbom.isPending

  // Reset the form each time the dialog opens. State only — the tags come
  // from the query above, which needs no prompting.
  useEffect(() => {
    if (open) {
      const makeSuffix = configuration?.makeCode
        ? `-${configuration.makeCode.toUpperCase()}`
        : ''
      setCode(`M-${sourceDesignCode}${makeSuffix}`)
      setName(
        configuration
          ? `${sourceDesignName} ${configuration.makeCode ?? 'configured'} (MBOM)`
          : `${sourceDesignName} (MBOM)`,
      )
      setDescription('')
      setSourceTagId('__current__')
      setCopyBomStructure(true)
      setLinkToSource(true)
      setRenumberItems(true)
      setRootItemId(
        configuration?.rootItemId ??
          (structure?.roots.length === 1 ? structure.roots[0]!.itemId : ''),
      )
      createMbom.reset()
    }
  }, [open, sourceDesignCode, sourceDesignName, configuration, structure])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMbom.mutate()
  }

  const handleNavigateToNewDesign = () => {
    if (result) {
      onOpenChange(false)
      navigate({ to: '/designs/$id', params: { id: result.design.id } })
    }
  }

  const handleClose = () => {
    if (createMbom.isPending) {
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            {tc('dialogs.createMbom.title')}
          </DialogTitle>
          <DialogDescription>
            {tc('dialogs.createMbom.description', {
              designCode: sourceDesignCode,
            })}
          </DialogDescription>
        </DialogHeader>

        {!result && !createMbom.isError ? (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              {/* Source Design Info */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    {tc('labels.sourceDesign')}:
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {sourceDesignCode}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-slate-500 dark:text-slate-400">
                    {tc('columns.type')}:
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {tc('dialogs.createMbom.engineeringEbom')}
                  </span>
                </div>
              </div>

              {configuration && (
                <div className="bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-lg p-3 text-sm space-y-1">
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {tc('labels.configuration')}
                    {configuration.makeCode && (
                      <span className="ml-2 font-mono text-cyan-700 dark:text-cyan-300">
                        {configuration.makeCode}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    {configuration.rootItemNumber}:{' '}
                    {Object.entries(configuration.selections)
                      .map(([family, value]) => `${family}=${value}`)
                      .join(', ')}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {tc('dialogs.createMbom.configurationHint')}
                  </p>
                </div>
              )}

              {!configuration && (
                <div className="space-y-2">
                  <Label htmlFor="mbomRoot">{tc('labels.rootPart')}</Label>
                  <Select
                    value={rootItemId}
                    onValueChange={setRootItemId}
                    disabled={isFormDisabled}
                  >
                    <SelectTrigger id="mbomRoot">
                      <SelectValue
                        placeholder={tc('dialogs.createMbom.selectProduct')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {roots.map((root) => (
                        <SelectItem key={root.itemId} value={root.itemId}>
                          {root.itemNumber} —{' '}
                          {root.name || tc('labels.unnamed')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {copyBomStructure
                      ? tc('dialogs.createMbom.copySubtreeHint')
                      : tc('dialogs.createMbom.identifyProductHint')}
                  </p>
                </div>
              )}

              {/* Baseline Tag Selector */}
              <div className="space-y-2">
                <Label htmlFor="sourceTag">
                  {tc('labels.baselineTagOptional')}
                </Label>
                <Select
                  value={sourceTagId}
                  onValueChange={setSourceTagId}
                  disabled={isFormDisabled || isLoadingTags}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={tc('dialogs.createMbom.useCurrentHead')}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__current__">
                      {tc('dialogs.createMbom.useCurrentHead')}
                    </SelectItem>
                    {tags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        {tag.name} ({tag.tagType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tc('dialogs.createMbom.baselineHint')}
                </p>
              </div>

              {/* MBOM Design Code */}
              <div className="space-y-2">
                <Label htmlFor="code">
                  {tc('labels.manufacturingDesignCode')}
                </Label>
                <Input
                  id="code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={tc('dialogs.createMbom.codePlaceholder')}
                  required
                  disabled={isFormDisabled}
                  pattern="[A-Z0-9\-]+"
                  title={tc('dialogs.cloneDesign.codePatternTitle')}
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {tc('dialogs.createMbom.codeHint')}
                </p>
              </div>

              {/* MBOM Design Name */}
              <div className="space-y-2">
                <Label htmlFor="name">{tc('columns.name')}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tc('dialogs.createMbom.namePlaceholder')}
                  required
                  disabled={isFormDisabled}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">
                  {tc('labels.descriptionOptional')}
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={tc('dialogs.createMbom.descriptionPlaceholder')}
                  rows={2}
                  disabled={isFormDisabled}
                />
              </div>

              {/* Options */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="copyBom"
                    checked={copyBomStructure}
                    onCheckedChange={(checked) =>
                      setCopyBomStructure(checked as boolean)
                    }
                    disabled={isFormDisabled}
                  />
                  <Label htmlFor="copyBom" className="text-sm font-normal">
                    {tc('dialogs.createMbom.copyBomStructure')}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="linkSource"
                    checked={linkToSource}
                    onCheckedChange={(checked) =>
                      setLinkToSource(checked as boolean)
                    }
                    disabled={isFormDisabled}
                  />
                  <Label htmlFor="linkSource" className="text-sm font-normal">
                    {tc('dialogs.createMbom.linkToSource')}
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="renumberItems"
                    checked={renumberItems}
                    onCheckedChange={(checked) =>
                      setRenumberItems(checked as boolean)
                    }
                    disabled={isFormDisabled || !copyBomStructure}
                  />
                  <Label
                    htmlFor="renumberItems"
                    className={`text-sm font-normal ${!copyBomStructure ? 'text-slate-400 dark:text-slate-600' : ''}`}
                  >
                    {tc('dialogs.createMbom.renumberItems', {
                      from: sourceDesignCode,
                      to: code || `M-${sourceDesignCode}`,
                    })}
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createMbom.isPending}
              >
                {tc('actions.cancel')}
              </Button>
              <Button type="submit" disabled={isFormDisabled || !rootItemId}>
                {createMbom.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {tc('actions.creating')}
                  </>
                ) : (
                  tc('actions.createMbom')
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : result ? (
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-lg text-slate-900 dark:text-slate-100">
                {tc('dialogs.createMbom.created')}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {tc('dialogs.createMbom.createdCode', {
                  code: result.design.code,
                })}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {tc('dialogs.createMbom.itemsCopied')}
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {result.itemsCopied}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {tc('dialogs.createMbom.bomRelationships')}
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {result.relationshipsCopied}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {tc('dialogs.createMbom.sourceLinksCreated')}
                </span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  {result.sourceLinks}
                </span>
              </div>
              {result.linesFiltered !== undefined && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    {tc('dialogs.createMbom.linesFiltered')}
                  </span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {result.linesFiltered}
                  </span>
                </div>
              )}
            </div>
            <DialogFooter className="sm:justify-center">
              <Button onClick={handleNavigateToNewDesign}>
                {tc('actions.goToMbomDesign')}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center">
              <XCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-center">
              <p className="font-medium text-lg text-slate-900 dark:text-slate-100">
                {tc('dialogs.createMbom.creationFailed')}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {error}
              </p>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button variant="outline" onClick={() => createMbom.reset()}>
                {tc('actions.tryAgain')}
              </Button>
              <Button onClick={handleClose}>{tc('actions.close')}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

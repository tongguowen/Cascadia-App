// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, Building2, FolderKanban, GitBranch } from 'lucide-react'
import { getImportConfig } from '@cascadia/commons/import'
import { BRANCH_TYPES } from '@cascadia/commons/versioning/branch-types'
import type { ImportContext, ImportItemType } from '@cascadia/commons/import'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'
import { Badge, Checkbox, FormField } from '@/components/ui'
import {
  authSessionQuery,
  designBranchesQuery,
  designListQuery,
  designStatusQuery,
  programListQuery,
} from '@/query'

interface Design {
  id: string
  name: string
  code: string
  programId: string
  designType: string
}

interface Branch {
  id: string
  name: string
  branchType: 'main' | 'eco' | 'workspace' | 'release'
  isLocked: boolean
}

interface ContextSelectStepProps {
  itemType?: ImportItemType
  initialProgramId?: string
  initialDesignId?: string
  initialBranchId?: string
  value: ImportContext | null // Used by parent to track context state
  onChange: (context: ImportContext | null) => void
}

/**
 * Step 1: Select Program, Design, and optionally Branch for import context.
 * For Issues, only optional program selection is shown (no design/branch).
 */
export function ContextSelectStep({
  itemType = 'Part',
  initialProgramId,
  initialDesignId,
  initialBranchId,
  value: _value, // Used by parent to track context state
  onChange,
}: ContextSelectStepProps) {
  const { t: tp } = useTranslation('pages')
  const config = getImportConfig(itemType)
  const requiresDesign = config.requiresDesign
  const itemsLabel = config.pluralLabel.toLowerCase()

  const [selectedProgramId, setSelectedProgramId] = useState<
    string | undefined
  >(initialProgramId)
  const [selectedDesignId, setSelectedDesignId] = useState<string | undefined>(
    initialDesignId,
  )
  const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(
    initialBranchId,
  )
  const [importAsReleased, setImportAsReleased] = useState(false)

  // The three cascading lists, each enabled by the one above it.
  const { data: session } = useQuery(authSessionQuery())
  const isSystemAdmin = session?.setupStatus?.isAdmin ?? false
  const { data: programs = [], isPending: loadingPrograms } =
    useQuery(programListQuery())
  const { data: designs = [], isFetching: loadingDesigns } = useQuery(
    designListQuery<Design>(selectedProgramId || undefined),
  )
  const { data: branches = [], isFetching: loadingBranches } = useQuery(
    designBranchesQuery<Branch>(selectedDesignId ?? ''),
  )
  const { data: designStatus = null } = useQuery(
    designStatusQuery(selectedDesignId ?? '', Boolean(selectedDesignId)),
  )

  // Auto-select when a level offers exactly one choice.
  useEffect(() => {
    if (!selectedProgramId) {
      setSelectedDesignId(undefined)
      return
    }
    const onlyDesign = designs.length === 1 ? designs[0] : undefined
    if (onlyDesign) setSelectedDesignId(onlyDesign.id)
  }, [selectedProgramId, designs])

  // Branch defaults follow the design's phase: under change control, the one
  // unlocked branch if there is exactly one; before release, main.
  useEffect(() => {
    if (!selectedDesignId || !designStatus) {
      setSelectedBranchId(undefined)
      return
    }
    if (importAsReleased) {
      setSelectedBranchId(undefined)
      return
    }
    if (designStatus.protection.isMainBranchProtected) {
      const unlocked = branches.filter(
        (b) => !b.isLocked && b.branchType !== 'main',
      )
      const onlyUnlocked = unlocked.length === 1 ? unlocked[0] : undefined
      if (onlyUnlocked) setSelectedBranchId(onlyUnlocked.id)
    } else {
      const mainBranch = branches.find((b) => b.branchType === 'main')
      if (mainBranch) setSelectedBranchId(mainBranch.id)
    }
  }, [selectedDesignId, designStatus, branches, importAsReleased])

  // Update context when selection changes
  useEffect(() => {
    // For items that don't require design (like Issues), context is always valid
    if (!requiresDesign) {
      onChange({
        programId: selectedProgramId,
        itemType,
      })
      return
    }

    if (!selectedProgramId || !selectedDesignId || !designStatus) {
      onChange(null)
      return
    }

    const phase = designStatus.protection.phase

    // For post-release, require branch selection
    if (phase === 'post-release' && !selectedBranchId && !importAsReleased) {
      onChange(null)
      return
    }

    onChange({
      programId: selectedProgramId,
      designId: selectedDesignId,
      branchId: importAsReleased ? undefined : selectedBranchId,
      designPhase: phase,
      itemType,
      importAsReleased,
    })
  }, [
    selectedProgramId,
    selectedDesignId,
    selectedBranchId,
    designStatus,
    onChange,
    requiresDesign,
    itemType,
    importAsReleased,
  ])

  const isPostRelease = designStatus?.protection.phase === 'post-release'

  // Filter available branches for post-release (exclude main, locked)
  const availableBranches = isPostRelease
    ? branches.filter((b) => !b.isLocked && b.branchType !== 'main')
    : branches.filter((b) => b.branchType === 'main')

  return (
    <div className="space-y-4 px-2">
      <div className="text-center mb-4">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {requiresDesign
            ? tp('import.contextSelect.titleWithDesign', { items: itemsLabel })
            : tp('import.contextSelect.titleProgramOnly', {
                items: itemsLabel,
              })}
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          {requiresDesign
            ? tp('import.contextSelect.subtitleWithDesign', {
                items: itemsLabel,
              })
            : tp('import.contextSelect.subtitleProgramOnly', {
                items: itemsLabel,
              })}
        </p>
      </div>

      {/* Program Selection */}
      <FormField
        label={tp('import.contextSelect.program')}
        required={requiresDesign}
        helpText={
          requiresDesign
            ? tp('import.contextSelect.programHelpRequired')
            : tp('import.contextSelect.programHelpOptional')
        }
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-slate-400" />
          <Select
            value={selectedProgramId}
            onValueChange={setSelectedProgramId}
            disabled={loadingPrograms}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={tp('import.contextSelect.selectProgram')} />
            </SelectTrigger>
            <SelectContent>
              {programs.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500">
                      {program.code}
                    </span>
                    <span>{program.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FormField>

      {/* Design Selection - only shown for items that require design */}
      {requiresDesign && (
        <FormField
          label={tp('import.contextSelect.design')}
          required
          helpText={tp('import.contextSelect.designHelp', { items: itemsLabel })}
        >
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-slate-400" />
            <Select
              value={selectedDesignId}
              onValueChange={setSelectedDesignId}
              disabled={!selectedProgramId || loadingDesigns}
            >
              <SelectTrigger className="flex-1">
                <SelectValue
                  placeholder={
                    !selectedProgramId
                      ? tp('import.contextSelect.selectProgramFirst')
                      : loadingDesigns
                        ? tp('import.contextSelect.loadingDesigns')
                        : tp('import.contextSelect.selectDesign')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {designs.map((design) => (
                  <SelectItem key={design.id} value={design.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500">
                        {design.code}
                      </span>
                      <span>{design.name}</span>
                      <Badge variant="outline" className="text-xs ml-2">
                        {design.designType}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormField>
      )}

      {/* A migration/import exception, not an alternative revision editor. */}
      {requiresDesign && selectedDesignId && isSystemAdmin && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <Checkbox
              id="importAsReleased"
              checked={importAsReleased}
              onCheckedChange={(checked) =>
                setImportAsReleased(checked === true)
              }
              className="mt-0.5"
            />
            <div className="space-y-1">
              <label
                htmlFor="importAsReleased"
                className="cursor-pointer text-sm font-medium text-blue-900 dark:text-blue-100"
              >
                {tp('import.contextSelect.importAsReleased')}
              </label>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {tp('import.contextSelect.importAsReleasedHelp')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Branch Selection (only for post-release designs that require design) */}
      {requiresDesign &&
        selectedDesignId &&
        designStatus &&
        !importAsReleased && (
          <FormField
            label={tp('import.contextSelect.branch')}
            required={isPostRelease}
            helpText={
              isPostRelease
                ? tp('import.contextSelect.branchHelpPostRelease', {
                    items: config.pluralLabel,
                  })
                : tp('import.contextSelect.branchHelpPreRelease', {
                    items: config.pluralLabel,
                  })
            }
          >
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-slate-400" />
              <Select
                value={selectedBranchId}
                onValueChange={setSelectedBranchId}
                disabled={loadingBranches || !isPostRelease}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={
                      loadingBranches
                        ? tp('import.contextSelect.loadingBranches')
                        : isPostRelease
                          ? tp('import.contextSelect.selectBranch')
                          : tp('import.contextSelect.branchMain')
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      <div className="flex items-center gap-2">
                        {branch.branchType === BRANCH_TYPES.changeOrder && (
                          <Badge variant="default" className="text-xs">
                            {tp('import.contextSelect.ecoBadge')}
                          </Badge>
                        )}
                        {branch.branchType === 'workspace' && (
                          <Badge variant="secondary" className="text-xs">
                            {tp('import.contextSelect.wsBadge')}
                          </Badge>
                        )}
                        <span>{branch.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </FormField>
        )}

      {/* Status Info - only shown for items that require design */}
      {requiresDesign && designStatus && (
        <div
          className={`p-3 rounded-lg text-sm ${
            importAsReleased
              ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
              : isPostRelease
                ? 'bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
                : 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800'
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertCircle
              className={`h-4 w-4 mt-0.5 shrink-0 ${
                importAsReleased
                  ? 'text-blue-600 dark:text-blue-400'
                  : isPostRelease
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-green-600'
              }`}
            />
            <div>
              <p
                className={`font-medium ${importAsReleased ? 'text-blue-800 dark:text-blue-200' : isPostRelease ? 'text-amber-800 dark:text-amber-200' : 'text-green-800 dark:text-green-200'}`}
              >
                {importAsReleased
                  ? tp('import.contextSelect.statusExistingRelease')
                  : isPostRelease
                    ? tp('import.contextSelect.statusPostRelease')
                    : tp('import.contextSelect.statusPreRelease')}
              </p>
              <p
                className={`text-xs ${importAsReleased ? 'text-blue-700 dark:text-blue-300' : isPostRelease ? 'text-amber-700 dark:text-amber-300' : 'text-green-700 dark:text-green-300'}`}
              >
                {importAsReleased
                  ? tp('import.contextSelect.statusExistingReleaseDetail')
                  : isPostRelease
                    ? tp('import.contextSelect.statusPostReleaseDetail')
                    : tp('import.contextSelect.statusPreReleaseDetail')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

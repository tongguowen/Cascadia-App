// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
  Archive,
  ArrowLeft,
  Copy,
  Edit,
  Factory,
  Save,
  Search,
  Settings,
  X,
} from 'lucide-react'
import { QuickJumpPills } from './QuickJumpPills'
import type { VersionContext } from '@/hooks/useVersionContext'
import type { Design } from '@cascadia/commons/types/design'
import type { Program } from '@cascadia/commons/types/program'
import { DesignPhaseIndicator } from '@/components/versioning/DesignPhaseIndicator'
import { VersionContextSelector } from '@/components/versioning/VersionContextSelector'
import { Badge, Button } from '@/components/ui'

export interface Branch {
  id: string
  name: string
  branchType: string
  isArchived: boolean
  isLocked: boolean
  createdAt: string
}

export interface TagItem {
  id: string
  name: string
  tagType: string
  description?: string
  createdAt: string
}

interface DesignWithDetails extends Design {
  defaultBranch?: Branch | null
  program?: Program | null
}

export interface DesignPageHeaderProps {
  design: DesignWithDetails
  branches: Array<Branch>
  tags: Array<TagItem>
  versionContext: VersionContext
  onContextChange: (context: VersionContext) => void
  isHistoricalView: boolean
  isEditing?: boolean
  isSaving?: boolean
  onEdit?: () => void
  onSave?: () => void
  onCancelEdit?: () => void
  onArchive?: () => void
  onClone?: () => void
  onReleaseToManufacturing?: () => void
  onGapAnalysis?: () => void
}

export function DesignPageHeader({
  design,
  tags,
  versionContext,
  onContextChange,
  isHistoricalView,
  isEditing,
  isSaving,
  onEdit,
  onSave,
  onCancelEdit,
  onArchive,
  onClone,
  onReleaseToManufacturing,
  onGapAnalysis,
}: DesignPageHeaderProps) {
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')

  // Get context badge variant based on current view mode
  const getContextBadgeVariant = () => {
    switch (versionContext.type) {
      case 'main':
        return 'success' as const
      case 'branch':
        return 'warning' as const
      case 'tag':
        return 'secondary' as const
      case 'commit':
        return 'outline' as const
      default:
        return 'default' as const
    }
  }

  // Get context label for badge
  const getContextLabel = () => {
    switch (versionContext.type) {
      case 'main':
        return tp('designs.pageHeader.contextMain')
      case 'branch':
        return versionContext.branchName || tp('designs.pageHeader.contextBranch')
      case 'tag':
        return versionContext.tagName || tp('designs.pageHeader.contextTag')
      case 'commit':
        return tp('designs.pageHeader.contextCommit', {
          id: versionContext.commitId?.slice(0, 8) ?? '',
        })
      default:
        return tp('designs.pageHeader.contextMain')
    }
  }

  const designTypeLabel = tp(`designs.types.${design.designType}`, {
    defaultValue: design.designType,
  })

  return (
    <div className="space-y-4">
      {/* Top row: Back button, title, actions */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/designs">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
                {design.code}
              </h1>
              <Badge
                className="text-base"
                variant={
                  design.designType === 'Library' ? 'secondary' : 'default'
                }
              >
                {designTypeLabel}
              </Badge>
              <Badge variant={getContextBadgeVariant()} className="text-sm">
                {getContextLabel()}
              </Badge>
              <DesignPhaseIndicator designId={design.id} />
            </div>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {design.name}
            </p>
            {design.configuration && (
              <p
                className="text-xs text-cyan-700 dark:text-cyan-300 mt-1"
                title={tp('designs.pageHeader.resolvedConfigurationTitle')}
              >
                {tp('designs.pageHeader.configuration')}
                {design.configuration.makeCode && (
                  <span className="font-mono ml-1">
                    {design.configuration.makeCode}
                  </span>
                )}
                :{' '}
                {Object.entries(design.configuration.selections)
                  .map(([family, value]) => `${family}=${value}`)
                  .join(', ')}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Version Context Selector */}
          <VersionContextSelector
            designId={design.id}
            value={versionContext}
            onChange={onContextChange}
            disabled={false}
          />

          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={onCancelEdit}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-2" />
                {tc('actions.cancel')}
              </Button>
              <Button onClick={onSave} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? tc('actions.saving') : tc('actions.save')}
              </Button>
            </>
          ) : (
            <>
              {/* Actions - disabled in historical view */}
              {onGapAnalysis && design.designType !== 'Family' && (
                <Button variant="outline" onClick={onGapAnalysis}>
                  <Search className="h-4 w-4 mr-2" />
                  {tp('designs.pageHeader.gapAnalysis')}
                </Button>
              )}
              {onEdit && (
                <Button
                  variant="outline"
                  onClick={onEdit}
                  disabled={isHistoricalView}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {tc('actions.edit')}
                </Button>
              )}
              {onClone && design.designType === 'Engineering' && (
                <Button
                  variant="outline"
                  onClick={onClone}
                  disabled={isHistoricalView}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  {tp('designs.pageHeader.clone')}
                </Button>
              )}
              {onReleaseToManufacturing &&
                design.designType === 'Engineering' && (
                  <Button
                    variant="default"
                    onClick={onReleaseToManufacturing}
                    disabled={isHistoricalView}
                  >
                    <Factory className="h-4 w-4 mr-2" />
                    {tp('designs.pageHeader.releaseToManufacturing')}
                  </Button>
                )}
              {onArchive && design.designType !== 'Library' && (
                <Button
                  variant="outline"
                  onClick={onArchive}
                  disabled={isHistoricalView}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  {tc('actions.archive')}
                </Button>
              )}
              <Button variant="ghost" size="icon" aria-label={tc('tabs.settings')}>
                <Settings className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Quick Jump Pills for recent tags */}
      {tags.length > 0 && (
        <QuickJumpPills
          tags={tags}
          currentTagId={
            versionContext.type === 'tag' ? versionContext.tagId : undefined
          }
          onTagClick={(tagId, tagName) =>
            onContextChange({ type: 'tag', tagId, tagName })
          }
        />
      )}
    </div>
  )
}

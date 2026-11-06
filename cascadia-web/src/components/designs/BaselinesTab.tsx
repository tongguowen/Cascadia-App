// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Eye, GitCompare, Plus, Tag } from 'lucide-react'
import { TAG_TYPES } from '@cascadia/commons/versioning/branch-types'
import type { VersionContext } from '@/hooks/useVersionContext'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select'

interface TagItem {
  id: string
  name: string
  tagType: string
  description?: string
  createdAt: string
  createdBy?: { id: string; name: string }
}

interface BaselinesTabProps {
  designId: string
  tags: Array<TagItem>
  versionContext: VersionContext
  isHistoricalView: boolean
  onViewBaseline: (tagId: string, tagName: string) => void
  onCreateBaseline?: () => void
}

export function BaselinesTab({
  tags,
  isHistoricalView,
  onViewBaseline,
  onCreateBaseline,
}: BaselinesTabProps) {
  const { t: tp } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const [compareFrom, setCompareFrom] = useState<string>('')
  const [compareTo, setCompareTo] = useState<string>('')

  // Sort tags by creation date (newest first)
  const sortedTags = useMemo(() => {
    return [...tags].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
  }, [tags])

  // Get tag type badge variant
  const getTagTypeBadgeVariant = (tagType: string) => {
    switch (tagType) {
      case 'baseline':
        return 'default' as const
      case 'release':
        return 'success' as const
      case 'milestone':
        return 'secondary' as const
      case TAG_TYPES.changeOrderRelease:
        return 'warning' as const
      default:
        return 'outline' as const
    }
  }

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex items-center justify-end">
        {onCreateBaseline && (
          <Button onClick={onCreateBaseline} disabled={isHistoricalView}>
            <Plus className="h-4 w-4 mr-2" />
            {tp('designs.baselines.createBaseline')}
          </Button>
        )}
      </div>

      {/* Baselines Table */}
      <Card>
        <CardHeader>
          <CardTitle>{tp('designs.baselines.title')}</CardTitle>
          <CardDescription>
            {tp('designs.baselines.count', { count: tags.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sortedTags.length > 0 ? (
            <div className="border rounded-lg divide-y dark:border-slate-700 dark:divide-slate-700">
              {/* Header */}
              <div className="flex items-center gap-4 py-2 px-4 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-500 dark:text-slate-400">
                <div className="w-32">{tc('columns.name')}</div>
                <div className="w-24">{tc('columns.type')}</div>
                <div className="flex-1">{tc('columns.description')}</div>
                <div className="w-32">{tc('columns.created')}</div>
                <div className="w-48 text-right">{tc('columns.actions')}</div>
              </div>

              {/* Rows */}
              {sortedTags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center gap-4 py-3 px-4 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="w-32 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-slate-900 dark:text-white">
                      {tag.name}
                    </span>
                  </div>
                  <div className="w-24">
                    <Badge
                      variant={getTagTypeBadgeVariant(tag.tagType)}
                      className="text-xs"
                    >
                      {tag.tagType}
                    </Badge>
                  </div>
                  <div className="flex-1 text-slate-600 dark:text-slate-400 truncate">
                    {tag.description || '-'}
                  </div>
                  <div className="w-32 text-sm text-slate-500">
                    {new Date(tag.createdAt).toLocaleDateString()}
                  </div>
                  <div className="w-48 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewBaseline(tag.id, tag.name)}
                      title={tp('designs.baselines.viewAtBaseline')}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCompareFrom(tag.id)
                        // Scroll to compare section
                      }}
                      title={tp('designs.baselines.compareBaselines')}
                    >
                      <GitCompare className="h-3 w-3" />
                    </Button>
                    {/* TODO: Trigger BOM export at this baseline when the export API is implemented */}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      title={tp('designs.baselines.exportBomSoon')}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              {tp('designs.baselines.empty')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Baseline Comparison Tool */}
      {sortedTags.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              {tp('designs.baselines.compareTitle')}
            </CardTitle>
            <CardDescription>
              {tp('designs.baselines.compareDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select value={compareFrom} onValueChange={setCompareFrom}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={tp('designs.baselines.fromPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {sortedTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-slate-400">{tp('designs.baselines.toLabel')}</span>

              <Select value={compareTo} onValueChange={setCompareTo}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={tp('designs.baselines.toPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {sortedTags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      {tag.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* TODO: Navigate to comparison view or open modal when the comparison API is implemented */}
              <Button disabled title={tp('designs.baselines.compareSoon')}>
                {tp('designs.baselines.compare')}
              </Button>

              <span className="text-sm text-slate-500 dark:text-slate-400">
                {tp('designs.baselines.comingSoon')}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

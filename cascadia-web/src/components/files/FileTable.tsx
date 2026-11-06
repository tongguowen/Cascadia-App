// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useTranslation } from 'react-i18next'
import {
  Archive,
  Box,
  Download,
  Eye,
  FileIcon,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Lock,
  MoreVertical,
  Music,
  RotateCcw,
  Tag,
  Trash2,
  Unlock,
  Video,
} from 'lucide-react'
import { formatFileSize } from '@cascadia/commons/vault/format-file-size'
import {
  FILE_CATEGORY_DEFINITIONS,
  FILE_CATEGORY_OPTIONS,
  isFileCategory,
} from '@cascadia/commons/vault/file-categories'
import type {
  ColumnFiltersState,
  Row,
  SortingState,
} from '@tanstack/react-table'
import type { DataGridColumn } from '@/components/ui'
import type { FileRecordWithItem } from '@cascadia/commons/vault/types'
import type { FileCategory } from '@cascadia/commons/vault/file-categories'
import { Badge, DataGrid } from '@/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/ContextMenu'
import { Button } from '@/components/ui/Button'
import { ItemLink } from '@/components/items/ItemLink'
import { translateItemTypeLabel } from '@/i18n'

// Re-export for backwards compatibility
export type VaultFileRecord = FileRecordWithItem

interface FileTableProps {
  files: Array<VaultFileRecord>
  onDownload?: (file: VaultFileRecord) => void
  onDelete?: (file: VaultFileRecord) => void
  onViewCAD?: (file: VaultFileRecord) => void
  /** Override a file's category, or pass null to return it to auto-detection */
  onSetCategory?: (
    file: VaultFileRecord,
    category: FileCategory | null,
  ) => void | Promise<void>
  defaultSorting?: SortingState
  defaultColumnFilters?: ColumnFiltersState
  defaultGlobalFilter?: string
}

export function FileTable({
  files,
  onDownload,
  onDelete,
  onViewCAD,
  onSetCategory,
  defaultSorting,
  defaultColumnFilters,
  defaultGlobalFilter,
}: FileTableProps) {
  const { t } = useTranslation('common')
  const getFileIcon = (mimeType: string, fileCategory?: string | null) => {
    // Check file category first (more specific)
    if (fileCategory === 'cad_model')
      return <Box className="w-4 h-4 text-blue-500" />
    if (fileCategory === 'drawing')
      return <FileText className="w-4 h-4 text-purple-500" />

    // Fall back to mime type detection
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-4 h-4" />
    if (mimeType.startsWith('video/')) return <Video className="w-4 h-4" />
    if (mimeType.startsWith('audio/')) return <Music className="w-4 h-4" />
    if (mimeType.includes('pdf')) return <FileText className="w-4 h-4" />
    if (mimeType.includes('sheet') || mimeType.includes('excel'))
      return <FileSpreadsheet className="w-4 h-4" />
    if (mimeType.includes('zip') || mimeType.includes('tar'))
      return <Archive className="w-4 h-4" />
    return <FileIcon className="w-4 h-4" />
  }

  const getCategoryBadge = (
    category: string | null | undefined,
    isPrimary: boolean | undefined,
  ) => {
    if (!isFileCategory(category)) return null

    const config = FILE_CATEGORY_DEFINITIONS[category]
    if (!config.badged) return null

    return (
      <div className="flex items-center gap-1">
        <Badge variant={config.badgeVariant} className="text-xs">
          {config.badgeLabel}
        </Badge>
        {isPrimary && (
          <Badge variant="success" className="text-xs">
            {t('columns.primary')}
          </Badge>
        )}
      </div>
    )
  }

  const isViewableCAD = (file: VaultFileRecord): boolean => {
    const ext = file.originalFileName.toLowerCase().split('.').pop()
    return ext === 'stl' || ext === 'obj'
  }

  const formatDate = (dateValue: Date | string): string => {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
  }

  const columns: Array<DataGridColumn<VaultFileRecord>> = [
    {
      id: 'icon',
      header: '',
      accessorFn: () => '',
      enableSorting: false,
      enableFiltering: false,
      meta: { width: '40px' },
      cell: ({ row }) =>
        getFileIcon(row.original.mimeType, row.original.fileCategory),
    },
    {
      id: 'fileName',
      header: t('columns.fileName'),
      accessorKey: 'originalFileName',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: t('filters.searchPlaceholder'),
      cell: ({ row }) => {
        const file = row.original
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900 dark:text-white">
                {file.originalFileName}
              </span>
              {getCategoryBadge(file.fileCategory, file.isPrimaryModel)}
            </div>
          </div>
        )
      },
    },
    {
      id: 'item',
      header: t('columns.item'),
      accessorFn: (row) => row.item.itemNumber,
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: t('filters.searchPlaceholder'),
      cell: ({ row }) => {
        const file = row.original
        return (
          <div className="space-y-0.5">
            <ItemLink
              itemType={file.item.itemType}
              itemId={file.item.id}
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
            >
              {file.item.itemNumber}
            </ItemLink>
            {file.item.name && (
              <p
                className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]"
                title={file.item.name}
              >
                {file.item.name}
              </p>
            )}
          </div>
        )
      },
    },
    {
      id: 'itemType',
      header: t('columns.type'),
      accessorFn: (row) => row.item.itemType,
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: [
        { label: 'Part', value: 'Part' },
        { label: 'Document', value: 'Document' },
        { label: 'Change Order', value: 'ChangeOrder' },
        { label: 'Requirement', value: 'Requirement' },
        { label: 'Task', value: 'Task' },
      ],
      cell: ({ row }) => {
        const itemType = row.original.item.itemType
        const variantMap: Record<string, 'default' | 'secondary' | 'outline'> =
          {
            Part: 'default',
            Document: 'secondary',
            ChangeOrder: 'outline',
            Requirement: 'secondary',
            Task: 'outline',
          }
        return (
          <Badge
            variant={variantMap[itemType] ?? 'default'}
            className="text-xs"
          >
            {translateItemTypeLabel(
              itemType === 'ChangeOrder' ? 'Change Order' : itemType,
            )}
          </Badge>
        )
      },
    },
    {
      id: 'fileSize',
      header: t('columns.size'),
      accessorKey: 'fileSize',
      enableSorting: true,
      enableFiltering: true,
      filterType: 'range',
      filterPlaceholder: t('actions.any'),
      meta: { align: 'right' as const },
      cell: ({ getValue }) => {
        const bytes = getValue() as number
        return (
          <span className="text-slate-600 dark:text-slate-400">
            {formatFileSize(bytes)}
          </span>
        )
      },
    },
    {
      id: 'fileVersion',
      header: t('columns.version'),
      accessorKey: 'fileVersion',
      enableSorting: true,
      cell: ({ row }) => {
        const file = row.original
        return (
          <span className="text-slate-600 dark:text-slate-400">
            v{file.fileVersion}
            {file.isLatestVersion && (
              <span className="ml-1 text-xs text-green-600 dark:text-green-400">
                ({t('columns.latest')})
              </span>
            )}
          </span>
        )
      },
    },
    {
      id: 'isCheckedOut',
      header: t('columns.status'),
      accessorKey: 'isCheckedOut',
      enableFiltering: true,
      filterType: 'select',
      filterOptions: [
        { label: t('columns.available'), value: 'false' },
        { label: t('columns.checkedOutStatus'), value: 'true' },
      ],
      cell: ({ getValue }) => {
        const isCheckedOut = getValue() as boolean
        if (isCheckedOut) {
          return (
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Lock className="w-3 h-3" />
              <span className="text-xs">{t('columns.checkedOutStatus')}</span>
            </div>
          )
        }
        return (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <Unlock className="w-3 h-3" />
            <span className="text-xs">{t('columns.available')}</span>
          </div>
        )
      },
    },
    {
      id: 'uploadedAt',
      header: t('columns.uploadedAt'),
      accessorKey: 'uploadedAt',
      enableSorting: true,
      cell: ({ row }) => {
        const file = row.original
        return (
          <div className="space-y-0.5">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {formatDate(file.uploadedAt)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              by {file.uploader.name || file.uploader.email}
            </p>
          </div>
        )
      },
    },
    {
      id: 'fileCategory',
      header: t('columns.category'),
      accessorKey: 'fileCategory',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: FILE_CATEGORY_OPTIONS,
      // Hide column by default (already shown in fileName column)
      cell: () => null,
    },
  ]

  const renderRowActions = (row: Row<VaultFileRecord>) => {
    const file = row.original
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">{t('actions.openMenu')}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isViewableCAD(file) && onViewCAD && (
            <DropdownMenuItem onClick={() => onViewCAD(file)}>
              <Eye className="mr-2 h-4 w-4" />
              {t('actions.viewIn3d')}
            </DropdownMenuItem>
          )}
          {onDownload && (
            <DropdownMenuItem onClick={() => onDownload(file)}>
              <Download className="mr-2 h-4 w-4" />
              {t('actions.download')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <ItemLink itemType={file.item.itemType} itemId={file.item.id}>
              <FileIcon className="mr-2 h-4 w-4" />
              {t('actions.viewDetails')}
            </ItemLink>
          </DropdownMenuItem>
          {onSetCategory && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Tag className="mr-2 h-4 w-4" />
                {t('columns.category')}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={
                    isFileCategory(file.fileCategory) ? file.fileCategory : ''
                  }
                  onValueChange={(value) => {
                    if (isFileCategory(value)) onSetCategory(file, value)
                  }}
                >
                  {FILE_CATEGORY_OPTIONS.map((option) => (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
                {file.categorySource === 'manual' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onSetCategory(file, null)}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {t('actions.resetAutoCategory')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          {onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(file)}
                disabled={file.isCheckedOut}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('actions.delete')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  const renderContextMenuItems = (row: Row<VaultFileRecord>) => {
    const file = row.original
    return (
      <>
        {isViewableCAD(file) && onViewCAD && (
          <ContextMenuItem onClick={() => onViewCAD(file)}>
            <Eye className="mr-2 h-4 w-4" />
            {t('actions.viewIn3d')}
          </ContextMenuItem>
        )}
        {onDownload && (
          <ContextMenuItem onClick={() => onDownload(file)}>
            <Download className="mr-2 h-4 w-4" />
            {t('actions.download')}
          </ContextMenuItem>
        )}
        <ContextMenuItem asChild>
          <ItemLink itemType={file.item.itemType} itemId={file.item.id}>
            <FileIcon className="mr-2 h-4 w-4" />
            {t('actions.viewDetails')}
          </ItemLink>
        </ContextMenuItem>
        {onSetCategory && (
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              <Tag className="mr-2 h-4 w-4" />
              {t('columns.category')}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              <ContextMenuRadioGroup
                value={
                  isFileCategory(file.fileCategory) ? file.fileCategory : ''
                }
                onValueChange={(value) => {
                  if (isFileCategory(value)) onSetCategory(file, value)
                }}
              >
                {FILE_CATEGORY_OPTIONS.map((option) => (
                  <ContextMenuRadioItem key={option.value} value={option.value}>
                    {option.label}
                  </ContextMenuRadioItem>
                ))}
              </ContextMenuRadioGroup>
              {file.categorySource === 'manual' && (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => onSetCategory(file, null)}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {t('actions.resetAutoCategory')}
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              onClick={() => onDelete(file)}
              disabled={file.isCheckedOut}
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t('actions.delete')}
            </ContextMenuItem>
          </>
        )}
      </>
    )
  }

  return (
    <DataGrid
      data={files}
      columns={columns}
      getRowId={(row) => row.id}
      enableRowActions={true}
      renderRowActions={renderRowActions}
      enableContextMenu
      renderContextMenuItems={renderContextMenuItems}
      defaultSorting={defaultSorting}
      defaultColumnFilters={defaultColumnFilters}
      defaultGlobalFilter={defaultGlobalFilter}
      emptyMessage="No files found"
      emptyDescription="Files will appear here when uploaded to items"
      exportFilename="files"
    />
  )
}

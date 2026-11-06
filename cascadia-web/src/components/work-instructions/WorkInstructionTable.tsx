// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Edit, Eye, MoreVertical, PlayCircle, Trash2 } from 'lucide-react'
import type { WorkInstruction } from '@cascadia/commons/items/types/work-instruction'
import type { DataGridColumn } from '@/components/ui'
import { Badge, Button, DataGrid } from '@/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { StateBadge } from '@/components/items/StateBadge'
import { useLifecyclePhases } from '@/hooks/useLifecyclePhases'
import { translateStateName } from '@/i18n'

interface WorkInstructionTableProps {
  items: Array<WorkInstruction>
  onEdit?: (workInstruction: WorkInstruction) => void
  onDelete?: (workInstruction: WorkInstruction) => void
  onPresent?: (workInstruction: WorkInstruction) => void
}

const difficultyColors: Record<
  string,
  'default' | 'secondary' | 'success' | 'warning' | 'destructive'
> = {
  Easy: 'success',
  Medium: 'warning',
  Hard: 'destructive',
}

const formatTime = (minutes?: number) => {
  if (!minutes) return '-'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function WorkInstructionTable({
  items,
  onEdit,
  onDelete,
  onPresent,
}: WorkInstructionTableProps) {
  // State filter options and badges come from the WorkInstruction lifecycle's
  // configuration, not from a list in code
  const { t } = useTranslation('common')
  const { data: lifecycle } = useLifecyclePhases('WorkInstruction')
  const stateFilterOptions = (lifecycle?.states ?? []).map((state) => ({
    label: translateStateName(state.name),
    value: state.id,
  }))

  const columns: Array<DataGridColumn<WorkInstruction>> = [
    {
      id: 'itemNumber',
      header: t('columns.itemNumber'),
      accessorKey: 'itemNumber',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: t('filters.searchPlaceholder'),
      cell: ({ row }) =>
        row.original.id ? (
          <Link
            to="/work-instructions/$id"
            params={{ id: row.original.id }}
            className="font-medium text-sky-600 hover:text-sky-800 hover:underline dark:text-sky-400 dark:hover:text-sky-300"
          >
            {row.original.itemNumber}
          </Link>
        ) : (
          <span className="font-medium">{row.original.itemNumber}</span>
        ),
    },
    {
      id: 'revision',
      header: t('columns.rev'),
      accessorKey: 'revision',
      enableSorting: true,
    },
    {
      id: 'name',
      header: t('columns.name'),
      accessorKey: 'name',
      enableFiltering: true,
      filterType: 'text',
      filterPlaceholder: t('filters.searchPlaceholder'),
      cell: ({ getValue }) => {
        const value = getValue() as string
        return (
          <div className="max-w-md truncate" title={value}>
            {value || '-'}
          </div>
        )
      },
    },
    {
      id: 'state',
      header: t('columns.state'),
      accessorKey: 'state',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: stateFilterOptions,
      cell: ({ getValue }) => (
        <StateBadge itemType="WorkInstruction" state={getValue() as string} />
      ),
    },
    {
      id: 'difficulty',
      header: t('columns.difficulty'),
      accessorKey: 'difficulty',
      enableFiltering: true,
      filterType: 'multiSelect',
      filterOptions: [
        {
          label: t('enum.workInstructionDifficulty.Easy'),
          value: 'Easy',
        },
        {
          label: t('enum.workInstructionDifficulty.Medium'),
          value: 'Medium',
        },
        {
          label: t('enum.workInstructionDifficulty.Hard'),
          value: 'Hard',
        },
      ],
      cell: ({ getValue }) => {
        const value = getValue() as string | undefined
        if (!value) return '-'
        return (
          <Badge variant={difficultyColors[value] || 'default'}>
            {t(`enum.workInstructionDifficulty.${value}`, {
              defaultValue: value,
            })}
          </Badge>
        )
      },
    },
    {
      id: 'estimatedTime',
      header: t('columns.estTime'),
      accessorKey: 'estimatedTime',
      enableSorting: true,
      cell: ({ getValue }) => formatTime(getValue() as number | undefined),
    },
    {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">{t('actions.openMenu')}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.original.id && (
              <DropdownMenuItem asChild>
                <Link
                  to="/work-instructions/$id"
                  params={{ id: row.original.id }}
                  className="flex items-center cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t('actions.view')}
                </Link>
              </DropdownMenuItem>
            )}
            {onPresent && row.original.id && (
              <DropdownMenuItem onClick={() => onPresent(row.original)}>
                <PlayCircle className="mr-2 h-4 w-4" />
                {t('actions.present')}
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(row.original)}>
                <Edit className="mr-2 h-4 w-4" />
                {t('actions.edit')}
              </DropdownMenuItem>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(row.original)}
                  className="text-red-600 dark:text-red-400"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t('actions.delete')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <DataGrid
      data={items}
      columns={columns}
      getRowId={(row) => row.id || row.itemNumber || ''}
      enablePagination
    />
  )
}

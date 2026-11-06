// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload } from 'lucide-react'
import { getImportConfig } from '@cascadia/commons/import'
import { ImportDialog } from './ImportDialog'
import type { ImportItemType } from '@cascadia/commons/import'
import { Button } from '@/components/ui'
import { translateItemTypeLabel } from '@/i18n'

interface ImportButtonProps {
  /** Item type to import */
  itemType?: ImportItemType
  /** Pre-select a program */
  programId?: string
  /** Pre-select a design */
  designId?: string
  /** Pre-select a branch */
  branchId?: string
  /** Button variant */
  variant?: 'default' | 'outline' | 'ghost'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Additional class names */
  className?: string
  /** Callback when import completes successfully */
  onImportComplete?: () => void
}

/**
 * Button that opens the import wizard dialog.
 * Can pre-populate context selection based on current page.
 */
export function ImportButton({
  itemType = 'Part',
  programId,
  designId,
  branchId,
  variant = 'outline',
  size = 'default',
  className,
  onImportComplete,
}: ImportButtonProps) {
  const [open, setOpen] = useState(false)
  const { t } = useTranslation('common')
  const config = getImportConfig(itemType)
  const typeLabel = translateItemTypeLabel(config.pluralLabel)

  const handleComplete = () => {
    setOpen(false)
    onImportComplete?.()
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
        data-testid="import-button"
      >
        <Upload className="h-4 w-4 mr-2" />
        {t('importButton.importLabel', { label: typeLabel })}
      </Button>

      <ImportDialog
        open={open}
        onOpenChange={setOpen}
        itemType={itemType}
        initialProgramId={programId}
        initialDesignId={designId}
        initialBranchId={branchId}
        onComplete={handleComplete}
      />
    </>
  )
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useTranslation } from 'react-i18next'
import { Moon, Sun } from 'lucide-react'
import type { ThemeToggleProps } from './types'
import { useTheme } from '@/theme'
import { cn } from '@/utils'

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { t: tc } = useTranslation('common')
  const { theme, toggleTheme } = useTheme()
  const nextMode =
    theme === 'light'
      ? tc('layout.themeModeDark')
      : tc('layout.themeModeLight')

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors',
        className,
      )}
      aria-label={tc('layout.themeToggleAria')}
      title={tc('layout.themeToggleTitle', { mode: nextMode })}
    >
      {theme === 'light' ? (
        <Moon size={18} className="text-gray-600 dark:text-gray-300" />
      ) : (
        <Sun size={18} className="text-yellow-500 dark:text-yellow-400" />
      )}
    </button>
  )
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useTranslation } from 'react-i18next'
import { setAppLocale, type AppLocale } from '@/i18n'
import { cn } from '@/utils'

export function LanguageToggle({ className }: { className?: string }) {
  const { t, i18n } = useTranslation('common')
  const current = (i18n.language === 'en' ? 'en' : 'zh-CN') as AppLocale

  const onChange = (locale: AppLocale) => {
    void setAppLocale(locale)
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-gray-300 dark:border-gray-600 overflow-hidden text-xs',
        className,
      )}
      role="group"
      aria-label={t('language.aria')}
      title={t('language.switchTo')}
    >
      <button
        type="button"
        className={cn(
          'px-2 py-1 transition-colors',
          current === 'zh-CN'
            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
            : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
        )}
        onClick={() => onChange('zh-CN')}
        data-testid="locale-zh-CN"
      >
        {t('language.zhCN')}
      </button>
      <button
        type="button"
        className={cn(
          'px-2 py-1 transition-colors',
          current === 'en'
            ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
            : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
        )}
        onClick={() => onChange('en')}
        data-testid="locale-en"
      >
        {t('language.en')}
      </button>
    </div>
  )
}

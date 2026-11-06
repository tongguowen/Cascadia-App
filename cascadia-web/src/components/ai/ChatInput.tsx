// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

/**
 * ChatInput - Input component for sending messages
 */

import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Send, Square } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  onSearch?: (message: string) => void
  onStop?: () => void
  isLoading?: boolean
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  onSearch,
  onStop,
  isLoading = false,
  disabled = false,
  placeholder,
}: ChatInputProps) {
  const { t } = useTranslation('ai')
  const resolvedPlaceholder =
    placeholder ?? t('input.placeholder')
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`
    }
  }, [value])

  const submitAndClear = (callback: (message: string) => void) => {
    const trimmed = value.trim()
    if (trimmed && !isLoading && !disabled) {
      callback(trimmed)
      setValue('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleSubmit = () => submitAndClear(onSend)
  const handleSearch = () => onSearch && submitAndClear(onSearch)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Enter' && e.ctrlKey && onSearch) {
      e.preventDefault()
      handleSearch()
    }
  }

  return (
    <div className="flex gap-2 items-end">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={resolvedPlaceholder}
          disabled={disabled || isLoading}
          rows={1}
          className={cn(
            'w-full resize-none rounded-lg border px-3 py-2 text-sm',
            'bg-white dark:bg-slate-900',
            'border-slate-300 dark:border-slate-700',
            'text-slate-900 dark:text-slate-100',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors',
            'auto-hide-scroll',
          )}
        />
      </div>

      {isLoading && onStop ? (
        <Button
          type="button"
          onClick={onStop}
          variant="destructive"
          size="icon"
          className="flex-shrink-0"
          aria-label={t('input.stopAria')}
        >
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <div className="flex flex-col gap-1 flex-shrink-0">
          {onSearch && (
            <Button
              type="button"
              onClick={handleSearch}
              disabled={!value.trim() || disabled || isLoading}
              variant="outline"
              size="icon"
              className="h-7 w-7"
              aria-label={t('input.searchAria')}
              title={t('input.searchTitle')}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!value.trim() || disabled || isLoading}
            size="icon"
            className="h-7 w-7"
            aria-label={t('input.sendAria')}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  )
}

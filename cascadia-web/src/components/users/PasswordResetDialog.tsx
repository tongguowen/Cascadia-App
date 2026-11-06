// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
} from '@/components/ui'

interface PasswordResetUser {
  id: string
  email: string
  name: string | null
}

interface PasswordResetDialogProps {
  user: PasswordResetUser | null
  open: boolean
  onClose: () => void
  onSave: (userId: string, password: string) => Promise<void>
}

export function PasswordResetDialog({
  user,
  open,
  onClose,
  onSave,
}: PasswordResetDialogProps) {
  const { t: tc } = useTranslation('common')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    if (!user) return

    if (password.length < 8) {
      setError(tc('dialogs.passwordReset.errorMinLength'))
      return
    }

    if (password.length > 128) {
      setError(tc('dialogs.passwordReset.errorMaxLength'))
      return
    }

    if (password !== confirmPassword) {
      setError(tc('dialogs.passwordReset.errorMismatch'))
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await onSave(user.id, password)
      setPassword('')
      setConfirmPassword('')
      onClose()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : tc('dialogs.passwordReset.errorFailed'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setConfirmPassword('')
    setError(null)
    onClose()
  }

  if (!user) return null

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{tc('dialogs.passwordReset.title')}</DialogTitle>
          <DialogDescription>
            {tc('dialogs.passwordReset.description', {
              userName: user.name || user.email,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-4">
          <FormField
            label={tc('dialogs.passwordReset.newPasswordLabel')}
            required
            helpText={tc('dialogs.passwordReset.passwordHelp')}
          >
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
            />
          </FormField>

          <FormField
            label={tc('dialogs.passwordReset.confirmPasswordLabel')}
            required
          >
            <Input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
            />
          </FormField>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {tc('actions.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting
              ? tc('actions.resetting')
              : tc('actions.resetPassword')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

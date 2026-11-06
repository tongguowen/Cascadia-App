// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { KeyRound, LockKeyhole, Mail, User } from 'lucide-react'
import type { FormEvent } from 'react'
import { PageContainer } from '@/components/layout'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/components/ui'
import { apiFetch } from '@/api/client'
import { authSessionQuery } from '@/query'

export const Route = createFileRoute('/profile/')({
  component: ProfilePage,
  beforeLoad: async ({ context }) => {
    // Read the session through the shared cache the root route already
    // primed, rather than firing a second /auth/session for this page.
    const session = await context.queryClient.fetchQuery(authSessionQuery())
    if (!session.authenticated || !session.user) {
      throw redirect({ to: '/login' })
    }
    return { user: session.user }
  },
})

function ProfilePage() {
  const { user } = Route.useRouteContext()
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')

  // Generate initials from name or email
  const getInitials = () => {
    if (user.name) {
      return user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return user.email[0].toUpperCase()
  }

  return (
    <PageContainer maxWidth="wide">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
          {t('profile.title')}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          {t('profile.subtitle')}
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.accountInformation')}</CardTitle>
          <CardDescription>{t('profile.personalDetails')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-cyan-600 dark:bg-cyan-500 text-white font-bold text-2xl">
              {getInitials()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {user.name || tc('layout.userFallback')}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {user.email}
              </p>
            </div>
          </div>

          {/* User Details */}
          <div className="space-y-4 pt-6 border-t border-slate-300 dark:border-slate-700">
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {tc('fields.name')}
                </label>
                <p className="text-slate-900 dark:text-white">
                  {user.name || t('profile.notSet')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
              <div className="flex-1">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {tc('columns.email')}
                </label>
                <p className="text-slate-900 dark:text-white">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="pt-6 border-t border-slate-300 dark:border-slate-700">
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">
              {t('profile.comingSoon')}
            </p>
          </div>
        </CardContent>
      </Card>

      <PasswordChangeCard />

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <CardTitle>{t('profile.apiKeysTitle')}</CardTitle>
          </div>
          <CardDescription>{t('profile.apiKeysDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t('profile.apiKeysBody')}
            </p>
            <Link to="/profile/api-keys">
              <Button>
                <KeyRound className="w-4 h-4 mr-2" />
                {t('profile.manageApiKeys')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

function PasswordChangeCard() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const [currentPassword, setCurrentPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (password.length < 8) {
      setError(t('profile.passwordTooShort'))
      return
    }

    if (password.length > 128) {
      setError(t('profile.passwordTooLong'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('profile.passwordMismatch'))
      return
    }

    setIsSubmitting(true)
    try {
      await apiFetch('/api/v1/auth/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, password }),
        retry: false,
      })

      setCurrentPassword('')
      setPassword('')
      setConfirmPassword('')
      setSuccess(t('profile.passwordChangedSuccess'))
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : t('profile.changePasswordFailed'),
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LockKeyhole className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <CardTitle>{t('profile.changePassword')}</CardTitle>
        </div>
        <CardDescription>{t('profile.changePasswordDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="current-password">
              {t('profile.currentPassword')}
            </Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">{t('profile.newPassword')}</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('profile.passwordLengthHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password">
              {t('profile.confirmNewPassword')}
            </Label>
            <Input
              id="confirm-new-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          {success && (
            <p className="text-sm text-green-600 dark:text-green-400">
              {success}
            </p>
          )}

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t('profile.changingPassword')
              : t('profile.changePassword')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

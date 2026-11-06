// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, KeyRound } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { ApiKeyManager } from '@/components/api-keys'
import { myApiKeysQuery } from '@/query'

export const Route = createFileRoute('/profile/api-keys')({
  component: MyApiKeysPage,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(myApiKeysQuery()),
})

/**
 * Self-service key management.
 *
 * Every read and write here is scoped server-side to the signed-in user, so
 * this page needs no permission beyond being authenticated — which is the
 * point: issuing a key for your own integrations should not require an admin.
 */
function MyApiKeysPage() {
  const { t } = useTranslation('pages')
  const { data, isPending, error } = useQuery(myApiKeysQuery())

  const keys = data?.apiKeys ?? []
  const activeCount = keys.filter((k) => k.status === 'active').length

  return (
    <PageContainer maxWidth="wide">
      <div>
        <Link
          to="/profile"
          className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          {t('profile.backToProfile')}
        </Link>
        <div className="flex items-center gap-3 mt-3">
          <KeyRound className="w-8 h-8 text-slate-700 dark:text-slate-300" />
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              {t('profile.apiKeysPageTitle')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              {t('profile.apiKeysPageSubtitle')}
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>{t('profile.yourKeys')}</CardTitle>
            <Badge variant="secondary">
              {t('profile.activeCount', { count: activeCount })}
            </Badge>
          </div>
          <CardDescription>{t('profile.keysScopeDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {isPending && (
            <p className="text-sm text-muted-foreground">
              {t('profile.loadingKeys')}
            </p>
          )}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
              {error.message}
            </div>
          )}
          {!isPending && !error && (
            <ApiKeyManager
              keys={data.apiKeys}
              scopableRoles={data.scopableRoles}
              basePath="/api/v1/auth/api-keys"
              scope="self"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.usingKey')}</CardTitle>
          <CardDescription>{t('profile.usingKeyDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="p-3 bg-slate-100 dark:bg-slate-800 rounded text-xs overflow-x-auto">
            {`curl -H "Authorization: Bearer csc_..." \\
  ${typeof window === 'undefined' ? '' : window.location.origin}/api/v1/parts`}
          </pre>
          <p className="text-xs text-muted-foreground mt-3">
            {t('profile.mcpNote')}
          </p>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

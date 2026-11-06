// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { KeyRound, Search, ShieldAlert } from 'lucide-react'
import type { ApiKeyStatus } from '@cascadia/commons/auth/api-key-types'
import { PageContainer } from '@/components/layout'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@/components/ui'
import { ApiKeyManager, ApiKeyPolicyCard } from '@/components/api-keys'
import { adminApiKeysQuery, myApiKeysQuery } from '@/query'

export const Route = createFileRoute('/admin/api-keys')({
  component: AdminApiKeysPage,
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.ensureQueryData(adminApiKeysQuery()),
      // The create dialog offers the *signed-in admin's* roles, since keys are
      // always minted for whoever is creating them.
      queryClient.ensureQueryData(myApiKeysQuery()),
    ]),
})

function AdminApiKeysPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const STATUS_FILTERS: Array<{ value: ApiKeyStatus | 'all'; label: string }> =
    [
      { value: 'all', label: t('admin.apiKeys.filterAll') },
      { value: 'active', label: t('admin.apiKeys.filterActive') },
      { value: 'disabled', label: t('admin.apiKeys.filterDisabled') },
      { value: 'expired', label: t('admin.apiKeys.filterExpired') },
      { value: 'revoked', label: t('admin.apiKeys.filterRevoked') },
    ]
  const { data: keys = [], isPending, error } = useQuery(adminApiKeysQuery())
  const { data: mine } = useQuery(myApiKeysQuery())

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApiKeyStatus | 'all'>('all')

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return keys.filter((key) => {
      if (statusFilter !== 'all' && key.status !== statusFilter) return false
      if (!needle) return true
      return (
        key.name.toLowerCase().includes(needle) ||
        key.keyPrefix.toLowerCase().includes(needle) ||
        key.userEmail.toLowerCase().includes(needle) ||
        (key.userName?.toLowerCase().includes(needle) ?? false)
      )
    })
  }, [keys, search, statusFilter])

  // Keys that inherit every role their owner holds are the ones worth
  // noticing: they clear role gates their permission scope says nothing about.
  const unscopedRoleKeys = keys.filter(
    (k) => k.roles === null && k.status === 'active',
  ).length

  const counts = useMemo(() => {
    const byStatus = new Map<string, number>()
    for (const key of keys) {
      byStatus.set(key.status, (byStatus.get(key.status) ?? 0) + 1)
    }
    return byStatus
  }, [keys])

  return (
    <PageContainer maxWidth="wide">
      <div className="flex items-center gap-3">
        <KeyRound className="w-8 h-8 text-slate-700 dark:text-slate-300" />
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            {t('admin.apiKeys.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('admin.apiKeys.subtitle')}
          </p>
        </div>
      </div>

      {unscopedRoleKeys > 0 && (
        <div className="flex items-start gap-2 p-4 rounded border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-900 dark:text-amber-200">
              {t('admin.apiKeys.unscopedWarningTitle', {
                count: unscopedRoleKeys,
              })}
            </p>
            <p className="text-amber-800 dark:text-amber-300 mt-1">
              {t('admin.apiKeys.unscopedWarningBody')}
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle>{t('admin.apiKeys.keysTitle')}</CardTitle>
            {STATUS_FILTERS.filter((f) => f.value !== 'all').map((filter) => {
              const count = counts.get(filter.value) ?? 0
              if (count === 0) return null
              return (
                <Badge key={filter.value} variant="secondary">
                  {count} {filter.label.toLowerCase()}
                </Badge>
              )
            })}
          </div>
          <CardDescription>{t('admin.apiKeys.keysDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[16rem]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('admin.apiKeys.searchPlaceholder')}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1">
              {STATUS_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  variant={
                    statusFilter === filter.value ? 'default' : 'outline'
                  }
                  size="sm"
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>

          {isPending && (
            <p className="text-sm text-muted-foreground">Loading keys…</p>
          )}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
              {error.message}
            </div>
          )}
          {!isPending && !error && (
            <ApiKeyManager
              keys={filtered}
              scopableRoles={mine?.scopableRoles ?? []}
              basePath="/api/v1/admin/api-keys"
              createPath="/api/v1/auth/api-keys"
              scope="admin"
              showOwner
            />
          )}
        </CardContent>
      </Card>

      <ApiKeyPolicyCard />
    </PageContainer>
  )
}

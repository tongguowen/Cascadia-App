// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Shield, Users } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { roleListQuery } from '@/query'

export const Route = createFileRoute('/admin/roles')({
  component: RolesPage,
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData(roleListQuery()),
})

function RolesPage() {
  const { t } = useTranslation('pages')
  const { data: roles = [], isPending, error } = useQuery(roleListQuery())
  const title = t('admin.roles.title')

  if (isPending) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield size={32} className="text-cyan-600 dark:text-cyan-400" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {title}
          </h1>
        </div>
        <p className="text-muted-foreground">{t('admin.roles.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Shield size={32} className="text-cyan-600 dark:text-cyan-400" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {title}
          </h1>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded">
          {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Shield size={32} className="text-cyan-600 dark:text-cyan-400" />
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {title}
          </h1>
        </div>
        <Badge variant="secondary">
          {t('admin.roles.role', { count: roles.length })}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-2">{role.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {role.description || t('admin.roles.noDescription')}
                </p>
              </div>
              <Users size={20} className="text-muted-foreground" />
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">
                  {t('admin.roles.permissions')}
                </h4>
                <div className="space-y-2">
                  {role.permissions ? (
                    Object.entries(role.permissions).map(
                      ([resource, actions]) => (
                        <div key={resource} className="text-sm">
                          <span className="font-medium text-foreground capitalize">
                            {resource.replace('_', ' ')}:
                          </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {actions.map((action) => (
                              <Badge
                                key={action}
                                variant="secondary"
                                className="text-xs"
                              >
                                {action}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {t('admin.roles.noPermissions')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
          {t('admin.roles.definitionsTitle')}
        </h3>
        <ul className="text-sm text-slate-600 dark:text-slate-300 space-y-1">
          <li>
            <strong className="text-slate-900 dark:text-white">
              {t('admin.roles.adminName')}
            </strong>{' '}
            {t('admin.roles.adminDesc')}
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white">
              {t('admin.roles.powerUserName')}
            </strong>{' '}
            {t('admin.roles.powerUserDesc')}
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white">
              {t('admin.roles.approverName')}
            </strong>{' '}
            {t('admin.roles.approverDesc')}
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white">
              {t('admin.roles.userName')}
            </strong>{' '}
            {t('admin.roles.userDesc')}
          </li>
          <li>
            <strong className="text-slate-900 dark:text-white">
              {t('admin.roles.viewOnlyName')}
            </strong>{' '}
            {t('admin.roles.viewOnlyDesc')}
          </li>
        </ul>
      </div>
    </div>
  )
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import type { UserWithRoles } from '@cascadia/commons/auth/types'
import { PageContainer } from '@/components/layout'
import { UserTable } from '@/components/users/UserTable'
import { RoleAssignmentDialog } from '@/components/users/RoleAssignmentDialog'
import { PasswordResetDialog } from '@/components/users/PasswordResetDialog'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { useAlertDialog } from '@/hooks/useAlertDialog'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import { roleListQuery, useInvalidateResources, userListQuery } from '@/query'
import { apiFetch } from '@/api/client'

export const Route = createFileRoute('/users/')({
  component: UsersListPage,
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(userListQuery()),
      queryClient.ensureQueryData(roleListQuery()),
    ])
  },
})

function UsersListPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const { alert, confirm } = useAlertDialog()
  const { handleError } = useErrorHandler()
  const invalidate = useInvalidateResources()
  const { data: users = [] } = useQuery(userListQuery())
  const { data: roles = [] } = useQuery(roleListQuery())
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] =
    useState(false)
  const [editingUser, setEditingUser] = useState<UserWithRoles | null>(null)

  const stats = useMemo(() => {
    const byProvider: Record<string, number> = {}
    for (const user of users) {
      const provider = user.provider ?? 'local'
      byProvider[provider] = (byProvider[provider] ?? 0) + 1
    }
    const active = users.filter((u) => u.active).length
    return {
      total: users.length,
      active,
      inactive: users.length - active,
      byProvider,
    }
  }, [users])

  // Navigate to detail page for editing (if it exists) or show alert
  const handleEditUser = (_user: UserWithRoles) => {
    // For now, users are edited via the list page dialogs
    // This could navigate to /users/$id if a detail page is created
    alert({
      title: t('users.editTitle'),
      description: t('users.editDescription'),
    })
  }

  const handleDeleteUser = (user: UserWithRoles) => {
    if (!user.id) return

    confirm({
      title: t('users.deleteTitle'),
      description: t('users.deleteDescription', { email: user.email }),
      actionLabel: tc('actions.delete'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const response = await apiFetch<{
            data: { outcome: 'deleted' | 'deactivated' }
          }>(`/api/v1/users/${user.id}`, { method: 'DELETE' })

          await invalidate('users')
          alert({
            title:
              response.data.outcome === 'deleted'
                ? t('users.deletedTitle')
                : t('users.deactivatedTitle'),
            description:
              response.data.outcome === 'deleted'
                ? t('users.deletedDescription', { email: user.email })
                : t('users.deactivatedDescription', { email: user.email }),
          })
        } catch (error) {
          handleError(error, { title: tc('dialog.failedDelete') })
        }
      },
    })
  }

  const handleAssignRoles = async (userId: string, roleIds: Array<string>) => {
    try {
      await apiFetch(`/api/v1/users/${userId}/roles`, {
        method: 'PUT',
        body: JSON.stringify({ roleIds }),
      })

      await invalidate('users', 'roles')
    } catch (error) {
      console.error('Error assigning roles:', error)
      throw error
    }
  }

  const handleResetPassword = async (userId: string, password: string) => {
    try {
      await apiFetch(`/api/v1/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
    } catch (error) {
      console.error('Error resetting password:', error)
      throw error
    }
  }

  const openRoleDialog = (user: UserWithRoles) => {
    setEditingUser(user)
    setIsRoleDialogOpen(true)
  }

  const openPasswordResetDialog = (user: UserWithRoles) => {
    setEditingUser(user)
    setIsPasswordResetDialogOpen(true)
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            {t('users.title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {t('users.subtitle')}
          </p>
        </div>
        <Link to="/users/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t('users.create')}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('users.total')}</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('users.active')}</CardDescription>
            <CardTitle className="text-3xl text-green-600 dark:text-green-400">
              {stats.active}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('users.inactive')}</CardDescription>
            <CardTitle className="text-3xl text-red-600 dark:text-red-400">
              {stats.inactive}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>{t('users.providers')}</CardDescription>
            <CardTitle className="text-3xl">
              {Object.keys(stats.byProvider).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>{t('users.tableTitle')}</CardTitle>
          <CardDescription>
            {t('users.tableDescription', { count: users.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserTable
            users={users}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
            onManageRoles={openRoleDialog}
            onResetPassword={openPasswordResetDialog}
          />
        </CardContent>
      </Card>

      {/* Role Assignment Dialog */}
      <RoleAssignmentDialog
        user={editingUser}
        roles={roles}
        open={isRoleDialogOpen}
        onClose={() => {
          setIsRoleDialogOpen(false)
          setEditingUser(null)
        }}
        onSave={handleAssignRoles}
      />

      {/* Password Reset Dialog */}
      <PasswordResetDialog
        user={editingUser}
        open={isPasswordResetDialogOpen}
        onClose={() => {
          setIsPasswordResetDialogOpen(false)
          setEditingUser(null)
        }}
        onSave={handleResetPassword}
      />
    </PageContainer>
  )
}

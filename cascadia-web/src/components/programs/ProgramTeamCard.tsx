// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Shield, Trash2, UserPlus } from 'lucide-react'
import type {
  Program,
  ProgramMember,
  ProgramMemberRole,
} from '@cascadia/commons/types/program'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  SearchableSelect,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { useAlertDialog } from '@/hooks/useAlertDialog'
import { useErrorHandler } from '@/hooks/useErrorHandler'
import {
  activeUserListQuery,
  authSessionQuery,
  programMembersQuery,
  useInvalidateResources,
} from '@/query'
import { apiFetch } from '@/api/client'

const ROLE_VALUES: Array<ProgramMemberRole> = [
  'admin',
  'lead',
  'engineer',
  'viewer',
]

function roleVariant(
  role: string,
): 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' {
  switch (role) {
    case 'admin':
      return 'destructive'
    case 'lead':
      return 'warning'
    case 'engineer':
      return 'default'
    default:
      return 'secondary'
  }
}

function flagBadge(label: string, on: boolean | null) {
  return (
    <Badge
      variant={on ? 'success' : 'outline'}
      className={on ? '' : 'opacity-50'}
    >
      {label}
    </Badge>
  )
}

/**
 * The program's team: who is a member, in which program role, with which
 * ECO/product flags.
 *
 * Everyone with access to the program sees the list; add/edit/remove render
 * only for program admins (add also for leads, without the admin role
 * option) and top-level administrators. That gating is presentation only —
 * every mutation is re-checked server-side by the members routes.
 */
export function ProgramTeamCard({ program }: { program: Program }) {
  const { t: tp } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const roleOptions = useMemo(
    () =>
      ROLE_VALUES.map((value) => ({
        value,
        label: tp(`programs.detail.team.roles.${value}`),
      })),
    [tp],
  )
  const { data: members = [] } = useQuery(programMembersQuery(program.id))
  const { data: session } = useQuery(authSessionQuery())
  const { confirm } = useAlertDialog()
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()

  const isSystemAdmin = session?.setupStatus?.isAdmin ?? false
  const isProgramAdmin = program.userRole === 'admin' || isSystemAdmin
  const canAddMembers = isProgramAdmin || program.userRole === 'lead'
  // A lead may add members but not mint admins — mirror the server rule so
  // the option is not offered and then rejected.
  const grantableRoles = isProgramAdmin
    ? roleOptions
    : roleOptions.filter((r) => r.value !== 'admin')

  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<ProgramMember | null>(null)

  const removeMember = (member: ProgramMember) => {
    confirm({
      title: tp('programs.detail.team.removeConfirmTitle'),
      description: tp('programs.detail.team.removeConfirmDescription', {
        name: member.user.name ?? member.user.email,
        code: program.code,
      }),
      actionLabel: tp('programs.detail.team.removeAction'),
      cancelLabel: tc('actions.cancel'),
      variant: 'destructive',
      onConfirm: async () => {
        try {
          await apiFetch(
            `/api/v1/programs/${program.id}/members/${member.userId}`,
            { method: 'DELETE' },
          )
          showSuccess(
            tp('programs.detail.team.memberRemovedTitle'),
            tp('programs.detail.team.memberRemovedDescription', {
              email: member.user.email,
            }),
          )
          await invalidate('programs')
        } catch (error) {
          handleError(error, {
            title: tp('programs.detail.team.removeFailedTitle'),
          })
        }
      },
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{tp('programs.detail.team.title')}</CardTitle>
          <CardDescription>
            {tp('programs.detail.team.memberCount', { count: members.length })}
          </CardDescription>
        </div>
        {canAddMembers && (
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            {tp('programs.detail.team.addMember')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tp('programs.detail.team.columns.member')}</TableHead>
              <TableHead>{tp('programs.detail.team.columns.role')}</TableHead>
              <TableHead>
                {tp('programs.detail.team.columns.permissions')}
              </TableHead>
              <TableHead>{tp('programs.detail.team.columns.joined')}</TableHead>
              {isProgramAdmin && <TableHead className="w-24" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isProgramAdmin ? 5 : 4}
                  className="text-center text-sm text-slate-500 dark:text-slate-400 py-8"
                >
                  {tp('programs.detail.team.empty')}
                </TableCell>
              </TableRow>
            ) : null}
            {members.map((member) => (
              <TableRow key={member.id}>
                <TableCell>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">
                      {member.user.name ?? member.user.email}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {member.user.email}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleVariant(member.role)}>
                    {tp(`programs.detail.team.roles.${member.role}`)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {flagBadge(
                      tp('programs.detail.team.flags.createEco'),
                      member.canCreateEco,
                    )}
                    {flagBadge(
                      tp('programs.detail.team.flags.approveEco'),
                      member.canApproveEco,
                    )}
                    {flagBadge(
                      tp('programs.detail.team.flags.manageDesigns'),
                      member.canManageDesigns,
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-slate-500 dark:text-slate-400">
                  {new Date(member.joinedAt).toLocaleDateString()}
                </TableCell>
                {isProgramAdmin && (
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={tp('programs.detail.team.editRoleTitle')}
                        onClick={() => setEditing(member)}
                      >
                        <Shield className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={tp('programs.detail.team.removeFromProgramTitle')}
                        onClick={() => removeMember(member)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {canAddMembers && (
        <AddMemberDialog
          program={program}
          existingUserIds={members.map((m) => m.userId)}
          grantableRoles={grantableRoles}
          open={addOpen}
          onOpenChange={setAddOpen}
        />
      )}
      {editing && (
        <EditMemberDialog
          program={program}
          member={editing}
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
        />
      )}
    </Card>
  )
}

function AddMemberDialog({
  program,
  existingUserIds,
  grantableRoles,
  open,
  onOpenChange,
}: {
  program: Program
  existingUserIds: Array<string>
  grantableRoles: Array<{ value: ProgramMemberRole; label: string }>
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t: tp } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()
  // Only fetch the picker list once the dialog is opened by someone who may
  // add members.
  const { data: users = [] } = useQuery({
    ...activeUserListQuery(),
    enabled: open,
  })

  const [userId, setUserId] = useState('')
  const [role, setRole] = useState<ProgramMemberRole>('engineer')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const candidates = users.filter((u) => !existingUserIds.includes(u.id))

  const handleAdd = async () => {
    if (!userId) return
    setIsSubmitting(true)
    try {
      await apiFetch(`/api/v1/programs/${program.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ userId, role }),
      })
      showSuccess(
        tp('programs.detail.team.addDialog.memberAddedTitle'),
        tp('programs.detail.team.addDialog.memberAddedDescription'),
      )
      setUserId('')
      setRole('engineer')
      onOpenChange(false)
      await invalidate('programs')
    } catch (error) {
      handleError(error, {
        title: tp('programs.detail.team.addDialog.addFailedTitle'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tp('programs.detail.team.addDialog.title')}</DialogTitle>
          <DialogDescription>
            {tp('programs.detail.team.addDialog.description', {
              code: program.code,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{tp('programs.detail.team.addDialog.user')}</Label>
            <SearchableSelect
              value={userId}
              onValueChange={setUserId}
              options={candidates.map((u) => ({
                value: u.id,
                label: u.name ? `${u.name} (${u.email})` : u.email,
              }))}
              placeholder={tp('programs.detail.team.addDialog.selectUser')}
              searchPlaceholder={tp('programs.detail.team.addDialog.searchUsers')}
              emptyMessage={tp('programs.detail.team.addDialog.noUsers')}
            />
          </div>
          <div className="space-y-2">
            <Label>{tp('programs.detail.team.addDialog.programRole')}</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as ProgramMemberRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {grantableRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('actions.cancel')}
          </Button>
          <Button onClick={handleAdd} disabled={!userId || isSubmitting}>
            {isSubmitting
              ? tc('actions.adding')
              : tp('programs.detail.team.addMember')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditMemberDialog({
  program,
  member,
  onOpenChange,
}: {
  program: Program
  member: ProgramMember
  onOpenChange: (open: boolean) => void
}) {
  const { t: tp } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const { handleError, showSuccess } = useErrorHandler()
  const invalidate = useInvalidateResources()
  const roleOptions = useMemo(
    () =>
      ROLE_VALUES.map((value) => ({
        value,
        label: tp(`programs.detail.team.roles.${value}`),
      })),
    [tp],
  )

  const [role, setRole] = useState<ProgramMemberRole>(member.role)
  const [canCreateEco, setCanCreateEco] = useState(!!member.canCreateEco)
  const [canApproveEco, setCanApproveEco] = useState(!!member.canApproveEco)
  const [canManageDesigns, setCanManageDesigns] = useState(
    !!member.canManageDesigns,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSave = async () => {
    setIsSubmitting(true)
    try {
      await apiFetch(
        `/api/v1/programs/${program.id}/members/${member.userId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            role,
            canCreateEco,
            canApproveEco,
            canManageDesigns,
          }),
        },
      )
      showSuccess(
        tp('programs.detail.team.editDialog.memberUpdatedTitle'),
        tp('programs.detail.team.editDialog.memberUpdatedDescription', {
          email: member.user.email,
        }),
      )
      onOpenChange(false)
      await invalidate('programs')
    } catch (error) {
      handleError(error, {
        title: tp('programs.detail.team.editDialog.updateFailedTitle'),
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const flags: Array<{
    label: string
    value: boolean
    set: (v: boolean) => void
  }> = [
    {
      label: tp('programs.detail.team.editDialog.canCreateEco'),
      value: canCreateEco,
      set: setCanCreateEco,
    },
    {
      label: tp('programs.detail.team.editDialog.canApproveEco'),
      value: canApproveEco,
      set: setCanApproveEco,
    },
    {
      label: tp('programs.detail.team.editDialog.canManageDesigns'),
      value: canManageDesigns,
      set: setCanManageDesigns,
    },
  ]

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tp('programs.detail.team.editDialog.title')}</DialogTitle>
          <DialogDescription>
            {tp('programs.detail.team.editDialog.description', {
              name: member.user.name ?? member.user.email,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{tp('programs.detail.team.addDialog.programRole')}</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as ProgramMemberRole)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            {flags.map((flag) => (
              <label
                key={flag.label}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Checkbox
                  checked={flag.value}
                  onCheckedChange={(checked) => flag.set(checked === true)}
                />
                <span className="text-sm text-slate-900 dark:text-slate-100">
                  {flag.label}
                </span>
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc('actions.cancel')}
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? tc('actions.saving') : tc('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

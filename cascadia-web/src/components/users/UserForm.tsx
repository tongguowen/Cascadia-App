// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useForm } from '@tanstack/react-form'
import { useTranslation } from 'react-i18next'
import {
  userCreateSchema,
  userUpdateSchema,
} from '@cascadia/commons/auth/types'
import { zodValidator } from '@/form-validation'
import {
  Button,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'

interface UserFormProps {
  user?: {
    email?: string
    name?: string
    provider?: string
    providerId?: string
    active?: boolean
  }
  mode: 'create' | 'edit'
  onSubmit: (data: any) => void | Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

export function UserForm({
  user,
  mode,
  onSubmit,
  onCancel,
  isSubmitting,
}: UserFormProps) {
  const schema = mode === 'create' ? userCreateSchema : userUpdateSchema

  const form = useForm({
    defaultValues: {
      email: user?.email || '',
      name: user?.name || '',
      password: '',
      provider: user?.provider || 'local',
      providerId: user?.providerId || '',
      active: user?.active ?? true,
    },
    validators: {
      onSubmit: zodValidator(schema),
    },
    onSubmit: async ({ value }) => {
      if (mode === 'edit') {
        const { active: _active, password: _password, ...editable } = value
        await onSubmit(editable)
        return
      }
      await onSubmit(value)
    },
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email */}
        <form.Field name="email">
          {(field) => (
            <FormField
              label="Email"
              required
              label={tc('columns.email')}
              required
              error={field.state.meta.errors[0]}
              helpText={tp('users.form.emailHelp')}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                type="email"
                placeholder="user@example.com"
                error={!!field.state.meta.errors.length}
                placeholder={tp('users.form.emailPlaceholder')}
            </FormField>
          )}
        </form.Field>

        {/* Name */}
        <form.Field name="name">
          {(field) => (
            <FormField
              label="Name"
              required
              label={tc('fields.name')}
              required
              error={field.state.meta.errors[0]}
              helpText={tp('users.form.nameHelp')}
                name={field.name}
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder="John Doe"
                error={!!field.state.meta.errors.length}
                placeholder={tp('users.form.namePlaceholder')}
                error={!!field.state.meta.errors.length}
              />
            </FormField>
          )}
        </form.Field>

        {/* Password (only for create mode) */}
        {mode === 'create' && (
          <form.Field name="password">
            {(field) => (
              <FormField
                label={tp('users.form.password')}
                required
                error={field.state.meta.errors[0]}
                helpText={tp('users.form.passwordHelp')}
              >
                <Input
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  type="password"
                  placeholder={tp('users.form.passwordPlaceholder')}
              </FormField>
            )}
          </form.Field>
        )}

        {/* Provider */}
        <form.Field name="provider">
          {(field) => (
            <FormField
              label="Provider"
              error={field.state.meta.errors[0]}
              label={tc('columns.provider')}
              error={field.state.meta.errors[0]}
              helpText={tp('users.form.providerHelp')}
            >
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger error={field.state.meta.errors.length > 0}>
                  <SelectValue placeholder={tp('users.form.selectProvider')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">
                    {tp('users.form.providerLocal')}
                  </SelectItem>
                  <SelectItem value="azure">
                    {tc('enum.oauthProvider.azure')}
                  </SelectItem>
                  <SelectItem value="google">
                    {tc('enum.oauthProvider.google')}
                  </SelectItem>
                  <SelectItem value="github">
                    {tc('enum.oauthProvider.github')}
                  </SelectItem>
            </FormField>
          )}
        </form.Field>

        {/* Provider ID (only if provider is not local) */}
        <form.Field name="provider">
          {(providerField) => (
            <>
              {providerField.state.value !== 'local' && (
                <form.Field name="providerId">
                  {(field) => (
                    <FormField
                      label="Provider ID"
                      error={field.state.meta.errors[0]}
                      label={tp('users.form.providerId')}
                      error={field.state.meta.errors[0]}
                      helpText={tp('users.form.providerIdHelp')}
                        name={field.name}
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder="External ID"
                        error={!!field.state.meta.errors.length}
                        placeholder={tp('users.form.externalIdPlaceholder')}
                    </FormField>
                  )}
                </form.Field>
              )}
            </>
          )}
        </form.Field>

        {/* Account status has its own endpoint so deactivation can revoke sessions. */}
        {mode === 'create' && (
          <form.Field name="active">
            {(field) => (
              <FormField
                label="Active Status"
                error={field.state.meta.errors[0]}
                label={tp('users.form.activeStatus')}
                error={field.state.meta.errors[0]}
                helpText={tp('users.form.activeStatusHelp')}
              >
                <Select
                  value={field.state.value ? 'true' : 'false'}
                  onValueChange={(value) =>
                    field.handleChange(value === 'true')
                  }
                >
                  <SelectTrigger error={field.state.meta.errors.length > 0}>
                    <SelectValue placeholder={tc('labels.selectStatus')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{tp('users.active')}</SelectItem>
                    <SelectItem value="false">{tp('users.inactive')}</SelectItem>
              </FormField>
            )}
          </form.Field>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-4 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
            {tc('actions.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? tc('actions.saving')
            : mode === 'create'
              ? tp('users.form.createSubmit')
              : tp('users.form.updateSubmit')}
    </form>
  )
}

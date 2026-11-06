// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, CheckCircle, Clock, RotateCcw, Save } from 'lucide-react'
import type { ApiKeyPolicy } from '@cascadia/commons/auth/api-key-policy-types'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
} from '@/components/ui'
import { apiKeyPolicyQuery, useInvalidateResources } from '@/query'
import { ApiError, apiFetch } from '@/api/client'

/**
 * Instance-wide expiration policy editor.
 *
 * Governs issuance only. A shorter policy does not retroactively clip keys
 * already in the field — those have to be revoked deliberately, which the key
 * list above supports.
 */
export function ApiKeyPolicyCard() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const invalidate = useInvalidateResources()
  const { data, isPending } = useQuery(apiKeyPolicyQuery())

  const [draft, setDraft] = useState<ApiKeyPolicy | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // The server answer stays authoritative until the admin edits something.
  const policy = draft ?? data?.policy ?? null
  const defaults = data?.defaults ?? null

  const update = (patch: Partial<ApiKeyPolicy>) => {
    if (!policy) return
    setDraft({ ...policy, ...patch })
    setStatus('idle')
  }

  const handleSave = async () => {
    if (!policy) return
    setSaving(true)
    setStatus('idle')
    try {
      await apiFetch('/api/v1/admin/api-key-policy', {
        method: 'PUT',
        body: JSON.stringify(policy),
      })
      await invalidate('admin')
      setDraft(null)
      setStatus('success')
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : t('admin.apiKeys.policy.saveFailed'),
      )
      setStatus('error')
    } finally {
      setSaving(false)
    }
  }

  if (isPending || !policy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('admin.apiKeys.policy.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('admin.apiKeys.policy.loading')}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <CardTitle>{t('admin.apiKeys.policy.title')}</CardTitle>
        </div>
        <CardDescription>{t('admin.apiKeys.policy.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="default-days">
              {t('admin.apiKeys.policy.defaultLifetimeLabel')}
            </Label>
            <Input
              id="default-days"
              type="number"
              min={1}
              placeholder={t('admin.apiKeys.policy.defaultLifetimePlaceholder')}
              value={policy.defaultExpirationDays ?? ''}
              onChange={(e) =>
                update({
                  defaultExpirationDays:
                    e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.apiKeys.policy.defaultLifetimeHelp')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max-days">
              {t('admin.apiKeys.policy.maxLifetimeLabel')}
            </Label>
            <Input
              id="max-days"
              type="number"
              min={1}
              placeholder={t('admin.apiKeys.policy.maxLifetimePlaceholder')}
              value={policy.maxExpirationDays ?? ''}
              onChange={(e) =>
                update({
                  maxExpirationDays:
                    e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              {t('admin.apiKeys.policy.maxLifetimeHelp')}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-2">
          <Switch
            id="require-expiration"
            checked={policy.requireExpiration}
            onCheckedChange={(checked) =>
              update({ requireExpiration: checked })
            }
          />
          <div>
            <Label htmlFor="require-expiration">
              {t('admin.apiKeys.policy.requireExpiryLabel')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('admin.apiKeys.policy.requireExpiryHelp')}
            </p>
          </div>
        </div>

        {status === 'error' && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            {errorMessage}
          </div>
        )}
        {status === 'success' && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            {t('admin.apiKeys.policy.saved')}
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button onClick={handleSave} disabled={saving || draft === null}>
            <Save className="w-4 h-4 mr-2" />
            {saving
              ? tc('actions.saving')
              : t('admin.apiKeys.policy.savePolicy')}
          </Button>
          {draft !== null && (
            <Button
              variant="outline"
              onClick={() => {
                setDraft(null)
                setStatus('idle')
              }}
            >
              {tc('actions.cancel')}
            </Button>
          )}
          {defaults && (
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(defaults)
                setStatus('idle')
              }}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('admin.apiKeys.policy.restoreDefaults')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link, createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  AlertCircle,
  CheckCircle,
  Cloud,
  FolderOpen,
  HardDrive,
  Key,
  KeyRound,
  Loader2,
  Lock,
  Package,
  PlayCircle,
  Save,
  Settings,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SettingKeys } from '@cascadia/commons/config/SettingKeys'
import { APP_VERSION } from '@cascadia/commons/version'
import { PageContainer } from '@/components/layout'
import { PackagesCard } from '@/components/admin/PackagesCard'
import { Slot } from '@/ui/slot-registry'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@/components/ui'
import {
  packageListQuery,
  useInvalidateResources,
  vaultConfigQuery,
} from '@/query'
import { apiFetch } from '@/api/client'

export const Route = createFileRoute('/admin/')({
  component: AdminPage,
  loader: async ({ context: { queryClient } }) => {
    await Promise.all([
      queryClient.ensureQueryData(vaultConfigQuery()),
      queryClient.ensureQueryData(packageListQuery()),
    ])
  },
})

function AdminPage() {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const a = (key: string, options?: Record<string, string>) =>
    t(`admin.index.${key}`, options)
  const invalidate = useInvalidateResources()
  const { data: vaultConfig, isPending: loading } = useQuery(vaultConfigQuery())
  // `null` means untouched, so the field tracks the server until it is edited
  const [draftVaultLocation, setDraftVaultLocation] = useState<string | null>(
    null,
  )
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle',
  )
  const [errorMessage, setErrorMessage] = useState('')

  const isLocal = vaultConfig?.type === 'local'
  const effectiveVaultLocation = isLocal ? (vaultConfig.rootPath ?? '') : ''
  const savedVaultLocation = isLocal
    ? (vaultConfig.dbSettings.vaultRoot ?? '')
    : ''
  const vaultLocation = draftVaultLocation ?? effectiveVaultLocation

  const handleSave = async () => {
    if (!vaultLocation.trim()) return

    try {
      setSaving(true)
      setSaveStatus('idle')
      setErrorMessage('')

      await apiFetch('/api/v1/admin/settings', {
        method: 'POST',
        body: JSON.stringify({
          key: SettingKeys.VAULT_ROOT,
          value: vaultLocation.trim(),
          description: 'Root path for vault file storage',
        }),
      })

      setDraftVaultLocation(null)
      setSaveStatus('success')
      await invalidate('admin')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveStatus('error')
      setErrorMessage((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  // For local storage, check if the vault root is locked by env var
  const isVaultRootLocked = isLocal && vaultConfig.envVars.VAULT_ROOT

  const hasChanges =
    isLocal && !isVaultRootLocked && vaultLocation.trim() !== savedVaultLocation

  // Helper to get source description
  const getSourceDescription = (
    source: 'env' | 'db' | 'default' | undefined,
    envVarName?: string,
  ) => {
    switch (source) {
      case 'env':
        return envVarName
          ? a('sourceEnv', { name: envVarName })
          : a('sourceEnvGeneric')
      case 'db':
        return a('sourceDb')
      case 'default':
        return a('sourceDefault')
      default:
        return ''
    }
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-8 h-8 text-slate-700 dark:text-slate-300" />
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            {a('title')}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {a('subtitle')}
          </p>
        </div>
      </div>

      {/* Vault Settings Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <CardTitle>{a('vaultTitle')}</CardTitle>
          </div>
          <CardDescription>{a('vaultDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              {a('loadingConfig')}
            </div>
          ) : vaultConfig ? (
            <div className="space-y-6">
              {/* Storage Type */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  {a('storageType')}
                  {vaultConfig.sources.type === 'env' && (
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                  )}
                </Label>
                <div className="flex items-center gap-2">
                  {vaultConfig.type === 's3' ? (
                    <Badge variant="secondary" className="gap-1.5">
                      <Cloud className="w-3.5 h-3.5" />
                      {a('s3Storage')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1.5">
                      <HardDrive className="w-3.5 h-3.5" />
                      {a('localStorage')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {getSourceDescription(vaultConfig.sources.type, 'VAULT_TYPE')}
                </p>
              </div>

              {/* S3 Configuration */}
              {vaultConfig.type === 's3' && (
                <div className="space-y-4 border-l-2 border-slate-300 dark:border-slate-700 pl-4">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Cloud className="w-4 h-4" />
                    {a('s3Config')}
                  </h4>

                  {/* Bucket */}
                  <div className="space-y-1">
                    <Label className="text-sm flex items-center gap-2">
                      {a('bucket')}
                      <Lock className="w-3 h-3 text-amber-500" />
                    </Label>
                    <Input
                      value={vaultConfig.bucket || ''}
                      disabled
                      className="bg-slate-50 dark:bg-slate-800"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {getSourceDescription('env', 'S3_BUCKET')}
                    </p>
                  </div>

                  {/* Region */}
                  <div className="space-y-1">
                    <Label className="text-sm flex items-center gap-2">
                      {a('region')}
                      {vaultConfig.envVars.S3_REGION && (
                        <Lock className="w-3 h-3 text-amber-500" />
                      )}
                    </Label>
                    <Input
                      value={vaultConfig.region || 'us-east-1'}
                      disabled
                      className="bg-slate-50 dark:bg-slate-800"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {getSourceDescription(
                        vaultConfig.sources.region,
                        'S3_REGION',
                      )}
                    </p>
                  </div>

                  {/* Key Prefix */}
                  {vaultConfig.keyPrefix && (
                    <div className="space-y-1">
                      <Label className="text-sm flex items-center gap-2">
                        {a('keyPrefix')}
                        <Lock className="w-3 h-3 text-amber-500" />
                      </Label>
                      <Input
                        value={vaultConfig.keyPrefix}
                        disabled
                        className="bg-slate-50 dark:bg-slate-800"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {getSourceDescription('env', 'S3_KEY_PREFIX')}
                      </p>
                    </div>
                  )}

                  {/* Endpoint (for S3-compatible services) */}
                  {vaultConfig.endpoint && (
                    <div className="space-y-1">
                      <Label className="text-sm flex items-center gap-2">
                        {a('customEndpoint')}
                        <Lock className="w-3 h-3 text-amber-500" />
                      </Label>
                      <Input
                        value={vaultConfig.endpoint}
                        disabled
                        className="bg-slate-50 dark:bg-slate-800"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {getSourceDescription('env', 'S3_ENDPOINT')}
                      </p>
                    </div>
                  )}

                  {/* Credentials Status */}
                  <div className="space-y-1">
                    <Label className="text-sm flex items-center gap-2">
                      <Key className="w-3.5 h-3.5" />
                      {a('credentials')}
                    </Label>
                    <div className="flex items-center gap-2">
                      {vaultConfig.hasCredentials ? (
                        <Badge
                          variant="secondary"
                          className="gap-1.5 text-green-700 dark:text-green-400"
                        >
                          <CheckCircle className="w-3 h-3" />
                          {a('credentialsExplicit')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1.5">
                          <CheckCircle className="w-3 h-3" />
                          {a('credentialsIam')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Local Storage Configuration */}
              {vaultConfig.type === 'local' && (
                <div className="space-y-4 border-l-2 border-slate-300 dark:border-slate-700 pl-4">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    {a('localStorageHeading')}
                  </h4>

                  <div className="space-y-2">
                    <Label
                      htmlFor="vaultLocation"
                      className="flex items-center gap-2"
                    >
                      {a('vaultLocation')}
                      {isVaultRootLocked && (
                        <Lock className="w-3 h-3 text-amber-500" />
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="vaultLocation"
                        type="text"
                        placeholder={a('vaultLocationPlaceholder')}
                        value={vaultLocation}
                        onChange={(e) => setDraftVaultLocation(e.target.value)}
                        disabled={isVaultRootLocked}
                        className={
                          isVaultRootLocked
                            ? 'flex-1 bg-slate-50 dark:bg-slate-800'
                            : 'flex-1'
                        }
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        title={a('browse')}
                        disabled
                      >
                        <FolderOpen className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {getSourceDescription(
                        vaultConfig.sources.rootPath,
                        'VAULT_ROOT',
                      )}
                    </p>
                    {!isVaultRootLocked && (
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {a('vaultLocationHelp')}
                      </p>
                    )}
                  </div>

                  {/* Save button for local storage when editable */}
                  {!isVaultRootLocked && (
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        onClick={handleSave}
                        disabled={
                          !vaultLocation.trim() || saving || !hasChanges
                        }
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {saving ? tc('actions.saving') : a('saveConfiguration')}
                      </Button>
                      {saveStatus === 'success' && (
                        <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          {a('settingsSaved')}
                        </span>
                      )}
                      {saveStatus === 'error' && (
                        <span className="flex items-center gap-1 text-sm text-red-600 dark:text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          {errorMessage || a('failedToSave')}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-600 dark:text-slate-400">
              {a('loadVaultFailed')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Licensed Packages */}
      <PackagesCard />

      {/* Item Type Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <CardTitle>{a('itemTypesTitle')}</CardTitle>
          </div>
          <CardDescription>{a('itemTypesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {a('itemTypesBody')}
            </p>
            <Link to="/admin/item-types">
              <Button>
                <Settings className="w-4 h-4 mr-2" />
                {a('configureItemTypes')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <CardTitle>{a('usersTitle')}</CardTitle>
          </div>
          <CardDescription>{a('usersDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {a('usersBody')}
            </p>
            <Link to="/admin/users">
              <Button>
                <Users className="w-4 h-4 mr-2" />
                {a('manageUsers')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <CardTitle>{a('apiKeysTitle')}</CardTitle>
          </div>
          <CardDescription>{a('apiKeysDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {a('apiKeysBody')}
            </p>
            <Link to="/admin/api-keys">
              <Button>
                <KeyRound className="w-4 h-4 mr-2" />
                {a('manageApiKeys')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Component Catalog */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <CardTitle>{a('catalogTitle')}</CardTitle>
          </div>
          <CardDescription>{a('catalogDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {a('catalogBody')}
            </p>
            <Link to="/admin/component-catalog">
              <Button>
                <Package className="w-4 h-4 mr-2" />
                {a('manageCatalog')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* First-time setup wizard */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PlayCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <CardTitle>{a('setupTitle')}</CardTitle>
          </div>
          <CardDescription>{a('setupDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {a('setupBody')}
            </p>
            <Link to="/setup">
              <Button>
                <PlayCircle className="w-4 h-4 mr-2" />
                {a('runSetup')}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Sections contributed by optional packages */}
      <Slot name="admin-settings-sections" props={{}} />

      {/* System */}
      <Card>
        <CardHeader>
          <CardTitle>{a('systemTitle')}</CardTitle>
          <CardDescription>{a('systemDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {a('version')}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {a('versionHelp')}
              </p>
            </div>
            <Badge variant="outline">{APP_VERSION}</Badge>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

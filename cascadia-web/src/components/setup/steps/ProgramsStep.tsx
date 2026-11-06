// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  CheckCircle,
  Database,
  FileText,
  Loader2,
  Package,
  Plus,
} from 'lucide-react'
import { strings } from '../strings'
import { designListQuery, programListQuery } from '@/query'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'

interface CreatedProgram {
  id: string
  name: string
  code: string
}

interface CreatedDesign {
  id: string
  name: string
  code: string
}

interface ProgramsStepProps {
  onCompleted: () => void
}

/**
 * Pull a usable message out of an API error response.
 *
 * `apiHandler` reports a Zod failure as a bare "Validation failed" and puts the
 * offending fields in `fieldErrors`, so the message on its own tells the user
 * nothing about what to correct. Fold the field errors back into the text.
 */
async function readErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const json = (await response.json().catch(() => ({}))) as {
    error?: {
      message?: string
      fieldErrors?: Array<{ field?: string; message?: string }>
    }
  }
  const message = json.error?.message ?? fallback
  const detail = (json.error?.fieldErrors ?? [])
    .map((f) => [f.field, f.message].filter(Boolean).join(': '))
    .filter(Boolean)
    .join(', ')
  return detail ? `${message} — ${detail}` : message
}

export function ProgramsStep({ onCompleted }: ProgramsStepProps) {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const [createdPrograms, setCreatedPrograms] = useState<Array<CreatedProgram>>(
    [],
  )
  const [createdDesigns, setCreatedDesigns] = useState<Array<CreatedDesign>>([])

  // Program form
  const [programForm, setProgramForm] = useState({ name: '', code: '' })
  const [savingProgram, setSavingProgram] = useState(false)
  const [programError, setProgramError] = useState('')

  // Design form
  const [designForm, setDesignForm] = useState({
    name: '',
    code: '',
    programId: '',
    designType: 'Engineering' as 'Engineering' | 'Library' | 'Family',
  })
  const [savingDesign, setSavingDesign] = useState(false)
  const [designError, setDesignError] = useState('')

  // Part form
  const [partForm, setPartForm] = useState({
    name: '',
    partType: 'Manufacture' as
      'Manufacture' | 'Purchase' | 'Phantom' | 'Software',
    designId: '',
  })
  const [savingPart, setSavingPart] = useState(false)
  const [partError, setPartError] = useState('')
  const [createdParts, setCreatedParts] = useState<
    Array<{ id: string; name: string }>
  >([])

  // Catalog seed
  const [seedingCatalog, setSeedingCatalog] = useState(false)
  const [catalogResult, setCatalogResult] = useState<{
    inserted: number
    skipped: number
    prunedCategories: number
  } | null>(null)
  const [catalogError, setCatalogError] = useState('')

  // What already exists, so re-running the wizard shows it. Both lists are
  // the same cache entries the rest of the app reads.
  const { data: fetchedPrograms = [] } = useQuery(programListQuery())
  const { data: fetchedDesigns = [] } =
    useQuery(designListQuery<CreatedDesign>())

  // What the server has, plus anything created in this session that the
  // list may not have picked up yet — deduped by id.
  const byId = <T extends { id: string }>(rows: Array<T>, extra: Array<T>) => {
    const seen = new Set(rows.map((r) => r.id))
    return [...rows, ...extra.filter((r) => !seen.has(r.id))]
  }
  const programs = byId(
    fetchedPrograms as unknown as Array<CreatedProgram>,
    createdPrograms,
  )
  const designs = byId(fetchedDesigns, createdDesigns)

  const handleCreateProgram = async () => {
    if (!programForm.name.trim() || !programForm.code.trim()) {
      setProgramError('Name and code are required')
      return
    }
    setSavingProgram(true)
    setProgramError('')
    try {
      const response = await fetch('/api/v1/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: programForm.name.trim(),
          code: programForm.code.trim().toUpperCase(),
        }),
      })
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, 'Failed to create program'),
        )
      }
      const json = await response.json()
      const created = (json.data?.program ?? json.data) as CreatedProgram
      setCreatedPrograms((prev) => [...prev, created])
      setProgramForm({ name: '', code: '' })
      // Pre-select the new program for the design form.
      setDesignForm((d) => ({ ...d, programId: created.id }))
    } catch (err) {
      setProgramError((err as Error).message)
    } finally {
      setSavingProgram(false)
    }
  }

  const handleCreateDesign = async () => {
    if (!designForm.name.trim() || !designForm.code.trim()) {
      setDesignError('Name and code are required')
      return
    }
    setSavingDesign(true)
    setDesignError('')
    try {
      const response = await fetch('/api/v1/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: designForm.name.trim(),
          code: designForm.code.trim().toUpperCase(),
          programId: designForm.programId || undefined,
          designType: designForm.designType,
        }),
      })
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, 'Failed to create design'),
        )
      }
      const json = await response.json()
      const created = (json.data?.design ?? json.data) as CreatedDesign
      setCreatedDesigns((prev) => [...prev, created])
      setDesignForm({ ...designForm, name: '', code: '' })
      setPartForm((p) => ({ ...p, designId: created.id }))
    } catch (err) {
      setDesignError((err as Error).message)
    } finally {
      setSavingDesign(false)
    }
  }

  const handleCreatePart = async () => {
    if (!partForm.name.trim()) {
      setPartError('Part name is required')
      return
    }
    if (!partForm.designId) {
      setPartError('Pick a design')
      return
    }
    setSavingPart(true)
    setPartError('')
    try {
      const response = await fetch('/api/v1/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemType: 'Part',
          name: partForm.name.trim(),
          partType: partForm.partType,
          designId: partForm.designId,
        }),
      })
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, 'Failed to create part'),
        )
      }
      const json = await response.json()
      const created = (json.data?.item ?? json.data) as {
        id: string
        name: string
      }
      setCreatedParts((prev) => [...prev, created])
      setPartForm({ ...partForm, name: '' })
    } catch (err) {
      setPartError((err as Error).message)
    } finally {
      setSavingPart(false)
    }
  }

  const handleSeedCatalog = async () => {
    setSeedingCatalog(true)
    setCatalogError('')
    try {
      const response = await fetch('/api/v1/setup/seed-catalog', {
        method: 'POST',
      })
      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, 'Failed to load sample catalog'),
        )
      }
      const json = await response.json()
      setCatalogResult(
        (json.data ?? {
          inserted: 0,
          skipped: 0,
          prunedCategories: 0,
        }) as {
          inserted: number
          skipped: number
          prunedCategories: number
        },
      )
    } catch (err) {
      setCatalogError((err as Error).message)
    } finally {
      setSeedingCatalog(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-slate-700 dark:text-slate-300" />
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            {strings.steps.programs.title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {strings.steps.programs.description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('setupWizard.programs.createProgramTitle')}
            </CardTitle>
            <CardDescription>
              {t('setupWizard.programs.createProgramDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="prog-name">{tc('fields.name')}</Label>
              <Input
                id="prog-name"
                value={programForm.name}
                onChange={(e) =>
                  setProgramForm({ ...programForm, name: e.target.value })
                }
                placeholder="Robot Arm V1"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="prog-code">{tc('fields.code')}</Label>
              <Input
                id="prog-code"
                value={programForm.code}
                onChange={(e) =>
                  setProgramForm({ ...programForm, code: e.target.value })
                }
                placeholder="ROBOTARM-V1"
                className="font-mono"
              />
            </div>
            {programError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {programError}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateProgram}
              disabled={savingProgram}
              className="w-full"
            >
              {savingProgram ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {t('setupWizard.programs.createProgramButton')}
            </Button>
            {programs.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('setupWizard.programs.programsTotal', {
                  count: programs.length,
                })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('setupWizard.programs.createDesignTitle')}
            </CardTitle>
            <CardDescription>
              {t('setupWizard.programs.createDesignDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="des-name">{tc('fields.name')}</Label>
              <Input
                id="des-name"
                value={designForm.name}
                onChange={(e) =>
                  setDesignForm({ ...designForm, name: e.target.value })
                }
                placeholder="Forearm Assembly"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="des-code">{tc('fields.code')}</Label>
              <Input
                id="des-code"
                value={designForm.code}
                onChange={(e) =>
                  setDesignForm({ ...designForm, code: e.target.value })
                }
                placeholder="FOREARM"
                className="font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="des-program">
                {t('setupWizard.programs.programOptional')}
              </Label>
              <Select
                value={designForm.programId || 'none'}
                onValueChange={(v) =>
                  setDesignForm({
                    ...designForm,
                    programId: v === 'none' ? '' : v,
                  })
                }
              >
                <SelectTrigger id="des-program">
                  <SelectValue placeholder={tc('labels.noProgram')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tc('labels.noProgram')}</SelectItem>
                  {programs.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {designError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {designError}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateDesign}
              disabled={savingDesign}
              className="w-full"
            >
              {savingDesign ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {t('setupWizard.programs.createDesignButton')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('setupWizard.programs.addPartTitle')}
            </CardTitle>
            <CardDescription>
              {t('setupWizard.programs.addPartDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="part-name">{tc('fields.name')}</Label>
              <Input
                id="part-name"
                value={partForm.name}
                onChange={(e) =>
                  setPartForm({ ...partForm, name: e.target.value })
                }
                placeholder="Forearm Bracket"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="part-type">{tc('fields.type')}</Label>
              <Select
                value={partForm.partType}
                onValueChange={(v) =>
                  setPartForm({
                    ...partForm,
                    partType: v as typeof partForm.partType,
                  })
                }
              >
                <SelectTrigger id="part-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    [
                      'Manufacture',
                      'Purchase',
                      'Phantom',
                      'Software',
                    ] as const
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {t(`parts.partType.${value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="part-design">{tc('fields.design')}</Label>
              <Select
                value={partForm.designId}
                onValueChange={(v) => setPartForm({ ...partForm, designId: v })}
              >
                <SelectTrigger id="part-design">
                  <SelectValue placeholder={tc('labels.selectDesign')} />
                </SelectTrigger>
                <SelectContent>
                  {designs.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {partError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {partError}
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreatePart}
              disabled={savingPart}
              className="w-full"
            >
              {savingPart ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {t('setupWizard.programs.addPartButton')}
            </Button>
            {createdParts.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('setupWizard.programs.partsCreated', {
                  count: createdParts.length,
                })}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            <CardTitle>{t('setupWizard.programs.sampleDataTitle')}</CardTitle>
          </div>
          <CardDescription>
            {t('setupWizard.programs.sampleDataDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={handleSeedCatalog}
              disabled={seedingCatalog}
            >
              {seedingCatalog ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Package className="w-4 h-4 mr-2" />
              )}
              {t('setupWizard.programs.loadStandardCatalog')}
            </Button>
            {catalogResult && (
              <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                <CheckCircle className="w-4 h-4" />
                {t('setupWizard.programs.catalogResult', {
                  inserted: catalogResult.inserted,
                  skipped: catalogResult.skipped,
                })}
              </span>
            )}
            {catalogError && (
              <span className="text-sm text-red-600 dark:text-red-400">
                {catalogError}
              </span>
            )}
          </div>

          <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span>
              <Trans
                i18nKey="setupWizard.programs.bulkImportHint"
                ns="pages"
                components={{
                  link: (
                    <a
                      href="/api/import/parts"
                      className="text-blue-600 dark:text-blue-400 underline"
                    />
                  ),
                }}
              />
            </span>
          </div>
        </CardContent>
      </Card>

      <div>
        <Button onClick={onCompleted}>{tc('actions.continue')}</Button>
      </div>
    </div>
  )
}

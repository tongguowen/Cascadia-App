// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { EventTypeSummary, WebhookSubscription } from '@/query'
import {
  Button,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { programListQuery } from '@/query'

export interface WebhookFormValues {
  name: string
  targetUrl: string
  eventTypes: Array<string>
  /** Null for a subscription that hears every program. */
  programId: string | null
  signed: boolean
  allowInsecure: boolean
}

interface WebhookFormDialogProps {
  open: boolean
  /** Null for a create, the row for an edit. */
  subscription: WebhookSubscription | null
  eventTypes: Array<EventTypeSummary>
  busy?: boolean
  onSubmit: (values: WebhookFormValues) => void
  onClose: () => void
}

/** The select's value for "no program scope". A program id is a UUID, so it cannot collide. */
const EVERY_PROGRAM = 'every-program'

/**
 * Create or edit a subscription.
 *
 * The type filter is a checklist of the catalog rather than free text, because
 * the API refuses an unknown type — a typo there produces a subscription that
 * silently never fires, and nothing later would tell an operator why. An empty
 * selection means every type, which is stated rather than implied.
 *
 * The program scope is a choice among this instance's programs, with "every
 * program" first. It could once be set only through the API.
 */
export function WebhookFormDialog({
  open,
  subscription,
  eventTypes,
  busy = false,
  onSubmit,
  onClose,
}: WebhookFormDialogProps) {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const tf = (key: string) => t(`admin.webhooks.form.${key}`)

  // Initialised from props once, with no effect syncing them afterwards.
  //
  // An effect would have to depend on `subscription`, which is a new identity on
  // every refetch of the list — so a background refetch while the dialog is open
  // would re-run it and wipe whatever the operator had typed. The call site
  // keys this component on the row and on the open instead, so opening a row —
  // or a second create — remounts it and these initialisers run again. State
  // that is derived from props once is initial state, not synced state.
  const [name, setName] = useState(subscription?.name ?? '')
  const [targetUrl, setTargetUrl] = useState(subscription?.targetUrl ?? '')
  const [selected, setSelected] = useState<Array<string>>(
    subscription?.eventTypes ?? [],
  )
  const [programId, setProgramId] = useState<string | null>(
    subscription?.programId ?? null,
  )
  const [signed, setSigned] = useState(
    subscription ? subscription.secretPrefix !== null : true,
  )
  const [allowInsecure, setAllowInsecure] = useState(
    subscription?.targetUrl.startsWith('http://') ?? false,
  )
  const { data: programs = [] } = useQuery({
    ...programListQuery(),
    enabled: open,
  })

  const toggle = (type: string) =>
    setSelected((current) =>
      current.includes(type)
        ? current.filter((entry) => entry !== type)
        : [...current, type],
    )

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {subscription ? tf('editTitle') : tf('createTitle')}
          </DialogTitle>
          <DialogDescription>{tf('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="webhook-name">{tc('fields.name')}</Label>
            <Input
              id="webhook-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={tf('namePlaceholder')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="webhook-url">{tf('targetUrl')}</Label>
            <Input
              id="webhook-url"
              value={targetUrl}
              onChange={(event) => setTargetUrl(event.target.value)}
              placeholder={tf('urlPlaceholder')}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tf('urlHelp')}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="webhook-program">{tc('fields.program')}</Label>
            <Select
              value={programId ?? EVERY_PROGRAM}
              onValueChange={(value) =>
                setProgramId(value === EVERY_PROGRAM ? null : value)
              }
            >
              <SelectTrigger id="webhook-program">
                <SelectValue placeholder={tf('everyProgram')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EVERY_PROGRAM}>
                  {tf('everyProgram')}
                </SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.code} - {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tf('programHelp')}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{tf('eventTypes')}</Label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {tf('eventTypesHelp')}
            </p>
            <div className="max-h-56 space-y-1 overflow-y-auto rounded border border-slate-300 p-2 dark:border-slate-700">
              {eventTypes.map((type) => (
                <label
                  key={type.type}
                  className="flex items-start gap-2 rounded p-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <Checkbox
                    checked={selected.includes(type.type)}
                    onCheckedChange={() => toggle(type.type)}
                  />
                  <span>
                    <span className="font-mono text-xs">{type.type}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {type.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {!subscription && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={signed}
                onCheckedChange={(next) => setSigned(next === true)}
              />
              <span>
                {tf('signDeliveries')}
                <span className="block text-xs text-slate-500 dark:text-slate-400">
                  {tf('signDeliveriesHelp')}
                </span>
              </span>
            </label>
          )}

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={allowInsecure}
              onCheckedChange={(next) => setAllowInsecure(next === true)}
            />
            <span>
              {tf('allowInsecure')}
              <span className="block text-xs text-slate-500 dark:text-slate-400">
                {tf('allowInsecureHelp')}
              </span>
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            {tc('actions.cancel')}
          </Button>
          <Button
            disabled={busy || name.trim() === '' || targetUrl.trim() === ''}
            onClick={() =>
              onSubmit({
                name: name.trim(),
                targetUrl: targetUrl.trim(),
                eventTypes: selected,
                programId,
                signed,
                allowInsecure,
              })
            }
          >
            {subscription ? tc('actions.save') : tc('actions.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

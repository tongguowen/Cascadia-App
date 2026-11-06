// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Plus, Star, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
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
  Textarea,
} from '@/components/ui'
import { useInvalidateResources } from '@/query'
import { partAmlQuery } from '@/query/options/manufacturer-parts'
import { apiFetch } from '@/api/client'
import { useErrorHandler } from '@/hooks/useErrorHandler'

type QualificationStatus = 'proposed' | 'approved' | 'obsolete'

interface AmlSource {
  id: string
  partMasterId: string
  manufacturerPartId: string
  qualificationStatus: QualificationStatus
  isPreferred: boolean
  notes?: string | null
  manufacturerPart: {
    id: string
    manufacturer: string
    mpn: string
    description?: string | null
    datasheetUrl?: string | null
  }
}

interface PartAmlSectionProps {
  /** items.masterId of the part — the AML binds to the lineage, not a version */
  partMasterId: string
  /** Hide mutating controls (e.g., viewer roles) */
  readOnly?: boolean
}

const STATUS_BADGE_VARIANT: Record<QualificationStatus, string> = {
  approved:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  proposed:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  obsolete: 'bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}

/**
 * Approved Manufacturer List section on the part detail page.
 * Sourcing master data: which manufacturers' products satisfy this part.
 */
export function PartAmlSection({
  partMasterId,
  readOnly = false,
}: PartAmlSectionProps) {
  const invalidate = useInvalidateResources()
  const { handleError, showSuccess } = useErrorHandler()
  const [addOpen, setAddOpen] = useState(false)
  const [manufacturer, setManufacturer] = useState('')
  const [mpn, setMpn] = useState('')
  const [description, setDescription] = useState('')
  const [datasheetUrl, setDatasheetUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const { data, isLoading } = useQuery(partAmlQuery<AmlSource>(partMasterId))

  const sources = data ?? []

  const resetForm = () => {
    setManufacturer('')
    setMpn('')
    setDescription('')
    setDatasheetUrl('')
  }

  const handleAdd = async () => {
    if (!manufacturer.trim() || !mpn.trim()) {
      handleError(new Error('Manufacturer and MPN are required'))
      return
      handleError(new Error(tp('parts.detail.aml.manufacturerMpnRequired')))
      return
    }
    setSaving(true)
    try {
      await apiFetch(`/api/v1/manufacturer-parts/part/${partMasterId}`, {
        method: 'POST',
        body: JSON.stringify({
          manufacturerPart: {
            manufacturer: manufacturer.trim(),
            mpn: mpn.trim(),
            description: description.trim() || undefined,
            datasheetUrl: datasheetUrl.trim() || undefined,
          },
          // First source on a part defaults to preferred.
          isPreferred: sources.length === 0,
        }),
      })
      showSuccess(
        tp('parts.detail.aml.sourceAddedTitle'),
        tp('parts.detail.aml.sourceAddedDescription', { manufacturer, mpn }),
      )
      await invalidate('manufacturer-parts')
    } catch (error) {
      handleError(error)
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (
    mappingId: string,
    qualificationStatus: QualificationStatus,
  ) => {
    try {
      await apiFetch(`/api/v1/manufacturer-parts/mappings/${mappingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ qualificationStatus }),
      })
      await invalidate('manufacturer-parts')
    } catch (error) {
      handleError(error)
    }
  }

  const handlePreferred = async (mappingId: string) => {
    try {
      await apiFetch(`/api/v1/manufacturer-parts/mappings/${mappingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPreferred: true }),
      })
      await invalidate('manufacturer-parts')
    } catch (error) {
      handleError(error)
    }
  }

  const handleRemove = async (source: AmlSource) => {
    try {
      await apiFetch(`/api/v1/manufacturer-parts/mappings/${source.id}`, {
        method: 'DELETE',
      })
      showSuccess(
        'Source removed',
        `${source.manufacturerPart.manufacturer} ${source.manufacturerPart.mpn} removed from the AML`,
        tp('parts.detail.aml.sourceRemovedTitle'),
        tp('parts.detail.aml.sourceRemovedDescription', {
          manufacturer: source.manufacturerPart.manufacturer,
          mpn: source.manufacturerPart.mpn,
        }),
    } catch (error) {
      handleError(error)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Approved Sources</CardTitle>
          <CardDescription>
          <CardTitle>{tp('parts.detail.aml.title')}</CardTitle>
          <CardDescription>{tp('parts.detail.aml.description')}</CardDescription>
        </div>
        {!readOnly && (
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {tp('parts.detail.aml.addSource')}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading sources…</p>
        ) : sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tp('parts.detail.aml.loading')}
          </p>
        ) : sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {tp('parts.detail.aml.empty')}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>MPN</TableHead>
                <TableHead>{tc('columns.manufacturer')}</TableHead>
                <TableHead>{tc('columns.mpn')}</TableHead>
                <TableHead>{tc('columns.description')}</TableHead>
                <TableHead>{tc('columns.status')}</TableHead>
                {!readOnly && <TableHead className="w-10"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>
                    <button
                      type="button"
                      title={
                        source.isPreferred
                          ? tp('parts.detail.aml.preferredSource')
                          : tp('parts.detail.aml.makePreferred')
                      }
                      disabled={readOnly}
                      onClick={() => handlePreferred(source.id)}
                      className="disabled:cursor-default"
                    >
                      <Star
                        className={
                          source.isPreferred
                            ? 'h-4 w-4 fill-amber-400 text-amber-400'
                            : 'h-4 w-4 text-muted-foreground'
                        }
                      />
                    </button>
                  </TableCell>
                  <TableCell className="font-medium">
                    {source.manufacturerPart.manufacturer}
                  </TableCell>
                  <TableCell>
                    {source.manufacturerPart.datasheetUrl ? (
                      <a
                        href={source.manufacturerPart.datasheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        {source.manufacturerPart.mpn}
                      </a>
                    ) : (
                      source.manufacturerPart.mpn
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {source.manufacturerPart.description}
                  </TableCell>
                  <TableCell>
                    {readOnly ? (
                      <Badge
                        className={
                          STATUS_BADGE_VARIANT[source.qualificationStatus]
                        }
                      >
                        {tp(
                          `parts.detail.aml.qualification.${source.qualificationStatus}`,
                        )}
                      </Badge>
                    ) : (
                      <Select
                        value={source.qualificationStatus}
                        onValueChange={(value) =>
                          handleStatusChange(
                            source.id,
                            value as QualificationStatus,
                          )
                        }
                      >
                        <SelectTrigger className="h-8 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="proposed">
                            {tp('parts.detail.aml.qualification.proposed')}
                          </SelectItem>
                          <SelectItem value="approved">
                            {tp('parts.detail.aml.qualification.approved')}
                          </SelectItem>
                          <SelectItem value="obsolete">
                            {tp('parts.detail.aml.qualification.obsolete')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  {!readOnly && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        title={tp('parts.detail.aml.removeFromAml')}
                        onClick={() => handleRemove(source)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tp('parts.detail.aml.addDialogTitle')}</DialogTitle>
            <DialogDescription>
              {tp('parts.detail.aml.addDialogDescription')}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Manufacturer *</label>
                <Input
                <label className="text-sm font-medium">
                  {tp('parts.detail.aml.manufacturerRequired')}
                </label>
                <Input
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  placeholder="Yamaha"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  {tp('parts.detail.aml.mpnRequired')}
                </label>
                <Input
                  value={mpn}
                  onChange={(e) => setMpn(e.target.value)}
                  placeholder="350XYZ"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">
                {tc('fields.description')}
              </label>
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Datasheet URL</label>
              <Input
              <label className="text-sm font-medium">
                {tp('parts.detail.aml.datasheetUrl')}
              </label>
              <Input
                value={datasheetUrl}
                onChange={(e) => setDatasheetUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {tc('actions.cancel')}
            </Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving
                ? tc('actions.adding')
                : tp('parts.detail.aml.addSource')}
        </DialogContent>
      </Dialog>
    </Card>
  )
}

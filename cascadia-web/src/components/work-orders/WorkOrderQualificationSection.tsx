// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui'
import { workOrderQualificationQuery } from '@/query'

/**
 * The answer to "were the requirements satisfied?": every requirement in
 * scope for this work order, evidence links, and the materials nobody
 * certified.
 */
export function WorkOrderQualificationSection({
  workOrderId,
}: {
  workOrderId: string
}) {
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')
  const { data } = useQuery(workOrderQualificationQuery(workOrderId))

  const rows = data?.rows ?? []
  const gaps = data?.gaps ?? []

  return (
    <div className="space-y-4">
      {gaps.length > 0 && (
        <Card className="border-amber-300 dark:border-amber-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
              {tp('workOrders.detail.qualificationUncertifiedTitle')}
            </CardTitle>
            <CardDescription>
              {tp('workOrders.detail.qualificationUncertifiedDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {gaps.map((gap) => (
                <Link
                  key={gap.physicalPartItemId}
                  to="/physical-parts/$id"
                  params={{ id: gap.physicalPartItemId }}
                >
                  <Badge
                    variant="outline"
                    className="border-amber-400 font-mono dark:border-amber-600"
                  >
                    {gap.partItemNumber}{' '}
                    {gap.serialNumber
                      ? `SN ${gap.serialNumber}`
                      : `Lot ${gap.lotNumber}`}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            {tp('workOrders.detail.tabs.qualification')}
          </CardTitle>
          <CardDescription>
            {tp('workOrders.detail.qualificationRollupDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No requirements in scope — link requirements to the built part or
              material parts to see the rollup.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requirement</TableHead>
                  <TableHead>Via</TableHead>
                  <TableHead>{tc('columns.status')}</TableHead>
                  <TableHead>Evidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.requirementMasterId}>
                    <TableCell>
                      <span className="font-medium">
                        {row.requirementNumber}
                      </span>
                      {row.requirementName && (
                        <span className="ml-2 text-muted-foreground">
                          {row.requirementName}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.viaPartNumber}
                    </TableCell>
                    <TableCell>
                      {row.satisfied ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          Satisfied
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                          No evidence
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {row.evidence.map((ev) => (
                          <Link
                            key={ev.physicalPartItemId}
                            to="/physical-parts/$id"
                            params={{ id: ev.physicalPartItemId }}
                            title={ev.note ?? undefined}
                          >
                            <Badge variant="outline" className="font-mono">
                              {ev.serialNumber
                                ? `SN ${ev.serialNumber}`
                                : `Lot ${ev.lotNumber}`}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

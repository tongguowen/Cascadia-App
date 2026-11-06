// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useTranslation } from 'react-i18next'
import type { Part } from '@cascadia/commons/items/types/part'
import {
  AttributesEditor,
  formatAttributeValue,
} from '@/components/items/AttributesEditor'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  ViewEditStatic,
} from '@/components/ui'

/**
 * The right-hand column of a part's Details tab: custom attributes and the
 * row's own metadata. Vault files live in the main column (between Overview
 * and Manufacturing) so the list has the same width as Overview.
 *
 * These cards share only their position. They are here rather than in
 * PartDetail because none of them participates in the page's edit/save cycle
 * beyond the two props below — the attributes editor writes through, and the
 * rest is display.
 */
export function PartDetailSidebar({
  part,
  isCreateMode,
  isEditing,
  isSubmitting,
  attributes,
  onAttributesChange,
}: {
  /** The version-resolved part being displayed. */
  part: Part
  isCreateMode: boolean
  isEditing: boolean
  isSubmitting: boolean
  attributes: Record<string, unknown>
  onAttributesChange: (attributes: Record<string, unknown>) => void
}) {
  const { t: tc } = useTranslation('common')
  const { t: tp } = useTranslation('pages')

  return (
    <div className="space-y-6">
      {isEditing ? (
        <Card>
          <AttributesEditor
            value={attributes}
            onChange={onAttributesChange}
            disabled={isSubmitting}
            className="border-0 rounded-none"
          />
        </Card>
      ) : (
        <Card>
          <Collapsible
            defaultOpen={Object.keys(part.attributes ?? {}).length > 0}
          >
            <CardHeader className="pb-3">
              <CollapsibleTrigger className="hover:opacity-70">
                <CardTitle>{tc('sections.customAttributes')}</CardTitle>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                {Object.keys(part.attributes ?? {}).length > 0 ? (
                  <dl className="space-y-3">
                    {Object.entries(part.attributes ?? {}).map(
                      ([key, value]) => (
                        <div key={key} className="space-y-1">
                          <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">
                            {key}
                          </dt>
                          <dd className="text-sm text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-md">
                            {formatAttributeValue(value) || '-'}
                          </dd>
                        </div>
                      ),
                    )}
                  </dl>
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {tc('messages.noCustomAttributes')}
                  </p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      <Collapsible defaultOpen={false}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger className="hover:opacity-70">
              <CardTitle>{tc('sections.metadata')}</CardTitle>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-3">
              <ViewEditStatic
                label={tc('columns.created')}
                value={
                  part.createdAt
                    ? new Date(part.createdAt).toLocaleDateString()
                    : '-'
                }
              />
              <ViewEditStatic
                label={tc('fields.lastModified')}
                value={
                  part.modifiedAt
                    ? new Date(part.modifiedAt).toLocaleDateString()
                    : '-'
                }
              />
              {!isCreateMode && (
                <>
                  <ViewEditStatic
                    label={tc('fields.masterId')}
                    value={part.masterId}
                    mono
                  />
                  <ViewEditStatic
                    label={tp('parts.detail.partId')}
                    value={part.id}
                    mono
                  />
                </>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  )
}

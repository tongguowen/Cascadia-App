// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { useForm } from '@tanstack/react-form'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import {
  filterOperators,
  formatTypes,
  reportSchema,
} from '@cascadia/commons/reports/types'
import type {
  FieldDefinition,
  ReportColumn,
  ReportCreateInput,
  ReportFilter,
  ReportSort,
} from '@cascadia/commons/reports/types'
import {
  Button,
  Card,
  FormField,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui'

interface ReportBuilderProps {
  initialData?: Partial<ReportCreateInput>
  onSubmit: (data: ReportCreateInput) => void | Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

const REPORT_ITEM_TYPES = [
  'Part',
  'Document',
  'ChangeOrder',
  'Requirement',
  'Task',
  'TestPlan',
  'TestCase',
  'Issue',
] as const

const ITEM_TYPE_I18N_KEY: Record<string, string> = {
  Part: 'Part',
  Document: 'Document',
  ChangeOrder: 'Change Order',
  Requirement: 'Requirement',
  Task: 'Task',
  TestPlan: 'Test Plan',
  TestCase: 'Test Case',
  Issue: 'Issue',
}

function resolveReportFieldLabel(
  path: string,
  tc: TFunction<'common'>,
  tp: TFunction<'pages'>,
): string {
  if (path === 'createdAt') return tp('reports.form.createdAt')
  if (path === 'modifiedAt') return tp('reports.form.modifiedAt')

  const leaf = path.includes('.') ? (path.split('.').pop() ?? path) : path
  const commonKeys: Record<string, string> = {
    itemNumber: 'fields.itemNumber',
    revision: 'fields.revision',
    name: 'fields.name',
    state: 'labels.state',
    description: 'fields.description',
    partType: 'fields.type',
    type: 'fields.type',
    material: 'fields.material',
    weight: 'fields.weight',
    cost: 'fields.cost',
    leadTimeDays: 'fields.leadTimeDays',
    fileName: 'fields.fileName',
    fileSize: 'fields.fileSize',
    mimeType: 'fields.mimeType',
    changeType: 'fields.changeType',
    priority: 'fields.priority',
    reasonForChange: 'fields.reasonForChange',
    riskLevel: 'fields.riskLevel',
    status: 'fields.status',
    category: 'fields.category',
    dueDate: 'fields.dueDate',
    estimatedHours: 'fields.estimatedHours',
    actualHours: 'fields.actualHours',
  }
  const key = commonKeys[leaf]
  return key ? tc(key) : leaf
}

type FieldSpec = Omit<FieldDefinition, 'label'>

// Get available fields based on item type
function getAvailableFields(
  itemType: string,
  resolveLabel: (path: string) => string,
): Array<FieldDefinition> {
  const baseFields: Array<FieldSpec> = [
    { path: 'itemNumber', type: 'string' },
    { path: 'revision', type: 'string' },
    { path: 'name', type: 'string' },
    { path: 'state', type: 'string' },
    { path: 'createdAt', type: 'datetime' },
    { path: 'modifiedAt', type: 'datetime' },
  ]

  const typeSpecificFields: Record<string, Array<FieldSpec>> = {
    Part: [
      { path: 'parts.description', type: 'string', table: 'parts' },
      { path: 'parts.partType', type: 'string', table: 'parts' },
      { path: 'parts.material', type: 'string', table: 'parts' },
      { path: 'parts.weight', type: 'number', table: 'parts' },
      { path: 'parts.cost', type: 'number', table: 'parts' },
      { path: 'parts.leadTimeDays', type: 'number', table: 'parts' },
    ],
    Document: [
      { path: 'documents.description', type: 'string', table: 'documents' },
      { path: 'documents.fileName', type: 'string', table: 'documents' },
      { path: 'documents.fileSize', type: 'number', table: 'documents' },
      { path: 'documents.mimeType', type: 'string', table: 'documents' },
    ],
    ChangeOrder: [
      {
        path: 'change_orders.changeType',
        type: 'string',
        table: 'change_orders',
      },
      {
        path: 'change_orders.priority',
        type: 'string',
        table: 'change_orders',
      },
      {
        path: 'change_orders.reasonForChange',
        type: 'string',
        table: 'change_orders',
      },
      {
        path: 'change_orders.riskLevel',
        type: 'string',
        table: 'change_orders',
      },
    ],
    Requirement: [
      {
        path: 'requirements.description',
        type: 'string',
        table: 'requirements',
      },
      { path: 'requirements.type', type: 'string', table: 'requirements' },
      {
        path: 'requirements.priority',
        type: 'string',
        table: 'requirements',
      },
      { path: 'requirements.status', type: 'string', table: 'requirements' },
      {
        path: 'requirements.category',
        type: 'string',
        table: 'requirements',
      },
    ],
    Task: [
      { path: 'tasks.description', type: 'string', table: 'tasks' },
      { path: 'tasks.priority', type: 'string', table: 'tasks' },
      { path: 'tasks.dueDate', type: 'date', table: 'tasks' },
      { path: 'tasks.estimatedHours', type: 'number', table: 'tasks' },
      { path: 'tasks.actualHours', type: 'number', table: 'tasks' },
    ],
  }

  return [...baseFields, ...(typeSpecificFields[itemType] ?? [])].map(
    (field) => ({
      ...field,
      label: resolveLabel(field.path),
    }),
  )
}

// Use the imported types from reports/types.ts, with local simplified versions for form manipulation
type LocalReportColumn = {
  fieldPath: string
  label: string
  displayOrder: number
  isVisible: boolean
  formatType?: string
}

type LocalReportFilter = {
  fieldPath: string
  operator: string
  value?: string
  value2?: string
  displayOrder?: number
}

type LocalReportSort = {
  fieldPath: string
  direction: 'asc' | 'desc'
  priority: number
}

export function ReportBuilder({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}: ReportBuilderProps) {
  const { t } = useTranslation('pages')
  const { t: tc } = useTranslation('common')
  const { t: ti } = useTranslation('itemTypes')

  const fieldLabel = (path: string) =>
    resolveReportFieldLabel(path, tc, t)

  const [selectedItemType, setSelectedItemType] = useState(
    initialData?.itemType || 'Part',
  )

  // Typed locals pin the form's field generics to the report artifact shapes.
  const defaultColumns: Array<ReportColumn> = initialData?.columns ?? [
    {
      fieldPath: 'itemNumber',
      label: fieldLabel('itemNumber'),
      displayOrder: 0,
      isVisible: true,
    },
  ]
  const defaultFilters: Array<ReportFilter> = initialData?.filters ?? []
  const defaultSorts: Array<ReportSort> = initialData?.sorts ?? []

  const form = useForm({
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      itemType: initialData?.itemType ?? 'Part',
      isPublic: initialData?.isPublic ?? false,
      columns: defaultColumns,
      filters: defaultFilters,
      sorts: defaultSorts,
    },
    onSubmit: async ({ value }) => {
      // Validate with Zod and then submit
      const result = reportSchema.safeParse(value)
      if (result.success) {
        await onSubmit(result.data)
      }
    },
  })

  const availableFields = getAvailableFields(selectedItemType, fieldLabel)

  // Column management
  const addColumn = () => {
    const columns = form.getFieldValue('columns')
    const newColumn: LocalReportColumn = {
      fieldPath: 'itemNumber',
      label: fieldLabel('itemNumber'),
      displayOrder: columns.length,
      isVisible: true,
    }
    form.setFieldValue('columns', [
      ...columns,
      newColumn,
    ] as ReportCreateInput['columns'])
  }

  const removeColumn = (index: number) => {
    const columns = form.getFieldValue('columns')
    const updated = columns
      .filter((_, i) => i !== index)
      .map((col, i) => ({ ...col, displayOrder: i }))
    form.setFieldValue('columns', updated)
  }

  const moveColumn = (index: number, direction: 'up' | 'down') => {
    const columns = form.getFieldValue('columns')
    const newColumns = [...columns]
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= columns.length) return

    const current = newColumns[index]
    const target = newColumns[newIndex]
    if (!current || !target) return

    newColumns[index] = target
    newColumns[newIndex] = current

    form.setFieldValue(
      'columns',
      newColumns.map((col, i) => ({
        ...col,
        displayOrder: i,
      })),
    )
  }

  const updateColumn = (index: number, field: string, value: string) => {
    const columns = form.getFieldValue('columns')
    const updated = [...columns]
    const existing = updated[index]
    if (!existing) return
    if (field === 'fieldPath') {
      const fieldDef = availableFields.find((f) => f.path === value)
      updated[index] = {
        ...existing,
        fieldPath: value,
        label: fieldDef?.label || value,
      }
    } else {
      updated[index] = { ...existing, [field]: value }
    }
    form.setFieldValue('columns', updated)
  }

  // Filter management
  const addFilter = () => {
    const filters = form.getFieldValue('filters')
    const newFilter: LocalReportFilter = {
      fieldPath: 'itemNumber',
      operator: 'eq',
      value: '',
      displayOrder: filters.length,
    }
    form.setFieldValue('filters', [
      ...filters,
      newFilter,
    ] as ReportCreateInput['filters'])
  }

  const removeFilter = (index: number) => {
    const filters = form.getFieldValue('filters')
    const updated = filters
      .filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, displayOrder: i }))
    form.setFieldValue('filters', updated)
  }

  const updateFilter = (index: number, field: string, value: string) => {
    const filters = form.getFieldValue('filters')
    const updated = [...filters]
    const existing = updated[index]
    if (!existing) return
    updated[index] = { ...existing, [field]: value }
    form.setFieldValue('filters', updated)
  }

  // Sort management
  const addSort = () => {
    const sorts = form.getFieldValue('sorts')
    const newSort: LocalReportSort = {
      fieldPath: 'itemNumber',
      direction: 'asc',
      priority: sorts.length,
    }
    form.setFieldValue('sorts', [
      ...sorts,
      newSort,
    ] as ReportCreateInput['sorts'])
  }

  const removeSort = (index: number) => {
    const sorts = form.getFieldValue('sorts')
    const updated = sorts
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, priority: i }))
    form.setFieldValue('sorts', updated)
  }

  const updateSort = (index: number, field: string, value: string) => {
    const sorts = form.getFieldValue('sorts')
    const updated = [...sorts]
    const existing = updated[index]
    if (!existing) return
    updated[index] = { ...existing, [field]: value }
    form.setFieldValue('sorts', updated)
  }

  const handleItemTypeChange = (value: string) => {
    setSelectedItemType(value)
    form.setFieldValue('itemType', value)
    form.setFieldValue('columns', [
      {
        fieldPath: 'itemNumber',
        label: fieldLabel('itemNumber'),
        displayOrder: 0,
        isVisible: true,
      },
    ] as ReportCreateInput['columns'])
    form.setFieldValue('filters', [] as ReportCreateInput['filters'])
    form.setFieldValue('sorts', [] as ReportCreateInput['sorts'])
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
      className="space-y-8"
    >
      {/* Report Information Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          {t('reports.form.reportInformation')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <form.Field name="name">
            {(field) => (
              <FormField
                label={t('reports.form.reportName')}
                required
                error={field.state.meta.errors[0]}
              >
                <Input
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder={t('reports.form.reportNamePlaceholder')}
                  error={field.state.meta.errors.length > 0}
                />
              </FormField>
            )}
          </form.Field>

          <form.Field name="itemType">
            {(field) => (
              <FormField
                label={t('reports.form.itemType')}
                required
                error={field.state.meta.errors[0]}
              >
                <Select
                  value={selectedItemType}
                  onValueChange={handleItemTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('reports.form.selectItemType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_ITEM_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>
                        {ti(ITEM_TYPE_I18N_KEY[value] ?? value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}
          </form.Field>

          <form.Field name="description">
            {(field) => (
              <FormField
                label={tc('fields.description')}
                error={field.state.meta.errors[0]}
                className="md:col-span-2"
              >
                <Textarea
                  name={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder={t('reports.form.descriptionPlaceholder')}
                  rows={3}
                />
              </FormField>
            )}
          </form.Field>

          <form.Field name="isPublic">
            {(field) => (
              <FormField label={t('reports.form.visibility')}>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={field.state.value}
                    onChange={(e) => field.handleChange(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-700"
                  />
                  <span className="text-sm">{t('reports.form.makePublic')}</span>
                </label>
              </FormField>
            )}
          </form.Field>
        </div>
      </Card>

      {/* Columns Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('reports.form.columns')}</h3>
          <Button type="button" variant="outline" size="sm" onClick={addColumn}>
            <Plus className="w-4 h-4 mr-1" />
            {t('reports.form.addColumn')}
          </Button>
        </div>

        <form.Field name="columns">
          {(field) => (
            <>
              {field.state.meta.errors.length > 0 && (
                <p className="text-sm text-red-500 mb-4">
                  {String(field.state.meta.errors[0])}
                </p>
              )}

              <div className="space-y-3">
                {field.state.value.map(
                  (column: ReportColumn, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex flex-col gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveColumn(index, 'up')}
                          disabled={index === 0}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => moveColumn(index, 'down')}
                          disabled={index === field.state.value.length - 1}
                          className="h-6 w-6 p-0"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>

                      <Select
                        value={column.fieldPath}
                        onValueChange={(value) =>
                          updateColumn(index, 'fieldPath', value)
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue
                            placeholder={t('reports.form.selectField')}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map((f) => (
                            <SelectItem key={f.path} value={f.path}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Input
                        value={column.label}
                        onChange={(e) =>
                          updateColumn(index, 'label', e.target.value)
                        }
                        placeholder={t('reports.form.columnLabel')}
                        className="flex-1"
                      />

                      <Select
                        value={column.formatType || 'text'}
                        onValueChange={(value) =>
                          updateColumn(index, 'formatType', value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder={t('reports.form.format')} />
                        </SelectTrigger>
                        <SelectContent>
                          {formatTypes.map((format) => (
                            <SelectItem key={format} value={format}>
                              {t(`reports.form.formats.${format}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeColumn(index)}
                        disabled={field.state.value.length === 1}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ),
                )}
              </div>
            </>
          )}
        </form.Field>
      </Card>

      {/* Filters Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t('reports.form.filtersOptional')}
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={addFilter}>
            <Plus className="w-4 h-4 mr-1" />
            {t('reports.form.addFilter')}
          </Button>
        </div>

        <form.Field name="filters">
          {(field) => (
            <>
              {field.state.value.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t('reports.form.noFilters')}
                </p>
              ) : (
                <div className="space-y-3">
                  {field.state.value.map(
                    (filter: ReportFilter, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <Select
                          value={filter.fieldPath}
                          onValueChange={(value) =>
                            updateFilter(index, 'fieldPath', value)
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue
                            placeholder={t('reports.form.selectField')}
                          />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFields.map((f) => (
                              <SelectItem key={f.path} value={f.path}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Select
                          value={filter.operator}
                          onValueChange={(value) =>
                            updateFilter(index, 'operator', value)
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue
                              placeholder={t('reports.form.operator')}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {filterOperators.map((op) => (
                              <SelectItem key={op} value={op}>
                                {t(`reports.form.operators.${op}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {!['is_null', 'is_not_null'].includes(
                          filter.operator,
                        ) && (
                          <Input
                            value={filter.value || ''}
                            onChange={(e) =>
                              updateFilter(index, 'value', e.target.value)
                            }
                            placeholder={t('reports.form.value')}
                            className="flex-1"
                          />
                        )}

                        {filter.operator === 'between' && (
                          <Input
                            value={filter.value2 || ''}
                            onChange={(e) =>
                              updateFilter(index, 'value2', e.target.value)
                            }
                            placeholder={t('reports.form.endValue')}
                            className="flex-1"
                          />
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFilter(index)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ),
                  )}
                </div>
              )}
            </>
          )}
        </form.Field>
      </Card>

      {/* Sorting Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {t('reports.form.sortingOptional')}
          </h3>
          <Button type="button" variant="outline" size="sm" onClick={addSort}>
            <Plus className="w-4 h-4 mr-1" />
            {t('reports.form.addSort')}
          </Button>
        </div>

        <form.Field name="sorts">
          {(field) => (
            <>
              {field.state.value.length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t('reports.form.noSorting')}
                </p>
              ) : (
                <div className="space-y-3">
                  {field.state.value.map((sort: ReportSort, index: number) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-500 w-8">
                        #{index + 1}
                      </span>

                      <Select
                        value={sort.fieldPath}
                        onValueChange={(value) =>
                          updateSort(index, 'fieldPath', value)
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue
                            placeholder={t('reports.form.selectField')}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map((f) => (
                            <SelectItem key={f.path} value={f.path}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={sort.direction}
                        onValueChange={(value) =>
                          updateSort(index, 'direction', value)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue
                            placeholder={t('reports.form.sortDirection')}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">
                            {t('reports.form.sortAsc')}
                          </SelectItem>
                          <SelectItem value="desc">
                            {t('reports.form.sortDesc')}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSort(index)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </form.Field>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {tc('actions.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? tc('actions.saving')
            : initialData?.name
              ? t('reports.form.updateReport')
              : t('reports.form.createReport')}
        </Button>
      </div>
    </form>
  )
}

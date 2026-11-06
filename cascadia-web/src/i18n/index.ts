// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (c) 2026 Cascadia PLM LLC
// Watchlink / Cascadia zh-CN i18n bootstrap (TASK-20261102-CASCADIA-I18N-ZH)

import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import enCommon from './locales/en/common.json'
import enLogin from './locales/en/login.json'
import enNav from './locales/en/nav.json'
import enItemTypes from './locales/en/itemTypes.json'
import enStates from './locales/en/states.json'
import enPages from './locales/en/pages.json'
import enErrors from './locales/en/errors.json'
import enTour from './locales/en/tour.json'
import enAi from './locales/en/ai.json'
import zhCommon from './locales/zh-CN/common.json'
import zhLogin from './locales/zh-CN/login.json'
import zhNav from './locales/zh-CN/nav.json'
import zhItemTypes from './locales/zh-CN/itemTypes.json'
import zhStates from './locales/zh-CN/states.json'
import zhPages from './locales/zh-CN/pages.json'
import zhErrors from './locales/zh-CN/errors.json'
import zhTour from './locales/zh-CN/tour.json'
import zhAi from './locales/zh-CN/ai.json'

export const I18N_STORAGE_KEY = 'cascadia-locale'
export type AppLocale = 'zh-CN' | 'en'

export function readStoredLocale(): AppLocale {
  if (typeof window === 'undefined') return 'zh-CN'
  const raw = window.localStorage.getItem(I18N_STORAGE_KEY)
  if (raw === 'en' || raw === 'zh-CN') return raw
  return 'zh-CN'
}

export function persistLocale(locale: AppLocale): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(I18N_STORAGE_KEY, locale)
}

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      common: enCommon,
      login: enLogin,
      nav: enNav,
      itemTypes: enItemTypes,
      states: enStates,
      pages: enPages,
      errors: enErrors,
      tour: enTour,
      ai: enAi,
    },
    'zh-CN': {
      common: zhCommon,
      login: zhLogin,
      nav: zhNav,
      itemTypes: zhItemTypes,
      states: zhStates,
      pages: zhPages,
      errors: zhErrors,
      tour: zhTour,
      ai: zhAi,
    },
  },
  lng: readStoredLocale(),
  fallbackLng: 'en',
  defaultNS: 'common',
  ns: [
    'common',
    'login',
    'nav',
    'itemTypes',
    'states',
    'pages',
    'errors',
    'tour',
    'ai',
  ],
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
})

export async function setAppLocale(locale: AppLocale): Promise<void> {
  persistLocale(locale)
  await i18n.changeLanguage(locale)
}

export function translateItemTypeLabel(label: string): string {
  if (!label) return label
  const translated = i18n.t(label, { ns: 'itemTypes', defaultValue: '' })
  return translated || label
}

export function translateStateName(name: string): string {
  if (!name) return name
  const translated = i18n.t(name, { ns: 'states', defaultValue: '' })
  return translated || name
}

/** Physical-part inventory states (not lifecycle-configured). */
export function translatePhysicalPartState(state: string): string {
  return translateStateName(state)
}

export function translateErrorCode(code: string, fallback?: string): string {
  if (!code) return fallback || ''
  const translated = i18n.t(`codes.${code}`, { ns: 'errors', defaultValue: '' })
  return translated || fallback || code
}

export default i18n

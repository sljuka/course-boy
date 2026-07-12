import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from '@/locales/en.json'
import sr from '@/locales/sr.json'
import srCyrl from '@/locales/sr-Cyrl.json'

const resources = {
  en: {
    translation: en,
  },
  sr: {
    translation: sr,
  },
  'sr-Cyrl': {
    translation: srCyrl,
  },
} as const

export const locales = ['en', 'sr', 'sr-Cyrl'] as const
export type Locale = (typeof locales)[number]

export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return 'en'
  }

  const preferredLocales = navigator.languages?.length
    ? navigator.languages
    : [navigator.language]

  for (const locale of preferredLocales) {
    const normalizedLocale = locale.toLowerCase()

    if (
      normalizedLocale.startsWith('sr-cyrl') ||
      normalizedLocale.startsWith('sr_rs@cyrillic')
    ) {
      return 'sr-Cyrl'
    }

    if (normalizedLocale.startsWith('sr')) {
      return 'sr'
    }

    if (normalizedLocale.startsWith('en')) {
      return 'en'
    }
  }

  return 'en'
}

void i18n.use(initReactI18next).init({
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  lng: 'en',
  resources,
  supportedLngs: locales,
})

export { i18n }

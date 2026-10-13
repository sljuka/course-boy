// The few texts main shows itself (the menu bar icon's, SLJ-129), from the
// app's own locale files, so they're translated and checked like the rest
// (`npm run check:i18n`). `{{name}}` is filled from `values`.

import en from '../src/locales/en.json'
import sr from '../src/locales/sr.json'
import srCyrl from '../src/locales/sr-Cyrl.json'
import type { Locale } from '../src/lib/i18n'

const locales: Record<Locale, typeof en> = { en, sr, 'sr-Cyrl': srCyrl }

export function backgroundText(
  locale: Locale,
  key: keyof (typeof en)['background'],
  values: Record<string, string | number> = {},
): string {
  const template = locales[locale]?.background?.[key] ?? en.background[key]
  return template.replace(/\{\{(\w+)\}\}/g, (_match, name: string) => String(values[name] ?? ''))
}

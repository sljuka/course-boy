#!/usr/bin/env node
// Verifies that every locale in src/locales has exactly the same key set as
// en.json, which is the source of truth. Untranslated or orphaned keys are the
// easiest thing to introduce and the hardest to notice by clicking around.
//
// Usage: node scripts/check-i18n.mjs

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const localesDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'locales',
)

const SOURCE_LOCALE = 'en'

function flattenKeys(value, prefix = '') {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix]
  }

  return Object.entries(value).flatMap(([key, nested]) =>
    flattenKeys(nested, prefix ? `${prefix}.${key}` : key),
  )
}

function readLocale(locale) {
  const file = path.join(localesDir, `${locale}.json`)
  return JSON.parse(readFileSync(file, 'utf8'))
}

function listLocales() {
  return readdirSync(localesDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.basename(file, '.json'))
}

const locales = listLocales()

if (!locales.includes(SOURCE_LOCALE)) {
  console.error(`✖ missing source locale src/locales/${SOURCE_LOCALE}.json`)
  process.exit(1)
}

const sourceKeys = new Set(flattenKeys(readLocale(SOURCE_LOCALE)))
let failed = false

for (const locale of locales) {
  if (locale === SOURCE_LOCALE) continue

  const keys = new Set(flattenKeys(readLocale(locale)))
  const missing = [...sourceKeys].filter((key) => !keys.has(key)).sort()
  const extra = [...keys].filter((key) => !sourceKeys.has(key)).sort()

  if (missing.length === 0 && extra.length === 0) {
    console.log(`✔ ${locale}: ${keys.size} keys, in sync with ${SOURCE_LOCALE}`)
    continue
  }

  failed = true
  console.error(`✖ ${locale}:`)

  for (const key of missing) {
    console.error(`    missing (present in ${SOURCE_LOCALE}): ${key}`)
  }

  for (const key of extra) {
    console.error(`    orphaned (absent in ${SOURCE_LOCALE}): ${key}`)
  }
}

if (failed) {
  console.error(
    `\n${SOURCE_LOCALE}.json is the source of truth: add missing keys, delete orphaned ones.`,
  )
  process.exit(1)
}

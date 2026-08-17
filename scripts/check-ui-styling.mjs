#!/usr/bin/env node
// Enforces the "visual styling lives in src/components/ui" convention from
// docs/working-conventions.md as a RATCHET, not an absolute rule.
//
// A large part of the codebase predates the convention, so this does not demand
// zero violations. It records the current count as a baseline and fails when the
// count grows. Existing violations are fair game to clean up (the baseline drops
// with --update-baseline); new ones are not.
//
// Layout-only utilities (flex, grid, gap, w-, p-, m-, text-center, ...) are
// intentionally NOT flagged — those are allowed outside ui/.
//
// Usage:
//   node scripts/check-ui-styling.mjs                   # verify against baseline
//   node scripts/check-ui-styling.mjs --update-baseline # re-record (must not raise it)

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = path.join(root, 'src')
const baselineFile = path.join(root, 'scripts', 'ui-styling-baseline.json')

// Directories that own visual styling and are therefore exempt.
const EXEMPT = [path.join('src', 'components', 'ui')]

// Utility prefixes that are visual rather than layout. Kept deliberately narrow:
// a noisy check gets ignored, and this only needs to catch the obvious cases.
const VISUAL_PATTERNS = [
  /^bg-/,
  /^border$/,
  /^border-(?!collapse|separate|spacing)/,
  /^shadow(-|$)/,
  /^rounded(-|$)/,
  /^ring(-|$)/,
  /^divide-/,
  /^text-(xs|sm|base|lg|xl|\d+xl)$/,
  /^text-(muted|primary|secondary|destructive|accent|card|popover|foreground|background|white|black|current|transparent)/,
  /^font-(thin|light|normal|medium|semibold|bold|extrabold|black|mono|serif|sans)$/,
]

function isVisual(token) {
  // Strip responsive/state modifiers: hover:, md:, dark:, data-[state=open]:
  const base = token.split(':').pop()
  const bare = base.startsWith('!') ? base.slice(1) : base
  return VISUAL_PATTERNS.some((pattern) => pattern.test(bare))
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

// Heuristic: collect every quoted string in the file and tokenise it on
// whitespace. Class names in this codebase live in className="...", cn(...) and
// cva(...), all of which are quoted strings; user-facing copy lives in
// src/locales/*.json rather than in TSX, so false positives are rare.
const STRING_LITERAL = /"([^"\n]*)"|'([^'\n]*)'|`([^`\n]*)`/g

function countViolations(file) {
  const source = readFileSync(file, 'utf8')
  const found = []

  for (const match of source.matchAll(STRING_LITERAL)) {
    const literal = match[1] ?? match[2] ?? match[3] ?? ''
    for (const token of literal.split(/\s+/)) {
      if (token && isVisual(token)) found.push(token)
    }
  }

  return found
}

const files = walk(srcDir)
  .filter((file) => file.endsWith('.tsx') || file.endsWith('.ts'))
  .filter((file) => {
    const relative = path.relative(root, file)
    return !EXEMPT.some((exempt) => relative.startsWith(exempt))
  })

const perFile = new Map()
let total = 0

for (const file of files) {
  const violations = countViolations(file)
  if (violations.length === 0) continue
  perFile.set(path.relative(root, file), violations.length)
  total += violations.length
}

const updating = process.argv.includes('--update-baseline')

let baseline = null
try {
  baseline = JSON.parse(readFileSync(baselineFile, 'utf8'))
} catch {
  baseline = null
}

const ranked = [...perFile.entries()].sort((a, b) => b[1] - a[1])

if (updating || baseline === null) {
  if (baseline !== null && total > baseline.total) {
    console.error(
      `✖ refusing to raise the baseline: ${baseline.total} → ${total}.\n` +
        `  Move the new visual styling into src/components/ui instead.`,
    )
    process.exit(1)
  }

  writeFileSync(
    baselineFile,
    JSON.stringify({ total, files: Object.fromEntries(ranked) }, null, 2) + '\n',
  )
  console.log(
    baseline === null
      ? `✔ baseline recorded: ${total} visual utilities outside src/components/ui`
      : `✔ baseline lowered: ${baseline.total} → ${total}`,
  )
  process.exit(0)
}

if (total > baseline.total) {
  console.error(
    `✖ visual styling outside src/components/ui grew: ${baseline.total} → ${total}\n`,
  )
  const worst = ranked
    .filter(([file, count]) => (baseline.files[file] ?? 0) < count)
    .slice(0, 10)

  for (const [file, count] of worst) {
    console.error(`    ${file}: ${baseline.files[file] ?? 0} → ${count}`)
  }

  console.error(
    `\nVisual styling (backgrounds, borders, shadows, radius, typography) belongs\n` +
      `in src/components/ui — use cva variants rather than per-page class stacks.\n` +
      `See docs/working-conventions.md.`,
  )
  process.exit(1)
}

if (total < baseline.total) {
  console.log(
    `✔ ${total} visual utilities outside src/components/ui ` +
      `(down from ${baseline.total} — run with --update-baseline to lock it in)`,
  )
  process.exit(0)
}

console.log(`✔ ${total} visual utilities outside src/components/ui (at baseline)`)

// What a window showed when a test failed: a screenshot, its route, the
// visible text and the console errors since launch, saved under
// /tmp/matko-e2e-failures/<file>/ and printed with the failure. A test that
// fails only now and then (under load, say) can't be rerun until it fails
// again, so the state at the moment it failed is what explains it.
//
// Separate from launch.mjs because it registers a vitest hook, and launch.mjs
// is also loaded by the run-desktop REPL, outside vitest.

import { afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

export const FAILURES_DIR = '/tmp/matko-e2e-failures'

const safeName = (text) => text.replace(/[^a-zA-Z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)

/**
 * Call once at the top of an e2e file. `harnesses` returns the running apps
 * by name (`{ app: harness }`, or the sharing suite's `apps`); each one still
 * open when a test fails is recorded.
 */
export function recordFailures(file, harnesses) {
  const dir = path.join(FAILURES_DIR, safeName(path.basename(file, '.e2e.mjs')))
  afterEach(async ({ task }) => {
    if (task.result?.state !== 'fail') return
    fs.mkdirSync(dir, { recursive: true })
    for (const [name, harness] of Object.entries(harnesses())) {
      if (!harness?.page || harness.page.isClosed()) continue
      const base = path.join(dir, `${safeName(task.name)}-${name}`)
      try {
        await harness.page.screenshot({ path: `${base}.png`, timeout: 5_000 })
        const { hash, text } = await harness.page.evaluate(() => ({
          hash: location.hash,
          text: document.body.innerText,
        }))
        const errors = harness.errors?.length ? harness.errors.join('\n') : '(none)'
        fs.writeFileSync(`${base}.txt`, `Route: ${hash}\n\nConsole errors:\n${errors}\n\nVisible text:\n${text}\n`)
        console.log(`Recorded ${name} at the failure: ${base}.png / .txt`)
      } catch (error) {
        console.log(`Couldn't record ${name} at the failure: ${error.message}`)
      }
    }
  })
}

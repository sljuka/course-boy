// Shared harness for driving the real Electron app.
//
// Used by both the CI spec (e2e/*.e2e.mjs) and the interactive REPL at
// .claude/skills/run-desktop/driver.mjs, so launch behaviour and DOM interaction
// semantics stay identical between "I am debugging" and "CI is asserting".
//
// Plain .mjs on purpose: it stays out of `tsconfig.json#include` (["src", "electron"])
// so the test harness never affects `npm run typecheck`.

import { _electron as electron } from 'playwright-core'
import path from 'node:path'
import fs from 'node:fs'

export const APP_DIR = path.resolve(import.meta.dirname, '..')

/** The same element set everywhere, so indices printed by one helper work in another. */
export const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [role="button"], [role="option"], [role="combobox"], [role="tab"], [role="menuitem"]'

function electronBinary() {
  const base = path.join(APP_DIR, 'node_modules/electron/dist')
  return process.platform === 'darwin'
    ? path.join(base, 'Electron.app/Contents/MacOS/Electron')
    : process.platform === 'win32'
      ? path.join(base, 'electron.exe')
      : path.join(base, 'electron')
}

/**
 * Launch the built app against an isolated userData directory.
 *
 * Always pass a throwaway `userData`: the app seeds bundled courses and writes
 * preferences on first run, and we must never touch a real course library.
 */
export async function launchApp({
  userData = '/tmp/matko-e2e-userdata',
  fresh = true,
  timeout = 60_000,
} = {}) {
  const mainJs = path.join(APP_DIR, 'dist-electron/main.js')
  if (!fs.existsSync(mainJs)) {
    throw new Error(
      `${mainJs} is missing — run \`npx vite build\` before launching the app.`,
    )
  }

  if (fresh) fs.rmSync(userData, { recursive: true, force: true })

  const app = await electron.launch({
    executablePath: electronBinary(),
    args: [`--user-data-dir=${userData}`, APP_DIR],
    cwd: APP_DIR,
    timeout,
  })

  const page = await app.firstWindow()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    // Electron's own CSP warning is expected until a policy is set; skip the noise.
    if (m.type() === 'error' && !m.text().includes('Content-Security-Policy')) {
      errors.push(m.text())
    }
  })

  // Deliberately no waitForLoadState(): by the time firstWindow() resolves the load
  // may already be complete, and calling it then can throw "target has been closed".
  // React having mounted into #root is the readiness signal that actually matters.
  await page.waitForFunction(
    () => (document.getElementById('root')?.childElementCount ?? 0) > 0,
    { timeout: 30_000 },
  )

  return {
    app,
    page,
    userData,
    errors,
    close: () => app.close().catch(() => {}),
  }
}

/** Everything a user could interact with, in a stable order. */
export function listInteractive(page) {
  return page.evaluate((sel) => {
    return [...document.querySelectorAll(sel)]
      .filter((e) => e.offsetParent !== null || e.tagName === 'INPUT')
      .map((e, i) => ({
        i,
        tag: e.tagName.toLowerCase(),
        role: e.getAttribute('type') || e.getAttribute('role') || '',
        text: (e.textContent || '').trim().slice(0, 45),
        placeholder: e.getAttribute('placeholder') || '',
        value: e.value ?? '',
        disabled: !!e.disabled,
      }))
  }, INTERACTIVE_SELECTOR)
}

/**
 * Click by index via DOM `.click()` rather than Playwright coordinates —
 * coordinate math hits the wrong layer when content sits in an overlay.
 */
export function clickIndex(page, index) {
  return page.evaluate(
    ({ sel, index }) => {
      const els = [...document.querySelectorAll(sel)].filter(
        (e) => e.offsetParent !== null || e.tagName === 'INPUT',
      )
      const el = els[index]
      if (!el) return 'NOT_FOUND'
      el.click()
      return 'OK: ' + el.tagName + ' ' + (el.textContent || '').trim().slice(0, 30)
    },
    { sel: INTERACTIVE_SELECTOR, index: Number(index) },
  )
}

/** Set an input's value the way React notices (native setter + input event). */
export function fillIndex(page, index, value) {
  return page.evaluate(
    ({ sel, index, value }) => {
      const els = [...document.querySelectorAll(sel)].filter(
        (e) => e.offsetParent !== null || e.tagName === 'INPUT',
      )
      const el = els[index]
      if (!el) return 'NOT_FOUND'
      if (!('value' in el)) return 'NOT_AN_INPUT: ' + el.tagName
      const proto =
        el.tagName === 'TEXTAREA' ? HTMLTextAreaElement : HTMLInputElement
      Object.getOwnPropertyDescriptor(proto.prototype, 'value').set.call(el, value)
      el.dispatchEvent(new Event('input', { bubbles: true }))
      el.dispatchEvent(new Event('change', { bubbles: true }))
      return 'OK'
    },
    { sel: INTERACTIVE_SELECTOR, index: Number(index), value },
  )
}

export function clickText(page, text) {
  return page.evaluate((t) => {
    const els = [
      ...document.querySelectorAll('button, a, [role="button"], [role="option"]'),
    ]
    const el =
      els.find((e) => e.textContent?.trim() === t) ??
      els.find((e) => e.textContent?.includes(t))
    if (!el) return 'NOT_FOUND'
    el.click()
    return 'OK: ' + el.tagName
  }, text)
}

export function bodyText(page, selector = null) {
  return page.evaluate(
    (s) => (s ? document.querySelector(s) : document.body)?.innerText ?? '',
    selector,
  )
}

/** Find the index of the first interactive element matching a predicate. */
export async function findIndex(page, predicate) {
  const items = await listInteractive(page)
  return items.find(predicate)?.i ?? -1
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Poll a DOM condition until it's true instead of guessing a fixed delay —
 * a fixed sleep is either too short (flaky) or too long (slow) for whatever
 * async work it's meant to cover. `predicate` runs in the page and receives
 * `arg` (must be JSON-serializable) if given.
 */
export function waitFor(page, predicate, { arg, timeout = 10_000 } = {}) {
  return page.waitForFunction(predicate, arg, { timeout })
}

/** Wait until the visible page text contains `text`. */
export function waitForText(page, text, { timeout } = {}) {
  return waitFor(page, (t) => document.body.innerText.includes(t), { arg: text, timeout })
}

/** Wait until `location.hash` does (or, with shouldContain: false, does not) contain `substring`. */
export function waitForUrl(page, substring, { shouldContain = true, timeout } = {}) {
  return waitFor(
    page,
    ({ substring, shouldContain }) => location.hash.includes(substring) === shouldContain,
    { arg: { substring, shouldContain }, timeout },
  )
}

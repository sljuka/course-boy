// Shared harness for driving the real Electron app.
//
// Used by both the CI spec (e2e/*.e2e.mjs) and the interactive REPL at
// .claude/skills/run-desktop/driver.mjs, so launch behaviour and DOM interaction
// semantics stay identical between "I am debugging" and "CI is asserting".
//
// Plain .mjs on purpose: it stays out of `tsconfig.json#include` (["src", "electron"])
// so the test harness never affects `npm run typecheck`.

import { _electron as electron, chromium } from 'playwright-core'
import { spawn } from 'node:child_process'
import net from 'node:net'
import { createRequire } from 'node:module'
import path from 'node:path'
import fs from 'node:fs'

export const APP_DIR = path.resolve(import.meta.dirname, '..')

/** The same element set everywhere, so indices printed by one helper work in another. */
export const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, [role="button"], [role="option"], [role="combobox"], [role="tab"], [role="menuitem"], [role="radio"]'

// The Electron program, from the `electron` package: since Electron 43 it
// isn't downloaded at `npm install` any more but the first time it's asked
// for, which `require('electron')` does.
export function electronBinary() {
  return createRequire(import.meta.url)('electron')
}

/**
 * Launch the built app against an isolated userData directory.
 *
 * Always pass a throwaway `userData`: the app seeds bundled courses and writes
 * preferences on first run, and we must never touch a real course library.
 */
// The profile tests run in by default (SLJ-57): the app opens it straight
// away, so a test starts at onboarding like a first run. Its folder is where
// the app keeps everything (`courses/`, stores…), returned as `dataDir`.
export const E2E_PROFILE_ID = 'e2e-0000000000000000'

export function profileDataDir(userData, profileId = E2E_PROFILE_ID) {
  return path.join(userData, 'profiles', profileId)
}

function ensureProfile(userData, profileId) {
  const dir = profileDataDir(userData, profileId)
  if (!fs.existsSync(path.join(dir, 'profile.json'))) {
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'profile.json'),
      JSON.stringify({ createdAt: new Date().toISOString(), name: 'E2E', persona: null }),
    )
  }
  return dir
}

export async function launchApp({
  userData = '/tmp/matko-e2e-userdata',
  fresh = true,
  timeout = 60_000,
  // A packaged app's executable (see scripts/check-packaged.mjs). It carries its
  // own code, so no repo path is passed and no dev build is needed. Driven
  // through Chromium's DevTools port, not Playwright's usual --inspect: the
  // packaged app's fuses turn --inspect off (electron-builder.json5), so the
  // build checked is the one that ships. Then there's a `page` but no `app`
  // (main can't be evaluated).
  packagedExecutable = null,
  // Extra environment variables for the app, e.g. MATKO_DHT_BOOTSTRAP to keep a
  // sharing test on a local DHT testnet (see e2e/sharing-suite.mjs).
  env = {},
  // The profile to open (created if missing), or null for the launcher (the
  // first-run name screen or the profile picker), as a fresh install starts.
  profile = E2E_PROFILE_ID,
  // Extra command-line arguments for the app.
  args = [],
} = {}) {
  if (!packagedExecutable) {
    const mainJs = path.join(APP_DIR, 'dist-electron/main.js')
    if (!fs.existsSync(mainJs)) {
      throw new Error(
        `${mainJs} is missing — run \`npx vite build\` before launching the app.`,
      )
    }
  }

  if (fresh) fs.rmSync(userData, { recursive: true, force: true })

  const dataDir = profile ? ensureProfile(userData, profile) : null
  const appArgs = [`--user-data-dir=${userData}`, ...(profile ? [`--profile=${profile}`] : [])]
  const appEnv = { ...process.env, ...env }

  if (packagedExecutable) {
    return launchPackagedApp({ args: [...appArgs, ...args], dataDir, env: appEnv, executable: packagedExecutable, timeout, userData })
  }

  const app = await electron.launch({
    executablePath: electronBinary(),
    // `args` after the app's folder: Electron takes the first argument
    // that isn't a flag as the folder (a `matko://` link would be it);
    // flags are read wherever they are.
    args: [...appArgs, APP_DIR, ...args],
    cwd: APP_DIR,
    env: appEnv,
    timeout,
  })

  // Keeps the display and the computer awake while the app runs. A run is
  // often left alone, and once the display turns off, macOS no longer takes
  // a window full screen (the full-screen test fails); once the computer
  // sleeps, every test still running fails.
  await app.evaluate(({ powerSaveBlocker }) => powerSaveBlocker.start('prevent-display-sleep'))

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
    dataDir,
    errors,
    close: () => app.close().catch(() => {}),
  }
}

// The packaged app, connected to over Chromium's DevTools port: one picked
// here, free, and connected to once it answers (never read from the app's
// output, which a packaged Windows app may not write).
async function launchPackagedApp({ args, dataDir, env, executable, timeout, userData }) {
  const port = await freePort()
  const child = spawn(executable, [`--remote-debugging-port=${port}`, ...args], { env, stdio: 'ignore' })
  const exited = new Promise((resolve) => child.on('exit', resolve))
  const deadline = Date.now() + timeout
  let browser = null
  while (!browser) {
    if (child.exitCode !== null) throw new Error(`The packaged app exited (${child.exitCode}) before its DevTools port answered.`)
    if (Date.now() > deadline) {
      child.kill()
      throw new Error(`The packaged app's DevTools port ${port} didn't answer within ${timeout} ms.`)
    }
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 2_000 }).catch(() => null)
    if (!browser) await new Promise((resolve) => setTimeout(resolve, 250))
  }
  const context = browser.contexts()[0]
  const page = context.pages()[0] ?? (await context.waitForEvent('page', { timeout }))
  await page.waitForFunction(() => (document.getElementById('root')?.childElementCount ?? 0) > 0, null, { timeout: 30_000 })

  return {
    app: null,
    page,
    userData,
    dataDir,
    errors: [],
    close: async () => {
      await browser.close().catch(() => {})
      if (child.exitCode === null) {
        child.kill()
        await exited
      }
    },
  }
}

// A port nothing listens on right now.
function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address()
      server.close(() => resolve(port))
    })
  })
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
        ariaLabel: e.getAttribute('aria-label') || '',
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

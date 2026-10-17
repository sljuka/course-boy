// SLJ-8: `matko://import/<code>` links from outside the app open Import with
// the code filled in, never importing by themselves: the link that launched
// the app (waiting through onboarding), one from a second launch while it
// runs (Windows, Linux), and one from macOS's `open-url`.

import { spawn } from 'node:child_process'
import { afterAll, describe, expect, it } from 'vitest'
import { APP_DIR, E2E_PROFILE_ID, electronBinary, launchApp } from './launch.mjs'
import { recordFailures } from './failures.mjs'

const USER_DATA = '/tmp/matko-e2e-app-links'
const code = (seed) => seed.repeat(52).slice(0, 52)
const LAUNCH_CODE = code('ybndrfg8ejkmcpqxot1uwisza345h769')
const SECOND_CODE = code('pqxot1uwisza345h769ybndrfg8ejkmc')
const OPEN_URL_CODE = code('5h769ybndrfg8ejkmcpqxot1uwisza34')

let harness

recordFailures(import.meta.filename, () => ({ app: harness }))

afterAll(async () => {
  await harness?.close()
})

describe('import links from outside the app', () => {
  it('fills in Import from the link that launched the app, once onboarding is done', async () => {
    harness = await launchApp({ args: [`matko://import/${LAUNCH_CODE}`], userData: USER_DATA })
    const { page } = harness

    // Onboarding first: the link waits for it.
    await page.evaluate(() =>
      window.preferences.set({ category: 'other', nickname: 'E2E', persona: 'course-boy', role: 'student' }),
    )
    await page.reload()

    const input = page.locator('[data-testid="import-course-code"]')
    await expect.poll(() => input.inputValue().catch(() => ''), { timeout: 20_000 }).toBe(LAUNCH_CODE)
    await page.locator('[data-testid="import-from-link"]').waitFor()
    // Only filled in: nothing is downloading.
    expect(await page.evaluate(() => window.sharing.listImports())).toEqual([])
    await page.keyboard.press('Escape')
    await input.waitFor({ state: 'hidden' })
  })

  it('takes a link from a second launch while it runs, and that launch quits', async () => {
    const { page } = harness
    const second = spawn(
      electronBinary(),
      // The link after the app's folder, as launchApp passes it.
      [`--user-data-dir=${USER_DATA}`, `--profile=${E2E_PROFILE_ID}`, APP_DIR, `matko://import/${SECOND_CODE}`],
      { cwd: APP_DIR, stdio: 'ignore' },
    )
    const exitCode = await new Promise((resolve) => second.on('exit', resolve))
    expect(exitCode).toBe(0)

    const input = page.locator('[data-testid="import-course-code"]')
    await expect.poll(() => input.inputValue().catch(() => ''), { timeout: 20_000 }).toBe(SECOND_CODE)
    await page.keyboard.press('Escape')
    await input.waitFor({ state: 'hidden' })
  })

  it("takes a link from macOS's open-url, and ignores a malformed one", async () => {
    const { app, page } = harness
    const openUrl = (url) => app.evaluate(({ app }, url) => app.emit('open-url', { preventDefault() {} }, url), url)

    await openUrl('matko://import/not-a-code')
    await openUrl(`matko://import/${OPEN_URL_CODE}`)
    const input = page.locator('[data-testid="import-course-code"]')
    await expect.poll(() => input.inputValue().catch(() => ''), { timeout: 20_000 }).toBe(OPEN_URL_CODE)
    await page.keyboard.press('Escape')
    await input.waitFor({ state: 'hidden' })
  })

  // SLJ-151: a burst of links (a page firing them over and over) opens only
  // the newest, and Back never brings an earlier one back.
  it('opens only the newest of links that arrive together, and Back never reopens one', async () => {
    const { app, page } = harness
    await page.evaluate(() => {
      location.hash = '#/settings'
    })
    await page.waitForFunction(() => location.hash === '#/settings')
    await app.evaluate(({ app }, urls) => {
      for (const url of urls) app.emit('open-url', { preventDefault() {} }, url)
    }, [`matko://import/${LAUNCH_CODE}`, `matko://import/${SECOND_CODE}`, `matko://import/${OPEN_URL_CODE}`])
    const input = page.locator('[data-testid="import-course-code"]')
    await expect.poll(() => input.inputValue().catch(() => ''), { timeout: 20_000 }).toBe(OPEN_URL_CODE)
    await page.keyboard.press('Escape')
    await input.waitFor({ state: 'hidden' })

    // Back: to Settings, with no Import on the way.
    await page.goBack()
    await expect.poll(() => page.evaluate(() => location.hash)).toBe('#/settings')
    await page.waitForTimeout(1_000)
    expect(await input.isVisible()).toBe(false)
  })

  // SLJ-151: a second launch's other arguments never reach the running app:
  // it takes only the link, so a link can't choose the profile.
  it("ignores a second launch's other arguments", async () => {
    const { page } = harness
    const profileBefore = await page.evaluate(() => window.profiles.getState().then((state) => state.active?.id))
    const second = spawn(
      electronBinary(),
      [`--user-data-dir=${USER_DATA}`, `--profile=${E2E_PROFILE_ID}`, APP_DIR, '--profile=someone-else', `matko://import/${SECOND_CODE}`],
      { cwd: APP_DIR, stdio: 'ignore' },
    )
    expect(await new Promise((resolve) => second.on('exit', resolve))).toBe(0)
    const input = page.locator('[data-testid="import-course-code"]')
    await expect.poll(() => input.inputValue().catch(() => ''), { timeout: 20_000 }).toBe(SECOND_CODE)
    expect(await page.evaluate(() => window.profiles.getState().then((state) => state.active?.id))).toEqual(profileBefore)
  })
})

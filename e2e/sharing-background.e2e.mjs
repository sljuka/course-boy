// SLJ-129: keep sharing in the background. A teacher with a published course
// closes the window: asked once, "Keep sharing" hides it (the app keeps
// running, with the menu bar icon); the next close hides it without asking;
// turned off in Settings, closing quits. Never ticks "open at login" (it would
// add a real login item to the machine running the tests). macOS and Windows
// only: Linux has no reliable menu bar icon, so closing quits there as before.

import { describe, expect, it } from 'vitest'
import { cutAndPublish, finishOnboarding, setUpIdentity, sharingSuite, waitForSharing, writeLesson } from './sharing-suite.mjs'

const { apps, launch } = sharingSuite('background', { backgroundTeacher: 'background-teacher' })

const isSupported = process.platform === 'darwin' || process.platform === 'win32'

describe.skipIf(!isSupported)('keep sharing in the background', () => {
  const closeWindow = (app) => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close())
  const isWindowVisible = (app) => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.isVisible() ?? false)

  it('asks on the first close, keeps sharing with the window hidden, and quits once turned off', async () => {
    const page = await launch('backgroundTeacher')
    const { app } = apps.backgroundTeacher
    await finishOnboarding(page, 'teacher')
    await setUpIdentity(page)
    const ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Background Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
      return { courseId, lessonId, sectionId }
    })
    await writeLesson(page, ids, 'Shared from the menu bar.')
    await cutAndPublish(page, ids.courseId)
    await waitForSharing(page, ids.courseId, (info) => info.status === 'shared')

    // First close: asked, and the window stays until answered.
    await closeWindow(app)
    await page.locator('[data-testid="keep-sharing-dialog"]').waitFor()
    expect(await isWindowVisible(app)).toBe(true)
    expect(await page.isChecked('[data-testid="keep-sharing-open-at-login"]')).toBe(false)
    await page.click('[data-testid="keep-sharing-keep"]')
    await expect.poll(() => isWindowVisible(app)).toBe(false)
    expect(await page.evaluate(() => window.preferences.get())).toMatchObject({ keepSharingInBackground: true })
    // Still running and sharing.
    expect((await page.evaluate((id) => window.sharing.getCourseSharing(id), ids.courseId)).status).toBe('shared')

    // Opened again (the Dock, a second launch); the next close hides without asking.
    await app.evaluate(({ app }) => app.emit('activate'))
    await expect.poll(() => isWindowVisible(app)).toBe(true)
    await closeWindow(app)
    await expect.poll(() => isWindowVisible(app)).toBe(false)
    // Not asked again. (The first dialog can still be in the page, closed:
    // its closing animation was paused when the window hid.)
    expect(await page.locator('[data-testid="keep-sharing-dialog"][data-open]').count()).toBe(0)

    // Turned off in Settings: closing quits.
    await app.evaluate(({ app }) => app.emit('activate'))
    await page.evaluate(() => {
      location.hash = '#/settings'
    })
    await page.locator('[data-testid="settings-keep-sharing"]').click()
    await expect.poll(() => page.evaluate(() => window.preferences.get().then((p) => p.keepSharingInBackground))).toBe(false)
    const exited = new Promise((resolve) => app.process().once('exit', resolve))
    await closeWindow(app).catch(() => {})
    await exited
    delete apps.backgroundTeacher
  }, 180_000)
})

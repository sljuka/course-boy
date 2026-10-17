// SLJ-55: the publishing identity's password: asked when the profile opens,
// and before publishing if it was skipped.

import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { waitFor, waitForText } from './launch.mjs'
import { IDENTITY_PASSWORD, cutAndPublish, finishOnboarding, setUpIdentity, sharingSuite, waitForSharing, writeLesson } from './sharing-suite.mjs'

const { apps, close, launch } = sharingSuite('password', {
  lockedTeacher: 'locked-teacher',
})

// SLJ-55: the identity's password. After a restart the profile asks for it
// before Home; "Open without publishing" skips it: the courses stay online and
// only publishing waits, asking for the password at the next Publish.
describe("the identity's password", () => {
  let ids
  let code

  it('a teacher sets up the identity and publishes', async () => {
    const page = await launch('lockedTeacher')
    await finishOnboarding(page, 'teacher')
    await setUpIdentity(page)
    ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Locked Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
      return { courseId, lessonId, sectionId }
    })
    await writeLesson(page, ids, 'First version.')
    await cutAndPublish(page, ids.courseId)
    code = (await waitForSharing(page, ids.courseId, (info) => info.status === 'shared')).code
  })

  it('the profile asks before Home; without it the course stays online and publishing waits', async () => {
    await close('lockedTeacher')
    const page = await launch('lockedTeacher', { fresh: false })
    await page.locator('[data-testid="publisher-password-gate"]').waitFor()

    await page.getByLabel('Password').fill('wrong password')
    await page.click('[data-testid="unlock-identity"]')
    await waitForText(page, 'Wrong password.')

    await page.click('[data-testid="open-without-publishing"]')
    await page.locator('[data-testid="app-menu"]').waitFor()
    // Shared again at startup by its code, without the password.
    const shared = await waitForSharing(page, ids.courseId, (info) => info.status === 'shared')
    expect(shared.code).toBe(code)
    // Publishing itself refuses while locked.
    const { version } = await page.evaluate((courseId) => window.courses.cutVersion({ courseId, releaseType: 'minor' }), ids.courseId)
    await expect(
      page.evaluate(({ courseId, version }) => window.courses.publishVersion({ courseId, version }), { courseId: ids.courseId, version }),
    ).rejects.toThrow(/locked/)
  })

  it('Publish asks for the password, then publishes', async () => {
    const page = apps.lockedTeacher.page
    const { publishedVersion: before, versions } = await page.evaluate((id) => window.courses.getVersionHistory(id), ids.courseId)
    const newest = versions[0].version
    expect(before).not.toBe(newest)

    await page.evaluate((id) => {
      location.hash = `#/drafts/${id}`
    }, ids.courseId)
    await page.click('[data-testid="publish-course"]')
    await page.click('[data-testid="confirm-publish"]')
    const dialog = page.locator('[data-testid="unlock-identity-dialog"]')
    await dialog.waitFor()
    expect(await dialog.count()).toBe(1)
    await dialog.getByLabel('Password').fill(IDENTITY_PASSWORD)
    await dialog.locator('[data-testid="unlock-identity"]').click()

    await expect
      .poll(() => page.evaluate((id) => window.courses.getVersionHistory(id), ids.courseId).then((history) => history.publishedVersion))
      .toBe(newest)
    const shared = await waitForSharing(page, ids.courseId, (info) => info.status === 'shared')
    expect(shared.code).toBe(code)
    expect(await page.evaluate(() => window.sharing.getIdentityStatus())).toMatchObject({ locked: false })
  })
})

// SLJ-32 phase 2: a program online. The curator publishes a program (its own
// code); a student imports it with the same Import box as a course, imports
// its courses from its page, and gets the curator's later changes on their
// own, with the added course marked New.

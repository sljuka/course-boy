// SLJ-54: restoring the publishing identity on a new computer, and finding the
// teacher's courses among the people who have them.

import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { waitFor, waitForText } from './launch.mjs'
import { IDENTITY_PASSWORD, currentVersionFiles, cutAndPublish, finishOnboarding, importCourse, setUpIdentity, sharingSuite, waitForSharing, waitForUpdate, writeLesson } from './sharing-suite.mjs'

const { ROOT, apps, close, data, identityFilePath, launch } = sharingSuite('restore', {
  oldComputer: 'old-computer',
  newComputer: 'new-computer',
  restoreStudent: 'restore-student',
})

// SLJ-54/55: the publishing identity restored on a new computer. The old
// computer publishes; its identity file is copied away; a student imports; the
// old computer goes away. The new computer restores the copy from Settings,
// finds the course among students from the identity alone (same code, same
// identity), and a version published from it reaches the student as a normal
// update.
describe('restoring the publisher identity on a new computer', () => {
  const backupPath = path.join(ROOT, 'old-computer.matko-identity')
  let ids
  let code
  let publisherId
  // SLJ-32: a program published from the old computer, found again too.
  let programId
  let programCode

  it('the old computer publishes, its identity file is copied away, and a student imports', async () => {
    const page = await launch('oldComputer')
    await finishOnboarding(page, 'teacher')
    await setUpIdentity(page)
    // The copy, made right after setup: the file never changes afterwards.
    fs.copyFileSync(identityFilePath('oldComputer'), backupPath)
    ids = await page.evaluate(async () => {
      const { courseId } = await window.courses.createDraft({
        defaultLocale: 'en',
        locales: { en: { description: '', title: 'E2E Restored Course' } },
        supportedLocales: ['en'],
      })
      const { sectionId } = await window.courses.createSection({ courseId, title: 'Section' })
      const { lessonId } = await window.courses.createLesson({ courseId, sectionId, title: 'Lesson' })
      return { courseId, lessonId, sectionId }
    })
    // Two versions, so the drive has history the student never downloaded.
    await writeLesson(page, ids, 'First version.')
    await cutAndPublish(page, ids.courseId)
    await writeLesson(page, ids, 'Second version.')
    const version = await cutAndPublish(page, ids.courseId)
    code = (await waitForSharing(page, ids.courseId, (info) => info.status === 'shared')).code
    publisherId = await page.evaluate(() => window.sharing.getCreatorKey())

    programId = (await page.evaluate(() => window.programs.create({ locale: 'en', title: 'E2E Restored Program' }))).programId
    const program = await page.evaluate((id) => window.programs.get(id), programId)
    await page.evaluate((manifest) => window.programs.update(manifest), {
      ...program,
      courses: [
        {
          code,
          courseId: ids.courseId,
          snapshot: { locales: { en: { description: '', title: 'E2E Restored Course' } }, publisherId: null, supportedLocales: ['en'], version },
        },
      ],
    })
    programCode = (await page.evaluate((id) => window.programs.publish(id), programId)).code

    const student = await launch('restoreStudent')
    await finishOnboarding(student, 'student')
    expect(await importCourse(student, code)).toEqual({ courseId: ids.courseId })
    expect((await student.evaluate(() => window.courses.list('en'))).find((course) => course.id === ids.courseId)?.version).toBe(version)
    // SLJ-108: Home says who published it; without a name in Publishers, the
    // short id. Reloaded: imported through the API, nothing refreshes Home's
    // lists (the Import dialog does, and so does focusing the window).
    await student.evaluate(() => {
      location.hash = '#/'
    })
    await student.reload()
    await waitFor(student, (prefix) => document.querySelector('[data-testid="course-publisher"]')?.textContent?.includes(prefix), {
      arg: publisherId.slice(0, 8),
      timeout: 30_000,
    })
    // The student holds the program too, so it can be found once the old computer is gone.
    expect(await importCourse(student, programCode)).toEqual({ programId })

    await close('oldComputer')
  })

  it('the new computer restores the copy from Settings, and finds the course among students', async () => {
    // The search ends after 3 numbers in a row aren't found (20 in the app),
    // so the case stays short. Each number still gets the app's own 30 s:
    // with 20 s the course was sometimes not found in time.
    const page = await launch('newComputer', { extraEnv: { MATKO_RESTORE_GAP_LIMIT: '3' } })
    await apps.newComputer.app.evaluate(({ dialog }, filePath) => {
      dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] })
    }, backupPath)
    await finishOnboarding(page, 'teacher')
    await page.evaluate(() => {
      location.hash = '#/settings'
    })
    await page.click('[data-testid="open-restore-identity"]')
    await page.click('[data-testid="choose-identity-backup"]')
    await waitForText(page, 'old-computer.matko-identity, made on')
    const dialog = page.locator('[data-testid="restore-identity-dialog"]')

    await dialog.getByLabel('Password', { exact: true }).fill('wrong password')
    await page.click('[data-testid="restore-identity"]')
    await waitForText(page, 'Wrong password.')

    await dialog.getByLabel('Password', { exact: true }).fill(IDENTITY_PASSWORD)
    await page.click('[data-testid="restore-identity"]')
    // The dialog closes; My courses shows the search while it runs (SLJ-66).
    await dialog.waitFor({ state: 'detached', timeout: 30_000 })
    await waitFor(page, () => location.hash.includes('/my-courses'))
    await waitFor(page, () => document.querySelector('[data-testid="restoring-group"]') !== null, { timeout: 30_000 })
    await waitFor(page, () => document.querySelector('[data-testid="restoring-course"]')?.textContent?.includes('E2E Restored Course'), {
      timeout: 45_000,
    })
    // Programs are searched once the courses' search has ended.
    await waitFor(page, () => document.querySelector('[data-testid="restoring-program"]')?.textContent?.includes('E2E Restored Program'), {
      timeout: 120_000,
    })
    // Then the search ends: the group goes away, the course is in My courses
    // like any other, and Settings keeps the record, offering to look again.
    await waitFor(page, () => document.querySelector('[data-testid="restoring-group"]') === null, { timeout: 120_000 })
    await waitForText(page, 'E2E Restored Course')
    await page.evaluate(() => {
      location.hash = '#/settings'
    })
    await waitFor(page, () => document.querySelector('[data-testid="restored-course"]')?.textContent?.includes('E2E Restored Course'))
    await page.locator('[data-testid="restore-look-again"]').waitFor()

    // The same identity and the same code; the course is the teacher's own again.
    expect(await page.evaluate(() => window.sharing.getCreatorKey())).toBe(publisherId)
    const course = (await page.evaluate(() => window.courses.list('en'))).find((entry) => entry.id === ids.courseId)
    expect(course).toMatchObject({ distribution: 'local', title: 'E2E Restored Course' })
    const shared = await waitForSharing(page, ids.courseId, (info) => info.status === 'shared')
    expect(shared.code).toBe(code)
    // The program too: the teacher's own (editable), shared again by the same code.
    const programs = await page.evaluate(() => window.programs.list('en'))
    expect(programs.find((entry) => entry.id === programId)).toMatchObject({ distribution: 'local', title: 'E2E Restored Program' })
    expect(await page.evaluate((id) => window.programs.getSharing(id), programId)).toMatchObject({ code: programCode, kind: 'local' })
    // It's this profile's identity file now, the copy as it was.
    expect(fs.readFileSync(identityFilePath('newComputer'), 'utf8')).toBe(fs.readFileSync(backupPath, 'utf8'))
  }, 180_000)

  it('a version published from the new computer reaches the student as a normal update', async () => {
    const page = apps.newComputer.page
    const student = apps.restoreStudent.page
    await writeLesson(page, ids, 'Third version, from the new computer.')
    const version = await cutAndPublish(page, ids.courseId)

    await waitForUpdate(student, ids.courseId, (update) => update.version === version, 60_000)
    expect(await student.evaluate((id) => window.sharing.applyCourseUpdate(id), ids.courseId)).toMatchObject({ version })
    const lesson = currentVersionFiles(data.restoreStudent, ids.courseId).find(({ file }) => file.endsWith('.md'))
    expect(fs.readFileSync(lesson.path, 'utf8')).toContain('Third version, from the new computer.')
  })

  it('the program published again from the new computer keeps its code and reaches the student', async () => {
    const page = apps.newComputer.page
    const student = apps.restoreStudent.page
    const program = await page.evaluate((id) => window.programs.get(id), programId)
    await page.evaluate((manifest) => window.programs.update(manifest), {
      ...program,
      locales: { ...program.locales, en: { description: 'Edited on the new computer.', title: 'E2E Restored Program' } },
    })
    expect(await page.evaluate((id) => window.programs.publish(id), programId)).toEqual({ code: programCode })

    await expect
      .poll(() => student.evaluate((id) => window.programs.get(id).then((p) => p.locales.en.description), programId), {
        interval: 500,
        timeout: 60_000,
      })
      .toBe('Edited on the new computer.')
  })
})

// SLJ-55: the identity's password. After a restart the profile asks for it
// before Home; "Open without publishing" skips it: the courses stay online and
// only publishing waits, asking for the password at the next Publish.
